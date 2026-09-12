import type { ValidateFunction } from "ajv";
import type { ProofPackDelivery } from "../types";

declare const validateProofPackDeliverySchema: ValidateFunction<ProofPackDelivery>;

export default validateProofPackDeliverySchema;
