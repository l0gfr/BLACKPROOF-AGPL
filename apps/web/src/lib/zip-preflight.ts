const EOCD_SIGNATURE = 0x06054b50;
const ZIP64_EOCD_SIGNATURE = 0x06064b50;
const ZIP64_LOCATOR_SIGNATURE = 0x07064b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const EOCD_BYTES = 22;
const MAX_ZIP_COMMENT_BYTES = 65_535;
const MAX_ALLOWED_ZIP_COMMENT_BYTES = 160;
const CENTRAL_DIRECTORY_HEADER_BYTES = 46;
const LOCAL_FILE_HEADER_BYTES = 30;
const MAX_CENTRAL_DIRECTORY_BYTES = 256 * 1024;
const MAX_ENTRY_NAME_BYTES = 180;
const DATA_DESCRIPTOR_FLAG = 0x0008;
const UTF8_NAME_FLAG = 0x0800;
const ALLOWED_COMPRESSION_METHODS = new Set([0, 8]);

export interface ZipCentralDirectoryPreflight {
  entryCount: number;
  centralDirectoryOffset: number;
  centralDirectorySize: number;
  comment: string;
  names: string[];
  entries: Array<{
    name: string;
    crc32: number;
    compressedSize: number;
    uncompressedSize: number;
  }>;
}

function readUint32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = bytes.byteLength - EOCD_BYTES; offset >= 0; offset -= 1) {
    if (readUint32(view, offset) !== EOCD_SIGNATURE) continue;
    const commentLength = view.getUint16(offset + 20, true);
    if (offset + EOCD_BYTES + commentLength === bytes.byteLength) return offset;
  }
  throw new Error("Fin de table centrale ZIP introuvable.");
}

function decodeAsciiZipName(bytes: Uint8Array): string {
  if (bytes.some((byte) => byte < 0x20 || byte > 0x7e)) {
    throw new Error("Nom d’entrée ZIP non ASCII non pris en charge.");
  }
  return String.fromCharCode(...bytes);
}

function assertSafeRange(offset: number, length: number, upperBound: number, message: string): void {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > upperBound) {
    throw new Error(message);
  }
}

export async function inspectZipCentralDirectory(file: Blob, maxEntries: number): Promise<ZipCentralDirectoryPreflight> {
  if (!Number.isSafeInteger(maxEntries) || maxEntries < 1 || maxEntries > 0xffff) {
    throw new Error("Limite d’entrées ZIP invalide.");
  }
  if (file.size < EOCD_BYTES) throw new Error("Archive ZIP tronquée.");

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
  const eocdCommentLength = tailView.getUint16(eocdInTail + 20, true);

  const locatorOffset = eocdInTail - 20;
  const hasZip64Locator = locatorOffset >= 0 && readUint32(tailView, locatorOffset) === ZIP64_LOCATOR_SIGNATURE;
  const hasZip64Record = eocdInTail >= 4 && readUint32(tailView, eocdInTail - 4) === ZIP64_EOCD_SIGNATURE;
  if (hasZip64Locator || hasZip64Record || entryCount === 0xffff || entriesOnDisk === 0xffff || centralDirectorySize === 0xffffffff || centralDirectoryOffset === 0xffffffff) {
    throw new Error("ZIP64 non pris en charge pour les sauvegardes BLACKPROOF.");
  }
  if (diskNumber !== 0 || centralDirectoryDisk !== 0 || entriesOnDisk !== entryCount) {
    throw new Error("Archives ZIP multi-disques non prises en charge.");
  }
  if (eocdCommentLength > MAX_ALLOWED_ZIP_COMMENT_BYTES) throw new Error("Commentaire EOCD ZIP trop volumineux.");
  const comment = decodeAsciiZipName(tail.subarray(eocdInTail + EOCD_BYTES, eocdInTail + EOCD_BYTES + eocdCommentLength));
  if (entryCount > maxEntries) throw new Error("La sauvegarde contient trop d’entrées.");
  if (centralDirectorySize > MAX_CENTRAL_DIRECTORY_BYTES) throw new Error("Table centrale ZIP trop volumineuse.");
  assertSafeRange(centralDirectoryOffset, centralDirectorySize, eocdOffset, "Table centrale ZIP invalide.");
  if (centralDirectoryOffset + centralDirectorySize !== eocdOffset) throw new Error("Position de la table centrale ZIP invalide.");

  const centralBytes = new Uint8Array(await file.slice(centralDirectoryOffset, eocdOffset).arrayBuffer());
  const centralView = new DataView(centralBytes.buffer, centralBytes.byteOffset, centralBytes.byteLength);
  const names: string[] = [];
  const entries: ZipCentralDirectoryPreflight["entries"] = [];
  const uniqueNames = new Set<string>();
  const uniqueLocalHeaderOffsets = new Set<number>();
  const localRanges: Array<{ start: number; end: number; name: string }> = [];
  let cursor = 0;

  for (let index = 0; index < entryCount; index += 1) {
    assertSafeRange(cursor, CENTRAL_DIRECTORY_HEADER_BYTES, centralBytes.byteLength, "Table centrale ZIP tronquée.");
    if (readUint32(centralView, cursor) !== CENTRAL_DIRECTORY_SIGNATURE) throw new Error("Entrée de table centrale ZIP invalide.");
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
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localHeaderOffset === 0xffffffff) {
      throw new Error("ZIP64 non pris en charge pour les sauvegardes BLACKPROOF.");
    }
    if (startDisk !== 0) throw new Error("Archives ZIP multi-disques non prises en charge.");
    if (extraLength !== 0 || commentLength !== 0) throw new Error("Champs extra et commentaires d’entrée ZIP non autorisés.");
    if (localHeaderOffset >= centralDirectoryOffset && entryCount > 0) throw new Error("Position d’entrée ZIP invalide.");
    if (uniqueLocalHeaderOffsets.has(localHeaderOffset)) throw new Error("Offset d’en-tête local ZIP dupliqué.");
    uniqueLocalHeaderOffsets.add(localHeaderOffset);
    if (nameLength > MAX_ENTRY_NAME_BYTES) throw new Error("Nom d’entrée ZIP trop long.");
    const fullLength = CENTRAL_DIRECTORY_HEADER_BYTES + nameLength + extraLength + commentLength;
    assertSafeRange(cursor, fullLength, centralBytes.byteLength, "Entrée de table centrale ZIP tronquée.");
    const nameStart = cursor + CENTRAL_DIRECTORY_HEADER_BYTES;
    const name = decodeAsciiZipName(centralBytes.subarray(nameStart, nameStart + nameLength));
    if (!name || uniqueNames.has(name)) throw new Error(`Nom d’entrée ZIP dupliqué ou vide : ${name || "(vide)"}.`);
    uniqueNames.add(name);
    names.push(name);
    entries.push({ name, crc32, compressedSize, uncompressedSize });

    const localHeaderBytes = new Uint8Array(await file.slice(localHeaderOffset, localHeaderOffset + LOCAL_FILE_HEADER_BYTES).arrayBuffer());
    if (localHeaderBytes.byteLength !== LOCAL_FILE_HEADER_BYTES) throw new Error("En-tête local ZIP tronqué.");
    const localView = new DataView(localHeaderBytes.buffer, localHeaderBytes.byteOffset, localHeaderBytes.byteLength);
    if (readUint32(localView, 0) !== LOCAL_FILE_HEADER_SIGNATURE) throw new Error("Signature d’en-tête local ZIP invalide.");
    const localFlags = localView.getUint16(6, true);
    const localCompressionMethod = localView.getUint16(8, true);
    const localCrc32 = readUint32(localView, 14);
    const localCompressedSize = readUint32(localView, 18);
    const localUncompressedSize = readUint32(localView, 22);
    const localNameLength = localView.getUint16(26, true);
    const localExtraLength = localView.getUint16(28, true);
    if (localNameLength > MAX_ENTRY_NAME_BYTES) throw new Error("Nom local d’entrée ZIP trop long.");
    if (localExtraLength !== 0) throw new Error("Champs extra ZIP locaux non autorisés.");
    const localNameOffset = localHeaderOffset + LOCAL_FILE_HEADER_BYTES;
    const dataOffset = localNameOffset + localNameLength + localExtraLength;
    assertSafeRange(localNameOffset, localNameLength, centralDirectoryOffset, "Nom local d’entrée ZIP tronqué.");
    assertSafeRange(dataOffset, compressedSize, centralDirectoryOffset, "Données d’entrée ZIP chevauchant la table centrale.");
    const localNameBytes = new Uint8Array(await file.slice(localNameOffset, localNameOffset + localNameLength).arrayBuffer());
    const localName = decodeAsciiZipName(localNameBytes);
    if (localName !== name) throw new Error(`Le nom local ZIP diffère du nom central : ${name}.`);
    if (localFlags !== flags) throw new Error(`Les flags ZIP locaux diffèrent des flags centraux : ${name}.`);
    if ((flags & DATA_DESCRIPTOR_FLAG) !== 0) throw new Error(`Les data descriptors ZIP ne sont pas pris en charge : ${name}.`);
    if (localCompressionMethod !== compressionMethod) throw new Error(`La compression ZIP locale diffère de la compression centrale : ${name}.`);
    if ((flags & ~UTF8_NAME_FLAG) !== 0) throw new Error(`Flags ZIP non autorisés : ${name}.`);
    if (!ALLOWED_COMPRESSION_METHODS.has(compressionMethod)) throw new Error(`Méthode de compression ZIP non autorisée : ${name}.`);
    if (
      localCrc32 !== crc32 ||
      localCompressedSize !== compressedSize ||
      localUncompressedSize !== uncompressedSize
    ) {
      throw new Error(`Les tailles ou le CRC ZIP locaux diffèrent de la table centrale : ${name}.`);
    }
    localRanges.push({ start: localHeaderOffset, end: dataOffset + compressedSize, name });
    cursor += fullLength;
  }

  if (cursor !== centralBytes.byteLength) throw new Error("Taille de table centrale ZIP incohérente.");
  localRanges.sort((left, right) => left.start - right.start);
  if (localRanges.length === 0 && centralDirectoryOffset !== 0) throw new Error("Préfixe ZIP sans entrée non autorisé.");
  if (localRanges.length > 0 && localRanges[0].start !== 0) throw new Error("Préfixe avant la première entrée ZIP non autorisé.");
  for (let index = 1; index < localRanges.length; index += 1) {
    const previous = localRanges[index - 1];
    const current = localRanges[index];
    if (current.start < previous.end) {
      throw new Error(`Plages d’entrées ZIP locales chevauchées : ${previous.name} / ${current.name}.`);
    }
    if (current.start !== previous.end) throw new Error(`Espace inutilisé entre les entrées ZIP : ${previous.name} / ${current.name}.`);
  }
  if (localRanges.length > 0 && localRanges[localRanges.length - 1].end !== centralDirectoryOffset) {
    throw new Error("Espace inutilisé avant la table centrale ZIP.");
  }
  return { entryCount, centralDirectoryOffset, centralDirectorySize, comment, names, entries };
}
