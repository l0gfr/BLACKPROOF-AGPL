import type { ProofPackKnowledgeUseFile, ProofPackZipManifest } from "./exporters";
import { assertProofPackKnowledgeUseLink } from "./knowledge";
import {
  buildSourceImportNormalizedQuestionnaire,
  XLSX_SOURCE_IMPORT_PROFILE,
  assertProofPackSourceImport,
  assertProofPackSourceImportLink,
  assertProofPackSourceLineage,
  type ProofPackSourceImportFile,
  type ProofPackSourceLineage,
} from "./source-import";
import type { VerificationFinding, VerifyProofPackResult } from "./verify";
import type { ProofPack } from "./types";

import { SECURITY_LIMITS, sha256Hex, stableStringify } from "./security";
import { verifyProofPackJson } from "./verify";

export interface VerifyProofPackZipResult {
  kind: "master-zip";
  isValid: boolean;
  validManifestSchema: boolean;
  validManifestFingerprint: boolean;
  validFileList: boolean;
  validFileSizes: boolean;
  validFileHashes: boolean;
  validProofPackFingerprintLink: boolean;
  validManifestMetadataLink: boolean;
  sourceImportPresent: boolean;
  validSourceImportLink: boolean;
  sourceLineagePresent: boolean;
  validSourceLineageLink: boolean;
  knowledgeUsePresent: boolean;
  validKnowledgeUseLink: boolean;
  proofpackResult: VerifyProofPackResult | null;
  providedManifestFingerprint?: string;
  expectedManifestFingerprint?: string;
  findings: VerificationFinding[];
}

type VerifiedZipManifest = Omit<ProofPackZipManifest, "manifestVersion" | "sourceProfile"> & {
  manifestVersion: "blackproof-proofpack-zip-v0.1.0-alpha" | "blackproof-proofpack-zip-v0.2.0-alpha";
  sourceProfile?: "none" | typeof XLSX_SOURCE_IMPORT_PROFILE;
};

function finding(code: string, message: string, pointer?: string): VerificationFinding {
  return { code, message, pointer, severity: "error" };
}

function warningFinding(code: string, message: string, pointer?: string): VerificationFinding {
  return { code, message, pointer, severity: "warning" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function validateSourceImport(value: unknown, findings: VerificationFinding[]): value is ProofPackSourceImportFile {
  try {
    assertProofPackSourceImport(value, { file: true });
    return true;
  } catch (error) {
    findings.push(finding("ZIP_SOURCE_IMPORT_SCHEMA_INVALID", error instanceof Error ? error.message : "source-import.json violates its bounded strict schema.", "/source-import.json"));
    return false;
  }
}

function validateKnowledgeUse(value: unknown, findings: VerificationFinding[]): value is ProofPackKnowledgeUseFile {
  if (!isRecord(value) || Object.keys(value).sort().join("|") !== "caseId|formatVersion|proofpackFingerprint|uses" || value.formatVersion !== "blackproof-proofpack-knowledge-use-v1"
    || typeof value.caseId !== "string" || typeof value.proofpackFingerprint !== "string" || !Array.isArray(value.uses) || value.uses.length < 1 || value.uses.length > SECURITY_LIMITS.MAX_QUESTIONS) {
    findings.push(finding("ZIP_KNOWLEDGE_USE_SCHEMA_INVALID", "knowledge-use.json violates its strict bounded schema.", "/knowledge-use.json"));
    return false;
  }
  const seen = new Set<string>();
  let ok = true;
  for (const [index, item] of value.uses.entries()) {
    const pointer = `/knowledge-use.json/uses/${index}`;
    if (!isRecord(item) || Object.keys(item).sort().join("|") !== "appliedAt|entryFingerprint|entryId|entryRevisionId|formatVersion|questionId"
      || item.formatVersion !== "blackproof-knowledge-use-v1" || typeof item.questionId !== "string" || typeof item.entryId !== "string" || typeof item.entryRevisionId !== "string"
      || typeof item.entryFingerprint !== "string" || !/^bp_sha256_[a-f0-9]{64}$/.test(item.entryFingerprint)
      || typeof item.appliedAt !== "string" || Number.isNaN(Date.parse(item.appliedAt)) || seen.has(item.questionId)) {
      findings.push(finding("ZIP_KNOWLEDGE_USE_ENTRY_INVALID", "Knowledge use entry is invalid or duplicated.", pointer));
      ok = false;
    } else seen.add(item.questionId);
  }
  return ok;
}

function validateManifest(value: unknown, findings: VerificationFinding[]): value is VerifiedZipManifest {
  if (!isRecord(value)) {
    findings.push(finding("ZIP_MANIFEST_INVALID", "manifest.json must contain a JSON object.", "/manifest.json"));
    return false;
  }

  let ok = true;
  const allowedManifestFields = new Set([
    "product", "manifestVersion", "caseId", "caseTitle", "generatedAt", "proofpackFingerprint",
    "methodVersion", "sourceProfile", "files", "manifestFingerprint", "manifestFingerprintScope", "disclaimer",
  ]);
  for (const field of Object.keys(value)) {
    if (!allowedManifestFields.has(field)) {
      findings.push(finding("ZIP_MANIFEST_ADDITIONAL_FIELD", `Unexpected manifest field: ${field}.`, `/manifest.json/${field}`));
      ok = false;
    }
  }
  const stringFields = [
    "caseId", "caseTitle", "generatedAt", "proofpackFingerprint", "methodVersion",
    "manifestFingerprint", "manifestFingerprintScope", "disclaimer",
  ];

  if (value.product !== "BLACKPROOF") {
    findings.push(finding("ZIP_MANIFEST_PRODUCT_INVALID", "Manifest product must be BLACKPROOF.", "/manifest.json/product"));
    ok = false;
  }
  if (value.manifestVersion !== "blackproof-proofpack-zip-v0.1.0-alpha" && value.manifestVersion !== "blackproof-proofpack-zip-v0.2.0-alpha") {
    findings.push(finding("ZIP_MANIFEST_VERSION_INVALID", "Unsupported ProofPack ZIP manifest version.", "/manifest.json/manifestVersion"));
    ok = false;
  }
  if (value.manifestVersion === "blackproof-proofpack-zip-v0.2.0-alpha"
    && value.sourceProfile !== "none" && value.sourceProfile !== XLSX_SOURCE_IMPORT_PROFILE) {
    findings.push(finding("ZIP_MANIFEST_SOURCE_PROFILE_INVALID", "Manifest v0.2 must declare a supported sourceProfile.", "/manifest.json/sourceProfile"));
    ok = false;
  }
  if (value.manifestVersion === "blackproof-proofpack-zip-v0.1.0-alpha" && value.sourceProfile !== undefined) {
    findings.push(finding("ZIP_MANIFEST_SOURCE_PROFILE_LEGACY", "Legacy manifest v0.1 cannot declare sourceProfile.", "/manifest.json/sourceProfile"));
    ok = false;
  }
  for (const field of stringFields) {
    if (typeof value[field] !== "string" || value[field].trim().length === 0) {
      findings.push(finding("ZIP_MANIFEST_FIELD_INVALID", `${field} must be a non-empty string.`, `/manifest.json/${field}`));
      ok = false;
    }
  }
  if (typeof value.manifestFingerprint === "string" && !/^bp_sha256_[a-f0-9]{64}$/.test(value.manifestFingerprint)) {
    findings.push(finding("ZIP_MANIFEST_FINGERPRINT_FORMAT_INVALID", "Manifest fingerprint format is invalid.", "/manifest.json/manifestFingerprint"));
    ok = false;
  }
  if (typeof value.proofpackFingerprint === "string" && !/^bp_sha256_[a-f0-9]{64}$/.test(value.proofpackFingerprint)) {
    findings.push(finding("ZIP_PROOFPACK_FINGERPRINT_FORMAT_INVALID", "ProofPack fingerprint format is invalid.", "/manifest.json/proofpackFingerprint"));
    ok = false;
  }
  if (typeof value.generatedAt === "string" && Number.isNaN(Date.parse(value.generatedAt))) {
    findings.push(finding("ZIP_MANIFEST_DATE_INVALID", "Manifest generatedAt must be a valid date-time.", "/manifest.json/generatedAt"));
    ok = false;
  }
  if (!Array.isArray(value.files) || value.files.length === 0 || value.files.length > SECURITY_LIMITS.MAX_PROOFPACK_ZIP_ENTRIES - 1) {
    findings.push(finding("ZIP_MANIFEST_FILES_INVALID", "Manifest files must be a non-empty bounded array.", "/manifest.json/files"));
    return false;
  }

  const filenames = new Set<string>();
  value.files.forEach((file, index) => {
    const pointer = `/manifest.json/files/${index}`;
    if (!isRecord(file)) {
      findings.push(finding("ZIP_MANIFEST_FILE_INVALID", "Manifest file entry must be an object.", pointer));
      ok = false;
      return;
    }
    const allowedFileFields = new Set(["filename", "contentType", "size", "sha256", "purpose"]);
    for (const field of Object.keys(file)) {
      if (!allowedFileFields.has(field)) {
        findings.push(finding("ZIP_MANIFEST_FILE_ADDITIONAL_FIELD", `Unexpected file descriptor field: ${field}.`, `${pointer}/${field}`));
        ok = false;
      }
    }
    if (typeof file.filename !== "string" || !/^[A-Za-z0-9._-]+$/.test(file.filename) || file.filename === "manifest.json") {
      findings.push(finding("ZIP_MANIFEST_FILENAME_INVALID", "Manifest filenames must be safe root-level names and cannot be manifest.json.", `${pointer}/filename`));
      ok = false;
    } else if (filenames.has(file.filename)) {
      findings.push(finding("ZIP_MANIFEST_DUPLICATE_FILE", `Duplicate manifest entry: ${file.filename}.`, `${pointer}/filename`));
      ok = false;
    } else {
      filenames.add(file.filename);
    }
    if (!Number.isInteger(file.size) || (file.size as number) < 0 || (file.size as number) > SECURITY_LIMITS.MAX_PROOFPACK_ZIP_FILE_BYTES) {
      findings.push(finding("ZIP_MANIFEST_SIZE_INVALID", "Manifest file size is invalid or exceeds the local limit.", `${pointer}/size`));
      ok = false;
    }
    if (typeof file.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(file.sha256)) {
      findings.push(finding("ZIP_MANIFEST_HASH_INVALID", "Manifest file SHA-256 is invalid.", `${pointer}/sha256`));
      ok = false;
    }
    if (typeof file.contentType !== "string" || file.contentType.length === 0 || typeof file.purpose !== "string" || file.purpose.length === 0) {
      findings.push(finding("ZIP_MANIFEST_METADATA_INVALID", "Manifest file type and purpose are required.", pointer));
      ok = false;
    }
  });

  return ok;
}

export async function verifyProofPackZipFiles(
  files: ReadonlyMap<string, Uint8Array>
): Promise<VerifyProofPackZipResult> {
  const findings: VerificationFinding[] = [];
  let validManifestSchema = false;
  let validManifestFingerprint = false;
  let validFileList = false;
  let validFileSizes = false;
  let validFileHashes = false;
  let validProofPackFingerprintLink = false;
  let validManifestMetadataLink = false;
  let validSourceImportLink = true;
  let validSourceLineageLink = true;
  let validKnowledgeUseLink = true;
  let proofpackResult: VerifyProofPackResult | null = null;
  let providedManifestFingerprint: string | undefined;
  let expectedManifestFingerprint: string | undefined;

  const actualNames = [...files.keys()];
  const sourceImportPresent = files.has("source-import.json");
  const sourceLineagePresent = files.has("source-lineage.json");
  const knowledgeUsePresent = files.has("knowledge-use.json");
  if (actualNames.length > SECURITY_LIMITS.MAX_PROOFPACK_ZIP_ENTRIES) {
    findings.push(finding("ZIP_TOO_MANY_FILES", `ZIP contains more than ${SECURITY_LIMITS.MAX_PROOFPACK_ZIP_ENTRIES} files.`, "/"));
  }
  if (actualNames.some((name) => !/^[A-Za-z0-9._-]+$/.test(name))) {
    findings.push(finding("ZIP_UNSAFE_PATH", "ZIP must contain root-level files only, without paths or traversal segments.", "/"));
  }

  const manifestBytes = files.get("manifest.json");
  if (!manifestBytes) {
    findings.push(finding("ZIP_MANIFEST_MISSING", "ZIP does not contain manifest.json.", "/manifest.json"));
  } else {
    try {
      const parsed: unknown = JSON.parse(decodeUtf8(manifestBytes));
      validManifestSchema = validateManifest(parsed, findings);

      if (validManifestSchema) {
        const manifest = parsed as VerifiedZipManifest;
        providedManifestFingerprint = manifest.manifestFingerprint;
        const { manifestFingerprint, ...manifestWithoutFingerprint } = manifest;
        expectedManifestFingerprint = `bp_sha256_${await sha256Hex(stableStringify(manifestWithoutFingerprint))}`;
        validManifestFingerprint = manifestFingerprint === expectedManifestFingerprint;
        if (!validManifestFingerprint) {
          findings.push(finding("ZIP_MANIFEST_FINGERPRINT_MISMATCH", "Manifest fingerprint does not match its canonical content.", "/manifest.json/manifestFingerprint"));
        }

        const expectedNames = new Set(["manifest.json", ...manifest.files.map((file) => file.filename)]);
        const missing = [...expectedNames].filter((name) => !files.has(name));
        const unexpected = actualNames.filter((name) => !expectedNames.has(name));
        validFileList = missing.length === 0 && unexpected.length === 0;
        for (const name of missing) findings.push(finding("ZIP_FILE_MISSING", `Manifest-listed file is missing: ${name}.`, `/${name}`));
        for (const name of unexpected) findings.push(finding("ZIP_FILE_UNEXPECTED", `Unexpected file is present: ${name}.`, `/${name}`));

        validFileSizes = true;
        validFileHashes = true;
        for (const descriptor of manifest.files) {
          const bytes = files.get(descriptor.filename);
          if (!bytes) {
            validFileSizes = false;
            validFileHashes = false;
            continue;
          }
          if (bytes.byteLength !== descriptor.size) {
            validFileSizes = false;
            findings.push(finding("ZIP_FILE_SIZE_MISMATCH", `Size mismatch for ${descriptor.filename}: expected ${descriptor.size}, got ${bytes.byteLength}.`, `/${descriptor.filename}`));
          }
          const hash = await sha256Hex(bytes);
          if (hash !== descriptor.sha256) {
            validFileHashes = false;
            findings.push(finding("ZIP_FILE_HASH_MISMATCH", `SHA-256 mismatch for ${descriptor.filename}.`, `/${descriptor.filename}`));
          }
        }

        const proofpackBytes = files.get("proofpack.json");
        if (proofpackBytes) {
          try {
            proofpackResult = await verifyProofPackJson(decodeUtf8(proofpackBytes));
            validProofPackFingerprintLink = proofpackResult.providedFingerprint === manifest.proofpackFingerprint;
            if (!validProofPackFingerprintLink) {
              findings.push(finding("ZIP_PROOFPACK_FINGERPRINT_LINK_MISMATCH", "Manifest proofpackFingerprint does not match proofpack.json.", "/manifest.json/proofpackFingerprint"));
            }
            validManifestMetadataLink = proofpackResult.caseId === manifest.caseId
              && proofpackResult.caseTitle === manifest.caseTitle
              && proofpackResult.methodVersion === manifest.methodVersion;
            if (!validManifestMetadataLink) {
              findings.push(finding(
                "ZIP_MANIFEST_METADATA_LINK_MISMATCH",
                "Manifest caseId, caseTitle or methodVersion does not match proofpack.json.",
                "/manifest.json"
              ));
            }
            const proofpackValue = JSON.parse(decodeUtf8(proofpackBytes)) as {
              sourceQuestionnaire?: { fileName?: unknown; normalizedQuestionnaireSha256?: unknown; sha256?: unknown };
              questions?: Array<{ id?: unknown }>;
            };
            const isXlsxSource = typeof proofpackValue.sourceQuestionnaire?.fileName === "string"
              && proofpackValue.sourceQuestionnaire.fileName.toLowerCase().endsWith(".xlsx");
            const sourceImportBytes = files.get("source-import.json");
            if (manifest.manifestVersion === "blackproof-proofpack-zip-v0.2.0-alpha") {
              if (isXlsxSource && manifest.sourceProfile !== XLSX_SOURCE_IMPORT_PROFILE) {
                validSourceImportLink = false;
                findings.push(finding("ZIP_SOURCE_IMPORT_PROFILE_REQUIRED", "An XLSX source requires the XLSX source profile in a v0.2 manifest.", "/manifest.json/sourceProfile"));
              }
              if (!isXlsxSource && manifest.sourceProfile !== "none") {
                validSourceImportLink = false;
                findings.push(finding("ZIP_SOURCE_IMPORT_PROFILE_REFUSED", "A non-XLSX source cannot declare an XLSX source profile.", "/manifest.json/sourceProfile"));
              }
              if (manifest.sourceProfile === XLSX_SOURCE_IMPORT_PROFILE && !sourceImportBytes) {
                validSourceImportLink = false;
                findings.push(finding("ZIP_SOURCE_IMPORT_REQUIRED", "source-import.json is mandatory for an XLSX source in manifest v0.2.", "/source-import.json"));
              }
              if (manifest.sourceProfile === "none" && sourceImportBytes) {
                validSourceImportLink = false;
                findings.push(finding("ZIP_SOURCE_IMPORT_UNDECLARED", "source-import.json is present but the manifest declares no source profile.", "/source-import.json"));
              }
            } else if (isXlsxSource && !sourceImportBytes) {
              findings.push(warningFinding(
                "ZIP_SOURCE_IMPORT_LEGACY_MISSING",
                "Legacy XLSX ZIP: detailed source-import.json provenance is absent and cannot be verified.",
                "/source-import.json"
              ));
            }
            if (sourceImportBytes) {
              try {
                const sourceImportValue: unknown = JSON.parse(decodeUtf8(sourceImportBytes));
                validSourceImportLink = validSourceImportLink && validateSourceImport(sourceImportValue, findings);
                if (validSourceImportLink) {
                  const sourceImport = sourceImportValue as ProofPackSourceImportFile;
                  try {
                    assertProofPackSourceImportLink(proofpackValue as unknown as ProofPack, sourceImport);
                  } catch {
                    validSourceImportLink = false;
                  }
                  const normalizedQuestionnaire = buildSourceImportNormalizedQuestionnaire(sourceImport.questionSources);
                  const normalizedQuestionnaireSha256 = `sha256:${await sha256Hex(normalizedQuestionnaire)}`;
                  validSourceImportLink = validSourceImportLink && sourceImport.caseId === proofpackResult.caseId
                    && (manifest.manifestVersion === "blackproof-proofpack-zip-v0.1.0-alpha" || manifest.sourceProfile === sourceImport.profile)
                    && normalizedQuestionnaireSha256 === (sourceImport.sourceQuestionnaire.normalizedQuestionnaireSha256 ?? sourceImport.sourceQuestionnaire.sha256);
                  if (!validSourceImportLink) findings.push(finding("ZIP_SOURCE_IMPORT_LINK_MISMATCH", "source-import.json does not match proofpack.json source provenance.", "/source-import.json"));
                }
              } catch (error) {
                validSourceImportLink = false;
                findings.push(finding("ZIP_SOURCE_IMPORT_UNREADABLE", error instanceof Error ? error.message : "source-import.json cannot be read.", "/source-import.json"));
              }
            }
            const knowledgeUseBytes = files.get("knowledge-use.json");
            if (knowledgeUseBytes) {
              try {
                const value: unknown = JSON.parse(decodeUtf8(knowledgeUseBytes));
                validKnowledgeUseLink = validateKnowledgeUse(value, findings);
                if (validKnowledgeUseLink) {
                  const knowledgeUse = value as ProofPackKnowledgeUseFile;
                  const linkedProofpack = proofpackValue as unknown as ProofPack;
                  try {
                    assertProofPackKnowledgeUseLink(linkedProofpack, knowledgeUse.uses);
                  } catch {
                    validKnowledgeUseLink = false;
                  }
                  validKnowledgeUseLink = validKnowledgeUseLink && knowledgeUse.caseId === proofpackResult.caseId && knowledgeUse.proofpackFingerprint === proofpackResult.providedFingerprint;
                  if (!validKnowledgeUseLink) findings.push(finding("ZIP_KNOWLEDGE_USE_LINK_MISMATCH", "knowledge-use.json does not match proofpack.json.", "/knowledge-use.json"));
                }
              } catch (error) {
                validKnowledgeUseLink = false;
                findings.push(finding("ZIP_KNOWLEDGE_USE_UNREADABLE", error instanceof Error ? error.message : "knowledge-use.json cannot be read.", "/knowledge-use.json"));
              }
            }
            const sourceLineageBytes = files.get("source-lineage.json");
            if (sourceLineageBytes) {
              try {
                const value: unknown = JSON.parse(decodeUtf8(sourceLineageBytes));
                assertProofPackSourceLineage(value);
                const lineage = value as ProofPackSourceLineage;
                const linkedProofpack = proofpackValue as unknown as ProofPack;
                const sourceSha256 = linkedProofpack.sourceQuestionnaire.normalizedQuestionnaireSha256 ?? linkedProofpack.sourceQuestionnaire.sha256;
                validSourceLineageLink = !sourceImportPresent
                  && lineage.derivedSourceFileName === linkedProofpack.sourceQuestionnaire.fileName
                  && lineage.derivedSourceSha256 === sourceSha256
                  && lineage.originalFileSha256 === linkedProofpack.sourceQuestionnaire.originalFileSha256;
                if (!validSourceLineageLink) findings.push(finding("ZIP_SOURCE_LINEAGE_LINK_MISMATCH", "source-lineage.json does not match the derived ProofPack source.", "/source-lineage.json"));
              } catch (error) {
                validSourceLineageLink = false;
                findings.push(finding("ZIP_SOURCE_LINEAGE_UNREADABLE", error instanceof Error ? error.message : "source-lineage.json cannot be read.", "/source-lineage.json"));
              }
            }
          } catch (error) {
            findings.push(finding("ZIP_PROOFPACK_UNREADABLE", error instanceof Error ? error.message : "proofpack.json cannot be read.", "/proofpack.json"));
          }
        } else {
          findings.push(finding("ZIP_PROOFPACK_MISSING", "ZIP does not contain proofpack.json.", "/proofpack.json"));
        }
      }
    } catch (error) {
      findings.push(finding("ZIP_MANIFEST_UNREADABLE", error instanceof Error ? error.message : "manifest.json cannot be read.", "/manifest.json"));
    }
  }

  if (proofpackResult) findings.push(...proofpackResult.findings);
  const isValid = validManifestSchema && validManifestFingerprint && validFileList
    && validFileSizes && validFileHashes && validProofPackFingerprintLink
    && validManifestMetadataLink
    && validSourceImportLink
    && validSourceLineageLink
    && validKnowledgeUseLink
    && proofpackResult?.isValid === true;

  if (isValid) {
    findings.unshift({
      code: "PROOFPACK_ZIP_VALID",
      severity: "info",
      message: "ZIP inventory, manifest, payload hashes and proofpack.json consistency verified locally. Author identity and declaration truth are not authenticated.",
      pointer: "/",
    });
  }

  return {
    kind: "master-zip",
    isValid,
    validManifestSchema,
    validManifestFingerprint,
    validFileList,
    validFileSizes,
    validFileHashes,
    validProofPackFingerprintLink,
    validManifestMetadataLink,
    sourceImportPresent,
    validSourceImportLink,
    sourceLineagePresent,
    validSourceLineageLink,
    knowledgeUsePresent,
    validKnowledgeUseLink,
    proofpackResult,
    providedManifestFingerprint,
    expectedManifestFingerprint,
    findings,
  };
}
