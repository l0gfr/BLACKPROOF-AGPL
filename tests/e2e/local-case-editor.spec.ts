import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import {
  buildProofPackDelivery,
  buildProofPackDeliverySchemaCorpus,
  buildProofPackSchemaCorpus,
  createProofCaseFromQuestionnaire,
} from "../../packages/core/src/index";
import { decryptLocalPayload, decryptLocalPayloadBatch, encryptLocalPayload, encryptLocalPayloadBatch, type EncryptedLocalBatchPayload, type EncryptedLocalPayload } from "../../apps/web/src/lib/local-encryption";
import { normalizeLegacyLocalProofCaseRecord, type LocalProofCaseRecord } from "../../apps/web/src/lib/local-db";

const DEFAULT_CASE_PASSPHRASE = "blackproof-e2e-case-secret-2026";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort();

  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

function expectedProofPackFingerprint(proofpack: Record<string, unknown>): string {
  const { fingerprint: _fingerprint, ...base } = proofpack;
  const digest = createHash("sha256").update(stableStringify(base)).digest("hex");

  return `bp_sha256_${digest}`;
}

async function createLegacyEncryptedPayload(value: unknown, passphrase: string): Promise<EncryptedLocalPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 310_000 },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(value)));
  return {
    version: 1,
    algorithm: "AES-GCM",
    keyDerivation: "PBKDF2-SHA-256",
    iterations: 310_000,
    salt: Buffer.from(salt).toString("base64"),
    iv: Buffer.from(iv).toString("base64"),
    ciphertext: Buffer.from(ciphertext).toString("base64"),
  };
}

async function rewriteBackupAsVersion13(bytes: Buffer, passphrase?: string): Promise<Buffer> {
  const zip = await JSZip.loadAsync(bytes);
  const manifest = JSON.parse(await zip.file("manifest.json")!.async("string"));
  delete manifest.localEnvelopeVersion;
  const descriptors = manifest.files as Array<{ path: string; sha256: string; size: number }>;

  if (passphrase) {
    const envelopes = await Promise.all(descriptors.map(async (descriptor) =>
      JSON.parse(await zip.file(descriptor.path)!.async("string")) as EncryptedLocalBatchPayload
    ));
    const clear = await decryptLocalPayloadBatch<{ cleartext: string }>(envelopes, passphrase);
    const masterIndex = descriptors.findIndex((descriptor) => descriptor.path === "master.json");
    const record = JSON.parse(clear[masterIndex].cleartext);
    delete record.localEnvelopeVersion;
    record.updatedAt = new Date(Date.parse(record.proofpack.case.updatedAt) + 1_000).toISOString();
    if (!normalizeLegacyLocalProofCaseRecord(record as LocalProofCaseRecord).migrated) throw new Error("Encrypted V13 fixture was not recognized as legacy.");
    clear[masterIndex] = { cleartext: JSON.stringify(record) };
    const inventoryIndex = descriptors.findIndex((descriptor) => descriptor.path === "inventory.json");
    if (inventoryIndex >= 0) {
      const inventory = JSON.parse(clear[inventoryIndex].cleartext);
      delete inventory.localEnvelopeVersion;
      clear[inventoryIndex] = { cleartext: JSON.stringify(inventory) };
    }
    const encrypted = await encryptLocalPayloadBatch(descriptors.map((descriptor, index) => ({
      aad: descriptor.path,
      value: clear[index],
    })), passphrase);
    descriptors.forEach((descriptor, index) => {
      const stored = JSON.stringify(encrypted[index]);
      zip.file(descriptor.path, stored, { createFolders: false });
      descriptor.sha256 = createHash("sha256").update(stored).digest("hex");
      descriptor.size = new TextEncoder().encode(stored).byteLength;
    });
  } else {
    const record = JSON.parse(await zip.file("master.json")!.async("string"));
    delete record.localEnvelopeVersion;
    record.updatedAt = new Date(Date.parse(record.proofpack.case.updatedAt) + 1_000).toISOString();
    if (!normalizeLegacyLocalProofCaseRecord(record as LocalProofCaseRecord).migrated) throw new Error("Cleartext V13 fixture was not recognized as legacy.");
    const stored = JSON.stringify(record);
    zip.file("master.json", stored, { createFolders: false });
    const descriptor = descriptors.find((item) => item.path === "master.json")!;
    descriptor.sha256 = createHash("sha256").update(stored).digest("hex");
    descriptor.size = new TextEncoder().encode(stored).byteLength;
  }

  zip.file("manifest.json", JSON.stringify(manifest, null, 2), { createFolders: false });
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

async function deleteCaseFromIndexedDb(page: Page, caseId: string): Promise<void> {
  await page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(["cases", "deliverySnapshots"], "readwrite");
      transaction.objectStore("cases").delete(id);
      transaction.objectStore("deliverySnapshots").index("caseId").openKeyCursor(IDBKeyRange.only(id)).onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursor | null>).result;
        if (cursor) { cursor.delete(); cursor.continue(); }
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }, caseId);
}

async function downgradeStoredCaseToLegacyCleartext(page: Page, caseId: string, passphrase: string): Promise<void> {
  const stored = await page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    return new Promise<any>((resolve, reject) => {
      const request = database.transaction("cases", "readonly").objectStore("cases").get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }, caseId);
  if (stored?.encrypted !== true) throw new Error("Expected an encrypted source fixture.");
  const clear = stored.payload.version === 2
    ? (await decryptLocalPayloadBatch<LocalProofCaseRecord>([stored.payload], passphrase))[0]
    : await decryptLocalPayload<LocalProofCaseRecord>(stored.payload, passphrase);
  await page.evaluate(async (record) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("cases", "readwrite");
      transaction.objectStore("cases").put({ ...record, encrypted: false });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }, clear);
}

async function downgradeBackupToLegacyCleartext(bytes: Buffer, passphrase: string): Promise<Buffer> {
  const zip = await JSZip.loadAsync(bytes);
  const manifest = JSON.parse(await zip.file("manifest.json")!.async("string"));
  const descriptors = manifest.files as Array<{ path: string; sha256: string; size: number }>;
  const envelopes = await Promise.all(descriptors.map(async (descriptor) =>
    JSON.parse(await zip.file(descriptor.path)!.async("string")) as EncryptedLocalBatchPayload
  ));
  const clear = await decryptLocalPayloadBatch<{ cleartext: string }>(envelopes, passphrase);
  descriptors.forEach((descriptor, index) => {
    const stored = clear[index].cleartext;
    zip.file(descriptor.path, stored, { createFolders: false });
    descriptor.sha256 = createHash("sha256").update(stored).digest("hex");
    descriptor.size = new TextEncoder().encode(stored).byteLength;
  });
  manifest.encrypted = false;
  zip.file("manifest.json", JSON.stringify(manifest, null, 2), { createFolders: false });
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

async function rewriteStoredCaseAsVersion13(page: Page, caseId: string, passphrase?: string): Promise<void> {
  const stored = await page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    return new Promise<any>((resolve, reject) => {
      const request = database.transaction("cases", "readonly").objectStore("cases").get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }, caseId);

  if (passphrase) {
    const record = stored.payload.version === 2
      ? (await decryptLocalPayloadBatch<LocalProofCaseRecord>([stored.payload], passphrase))[0]
      : await decryptLocalPayload<LocalProofCaseRecord>(stored.payload as EncryptedLocalPayload, passphrase);
    const legacyUpdatedAt = new Date(Date.parse(record.proofpack.case.updatedAt) + 1_000).toISOString();
    delete (record as Partial<LocalProofCaseRecord>).localEnvelopeVersion;
    record.updatedAt = legacyUpdatedAt;
    if (!normalizeLegacyLocalProofCaseRecord(record).migrated) throw new Error("Encrypted local V13 fixture was not recognized as legacy.");
    stored.payload = stored.payload.version === 2
      ? (await encryptLocalPayloadBatch([{ aad: `case:${caseId}`, value: record }], passphrase))[0]
      : await encryptLocalPayload(record, passphrase);
    stored.updatedAt = legacyUpdatedAt;
    delete stored.localEnvelopeVersion;
  } else {
    delete stored.localEnvelopeVersion;
    stored.updatedAt = new Date(Date.parse(stored.proofpack.case.updatedAt) + 1_000).toISOString();
    if (!normalizeLegacyLocalProofCaseRecord(stored as LocalProofCaseRecord).migrated) throw new Error("Cleartext local V13 fixture was not recognized as legacy.");
  }

  await page.evaluate(async (record) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("cases", "readwrite");
      transaction.objectStore("cases").put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }, stored);
}

function rewriteRecordWithLegacyCrLf(record: LocalProofCaseRecord): LocalProofCaseRecord {
  const questionnaire = record.questionnaire.replace(/\n/g, "\r\n");
  if (questionnaire === record.questionnaire) throw new Error("The fixture questionnaire needs at least two lines.");
  const sourceSha256 = `sha256:${createHash("sha256").update(questionnaire).digest("hex")}`;
  record.questionnaire = questionnaire;
  record.proofpack.sourceQuestionnaire.sha256 = sourceSha256;
  record.proofpack.sourceQuestionnaire.normalizedQuestionnaireSha256 = sourceSha256;
  record.proofpack.sourceQuestionnaire.size = new TextEncoder().encode(questionnaire).length;
  record.proofpack.fingerprint = expectedProofPackFingerprint(record.proofpack as unknown as Record<string, unknown>);
  record.proofpackFingerprint = record.proofpack.fingerprint;
  return record;
}

async function rewriteStoredCaseWithLegacyCrLf(page: Page, caseId: string, passphrase?: string): Promise<string> {
  const stored = await page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    return new Promise<any>((resolve, reject) => {
      const request = database.transaction("cases", "readonly").objectStore("cases").get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }, caseId);
  const record = passphrase
    ? (stored.payload.version === 2
      ? (await decryptLocalPayloadBatch<LocalProofCaseRecord>([stored.payload], passphrase))[0]
      : await decryptLocalPayload<LocalProofCaseRecord>(stored.payload, passphrase))
    : stored as LocalProofCaseRecord;
  const previousRevisionId = record.proofpack.revisionId;
  rewriteRecordWithLegacyCrLf(record);
  if (passphrase) {
    stored.payload = stored.payload.version === 2
      ? (await encryptLocalPayloadBatch([{ aad: `case:${caseId}`, value: record }], passphrase))[0]
      : await encryptLocalPayload(record, passphrase);
    stored.revisionId = previousRevisionId;
  }
  await page.evaluate(async (value) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("cases", "readwrite");
      transaction.objectStore("cases").put(value);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }, stored);
  return previousRevisionId;
}

async function rewriteBackupWithLegacyCrLf(bytes: Buffer, passphrase?: string): Promise<Buffer> {
  const zip = await JSZip.loadAsync(bytes);
  const manifest = JSON.parse(await zip.file("manifest.json")!.async("string"));
  const descriptors = manifest.files as Array<{ path: string; sha256: string; size: number }>;
  if (passphrase) {
    const envelopes = await Promise.all(descriptors.map(async (descriptor) =>
      JSON.parse(await zip.file(descriptor.path)!.async("string")) as EncryptedLocalBatchPayload
    ));
    const clear = await decryptLocalPayloadBatch<{ cleartext: string }>(envelopes, passphrase);
    const masterIndex = descriptors.findIndex((descriptor) => descriptor.path === "master.json");
    const record = rewriteRecordWithLegacyCrLf(JSON.parse(clear[masterIndex].cleartext));
    clear[masterIndex] = { cleartext: JSON.stringify(record) };
    const encrypted = await encryptLocalPayloadBatch(descriptors.map((descriptor, index) => ({
      aad: descriptor.path,
      value: clear[index],
    })), passphrase);
    descriptors.forEach((descriptor, index) => {
      const stored = JSON.stringify(encrypted[index]);
      zip.file(descriptor.path, stored, { createFolders: false });
      descriptor.sha256 = createHash("sha256").update(stored).digest("hex");
      descriptor.size = new TextEncoder().encode(stored).byteLength;
    });
  } else {
    const record = rewriteRecordWithLegacyCrLf(JSON.parse(await zip.file("master.json")!.async("string")));
    const stored = JSON.stringify(record);
    zip.file("master.json", stored, { createFolders: false });
    const descriptor = descriptors.find((item) => item.path === "master.json")!;
    descriptor.sha256 = createHash("sha256").update(stored).digest("hex");
    descriptor.size = new TextEncoder().encode(stored).byteLength;
  }
  zip.file("manifest.json", JSON.stringify(manifest, null, 2), { createFolders: false });
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

async function completeEvidenceReference(page: Page, title: string) {
  const status = page.getByLabel(`Statut de preuve pour ${title}`, { exact: true });
  await page.getByRole("button", { name: "Référencer", exact: true }).first().click();
  const reference = page.locator(`[aria-label="Référence de preuve pour ${title}"]`);
  await expect(reference.getByText("0/2 pour référencer", { exact: true })).toBeVisible();
  await reference.getByLabel(`Type de référence pour ${title}`, { exact: true }).selectOption("file");
  await reference.getByLabel(`Nom ou identifiant de référence pour ${title}`, { exact: true }).fill("mfa-admin-policy-v3.pdf");
  await expect(reference.getByText("2/2 pour référencer", { exact: true })).toBeVisible();
  await expect(reference.locator("details.evidence-qualification-fields")).not.toHaveAttribute("open", "");

  await status.selectOption("available");
  await expect(status).not.toHaveValue("available");
  await expect(page.getByText("Renseignez une référence complète avant de déclarer cette preuve disponible.")).toBeVisible();
  await expect(reference.locator("details.evidence-qualification-fields")).toHaveAttribute("open", "");
  await expect(reference.getByText("0/4 champs", { exact: true })).toBeVisible();
  await reference.getByLabel(`Système source pour ${title}`, { exact: true }).fill("GED sécurité");
  await reference.getByLabel(`Date d’observation pour ${title}`, { exact: true }).fill("2026-07-11T10:30");
  await reference.getByLabel(`Propriétaire pour ${title}`, { exact: true }).fill("RSSI");
  await reference.getByLabel(`Sensibilité pour ${title}`, { exact: true }).selectOption("internal");
  await reference.getByLabel(`Mode d’export pour ${title}`, { exact: true }).selectOption("reference-only");
  await reference.getByText("Ajouter une référence publique pour le client", { exact: true }).click();
  await reference.getByLabel(`Référence publique destinée au client pour ${title}`, { exact: true }).fill("Rapport d’audit externe 2026 — consultable sous NDA");

  await expect(reference.getByText("4/4 champs", { exact: true })).toBeVisible();
  await expect(reference.getByRole("button", { name: "Déclarer comme disponible", exact: true })).toBeEnabled();
  await reference.getByRole("button", { name: "Déclarer comme disponible", exact: true }).click();
  await expect(status).toHaveValue("available");
  await expect(reference).toBeHidden();
}

async function openInternalExports(page: Page) {
  const panel = page.locator("details.master-export");
  if (!await panel.evaluate((element) => (element as HTMLDetailsElement).open)) {
    await panel.getByText("Exports internes et sauvegarde complète", { exact: true }).click();
  }
}

async function openDeliveryHistory(page: Page) {
  const panel = page.locator("details.delivery-history");
  if (!await panel.evaluate((element) => (element as HTMLDetailsElement).open)) {
    await panel.getByText(/Historique des dossiers clients/).click();
  }
}

async function navigateToEncryptedCase(
  page: Page,
  action: () => Promise<unknown>,
  passphrase = DEFAULT_CASE_PASSPHRASE,
  expectLoaded = true,
) {
  await action();
  await expect(page.getByRole("heading", { name: "Déverrouiller ce dossier." })).toBeVisible();
  await page.getByLabel("Phrase secrète du dossier", { exact: true }).fill(passphrase);
  await page.getByRole("button", { name: "Déverrouiller le dossier", exact: true }).click();
  if (expectLoaded) await expect(page.getByRole("heading", { name: "Compléter et préparer le dossier." })).toBeVisible();
}

async function navigateToLegacyClearCase(
  page: Page,
  action: () => Promise<unknown>,
  passphrase = DEFAULT_CASE_PASSPHRASE
) {
  await action();
  await expect(page.getByRole("heading", { name: "Protéger puis ouvrir ce dossier historique." })).toBeVisible();
  await page.getByLabel("Phrase secrète du dossier", { exact: true }).fill(passphrase);
  await page.getByLabel("Confirmer la phrase secrète", { exact: true }).fill(passphrase);
  await page.getByRole("button", { name: "Chiffrer et ouvrir", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Compléter et préparer le dossier." })).toBeVisible();
}

async function analyzeAndOpenEditor(page: Page, passphrase = DEFAULT_CASE_PASSPHRASE) {
  await expect(page.locator('[data-blackproof-component="proof-app"][data-blackproof-hydrated="true"]')).toBeVisible();
  await page.getByLabel("Phrase secrète du dossier", { exact: true }).fill(passphrase);
  await page.getByLabel("Confirmer la phrase secrète", { exact: true }).fill(passphrase);
  await expect(page.getByRole("button", { name: "Analyser et ouvrir l’éditeur", exact: true })).toBeEnabled();
  await Promise.all([
    page.waitForURL(/\/app\/case#id=/),
    page.getByRole("button", { name: "Analyser et ouvrir l’éditeur", exact: true }).click(),
  ]);
  await expect(page.getByRole("heading", { name: "Compléter et préparer le dossier." })).toBeVisible();
}

async function delayCryptoOperationPastIdle(page: Page, method: "decrypt" | "encrypt") {
  await page.addInitScript(({ delayedMethod }) => {
    const nativeSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) =>
      nativeSetTimeout(handler, timeout === 15 * 60_000 ? 2_500 : timeout, ...args)) as typeof window.setTimeout;
    const subtle = crypto.subtle as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
    const nativeOperation = subtle[delayedMethod].bind(crypto.subtle);
    Object.defineProperty(crypto.subtle, delayedMethod, {
      configurable: true,
      value: async (...args: unknown[]) => {
        await new Promise<void>((resolve) => nativeSetTimeout(resolve, 5_000));
        return nativeOperation(...args);
      },
    });
  }, { delayedMethod: method });
}

test("browser persistence is requested only after the user's explicit gesture", async ({ page }) => {
  await page.addInitScript(() => {
    let persistent = false;
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: {
        persisted: async () => persistent,
        persist: async () => {
          persistent = true;
          return true;
        },
      },
    });
  });
  await page.goto("/app/cases");
  const state = page.locator("[data-storage-persistence]");
  await expect(state).toHaveAttribute("data-storage-persistence", "not-persistent");
  await page.getByRole("button", { name: "Protéger le stockage sur cet appareil" }).click();
  await expect(state).toHaveAttribute("data-storage-persistence", "persistent");
  await expect(page.getByText("Un effacement manuel du profil reste destructif.", { exact: false })).toBeVisible();
});

test("the decrypted editor locks itself and clears its secret input after inactivity", async ({ page }) => {
  test.setTimeout(45_000);
  await page.addInitScript(() => {
    const nativeSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) =>
      nativeSetTimeout(handler, timeout === 15 * 60_000 ? 7_000 : timeout, ...args)) as typeof window.setTimeout;
    const nativeGenerateKey = crypto.subtle.generateKey.bind(crypto.subtle);
    Object.defineProperty(crypto.subtle, "generateKey", {
      configurable: true,
      value: async (...args: Parameters<SubtleCrypto["generateKey"]>) => {
        await new Promise<void>((resolve) => nativeSetTimeout(resolve, 10_000));
        return Reflect.apply(nativeGenerateKey, crypto.subtle, args);
      },
    });
  });

  let downloads = 0;
  page.on("download", () => downloads += 1);
  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E verrouillage automatique");
  await analyzeAndOpenEditor(page);
  await page.getByLabel("Réponse à envoyer").first().fill("Le MFA est activé pour les comptes administrateurs.");
  await page.getByLabel("Statut d’export").first().selectOption("ready");
  await expect(page.getByText("Réponse mise à jour. Empreinte recalculée.")).toBeVisible();
  await page.getByRole("button", { name: "Sauvegarder les changements", exact: true }).click();
  const deliveryReview = page.locator(".delivery-review");
  await deliveryReview.getByRole("button", { name: "Inclure tous les éléments admissibles", exact: true }).click();
  await expect(deliveryReview.getByRole("heading", { name: "Contenu exact associé à votre confirmation" })).toBeVisible();
  await deliveryReview.getByRole("checkbox", { name: /J’ai vérifié le contenu exact destiné au client/ }).check();
  await deliveryReview.getByText("Signer ce dossier client avec une paire de clés", { exact: false }).click();
  await page.getByRole("button", { name: "Générer une nouvelle paire de clés" }).click();

  await expect(page.getByRole("heading", { name: "Déverrouiller ce dossier." })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("status")).toContainText("verrouillé automatiquement");
  await expect(page.getByLabel("Phrase secrète du dossier", { exact: true })).toHaveValue("");
  await expect(page.getByRole("heading", { name: "Compléter et préparer le dossier." })).toHaveCount(0);
  await page.waitForTimeout(3_500);
  expect(downloads).toBe(0);
});

test("auto-lock cancels a case load that is still decrypting", async ({ page }) => {
  test.setTimeout(35_000);
  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E annulation déchiffrement");
  await analyzeAndOpenEditor(page);
  const caseUrl = page.url();

  await delayCryptoOperationPastIdle(page, "decrypt");
  await page.goto("/app/cases");
  await page.goto(caseUrl);
  await expect(page.getByRole("heading", { name: "Déverrouiller ce dossier." })).toBeVisible();
  await page.getByLabel("Phrase secrète du dossier", { exact: true }).fill(DEFAULT_CASE_PASSPHRASE);
  await page.getByRole("button", { name: "Déverrouiller le dossier", exact: true }).click();

  await expect(page.getByRole("status")).toContainText("verrouillé automatiquement", { timeout: 7_000 });
  await page.waitForTimeout(3_500);
  await expect(page.getByRole("heading", { name: "Compléter et préparer le dossier." })).toHaveCount(0);
  await expect(page.getByLabel("Phrase secrète du dossier", { exact: true })).toHaveValue("");
});

test("auto-lock cancels a cleartext migration before IndexedDB is changed", async ({ page }) => {
  test.setTimeout(35_000);
  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E annulation migration");
  await analyzeAndOpenEditor(page);
  const caseUrl = page.url();
  const caseId = new URLSearchParams(new URL(caseUrl).hash.slice(1)).get("id")!;
  await downgradeStoredCaseToLegacyCleartext(page, caseId, DEFAULT_CASE_PASSPHRASE);

  await delayCryptoOperationPastIdle(page, "encrypt");
  await page.goto("/app/cases");
  await page.goto(caseUrl);
  await expect(page.getByRole("heading", { name: "Protéger puis ouvrir ce dossier historique." })).toBeVisible();
  await page.getByLabel("Phrase secrète du dossier", { exact: true }).fill(DEFAULT_CASE_PASSPHRASE);
  await page.getByLabel("Confirmer la phrase secrète", { exact: true }).fill(DEFAULT_CASE_PASSPHRASE);
  await page.getByRole("button", { name: "Chiffrer et ouvrir", exact: true }).click();

  await expect(page.getByRole("status")).toContainText("verrouillé automatiquement", { timeout: 7_000 });
  await page.waitForTimeout(3_500);
  const encrypted = await page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    return new Promise<boolean | undefined>((resolve, reject) => {
      const request = database.transaction("cases", "readonly").objectStore("cases").get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result?.encrypted);
    });
  }, caseId);
  expect(encrypted).toBe(false);
  await expect(page.getByRole("heading", { name: "Compléter et préparer le dossier." })).toHaveCount(0);
});

test("auto-lock cancels a backup restore before IndexedDB is changed", async ({ page }) => {
  test.setTimeout(40_000);
  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E annulation restauration");
  await analyzeAndOpenEditor(page);
  const caseId = new URLSearchParams(new URL(page.url()).hash.slice(1)).get("id")!;
  await openInternalExports(page);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Sauvegarde locale complète", exact: true }).click();
  const backupPath = await (await downloadPromise).path();
  if (!backupPath) throw new Error("Le navigateur n’a pas fourni le chemin de la sauvegarde de test.");
  await deleteCaseFromIndexedDb(page, caseId);

  await delayCryptoOperationPastIdle(page, "decrypt");
  await page.goto("/app/cases");
  await prepareRestoreForm(page, backupPath, DEFAULT_CASE_PASSPHRASE, {
    backupPassphrase: DEFAULT_CASE_PASSPHRASE,
  });
  await submitRestoreForm(page);

  await expect(page.getByRole("status")).toContainText("Restauration annulée après inactivité", { timeout: 7_000 });
  await page.waitForTimeout(3_500);
  await expect(page.getByRole("heading", { name: "Vérifier les accès avant d’écrire." })).toHaveCount(0);
  const storedCase = await page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    return new Promise<unknown>((resolve, reject) => {
      const request = database.transaction("cases", "readonly").objectStore("cases").get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }, caseId);
  expect(storedCase).toBeUndefined();
});

type RestoreUpload = string | { name: string; mimeType: string; buffer: Buffer };

async function prepareRestoreForm(
  page: Page,
  file: RestoreUpload,
  targetPassphrase = DEFAULT_CASE_PASSPHRASE,
  options: { backupPassphrase?: string; existingPassphrase?: string } = {}
) {
  await page.getByLabel("Restaurer une sauvegarde").setInputFiles(file);
  await expect(page.getByRole("heading", { name: "Vérifier les accès avant d’écrire." })).toBeVisible();
  if (options.backupPassphrase) {
    await page.getByLabel("Phrase de la sauvegarde", { exact: true }).fill(options.backupPassphrase);
  }
  if (options.existingPassphrase) {
    await page.getByLabel("Phrase actuelle du dossier existant", { exact: true }).fill(options.existingPassphrase);
  }
  await page.getByLabel("Nouvelle phrase locale", { exact: true }).fill(targetPassphrase);
  await page.getByLabel("Confirmer la nouvelle phrase", { exact: true }).fill(targetPassphrase);
  await page.getByLabel(/J’ai compris qu’un dossier portant le même identifiant/).check();
}

async function submitRestoreForm(page: Page) {
  await page.getByRole("button", { name: "Vérifier puis restaurer", exact: true }).click();
}

test("HTTP preview loads Astro assets without a production-only protocol upgrade", async ({ page }) => {
  const failedAstroAssets: string[] = [];
  const cspViolations: string[] = [];
  page.on("requestfailed", (request) => {
    if (request.url().includes("/_astro/")) {
      failedAstroAssets.push(request.url());
    }
  });
  page.on("console", (message) => {
    if (/refused to apply inline style|violat(?:es|ed).*style-src|style-src.*violat/i.test(message.text())) {
      cspViolations.push(message.text());
    }
  });

  await page.goto("/app");

  const csp = await page
    .locator('meta[http-equiv="content-security-policy"]')
    .getAttribute("content");

  expect(csp).not.toContain("upgrade-insecure-requests");
  expect(csp).not.toContain("'unsafe-inline'");
  await expect(page.getByLabel("Nom du dossier")).toBeEditable();
  await expect(page.locator(".shiki")).toHaveCount(0);
  await expect(page.locator("[style]")).toHaveCount(0);
  expect(failedAstroAssets).toEqual([]);
  expect(cspViolations).toEqual([]);
});

test("compound snapshot keys isolate identical Delivery ids across cases", async ({ page }) => {
  await page.goto("/app/cases");
  await expect(page.locator('[data-blackproof-ready="true"]')).toBeVisible();
  const snapshots = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    const transaction = database.transaction("deliverySnapshots", "readwrite");
    const store = transaction.objectStore("deliverySnapshots");
    store.put({ caseId: "case_a", deliveryId: "delivery_shared", createdAt: new Date().toISOString(), encrypted: false, deliveryJson: "A" });
    store.put({ caseId: "case_b", deliveryId: "delivery_shared", createdAt: new Date().toISOString(), encrypted: false, deliveryJson: "B" });
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    const readTransaction = database.transaction("deliverySnapshots", "readonly");
    const read = (key: [string, string]) => new Promise<any>((resolve, reject) => {
      const request = readTransaction.objectStore("deliverySnapshots").get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return Promise.all([read(["case_a", "delivery_shared"]), read(["case_b", "delivery_shared"])]);
  });
  expect(snapshots.map((snapshot) => snapshot.deliveryJson)).toEqual(["A", "B"]);
});

test("IndexedDB v5 snapshots migrate to the compound v6 key without data loss", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const deletion = indexedDB.deleteDatabase("blackproof-local-first");
      deletion.onsuccess = () => resolve();
      deletion.onerror = () => reject(deletion.error);
    });
    await new Promise<void>((resolve, reject) => {
      // Dexie maps schema version 5 to native IndexedDB version 50.
      const request = indexedDB.open("blackproof-local-first", 50);
      request.onupgradeneeded = () => {
        const database = request.result;
        const cases = database.createObjectStore("cases", { keyPath: "id" });
        cases.createIndex("encrypted", "encrypted");
        cases.createIndex("updatedAt", "updatedAt");
        cases.createIndex("createdAt", "createdAt");
        const snapshots = database.createObjectStore("deliverySnapshots", { keyPath: "deliveryId" });
        snapshots.createIndex("caseId", "caseId");
        snapshots.createIndex("createdAt", "createdAt");
        snapshots.createIndex("encrypted", "encrypted");
        database.createObjectStore("metadata", { keyPath: "key" });
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(["cases", "deliverySnapshots"], "readwrite");
        transaction.objectStore("cases").put({
          id: "legacy_case",
          encrypted: true,
          createdAt: "2026-07-12T00:00:00.000Z",
          updatedAt: "2026-07-12T00:00:00.000Z",
          revisionId: "legacy_revision",
          payload: { version: 1 },
        });
        transaction.objectStore("deliverySnapshots").put({
          caseId: "legacy_case",
          deliveryId: "legacy_delivery",
          createdAt: "2026-07-12T00:00:00.000Z",
          encrypted: false,
          deliveryJson: "legacy snapshot",
        });
        transaction.oncomplete = () => { database.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  });
  await page.goto("/app/cases");
  await expect(page.locator('[data-blackproof-ready="true"]')).toBeVisible();
  const migrated = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const readTransaction = database.transaction("deliverySnapshots", "readonly");
    const store = readTransaction.objectStore("deliverySnapshots");
    const snapshot = await new Promise<any>((resolve, reject) => {
      const request = store.get(["legacy_case", "legacy_delivery"]);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return { keyPath: store.keyPath, snapshot };
  });
  expect(migrated.keyPath).toEqual(["caseId", "deliveryId"]);
  expect(migrated.snapshot.deliveryJson).toBe("legacy snapshot");
});

test("critical local case flow preserves reservations through save, reopen and Master ZIP export", async ({ page }) => {
  const reservation = "Réserve E2E : ne pas exporter la liste nominative des administrateurs.";

  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E réserve ProofPack");
  await analyzeAndOpenEditor(page);

  await page.getByLabel("Réserve / limite à documenter").first().fill(reservation);
  await page.getByLabel("Statut d’export").first().selectOption("reserved");
  await completeEvidenceReference(page, "Politique MFA");
  await expect(page.getByText("Modifications non sauvegardées dans IndexedDB.")).toBeVisible();

  await page.getByRole("button", { name: "Sauvegarder les changements" }).click();
  await expect(page.getByText("Dossier local sauvegardé.")).toBeVisible();

  await navigateToEncryptedCase(page, () => page.reload());
  await expect(page.getByLabel("Réserve / limite à documenter").first()).toHaveValue(reservation);
  await expect(page.getByText("Modifications non sauvegardées dans IndexedDB.")).toHaveCount(0);

  await openInternalExports(page);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger le ZIP maître", exact: true }).click();
  const download = await downloadPromise;
  const zipPath = await download.path();

  expect(zipPath).toBeTruthy();

  const zipBytes = await readFile(zipPath!);
  const zip = await JSZip.loadAsync(zipBytes);
  const proofpackJson = await zip.file("proofpack.json")?.async("string");
  const supplierResponse = await zip.file("reponse-fournisseur.md")?.async("string");

  expect(proofpackJson).toBeTruthy();
  expect(supplierResponse).toBeTruthy();
  expect(supplierResponse).toContain("### Réserve");
  expect(supplierResponse).toContain("Réserve E2E");
  expect(supplierResponse).toContain("liste nominative des administrateurs");

  const proofpack = JSON.parse(proofpackJson!);
  expect(proofpack.questions.some((question: { answerReservation?: string }) =>
    question.answerReservation === reservation
  )).toBe(true);
});

test("a stale editor tab cannot overwrite a newer local revision", async ({ page }) => {
  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E verrouillage optimiste");
  await analyzeAndOpenEditor(page);

  const stalePage = await page.context().newPage();
  await navigateToEncryptedCase(stalePage, () => stalePage.goto(page.url()));
  await expect(stalePage.getByRole("heading", { name: "Compléter et préparer le dossier." })).toBeVisible();

  await page.getByLabel("Réponse à envoyer").first().fill("Modification enregistrée depuis l’onglet A.");
  await expect(page.getByText("Réponse mise à jour. Empreinte recalculée.")).toBeVisible();
  await page.getByRole("button", { name: "Sauvegarder les changements" }).click();
  await expect(page.getByText("Dossier local sauvegardé.")).toBeVisible();

  await stalePage.getByLabel("Réponse à envoyer").first().fill("Modification concurrente depuis l’onglet B.");
  await expect(stalePage.getByText("Réponse mise à jour. Empreinte recalculée.")).toBeVisible();
  await stalePage.getByRole("button", { name: "Sauvegarder les changements" }).click();
  await expect(stalePage.getByText("Ce dossier a été modifié dans un autre onglet. Rechargez-le avant de sauvegarder.")).toBeVisible();

  await navigateToEncryptedCase(page, () => page.reload());
  await expect(page.getByLabel("Réponse à envoyer").first()).toHaveValue("Modification enregistrée depuis l’onglet A.");
  await stalePage.close();
});

test("stale editor tabs cannot export an older Master or local backup", async ({ page }) => {
  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E exports Master versionnés");
  await analyzeAndOpenEditor(page);

  const exportLabels = ["Télécharger le ZIP maître", "Télécharger le JSON maître", "Sauvegarde locale complète"];
  const stalePages = await Promise.all(exportLabels.map(async () => {
    const stalePage = await page.context().newPage();
    await navigateToEncryptedCase(stalePage, () => stalePage.goto(page.url()));
    await expect(stalePage.getByRole("heading", { name: "Compléter et préparer le dossier." })).toBeVisible();
    await openInternalExports(stalePage);
    return stalePage;
  }));

  await page.getByLabel("Réponse à envoyer").first().fill("Révision R2 qui doit rester la seule exportable.");
  await expect(page.getByText("Réponse mise à jour. Empreinte recalculée.")).toBeVisible();
  await page.getByRole("button", { name: "Sauvegarder les changements" }).click();
  await expect(page.getByText("Dossier local sauvegardé.")).toBeVisible();

  for (const [index, stalePage] of stalePages.entries()) {
    let downloads = 0;
    stalePage.on("download", () => { downloads += 1; });
    await stalePage.getByRole("button", { name: exportLabels[index], exact: true }).click();
    await expect(stalePage.getByText("Ce dossier possède une révision plus récente dans un autre onglet. Rechargez-le avant export.")).toBeVisible();
    expect(downloads).toBe(0);
    await stalePage.close();
  }
});

test("an editor opened before deletion cannot recreate the deleted case", async ({ page }) => {
  const title = "E2E suppression concurrente";
  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill(title);
  await analyzeAndOpenEditor(page);
  const caseId = new URLSearchParams(new URL(page.url()).hash.slice(1)).get("id");

  const listPage = await page.context().newPage();
  await listPage.goto("/app/cases");
  await expect(listPage.locator('[data-blackproof-ready="true"]')).toBeVisible();
  const card = listPage.locator(".case-card", { hasText: caseId! });
  const confirmation = listPage.waitForEvent("dialog");
  const deletion = card.getByRole("button", { name: "Supprimer localement" }).click();
  await (await confirmation).accept();
  await deletion;
  await expect(card).toHaveCount(0);

  await page.getByLabel("Réponse à envoyer").first().fill("Cette sauvegarde ne doit pas ressusciter le dossier.");
  await expect(page.getByText("Réponse mise à jour. Empreinte recalculée.")).toBeVisible();
  await page.getByRole("button", { name: "Sauvegarder les changements" }).click();
  await expect(page.getByText("Ce dossier a été modifié dans un autre onglet. Rechargez-le avant de sauvegarder.")).toBeVisible();

  const persisted = await page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    return new Promise((resolve, reject) => {
      const request = database.transaction("cases", "readonly").objectStore("cases").get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  }, caseId);
  expect(persisted).toBeNull();
  await listPage.close();
});

test("Panic Wipe invalidates an already-open editor and keeps IndexedDB empty", async ({ page, request }) => {
  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E Panic Wipe inter-onglets");
  await analyzeAndOpenEditor(page);

  const status = await (await request.get("/api/status.json")).json();
  if (status.securityPosture?.knowledgeVault === "enabled-after-product-convergence") {
    const knowledgeSearch = page.getByRole("button", { name: "Chercher dans la base personnelle" }).first();
    await knowledgeSearch.click();
    await page.getByLabel("Phrase secrète de la base personnelle", { exact: true }).fill("panic-wipe-vault-secret");
    await page.getByLabel("Confirmer la phrase secrète de la base personnelle", { exact: true }).fill("panic-wipe-vault-secret");
    await page.getByRole("button", { name: "Déverrouiller puis chercher" }).click();
    await expect(page.locator(".case-editor-shell")).toHaveAttribute("data-blackproof-knowledge-loaded", "true");
    await expect(page.locator(".case-editor-shell")).toHaveAttribute("data-blackproof-knowledge-secret-loaded", "true");
  } else {
    await expect(page.getByRole("button", { name: "Chercher dans la base personnelle" })).toHaveCount(0);
  }

  const listPage = await page.context().newPage();
  await listPage.goto("/app/cases");
  await expect(listPage.locator('[data-blackproof-ready="true"]')).toBeVisible();
  const confirmation = listPage.waitForEvent("dialog");
  const wipe = listPage.getByRole("button", { name: "Panic Wipe", exact: true }).click();
  await (await confirmation).accept("EFFACER");
  await wipe;
  await expect(listPage.getByText("Dossiers, snapshots et coffre personnel supprimés de ce navigateur.", { exact: false })).toBeVisible();
  await expect(page.getByText("Panic Wipe détecté dans un autre onglet. L’état en mémoire a été effacé et cet éditeur ne peut plus sauvegarder.")).toBeVisible();
  await expect(page.locator(".case-editor-shell")).toHaveAttribute("data-blackproof-knowledge-loaded", "false");
  await expect(page.locator(".case-editor-shell")).toHaveAttribute("data-blackproof-knowledge-secret-loaded", "false");

  const counts = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    const readCount = (storeName: string) => new Promise<number>((resolve, reject) => {
      const request = database.transaction(storeName, "readonly").objectStore(storeName).count();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    return { cases: await readCount("cases"), snapshots: await readCount("deliverySnapshots") };
  });
  expect(counts).toEqual({ cases: 0, snapshots: 0 });
  await listPage.close();
});

test("Panic Wipe clears secrets held by creation, import and verifier tabs", async ({ page }) => {
  const context = page.context();
  const importPage = await context.newPage();
  const verifyPage = await context.newPage();
  const casesPage = await context.newPage();

  await page.goto("/app");
  await expect(page.locator('[data-blackproof-component="proof-app"][data-blackproof-hydrated="true"]')).toBeVisible();
  await page.getByLabel("Nom du dossier").fill("WIPE-CASE-CANARY-9F3A");
  await page.getByLabel("Entreprise").fill("WIPE-COMPANY-CANARY-7B2D");
  await page.getByLabel("Questionnaire brut").fill("WIPE-QUESTIONNAIRE-CANARY-4C8E");
  await page.getByLabel("Phrase secrète du dossier", { exact: true }).fill("wipe-passphrase-canary-2026");
  await page.getByLabel("Confirmer la phrase secrète", { exact: true }).fill("wipe-passphrase-canary-2026");

  await importPage.goto("/questionnaire-import");
  await expect(importPage.locator('[data-blackproof-component="questionnaire-import"][data-blackproof-hydrated="true"]')).toBeVisible();
  await importPage.getByText("Coller le contenu", { exact: true }).click();
  await importPage.getByLabel("Contenu à analyser").fill("WIPE-IMPORT-CANARY-6D1F");

  await verifyPage.goto("/verify");
  await expect(verifyPage.locator('[data-blackproof-verify-ready="true"]')).toBeVisible();
  await verifyPage.getByLabel("Ou coller le contenu JSON").fill('{"secret":"WIPE-VERIFY-CANARY-2A5C"}');

  await casesPage.goto("/app/cases");
  await expect(casesPage.locator('[data-blackproof-ready="true"]')).toBeVisible();
  const confirmation = casesPage.waitForEvent("dialog");
  const wipe = casesPage.getByRole("button", { name: "Panic Wipe", exact: true }).click();
  await (await confirmation).accept("EFFACER");
  await wipe;

  await expect(page.getByText("Panic Wipe détecté : le formulaire et ses secrets ont été effacés.", { exact: false })).toBeVisible();
  await expect(importPage.getByText("Panic Wipe détecté : l’import, le fichier et les aperçus ont été effacés.", { exact: false })).toBeVisible();
  await expect(verifyPage.getByText("Panic Wipe détecté : les fichiers et résultats de vérification ont été effacés.", { exact: false })).toBeVisible();

  await expect(page.getByLabel("Nom du dossier")).toHaveValue("");
  await expect(page.getByLabel("Entreprise")).toHaveValue("");
  await expect(page.getByLabel("Questionnaire brut")).toHaveValue("");
  await expect(page.getByLabel("Phrase secrète du dossier", { exact: true })).toHaveValue("");
  await expect(importPage.getByLabel("Contenu à analyser")).toHaveValue("");
  await expect(verifyPage.getByLabel("Ou coller le contenu JSON")).toHaveValue("");
  await expect(page.locator('[data-blackproof-component="proof-app"]')).toHaveAttribute("data-blackproof-hydrated", "false");
  await expect(importPage.locator('[data-blackproof-component="questionnaire-import"]')).toHaveAttribute("data-blackproof-hydrated", "false");
  await expect(verifyPage.locator("input[type=file]").first()).toBeDisabled();

  await Promise.all([importPage.close(), verifyPage.close(), casesPage.close()]);
});

test("a stale cases list cannot delete a newer revision", async ({ page }) => {
  const title = "E2E suppression versionnée";
  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill(title);
  await analyzeAndOpenEditor(page);
  const caseId = new URLSearchParams(new URL(page.url()).hash.slice(1)).get("id");

  const staleList = await page.context().newPage();
  await staleList.goto("/app/cases");
  await expect(staleList.locator('[data-blackproof-ready="true"]')).toBeVisible();
  const staleCard = staleList.locator(".case-card", { hasText: caseId! });
  await expect(staleCard).toBeVisible();

  await page.getByLabel("Réponse à envoyer").first().fill("Nouvelle révision à conserver.");
  await expect(page.getByText("Réponse mise à jour. Empreinte recalculée.")).toBeVisible();
  await page.getByRole("button", { name: "Sauvegarder les changements" }).click();
  await expect(page.getByText("Dossier local sauvegardé.")).toBeVisible();

  const confirmation = staleList.waitForEvent("dialog");
  const deletion = staleCard.getByRole("button", { name: "Supprimer localement" }).click();
  await (await confirmation).accept();
  await deletion;
  await expect(staleList.getByText("Ce dossier a changé depuis l’affichage de la liste. Rafraîchissez la liste avant de le supprimer.")).toBeVisible();

  await navigateToEncryptedCase(page, () => page.reload());
  await expect(page.getByLabel("Réponse à envoyer").first()).toHaveValue("Nouvelle révision à conserver.");
  await staleList.close();
});

test("a restore validated against R1 cannot overwrite a concurrent R2", async ({ page }) => {
  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E restauration optimiste");
  await analyzeAndOpenEditor(page);

  await openInternalExports(page);
  const backupDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Sauvegarde locale complète", exact: true }).click();
  const backupPath = await (await backupDownload).path();
  expect(backupPath).toBeTruthy();
  const restoreBytes = await downgradeBackupToLegacyCleartext(await readFile(backupPath!), DEFAULT_CASE_PASSPHRASE);

  const restorePage = await page.context().newPage();
  await restorePage.goto("/app/cases");
  await expect(restorePage.locator('[data-blackproof-ready="true"]')).toBeVisible();
  await restorePage.evaluate(() => {
    const originalGet = IDBObjectStore.prototype.get;
    Object.defineProperty(IDBObjectStore.prototype, "get", {
      configurable: true,
      value(this: IDBObjectStore, query: IDBValidKey | IDBKeyRange) {
        const request = originalGet.call(this, query);
        if (this.name === "cases") {
          request.addEventListener("success", () => {
            (window as unknown as { __restoreObserved: boolean }).__restoreObserved = true;
          }, { once: true });
        }
        return request;
      },
    });
    const subtle = crypto.subtle;
    const originalDigest = subtle.digest.bind(subtle);
    let releaseDigest!: () => void;
    const gate = new Promise<void>((resolve) => { releaseDigest = resolve; });
    (window as unknown as { __releaseRestoreDigest: () => void }).__releaseRestoreDigest = releaseDigest;
    let paused = false;
    Object.defineProperty(subtle, "digest", {
      configurable: true,
      value: async (algorithm: AlgorithmIdentifier, data: BufferSource) => {
        if (!paused && (window as unknown as { __restoreObserved?: boolean }).__restoreObserved) {
          paused = true;
          (window as unknown as { __restoreDigestPaused: boolean }).__restoreDigestPaused = true;
          await gate;
        }
        return originalDigest(algorithm, data);
      },
    });
  });
  try {
    await prepareRestoreForm(restorePage, {
      name: "blackproof-local-backup-clear-compatibility.zip",
      mimeType: "application/zip",
      buffer: restoreBytes,
    }, DEFAULT_CASE_PASSPHRASE, { existingPassphrase: DEFAULT_CASE_PASSPHRASE });
    const restoreUpload = submitRestoreForm(restorePage);
    await restorePage.waitForFunction(() => {
      const state = window as unknown as { __restoreObserved?: boolean; __restoreDigestPaused?: boolean };
      return state.__restoreObserved === true && state.__restoreDigestPaused === true;
    });

    await page.getByLabel("Réponse à envoyer").first().fill("Révision R2 enregistrée pendant la validation de la restauration.");
    await expect(page.getByText("Réponse mise à jour. Empreinte recalculée.")).toBeVisible();
    await page.getByRole("button", { name: "Sauvegarder les changements" }).click();
    await expect(page.getByText("Dossier local sauvegardé.")).toBeVisible();

    await restorePage.evaluate(() => {
      (window as unknown as { __releaseRestoreDigest: () => void }).__releaseRestoreDigest();
    });
    await restoreUpload;
    await expect(restorePage.getByText("Ce dossier a été modifié dans un autre onglet. Rechargez-le avant de sauvegarder.")).toBeVisible();

    await navigateToEncryptedCase(page, () => page.reload());
    await expect(page.getByLabel("Réponse à envoyer").first()).toHaveValue("Révision R2 enregistrée pendant la validation de la restauration.");
  } finally {
    await restorePage.evaluate(() => {
      (window as unknown as { __releaseRestoreDigest?: () => void }).__releaseRestoreDigest?.();
    }).catch(() => undefined);
    await restorePage.close();
  }
});

test("encrypted local case keeps business content out of cleartext IndexedDB", async ({ page }) => {
  const title = "E2E dossier secret défense";
  const passphrase = "phrase-secrete-e2e-robuste";

  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill(title);
  await analyzeAndOpenEditor(page, passphrase);
  await expect(page.getByRole("button", { name: "Chiffrer ce dossier", exact: true })).toHaveCount(0);

  await openInternalExports(page);
  const encryptedBackupPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Sauvegarde locale complète" }).click();
  const encryptedBackup = await encryptedBackupPromise;
  const encryptedBackupZip = await JSZip.loadAsync(await readFile((await encryptedBackup.path())!));
  const encryptedManifest = JSON.parse(await encryptedBackupZip.file("manifest.json")!.async("string"));
  expect(encryptedManifest.encrypted).toBe(true);
  expect(await encryptedBackupZip.file("master.json")!.async("string")).not.toContain(title);
  expect(JSON.stringify(encryptedManifest)).not.toContain(passphrase);

  const caseId = new URLSearchParams(new URL(page.url()).hash.slice(1)).get("id");
  const rawRecord = await page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const transaction = database.transaction("cases", "readonly");
      const request = transaction.objectStore("cases").get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }, caseId);

  expect(rawRecord.encrypted).toBe(true);
  expect(JSON.stringify(rawRecord)).not.toContain(title);
  expect(JSON.stringify(rawRecord)).not.toContain(passphrase);
  expect(rawRecord).not.toHaveProperty("proofpack");
  expect(rawRecord).not.toHaveProperty("questionnaire");

  await navigateToEncryptedCase(page, () => page.reload(), passphrase);
  await expect(page.getByRole("heading", { name: "Compléter et préparer le dossier." })).toBeVisible();
});

test("legacy PBKDF2 envelopes migrate after a verified unlock", async ({ page }) => {
  const passphrase = "phrase-secrete-e2e-migration-pbkdf2";
  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E migration PBKDF2");
  await analyzeAndOpenEditor(page, passphrase);
  const caseId = new URLSearchParams(new URL(page.url()).hash.slice(1)).get("id")!;

  const stored = await page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    return new Promise<any>((resolve, reject) => {
      const request = database.transaction("cases", "readonly").objectStore("cases").get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }, caseId);
  const clear = stored.payload.version === 2
    ? (await decryptLocalPayloadBatch<LocalProofCaseRecord>([stored.payload], passphrase))[0]
    : await decryptLocalPayload<LocalProofCaseRecord>(stored.payload, passphrase);
  stored.payload = await createLegacyEncryptedPayload(clear, passphrase);
  await page.evaluate(async ({ id, record }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("cases", "readwrite");
      transaction.objectStore("cases").put({ ...record, id });
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
    });
  }, { id: caseId, record: stored });

  await navigateToEncryptedCase(page, () => page.reload(), passphrase);
  const iterations = await page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    return new Promise<number>((resolve, reject) => {
      const request = database.transaction("cases", "readonly").objectStore("cases").get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result.payload.iterations);
    });
  }, caseId);
  expect(iterations).toBe(600_000);
});

test("version 13 local cases migrate on open in cleartext and encrypted modes", async ({ page }) => {
  test.setTimeout(60_000);
  const passphrase = "phrase-secrete-dossier-v13";

  for (const encrypted of [false, true]) {
    await page.goto("/app");
    await page.getByLabel("Nom du dossier").fill(`E2E dossier V13 ${encrypted ? "chiffré" : "clair"}`);
    await analyzeAndOpenEditor(page, passphrase);
    const caseId = new URLSearchParams(new URL(page.url()).hash.slice(1)).get("id")!;

    await page.goto("/app/cases");
    await expect(page.locator('[data-blackproof-ready="true"]')).toBeVisible();
    if (!encrypted) await downgradeStoredCaseToLegacyCleartext(page, caseId, passphrase);
    await rewriteStoredCaseAsVersion13(page, caseId, encrypted ? passphrase : undefined);
    if (encrypted) {
      await navigateToEncryptedCase(page, () => page.goto(`/app/case#id=${caseId}`), passphrase);
    } else {
      await navigateToLegacyClearCase(page, () => page.goto(`/app/case#id=${caseId}`), passphrase);
    }
    await expect(page.getByText("Dossier chargé. Enveloppe locale version 13 normalisée et sauvegardée.")).toBeVisible();

    if (!encrypted) {
      const canonical = await page.evaluate(async (id) => {
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open("blackproof-local-first");
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
        });
        return new Promise<any>((resolve, reject) => {
          const request = database.transaction("cases", "readonly").objectStore("cases").get(id);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
        });
      }, caseId);
      expect(canonical.encrypted).toBe(true);
      const migrated = canonical.payload.version === 2
        ? (await decryptLocalPayloadBatch<LocalProofCaseRecord>([canonical.payload], passphrase))[0]
        : await decryptLocalPayload<LocalProofCaseRecord>(canonical.payload, passphrase);
      expect(migrated.updatedAt).toBe(migrated.proofpack.case.updatedAt);
    }

    await openInternalExports(page);
    const backupDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Sauvegarde locale complète", exact: true }).click();
    await backupDownload;
  }
});

test("version 13 backups restore with a canonical envelope in cleartext and encrypted modes", async ({ page }) => {
  test.setTimeout(60_000);
  const passphrase = "phrase-secrete-backup-v13";

  for (const encrypted of [false, true]) {
    await page.goto("/app");
    await page.getByLabel("Nom du dossier").fill(`E2E backup V13 ${encrypted ? "chiffré" : "clair"}`);
    await analyzeAndOpenEditor(page, passphrase);
    const caseId = new URLSearchParams(new URL(page.url()).hash.slice(1)).get("id")!;

    await openInternalExports(page);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Sauvegarde locale complète", exact: true }).click();
    const download = await downloadPromise;
    const currentBackup = await readFile((await download.path())!);
    const sourceBackup = encrypted
      ? currentBackup
      : await downgradeBackupToLegacyCleartext(currentBackup, passphrase);
    const legacyBackup = await rewriteBackupAsVersion13(
      sourceBackup,
      encrypted ? passphrase : undefined
    );

    await deleteCaseFromIndexedDb(page, caseId);
    await page.goto("/app/cases");
    await expect(page.locator('[data-blackproof-ready="true"]')).toBeVisible();
    await prepareRestoreForm(page, {
      name: `blackproof-local-backup-v13-${encrypted ? "encrypted" : "clear"}.zip`,
      mimeType: "application/zip",
      buffer: legacyBackup,
    }, passphrase, encrypted ? { backupPassphrase: passphrase } : {});
    await submitRestoreForm(page);
    await expect(page.getByText("Enveloppe version 13 normalisée.")).toBeVisible();

    const stored = await page.evaluate(async (id) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("blackproof-local-first");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
      return new Promise<any>((resolve, reject) => {
        const request = database.transaction("cases", "readonly").objectStore("cases").get(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
    }, caseId);
    expect(stored.encrypted).toBe(true);
    expect(JSON.stringify(stored)).not.toContain(`E2E backup V13 ${encrypted ? "chiffré" : "clair"}`);

    await navigateToEncryptedCase(page, () => page.goto(`/app/case#id=${caseId}`), passphrase);
    await expect(page.getByRole("heading", { name: "Compléter et préparer le dossier." })).toBeVisible();
    await openInternalExports(page);
    const roundTripDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Sauvegarde locale complète", exact: true }).click();
    await roundTripDownload;
  }
});

test("frozen V13 local-record fixtures migrate in cleartext and encrypted modes", async ({ page }) => {
  const fixtureDir = "tests/fixtures/local-v13";
  const passphrase = "fixture-v13-passphrase";
  const clearRecord = JSON.parse(await readFile(`${fixtureDir}/v13-clear-local-record.json`, "utf8"));
  const encryptedRecord = JSON.parse(await readFile(`${fixtureDir}/v13-encrypted-local-record.json`, "utf8"));

  await page.goto("/app/cases");
  await expect(page.locator('[data-blackproof-ready="true"]')).toBeVisible();
  for (const [record, encrypted] of [[clearRecord, false], [encryptedRecord, true]] as const) {
    await page.evaluate(async (fixture) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("blackproof-local-first");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction("cases", "readwrite");
        transaction.objectStore("cases").put(fixture);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    }, record);
    if (encrypted) {
      await navigateToEncryptedCase(page, () => page.goto(`/app/case#id=${record.id}`), passphrase);
    } else {
      await navigateToLegacyClearCase(page, () => page.goto(`/app/case#id=${record.id}`), passphrase);
    }
    await expect(page.getByText("Dossier chargé. Enveloppe locale version 13 normalisée et sauvegardée.")).toBeVisible();
    await page.goto("/app/cases");
  }
});

test("frozen V13 backup fixtures restore in cleartext and encrypted modes", async ({ page }) => {
  const fixtureDir = "tests/fixtures/local-v13";
  const passphrase = "fixture-v13-passphrase";
  await page.goto("/app/cases");
  await expect(page.locator('[data-blackproof-ready="true"]')).toBeVisible();

  for (const [filename, encrypted] of [["v13-clear-backup.zip", false], ["v13-encrypted-backup.zip", true]] as const) {
    await prepareRestoreForm(page, {
      name: filename,
      mimeType: "application/zip",
      buffer: await readFile(`${fixtureDir}/${filename}`),
    }, passphrase, encrypted ? { backupPassphrase: passphrase } : {});
    await submitRestoreForm(page);
    await expect(page.getByText("Enveloppe version 13 normalisée.")).toBeVisible();
  }
});

test("an IndexedDB questionnaire substitution is detected and blocks save and Master exports", async ({ page }) => {
  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E liaison questionnaire locale");
  await analyzeAndOpenEditor(page);
  const caseId = new URLSearchParams(new URL(page.url()).hash.slice(1)).get("id")!;

  await page.goto("/app/cases");
  await expect(page.locator('[data-blackproof-ready="true"]')).toBeVisible();
  await downgradeStoredCaseToLegacyCleartext(page, caseId, DEFAULT_CASE_PASSPHRASE);
  const hashes = await page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    return new Promise<{ expected: string; original: string }>((resolve, reject) => {
      const transaction = database.transaction("cases", "readwrite");
      const store = transaction.objectStore("cases");
      const request = store.get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const record = request.result;
        const expected = record.proofpack.sourceQuestionnaire.normalizedQuestionnaireSha256;
        const original = record.questionnaire;
        record.questionnaire = `${original}\n9. Questionnaire substitué directement dans IndexedDB ?`;
        store.put(record);
        transaction.oncomplete = () => resolve({ expected, original });
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }, caseId);

  await navigateToLegacyClearCase(page, () => page.goto(`/app/case#id=${caseId}`));
  await expect(page.getByText("Questionnaire local différent du questionnaire analysé.")).toBeVisible();
  const integrityAlert = page.getByRole("alert").filter({ hasText: "Questionnaire source modifié" });
  await expect(integrityAlert).toBeVisible();
  await expect(integrityAlert).toContainText(`Empreinte analysée : ${hashes.expected}`);
  await expect(integrityAlert.getByText(/Empreinte locale : sha256:[a-f0-9]{64}/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Sauvegarder les changements" })).toBeDisabled();
  await openInternalExports(page);
  await expect(page.getByRole("button", { name: "Télécharger le ZIP maître" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Télécharger le JSON maître", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Sauvegarde locale complète", exact: true })).toBeDisabled();

  const confirmation = page.waitForEvent("dialog");
  const reanalysis = page.getByRole("button", { name: "Réanalyser le questionnaire" }).click();
  await (await confirmation).accept();
  await reanalysis;
  await expect(page.getByText(/Questionnaire réanalysé/)).toBeVisible();
  await page.getByRole("button", { name: "Sauvegarder les changements" }).click();
  await expect(page.getByText("Dossier local sauvegardé.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Télécharger le ZIP maître" })).toBeEnabled();
});

test("questionnaire storage and display use the exact canonical text that is hashed", async ({ page }) => {
  const rawQuestionnaire = " 1. Le M\u202eFA est-il activé ?\n2. Le mot de passe contient-il Ａ et\u0001 B ?\t";
  const canonicalQuestionnaire = "1. Le MFA est-il activé ?\n2. Le mot de passe contient-il A et B ?";

  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E questionnaire canonique");
  await page.getByLabel("Questionnaire brut").fill(rawQuestionnaire);
  await analyzeAndOpenEditor(page);

  const caseId = new URLSearchParams(new URL(page.url()).hash.slice(1)).get("id")!;
  const displayedQuestionnaire = await page.getByLabel("Questionnaire source", { exact: true }).inputValue();
  const rawStored = await page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    return new Promise<any>((resolve, reject) => {
      const request = database.transaction("cases", "readonly").objectStore("cases").get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }, caseId);
  const stored = rawStored.payload.version === 2
    ? (await decryptLocalPayloadBatch<LocalProofCaseRecord>([rawStored.payload], DEFAULT_CASE_PASSPHRASE))[0]
    : await decryptLocalPayload<LocalProofCaseRecord>(rawStored.payload, DEFAULT_CASE_PASSPHRASE);
  const expectedSha256 = `sha256:${createHash("sha256").update(canonicalQuestionnaire).digest("hex")}`;

  expect(stored.questionnaire).toBe(canonicalQuestionnaire);
  expect(displayedQuestionnaire).toBe(canonicalQuestionnaire);
  expect(stored.questionnaire).not.toMatch(/[\u202a-\u202e\u2066-\u2069\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/);
  expect(stored.proofpack.sourceQuestionnaire.normalizedQuestionnaireSha256).toBe(expectedSha256);
});

test("an existing non-canonical IndexedDB questionnaire is verified, migrated and reported", async ({ page }) => {
  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E migration questionnaire canonique");
  await analyzeAndOpenEditor(page);
  const caseId = new URLSearchParams(new URL(page.url()).hash.slice(1)).get("id")!;

  await page.goto("/app/cases");
  await downgradeStoredCaseToLegacyCleartext(page, caseId, DEFAULT_CASE_PASSPHRASE);
  const canonicalQuestionnaire = await page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    return new Promise<string>((resolve, reject) => {
      const transaction = database.transaction("cases", "readwrite");
      const store = transaction.objectStore("cases");
      const request = store.get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const record = request.result;
        const canonical = record.questionnaire;
        record.questionnaire = record.questionnaire.replace("MFA", "M\u202eFA");
        store.put(record);
        transaction.oncomplete = () => resolve(canonical);
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }, caseId);

  await navigateToLegacyClearCase(page, () => page.goto(`/app/case#id=${caseId}`));
  await expect(page.getByText("Dossier chargé. Questionnaire local migré vers sa forme canonique empreintée et sauvegardé."))
    .toBeVisible();
  await expect(page.getByLabel("Questionnaire source", { exact: true })).toHaveValue(canonicalQuestionnaire);

  const migratedStored = await page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    return new Promise<any>((resolve, reject) => {
      const request = database.transaction("cases", "readonly").objectStore("cases").get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }, caseId);
  const migratedRecord = migratedStored.payload.version === 2
    ? (await decryptLocalPayloadBatch<LocalProofCaseRecord>([migratedStored.payload], DEFAULT_CASE_PASSPHRASE))[0]
    : await decryptLocalPayload<LocalProofCaseRecord>(migratedStored.payload, DEFAULT_CASE_PASSPHRASE);
  const migratedQuestionnaire = migratedRecord.questionnaire;
  expect(migratedQuestionnaire).toBe(canonicalQuestionnaire);
});

test("historical CRLF dossiers migrate to one LF representation in cleartext and encrypted storage", async ({ page }) => {
  test.setTimeout(60_000);
  const passphrase = "phrase-secrete-crlf-dossier";
  const lfQuestionnaire = "1. Le MFA est-il activé ?\n2. Les sauvegardes sont-elles testées ?";

  for (const encrypted of [false, true]) {
    await page.goto("/app");
    await page.getByLabel("Nom du dossier").fill(`E2E CRLF ${encrypted ? "chiffré" : "clair"}`);
    await page.getByLabel("Questionnaire brut").fill(lfQuestionnaire);
    await analyzeAndOpenEditor(page, passphrase);
    const caseId = new URLSearchParams(new URL(page.url()).hash.slice(1)).get("id")!;

    await page.goto("/app/cases");
    await expect(page.locator('[data-blackproof-ready="true"]')).toBeVisible();
    if (!encrypted) await downgradeStoredCaseToLegacyCleartext(page, caseId, passphrase);
    const previousRevisionId = await rewriteStoredCaseWithLegacyCrLf(page, caseId, encrypted ? passphrase : undefined);
    if (encrypted) {
      await navigateToEncryptedCase(page, () => page.goto(`/app/case#id=${caseId}`), passphrase);
    } else {
      await navigateToLegacyClearCase(page, () => page.goto(`/app/case#id=${caseId}`), passphrase);
    }
    await expect(page.getByText("Dossier chargé. Questionnaire migré vers sa représentation canonique LF, nouvelle révision empreintée et sauvegardée."))
      .toBeVisible();

    const textareaValue = await page.getByLabel("Questionnaire source", { exact: true }).inputValue();
    const rawStored = await page.evaluate(async (id) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("blackproof-local-first");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
      return new Promise<any>((resolve, reject) => {
        const request = database.transaction("cases", "readonly").objectStore("cases").get(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
    }, caseId);
    const stored = rawStored.payload.version === 2
      ? (await decryptLocalPayloadBatch<LocalProofCaseRecord>([rawStored.payload], passphrase))[0]
      : await decryptLocalPayload<LocalProofCaseRecord>(rawStored.payload, passphrase);
    const hashedText = `sha256:${createHash("sha256").update(stored.questionnaire).digest("hex")}`;

    expect(stored.questionnaire).toBe(lfQuestionnaire);
    expect(textareaValue).toBe(stored.questionnaire);
    expect(stored.questionnaire).not.toContain("\r");
    expect(stored.proofpack.sourceQuestionnaire.normalizedQuestionnaireSha256).toBe(hashedText);
    expect(stored.proofpack.sourceQuestionnaire.sha256).toBe(hashedText);
    expect(stored.proofpack.revisionId).not.toBe(previousRevisionId);
  }
});

test("CRLF backups restore as a new LF-bound revision in cleartext and encrypted modes", async ({ page }) => {
  test.setTimeout(60_000);
  const passphrase = "phrase-secrete-crlf-backup";
  const lfQuestionnaire = "1. Le MFA est-il activé ?\n2. Les sauvegardes sont-elles testées ?";

  for (const encrypted of [false, true]) {
    await page.goto("/app");
    await page.getByLabel("Nom du dossier").fill(`E2E backup CRLF ${encrypted ? "chiffré" : "clair"}`);
    await page.getByLabel("Questionnaire brut").fill(lfQuestionnaire);
    await analyzeAndOpenEditor(page, passphrase);
    const caseId = new URLSearchParams(new URL(page.url()).hash.slice(1)).get("id")!;
    await openInternalExports(page);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Sauvegarde locale complète", exact: true }).click();
    const backup = await downloadPromise;
    const currentBackup = await readFile((await backup.path())!);
    const sourceBackup = encrypted
      ? currentBackup
      : await downgradeBackupToLegacyCleartext(currentBackup, passphrase);
    const legacyBackup = await rewriteBackupWithLegacyCrLf(
      sourceBackup,
      encrypted ? passphrase : undefined
    );
    await deleteCaseFromIndexedDb(page, caseId);
    await page.goto("/app/cases");
    await expect(page.locator('[data-blackproof-ready="true"]')).toBeVisible();
    await prepareRestoreForm(page, {
      name: `blackproof-local-backup-crlf-${encrypted ? "encrypted" : "clear"}.zip`,
      mimeType: "application/zip",
      buffer: legacyBackup,
    }, passphrase, encrypted ? { backupPassphrase: passphrase } : {});
    await submitRestoreForm(page);
    await expect(page.getByText("Questionnaire migré vers sa forme canonique empreintée.")).toBeVisible();

    await navigateToEncryptedCase(page, () => page.goto(`/app/case#id=${caseId}`), passphrase);
    await expect(page.getByLabel("Questionnaire source", { exact: true })).toHaveValue(lfQuestionnaire);
    const sourceHash = await page.evaluate(async (id) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("blackproof-local-first");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
      return new Promise<any>((resolve, reject) => {
        const request = database.transaction("cases", "readonly").objectStore("cases").get(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
    }, caseId);
    const restored = sourceHash.payload.version === 2
      ? (await decryptLocalPayloadBatch<LocalProofCaseRecord>([sourceHash.payload], passphrase))[0]
      : await decryptLocalPayload<LocalProofCaseRecord>(sourceHash.payload, passphrase);
    expect(restored.questionnaire).toBe(lfQuestionnaire);
    expect(restored.proofpack.sourceQuestionnaire.normalizedQuestionnaireSha256)
      .toBe(`sha256:${createHash("sha256").update(lfQuestionnaire).digest("hex")}`);
  }
});

test("restore rejects a backup whose local questionnaire no longer matches the Master", async ({ page }) => {
  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E backup questionnaire substitué");
  await analyzeAndOpenEditor(page);

  await openInternalExports(page);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Sauvegarde locale complète", exact: true }).click();
  const download = await downloadPromise;
  const clearBackup = await downgradeBackupToLegacyCleartext(
    await readFile((await download.path())!),
    DEFAULT_CASE_PASSPHRASE
  );
  const zip = await JSZip.loadAsync(clearBackup);
  const manifest = JSON.parse(await zip.file("manifest.json")!.async("string"));
  const record = JSON.parse(await zip.file("master.json")!.async("string"));
  record.questionnaire += "\n9. Substitution dans le fichier de sauvegarde ?";
  const stored = JSON.stringify(record);
  zip.file("master.json", stored, { createFolders: false });
  const descriptor = manifest.files.find((item: { path: string }) => item.path === "master.json");
  descriptor.sha256 = createHash("sha256").update(stored).digest("hex");
  descriptor.size = new TextEncoder().encode(stored).byteLength;
  zip.file("manifest.json", JSON.stringify(manifest, null, 2), { createFolders: false });
  const tamperedBackup = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });

  await page.goto("/app/cases");
  await expect(page.locator('[data-blackproof-ready="true"]')).toBeVisible();
  await prepareRestoreForm(page, {
    name: "blackproof-local-backup-questionnaire-substituted.zip",
    mimeType: "application/zip",
    buffer: tamperedBackup,
  });
  await submitRestoreForm(page);
  await expect(page.getByRole("alert")).toContainText("Le questionnaire local ne correspond pas à l’empreinte du ProofPack.");
});

test("a pre-provenance local case gains source binding before its envelope is persisted", async ({ page }) => {
  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E migration provenance ancienne");
  await analyzeAndOpenEditor(page);
  const caseId = new URLSearchParams(new URL(page.url()).hash.slice(1)).get("id")!;
  await page.goto("/app/cases");
  await downgradeStoredCaseToLegacyCleartext(page, caseId, DEFAULT_CASE_PASSPHRASE);
  await page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("cases", "readwrite");
      const store = transaction.objectStore("cases");
      const request = store.get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const record = request.result;
        delete record.localEnvelopeVersion;
        delete record.proofpack.sourceQuestionnaire;
        store.put(record);
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }, caseId);

  await navigateToLegacyClearCase(page, () => page.goto(`/app/case#id=${caseId}`));
  await expect(page.getByText("Dossier chargé. Empreinte du questionnaire source ajoutée et dossier sauvegardé.")).toBeVisible();
  const migrated = await page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    return new Promise<any>((resolve, reject) => {
      const request = database.transaction("cases", "readonly").objectStore("cases").get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }, caseId);
  const migratedRecord = migrated.payload.version === 2
    ? (await decryptLocalPayloadBatch<LocalProofCaseRecord>([migrated.payload], DEFAULT_CASE_PASSPHRASE))[0]
    : await decryptLocalPayload<LocalProofCaseRecord>(migrated.payload, DEFAULT_CASE_PASSPHRASE);
  expect(migratedRecord.localEnvelopeVersion).toBe(2);
  expect(migratedRecord.proofpack.sourceQuestionnaire.normalizedQuestionnaireSha256).toMatch(/^sha256:[a-f0-9]{64}$/);
});

test("mandatory encryption keeps every Delivery snapshot out of cleartext IndexedDB", async ({ page }) => {
  const sensitiveAnswer = "REPONSE_SENSIBLE_SNAPSHOT_E2E";
  const passphrase = "phrase-secrete-snapshot-e2e";

  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E migration snapshot Delivery");
  await analyzeAndOpenEditor(page, passphrase);

  await page.getByLabel("Réponse à envoyer").first().fill(sensitiveAnswer);
  await page.getByLabel("Statut d’export").first().selectOption("ready");
  await completeEvidenceReference(page, "Politique MFA");
  await expect(page.getByText("Preuve déclarée disponible avec une référence complète.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Sauvegarder les changements", exact: true }).click();
  const deliveryReview = page.locator(".delivery-review");
  await deliveryReview.getByRole("button", { name: "Inclure tous les éléments admissibles", exact: true }).click();
  await deliveryReview.getByRole("checkbox", {
    name: /J’ai vérifié le contenu exact destiné au client et son empreinte/,
  }).check();

  const deliveryDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger le JSON client", exact: true }).click();
  await deliveryDownload;
  await expect(page.getByText("delivery.json généré et export archivé localement.")).toBeVisible();

  const caseId = new URLSearchParams(new URL(page.url()).hash.slice(1)).get("id");
  const rawStorage = await page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    const transaction = database.transaction(["cases", "deliverySnapshots"], "readonly");
    const read = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    const caseRecord = await read(transaction.objectStore("cases").get(id));
    const snapshots = await read(transaction.objectStore("deliverySnapshots").index("caseId").getAll(id));
    return { caseRecord, snapshots };
  }, caseId);

  expect(rawStorage.caseRecord.encrypted).toBe(true);
  expect(rawStorage.snapshots).toHaveLength(1);
  expect(rawStorage.snapshots.every((snapshot: { encrypted?: boolean }) => snapshot.encrypted === true)).toBe(true);
  expect(JSON.stringify(rawStorage)).not.toContain(sensitiveAnswer);
  expect(JSON.stringify(rawStorage)).not.toContain(passphrase);
  expect(rawStorage.snapshots[0]).not.toHaveProperty("deliveryJson");
});

test("mandatory encryption rejects weak passphrases before creating any case", async ({ page }) => {
  await page.goto("/app");
  await expect(page.locator('[data-blackproof-component="proof-app"][data-blackproof-hydrated="true"]')).toBeVisible();
  await page.getByLabel("Nom du dossier").fill("E2E chiffrement refusé");
  const create = page.getByRole("button", { name: "Analyser et ouvrir l’éditeur", exact: true });
  await expect(create).toBeDisabled();
  await page.getByLabel("Phrase secrète du dossier", { exact: true }).fill("aaaaaaaaaaaa");
  await page.getByLabel("Confirmer la phrase secrète", { exact: true }).fill("aaaaaaaaaaaa");
  await expect(create).toBeEnabled();
  await create.click();
  await expect(page.getByRole("alert")).toContainText("Phrase secrète trop prévisible");
  await expect(page).toHaveURL(/\/app\/?$/);

  const caseCount = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    return new Promise<number>((resolve, reject) => {
      const transaction = database.transaction("cases", "readonly");
      const request = transaction.objectStore("cases").count();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  });
  expect(caseCount).toBe(0);
});

test("restoring an unencrypted backup cannot silently downgrade an encrypted case", async ({ page }) => {
  const passphrase = "phrase-secrete-restauration-e2e";
  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E restauration sans downgrade");
  await analyzeAndOpenEditor(page, passphrase);
  const caseId = new URLSearchParams(new URL(page.url()).hash.slice(1)).get("id");

  await openInternalExports(page);
  const backupPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Sauvegarde locale complète" }).click();
  const backupPath = await (await backupPromise).path();
  expect(backupPath).toBeTruthy();
  const backupBytes = await downgradeBackupToLegacyCleartext(await readFile(backupPath!), passphrase);

  await page.goto("/app/cases");
  await expect(page.locator('[data-blackproof-ready="true"]')).toBeVisible();
  await prepareRestoreForm(page, {
    name: "blackproof-local-backup.zip",
    mimeType: "application/zip",
    buffer: backupBytes,
  }, passphrase, { existingPassphrase: passphrase });
  await submitRestoreForm(page);
  await expect(page.getByText(/Sauvegarde restaurée \(structure, cohérence et intégrité cryptographique vérifiées ; origine non authentifiée\)/)).toBeVisible();
  const encrypted = await page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first"); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result);
    });
    return await new Promise<boolean>((resolve, reject) => {
      const request = database.transaction("cases", "readonly").objectStore("cases").get(id);
      request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result?.encrypted === true);
    });
  }, caseId);
  expect(encrypted).toBe(true);
});

test("encrypted envelope rejects excessive PBKDF2 iterations before key derivation", async ({ page }) => {
  const passphrase = "phrase-secrete-e2e-iterations";
  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E enveloppe KDF falsifiée");
  await analyzeAndOpenEditor(page, passphrase);

  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    const records = await new Promise<any[]>((resolve, reject) => {
      const request = database.transaction("cases", "readonly").objectStore("cases").getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    const record = records.find((item) => item?.encrypted === true);
    if (!record?.payload) throw new Error("Encrypted test record not found.");
    record.payload.iterations = 1_000_001;
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("cases", "readwrite");
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
      transaction.objectStore("cases").put(record);
    });
  });

  await navigateToEncryptedCase(page, () => page.reload(), passphrase, false);
  await expect(page.getByText("Format de chiffrement local non pris en charge.")).toBeVisible();
});

test("verify page accepts and validates a complete ProofPack ZIP locally", async ({ page }) => {
  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E vérification ZIP");
  await analyzeAndOpenEditor(page);

  await openInternalExports(page);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger le ZIP maître", exact: true }).click();
  const download = await downloadPromise;
  const zipPath = await download.path();
  expect(zipPath).toBeTruthy();

  await page.goto("/verify");
  await expect(page.locator('[data-blackproof-verify-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Tester avec le ProofPack démo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Structure, liens et empreinte cohérents" })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(zipPath!);

  await expect(page.getByRole("heading", { name: "Contrôles locaux du ZIP et du ProofPack réussis" })).toBeVisible();
  await expect(page.getByText("PROOFPACK_ZIP_VALID")).toBeVisible();
  await expect(page.getByText("Liste des fichiers").locator("..").getByText("OK")).toBeVisible();
  await expect(page.getByText("SHA-256 fichiers").locator("..").getByText("OK")).toBeVisible();
});

test("browser verifier applies the same canonical Master and Delivery schema corpora as Node", async ({ page }) => {
  const result = await createProofCaseFromQuestionnaire(
    "1. Avez-vous activé le MFA pour les comptes administrateurs ?"
  );

  await page.goto("/verify");
  await expect(page.locator('[data-blackproof-verify-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Tester avec le ProofPack démo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Structure, liens et empreinte cohérents" })).toBeVisible();

  for (const corpusCase of buildProofPackSchemaCorpus(result.proofpack)) {
    await page.getByLabel("Choisir un dossier maître ou client, JSON ou ZIP").setInputFiles({
      name: `${corpusCase.id}.json`,
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(corpusCase.payload)),
    });

    const expectedStatus = corpusCase.expectedValid ? "OK" : "FAIL";
    await expect(
      page.getByText("Schéma", { exact: true }).locator("..").getByText(expectedStatus, { exact: true }),
      corpusCase.id
    ).toBeVisible();
  }

  result.questions[0]!.answerText = "Le MFA est activé pour les comptes administrateurs.";
  result.questions[0]!.answerExportStatus = "ready";
  const delivery = await buildProofPackDelivery(result.proofpack, {
    questionIds: [result.questions[0]!.id],
    evidenceIds: [],
    confirmed: true,
  });

  for (const corpusCase of buildProofPackDeliverySchemaCorpus(delivery)) {
    await page.getByLabel("Choisir un dossier maître ou client, JSON ou ZIP").setInputFiles({
      name: `${corpusCase.id}.json`,
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(corpusCase.payload)),
    });

    const expectedStatus = corpusCase.expectedValid ? "OK" : "FAIL";
    await expect(
      page.getByText("Schéma du dossier client", { exact: true }).locator("..").getByText(expectedStatus, { exact: true }),
      corpusCase.id
    ).toBeVisible();
  }
});

test("dirty local editor warns before leaving unsaved changes", async ({ page }) => {
  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E beforeunload");
  await analyzeAndOpenEditor(page);

  await page.getByLabel("Réserve / limite à documenter").first().fill("Modification non sauvegardée.");
  await expect(page.getByText("Modifications non sauvegardées dans IndexedDB.")).toBeVisible();

  const dialogPromise = page.waitForEvent("dialog");
  const navigationAttempt = page.getByRole("link", { name: "Retour aux dossiers" }).click({ noWaitAfter: true });
  const dialog = await dialogPromise;

  expect(dialog.type()).toBe("beforeunload");
  await dialog.dismiss();
  await navigationAttempt;
  await expect(page).toHaveURL(/\/app\/case#id=/);
});

test("legacy answerRéserve migration recalculates fingerprint and saves a valid ProofPack", async ({ page }) => {
  const legacyReservation = "Réserve legacy : inventaire nominatif non exportable.";

  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E migration réserve legacy");
  await analyzeAndOpenEditor(page);

  const caseId = new URLSearchParams(new URL(page.url()).hash.slice(1)).get("id");
  expect(caseId).toBeTruthy();

  const encryptedRecord = await page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    return new Promise<any>((resolve, reject) => {
      const request = database.transaction("cases", "readonly").objectStore("cases").get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }, caseId);
  const legacyRecord = encryptedRecord.payload.version === 2
    ? (await decryptLocalPayloadBatch<LocalProofCaseRecord>([encryptedRecord.payload], DEFAULT_CASE_PASSPHRASE))[0]
    : await decryptLocalPayload<LocalProofCaseRecord>(encryptedRecord.payload, DEFAULT_CASE_PASSPHRASE);
  const firstQuestion = legacyRecord.proofpack.questions[0] as typeof legacyRecord.proofpack.questions[number] & { answerRéserve?: string };
  firstQuestion.answerRéserve = legacyReservation;
  delete firstQuestion.answerReservation;
  legacyRecord.proofpackFingerprint = legacyRecord.proofpack.fingerprint;
  encryptedRecord.payload = await encryptLocalPayload(legacyRecord, DEFAULT_CASE_PASSPHRASE);
  await page.evaluate(async (stored) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("cases", "readwrite");
      transaction.objectStore("cases").put(stored);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }, encryptedRecord);

  await navigateToEncryptedCase(page, () => page.reload());
  await expect(page.getByLabel("Réserve / limite à documenter").first()).toHaveValue(legacyReservation);
  await expect(page.getByText("Modifications non sauvegardées dans IndexedDB.")).toHaveCount(0);

  await openInternalExports(page);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger le JSON maître", exact: true }).click();
  const download = await downloadPromise;
  const jsonPath = await download.path();

  expect(jsonPath).toBeTruthy();

  const proofpackJson = await readFile(jsonPath!, "utf8");
  const proofpack = JSON.parse(proofpackJson);

  expect(proofpack.questions[0]).not.toHaveProperty("answerRéserve");
  expect(proofpack.questions[0].answerReservation).toBe(legacyReservation);

  expect(proofpack.fingerprint).toBe(expectedProofPackFingerprint(proofpack));
});

test("editor locks save and export until the latest typed answer is fingerprinted", async ({ page }) => {
  const finalAnswer = "Réponse finale après frappe rapide : MFA obligatoire, revu mensuellement.";

  await page.addInitScript(() => {
    (globalThis as typeof globalThis & { __BLACKPROOF_REBUILD_DEBOUNCE_MS?: number }).__BLACKPROOF_REBUILD_DEBOUNCE_MS = 2_000;
  });

  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E verrou recalcul ProofPack");
  await analyzeAndOpenEditor(page);

  const answer = page.getByLabel("Réponse à envoyer").first();
  await answer.click();
  await page.keyboard.insertText(finalAnswer);

  const lockedImmediatelyAfterInput = await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const buttons = Array.from(document.querySelectorAll("button"));
    const saveButton = document.querySelector(".editor-actions button");
    const proofpackJsonButton = buttons.find((button) => button.textContent?.includes("Télécharger le JSON maître"));

    return {
      saveDisabled: saveButton instanceof HTMLButtonElement ? saveButton.disabled : false,
      proofpackJsonDisabled: proofpackJsonButton instanceof HTMLButtonElement ? proofpackJsonButton.disabled : false,
      recalculatingMessageVisible: document.body.textContent?.includes("Recalcul") ?? false,
    };
  }, finalAnswer);

  expect(lockedImmediatelyAfterInput).toEqual({
    saveDisabled: true,
    proofpackJsonDisabled: true,
    recalculatingMessageVisible: true,
  });

  await expect(page.getByText("Réponse mise à jour. Empreinte recalculée.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sauvegarder les changements" })).toBeEnabled();
  await openInternalExports(page);
  await expect(page.getByRole("button", { name: "Télécharger le JSON maître", exact: true })).toBeEnabled();

  await page.getByRole("button", { name: "Sauvegarder les changements" }).click();
  await expect(page.getByText("Dossier local sauvegardé.")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger le JSON maître", exact: true }).click();
  const download = await downloadPromise;
  const jsonPath = await download.path();

  expect(jsonPath).toBeTruthy();

  const proofpackJson = await readFile(jsonPath!, "utf8");
  const proofpack = JSON.parse(proofpackJson);

  expect(proofpack.questions[0].answerText).toBe(finalAnswer);
  expect(proofpack.fingerprint).toBe(expectedProofPackFingerprint(proofpack));
});

test("questionnaire source edits block save and export until reanalysis refreshes source hash", async ({ page }) => {
  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E questionnaire divergence");
  await analyzeAndOpenEditor(page);

  await page.getByText("Modifier le questionnaire source", { exact: true }).click();
  const sourceQuestionnaire = page.getByLabel("Questionnaire source", { exact: true });
  await sourceQuestionnaire.fill("1. Avez-vous activé le MFA pour les comptes administrateurs ?\n2. Avez-vous une revue trimestrielle des accès privilégiés ?");

  await expect(page.getByText("Questionnaire source modifié : le dossier analysé ne correspond plus au texte affiché.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sauvegarder les changements" })).toBeDisabled();
  await openInternalExports(page);
  await expect(page.getByRole("button", { name: "Télécharger le JSON maître", exact: true })).toBeDisabled();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Réanalyser le questionnaire" }).click();
  await expect(page.getByText("Questionnaire réanalysé.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sauvegarder les changements" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Télécharger le JSON maître", exact: true })).toBeEnabled();

  await page.getByRole("button", { name: "Sauvegarder les changements" }).click();
  await expect(page.getByText("Dossier local sauvegardé.")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger le JSON maître", exact: true }).click();
  const download = await downloadPromise;
  const jsonPath = await download.path();

  expect(jsonPath).toBeTruthy();

  const proofpackJson = await readFile(jsonPath!, "utf8");
  const proofpack = JSON.parse(proofpackJson);

  expect(proofpack.sourceQuestionnaire).toMatchObject({
    fileName: "questionnaire.txt",
    format: "text",
  });
  expect(proofpack.sourceQuestionnaire.sha256).toMatch(/^sha256:[a-f0-9]{64}$/);
  expect(proofpack.sourceQuestionnaire.normalizedQuestionnaireSha256).toBe(
    proofpack.sourceQuestionnaire.sha256
  );
  expect(proofpack.questions.some((question: { text: string }) =>
    question.text.includes("revue trimestrielle des accès privilégiés")
  )).toBe(true);
  expect(proofpack.fingerprint).toBe(expectedProofPackFingerprint(proofpack));
});

test("available evidence requires a complete reference and produces a verifiable Master ZIP", async ({ page }) => {
  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E preuve disponible référencée");
  await analyzeAndOpenEditor(page);

  await completeEvidenceReference(page, "Politique MFA");
  await expect(page.getByText("Preuve déclarée disponible avec une référence complète.")).toBeVisible();

  await page.getByRole("button", { name: "Modifier la référence", exact: true }).first().click();
  const reference = page.locator('[aria-label="Référence de preuve pour Politique MFA"]');
  await reference.getByRole("button", { name: "Réutiliser ce contexte pour les 1 autres preuves", exact: true }).click();
  await expect(page.getByText("Contexte recopié sur les autres preuves de la question.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Référencer", exact: true }).first().click();
  const reusedReference = page.locator('[aria-label="Référence de preuve pour Revue des comptes administrateurs"]');
  await expect(reusedReference.getByText("4/4 champs", { exact: true })).toBeVisible();
  await reusedReference.getByText("Qualifier comme disponible", { exact: true }).click();
  await expect(reusedReference.getByLabel("Système source pour Revue des comptes administrateurs", { exact: true })).toHaveValue("GED sécurité");
  await expect(reusedReference.getByLabel("Propriétaire pour Revue des comptes administrateurs", { exact: true })).toHaveValue("RSSI");

  await reference.getByText("Informations internes complémentaires", { exact: true }).click();
  await reference.getByLabel("Date d’expiration pour Politique MFA", { exact: true }).fill("2027-07-11T10:30");
  await reference.getByLabel("Validateur déclaré pour Politique MFA", { exact: true }).fill("Responsable contrôle interne");
  await reference.getByLabel("Date de validation déclarée pour Politique MFA", { exact: true }).fill("2026-07-11T11:00");
  await reference.getByLabel("Version de la preuve pour Politique MFA", { exact: true }).fill("2026.07");
  await reference.getByLabel("Périmètre couvert pour Politique MFA", { exact: true }).fill("Comptes administrateurs de production");
  await reference.getByLabel("Résultat du contrôle pour Politique MFA", { exact: true }).fill("Contrôle conforme, deux exceptions documentées");
  await reference.getByLabel("Historique pour Politique MFA", { exact: true }).fill("2026-07-10 : collecte\n2026-07-11 : validation");

  await page.getByRole("button", { name: "Sauvegarder les changements", exact: true }).click();
  await expect(page.getByText("Dossier local sauvegardé.")).toBeVisible();

  await openInternalExports(page);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger le ZIP maître", exact: true }).click();
  const download = await downloadPromise;
  const zipPath = await download.path();
  expect(zipPath).toBeTruthy();

  const zip = await JSZip.loadAsync(await readFile(zipPath!));
  const proofpackJson = await zip.file("proofpack.json")!.async("string");
  const proofpack = JSON.parse(proofpackJson);
  const referencedEvidence = proofpack.evidence.find((item: { title: string }) => item.title === "Politique MFA");
  expect(referencedEvidence).toMatchObject({
    status: "available",
    referenceType: "file",
    referenceId: "mfa-admin-policy-v3.pdf",
    fileName: "mfa-admin-policy-v3.pdf",
    sourceSystem: "GED sécurité",
    owner: "RSSI",
    sensitivity: "internal",
    exportMode: "reference-only",
    validator: "Responsable contrôle interne",
    version: "2026.07",
    coveredScope: "Comptes administrateurs de production",
    controlResult: "Contrôle conforme, deux exceptions documentées",
    history: ["2026-07-10 : collecte", "2026-07-11 : validation"],
  });
  expect(referencedEvidence.observedAt).toMatch(/^2026-07-11T/);
  expect(referencedEvidence.expiresAt).toMatch(/^2027-07-11T/);
  expect(referencedEvidence.validatedAt).toMatch(/^2026-07-11T/);

  await page.goto("/verify");
  await expect(page.locator('[data-blackproof-verify-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Tester avec le ProofPack démo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Structure, liens et empreinte cohérents" })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(zipPath!);
  await expect(page.getByRole("heading", { name: "Contrôles locaux du ZIP et du ProofPack réussis" })).toBeVisible();
  await expect(page.getByText("PROOFPACK_ZIP_VALID")).toBeVisible();
});

test("editor presents questions before client delivery and keeps actions close to edits", async ({ page }) => {
  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E parcours éditeur");
  await analyzeAndOpenEditor(page);

  const layout = await page.evaluate(() => {
    const questions = document.querySelector("#questions-and-evidence");
    const delivery = document.querySelector("#delivery-review");
    const guide = document.querySelector<HTMLElement>('[data-blackproof-guide="true"]');
    return {
      questionsBeforeDelivery: Boolean(questions && delivery && (questions.compareDocumentPosition(delivery) & Node.DOCUMENT_POSITION_FOLLOWING)),
      guidePosition: guide ? getComputedStyle(guide).position : "missing",
      overviewOpen: document.querySelector<HTMLDetailsElement>("details.editor-overview")?.open,
      sourceEditorOpen: document.querySelector<HTMLDetailsElement>("details.questionnaire-block")?.open,
      internalExportsOpen: document.querySelector<HTMLDetailsElement>("details.master-export")?.open,
    };
  });

  expect(layout).toEqual({
    questionsBeforeDelivery: true,
    guidePosition: "relative",
    overviewOpen: false,
    sourceEditorOpen: false,
    internalExportsOpen: false,
  });

  const questionCards = page.locator("details.question-card");
  expect(await questionCards.count()).toBeGreaterThan(1);
  await expect(page.locator("details.question-card[open]")).toHaveCount(1);
  await expect(page.locator('[data-blackproof-guide="true"]')).toHaveClass(/compact/);
  await expect(page.getByRole("button", { name: /Prochain brouillon ·/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Prochaine preuve à qualifier ·/ })).toBeVisible();

  const groupedEvidence = page.getByRole("group", { name: /Mise à jour groupée des preuves/ });
  await expect(groupedEvidence).toBeVisible();
  await groupedEvidence.getByLabel("Appliquer un statut commun").selectOption("missing");
  await groupedEvidence.getByRole("button", { name: "Appliquer aux 2 preuves", exact: true }).click();
  expect(await page.locator("details.question-card[open]").getByLabel(/Statut de preuve pour/).evaluateAll((elements) =>
    elements.map((element) => (element as HTMLSelectElement).value)
  )).toEqual(["missing", "missing"]);

  const recipient = page.getByLabel("Destinataire du dossier client (optionnel)", { exact: true });
  const reviewer = page.getByLabel("Personne ayant relu le dossier (optionnel)", { exact: true });
  expect(await recipient.getAttribute("aria-label")).toBeNull();
  expect(await reviewer.getAttribute("aria-label")).toBeNull();

  await page.getByLabel("Réponse à envoyer").first().fill("Le MFA est actif sur les comptes administrateurs.");
  await page.getByLabel("Statut d’export").first().selectOption("ready");
  await expect(page.getByText("Réponse mise à jour. Empreinte recalculée.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enregistrer cette question", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Inclure tous les éléments admissibles", exact: true })).toBeDisabled();

  await page.getByRole("button", { name: "Enregistrer cette question", exact: true }).click();
  await expect(page.getByText("Dossier local sauvegardé.")).toBeVisible();
  const guide = page.locator('[data-blackproof-guide="true"]');
  await expect(guide.getByText("Préparez une livraison partielle avec 1 réponse.", { exact: true })).toBeVisible();
  await expect(guide.getByText(/brouillons restent dans le dossier maître et ne seront pas transmis/)).toBeVisible();
  await expect(guide.getByRole("link", { name: "Préparer la livraison partielle", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Préparer une livraison partielle · 1 réponse/ }).first()).toBeVisible();
  await page.getByRole("button", { name: "Inclure tous les éléments admissibles", exact: true }).click();
  const selectedAnswer = page.locator(".delivery-list label", {
    hasText: "Avez-vous activé le MFA pour les comptes administrateurs ?",
  }).locator('input[type="checkbox"]');
  await expect(selectedAnswer).toBeChecked();

  await page.getByLabel("Réponse à envoyer").first().fill("Le MFA est actif et contrôlé sur les comptes administrateurs.");
  await expect(page.getByText("Réponse mise à jour. Empreinte recalculée.")).toBeVisible();
  await expect(selectedAnswer).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /J’ai vérifié le contenu exact destiné au client/ })).toBeDisabled();
});

test("Delivery export requires explicit review and excludes internal content", async ({ page }) => {
  const blockedSecret = "SECRET_E2E_DO_NOT_EXPORT";

  await page.goto("/app");
  await page.getByLabel("Nom du dossier").fill("E2E Delivery whitelist");
  await analyzeAndOpenEditor(page);

  await expect(page.getByRole("button", { name: "Télécharger le ZIP client", exact: true })).toHaveCount(0);

  await page.getByLabel("Réponse à envoyer").first().fill("Le MFA est activé pour les comptes administrateurs.");
  await page.getByLabel("Statut d’export").first().selectOption("ready");
  await completeEvidenceReference(page, "Politique MFA");
  await page.getByLabel("Destinataire du dossier client (optionnel)", { exact: true }).fill("Client X");
  await page.getByLabel("Personne ayant relu le dossier (optionnel)", { exact: true }).fill("Alice Martin");

  await page.getByRole("button", { name: "Question suivante", exact: true }).click();
  const activeQuestion = page.locator("details.question-card[open]");
  await activeQuestion.getByLabel("Réponse à envoyer").fill(blockedSecret);
  await activeQuestion.getByLabel("Statut d’export").selectOption("do-not-export");
  await expect(page.getByText("Réponse mise à jour. Empreinte recalculée.")).toBeVisible();
  await page.getByRole("button", { name: "Sauvegarder les changements", exact: true }).click();
  await expect(page.getByText("Dossier local sauvegardé.")).toBeVisible();

  const deliveryReview = page.locator(".delivery-review");
  await deliveryReview.getByRole("button", { name: "Inclure tous les éléments admissibles", exact: true }).click();

  const finalPreview = deliveryReview.locator(".delivery-final-preview");
  await expect(finalPreview.getByRole("heading", { name: "Contenu exact associé à votre confirmation" })).toBeVisible();
  await expect(finalPreview.getByText("Le MFA est activé pour les comptes administrateurs.", { exact: true })).toBeVisible();
  await expect(finalPreview.getByText("Aucune réserve transmise", { exact: true })).toBeVisible();
  await expect(finalPreview).toContainText("Rapport d’audit externe 2026 — consultable sous NDA");
  await expect(finalPreview.getByText("reponse-fournisseur.md", { exact: true })).toBeVisible();
  await expect(finalPreview.getByText("delivery.json", { exact: true })).toBeVisible();
  await expect(finalPreview.locator("pre").first()).toContainText("# Réponse cyber fournisseur");
  await expect(finalPreview.locator("pre").last()).toContainText('"deliveryId"');
  await expect(finalPreview.locator("pre").last()).toContainText('"methodVersion"');
  await expect(finalPreview.locator("pre").last()).toContainText('"schemaVersion"');
  await expect(finalPreview.locator("pre").last()).toContainText('"verificationProfile"');
  await expect(finalPreview.locator("pre").last()).not.toContainText('"sourceMasterFingerprint"');
  await expect(finalPreview.locator("pre").last()).not.toContainText(blockedSecret);

  const confirmation = page.getByRole("checkbox", { name: /J’ai vérifié le contenu exact destiné au client et son empreinte/ });
  await confirmation.check();
  await expect(page.getByRole("button", { name: "Télécharger le ZIP client", exact: true })).toBeVisible();

  const selectedEvidence = deliveryReview.locator(".delivery-list label", { hasText: "Politique MFA" }).locator('input[type="checkbox"]');
  await selectedEvidence.evaluate((element) => {
    const input = element as HTMLInputElement;
    input.checked = false;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(confirmation).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Télécharger le ZIP client", exact: true })).toHaveCount(0);
  await expect(finalPreview.getByText("Aucun élément probant déclaré", { exact: true })).toBeVisible();

  await selectedEvidence.evaluate((element) => {
    const input = element as HTMLInputElement;
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await confirmation.check();
  await expect(page.getByRole("button", { name: "Télécharger le ZIP client", exact: true })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger le ZIP client", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^blackproof-delivery-delivery_[a-f0-9]{32}\.zip$/);
  const zipPath = await download.path();
  expect(zipPath).toBeTruthy();

  const deliveryZipBytes = await readFile(zipPath!);
  const zip = await JSZip.loadAsync(deliveryZipBytes);
  expect(Object.keys(zip.files).sort()).toEqual([
    "README.md",
    "delivery.json",
    "manifest.json",
    "references-preuves.csv",
    "reponse-fournisseur.md",
  ]);
  expect(zip.file("proofpack.json")).toBeNull();
  expect(zip.file("plan-remediation.csv")).toBeNull();
  expect(zip.file("note-synthese.md")).toBeNull();

  const deliveryJson = await zip.file("delivery.json")!.async("string");
  const delivery = JSON.parse(deliveryJson);
  expect(delivery.questions).toHaveLength(1);
  expect(delivery.questions[0]).not.toHaveProperty("category");
  expect(delivery.questions[0]).not.toHaveProperty("criticality");
  expect(deliveryJson).not.toContain(blockedSecret);
  expect(delivery.questions[0].evidence[0]).toEqual({
    id: expect.any(String),
    title: "Politique MFA",
    category: "access-control",
    disclosure: "reference-only",
    publicReference: "Rapport d’audit externe 2026 — consultable sous NDA",
  });
  expect(deliveryJson).not.toContain("fileUri");
  expect(deliveryJson).not.toContain("documentHash");
  expect(deliveryJson).not.toContain("owner");
  expect(deliveryJson).not.toContain("history");

  await expect(page.getByRole("link", { name: "Vérifier le ZIP téléchargé", exact: true })).toBeVisible();
  await openDeliveryHistory(page);
  await expect(page.getByRole("heading", { name: "Journal local des exports" })).toBeVisible();
  await expect(page.getByText("Client X", { exact: true })).toBeVisible();
  await expect(page.getByText(delivery.deliveryId, { exact: true })).toBeVisible();

  await openInternalExports(page);
  const masterDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger le JSON maître", exact: true }).click();
  const masterDownload = await masterDownloadPromise;
  const masterPath = await masterDownload.path();
  const master = JSON.parse(await readFile(masterPath!, "utf8"));
  expect(master.deliveryHistory).toHaveLength(1);
  expect(master.deliveryHistory[0]).toMatchObject({
    deliveryId: delivery.deliveryId,
    fingerprint: delivery.fingerprint,
    recipientLabel: "Client X",
    confirmedBy: "Alice Martin",
    filename: `blackproof-delivery-${delivery.deliveryId}.zip`,
    status: "generated",
  });
  expect(master.deliveryHistory[0].selectedQuestionIds).toHaveLength(1);
  expect(master.deliveryHistory[0].selectedEvidenceIds).toHaveLength(1);
  expect(master.deliveryHistory[0]).not.toHaveProperty("deliveryJson");
  expect(master.deliveryHistory[0].snapshotSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(master.deliveryHistory[0].questionMappings).toHaveLength(1);
  expect(master.deliveryHistory[0].evidenceMappings).toHaveLength(1);
  expect(master.revisionId).toMatch(/^revision_/);
  expect(master.id).toMatch(/^proofpack_/);
  expect(master.fingerprint).toBe(expectedProofPackFingerprint(master));

  const legacyMaster = structuredClone(master);
  legacyMaster.deliveryHistory[0].deliveryJson = deliveryJson;
  legacyMaster.fingerprint = expectedProofPackFingerprint(legacyMaster);
  const encryptedCase = await page.evaluate(async (caseId) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    return new Promise<any>((resolve, reject) => {
      const request = database.transaction("cases", "readonly").objectStore("cases").get(caseId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }, master.case.id);
  const clearCase = encryptedCase.payload.version === 2
    ? (await decryptLocalPayloadBatch<LocalProofCaseRecord>([encryptedCase.payload], DEFAULT_CASE_PASSPHRASE))[0]
    : await decryptLocalPayload<LocalProofCaseRecord>(encryptedCase.payload, DEFAULT_CASE_PASSPHRASE);
  clearCase.proofpack = legacyMaster;
  clearCase.proofpackFingerprint = legacyMaster.fingerprint;
  encryptedCase.payload = await encryptLocalPayload(clearCase, DEFAULT_CASE_PASSPHRASE);
  await page.evaluate(async ({ stored, deliveryId }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(["cases", "deliverySnapshots"], "readwrite");
      transaction.objectStore("cases").put(stored);
      transaction.objectStore("deliverySnapshots").delete([stored.id, deliveryId]);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }, { stored: encryptedCase, deliveryId: delivery.deliveryId });
  await navigateToEncryptedCase(page, () => page.reload());
  await openDeliveryHistory(page);
  await expect(page.getByRole("heading", { name: "Journal local des exports" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Télécharger la copie archivée" })).toBeVisible();
  const migratedLegacy = await page.evaluate(async ({ caseId, deliveryId }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    const transaction = database.transaction(["cases", "deliverySnapshots"], "readonly");
    const read = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    return {
      caseRecord: await read<any>(transaction.objectStore("cases").get(caseId)),
      snapshot: await read<any>(transaction.objectStore("deliverySnapshots").get([caseId, deliveryId])),
    };
  }, { caseId: master.case.id, deliveryId: delivery.deliveryId });
  const migratedCase = migratedLegacy.caseRecord.payload.version === 2
    ? (await decryptLocalPayloadBatch<LocalProofCaseRecord>([migratedLegacy.caseRecord.payload], DEFAULT_CASE_PASSPHRASE))[0]
    : await decryptLocalPayload<LocalProofCaseRecord>(migratedLegacy.caseRecord.payload, DEFAULT_CASE_PASSPHRASE);
  const migratedSnapshot = migratedLegacy.snapshot.payload.version === 2
    ? (await decryptLocalPayloadBatch<{ deliveryJson: string }>([migratedLegacy.snapshot.payload], DEFAULT_CASE_PASSPHRASE))[0]
    : await decryptLocalPayload<{ deliveryJson: string }>(migratedLegacy.snapshot.payload, DEFAULT_CASE_PASSPHRASE);
  expect(migratedCase.proofpack.deliveryHistory[0]).not.toHaveProperty("deliveryJson");
  expect(migratedSnapshot.deliveryJson).toBe(deliveryJson);

  await openInternalExports(page);
  const backupDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Sauvegarde locale complète" }).click();
  const backupDownload = await backupDownloadPromise;
  expect(backupDownload.suggestedFilename()).toBe("blackproof-local-backup.zip");
  const backupPath = await backupDownload.path();
  const encryptedBackupBytes = await readFile(backupPath!);
  const backupZip = await JSZip.loadAsync(
    await downgradeBackupToLegacyCleartext(encryptedBackupBytes, DEFAULT_CASE_PASSPHRASE)
  );
  expect(Object.keys(backupZip.files).sort()).toEqual([
    "inventory.json",
    "manifest.json",
    "master.json",
    `snapshots/${delivery.deliveryId}.json`,
  ].sort());
  const backupManifest = JSON.parse(await backupZip.file("manifest.json")!.async("string"));
  expect(backupManifest).toMatchObject({ version: "blackproof-local-backup-v2", localEnvelopeVersion: 2, encrypted: false, caseId: master.case.id });
  expect(backupManifest.files).toEqual(expect.arrayContaining([
    expect.objectContaining({ path: "master.json", sha256: expect.stringMatching(/^[a-f0-9]{64}$/), size: expect.any(Number) }),
    expect.objectContaining({ path: `snapshots/${delivery.deliveryId}.json`, sha256: expect.stringMatching(/^[a-f0-9]{64}$/), size: expect.any(Number) }),
  ]));
  backupZip.remove(`snapshots/${delivery.deliveryId}.json`);
  backupManifest.files = backupManifest.files.filter((item: { path: string }) => item.path !== `snapshots/${delivery.deliveryId}.json`);
  backupManifest.missingSnapshotDeliveryIds = [delivery.deliveryId];
  backupZip.file("manifest.json", JSON.stringify(backupManifest, null, 2));
  const partialBackup = await backupZip.generateAsync({ type: "nodebuffer" });
  await page.goto("/app/cases");
  await expect(page.locator('[data-blackproof-ready="true"]')).toBeVisible();
  await prepareRestoreForm(page, {
    name: "blackproof-local-backup-partial.zip",
    mimeType: "application/zip",
    buffer: partialBackup,
  }, DEFAULT_CASE_PASSPHRASE, { existingPassphrase: DEFAULT_CASE_PASSPHRASE });
  await submitRestoreForm(page);
  await expect(page.getByText("Une décision est requise dans la section Restauration partielle ci-dessous.")).toBeVisible();
  await page.getByLabel("Je confirme la restauration malgré ces absences.").check();
  await submitRestoreForm(page);
  await expect(page.getByText(/1 fusionné\(s\), 0 absent\(s\)/)).toBeVisible();
  await navigateToEncryptedCase(page, () => page.goto(`/app/case#id=${master.case.id}`));
  await openDeliveryHistory(page);
  await expect(page.getByRole("button", { name: "Télécharger la copie archivée" })).toBeVisible();

  const staleSnapshotPage = await page.context().newPage();
  await navigateToEncryptedCase(staleSnapshotPage, () => staleSnapshotPage.goto(page.url()));
  await openDeliveryHistory(staleSnapshotPage);
  await expect(staleSnapshotPage.getByRole("button", { name: "Supprimer la copie locale" })).toBeVisible();
  await page.getByLabel("Réponse à envoyer").first().fill("Révision R2 conservant le snapshot Delivery archivé.");
  await expect(page.getByText("Réponse mise à jour. Empreinte recalculée.")).toBeVisible();
  await page.getByRole("button", { name: "Sauvegarder les changements" }).click();
  await expect(page.getByText("Dossier local sauvegardé.")).toBeVisible();
  const staleRemovalConfirmation = staleSnapshotPage.waitForEvent("dialog");
  const staleRemoval = staleSnapshotPage.getByRole("button", { name: "Supprimer la copie locale" }).click();
  await (await staleRemovalConfirmation).accept();
  await staleRemoval;
  await expect(staleSnapshotPage.getByText("Ce dossier possède une révision plus récente dans un autre onglet. Rechargez-le avant de supprimer le snapshot.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Télécharger la copie archivée" })).toBeVisible();
  await staleSnapshotPage.close();

  await navigateToEncryptedCase(page, () => page.reload());
  await openDeliveryHistory(page);
  await expect(page.getByRole("heading", { name: "Journal local des exports" })).toBeVisible();
  await expect(page.getByText("Client X", { exact: true })).toBeVisible();
  const archivedDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger la copie archivée" }).click();
  const archivedDownload = await archivedDownloadPromise;
  expect(JSON.parse(await readFile((await archivedDownload.path())!, "utf8"))).toEqual(delivery);
  await expect(page.getByText("Téléchargement de la copie archivée demandé au navigateur. Vérifiez que le fichier a bien été enregistré.")).toBeVisible();

  const removalConfirmation = page.waitForEvent("dialog");
  const removalClick = page.getByRole("button", { name: "Supprimer la copie locale" }).click();
  const removalDialog = await removalConfirmation;
  expect(removalDialog.message()).toContain("Supprimer définitivement cette copie locale");
  await removalDialog.accept();
  await removalClick;
  await expect(page.getByText("Copie locale supprimée. Le reçu et son empreinte restent dans le dossier maître.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Télécharger la copie archivée" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Supprimer la copie locale" })).toHaveCount(0);
  await expect(page.getByText("Copie locale absente · empreinte conservée dans le reçu.")).toBeVisible();

  await navigateToEncryptedCase(page, () => page.reload());
  await openDeliveryHistory(page);
  await expect(page.getByText("Copie locale absente · empreinte conservée dans le reçu.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Télécharger la copie archivée" })).toHaveCount(0);
  const persistedStorage = await page.evaluate(async ({ caseId, deliveryId }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    const transaction = database.transaction(["cases", "deliverySnapshots"], "readonly");
    const read = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    const caseRecord = await read<any>(transaction.objectStore("cases").get(caseId));
    const snapshot = await read(transaction.objectStore("deliverySnapshots").get([caseId, deliveryId]));
    return { caseRecord, snapshot };
  }, { caseId: master.case.id, deliveryId: delivery.deliveryId });
  const persistedCase = persistedStorage.caseRecord.payload.version === 2
    ? (await decryptLocalPayloadBatch<LocalProofCaseRecord>([persistedStorage.caseRecord.payload], DEFAULT_CASE_PASSPHRASE))[0]
    : await decryptLocalPayload<LocalProofCaseRecord>(persistedStorage.caseRecord.payload, DEFAULT_CASE_PASSPHRASE);
  expect(persistedCase.proofpack.deliveryHistory[0].snapshotSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(persistedStorage.snapshot).toBeUndefined();

  await deliveryReview.getByRole("button", { name: "Inclure tous les éléments admissibles", exact: true }).click();
  await expect(confirmation).toBeEnabled();
  await confirmation.check();
  const jsonDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger le JSON client", exact: true }).click();
  const jsonDownload = await jsonDownloadPromise;
  expect(jsonDownload.suggestedFilename()).toMatch(/^blackproof-delivery-delivery_[a-f0-9]{32}\.json$/);
  expect(jsonDownload.suggestedFilename()).not.toContain(master.case.id);

  await page.goto("/verify");
  await expect(page.locator('[data-blackproof-verify-ready="true"]')).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(masterPath!);
  await expect(page.getByRole("heading", { name: "Structure, liens et empreinte cohérents" })).toBeVisible();
  await expect(page.getByText("Reçus des dossiers clients", { exact: true }).locator("..").getByText("OK", { exact: true })).toBeVisible();
  await page.getByLabel("Choisir les copies archivées des dossiers clients").setInputFiles({
    name: `blackproof-delivery-${delivery.deliveryId}.json`,
    mimeType: "application/json",
    buffer: Buffer.from(deliveryJson),
  });
  await expect(page.getByText("Copies fournies", { exact: true }).locator("..").getByText("1/1 vérifiés", { exact: true })).toBeVisible();
  await expect(page.getByText(delivery.deliveryId, { exact: true }).locator("..").getByText("OK", { exact: true })).toBeVisible();
  await page.getByLabel("Choisir un dossier maître ou client, JSON ou ZIP").setInputFiles({
    name: "proofpack-delivery-reviewed.zip",
    mimeType: "application/zip",
    buffer: deliveryZipBytes,
  });
  await expect(page.getByRole("heading", { name: "Contrôles locaux du ZIP client réussis" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Contrôles locaux du dossier client réussis" })).toHaveCount(0);
  await expect(page.getByText("Métadonnées du dossier client", { exact: true }).locator("..").getByText("OK", { exact: true })).toBeVisible();

  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(["cases", "deliverySnapshots"], "readwrite");
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
      transaction.objectStore("cases").clear();
      transaction.objectStore("deliverySnapshots").clear();
    });
  });
  await page.goto("/app/cases");
  await expect(page.locator('[data-blackproof-ready="true"]')).toBeVisible();
  await prepareRestoreForm(page, backupPath!, DEFAULT_CASE_PASSPHRASE, { backupPassphrase: DEFAULT_CASE_PASSPHRASE });
  await submitRestoreForm(page);
  await expect(page.getByText(/Sauvegarde restaurée \(structure, cohérence et intégrité cryptographique vérifiées ; origine non authentifiée\)/)).toBeVisible();
  await expect(page.locator(".case-card", { hasText: master.case.id })).toBeVisible();
});
