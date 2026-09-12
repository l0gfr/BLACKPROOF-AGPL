import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import {
  SOURCE_IMPORT_V1_SCHEMA_SHA256,
  assertProofPackSourceImport,
  buildProofPackSourceImportFile,
  createProofCaseFromQuestionnaire,
  sha256Hex,
  sourceImportV1Schema,
  type ProofPackSourceImport,
} from "./index";

const sourceImport: ProofPackSourceImport = {
  profile: "blackproof-xlsx-import-v1",
  sourceFormat: "xlsx",
  selectedSheet: "Security Questionnaire",
  selectedColumn: 6,
  selectedColumnName: "Q".repeat(300),
  formulaCount: 2,
  formulaWithoutCachedValueCount: 1,
  hiddenSheetCount: 1,
  externalLinkPartCount: 0,
  externalRelationshipCount: 0,
  connectionPartCount: 0,
  queryTablePartCount: 0,
  warnings: [],
  questionSources: [{ question: "Décrivez vos contrôles d'accès administrateur.", source: "cached-formula-value", cellReference: "F3" }],
  ignoredFormulaCells: ["F4"],
};

async function sourceImportFile() {
  const result = await createProofCaseFromQuestionnaire(`1. ${sourceImport.questionSources[0]!.question}`, {
    sourceFileName: "security.xlsx",
    sourceFormat: "unknown",
    sourceOriginalFileSha256: `sha256:${"a".repeat(64)}`,
  });
  return buildProofPackSourceImportFile(result.proofpack, sourceImport);
}

describe("XLSX source import V1 contract", () => {
  it("pins the public schema bytes", async () => {
    const { readFileSync } = (globalThis as any).process.getBuiltinModule("node:fs");
    expect(await sha256Hex(readFileSync("schemas/source-import-v1.schema.json"))).toBe(SOURCE_IMPORT_V1_SCHEMA_SHA256);
  });

  it("accepts producer output including a 300-character column name", async () => {
    const instance = new Ajv2020({ allErrors: true, strict: true });
    addFormats(instance);
    const validate = instance.compile(sourceImportV1Schema);
    const file = await sourceImportFile();
    expect(() => assertProofPackSourceImport(file, { file: true })).not.toThrow();
    expect(validate(file), validate.errors?.map((error) => error.message).join(", ")).toBe(true);

    const { readFileSync } = (globalThis as any).process.getBuiltinModule("node:fs");
    const validFixture = JSON.parse(readFileSync("fixtures/source-import/v1.valid.json", "utf8"));
    const invalidFixture = JSON.parse(readFileSync("fixtures/source-import/v1.invalid.json", "utf8"));
    expect(validate(validFixture)).toBe(true);
    expect(validate(invalidFixture)).toBe(false);
  });

  it("rejects impossible cell, formula and source-file metadata", async () => {
    const wrongColumn = structuredClone(await sourceImportFile()) as any;
    wrongColumn.questionSources[0].cellReference = "A999";
    expect(() => assertProofPackSourceImport(wrongColumn, { file: true })).toThrow("SOURCE_IMPORT_QUESTION_SOURCE_INVALID");

    const impossibleFormula = structuredClone(await sourceImportFile()) as any;
    impossibleFormula.formulaCount = 0;
    impossibleFormula.formulaWithoutCachedValueCount = 0;
    impossibleFormula.ignoredFormulaCells = [];
    expect(() => assertProofPackSourceImport(impossibleFormula, { file: true })).toThrow("SOURCE_IMPORT_CACHED_FORMULA_COUNT_INVALID");

    const csvGraft = structuredClone(await sourceImportFile()) as any;
    csvGraft.sourceQuestionnaire.fileName = "security.csv";
    csvGraft.sourceQuestionnaire.format = "csv";
    expect(() => assertProofPackSourceImport(csvGraft, { file: true })).toThrow("SOURCE_IMPORT_XLSX_SOURCE_INVALID");
  });
});
