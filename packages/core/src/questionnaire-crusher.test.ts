import { describe, expect, it } from "vitest";

import {
  analyzeQuestionnaireForCrusher,
  diagnoseQuestion,
  questionnaireCrusherCapabilities,
} from "./index";

describe("BLACKPROOF Questionnaire Crusher", () => {
  it("exposes product capabilities", () => {
    expect(questionnaireCrusherCapabilities.length).toBeGreaterThan(5);
  });

  it("diagnoses a critical MFA question with complete automatic mapping", () => {
    const diagnostic = diagnoseQuestion(
      "Avez-vous activé le MFA pour les comptes administrateurs ?",
      1
    );

    expect(diagnostic.category).toBe("access-control");
    expect(diagnostic.criticality).toBe("critical");
    expect(diagnostic.heuristicCoverage).toBe("high");
    expect(diagnostic.heuristicCoverageLabel).toBe("règles de correspondance trouvées");
    expect(diagnostic.status).toBe("critical");
    expect(diagnostic.expectedEvidence.length).toBeGreaterThan(0);
  });

  it("builds a report with mapped, critical and unmapped queues", () => {
    const report = analyzeQuestionnaireForCrusher(`
1. Avez-vous activé le MFA pour les comptes administrateurs ?
2. Disposez-vous d'une procédure de sauvegarde documentée ?
3. Collectez-vous et conservez-vous les journaux de sécurité ?
4. Quelle est votre couleur préférée ?
`);

    expect(report.summary.questionCount).toBe(4);
    expect(report.summary.criticalCount).toBeGreaterThanOrEqual(1);
    expect(report.summary.unmappedCount).toBeGreaterThanOrEqual(1);
    expect(report.unmappedQueue.length).toBeGreaterThanOrEqual(1);
    expect(report.criticalQueue.length).toBeGreaterThanOrEqual(1);
  });

  it("maps security logs to logging-monitoring", () => {
    const diagnostic = diagnoseQuestion(
      "Collectez-vous et conservez-vous les journaux de sécurité ?",
      1
    );

    expect(diagnostic.category).toBe("logging-monitoring");
    expect(diagnostic.mappedRequirementIds).toContain("recyf.logging-monitoring");
    expect(diagnostic.mappedRequirementIds).toContain("nis2.detection");
  });

  it("marks unknown questions as requiring manual qualification", () => {
    const diagnostic = diagnoseQuestion(
      "Quelle est votre couleur préférée ?",
      1
    );

    expect(diagnostic.category).toBe("unknown");
    expect(diagnostic.heuristicCoverage).toBe("low");
    expect(diagnostic.heuristicCoverageLabel).toBe("qualification manuelle nécessaire");
    expect(diagnostic.status).toBe("unmapped");
  });

  it("does not match short keywords inside unrelated words", () => {
    expect(diagnoseQuestion("Avez-vous un catalogue logiciel à jour ?", 1).category).toBe("unknown");
    expect(diagnoseQuestion("Collectez-vous les metadata applicatives ?", 1).category).toBe("unknown");
  });
});
