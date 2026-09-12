import { describe, expect, it } from "vitest";

import { createProofCaseFromQuestionnaire } from "./questionnaire";
import { makeId } from "./utils";

const uuidIdPattern = /^[a-z]+_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("business object identities", () => {
  it("uses random UUID identities instead of deterministic content hashes", () => {
    const first = makeId("case");
    const second = makeId("case");

    expect(first).toMatch(uuidIdPattern);
    expect(second).toMatch(uuidIdPattern);
    expect(second).not.toBe(first);
  });

  it("assigns UUID identities once and preserves graph links", async () => {
    const result = await createProofCaseFromQuestionnaire("1. Le MFA est-il activé pour les administrateurs ?");
    const ids = [
      result.case.id,
      result.proofpack.id,
      ...result.questions.map((question) => question.id),
      ...result.evidence.map((item) => item.id),
      ...result.debts.map((debt) => debt.id),
    ];

    expect(ids.every((id) => uuidIdPattern.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(result.questions[0]!.evidenceIds).toEqual(
      result.evidence.filter((item) => item.questionId === result.questions[0]!.id).map((item) => item.id)
    );
  });
});
