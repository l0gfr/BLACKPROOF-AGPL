import { XLSX_SOURCE_IMPORT_LIMITS, XLSX_SOURCE_IMPORT_PROFILE } from "@blackproof/core";

export const XLSX_IMPORT_VERSION = XLSX_SOURCE_IMPORT_PROFILE;
export const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" as const;
export const XLSX_ACCEPTED_MIME_TYPES = [
  XLSX_MIME_TYPE,
  "",
  "application/octet-stream",
  "application/zip",
] as const;

export const XLSX_IMPORT_LIMITS = {
  maxCompressedBytes: 10_000_000,
  maxExpandedBytes: 50_000_000,
  maxEntries: XLSX_SOURCE_IMPORT_LIMITS.maxArchiveEntries,
  maxCompressionRatio: 100,
  maxSharedStringsBytes: 10_000_000,
  maxWorksheetBytes: 8_000_000,
  maxSheets: XLSX_SOURCE_IMPORT_LIMITS.maxSheets,
  maxRowsPerSheet: XLSX_SOURCE_IMPORT_LIMITS.maxRowsPerSheet,
  maxColumnsPerSheet: XLSX_SOURCE_IMPORT_LIMITS.maxColumnsPerSheet,
  maxNonEmptyCells: XLSX_SOURCE_IMPORT_LIMITS.maxNonEmptyCellsPerSheet,
  maxCellCharacters: XLSX_SOURCE_IMPORT_LIMITS.maxCellCharacters,
  maxQuestions: 250,
  workerTimeoutMs: 12_000,
} as const;

export const XLSX_REFUSED_EXTENSIONS = [".xls", ".xlsm", ".xlsb", ".xlam", ".ods"] as const;
