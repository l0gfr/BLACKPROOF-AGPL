import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const lockPath = process.argv[2] ?? "pnpm-lock.yaml";
const outputPath = process.argv[3] ?? "artifacts/blackproof-sbom.cdx.json";
const lock = readFileSync(lockPath, "utf8");

function git(args) {
  try { return execFileSync("git", args, { encoding: "utf8" }).trim(); } catch { return null; }
}

function sourceTimestamp() {
  const seconds = process.env.SOURCE_DATE_EPOCH ?? git(["log", "-1", "--format=%ct"]);
  if (!seconds || !/^\d+$/.test(seconds)) throw new Error("A deterministic SOURCE_DATE_EPOCH or Git commit timestamp is required.");
  return new Date(Number(seconds) * 1000).toISOString();
}

const packageSection = lock.match(/\npackages:\n([\s\S]*?)\nsnapshots:\n/)?.[1];
if (!packageSection) throw new Error("pnpm-lock.yaml has no parseable packages section.");

const components = [];
const seen = new Set();
for (const line of packageSection.split("\n")) {
  const match = line.match(/^  (['"]?)(.+)\1:\s*$/);
  if (!match) continue;
  const locator = match[2].replace(/\(.+\)$/, "");
  const separator = locator.lastIndexOf("@");
  if (separator <= 0) continue;
  const name = locator.slice(0, separator);
  const version = locator.slice(separator + 1);
  if (!name || !version || seen.has(`${name}@${version}`)) continue;
  seen.add(`${name}@${version}`);
  const namespaceSafeName = name.split("/").map(encodeURIComponent).join("/");
  const bomRef = `pkg:npm/${namespaceSafeName}@${encodeURIComponent(version)}`;
  components.push({
    type: "library",
    "bom-ref": bomRef,
    name,
    version,
    purl: bomRef,
    properties: [{ name: "blackproof:inventory-scope", value: "pnpm-lockfile-build" }],
  });
}
components.sort((left, right) => left["bom-ref"].localeCompare(right["bom-ref"]));
if (components.length === 0) throw new Error("The SBOM dependency inventory is empty.");

const commit = git(["rev-parse", "HEAD"]);
const sbom = {
  bomFormat: "CycloneDX",
  specVersion: "1.5",
  version: 1,
  metadata: {
    timestamp: sourceTimestamp(),
    tools: { components: [{ type: "application", name: "blackproof-sbom-generator", version: "1" }] },
    component: {
      type: "application",
      "bom-ref": "blackproof-production-artifact",
      name: "BLACKPROOF",
      version: commit ?? "uncommitted",
      hashes: [{ alg: "SHA-256", content: createHash("sha256").update(lock).digest("hex") }],
      properties: [{ name: "blackproof:lockfile", value: lockPath }],
    },
  },
  components,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(sbom, null, 2)}\n`, { mode: 0o644 });
console.log(`CycloneDX SBOM created: ${outputPath} (${components.length} locked components)`);
