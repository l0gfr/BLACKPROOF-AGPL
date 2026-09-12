import { describe, expect, it } from "vitest";

import {
  buildProofPack,
  createProofCaseFromQuestionnaire,
  exportBoardMemoMarkdown,
} from "./index";

describe("BLACKPROOF note de synthèse", () => {
  it("exports an executive memo with score, fingerprint and disclaimer", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs ?"
    );

    const memo = exportBoardMemoMarkdown(result.proofpack);

    expect(memo).toContain("Note de synthèse BLACKPROOF");
    expect(memo).toContain("Indicateur ProofDebt");
    expect(memo).toContain(result.proofpack.fingerprint);
    expect(memo).toContain("Limite");
  });

  it("summarizes answer readiness", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Disposez-vous d'une procédure de sauvegarde documentée ?"
    );

    const questions = result.questions.map((question) => ({
      ...question,
      answerText: "Oui, une procédure de sauvegarde existe.",
      answerReservation: "Le test de restauration doit être mis à jour.",
      answerConfidence: "medium" as const,
      answerExportStatus: "reserved" as const,
    }));

    const proofpack = await buildProofPack(
      result.case,
      questions,
      result.evidence,
      result.debts
    );

    const memo = exportBoardMemoMarkdown(proofpack);

    expect(memo).toContain("Réponses avec réserve: 1");
    expect(memo).toContain("Le test de restauration");
  });
});
