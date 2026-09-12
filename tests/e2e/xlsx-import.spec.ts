import { expect, test, type Page } from "@playwright/test";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const CASE_PASSPHRASE = "xlsx-import-e2e-secret-2026";

async function openInternalExports(page: Page) {
  const panel = page.locator("details.master-export");
  if (!await panel.evaluate((element) => (element as HTMLDetailsElement).open)) {
    await panel.getByText("Exports internes et sauvegarde complète", { exact: true }).click();
  }
}

async function xlsxQuestionnaire(): Promise<Buffer> {
  const zip = new JSZip();
  const files: Record<string, string> = {
    "[Content_Types].xml": `<Types><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>`,
    "_rels/.rels": `<Relationships xmlns="${PACKAGE_REL_NS}"/>`,
    "xl/workbook.xml": `<workbook xmlns="${NS}" xmlns:r="${REL_NS}"><sheets><sheet name="Security Questionnaire" sheetId="1" r:id="rId1"/><sheet name="Hidden notes" sheetId="2" state="hidden" r:id="rId2"/></sheets><definedNames><definedName name="LegacyInput">'Security Questionnaire'!$F$3</definedName></definedNames><calcPr calcMode="auto" forceFullCalc="1"/></workbook>`,
    "xl/_rels/workbook.xml.rels": `<Relationships xmlns="${PACKAGE_REL_NS}"><Relationship Id="rId1" Type="${REL_NS}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL_NS}/worksheet" Target="worksheets/sheet2.xml"/></Relationships>`,
    "xl/worksheets/sheet1.xml": `<worksheet xmlns="${NS}"><dimension ref="A1:F3"/><sheetData><row r="1"><c r="F1" t="inlineStr"><is><t>Question</t></is></c></row><row r="2"><c r="F2" t="inlineStr"><is><t>Décrivez vos contrôles d'accès administrateur.</t></is></c></row><row r="3"><c r="F3" t="str"><f>UNTRUSTED()</f><v>Disposez-vous d'une procédure de sauvegarde documentée ?</v></c></row></sheetData></worksheet>`,
    "xl/worksheets/sheet2.xml": `<worksheet xmlns="${NS}"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Question masquée non importée ?</t></is></c><c r="B1"><f>1+1</f><v>2</v></c></row></sheetData></worksheet>`,
  };
  for (const [name, content] of Object.entries(files)) zip.file(name, content, { createFolders: false });
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

test("preflights XLSX in a Worker and requires sheet confirmation", async ({ page }) => {
  const originalWorkbook = await xlsxQuestionnaire();
  await page.goto("/questionnaire-import");
  await expect(page.locator('[data-blackproof-component="questionnaire-import"][data-blackproof-hydrated="true"]')).toBeVisible();
  await page.getByLabel("Choisir le questionnaire").setInputFiles({
    name: "security-questionnaire.xlsx",
    mimeType: XLSX_MIME,
    buffer: originalWorkbook,
  });

  await expect(page.getByRole("heading", { name: "Vérifiez la feuille retenue." })).toBeVisible();
  await expect(page.getByLabel("Feuille à utiliser")).toHaveValue("Security Questionnaire");
  await expect(page.getByText("2 questions détectées dans la feuille « Security Questionnaire »", { exact: false })).toBeVisible();
  await page.getByText("Voir les contrôles appliqués au classeur", { exact: true }).click();
  await expect(page.getByText("2 formule(s) non exécutée(s)", { exact: false })).toBeVisible();
  await expect(page.getByText("1 feuille(s) masquée(s) non importée(s).", { exact: true })).toBeVisible();
  await expect(page.getByText("Cellule littérale · F2", { exact: true })).toBeVisible();
  await expect(page.getByText("Valeur mémorisée d’une formule · F3", { exact: true })).toBeVisible();

  const createButton = page.locator("#create-local-case button", { hasText: "Protéger et ouvrir le dossier" });
  await expect(createButton).toBeDisabled();
  await page.getByRole("button", { name: "Utiliser cette feuille" }).click();
  await expect(createButton).toBeDisabled();
  await page.getByLabel("Phrase secrète du dossier", { exact: true }).fill(CASE_PASSPHRASE);
  await page.getByLabel("Confirmer la phrase secrète", { exact: true }).fill(CASE_PASSPHRASE);
  await expect(createButton).toBeEnabled();
  await Promise.all([
    page.waitForURL(/\/app\/case#id=/),
    createButton.click(),
  ]);
  await expect(page).toHaveURL(/\/app\/case#id=/);
  await expect(page.getByRole("heading", { name: "Import security-questionnaire.xlsx" })).toBeVisible();

  await page.getByLabel("Réponse à envoyer").first().fill("Les accès administrateur utilisent un MFA nominatif.");
  await page.getByLabel("Statut d’export").first().selectOption("ready");
  await page.getByRole("button", { name: "Question suivante", exact: true }).click();
  const activeQuestion = page.locator("details.question-card[open]");
  await activeQuestion.getByLabel("Réponse à envoyer").fill("La procédure de sauvegarde est documentée et testée trimestriellement.");
  await activeQuestion.getByLabel("Statut d’export").selectOption("ready");
  await expect(page.getByText("Réponse mise à jour. Empreinte recalculée.")).toBeVisible();
  await page.getByRole("button", { name: "Sauvegarder les changements" }).click();
  await expect(page.getByText("Dossier local sauvegardé.")).toBeVisible();

  const deliveryReview = page.locator(".delivery-review");
  await deliveryReview.getByRole("button", { name: "Inclure tous les éléments admissibles", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Contenu exact associé à votre confirmation" })).toBeVisible();
  await page.getByRole("checkbox", { name: /J’ai vérifié le contenu exact destiné au client et son empreinte/ }).check();
  await expect(page.getByRole("heading", { name: "Exporter les réponses validées dans un nouveau classeur borné." })).toHaveCount(0);
  await expect(page.getByLabel("Classeur XLSX source exact")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Télécharger le classeur de réponses XLSX" })).toHaveCount(0);

  const rawRecord = await page.evaluate(() => new Promise<Record<string, unknown>>((resolve, reject) => {
    const request = indexedDB.open("blackproof-local-first");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction("cases", "readonly");
      const records = transaction.objectStore("cases").getAll();
      records.onerror = () => reject(records.error);
      records.onsuccess = () => resolve(records.result[0] ?? {});
    };
  }));
  expect(rawRecord.encrypted).toBe(true);
  expect(rawRecord).toHaveProperty("payload");
  const rawStorage = JSON.stringify(rawRecord);
  expect(rawStorage).not.toContain("Décrivez vos contrôles d'accès administrateur.");
  expect(rawStorage).not.toContain("security-questionnaire.xlsx");
  expect(rawStorage).not.toContain(CASE_PASSPHRASE);

  await openInternalExports(page);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger le ZIP maître" }).click();
  const download = await downloadPromise;
  const zip = await JSZip.loadAsync(await readFile((await download.path())!));
  expect(zip.file("source-import.json")).not.toBeNull();
  const sourceImport = JSON.parse(await zip.file("source-import.json")!.async("string"));
  expect(sourceImport).toMatchObject({
    profile: "blackproof-xlsx-import-v1",
    sourceFormat: "xlsx",
    selectedSheet: "Security Questionnaire",
    selectedColumn: 6,
    formulaCount: 2,
    questionSources: [
      { question: "Décrivez vos contrôles d'accès administrateur.", source: "literal-cell", cellReference: "F2" },
      { source: "cached-formula-value", cellReference: "F3" },
    ],
  });
  const manifest = JSON.parse(await zip.file("manifest.json")!.async("string"));
  expect(manifest.files.some((file: { filename?: string }) => file.filename === "source-import.json")).toBe(true);

  await page.goto("/verify");
  await expect(page.locator('[data-blackproof-verify-ready="true"]')).toBeVisible();
  await page.locator('input[type="file"]').first().setInputFiles((await download.path())!);
  await expect(page.getByRole("heading", { name: "Contrôles locaux du ZIP et du ProofPack réussis" })).toBeVisible();
  await expect(page.getByText("Cohérence du fichier XLSX associé").locator("..").getByText("OK")).toBeVisible();

  await page.goBack();
  await expect(page.getByRole("heading", { name: "Déverrouiller ce dossier." })).toBeVisible();
  await page.getByLabel("Phrase secrète du dossier", { exact: true }).fill(CASE_PASSPHRASE);
  await page.getByRole("button", { name: "Déverrouiller le dossier" }).click();
  await page.locator("details.questionnaire-block").getByText("Modifier le questionnaire source", { exact: true }).click();
  const questionnaire = page.getByLabel("Questionnaire source", { exact: true });
  await questionnaire.fill(`${await questionnaire.inputValue()}\n3. Le questionnaire XLSX a-t-il été corrigé manuellement ?`);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Réanalyser le questionnaire" }).click();
  await expect(page.getByText("Questionnaire réanalysé.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Sauvegarder les changements" }).click();
  await expect(page.getByText("Dossier local sauvegardé.")).toBeVisible();
  await openInternalExports(page);
  const editedDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger le ZIP maître" }).click();
  const editedDownload = await editedDownloadPromise;
  const editedZip = await JSZip.loadAsync(await readFile((await editedDownload.path())!));
  expect(editedZip.file("source-import.json")).toBeNull();
  const editedProofpack = JSON.parse(await editedZip.file("proofpack.json")!.async("string"));
  expect(editedProofpack.sourceQuestionnaire).toMatchObject({
    fileName: "security-questionnaire-edited.txt",
    format: "text",
  });
  expect(editedProofpack.sourceQuestionnaire.originalFileSha256).toMatch(/^sha256:[a-f0-9]{64}$/);
  const firstLineage = JSON.parse(await editedZip.file("source-lineage.json")!.async("string"));
  expect(firstLineage).toMatchObject({
    originalFileName: "security-questionnaire.xlsx",
    derivedSourceFileName: "security-questionnaire-edited.txt",
    derivedSourceSha256: editedProofpack.sourceQuestionnaire.normalizedQuestionnaireSha256,
  });

  await questionnaire.fill(`${await questionnaire.inputValue()}\n4. Cette source dérivée a-t-elle été corrigée une seconde fois ?`);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Réanalyser le questionnaire" }).click();
  await expect(page.getByText("Questionnaire réanalysé.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Sauvegarder les changements" }).click();
  await openInternalExports(page);
  const secondDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger le ZIP maître" }).click();
  const secondZip = await JSZip.loadAsync(await readFile((await (await secondDownloadPromise).path())!));
  const secondProofpack = JSON.parse(await secondZip.file("proofpack.json")!.async("string"));
  const secondLineage = JSON.parse(await secondZip.file("source-lineage.json")!.async("string"));
  expect(secondLineage).toMatchObject({
    originalFileName: firstLineage.originalFileName,
    originalFileSha256: firstLineage.originalFileSha256,
    previousProofPackFingerprint: editedProofpack.fingerprint,
    derivedSourceFileName: "security-questionnaire-edited.txt",
    derivedSourceSha256: secondProofpack.sourceQuestionnaire.normalizedQuestionnaireSha256,
  });
});
