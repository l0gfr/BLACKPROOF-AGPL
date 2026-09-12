import { expect, test } from "@playwright/test";

const customerRoutes = [
  "/",
  "/open-source",
  "/pilot",
  "/start",
  "/demo",
  "/proofpack",
  "/proofpack-example",
  "/use-cases",
  "/security",
  "/grc",
  "/proofdebt",
  "/about",
  "/resources",
];

const internalWording = [
  /Design Partner/i,
  /sur qualification/i,
  /pilote contrôlé/i,
  /atelier local alpha/i,
  /accès technique direct/i,
  /API publique statique/i,
  /vendor-risk/i,
  /IndexedDB/i,
  /heuristique/i,
  /indice alpha/i,
  /registre de préparation/i,
  /ProofDebt/i,
  /machine-readable/i,
  /\bendpoint\b/i,
  /\bSLA\b/,
  /\bself-service\b/i,
  /\bMaster\b/,
  /\bDelivery\b/,
  /\bpositionnement\b/i,
  /\bdoctrine\b/i,
  /\blocal-first\b/i,
];

test("customer pages explain the software without internal product vocabulary", async ({ page }) => {
  for (const route of customerRoutes) {
    await page.goto(route);
    const visibleText = await page.locator("body").innerText();
    for (const wording of internalWording) {
      expect(visibleText, `${route} exposes ${wording}`).not.toMatch(wording);
    }

    const headings = await page.getByRole("heading").allTextContents();
    expect(headings, `${route} repeats an AI-style heading opener`).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^\s*Ce (?:que|qui)\b/i)]),
    );
  }
});

test("free software page explains local processing and source availability", async ({ page }) => {
  await page.goto("/open-source");
  await expect(page.locator("main")).toContainText("AGPL-3.0-only");
  await expect(page.locator('main a[href="/app"]')).toBeVisible();
  await expect(page.locator("main")).not.toContainText("99 €");
  await expect(page.locator('a[href="/pricing"], a[href="/account"]')).toHaveCount(0);
});
