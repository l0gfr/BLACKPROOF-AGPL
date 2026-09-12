import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve, sep } from "node:path";

const MAX_MANIFEST_BYTES = 10_000_000;
const MAX_COMPONENT_BYTES = 10_000_000;
const MAX_TOTAL_COMPONENT_BYTES = 50_000_000;
const SHA256 = /^[a-f0-9]{64}$/;
const TARGET_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

const [candidateArgument, expectedCommit, expectedArtifactSha256, snapshotArgument, ...componentArguments]
  = process.argv.slice(2);
if (!candidateArgument || !/^[a-f0-9]{40}$/.test(expectedCommit ?? "")
  || !SHA256.test(expectedArtifactSha256 ?? "")
  || !snapshotArgument || componentArguments.length === 0) {
  throw new Error("Usage: node snapshot-verified-release-components.mjs CANDIDATE_ROOT EXPECTED_COMMIT EXPECTED_ARTIFACT_SHA256 SNAPSHOT_ROOT TARGET=RELEASE_PATH [...]");
}

const candidateRoot = resolve(candidateArgument);
const snapshotRoot = resolve(snapshotArgument);
const candidateRootStat = lstatSync(candidateRoot);
const snapshotRootStat = lstatSync(snapshotRoot);
const processUid = process.getuid?.();
if (candidateRootStat.isSymbolicLink() || !candidateRootStat.isDirectory()
  || (candidateRootStat.mode & 0o022) !== 0) {
  throw new Error("Candidate root must be a real directory that is not writable by group or others.");
}
if (snapshotRootStat.isSymbolicLink() || !snapshotRootStat.isDirectory()
  || snapshotRootStat.uid !== processUid || (snapshotRootStat.mode & 0o777) !== 0o700
  || readdirSync(snapshotRoot).length !== 0) {
  throw new Error("Verified snapshot root must be an empty owner-only directory owned by the verifier process.");
}

function safeRelativePath(path) {
  return typeof path === "string"
    && path.length > 0
    && !path.startsWith("/")
    && !path.includes("\\")
    && path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

function candidatePath(relativePath) {
  if (!safeRelativePath(relativePath)) throw new Error(`Unsafe candidate path: ${relativePath}`);
  const path = resolve(candidateRoot, relativePath);
  if (!path.startsWith(`${candidateRoot}${sep}`)) throw new Error(`Candidate path escapes its root: ${relativePath}`);
  return path;
}

function assertOwnedParentDirectories(relativePath) {
  const parent = dirname(relativePath);
  if (parent === ".") return;
  let current = candidateRoot;
  for (const segment of parent.split("/")) {
    current = join(current, segment);
    const stat = lstatSync(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()
      || stat.uid !== candidateRootStat.uid || (stat.mode & 0o022) !== 0) {
      throw new Error(`Candidate path has an unsafe parent directory: ${relativePath}`);
    }
  }
}

function readOwnedCandidate(relativePath, maximumBytes) {
  assertOwnedParentDirectories(relativePath);
  const path = candidatePath(relativePath);
  const descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = fstatSync(descriptor, { bigint: true });
    if (!before.isFile() || before.uid !== BigInt(candidateRootStat.uid) || (before.mode & 0o22n) !== 0n
      || before.size < 0n || before.size > BigInt(maximumBytes)) {
      throw new Error(`Candidate file is unsafe or exceeds its limit: ${relativePath}`);
    }
    const size = Number(before.size);
    const content = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const count = readSync(descriptor, content, offset, Math.min(1_048_576, size - offset), offset);
      if (count === 0) throw new Error(`Candidate file changed or ended while being read: ${relativePath}`);
      offset += count;
    }
    const overflowProbe = Buffer.alloc(1);
    if (readSync(descriptor, overflowProbe, 0, 1, size) !== 0) {
      throw new Error(`Candidate file grew while being read: ${relativePath}`);
    }
    const after = fstatSync(descriptor, { bigint: true });
    if (!after.isFile() || after.dev !== before.dev || after.ino !== before.ino
      || after.uid !== before.uid || after.gid !== before.gid || after.mode !== before.mode
      || after.nlink !== before.nlink || after.size !== before.size
      || after.mtimeNs !== before.mtimeNs || after.ctimeNs !== before.ctimeNs) {
      throw new Error(`Candidate file changed while being read: ${relativePath}`);
    }
    return content;
  } finally {
    closeSync(descriptor);
  }
}

const manifestBytes = readOwnedCandidate("artifacts/artifact-manifest.json", MAX_MANIFEST_BYTES);
const manifest = JSON.parse(manifestBytes.toString("utf8"));
if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
  throw new Error("Deployment manifest root is invalid.");
}
const { artifactSha256, ...manifestWithoutDigest } = manifest;
const internalDigest = createHash("sha256").update(JSON.stringify(manifestWithoutDigest)).digest("hex");
if (!SHA256.test(artifactSha256 ?? "") || artifactSha256 !== internalDigest) {
  throw new Error("Deployment manifest digest is invalid.");
}
if (artifactSha256 !== expectedArtifactSha256) {
  throw new Error("Deployment manifest does not match the externally qualified artifact digest.");
}
if (manifest.gitCommit !== expectedCommit || manifest.dirtyWorktree !== false
  || !Array.isArray(manifest.releaseComponents)) {
  throw new Error("Deployment manifest is not bound to the exact clean candidate commit.");
}

const releaseComponents = new Map();
for (const component of manifest.releaseComponents) {
  if (!component || typeof component !== "object" || Array.isArray(component)
    || !safeRelativePath(component.path)
    || !Number.isSafeInteger(component.size) || component.size < 0 || component.size > MAX_COMPONENT_BYTES
    || !SHA256.test(component.sha256 ?? "")
    || releaseComponents.has(component.path)) {
    throw new Error(`Deployment manifest has an unsafe or duplicate release component: ${component?.path ?? "missing"}`);
  }
  releaseComponents.set(component.path, component);
}

const specifications = [];
const targetNames = new Set();
const sourcePaths = new Set();
for (const argument of componentArguments) {
  const separator = argument.indexOf("=");
  const targetName = separator > 0 ? argument.slice(0, separator) : "";
  const sourcePath = separator > 0 ? argument.slice(separator + 1) : "";
  if (!TARGET_NAME.test(targetName) || !safeRelativePath(sourcePath)
    || targetNames.has(targetName) || sourcePaths.has(sourcePath)) {
    throw new Error(`Invalid or duplicate verified-component specification: ${argument}`);
  }
  const manifestComponent = releaseComponents.get(sourcePath);
  if (!manifestComponent) throw new Error(`Required release component is absent from the manifest: ${sourcePath}`);
  targetNames.add(targetName);
  sourcePaths.add(sourcePath);
  specifications.push({ targetName, sourcePath, manifestComponent });
}

let totalBytes = 0;
const verified = specifications.map((specification) => {
  const content = readOwnedCandidate(specification.sourcePath, MAX_COMPONENT_BYTES);
  totalBytes += content.byteLength;
  if (totalBytes > MAX_TOTAL_COMPONENT_BYTES) throw new Error("Verified release components exceed their aggregate size limit.");
  const digest = createHash("sha256").update(content).digest("hex");
  if (content.byteLength !== specification.manifestComponent.size
    || digest !== specification.manifestComponent.sha256) {
    throw new Error(`Release component does not match the exact deployment manifest: ${specification.sourcePath}`);
  }
  return { ...specification, content };
});

for (const component of verified) {
  writeFileSync(join(snapshotRoot, component.targetName), component.content, {
    flag: "wx",
    mode: 0o600,
  });
}

process.stdout.write(`${artifactSha256}\n`);
