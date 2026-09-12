import { QUESTIONNAIRE_IMPORT_VERSION, SECURITY_LIMITS, SOURCE_IMPORT_V1_SCHEMA_SHA256, SOURCE_IMPORT_V1_SCHEMA_URL } from "@blackproof/core";
import { apiEnvelope, jsonResponse } from "../../lib/api-response";
import {
  XLSX_IMPORT_LIMITS,
  XLSX_IMPORT_VERSION,
  XLSX_ACCEPTED_MIME_TYPES,
  XLSX_REFUSED_EXTENSIONS,
} from "../../lib/xlsx-contract";

export const prerender = true;

export function GET() {
  return jsonResponse(apiEnvelope("questionnaire-import-contract", {
    version: XLSX_IMPORT_VERSION,
    questionnaireImportVersion: QUESTIONNAIRE_IMPORT_VERSION,
    processing: {
      location: "browser-local",
      networkUpload: false,
      isolatedParser: true,
      terminationOnTimeout: true,
      formulasExecuted: false,
    },
    accepted: {
      extensions: [".txt", ".md", ".csv", ".tsv", ".xlsx"],
      xlsx: {
        extension: ".xlsx",
        mimeTypes: XLSX_ACCEPTED_MIME_TYPES,
        mimePolicy: "MIME is a compatibility hint only. The .xlsx extension, ZIP signature, bounded ZIP inventory and standard OOXML workbook structure remain mandatory.",
        zipSignatureRequired: true,
      },
    },
    refused: {
      spreadsheetExtensions: XLSX_REFUSED_EXTENSIONS,
      activeXlsxParts: ["VBA", "OLE embeddings", "ActiveX", "custom UI"],
    },
    zipPreflight: {
      profile: "blackproof-xlsx-zip-v1",
      maxCompressedBytes: XLSX_IMPORT_LIMITS.maxCompressedBytes,
      maxExpandedBytes: XLSX_IMPORT_LIMITS.maxExpandedBytes,
      maxEntries: XLSX_IMPORT_LIMITS.maxEntries,
      maxCompressionRatio: XLSX_IMPORT_LIMITS.maxCompressionRatio,
      maxSharedStringsBytes: XLSX_IMPORT_LIMITS.maxSharedStringsBytes,
      maxWorksheetBytes: XLSX_IMPORT_LIMITS.maxWorksheetBytes,
      rejects: ["absolute paths", "parent traversal", "duplicate entries", "encrypted entries", "ZIP64", "overlapping entries"],
      acceptsWhenStructurallyValid: ["ZIP extra fields", "ZIP data descriptors"],
    },
    workbookLimits: {
      maxSheets: XLSX_IMPORT_LIMITS.maxSheets,
      maxRowsPerSheet: XLSX_IMPORT_LIMITS.maxRowsPerSheet,
      maxColumnsPerSheet: XLSX_IMPORT_LIMITS.maxColumnsPerSheet,
      maxNonEmptyCells: XLSX_IMPORT_LIMITS.maxNonEmptyCells,
      maxCellCharacters: XLSX_IMPORT_LIMITS.maxCellCharacters,
      maxQuestions: Math.min(XLSX_IMPORT_LIMITS.maxQuestions, SECURITY_LIMITS.MAX_QUESTIONS),
      processingTimeoutMs: XLSX_IMPORT_LIMITS.workerTimeoutMs,
    },
    extraction: {
      imports: ["visible sheet names", "text cell values", "question column candidates", "cached formula values when present"],
      ignores: ["styles", "images", "charts", "comments", "external links", "data connections", "pivot tables", "hidden sheets"],
      formulaPolicy: "Never execute formulas. A parser may retain an already-cached value; formula cells without one are empty and reported.",
      questionSourceLabels: ["literal-cell", "cached-formula-value"],
      externalSurfaceCounters: ["externalLink OOXML parts", "TargetMode=External relationships", "connections.xml parts", "queryTable parts"],
      requiresHumanSheetConfirmation: true,
    },
    provenance: {
      originalFilenameRetained: true,
      originalFileSha256Retained: true,
      normalizedQuestionnaireSha256Retained: true,
      localSourceImportRetained: true,
      masterZipSourceImportSidecar: "source-import.json",
      sourceImportProfile: XLSX_IMPORT_VERSION,
      sourceImportSchema: SOURCE_IMPORT_V1_SCHEMA_URL,
      sourceImportSchemaSha256: SOURCE_IMPORT_V1_SCHEMA_SHA256,
      verificationScope: "Internal sidecar consistency only unless the original XLSX is also supplied and replayed by a compatible verifier.",
    },
  }));
}
