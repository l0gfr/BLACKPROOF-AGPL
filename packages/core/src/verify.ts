import type { ErrorObject } from "ajv";

import type { DeliveryHistoryEntry, ProofPack, QuestionnaireCanonicalizationVersion } from "./types";
import { hasEvidenceSource } from "./evidence-reference";

import { calculateProofDebtIndicators, calculateProofDebtScore } from "./proofdebt";
import { verifyProofPackDeliveryJson } from "./verify-delivery";
import {
  SECURITY_LIMITS,
  SecurityValidationError,
  canonicalizeQuestionnaireInput,
  findQuestionnaireInvisibleFormatCharacters,
  resolveQuestionnaireCanonicalizationVersion,
  sha256Hex,
  stableStringify,
} from "./security";

export type VerificationFindingSeverity = "info" | "warning" | "error";

export interface VerificationFinding {
  code: string;
  severity: VerificationFindingSeverity;
  message: string;
  pointer?: string;
}
export interface VerifyProofPackResult {
  isValid: boolean;
  validSchema: boolean;
  validFingerprint: boolean;
  validSummary: boolean;
  validLinks: boolean;
  validInvariants: boolean;
  validDeliveryHistory: boolean;
  historicalIntegrity: boolean;
  coherenceAt?: string;
  currentFreshness: {
    checkedAt: string;
    expiredEvidenceCount: number;
    expiredEvidenceIds: string[];
    isFresh: boolean;
  };
  providedFingerprint?: string;
  expectedFingerprint?: string;
  methodVersion?: string;
  formatVersion?: string;
  schemaVersion?: string;
  canonicalizationVersion?: QuestionnaireCanonicalizationVersion;
  generatedAt?: string;
  caseTitle?: string;
  caseId?: string;
  findings: VerificationFinding[];
}

export interface VerifyQuestionnaireSourceBindingResult {
  isValid: boolean;
  validHash: boolean;
  validSize: boolean;
  canonicalizationVersion: QuestionnaireCanonicalizationVersion;
  expectedSha256?: string;
  actualSha256: string;
  expectedSize?: number;
  actualSize: number;
  canonicalQuestionnaire: string;
  invisibleFormatCharacterCount: number;
}

export async function verifyQuestionnaireSourceBinding(
  questionnaire: string,
  proofpack: Pick<ProofPack, "sourceQuestionnaire">
): Promise<VerifyQuestionnaireSourceBindingResult> {
  const canonicalizationVersion = resolveQuestionnaireCanonicalizationVersion(
    proofpack.sourceQuestionnaire.canonicalizationVersion
  );
  const canonicalQuestionnaire = canonicalizeQuestionnaireInput(questionnaire, canonicalizationVersion);
  const actualSha256 = `sha256:${await sha256Hex(canonicalQuestionnaire)}`;
  const expectedSha256 = proofpack.sourceQuestionnaire.normalizedQuestionnaireSha256
    ?? proofpack.sourceQuestionnaire.sha256;
  const expectedSize = proofpack.sourceQuestionnaire.size;
  const actualSize = new TextEncoder().encode(canonicalQuestionnaire).length;
  const validHash = typeof expectedSha256 === "string" && actualSha256 === expectedSha256;
  const validSize = Number.isInteger(expectedSize) && actualSize === expectedSize;

  return {
    isValid: validHash && validSize,
    validHash,
    validSize,
    canonicalizationVersion,
    expectedSha256,
    actualSha256,
    expectedSize,
    actualSize,
    canonicalQuestionnaire,
    invisibleFormatCharacterCount: findQuestionnaireInvisibleFormatCharacters(canonicalQuestionnaire).length,
  };
}

function finding(
  severity: VerificationFindingSeverity,
  code: string,
  message: string,
  pointer?: string
): VerificationFinding {
  return {
    severity,
    code,
    message,
    pointer,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function schemaErrorCode(error: ErrorObject): string {
  if (error.keyword === "additionalProperties") return "SCHEMA_ADDITIONAL_PROPERTY";
  if (error.keyword === "const") return "SCHEMA_CONST_MISMATCH";
  if (error.keyword === "enum") return "SCHEMA_INVALID_ENUM";
  if (error.keyword === "format") return "SCHEMA_INVALID_FORMAT";
  if (error.keyword === "pattern") return "SCHEMA_PATTERN_MISMATCH";
  if (error.keyword === "required") return "SCHEMA_REQUIRED_PROPERTY";
  if (error.keyword === "type") return "SCHEMA_INVALID_TYPE";
  return "SCHEMA_VALIDATION_ERROR";
}

function schemaErrorPointer(error: ErrorObject): string {
  if (error.keyword === "required" && "missingProperty" in error.params) {
    return `${error.instancePath}/${String(error.params.missingProperty)}`.replace(/\/+/g, "/");
  }

  if (error.keyword === "additionalProperties" && "additionalProperty" in error.params) {
    return `${error.instancePath}/${String(error.params.additionalProperty)}`.replace(/\/+/g, "/");
  }

  return error.instancePath || "/";
}

type StandaloneSchemaValidator = {
  (value: unknown): boolean;
  errors?: ErrorObject[] | null;
};

async function loadProofPackSchemaValidator(formatVersion: unknown): Promise<StandaloneSchemaValidator> {
  if (formatVersion === "blackproof-proofpack-v2") {
    return (await import("./generated/proofpack-v2-validator.js")).default;
  }
  if (formatVersion === undefined) {
    return (await import("./generated/proofpack-v1-validator.js")).default;
  }
  return (await import("./generated/proofpack-validator.js")).default;
}

async function validateSchema(value: unknown, findings: VerificationFinding[]): Promise<boolean> {
  const formatVersion = isRecord(value) ? value.formatVersion : undefined;
  const validator = await loadProofPackSchemaValidator(formatVersion);
  const valid = validator(value);

  if (valid) {
    return true;
  }

  for (const error of validator.errors ?? []) {
    findings.push(
      finding(
        "error",
        schemaErrorCode(error),
        `ProofPack schema violation: ${error.message ?? error.keyword}.`,
        schemaErrorPointer(error)
      )
    );
  }

  return false;
}

function validateSummary(proofpack: ProofPack, findings: VerificationFinding[]): boolean {
  const expected = {
    questionCount: proofpack.questions.length,
    evidenceCount: proofpack.evidence.length,
    proofDebtCount: proofpack.debts.length,
    criticalDebtCount: proofpack.debts.filter((debt) => debt.severity === "critical").length,
    highDebtCount: proofpack.debts.filter((debt) => debt.severity === "high").length,
    ...calculateProofDebtIndicators(
      proofpack.questions,
      proofpack.evidence,
      Date.parse(proofpack.generatedAt)
    ),
    proofDebtScore: calculateProofDebtScore(proofpack.questions, proofpack.debts),
  };

  let ok = true;

  for (const [key, value] of Object.entries(expected)) {
    const actual = proofpack.summary[key as keyof typeof expected];

    if (actual !== value) {
      findings.push(
        finding(
          "error",
          "SUMMARY_MISMATCH",
          `Summary mismatch for ${key}: expected ${value}, got ${actual}.`,
          `/summary/${key}`
        )
      );
      ok = false;
    }
  }

  return ok;
}

function validateLinks(proofpack: ProofPack, findings: VerificationFinding[]): boolean {
  const questionIds = new Set<string>();
  const evidenceIds = new Set<string>();
  const evidenceById = new Map<string, ProofPack["evidence"][number]>();
  let ok = true;

  for (const question of proofpack.questions) {
    if (questionIds.has(question.id)) {
      findings.push(finding("error", "DUPLICATE_QUESTION_ID", `Duplicate question id: ${question.id}.`, "/questions"));
      ok = false;
    }

    questionIds.add(question.id);
  }

  for (const item of proofpack.evidence) {
    if (evidenceIds.has(item.id)) {
      findings.push(finding("error", "DUPLICATE_EVIDENCE_ID", `Duplicate evidence id: ${item.id}.`, "/evidence"));
      ok = false;
    }

    evidenceIds.add(item.id);
    evidenceById.set(item.id, item);

    if (!questionIds.has(item.questionId)) {
      findings.push(
        finding(
          "error",
          "EVIDENCE_UNKNOWN_QUESTION",
          `Evidence item ${item.id} references unknown question ${item.questionId}.`,
          `/evidence/${item.id}/questionId`
        )
      );
      ok = false;
    }
  }

  for (const question of proofpack.questions) {
    for (const evidenceId of question.evidenceIds) {
      if (!evidenceIds.has(evidenceId)) {
        findings.push(
          finding(
            "error",
            "QUESTION_UNKNOWN_EVIDENCE",
            `Question ${question.id} references unknown evidence ${evidenceId}.`,
            `/questions/${question.id}/evidenceIds`
          )
        );
        ok = false;
      } else if (evidenceById.get(evidenceId)!.questionId !== question.id) {
        findings.push(
          finding(
            "error",
            "QUESTION_EVIDENCE_PARENT_MISMATCH",
            `Question ${question.id} references evidence ${evidenceId}, whose parent is ${evidenceById.get(evidenceId)!.questionId}.`,
            `/questions/${question.id}/evidenceIds`
          )
        );
        ok = false;
      }
    }
  }

  for (const item of proofpack.evidence) {
    const parent = proofpack.questions.find((question) => question.id === item.questionId);
    if (parent && parent.evidenceIds.filter((id) => id === item.id).length !== 1) {
      findings.push(
        finding(
          "error",
          "EVIDENCE_PARENT_BACKLINK_INVALID",
          `Evidence item ${item.id} must be listed exactly once by its parent question ${item.questionId}.`,
          `/evidence/${item.id}/questionId`
        )
      );
      ok = false;
    }
  }

  for (const debt of proofpack.debts) {
    if (debt.questionId && !questionIds.has(debt.questionId)) {
      findings.push(
        finding(
          "error",
          "DEBT_UNKNOWN_QUESTION",
          `Debt ${debt.id} references unknown question ${debt.questionId}.`,
          `/debts/${debt.id}/questionId`
        )
      );
      ok = false;
    }

    if (debt.evidenceId && !evidenceIds.has(debt.evidenceId)) {
      findings.push(
        finding(
          "error",
          "DEBT_UNKNOWN_EVIDENCE",
          `Debt ${debt.id} references unknown evidence ${debt.evidenceId}.`,
          `/debts/${debt.id}/evidenceId`
        )
      );
      ok = false;
    }
  }

  return ok;
}

async function validateDeliveryHistory(proofpack: ProofPack, findings: VerificationFinding[]): Promise<boolean> {
  let ok = true;
  const deliveryHistory = (proofpack as unknown as { deliveryHistory?: DeliveryHistoryEntry[] }).deliveryHistory ?? [];

  for (const [index, receipt] of deliveryHistory.entries()) {
    const pointer = `/deliveryHistory/${index}`;
    const expectedFilename = `blackproof-delivery-${receipt.deliveryId}${receipt.filename.endsWith(".zip") ? ".zip" : ".json"}`;
    if ((receipt.snapshotSha256 || receipt.deliveryJson) && receipt.filename !== expectedFilename) {
      findings.push(finding("error", "DELIVERY_HISTORY_FILENAME_MISMATCH", "Delivery filename does not contain the receipt public deliveryId.", `${pointer}/filename`));
      ok = false;
    }

    if (receipt.snapshotSha256) {
      const questionMappings = receipt.questionMappings ?? [];
      const evidenceMappings = receipt.evidenceMappings ?? [];
      const selectedQuestions = new Set(receipt.selectedQuestionIds);
      const selectedEvidence = new Set(receipt.selectedEvidenceIds);
      const masterQuestionIds = new Set(proofpack.questions.map((item) => item.id));
      const masterEvidenceIds = new Set(proofpack.evidence.map((item) => item.id));
      const mappingQuestions = new Set(questionMappings.map((item) => item.masterQuestionId));
      const mappingEvidence = new Set(evidenceMappings.map((item) => item.masterEvidenceId));
      const validMappings = questionMappings.length === selectedQuestions.size
        && evidenceMappings.length === selectedEvidence.size
        && [...selectedQuestions].every((id) => masterQuestionIds.has(id) && mappingQuestions.has(id))
        && [...selectedEvidence].every((id) => masterEvidenceIds.has(id) && mappingEvidence.has(id));
      if (!validMappings) {
        findings.push(finding("error", "DELIVERY_HISTORY_SELECTION_MISMATCH", "Delivery receipt mappings do not match the selected Master questions and evidence.", pointer));
        ok = false;
      }
    }

    if (!receipt.deliveryJson) {
      if (!receipt.snapshotSha256) findings.push(finding("warning", "DELIVERY_HISTORY_LEGACY_NO_SNAPSHOT", "Legacy Delivery receipt has no archived delivery.json snapshot.", pointer));
      continue;
    }

    const snapshotVerification = await verifyDeliveryReceiptWithSnapshot(proofpack, receipt, receipt.deliveryJson, pointer);
    findings.push(...snapshotVerification.findings);
    if (!snapshotVerification.isValid) ok = false;

  }

  return ok;
}

export interface VerifyDeliveryReceiptSnapshotResult {
  deliveryId: string;
  isValid: boolean;
  validHash: boolean;
  validDelivery: boolean;
  validReceiptLinks: boolean;
  validMappings: boolean;
  findings: VerificationFinding[];
}

export async function verifyDeliveryReceiptWithSnapshot(
  master: ProofPack,
  receipt: DeliveryHistoryEntry,
  deliveryJson: string,
  pointer = "/deliveryReceipt"
): Promise<VerifyDeliveryReceiptSnapshotResult> {
  const findings: VerificationFinding[] = [];
  const expectedFilename = `blackproof-delivery-${receipt.deliveryId}${receipt.filename.endsWith(".zip") ? ".zip" : ".json"}`;
  const validHash = Boolean(receipt.snapshotSha256) && await sha256Hex(deliveryJson) === receipt.snapshotSha256;
  if (!validHash) findings.push(finding("error", "DELIVERY_SNAPSHOT_HASH_MISMATCH", "Delivery snapshot SHA-256 does not match its receipt.", `${pointer}/snapshotSha256`));

  const verification = await verifyProofPackDeliveryJson(deliveryJson);
  const validDelivery = verification.isValid;
  if (!validDelivery) findings.push(finding("error", "DELIVERY_HISTORY_SNAPSHOT_INVALID", "Archived delivery.json is not a valid Delivery.", `${pointer}/deliveryJson`));

  let parsed: { questions?: Array<{ id?: string; evidence?: Array<{ id?: string }> }> } = {};
  try { parsed = JSON.parse(deliveryJson); } catch { /* reported by Delivery verification */ }
  const validReceiptLinks = receipt.filename === expectedFilename
    && verification.deliveryId === receipt.deliveryId
    && verification.providedFingerprint === receipt.fingerprint
    && verification.generatedAt === receipt.generatedAt;
  if (!validReceiptLinks) findings.push(finding("error", "DELIVERY_HISTORY_SNAPSHOT_MISMATCH", "Delivery receipt metadata or filename does not match its snapshot.", pointer));

  const questionMappings = receipt.questionMappings ?? [];
  const evidenceMappings = receipt.evidenceMappings ?? [];
  const selectedQuestions = new Set(receipt.selectedQuestionIds);
  const selectedEvidence = new Set(receipt.selectedEvidenceIds);
  const masterQuestions = new Set(master.questions.map((item) => item.id));
  const masterEvidence = new Map(master.evidence.map((item) => [item.id, item]));
  const deliveryQuestionIds = (parsed.questions ?? []).map((item) => item.id).filter((id): id is string => typeof id === "string");
  const deliveryEvidenceByQuestion = new Map(
    (parsed.questions ?? []).map((question) => [question.id, (question.evidence ?? []).map((item) => item.id).filter((id): id is string => typeof id === "string")])
  );
  const mappedMasterQuestions = questionMappings.map((item) => item.masterQuestionId);
  const mappedDeliveryQuestions = questionMappings.map((item) => item.deliveryQuestionId);
  const mappedMasterEvidence = evidenceMappings.map((item) => item.masterEvidenceId);
  const mappedDeliveryEvidence = evidenceMappings.map((item) => item.deliveryEvidenceId);
  const unique = (values: string[]) => new Set(values).size === values.length;
  const sameSet = (left: Iterable<string>, right: Iterable<string>) => {
    const a = new Set(left); const b = new Set(right);
    return a.size === b.size && [...a].every((value) => b.has(value));
  };
  const questionMap = new Map(questionMappings.map((item) => [item.masterQuestionId, item.deliveryQuestionId]));
  const validEvidenceParents = evidenceMappings.every((mapping) => {
    const evidence = masterEvidence.get(mapping.masterEvidenceId);
    const publicQuestionId = evidence ? questionMap.get(evidence.questionId) : undefined;
    return Boolean(publicQuestionId && deliveryEvidenceByQuestion.get(publicQuestionId)?.includes(mapping.deliveryEvidenceId));
  });
  const validMappings = questionMappings.length === selectedQuestions.size
    && evidenceMappings.length === selectedEvidence.size
    && unique(mappedMasterQuestions) && unique(mappedDeliveryQuestions)
    && unique(mappedMasterEvidence) && unique(mappedDeliveryEvidence)
    && sameSet(mappedMasterQuestions, selectedQuestions)
    && sameSet(mappedMasterEvidence, selectedEvidence)
    && [...selectedQuestions].every((id) => masterQuestions.has(id))
    && [...selectedEvidence].every((id) => masterEvidence.has(id))
    && sameSet(mappedDeliveryQuestions, deliveryQuestionIds)
    && sameSet(mappedDeliveryEvidence, [...deliveryEvidenceByQuestion.values()].flat())
    && validEvidenceParents;
  if (!validMappings) findings.push(finding("error", "DELIVERY_HISTORY_PUBLIC_MAPPING_MISMATCH", "Delivery receipt mappings do not exactly match the supplied Delivery snapshot.", `${pointer}/mappings`));

  return {
    deliveryId: receipt.deliveryId,
    isValid: validHash && validDelivery && validReceiptLinks && validMappings,
    validHash,
    validDelivery,
    validReceiptLinks,
    validMappings,
    findings,
  };
}

function hasNonEmptyText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function validateInvariants(proofpack: ProofPack, findings: VerificationFinding[]): boolean {
  let ok = true;

  if (proofpack.sourceQuestionnaire.normalizedQuestionnaireSha256
    && proofpack.sourceQuestionnaire.sha256 !== proofpack.sourceQuestionnaire.normalizedQuestionnaireSha256) {
    findings.push(finding(
      "error",
      "QUESTIONNAIRE_NORMALIZED_HASH_ALIAS_MISMATCH",
      "Legacy sourceQuestionnaire.sha256 must match normalizedQuestionnaireSha256.",
      "/sourceQuestionnaire/sha256"
    ));
    ok = false;
  }

  proofpack.questions.forEach((question, index) => {
    const hasAnswer = hasNonEmptyText(question.answerText);

    if (question.answerExportStatus === "ready" && !hasAnswer) {
      findings.push(finding(
        "error",
        "READY_ANSWER_EMPTY",
        "A ready answer must contain non-empty answer text.",
        `/questions/${index}/answerText`
      ));
      ok = false;
    }

    if (question.answerExportStatus === "reserved"
      && (!hasAnswer || !hasNonEmptyText(question.answerReservation))) {
      findings.push(finding(
        "error",
        "RESERVED_ANSWER_INCOMPLETE",
        "A reserved answer must contain non-empty answer and reservation text.",
        `/questions/${index}`
      ));
      ok = false;
    }
  });

  proofpack.evidence.forEach((item, index) => {
    if (item.status === "available" && !hasEvidenceSource(item)) {
      findings.push(finding(
        "error",
        "AVAILABLE_EVIDENCE_UNREFERENCED",
        "Available evidence must contain a source system or document reference.",
        `/evidence/${index}`
      ));
      ok = false;
    }

    if (item.status === "expired") {
      findings.push(finding(
        "warning",
        "EVIDENCE_MARKED_EXPIRED",
        "Evidence is explicitly marked expired; this is a business warning, not a structural error.",
        `/evidence/${index}/status`
      ));
    }

    const validationClaimed = hasNonEmptyText(item.validator) || hasNonEmptyText(item.validatedAt);
    if (validationClaimed && (!hasNonEmptyText(item.validator) || !hasNonEmptyText(item.validatedAt))) {
      findings.push(finding(
        "error",
        "EVIDENCE_VALIDATION_INCOMPLETE",
        "Validated evidence must contain both validator and validatedAt.",
        `/evidence/${index}`
      ));
      ok = false;
    }
  });

  return ok;
}

function assessCurrentFreshness(proofpack: ProofPack, checkedAt: string) {
  const checkedAtMs = Date.parse(checkedAt);
  const expiredEvidenceIds = proofpack.evidence
    .filter((item) => item.status === "expired"
      || (item.expiresAt !== undefined && Date.parse(item.expiresAt) <= checkedAtMs))
    .map((item) => item.id);

  return {
    checkedAt,
    expiredEvidenceCount: expiredEvidenceIds.length,
    expiredEvidenceIds,
    isFresh: expiredEvidenceIds.length === 0,
  };
}

async function verifyFingerprint(proofpack: ProofPack): Promise<{
  valid: boolean;
  expected: string;
  provided: string;
}> {
  const { fingerprint, ...base } = proofpack;
  const expected = `bp_sha256_${await sha256Hex(stableStringify(base))}`;

  return {
    valid: fingerprint === expected,
    expected,
    provided: fingerprint,
  };
}

export async function verifyProofPackJson(input: unknown): Promise<VerifyProofPackResult> {
  const checkedAt = new Date().toISOString();
  const emptyFreshness = {
    checkedAt,
    expiredEvidenceCount: 0,
    expiredEvidenceIds: [] as string[],
    isFresh: true,
  };
  if (typeof input !== "string") {
    throw new SecurityValidationError("INVALID_TYPE", "ProofPack JSON input must be a string.");
  }

  if (input.length > SECURITY_LIMITS.MAX_PROOFPACK_JSON_CHARS) {
    throw new SecurityValidationError(
      "PROOFPACK_TOO_LARGE",
      `ProofPack JSON exceeds ${SECURITY_LIMITS.MAX_PROOFPACK_JSON_CHARS} characters.`
    );
  }

  const findings: VerificationFinding[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
  } catch {
    findings.push(finding("error", "INVALID_JSON", "The provided file is not valid JSON.", "/"));

    return {
      isValid: false,
      validSchema: false,
      validFingerprint: false,
      validSummary: false,
      validLinks: false,
      validInvariants: false,
      validDeliveryHistory: false,
      historicalIntegrity: false,
      currentFreshness: emptyFreshness,
      findings,
    };
  }

  if (!(await validateSchema(parsed, findings))) {
    return {
      isValid: false,
      validSchema: false,
      validFingerprint: false,
      validSummary: false,
      validLinks: false,
      validInvariants: false,
      validDeliveryHistory: false,
      historicalIntegrity: false,
      currentFreshness: emptyFreshness,
      providedFingerprint: isRecord(parsed) && isString(parsed.fingerprint) ? parsed.fingerprint : undefined,
      methodVersion: isRecord(parsed) && isString(parsed.methodVersion) ? parsed.methodVersion : undefined,
      formatVersion: isRecord(parsed) && isString(parsed.formatVersion) ? parsed.formatVersion : undefined,
      schemaVersion: isRecord(parsed) && isString(parsed.schemaVersion) ? parsed.schemaVersion : undefined,
      generatedAt: isRecord(parsed) && isString(parsed.generatedAt) ? parsed.generatedAt : undefined,
      findings,
    };
  }

  const validSchema = true;
  const proofpack = parsed as ProofPack;
  const compatibility = parsed as { formatVersion?: string; schemaVersion?: string };
  const canonicalizationVersion = resolveQuestionnaireCanonicalizationVersion(
    proofpack.sourceQuestionnaire.canonicalizationVersion
  );
  if (!proofpack.sourceQuestionnaire.canonicalizationVersion) {
    findings.push(finding(
      "info",
      "QUESTIONNAIRE_CANONICALIZATION_LEGACY_DEFAULT",
      "Historical ProofPack has no canonicalizationVersion; canonicalization v1 is applied by compatibility rule.",
      "/sourceQuestionnaire/canonicalizationVersion"
    ));
  }
  if (!compatibility.formatVersion) {
    findings.push(finding(
      "info",
      "PROOFPACK_FORMAT_LEGACY_DEFAULT",
      "Historical ProofPack has no formatVersion or schemaVersion; the immutable v1 schema is applied by compatibility rule.",
      "/formatVersion"
    ));
  }
  const fingerprint = await verifyFingerprint(proofpack);
  const validSummary = validateSummary(proofpack, findings);
  const validLinks = validateLinks(proofpack, findings);
  const validInvariants = validateInvariants(proofpack, findings);
  const validDeliveryHistory = await validateDeliveryHistory(proofpack, findings);
  const currentFreshness = assessCurrentFreshness(proofpack, checkedAt);
  const historicalIntegrity = fingerprint.valid && validSummary && validLinks && validInvariants && validDeliveryHistory;

  if (!currentFreshness.isFresh) {
    findings.push(finding(
      "warning",
      "CURRENT_EVIDENCE_EXPIRED",
      `${currentFreshness.expiredEvidenceCount} evidence item(s) are expired as of ${checkedAt}. Historical validity is unchanged.`,
      "/evidence"
    ));
  }

  if (!fingerprint.valid) {
    findings.push(
      finding(
        "error",
        "FINGERPRINT_MISMATCH",
        "ProofPack fingerprint does not match its content.",
        "/fingerprint"
      )
    );
  }

  if (historicalIntegrity) {
    findings.push(
      finding(
        "info",
        "PROOFPACK_VALID",
        "proofpack.json internal consistency and fingerprint verified locally. Issuer identity is not authenticated.",
        "/"
      )
    );
  }

  return {
    isValid: historicalIntegrity,
    validSchema,
    validFingerprint: fingerprint.valid,
    validSummary,
    validLinks,
    validInvariants,
    validDeliveryHistory,
    historicalIntegrity,
    coherenceAt: proofpack.generatedAt,
    currentFreshness,
    providedFingerprint: fingerprint.provided,
    expectedFingerprint: fingerprint.expected,
    methodVersion: proofpack.methodVersion,
    formatVersion: compatibility.formatVersion ?? "blackproof-proofpack-v1",
    schemaVersion: compatibility.schemaVersion ?? "blackproof-proofpack-schema-v1",
    canonicalizationVersion,
    generatedAt: proofpack.generatedAt,
    caseTitle: proofpack.case.title,
    caseId: proofpack.case.id,
    findings,
  };
}
