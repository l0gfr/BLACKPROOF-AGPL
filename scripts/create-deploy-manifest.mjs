import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { TextDecoder } from "node:util";
import JSZip from "jszip";

const distDir = process.argv[2] ?? "apps/web/dist";
const outputPath = process.argv[3] ?? "artifacts/artifact-manifest.json";
const publicOnly = process.argv.includes("--public-only");
const forbiddenPublicSuffix = /\.(?:map|pem|key|env|log|sqlite|db|bak|old|orig|tmp|swp|ts|tsx|mjs|cjs|svelte|astro)$/i;
const compressedPublicSuffix = /\.(?:zip|7z|rar|tar|tgz|gz|bz2|xz|zst|br|jar|war|dmg|iso)$/i;
const allowedPublicArchives = new Map([
  ["demo/proofpack-delivery-demo.zip", new Set([
    "delivery.json",
    "reponse-fournisseur.md",
    "references-preuves.csv",
    "README.md",
    "manifest.json",
  ])],
]);
const releaseComponentPaths = [
  "artifacts/blackproof.fr.conf",
  "artifacts/blackproof-sbom.cdx.json",
  "scripts/smoke-apache-prod.sh",
  "scripts/verify-release-directory.mjs",
  "deploy/server/promote-static-release.sh",
  "deploy/server/activate-static-release.sh",
  "deploy/server/snapshot-verified-release-components.mjs",
];
const forbiddenSecretPatterns = [
  { pattern: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/, label: "private key PEM" },
  { pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}\b/, label: "Stripe secret key" },
  { pattern: /\bAKIA[A-Z0-9]{16}\b/, label: "AWS access key" },
  { pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/, label: "GitHub credential" },
  { pattern: /^BLACKPROOF_LICENSE_PRIVATE_KEY_PEM=(?!replace_|\s*$).+/m, label: "configured BLACKPROOF signing key" },
];
const crc32Table = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  crc32Table[index] = value >>> 0;
}

if (!existsSync(distDir)) throw new Error(`Deployment artifact directory is missing: ${distDir}`);
const distStat = lstatSync(distDir);
if (distStat.isSymbolicLink() || !distStat.isDirectory()) {
  throw new Error(`Deployment artifact root must be a real non-symlink directory: ${distDir}`);
}

rmSync(join(distDir, "deploy"), { recursive: true, force: true });

function walkFiles(dir) {
  const files = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isSymbolicLink()) {
      throw new Error(`Symbolic links are forbidden in deployment artifacts: ${path}`);
    }
    if (entry.isDirectory()) {
      files.push(...walkFiles(path));
    } else if (entry.isFile()) {
      files.push(path);
    } else {
      throw new Error(`Non-regular deployment artifact is forbidden: ${path}`);
    }
  }

  return files;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function assertNoEmbeddedSecrets(path, content) {
  const text = content.toString("utf8");
  for (const rule of forbiddenSecretPatterns) {
    if (rule.pattern.test(text)) throw new Error(`Forbidden ${rule.label} embedded in release artifact: ${path}`);
  }
}

function inspectZipCentralDirectory(path, content) {
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
  if (eocdOffset < 0) throw new Error(`Allowlisted public archive has no valid end record: ${path}`);

  const disk = content.readUInt16LE(eocdOffset + 4);
  const centralDisk = content.readUInt16LE(eocdOffset + 6);
  const diskEntries = content.readUInt16LE(eocdOffset + 8);
  const totalEntries = content.readUInt16LE(eocdOffset + 10);
  const centralSize = content.readUInt32LE(eocdOffset + 12);
  const centralOffset = content.readUInt32LE(eocdOffset + 16);
  if (disk !== 0 || centralDisk !== 0 || diskEntries !== totalEntries || totalEntries === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw new Error(`Multi-disk and ZIP64 public archives are forbidden: ${path}`);
  }
  if (centralOffset + centralSize !== eocdOffset) throw new Error(`Allowlisted public archive has an inconsistent central directory: ${path}`);

  const decoder = new TextDecoder("utf-8", { fatal: true });
  const entries = [];
  let cursor = centralOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    if (cursor + 46 > eocdOffset || content.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error(`Allowlisted public archive has an invalid central entry: ${path}`);
    }
    const flags = content.readUInt16LE(cursor + 8);
    const method = content.readUInt16LE(cursor + 10);
    const crc32 = content.readUInt32LE(cursor + 16);
    const compressedSize = content.readUInt32LE(cursor + 20);
    const uncompressedSize = content.readUInt32LE(cursor + 24);
    const nameLength = content.readUInt16LE(cursor + 28);
    const extraLength = content.readUInt16LE(cursor + 30);
    const commentLength = content.readUInt16LE(cursor + 32);
    const end = cursor + 46 + nameLength + extraLength + commentLength;
    if (end > eocdOffset || (flags & 1) !== 0 || (method !== 0 && method !== 8)) {
      throw new Error(`Allowlisted public archive has an unsafe central entry: ${path}`);
    }
    let name;
    try {
      name = decoder.decode(content.subarray(cursor + 46, cursor + 46 + nameLength));
    } catch {
      throw new Error(`Allowlisted public archive has a non-UTF-8 entry name: ${path}`);
    }
    entries.push({ name, crc32, compressedSize, uncompressedSize });
    cursor = end;
  }
  if (cursor !== eocdOffset) throw new Error(`Allowlisted public archive central inventory does not terminate exactly: ${path}`);
  return entries;
}

function extractBoundedArchiveEntry(path, entry, expected) {
  return new Promise((resolveEntry, rejectEntry) => {
    const chunks = [];
    let total = 0;
    let crc = 0xffffffff;
    let settled = false;
    const stream = entry.internalStream("uint8array");
    const reject = (error) => {
      if (settled) return;
      settled = true;
      stream.pause();
      rejectEntry(error);
    };
    stream.on("data", (chunk) => {
      if (settled) return;
      total += chunk.byteLength;
      if (total > expected.uncompressedSize || total > 512_000) {
        reject(new Error(`Allowlisted public archive expands beyond its declared entry size: ${path}:${entry.name}`));
        return;
      }
      for (const byte of chunk) crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
      chunks.push(Buffer.from(chunk));
    });
    stream.on("error", (error) => reject(error));
    stream.on("end", () => {
      if (settled) return;
      const actualCrc = (crc ^ 0xffffffff) >>> 0;
      if (total !== expected.uncompressedSize || actualCrc !== expected.crc32) {
        reject(new Error(`Allowlisted public archive integrity mismatch: ${path}:${entry.name}`));
        return;
      }
      settled = true;
      resolveEntry(Buffer.concat(chunks, total));
    });
    stream.resume();
  });
}

async function assertAllowedArchive(path, content) {
  const expectedEntries = allowedPublicArchives.get(path);
  if (!expectedEntries) throw new Error(`Compressed public deployment file is forbidden: ${path}`);
  if (content.byteLength > 2_000_000) throw new Error(`Allowlisted public archive is too large: ${path}`);

  const centralEntries = inspectZipCentralDirectory(path, content);
  const centralByName = new Map();
  let declaredSize = 0;
  for (const entry of centralEntries) {
    if (!expectedEntries.has(entry.name) || centralByName.has(entry.name)) {
      throw new Error(`Unexpected or duplicate entry in allowlisted public archive ${path}: ${entry.name}`);
    }
    if (entry.uncompressedSize > 512_000 || entry.compressedSize > 1_000_000) {
      throw new Error(`Unsafe declared entry size in allowlisted public archive ${path}: ${entry.name}`);
    }
    declaredSize += entry.uncompressedSize;
    if (declaredSize > 2_000_000) throw new Error(`Allowlisted public archive expands beyond its limit: ${path}`);
    centralByName.set(entry.name, entry);
  }
  if (centralByName.size !== expectedEntries.size || [...expectedEntries].some((name) => !centralByName.has(name))) {
    throw new Error(`Allowlisted public archive has an incomplete inventory: ${path}`);
  }

  const archive = await JSZip.loadAsync(content, { checkCRC32: false, createFolders: false });
  const archiveEntries = Object.values(archive.files);
  if (archiveEntries.some((entry) => entry.dir)) throw new Error(`Directory entries are forbidden in allowlisted public archive: ${path}`);
  const entries = archiveEntries;
  if (entries.length !== centralEntries.length) throw new Error(`Allowlisted public archive contains ambiguous duplicate entries: ${path}`);
  const actualNames = new Set();
  for (const entry of entries) {
    const originalName = entry.unsafeOriginalName ?? entry.name;
    if (originalName !== entry.name || !expectedEntries.has(entry.name) || actualNames.has(entry.name)) {
      throw new Error(`Unexpected entry in allowlisted public archive ${path}: ${originalName}`);
    }
    const uncompressedSize = entry?._data?.uncompressedSize;
    if (!Number.isSafeInteger(uncompressedSize) || uncompressedSize !== centralByName.get(entry.name)?.uncompressedSize) {
      throw new Error(`Unsafe declared entry size in allowlisted public archive ${path}: ${entry.name}`);
    }
    actualNames.add(entry.name);
  }
  if (actualNames.size !== expectedEntries.size || [...expectedEntries].some((name) => !actualNames.has(name))) {
    throw new Error(`Allowlisted public archive has an incomplete inventory: ${path}`);
  }
  for (const entry of entries) {
    const extracted = await extractBoundedArchiveEntry(path, entry, centralByName.get(entry.name));
    assertNoEmbeddedSecrets(`${path}:${entry.name}`, extracted);
  }
}

function git(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function sanitizeRemote(remote) {
  if (!remote) return null;

  return remote
    .replace(/^https?:\/\/[^/@]+@/i, "https://")
    .replace(/^ssh:\/\/[^@]+@/i, "ssh://")
    .replace(/^[^/@\s]+@([^:]+):/, "$1/")
    .replace(/[?#].*$/, "")
    .replace(/\.git$/, "");
}

function deterministicGeneratedAt() {
  const seconds = process.env.SOURCE_DATE_EPOCH ?? git(["log", "-1", "--format=%ct"]);
  if (!seconds || !/^\d+$/.test(seconds)) throw new Error("A deterministic SOURCE_DATE_EPOCH or Git commit timestamp is required.");
  return new Date(Number(seconds) * 1000).toISOString();
}

const files = [];
for (const path of walkFiles(distDir).filter((candidate) => candidate !== outputPath)) {
  const publicPath = relative(distDir, path).split("\\").join("/");
  if (publicPath.split("/").some((segment) => segment.startsWith(".")) || forbiddenPublicSuffix.test(publicPath)) {
    throw new Error(`Forbidden public deployment file: ${publicPath}`);
  }
  const compressed = compressedPublicSuffix.test(publicPath);
  if (compressed && !allowedPublicArchives.has(publicPath)) {
    throw new Error(`Compressed public deployment file is forbidden: ${publicPath}`);
  }
  if (compressed && lstatSync(path).size > 2_000_000) {
    throw new Error(`Allowlisted public archive is too large: ${publicPath}`);
  }
  const content = readFileSync(path);
  if (compressed) await assertAllowedArchive(publicPath, content);
  else assertNoEmbeddedSecrets(publicPath, content);

  files.push({
    path: publicPath,
    size: content.byteLength,
    sha256: sha256(content),
  });
}
files.sort((left, right) => left.path.localeCompare(right.path));

const releaseComponents = (publicOnly ? [] : releaseComponentPaths).map((path) => {
  if (!existsSync(path)) throw new Error(`Required release component is missing: ${path}`);
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`Release component must be a regular non-symlink file: ${path}`);
  const content = readFileSync(path);
  assertNoEmbeddedSecrets(path, content);
  return { path, size: content.byteLength, sha256: sha256(content) };
});

const manifestWithoutDigest = {
  product: "BLACKPROOF",
  artifactVersion: "blackproof-static-artifact-v0.1.0-alpha",
  generatedAt: deterministicGeneratedAt(),
  gitCommit: git(["rev-parse", "HEAD"]),
  gitBranch: git(["branch", "--show-current"]),
  dirtyWorktree: Boolean(git(["status", "--porcelain"])),
  sourceRepository: sanitizeRemote(git(["remote", "get-url", "origin"])),
  distDir,
  rollback: {
    strategy: "Restore the previous /var/www/html/blackproof backup archive, or redeploy a prior committed artifact.",
    productionPath: "/var/www/html/blackproof",
  },
  files,
  releaseComponents,
};

const artifactSha256 = sha256(Buffer.from(JSON.stringify(manifestWithoutDigest), "utf8"));
const manifest = {
  ...manifestWithoutDigest,
  artifactSha256,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(`Wrote deployment artifact manifest: ${outputPath}`);
console.log(`Artifact SHA-256: ${artifactSha256}`);
