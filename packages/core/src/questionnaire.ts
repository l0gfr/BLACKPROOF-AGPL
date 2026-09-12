import {
  detectCategory,
  detectCriticality,
  getEvidenceTemplates,
  getMappedRequirements,
} from "./evidence";

import type {
  CreateCaseOptions,
  EvidenceItem,
  EngineResult,
  ProofCase,
  ProofQuestion,
} from "./types";

import { buildProofDebt } from "./proofdebt";
import { buildProofPack, buildQuestionnaireSource } from "./proofpack";
import { makeId, normalizeText } from "./utils";
import {
  assertQuestionCount,
  sanitizeCaseTitle,
  sanitizeMetadataField,
  sanitizeQuestionnaireInput,
} from "./security";

export const DEFAULT_WORKING_FRAMEWORK_LABEL = "Cartographie BLACKPROOF NIS 2 / ReCyF, v0.1 alpha";

export function splitQuestionnaire(input: string): string[] {
  const normalized = normalizeText(sanitizeQuestionnaireInput(input));

  if (!normalized) {
    return [];
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const segments: string[] = [];
  let current = "";

  for (const line of lines) {
    const clean = line
      .replace(/^\s*(?:[-*•]|\d+[\).:-]|q\d+[\).:-]?|question\s+\d+[\).:-]?)\s*/i, "")
      .trim();

    const startsNewQuestion =
      /^\s*(?:[-*•]|\d+[\).:-]|q\d+[\).:-]?|question\s+\d+[\).:-]?)/i.test(line) ||
      line.includes("?");

    if (startsNewQuestion && current) {
      segments.push(current.trim());
      current = clean;
    } else {
      current = current ? `${current} ${clean}` : clean;
    }
  }

  if (current) {
    segments.push(current.trim());
  }

  let output = segments;

  if (segments.length <= 1 && normalized.includes("?")) {
    output = normalized
      .split("?")
      .map((part) => part.trim())
      .filter((part) => part.length > 8)
      .map((part) => `${part}?`);
  }

  output = output
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 8);

  assertQuestionCount(output.length);

  return output;
}

export async function createProofCaseFromQuestionnaire(
  input: string,
  options: CreateCaseOptions = {}
): Promise<EngineResult> {
  const now = new Date().toISOString();
  const cleanedInput = sanitizeQuestionnaireInput(input);
  const title = sanitizeCaseTitle(options.title);

  const proofCase: ProofCase = {
    id: makeId("case"),
    title,
    companyName: sanitizeMetadataField(options.companyName, "company name"),
    clientName: sanitizeMetadataField(options.clientName, "client name"),
    framework: sanitizeMetadataField(options.framework, "framework") ?? DEFAULT_WORKING_FRAMEWORK_LABEL,
    createdAt: now,
    updatedAt: now,
    status: "draft",
  };

  const rawQuestions = splitQuestionnaire(cleanedInput);

  const questions: ProofQuestion[] = rawQuestions.map((text) => {
    const category = detectCategory(text);
    const questionId = makeId("q");

    return {
      id: questionId,
      caseId: proofCase.id,
      text,
      category,
      criticality: detectCriticality(text, category),
      mappedRequirements: getMappedRequirements(category),
      suggestedAnswer: "À compléter avec une réponse factuelle et une réserve si la preuve est absente.",
      evidenceIds: [],
      confidence: category === "unknown" ? "low" : "medium",
      answerText: "",
      answerReservation: "",
      answerConfidence: category === "unknown" ? "low" : "medium",
      answerExportStatus: "draft",
    };
  });

  const evidence: EvidenceItem[] = questions.flatMap((question) =>
    getEvidenceTemplates(question.category).map((template) => {
      const id = makeId("ev");
      question.evidenceIds.push(id);
      return {
        id,
        caseId: proofCase.id,
        questionId: question.id,
        templateId: template.id,
        title: template.title,
        category: template.category,
        description: template.description,
        sensitivity: template.sensitivity,
        status: "expected",
        strength: template.strength,
        recommendedFormat: template.recommendedFormat,
        linkedRequirements: question.mappedRequirements,
      };
    })
  );

  const debts = buildProofDebt(proofCase, questions, evidence);
  const sourceQuestionnaire = await buildQuestionnaireSource(cleanedInput, {
    fileName: options.sourceFileName ?? "questionnaire.txt",
    format: options.sourceFormat ?? "text",
    importedAt: options.sourceImportedAt ?? now,
    originalFileSha256: options.sourceOriginalFileSha256,
  });
  const proofpack = await buildProofPack(proofCase, questions, evidence, debts, { sourceQuestionnaire });

  return {
    case: proofCase,
    questions,
    evidence,
    debts,
    proofpack,
  };
}
