import { expect, test } from "@playwright/test";

test("questionnaire import workspace stays spacious and responsive", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/questionnaire-import");
  await expect(page.locator('[data-blackproof-component="questionnaire-import"][data-blackproof-hydrated="true"]')).toBeVisible();
  await expect(page.getByLabel("Choisir le questionnaire")).toHaveCount(1);

  const desktop = await page.evaluate(() => {
    const intro = document.querySelector<HTMLElement>(".import-intro")!;
    const stage = document.querySelector<HTMLElement>(".source-stage")!;
    const source = document.querySelector<HTMLElement>(".primary-source")!;
    const quickActions = document.querySelector<HTMLElement>(".quick-actions")!;
    const stageRect = stage.getBoundingClientRect();
    const sourceRect = source.getBoundingClientRect();

    return {
      noHorizontalOverflow: document.documentElement.scrollWidth === window.innerWidth,
      introColumns: getComputedStyle(intro).gridTemplateColumns.split(" ").length,
      quickActionColumns: getComputedStyle(quickActions).gridTemplateColumns.split(" ").length,
      stageWidth: stageRect.width,
      sourceHeight: sourceRect.height,
      sourceInsideStage: sourceRect.left >= stageRect.left && sourceRect.right <= stageRect.right,
    };
  });

  expect(desktop.noHorizontalOverflow).toBe(true);
  expect(desktop.introColumns).toBe(2);
  expect(desktop.quickActionColumns).toBe(2);
  expect(desktop.stageWidth).toBeGreaterThan(900);
  expect(desktop.sourceHeight).toBeGreaterThanOrEqual(160);
  expect(desktop.sourceInsideStage).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('[data-blackproof-component="questionnaire-import"][data-blackproof-hydrated="true"]')).toBeVisible();

  const mobile = await page.evaluate(() => {
    const intro = document.querySelector<HTMLElement>(".import-intro")!;
    const privacy = document.querySelector<HTMLElement>(".privacy-card")!;
    const quickActions = document.querySelector<HTMLElement>(".quick-actions")!;
    const stage = document.querySelector<HTMLElement>(".source-stage")!;
    const source = document.querySelector<HTMLElement>(".primary-source")!;
    const stageRect = stage.getBoundingClientRect();
    const sourceRect = source.getBoundingClientRect();

    return {
      noHorizontalOverflow: document.documentElement.scrollWidth === window.innerWidth,
      introColumns: getComputedStyle(intro).gridTemplateColumns.split(" ").length,
      privacyColumns: getComputedStyle(privacy).gridTemplateColumns.split(" ").length,
      quickActionColumns: getComputedStyle(quickActions).gridTemplateColumns.split(" ").length,
      sourceInsideStage: sourceRect.left >= stageRect.left && sourceRect.right <= stageRect.right,
    };
  });

  expect(mobile).toEqual({
    noHorizontalOverflow: true,
    introColumns: 1,
    privacyColumns: 1,
    quickActionColumns: 1,
    sourceInsideStage: true,
  });
});
