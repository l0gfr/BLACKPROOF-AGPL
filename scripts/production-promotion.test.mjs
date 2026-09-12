import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  truncateSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const verifier = "scripts/verify-release-directory.mjs";
const promoter = readFileSync("deploy/server/promote-static-release.sh", "utf8");
const smoke = readFileSync("scripts/smoke-apache-prod.sh", "utf8");
const commit = "a".repeat(40);

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "blackproof-promotion-"));
  const release = join(root, "release");
  mkdirSync(join(release, "api"), { recursive: true });
  const index = Buffer.from("<!doctype html><title>BLACKPROOF</title>");
  const status = Buffer.from('{"securityPosture":{"accessModel":"open-source"}}');
  writeFileSync(join(release, "index.html"), index);
  writeFileSync(join(release, "api/status.json"), status);
  const manifestWithoutDigest = {
    product: "BLACKPROOF",
    artifactVersion: "blackproof-static-artifact-v0.1.0-alpha",
    generatedAt: "2026-07-24T00:00:00.000Z",
    gitCommit: commit,
    gitBranch: "main",
    dirtyWorktree: false,
    sourceRepository: "github.com/l0gfr/BLACKPROOF-AGPL",
    distDir: "apps/web/dist",
    rollback: {
      strategy: "test",
      productionPath: "/var/www/html/blackproof",
    },
    files: [
      { path: "api/status.json", size: status.byteLength, sha256: sha256(status) },
      { path: "index.html", size: index.byteLength, sha256: sha256(index) },
    ],
    releaseComponents: [],
  };
  const manifest = {
    ...manifestWithoutDigest,
    artifactSha256: sha256(Buffer.from(JSON.stringify(manifestWithoutDigest))),
  };
  const manifestPath = join(root, "artifact-manifest.json");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { release, manifestPath, artifactSha256: manifest.artifactSha256 };
}

test("release directory verifier binds every served byte to the exact clean commit", () => {
  const { release, manifestPath, artifactSha256 } = fixture();
  const output = execFileSync(
    process.execPath,
    [verifier, manifestPath, release, commit, artifactSha256],
    { encoding: "utf8" },
  );
  assert.match(output, /Release directory verification passed/);

  writeFileSync(join(release, "index.html"), "tampered");
  const failed = spawnSync(
    process.execPath,
    [verifier, manifestPath, release, commit, artifactSha256],
    { encoding: "utf8" },
  );
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /checksum mismatch/);
});

test("release directory verifier rejects a self-consistent manifest without its external digest", () => {
  const { release, manifestPath } = fixture();
  const failed = spawnSync(
    process.execPath,
    [verifier, manifestPath, release, commit, "b".repeat(64)],
    { encoding: "utf8" },
  );
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /self-digest mismatch/);
});

test("release directory verifier rejects symlinked manifest and release files", () => {
  const manifestFixture = fixture();
  const linkedManifest = join(manifestFixture.release, "manifest-link.json");
  symlinkSync(manifestFixture.manifestPath, linkedManifest);
  const manifestFailure = spawnSync(
    process.execPath,
    [verifier, linkedManifest, manifestFixture.release, commit, manifestFixture.artifactSha256],
    { encoding: "utf8" },
  );
  assert.notEqual(manifestFailure.status, 0);
  assert.match(manifestFailure.stderr, /regular non-symlink file/);

  const releaseFixture = fixture();
  const external = join(releaseFixture.release, "..", "external-index.html");
  writeFileSync(external, "external");
  rmSync(join(releaseFixture.release, "index.html"));
  symlinkSync(external, join(releaseFixture.release, "index.html"));
  const releaseFailure = spawnSync(
    process.execPath,
    [verifier, releaseFixture.manifestPath, releaseFixture.release, commit, releaseFixture.artifactSha256],
    { encoding: "utf8" },
  );
  assert.notEqual(releaseFailure.status, 0);
  assert.match(releaseFailure.stderr, /Symbolic links are forbidden/);
});

test("release directory verifier rejects oversized manifest, file and aggregate inventory", () => {
  const manifestFixture = fixture();
  truncateSync(manifestFixture.manifestPath, 10_000_001);
  const manifestFailure = spawnSync(
    process.execPath,
    [verifier, manifestFixture.manifestPath, manifestFixture.release, commit, manifestFixture.artifactSha256],
    { encoding: "utf8" },
  );
  assert.notEqual(manifestFailure.status, 0);
  assert.match(manifestFailure.stderr, /Deployment manifest exceeds its bounded verification limit/);

  const fileFixture = fixture();
  truncateSync(join(fileFixture.release, "index.html"), 32_000_001);
  const fileFailure = spawnSync(
    process.execPath,
    [verifier, fileFixture.manifestPath, fileFixture.release, commit, fileFixture.artifactSha256],
    { encoding: "utf8" },
  );
  assert.notEqual(fileFailure.status, 0);
  assert.match(fileFailure.stderr, /Promoted release file index\.html exceeds its bounded verification limit/);

  const totalFixture = fixture();
  const parsed = JSON.parse(readFileSync(totalFixture.manifestPath, "utf8"));
  const { artifactSha256: _ignoredDigest, ...withoutDigest } = parsed;
  withoutDigest.files = Array.from({ length: 7 }, (_, index) => ({
    path: `part-${index}.bin`,
    size: 31_000_000,
    sha256: "b".repeat(64),
  }));
  const aggregateManifest = {
    ...withoutDigest,
    artifactSha256: sha256(Buffer.from(JSON.stringify(withoutDigest))),
  };
  writeFileSync(totalFixture.manifestPath, JSON.stringify(aggregateManifest));
  const totalFailure = spawnSync(
    process.execPath,
    [verifier, totalFixture.manifestPath, totalFixture.release, commit, aggregateManifest.artifactSha256],
    { encoding: "utf8" },
  );
  assert.notEqual(totalFailure.status, 0);
  assert.match(totalFailure.stderr, /total public byte limit/);
});

test("server promotion uses atomic directory exchange and automatic rollback", () => {
  assert.match(promoter, /trusted_script="\$service_directory\/promote-static-release\.sh"/);
  assert.match(promoter, /verifier_path="\$service_directory\/verify-release-directory\.mjs"/);
  assert.match(promoter, /smoke_path="\$service_directory\/smoke-apache-prod\.sh"/);
  assert.match(promoter, /PATH=\/opt\/blackproof\/node\/bin:\/usr\/bin:\/bin\nexport PATH/);
  assert.match(promoter, /\$\{EUID:-\$\(id -u\)\} -eq 0 \|\| \$# -ne 5/);
  assert.match(promoter, /root:root:755/);
  assert.match(promoter, /root:root:644/);
  assert.doesNotMatch(promoter, /blackproof-promotion-\$\{expected_commit\}\/verify-release-directory/);
  assert.doesNotMatch(promoter, /blackproof-promotion-\$\{expected_commit\}\/smoke-apache-prod/);
  assert.match(promoter, /renameat2\(-100, current, -100, candidate, 2\)/);
  assert.match(promoter, /Atomic exchange requires current and candidate releases on the same filesystem/);
  assert.match(promoter, /trap 'rollback \$\?' ERR/);
  assert.match(promoter, /trap 'rollback 130' INT/);
  assert.match(promoter, /trap 'rollback 143' TERM/);
  assert.match(promoter, /rollback_required=0[\s\S]*atomic_exchange\nrollback_required=1/);
  assert.match(
    promoter,
    /atomic_exchange\nrollback_required=1[\s\S]*?"\$runtime" "\$verifier_path"[\s\S]*?"\$current_root"[\s\S]*?"\$expected_commit" "\$expected_artifact_sha256"[\s\S]*?status_body=/,
  );
  assert.match(promoter, /atomically restoring the previous release/);
  assert.ok(promoter.includes('activation_receipt="/run/blackproof-static-release.ready"'));
  assert.match(promoter, /root:root:444/);
  assert.match(promoter, /commit=\$expected_commit/);
  assert.match(promoter, /artifact_sha256=\$expected_artifact_sha256/);
  assert.match(promoter, /current_epoch - activated_at_epoch > 7200/);
  assert.doesNotMatch(promoter, /version=1|monitor_systemd=1/);
  assert.ok(promoter.includes('expected_access_model" != "open-source"'));
  assert.ok(promoter.includes('accessModel !== "open-source"'));
  assert.ok(promoter.includes('accessRequirement !== "none"'));
  assert.ok(promoter.includes('softwareLicense !== "AGPL-3.0-only"'));
  assert.ok(promoter.includes('assert_retired_routes_closed'));
  assert.ok(promoter.includes('assert_retired_routes_closed'));
  assert.ok(promoter.includes('retired_status" != "410"'));
  assert.match(promoter, /smoke-apache-prod\.sh/);
  assert.match(promoter, /BLACKPROOF_SOURCE_CONTRACT_MODE=exact-ci-artifact/);
  assert.match(smoke, /BLACKPROOF_SOURCE_CONTRACT_MODE:-required/);
  assert.match(smoke, /exact-ci-artifact\)/);
  assert.match(smoke, /checksum-matched to the exact CI artifact where this gate passed/);
  assert.match(smoke, /invalid BLACKPROOF_SOURCE_CONTRACT_MODE/);
});

test("server promotion helper remains executable and syntactically valid", () => {
  chmodSync("deploy/server/promote-static-release.sh", 0o755);
  const result = spawnSync("bash", ["-n", "deploy/server/promote-static-release.sh"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});
