import { expect, test } from "@playwright/test";
import { decryptLocalPayload, encryptLocalPayload, type EncryptedLocalPayload } from "../../apps/web/src/lib/local-encryption";

const passphrase = "offline-only-fixture-passphrase-2026";

test("local text import, encryption and export work with the network offline", async ({ page, context }) => {
  await page.goto("/questionnaire-import");
  await expect(page.locator('[data-blackproof-hydrated="true"]')).toBeVisible();
  await context.setOffline(true);
  await page.getByLabel("Choisir le questionnaire").setInputFiles({
    name: "local-only.txt", mimeType: "text/plain",
    buffer: Buffer.from("1. Disposez-vous de sauvegardes testées ?\n2. Les accès administrateurs utilisent-ils le MFA ?"),
  });
  await page.getByLabel("Phrase secrète du dossier", { exact: true }).fill(passphrase);
  await page.getByLabel("Confirmer la phrase secrète", { exact: true }).fill(passphrase);
  await page.getByRole("button", { name: "Protéger et ouvrir le dossier", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Compléter et préparer le dossier." })).toBeVisible();
  expect(new URL(page.url()).search).toBe("");
  expect(new URL(page.url()).hash).toMatch(/^#id=case_/);
  const panel = page.locator("details.master-export");
  await panel.getByText("Exports internes et sauvegarde complète", { exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger le ZIP maître", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.zip$/);
});

test("CSP blocks fetch, XHR, beacon and form submissions before transport", async ({ page }) => {
  let transmitted = 0;
  await page.route("**/__local_only_probe", async (route) => {
    transmitted += 1;
    await route.abort();
  });
  await page.goto("/app");
  await expect(page.locator('[data-blackproof-hydrated="true"]')).toBeVisible();
  const result = await page.evaluate(async () => {
    const violations: string[] = [];
    document.addEventListener("securitypolicyviolation", (event) => violations.push(event.effectiveDirective));
    const fetchBlocked = await fetch("/__local_only_probe", { method: "POST", body: "synthetic-probe" }).then(() => false, () => true);
    const xhrBlocked = await new Promise<boolean>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/__local_only_probe");
      xhr.onload = () => resolve(false);
      xhr.onerror = () => resolve(true);
      xhr.send("synthetic-probe");
    });
    navigator.sendBeacon("/__local_only_probe", "synthetic-probe");
    const form = document.createElement("form");
    form.action = "/__local_only_probe";
    form.method = "POST";
    document.body.append(form);
    form.submit();
    await new Promise((resolve) => setTimeout(resolve, 50));
    form.remove();
    return { fetchBlocked, xhrBlocked, violations };
  });
  expect(result.fetchBlocked).toBe(true);
  expect(result.xhrBlocked).toBe(true);
  expect(result.violations).toContain("connect-src");
  expect(result.violations).toContain("form-action");
  expect(transmitted).toBe(0);
});

test("v11 to v12 removes only access state and preserves encrypted dossier and snapshot bytes", async ({ page }) => {
  await page.goto("/app");
  await expect(page.locator('[data-blackproof-hydrated="true"]')).toBeVisible();
  await page.getByLabel("Phrase secrète du dossier", { exact: true }).fill(passphrase);
  await page.getByLabel("Confirmer la phrase secrète", { exact: true }).fill(passphrase);
  await page.getByRole("button", { name: "Analyser et ouvrir l’éditeur", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Compléter et préparer le dossier." })).toBeVisible();
  await page.goto("/");
  const snapshotPayload = await encryptLocalPayload({ deliveryJson: "synthetic historical snapshot" }, passphrase);
  const originals = await page.evaluate(async (payload) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const record = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const request = database.transaction("cases").objectStore("cases").getAll();
      request.onsuccess = () => resolve(request.result[0]);
      request.onerror = () => reject(request.error);
    });
    database.close();
    const snapshot = { caseId: record.id, deliveryId: "delivery_" + "b".repeat(32), createdAt: record.createdAt, encrypted: true, payload };
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase("blackproof-local-first");
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("Old database remained open"));
    });
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first", 110);
      request.onupgradeneeded = () => {
        const db = request.result;
        const cases = db.createObjectStore("cases", { keyPath: "id" });
        for (const key of ["encrypted", "updatedAt", "createdAt"]) cases.createIndex(key, key);
        const snapshots = db.createObjectStore("deliverySnapshots", { keyPath: ["caseId", "deliveryId"] });
        for (const key of ["deliveryId", "caseId", "createdAt", "encrypted"]) snapshots.createIndex(key, key);
        db.createObjectStore("metadata", { keyPath: "key" });
        db.createObjectStore("entitlements", { keyPath: "key" });
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(["cases", "deliverySnapshots", "metadata", "entitlements"], "readwrite");
        tx.objectStore("cases").put(record);
        tx.objectStore("deliverySnapshots").put(snapshot);
        for (const [key, value] of [["storageEpoch", 17], ["checkoutAttemptV1", "synthetic"], ["accountLogoutPending", "synthetic"]]) {
          tx.objectStore("metadata").put({ key, value });
        }
        tx.objectStore("entitlements").put({ key: "current", token: "synthetic-retired-access" });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
    });
    return { record, snapshot };
  }, snapshotPayload);
  await page.goto("/app/cases");
  await expect(page.locator('[data-blackproof-ready="true"]')).toBeVisible();
  const migrated = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("blackproof-local-first");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const read = (store: string) => new Promise<Record<string, unknown>[]>((resolve, reject) => {
      const request = db.transaction(store).objectStore(store).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const output = { version: db.version, stores: [...db.objectStoreNames], cases: await read("cases"), snapshots: await read("deliverySnapshots"), metadata: await read("metadata") };
    db.close();
    return output;
  });
  expect(migrated.version).toBe(120);
  expect(migrated.stores).not.toContain("entitlements");
  expect(migrated.metadata).toEqual([{ key: "storageEpoch", value: 17 }]);
  expect(migrated.cases).toEqual([originals.record]);
  expect(migrated.snapshots).toEqual([originals.snapshot]);
  expect(await decryptLocalPayload(migrated.snapshots[0].payload as EncryptedLocalPayload, passphrase)).toEqual({ deliveryJson: "synthetic historical snapshot" });
  await page.goto("/app/case#id=" + originals.record.id);
  await page.getByLabel("Phrase secrète du dossier", { exact: true }).fill(passphrase);
  await page.getByRole("button", { name: "Déverrouiller le dossier", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Compléter et préparer le dossier." })).toBeVisible();
});
