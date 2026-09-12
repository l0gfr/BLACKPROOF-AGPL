import type { ErrorObject } from "ajv";
import type { VerificationFinding } from "./verify";
import validateProofPackDeliverySchema from "./generated/delivery-validator.js";
import validateProofPackDeliveryV4Schema from "./generated/delivery-v4-validator.js";
import { SECURITY_LIMITS, SecurityValidationError, sha256Hex, stableStringify } from "./security";
import { DELIVERY_FORMAT_VERSION } from "./delivery";

export interface VerifyProofPackDeliveryResult {
  kind: "delivery-json";
  isValid: boolean;
  validSchema: boolean;
  validFingerprint: boolean;
  validLinks: boolean;
  validInvariants: boolean;
  providedFingerprint?: string;
  expectedFingerprint?: string;
  deliveryId?: string;
  caseId?: string;
  caseTitle?: string;
  generatedAt?: string;
  findings: VerificationFinding[];
}

type VerifiedDeliveryEvidence = {
  id: string;
  disclosure: string;
  publicReference?: string;
};

type VerifiedDeliveryQuestion = {
  id: string;
  answer: string;
  evidence: VerifiedDeliveryEvidence[];
};

type VerifiedDelivery = {
  formatVersion: string;
  fingerprint: string;
  deliveryId?: string;
  case: { id: string; title: string };
  generatedAt: string;
  questions: VerifiedDeliveryQuestion[];
};

const categories = new Set(["access-control", "backup", "incident-response", "business-continuity", "supplier-security", "governance", "logging-monitoring", "vulnerability-management", "data-protection", "unknown"]);
const criticalities = new Set(["low", "medium", "high", "critical"]);
const fingerprintPattern = /^bp_sha256_[a-f0-9]{64}$/;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown) => typeof value === "string" && value.trim().length > 0;
const finding = (code: string, message: string, pointer: string): VerificationFinding => ({ code, message, pointer, severity: "error" });

function exactFields(value: Record<string, unknown>, allowed: string[], required: string[], pointer: string, findings: VerificationFinding[]): boolean {
  let ok = true;
  for (const key of Object.keys(value)) if (!allowed.includes(key)) { findings.push(finding("DELIVERY_SCHEMA_ADDITIONAL_FIELD", `Unexpected field: ${key}.`, `${pointer}/${key}`)); ok = false; }
  for (const key of required) if (!(key in value)) { findings.push(finding("DELIVERY_SCHEMA_REQUIRED_FIELD", `Missing field: ${key}.`, `${pointer}/${key}`)); ok = false; }
  return ok;
}

function deliverySchemaErrorCode(error: ErrorObject): string {
  if (error.keyword === "additionalProperties") return "DELIVERY_SCHEMA_ADDITIONAL_FIELD";
  if (error.keyword === "const") return "DELIVERY_SCHEMA_CONST_MISMATCH";
  if (error.keyword === "enum") return "DELIVERY_SCHEMA_INVALID_ENUM";
  if (error.keyword === "format") return "DELIVERY_SCHEMA_INVALID_FORMAT";
  if (error.keyword === "pattern") return "DELIVERY_SCHEMA_PATTERN_MISMATCH";
  if (error.keyword === "required") return "DELIVERY_SCHEMA_REQUIRED_FIELD";
  if (error.keyword === "type") return "DELIVERY_SCHEMA_INVALID_TYPE";
  return "DELIVERY_SCHEMA_INVALID";
}

function deliverySchemaErrorPointer(error: ErrorObject): string {
  if (error.keyword === "required" && "missingProperty" in error.params) {
    return `${error.instancePath}/${String(error.params.missingProperty)}`.replace(/\/+/g, "/");
  }
  if (error.keyword === "additionalProperties" && "additionalProperty" in error.params) {
    return `${error.instancePath}/${String(error.params.additionalProperty)}`.replace(/\/+/g, "/");
  }
  return error.instancePath || "/";
}

function validateCurrentDeliverySchema(value: unknown, findings: VerificationFinding[]): value is VerifiedDelivery {
  const valid = validateProofPackDeliverySchema(value);
  if (valid) return true;

  for (const error of validateProofPackDeliverySchema.errors ?? []) {
    findings.push(finding(
      deliverySchemaErrorCode(error),
      `Delivery schema violation: ${error.message ?? error.keyword}.`,
      deliverySchemaErrorPointer(error)
    ));
  }
  return false;
}

function validateV4DeliverySchema(value: unknown, findings: VerificationFinding[]): value is VerifiedDelivery {
  const valid = validateProofPackDeliveryV4Schema(value);
  if (valid) return true;

  for (const error of validateProofPackDeliveryV4Schema.errors ?? []) {
    findings.push(finding(
      deliverySchemaErrorCode(error),
      `Delivery V4 schema violation: ${error.message ?? error.keyword}.`,
      deliverySchemaErrorPointer(error)
    ));
  }
  return false;
}

function validateLegacyDelivery(value: unknown, findings: VerificationFinding[]): value is VerifiedDelivery {
  if (!isRecord(value)) { findings.push(finding("DELIVERY_SCHEMA_INVALID", "delivery.json must contain an object.", "/")); return false; }
  const isLegacyV1 = value.formatVersion === "blackproof-proofpack-delivery-v1";
  const isLegacyV2 = value.formatVersion === "blackproof-proofpack-delivery-v2";
  const isV3 = value.formatVersion === "blackproof-proofpack-delivery-v3";
  const allowedRootFields = isV3
    ? ["product", "formatVersion", "deliveryId", "case", "questions", "generatedAt", "fingerprint"]
    : ["product", "formatVersion", "case", "questions", "generatedAt", "sourceMasterFingerprint", "fingerprint"];
  const requiresPublicReference = isLegacyV2 || isV3;
  const checks = [
    exactFields(value, allowedRootFields, allowedRootFields, "", findings),
    value.product === "BLACKPROOF" && (isLegacyV1 || isLegacyV2 || isV3),
    text(value.generatedAt) && !Number.isNaN(Date.parse(String(value.generatedAt))),
    !((isLegacyV1 || isLegacyV2) && !fingerprintPattern.test(String(value.sourceMasterFingerprint)))
      && fingerprintPattern.test(String(value.fingerprint)),
    !isV3 || /^delivery_[a-f0-9]{32}$/.test(String(value.deliveryId)),
  ];
  if (!isRecord(value.case)) { findings.push(finding("DELIVERY_CASE_INVALID", "Delivery case is invalid.", "/case")); checks.push(false); }
  else {
    checks.push(exactFields(value.case, ["id", "title", "framework"], ["id", "title", "framework"], "/case", findings));
    checks.push([value.case.id, value.case.title, value.case.framework].every(text));
  }
  if (!Array.isArray(value.questions) || value.questions.length === 0) { findings.push(finding("DELIVERY_QUESTIONS_INVALID", "Delivery must contain at least one question.", "/questions")); return false; }
  for (const [qi, question] of value.questions.entries()) {
    const pointer = `/questions/${qi}`;
    if (!isRecord(question)) { checks.push(false); continue; }
    checks.push(exactFields(question, ["id", "text", "category", "criticality", "answer", "reservation", "evidence"], ["id", "text", "category", "criticality", "answer", "evidence"], pointer, findings));
    checks.push([question.id, question.text, question.answer].every(text)
      && categories.has(String(question.category)) && criticalities.has(String(question.criticality)));
    checks.push(!("reservation" in question) || text(question.reservation));
    if (!Array.isArray(question.evidence)) { checks.push(false); continue; }
    for (const [ei, evidence] of question.evidence.entries()) {
      if (!isRecord(evidence)) { checks.push(false); continue; }
      const fields = requiresPublicReference
        ? ["id", "title", "category", "disclosure", "publicReference"]
        : ["id", "title", "category", "disclosure"];
      checks.push(exactFields(evidence, fields, fields, `${pointer}/evidence/${ei}`, findings));
      checks.push([evidence.id, evidence.title].every(text)
        && (!requiresPublicReference || (text(evidence.publicReference) && String(evidence.publicReference).length <= SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS))
        && categories.has(String(evidence.category)) && evidence.disclosure === "reference-only");
    }
  }
  const ok = checks.every(Boolean);
  if (!ok && !findings.some((item) => item.code === "DELIVERY_SCHEMA_INVALID")) findings.push(finding("DELIVERY_SCHEMA_INVALID", "delivery.json violates the Delivery schema.", "/"));
  return ok;
}

function validateDelivery(value: unknown, findings: VerificationFinding[]): value is VerifiedDelivery {
  if (isRecord(value) && value.formatVersion === DELIVERY_FORMAT_VERSION) {
    return validateCurrentDeliverySchema(value, findings);
  }
  if (isRecord(value) && value.formatVersion === "blackproof-proofpack-delivery-v4") {
    return validateV4DeliverySchema(value, findings);
  }
  return validateLegacyDelivery(value, findings);
}

export async function verifyProofPackDeliveryJson(input: unknown): Promise<VerifyProofPackDeliveryResult> {
  if (typeof input !== "string") throw new SecurityValidationError("INVALID_TYPE", "Delivery JSON input must be a string.");
  if (input.length > SECURITY_LIMITS.MAX_PROOFPACK_JSON_CHARS) throw new SecurityValidationError("PROOFPACK_TOO_LARGE", "Delivery JSON exceeds the local size limit.");
  const findings: VerificationFinding[] = [];
  let parsed: unknown;
  try { parsed = JSON.parse(input); } catch { return { kind: "delivery-json", isValid: false, validSchema: false, validFingerprint: false, validLinks: false, validInvariants: false, findings: [finding("DELIVERY_INVALID_JSON", "The provided file is not valid JSON.", "/")] }; }
  if (!validateDelivery(parsed, findings)) return { kind: "delivery-json", isValid: false, validSchema: false, validFingerprint: false, validLinks: false, validInvariants: false, findings };
  const delivery = parsed;
  const { fingerprint, ...base } = delivery;
  const expectedFingerprint = `bp_sha256_${await sha256Hex(stableStringify(base))}`;
  const validFingerprint = fingerprint === expectedFingerprint;
  if (!validFingerprint) findings.push(finding("DELIVERY_FINGERPRINT_MISMATCH", "Delivery fingerprint does not match its content.", "/fingerprint"));
  const questionIds = new Set<string>();
  const evidenceIds = new Set<string>();
  let validLinks = true;
  for (const [qi, question] of delivery.questions.entries()) {
    if (questionIds.has(question.id)) { findings.push(finding("DELIVERY_DUPLICATE_QUESTION_ID", `Duplicate question id: ${question.id}.`, `/questions/${qi}/id`)); validLinks = false; }
    questionIds.add(question.id);
    for (const [ei, evidence] of question.evidence.entries()) {
      if (evidenceIds.has(evidence.id)) { findings.push(finding("DELIVERY_DUPLICATE_EVIDENCE_ID", `Duplicate evidence id: ${evidence.id}.`, `/questions/${qi}/evidence/${ei}/id`)); validLinks = false; }
      evidenceIds.add(evidence.id);
    }
  }
  const validInvariants = delivery.questions.every((question) => question.answer.trim().length > 0 && question.evidence.every((item) =>
    item.disclosure === "reference-only"
    && (delivery.formatVersion === "blackproof-proofpack-delivery-v1" || Boolean(item.publicReference?.trim()))
  ));
  const isValid = validFingerprint && validLinks && validInvariants;
  if (isValid) findings.unshift({ code: "PROOFPACK_DELIVERY_VALID", severity: "info", message: "Delivery schema, fingerprint, links and invariants verified locally.", pointer: "/" });
  return { kind: "delivery-json", isValid, validSchema: true, validFingerprint, validLinks, validInvariants, providedFingerprint: fingerprint, expectedFingerprint, deliveryId: delivery.deliveryId, caseId: delivery.case.id, caseTitle: delivery.case.title, generatedAt: delivery.generatedAt, findings };
}
