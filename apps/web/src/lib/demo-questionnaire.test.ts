import { describe, expect, it } from "vitest";
import readXlsxFile from "read-excel-file/web-worker";
import { importQuestionnaireCsv, parseDelimitedRows } from "@blackproof/core";
import { preflightXlsxFile } from "./xlsx-preflight";
import { analyzeXlsxArrayBuffer } from "./xlsx-analysis";
import { XLSX_MIME_TYPE } from "./xlsx-contract";

const demo = new URL("../../public/demo/", import.meta.url);

describe("public questionnaire downloads", () => {
  it("keeps UTF-8 CSV and Excel cells identical, with ten importable questions and no active content", async () => {
    const { readFileSync } = (globalThis as any).process.getBuiltinModule("node:fs");
    const csvBytes: Uint8Array = readFileSync(new URL("supplier-questionnaire-demo.csv", demo));
    expect([...csvBytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const csv = new TextDecoder().decode(csvBytes);
    const rows = parseDelimitedRows(csv, ";");
    expect(rows).toHaveLength(11);
    expect(rows.every((row) => row.length === 4)).toBe(true);
    expect(rows[3]?.[1]).toBe("Testez-vous régulièrement la restauration des sauvegardes ?");
    expect(rows[4]?.[3]).toBe("Procédure et chaîne d'escalade");

    const bytes: Uint8Array = readFileSync(new URL("supplier-questionnaire-demo.xlsx", demo));
    const buffer = Uint8Array.from(bytes).buffer;
    const file = new File([buffer], "supplier-questionnaire-demo.xlsx", { type: XLSX_MIME_TYPE });
    const inventory = await preflightXlsxFile(file);
    const workbook = await readXlsxFile(buffer, { trim: false });
    expect(workbook).toHaveLength(1);
    expect(workbook[0]?.data).toEqual(rows);
    const analysis = await analyzeXlsxArrayBuffer(buffer, inventory);
    expect(analysis.sheets[0]?.result.questionCount).toBe(10);
    expect(analysis.sheets[0]?.result.questions).toEqual(importQuestionnaireCsv(csv).questions);
    expect(analysis.formulaCount).toBe(0);
    expect(analysis.hiddenSheetCount).toBe(0);
    expect(analysis.externalRelationshipCount).toBe(0);
    expect(analysis.externalLinkPartCount).toBe(0);
    expect(analysis.connectionPartCount).toBe(0);
    expect(analysis.queryTablePartCount).toBe(0);
  });
});
