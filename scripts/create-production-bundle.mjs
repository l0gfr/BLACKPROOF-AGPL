import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import JSZip from "jszip";

const outputPath = process.argv[2] ?? "artifacts/blackproof-production-bundle.zip";
const roots = [
  "apps/web/dist",
  "artifacts/blackproof.fr.conf",
  "artifacts/artifact-manifest.json",
  "artifacts/blackproof-sbom.cdx.json",
  "scripts/smoke-apache-prod.sh",
  "scripts/verify-release-directory.mjs",
  "deploy/server/promote-static-release.sh",
  "deploy/server/activate-static-release.sh",
  "deploy/server/snapshot-verified-release-components.mjs",
];

function gitTimestamp() {
  const seconds = process.env.SOURCE_DATE_EPOCH ?? execFileSync("git", ["log", "-1", "--format=%ct"], { encoding: "utf8" }).trim();
  if (!/^\d+$/.test(seconds)) throw new Error("A deterministic SOURCE_DATE_EPOCH or Git commit timestamp is required.");
  return new Date(Number(seconds) * 1000);
}

function collect(path) {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) throw new Error(`Symbolic links are forbidden in the production bundle: ${path}`);
  if (stat.isFile()) return [path];
  if (!stat.isDirectory()) throw new Error(`Non-regular production bundle input: ${path}`);
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => collect(join(path, entry.name)));
}

const files = roots.flatMap(collect).sort((left, right) => left.localeCompare(right));
const seen = new Set();
const zip = new JSZip();
const date = gitTimestamp();
for (const path of files) {
  const archivePath = relative(process.cwd(), path).split("\\").join("/");
  if (!archivePath || archivePath.startsWith("../") || seen.has(archivePath)) throw new Error(`Unsafe or duplicate production bundle path: ${archivePath}`);
  seen.add(archivePath);
  zip.file(archivePath, readFileSync(path), { date, createFolders: false, unixPermissions: 0o100644 });
}

const content = await zip.generateAsync({
  type: "nodebuffer",
  platform: "UNIX",
  compression: "DEFLATE",
  compressionOptions: { level: 9 },
  streamFiles: true,
});
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, content, { mode: 0o644 });

const verified = await JSZip.loadAsync(content, { checkCRC32: true });
const verifiedFiles = Object.values(verified.files).filter((entry) => !entry.dir);
if (verifiedFiles.length !== files.length || verifiedFiles.some((entry) => !seen.has(entry.name))) throw new Error("Production bundle verification failed.");
console.log(`Deterministic production bundle created: ${outputPath}`);
console.log(`SHA-256: ${createHash("sha256").update(content).digest("hex")}`);
