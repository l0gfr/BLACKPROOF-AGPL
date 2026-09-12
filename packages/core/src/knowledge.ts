import type { AnswerConfidence, ProofCategory, ProofPack, ProofQuestion } from "./types";
import { SECURITY_LIMITS, sanitizeTextInput, sha256Hex, stableStringify } from "./security";
import { makeId } from "./utils";

export const KNOWLEDGE_ENTRY_VERSION = "blackproof-knowledge-entry-v1" as const;
export const KNOWLEDGE_VAULT_VERSION = "blackproof-personal-knowledge-vault-v1" as const;
export const KNOWLEDGE_USE_VERSION = "blackproof-knowledge-use-v1" as const;
export const MAX_KNOWLEDGE_ENTRIES = 500;
export const MAX_KNOWLEDGE_ALIASES = 20;
const MAX_KNOWLEDGE_REQUIREMENTS = 50;
const MAX_KNOWLEDGE_EVIDENCE_TEMPLATES = 50;
const fingerprintPattern = /^bp_sha256_[a-f0-9]{64}$/;
const knowledgeIdPattern = /^knowledge_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const knowledgeRevisionIdPattern = /^knowledge_revision_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isoTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const proofCategories = new Set<ProofCategory>([
  "access-control",
  "backup",
  "incident-response",
  "business-continuity",
  "supplier-security",
  "governance",
  "logging-monitoring",
  "vulnerability-management",
  "data-protection",
  "unknown",
]);
const answerConfidences = new Set<AnswerConfidence>(["low", "medium", "high"]);

export type KnowledgeApprovalStatus = "approved" | "retired";

export interface KnowledgeEntry {
  formatVersion: typeof KNOWLEDGE_ENTRY_VERSION;
  id: string;
  revisionId: string;
  status: KnowledgeApprovalStatus;
  canonicalQuestion: string;
  canonicalQuestionKey: string;
  aliases: string[];
  category: ProofCategory;
  mappedRequirements: string[];
  answerText: string;
  answerReservation: string;
  answerConfidence: AnswerConfidence;
  applicabilityNotes: string;
  evidenceTemplateIds: string[];
  approvedByLabel?: string;
  approvedAt: string;
  reviewAt?: string;
  createdAt: string;
  updatedAt: string;
  provenance: {
    sourceCaseId: string;
    sourceRevisionId: string;
    sourceQuestionId: string;
    sourceProofPackFingerprint: string;
  };
  fingerprint: string;
}

export interface PersonalKnowledgeVault {
  formatVersion: typeof KNOWLEDGE_VAULT_VERSION;
  revisionId: string;
  updatedAt: string;
  entries: KnowledgeEntry[];
}

export interface KnowledgeUse {
  formatVersion: typeof KNOWLEDGE_USE_VERSION;
  questionId: string;
  entryId: string;
  entryRevisionId: string;
  entryFingerprint: string;
  appliedAt: string;
}

export interface KnowledgeMatch {
  entry: KnowledgeEntry;
  score: number;
  reason: "question-exacte" | "alias-exact" | "exigences-communes";
  reviewRequired: boolean;
}

function boundedText(value: unknown, fieldName: string, maxChars: number): string {
  return sanitizeTextInput(value ?? "", { fieldName, maxChars });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: unknown, required: readonly string[], optional: readonly string[] = []): value is Record<string, unknown> {
  if (!isRecord(value) || required.some((key) => !Object.hasOwn(value, key))) return false;
  return Object.keys(value).every((key) => required.includes(key) || optional.includes(key));
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40 || !isoTimestampPattern.test(value)) return false;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return false;
  const canonical = new Date(parsed).toISOString();
  return value === canonical || (!value.includes(".") && canonical === value.replace("Z", ".000Z"));
}

function isBoundedText(value: unknown, maxChars: number, allowEmpty = false): value is string {
  return typeof value === "string" && value.length <= maxChars && (allowEmpty || value.trim().length > 0);
}

function isUniqueBoundedTextArray(value: unknown, maxItems: number, maxChars: number): value is string[] {
  if (!Array.isArray(value) || value.length > maxItems || !value.every((item) => isBoundedText(item, maxChars))) return false;
  return new Set(value).size === value.length;
}

function isKnowledgeProvenance(value: unknown): value is KnowledgeEntry["provenance"] {
  return hasExactKeys(value, ["sourceCaseId", "sourceRevisionId", "sourceQuestionId", "sourceProofPackFingerprint"])
    && isBoundedText(value.sourceCaseId, 160)
    && isBoundedText(value.sourceRevisionId, 160)
    && isBoundedText(value.sourceQuestionId, 160)
    && typeof value.sourceProofPackFingerprint === "string"
    && fingerprintPattern.test(value.sourceProofPackFingerprint);
}

export function canonicalizeKnowledgeQuestion(value: unknown): string {
  return boundedText(value, "knowledge question", SECURITY_LIMITS.MAX_LINE_CHARS)
    .replace(/^\s*(?:\d+[.)]|[-*])\s+/, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([?!:;,])/g, "$1")
    .toLocaleLowerCase("fr-FR");
}

function uniqueBoundedStrings(values: readonly string[], fieldName: string, limit: number): string[] {
  const output: string[] = [];
  const seen = new Set<string>();
  for (const raw of values.slice(0, limit)) {
    const value = boundedText(raw, fieldName, SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    output.push(value);
  }
  return output;
}

async function withKnowledgeFingerprint(base: Omit<KnowledgeEntry, "fingerprint">): Promise<KnowledgeEntry> {
  return { ...base, fingerprint: `bp_sha256_${await sha256Hex(stableStringify(base))}` };
}

export async function createKnowledgeEntry(input: {
  proofpack: ProofPack;
  question: ProofQuestion;
  aliases?: string[];
  applicabilityNotes?: string;
  approvedByLabel?: string;
  reviewAt?: string;
}): Promise<KnowledgeEntry> {
  const { proofpack, question } = input;
  const answerText = boundedText(question.answerText, "knowledge answer", SECURITY_LIMITS.MAX_ANSWER_CHARS);
  const answerReservation = boundedText(question.answerReservation, "knowledge reservation", SECURITY_LIMITS.MAX_RESERVATION_CHARS);
  if (!answerText) throw new Error("KNOWLEDGE_ANSWER_REQUIRED: une réponse non vide est requise.");
  if (question.answerExportStatus !== "ready" && question.answerExportStatus !== "reserved") {
    throw new Error("KNOWLEDGE_CASE_APPROVAL_REQUIRED: la réponse du dossier doit être prête ou validée avec réserve.");
  }
  if (question.answerExportStatus === "reserved" && !answerReservation) {
    throw new Error("KNOWLEDGE_RESERVATION_REQUIRED: la réserve validée est absente.");
  }
  const now = new Date().toISOString();
  const reviewAt = input.reviewAt ? new Date(input.reviewAt).toISOString() : undefined;
  if (reviewAt && Date.parse(reviewAt) <= Date.parse(now)) throw new Error("KNOWLEDGE_REVIEW_DATE_INVALID: la date de revue doit être future.");
  const canonicalQuestion = boundedText(question.text, "knowledge canonical question", SECURITY_LIMITS.MAX_LINE_CHARS);
  const evidenceTemplateIds = uniqueBoundedStrings(
    proofpack.evidence.filter((item) => item.questionId === question.id).map((item) => item.templateId),
    "knowledge evidence template id",
    50
  );
  return withKnowledgeFingerprint({
    formatVersion: KNOWLEDGE_ENTRY_VERSION,
    id: makeId("knowledge"),
    revisionId: makeId("knowledge_revision"),
    status: "approved",
    canonicalQuestion,
    canonicalQuestionKey: canonicalizeKnowledgeQuestion(canonicalQuestion),
    aliases: uniqueBoundedStrings(input.aliases ?? [], "knowledge alias", MAX_KNOWLEDGE_ALIASES),
    category: question.category,
    mappedRequirements: uniqueBoundedStrings(question.mappedRequirements, "knowledge requirement", 50),
    answerText,
    answerReservation,
    answerConfidence: question.answerConfidence,
    applicabilityNotes: boundedText(input.applicabilityNotes, "knowledge applicability notes", SECURITY_LIMITS.MAX_FIELD_CHARS),
    evidenceTemplateIds,
    ...(input.approvedByLabel ? { approvedByLabel: boundedText(input.approvedByLabel, "knowledge approver label", SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS) } : {}),
    approvedAt: now,
    ...(reviewAt ? { reviewAt } : {}),
    createdAt: now,
    updatedAt: now,
    provenance: {
      sourceCaseId: proofpack.case.id,
      sourceRevisionId: proofpack.revisionId,
      sourceQuestionId: question.id,
      sourceProofPackFingerprint: proofpack.fingerprint,
    },
  });
}

export async function verifyKnowledgeEntry(entry: unknown): Promise<boolean> {
  if (!hasExactKeys(entry, [
    "formatVersion", "id", "revisionId", "status", "canonicalQuestion", "canonicalQuestionKey", "aliases", "category",
    "mappedRequirements", "answerText", "answerReservation", "answerConfidence", "applicabilityNotes", "evidenceTemplateIds",
    "approvedAt", "createdAt", "updatedAt", "provenance", "fingerprint",
  ], ["approvedByLabel", "reviewAt"])
    || entry.formatVersion !== KNOWLEDGE_ENTRY_VERSION
    || typeof entry.fingerprint !== "string" || !fingerprintPattern.test(entry.fingerprint)
    || (entry.status !== "approved" && entry.status !== "retired")
    || typeof entry.id !== "string" || !knowledgeIdPattern.test(entry.id)
    || typeof entry.revisionId !== "string" || !knowledgeRevisionIdPattern.test(entry.revisionId)
    || !isBoundedText(entry.canonicalQuestion, SECURITY_LIMITS.MAX_LINE_CHARS)
    || !isBoundedText(entry.canonicalQuestionKey, SECURITY_LIMITS.MAX_LINE_CHARS)
    || !isUniqueBoundedTextArray(entry.aliases, MAX_KNOWLEDGE_ALIASES, SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS)
    || typeof entry.category !== "string" || !proofCategories.has(entry.category as ProofCategory)
    || !isUniqueBoundedTextArray(entry.mappedRequirements, MAX_KNOWLEDGE_REQUIREMENTS, SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS)
    || !isBoundedText(entry.answerText, SECURITY_LIMITS.MAX_ANSWER_CHARS)
    || !isBoundedText(entry.answerReservation, SECURITY_LIMITS.MAX_RESERVATION_CHARS, true)
    || typeof entry.answerConfidence !== "string" || !answerConfidences.has(entry.answerConfidence as AnswerConfidence)
    || !isBoundedText(entry.applicabilityNotes, SECURITY_LIMITS.MAX_FIELD_CHARS, true)
    || !isUniqueBoundedTextArray(entry.evidenceTemplateIds, MAX_KNOWLEDGE_EVIDENCE_TEMPLATES, SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS)
    || (entry.approvedByLabel !== undefined && !isBoundedText(entry.approvedByLabel, SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS))
    || !isIsoTimestamp(entry.approvedAt) || !isIsoTimestamp(entry.createdAt) || !isIsoTimestamp(entry.updatedAt)
    || (entry.reviewAt !== undefined && !isIsoTimestamp(entry.reviewAt))
    || Date.parse(entry.createdAt) > Date.parse(entry.approvedAt)
    || Date.parse(entry.approvedAt) > Date.parse(entry.updatedAt)
    || !isKnowledgeProvenance(entry.provenance)) return false;
  if (entry.canonicalQuestionKey !== canonicalizeKnowledgeQuestion(entry.canonicalQuestion)) return false;
  const { fingerprint, ...base } = entry;
  return fingerprint === `bp_sha256_${await sha256Hex(stableStringify(base))}`;
}

export async function retireKnowledgeEntry(entry: KnowledgeEntry): Promise<KnowledgeEntry> {
  if (!(await verifyKnowledgeEntry(entry))) throw new Error("KNOWLEDGE_ENTRY_INVALID: entrée invalide ou altérée.");
  const now = new Date().toISOString();
  const { fingerprint: _fingerprint, ...base } = entry;
  return withKnowledgeFingerprint({ ...base, revisionId: makeId("knowledge_revision"), status: "retired", updatedAt: now });
}

export async function reviseKnowledgeEntry(entry: KnowledgeEntry, input: {
  answerText: string;
  answerReservation?: string;
  applicabilityNotes?: string;
  approvedByLabel?: string;
  reviewAt?: string;
}): Promise<KnowledgeEntry> {
  if (!(await verifyKnowledgeEntry(entry))) throw new Error("KNOWLEDGE_ENTRY_INVALID: entrée invalide ou altérée.");
  const answerText = boundedText(input.answerText, "knowledge answer", SECURITY_LIMITS.MAX_ANSWER_CHARS);
  if (!answerText) throw new Error("KNOWLEDGE_ANSWER_REQUIRED: une réponse non vide est requise.");
  const now = new Date().toISOString();
  const reviewAt = input.reviewAt ? new Date(input.reviewAt).toISOString() : undefined;
  if (reviewAt && Date.parse(reviewAt) <= Date.parse(now)) throw new Error("KNOWLEDGE_REVIEW_DATE_INVALID: la date de revue doit être future.");
  const { fingerprint: _fingerprint, ...base } = entry;
  return withKnowledgeFingerprint({
    ...base,
    revisionId: makeId("knowledge_revision"),
    status: "approved",
    answerText,
    answerReservation: boundedText(input.answerReservation, "knowledge reservation", SECURITY_LIMITS.MAX_RESERVATION_CHARS),
    applicabilityNotes: boundedText(input.applicabilityNotes, "knowledge applicability notes", SECURITY_LIMITS.MAX_FIELD_CHARS),
    ...(input.approvedByLabel ? { approvedByLabel: boundedText(input.approvedByLabel, "knowledge approver label", SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS) } : { approvedByLabel: undefined }),
    approvedAt: now,
    ...(reviewAt ? { reviewAt } : { reviewAt: undefined }),
    updatedAt: now,
  });
}

export function findKnowledgeMatches(question: ProofQuestion, entries: readonly KnowledgeEntry[], now = Date.now()): KnowledgeMatch[] {
  const key = canonicalizeKnowledgeQuestion(question.text);
  const requirements = new Set(question.mappedRequirements);
  return entries
    .filter((entry) => entry.status === "approved")
    .map((entry): KnowledgeMatch | undefined => {
      const reviewRequired = Boolean(entry.reviewAt && Date.parse(entry.reviewAt) <= now);
      if (entry.canonicalQuestionKey === key) return { entry, score: 100, reason: "question-exacte", reviewRequired };
      if (entry.aliases.some((alias) => canonicalizeKnowledgeQuestion(alias) === key)) return { entry, score: 95, reason: "alias-exact", reviewRequired };
      const overlap = entry.mappedRequirements.filter((requirement) => requirements.has(requirement)).length;
      if (entry.category === question.category && overlap > 0) return { entry, score: Math.min(80, 55 + overlap * 5), reason: "exigences-communes", reviewRequired: true };
      return undefined;
    })
    .filter((match): match is KnowledgeMatch => Boolean(match))
    .sort((left, right) => right.score - left.score || right.entry.updatedAt.localeCompare(left.entry.updatedAt));
}

export function applyKnowledgeEntry(entry: KnowledgeEntry, questionId: string): {
  patch: Pick<ProofQuestion, "answerText" | "answerReservation" | "answerConfidence" | "answerExportStatus">;
  use: KnowledgeUse;
} {
  if (entry.status !== "approved") throw new Error("KNOWLEDGE_ENTRY_NOT_APPROVED: entrée non applicable.");
  return {
    patch: {
      answerText: entry.answerText,
      answerReservation: entry.answerReservation,
      answerConfidence: entry.answerConfidence,
      answerExportStatus: "draft",
    },
    use: {
      formatVersion: KNOWLEDGE_USE_VERSION,
      questionId,
      entryId: entry.id,
      entryRevisionId: entry.revisionId,
      entryFingerprint: entry.fingerprint,
      appliedAt: new Date().toISOString(),
    },
  };
}

export function assertProofPackKnowledgeUseLink(
  proofpack: Pick<ProofPack, "questions">,
  uses: readonly unknown[],
): void {
  const questions = new Set(proofpack.questions.map((question) => question.id));
  const seen = new Set<string>();
  for (const use of uses) {
    if (!isRecord(use) || use.formatVersion !== KNOWLEDGE_USE_VERSION
      || typeof use.questionId !== "string" || !use.questionId || !questions.has(use.questionId) || seen.has(use.questionId)
      || typeof use.entryId !== "string" || !use.entryId || typeof use.entryRevisionId !== "string" || !use.entryRevisionId
      || typeof use.entryFingerprint !== "string" || !/^bp_sha256_[a-f0-9]{64}$/.test(use.entryFingerprint)
      || typeof use.appliedAt !== "string" || !use.appliedAt || Number.isNaN(Date.parse(use.appliedAt))) {
      throw new Error("KNOWLEDGE_USE_LINK_INVALID: a Knowledge reference is invalid, duplicated or not linked to this ProofPack.");
    }
    seen.add(use.questionId);
  }
}
