import {
  METHOD_VERSION,
  PROOFPACK_COMPATIBILITY_SCHEMA_VERSION,
  PROOFPACK_FORMAT_VERSION,
  PROOFPACK_SCHEMA_VERSION,
  PROOFPACK_V1_SCHEMA_URL,
  PROOFPACK_V2_SCHEMA_URL,
  PROOFPACK_V3_SCHEMA_URL,
  PROOFPACK_V1_SCHEMA_SHA256,
  PROOFPACK_V2_SCHEMA_SHA256,
  PROOFPACK_V3_SCHEMA_SHA256,
  proofpackSchema,
} from "@blackproof/core";
import { apiEnvelope, jsonResponse } from "../../../lib/api-response";

export const prerender = true;

export function GET() {
  return jsonResponse(
    apiEnvelope("proofpack-schema", {
      version: PROOFPACK_COMPATIBILITY_SCHEMA_VERSION,
      contentType: "application/json",
      schemaMediaType: "application/schema+json",
      schema: proofpackSchema,
      currentMaster: {
        formatVersion: PROOFPACK_FORMAT_VERSION,
        schemaVersion: PROOFPACK_SCHEMA_VERSION,
        methodVersion: METHOD_VERSION,
      },
      compatibility: {
        missingCanonicalizationVersionMeans: "blackproof-questionnaire-canonicalization-v1",
        immutableSchemas: [
          { url: PROOFPACK_V1_SCHEMA_URL, sha256: PROOFPACK_V1_SCHEMA_SHA256 },
          { url: PROOFPACK_V2_SCHEMA_URL, sha256: PROOFPACK_V2_SCHEMA_SHA256 },
          { url: PROOFPACK_V3_SCHEMA_URL, sha256: PROOFPACK_V3_SCHEMA_SHA256 },
        ],
      },
      verificationUrl: "/api/verify.json",
    })
  );
}
