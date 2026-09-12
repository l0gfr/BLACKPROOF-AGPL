import { expect, test } from "@playwright/test";
import {
  createDeliveryRevocation,
  generateDeliverySigningKeyPair,
  sha256Hex,
  signDeliveryFingerprint,
  stableStringify,
  type ProofPackDelivery,
} from "../../packages/core/src/index";

test("legacy verification links retain binding locally and reject conflicting fingerprints", async ({ page, request }) => {
  const response = await request.get("/demo/proofpack-delivery-demo.json");
  expect(response.ok()).toBe(true);
  const delivery = await response.json() as ProofPackDelivery;
  const otherFingerprint = `bp_sha256_${"0".repeat(64)}`;
  const cases = [
    { suffix: `?fingerprint=${delivery.fingerprint}`, expected: "OK" },
    { suffix: `?fingerprint=${otherFingerprint}`, expected: "FAIL" },
    { suffix: `?fingerprint=${otherFingerprint}#fingerprint=${delivery.fingerprint}`, expected: "FAIL" },
    { suffix: "?fingerprint=invalid", expected: "FAIL" },
  ];
  for (const scenario of cases) {
    await page.goto(`/verify${scenario.suffix}`);
    await expect(page.locator('[data-blackproof-verify-ready="true"]')).toBeVisible();
    expect(new URL(page.url()).searchParams.has("fingerprint")).toBe(false);
    const transmissions: string[] = [];
    const capture = (sent: import("@playwright/test").Request) => { transmissions.push(sent.url()); };
    page.on("request", capture);
    await page.getByLabel("Choisir un dossier maître ou client, JSON ou ZIP").setInputFiles({
      name: "synthetic-delivery.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(delivery)),
    });
    const binding = page.locator("article.finding").filter({ hasText: "Lien du classeur de retour" });
    await expect(binding.getByText(scenario.expected, { exact: true })).toBeVisible();
    expect(transmissions).toEqual([]);
    page.off("request", capture);
  }
});

test("recipient compares, authenticates and archives a Delivery without an account", async ({ page, request }) => {
  const response = await request.get("/demo/proofpack-delivery-demo.json");
  expect(response.ok()).toBe(true);
  const current = await response.json() as ProofPackDelivery;
  const previous = structuredClone(current);
  previous.deliveryId = "delivery_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  previous.questions[0]!.answer = "Ancienne formulation MFA.";
  previous.generatedAt = "2026-07-10T10:00:00.000Z";
  const { fingerprint: _previousFingerprint, ...previousBase } = previous;
  previous.fingerprint = `bp_sha256_${await sha256Hex(stableStringify(previousBase))}`;

  await page.goto(`/verify#fingerprint=${encodeURIComponent(current.fingerprint)}`);
  await expect(page.locator('[data-blackproof-verify-ready="true"]')).toBeVisible();
  await page.getByLabel("Choisir un dossier maître ou client, JSON ou ZIP").setInputFiles({
    name: "delivery-current.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(current)),
  });
  await expect(page.getByRole("heading", { name: "Contrôles locaux du dossier client réussis" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Comparer, vérifier une signature et archiver ce dossier client." })).toBeVisible();
  await expect(page.getByText("L’empreinte du dossier client correspond au lien inscrit dans le classeur.", { exact: true })).toBeVisible();

  await page.getByLabel("Version précédente à comparer (JSON ou ZIP)").setInputFiles({
    name: "delivery-previous.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(previous)),
  });
  await expect(page.getByText("Modifiées", { exact: true }).locator("..").getByText("1", { exact: true })).toBeVisible();
  await expect(page.getByText("answer-changed", { exact: true })).toBeVisible();
  const reportDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger le rapport JSON" }).click();
  expect((await reportDownloadPromise).suggestedFilename()).toBe(`blackproof-change-report-${current.deliveryId}.json`);

  const keys = await generateDeliverySigningKeyPair();
  const signature = await signDeliveryFingerprint({
    subjectType: "delivery",
    subjectFingerprint: current.fingerprint,
    issuer: "Northstar SaaS",
    privateKeyJwk: keys.privateKeyJwk,
    signedAt: "2026-07-13T10:00:00.000Z",
  });
  await page.getByLabel("Signature émetteur détachée (JSON, optionnel)").setInputFiles({
    name: "delivery-signature.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(signature)),
  });
  await expect(page.getByText("Signature émetteur", { exact: true }).locator("..").getByText("SIGNATURE COHÉRENTE", { exact: true })).toBeVisible();

  const revocation = await createDeliveryRevocation(current, "Remplacé par une version corrigée", "2026-07-13T11:00:00.000Z");
  await page.getByLabel("Déclaration publique de révocation (JSON)").setInputFiles({
    name: "delivery-revocation.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(revocation)),
  });
  const offlineRevocation = page.locator("article.finding").filter({ hasText: "Déclaration hors ligne" });
  await expect(offlineRevocation.getByText("AUTO-COHÉRENTE", { exact: true })).toBeVisible();
  await expect(offlineRevocation.getByText(/origine n’est pas authentifiée hors ligne/)).toBeVisible();

  await expect(page.getByRole("button", { name: "Consulter le registre public" })).toHaveCount(0);
  await expect(page.getByText("NON VÉRIFIÉ", { exact: true })).toBeVisible();
});

test("verifier keeps the filename and verdict bound to the latest file selection", async ({ page, request }) => {
  const response = await request.get("/demo/proofpack-delivery-demo.json");
  expect(response.ok()).toBe(true);
  const current = await response.text();

  await page.addInitScript(() => {
    const originalText = File.prototype.text;
    let releaseDelayedRead = () => {};
    const delayedRead = new Promise<void>((resolve) => {
      releaseDelayedRead = resolve;
    });
    const state = {
      started: false,
      release: releaseDelayedRead,
    };
    (window as typeof window & { __blackproofVerifierSelectionRace?: typeof state }).__blackproofVerifierSelectionRace = state;

    File.prototype.text = async function text() {
      const value = await originalText.call(this);
      if (this.name !== "delayed-earlier.json") return value;
      state.started = true;
      await delayedRead;
      return value;
    };
  });

  await page.goto("/verify");
  await expect(page.locator('[data-blackproof-verify-ready="true"]')).toBeVisible();
  const input = page.getByLabel("Choisir un dossier maître ou client, JSON ou ZIP");

  await input.setInputFiles({
    name: "delayed-earlier.json",
    mimeType: "application/json",
    buffer: Buffer.from("{"),
  });
  await page.waitForFunction(() => (
    window as typeof window & { __blackproofVerifierSelectionRace?: { started: boolean } }
  ).__blackproofVerifierSelectionRace?.started === true);

  await input.setInputFiles({
    name: "current-delivery.json",
    mimeType: "application/json",
    buffer: Buffer.from(current),
  });
  await expect(page.getByText("Fichier : current-delivery.json", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Contrôles locaux du dossier client réussis" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Comparer, vérifier une signature et archiver ce dossier client." })).toBeVisible();

  await page.evaluate(async () => {
    const state = (
      window as typeof window & { __blackproofVerifierSelectionRace?: { release: () => void } }
    ).__blackproofVerifierSelectionRace;
    if (!state) throw new Error("Verifier selection race gate is unavailable.");
    state.release();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });

  await expect(page.getByText("Fichier : current-delivery.json", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Contrôles locaux du dossier client réussis" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Comparer, vérifier une signature et archiver ce dossier client." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "ProofPack non valide" })).toHaveCount(0);
});
