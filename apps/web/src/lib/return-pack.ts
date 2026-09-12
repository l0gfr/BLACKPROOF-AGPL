import {
  assertProofPackSourceImportLink,
  sha256Hex,
  type ProofPack,
  type ProofPackDelivery,
  type ProofPackSourceImport,
} from "@blackproof/core";
import JSZip from "jszip";

import { assertReturnPackEnabled } from "./feature-flags";
import { XLSX_IMPORT_LIMITS, XLSX_MIME_TYPE } from "./xlsx-contract";

export const RETURN_PACK_FORMAT_VERSION = "blackproof-return-pack-v2-clean-template" as const;

const ANSWERS_SHEET_NAME = "Réponses";
const TRACE_SHEET_NAME = "BLACKPROOF";
const XML_INVALID_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;
const ZIP_DATE = new Date("1980-01-01T00:00:00.000Z");
const CLEAN_PACKAGE_PATHS = [
  "[Content_Types].xml",
  "_rels/.rels",
  "docProps/app.xml",
  "docProps/core.xml",
  "xl/_rels/workbook.xml.rels",
  "xl/styles.xml",
  "xl/workbook.xml",
  "xl/worksheets/sheet1.xml",
  "xl/worksheets/sheet2.xml",
] as const;
const CLEAN_PACKAGE_PATH_SET = new Set<string>(CLEAN_PACKAGE_PATHS);
const ALLOWED_CONTENT_TYPES = new Set([
  "application/xml",
  "application/vnd.openxmlformats-package.relationships+xml",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml",
  "application/vnd.openxmlformats-package.core-properties+xml",
  "application/vnd.openxmlformats-officedocument.extended-properties+xml",
]);
const ALLOWED_RELATIONSHIP_TYPES = new Set([
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet",
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
  "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties",
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties",
]);

export interface ReturnPackQuestionMapping {
  masterQuestionId: string;
  deliveryQuestionId: string;
}

export interface ReturnPackCellChange {
  masterQuestionId: string;
  deliveryQuestionId: string;
  questionCell: string;
  answerCell: string;
  question: string;
  previousValue: string;
  nextValue: string;
}

export interface ReturnPackPreview {
  formatVersion: typeof RETURN_PACK_FORMAT_VERSION;
  sourceFileName: string;
  sourceFileSha256: string;
  sourceSheetName: string;
  sheetName: typeof ANSWERS_SHEET_NAME;
  questionColumn: 1;
  answerColumn: 2;
  deliveryId: string;
  deliveryFingerprint: string;
  verifierUrl: string;
  changes: ReturnPackCellChange[];
  cleaning: {
    reconstructedFromCleanTemplate: true;
    copiedSourcePackageParts: 0;
    frozenFormulaCells: 0;
    removedDefinedNames: 0;
    removedExternalRelationships: 0;
    removedExternalLinkParts: 0;
    removedConnectionParts: 0;
    removedQueryTableParts: 0;
    removedCalculationChainParts: 0;
  };
}

export interface ReturnPackBuildResult {
  preview: ReturnPackPreview;
  blob: Blob;
  filename: string;
}

function xmlLiteral(value: string, label: string): string {
  if (XML_INVALID_CONTROL.test(value)) throw new Error(`RETURN_PACK_XML_TEXT_INVALID: ${label}.`);
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function inlineStringCell(reference: string, value: string, style = 0): string {
  const styleAttribute = style > 0 ? ` s="${style}"` : "";
  return `<c r="${reference}"${styleAttribute} t="inlineStr"><is><t xml:space="preserve">${xmlLiteral(value, reference)}</t></is></c>`;
}

function rowXml(row: number, values: readonly string[], header = false): string {
  const cells = values.map((value, index) => inlineStringCell(`${String.fromCharCode(65 + index)}${row}`, value, header ? 1 : 0));
  return `<row r="${row}">${cells.join("")}</row>`;
}

function worksheetXml(rows: readonly (readonly string[])[], widths: readonly number[]): string {
  const maxColumn = String.fromCharCode(64 + Math.max(1, widths.length));
  const columns = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<dimension ref="A1:${maxColumn}${Math.max(1, rows.length)}"/>` +
    `<cols>${columns}</cols><sheetData>${rows.map((row, index) => rowXml(index + 1, row, index === 0)).join("")}</sheetData>` +
    `</worksheet>`;
}

function addXml(zip: JSZip, path: string, content: string): void {
  zip.file(path, content, { createFolders: false, date: ZIP_DATE });
}

function contentTypesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
    `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>` +
    `</Types>`;
}

function packageRelationshipsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
    `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>` +
    `</Relationships>`;
}

function workbookXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<bookViews><workbookView activeTab="0"/></bookViews>` +
    `<sheets><sheet name="${ANSWERS_SHEET_NAME}" sheetId="1" r:id="rId1"/><sheet name="${TRACE_SHEET_NAME}" sheetId="2" r:id="rId2"/></sheets>` +
    `</workbook>`;
}

function workbookRelationshipsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>` +
    `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;
}

function stylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><sz val="11"/><name val="Aptos"/></font></fonts>` +
    `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
    `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>` +
    `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
    `</styleSheet>`;
}

function corePropertiesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">` +
    `<dc:creator>BLACKPROOF</dc:creator><dc:title>BLACKPROOF Return Pack propre</dc:title>` +
    `</cp:coreProperties>`;
}

function appPropertiesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">` +
    `<Application>BLACKPROOF</Application><AppVersion>1.0</AppVersion>` +
    `</Properties>`;
}

function relationshipAttribute(tag: string, name: string): string | undefined {
  return new RegExp(`(?:^|\\s)${name}\\s*=\\s*([\"'])(.*?)\\1`, "is").exec(tag)?.[2];
}

async function assertCleanReturnPackPackage(zip: JSZip): Promise<void> {
  const entries = Object.values(zip.files);
  if (entries.some((entry) => entry.dir)) throw new Error("RETURN_PACK_POSTCONDITION_FAILED: répertoire ZIP inattendu.");
  const paths = entries.map((entry) => entry.name).sort();
  if (paths.length !== CLEAN_PACKAGE_PATHS.length || paths.some((path, index) => path !== [...CLEAN_PACKAGE_PATHS].sort()[index])) {
    throw new Error("RETURN_PACK_POSTCONDITION_FAILED: inventaire OOXML non autorisé.");
  }

  let totalBytes = 0;
  for (const path of paths) {
    if (!CLEAN_PACKAGE_PATH_SET.has(path)) throw new Error("RETURN_PACK_POSTCONDITION_FAILED: partie OOXML inconnue.");
    const file = zip.file(path);
    if (!file) throw new Error("RETURN_PACK_POSTCONDITION_FAILED: partie OOXML manquante.");
    const bytes = await file.async("uint8array");
    totalBytes += bytes.byteLength;
    if (bytes.byteLength > XLSX_IMPORT_LIMITS.maxWorksheetBytes || totalBytes > XLSX_IMPORT_LIMITS.maxExpandedBytes) {
      throw new Error("RETURN_PACK_POSTCONDITION_FAILED: budget OOXML dépassé.");
    }
    const xml = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("RETURN_PACK_POSTCONDITION_FAILED: DTD ou entité interdite.");
    if (/<(?:\w+:)?f\b|TargetMode\s*=\s*[\"']External[\"']|(?:vbaProject|activeX|oleObject|externalLink|connections|queryTable|calcChain|customUI|printerSettings|embeddings|pivotCache)/i.test(xml)) {
      throw new Error("RETURN_PACK_POSTCONDITION_FAILED: contenu actif ou externe résiduel.");
    }
  }

  const contentTypes = await zip.file("[Content_Types].xml")!.async("text");
  for (const tag of contentTypes.match(/<(?:\w+:)?(?:Default|Override)\b[^>]*\/?\s*>/gi) ?? []) {
    const contentType = relationshipAttribute(tag, "ContentType");
    if (!contentType || !ALLOWED_CONTENT_TYPES.has(contentType)) {
      throw new Error("RETURN_PACK_POSTCONDITION_FAILED: type de contenu OOXML inconnu.");
    }
  }
  for (const path of paths.filter((path) => path.endsWith(".rels"))) {
    const xml = await zip.file(path)!.async("text");
    for (const tag of xml.match(/<(?:\w+:)?Relationship\b[^>]*\/?\s*>/gi) ?? []) {
      const type = relationshipAttribute(tag, "Type");
      const target = relationshipAttribute(tag, "Target");
      if (!type || !ALLOWED_RELATIONSHIP_TYPES.has(type) || !target || target.startsWith("/") || target.split("/").includes("..")) {
        throw new Error("RETURN_PACK_POSTCONDITION_FAILED: relation OOXML inconnue.");
      }
    }
  }
}

function baseName(fileName: string): string {
  return fileName.replace(/\.xlsx$/i, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "classeur";
}

export async function buildReturnPackXlsx(input: {
  sourceFile: File;
  proofpack: ProofPack;
  sourceImport: ProofPackSourceImport;
  delivery: ProofPackDelivery;
  questionMappings: ReturnPackQuestionMapping[];
  verifierBaseUrl?: string;
}): Promise<ReturnPackBuildResult> {
  assertReturnPackEnabled();
  if (!/\.xlsx$/i.test(input.sourceFile.name) || input.sourceFile.size < 1 || input.sourceFile.size > XLSX_IMPORT_LIMITS.maxCompressedBytes) {
    throw new Error("RETURN_PACK_SOURCE_FILE_INVALID: classeur source .xlsx borné attendu.");
  }

  const sourceBytes = new Uint8Array(await input.sourceFile.arrayBuffer());
  const sourceFileSha256 = `sha256:${await sha256Hex(sourceBytes)}`;
  if (sourceFileSha256 !== input.proofpack.sourceQuestionnaire.originalFileSha256) {
    throw new Error("RETURN_PACK_SOURCE_HASH_MISMATCH: ce fichier n’est pas le classeur XLSX importé à l’origine.");
  }

  const mappingsByMaster = new Map(input.questionMappings.map((mapping) => [mapping.masterQuestionId, mapping.deliveryQuestionId]));
  const mappedDeliveryIds = new Set(input.questionMappings.map((mapping) => mapping.deliveryQuestionId));
  if (mappingsByMaster.size !== input.questionMappings.length || mappedDeliveryIds.size !== input.questionMappings.length) {
    throw new Error("RETURN_PACK_MAPPING_INVALID: la correspondance Master/Delivery n’est pas bijective.");
  }
  const masterQuestions = new Map(input.proofpack.questions.map((question, index) => [question.id, { question, index }]));
  const deliveryQuestions = new Map(input.delivery.questions.map((question) => [question.id, question]));
  if (deliveryQuestions.size !== input.delivery.questions.length
    || input.questionMappings.length === 0
    || input.questionMappings.length !== input.delivery.questions.length
    || [...mappedDeliveryIds].some((id) => !deliveryQuestions.has(id))
    || input.delivery.questions.some((question) => !mappedDeliveryIds.has(question.id))
    || [...mappingsByMaster.keys()].some((id) => !masterQuestions.has(id))) {
    throw new Error("RETURN_PACK_MAPPING_INVALID: les ensembles Master/Delivery ne correspondent pas exactement.");
  }
  const changes: ReturnPackCellChange[] = [];
  const orderedMappings = [...input.questionMappings].sort((left, right) => (
    masterQuestions.get(left.masterQuestionId)!.index - masterQuestions.get(right.masterQuestionId)!.index
  ));
  for (const mapping of orderedMappings) {
    const master = masterQuestions.get(mapping.masterQuestionId)!;
    const question = master.question;
    const deliveryQuestionId = mapping.deliveryQuestionId;
    const delivered = deliveryQuestions.get(deliveryQuestionId);
    const source = input.sourceImport.questionSources[master.index];
    if (!delivered || !source || source.question !== question.text || delivered.text !== question.text) {
      throw new Error("RETURN_PACK_MAPPING_INVALID: le texte ou la source ne correspond pas à la question Master.");
    }
    const row = changes.length + 2;
    const nextValue = delivered.reservation ? `${delivered.answer}\n\nRéserve : ${delivered.reservation}` : delivered.answer;
    if (nextValue.length > XLSX_IMPORT_LIMITS.maxCellCharacters) throw new Error(`RETURN_PACK_CELL_TOO_LARGE: B${row}.`);
    changes.push({
      masterQuestionId: question.id,
      deliveryQuestionId,
      questionCell: source.cellReference,
      answerCell: `B${row}`,
      question: delivered.text,
      previousValue: "",
      nextValue,
    });
  }
  assertProofPackSourceImportLink(input.proofpack, input.sourceImport);

  const verifierBaseUrl = (input.verifierBaseUrl ?? "https://blackproof.fr/verify").replace(/\/$/, "");
  const preview: ReturnPackPreview = {
    formatVersion: RETURN_PACK_FORMAT_VERSION,
    sourceFileName: input.sourceFile.name,
    sourceFileSha256,
    sourceSheetName: input.sourceImport.selectedSheet,
    sheetName: ANSWERS_SHEET_NAME,
    questionColumn: 1,
    answerColumn: 2,
    deliveryId: input.delivery.deliveryId,
    deliveryFingerprint: input.delivery.fingerprint,
    verifierUrl: `${verifierBaseUrl}#fingerprint=${encodeURIComponent(input.delivery.fingerprint)}`,
    changes,
    cleaning: {
      reconstructedFromCleanTemplate: true,
      copiedSourcePackageParts: 0,
      frozenFormulaCells: 0,
      removedDefinedNames: 0,
      removedExternalRelationships: 0,
      removedExternalLinkParts: 0,
      removedConnectionParts: 0,
      removedQueryTableParts: 0,
      removedCalculationChainParts: 0,
    },
  };

  const answerRows = [
    ["Question", "Réponse validée", "Réserve", "Cellule source", "Identifiant Delivery"],
    ...changes.map((change) => {
      const delivered = deliveryQuestions.get(change.deliveryQuestionId)!;
      return [change.question, delivered.answer, delivered.reservation ?? "", change.questionCell, change.deliveryQuestionId];
    }),
  ];
  const traceRows = [
    ["BLACKPROOF Return Pack", RETURN_PACK_FORMAT_VERSION],
    ["Construction", "Classeur propre généré sans copier ni parser les parties OOXML du fichier source"],
    ["Delivery ID", preview.deliveryId],
    ["Empreinte Delivery", preview.deliveryFingerprint],
    ["Vérifier", preview.verifierUrl],
    ["Statut courant", "Non vérifié : les contrôles locaux ne prouvent pas le statut courant"],
    ["Classeur source", preview.sourceFileName],
    ["SHA-256 source", preview.sourceFileSha256],
    ["Feuille source déclarée", preview.sourceSheetName],
    ["Réponses exportées", String(preview.changes.length)],
  ];

  const zip = new JSZip();
  addXml(zip, "[Content_Types].xml", contentTypesXml());
  addXml(zip, "_rels/.rels", packageRelationshipsXml());
  addXml(zip, "docProps/app.xml", appPropertiesXml());
  addXml(zip, "docProps/core.xml", corePropertiesXml());
  addXml(zip, "xl/workbook.xml", workbookXml());
  addXml(zip, "xl/_rels/workbook.xml.rels", workbookRelationshipsXml());
  addXml(zip, "xl/styles.xml", stylesXml());
  addXml(zip, "xl/worksheets/sheet1.xml", worksheetXml(answerRows, [56, 72, 48, 18, 40]));
  addXml(zip, "xl/worksheets/sheet2.xml", worksheetXml(traceRows, [28, 108]));
  await assertCleanReturnPackPackage(zip);

  const output = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    mimeType: XLSX_MIME_TYPE,
    platform: "DOS",
  });
  const generated = await JSZip.loadAsync(await output.arrayBuffer(), { checkCRC32: true, createFolders: false });
  await assertCleanReturnPackPackage(generated);
  return {
    preview,
    blob: output,
    filename: `${baseName(input.sourceFile.name)}-return-pack-${input.delivery.deliveryId}.xlsx`,
  };
}
