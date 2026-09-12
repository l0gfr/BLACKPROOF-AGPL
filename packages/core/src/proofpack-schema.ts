import proofpackV1SchemaJson from "../schemas/proofpack-v1.schema.json" with { type: "json" };
import proofpackV2SchemaJson from "../schemas/proofpack-v2.schema.json" with { type: "json" };
import proofpackV3SchemaJson from "../schemas/proofpack-v3.schema.json" with { type: "json" };

import {
  PROOFPACK_V1_SCHEMA_URL,
  PROOFPACK_V2_SCHEMA_URL,
  PROOFPACK_V3_SCHEMA_URL,
} from "./proofpack";

export const PROOFPACK_V1_SCHEMA_SHA256 = "c6c1d162abc0aada780df954338989999596461727e770d475d81ba2a3813d26" as const;
export const PROOFPACK_V2_SCHEMA_SHA256 = "4edb89244670fca5624bda95d93e617bfd34a92c9981bfba5ace1d6f83f4bdb2" as const;
export const PROOFPACK_V3_SCHEMA_SHA256 = "7bd8cfb8bcfb5cb1cbd5ddf8f9b157aa1c6dc71503916239a76b80b8691b2c6c" as const;

export const proofpackV1Schema = proofpackV1SchemaJson;
export const proofpackV2Schema = proofpackV2SchemaJson;
export const proofpackV3Schema = proofpackV3SchemaJson;

/**
 * Discovery-only union. It deliberately has no $id because its public route
 * returns an API envelope rather than this schema at the document root.
 */
export const proofpackSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  title: "BLACKPROOF ProofPack discovery union",
  description: "Union exacte des contrats ProofPack immuables publiés par BLACKPROOF.",
  oneOf: [
    { "$ref": PROOFPACK_V1_SCHEMA_URL },
    { "$ref": PROOFPACK_V2_SCHEMA_URL },
    { "$ref": PROOFPACK_V3_SCHEMA_URL },
  ],
} as const;
