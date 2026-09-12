import proofPackDeliveryV4SchemaJson from "../schemas/proofpack-delivery-v4.schema.json" with { type: "json" };
import proofPackDeliveryV5SchemaJson from "../schemas/proofpack-delivery-v5.schema.json" with { type: "json" };

export const DELIVERY_V4_SCHEMA_SHA256 = "dd96ff1ba81b8fcd6650beb74ffa6f1579b42f997349378200734bbdbe24f97e" as const;
export const DELIVERY_V5_SCHEMA_SHA256 = "a4a6b424e0d960c95020cd0b6c43b5bfe4dff8ac43f9147a2720c90d1d123234" as const;
export const proofPackDeliveryV4Schema = proofPackDeliveryV4SchemaJson;
export const proofPackDeliveryV5Schema = proofPackDeliveryV5SchemaJson;
export const proofPackDeliverySchema = proofPackDeliveryV5SchemaJson;
