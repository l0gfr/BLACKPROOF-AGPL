import {
  SECURITY_LIMITS,
  SecurityValidationError,
  findQuestionnaireInvisibleFormatCharacters,
  sanitizeQuestionnaireInput,
  sanitizeTextInput,
} from "./security";

import { splitQuestionnaire } from "./questionnaire";

export const QUESTIONNAIRE_IMPORT_VERSION = "blackproof-questionnaire-import-v0.2.0-alpha";

export type QuestionnaireImportKind = "text" | "csv" | "tsv" | "xlsx";
export type QuestionnaireImportWarningSeverity = "info" | "warning";
export type QuestionnaireImportFileDecision =
  | { accepted: true; kind: QuestionnaireImportKind }
  | { accepted: false; code: "IMPORT_UNSUPPORTED_FILE_TYPE"; message: string };

export interface QuestionnaireImportWarning {
  code: string;
  severity: QuestionnaireImportWarningSeverity;
  message: string;
}

export interface QuestionnaireImportResult {
  version: string;
  kind: QuestionnaireImportKind;
  delimiter?: "," | ";" | "\t";
  selectedColumn?: number;
  selectedColumnName?: string;
  rowCount: number;
  columnCount: number;
  questionCount: number;
  questions: string[];
  normalizedQuestionnaire: string;
  warnings: QuestionnaireImportWarning[];
}

export interface QuestionnaireRowQuestionSource {
  question: string;
  rowIndex: number;
  columnIndex: number;
}

export interface QuestionnaireRowsImportWithSources {
  result: QuestionnaireImportResult;
  questionSources: QuestionnaireRowQuestionSource[];
}

const MAX_IMPORT_ROWS = 1_000;
const MAX_IMPORT_COLUMNS = 80;
const MIN_QUESTION_LENGTH = 8;
export const QUESTIONNAIRE_IMPORT_ALLOWED_EXTENSIONS = [".csv", ".tsv", ".txt", ".md", ".xlsx"] as const;

const QUESTION_HEADER_PATTERNS = [
  "question",
  "questions",
  "demande",
  "demande client",
  "exigence",
  "requirement",
  "control",
  "contrôle",
  "controle",
  "item",
  "description",
  "security question",
  "questionnaire",
];

const QUESTION_TEXT_HINTS = [
  "?",
  "avez-vous",
  "disposez-vous",
  "pouvez-vous",
  "êtes-vous",
  "etes-vous",
  "décrivez",
  "decrivez",
  "indiquez",
  "fournissez",
  "do you",
  "have you",
  "please describe",
  "provide",
  "mfa",
  "sauvegarde",
  "backup",
  "incident",
  "fournisseur",
  "supplier",
  "vulnérabilité",
  "vulnerability",
  "journaux",
  "logs",
  "pra",
  "pca",
];

function warning(code: string, message: string, severity: QuestionnaireImportWarningSeverity = "warning"): QuestionnaireImportWarning {
  return { code, severity, message };
}

function invisibleFormatWarnings(input: string): QuestionnaireImportWarning[] {
  const matches = findQuestionnaireInvisibleFormatCharacters(input);
  if (matches.length === 0) return [];

  const codePoints = [...new Set(matches.map((match) => match.codePoint))].join(", ");
  return [warning(
    "INVISIBLE_UNICODE_FORMAT_CHARACTERS",
    `${matches.length} caractère(s) de format Unicode invisible(s) détecté(s) (${codePoints}). La canonicalisation les conserve et ils peuvent influencer l’empreinte ; vérifiez le texte avant validation.`
  )];
}

export function classifyQuestionnaireImportFile(filename: string): QuestionnaireImportFileDecision {
  const normalizedFilename = sanitizeTextInput(filename, {
    fieldName: "import filename",
    maxChars: SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS,
  }).toLowerCase();

  if (normalizedFilename.endsWith(".xlsx")) return { accepted: true, kind: "xlsx" };

  if (normalizedFilename.endsWith(".csv")) return { accepted: true, kind: "csv" };
  if (normalizedFilename.endsWith(".tsv")) return { accepted: true, kind: "tsv" };
  if (normalizedFilename.endsWith(".txt") || normalizedFilename.endsWith(".md")) {
    return { accepted: true, kind: "text" };
  }

  return {
    accepted: false,
    code: "IMPORT_UNSUPPORTED_FILE_TYPE",
    message: "Format de fichier refusé. Formats autorisés : TXT, MD, CSV, TSV ou XLSX. XLS, XLSM, XLSB, XLAM et ODS sont refusés.",
  };
}

function sanitizeCell(value: unknown): string {
  return sanitizeTextInput(String(value ?? ""), {
    fieldName: "import cell",
    maxChars: SECURITY_LIMITS.MAX_FIELD_CHARS,
  });
}

function normalizeQuestion(value: string): string {
  return value
    .replace(/^\s*(?:[-*•]|\d+[\).:-]|q\d+[\).:-]?|question\s+\d+[\).:-]?)\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreQuestionLikeText(value: string): number {
  const text = value.toLowerCase().trim();

  if (text.length < MIN_QUESTION_LENGTH) return -5;

  let score = 0;

  if (text.includes("?")) score += 4;
  if (text.length >= 20) score += 1;
  if (text.length >= 80) score += 1;

  for (const hint of QUESTION_TEXT_HINTS) {
    if (text.includes(hint)) score += 1;
  }

  return score;
}

function looksLikeHeaderCell(value: string): boolean {
  const text = value.toLowerCase().trim();

  return QUESTION_HEADER_PATTERNS.some((pattern) => text === pattern || text.includes(pattern));
}

function detectDelimiter(input: string): "," | ";" | "\t" {
  const sample = input.split("\n").slice(0, 10).join("\n");

  const counts = {
    comma: (sample.match(/,/g) ?? []).length,
    semicolon: (sample.match(/;/g) ?? []).length,
    tab: (sample.match(/\t/g) ?? []).length,
  };

  if (counts.tab >= counts.comma && counts.tab >= counts.semicolon && counts.tab > 0) return "\t";
  if (counts.semicolon >= counts.comma && counts.semicolon > 0) return ";";

  return ",";
}

export function parseDelimitedRows(input: string, delimiter: "," | ";" | "\t"): string[][] {
  const sanitized = sanitizeQuestionnaireInput(input);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let insideQuotes = false;

  for (let index = 0; index < sanitized.length; index += 1) {
    const char = sanitized[index];
    const next = sanitized[index + 1];

    if (char === "\"") {
      if (insideQuotes && next === "\"") {
        cell += "\"";
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (!insideQuotes && char === delimiter) {
      row.push(sanitizeCell(cell));
      cell = "";
      continue;
    }

    if (!insideQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      row.push(sanitizeCell(cell));
      cell = "";

      if (row.some((value) => value.trim())) {
        rows.push(row);
      }

      row = [];

      if (rows.length > MAX_IMPORT_ROWS) {
        throw new SecurityValidationError(
          "IMPORT_TOO_MANY_ROWS",
          `Import exceeds ${MAX_IMPORT_ROWS} rows.`
        );
      }

      continue;
    }

    cell += char;
  }

  if (insideQuotes) {
    throw new SecurityValidationError(
      "IMPORT_UNTERMINATED_QUOTED_FIELD",
      "Import contains an unterminated quoted field."
    );
  }

  row.push(sanitizeCell(cell));

  if (row.some((value) => value.trim())) {
    rows.push(row);
  }

  if (rows.length > MAX_IMPORT_ROWS) {
    throw new SecurityValidationError(
      "IMPORT_TOO_MANY_ROWS",
      `Import exceeds ${MAX_IMPORT_ROWS} rows.`
    );
  }

  for (const currentRow of rows) {
    if (currentRow.length > MAX_IMPORT_COLUMNS) {
      throw new SecurityValidationError(
        "IMPORT_TOO_MANY_COLUMNS",
        `Import exceeds ${MAX_IMPORT_COLUMNS} columns.`
      );
    }
  }

  return rows;
}

function detectHeaderRow(rows: string[][]): boolean {
  const firstRow = rows[0];

  if (!firstRow) return false;

  return firstRow.some(looksLikeHeaderCell);
}

function selectQuestionColumn(rows: string[][], hasHeader: boolean): {
  selectedColumn: number;
  selectedColumnName?: string;
  warnings: QuestionnaireImportWarning[];
} {
  const warnings: QuestionnaireImportWarning[] = [];
  const header = hasHeader ? rows[0] ?? [] : [];
  const body = hasHeader ? rows.slice(1) : rows;
  const maxColumns = Math.max(...rows.map((row) => row.length), 0);

  let bestColumn = 0;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let column = 0; column < maxColumns; column += 1) {
    let score = 0;
    const headerCell = header[column] ?? "";

    if (looksLikeHeaderCell(headerCell)) {
      score += 50;
    }

    for (const row of body.slice(0, 100)) {
      score += scoreQuestionLikeText(row[column] ?? "");
    }

    if (score > bestScore) {
      bestScore = score;
      bestColumn = column;
    }
  }

  if (bestScore < 0) {
    warnings.push(
      warning(
        "LOW_COLUMN_CONFIDENCE",
        "Aucune colonne ne ressemble fortement à une colonne de questions. Revue humaine nécessaire."
      )
    );
  }

  return {
    selectedColumn: bestColumn,
    selectedColumnName: hasHeader ? header[bestColumn] : undefined,
    warnings,
  };
}

function deduplicateQuestions(questions: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const question of questions) {
    const key = question.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    output.push(question);
  }

  return output;
}

function normalizeQuestionsToQuestionnaire(questions: string[]): string {
  return questions.map((question, index) => `${index + 1}. ${question}`).join("\n");
}

export function importQuestionnaireText(input: string): QuestionnaireImportResult {
  const sanitized = sanitizeQuestionnaireInput(input);
  const questions = deduplicateQuestions(splitQuestionnaire(sanitized));

  return {
    version: QUESTIONNAIRE_IMPORT_VERSION,
    kind: "text",
    rowCount: questions.length,
    columnCount: 1,
    questionCount: questions.length,
    questions,
    normalizedQuestionnaire: normalizeQuestionsToQuestionnaire(questions),
    warnings: [
      ...invisibleFormatWarnings(input),
      ...(questions.length === 0
        ? [warning("NO_QUESTIONS_FOUND", "Aucune question détectée dans le texte fourni.")]
        : []),
    ],
  };
}

export function importQuestionnaireDelimited(
  input: string,
  options: {
    kind: "csv" | "tsv";
    delimiter?: "," | ";" | "\t";
  }
): QuestionnaireImportResult {
  const delimiter = options.delimiter ?? (options.kind === "tsv" ? "\t" : detectDelimiter(input));
  const rows = parseDelimitedRows(input, delimiter);
  return importQuestionnaireRows(rows, { kind: options.kind, delimiter });
}

export function importQuestionnaireRowsWithSources(
  rows: string[][],
  options: {
    kind: "csv" | "tsv" | "xlsx";
    delimiter?: "," | ";" | "\t";
  }
): QuestionnaireRowsImportWithSources {
  const hasHeader = detectHeaderRow(rows);
  const { selectedColumn, selectedColumnName, warnings } = selectQuestionColumn(rows, hasHeader);
  warnings.unshift(...invisibleFormatWarnings(rows.flat().join("\n")));
  const body = hasHeader ? rows.slice(1) : rows;
  const firstBodyRowIndex = hasHeader ? 1 : 0;
  const seen = new Set<string>();
  const questionSources: QuestionnaireRowQuestionSource[] = [];
  for (const [bodyRowIndex, row] of body.entries()) {
    const value = normalizeQuestion(row[selectedColumn] ?? "");
    if (value.length < MIN_QUESTION_LENGTH) continue;
    for (const question of splitQuestionnaire(value)) {
      const key = question.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      questionSources.push({ question, rowIndex: firstBodyRowIndex + bodyRowIndex, columnIndex: selectedColumn });
    }
  }
  const questions = questionSources.map((source) => source.question);

  if (questions.length > SECURITY_LIMITS.MAX_QUESTIONS) {
    throw new SecurityValidationError(
      "TOO_MANY_QUESTIONS",
      `Import contains ${questions.length} questions. Maximum is ${SECURITY_LIMITS.MAX_QUESTIONS}.`
    );
  }

  if (questions.length === 0) {
    warnings.push(
      warning("NO_QUESTIONS_FOUND", "Aucune question détectée dans la colonne sélectionnée.")
    );
  }

  return { result: {
    version: QUESTIONNAIRE_IMPORT_VERSION,
    kind: options.kind,
    ...(options.delimiter ? { delimiter: options.delimiter } : {}),
    selectedColumn,
    selectedColumnName,
    rowCount: rows.length,
    columnCount: Math.max(...rows.map((row) => row.length), 0),
    questionCount: questions.length,
    questions,
    normalizedQuestionnaire: normalizeQuestionsToQuestionnaire(questions),
    warnings,
  }, questionSources };
}

export function importQuestionnaireRows(
  rows: string[][],
  options: {
    kind: "csv" | "tsv" | "xlsx";
    delimiter?: "," | ";" | "\t";
  }
): QuestionnaireImportResult {
  return importQuestionnaireRowsWithSources(rows, options).result;
}

export function importQuestionnaireCsv(input: string): QuestionnaireImportResult {
  return importQuestionnaireDelimited(input, { kind: "csv" });
}

export function importQuestionnaireTsv(input: string): QuestionnaireImportResult {
  return importQuestionnaireDelimited(input, { kind: "tsv", delimiter: "\t" });
}
