import type {
  EvidenceItem,
  ProofCase,
  ProofDebt,
  ProofPack,
  ProofPackQuestionnaireSource,
  QuestionnaireSourceFormat,
  ProofQuestion,
} from "./types";

import { calculateProofDebtIndicators, calculateProofDebtScore } from "./proofdebt";
import { makeId } from "./utils";
import {
  CURRENT_QUESTIONNAIRE_CANONICALIZATION_VERSION,
  resolveQuestionnaireCanonicalizationVersion,
  sanitizeMetadataField,
  sanitizeQuestionnaireInput,
  sha256Hex,
  stableStringify,
} from "./security";

export const METHOD_VERSION = "blackproof-method-v0.1.0-alpha";
export const PROOFPACK_FORMAT_VERSION = "blackproof-proofpack-v3" as const;
export const PROOFPACK_COMPATIBILITY_SCHEMA_VERSION = "blackproof-proofpack-schema-discovery-v2" as const;
export const PROOFPACK_SCHEMA_VERSION = "blackproof-proofpack-schema-v3" as const;
export const PROOFPACK_V1_SCHEMA_URL = "https://blackproof.fr/schemas/proofpack/v1.schema.json" as const;
export const PROOFPACK_V2_SCHEMA_URL = "https://blackproof.fr/schemas/proofpack/v2.schema.json" as const;
export const PROOFPACK_V3_SCHEMA_URL = "https://blackproof.fr/schemas/proofpack/v3.schema.json" as const;

export interface BuildQuestionnaireSourceOptions {
  fileName?: string;
  format?: QuestionnaireSourceFormat;
  importedAt?: string;
  originalFileSha256?: string;
}

export interface BuildProofPackOptions {
  sourceQuestionnaire?: ProofPackQuestionnaireSource;
  previousProofPack?: Pick<ProofPack, "id" | "deliveryHistory">;
}

function inferQuestionnaireFormat(fileName?: string): QuestionnaireSourceFormat {
  const lower = fileName?.toLowerCase() ?? "";

  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".tsv")) return "tsv";
  if (lower.endsWith(".txt") || lower.endsWith(".md")) return "text";

  return "unknown";
}

export async function buildQuestionnaireSource(
  input: string,
  options: BuildQuestionnaireSourceOptions = {}
): Promise<ProofPackQuestionnaireSource> {
  const cleanedInput = sanitizeQuestionnaireInput(input);
  const fileName = sanitizeMetadataField(options.fileName ?? "questionnaire.txt", "questionnaire source file name") ?? "questionnaire.txt";
  const format = options.format ?? inferQuestionnaireFormat(fileName);
  const normalizedQuestionnaireSha256 = `sha256:${await sha256Hex(cleanedInput)}`;

  return {
    fileName,
    format,
    importedAt: options.importedAt ?? new Date().toISOString(),
    sha256: normalizedQuestionnaireSha256,
    normalizedQuestionnaireSha256,
    ...(options.originalFileSha256 ? { originalFileSha256: options.originalFileSha256 } : {}),
    canonicalizationVersion: CURRENT_QUESTIONNAIRE_CANONICALIZATION_VERSION,
    size: new TextEncoder().encode(cleanedInput).length,
  };
}

export async function buildProofPack(
  proofCase: ProofCase,
  questions: ProofQuestion[],
  evidence: EvidenceItem[],
  debts: ProofDebt[],
  options: BuildProofPackOptions = {}
): Promise<ProofPack> {
  const generatedAt = new Date().toISOString();
  const indicators = calculateProofDebtIndicators(questions, evidence, Date.parse(generatedAt));
  const fallbackQuestionnaire = questions.map((question) => question.text).join("\n");
  const sourceQuestionnaireInput = options.sourceQuestionnaire ?? await buildQuestionnaireSource(fallbackQuestionnaire, {
    fileName: "questionnaire-derived-from-questions.txt",
    format: "text",
    importedAt: generatedAt,
  });
  const sourceQuestionnaire: ProofPackQuestionnaireSource = {
    ...sourceQuestionnaireInput,
    canonicalizationVersion: resolveQuestionnaireCanonicalizationVersion(
      sourceQuestionnaireInput.canonicalizationVersion
    ),
  };

  const base = {
    formatVersion: PROOFPACK_FORMAT_VERSION,
    schemaVersion: PROOFPACK_SCHEMA_VERSION,
    id: options.previousProofPack?.id ?? makeId("proofpack"),
    revisionId: makeId("revision"),
    case: proofCase,
    sourceQuestionnaire,
    questions,
    evidence,
    debts,
    deliveryHistory: options.previousProofPack?.deliveryHistory ?? [],
    summary: {
      questionCount: questions.length,
      evidenceCount: evidence.length,
      proofDebtCount: debts.length,
      criticalDebtCount: debts.filter((debt) => debt.severity === "critical").length,
      highDebtCount: debts.filter((debt) => debt.severity === "high").length,
      ...indicators,
      proofDebtScore: calculateProofDebtScore(questions, debts),
    },
    methodVersion: METHOD_VERSION,
    generatedAt,
  };

  const fingerprint = `bp_sha256_${await sha256Hex(stableStringify(base))}`;

  return {
    ...base,
    fingerprint,
  };
}
