import {
  detectCategory,
  detectCriticality,
  getEvidenceTemplates,
  getMappedRequirements,
} from "./evidence";

import {
  getRequirementCoverageForCategory,
  type FrameworkRequirement,
} from "./frameworks";

import { splitQuestionnaire } from "./questionnaire";
import { makeId } from "./utils";

import type {
  Criticality,
  EvidenceTemplate,
  ProofCategory,
} from "./types";

export const QUESTIONNAIRE_CRUSHER_VERSION = "blackproof-questionnaire-crusher-v0.2.0-alpha";

export type MappingConfidence = "high" | "medium" | "low";
export type HeuristicCoverageLevel = MappingConfidence;
export type QuestionDiagnosticStatus = "mapped" | "needs-review" | "unmapped" | "critical";
export type QuestionDiagnosticAlertSeverity = "info" | "warning" | "critical";
export type QuestionDiagnosticIdFactory = (text: string, index: number) => string;

export interface QuestionDiagnosticAlert {
  code: string;
  severity: QuestionDiagnosticAlertSeverity;
  message: string;
}

export interface QuestionDiagnostic {
  id: string;
  index: number;
  text: string;
  category: ProofCategory;
  criticality: Criticality;
  status: QuestionDiagnosticStatus;
  heuristicCoverage: HeuristicCoverageLevel;
  heuristicCoverageLabel: string;
  heuristicCoverageRationale: string;
  /**
   * @deprecated Use heuristicCoverage. This is a deterministic rule-coverage level, not statistical confidence.
   */
  confidence: MappingConfidence;
  /**
   * @deprecated Use heuristicCoverageRationale.
   */
  confidenceRationale: string;
  mappedRequirementIds: string[];
  resolvedRequirements: FrameworkRequirement[];
  missingRequirementIds: string[];
  expectedEvidence: EvidenceTemplate[];
  alerts: QuestionDiagnosticAlert[];
}

export interface QuestionnaireCrusherSummary {
  version: string;
  questionCount: number;
  mappedCount: number;
  needsReviewCount: number;
  unmappedCount: number;
  criticalCount: number;
  completeAutoMappingCount: number;
  reviewRecommendedCount: number;
  manualQualificationCount: number;
  /**
   * @deprecated Use completeAutoMappingCount.
   */
  highConfidenceCount: number;
  /**
   * @deprecated Use reviewRecommendedCount.
   */
  mediumConfidenceCount: number;
  /**
   * @deprecated Use manualQualificationCount.
   */
  lowConfidenceCount: number;
  categories: Array<{
    category: ProofCategory;
    count: number;
  }>;
}

export interface QuestionnaireCrusherReport {
  version: string;
  summary: QuestionnaireCrusherSummary;
  diagnostics: QuestionDiagnostic[];
  unmappedQueue: QuestionDiagnostic[];
  criticalQueue: QuestionDiagnostic[];
  disclaimer: string;
}

export const questionnaireCrusherCapabilities = [
  "Extraction locale de questions depuis un questionnaire brut",
  "Détection de catégorie cyber par règles de mots-clés",
  "Correspondance vers une cartographie de travail BLACKPROOF inspirée de NIS 2 et du ReCyF",
  "Suggestion de preuves attendues",
  "Niveau de couverture des règles déterministes",
  "File d'attente des questions sans correspondance",
  "Priorité heuristique des questions sensibles",
  "Aucun upload",
] as const;

export function heuristicCoverageLabel(level: HeuristicCoverageLevel): string {
  if (level === "high") return "règles de correspondance trouvées";
  if (level === "medium") return "correspondance à revoir";
  return "qualification manuelle nécessaire";
}

function buildHeuristicCoverageRationale(
  category: ProofCategory,
  heuristicCoverage: HeuristicCoverageLevel,
  expectedEvidence: EvidenceTemplate[],
  missingRequirementIds: string[]
): string {
  if (category === "unknown") {
    return "Aucune règle actuelle ne reconnaît cette question avec suffisamment de précision. Qualification manuelle requise.";
  }

  if (missingRequirementIds.length > 0) {
    return "La catégorie est détectée mais certains identifiants de travail ne sont pas reliés à une correspondance publiée.";
  }

  if (heuristicCoverage === "high") {
    return "Les règles ont reconnu une catégorie, résolu leurs identifiants de travail et trouvé des modèles de preuve. Cette correspondance reste à confirmer par une personne compétente.";
  }

  if (expectedEvidence.length === 0) {
    return "La catégorie est reconnue mais aucune preuve attendue n'est encore associée.";
  }

  return "La catégorie est reconnue, mais la correspondance proposée doit être revue par une personne compétente.";
}

function getHeuristicCoverage(
  category: ProofCategory,
  criticality: Criticality,
  expectedEvidence: EvidenceTemplate[],
  missingRequirementIds: string[],
  text: string
): MappingConfidence {
  if (category === "unknown") return "low";
  if (missingRequirementIds.length > 0) return "low";
  if (expectedEvidence.length === 0) return "low";
  if (!text.includes("?")) return "medium";
  if (criticality === "critical") return "high";
  if (expectedEvidence.length >= 2) return "high";

  return "medium";
}

function buildAlerts(
  text: string,
  category: ProofCategory,
  criticality: Criticality,
  heuristicCoverage: HeuristicCoverageLevel,
  expectedEvidence: EvidenceTemplate[],
  missingRequirementIds: string[]
): QuestionDiagnosticAlert[] {
  const alerts: QuestionDiagnosticAlert[] = [];

  if (category === "unknown") {
    alerts.push({
      code: "UNMAPPED_CATEGORY",
      severity: "warning",
      message: "Aucune correspondance suffisamment précise n’a été trouvée. Revue humaine nécessaire.",
    });
  }

  if (criticality === "critical") {
    alerts.push({
      code: "CRITICAL_QUESTION",
      severity: "critical",
      message: "Priorité heuristique critique : une réponse déclarative seule appelle une revue et des éléments étayants.",
    });
  }

  if (heuristicCoverage === "low") {
    alerts.push({
      code: "MANUAL_QUALIFICATION_REQUIRED",
      severity: "warning",
      message: "Qualification manuelle nécessaire avant toute décision de transmission.",
    });
  }

  if (missingRequirementIds.length > 0) {
    alerts.push({
      code: "MISSING_REQUIREMENT_MAPPING",
      severity: "warning",
      message: `Correspondances non résolues : ${missingRequirementIds.join(", ")}.`,
    });
  }

  if (!text.includes("?")) {
    alerts.push({
      code: "QUESTION_MARK_MISSING",
      severity: "info",
      message: "La ligne ne contient pas de point d'interrogation. Vérifier qu'il s'agit bien d'une question.",
    });
  }

  if (text.length > 240) {
    alerts.push({
      code: "LONG_QUESTION",
      severity: "warning",
      message: "Question longue ou composée. Elle devrait peut-être être découpée.",
    });
  }

  if (expectedEvidence.some((item) => item.sensitivity === "confidential" || item.sensitivity === "secret")) {
    alerts.push({
      code: "SENSITIVE_EVIDENCE_EXPECTED",
      severity: "info",
      message: "Certaines preuves attendues sont sensibles. Préférer un extrait contrôlé ou une attestation.",
    });
  }

  return alerts;
}

function getDiagnosticStatus(
  category: ProofCategory,
  criticality: Criticality,
  heuristicCoverage: HeuristicCoverageLevel,
  missingRequirementIds: string[]
): QuestionDiagnosticStatus {
  if (category === "unknown" || missingRequirementIds.length > 0) return "unmapped";
  if (criticality === "critical") return "critical";
  if (heuristicCoverage !== "high") return "needs-review";

  return "mapped";
}

export function diagnoseQuestion(
  text: string,
  index: number,
  idFactory: QuestionDiagnosticIdFactory = () => makeId("qd")
): QuestionDiagnostic {
  const category = detectCategory(text);
  const criticality = detectCriticality(text, category);
  const expectedEvidence = getEvidenceTemplates(category);
  const coverage = getRequirementCoverageForCategory(category);
  const mappedRequirementIds = getMappedRequirements(category);
  const heuristicCoverage = getHeuristicCoverage(
    category,
    criticality,
    expectedEvidence,
    coverage.missingRequirementIds,
    text
  );

  const alerts = buildAlerts(
    text,
    category,
    criticality,
    heuristicCoverage,
    expectedEvidence,
    coverage.missingRequirementIds
  );
  const rationale = buildHeuristicCoverageRationale(
    category,
    heuristicCoverage,
    expectedEvidence,
    coverage.missingRequirementIds
  );

  return {
    id: idFactory(text, index),
    index,
    text,
    category,
    criticality,
    status: getDiagnosticStatus(category, criticality, heuristicCoverage, coverage.missingRequirementIds),
    heuristicCoverage,
    heuristicCoverageLabel: heuristicCoverageLabel(heuristicCoverage),
    heuristicCoverageRationale: rationale,
    confidence: heuristicCoverage,
    confidenceRationale: rationale,
    mappedRequirementIds,
    resolvedRequirements: coverage.requirements,
    missingRequirementIds: coverage.missingRequirementIds,
    expectedEvidence,
    alerts,
  };
}

export function analyzeQuestionnaireForCrusher(
  input: string,
  idFactory: QuestionDiagnosticIdFactory = () => makeId("qd")
): QuestionnaireCrusherReport {
  const questions = splitQuestionnaire(input);
  const diagnostics = questions.map((question, index) => diagnoseQuestion(question, index + 1, idFactory));

  const categoryCounts = new Map<ProofCategory, number>();

  for (const diagnostic of diagnostics) {
    categoryCounts.set(
      diagnostic.category,
      (categoryCounts.get(diagnostic.category) ?? 0) + 1
    );
  }

  const summary: QuestionnaireCrusherSummary = {
    version: QUESTIONNAIRE_CRUSHER_VERSION,
    questionCount: diagnostics.length,
    mappedCount: diagnostics.filter((item) => item.status === "mapped").length,
    needsReviewCount: diagnostics.filter((item) => item.status === "needs-review").length,
    unmappedCount: diagnostics.filter((item) => item.status === "unmapped").length,
    criticalCount: diagnostics.filter((item) => item.status === "critical").length,
    completeAutoMappingCount: diagnostics.filter((item) => item.heuristicCoverage === "high").length,
    reviewRecommendedCount: diagnostics.filter((item) => item.heuristicCoverage === "medium").length,
    manualQualificationCount: diagnostics.filter((item) => item.heuristicCoverage === "low").length,
    highConfidenceCount: diagnostics.filter((item) => item.heuristicCoverage === "high").length,
    mediumConfidenceCount: diagnostics.filter((item) => item.heuristicCoverage === "medium").length,
    lowConfidenceCount: diagnostics.filter((item) => item.heuristicCoverage === "low").length,
    categories: Array.from(categoryCounts.entries()).map(([category, count]) => ({
      category,
      count,
    })),
  };

  return {
    version: QUESTIONNAIRE_CRUSHER_VERSION,
    summary,
    diagnostics,
    unmappedQueue: diagnostics.filter((item) => item.status === "unmapped"),
    criticalQueue: diagnostics.filter((item) => item.status === "critical"),
    disclaimer: "Questionnaire Crusher applique localement des règles déterministes de mots-clés et de correspondance. Il ne comprend pas le contexte comme un auditeur, ne valide aucun document source et ne produit ni certification, ni avis juridique, ni garantie de conformité.",
  };
}
