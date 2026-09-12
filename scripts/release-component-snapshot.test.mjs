import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { access, chmod, copyFile, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const verifier = "deploy/server/snapshot-verified-release-components.mjs";
const commit = "a".repeat(40);

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function fixture(context, overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), "blackproof-release-components-"));
  const candidate = join(root, "candidate");
  const snapshot = join(root, "snapshot");
  await mkdir(join(candidate, "artifacts"), { recursive: true, mode: 0o700 });
  await mkdir(join(candidate, "services", "license-server"), { recursive: true, mode: 0o700 });
  await mkdir(join(candidate, "scripts"), { recursive: true, mode: 0o700 });
  await mkdir(snapshot, { mode: 0o700 });
  const service = Buffer.from("export const service = true;\n");
  const store = Buffer.from("export const store = true;\n");
  const integrity = Buffer.from("export function assertHealthyLicenseDatabase() { return true; }\n");
  const backupVerifier = Buffer.from(
    'import { assertHealthyLicenseDatabase } from "./license-db-integrity.mjs";\nexport { assertHealthyLicenseDatabase };\n',
  );
  await writeFile(join(candidate, "services", "license-server", "service.mjs"), service, { mode: 0o600 });
  await writeFile(join(candidate, "services", "license-server", "sqlite-store.mjs"), store, { mode: 0o600 });
  await writeFile(join(candidate, "scripts", "license-db-integrity.mjs"), integrity, { mode: 0o600 });
  await writeFile(join(candidate, "scripts", "verify-license-backup.mjs"), backupVerifier, { mode: 0o600 });
  const releaseComponents = [
    { path: "services/license-server/service.mjs", size: service.byteLength, sha256: sha256(service) },
    { path: "services/license-server/sqlite-store.mjs", size: store.byteLength, sha256: sha256(store) },
    { path: "scripts/license-db-integrity.mjs", size: integrity.byteLength, sha256: sha256(integrity) },
    { path: "scripts/verify-license-backup.mjs", size: backupVerifier.byteLength, sha256: sha256(backupVerifier) },
  ];
  const withoutDigest = {
    product: "BLACKPROOF",
    gitCommit: overrides.gitCommit ?? commit,
    dirtyWorktree: overrides.dirtyWorktree ?? false,
    files: [],
    releaseComponents: overrides.releaseComponents ?? releaseComponents,
  };
  const manifest = {
    ...withoutDigest,
    artifactSha256: sha256(Buffer.from(JSON.stringify(withoutDigest))),
  };
  await writeFile(join(candidate, "artifacts", "artifact-manifest.json"), JSON.stringify(manifest), { mode: 0o600 });
  context.after(() => rm(root, { recursive: true, force: true }));
  return { root, candidate, snapshot, releaseComponents };
}

function run(candidate, snapshot, ...specifications) {
  const { artifactSha256 } = JSON.parse(
    readFileSync(join(candidate, "artifacts", "artifact-manifest.json"), "utf8"),
  );
  return runWithDigest(candidate, artifactSha256, snapshot, ...specifications);
}

function runWithDigest(candidate, expectedArtifactSha256, snapshot, ...specifications) {
  return spawnSync(process.execPath, [
    verifier,
    candidate,
    commit,
    expectedArtifactSha256,
    snapshot,
    ...specifications,
  ], {
    encoding: "utf8",
  });
}

test("verified component snapshot binds copied bytes to the exact clean manifest", async (context) => {
  const { candidate, snapshot } = await fixture(context);
  const result = run(
    candidate,
    snapshot,
    "service.mjs=services/license-server/service.mjs",
    "sqlite-store.mjs=services/license-server/sqlite-store.mjs",
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /^[a-f0-9]{64}\n$/);
  assert.equal(await readFile(join(snapshot, "service.mjs"), "utf8"), "export const service = true;\n");
  assert.equal(await readFile(join(snapshot, "sqlite-store.mjs"), "utf8"), "export const store = true;\n");
});

test("lifecycle snapshot bootstraps a backup dependency absent from the existing host", async (context) => {
  const { root, candidate, snapshot } = await fixture(context);
  const host = join(root, "existing-host");
  const hostVerifier = join(host, "verify-license-backup.mjs");
  const hostIntegrity = join(host, "license-db-integrity.mjs");
  const previousVerifier = "export const previousVerifier = true;\n";
  await mkdir(host, { mode: 0o700 });
  await writeFile(hostVerifier, previousVerifier, { mode: 0o600 });
  await assert.rejects(access(hostIntegrity), { code: "ENOENT" });

  const result = run(
    candidate,
    snapshot,
    "verify-license-backup.mjs=scripts/verify-license-backup.mjs",
    "license-db-integrity.mjs=scripts/license-db-integrity.mjs",
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  await copyFile(join(snapshot, "verify-license-backup.mjs"), hostVerifier);
  await copyFile(join(snapshot, "license-db-integrity.mjs"), hostIntegrity);
  assert.match(await readFile(hostVerifier, "utf8"), /\.\/license-db-integrity\.mjs/);
  await access(hostIntegrity);

  await writeFile(hostVerifier, previousVerifier, { mode: 0o600 });
  await rm(hostIntegrity);
  assert.equal(await readFile(hostVerifier, "utf8"), previousVerifier);
  await assert.rejects(access(hostIntegrity), { code: "ENOENT" });
});

test("verified component snapshot fails atomically when any candidate byte differs", async (context) => {
  const { candidate, snapshot } = await fixture(context);
  await writeFile(join(candidate, "services", "license-server", "sqlite-store.mjs"), "changed\n", { mode: 0o600 });
  const result = run(
    candidate,
    snapshot,
    "service.mjs=services/license-server/service.mjs",
    "sqlite-store.mjs=services/license-server/sqlite-store.mjs",
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /does not match the exact deployment manifest/);
  assert.deepEqual(await readdir(snapshot), []);
});

test("verified component snapshot fails atomically when a required component is absent", async (context) => {
  const { candidate, snapshot } = await fixture(context);
  await rm(join(candidate, "services", "license-server", "sqlite-store.mjs"));
  const result = run(
    candidate,
    snapshot,
    "service.mjs=services/license-server/service.mjs",
    "sqlite-store.mjs=services/license-server/sqlite-store.mjs",
  );
  assert.notEqual(result.status, 0);
  assert.deepEqual(await readdir(snapshot), []);
});

test("verified component snapshot rejects a self-consistent manifest with an untrusted digest", async (context) => {
  const { candidate, snapshot } = await fixture(context);
  const result = runWithDigest(
    candidate,
    "b".repeat(64),
    snapshot,
    "service.mjs=services/license-server/service.mjs",
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /externally qualified artifact digest/);
  assert.deepEqual(await readdir(snapshot), []);
});

test("verified component snapshot rejects dirty, wrong-commit and duplicate manifests", async (context) => {
  const dirty = await fixture(context, { dirtyWorktree: true });
  const dirtyResult = run(dirty.candidate, dirty.snapshot, "service.mjs=services/license-server/service.mjs");
  assert.notEqual(dirtyResult.status, 0);
  assert.match(dirtyResult.stderr, /exact clean candidate commit/);

  const wrongCommit = await fixture(context, { gitCommit: "b".repeat(40) });
  const wrongCommitResult = run(wrongCommit.candidate, wrongCommit.snapshot, "service.mjs=services/license-server/service.mjs");
  assert.notEqual(wrongCommitResult.status, 0);
  assert.match(wrongCommitResult.stderr, /exact clean candidate commit/);

  const duplicateBase = await fixture(context);
  const duplicate = await fixture(context, {
    releaseComponents: [duplicateBase.releaseComponents[0], duplicateBase.releaseComponents[0]],
  });
  const duplicateResult = run(duplicate.candidate, duplicate.snapshot, "service.mjs=services/license-server/service.mjs");
  assert.notEqual(duplicateResult.status, 0);
  assert.match(duplicateResult.stderr, /unsafe or duplicate release component/);
});

test("verified component snapshot rejects a symlinked candidate parent", async (context) => {
  const service = Buffer.from("export const service = true;\n");
  const { candidate, snapshot } = await fixture(context, {
    releaseComponents: [{ path: "services/service.mjs", size: service.byteLength, sha256: sha256(service) }],
  });
  const external = await mkdtemp(join(tmpdir(), "blackproof-release-components-external-"));
  context.after(() => rm(external, { recursive: true, force: true }));
  await writeFile(join(external, "service.mjs"), service, { mode: 0o600 });
  await rm(join(candidate, "services"), { recursive: true });
  await symlink(external, join(candidate, "services"));

  const result = run(candidate, snapshot, "service.mjs=services/service.mjs");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unsafe parent directory/);
  assert.deepEqual(await readdir(snapshot), []);
});

test("verified component snapshot rejects a symlinked candidate file", async (context) => {
  const { root, candidate, snapshot } = await fixture(context);
  const external = join(root, "external-service.mjs");
  const candidateService = join(candidate, "services", "license-server", "service.mjs");
  await writeFile(external, "export const service = true;\n", { mode: 0o600 });
  await rm(candidateService);
  await symlink(external, candidateService);

  const result = run(candidate, snapshot, "service.mjs=services/license-server/service.mjs");
  assert.notEqual(result.status, 0);
  assert.deepEqual(await readdir(snapshot), []);
});

test("verified component snapshot rejects a group-writable candidate file", async (context) => {
  const { candidate, snapshot } = await fixture(context);
  await chmod(join(candidate, "services", "license-server", "service.mjs"), 0o620);

  const result = run(candidate, snapshot, "service.mjs=services/license-server/service.mjs");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unsafe or exceeds its limit/);
  assert.deepEqual(await readdir(snapshot), []);
});
