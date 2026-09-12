import { buildProofPackDeliveryZipFiles, type ProofPackDeliveryManifest } from "./delivery";
import type { ProofPackDelivery } from "./types";
import type { VerificationFinding } from "./verify";
import { SECURITY_LIMITS, sha256Hex, stableStringify } from "./security";
import { verifyProofPackDeliveryJson, type VerifyProofPackDeliveryResult } from "./verify-delivery";

export interface VerifyProofPackDeliveryZipResult {
  kind: "delivery-zip";
  isValid: boolean;
  validManifestSchema: boolean;
  validManifestFingerprint: boolean;
  validFileList: boolean;
  validFileSizes: boolean;
  validFileHashes: boolean;
  validCanonicalSidecars: boolean;
  validDeliveryFingerprintLink: boolean;
  validManifestMetadataLink: boolean;
  deliveryResult: VerifyProofPackDeliveryResult | null;
  findings: VerificationFinding[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const error = (code: string, message: string, pointer: string): VerificationFinding => ({ code, message, pointer, severity: "error" });
const decode = (bytes: Uint8Array) => new TextDecoder("utf-8", { fatal: true }).decode(bytes);

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

function canonicalSidecarsMatch(
  delivery: ProofPackDelivery,
  files: ReadonlyMap<string, Uint8Array>,
  manifest: ProofPackDeliveryManifest,
): boolean {
  const descriptors = new Map(manifest.files.map((item) => [item.filename, item]));
  const encoder = new TextEncoder();
  return buildProofPackDeliveryZipFiles(delivery).every((expected) => {
    const descriptor = descriptors.get(expected.filename);
    if (!descriptor || descriptor.contentType !== expected.contentType || descriptor.purpose !== expected.purpose) return false;
    if (expected.filename === "delivery.json") return true;
    const actual = files.get(expected.filename);
    return Boolean(actual && equalBytes(actual, encoder.encode(expected.content)));
  });
}

function validateManifest(value: unknown, findings: VerificationFinding[]): value is ProofPackDeliveryManifest {
  if (!isRecord(value)) return false;
  let ok = true;
  const allowed = ["product", "manifestVersion", "caseId", "generatedAt", "deliveryFingerprint", "files", "manifestFingerprint"];
  for (const key of Object.keys(value)) if (!allowed.includes(key)) { findings.push(error("DELIVERY_ZIP_MANIFEST_ADDITIONAL_FIELD", `Unexpected manifest field: ${key}.`, `/manifest.json/${key}`)); ok = false; }
  if (value.product !== "BLACKPROOF" || value.manifestVersion !== "blackproof-proofpack-delivery-zip-v1") ok = false;
  if (![value.caseId, value.generatedAt, value.deliveryFingerprint, value.manifestFingerprint].every((item) => typeof item === "string" && item.length > 0)) ok = false;
  if (typeof value.generatedAt !== "string" || Number.isNaN(Date.parse(value.generatedAt))) ok = false;
  if (typeof value.deliveryFingerprint !== "string" || !/^bp_sha256_[a-f0-9]{64}$/.test(value.deliveryFingerprint)) ok = false;
  if (typeof value.manifestFingerprint !== "string" || !/^bp_sha256_[a-f0-9]{64}$/.test(value.manifestFingerprint)) ok = false;
  if (!Array.isArray(value.files) || value.files.length !== 4) return false;
  const names = new Set<string>();
  value.files.forEach((file, index) => {
    if (!isRecord(file)) { ok = false; return; }
    const pointer = `/manifest.json/files/${index}`;
    const fileAllowed = ["filename", "contentType", "purpose", "size", "sha256"];
    for (const key of Object.keys(file)) if (!fileAllowed.includes(key)) { findings.push(error("DELIVERY_ZIP_FILE_ADDITIONAL_FIELD", `Unexpected file field: ${key}.`, `${pointer}/${key}`)); ok = false; }
    if (typeof file.filename !== "string" || !/^[A-Za-z0-9._-]+$/.test(file.filename) || names.has(file.filename)) ok = false;
    else names.add(file.filename);
    if (typeof file.contentType !== "string" || typeof file.purpose !== "string") ok = false;
    if (!Number.isInteger(file.size) || Number(file.size) < 0 || Number(file.size) > SECURITY_LIMITS.MAX_PROOFPACK_ZIP_FILE_BYTES) ok = false;
    if (typeof file.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(file.sha256)) ok = false;
  });
  const requiredNames = ["delivery.json", "reponse-fournisseur.md", "references-preuves.csv", "README.md"];
  if (!requiredNames.every((name) => names.has(name))) ok = false;
  if (!ok) findings.push(error("DELIVERY_ZIP_MANIFEST_INVALID", "Delivery manifest violates its strict schema.", "/manifest.json"));
  return ok;
}

export async function verifyProofPackDeliveryZipFiles(files: ReadonlyMap<string, Uint8Array>): Promise<VerifyProofPackDeliveryZipResult> {
  const findings: VerificationFinding[] = [];
  let validManifestSchema = false, validManifestFingerprint = false, validFileList = false, validFileSizes = false, validFileHashes = false, validCanonicalSidecars = false, validDeliveryFingerprintLink = false, validManifestMetadataLink = false;
  let deliveryResult: VerifyProofPackDeliveryResult | null = null;
  const actualNames = [...files.keys()];
  if (actualNames.length > SECURITY_LIMITS.MAX_PROOFPACK_ZIP_ENTRIES || actualNames.some((name) => !/^[A-Za-z0-9._-]+$/.test(name))) findings.push(error("DELIVERY_ZIP_UNSAFE_INVENTORY", "Delivery ZIP inventory is unsafe or too large.", "/"));
  const manifestBytes = files.get("manifest.json");
  if (!manifestBytes) findings.push(error("DELIVERY_ZIP_MANIFEST_MISSING", "manifest.json is missing.", "/manifest.json"));
  else {
    try {
      const parsed: unknown = JSON.parse(decode(manifestBytes));
      validManifestSchema = validateManifest(parsed, findings);
      if (validManifestSchema) {
        const manifest = parsed as ProofPackDeliveryManifest;
        const { manifestFingerprint, ...base } = manifest;
        validManifestFingerprint = manifestFingerprint === `bp_sha256_${await sha256Hex(stableStringify(base))}`;
        if (!validManifestFingerprint) findings.push(error("DELIVERY_ZIP_MANIFEST_FINGERPRINT_MISMATCH", "Manifest fingerprint mismatch.", "/manifest.json/manifestFingerprint"));
        const expectedNames = new Set(["manifest.json", ...manifest.files.map((item) => item.filename)]);
        validFileList = expectedNames.size === actualNames.length && actualNames.every((name) => expectedNames.has(name));
        if (!validFileList) findings.push(error("DELIVERY_ZIP_FILE_LIST_MISMATCH", "ZIP file list differs from the manifest.", "/"));
        validFileSizes = true; validFileHashes = true;
        for (const descriptor of manifest.files) {
          const bytes = files.get(descriptor.filename);
          if (!bytes || bytes.byteLength !== descriptor.size) { validFileSizes = false; findings.push(error("DELIVERY_ZIP_FILE_SIZE_MISMATCH", `Size mismatch for ${descriptor.filename}.`, `/${descriptor.filename}`)); }
          if (!bytes || await sha256Hex(bytes) !== descriptor.sha256) { validFileHashes = false; findings.push(error("DELIVERY_ZIP_FILE_HASH_MISMATCH", `SHA-256 mismatch for ${descriptor.filename}.`, `/${descriptor.filename}`)); }
        }
        const deliveryBytes = files.get("delivery.json");
        if (deliveryBytes) {
          const deliveryJson = decode(deliveryBytes);
          deliveryResult = await verifyProofPackDeliveryJson(deliveryJson);
          validDeliveryFingerprintLink = deliveryResult.providedFingerprint === manifest.deliveryFingerprint;
          const validCaseIdLink = deliveryResult.caseId === manifest.caseId;
          const validGeneratedAtLink = deliveryResult.generatedAt === manifest.generatedAt;
          validManifestMetadataLink = validCaseIdLink && validGeneratedAtLink;
          if (!validDeliveryFingerprintLink) findings.push(error("DELIVERY_ZIP_FINGERPRINT_LINK_MISMATCH", "Manifest fingerprint does not match delivery.json.", "/manifest.json/deliveryFingerprint"));
          if (!validCaseIdLink) findings.push(error("DELIVERY_ZIP_METADATA_LINK_MISMATCH", "Manifest caseId does not match delivery.json.", "/manifest.json/caseId"));
          if (!validGeneratedAtLink) findings.push(error("DELIVERY_ZIP_METADATA_LINK_MISMATCH", "Manifest generatedAt does not match delivery.json.", "/manifest.json/generatedAt"));
          if (deliveryResult.isValid) {
            try {
              validCanonicalSidecars = canonicalSidecarsMatch(JSON.parse(deliveryJson) as ProofPackDelivery, files, manifest);
            } catch {
              validCanonicalSidecars = false;
            }
            if (!validCanonicalSidecars) findings.push(error(
              "DELIVERY_ZIP_SIDECAR_MISMATCH",
              "Delivery sidecars or their manifest metadata are not the canonical derivatives of delivery.json.",
              "/",
            ));
          }
        } else findings.push(error("DELIVERY_ZIP_JSON_MISSING", "delivery.json is missing.", "/delivery.json"));
      }
    } catch { findings.push(error("DELIVERY_ZIP_MANIFEST_UNREADABLE", "manifest.json cannot be decoded.", "/manifest.json")); }
  }
  if (deliveryResult) findings.push(...deliveryResult.findings);
  const isValid = validManifestSchema && validManifestFingerprint && validFileList && validFileSizes && validFileHashes && validCanonicalSidecars && validDeliveryFingerprintLink && validManifestMetadataLink && deliveryResult?.isValid === true;
  if (isValid) findings.unshift({ code: "PROOFPACK_DELIVERY_ZIP_VALID", severity: "info", message: "Delivery ZIP inventory, canonical sidecars, hashes, manifest and delivery.json verified locally.", pointer: "/" });
  return { kind: "delivery-zip", isValid, validManifestSchema, validManifestFingerprint, validFileList, validFileSizes, validFileHashes, validCanonicalSidecars, validDeliveryFingerprintLink, validManifestMetadataLink, deliveryResult, findings };
}
