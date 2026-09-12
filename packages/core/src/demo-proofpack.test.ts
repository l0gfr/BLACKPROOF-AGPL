import { describe, expect, it } from "vitest";

import { verifyProofPackJson } from "./verify";
import { sha256Hex } from "./security";

describe("demo ProofPack", () => {
  it("ships a valid static ProofPack example", async () => {
    const { readFileSync } = (globalThis as any).process.getBuiltinModule("node:fs");
    const json = readFileSync("../../apps/web/public/demo/proofpack-demo.json", "utf8");
    const result = await verifyProofPackJson(json);

    expect(result.isValid).toBe(true);
    expect(result.validSchema).toBe(true);
    expect(result.validFingerprint).toBe(true);
    expect(result.validSummary).toBe(true);
    expect(result.validLinks).toBe(true);
  });

  it("ships a complete public demo bundle", async () => {
    const { existsSync, readFileSync } = (globalThis as any).process.getBuiltinModule("node:fs");
    const manifestPath = "../../apps/web/public/demo/proofpack-bundle-manifest.json";
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

    expect(manifest.files).toHaveLength(5);
    expect(manifest.verification.fingerprint).toBe(
      "bp_sha256_a17d26a938c11c33fa985280ff14b9192af54ed5f2e3e4aab44a084bab57cfa9"
    );

    for (const file of manifest.files) {
      const diskPath = `../../apps/web/public${file.path}`;
      expect(existsSync(diskPath), `${file.path} should exist`).toBe(true);
      const content = readFileSync(diskPath, "utf8");
      expect(file.size).toBe(new TextEncoder().encode(content).byteLength);
      expect(file.sha256).toBe(await sha256Hex(content));
    }
  });
});
