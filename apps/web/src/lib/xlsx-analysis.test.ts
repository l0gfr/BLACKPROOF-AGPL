import { describe, expect, it } from "vitest";
import JSZip from "jszip";

import { analyzeXlsxArrayBuffer } from "./xlsx-analysis";

const NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";

async function workbookBuffer(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const files: Record<string, string> = {
    "[Content_Types].xml": `<Types><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>`,
    "_rels/.rels": `<Relationships xmlns="${PACKAGE_REL_NS}"/>`,
    "xl/workbook.xml": `<workbook xmlns="${NS}" xmlns:r="${REL_NS}"><sheets><sheet name="Security Questionnaire" sheetId="1" r:id="rId1"/><sheet name="Hidden notes" sheetId="2" state="hidden" r:id="rId2"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<Relationships xmlns="${PACKAGE_REL_NS}"><Relationship Id="rId1" Type="${REL_NS}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL_NS}/worksheet" Target="worksheets/sheet2.xml"/></Relationships>`,
    "xl/worksheets/sheet1.xml": `<worksheet xmlns="${NS}"><dimension ref="A1:F4"/><sheetData><row r="1"><c r="F1" t="inlineStr"><is><t>Question</t></is></c></row><row r="2"><c r="F2" t="inlineStr"><is><t>Décrivez vos contrôles d'accès administrateur.</t></is></c></row><row r="3"><c r="F3" t="str"><f>CONCAT(&quot;Disposez-vous&quot;,&quot; d'une procédure de sauvegarde documentée ?&quot;)</f><v>Disposez-vous d'une procédure de sauvegarde documentée ?</v></c></row><row r="4"><c r="F4" t="str"><f>UNTRUSTED()</f></c></row></sheetData></worksheet>`,
    "xl/worksheets/sheet2.xml": `<worksheet xmlns="${NS}"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Question secrète non importée ?</t></is></c></row></sheetData></worksheet>`,
  };
  for (const [name, content] of Object.entries(files)) zip.file(name, content, { createFolders: false });
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

describe("bounded XLSX text analysis", () => {
  it("keeps cached formula values, excludes hidden sheets and reports ignored surfaces", async () => {
    const result = await analyzeXlsxArrayBuffer(await workbookBuffer(), { externalLinkPartCount: 3, connectionPartCount: 1, queryTablePartCount: 2 });
    expect(result.sheets).toHaveLength(1);
    expect(result.sheets[0]?.name).toBe("Security Questionnaire");
    expect(result.sheets[0]?.result.selectedColumn).toBe(5);
    expect(result.sheets[0]?.result.questionCount).toBe(2);
    expect(result.formulaCount).toBe(2);
    expect(result.formulaWithoutCachedValueCount).toBe(1);
    expect(result.hiddenSheetCount).toBe(1);
    expect(result.externalLinkPartCount).toBe(3);
    expect(result.connectionPartCount).toBe(1);
    expect(result.queryTablePartCount).toBe(2);
    expect(result.sheets[0]?.questionSources).toEqual([
      expect.objectContaining({ source: "literal-cell", cellReference: "F2" }),
      expect.objectContaining({ source: "cached-formula-value", cellReference: "F3" }),
    ]);
    expect(result.sheets[0]?.ignoredFormulaCells).toEqual(["F4"]);
  });

  it("rejects DTD and entity declarations before XML parsing", async () => {
    const buffer = await workbookBuffer();
    const zip = await JSZip.loadAsync(buffer);
    zip.file("xl/workbook.xml", "<!DOCTYPE workbook [<!ENTITY xxe SYSTEM 'file:///etc/passwd'>]><workbook>&xxe;</workbook>");
    const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    await expect(analyzeXlsxArrayBuffer(bytes.buffer as ArrayBuffer, { externalLinkPartCount: 0, connectionPartCount: 0, queryTablePartCount: 0 })).rejects.toThrow("XLSX_XML_DTD_REFUSED");
  });

  it("rejects hostile worksheet dimensions before the XLSX parser allocates them", async () => {
    const buffer = await workbookBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const sheet = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
    zip.file("xl/worksheets/sheet1.xml", sheet.replace('ref="A1:F4"', 'ref="A1:XFD1048576"'));
    const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    await expect(analyzeXlsxArrayBuffer(bytes.buffer as ArrayBuffer, { externalLinkPartCount: 0, connectionPartCount: 0, queryTablePartCount: 0 })).rejects.toThrow("XLSX_COLUMN_LIMIT_EXCEEDED");
  });

  it("rejects OLE content types and embedded-object relationships independently of ZIP paths", async () => {
    const buffer = await workbookBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const contentTypes = await zip.file("[Content_Types].xml")!.async("string");
    zip.file("[Content_Types].xml", contentTypes.replace("</Types>", '<Override PartName="/xl/media/blob.bin" ContentType="application/vnd.openxmlformats-officedocument.oleObject"/></Types>'));
    let bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    await expect(analyzeXlsxArrayBuffer(bytes.buffer as ArrayBuffer, { externalLinkPartCount: 0, connectionPartCount: 0, queryTablePartCount: 0 })).rejects.toThrow("XLSX_ACTIVE_CONTENT_REFUSED");

    const clean = await JSZip.loadAsync(await workbookBuffer());
    clean.file("xl/_rels/odd.xml.rels", `<Relationships xmlns="${PACKAGE_REL_NS}"><Relationship Id="rOdd" Type="${REL_NS}/oleObject" Target="../media/blob.bin"/></Relationships>`);
    bytes = await clean.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    await expect(analyzeXlsxArrayBuffer(bytes.buffer as ArrayBuffer, { externalLinkPartCount: 0, connectionPartCount: 0, queryTablePartCount: 0 })).rejects.toThrow("XLSX_ACTIVE_CONTENT_REFUSED");
  });
});
