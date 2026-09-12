import { buildProofPackDelivery, createProofCaseFromQuestionnaire, sha256Hex, type ProofPackSourceImport } from "@blackproof/core";
import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildReturnPackXlsx } from "./return-pack";
import { preflightXlsxFile } from "./xlsx-preflight";

const CLEAN_INVENTORY = [
  "[Content_Types].xml",
  "_rels/.rels",
  "docProps/app.xml",
  "docProps/core.xml",
  "xl/_rels/workbook.xml.rels",
  "xl/styles.xml",
  "xl/workbook.xml",
  "xl/worksheets/sheet1.xml",
  "xl/worksheets/sheet2.xml",
].sort();

async function untrustedSourceWorkbook(): Promise<File> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/connections.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.connections+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file("xl/workbook.xml", `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Questions" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="LegacyInput">Questions!$B$1</definedName></definedNames><calcPr calcMode="auto" forceFullCalc="1"/></workbook>`);
  zip.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/connections" Target="connections.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" TargetMode="External" Target="https://invalid.example"/></Relationships>`);
  zip.file("xl/worksheets/sheet1.xml", `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Disposez-vous de sauvegardes testées ?</t></is></c><c r="B1" t="inlineStr"><is><t>Ancienne réponse non copiée</t></is></c><c r="C1"><f>1+1</f><v>2</v></c></row></sheetData></worksheet>`);
  zip.file("xl/connections.xml", `<?xml version="1.0"?><connections xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="0"/>`);
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return new File([bytes.buffer as ArrayBuffer], "client.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

async function fixture(answer = "Oui, restauration testée chaque trimestre.", includeSecondQuestion = false) {
  const sourceFile = await untrustedSourceWorkbook();
  const result = await createProofCaseFromQuestionnaire(
    "1. Disposez-vous de sauvegardes testées ?\n2. Avez-vous un plan de réponse aux incidents ?",
    { sourceFileName: "client.xlsx", sourceFormat: "unknown" },
  );
  result.proofpack.sourceQuestionnaire.originalFileSha256 = `sha256:${await sha256Hex(new Uint8Array(await sourceFile.arrayBuffer()))}`;
  result.proofpack.questions[0]!.answerText = answer;
  result.proofpack.questions[0]!.answerExportStatus = "ready";
  if (includeSecondQuestion) {
    result.proofpack.questions[1]!.answerText = "Oui, avec une astreinte documentée.";
    result.proofpack.questions[1]!.answerExportStatus = "ready";
  }
  const delivery = await buildProofPackDelivery(result.proofpack, {
    questionIds: result.proofpack.questions.slice(0, includeSecondQuestion ? 2 : 1).map((question) => question.id),
    evidenceIds: [],
    confirmed: true,
  });
  const sourceImport: ProofPackSourceImport = {
    profile: "blackproof-xlsx-import-v1",
    sourceFormat: "xlsx",
    selectedSheet: "Questions",
    selectedColumn: 1,
    formulaCount: 1,
    formulaWithoutCachedValueCount: 0,
    hiddenSheetCount: 0,
    externalLinkPartCount: 0,
    externalRelationshipCount: 1,
    connectionPartCount: 1,
    queryTablePartCount: 0,
    warnings: [],
    questionSources: [
      { question: result.proofpack.questions[0]!.text, source: "literal-cell", cellReference: "A1" },
      { question: result.proofpack.questions[1]!.text, source: "literal-cell", cellReference: "A2" },
    ],
    ignoredFormulaCells: [],
  };
  return {
    sourceFile,
    proofpack: result.proofpack,
    sourceImport,
    delivery,
    questionMappings: delivery.questions.map((question, index) => ({
      masterQuestionId: result.proofpack.questions[index]!.id,
      deliveryQuestionId: question.id,
    })),
  };
}

afterEach(() => vi.unstubAllEnvs());

describe("Return Pack XLSX", () => {
  it("fails closed while the production feature remains disabled", async () => {
    vi.stubEnv("PUBLIC_BLACKPROOF_RETURN_PACK_ENABLED", "disabled");
    await expect(buildReturnPackXlsx(await fixture())).rejects.toThrow("RETURN_PACK_DISABLED");
  });

  it("reconstructs a fixed clean package without parsing or copying source OOXML parts", async () => {
    vi.stubEnv("PUBLIC_BLACKPROOF_RETURN_PACK_ENABLED", "enabled");
    const built = await buildReturnPackXlsx(await fixture());
    expect(built.preview.changes).toHaveLength(1);
    expect(built.preview.changes[0]).toMatchObject({
      answerCell: "B2",
      previousValue: "",
      nextValue: "Oui, restauration testée chaque trimestre.",
    });
    expect(built.preview.cleaning).toMatchObject({ reconstructedFromCleanTemplate: true, copiedSourcePackageParts: 0 });

    const outputZip = await JSZip.loadAsync(await built.blob.arrayBuffer(), { checkCRC32: true });
    expect(Object.keys(outputZip.files).sort()).toEqual(CLEAN_INVENTORY);
    const allXml = (await Promise.all(Object.keys(outputZip.files).map((path) => outputZip.file(path)!.async("text")))).join("\n");
    expect(allXml).toContain("Oui, restauration testée chaque trimestre.");
    expect(allXml).not.toContain("Ancienne réponse non copiée");
    expect(allXml).not.toMatch(/<(?:\w+:)?f\b|TargetMode=["']External["']|definedNames|calcPr|connections|externalLink|queryTable|vbaProject|activeX|oleObject/i);

    const outputFile = new File([await built.blob.arrayBuffer()], built.filename, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const outputPreflight = await preflightXlsxFile(outputFile);
    expect(outputPreflight).toMatchObject({ entryCount: CLEAN_INVENTORY.length, worksheetCount: 2, externalLinkPartCount: 0, connectionPartCount: 0, queryTablePartCount: 0 });
  });

  it("serializes adversarial-looking answers only as escaped literal text", async () => {
    vi.stubEnv("PUBLIC_BLACKPROOF_RETURN_PACK_ENABLED", "enabled");
    const built = await buildReturnPackXlsx(await fixture(`"><f>HYPERLINK("https://invalid.example")</f>&`));
    const outputZip = await JSZip.loadAsync(await built.blob.arrayBuffer(), { checkCRC32: true });
    const worksheet = await outputZip.file("xl/worksheets/sheet1.xml")!.async("text");
    expect(worksheet).toContain("&lt;f&gt;");
    expect(worksheet).not.toMatch(/<(?:\w+:)?f\b/);
  });

  it.each([
    ["duplicate Delivery id", (value: Awaited<ReturnType<typeof fixture>>) => {
      value.questionMappings[1]!.deliveryQuestionId = value.questionMappings[0]!.deliveryQuestionId;
    }],
    ["duplicate Master id", (value: Awaited<ReturnType<typeof fixture>>) => {
      value.questionMappings[1]!.masterQuestionId = value.questionMappings[0]!.masterQuestionId;
    }],
    ["missing Delivery mapping", (value: Awaited<ReturnType<typeof fixture>>) => {
      value.questionMappings.pop();
    }],
    ["unknown Master id", (value: Awaited<ReturnType<typeof fixture>>) => {
      value.questionMappings[0]!.masterQuestionId = "question_master_unknown";
    }],
    ["unknown Delivery id", (value: Awaited<ReturnType<typeof fixture>>) => {
      value.questionMappings[0]!.deliveryQuestionId = "question_00000000000000000000000000000000";
    }],
    ["permuted source", (value: Awaited<ReturnType<typeof fixture>>) => {
      value.sourceImport.questionSources.reverse();
    }],
  ])("rejects a non-bijective or incoherent mapping: %s", async (_label, mutate) => {
    vi.stubEnv("PUBLIC_BLACKPROOF_RETURN_PACK_ENABLED", "enabled");
    const value = await fixture(undefined, true);
    mutate(value);
    await expect(buildReturnPackXlsx(value)).rejects.toThrow("RETURN_PACK_MAPPING_INVALID");
  });

  it("is deterministic when a valid mapping array is permuted", async () => {
    vi.stubEnv("PUBLIC_BLACKPROOF_RETURN_PACK_ENABLED", "enabled");
    const value = await fixture(undefined, true);
    const forward = await buildReturnPackXlsx(value);
    const reverse = await buildReturnPackXlsx({ ...value, questionMappings: [...value.questionMappings].reverse() });
    expect(new Uint8Array(await forward.blob.arrayBuffer())).toEqual(new Uint8Array(await reverse.blob.arrayBuffer()));
  });
});
