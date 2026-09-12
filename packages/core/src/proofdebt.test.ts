import { describe, expect, it } from "vitest";

import {
  buildProofDebt,
  buildProofPack,
  calculateProofDebtIndicators,
  calculateProofDebtScore,
  createProofCaseFromQuestionnaire,
} from "./index";

describe("ProofDebt evidence status recalculation", () => {
  it("preserves persistent debt and ProofPack identities across revisions", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs ?"
    );
    const previous = result.proofpack;
    const questions = previous.questions.map((question) => ({
      ...question,
      answerText: "Réponse éditée sans modifier la dette de preuve.",
    }));
    const proofCase = { ...previous.case, updatedAt: new Date(Date.parse(previous.case.updatedAt) + 1_000).toISOString() };
    const debts = buildProofDebt(proofCase, questions, previous.evidence, previous.debts);
    const rebuilt = await buildProofPack(proofCase, questions, previous.evidence, debts, {
      sourceQuestionnaire: previous.sourceQuestionnaire,
      previousProofPack: previous,
    });

    expect(rebuilt.id).toBe(previous.id);
    expect(rebuilt.revisionId).not.toBe(previous.revisionId);
    expect(rebuilt.fingerprint).not.toBe(previous.fingerprint);
    expect(rebuilt.debts.map((debt) => debt.id)).toEqual(previous.debts.map((debt) => debt.id));
    expect(rebuilt.debts.every((debt) => debt.kind)).toBe(true);
  });

  it("removes proof debt when all expected evidence is marked available", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs ?"
    );

    const evidence = result.evidence.map((item) => ({
      ...item,
      status: "available" as const,
      sourceSystem: "IAM",
    }));

    const debts = buildProofDebt(result.case, result.questions, evidence);
    const proofpack = await buildProofPack(result.case, result.questions, evidence, debts);

    expect(debts).toHaveLength(0);
    expect(proofpack.summary.proofDebtScore).toBe(100);
    expect(proofpack.fingerprint).toMatch(/^bp_sha256_[a-f0-9]{64}$/);
  });

  it("keeps an explicit proof debt for not-exportable sensitive evidence", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs ?"
    );

    const evidence = result.evidence.map((item, index) => ({
      ...item,
      status: index === 0 ? ("not-exportable" as const) : ("available" as const),
    }));

    const debts = buildProofDebt(result.case, result.questions, evidence);

    expect(debts.some((debt) => debt.reason.includes("Preuve sensible non exportable"))).toBe(true);
  });

  it("caps accumulated penalties per question before calculating the global indicator", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs ?"
    );

    const debts = [
      {
        id: "debt_a",
        caseId: result.case.id,
        questionId: result.questions[0]!.id,
        severity: "critical" as const,
        reason: "Preuve MFA absente.",
        recommendedAction: "Ajouter une preuve MFA.",
      },
      {
        id: "debt_b",
        caseId: result.case.id,
        questionId: result.questions[0]!.id,
        severity: "critical" as const,
        reason: "Revue admin absente.",
        recommendedAction: "Ajouter une revue admin.",
      },
    ];

    expect(calculateProofDebtScore(result.questions, debts)).toBe(0);
  });

  it("calculates separate summary indicators for answers, evidence and export readiness", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs ?"
    );

    const questions = result.questions.map((question) => ({
      ...question,
      answerText: "Réponse documentée.",
      answerReservation: "Périmètre de validation limité aux comptes de production.",
      answerExportStatus: "reserved" as const,
    }));
    const evidence = result.evidence.map((item, index) => ({
      ...item,
      status: index === 0 ? ("available" as const) : ("declared" as const),
      strength: index === 0 ? ("strong" as const) : ("medium" as const),
      sourceSystem: index === 0 ? "IAM" : undefined,
    }));

    expect(calculateProofDebtIndicators(questions, evidence)).toEqual({
      responseCompletenessScore: 100,
      evidenceCoverageScore: 100,
      evidenceQualityFreshnessScore: 68,
      exportReadinessScore: 75,
    });
  });

  it("does not count empty ready or incomplete reserved answers", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs ?\n2. Testez-vous vos restaurations ?"
    );
    const questions = result.questions.map((question, index) => ({
      ...question,
      answerText: "",
      answerReservation: index === 1 ? "Réserve sans réponse." : "",
      answerExportStatus: index === 0 ? ("ready" as const) : ("reserved" as const),
    }));

    const indicators = calculateProofDebtIndicators(questions, []);
    const debts = buildProofDebt(result.case, questions, result.evidence);

    expect(indicators.responseCompletenessScore).toBe(0);
    expect(indicators.exportReadinessScore).toBe(0);
    expect(debts.some((debt) => debt.reason.includes("marquée prête sans contenu"))).toBe(true);
    expect(debts.some((debt) => debt.reason.includes("avec réserve incomplète"))).toBe(true);
  });

  it("requires a source or reference before available evidence contributes", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs ?"
    );
    const evidence = result.evidence.map((item) => ({
      ...item,
      status: "available" as const,
      strength: "strong" as const,
    }));

    expect(calculateProofDebtIndicators(result.questions, evidence)).toMatchObject({
      evidenceCoverageScore: 0,
      evidenceQualityFreshnessScore: 0,
    });
    expect(buildProofDebt(result.case, result.questions, evidence).some((debt) =>
      debt.reason.includes("sans source ni référence")
    )).toBe(true);
  });

  it("caps expired and incompletely validated evidence quality", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs ?"
    );
    const baseEvidence = result.evidence.map((item) => ({
      ...item,
      status: "available" as const,
      strength: "strong" as const,
      sourceSystem: "IAM",
    }));
    const expiredEvidence = baseEvidence.map((item) => ({
      ...item,
      expiresAt: "2000-01-01T00:00:00.000Z",
    }));
    const partialValidation = baseEvidence.map((item) => ({
      ...item,
      validator: "Responsable sécurité",
    }));
    const validatedEvidence = partialValidation.map((item) => ({
      ...item,
      validatedAt: "2026-07-10T09:00:00.000Z",
      expiresAt: "2999-01-01T00:00:00.000Z",
    }));

    expect(calculateProofDebtIndicators(result.questions, expiredEvidence).evidenceQualityFreshnessScore).toBe(25);
    expect(buildProofDebt(result.case, result.questions, expiredEvidence).some((debt) =>
      debt.reason.includes("Date de validité dépassée")
    )).toBe(true);
    expect(calculateProofDebtIndicators(result.questions, partialValidation).evidenceQualityFreshnessScore).toBe(50);
    expect(buildProofDebt(result.case, result.questions, partialValidation).some((debt) =>
      debt.reason.includes("Validation incomplète")
    )).toBe(true);
    expect(calculateProofDebtIndicators(result.questions, validatedEvidence).evidenceQualityFreshnessScore).toBe(100);
  });
});
