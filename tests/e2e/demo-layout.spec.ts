import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("demo walkthrough keeps readable columns on desktop and stacks cleanly on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/demo");

  const desktop = await page.evaluate(() => {
    const walkthrough = document.querySelector<HTMLElement>(".demo-walkthrough")!;
    const cards = [...document.querySelectorAll<HTMLElement>(".step-list article")];
    return {
      walkthroughWidth: walkthrough.getBoundingClientRect().width,
      cards: cards.map((card) => ({
        width: card.getBoundingClientRect().width,
        childWidths: [...card.children].map((child) => child.getBoundingClientRect().width),
      })),
    };
  });

  expect(desktop.walkthroughWidth).toBeGreaterThan(900);
  expect(desktop.cards).toHaveLength(5);
  for (const card of desktop.cards) {
    expect(card.width).toBeGreaterThan(900);
    expect(card.childWidths[1]).toBeGreaterThan(280);
    expect(card.childWidths[2]).toBeGreaterThan(180);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();

  const mobile = await page.evaluate(() => {
    const card = document.querySelector<HTMLElement>(".step-list article")!;
    const button = card.querySelector<HTMLElement>(".button")!;
    const cardRect = card.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    return {
      noHorizontalOverflow: document.documentElement.scrollWidth === window.innerWidth,
      columns: getComputedStyle(card).gridTemplateColumns.split(" ").length,
      buttonInsideCard: buttonRect.left >= cardRect.left && buttonRect.right <= cardRect.right,
    };
  });

  expect(mobile).toEqual({
    noHorizontalOverflow: true,
    columns: 1,
    buttonInsideCard: true,
  });
});

test("demo Excel download preserves French questions through the actual import", async ({ page }) => {
  await page.goto("/demo");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Télécharger le questionnaire Excel", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("supplier-questionnaire-demo.xlsx");
  expect(await download.failure()).toBeNull();

  await page.getByRole("link", { name: "Lancer l’import", exact: true }).click();
  await expect(page.locator('[data-blackproof-component="questionnaire-import"][data-blackproof-hydrated="true"]')).toBeVisible();
  await page.getByLabel("Choisir le questionnaire").setInputFiles({
    name: download.suggestedFilename(),
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: await readFile((await download.path())!),
  });
  await expect(page.getByRole("heading", { name: "Vérifiez la feuille retenue." })).toBeVisible();
  await expect(page.getByLabel("Feuille à utiliser")).toHaveValue("Questionnaire");
  await expect(page.getByText("10 questions détectées dans la feuille « Questionnaire »", { exact: false })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Testez-vous régulièrement la restauration des sauvegardes?" })).toBeVisible();
  await page.getByRole("button", { name: "Utiliser cette feuille" }).click();
  await expect(page.getByLabel("Phrase secrète du dossier", { exact: true })).toBeVisible();
});
