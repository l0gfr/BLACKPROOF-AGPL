import { importQuestionnaireRowsWithSources, type QuestionnaireImportResult } from "@blackproof/core";
import { unzipSync } from "fflate";
import readXlsxFile from "read-excel-file/web-worker";

import { XLSX_IMPORT_LIMITS, XLSX_IMPORT_VERSION } from "./xlsx-contract";

export interface XlsxSheetAnalysis {
  name: string;
  result: QuestionnaireImportResult;
  questionSources: XlsxQuestionSource[];
  ignoredFormulaCells: string[];
}

export interface XlsxQuestionSource {
  question: string;
  source: "literal-cell" | "cached-formula-value";
  cellReference: string;
}

export interface XlsxSurfaceInventory {
  externalLinkPartCount: number;
  connectionPartCount: number;
  queryTablePartCount: number;
}

export interface XlsxAnalysisResult {
  version: typeof XLSX_IMPORT_VERSION;
  sheets: XlsxSheetAnalysis[];
  hiddenSheetCount: number;
  formulaCount: number;
  formulaWithoutCachedValueCount: number;
  externalLinkPartCount: number;
  externalRelationshipCount: number;
  connectionPartCount: number;
  queryTablePartCount: number;
}

function decodeXml(bytes: Uint8Array, path: string): string {
  let xml: string;
  try {
    xml = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`XLSX_XML_ENCODING_INVALID: ${path}.`);
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error(`XLSX_XML_DTD_REFUSED: ${path}.`);
  return xml;
}

function xmlTags(xml: string, localName: string): string[] {
  const expression = new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?${localName}\\b[^>]*>`, "gi");
  return xml.match(expression) ?? [];
}

function xmlAttribute(tag: string, name: string): string | undefined {
  const expression = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])(.*?)\\1`, "is");
  return expression.exec(tag)?.[2];
}

function inspectWorkbookXml(files: Record<string, Uint8Array>): {
  sheetStates: Array<"visible" | "hidden" | "veryHidden">;
  formulaCount: number;
  formulaWithoutCachedValueCount: number;
  formulaCellsBySheet: Record<string, string[]>;
  formulaWithoutCachedValueCellsBySheet: Record<string, string[]>;
  externalRelationshipCount: number;
} {
  for (const [path, bytes] of Object.entries(files)) decodeXml(bytes, path);
  const contentTypesBytes = files["[Content_Types].xml"];
  if (!contentTypesBytes) throw new Error("XLSX_REQUIRED_PART_MISSING: [Content_Types].xml.");
  const contentTypesXml = decodeXml(contentTypesBytes, "[Content_Types].xml");
  if (!contentTypesXml.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml")) {
    throw new Error("XLSX_CONTENT_TYPE_REFUSED: le paquet n’est pas un classeur .xlsx standard.");
  }
  if (/macroEnabled|vbaProject|activeX|application\/vnd\.openxmlformats-officedocument\.oleObject/i.test(contentTypesXml)) {
    throw new Error("XLSX_ACTIVE_CONTENT_REFUSED: type de contenu actif déclaré.");
  }
  let externalRelationshipCount = 0;
  for (const [path, bytes] of Object.entries(files)) {
    if (!path.endsWith(".rels")) continue;
    const relationshipsXml = decodeXml(bytes, path);
    const relationshipTags = xmlTags(relationshipsXml, "Relationship");
    const activeRelationship = relationshipTags.find((tag) => /\/(?:oleObject|package|activeX|control)$/i.test(xmlAttribute(tag, "Type") ?? ""));
    if (activeRelationship) throw new Error(`XLSX_ACTIVE_CONTENT_REFUSED: relation d’objet intégré déclarée dans ${path}.`);
    externalRelationshipCount += relationshipTags.filter((tag) => (xmlAttribute(tag, "TargetMode") ?? "").toLowerCase() === "external").length;
  }
  const workbookBytes = files["xl/workbook.xml"];
  if (!workbookBytes) throw new Error("XLSX_REQUIRED_PART_MISSING: xl/workbook.xml.");
  const workbookXml = decodeXml(workbookBytes, "xl/workbook.xml");
  const sheetTags = xmlTags(workbookXml, "sheet");
  const sheetStates = sheetTags.map((sheet) => {
    const state = xmlAttribute(sheet, "state");
    return state === "hidden" || state === "veryHidden" ? state : "visible";
  });
  const workbookRelationshipsBytes = files["xl/_rels/workbook.xml.rels"];
  if (!workbookRelationshipsBytes) throw new Error("XLSX_REQUIRED_PART_MISSING: xl/_rels/workbook.xml.rels.");
  const workbookRelationshipsXml = decodeXml(workbookRelationshipsBytes, "xl/_rels/workbook.xml.rels");
  const worksheetTargets = new Map<string, string>();
  for (const relationship of xmlTags(workbookRelationshipsXml, "Relationship")) {
    if (!/\/worksheet$/i.test(xmlAttribute(relationship, "Type") ?? "")) continue;
    const id = xmlAttribute(relationship, "Id");
    const target = xmlAttribute(relationship, "Target");
    if (!id || !target) continue;
    const normalized = target.startsWith("/xl/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
    if (!/^xl\/worksheets\/[^/]+\.xml$/i.test(normalized)) throw new Error("XLSX_WORKSHEET_RELATIONSHIP_INVALID.");
    worksheetTargets.set(id, normalized);
  }
  const worksheetNamesByPath = new Map<string, string>();
  for (const sheet of sheetTags) {
    const name = xmlAttribute(sheet, "name");
    const relationshipId = xmlAttribute(sheet, "r:id");
    const target = relationshipId ? worksheetTargets.get(relationshipId) : undefined;
    if (!name || !target || worksheetNamesByPath.has(target) || [...worksheetNamesByPath.values()].includes(name)) {
      throw new Error("XLSX_SHEET_RELATIONSHIP_INVALID.");
    }
    worksheetNamesByPath.set(target, name);
  }

  let formulaCount = 0;
  let formulaWithoutCachedValueCount = 0;
  const formulaCellsBySheet: Record<string, string[]> = {};
  const formulaWithoutCachedValueCellsBySheet: Record<string, string[]> = {};
  for (const [path, bytes] of Object.entries(files)) {
    if (!/^xl\/worksheets\/[^/]+\.xml$/i.test(path)) continue;
    const worksheetXml = decodeXml(bytes, path);
    assertWorksheetBounds(worksheetXml, path);
    const formulas = xmlTags(worksheetXml, "f");
    formulaCount += formulas.length;
    const formulaCells: string[] = [];
    const formulaWithoutCachedValueCells: string[] = [];
    let formulasInCells = 0;
    const cellBlocks = worksheetXml.match(/<(?:[A-Za-z_][\w.-]*:)?c\b[^>]*>[\s\S]*?<\/(?:[A-Za-z_][\w.-]*:)?c\s*>/gi) ?? [];
    for (const cell of cellBlocks) {
      const cellFormulaCount = xmlTags(cell, "f").length;
      formulasInCells += cellFormulaCount;
      if (cellFormulaCount > 0) {
        const cellTag = xmlTags(cell, "c")[0];
        const reference = cellTag ? xmlAttribute(cellTag, "r") : undefined;
        if (reference) formulaCells.push(reference.toUpperCase());
        if (xmlTags(cell, "v").length === 0) {
          formulaWithoutCachedValueCount += cellFormulaCount;
          if (reference) formulaWithoutCachedValueCells.push(reference.toUpperCase());
        }
      }
    }
    formulaWithoutCachedValueCount += Math.max(0, formulas.length - formulasInCells);
    const sheetName = worksheetNamesByPath.get(path);
    if (!sheetName) throw new Error(`XLSX_SHEET_RELATIONSHIP_INVALID: ${path}.`);
    formulaCellsBySheet[sheetName] = formulaCells;
    formulaWithoutCachedValueCellsBySheet[sheetName] = formulaWithoutCachedValueCells;
  }
  return { sheetStates, formulaCount, formulaWithoutCachedValueCount, formulaCellsBySheet, formulaWithoutCachedValueCellsBySheet, externalRelationshipCount };
}

function columnNumber(reference: string): number {
  let column = 0;
  for (const char of reference) column = column * 26 + char.charCodeAt(0) - 64;
  return column;
}

function assertCellReference(reference: string, path: string): void {
  const match = /^([A-Z]{1,3})([1-9][0-9]*)$/i.exec(reference);
  if (!match) throw new Error(`XLSX_CELL_REFERENCE_INVALID: ${path}, ${reference}.`);
  const column = columnNumber(match[1]!.toUpperCase());
  const row = Number(match[2]);
  if (column > XLSX_IMPORT_LIMITS.maxColumnsPerSheet) {
    throw new Error(`XLSX_COLUMN_LIMIT_EXCEEDED: ${path}, maximum ${XLSX_IMPORT_LIMITS.maxColumnsPerSheet}.`);
  }
  if (row > XLSX_IMPORT_LIMITS.maxRowsPerSheet) {
    throw new Error(`XLSX_ROW_LIMIT_EXCEEDED: ${path}, maximum ${XLSX_IMPORT_LIMITS.maxRowsPerSheet}.`);
  }
}

function assertWorksheetBounds(xml: string, path: string): void {
  const dimensions = xmlTags(xml, "dimension");
  for (const dimension of dimensions) {
    const references = (xmlAttribute(dimension, "ref") ?? "").split(":");
    for (const reference of references) assertCellReference(reference, path);
  }
  const rows = xmlTags(xml, "row");
  if (rows.length > XLSX_IMPORT_LIMITS.maxRowsPerSheet) {
    throw new Error(`XLSX_ROW_LIMIT_EXCEEDED: ${path}, maximum ${XLSX_IMPORT_LIMITS.maxRowsPerSheet}.`);
  }
  for (const row of rows) {
    const rowReference = xmlAttribute(row, "r");
    const rowNumber = Number(rowReference);
    if (!Number.isSafeInteger(rowNumber) || rowNumber < 1 || rowNumber > XLSX_IMPORT_LIMITS.maxRowsPerSheet) {
      throw new Error(`XLSX_ROW_LIMIT_EXCEEDED: ${path}, ligne ${rowReference ?? "absente"}.`);
    }
  }
  const cells = xmlTags(xml, "c");
  if (cells.length > XLSX_IMPORT_LIMITS.maxNonEmptyCells) {
    throw new Error(`XLSX_CELL_LIMIT_EXCEEDED: ${path}, maximum ${XLSX_IMPORT_LIMITS.maxNonEmptyCells}.`);
  }
  for (const cell of cells) assertCellReference(xmlAttribute(cell, "r") ?? "", path);
}

function toTextRows(data: unknown[][], sheetName: string): string[][] {
  if (data.length > XLSX_IMPORT_LIMITS.maxRowsPerSheet) {
    throw new Error(`XLSX_ROW_LIMIT_EXCEEDED: ${sheetName}, maximum ${XLSX_IMPORT_LIMITS.maxRowsPerSheet}.`);
  }
  let nonEmptyCells = 0;
  return data.map((row, rowIndex) => {
    if (row.length > XLSX_IMPORT_LIMITS.maxColumnsPerSheet) {
      throw new Error(`XLSX_COLUMN_LIMIT_EXCEEDED: ${sheetName}, ligne ${rowIndex + 1}, maximum ${XLSX_IMPORT_LIMITS.maxColumnsPerSheet}.`);
    }
    return row.map((value, columnIndex) => {
      if (typeof value !== "string") return "";
      if (value.length > XLSX_IMPORT_LIMITS.maxCellCharacters) {
        throw new Error(`XLSX_CELL_TOO_LARGE: ${sheetName}!R${rowIndex + 1}C${columnIndex + 1}.`);
      }
      if (value.trim()) {
        nonEmptyCells += 1;
        if (nonEmptyCells > XLSX_IMPORT_LIMITS.maxNonEmptyCells) {
          throw new Error(`XLSX_NON_EMPTY_CELL_LIMIT_EXCEEDED: ${sheetName}, maximum ${XLSX_IMPORT_LIMITS.maxNonEmptyCells}.`);
        }
      }
      return value;
    });
  });
}

function columnLetters(columnIndex: number): string {
  let value = columnIndex + 1;
  let output = "";
  while (value > 0) {
    value -= 1;
    output = String.fromCharCode(65 + (value % 26)) + output;
    value = Math.floor(value / 26);
  }
  return output;
}

export async function analyzeXlsxArrayBuffer(buffer: ArrayBuffer, inventory: XlsxSurfaceInventory): Promise<XlsxAnalysisResult> {
  const bytes = new Uint8Array(buffer);
  const inspectedFiles = unzipSync(bytes, {
    filter: ({ name }) => name.endsWith(".xml") || name.endsWith(".xml.rels"),
  });
  const inspection = inspectWorkbookXml(inspectedFiles);
  const workbook = await readXlsxFile(buffer, { trim: false });
  if (workbook.length !== inspection.sheetStates.length) throw new Error("XLSX_SHEET_INVENTORY_MISMATCH.");

  const sheets: XlsxSheetAnalysis[] = [];
  for (let index = 0; index < workbook.length; index += 1) {
    if (inspection.sheetStates[index] !== "visible") continue;
    const sheet = workbook[index]!;
    const rows = toTextRows(sheet.data as unknown[][], sheet.sheet);
    const imported = importQuestionnaireRowsWithSources(rows, { kind: "xlsx" });
    const result = imported.result;
    const formulas = new Set(inspection.formulaCellsBySheet[sheet.sheet] ?? []);
    sheets.push({
      name: sheet.sheet,
      result,
      questionSources: imported.questionSources.map((source) => {
        const cellReference = `${columnLetters(source.columnIndex)}${source.rowIndex + 1}`;
        return { question: source.question, source: formulas.has(cellReference) ? "cached-formula-value" : "literal-cell", cellReference };
      }),
      ignoredFormulaCells: inspection.formulaWithoutCachedValueCellsBySheet[sheet.sheet] ?? [],
    });
  }
  if (sheets.length === 0) throw new Error("XLSX_NO_VISIBLE_SHEET: aucune feuille visible importable.");

  return {
    version: XLSX_IMPORT_VERSION,
    sheets,
    hiddenSheetCount: inspection.sheetStates.filter((state) => state !== "visible").length,
    formulaCount: inspection.formulaCount,
    formulaWithoutCachedValueCount: inspection.formulaWithoutCachedValueCount,
    externalLinkPartCount: inventory.externalLinkPartCount,
    externalRelationshipCount: inspection.externalRelationshipCount,
    connectionPartCount: inventory.connectionPartCount,
    queryTablePartCount: inventory.queryTablePartCount,
  };
}
