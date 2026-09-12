import type { ProofPack, ProofPackQuestionnaireSource } from "./types";
import { SECURITY_LIMITS, stableStringify } from "./security";

export const SOURCE_IMPORT_FORMAT_VERSION = "blackproof-source-import-v1" as const;
export const XLSX_SOURCE_IMPORT_PROFILE = "blackproof-xlsx-import-v1" as const;
export const SOURCE_LINEAGE_FORMAT_VERSION = "blackproof-source-lineage-v1" as const;
export const XLSX_SOURCE_IMPORT_LIMITS = {
  maxSheets: 10,
  maxArchiveEntries: 256,
  maxRowsPerSheet: 10_000,
  maxColumnsPerSheet: 100,
  maxNonEmptyCellsPerSheet: 50_000,
  maxCellCharacters: 10_000,
  maxFormulaCells: 500_000,
  maxWarnings: 100,
  maxWarningCharacters: 1_000,
  maxSheetNameCharacters: 128,
} as const;

export interface ProofPackXlsxQuestionSource {
  question: string;
  source: "literal-cell" | "cached-formula-value";
  cellReference: string;
}

export interface ProofPackSourceImport {
  profile: typeof XLSX_SOURCE_IMPORT_PROFILE;
  sourceFormat: "xlsx";
  selectedSheet: string;
  selectedColumn: number;
  selectedColumnName?: string;
  formulaCount: number;
  formulaWithoutCachedValueCount: number;
  hiddenSheetCount: number;
  externalLinkPartCount: number;
  externalRelationshipCount: number;
  connectionPartCount: number;
  queryTablePartCount: number;
  warnings: string[];
  questionSources: ProofPackXlsxQuestionSource[];
  ignoredFormulaCells: string[];
}

export interface ProofPackSourceImportFile extends ProofPackSourceImport {
  formatVersion: typeof SOURCE_IMPORT_FORMAT_VERSION;
  caseId: string;
  sourceQuestionnaire: ProofPackQuestionnaireSource;
}

export interface ProofPackSourceLineage {
  formatVersion: typeof SOURCE_LINEAGE_FORMAT_VERSION;
  derivation: "xlsx-text-edit";
  originalFileName: string;
  originalFileSha256: string;
  originalImportProfile: typeof XLSX_SOURCE_IMPORT_PROFILE;
  previousProofPackFingerprint: string;
  derivedSourceFileName: string;
  derivedSourceSha256: string;
  derivedAt: string;
}

export function assertProofPackSourceLineage(value: unknown): asserts value is ProofPackSourceLineage {
  if (!isRecord(value)
    || Object.keys(value).sort().join("|") !== "derivation|derivedAt|derivedSourceFileName|derivedSourceSha256|formatVersion|originalFileName|originalFileSha256|originalImportProfile|previousProofPackFingerprint"
    || value.formatVersion !== SOURCE_LINEAGE_FORMAT_VERSION
    || value.derivation !== "xlsx-text-edit"
    || typeof value.originalFileName !== "string" || !value.originalFileName.toLowerCase().endsWith(".xlsx")
    || typeof value.originalFileSha256 !== "string" || !/^sha256:[a-f0-9]{64}$/.test(value.originalFileSha256)
    || value.originalImportProfile !== XLSX_SOURCE_IMPORT_PROFILE
    || typeof value.previousProofPackFingerprint !== "string" || !/^bp_sha256_[a-f0-9]{64}$/.test(value.previousProofPackFingerprint)
    || typeof value.derivedSourceFileName !== "string" || !value.derivedSourceFileName.toLowerCase().endsWith(".txt")
    || typeof value.derivedSourceSha256 !== "string" || !/^sha256:[a-f0-9]{64}$/.test(value.derivedSourceSha256)
    || typeof value.derivedAt !== "string" || Number.isNaN(Date.parse(value.derivedAt))) {
    fail("SOURCE_LINEAGE_INVALID", "Derived XLSX source lineage is invalid.");
  }
}

export class ProofPackSourceImportValidationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = "ProofPackSourceImportValidationError";
  }
}

export function normalizeSourceImportQuestion(value: string): string {
  return value
    .replace(/^\s*(?:[-*•]|\d+[\).:-]|q\d+[\).:-]?|question\s+\d+[\).:-]?)\s*/i, "")
    .trim();
}

export function buildSourceImportNormalizedQuestionnaire(
  questionSources: ReadonlyArray<Pick<ProofPackXlsxQuestionSource, "question">>,
): string {
  return questionSources
    .map((item, index) => `${index + 1}. ${normalizeSourceImportQuestion(item.question)}`)
    .join("\n");
}

function fail(code: string, message: string): never {
  throw new ProofPackSourceImportValidationError(code, message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function integerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && (value as number) >= minimum && (value as number) <= maximum;
}

function columnNumber(reference: string): number {
  const letters = /^([A-Z]{1,3})[1-9][0-9]*$/.exec(reference)?.[1];
  if (!letters) return 0;
  let column = 0;
  for (const character of letters) column = column * 26 + character.charCodeAt(0) - 64;
  return column;
}

function rowNumber(reference: string): number {
  return Number(/[1-9][0-9]*$/.exec(reference)?.[0] ?? 0);
}

function assertQuestionnaireSource(value: unknown): asserts value is ProofPackQuestionnaireSource {
  if (!isRecord(value)
    || typeof value.fileName !== "string" || !value.fileName.toLowerCase().endsWith(".xlsx")
    || value.format !== "unknown"
    || typeof value.originalFileSha256 !== "string" || !/^sha256:[a-f0-9]{64}$/.test(value.originalFileSha256)) {
    fail("SOURCE_IMPORT_XLSX_SOURCE_INVALID", "The linked questionnaire must be a legacy-v3 .xlsx source with an original SHA-256.");
  }
}

export function assertProofPackSourceImport(value: unknown, options: { file?: boolean } = {}): asserts value is ProofPackSourceImport | ProofPackSourceImportFile {
  if (!isRecord(value)) fail("SOURCE_IMPORT_NOT_OBJECT", "Source import provenance must be an object.");
  const file = options.file === true;
  const allowed = new Set([
    "profile", "sourceFormat", "selectedSheet", "selectedColumn", "selectedColumnName", "formulaCount",
    "formulaWithoutCachedValueCount", "hiddenSheetCount", "externalLinkPartCount", "externalRelationshipCount",
    "connectionPartCount", "queryTablePartCount", "warnings", "questionSources", "ignoredFormulaCells",
    ...(file ? ["formatVersion", "caseId", "sourceQuestionnaire"] : []),
  ]);
  const unexpected = Object.keys(value).find((key) => !allowed.has(key));
  if (unexpected) fail("SOURCE_IMPORT_ADDITIONAL_FIELD", `Unexpected field: ${unexpected}.`);
  if (value.profile !== XLSX_SOURCE_IMPORT_PROFILE || value.sourceFormat !== "xlsx") {
    fail("SOURCE_IMPORT_PROFILE_INVALID", "The source import profile or format is unsupported.");
  }
  if (typeof value.selectedSheet !== "string" || value.selectedSheet.length < 1 || value.selectedSheet.length > XLSX_SOURCE_IMPORT_LIMITS.maxSheetNameCharacters) {
    fail("SOURCE_IMPORT_SHEET_INVALID", "The selected sheet name is invalid.");
  }
  if (!integerInRange(value.selectedColumn, 1, XLSX_SOURCE_IMPORT_LIMITS.maxColumnsPerSheet)) {
    fail("SOURCE_IMPORT_COLUMN_INVALID", "The selected column is outside the XLSX profile bounds.");
  }
  if (value.selectedColumnName !== undefined && (typeof value.selectedColumnName !== "string" || value.selectedColumnName.length > XLSX_SOURCE_IMPORT_LIMITS.maxCellCharacters)) {
    fail("SOURCE_IMPORT_COLUMN_NAME_INVALID", "The selected column name is outside the XLSX cell bounds.");
  }
  const countBounds = {
    formulaCount: XLSX_SOURCE_IMPORT_LIMITS.maxFormulaCells,
    formulaWithoutCachedValueCount: XLSX_SOURCE_IMPORT_LIMITS.maxFormulaCells,
    hiddenSheetCount: XLSX_SOURCE_IMPORT_LIMITS.maxSheets,
    externalLinkPartCount: XLSX_SOURCE_IMPORT_LIMITS.maxArchiveEntries,
    externalRelationshipCount: XLSX_SOURCE_IMPORT_LIMITS.maxFormulaCells,
    connectionPartCount: XLSX_SOURCE_IMPORT_LIMITS.maxArchiveEntries,
    queryTablePartCount: XLSX_SOURCE_IMPORT_LIMITS.maxArchiveEntries,
  } as const;
  for (const [field, maximum] of Object.entries(countBounds)) {
    if (!integerInRange(value[field], 0, maximum)) fail("SOURCE_IMPORT_COUNT_INVALID", `${field} is outside the profile bounds.`);
  }
  if ((value.formulaWithoutCachedValueCount as number) > (value.formulaCount as number)) {
    fail("SOURCE_IMPORT_FORMULA_COUNTS_INVALID", "Formula cells without cached values cannot exceed all formula cells.");
  }
  if (!Array.isArray(value.warnings) || value.warnings.length > XLSX_SOURCE_IMPORT_LIMITS.maxWarnings
    || value.warnings.some((warning) => typeof warning !== "string" || warning.length > XLSX_SOURCE_IMPORT_LIMITS.maxWarningCharacters)) {
    fail("SOURCE_IMPORT_WARNINGS_INVALID", "Warnings violate the bounded profile.");
  }
  if (!Array.isArray(value.questionSources) || value.questionSources.length < 1 || value.questionSources.length > SECURITY_LIMITS.MAX_QUESTIONS) {
    fail("SOURCE_IMPORT_QUESTION_SOURCES_INVALID", "Question sources must be a non-empty bounded array.");
  }
  const questionKeys = new Set<string>();
  const importedCells = new Set<string>();
  let cachedFormulaQuestionCount = 0;
  for (const source of value.questionSources) {
    if (!isRecord(source) || Object.keys(source).sort().join("|") !== "cellReference|question|source"
      || typeof source.question !== "string" || source.question.length < 1 || source.question.length > SECURITY_LIMITS.MAX_FIELD_CHARS
      || (source.source !== "literal-cell" && source.source !== "cached-formula-value")
      || typeof source.cellReference !== "string" || !/^[A-Z]{1,3}[1-9][0-9]*$/.test(source.cellReference)
      || columnNumber(source.cellReference) !== value.selectedColumn
      || rowNumber(source.cellReference) > XLSX_SOURCE_IMPORT_LIMITS.maxRowsPerSheet) {
      fail("SOURCE_IMPORT_QUESTION_SOURCE_INVALID", "A question source is invalid or does not belong to the selected column.");
    }
    const questionKey = source.question.toLowerCase();
    if (questionKeys.has(questionKey)) fail("SOURCE_IMPORT_DUPLICATE_QUESTION", "Question sources must be unique and ordered.");
    if (importedCells.has(source.cellReference)) fail("SOURCE_IMPORT_DUPLICATE_CELL", "Imported cell references must be unique.");
    questionKeys.add(questionKey);
    importedCells.add(source.cellReference);
    if (source.source === "cached-formula-value") cachedFormulaQuestionCount += 1;
  }
  if (cachedFormulaQuestionCount > (value.formulaCount as number)) {
    fail("SOURCE_IMPORT_CACHED_FORMULA_COUNT_INVALID", "Cached formula questions cannot exceed all formula cells.");
  }
  if (!Array.isArray(value.ignoredFormulaCells) || value.ignoredFormulaCells.length > XLSX_SOURCE_IMPORT_LIMITS.maxFormulaCells) {
    fail("SOURCE_IMPORT_IGNORED_FORMULAS_INVALID", "Ignored formula cells violate the bounded profile.");
  }
  const ignoredCells = new Set<string>();
  for (const reference of value.ignoredFormulaCells) {
    if (typeof reference !== "string" || !/^[A-Z]{1,3}[1-9][0-9]*$/.test(reference)
      || columnNumber(reference) > XLSX_SOURCE_IMPORT_LIMITS.maxColumnsPerSheet
      || rowNumber(reference) > XLSX_SOURCE_IMPORT_LIMITS.maxRowsPerSheet
      || ignoredCells.has(reference) || importedCells.has(reference)) {
      fail("SOURCE_IMPORT_IGNORED_FORMULA_CELL_INVALID", "An ignored formula cell is invalid, duplicated or also imported.");
    }
    ignoredCells.add(reference);
  }
  if (ignoredCells.size > (value.formulaWithoutCachedValueCount as number)) {
    fail("SOURCE_IMPORT_IGNORED_FORMULA_COUNT_INVALID", "Ignored formula cells cannot exceed formula cells without cached values.");
  }
  if (file) {
    if (value.formatVersion !== SOURCE_IMPORT_FORMAT_VERSION || typeof value.caseId !== "string" || value.caseId.length < 1) {
      fail("SOURCE_IMPORT_FILE_HEADER_INVALID", "The source import file header is invalid.");
    }
    assertQuestionnaireSource(value.sourceQuestionnaire);
  }
}

export function assertProofPackSourceImportLink(
  proofpack: Pick<ProofPack, "questions" | "sourceQuestionnaire">,
  sourceImport: ProofPackSourceImport | ProofPackSourceImportFile,
): void {
  assertProofPackSourceImport(sourceImport, { file: "formatVersion" in sourceImport });
  if (!proofpack.sourceQuestionnaire.fileName.toLowerCase().endsWith(".xlsx")) {
    fail("SOURCE_IMPORT_LINK_NON_XLSX", "The linked ProofPack source is not an XLSX file.");
  }
  if ("sourceQuestionnaire" in sourceImport
    && stableStringify(sourceImport.sourceQuestionnaire) !== stableStringify(proofpack.sourceQuestionnaire)) {
    fail("SOURCE_IMPORT_LINK_SOURCE_MISMATCH", "The sidecar source provenance does not match the ProofPack.");
  }
  if (sourceImport.questionSources.length !== proofpack.questions.length
    || sourceImport.questionSources.some((item, index) => normalizeSourceImportQuestion(item.question) !== normalizeSourceImportQuestion(proofpack.questions[index]?.text ?? ""))) {
    fail("SOURCE_IMPORT_LINK_QUESTION_MISMATCH", "The sidecar questions do not match the ProofPack exactly.");
  }
}
