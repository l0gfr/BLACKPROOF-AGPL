import { describe, expect, it } from "vitest";
import historicalDeliveryV4 from "./fixtures/proofpack-delivery-v4-historical.json";

import {
  buildProofDebt,
  buildProofPack,
  buildProofPackDelivery,
  buildProofPackSchemaCorpus,
  calculateProofDebtIndicators,
  createProofCaseFromQuestionnaire,
  exportProofPackJson,
  exportProofPackDeliveryJson,
  sha256Hex,
  stableStringify,
  verifyProofPackJson,
  verifyQuestionnaireSourceBinding,
  verifyDeliveryReceiptWithSnapshot,
} from "./index";

async function refreshFingerprint(proofpack: any) {
  const { fingerprint: _fingerprint, ...base } = proofpack;
  proofpack.fingerprint = `bp_sha256_${await sha256Hex(stableStringify(base))}`;
  return proofpack;
}

describe("ProofPack verifier", () => {
  it("keeps a historical V4 snapshot valid in Master delivery history", async () => {
    const result = await createProofCaseFromQuestionnaire("1. Le MFA est-il activé pour les administrateurs ?");
    const deliveryJson = JSON.stringify(historicalDeliveryV4, null, 2);
    const receipt = {
      deliveryId: historicalDeliveryV4.deliveryId,
      fingerprint: historicalDeliveryV4.fingerprint,
      generatedAt: historicalDeliveryV4.generatedAt,
      selectedQuestionIds: [result.questions[0]!.id],
      selectedEvidenceIds: [result.evidence[0]!.id],
      questionMappings: [{ masterQuestionId: result.questions[0]!.id, deliveryQuestionId: historicalDeliveryV4.questions[0]!.id }],
      evidenceMappings: [{
        masterEvidenceId: result.evidence[0]!.id,
        deliveryEvidenceId: historicalDeliveryV4.questions[0]!.evidence[0]!.id,
      }],
      snapshotSha256: await sha256Hex(deliveryJson),
      deliveryJson,
      filename: `blackproof-delivery-${historicalDeliveryV4.deliveryId}.json`,
      status: "generated" as const,
    };
    const proofpack = structuredClone(result.proofpack);
    proofpack.deliveryHistory = [receipt];
    await refreshFingerprint(proofpack);

    const snapshot = await verifyDeliveryReceiptWithSnapshot(proofpack, receipt, deliveryJson);
    expect(snapshot.isValid).toBe(true);
    const master = await verifyProofPackJson(JSON.stringify(proofpack));
    expect(master.validDeliveryHistory).toBe(true);
    expect(master.isValid).toBe(true);
  });
  it("validates an untampered ProofPack", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs ?"
    );

    const verification = await verifyProofPackJson(exportProofPackJson(result.proofpack));

    expect(verification.isValid).toBe(true);
    expect(verification.validFingerprint).toBe(true);
    expect(verification.validSummary).toBe(true);
    expect(verification.validLinks).toBe(true);
    expect(verification.validDeliveryHistory).toBe(true);
  });

  it("rejects a Delivery receipt that does not match its archived snapshot", async () => {
    const result = await createProofCaseFromQuestionnaire("1. Avez-vous activé le MFA ?");
    result.questions[0]!.answerText = "Le MFA est activé.";
    result.questions[0]!.answerExportStatus = "ready";
    const delivery = await buildProofPackDelivery(result.proofpack, {
      questionIds: [result.questions[0]!.id], evidenceIds: [], confirmed: true,
    });
    const proofpack = structuredClone(result.proofpack);
    proofpack.deliveryHistory = [{
      deliveryId: `delivery_${"0".repeat(32)}`,
      fingerprint: `bp_sha256_${"0".repeat(64)}`,
      generatedAt: "2039-01-01T00:00:00.000Z",
      selectedQuestionIds: [result.questions[0]!.id],
      selectedEvidenceIds: [],
      deliveryJson: exportProofPackDeliveryJson(delivery),
      filename: `blackproof-delivery-delivery_${"0".repeat(32)}.json`,
      status: "generated",
    }];
    await refreshFingerprint(proofpack);

    const verification = await verifyProofPackJson(JSON.stringify(proofpack));
    expect(verification.validFingerprint).toBe(true);
    expect(verification.validDeliveryHistory).toBe(false);
    expect(verification.isValid).toBe(false);
    expect(verification.findings.some((item) => item.code === "DELIVERY_HISTORY_SNAPSHOT_MISMATCH")).toBe(true);
  });

  it("rejects an externally supplied Delivery snapshot when its public mapping is forged", async () => {
    const result = await createProofCaseFromQuestionnaire("1. Avez-vous activé le MFA ?");
    result.questions[0]!.answerText = "Le MFA est activé.";
    result.questions[0]!.answerExportStatus = "ready";
    const delivery = await buildProofPackDelivery(result.proofpack, {
      questionIds: [result.questions[0]!.id], evidenceIds: [], confirmed: true,
    });
    const deliveryJson = exportProofPackDeliveryJson(delivery);
    const receipt = {
      deliveryId: delivery.deliveryId,
      fingerprint: delivery.fingerprint,
      generatedAt: delivery.generatedAt,
      selectedQuestionIds: [result.questions[0]!.id],
      selectedEvidenceIds: [],
      questionMappings: [{ masterQuestionId: result.questions[0]!.id, deliveryQuestionId: `question_${"f".repeat(32)}` }],
      evidenceMappings: [],
      snapshotSha256: await sha256Hex(deliveryJson),
      filename: `blackproof-delivery-${delivery.deliveryId}.json`,
      status: "generated" as const,
    };
    const proofpack = structuredClone(result.proofpack);
    proofpack.deliveryHistory = [receipt];
    await refreshFingerprint(proofpack);

    const masterVerification = await verifyProofPackJson(JSON.stringify(proofpack));
    expect(masterVerification.validFingerprint).toBe(true);
    expect(masterVerification.validDeliveryHistory).toBe(true);
    const snapshotVerification = await verifyDeliveryReceiptWithSnapshot(proofpack, receipt, deliveryJson);
    expect(snapshotVerification.isValid).toBe(false);
    expect(snapshotVerification.validHash).toBe(true);
    expect(snapshotVerification.validMappings).toBe(false);
    expect(snapshotVerification.findings.some((item) => item.code === "DELIVERY_HISTORY_PUBLIC_MAPPING_MISMATCH")).toBe(true);

    receipt.questionMappings[0]!.deliveryQuestionId = delivery.questions[0]!.id;
    const corrected = await verifyDeliveryReceiptWithSnapshot(proofpack, receipt, deliveryJson);
    expect(corrected.isValid).toBe(true);
  });

  it("keeps legacy Delivery receipts valid with an explicit warning", async () => {
    const result = await createProofCaseFromQuestionnaire("1. Avez-vous activé le MFA ?");
    const proofpack = structuredClone(result.proofpack);
    proofpack.deliveryHistory = [{
      deliveryId: `delivery_${"1".repeat(32)}`,
      fingerprint: `bp_sha256_${"1".repeat(64)}`,
      generatedAt: "2026-07-11T00:00:00.000Z",
      selectedQuestionIds: [result.questions[0]!.id],
      selectedEvidenceIds: [],
      filename: "legacy-delivery.zip",
      status: "generated",
    }];
    await refreshFingerprint(proofpack);

    const verification = await verifyProofPackJson(JSON.stringify(proofpack));
    expect(verification.validDeliveryHistory).toBe(true);
    expect(verification.isValid).toBe(true);
    expect(verification.findings.some((item) => item.code === "DELIVERY_HISTORY_LEGACY_NO_SNAPSHOT" && item.severity === "warning")).toBe(true);
  });

  it("records distinct original-file and normalized-questionnaire fingerprints", async () => {
    const originalFileSha256 = `sha256:${"a".repeat(64)}`;
    const result = await createProofCaseFromQuestionnaire(
      "  1. Avez-vous activé le MFA ?  ",
      { sourceOriginalFileSha256: originalFileSha256 }
    );

    expect(result.proofpack.sourceQuestionnaire.originalFileSha256).toBe(originalFileSha256);
    expect(result.proofpack.sourceQuestionnaire.normalizedQuestionnaireSha256).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(result.proofpack.sourceQuestionnaire.sha256).toBe(
      result.proofpack.sourceQuestionnaire.normalizedQuestionnaireSha256
    );
    expect(result.proofpack.sourceQuestionnaire.canonicalizationVersion)
      .toBe("blackproof-questionnaire-canonicalization-v2");
  });

  it("selects v1 for historical source bindings and v2 for current ProofPacks", async () => {
    const lf = "1. Avez-vous activé le MFA ?\n2. Les sauvegardes sont-elles testées ?";
    const crlf = lf.replace(/\n/g, "\r\n");
    const current = await createProofCaseFromQuestionnaire(lf);
    const historical = structuredClone(current.proofpack);
    delete (historical as any).formatVersion;
    delete (historical as any).schemaVersion;
    delete historical.sourceQuestionnaire.canonicalizationVersion;
    const historicalSha256 = `sha256:${await sha256Hex(crlf)}`;
    historical.sourceQuestionnaire.sha256 = historicalSha256;
    historical.sourceQuestionnaire.normalizedQuestionnaireSha256 = historicalSha256;
    historical.sourceQuestionnaire.size = new TextEncoder().encode(crlf).length;
    await refreshFingerprint(historical);

    const historicalVerification = await verifyProofPackJson(JSON.stringify(historical));
    const historicalBinding = await verifyQuestionnaireSourceBinding(crlf, historical);
    const currentBinding = await verifyQuestionnaireSourceBinding(lf, current.proofpack);

    expect(historicalVerification.isValid).toBe(true);
    expect(historicalVerification.canonicalizationVersion).toBe("blackproof-questionnaire-canonicalization-v1");
    expect(historicalVerification.findings).toContainEqual(expect.objectContaining({
      code: "QUESTIONNAIRE_CANONICALIZATION_LEGACY_DEFAULT",
    }));
    expect(historicalBinding).toMatchObject({ isValid: true, canonicalizationVersion: "blackproof-questionnaire-canonicalization-v1" });
    expect(currentBinding).toMatchObject({ isValid: true, canonicalizationVersion: "blackproof-questionnaire-canonicalization-v2" });
  });

  it("keeps published V2 Masters verifiable without revisionId or deliveryHistory", async () => {
    const current = await createProofCaseFromQuestionnaire("Question V2 publiée");
    const v2 = structuredClone(current.proofpack) as any;
    v2.formatVersion = "blackproof-proofpack-v2";
    v2.schemaVersion = "blackproof-proofpack-schema-v2";
    delete v2.revisionId;
    delete v2.deliveryHistory;
    await refreshFingerprint(v2);

    const verification = await verifyProofPackJson(JSON.stringify(v2));

    expect(verification.isValid).toBe(true);
    expect(verification.validSchema).toBe(true);
    expect(verification.formatVersion).toBe("blackproof-proofpack-v2");
    expect(verification.schemaVersion).toBe("blackproof-proofpack-schema-v2");
  });

  it("rejects a questionnaire source binding with a coherent hash but a false canonical size", async () => {
    const questionnaire = "Questionnaire canonique de test";
    const result = await createProofCaseFromQuestionnaire(questionnaire);
    const proofpack = structuredClone(result.proofpack);
    proofpack.sourceQuestionnaire.size = 0;
    await refreshFingerprint(proofpack);

    const binding = await verifyQuestionnaireSourceBinding(questionnaire, proofpack);

    expect(binding).toMatchObject({
      isValid: false,
      validHash: true,
      validSize: false,
      expectedSize: 0,
      actualSize: new TextEncoder().encode(questionnaire).length,
    });
  });

  it("applies the shared schema corpus with strict date-time semantics", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs ?"
    );

    for (const corpusCase of buildProofPackSchemaCorpus(result.proofpack)) {
      const verification = await verifyProofPackJson(JSON.stringify(corpusCase.payload));
      expect(verification.validSchema, corpusCase.id).toBe(corpusCase.expectedValid);
    }
  });

  it("validates a rebuilt legacy reservation migration", async () => {
    const legacyReservation = "Réserve legacy : inventaire nominatif non exportable.";
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs ?"
    );

    const legacyProofpack = structuredClone(result.proofpack);
    (legacyProofpack.questions[0] as any).answerRéserve = legacyReservation;
    delete (legacyProofpack.questions[0] as any).answerReservation;

    const migratedQuestions = legacyProofpack.questions.map((question) => {
      const legacyQuestion = question as typeof question & { answerRéserve?: string };

      if (typeof legacyQuestion.answerRéserve !== "string") {
        return question;
      }

      const { answerRéserve, ...currentQuestion } = legacyQuestion;

      return {
        ...currentQuestion,
        answerReservation: currentQuestion.answerReservation || answerRéserve,
      };
    });
    const proofCase = {
      ...legacyProofpack.case,
      updatedAt: "2026-07-11T00:00:00.000Z",
    };
    const debts = buildProofDebt(proofCase, migratedQuestions, legacyProofpack.evidence);
    const migratedProofpack = await buildProofPack(proofCase, migratedQuestions, legacyProofpack.evidence, debts);

    const verification = await verifyProofPackJson(JSON.stringify(migratedProofpack));

    expect(migratedProofpack.questions[0]).not.toHaveProperty("answerRéserve");
    expect(migratedProofpack.questions[0]!.answerReservation).toBe(legacyReservation);
    expect(verification.isValid).toBe(true);
    expect(verification.validFingerprint).toBe(true);
  });

  it("detects content tampering through fingerprint mismatch", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs ?"
    );

    const tampered = structuredClone(result.proofpack);
    tampered.questions[0]!.text = "Question modifiée après génération ?";

    const verification = await verifyProofPackJson(JSON.stringify(tampered));

    expect(verification.isValid).toBe(false);
    expect(verification.validFingerprint).toBe(false);
    expect(verification.findings.some((finding) => finding.code === "FINGERPRINT_MISMATCH")).toBe(true);
  });

  it("detects summary mismatch", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Disposez-vous d'une procédure de sauvegarde documentée ?"
    );

    const tampered = structuredClone(result.proofpack);
    tampered.summary.questionCount = 999;

    const verification = await verifyProofPackJson(JSON.stringify(tampered));

    expect(verification.isValid).toBe(false);
    expect(verification.validSummary).toBe(false);
    expect(verification.findings.some((finding) => finding.code === "SUMMARY_MISMATCH")).toBe(true);
  });

  it("detects invalid JSON", async () => {
    const verification = await verifyProofPackJson("{not valid json");

    expect(verification.isValid).toBe(false);
    expect(verification.validSchema).toBe(false);
    expect(verification.findings.some((finding) => finding.code === "INVALID_JSON")).toBe(true);
  });

  it("detects broken evidence links", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous une procédure de réponse à incident ?"
    );

    const tampered = structuredClone(result.proofpack);
    tampered.evidence[0]!.questionId = "q_missing";

    const verification = await verifyProofPackJson(JSON.stringify(tampered));

    expect(verification.isValid).toBe(false);
    expect(verification.validLinks).toBe(false);
    expect(verification.findings.some((finding) => finding.code === "EVIDENCE_UNKNOWN_QUESTION")).toBe(true);
  });

  it("rejects invalid question confidence even with recomputed fingerprint", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs ?"
    );

    const tampered = structuredClone(result.proofpack);
    (tampered.questions[0] as any).confidence = "bof";
    await refreshFingerprint(tampered);

    const verification = await verifyProofPackJson(JSON.stringify(tampered));

    expect(verification.isValid).toBe(false);
    expect(verification.validSchema).toBe(false);
    expect(verification.findings.some((finding) => finding.code === "SCHEMA_INVALID_ENUM")).toBe(true);
  });

  it("rejects invalid evidence status even with recomputed fingerprint", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Disposez-vous d'une procédure de sauvegarde documentée ?"
    );

    const tampered = structuredClone(result.proofpack);
    (tampered.evidence[0] as any).status = "trust-me-bro";
    await refreshFingerprint(tampered);

    const verification = await verifyProofPackJson(JSON.stringify(tampered));

    expect(verification.isValid).toBe(false);
    expect(verification.validSchema).toBe(false);
    expect(verification.findings.some((finding) => finding.code === "SCHEMA_INVALID_ENUM")).toBe(true);
  });

  it("accepts evidence readiness metadata fields when the fingerprint is valid", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs ?"
    );

    const enriched = structuredClone(result.proofpack);
    Object.assign(enriched.evidence[0]!, {
      fileName: "mfa-admin-policy-redacted.pdf",
      fileUri: "local://evidence/mfa-admin-policy-redacted.pdf",
      documentHash: "sha256:7c3f2b6e0f0f4f5f4b8a65f5b5d6e2c8e7f2d1a0c9b8a7e6d5c4b3a291807f6e",
      sourceSystem: "IAM",
      owner: "RSSI",
      observedAt: "2026-07-08T09:00:00.000Z",
      expiresAt: "2027-07-08T09:00:00.000Z",
      coveredScope: "Comptes administrateurs production",
      validator: "Responsable sécurité",
      validatedAt: "2026-07-09T14:00:00.000Z",
      controlResult: "Politique déclarée active, exceptions nominatives non exportées",
      version: "2026.07",
      history: ["2026-07-08: fiche déclarée disponible"],
    });
    await refreshFingerprint(enriched);

    const verification = await verifyProofPackJson(JSON.stringify(enriched));

    expect(verification.isValid).toBe(true);
    expect(verification.validSchema).toBe(true);
  });

  it("rejects semantic readiness and evidence invariant violations", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs ?"
    );
    const invalid = structuredClone(result.proofpack);
    Object.assign(invalid.questions[0]!, {
      answerText: "",
      answerReservation: "",
      answerExportStatus: "ready",
    });
    Object.assign(invalid.evidence[0]!, {
      status: "available",
      expiresAt: "2000-01-01T00:00:00.000Z",
      validator: "Responsable sécurité",
    });
    invalid.summary.evidenceCoverageScore = 0;
    invalid.summary.evidenceQualityFreshnessScore = 0;
    await refreshFingerprint(invalid);

    const verification = await verifyProofPackJson(JSON.stringify(invalid));

    expect(verification.isValid).toBe(false);
    expect(verification.validSchema).toBe(true);
    expect(verification.validFingerprint).toBe(true);
    expect(verification.validSummary).toBe(true);
    expect(verification.validInvariants).toBe(false);
    expect(verification.findings.map((item) => item.code)).toEqual(expect.arrayContaining([
      "READY_ANSWER_EMPTY",
      "AVAILABLE_EVIDENCE_UNREFERENCED",
      "EVIDENCE_VALIDATION_INCOMPLETE",
    ]));
  });

  it("keeps historical verification stable after evidence expires", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs ?"
    );
    const proofpack = structuredClone(result.proofpack);
    proofpack.generatedAt = "2026-07-10T10:00:00.000Z";
    Object.assign(proofpack.evidence[0]!, {
      status: "available",
      sourceSystem: "IAM",
      expiresAt: "2026-07-11T10:00:00.000Z",
    });
    Object.assign(
      proofpack.summary,
      calculateProofDebtIndicators(proofpack.questions, proofpack.evidence, Date.parse(proofpack.generatedAt))
    );
    await refreshFingerprint(proofpack);

    const verification = await verifyProofPackJson(JSON.stringify(proofpack));

    expect(verification.isValid).toBe(true);
    expect(verification.historicalIntegrity).toBe(true);
    expect(verification.coherenceAt).toBe(proofpack.generatedAt);
    expect(verification.currentFreshness.isFresh).toBe(false);
    expect(verification.currentFreshness.expiredEvidenceIds).toContain(proofpack.evidence[0]!.id);
    expect(verification.findings.some((item) => item.code === "CURRENT_EVIDENCE_EXPIRED")).toBe(true);
  });

  it("treats explicitly expired evidence as a business warning, not a format error", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Disposez-vous d'une procédure de sauvegarde documentée ?"
    );
    const proofpack = structuredClone(result.proofpack);
    proofpack.evidence[0]!.status = "expired";
    Object.assign(
      proofpack.summary,
      calculateProofDebtIndicators(proofpack.questions, proofpack.evidence, Date.parse(proofpack.generatedAt))
    );
    await refreshFingerprint(proofpack);

    const verification = await verifyProofPackJson(JSON.stringify(proofpack));

    expect(verification.isValid).toBe(true);
    expect(verification.validSchema).toBe(true);
    expect(verification.validInvariants).toBe(true);
    expect(verification.findings.some((item) =>
      item.code === "EVIDENCE_MARKED_EXPIRED" && item.severity === "warning"
    )).toBe(true);
  });

  it("rejects additional properties even with recomputed fingerprint", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous une procédure de gestion des accès ?"
    );

    const tampered = structuredClone(result.proofpack);
    (tampered as any).issuer = "Northstar SaaS";
    await refreshFingerprint(tampered);

    const verification = await verifyProofPackJson(JSON.stringify(tampered));

    expect(verification.isValid).toBe(false);
    expect(verification.validSchema).toBe(false);
    expect(verification.findings.some((finding) => finding.code === "SCHEMA_ADDITIONAL_PROPERTY")).toBe(true);
  });

  it("rejects invalid date-time fields even with recomputed fingerprint", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous documenté le plan de continuité ?"
    );

    const tampered = structuredClone(result.proofpack);
    tampered.generatedAt = "hier";
    await refreshFingerprint(tampered);

    const verification = await verifyProofPackJson(JSON.stringify(tampered));

    expect(verification.isValid).toBe(false);
    expect(verification.validSchema).toBe(false);
    expect(verification.findings.some((finding) => finding.code === "SCHEMA_INVALID_FORMAT")).toBe(true);
  });

  it("rejects obsolete method versions even with recomputed fingerprint", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous une politique de sauvegarde ?"
    );

    const tampered = structuredClone(result.proofpack);
    tampered.methodVersion = "blackproof-method-v0.0.0";
    await refreshFingerprint(tampered);

    const verification = await verifyProofPackJson(JSON.stringify(tampered));

    expect(verification.isValid).toBe(false);
    expect(verification.validSchema).toBe(false);
    expect(verification.findings.some((finding) => finding.code === "SCHEMA_CONST_MISMATCH")).toBe(true);
  });

  it("rejects non-integer summary numbers even with recomputed fingerprint", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Journalisez-vous les accès administrateurs ?"
    );

    const tampered = structuredClone(result.proofpack);
    tampered.summary.questionCount = 1.5;
    await refreshFingerprint(tampered);

    const verification = await verifyProofPackJson(JSON.stringify(tampered));

    expect(verification.isValid).toBe(false);
    expect(verification.validSchema).toBe(false);
    expect(verification.findings.some((finding) => finding.code === "SCHEMA_INVALID_TYPE")).toBe(true);
  });

  it("rejects evidence missing schema-required fields even with recomputed fingerprint", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous une procédure de réponse à incident ?"
    );

    const tampered = structuredClone(result.proofpack);
    delete (tampered.evidence[0] as any).recommendedFormat;
    await refreshFingerprint(tampered);

    const verification = await verifyProofPackJson(JSON.stringify(tampered));

    expect(verification.isValid).toBe(false);
    expect(verification.validSchema).toBe(false);
    expect(verification.findings.some((finding) => finding.code === "SCHEMA_REQUIRED_PROPERTY")).toBe(true);
  });

  it("rejects debts missing questionId even with recomputed fingerprint", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous un registre des fournisseurs critiques ?"
    );

    const tampered = structuredClone(result.proofpack);
    delete (tampered.debts[0] as any).questionId;
    await refreshFingerprint(tampered);

    const verification = await verifyProofPackJson(JSON.stringify(tampered));

    expect(verification.isValid).toBe(false);
    expect(verification.validSchema).toBe(false);
    expect(verification.findings.some((finding) => finding.code === "SCHEMA_REQUIRED_PROPERTY")).toBe(true);
  });

  it("invalidates links when a question references unknown evidence", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé la journalisation de sécurité ?"
    );

    const tampered = structuredClone(result.proofpack);
    tampered.questions[0]!.evidenceIds = ["evidence_missing"];
    await refreshFingerprint(tampered);

    const verification = await verifyProofPackJson(JSON.stringify(tampered));

    expect(verification.isValid).toBe(false);
    expect(verification.validSchema).toBe(true);
    expect(verification.validLinks).toBe(false);
    expect(verification.findings.some((finding) => finding.code === "QUESTION_UNKNOWN_EVIDENCE")).toBe(true);
  });

  it("rejects a question pointing to evidence owned by another question", async () => {
    const result = await createProofCaseFromQuestionnaire("1. Question A ?\n2. Question B ?");
    const tampered = structuredClone(result.proofpack);
    const foreignEvidence = tampered.evidence.find((item) => item.questionId === tampered.questions[0]!.id)!;
    tampered.questions[1]!.evidenceIds.push(foreignEvidence.id);
    await refreshFingerprint(tampered);

    const verification = await verifyProofPackJson(JSON.stringify(tampered));
    expect(verification.validFingerprint).toBe(true);
    expect(verification.validLinks).toBe(false);
    expect(verification.findings.some((item) => item.code === "QUESTION_EVIDENCE_PARENT_MISMATCH")).toBe(true);
  });

  it("rejects evidence not listed exactly once by its parent question", async () => {
    const result = await createProofCaseFromQuestionnaire("1. Question A ?");
    const tampered = structuredClone(result.proofpack);
    const evidence = tampered.evidence[0]!;
    tampered.questions[0]!.evidenceIds = tampered.questions[0]!.evidenceIds.filter((id) => id !== evidence.id);
    await refreshFingerprint(tampered);

    const verification = await verifyProofPackJson(JSON.stringify(tampered));
    expect(verification.validLinks).toBe(false);
    expect(verification.findings.some((item) => item.code === "EVIDENCE_PARENT_BACKLINK_INVALID")).toBe(true);
  });
});
