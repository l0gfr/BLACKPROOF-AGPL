import { describe, expect, it } from "vitest";

import {
  QUESTIONNAIRE_CANONICALIZATION_V1,
  QUESTIONNAIRE_CANONICALIZATION_V2,
  canonicalizeQuestionnaireInput,
  sha256Hex,
} from "./security";

describe("public questionnaire canonicalization vectors", () => {
  it("replays every public vector against the implementation", async () => {
    const { readFileSync } = (globalThis as any).process.getBuiltinModule("node:fs");
    const artifact = JSON.parse(readFileSync("../../apps/web/public/canonicalization-vectors.json", "utf8"));

    expect(artifact.formatVersion).toBe("blackproof-canonicalization-vectors-v1");
    expect(new Set(artifact.vectors.map((vector: any) => vector.version))).toEqual(new Set([
      QUESTIONNAIRE_CANONICALIZATION_V1,
      QUESTIONNAIRE_CANONICALIZATION_V2,
    ]));

    for (const vector of artifact.vectors) {
      const inputBytes = Uint8Array.from(atob(vector.inputUtf8Base64), (character) => character.charCodeAt(0));
      const input = new TextDecoder().decode(inputBytes);
      const canonical = canonicalizeQuestionnaireInput(input, vector.version);
      const canonicalBase64 = btoa(String.fromCharCode(...new TextEncoder().encode(canonical)));

      expect(canonicalBase64, vector.id).toBe(vector.canonicalUtf8Base64);
      expect(await sha256Hex(canonical), vector.id).toBe(vector.sha256);
    }
  });
});
