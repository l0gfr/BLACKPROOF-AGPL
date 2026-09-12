import { canonicalizeQuestionnaireV1ForVerification } from "./security";

/**
 * Reproduces canonicalization v1 only to authenticate and migrate historical
 * dossiers. Never use it when creating new questionnaire data.
 */
export function sanitizeLegacyQuestionnaireV1ForMigrationOnly(input: unknown): string {
  return canonicalizeQuestionnaireV1ForVerification(input);
}
