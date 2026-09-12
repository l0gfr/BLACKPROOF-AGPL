import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import { createProofCaseFromQuestionnaire } from "./questionnaire";
import {
  PROOFPACK_V1_SCHEMA_SHA256,
  PROOFPACK_V2_SCHEMA_SHA256,
  PROOFPACK_V3_SCHEMA_SHA256,
  proofpackSchema,
  proofpackV1Schema,
  proofpackV2Schema,
  proofpackV3Schema,
} from "./proofpack-schema";
import { sha256Hex } from "./security";

function ajv() {
  const instance = new Ajv2020({ allErrors: true, strict: true });
  addFormats(instance);
  return instance;
}

function compileDiscoverySchema() {
  const instance = ajv();
  instance.addSchema(proofpackV1Schema);
  instance.addSchema(proofpackV2Schema);
  instance.addSchema(proofpackV3Schema);
  return instance.compile(proofpackSchema);
}

describe("versioned ProofPack schemas", () => {
  it("pins every immutable schema to its published bytes", async () => {
    const { readFileSync } = (globalThis as any).process.getBuiltinModule("node:fs");
    const schemas = [
      ["schemas/proofpack-v1.schema.json", PROOFPACK_V1_SCHEMA_SHA256],
      ["schemas/proofpack-v2.schema.json", PROOFPACK_V2_SCHEMA_SHA256],
      ["schemas/proofpack-v3.schema.json", PROOFPACK_V3_SCHEMA_SHA256],
    ] as const;

    for (const [path, expectedSha256] of schemas) {
      expect(await sha256Hex(readFileSync(path)), path).toBe(expectedSha256);
    }
  });

  it("defines discovery as the exact V1, V2 or V3 union without a misleading id", () => {
    expect(proofpackSchema).not.toHaveProperty("$id");
    expect(proofpackSchema.oneOf).toHaveLength(3);
  });

  it("accepts historical V1 and rejects impossible partial V2 states", async () => {
    const { proofpack } = await createProofCaseFromQuestionnaire("Question historique");
    const validateDiscovery = compileDiscoverySchema();
    const historical = structuredClone(proofpack) as any;
    delete historical.formatVersion;
    delete historical.schemaVersion;
    delete historical.sourceQuestionnaire.canonicalizationVersion;

    expect(validateDiscovery(historical)).toBe(true);

    const formatOnly = structuredClone(proofpack) as any;
    formatOnly.formatVersion = "blackproof-proofpack-v2";
    delete formatOnly.schemaVersion;
    expect(validateDiscovery(formatOnly)).toBe(false);

    const schemaOnly = structuredClone(proofpack) as any;
    delete schemaOnly.formatVersion;
    schemaOnly.schemaVersion = "blackproof-proofpack-schema-v2";
    expect(validateDiscovery(schemaOnly)).toBe(false);

    const v2WithoutCanonicalization = structuredClone(proofpack) as any;
    v2WithoutCanonicalization.formatVersion = "blackproof-proofpack-v2";
    v2WithoutCanonicalization.schemaVersion = "blackproof-proofpack-schema-v2";
    delete v2WithoutCanonicalization.sourceQuestionnaire.canonicalizationVersion;
    expect(validateDiscovery(v2WithoutCanonicalization)).toBe(false);
  });

  it("preserves published V2 while requiring revision and history in V3", async () => {
    const { proofpack } = await createProofCaseFromQuestionnaire("Question courante");
    const validateV2 = ajv().compile(proofpackV2Schema);
    const validateV3 = ajv().compile(proofpackV3Schema);
    const v2 = structuredClone(proofpack) as any;
    v2.formatVersion = "blackproof-proofpack-v2";
    v2.schemaVersion = "blackproof-proofpack-schema-v2";
    delete v2.revisionId;
    delete v2.deliveryHistory;

    expect(validateV2(v2)).toBe(true);
    expect(validateV3(proofpack)).toBe(true);

    const missingRevision = structuredClone(proofpack) as any;
    delete missingRevision.revisionId;
    expect(validateV3(missingRevision)).toBe(false);

    const missingHistory = structuredClone(proofpack) as any;
    delete missingHistory.deliveryHistory;
    expect(validateV3(missingHistory)).toBe(false);
  });
});
