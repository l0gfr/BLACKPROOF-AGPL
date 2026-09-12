import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  opendirSync,
  readSync,
} from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

const MAX_MANIFEST_BYTES = 10_000_000;
const MAX_FILE_COUNT = 10_000;
const MAX_FILE_BYTES = 32_000_000;
const MAX_TOTAL_BYTES = 200_000_000;
const MAX_TREE_ENTRIES = 20_000;
const MAX_DIRECTORY_DEPTH = 64;

const [manifestArgument, releaseArgument, expectedCommit, expectedArtifactSha256] = process.argv.slice(2);
if (!manifestArgument || !releaseArgument || !/^[a-f0-9]{40}$/.test(expectedCommit ?? "")
  || !/^[a-f0-9]{64}$/.test(expectedArtifactSha256 ?? "")) {
  throw new Error("Usage: node scripts/verify-release-directory.mjs MANIFEST RELEASE_DIR EXPECTED_COMMIT EXPECTED_ARTIFACT_SHA256");
}

const manifestPath = resolve(manifestArgument);
const releaseRoot = resolve(releaseArgument);
const verifierUid = process.getuid?.();

function readBoundedRegularFile(path, maximumBytes, label) {
  const listed = lstatSync(path);
  if (listed.isSymbolicLink() || !listed.isFile() || listed.uid !== verifierUid
    || (listed.mode & 0o022) !== 0) {
    throw new Error(`${label} must be an owner-controlled regular non-symlink file.`);
  }
  const descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const before = fstatSync(descriptor, { bigint: true });
    if (!before.isFile() || before.uid !== BigInt(verifierUid) || (before.mode & 0o22n) !== 0n
      || before.size < 0n || before.size > BigInt(maximumBytes)) {
      throw new Error(`${label} exceeds its bounded verification limit.`);
    }
    const size = Number(before.size);
    const content = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const count = readSync(descriptor, content, offset, Math.min(1_048_576, size - offset), offset);
      if (count === 0) throw new Error(`${label} changed or ended during bounded verification read.`);
      offset += count;
    }
    const overflowProbe = Buffer.alloc(1);
    if (readSync(descriptor, overflowProbe, 0, 1, size) !== 0) {
      throw new Error(`${label} grew during bounded verification read.`);
    }
    const after = fstatSync(descriptor, { bigint: true });
    if (!after.isFile() || after.uid !== before.uid || after.mode !== before.mode || after.size !== before.size
      || after.mtimeNs !== before.mtimeNs || after.ctimeNs !== before.ctimeNs) {
      throw new Error(`${label} changed during bounded verification read.`);
    }
    return content;
  } finally {
    closeSync(descriptor);
  }
}

const manifestBytes = readBoundedRegularFile(manifestPath, MAX_MANIFEST_BYTES, "Deployment manifest");
const manifest = JSON.parse(manifestBytes.toString("utf8"));
if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
  throw new Error("Deployment manifest root is invalid.");
}
const { artifactSha256, ...manifestWithoutDigest } = manifest;
const manifestDigest = createHash("sha256")
  .update(JSON.stringify(manifestWithoutDigest))
  .digest("hex");

if (!/^[a-f0-9]{64}$/.test(artifactSha256 ?? "")
  || artifactSha256 !== manifestDigest || artifactSha256 !== expectedArtifactSha256) {
  throw new Error("Deployment manifest self-digest mismatch.");
}
if (manifest.gitCommit !== expectedCommit) throw new Error("Deployment manifest commit does not match the requested release.");
if (manifest.dirtyWorktree !== false) throw new Error("A dirty-worktree artifact cannot be promoted.");
if (!Array.isArray(manifest.files) || manifest.files.length === 0) throw new Error("Deployment manifest has no public files.");
if (manifest.files.length > MAX_FILE_COUNT) throw new Error("Deployment manifest exceeds the public file-count limit.");

const expectedFiles = new Map();
let declaredTotalBytes = 0;
for (const descriptor of manifest.files) {
  const pathSegments = typeof descriptor?.path === "string" ? descriptor.path.split("/") : [];
  if (
    typeof descriptor?.path !== "string"
    || descriptor.path.length === 0
    || descriptor.path.startsWith("/")
    || descriptor.path.includes("\\")
    || descriptor.path.includes("\0")
    || pathSegments.some((segment) => segment === "" || segment === "." || segment === "..")
    || !Number.isSafeInteger(descriptor.size)
    || descriptor.size < 0
    || descriptor.size > MAX_FILE_BYTES
    || !/^[a-f0-9]{64}$/.test(descriptor.sha256 ?? "")
    || expectedFiles.has(descriptor.path)
  ) {
    throw new Error(`Unsafe or duplicate manifest path: ${descriptor?.path ?? "missing"}`);
  }
  declaredTotalBytes += descriptor.size;
  if (declaredTotalBytes > MAX_TOTAL_BYTES) {
    throw new Error("Deployment manifest exceeds the total public byte limit.");
  }
  expectedFiles.set(descriptor.path, descriptor);
}

let treeEntryCount = 0;
function collect(directory, depth = 0) {
  if (depth > MAX_DIRECTORY_DEPTH) throw new Error("Promoted release directory nesting exceeds its limit.");
  const files = [];
  const handle = opendirSync(directory);
  try {
    for (let entry = handle.readSync(); entry !== null; entry = handle.readSync()) {
      treeEntryCount += 1;
      if (treeEntryCount > MAX_TREE_ENTRIES) throw new Error("Promoted release tree exceeds its entry limit.");
      const path = join(directory, entry.name);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) throw new Error(`Symbolic links are forbidden in a promoted release: ${path}`);
      if (stat.uid !== verifierUid || (stat.mode & 0o022) !== 0) {
        throw new Error(`Promoted release entries must be owned by the deploy user and not group/other writable: ${path}`);
      }
      if (stat.isDirectory()) files.push(...collect(path, depth + 1));
      else if (stat.isFile()) files.push(path);
      else throw new Error(`Non-regular release entry: ${path}`);
      if (files.length > MAX_FILE_COUNT) throw new Error("Promoted release exceeds its file-count limit.");
    }
  } finally {
    handle.closeSync();
  }
  return files;
}

const releaseStat = lstatSync(releaseRoot);
if (releaseStat.isSymbolicLink() || !releaseStat.isDirectory() || releaseStat.uid !== verifierUid
  || (releaseStat.mode & 0o022) !== 0) {
  throw new Error("Release root must be a deploy-owned non-writable real directory.");
}

const actualFiles = collect(releaseRoot);
if (actualFiles.length !== expectedFiles.size) {
  throw new Error(`Release inventory mismatch: expected ${expectedFiles.size}, found ${actualFiles.length}.`);
}

let actualTotalBytes = 0;
for (const path of actualFiles) {
  const releasePath = relative(releaseRoot, path).split(sep).join("/");
  const resolvedPath = resolve(releaseRoot, releasePath);
  if (isAbsolute(releasePath) || resolvedPath === releaseRoot || !resolvedPath.startsWith(`${releaseRoot}${sep}`)) {
    throw new Error(`Unsafe promoted release path: ${releasePath}`);
  }
  const descriptor = expectedFiles.get(releasePath);
  if (!descriptor) throw new Error(`Unexpected promoted release file: ${releasePath}`);
  const remainingBytes = MAX_TOTAL_BYTES - actualTotalBytes;
  const content = readBoundedRegularFile(path, Math.min(MAX_FILE_BYTES, remainingBytes), `Promoted release file ${releasePath}`);
  actualTotalBytes += content.byteLength;
  const digest = createHash("sha256").update(content).digest("hex");
  if (content.byteLength !== descriptor.size || digest !== descriptor.sha256) {
    throw new Error(`Promoted release checksum mismatch: ${releasePath}`);
  }
  expectedFiles.delete(releasePath);
}

if (expectedFiles.size > 0) {
  throw new Error(`Promoted release is missing: ${[...expectedFiles.keys()][0]}`);
}

console.log(`Release directory verification passed: commit=${expectedCommit}, files=${actualFiles.length}, manifest=${artifactSha256}.`);
