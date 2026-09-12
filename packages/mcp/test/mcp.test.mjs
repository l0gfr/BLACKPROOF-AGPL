import assert from "node:assert/strict";
import { mkdtemp, chmod, copyFile, readFile, writeFile, symlink, link, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { sha256Hex, stableStringify } from "@blackproof/verifier";
import { prepareSession, readSelectedFile } from "../src/inputs.mjs";

const executable = fileURLToPath(new URL("../bin/blackproof-mcp.mjs", import.meta.url));
const fixture = new URL("../../core/src/fixtures/proofpack-delivery-v4-historical.json", import.meta.url);
const canary = "PRIVATE_PROOF_CANARY_do_not_disclose";
async function files(t) {
  const dir = await realpath(await mkdtemp(join(tmpdir(), "blackproof-mcp-test-")));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await chmod(dir, 0o700);
  const path = join(dir, "selected.json");
  const data = JSON.parse(await readFile(fixture, "utf8"));
  data.case.title = canary;
  data.questions[0].answer = canary;
  const { fingerprint: _fingerprint, ...base } = data;
  data.fingerprint = `bp_sha256_${sha256Hex(stableStringify(base))}`;
  await writeFile(path, JSON.stringify(data), { mode: 0o600 });
  return { dir, path, data };
}
async function connect(t, args = []) {
  const client = new Client({ name: "blackproof-synthetic-test", version: "1.0.0" });
  const tripwire = fileURLToPath(new URL("./deny-network.mjs", import.meta.url));
  const transport = new StdioClientTransport({ command: process.execPath, args: ["--import", tripwire, executable, ...args], stderr: "pipe", env: {} });
  let logs = "";
  transport.stderr.on("data", chunk => { logs += chunk; });
  t.after(async () => { await client.close(); assert.equal(logs, ""); });
  await client.connect(transport);
  return { client, transport };
}

test("actual stdio server defaults to public-only, read-only tools", async t => {
  const { client } = await connect(t);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(tool => tool.name), ["blackproof_methodology", "blackproof_review_checklist"]);
  for (const tool of tools) {
    assert.deepEqual(tool.annotations, { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false });
    assert.equal(tool.inputSchema.additionalProperties, false);
  }
  const result = await client.callTool({ name: "blackproof_methodology", arguments: {} });
  assert.match(result.content[0].text, /internal-audit/);
  assert.equal(client.getServerCapabilities().resources, undefined);
  assert.equal(client.getServerCapabilities().prompts, undefined);
});

test("private tools return only aggregate snapshots and never proof content", async t => {
  const { dir, path, data } = await files(t);
  const previous = join(dir, "previous.json");
  await copyFile(path, previous); await chmod(previous, 0o600);
  const { client } = await connect(t, ["--local-only", "--current", path, "--previous", previous]);
  const { tools } = await client.listTools();
  assert.equal(tools.length, 4);
  for (const name of tools.map(tool => tool.name)) {
    const result = await client.callTool({ name, arguments: {} });
    const serialized = JSON.stringify(result);
    for (const privateValue of [canary, path, data.deliveryId, data.fingerprint, data.questions[0].id]) assert.ok(!serialized.includes(privateValue));
    assert.ok(serialized.length < 2500);
  }
  const verified = await client.callTool({ name: "blackproof_verify_selected", arguments: {} });
  assert.equal(verified.structuredContent.valid, true);
  const compared = await client.callTool({ name: "blackproof_compare_selected", arguments: {} });
  assert.equal(compared.structuredContent.comparable, true);
  assert.equal(compared.structuredContent.counts.changed, 0);
  // Later filesystem changes cannot extend or alter this authorized snapshot.
  await writeFile(path, "not a proof");
  assert.deepEqual(await client.callTool({ name: "blackproof_verify_selected", arguments: {} }), verified);
});

test("SDK validation and unknown tool errors do not echo attacker data", async t => {
  const { client } = await connect(t);
  for (const request of [
    { name: "blackproof_methodology", arguments: { [canary]: "file:///etc/passwd" } },
    { name: canary, arguments: {} },
  ]) {
    try {
      const result = await client.callTool(request);
      assert.equal(result.isError, true);
      assert.ok(!JSON.stringify(result).includes(canary));
      assert.match(result.content[0].text, /Request refused/);
    } catch (error) {
      assert.ok(!error.message.includes(canary));
      assert.match(error.message, /Request refused/);
    }
  }
});

test("file selection rejects symlinks, hardlinks, public files, directories and URLs", async t => {
  const { dir, path } = await files(t);
  await symlink(path, join(dir, "linked"));
  await assert.rejects(readSelectedFile(join(dir, "linked")));
  await assert.rejects(readSelectedFile(dir));
  await assert.rejects(readSelectedFile("https://blackproof.fr/private"));
  await assert.rejects(readSelectedFile("../selected.json"));
  await chmod(path, 0o644);
  await assert.rejects(readSelectedFile(path));
  await chmod(path, 0o600);
  await chmod(dir, 0o755);
  await assert.rejects(readSelectedFile(path));
  await chmod(dir, 0o700);
  await link(path, join(dir, "hardlinked"));
  await assert.rejects(readSelectedFile(path));
});

test("invalid and oversized input fails closed without reflected findings", async t => {
  const { path } = await files(t);
  await writeFile(path, JSON.stringify({ [canary]: canary }));
  const session = await prepareSession(path);
  assert.equal(session.current.valid, false);
  assert.equal(session.current.counts, undefined);
  assert.ok(!JSON.stringify(session).includes(canary));
  await writeFile(path, Buffer.alloc(10_000_001));
  await assert.rejects(readSelectedFile(path));
});

test("startup errors never include private paths or arguments", async () => {
  const child = spawn(process.execPath, [executable, "--local-only", "--current", `/missing/${canary}`], { env: {} });
  let output = "";
  child.stdout.on("data", b => { output += b; });
  child.stderr.on("data", b => { output += b; });
  const [code] = await once(child, "exit");
  assert.equal(code, 1);
  assert.ok(!output.includes(canary));
  assert.match(output, /local session refused/);
});

test("comparison detects actual changes and refuses an unrelated dossier", async t => {
  const { dir, path, data } = await files(t);
  const previous = join(dir, "previous.json");
  await copyFile(path, previous); await chmod(previous, 0o600);
  async function save() {
    const { fingerprint: _fingerprint, ...base } = data;
    data.fingerprint = `bp_sha256_${sha256Hex(stableStringify(base))}`;
    await writeFile(path, JSON.stringify(data));
  }
  data.questions[0].answer = "A different fictitious answer.";
  await save();
  assert.deepEqual((await prepareSession(path, previous)).comparison, {
    comparable: true, counts: { added: 0, removed: 0, changed: 1, unchanged: 0 },
  });
  data.case.id = "case_99999999999999999999999999999999";
  await save();
  assert.deepEqual((await prepareSession(path, previous)).comparison, { comparable: false });
});

test("corrupt fingerprints disclose no counts and no expected fingerprint", async t => {
  const { path, data } = await files(t);
  data.questions[0].answer += " tampered";
  await writeFile(path, JSON.stringify(data));
  const session = await prepareSession(path);
  assert.equal(session.current.valid, false);
  assert.equal(session.current.checks.fingerprint, false);
  assert.equal(session.current.counts, undefined);
  assert.ok(!JSON.stringify(session).includes("bp_sha256"));
});

test("oversized stdio frames close the connection without reflecting contents", { timeout: 5000 }, async () => {
  const child = spawn(process.execPath, [executable], { env: {} });
  let output = "";
  child.stdout.on("data", b => { output += b; });
  child.stderr.on("data", b => { output += b; });
  child.stdin.on("error", () => {});
  const exited = once(child, "exit");
  child.stdin.end(canary + "x".repeat(100_000));
  await exited;
  assert.equal(output, "");
});
