import type { ValidateFunction } from "ajv";
import type { ProofPack } from "../types";

declare const validateProofPackSchema: ValidateFunction<ProofPack>;

export default validateProofPackSchema;
