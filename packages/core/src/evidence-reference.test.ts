import { describe, expect, it } from "vitest";

import { hasEvidenceSource, isEvidenceReferenceComplete } from "./evidence-reference";
import type { EvidenceItem } from "./types";

const baseEvidence: EvidenceItem = {
  id: "evidence_test",
  caseId: "case_test",
  questionId: "question_test",
  templateId: "template_test",
  title: "Politique MFA",
  category: "access-control",
  description: "Politique de contrôle d'accès.",
  sensitivity: "internal",
  status: "expected",
  strength: "strong",
  recommendedFormat: "PDF",
  linkedRequirements: [],
};

describe("structured evidence references", () => {
  it("requires every field exposed by the available-evidence editor", () => {
    const complete: EvidenceItem = {
      ...baseEvidence,
      referenceType: "file",
      referenceId: "mfa-admin-policy-v3.pdf",
      fileName: "mfa-admin-policy-v3.pdf",
      sourceSystem: "GED sécurité",
      observedAt: "2026-07-11T10:30:00.000Z",
      owner: "RSSI",
      exportMode: "reference-only",
    };

    expect(hasEvidenceSource(complete)).toBe(true);
    expect(isEvidenceReferenceComplete(complete)).toBe(true);
    expect(isEvidenceReferenceComplete({ ...complete, owner: "" })).toBe(false);
    expect(isEvidenceReferenceComplete({ ...complete, observedAt: "invalid" })).toBe(false);
    expect(isEvidenceReferenceComplete({ ...complete, exportMode: undefined })).toBe(false);
  });

  it("keeps legacy source fields valid for ProofPack verification", () => {
    expect(hasEvidenceSource({ ...baseEvidence, fileUri: "local://evidence/mfa.pdf" })).toBe(true);
    expect(hasEvidenceSource(baseEvidence)).toBe(false);
  });
});
