import { describe, expect, it } from "vitest";
import JSZip from "jszip";

import { XLSX_MIME_TYPE } from "./xlsx-contract";
import { preflightXlsxFile } from "./xlsx-preflight";

async function xlsxFile(
  overrides: Record<string, string> = {},
  options: { name?: string; type?: string } = {}
): Promise<File> {
  const zip = new JSZip();
  const files = {
    "[Content_Types].xml": "<Types/>",
    "_rels/.rels": "<Relationships/>",
    "xl/workbook.xml": "<workbook><sheets><sheet name=\"Questions\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>",
    "xl/_rels/workbook.xml.rels": "<Relationships/>",
    "xl/worksheets/sheet1.xml": "<worksheet><sheetData/></worksheet>",
    ...overrides,
  };
  for (const [name, content] of Object.entries(files)) zip.file(name, content, { createFolders: false });
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new File([buffer], options.name ?? "questionnaire.xlsx", { type: options.type ?? XLSX_MIME_TYPE });
}

async function mutateEntryName(file: File, from: string, to: string): Promise<File> {
  expect(to).toHaveLength(from.length);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const before = new TextEncoder().encode(from);
  const after = new TextEncoder().encode(to);
  let replacements = 0;
  for (let index = 0; index <= bytes.length - before.length; index += 1) {
    if (!before.every((byte, offset) => bytes[index + offset] === byte)) continue;
    bytes.set(after, index);
    replacements += 1;
  }
  expect(replacements).toBeGreaterThanOrEqual(2);
  return new File([bytes.buffer as ArrayBuffer], "questionnaire.xlsx", { type: XLSX_MIME_TYPE });
}

describe("XLSX ZIP preflight", () => {
  it("accepts a bounded OOXML ZIP and inventories worksheets", async () => {
    const result = await preflightXlsxFile(await xlsxFile());
    expect(result.worksheetCount).toBe(1);
    expect(result.entryCount).toBe(5);
    expect(result.expandedBytes).toBeGreaterThan(0);
  });

  it("requires the .xlsx extension and accepts browser-generic MIME values", async () => {
    await expect(preflightXlsxFile(await xlsxFile({}, { name: "questionnaire.xlsm" }))).rejects.toThrow("XLSX_EXTENSION_REFUSED");
    await expect(preflightXlsxFile(await xlsxFile({}, { type: "" }))).resolves.toBeDefined();
    await expect(preflightXlsxFile(await xlsxFile({}, { type: "application/octet-stream" }))).resolves.toBeDefined();
    await expect(preflightXlsxFile(await xlsxFile({}, { type: "application/zip" }))).resolves.toMatchObject({ mimeWarning: expect.stringContaining("XLSX_MIME_GENERIC_ZIP") });
    await expect(preflightXlsxFile(await xlsxFile({}, { type: "text/plain" }))).rejects.toThrow("XLSX_MIME_REFUSED");
  });

  it("requires a real local ZIP signature", async () => {
    const fake = new File([new Uint8Array(30)], "questionnaire.xlsx", { type: XLSX_MIME_TYPE });
    await expect(preflightXlsxFile(fake)).rejects.toThrow("XLSX_ZIP_SIGNATURE_INVALID");
  });

  it("rejects active content even when hidden in an .xlsx container", async () => {
    await expect(preflightXlsxFile(await xlsxFile({ "xl/vbaProject.bin": "not-a-real-macro" }))).rejects.toThrow("XLSX_ACTIVE_CONTENT_REFUSED");
  });

  it("reports external OOXML parts without calling them semantic links", async () => {
    const result = await preflightXlsxFile(await xlsxFile({
      "xl/externalLinks/externalLink1.xml": "<externalLink/>",
      "xl/connections.xml": "<connections/>",
      "xl/queryTables/queryTable1.xml": "<queryTable/>",
    }));
    expect(result.externalLinkPartCount).toBe(1);
    expect(result.connectionPartCount).toBe(1);
    expect(result.queryTablePartCount).toBe(1);
  });

  it("rejects absolute ZIP paths", async () => {
    await expect(preflightXlsxFile(await xlsxFile({ "/absolute.xml": "x" }))).rejects.toThrow("XLSX_ZIP_UNSAFE_PATH");
  });

  it("rejects parent traversal and duplicate names from the central directory", async () => {
    const traversal = await mutateEntryName(await xlsxFile({ "xx/evil.xml": "x" }), "xx/evil.xml", "../evil.xml");
    await expect(preflightXlsxFile(traversal)).rejects.toThrow("XLSX_ZIP_UNSAFE_PATH");

    const duplicate = await mutateEntryName(await xlsxFile({ "xl/a.xml": "a", "xl/b.xml": "b" }), "xl/b.xml", "xl/a.xml");
    await expect(preflightXlsxFile(duplicate)).rejects.toThrow("XLSX_DUPLICATE_ENTRY");
  });

  it("rejects extreme per-entry compression ratios", async () => {
    await expect(preflightXlsxFile(await xlsxFile({ "xl/sharedStrings.xml": "A".repeat(1_000_000) }))).rejects.toThrow("XLSX_COMPRESSION_RATIO_EXCEEDED");
  });
});
