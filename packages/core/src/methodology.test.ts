import { describe, expect, it } from "vitest";

import {
  methodology,
  proofDebtScoreBands,
  proofGraphSteps,
  proofPackFiles,
} from "./index";

describe("BLACKPROOF methodology", () => {
  it("exposes a versioned methodology", () => {
    expect(methodology.product).toBe("BLACKPROOF");
    expect(methodology.version).toMatch(/^blackproof-method-v0\.1\.0-alpha$/);
  });

  it("keeps ProofGraph step ids unique", () => {
    const ids = proofGraphSteps.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers the whole ProofDebt indicator range", () => {
    expect(proofDebtScoreBands[0].min).toBe(0);
    expect(proofDebtScoreBands.at(-1)?.max).toBe(100);
  });

  it("documents the core ProofPack JSON file", () => {
    expect(proofPackFiles.some((file) => file.filename === "proofpack.json")).toBe(true);
  });
});
