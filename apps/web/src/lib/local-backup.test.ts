import { describe, expect, it } from "vitest";
import historicalDeliveryV4 from "../../../../packages/core/src/fixtures/proofpack-delivery-v4-historical.json";
import { createProofCaseFromQuestionnaire, sha256Hex, stableStringify } from "@blackproof/core";

import { assertLocalBackupDeliverySnapshot } from "./local-backup";

describe("local backup Delivery compatibility", () => {
  it("accepts a historical V4 snapshot before backup", async () => {
    const result = await createProofCaseFromQuestionnaire("1. Le MFA est-il activé pour les administrateurs ?");
    const deliveryJson = JSON.stringify(historicalDeliveryV4, null, 2);
    const receipt = {
      deliveryId: historicalDeliveryV4.deliveryId,
      fingerprint: historicalDeliveryV4.fingerprint,
      generatedAt: historicalDeliveryV4.generatedAt,
      selectedQuestionIds: [result.questions[0]!.id],
      selectedEvidenceIds: [result.evidence[0]!.id],
      questionMappings: [{ masterQuestionId: result.questions[0]!.id, deliveryQuestionId: historicalDeliveryV4.questions[0]!.id }],
      evidenceMappings: [{ masterEvidenceId: result.evidence[0]!.id, deliveryEvidenceId: historicalDeliveryV4.questions[0]!.evidence[0]!.id }],
      snapshotSha256: await sha256Hex(deliveryJson),
      filename: `blackproof-delivery-${historicalDeliveryV4.deliveryId}.json`,
      status: "generated" as const,
    };
    const proofpack = structuredClone(result.proofpack);
    proofpack.deliveryHistory = [receipt];
    const { fingerprint: _old, ...base } = proofpack;
    proofpack.fingerprint = `bp_sha256_${await sha256Hex(stableStringify(base))}`;

    await expect(assertLocalBackupDeliverySnapshot(proofpack, receipt, deliveryJson)).resolves.toBeUndefined();
  });
});
