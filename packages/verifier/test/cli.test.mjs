import assert from "node:assert/strict";
import { generateKeyPairSync, sign as signBytes } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import test from "node:test";
import { sha256Hex, stableStringify } from "../src/index.js";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const cliPath = join(testDirectory, "..", "bin", "blackproof-verify.mjs");
const fixturePath = join(testDirectory, "..", "..", "core", "src", "fixtures", "proofpack-delivery-v4-historical.json");

test("selected special files are refused promptly", { skip: process.platform === "win32" }, async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "blackproof-verifier-file-kind-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, "input.json");
  const created = spawnSync("mkfifo", [path], { encoding: "utf8", timeout: 5_000 });
  assert.equal(created.status, 0, created.stderr);
  const result = spawnSync(process.execPath, [cliPath, "verify", path], { encoding: "utf8", timeout: 3_000, killSignal: "SIGKILL" });
  assert.equal(result.error, undefined, "File type rejection must finish before the deadline");
  assert.equal(result.status, 2);
  assert.match(result.stderr, /DELIVERY_INPUT_NOT_REGULAR_FILE/);
});

function runCli(args, environment = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      env: { ...process.env, ...environment },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

test("verification is offline and retired network options are rejected before reading input", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "blackproof-verifier-offline-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const fetchPreloadPath = join(directory, "fetch-preload.mjs");
  await writeFile(fetchPreloadPath, 'globalThis.fetch = () => { throw new Error("NETWORK_FORBIDDEN"); };');
  const environment = { NODE_OPTIONS: `--import=${pathToFileURL(fetchPreloadPath).href}` };
  const result = await runCli(["verify", fixturePath], environment);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /^VALID /);
  assert.equal(result.stderr, "");
  for (const options of [["--status-url", "https://status.invalid/"], ["--status-url"], ["--unknown-option"]]) {
    const rejected = await runCli(["verify", "missing-input.json", ...options], environment);
    assert.equal(rejected.code, 2);
    assert.match(rejected.stderr, /^Usage:/);
    assert.doesNotMatch(rejected.stderr, /NETWORK_FORBIDDEN|ENOENT/);
  }
});

test("offline revocation output remains explicitly unauthenticated", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "blackproof-verifier-revocation-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const delivery = JSON.parse(await readFile(fixturePath, "utf8"));
  const deliveryPath = join(directory, "delivery.json");
  const revocationPath = join(directory, "revocation.json");
  const base = {
    product: "BLACKPROOF",
    formatVersion: "blackproof-delivery-revocation-v1",
    deliveryId: delivery.deliveryId,
    deliveryFingerprint: delivery.fingerprint,
    status: "revoked",
    revokedAt: "2026-07-13T12:00:00.000Z",
  };
  await writeFile(deliveryPath, JSON.stringify(delivery));
  await writeFile(revocationPath, JSON.stringify({ ...base, fingerprint: `bp_sha256_${sha256Hex(stableStringify(base))}` }));

  const result = await runCli(["verify-revocation", deliveryPath, revocationPath]);
  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout, `UNAUTHENTICATED_REVOCATION_STATEMENT ${base.revokedAt}\n`);
});

test("issuer labels cannot inject terminal control sequences into a successful verdict", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "blackproof-verifier-signature-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const delivery = JSON.parse(await readFile(fixturePath, "utf8"));
  const deliveryPath = join(directory, "delivery.json");
  const signaturePath = join(directory, "signature.json");
  await writeFile(deliveryPath, JSON.stringify(delivery));
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const publicKeyJwk = publicKey.export({ format: "jwk" });

  async function verifyIssuer(issuer) {
    const base = {
      product: "BLACKPROOF",
      formatVersion: "blackproof-delivery-signature-v1",
      subjectType: "delivery",
      subjectFingerprint: delivery.fingerprint,
      algorithm: "ECDSA-P256-SHA256",
      issuer,
      publicKeyJwk,
      signedAt: "2026-07-13T12:00:00.000Z",
    };
    const signature = signBytes("sha256", Buffer.from(stableStringify(base)), { key: privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url");
    await writeFile(signaturePath, JSON.stringify({ ...base, signature }));
    return runCli(["verify-signature", deliveryPath, signaturePath]);
  }

  const safe = await verifyIssuer("ACME France");
  assert.equal(safe.code, 0);
  assert.equal(safe.stdout, "VALID_SIGNATURE ACME France\n");

  const unsafe = await verifyIssuer(["ACME", String.fromCharCode(10), "France"].join(""));
  assert.equal(unsafe.code, 1);
  assert.equal(unsafe.stdout, "INVALID_SIGNATURE\n");
});
