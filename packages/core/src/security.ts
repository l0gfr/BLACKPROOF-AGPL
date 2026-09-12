export const SECURITY_LIMITS = {
  MAX_QUESTIONNAIRE_CHARS: 100_000,
  MAX_QUESTIONS: 250,
  MAX_LINE_CHARS: 4_000,
  MAX_FIELD_CHARS: 10_000,
  MAX_ANSWER_CHARS: 10_000,
  MAX_RESERVATION_CHARS: 5_000,
  MAX_CASE_TITLE_CHARS: 160,
  MAX_METADATA_FIELD_CHARS: 240,
  MAX_PROOFPACK_JSON_CHARS: 2_000_000,
  MAX_DELIVERY_HISTORY_ENTRIES: 250,
  MAX_DELIVERY_SNAPSHOT_CHARS: 2_000_000,
  MAX_PROOFPACK_ZIP_BYTES: 10_000_000,
  MAX_PROOFPACK_ZIP_ENTRIES: 32,
  MAX_PROOFPACK_ZIP_FILE_BYTES: 5_000_000,
  MAX_PROOFPACK_ZIP_EXPANDED_BYTES: 20_000_000,
} as const;

export class SecurityValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    Object.defineProperty(this, "name", {
      value: "SecurityValidationError",
      configurable: true,
    });
    this.code = code;
  }
}

const UNSAFE_CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const BIDI_OVERRIDE_CHARS = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
const LEGACY_BIDI_OVERRIDE_CHARS = /[\u202A-\u202E\u2066-\u2069]/g;
const INVISIBLE_FORMAT_CHARS = /[\u200B\u200C\u200D\u2060\uFEFF]/gu;
const CSV_FORMULA_PREFIX = /^[=+\-@\t\r\n]/;
const CSV_FORMULA_AFTER_SPACE = /^\s*[=+\-@]/;

export function sanitizeTextInput(
  input: unknown,
  options: {
    fieldName: string;
    maxChars: number;
  }
): string {
  if (typeof input !== "string") {
    throw new SecurityValidationError(
      "INVALID_TYPE",
      `${options.fieldName} must be a string.`
    );
  }

  if (input.length > options.maxChars) {
    throw new SecurityValidationError(
      "INPUT_TOO_LARGE",
      `${options.fieldName} exceeds ${options.maxChars} characters.`
    );
  }

  const normalized = input
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n");

  if (normalized.length > options.maxChars) {
    throw new SecurityValidationError(
      "INPUT_TOO_LARGE_AFTER_NORMALIZATION",
      `${options.fieldName} exceeds ${options.maxChars} characters after normalization.`
    );
  }

  return normalized
    .replace(UNSAFE_CONTROL_CHARS, "")
    .replace(BIDI_OVERRIDE_CHARS, "")
    .trim();
}

export const QUESTIONNAIRE_CANONICALIZATION_V1 = "blackproof-questionnaire-canonicalization-v1" as const;
export const QUESTIONNAIRE_CANONICALIZATION_V2 = "blackproof-questionnaire-canonicalization-v2" as const;
export const CURRENT_QUESTIONNAIRE_CANONICALIZATION_VERSION = QUESTIONNAIRE_CANONICALIZATION_V2;

export type QuestionnaireInvisibleFormatCharacter = {
  codePoint: "U+200B" | "U+200C" | "U+200D" | "U+2060" | "U+FEFF";
  index: number;
};

export function findQuestionnaireInvisibleFormatCharacters(
  input: unknown
): QuestionnaireInvisibleFormatCharacter[] {
  if (typeof input !== "string") return [];

  return [...input.matchAll(INVISIBLE_FORMAT_CHARS)].map((match) => ({
    codePoint: `U+${match[0]!.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}` as QuestionnaireInvisibleFormatCharacter["codePoint"],
    index: match.index,
  }));
}

export function canonicalizeQuestionnaireV1ForVerification(input: unknown): string {
  if (typeof input !== "string") {
    throw new SecurityValidationError("INVALID_TYPE", "questionnaire must be a string.");
  }
  if (input.length > SECURITY_LIMITS.MAX_QUESTIONNAIRE_CHARS) {
    throw new SecurityValidationError(
      "INPUT_TOO_LARGE",
      `questionnaire exceeds ${SECURITY_LIMITS.MAX_QUESTIONNAIRE_CHARS} characters.`
    );
  }

  const normalized = input.normalize("NFKC");
  if (normalized.length > SECURITY_LIMITS.MAX_QUESTIONNAIRE_CHARS) {
    throw new SecurityValidationError(
      "INPUT_TOO_LARGE_AFTER_NORMALIZATION",
      `questionnaire exceeds ${SECURITY_LIMITS.MAX_QUESTIONNAIRE_CHARS} characters after normalization.`
    );
  }

  const sanitized = normalized
    .replace(UNSAFE_CONTROL_CHARS, "")
    .replace(LEGACY_BIDI_OVERRIDE_CHARS, "")
    .trim();
  const lines = sanitized.split("\n");
  for (const [index, line] of lines.entries()) {
    if (line.length > SECURITY_LIMITS.MAX_LINE_CHARS) {
      throw new SecurityValidationError(
        "LINE_TOO_LONG",
        `Questionnaire line ${index + 1} exceeds ${SECURITY_LIMITS.MAX_LINE_CHARS} characters.`
      );
    }
  }
  return sanitized;
}

export function canonicalizeQuestionnaireInput(
  input: unknown,
  version: unknown
): string {
  if (version === QUESTIONNAIRE_CANONICALIZATION_V1) {
    return canonicalizeQuestionnaireV1ForVerification(input);
  }
  if (version === QUESTIONNAIRE_CANONICALIZATION_V2) {
    return sanitizeQuestionnaireInput(input);
  }
  throw new SecurityValidationError("UNSUPPORTED_CANONICALIZATION_VERSION", "Unsupported questionnaire canonicalization version.");
}

export function resolveQuestionnaireCanonicalizationVersion(
  version: import("./types").QuestionnaireCanonicalizationVersion | undefined
): import("./types").QuestionnaireCanonicalizationVersion {
  return version ?? QUESTIONNAIRE_CANONICALIZATION_V1;
}

export function sanitizeQuestionnaireInput(input: unknown): string {
  const sanitized = sanitizeTextInput(input, {
    fieldName: "questionnaire",
    maxChars: SECURITY_LIMITS.MAX_QUESTIONNAIRE_CHARS,
  });

  const lines = sanitized.split("\n");

  for (const [index, line] of lines.entries()) {
    if (line.length > SECURITY_LIMITS.MAX_LINE_CHARS) {
      throw new SecurityValidationError(
        "LINE_TOO_LONG",
        `Questionnaire line ${index + 1} exceeds ${SECURITY_LIMITS.MAX_LINE_CHARS} characters.`
      );
    }
  }

  return sanitized;
}

export function sanitizeCaseTitle(input: unknown): string {
  const value = sanitizeTextInput(input ?? "Questionnaire cyber fournisseur", {
    fieldName: "case title",
    maxChars: SECURITY_LIMITS.MAX_CASE_TITLE_CHARS,
  });

  return value || "Questionnaire cyber fournisseur";
}

export function sanitizeMetadataField(input: unknown, fieldName: string): string | undefined {
  if (input === undefined || input === null || input === "") {
    return undefined;
  }

  return sanitizeTextInput(input, {
    fieldName,
    maxChars: SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS,
  });
}

export function assertQuestionCount(count: number): void {
  if (count > SECURITY_LIMITS.MAX_QUESTIONS) {
    throw new SecurityValidationError(
      "TOO_MANY_QUESTIONS",
      `Questionnaire contains ${count} questions. Maximum is ${SECURITY_LIMITS.MAX_QUESTIONS}.`
    );
  }
}

export function escapeCsvCell(input: unknown): string {
  let value = sanitizeTextInput(String(input ?? ""), {
    fieldName: "csv cell",
    maxChars: SECURITY_LIMITS.MAX_FIELD_CHARS,
  });

  if (CSV_FORMULA_PREFIX.test(value) || CSV_FORMULA_AFTER_SPACE.test(value)) {
    value = `'${value}`;
  }

  return value;
}

export function escapeMarkdown(input: unknown): string {
  const value = sanitizeTextInput(String(input ?? ""), {
    fieldName: "markdown field",
    maxChars: SECURITY_LIMITS.MAX_FIELD_CHARS,
  });

  return value
    .replace(/\\/g, "\\\\")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/`/g, "\\`")
    .replace(/\*/g, "\\*")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/#/g, "\\#")
    .replace(/\+/g, "\\+")
    .replace(/-/g, "\\-")
    .replace(/\./g, "\\.")
    .replace(/!/g, "\\!")
    .replace(/\|/g, "\\|");
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort();

  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const runtimeCrypto = (globalThis as unknown as { crypto?: Crypto }).crypto;
  const subtle = runtimeCrypto?.subtle;

  if (!subtle) {
    throw new SecurityValidationError(
      "WEB_CRYPTO_UNAVAILABLE",
      "Web Crypto API is required to generate a ProofPack fingerprint."
    );
  }

  const data = typeof input === "string" ? new TextEncoder().encode(input) : Uint8Array.from(input);
  const digest = await subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
