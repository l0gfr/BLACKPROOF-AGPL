import type {
  EvidenceItem,
  ProofCase,
  ProofDebt,
  ProofDebtSeverity,
  ProofQuestion,
} from "./types";
import { hasEvidenceSource } from "./evidence-reference";

import { makeId } from "./utils";

export const PROOFDEBT_SCORING_VERSION = "blackproof-proofdebt-scoring-v0.2.0-alpha";

export const proofDebtScoringModel = {
  version: PROOFDEBT_SCORING_VERSION,
  purpose: "Provide a deterministic preparation indicator from recorded answers, evidence statuses and references. This is not a compliance or evidence-validity score.",
  penalties: {
    critical: 18,
    high: 11,
    medium: 6,
    low: 3,
  },
  maxPenaltyPerQuestion: 22,
  perQuestionPenaltyCap: true,
  scoreRange: {
    min: 0,
    max: 100,
  },
  components: [
    "responseCompletenessScore",
    "evidenceCoverageScore",
    "evidenceQualityFreshnessScore",
    "exportReadinessScore",
  ],
  disclaimer: "ProofDebt est un indicateur heuristique non calibré, calculé uniquement à partir des réponses, statuts et références saisis. Il ne vérifie pas les documents sources et ne vaut ni conformité réglementaire, ni avis d'audit, ni probabilité d'acceptation par un tiers.",
} as const;

function severityFromQuestion(question: ProofQuestion): ProofDebtSeverity {
  if (question.criticality === "critical") return "critical";
  if (question.criticality === "high") return "high";
  if (question.criticality === "medium") return "medium";
  return "low";
}

function hasText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isFresh(item: EvidenceItem, now = Date.now()): boolean {
  if (!item.expiresAt) return true;
  const expiresAt = Date.parse(item.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > now;
}

function validationIsClaimed(item: EvidenceItem): boolean {
  return hasText(item.validator) || hasText(item.validatedAt);
}

function isValidated(item: EvidenceItem): boolean {
  return hasText(item.validator) && hasText(item.validatedAt);
}

export function buildProofDebt(
  proofCase: ProofCase,
  questions: ProofQuestion[],
  evidence: EvidenceItem[],
  previousDebts: ProofDebt[] = []
): ProofDebt[] {
  const debts: ProofDebt[] = [];

  for (const question of questions) {
    const hasAnswer = hasText(question.answerText);
    const hasReservation = hasText(question.answerReservation);

    if (question.answerExportStatus === "ready" && !hasAnswer) {
      debts.push({
        id: makeId("debt"),
        kind: "ready-without-answer",
        caseId: proofCase.id,
        questionId: question.id,
        severity: severityFromQuestion(question),
        reason: "Réponse marquée prête sans contenu.",
        recommendedAction: "Renseigner une réponse non vide avant de la marquer prête.",
      });
    }

    if (question.answerExportStatus === "reserved" && (!hasAnswer || !hasReservation)) {
      debts.push({
        id: makeId("debt"),
        kind: "incomplete-reservation",
        caseId: proofCase.id,
        questionId: question.id,
        severity: severityFromQuestion(question),
        reason: "Réponse avec réserve incomplète : la réponse et le texte de réserve sont obligatoires.",
        recommendedAction: "Renseigner la réponse et expliciter la réserve avant export.",
      });
    }

    const linkedEvidence = evidence.filter((item) => item.questionId === question.id);

    if (linkedEvidence.length === 0) {
      debts.push({
        id: makeId("debt"),
        kind: "no-evidence",
        caseId: proofCase.id,
        questionId: question.id,
        severity: severityFromQuestion(question),
        reason: "Aucune preuve attendue n'est associée à cette question.",
        recommendedAction: "Qualifier manuellement la preuve attendue ou exclure explicitement la question du périmètre.",
      });

      continue;
    }

    for (const item of linkedEvidence) {
      if (item.status === "available" && !hasEvidenceSource(item)) {
        debts.push({
          id: makeId("debt"),
          kind: "available-without-source",
          caseId: proofCase.id,
          questionId: question.id,
          evidenceId: item.id,
          severity: severityFromQuestion(question),
          reason: `Preuve déclarée disponible sans source ni référence : ${item.title}.`,
          recommendedAction: "Ajouter un système source, un fichier, une URI ou une empreinte documentaire.",
        });
      }

      if (item.status === "expected" || item.status === "missing") {
        debts.push({
          id: makeId("debt"),
          kind: "missing",
          caseId: proofCase.id,
          questionId: question.id,
          evidenceId: item.id,
          severity: severityFromQuestion(question),
          reason: `Preuve attendue non fournie : ${item.title}.`,
          recommendedAction: `Ajouter une preuve ou documenter une réserve pour : ${item.title}.`,
        });
      }

      if (item.status === "expired") {
        debts.push({
          id: makeId("debt"),
          kind: "expired-status",
          caseId: proofCase.id,
          questionId: question.id,
          evidenceId: item.id,
          severity: "high",
          reason: `Preuve périmée : ${item.title}.`,
          recommendedAction: "Remplacer la preuve par une version récente ou ajouter une justification de validité.",
        });
      }

      if (item.status !== "expired" && !isFresh(item)) {
        debts.push({
          id: makeId("debt"),
          kind: "expired-by-date",
          caseId: proofCase.id,
          questionId: question.id,
          evidenceId: item.id,
          severity: "high",
          reason: `Date de validité dépassée : ${item.title}.`,
          recommendedAction: "Actualiser la preuve ou documenter une nouvelle date de validité.",
        });
      }

      if (validationIsClaimed(item) && !isValidated(item)) {
        debts.push({
          id: makeId("debt"),
          kind: "incomplete-validation",
          caseId: proofCase.id,
          questionId: question.id,
          evidenceId: item.id,
          severity: "medium",
          reason: `Validation incomplète : ${item.title}.`,
          recommendedAction: "Renseigner le validateur et la date de validation.",
        });
      }

      if (item.status === "declared") {
        debts.push({
          id: makeId("debt"),
          kind: "declared",
          caseId: proofCase.id,
          questionId: question.id,
          evidenceId: item.id,
          severity: "medium",
          reason: `Preuve seulement déclarative : ${item.title}.`,
          recommendedAction: "Remplacer la déclaration par une preuve vérifiable ou un extrait contrôlé.",
        });
      }

      if (item.status === "not-exportable") {
        debts.push({
          id: makeId("debt"),
          kind: "not-exportable",
          caseId: proofCase.id,
          questionId: question.id,
          evidenceId: item.id,
          severity: question.criticality === "critical" || question.criticality === "high" ? "medium" : "low",
          reason: `Preuve sensible non exportable : ${item.title}.`,
          recommendedAction: "Fournir un extrait contrôlé, une attestation ou une réserve explicite sans exposer la preuve sensible.",
        });
      }
    }
  }

  const semanticKey = (debt: Pick<ProofDebt, "questionId" | "evidenceId" | "kind">) =>
    `${debt.questionId}\u0000${debt.evidenceId ?? ""}\u0000${debt.kind ?? ""}`;
  const previousByKey = new Map(
    previousDebts.filter((debt) => debt.kind).map((debt) => [semanticKey(debt), debt])
  );

  return debts.map((debt) => {
    const previous = previousByKey.get(semanticKey(debt))
      ?? previousDebts.find((candidate) => !candidate.kind
        && candidate.questionId === debt.questionId
        && candidate.evidenceId === debt.evidenceId
        && candidate.reason === debt.reason
        && candidate.recommendedAction === debt.recommendedAction);
    return previous ? { ...debt, id: previous.id } : debt;
  });
}

export function calculateProofDebtScore(questions: ProofQuestion[], debts: ProofDebt[]): number {
  if (questions.length === 0) {
    return 0;
  }

  const questionIds = new Set(questions.map((question) => question.id));
  const penaltyByQuestion = new Map<string, number>();

  for (const debt of debts) {
    if (!questionIds.has(debt.questionId)) {
      continue;
    }

    const current = penaltyByQuestion.get(debt.questionId) ?? 0;
    penaltyByQuestion.set(
      debt.questionId,
      Math.min(current + penaltyForDebt(debt), proofDebtScoringModel.maxPenaltyPerQuestion)
    );
  }

  const penalty = Array.from(penaltyByQuestion.values()).reduce((total, value) => total + value, 0);

  const maxPenalty = Math.max(questions.length * proofDebtScoringModel.maxPenaltyPerQuestion, 1);
  const score = Math.round(100 - Math.min(100, (penalty / maxPenalty) * 100));

  return Math.max(0, Math.min(100, score));
}

function penaltyForDebt(debt: ProofDebt): number {
  if (debt.severity === "critical") return proofDebtScoringModel.penalties.critical;
  if (debt.severity === "high") return proofDebtScoringModel.penalties.high;
  if (debt.severity === "medium") return proofDebtScoringModel.penalties.medium;
  return proofDebtScoringModel.penalties.low;
}

function percentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

function evidenceQualityWeight(item: EvidenceItem, asOf: number): number {
  if (item.status === "expected" || item.status === "missing") return 0;
  if (item.status === "expired") return 0.25;
  if (item.status === "declared") return 0.35;
  if (item.status === "not-exportable") return 0.55;

  if (!hasEvidenceSource(item)) return 0;

  let weight = item.strength === "strong" ? 1 : item.strength === "medium" ? 0.85 : 0.65;
  if (!isFresh(item, asOf)) weight = Math.min(weight, 0.25);
  if (validationIsClaimed(item) && !isValidated(item)) weight = Math.min(weight, 0.5);
  return weight;
}

function answerReadinessWeight(question: ProofQuestion): number {
  const hasAnswer = hasText(question.answerText);
  if (question.answerExportStatus === "ready" && hasAnswer) return 1;
  if (question.answerExportStatus === "reserved" && hasAnswer && hasText(question.answerReservation)) return 0.75;
  return 0;
}

export function calculateProofDebtIndicators(
  questions: ProofQuestion[],
  evidence: EvidenceItem[],
  asOf = Date.now()
): {
  responseCompletenessScore: number;
  evidenceCoverageScore: number;
  evidenceQualityFreshnessScore: number;
  exportReadinessScore: number;
} {
  const answeredQuestions = questions.filter((question) => hasText(question.answerText)).length;
  const coveredEvidence = evidence.filter((item) =>
    item.status !== "expected"
      && item.status !== "missing"
      && (item.status !== "available" || hasEvidenceSource(item))
  ).length;
  const evidenceQuality = evidence.reduce((total, item) => total + evidenceQualityWeight(item, asOf), 0);
  const answerReadiness = questions.reduce((total, question) => total + answerReadinessWeight(question), 0);

  return {
    responseCompletenessScore: percentage(answeredQuestions, questions.length),
    evidenceCoverageScore: percentage(coveredEvidence, evidence.length),
    evidenceQualityFreshnessScore: percentage(evidenceQuality, evidence.length),
    exportReadinessScore: percentage(answerReadiness, questions.length),
  };
}
