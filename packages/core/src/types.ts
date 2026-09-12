export type ProofCategory =
  | "access-control"
  | "backup"
  | "incident-response"
  | "business-continuity"
  | "supplier-security"
  | "governance"
  | "logging-monitoring"
  | "vulnerability-management"
  | "data-protection"
  | "unknown";

export type Criticality = "low" | "medium" | "high" | "critical";

export type AnswerConfidence = "low" | "medium" | "high";

export type AnswerExportStatus =
  | "draft"
  | "ready"
  | "reserved"
  | "do-not-export";

export type EvidenceStatus =
  | "expected"
  | "available"
  | "missing"
  | "expired"
  | "declared"
  | "not-exportable";

export type EvidenceSensitivity =
  | "public"
  | "internal"
  | "confidential"
  | "secret";

export type EvidenceReferenceType =
  | "file"
  | "uri"
  | "source-record"
  | "document-hash";

export type EvidenceExportMode =
  | "internal-only"
  | "reference-only";

export type ProofDebtSeverity = "low" | "medium" | "high" | "critical";

export type ProofDebtKind =
  | "ready-without-answer"
  | "incomplete-reservation"
  | "no-evidence"
  | "available-without-source"
  | "missing"
  | "expired-status"
  | "expired-by-date"
  | "incomplete-validation"
  | "declared"
  | "not-exportable";

export interface ProofCase {
  id: string;
  title: string;
  companyName?: string;
  clientName?: string;
  framework: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "ready" | "exported";
}

export interface ProofQuestion {
  id: string;
  caseId: string;
  text: string;
  category: ProofCategory;
  criticality: Criticality;
  mappedRequirements: string[];
  suggestedAnswer: string;
  evidenceIds: string[];
  confidence: "low" | "medium" | "high";
  answerText: string;
  answerReservation: string;
  answerConfidence: AnswerConfidence;
  answerExportStatus: AnswerExportStatus;
}

export interface EvidenceTemplate {
  id: string;
  title: string;
  category: ProofCategory;
  description: string;
  sensitivity: EvidenceSensitivity;
  strength: "weak" | "medium" | "strong";
  recommendedFormat: string;
}

export interface EvidenceItem {
  id: string;
  caseId: string;
  questionId: string;
  templateId: string;
  title: string;
  category: ProofCategory;
  description: string;
  sensitivity: EvidenceSensitivity;
  status: EvidenceStatus;
  strength: "weak" | "medium" | "strong";
  recommendedFormat: string;
  linkedRequirements: string[];
  referenceType?: EvidenceReferenceType;
  referenceId?: string;
  publicReference?: string;
  exportMode?: EvidenceExportMode;
  fileName?: string;
  fileUri?: string;
  documentHash?: string;
  sourceSystem?: string;
  owner?: string;
  observedAt?: string;
  expiresAt?: string;
  coveredScope?: string;
  validator?: string;
  validatedAt?: string;
  controlResult?: string;
  version?: string;
  history?: string[];
}

export interface ProofDebt {
  id: string;
  kind?: ProofDebtKind;
  caseId: string;
  questionId: string;
  evidenceId?: string;
  severity: ProofDebtSeverity;
  reason: string;
  recommendedAction: string;
}

export interface DeliveryHistoryEntry {
  deliveryId: string;
  fingerprint: string;
  generatedAt: string;
  recipientLabel?: string;
  confirmedBy?: string;
  selectedQuestionIds: string[];
  selectedEvidenceIds: string[];
  questionMappings?: Array<{ masterQuestionId: string; deliveryQuestionId: string }>;
  evidenceMappings?: Array<{ masterEvidenceId: string; deliveryEvidenceId: string }>;
  snapshotSha256?: string;
  deliveryJson?: string;
  filename: string;
  status: "generated" | "sent" | "revoked";
}

export interface ProofPackSummary {
  questionCount: number;
  evidenceCount: number;
  proofDebtCount: number;
  criticalDebtCount: number;
  highDebtCount: number;
  responseCompletenessScore: number;
  evidenceCoverageScore: number;
  evidenceQualityFreshnessScore: number;
  exportReadinessScore: number;
  proofDebtScore: number;
}

export type QuestionnaireSourceFormat = "text" | "csv" | "tsv" | "unknown";

export type QuestionnaireCanonicalizationVersion =
  | "blackproof-questionnaire-canonicalization-v1"
  | "blackproof-questionnaire-canonicalization-v2";

export interface ProofPackQuestionnaireSource {
  fileName: string;
  format: QuestionnaireSourceFormat;
  importedAt: string;
  /** @deprecated Alias of normalizedQuestionnaireSha256 kept for legacy ProofPacks. */
  sha256: string;
  normalizedQuestionnaireSha256?: string;
  originalFileSha256?: string;
  /** Missing only on historical ProofPacks, where it means canonicalization v1. */
  canonicalizationVersion?: QuestionnaireCanonicalizationVersion;
  size: number;
}

export interface ProofPack {
  formatVersion: "blackproof-proofpack-v3";
  schemaVersion: "blackproof-proofpack-schema-v3";
  id: string;
  revisionId: string;
  case: ProofCase;
  sourceQuestionnaire: ProofPackQuestionnaireSource;
  questions: ProofQuestion[];
  evidence: EvidenceItem[];
  debts: ProofDebt[];
  deliveryHistory: DeliveryHistoryEntry[];
  summary: ProofPackSummary;
  methodVersion: string;
  generatedAt: string;
  fingerprint: string;
}

export interface ProofPackDeliveryEvidence {
  id: string;
  title: string;
  category: ProofCategory;
  disclosure: "reference-only";
  publicReference: string;
}

export interface ProofPackDeliveryQuestion {
  id: string;
  text: string;
  category?: ProofCategory;
  criticality?: Criticality;
  answer: string;
  reservation?: string;
  evidence: ProofPackDeliveryEvidence[];
}

export interface ProofPackDelivery {
  product: "BLACKPROOF";
  formatVersion: "blackproof-proofpack-delivery-v5";
  methodVersion: string;
  schemaVersion: "blackproof-proofpack-delivery-schema-v5";
  schemaUrl: "https://blackproof.fr/schemas/proofpack-delivery/v5.schema.json";
  deliveryId: string;
  verificationProfile: {
    id: "blackproof-local-integrity-v1";
    verifies: readonly ["schema", "fingerprint", "links", "invariants"];
    doesNotVerify: readonly ["issuer-identity", "declaration-truth", "legal-validity", "trusted-timestamp"];
  };
  case: {
    id: string;
    title: string;
    framework: string;
  };
  questions: ProofPackDeliveryQuestion[];
  generatedAt: string;
  fingerprint: string;
}

export interface ProofPackDeliveryReview {
  questionIds: string[];
  evidenceIds: string[];
  confirmed: boolean;
}

export interface ProofPackDeliveryChange {
  question: string;
  kind: "added" | "removed" | "answer-changed" | "reservation-changed" | "evidence-changed";
  previousAnswer?: string;
  currentAnswer?: string;
  previousReservation?: string;
  currentReservation?: string;
  previousEvidence?: string[];
  currentEvidence?: string[];
}

export interface ProofPackDeliveryChangeReport {
  product: "BLACKPROOF";
  formatVersion: "blackproof-delivery-change-report-v1";
  previous: { deliveryId: string; fingerprint: string; generatedAt: string };
  current: { deliveryId: string; fingerprint: string; generatedAt: string };
  case: { title: string; framework: string };
  generatedAt: string;
  summary: {
    added: number;
    removed: number;
    changed: number;
    unchanged: number;
  };
  changes: ProofPackDeliveryChange[];
  fingerprint: string;
}

export interface ProofPackDeliverySignature {
  product: "BLACKPROOF";
  formatVersion: "blackproof-delivery-signature-v1";
  subjectType: "delivery" | "revocation";
  subjectFingerprint: string;
  algorithm: "ECDSA-P256-SHA256";
  issuer: string;
  publicKeyJwk: JsonWebKey;
  signedAt: string;
  signature: string;
}

export interface ProofPackDeliveryRevocation {
  product: "BLACKPROOF";
  formatVersion: "blackproof-delivery-revocation-v1";
  deliveryId: string;
  deliveryFingerprint: string;
  status: "revoked";
  revokedAt: string;
  reason?: string;
  fingerprint: string;
}

export interface CreateCaseOptions {
  title?: string;
  companyName?: string;
  clientName?: string;
  framework?: string;
  sourceFileName?: string;
  sourceFormat?: QuestionnaireSourceFormat;
  sourceImportedAt?: string;
  sourceOriginalFileSha256?: string;
}

export interface EngineResult {
  case: ProofCase;
  questions: ProofQuestion[];
  evidence: EvidenceItem[];
  debts: ProofDebt[];
  proofpack: ProofPack;
}
