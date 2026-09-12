import { describe, expect, it } from "vitest";

import {
  DeliveryValidationError,
  buildProofPack,
  buildProofPackDelivery,
  buildProofPackDeliveryManifest,
  buildProofPackDeliveryZipFiles,
  confirmProofPackDeliveryPreview,
  createProofCaseFromQuestionnaire,
  exportProofPackDeliveryJson,
} from "./index";

async function buildMasterFixture() {
  const result = await createProofCaseFromQuestionnaire([
    "1. Le MFA est-il activé ?",
    "2. Comment traitez-vous les incidents ?",
    "3. Quel est votre plan secret ?",
    "4. Avez-vous un brouillon ?",
  ].join("\n"));
  const ready = result.questions[0]!;
  const reserved = result.questions[1]!;
  const blocked = result.questions[2]!;
  const draft = result.questions[3]!;

  ready.answerText = "Le MFA est activé pour les administrateurs.";
  ready.answerExportStatus = "ready";
  reserved.answerText = "La procédure est testée annuellement.";
  reserved.answerReservation = "Le dernier exercice reste en cours de validation.";
  reserved.answerExportStatus = "reserved";
  blocked.answerText = "SECRET_ANSWER_MUST_NOT_LEAVE";
  blocked.answerReservation = "SECRET_RESERVATION_MUST_NOT_LEAVE";
  blocked.answerExportStatus = "do-not-export";
  draft.answerText = "DRAFT_ANSWER_MUST_NOT_LEAVE";
  draft.suggestedAnswer = "AUTOMATIC_SUGGESTION_MUST_NOT_LEAVE";
  draft.answerExportStatus = "draft";

  const publishable = result.evidence.find((item) => item.questionId === ready.id)!;
  publishable.status = "available";
  publishable.sensitivity = "confidential";
  publishable.exportMode = "reference-only";
  publishable.referenceType = "file";
  publishable.referenceId = "audit-report-2026";
  publishable.publicReference = "Rapport d’audit externe 2026 — consultable sous NDA";
  publishable.fileName = "SECRET_FILENAME.pdf";
  publishable.fileUri = "local://SECRET_PATH";
  publishable.documentHash = "SECRET_DOCUMENT_HASH";
  publishable.sourceSystem = "SECRET_SOURCE_SYSTEM";
  publishable.owner = "SECRET_OWNER";
  publishable.observedAt = "2026-07-01T10:00:00.000Z";
  publishable.validator = "SECRET_VALIDATOR";
  publishable.controlResult = "SECRET_CONTROL_RESULT";
  publishable.history = ["SECRET_HISTORY"];

  const nonExportable = result.evidence.find((item) => item.questionId === blocked.id)!;
  nonExportable.status = "not-exportable";
  nonExportable.sensitivity = "secret";
  nonExportable.fileUri = "local://TOP_SECRET_PATH";

  const master = await buildProofPack(
    result.case,
    result.questions,
    result.evidence,
    result.debts,
    { sourceQuestionnaire: result.proofpack.sourceQuestionnaire }
  );

  return { master, ready, reserved, blocked, draft, publishable, nonExportable };
}

describe("ProofPack Delivery whitelist", () => {
  it("exports only explicitly selected validated answers and minimal evidence references", async () => {
    const fixture = await buildMasterFixture();
    const delivery = await buildProofPackDelivery(fixture.master, {
      questionIds: [fixture.ready.id, fixture.reserved.id],
      evidenceIds: [fixture.publishable.id],
      confirmed: true,
    });
    const payload = [
      exportProofPackDeliveryJson(delivery),
      JSON.stringify(await buildProofPackDeliveryManifest(delivery)),
      ...buildProofPackDeliveryZipFiles(delivery).map((file) => file.content),
    ].join("\n");

    expect(delivery.deliveryId).toMatch(/^delivery_[a-f0-9]{32}$/);
    expect(delivery.methodVersion).toBe(fixture.master.methodVersion);
    expect(delivery.schemaVersion).toBe("blackproof-proofpack-delivery-schema-v5");
    expect(delivery.schemaUrl).toBe("https://blackproof.fr/schemas/proofpack-delivery/v5.schema.json");
    expect(delivery.verificationProfile.doesNotVerify).toContain("issuer-identity");
    expect(delivery.questions.map((question) => question.id)).not.toContain(fixture.ready.id);
    expect(delivery.questions.map((question) => question.id)).not.toContain(fixture.reserved.id);
    expect(delivery.questions.flatMap((question) => question.evidence.map((item) => item.id))).not.toContain(fixture.publishable.id);
    expect(payload).not.toContain(fixture.master.case.id);
    expect(payload).not.toContain(fixture.master.fingerprint);
    expect(payload).toContain(fixture.publishable.title);
    expect(payload).toContain("Rapport d’audit externe 2026 — consultable sous NDA");
    expect(payload).not.toContain("SECRET_ANSWER_MUST_NOT_LEAVE");
    expect(payload).not.toContain("SECRET_RESERVATION_MUST_NOT_LEAVE");
    expect(payload).not.toContain("DRAFT_ANSWER_MUST_NOT_LEAVE");
    expect(payload).not.toContain("AUTOMATIC_SUGGESTION_MUST_NOT_LEAVE");
    expect(payload).not.toContain("SECRET_FILENAME.pdf");
    expect(payload).not.toContain("local://SECRET_PATH");
    expect(payload).not.toContain("SECRET_DOCUMENT_HASH");
    expect(payload).not.toContain("SECRET_SOURCE_SYSTEM");
    expect(payload).not.toContain("SECRET_OWNER");
    expect(payload).not.toContain("SECRET_VALIDATOR");
    expect(payload).not.toContain("SECRET_CONTROL_RESULT");
    expect(payload).not.toContain("SECRET_HISTORY");
    expect(payload).not.toContain("plan-remediation");
    expect(payload).not.toContain("note-synthese");
  });

  it("generates unlinkable public identifiers for each transmission", async () => {
    const fixture = await buildMasterFixture();
    const review = { questionIds: [fixture.ready.id], evidenceIds: [fixture.publishable.id], confirmed: true };
    const first = await buildProofPackDelivery(fixture.master, review);
    const second = await buildProofPackDelivery(fixture.master, review);

    expect(second.deliveryId).not.toBe(first.deliveryId);
    expect(second.case.id).not.toBe(first.case.id);
    expect(second.questions[0]!.id).not.toBe(first.questions[0]!.id);
    expect(second.questions[0]!.evidence[0]!.id).not.toBe(first.questions[0]!.evidence[0]!.id);
  });

  it("refuses generation without explicit final confirmation", async () => {
    const fixture = await buildMasterFixture();
    await expect(buildProofPackDelivery(fixture.master, {
      questionIds: [fixture.ready.id],
      evidenceIds: [],
      confirmed: false,
    })).rejects.toBeInstanceOf(DeliveryValidationError);
  });

  it("binds final confirmation to the exact Delivery preview fingerprint", async () => {
    const fixture = await buildMasterFixture();
    const preview = await buildProofPackDelivery(fixture.master, {
      questionIds: [fixture.ready.id],
      evidenceIds: [],
      confirmed: true,
    });

    await expect(confirmProofPackDeliveryPreview(preview, preview.fingerprint)).resolves.toBe(preview);
    await expect(confirmProofPackDeliveryPreview(preview, "bp_sha256_stale_preview"))
      .rejects.toThrow("ne correspond plus à l’empreinte");
  });

  it("rejects confirmation and manifest generation after Delivery content mutation", async () => {
    const fixture = await buildMasterFixture();
    const preview = await buildProofPackDelivery(fixture.master, {
      questionIds: [fixture.ready.id],
      evidenceIds: [],
      confirmed: true,
    });
    const confirmedFingerprint = preview.fingerprint;
    preview.questions[0]!.answer = "Réponse modifiée après prévisualisation";

    await expect(confirmProofPackDeliveryPreview(preview, confirmedFingerprint))
      .rejects.toThrow("contenu ne correspond plus");
    await expect(buildProofPackDeliveryManifest(preview))
      .rejects.toThrow("contenu ne correspond plus");
  });

  it("refuses do-not-export, draft and not-exportable selections at engine level", async () => {
    const fixture = await buildMasterFixture();

    await expect(buildProofPackDelivery(fixture.master, {
      questionIds: [fixture.blocked.id],
      evidenceIds: [],
      confirmed: true,
    })).rejects.toThrow("n'est pas validée");

    await expect(buildProofPackDelivery(fixture.master, {
      questionIds: [fixture.draft.id],
      evidenceIds: [],
      confirmed: true,
    })).rejects.toThrow("n'est pas validée");

    const masterWithLinkedNonExportableEvidence = await buildProofPack(
      fixture.master.case,
      fixture.master.questions,
      fixture.master.evidence.map((item) => item.id === fixture.nonExportable.id
        ? { ...item, questionId: fixture.ready.id }
        : item),
      fixture.master.debts,
      { sourceQuestionnaire: fixture.master.sourceQuestionnaire }
    );
    await expect(buildProofPackDelivery(masterWithLinkedNonExportableEvidence, {
      questionIds: [fixture.ready.id],
      evidenceIds: [fixture.nonExportable.id],
      confirmed: true,
    })).rejects.toThrow("n'est pas publiable");
  });

  it("never substitutes an automatic suggestion for a validated answer", async () => {
    const fixture = await buildMasterFixture();
    fixture.ready.answerText = "";
    fixture.ready.suggestedAnswer = "AUTOMATIC_ONLY";
    const master = await buildProofPack(
      fixture.master.case,
      fixture.master.questions,
      fixture.master.evidence,
      fixture.master.debts,
      { sourceQuestionnaire: fixture.master.sourceQuestionnaire }
    );

    await expect(buildProofPackDelivery(master, {
      questionIds: [fixture.ready.id],
      evidenceIds: [],
      confirmed: true,
    })).rejects.toThrow("suggestion automatique");
  });

  it("keeps internal-only evidence out of Delivery", async () => {
    const fixture = await buildMasterFixture();
    const internalMaster = await buildProofPack(
      fixture.master.case,
      fixture.master.questions,
      fixture.master.evidence.map((item) => item.id === fixture.publishable.id
        ? { ...item, exportMode: "internal-only" as const }
        : item),
      fixture.master.debts,
      { sourceQuestionnaire: fixture.master.sourceQuestionnaire }
    );

    await expect(buildProofPackDelivery(internalMaster, {
      questionIds: [fixture.ready.id],
      evidenceIds: [fixture.publishable.id],
      confirmed: true,
    })).rejects.toThrow("n'est pas publiable");
  });

  it("never derives a public reference from internal evidence metadata", async () => {
    const fixture = await buildMasterFixture();
    const masterWithoutPublicReference = await buildProofPack(
      fixture.master.case,
      fixture.master.questions,
      fixture.master.evidence.map((item) => item.id === fixture.publishable.id
        ? { ...item, publicReference: undefined }
        : item),
      fixture.master.debts,
      { sourceQuestionnaire: fixture.master.sourceQuestionnaire }
    );

    await expect(buildProofPackDelivery(masterWithoutPublicReference, {
      questionIds: [fixture.ready.id],
      evidenceIds: [fixture.publishable.id],
      confirmed: true,
    })).rejects.toThrow("référence publique explicite");
  });

  it("rejects manually modified available evidence with an incomplete internal reference", async () => {
    const fixture = await buildMasterFixture();
    const incompleteMaster = await buildProofPack(
      fixture.master.case,
      fixture.master.questions,
      fixture.master.evidence.map((item) => item.id === fixture.publishable.id
        ? { ...item, referenceId: undefined }
        : item),
      fixture.master.debts,
      { sourceQuestionnaire: fixture.master.sourceQuestionnaire }
    );

    await expect(buildProofPackDelivery(incompleteMaster, {
      questionIds: [fixture.ready.id],
      evidenceIds: [fixture.publishable.id],
      confirmed: true,
    })).rejects.toThrow("n'est pas publiable");
  });
});
