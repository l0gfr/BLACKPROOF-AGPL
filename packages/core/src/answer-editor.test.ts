import { describe, expect, it } from "vitest";

import {
  buildProofPack,
  createProofCaseFromQuestionnaire,
  exportSupplierResponseMarkdown,
  sha256Hex,
  stableStringify,
  verifyProofPackJson,
} from "./index";

async function refreshFingerprint(proofpack: any) {
  const { fingerprint: _fingerprint, ...base } = proofpack;
  proofpack.fingerprint = `bp_sha256_${await sha256Hex(stableStringify(base))}`;
  return proofpack;
}

describe("BLACKPROOF Answer Editor", () => {
  it("creates default answer fields on generated questions", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs ?"
    );

    expect(result.questions[0]?.answerText).toBe("");
    expect(result.questions[0]?.answerReservation).toBe("");
    expect(result.questions[0]?.answerConfidence).toBe("medium");
    expect(result.questions[0]?.answerExportStatus).toBe("draft");
  });

  it("exports written answers and reservations in reponse-fournisseur.md", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs ?"
    );

    const questions = result.questions.map((question) => ({
      ...question,
      answerText: "Oui, le MFA est activé pour les comptes administrateurs.",
      answerReservation: "La capture de configuration n'est pas exportée ; un extrait contrôlé peut être fourni.",
      answerConfidence: "high" as const,
      answerExportStatus: "reserved" as const,
    }));

    const proofpack = await buildProofPack(
      result.case,
      questions,
      result.evidence,
      result.debts
    );

    const markdown = exportSupplierResponseMarkdown(proofpack);

    expect(markdown).toContain("Oui, le MFA est activé");
    expect(markdown).toContain("La capture de configuration");
    expect(markdown).toContain("Avec réserve");
    expect(markdown).toContain("Haute");
    expect(markdown).toContain("Réponse cyber fournisseur");
  });

  it("never exports an automatic suggestion as a supplier answer", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs ?"
    );
    result.proofpack.questions[0]!.suggestedAnswer = "INTERNAL_AUTOMATIC_SUGGESTION";
    result.proofpack.questions[0]!.answerText = "";

    const markdown = exportSupplierResponseMarkdown(result.proofpack);

    expect(markdown).toContain("Réponse non renseignée\\.");
    expect(markdown).not.toContain("INTERNAL_AUTOMATIC_SUGGESTION");
  });

  it("rejects invalid answer export status even with recomputed fingerprint", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Disposez-vous d'une procédure de sauvegarde documentée ?"
    );

    const tampered = structuredClone(result.proofpack);
    (tampered.questions[0] as any).answerExportStatus = "send-it-anyway";
    await refreshFingerprint(tampered);

    const verification = await verifyProofPackJson(JSON.stringify(tampered));

    expect(verification.isValid).toBe(false);
    expect(verification.validSchema).toBe(false);
    expect(verification.findings.some((finding) => finding.code === "SCHEMA_INVALID_ENUM")).toBe(true);
  });
});
