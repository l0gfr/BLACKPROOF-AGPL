import { createHash, createPublicKey, verify as verifySignatureBytes } from "node:crypto";
import { constants } from "node:fs";
import { open } from "node:fs/promises";
import JSZip from "jszip";
import validateDeliveryV4 from "./generated/delivery-v4-validator.js";
import validateDeliveryV5 from "./generated/delivery-v5-validator.js";

const DELIVERY_FILES = ["README.md", "delivery.json", "manifest.json", "references-preuves.csv", "reponse-fournisseur.md"];
const MAX_DELIVERY_JSON_BYTES = 2_000_000;
const MAX_DELIVERY_ZIP_BYTES = 10_000_000;
const MAX_DELIVERY_FILE_BYTES = 5_000_000;
const MAX_DELIVERY_EXPANDED_BYTES = 20_000_000;
const MAX_PROTOCOL_JSON_BYTES = 131_072;
const FINGERPRINT = /^bp_sha256_[a-f0-9]{64}$/;
const CASE_ID = /^case_[a-f0-9]{32}$/;
const DELIVERY_ID = /^delivery_[a-f0-9]{32}$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const P256_COORDINATE = /^[A-Za-z0-9_-]{43}$/;
const UNSAFE_ISSUER_CHARACTER = /[\u0000-\u001F\u007F-\u009F\u061C\u200E\u200F\u2028-\u202E\u2066-\u2069]/u;

export function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).filter((key) => value[key] !== undefined).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

export function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalExportText(input) {
  const value = String(input ?? "");
  if (value.length > 10_000) throw new Error("DELIVERY_SIDECAR_FIELD_TOO_LARGE");
  const normalized = value.normalize("NFKC").replace(/\r\n?/g, "\n");
  if (normalized.length > 10_000) throw new Error("DELIVERY_SIDECAR_FIELD_TOO_LARGE");
  return normalized
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .trim();
}

function canonicalMarkdown(input) {
  return canonicalExportText(input)
    .replace(/\\/g, "\\\\")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/([`*_{}\[\]()#+\-.!|])/g, "\\$1");
}

function canonicalCsvCell(input) {
  let value = canonicalExportText(input);
  if (/^[=+\-@\t\r\n]/.test(value) || /^\s*[=+\-@]/.test(value)) value = `'${value}`;
  return `"${value.replace(/"/g, '""')}"`;
}

function canonicalDeliveryZipFiles(delivery) {
  const responseLines = [
    "# Réponse cyber fournisseur",
    "",
    `Dossier : ${canonicalMarkdown(delivery.case.title)}`,
    `Référentiel : ${canonicalMarkdown(delivery.case.framework)}`,
    `Empreinte Delivery : ${canonicalMarkdown(delivery.fingerprint)}`,
    "",
  ];
  delivery.questions.forEach((question, index) => {
    responseLines.push(`## Question ${index + 1}`, "", canonicalMarkdown(question.text), "", "### Réponse", "", canonicalMarkdown(question.answer), "");
    if (question.reservation) responseLines.push("### Réserve", "", canonicalMarkdown(question.reservation), "");
    if (question.evidence.length > 0) {
      responseLines.push("### Éléments probants déclarés", "");
      for (const evidence of question.evidence) responseLines.push(`- ${canonicalMarkdown(evidence.publicReference)}`);
      responseLines.push("");
    }
  });
  const csvRows = [
    ["question_id", "evidence_id", "title", "category", "disclosure", "public_reference"],
    ...delivery.questions.flatMap((question) => question.evidence.map((item) => [
      question.id, item.id, item.title, item.category, item.disclosure, item.publicReference,
    ])),
  ];
  const readme = [
    "# ProofPack Delivery BLACKPROOF",
    "",
    "Ce dossier est destiné à un tiers et a été construit par sélection explicite.",
    "Il ne contient ni brouillons, ni suggestions automatiques, ni réponses marquées ne pas exporter, ni plan de remédiation, ni note interne.",
    "Les preuves éventuellement listées le sont uniquement comme références minimales autorisées.",
    "",
    `Dossier : ${canonicalMarkdown(delivery.case.title)}`,
    `Empreinte Delivery : \`${delivery.fingerprint}\``,
    `Identifiant Delivery : \`${delivery.deliveryId}\``,
    `Version de méthode : \`${delivery.methodVersion}\``,
    `Version de schéma : \`${delivery.schemaVersion}\``,
    `Schéma public : ${delivery.schemaUrl}`,
    "La vérification locale couvre le schéma, l’empreinte, les liens et les invariants. Elle n’authentifie pas l’émetteur, la véracité des déclarations, la validité juridique ni un horodatage de confiance.",
    "",
  ].join("\n");
  return [
    { filename: "delivery.json", contentType: "application/json", purpose: "Dossier de transmission externe minimal et lisible par machine.", content: JSON.stringify(delivery, null, 2) },
    { filename: "reponse-fournisseur.md", contentType: "text/markdown", purpose: "Réponses et réserves explicitement autorisées pour le tiers.", content: responseLines.join("\n") },
    { filename: "references-preuves.csv", contentType: "text/csv", purpose: "Références minimales de preuves explicitement autorisées.", content: csvRows.map((row) => row.map(canonicalCsvCell).join(";")).join("\n") },
    { filename: "README.md", contentType: "text/markdown", purpose: "Portée et limites du dossier de transmission.", content: readme },
  ];
}

function canonicalSidecarsMatch(delivery, extractedFiles, manifest) {
  const descriptors = new Map(manifest.files.map((item) => [item.filename, item]));
  return canonicalDeliveryZipFiles(delivery).every((expected) => {
    const descriptor = descriptors.get(expected.filename);
    if (!descriptor || descriptor.contentType !== expected.contentType || descriptor.purpose !== expected.purpose) return false;
    if (expected.filename === "delivery.json") return true;
    const actual = extractedFiles.get(expected.filename);
    return Boolean(actual && Buffer.from(expected.content, "utf8").equals(actual));
  });
}

function finding(code, message, pointer = "/") { return { code, message, pointer }; }
function record(value) { return value && typeof value === "object" && !Array.isArray(value); }
function text(value, max = Infinity) { return typeof value === "string" && value.trim().length > 0 && value.length <= max; }
function safeIssuerLabel(value) { return text(value, 240) && !UNSAFE_ISSUER_CHARACTER.test(value); }
function exact(value, fields) { return record(value) && Object.keys(value).sort().join("|") === [...fields].sort().join("|"); }
function exactOptional(value, required, optional = []) {
  if (!record(value) || required.some((key) => !(key in value))) return false;
  return Object.keys(value).every((key) => required.includes(key) || optional.includes(key));
}
function timestamp(value) {
  if (typeof value !== "string" || value.length > 40 || !ISO_TIMESTAMP.test(value)) return false;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return false;
  const canonical = new Date(parsed).toISOString();
  return value === canonical || (!value.includes(".") && canonical === value.replace("Z", ".000Z"));
}
function boundedArray(value, maximum, itemMaximum, allowEmpty = true) {
  return Array.isArray(value) && value.length <= maximum
    && value.every((item) => typeof item === "string" && item.length <= itemMaximum && (allowEmpty || item.trim().length > 0));
}

function validateDeliveryShape(delivery, findings) {
  if (!record(delivery)) { findings.push(finding("DELIVERY_NOT_OBJECT", "Delivery must be a JSON object.")); return false; }
  const validator = delivery.formatVersion === "blackproof-proofpack-delivery-v4"
    ? validateDeliveryV4
    : delivery.formatVersion === "blackproof-proofpack-delivery-v5" ? validateDeliveryV5 : null;
  if (!validator) { findings.push(finding("DELIVERY_SCHEMA_INVALID", "Delivery format version is not supported.", "/formatVersion")); return false; }
  if (validator(delivery)) return true;
  for (const error of validator.errors ?? []) {
    const suffix = error.keyword === "required" ? `/${error.params.missingProperty}`
      : error.keyword === "additionalProperties" ? `/${error.params.additionalProperty}` : "";
    findings.push(finding("DELIVERY_SCHEMA_INVALID", `Delivery schema violation: ${error.message ?? error.keyword}.`, `${error.instancePath}${suffix}`.replace(/\/+/g, "/") || "/"));
  }
  return false;
}

export function verifyDelivery(input) {
  let delivery;
  if (typeof input === "string" && Buffer.byteLength(input) > MAX_DELIVERY_JSON_BYTES) {
    return { isValid: false, validSchema: false, validFingerprint: false, validLinks: false, validInvariants: false, findings: [finding("DELIVERY_TOO_LARGE", "Delivery JSON exceeds the local size limit.")] };
  }
  try { delivery = typeof input === "string" ? JSON.parse(input) : input; }
  catch { return { isValid: false, validSchema: false, validFingerprint: false, findings: [finding("DELIVERY_INVALID_JSON", "Invalid JSON.")] }; }
  const findings = [];
  const validSchema = validateDeliveryShape(delivery, findings);
  if (!validSchema) return { isValid: false, validSchema, validFingerprint: false, findings, delivery };
  const { fingerprint, ...base } = delivery;
  const expectedFingerprint = `bp_sha256_${sha256Hex(stableStringify(base))}`;
  const validFingerprint = fingerprint === expectedFingerprint;
  if (!validFingerprint) findings.push(finding("DELIVERY_FINGERPRINT_MISMATCH", "Delivery fingerprint does not match its content.", "/fingerprint"));
  const questionIds = new Set();
  const evidenceIds = new Set();
  let validLinks = true;
  for (const [questionIndex, question] of delivery.questions.entries()) {
    if (questionIds.has(question.id)) { findings.push(finding("DELIVERY_DUPLICATE_QUESTION_ID", "Delivery question identifiers must be unique.", `/questions/${questionIndex}/id`)); validLinks = false; }
    questionIds.add(question.id);
    for (const [evidenceIndex, evidence] of question.evidence.entries()) {
      if (evidenceIds.has(evidence.id)) { findings.push(finding("DELIVERY_DUPLICATE_EVIDENCE_ID", "Delivery evidence identifiers must be unique.", `/questions/${questionIndex}/evidence/${evidenceIndex}/id`)); validLinks = false; }
      evidenceIds.add(evidence.id);
    }
  }
  const validInvariants = delivery.questions.every((question) => question.answer.trim().length > 0
    && question.evidence.every((evidence) => evidence.disclosure === "reference-only" && evidence.publicReference.trim().length > 0));
  const isValid = validSchema && validFingerprint && validLinks && validInvariants;
  if (isValid) findings.unshift(finding("PROOFPACK_DELIVERY_VALID", "Delivery schema, fingerprint, links and invariants verified."));
  return { isValid, validSchema, validFingerprint, validLinks, validInvariants, expectedFingerprint, providedFingerprint: fingerprint, findings, delivery };
}

function validateManifest(manifest) {
  if (!(exact(manifest, ["product", "manifestVersion", "caseId", "generatedAt", "deliveryFingerprint", "files", "manifestFingerprint"])
    && manifest.product === "BLACKPROOF" && manifest.manifestVersion === "blackproof-proofpack-delivery-zip-v1"
    && CASE_ID.test(manifest.caseId ?? "") && timestamp(manifest.generatedAt) && FINGERPRINT.test(manifest.deliveryFingerprint ?? "")
    && FINGERPRINT.test(manifest.manifestFingerprint ?? "") && Array.isArray(manifest.files))) return false;
  if (manifest.files.length !== 4) return false;
  const names = new Set();
  return manifest.files.every((file) => {
    if (!exact(file, ["filename", "contentType", "purpose", "size", "sha256"]) || !DELIVERY_FILES.includes(file.filename)
      || file.filename === "manifest.json" || names.has(file.filename) || !text(file.contentType, 160) || !text(file.purpose, 500)
      || !Number.isInteger(file.size) || file.size < 0 || file.size > MAX_DELIVERY_FILE_BYTES || !/^[a-f0-9]{64}$/.test(file.sha256 ?? "")) return false;
    names.add(file.filename);
    return true;
  });
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function zipError(message) {
  const error = new Error(message);
  error.code = "DELIVERY_ZIP_UNSAFE";
  return error;
}

async function normalizeZipBytes(input) {
  let bytes;
  if (input instanceof Uint8Array) bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  else if (input instanceof ArrayBuffer) bytes = new Uint8Array(input);
  else if (typeof Blob !== "undefined" && input instanceof Blob) bytes = new Uint8Array(await input.arrayBuffer());
  else throw zipError("Delivery ZIP input must be bytes.");
  if (bytes.byteLength > MAX_DELIVERY_ZIP_BYTES) throw zipError("Delivery ZIP exceeds the compressed size limit.");
  return bytes;
}

function inspectDeliveryZip(bytes) {
  if (bytes.byteLength < 22) throw zipError("Delivery ZIP is truncated.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let offset = bytes.byteLength - 22, floor = Math.max(0, bytes.byteLength - 22 - 65_535); offset >= floor; offset -= 1) {
    if (view.getUint32(offset, true) === EOCD_SIGNATURE && offset + 22 + view.getUint16(offset + 20, true) === bytes.byteLength) { eocd = offset; break; }
  }
  if (eocd < 0) throw zipError("Delivery ZIP central directory is missing.");
  const disk = view.getUint16(eocd + 4, true);
  const centralDisk = view.getUint16(eocd + 6, true);
  const entriesOnDisk = view.getUint16(eocd + 8, true);
  const entryCount = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  if (disk !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount || entryCount > DELIVERY_FILES.length
    || entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff
    || centralOffset + centralSize !== eocd || centralOffset > eocd) throw zipError("Delivery ZIP central directory is unsafe.");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const names = new Set();
  const entries = new Map();
  const ranges = [];
  let totalExpanded = 0;
  let cursor = centralOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > eocd || view.getUint32(cursor, true) !== CENTRAL_SIGNATURE) throw zipError("Delivery ZIP central entry is invalid.");
    const flags = view.getUint16(cursor + 8, true);
    const method = view.getUint16(cursor + 10, true);
    const crc = view.getUint32(cursor + 16, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const expandedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const startDisk = view.getUint16(cursor + 34, true);
    const localOffset = view.getUint32(cursor + 42, true);
    if ((flags & ~0x0800) !== 0 || ![0, 8].includes(method) || startDisk !== 0 || extraLength !== 0 || commentLength !== 0
      || compressedSize === 0xffffffff || expandedSize === 0xffffffff || localOffset === 0xffffffff
      || expandedSize > MAX_DELIVERY_FILE_BYTES || nameLength < 1 || nameLength > 180 || cursor + 46 + nameLength > eocd) {
      throw zipError("Delivery ZIP entry metadata is unsafe.");
    }
    let name;
    try { name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength)); } catch { throw zipError("Delivery ZIP entry name is invalid UTF-8."); }
    if (!DELIVERY_FILES.includes(name) || names.has(name)) throw zipError("Delivery ZIP contains an unsafe or duplicate entry name.");
    names.add(name);
    entries.set(name, { crc32: crc, compressedSize, uncompressedSize: expandedSize });
    totalExpanded += expandedSize;
    if (totalExpanded > MAX_DELIVERY_EXPANDED_BYTES) throw zipError("Delivery ZIP expanded size exceeds the limit.");
    if (localOffset + 30 > centralOffset || view.getUint32(localOffset, true) !== LOCAL_SIGNATURE) throw zipError("Delivery ZIP local entry is invalid.");
    const localFlags = view.getUint16(localOffset + 6, true);
    const localMethod = view.getUint16(localOffset + 8, true);
    const localCrc = view.getUint32(localOffset + 14, true);
    const localCompressed = view.getUint32(localOffset + 18, true);
    const localExpanded = view.getUint32(localOffset + 22, true);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localNameLength;
    if (localFlags !== flags || localMethod !== method || localCrc !== crc || localCompressed !== compressedSize || localExpanded !== expandedSize
      || localExtraLength !== 0 || localNameLength !== nameLength || dataOffset + compressedSize > centralOffset
      || decoder.decode(bytes.subarray(localOffset + 30, dataOffset)) !== name) throw zipError("Delivery ZIP local and central metadata differ.");
    ranges.push({ start: localOffset, end: dataOffset + compressedSize });
    cursor += 46 + nameLength;
  }
  if (cursor !== eocd || names.size !== DELIVERY_FILES.length || DELIVERY_FILES.some((name) => !names.has(name))) throw zipError("Delivery ZIP inventory is incomplete.");
  ranges.sort((left, right) => left.start - right.start);
  if (ranges[0]?.start !== 0 || ranges.at(-1)?.end !== centralOffset || ranges.some((range, index) => index > 0 && ranges[index - 1].end !== range.start)) {
    throw zipError("Delivery ZIP contains overlapping or hidden byte ranges.");
  }
  return entries;
}

function extractDeliveryZipEntry(entry, expected, expandedTotal) {
  // JSZip 3.10.1 exposes bounded decompression only through this pinned stream adapter.
  return new Promise((resolve, reject) => {
    const chunks = [];
    let fileBytes = 0;
    let crc = 0xffffffff;
    let settled = false;
    const stream = entry.internalStream("uint8array");
    const fail = (message) => {
      if (settled) return;
      settled = true;
      stream.pause();
      reject(zipError(message));
    };
    stream.on("data", (chunk) => {
      if (settled) return;
      fileBytes += chunk.byteLength;
      expandedTotal.value += chunk.byteLength;
      if (fileBytes > expected.uncompressedSize) return fail(`Delivery ZIP entry expands beyond its validated size: ${entry.name}.`);
      if (fileBytes > MAX_DELIVERY_FILE_BYTES) return fail(`Delivery ZIP entry exceeds the expanded size limit: ${entry.name}.`);
      if (expandedTotal.value > MAX_DELIVERY_EXPANDED_BYTES) return fail("Delivery ZIP expanded size exceeds the limit.");
      for (const byte of chunk) crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
      chunks.push(Buffer.from(chunk));
    });
    stream.on("error", () => fail(`Delivery ZIP entry cannot be decompressed safely: ${entry.name}.`));
    stream.on("end", () => {
      if (settled) return;
      if (fileBytes !== expected.uncompressedSize) return fail(`Delivery ZIP entry does not match its validated size: ${entry.name}.`);
      if (((crc ^ 0xffffffff) >>> 0) !== expected.crc32) return fail(`Delivery ZIP entry fails its CRC check: ${entry.name}.`);
      settled = true;
      resolve(Buffer.concat(chunks, fileBytes));
    });
    stream.resume();
  });
}

export async function verifyDeliveryZip(input) {
  const bytes = await normalizeZipBytes(input);
  const expectedEntries = inspectDeliveryZip(bytes);
  let zip;
  try {
    zip = await JSZip.loadAsync(bytes, { checkCRC32: false, createFolders: false });
  } catch {
    throw zipError("Delivery ZIP cannot be opened safely.");
  }
  const names = Object.keys(zip.files).filter((name) => !zip.files[name].dir).sort();
  const findings = [];
  let validCanonicalSidecars = false;
  if (stableStringify(names) !== stableStringify(DELIVERY_FILES)) findings.push(finding("DELIVERY_ZIP_FILE_LIST_INVALID", "ZIP inventory is not the fixed Delivery inventory."));
  if (findings.length > 0) return { isValid: false, validManifest: false, deliveryResult: null, findings };
  const extractedFiles = new Map();
  const expandedTotal = { value: 0 };
  for (const name of names) {
    const entry = zip.file(name);
    const expected = expectedEntries.get(name);
    if (!entry || !expected) throw zipError(`Delivery ZIP validated entry is missing: ${name}.`);
    extractedFiles.set(name, await extractDeliveryZipEntry(entry, expected, expandedTotal));
  }
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let deliveryJson;
  let manifestJson;
  try {
    deliveryJson = decoder.decode(extractedFiles.get("delivery.json"));
    manifestJson = decoder.decode(extractedFiles.get("manifest.json"));
  } catch {
    throw zipError("Delivery ZIP JSON entries are not valid UTF-8.");
  }
  if (!deliveryJson || !manifestJson) return { isValid: false, findings, deliveryResult: deliveryJson ? verifyDelivery(deliveryJson) : null };
  const deliveryResult = verifyDelivery(deliveryJson);
  let manifest;
  try { manifest = JSON.parse(manifestJson); } catch { findings.push(finding("DELIVERY_MANIFEST_INVALID_JSON", "manifest.json is invalid.")); }
  let validManifest = validateManifest(manifest);
  if (validManifest) {
    const { manifestFingerprint, ...base } = manifest;
    const manifestNames = manifest.files.map((file) => file.filename).sort();
    const fileChecks = manifest.files.map((file) => {
      const content = extractedFiles.get(file.filename);
      return Boolean(content && content.byteLength === file.size && sha256Hex(content) === file.sha256);
    });
    validManifest = manifestFingerprint === `bp_sha256_${sha256Hex(stableStringify(base))}`
      && stableStringify(manifestNames) === stableStringify(DELIVERY_FILES.filter((name) => name !== "manifest.json"))
      && fileChecks.every(Boolean)
      && manifest.deliveryFingerprint === deliveryResult.providedFingerprint
      && manifest.caseId === deliveryResult.delivery?.case?.id && manifest.generatedAt === deliveryResult.delivery?.generatedAt;
    if (deliveryResult.isValid) {
      try {
        validCanonicalSidecars = canonicalSidecarsMatch(deliveryResult.delivery, extractedFiles, manifest);
      } catch {
        validCanonicalSidecars = false;
      }
      if (!validCanonicalSidecars) findings.push(finding(
        "DELIVERY_ZIP_SIDECAR_MISMATCH",
        "Delivery sidecars or their manifest metadata are not the canonical derivatives of delivery.json.",
      ));
    }
  }
  if (!validManifest) findings.push(finding("DELIVERY_MANIFEST_INVALID", "Manifest schema, hashes or Delivery links are invalid."));
  return { isValid: deliveryResult.isValid && validManifest && validCanonicalSidecars && findings.length === 0, validManifest, validCanonicalSidecars, deliveryResult, findings, delivery: deliveryResult.delivery };
}

export async function loadDeliveryFile(path) {
  const zipByName = path.toLowerCase().endsWith(".zip");
  const limit = zipByName ? MAX_DELIVERY_ZIP_BYTES : MAX_DELIVERY_JSON_BYTES;
  const bytes = await readBoundedRegularFile(path, limit, zipByName ? "DELIVERY_ZIP_TOO_LARGE" : "DELIVERY_TOO_LARGE");
  if (path.toLowerCase().endsWith(".zip") || (bytes[0] === 0x50 && bytes[1] === 0x4b)) {
    const result = await verifyDeliveryZip(bytes);
    if (!result.isValid) throw new Error(result.findings[0]?.code ?? result.deliveryResult?.findings[0]?.code ?? "DELIVERY_ZIP_INVALID");
    return result.delivery;
  }
  const result = verifyDelivery(bytes.toString("utf8"));
  if (!result.isValid) throw new Error(result.findings[0]?.code ?? "DELIVERY_INVALID");
  return result.delivery;
}

async function readBoundedRegularFile(path, maximumBytes, oversizedCode) {
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch {
    throw new Error("DELIVERY_INPUT_NOT_REGULAR_FILE");
  }
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile()) throw new Error("DELIVERY_INPUT_NOT_REGULAR_FILE");
    if (before.size > BigInt(maximumBytes)) throw new Error(oversizedCode);
    const expectedSize = Number(before.size);
    const output = Buffer.alloc(expectedSize + 1);
    let offset = 0;
    while (offset < output.byteLength) {
      const { bytesRead } = await handle.read(output, offset, output.byteLength - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    const after = await handle.stat({ bigint: true });
    if (offset !== expectedSize || after.size !== before.size || after.mtimeNs !== before.mtimeNs || after.ctimeNs !== before.ctimeNs) {
      throw new Error("DELIVERY_INPUT_CHANGED_DURING_READ");
    }
    return output.subarray(0, offset);
  } finally {
    await handle.close();
  }
}

export async function readDeliveryInputFile(path) {
  const zipByName = path.toLowerCase().endsWith(".zip");
  const bytes = await readBoundedRegularFile(
    path,
    zipByName ? MAX_DELIVERY_ZIP_BYTES : MAX_DELIVERY_JSON_BYTES,
    zipByName ? "DELIVERY_ZIP_TOO_LARGE" : "DELIVERY_TOO_LARGE",
  );
  return { bytes, zipByName };
}

export async function loadProtocolJsonFile(path) {
  const bytes = await readBoundedRegularFile(path, MAX_PROTOCOL_JSON_BYTES, "PROTOCOL_ARTIFACT_TOO_LARGE");
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("PROTOCOL_ARTIFACT_INVALID_JSON");
  }
}

function key(question) { return question.text.trim().replace(/\s+/g, " ").toLocaleLowerCase("fr-FR"); }
function references(question) { return question.evidence.map((item) => item.publicReference.trim()).sort(); }
export function compareDeliveries(previous, current, generatedAt = new Date().toISOString()) {
  for (const delivery of [previous, current]) if (!verifyDelivery(delivery).isValid) throw new Error("Both Delivery inputs must be valid.");
  if (previous.case.title.trim() !== current.case.title.trim() || previous.case.framework.trim() !== current.case.framework.trim()) throw new Error("Delivery case title or framework mismatch.");
  const before = new Map(previous.questions.map((question) => [key(question), question]));
  const after = new Map(current.questions.map((question) => [key(question), question]));
  if (before.size !== previous.questions.length || after.size !== current.questions.length) throw new Error("Ambiguous duplicate questions.");
  const changes = []; let unchanged = 0;
  for (const item of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const left = before.get(item); const right = after.get(item);
    if (!left) { changes.push({ question: right.text, kind: "added", currentAnswer: right.answer, ...(right.reservation ? { currentReservation: right.reservation } : {}), currentEvidence: references(right) }); continue; }
    if (!right) { changes.push({ question: left.text, kind: "removed", previousAnswer: left.answer, ...(left.reservation ? { previousReservation: left.reservation } : {}), previousEvidence: references(left) }); continue; }
    let changed = false;
    if (left.answer !== right.answer) { changes.push({ question: right.text, kind: "answer-changed", previousAnswer: left.answer, currentAnswer: right.answer }); changed = true; }
    if ((left.reservation ?? "") !== (right.reservation ?? "")) { changes.push({ question: right.text, kind: "reservation-changed", ...(left.reservation ? { previousReservation: left.reservation } : {}), ...(right.reservation ? { currentReservation: right.reservation } : {}) }); changed = true; }
    if (stableStringify(references(left)) !== stableStringify(references(right))) { changes.push({ question: right.text, kind: "evidence-changed", previousEvidence: references(left), currentEvidence: references(right) }); changed = true; }
    if (!changed) unchanged += 1;
  }
  const base = { product: "BLACKPROOF", formatVersion: "blackproof-delivery-change-report-v1", previous: { deliveryId: previous.deliveryId, fingerprint: previous.fingerprint, generatedAt: previous.generatedAt }, current: { deliveryId: current.deliveryId, fingerprint: current.fingerprint, generatedAt: current.generatedAt }, case: { title: current.case.title, framework: current.case.framework }, generatedAt, summary: { added: changes.filter((item) => item.kind === "added").length, removed: changes.filter((item) => item.kind === "removed").length, changed: new Set(changes.filter((item) => item.kind.endsWith("changed")).map((item) => key({ text: item.question }))).size, unchanged }, changes };
  return { ...base, fingerprint: `bp_sha256_${sha256Hex(stableStringify(base))}` };
}

export function verifyChangeReport(report) {
  if (!exact(report, ["product", "formatVersion", "previous", "current", "case", "generatedAt", "summary", "changes", "fingerprint"])
    || report.product !== "BLACKPROOF" || report.formatVersion !== "blackproof-delivery-change-report-v1"
    || !deliveryReference(report.previous) || !deliveryReference(report.current)
    || !exact(report.case, ["title", "framework"]) || !text(report.case.title, 160) || !text(report.case.framework, 240)
    || !timestamp(report.generatedAt) || !Array.isArray(report.changes) || report.changes.length > 1000
    || !report.changes.every(validChange) || !validSummary(report.summary, report.changes)) return false;
  const { fingerprint, ...base } = report;
  return FINGERPRINT.test(fingerprint) && fingerprint === `bp_sha256_${sha256Hex(stableStringify(base))}`;
}

function deliveryReference(value) {
  return exact(value, ["deliveryId", "fingerprint", "generatedAt"])
    && DELIVERY_ID.test(value.deliveryId ?? "") && FINGERPRINT.test(value.fingerprint ?? "") && timestamp(value.generatedAt);
}

function validChange(value) {
  if (!record(value) || !text(value.question, 10_000)) return false;
  if (value.kind === "added") return exactOptional(value, ["question", "kind", "currentAnswer", "currentEvidence"], ["currentReservation"])
    && text(value.currentAnswer, 10_000) && (value.currentReservation === undefined || text(value.currentReservation, 5_000))
    && boundedArray(value.currentEvidence, 250, 240, false);
  if (value.kind === "removed") return exactOptional(value, ["question", "kind", "previousAnswer", "previousEvidence"], ["previousReservation"])
    && text(value.previousAnswer, 10_000) && (value.previousReservation === undefined || text(value.previousReservation, 5_000))
    && boundedArray(value.previousEvidence, 250, 240, false);
  if (value.kind === "answer-changed") return exact(value, ["question", "kind", "previousAnswer", "currentAnswer"])
    && text(value.previousAnswer, 10_000) && text(value.currentAnswer, 10_000) && value.previousAnswer !== value.currentAnswer;
  if (value.kind === "reservation-changed") return exactOptional(value, ["question", "kind"], ["previousReservation", "currentReservation"])
    && (value.previousReservation === undefined || text(value.previousReservation, 5_000))
    && (value.currentReservation === undefined || text(value.currentReservation, 5_000))
    && (value.previousReservation !== undefined || value.currentReservation !== undefined)
    && value.previousReservation !== value.currentReservation;
  if (value.kind === "evidence-changed") return exact(value, ["question", "kind", "previousEvidence", "currentEvidence"])
    && boundedArray(value.previousEvidence, 250, 240, false) && boundedArray(value.currentEvidence, 250, 240, false)
    && stableStringify(value.previousEvidence) !== stableStringify(value.currentEvidence);
  return false;
}

function validSummary(value, changes) {
  if (!exact(value, ["added", "removed", "changed", "unchanged"])) return false;
  if (![value.added, value.removed, value.changed, value.unchanged]
    .every((counter) => Number.isSafeInteger(counter) && counter >= 0 && counter <= 250)) return false;
  const changed = new Set(changes.filter((item) => item.kind.endsWith("changed")).map((item) => key({ text: item.question }))).size;
  return value.added === changes.filter((item) => item.kind === "added").length
    && value.removed === changes.filter((item) => item.kind === "removed").length
    && value.changed === changed;
}

export function verifyDetachedSignature(signature, expectedFingerprint) {
  try {
    if (!exact(signature, ["product", "formatVersion", "subjectType", "subjectFingerprint", "algorithm", "issuer", "publicKeyJwk", "signedAt", "signature"])
      || signature.product !== "BLACKPROOF" || signature.formatVersion !== "blackproof-delivery-signature-v1" || signature.algorithm !== "ECDSA-P256-SHA256"
      || !["delivery", "revocation"].includes(signature.subjectType) || signature.subjectFingerprint !== expectedFingerprint || !safeIssuerLabel(signature.issuer)
      || !timestamp(signature.signedAt)
      || !exactOptional(signature.publicKeyJwk, ["kty", "crv", "x", "y"], ["key_ops", "ext", "use", "kid"])
      || signature.publicKeyJwk.kty !== "EC" || signature.publicKeyJwk.crv !== "P-256"
      || !P256_COORDINATE.test(signature.publicKeyJwk.x ?? "") || !P256_COORDINATE.test(signature.publicKeyJwk.y ?? "")
      || (signature.publicKeyJwk.key_ops !== undefined && stableStringify(signature.publicKeyJwk.key_ops) !== '["verify"]')
      || (signature.publicKeyJwk.ext !== undefined && signature.publicKeyJwk.ext !== true)
      || (signature.publicKeyJwk.use !== undefined && signature.publicKeyJwk.use !== "sig")
      || (signature.publicKeyJwk.kid !== undefined && !/^[A-Za-z0-9._-]{1,64}$/.test(signature.publicKeyJwk.kid))
      || !/^[A-Za-z0-9_-]{86}$/.test(signature.signature)) return false;
    const { signature: encoded, ...base } = signature;
    const publicKey = createPublicKey({ key: signature.publicKeyJwk, format: "jwk" });
    return verifySignatureBytes("sha256", Buffer.from(stableStringify(base)), { key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(encoded, "base64url"));
  } catch { return false; }
}

export function verifyRevocation(revocation, delivery) {
  if (!exactOptional(revocation, ["product", "formatVersion", "deliveryId", "deliveryFingerprint", "status", "revokedAt", "fingerprint"], ["reason"])) return false;
  const { fingerprint, ...base } = revocation;
  return revocation.product === "BLACKPROOF" && revocation.formatVersion === "blackproof-delivery-revocation-v1" && revocation.status === "revoked"
    && DELIVERY_ID.test(revocation.deliveryId ?? "") && revocation.deliveryId === delivery.deliveryId && revocation.deliveryFingerprint === delivery.fingerprint
    && timestamp(revocation.revokedAt) && (revocation.reason === undefined || text(revocation.reason, 240))
    && FINGERPRINT.test(fingerprint) && fingerprint === `bp_sha256_${sha256Hex(stableStringify(base))}`;
}
