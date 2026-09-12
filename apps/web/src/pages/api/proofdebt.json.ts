import {
  PROOFDEBT_SCORING_VERSION,
  proofDebtScoreBands,
  proofDebtScoringModel,
} from "@blackproof/core";
import { apiEnvelope, jsonResponse } from "../../lib/api-response";

export const prerender = true;

const interpretationSignals = [
  {
    signal: "missing-evidence",
    label: "Preuve manquante",
    meaning: "A claimed answer has no supporting evidence item.",
    expectedAction: "Add evidence or document an explicit reservation.",
  },
  {
    signal: "declared-only",
    label: "Preuve declarative",
    meaning: "The dossier contains a declaration but no sufficiently verifiable evidence.",
    expectedAction: "Replace with a dated report, extract, attestation or controlled proof.",
  },
  {
    signal: "expired-evidence",
    label: "Preuve perimee",
    meaning: "The evidence exists but its freshness or validity is weak.",
    expectedAction: "Refresh the evidence or document its validity period.",
  },
  {
    signal: "not-exportable",
    label: "Preuve sensible non exportable",
    meaning: "The evidence exists but should not leave the organization as-is.",
    expectedAction: "Provide a controlled extract, summary, attestation or explicit reservation.",
  },
] as const;

export function GET() {
  return jsonResponse(
    apiEnvelope("proofdebt", {
      version: PROOFDEBT_SCORING_VERSION,
      scoringModel: proofDebtScoringModel,
      indicatorWarning: "ProofDebt est un indicateur heuristique non calibré, pas une mesure statistique, un score de conformité ou une probabilité d'acceptation.",
      scoreBands: proofDebtScoreBands,
      interpretationSignals,
    })
  );
}
