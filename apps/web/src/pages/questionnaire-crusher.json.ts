import {
  QUESTIONNAIRE_CRUSHER_VERSION,
  analyzeQuestionnaireForCrusher,
  questionnaireCrusherCapabilities,
  type QuestionDiagnosticIdFactory,
} from "@blackproof/core";

export const prerender = true;

const sampleQuestionnaire = `1. Avez-vous activé le MFA pour les comptes administrateurs ?
2. Disposez-vous d'une procédure de sauvegarde documentée ?
3. Collectez-vous et conservez-vous les journaux de sécurité ?
4. Quelle est votre couleur préférée ?`;

const sampleDiagnosticId: QuestionDiagnosticIdFactory = (_text, index) =>
  `qd_sample_${index.toString().padStart(4, "0")}`;

export function GET() {
  return new Response(
    JSON.stringify(
      {
        version: QUESTIONNAIRE_CRUSHER_VERSION,
        capabilities: questionnaireCrusherCapabilities,
        sampleReport: analyzeQuestionnaireForCrusher(sampleQuestionnaire, sampleDiagnosticId),
      },
      null,
      2
    ),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    }
  );
}
