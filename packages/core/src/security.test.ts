import { describe, expect, it } from "vitest";

import {
  SECURITY_LIMITS,
  SecurityValidationError,
  createProofCaseFromQuestionnaire,
  exportSupplierResponseMarkdown,
  canonicalizeQuestionnaireInput,
  findQuestionnaireInvisibleFormatCharacters,
  QUESTIONNAIRE_CANONICALIZATION_V1,
  QUESTIONNAIRE_CANONICALIZATION_V2,
  sanitizeQuestionnaireInput,
  splitQuestionnaire,
} from "./index";

import { escapeCsv } from "./utils";

describe("BLACKPROOF security invariants", () => {
  it("creates validation errors when Error.prototype.name is not writable", () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(Error.prototype, "name");

    Object.defineProperty(Error.prototype, "name", {
      value: "Error",
      configurable: true,
      writable: false,
    });

    try {
      const error = new SecurityValidationError("TEST_CODE", "Test message");

      expect(error.name).toBe("SecurityValidationError");
      expect(error.code).toBe("TEST_CODE");
      expect(error.message).toBe("Test message");
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(Error.prototype, "name", originalDescriptor);
      }
    }
  });

  it("generates a cryptographic SHA-256 ProofPack fingerprint", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs ?"
    );

    expect(result.proofpack.fingerprint).toMatch(/^bp_sha256_[a-f0-9]{64}$/);
  });

  it("rejects oversized questionnaire input", () => {
    expect(() => splitQuestionnaire("x".repeat(SECURITY_LIMITS.MAX_QUESTIONNAIRE_CHARS + 1)))
      .toThrow(SecurityValidationError);
  });

  it.each([
    ["ligne 1\r\nligne 2", "ligne 1\nligne 2"],
    ["ligne 1\rligne 2", "ligne 1\nligne 2"],
    ["ligne 1\r\nligne 2\nligne 3\rligne 4", "ligne 1\nligne 2\nligne 3\nligne 4"],
  ])("canonicalizes questionnaire line endings to LF", (input, expected) => {
    expect(sanitizeQuestionnaireInput(input)).toBe(expected);
  });

  it("removes bidi marks that can alter visual direction", () => {
    expect(sanitizeQuestionnaireInput("A\u061cB\u200eC\u200fD")).toBe("ABCD");
  });

  it("keeps v1 and v2 questionnaire canonicalization reproducible", () => {
    const input = "A\u061cB\r\nC";
    expect(canonicalizeQuestionnaireInput(input, QUESTIONNAIRE_CANONICALIZATION_V1)).toBe("A\u061cB\r\nC");
    expect(canonicalizeQuestionnaireInput(input, QUESTIONNAIRE_CANONICALIZATION_V2)).toBe("AB\nC");
  });

  it("rejects an unsupported questionnaire canonicalization version", () => {
    expect(() => canonicalizeQuestionnaireInput("question", "unsupported-version"))
      .toThrow(SecurityValidationError);
  });

  it("detects retained invisible Unicode format characters", () => {
    expect(findQuestionnaireInvisibleFormatCharacters("A\u200bB\u200cC\u200dD\u2060E\ufeffF"))
      .toEqual([
        { codePoint: "U+200B", index: 1 },
        { codePoint: "U+200C", index: 3 },
        { codePoint: "U+200D", index: 5 },
        { codePoint: "U+2060", index: 7 },
        { codePoint: "U+FEFF", index: 9 },
      ]);
  });

  it("neutralizes CSV formula injection", () => {
    expect(escapeCsv("=1+1")).toBe("\"'=1+1\"");
    expect(escapeCsv("+SUM(1,1)")).toBe("\"'+SUM(1,1)\"");
    expect(escapeCsv("-10")).toBe("\"'-10\"");
    expect(escapeCsv("@cmd")).toBe("\"'@cmd\"");
  });

  it("escapes user-controlled Markdown export content", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. <script>alert('xss')</script> Avez-vous une politique de sécurité ?"
    );

    const markdown = exportSupplierResponseMarkdown(result.proofpack);

    expect(markdown).not.toContain("<script>");
    expect(markdown).toContain("&lt;script&gt;");
  });

  it("limits the number of extracted questions", () => {
    const questionnaire = Array.from(
      { length: SECURITY_LIMITS.MAX_QUESTIONS + 1 },
      (_, index) => `${index + 1}. Question de test ?`
    ).join("\n");

    expect(() => splitQuestionnaire(questionnaire)).toThrow(SecurityValidationError);
  });
});
