import { createHash } from "node:crypto";
import { closeSync, constants, fstatSync, openSync, readSync } from "node:fs";
import { TextDecoder } from "node:util";
import JSZip from "jszip";

const MAX_ARCHIVE_BYTES = 100_000_000;
const MAX_ENTRY_COUNT = 10_000;
const MAX_ENTRY_BYTES = 32_000_000;
const MAX_MANIFEST_BYTES = 10_000_000;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 200_000_000;
const SHA256 = /^[a-f0-9]{64}$/;

const bundlePath = process.argv[2] ?? "artifacts/blackproof-production-bundle.zip";

function readBoundedArchive(path) {
  const descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = fstatSync(descriptor, { bigint: true });
    if (!before.isFile()) throw new Error("Production bundle must be a regular non-symlink file.");
    if (before.size < 0n || before.size > BigInt(MAX_ARCHIVE_BYTES)) {
      throw new Error("Production bundle exceeds the 100 MB verification limit.");
    }
    const size = Number(before.size);
    const content = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const count = readSync(descriptor, content, offset, Math.min(1_048_576, size - offset), offset);
      if (count === 0) throw new Error("Production bundle changed or ended during bounded verification read.");
      offset += count;
    }
    const overflowProbe = Buffer.alloc(1);
    if (readSync(descriptor, overflowProbe, 0, 1, size) !== 0) {
      throw new Error("Production bundle grew during bounded verification read.");
    }
    const after = fstatSync(descriptor, { bigint: true });
    if (!after.isFile() || after.size !== before.size
      || after.mtimeNs !== before.mtimeNs || after.ctimeNs !== before.ctimeNs) {
      throw new Error("Production bundle changed during bounded verification read.");
    }
    return content;
  } finally {
    closeSync(descriptor);
  }
}

const bytes = readBoundedArchive(bundlePath);

function unsafePath(name) {
  return typeof name !== "string"
    || name.length === 0
    || name.startsWith("/")
    || name.includes("\\")
    || name.includes("\0")
    || name.split("/").some((segment) => segment === "" || segment === "." || segment === "..");
}

function assertNoZip64Extra(path, extra) {
  let cursor = 0;
  while (cursor < extra.length) {
    if (cursor + 4 > extra.length) throw new Error(`Production bundle has a malformed extra field: ${path}`);
    const identifier = extra.readUInt16LE(cursor);
    const length = extra.readUInt16LE(cursor + 2);
    cursor += 4;
    if (cursor + length > extra.length) throw new Error(`Production bundle has a malformed extra field: ${path}`);
    if (identifier === 0x0001) throw new Error(`ZIP64 production bundle entries are forbidden: ${path}`);
    cursor += length;
  }
}

function inspectZipCentralDirectory(content) {
  if (content.length < 22) throw new Error("Production bundle has no valid ZIP end record.");
  const eocdMinimum = Math.max(0, content.length - 65_557);
  let eocdOffset = -1;
  for (let offset = content.length - 22; offset >= eocdMinimum; offset -= 1) {
    if (content.readUInt32LE(offset) !== 0x06054b50) continue;
    const commentLength = content.readUInt16LE(offset + 20);
    if (offset + 22 + commentLength === content.length) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("Production bundle has no valid ZIP end record.");

  const disk = content.readUInt16LE(eocdOffset + 4);
  const centralDisk = content.readUInt16LE(eocdOffset + 6);
  const diskEntries = content.readUInt16LE(eocdOffset + 8);
  const totalEntries = content.readUInt16LE(eocdOffset + 10);
  const centralSize = content.readUInt32LE(eocdOffset + 12);
  const centralOffset = content.readUInt32LE(eocdOffset + 16);
  const hasZip64Locator = eocdOffset >= 20 && content.readUInt32LE(eocdOffset - 20) === 0x07064b50;
  if (disk !== 0 || centralDisk !== 0 || diskEntries !== totalEntries
    || totalEntries === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff
    || hasZip64Locator) {
    throw new Error("Multi-disk and ZIP64 production bundles are forbidden.");
  }
  if (totalEntries === 0 || totalEntries > MAX_ENTRY_COUNT) {
    throw new Error(`Production bundle entry count exceeds its limit: ${totalEntries}.`);
  }
  if (centralOffset + centralSize !== eocdOffset) {
    throw new Error("Production bundle has an inconsistent central directory.");
  }

  const decoder = new TextDecoder("utf-8", { fatal: true });
  const entries = [];
  const names = new Set();
  let declaredTotal = 0;
  let cursor = centralOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    if (cursor + 46 > eocdOffset || content.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error("Production bundle has an invalid central-directory entry.");
    }
    const versionMadeBy = content.readUInt16LE(cursor + 4);
    const flags = content.readUInt16LE(cursor + 8);
    const method = content.readUInt16LE(cursor + 10);
    const crc32 = content.readUInt32LE(cursor + 16);
    const compressedSize = content.readUInt32LE(cursor + 20);
    const uncompressedSize = content.readUInt32LE(cursor + 24);
    const nameLength = content.readUInt16LE(cursor + 28);
    const extraLength = content.readUInt16LE(cursor + 30);
    const commentLength = content.readUInt16LE(cursor + 32);
    const externalAttributes = content.readUInt32LE(cursor + 38);
    const localOffset = content.readUInt32LE(cursor + 42);
    const end = cursor + 46 + nameLength + extraLength + commentLength;
    if (end > eocdOffset || (flags & 1) !== 0 || (method !== 0 && method !== 8)
      || compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localOffset === 0xffffffff) {
      throw new Error("Production bundle has an encrypted, unsupported or ZIP64 entry.");
    }
    const creatorSystem = versionMadeBy >>> 8;
    const unixMode = externalAttributes >>> 16;
    if (creatorSystem !== 3 || unixMode !== 0o100644 || (externalAttributes & 0x10) !== 0) {
      throw new Error("Production bundle entries must be canonical UNIX regular files with mode 0644.");
    }
    let name;
    try {
      name = decoder.decode(content.subarray(cursor + 46, cursor + 46 + nameLength));
    } catch {
      throw new Error("Production bundle has a non-UTF-8 entry name.");
    }
    if (unsafePath(name) || names.has(name)) {
      throw new Error(`Production bundle contains an unsafe or duplicate entry: ${name}`);
    }
    const centralExtra = content.subarray(cursor + 46 + nameLength, cursor + 46 + nameLength + extraLength);
    assertNoZip64Extra(name, centralExtra);
    if (uncompressedSize > MAX_ENTRY_BYTES || compressedSize > MAX_ARCHIVE_BYTES) {
      throw new Error(`Production bundle entry exceeds its declared size limit: ${name}`);
    }
    declaredTotal += uncompressedSize;
    if (declaredTotal > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new Error("Production bundle exceeds its total uncompressed-size limit.");
    }

    if (localOffset + 30 > centralOffset || content.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`Production bundle has an invalid local entry: ${name}`);
    }
    const localFlags = content.readUInt16LE(localOffset + 6);
    const localMethod = content.readUInt16LE(localOffset + 8);
    const localCrc32 = content.readUInt32LE(localOffset + 14);
    const localCompressedSize = content.readUInt32LE(localOffset + 18);
    const localUncompressedSize = content.readUInt32LE(localOffset + 22);
    const localNameLength = content.readUInt16LE(localOffset + 26);
    const localExtraLength = content.readUInt16LE(localOffset + 28);
    const localDataOffset = localOffset + 30 + localNameLength + localExtraLength;
    if (localDataOffset + compressedSize > centralOffset || localFlags !== flags || localMethod !== method) {
      throw new Error(`Production bundle local metadata mismatch: ${name}`);
    }
    let localName;
    try {
      localName = decoder.decode(content.subarray(localOffset + 30, localOffset + 30 + localNameLength));
    } catch {
      throw new Error(`Production bundle has a non-UTF-8 local entry name: ${name}`);
    }
    if (localName !== name) throw new Error(`Production bundle local name mismatch: ${name}`);
    const localExtra = content.subarray(localOffset + 30 + localNameLength, localDataOffset);
    assertNoZip64Extra(name, localExtra);
    if ((flags & 8) === 0
      && (localCrc32 !== crc32 || localCompressedSize !== compressedSize || localUncompressedSize !== uncompressedSize)) {
      throw new Error(`Production bundle local size or checksum metadata mismatch: ${name}`);
    }

    names.add(name);
    entries.push({ name, flags, crc32, compressedSize, uncompressedSize, localOffset, localDataOffset });
    cursor = end;
  }
  if (cursor !== eocdOffset) throw new Error("Production bundle central inventory does not terminate exactly.");

  const localOrder = [...entries].sort((left, right) => left.localOffset - right.localOffset);
  let expectedLocalOffset = 0;
  for (let index = 0; index < localOrder.length; index += 1) {
    const entry = localOrder[index];
    if (entry.localOffset !== expectedLocalOffset) {
      throw new Error(`Production bundle contains unlisted local data before: ${entry.name}`);
    }
    const dataEnd = entry.localDataOffset + entry.compressedSize;
    const nextOffset = localOrder[index + 1]?.localOffset ?? centralOffset;
    if ((entry.flags & 8) === 0) {
      expectedLocalOffset = dataEnd;
      continue;
    }
    const descriptorLength = nextOffset - dataEnd;
    const signedDescriptor = descriptorLength === 16 && content.readUInt32LE(dataEnd) === 0x08074b50;
    if ((!signedDescriptor && descriptorLength !== 12) || dataEnd + descriptorLength > centralOffset) {
      throw new Error(`Production bundle has an invalid data descriptor: ${entry.name}`);
    }
    const descriptorOffset = dataEnd + (signedDescriptor ? 4 : 0);
    if (content.readUInt32LE(descriptorOffset) !== entry.crc32
      || content.readUInt32LE(descriptorOffset + 4) !== entry.compressedSize
      || content.readUInt32LE(descriptorOffset + 8) !== entry.uncompressedSize) {
      throw new Error(`Production bundle data descriptor mismatch: ${entry.name}`);
    }
    expectedLocalOffset = nextOffset;
  }
  if (expectedLocalOffset !== centralOffset) throw new Error("Production bundle contains unlisted local data before its central directory.");
  return entries;
}

function extractBoundedEntry(entry, expected, cumulative, capture = false) {
  return new Promise((resolveEntry, rejectEntry) => {
    const chunks = [];
    const digest = createHash("sha256");
    const stream = entry.internalStream("uint8array");
    let size = 0;
    let settled = false;
    const reject = (error) => {
      if (settled) return;
      settled = true;
      stream.pause();
      rejectEntry(error);
    };
    stream.on("data", (chunk) => {
      if (settled) return;
      size += chunk.byteLength;
      cumulative.bytes += chunk.byteLength;
      if (size > expected.uncompressedSize || size > expected.maximumBytes
        || cumulative.bytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
        reject(new Error(`Production bundle entry expands beyond its verified limit: ${entry.name}`));
        return;
      }
      const content = Buffer.from(chunk);
      digest.update(content);
      if (capture) chunks.push(content);
    });
    stream.on("error", (error) => reject(error));
    stream.on("end", () => {
      if (settled) return;
      if (size !== expected.uncompressedSize) {
        reject(new Error(`Production bundle entry size mismatch after extraction: ${entry.name}`));
        return;
      }
      settled = true;
      resolveEntry({
        content: capture ? Buffer.concat(chunks, size) : null,
        sha256: digest.digest("hex"),
        size,
      });
    });
    stream.resume();
  });
}

function validateDescriptor(descriptor, label) {
  if (!descriptor || typeof descriptor !== "object" || Array.isArray(descriptor)
    || unsafePath(descriptor.path)
    || !Number.isSafeInteger(descriptor.size) || descriptor.size < 0 || descriptor.size > MAX_ENTRY_BYTES
    || typeof descriptor.sha256 !== "string" || !SHA256.test(descriptor.sha256)) {
    throw new Error(`Deployment manifest contains an invalid ${label} descriptor.`);
  }
}

const centralEntries = inspectZipCentralDirectory(bytes);
const centralByName = new Map(centralEntries.map((entry) => [entry.name, entry]));
const archive = await JSZip.loadAsync(bytes, { checkCRC32: false, createFolders: false });
const entries = Object.values(archive.files);
if (entries.length !== centralEntries.length
  || entries.some((entry) => entry.dir
    || (entry.unsafeOriginalName ?? entry.name) !== entry.name
    || unsafePath(entry.name)
    || entry?._data?.uncompressedSize !== centralByName.get(entry.name)?.uncompressedSize)) {
  throw new Error("Production bundle contains an ambiguous, unsafe or inconsistent ZIP entry.");
}

const manifestEntry = archive.file("artifacts/artifact-manifest.json");
const manifestCentral = centralByName.get("artifacts/artifact-manifest.json");
if (!manifestEntry || !manifestCentral || manifestCentral.uncompressedSize > MAX_MANIFEST_BYTES) {
  throw new Error("Production bundle has no bounded deployment manifest.");
}
const cumulative = { bytes: 0 };
const extractedManifest = await extractBoundedEntry(manifestEntry, {
  uncompressedSize: manifestCentral.uncompressedSize,
  maximumBytes: MAX_MANIFEST_BYTES,
}, cumulative, true);
const manifestText = extractedManifest.content.toString("utf8");
const manifest = JSON.parse(manifestText);
if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)
  || !Array.isArray(manifest.files) || !Array.isArray(manifest.releaseComponents)) {
  throw new Error("Deployment manifest has an invalid root or inventory.");
}
const { artifactSha256, ...manifestWithoutDigest } = manifest;
const manifestDigest = createHash("sha256").update(JSON.stringify(manifestWithoutDigest)).digest("hex");
if (artifactSha256 !== manifestDigest || !SHA256.test(artifactSha256)) {
  throw new Error("Deployment manifest self-digest mismatch.");
}

const expected = new Map();
for (const descriptor of manifest.files) {
  validateDescriptor(descriptor, "public file");
  const path = `apps/web/dist/${descriptor.path}`;
  if (expected.has(path)) throw new Error(`Deployment manifest contains a duplicate path: ${path}`);
  expected.set(path, descriptor);
}
for (const descriptor of manifest.releaseComponents) {
  validateDescriptor(descriptor, "release component");
  if (expected.has(descriptor.path)) throw new Error(`Deployment manifest contains a duplicate path: ${descriptor.path}`);
  expected.set(descriptor.path, descriptor);
}
expected.set("artifacts/artifact-manifest.json", {
  size: extractedManifest.size,
  sha256: extractedManifest.sha256,
});
if (expected.size !== entries.length) {
  throw new Error(`Production bundle inventory mismatch: expected ${expected.size}, found ${entries.length}.`);
}

for (const entry of entries) {
  if (entry.name === "artifacts/artifact-manifest.json") continue;
  const descriptor = expected.get(entry.name);
  const central = centralByName.get(entry.name);
  if (!descriptor || !central) throw new Error(`Unexpected production bundle entry: ${entry.name}`);
  if (central.uncompressedSize !== descriptor.size) {
    throw new Error(`Production bundle declared-size mismatch: ${entry.name}`);
  }
  const extracted = await extractBoundedEntry(entry, {
    uncompressedSize: descriptor.size,
    maximumBytes: MAX_ENTRY_BYTES,
  }, cumulative);
  if (extracted.sha256 !== descriptor.sha256) {
    throw new Error(`Production bundle checksum mismatch: ${entry.name}`);
  }
}

console.log(`Production bundle restore verification passed: ${entries.length} files, manifest ${artifactSha256}`);
