import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, rm, symlink, truncate, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { deflateRawSync } from "node:zlib";

import JSZip from "jszip";

const root = process.cwd();

function runScript(script, args = []) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

async function fixtureDirectory(context, prefix) {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  context.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test("production bundle verifier promptly refuses special files", { skip: process.platform === "win32" }, async (context) => {
  const directory = await fixtureDirectory(context, "blackproof-bundle-file-kind-");
  const path = join(directory, "bundle.zip");
  const created = spawnSync("mkfifo", [path], { encoding: "utf8", timeout: 5_000 });
  assert.equal(created.status, 0, created.stderr);
  const result = spawnSync(process.execPath, ["scripts/verify-production-bundle.mjs", path], {
    cwd: root, encoding: "utf8", timeout: 3_000, killSignal: "SIGKILL",
  });
  assert.equal(result.error, undefined, "File type rejection must finish before the deadline");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /regular.*file/);
});

async function writeDeliveryDemo(path, readme = "Archive publique fictive BLACKPROOF.") {
  const zip = new JSZip();
  zip.file("delivery.json", "{}");
  zip.file("reponse-fournisseur.md", "# Réponse fictive\n");
  zip.file("references-preuves.csv", "reference\n");
  zip.file("README.md", readme);
  zip.file("manifest.json", "{}");
  await writeFile(path, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function productionManifest(files) {
  const withoutDigest = {
    product: "BLACKPROOF",
    artifactVersion: "blackproof-static-artifact-v0.1.0-alpha",
    generatedAt: "2026-08-05T00:00:00.000Z",
    gitCommit: "a".repeat(40),
    gitBranch: "main",
    dirtyWorktree: false,
    sourceRepository: "github.com/l0gfr/BLACKPROOF",
    distDir: "apps/web/dist",
    rollback: { strategy: "test", productionPath: "/var/www/html/blackproof" },
    files,
    releaseComponents: [],
  };
  return {
    ...withoutDigest,
    artifactSha256: sha256(Buffer.from(JSON.stringify(withoutDigest))),
  };
}

function rawZip(entries) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  for (const specification of entries) {
    const name = Buffer.from(specification.name, "utf8");
    const content = Buffer.from(specification.content);
    const compressed = deflateRawSync(content);
    const declaredSize = specification.declaredSize ?? content.byteLength;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(compressed.byteLength, 18);
    local.writeUInt32LE(declaredSize, 22);
    local.writeUInt16LE(name.byteLength, 26);
    localParts.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x0314, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(compressed.byteLength, 20);
    central.writeUInt32LE(declaredSize, 24);
    central.writeUInt16LE(name.byteLength, 28);
    central.writeUInt32LE(0o100644 * 0x10000, 38);
    central.writeUInt32LE(localOffset, 42);
    centralParts.push(central, name);
    localOffset += local.byteLength + name.byteLength + compressed.byteLength;
  }
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.byteLength, 12);
  end.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

function withUnlistedPrefix(content, prefix) {
  const original = Buffer.from(content);
  const endOffset = original.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(endOffset >= 0);
  const totalEntries = original.readUInt16LE(endOffset + 10);
  const originalCentralOffset = original.readUInt32LE(endOffset + 16);
  const shifted = Buffer.concat([prefix, original]);
  const shiftedEndOffset = endOffset + prefix.byteLength;
  const shiftedCentralOffset = originalCentralOffset + prefix.byteLength;
  shifted.writeUInt32LE(shiftedCentralOffset, shiftedEndOffset + 16);
  let cursor = shiftedCentralOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    assert.equal(shifted.readUInt32LE(cursor), 0x02014b50);
    shifted.writeUInt32LE(shifted.readUInt32LE(cursor + 42) + prefix.byteLength, cursor + 42);
    cursor += 46
      + shifted.readUInt16LE(cursor + 28)
      + shifted.readUInt16LE(cursor + 30)
      + shifted.readUInt16LE(cursor + 32);
  }
  return shifted;
}

async function validProductionBundle() {
  const index = Buffer.from("<!doctype html><title>BLACKPROOF</title>");
  const manifest = productionManifest([{ path: "index.html", size: index.byteLength, sha256: sha256(index) }]);
  const zip = new JSZip();
  zip.file("apps/web/dist/index.html", index, { createFolders: false, unixPermissions: 0o100644 });
  zip.file("artifacts/artifact-manifest.json", JSON.stringify(manifest), {
    createFolders: false,
    unixPermissions: 0o100644,
  });
  return zip.generateAsync({ type: "nodebuffer", platform: "UNIX", compression: "DEFLATE", streamFiles: true });
}

test("release manifest accepts only the bounded reviewed Delivery archive", async (context) => {
  const directory = await fixtureDirectory(context, "blackproof-release-valid-");
  const dist = join(directory, "dist");
  await mkdir(join(dist, "demo"), { recursive: true });
  await writeFile(join(dist, "index.html"), "<!doctype html><title>BLACKPROOF</title>");
  await writeDeliveryDemo(join(dist, "demo", "proofpack-delivery-demo.zip"));

  const result = runScript("scripts/create-deploy-manifest.mjs", [dist, join(directory, "manifest.json"), "--public-only"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("release manifest rejects an unexpected compressed public artifact", async (context) => {
  const directory = await fixtureDirectory(context, "blackproof-release-archive-");
  const dist = join(directory, "dist");
  await mkdir(dist, { recursive: true });
  await writeFile(join(dist, "index.html"), "<!doctype html><title>BLACKPROOF</title>");
  await writeFile(join(dist, "unexpected.zip"), "not a reviewed public artifact");

  const result = runScript("scripts/create-deploy-manifest.mjs", [dist, join(directory, "manifest.json"), "--public-only"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Compressed public deployment file is forbidden/);
});

test("release manifest scans the extracted contents of its allowlisted archive", async (context) => {
  const directory = await fixtureDirectory(context, "blackproof-release-secret-");
  const dist = join(directory, "dist");
  await mkdir(join(dist, "demo"), { recursive: true });
  await writeFile(join(dist, "index.html"), "<!doctype html><title>BLACKPROOF</title>");
  const syntheticCredential = ["sk", "test", "A".repeat(32)].join("_");
  await writeDeliveryDemo(join(dist, "demo", "proofpack-delivery-demo.zip"), syntheticCredential);

  const result = runScript("scripts/create-deploy-manifest.mjs", [dist, join(directory, "manifest.json"), "--public-only"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Forbidden Stripe secret key/);
});

test("manifest and CSP renderers reject a symlinked artifact root before traversal", async (context) => {
  const directory = await fixtureDirectory(context, "blackproof-release-root-");
  const target = join(directory, "target");
  const link = join(directory, "dist-link");
  const sentinel = join(target, "deploy", "sentinel.txt");
  await mkdir(join(target, "deploy"), { recursive: true });
  await writeFile(sentinel, "must survive");
  await symlink(target, link);

  const manifest = runScript("scripts/create-deploy-manifest.mjs", [link, join(directory, "manifest.json"), "--public-only"]);
  assert.notEqual(manifest.status, 0);
  assert.match(manifest.stderr, /real non-symlink directory/);

  const render = runScript("scripts/render-apache-conf.mjs", [
    "deploy/apache/blackproof.fr.conf.example",
    join(directory, "apache.conf"),
    link,
  ]);
  assert.notEqual(render.status, 0);
  assert.match(render.stderr, /real non-symlink directory/);
  await access(sentinel);
  assert.equal(await readFile(sentinel, "utf8"), "must survive");
});

test("CSP extraction rejects a symlinked HTML child", async (context) => {
  const directory = await fixtureDirectory(context, "blackproof-csp-child-");
  const dist = join(directory, "dist");
  const external = join(directory, "external.html");
  await mkdir(dist, { recursive: true });
  await writeFile(external, "<meta http-equiv=\"content-security-policy\" content=\"default-src 'none'\">");
  await symlink(external, join(dist, "index.html"));

  const result = runScript("scripts/extract-build-csp.mjs", [dist]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Symbolic links are forbidden/);
});

test("production bundle verifier accepts a bounded exact inventory", async (context) => {
  const directory = await fixtureDirectory(context, "blackproof-bundle-valid-");
  const path = join(directory, "bundle.zip");
  await writeFile(path, await validProductionBundle());

  const result = runScript("scripts/verify-production-bundle.mjs", [path]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Production bundle restore verification passed/);
});

test("production bundle verifier rejects a symlink before reading its target", async (context) => {
  const directory = await fixtureDirectory(context, "blackproof-bundle-symlink-");
  const target = join(directory, "target.zip");
  const link = join(directory, "bundle.zip");
  await writeFile(target, await validProductionBundle());
  await symlink(target, link);

  const result = runScript("scripts/verify-production-bundle.mjs", [link]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ELOOP|symbolic link|non-symlink/);
});

test("production bundle verifier rejects an oversized sparse archive before allocation", async (context) => {
  const directory = await fixtureDirectory(context, "blackproof-bundle-oversized-");
  const path = join(directory, "bundle.zip");
  await writeFile(path, "");
  await truncate(path, 100_000_001);

  const result = runScript("scripts/verify-production-bundle.mjs", [path]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /exceeds the 100 MB verification limit/);
});

test("production bundle verifier rejects duplicate central-directory names", async (context) => {
  const directory = await fixtureDirectory(context, "blackproof-bundle-duplicate-");
  const path = join(directory, "bundle.zip");
  const index = Buffer.from("index");
  const manifest = productionManifest([{ path: "index.html", size: index.byteLength, sha256: sha256(index) }]);
  await writeFile(path, rawZip([
    { name: "apps/web/dist/index.html", content: index },
    { name: "apps/web/dist/index.html", content: index },
    { name: "artifacts/artifact-manifest.json", content: JSON.stringify(manifest) },
  ]));

  const result = runScript("scripts/verify-production-bundle.mjs", [path]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unsafe or duplicate entry/);
});

test("production bundle verifier rejects non-regular UNIX entry metadata", async (context) => {
  const directory = await fixtureDirectory(context, "blackproof-bundle-symlink-mode-");
  const path = join(directory, "bundle.zip");
  const content = Buffer.from(await validProductionBundle());
  const endOffset = content.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(endOffset >= 0);
  const centralOffset = content.readUInt32LE(endOffset + 16);
  assert.equal(content.readUInt32LE(centralOffset), 0x02014b50);
  content.writeUInt16LE(0x0314, centralOffset + 4);
  content.writeUInt32LE((0o120777 * 0x1_0000) >>> 0, centralOffset + 38);
  await writeFile(path, content);

  const result = runScript("scripts/verify-production-bundle.mjs", [path]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /canonical UNIX regular files with mode 0644/);
});

test("production bundle verifier rejects bytes outside its complete local inventory", async (context) => {
  const directory = await fixtureDirectory(context, "blackproof-bundle-unlisted-");
  const path = join(directory, "bundle.zip");
  await writeFile(path, withUnlistedPrefix(await validProductionBundle(), Buffer.from("unlisted")));

  const result = runScript("scripts/verify-production-bundle.mjs", [path]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unlisted local data/);
});

test("production bundle verifier rejects ZIP64 markers before extraction", async (context) => {
  const directory = await fixtureDirectory(context, "blackproof-bundle-zip64-");
  const path = join(directory, "bundle.zip");
  const content = Buffer.from(await validProductionBundle());
  const endOffset = content.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(endOffset >= 0);
  content.writeUInt16LE(0xffff, endOffset + 8);
  content.writeUInt16LE(0xffff, endOffset + 10);
  await writeFile(path, content);

  const result = runScript("scripts/verify-production-bundle.mjs", [path]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ZIP64 production bundles are forbidden/);
});

test("production bundle verifier counts bytes produced by real decompression", async (context) => {
  const directory = await fixtureDirectory(context, "blackproof-bundle-expanded-");
  const path = join(directory, "bundle.zip");
  const expanded = Buffer.from("AB");
  const manifest = productionManifest([{ path: "index.html", size: 1, sha256: sha256(expanded) }]);
  await writeFile(path, rawZip([
    { name: "apps/web/dist/index.html", content: expanded, declaredSize: 1 },
    { name: "artifacts/artifact-manifest.json", content: JSON.stringify(manifest) },
  ]));

  const result = runScript("scripts/verify-production-bundle.mjs", [path]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /expands beyond its verified limit|size mismatch after extraction/);
});

test("production bundle verifier caps the aggregate declared inventory", async (context) => {
  const directory = await fixtureDirectory(context, "blackproof-bundle-total-");
  const path = join(directory, "bundle.zip");
  const files = Array.from({ length: 7 }, (_, index) => ({
    path: `part-${index}.bin`,
    size: 31_000_000,
    sha256: sha256(Buffer.from(String(index))),
  }));
  const manifest = productionManifest(files);
  await writeFile(path, rawZip([
    ...files.map((descriptor, index) => ({
      name: `apps/web/dist/${descriptor.path}`,
      content: String(index),
      declaredSize: descriptor.size,
    })),
    { name: "artifacts/artifact-manifest.json", content: JSON.stringify(manifest) },
  ]));

  const result = runScript("scripts/verify-production-bundle.mjs", [path]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /total uncompressed-size limit/);
});
