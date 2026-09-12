import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";

const PASSPHRASE = "knowledge-e2e-secret";
const CASE_PASSPHRASE = "knowledge-case-e2e-secret-2026";
const APPROVED_ANSWER = "Le MFA est imposé aux comptes administrateurs et les exceptions sont revues périodiquement.";

async function createDefaultCase(page: Page, title: string) {
  await page.goto("/app");
  await expect(page.locator('[data-blackproof-component="proof-app"][data-blackproof-hydrated="true"]')).toBeVisible();
  await page.getByLabel("Nom du dossier").fill(title);
  await page.getByLabel("Phrase secrète du dossier", { exact: true }).fill(CASE_PASSPHRASE);
  await page.getByLabel("Confirmer la phrase secrète", { exact: true }).fill(CASE_PASSPHRASE);
  await Promise.all([
    page.waitForURL(/\/app\/case#id=/),
    page.getByRole("button", { name: "Analyser et ouvrir l’éditeur", exact: true }).click(),
  ]);
  await expect(page.getByRole("heading", { name: "Compléter et préparer le dossier." })).toBeVisible();
}

async function completePromptSequence(
  page: Page,
  action: () => Promise<unknown>,
  prompts: ReadonlyArray<{ message: RegExp; answer: string }>
) {
  let nextDialog = page.waitForEvent("dialog");
  const actionPromise = action();
  for (const [index, prompt] of prompts.entries()) {
    const dialog = await nextDialog;
    expect(dialog.message()).toMatch(prompt.message);
    const followingDialog = index + 1 < prompts.length ? page.waitForEvent("dialog") : null;
    await dialog.accept(prompt.answer);
    if (followingDialog) nextDialog = followingDialog;
  }
  await actionPromise;
}

test("the personal knowledge vault is hidden from the controlled pilot", async ({ page, request }) => {
  const status = await (await request.get("/api/status.json")).json();
  test.skip(status.securityPosture?.knowledgeVault !== "disabled-during-controlled-pilot", "requires the controlled-pilot artifact");
  await page.goto("/app/knowledge");
  await expect(page.getByRole("heading", { name: "La base personnelle n’est pas disponible dans cette version." })).toBeVisible();
  await expect(page.locator('[data-blackproof-knowledge-ready="true"]')).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Base personnelle/ })).toHaveCount(0);
});

test("the decrypted Knowledge Vault locks itself and clears its secret input after inactivity", async ({ page, request }) => {
  const status = await (await request.get("/api/status.json")).json();
  test.skip(status.securityPosture?.knowledgeVault !== "enabled-after-product-convergence", "requires an explicitly enabled Knowledge Vault qualification build");
  await page.addInitScript(() => {
    const nativeSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) =>
      nativeSetTimeout(handler, timeout === 15 * 60_000 ? 3_000 : timeout, ...args)) as typeof window.setTimeout;
  });

  await page.goto("/app/knowledge");
  await expect(page.locator('[data-blackproof-knowledge-ready="true"]')).toBeVisible();
  await page.getByLabel("Phrase secrète de la base personnelle", { exact: true }).fill(PASSPHRASE);
  await page.getByLabel("Confirmer la phrase secrète de la base personnelle", { exact: true }).fill(PASSPHRASE);
  await page.getByRole("button", { name: "Initialiser la base" }).click();
  await expect(page.getByLabel("Synthèse de la base personnelle")).toBeVisible();

  await expect(page.getByRole("status")).toContainText("verrouillé automatiquement", { timeout: 10_000 });
  await expect(page.getByLabel("Phrase secrète de la base personnelle", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Synthèse de la base personnelle")).toHaveCount(0);
});

test("personal knowledge vault promotes, matches, applies as draft and exports provenance", async ({ page, request }) => {
  const status = await (await request.get("/api/status.json")).json();
  test.skip(status.securityPosture?.knowledgeVault !== "enabled-after-product-convergence", "requires an explicitly enabled Knowledge Vault qualification build");
  await createDefaultCase(page, "Knowledge source");
  await page.getByLabel("Réponse à envoyer").first().fill(APPROVED_ANSWER);
  await page.getByLabel("Statut d’export").first().selectOption("ready");
  await expect(page.getByText("Réponse mise à jour. Empreinte recalculée.", { exact: true })).toBeVisible();
  const promote = page.getByRole("button", { name: "Ajouter à la base personnelle" }).first();
  await expect(promote).toBeEnabled();

  await promote.click();
  await page.getByLabel("Phrase secrète de la base personnelle", { exact: true }).fill(PASSPHRASE);
  await page.getByLabel("Confirmer la phrase secrète de la base personnelle", { exact: true }).fill(PASSPHRASE);
  await page.getByRole("button", { name: "Déverrouiller puis continuer" }).click();
  await page.getByLabel("Libellé de l’approbateur local", { exact: true }).fill("RSSI local");
  await page.getByLabel("Périmètre d’applicabilité", { exact: true }).fill("SaaS principal, comptes administrateurs");
  await page.getByLabel("Date de prochaine revue", { exact: true }).fill("2030-01-01");
  await page.getByRole("button", { name: "Ajouter comme formulation réutilisable" }).click();
  await expect(page.getByText("Formulation ajoutée au coffre personnel chiffré.", { exact: false })).toBeVisible();

  await page.goto("/app/knowledge");
  await expect(page.locator('[data-blackproof-knowledge-ready="true"]')).toBeVisible();
  await page.getByLabel("Phrase secrète de la base personnelle", { exact: true }).fill(PASSPHRASE);
  await page.getByRole("button", { name: "Déverrouiller la base" }).click();
  await expect(page.getByText(APPROVED_ANSWER, { exact: true })).toBeVisible();
  await expect(page.locator(".metrics article").filter({ hasText: "Approuvées localement" }).getByText("1", { exact: true })).toBeVisible();
  const backupPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Sauvegarder la base" }).click();
  const backup = await backupPromise;
  const backupPath = (await backup.path())!;
  const backupText = (await readFile(backupPath)).toString("utf8");
  expect(backupText).toContain("blackproof-personal-knowledge-backup-v1");
  expect(backupText).not.toContain(APPROVED_ANSWER);

  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("blackproof-personal-knowledge");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction("vaults", "readwrite");
      transaction.objectStore("vaults").clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
  }));
  await page.reload();
  await expect(page.getByRole("button", { name: "Initialiser la base" })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(backupPath);
  await page.getByLabel("Phrase secrète de la sauvegarde Knowledge", { exact: true }).fill(PASSPHRASE);
  await page.getByRole("button", { name: "Vérifier puis fusionner" }).click();
  await expect(page.getByText("Sauvegarde fusionnée : 1 entrée(s)", { exact: false })).toBeVisible();
  await expect(page.getByText(APPROVED_ANSWER, { exact: true })).toBeVisible();

  await createDefaultCase(page, "Knowledge target");
  await page.getByRole("button", { name: "Chercher dans la base personnelle" }).first().click();
  await page.getByLabel("Phrase secrète de la base personnelle", { exact: true }).fill(PASSPHRASE);
  await page.getByRole("button", { name: "Déverrouiller puis chercher" }).click();
  await expect(page.getByText("100/100 · question-exacte", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Copier comme brouillon" }).first().click();
  await expect(page.getByLabel("Réponse à envoyer").first()).toHaveValue(APPROVED_ANSWER);
  await expect(page.getByLabel("Statut d’export").first()).toHaveValue("draft");
  await expect(page.getByText("Issue de l’entrée", { exact: false })).toBeVisible();

  await page.getByLabel("Statut d’export").first().selectOption("ready");
  await expect(page.getByText("Issue de l’entrée", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Sauvegarder les changements" }).click();
  await expect(page.getByText("Dossier local sauvegardé.")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ZIP Master interne" }).click();
  const download = await downloadPromise;
  const zip = await JSZip.loadAsync(await readFile((await download.path())!));
  expect(zip.file("knowledge-use.json")).not.toBeNull();
  const knowledgeUse = JSON.parse(await zip.file("knowledge-use.json")!.async("string"));
  expect(knowledgeUse.uses).toHaveLength(1);
  expect(knowledgeUse.uses[0].entryFingerprint).toMatch(/^bp_sha256_[a-f0-9]{64}$/);
  expect(await zip.file("proofpack.json")!.async("string")).not.toContain("knowledgeUses");

  await page.goto("/verify");
  await expect(page.locator('[data-blackproof-verify-ready="true"]')).toBeVisible();
  await page.locator('input[type="file"]').first().setInputFiles((await download.path())!);
  await expect(page.getByRole("heading", { name: "Contrôles locaux du ZIP et du ProofPack réussis" })).toBeVisible();
  await expect(page.getByText("Référence Knowledge structurée").locator("..").getByText("OK")).toBeVisible();

  await page.goto("/app/knowledge");
  await page.getByLabel("Phrase secrète de la base personnelle", { exact: true }).fill(PASSPHRASE);
  await page.getByRole("button", { name: "Déverrouiller la base" }).click();
  await expect(page.getByText(APPROVED_ANSWER, { exact: true })).toBeVisible();
  const casesPage = await page.context().newPage();
  await casesPage.goto("/app/cases");
  await expect(casesPage.locator('[data-blackproof-ready="true"]')).toBeVisible();
  await completePromptSequence(casesPage, () => casesPage.getByRole("button", { name: "Panic Wipe", exact: true }).click(), [
    { message: /Tapez EFFACER/, answer: "EFFACER" },
  ]);
  await expect(page.getByText("Panic Wipe détecté : le coffre déverrouillé et la phrase secrète ont été effacés de cette page.")).toBeVisible();
  await expect(page.getByText(APPROVED_ANSWER, { exact: true })).toHaveCount(0);
  const counts = await page.evaluate(async () => {
    const count = (name: string, store: string) => new Promise<number>((resolve, reject) => {
      const request = indexedDB.open(name);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const countRequest = request.result.transaction(store, "readonly").objectStore(store).count();
        countRequest.onerror = () => reject(countRequest.error);
        countRequest.onsuccess = () => resolve(countRequest.result);
      };
    });
    return {
      cases: await count("blackproof-local-first", "cases"),
      knowledge: await count("blackproof-personal-knowledge", "vaults"),
    };
  });
  expect(counts).toEqual({ cases: 0, knowledge: 0 });
  await casesPage.close();
});
