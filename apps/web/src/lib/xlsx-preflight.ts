import { XLSX_ACCEPTED_MIME_TYPES, XLSX_IMPORT_LIMITS, XLSX_REFUSED_EXTENSIONS } from "./xlsx-contract";

const EOCD_SIGNATURE = 0x06054b50;
const ZIP64_EOCD_SIGNATURE = 0x06064b50;
const ZIP64_LOCATOR_SIGNATURE = 0x07064b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const DATA_DESCRIPTOR_SIGNATURE = 0x08074b50;
const EOCD_BYTES = 22;
const MAX_ZIP_COMMENT_BYTES = 65_535;
const CENTRAL_DIRECTORY_HEADER_BYTES = 46;
const LOCAL_FILE_HEADER_BYTES = 30;
const MAX_CENTRAL_DIRECTORY_BYTES = 2_000_000;
const MAX_ENTRY_NAME_BYTES = 240;
const MAX_EXTRA_FIELD_BYTES = 2_048;
const DATA_DESCRIPTOR_FLAG = 0x0008;
const UTF8_NAME_FLAG = 0x0800;
const ENCRYPTED_FLAG = 0x0001;
const DEFLATE_OPTION_FLAGS = 0x0006;
const ALLOWED_FLAGS = DATA_DESCRIPTOR_FLAG | UTF8_NAME_FLAG | DEFLATE_OPTION_FLAGS;
const ZIP64_EXTRA_FIELD_ID = 0x0001;
const ALLOWED_COMPRESSION_METHODS = new Set([0, 8]);

export interface XlsxZipEntry {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  compressionMethod: number;
}

export interface XlsxPreflightResult {
  entryCount: number;
  compressedBytes: number;
  expandedBytes: number;
  worksheetCount: number;
  externalLinkPartCount: number;
  connectionPartCount: number;
  queryTablePartCount: number;
  mimeWarning?: string;
  entries: XlsxZipEntry[];
}

function readUint32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function assertSafeRange(offset: number, length: number, upperBound: number, message: string): void {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > upperBound) {
    throw new Error(message);
  }
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = bytes.byteLength - EOCD_BYTES; offset >= 0; offset -= 1) {
    if (readUint32(view, offset) !== EOCD_SIGNATURE) continue;
    const commentLength = view.getUint16(offset + 20, true);
    if (offset + EOCD_BYTES + commentLength === bytes.byteLength) return offset;
  }
  throw new Error("XLSX_ZIP_EOCD_INVALID: fin de table centrale ZIP introuvable.");
}

function decodeZipName(bytes: Uint8Array, utf8: boolean): string {
  if (!utf8 && bytes.some((byte) => byte < 0x20 || byte > 0x7e)) {
    throw new Error("XLSX_ZIP_NAME_ENCODING: nom non ASCII sans indicateur UTF-8.");
  }
  try {
    return new TextDecoder(utf8 ? "utf-8" : "ascii", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("XLSX_ZIP_NAME_ENCODING: nom d’entrée ZIP invalide.");
  }
}

function assertSafePath(name: string): void {
  const segments = name.split("/");
  if (!name || name.includes("\\") || name.includes("\0") || name.startsWith("/") || /^[A-Za-z]:/.test(name)) {
    throw new Error(`XLSX_ZIP_UNSAFE_PATH: chemin ZIP refusé : ${name || "(vide)"}.`);
  }
  if (segments.some((segment) => segment === ".." || segment === ".")) {
    throw new Error(`XLSX_ZIP_UNSAFE_PATH: traversée de chemin refusée : ${name}.`);
  }
}

function assertExtraFields(bytes: Uint8Array, label: string): void {
  if (bytes.byteLength > MAX_EXTRA_FIELD_BYTES) throw new Error(`XLSX_ZIP_EXTRA_TOO_LARGE: ${label}.`);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let cursor = 0;
  while (cursor < bytes.byteLength) {
    assertSafeRange(cursor, 4, bytes.byteLength, `XLSX_ZIP_EXTRA_INVALID: ${label}.`);
    const id = view.getUint16(cursor, true);
    const size = view.getUint16(cursor + 2, true);
    assertSafeRange(cursor + 4, size, bytes.byteLength, `XLSX_ZIP_EXTRA_INVALID: ${label}.`);
    if (id === ZIP64_EXTRA_FIELD_ID) throw new Error("XLSX_ZIP64_UNSUPPORTED: ZIP64 refusé.");
    cursor += 4 + size;
  }
}

function assertFileIdentity(file: File): string | undefined {
  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".xlsx")) {
    const refused = XLSX_REFUSED_EXTENSIONS.find((extension) => lower.endsWith(extension));
    throw new Error(`XLSX_EXTENSION_REFUSED: ${refused ?? "extension non .xlsx"}.`);
  }
  const mime = file.type.toLowerCase().split(";", 1)[0]?.trim();
  if (!(XLSX_ACCEPTED_MIME_TYPES as readonly string[]).includes(mime)) {
    throw new Error(`XLSX_MIME_REFUSED: MIME non compatible avec un fichier .xlsx : ${mime || "absent"}.`);
  }
  if (file.size > XLSX_IMPORT_LIMITS.maxCompressedBytes) {
    throw new Error(`XLSX_COMPRESSED_TOO_LARGE: maximum ${XLSX_IMPORT_LIMITS.maxCompressedBytes} octets.`);
  }
  return mime === "application/zip"
    ? "XLSX_MIME_GENERIC_ZIP: le navigateur déclare un ZIP générique ; le contenu OOXML reste contrôlé intégralement."
    : undefined;
}

export async function preflightXlsxFile(file: File): Promise<XlsxPreflightResult> {
  const mimeWarning = assertFileIdentity(file);
  if (file.size < EOCD_BYTES) throw new Error("XLSX_ZIP_TRUNCATED: archive ZIP tronquée.");
  const signature = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (signature.byteLength !== 4 || new DataView(signature.buffer, signature.byteOffset, 4).getUint32(0, true) !== LOCAL_FILE_HEADER_SIGNATURE) {
    throw new Error("XLSX_ZIP_SIGNATURE_INVALID: signature ZIP locale absente.");
  }

  const tailOffset = Math.max(0, file.size - EOCD_BYTES - MAX_ZIP_COMMENT_BYTES);
  const tail = new Uint8Array(await file.slice(tailOffset).arrayBuffer());
  const tailView = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
  const eocdInTail = findEndOfCentralDirectory(tail);
  const eocdOffset = tailOffset + eocdInTail;
  const diskNumber = tailView.getUint16(eocdInTail + 4, true);
  const centralDirectoryDisk = tailView.getUint16(eocdInTail + 6, true);
  const entriesOnDisk = tailView.getUint16(eocdInTail + 8, true);
  const entryCount = tailView.getUint16(eocdInTail + 10, true);
  const centralDirectorySize = readUint32(tailView, eocdInTail + 12);
  const centralDirectoryOffset = readUint32(tailView, eocdInTail + 16);
  const locatorOffset = eocdInTail - 20;
  const hasZip64 = (locatorOffset >= 0 && readUint32(tailView, locatorOffset) === ZIP64_LOCATOR_SIGNATURE)
    || (eocdInTail >= 4 && readUint32(tailView, eocdInTail - 4) === ZIP64_EOCD_SIGNATURE)
    || entryCount === 0xffff || entriesOnDisk === 0xffff
    || centralDirectorySize === 0xffffffff || centralDirectoryOffset === 0xffffffff;
  if (hasZip64) throw new Error("XLSX_ZIP64_UNSUPPORTED: ZIP64 refusé.");
  if (diskNumber !== 0 || centralDirectoryDisk !== 0 || entriesOnDisk !== entryCount) {
    throw new Error("XLSX_MULTIDISK_UNSUPPORTED: archive multi-disques refusée.");
  }
  if (entryCount < 1 || entryCount > XLSX_IMPORT_LIMITS.maxEntries) {
    throw new Error(`XLSX_TOO_MANY_ENTRIES: maximum ${XLSX_IMPORT_LIMITS.maxEntries}.`);
  }
  if (centralDirectorySize > MAX_CENTRAL_DIRECTORY_BYTES) throw new Error("XLSX_CENTRAL_DIRECTORY_TOO_LARGE.");
  assertSafeRange(centralDirectoryOffset, centralDirectorySize, eocdOffset, "XLSX_CENTRAL_DIRECTORY_INVALID.");
  if (centralDirectoryOffset + centralDirectorySize !== eocdOffset) throw new Error("XLSX_CENTRAL_DIRECTORY_POSITION_INVALID.");

  const centralBytes = new Uint8Array(await file.slice(centralDirectoryOffset, eocdOffset).arrayBuffer());
  const centralView = new DataView(centralBytes.buffer, centralBytes.byteOffset, centralBytes.byteLength);
  const uniqueNames = new Set<string>();
  const uniqueNamesFolded = new Set<string>();
  const uniqueOffsets = new Set<number>();
  const entries: XlsxZipEntry[] = [];
  const ranges: Array<{ start: number; payloadEnd: number; descriptor: boolean; crc32: number; compressedSize: number; uncompressedSize: number; name: string }> = [];
  let cursor = 0;
  let expandedBytes = 0;
  let compressedPayloadBytes = 0;

  for (let index = 0; index < entryCount; index += 1) {
    assertSafeRange(cursor, CENTRAL_DIRECTORY_HEADER_BYTES, centralBytes.byteLength, "XLSX_CENTRAL_ENTRY_TRUNCATED.");
    if (readUint32(centralView, cursor) !== CENTRAL_DIRECTORY_SIGNATURE) throw new Error("XLSX_CENTRAL_ENTRY_INVALID.");
    const flags = centralView.getUint16(cursor + 8, true);
    const compressionMethod = centralView.getUint16(cursor + 10, true);
    const crc32 = readUint32(centralView, cursor + 16);
    const compressedSize = readUint32(centralView, cursor + 20);
    const uncompressedSize = readUint32(centralView, cursor + 24);
    const nameLength = centralView.getUint16(cursor + 28, true);
    const extraLength = centralView.getUint16(cursor + 30, true);
    const commentLength = centralView.getUint16(cursor + 32, true);
    const startDisk = centralView.getUint16(cursor + 34, true);
    const localHeaderOffset = readUint32(centralView, cursor + 42);
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localHeaderOffset === 0xffffffff) throw new Error("XLSX_ZIP64_UNSUPPORTED: ZIP64 refusé.");
    if (startDisk !== 0) throw new Error("XLSX_MULTIDISK_UNSUPPORTED: archive multi-disques refusée.");
    if ((flags & ENCRYPTED_FLAG) !== 0 || (flags & ~ALLOWED_FLAGS) !== 0) throw new Error("XLSX_ZIP_FLAGS_REFUSED: chiffrement ou flags ZIP non pris en charge.");
    if (!ALLOWED_COMPRESSION_METHODS.has(compressionMethod)) throw new Error(`XLSX_COMPRESSION_REFUSED: méthode ${compressionMethod}.`);
    if (nameLength < 1 || nameLength > MAX_ENTRY_NAME_BYTES) throw new Error("XLSX_ZIP_NAME_LENGTH_INVALID.");
    const fullLength = CENTRAL_DIRECTORY_HEADER_BYTES + nameLength + extraLength + commentLength;
    assertSafeRange(cursor, fullLength, centralBytes.byteLength, "XLSX_CENTRAL_ENTRY_TRUNCATED.");
    const nameStart = cursor + CENTRAL_DIRECTORY_HEADER_BYTES;
    const name = decodeZipName(centralBytes.subarray(nameStart, nameStart + nameLength), (flags & UTF8_NAME_FLAG) !== 0);
    assertSafePath(name);
    const folded = name.toLowerCase();
    if (uniqueNames.has(name) || uniqueNamesFolded.has(folded)) throw new Error(`XLSX_DUPLICATE_ENTRY: ${name}.`);
    uniqueNames.add(name);
    uniqueNamesFolded.add(folded);
    if (uniqueOffsets.has(localHeaderOffset)) throw new Error("XLSX_DUPLICATE_LOCAL_OFFSET.");
    uniqueOffsets.add(localHeaderOffset);
    assertExtraFields(centralBytes.subarray(nameStart + nameLength, nameStart + nameLength + extraLength), `entrée centrale ${name}`);
    if (compressedSize === 0 && uncompressedSize > 0) throw new Error(`XLSX_INVALID_ENTRY_SIZE: ${name}.`);
    if (compressedSize > 0 && uncompressedSize / compressedSize > XLSX_IMPORT_LIMITS.maxCompressionRatio) {
      throw new Error(`XLSX_COMPRESSION_RATIO_EXCEEDED: ${name}.`);
    }
    if (name === "xl/sharedStrings.xml" && uncompressedSize > XLSX_IMPORT_LIMITS.maxSharedStringsBytes) throw new Error("XLSX_SHARED_STRINGS_TOO_LARGE.");
    if (/^xl\/worksheets\/[^/]+\.xml$/i.test(name) && uncompressedSize > XLSX_IMPORT_LIMITS.maxWorksheetBytes) throw new Error(`XLSX_WORKSHEET_TOO_LARGE: ${name}.`);

    const localHeader = new Uint8Array(await file.slice(localHeaderOffset, localHeaderOffset + LOCAL_FILE_HEADER_BYTES).arrayBuffer());
    if (localHeader.byteLength !== LOCAL_FILE_HEADER_BYTES) throw new Error("XLSX_LOCAL_HEADER_TRUNCATED.");
    const localView = new DataView(localHeader.buffer, localHeader.byteOffset, localHeader.byteLength);
    if (readUint32(localView, 0) !== LOCAL_FILE_HEADER_SIGNATURE) throw new Error("XLSX_LOCAL_HEADER_INVALID.");
    const localFlags = localView.getUint16(6, true);
    const localMethod = localView.getUint16(8, true);
    const localCrc32 = readUint32(localView, 14);
    const localCompressedSize = readUint32(localView, 18);
    const localUncompressedSize = readUint32(localView, 22);
    const localNameLength = localView.getUint16(26, true);
    const localExtraLength = localView.getUint16(28, true);
    if (localNameLength > MAX_ENTRY_NAME_BYTES || localExtraLength > MAX_EXTRA_FIELD_BYTES) throw new Error("XLSX_LOCAL_HEADER_LENGTH_INVALID.");
    const localNameOffset = localHeaderOffset + LOCAL_FILE_HEADER_BYTES;
    const localExtraOffset = localNameOffset + localNameLength;
    const dataOffset = localExtraOffset + localExtraLength;
    assertSafeRange(localNameOffset, localNameLength + localExtraLength, centralDirectoryOffset, "XLSX_LOCAL_HEADER_RANGE_INVALID.");
    assertSafeRange(dataOffset, compressedSize, centralDirectoryOffset, "XLSX_ENTRY_DATA_RANGE_INVALID.");
    const localNameBytes = new Uint8Array(await file.slice(localNameOffset, localNameOffset + localNameLength).arrayBuffer());
    if (decodeZipName(localNameBytes, (localFlags & UTF8_NAME_FLAG) !== 0) !== name) throw new Error(`XLSX_LOCAL_NAME_MISMATCH: ${name}.`);
    const localExtra = new Uint8Array(await file.slice(localExtraOffset, dataOffset).arrayBuffer());
    assertExtraFields(localExtra, `entrée locale ${name}`);
    if (localFlags !== flags || localMethod !== compressionMethod) throw new Error(`XLSX_LOCAL_METADATA_MISMATCH: ${name}.`);
    const descriptor = (flags & DATA_DESCRIPTOR_FLAG) !== 0;
    if (descriptor) {
      if ((localCrc32 !== 0 && localCrc32 !== crc32) || (localCompressedSize !== 0 && localCompressedSize !== compressedSize) || (localUncompressedSize !== 0 && localUncompressedSize !== uncompressedSize)) {
        throw new Error(`XLSX_LOCAL_DESCRIPTOR_MISMATCH: ${name}.`);
      }
    } else if (localCrc32 !== crc32 || localCompressedSize !== compressedSize || localUncompressedSize !== uncompressedSize) {
      throw new Error(`XLSX_LOCAL_METADATA_MISMATCH: ${name}.`);
    }
    ranges.push({ start: localHeaderOffset, payloadEnd: dataOffset + compressedSize, descriptor, crc32, compressedSize, uncompressedSize, name });
    entries.push({ name, compressedSize, uncompressedSize, compressionMethod });
    expandedBytes += uncompressedSize;
    compressedPayloadBytes += compressedSize;
    if (expandedBytes > XLSX_IMPORT_LIMITS.maxExpandedBytes) throw new Error(`XLSX_EXPANDED_TOO_LARGE: maximum ${XLSX_IMPORT_LIMITS.maxExpandedBytes} octets.`);
    cursor += fullLength;
  }

  if (cursor !== centralBytes.byteLength) throw new Error("XLSX_CENTRAL_DIRECTORY_SIZE_MISMATCH.");
  ranges.sort((left, right) => left.start - right.start);
  if (ranges[0]?.start !== 0) throw new Error("XLSX_ZIP_PREFIX_REFUSED.");
  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index]!;
    const boundary = ranges[index + 1]?.start ?? centralDirectoryOffset;
    if (range.payloadEnd > boundary) throw new Error(`XLSX_ENTRY_OVERLAP: ${range.name}.`);
    if (!range.descriptor) {
      if (range.payloadEnd !== boundary) throw new Error(`XLSX_ZIP_GAP_REFUSED: ${range.name}.`);
      continue;
    }
    const descriptorBytes = new Uint8Array(await file.slice(range.payloadEnd, boundary).arrayBuffer());
    if (descriptorBytes.byteLength !== 12 && descriptorBytes.byteLength !== 16) throw new Error(`XLSX_DATA_DESCRIPTOR_INVALID: ${range.name}.`);
    const descriptorView = new DataView(descriptorBytes.buffer, descriptorBytes.byteOffset, descriptorBytes.byteLength);
    const valueOffset = descriptorBytes.byteLength === 16 ? 4 : 0;
    if (valueOffset === 4 && readUint32(descriptorView, 0) !== DATA_DESCRIPTOR_SIGNATURE) throw new Error(`XLSX_DATA_DESCRIPTOR_INVALID: ${range.name}.`);
    if (readUint32(descriptorView, valueOffset) !== range.crc32 || readUint32(descriptorView, valueOffset + 4) !== range.compressedSize || readUint32(descriptorView, valueOffset + 8) !== range.uncompressedSize) {
      throw new Error(`XLSX_DATA_DESCRIPTOR_MISMATCH: ${range.name}.`);
    }
  }

  const required = ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels"];
  for (const name of required) if (!uniqueNames.has(name)) throw new Error(`XLSX_REQUIRED_PART_MISSING: ${name}.`);
  const activePart = entries.find(({ name }) => /(^|\/)(vbaProject\.bin|embeddings\/|activeX\/|ctrlProps\/|customUI\/)/i.test(name));
  if (activePart) throw new Error(`XLSX_ACTIVE_CONTENT_REFUSED: ${activePart.name}.`);
  const worksheetCount = entries.filter(({ name }) => /^xl\/worksheets\/[^/]+\.xml$/i.test(name)).length;
  if (worksheetCount < 1 || worksheetCount > XLSX_IMPORT_LIMITS.maxSheets) throw new Error(`XLSX_SHEET_LIMIT_EXCEEDED: maximum ${XLSX_IMPORT_LIMITS.maxSheets}.`);
  if (compressedPayloadBytes > 0 && expandedBytes / compressedPayloadBytes > XLSX_IMPORT_LIMITS.maxCompressionRatio) throw new Error("XLSX_TOTAL_COMPRESSION_RATIO_EXCEEDED.");
  const externalLinkPartCount = entries.filter(({ name }) => /^xl\/externalLinks\/externalLink\d+\.xml$/i.test(name)).length;
  const connectionPartCount = entries.filter(({ name }) => /^xl\/connections\.xml$/i.test(name)).length;
  const queryTablePartCount = entries.filter(({ name }) => /^xl\/queryTables\/[^/]+\.xml$/i.test(name)).length;

  return { entryCount, compressedBytes: file.size, expandedBytes, worksheetCount, externalLinkPartCount, connectionPartCount, queryTablePartCount, ...(mimeWarning ? { mimeWarning } : {}), entries };
}
