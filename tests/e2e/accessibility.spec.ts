import { expect, test } from "@playwright/test";

test("primary local workflow remains keyboard operable with named landmarks", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeVisible();
  const offersLink = page.getByRole("link", { name: "Logiciel libre", exact: true }).first();
  await offersLink.focus();
  await expect(offersLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/open-source$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("critical public and app surfaces reflow at a 200 percent text scale", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 720 });
  for (const path of ["/security", "/app/cases"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(horizontalOverflow).toBe(false);
  }
});

test("homepage demonstration opens in a full-viewport accessible player", async ({ page }) => {
  await page.goto("/");

  const launchVideo = page.getByRole("button", { name: /Voir la démonstration/ });
  const videoDialog = page.getByRole("dialog", { name: "Parcours utilisateur BLACKPROOF" });
  const video = page.locator("video[data-video-player]");

  await expect(launchVideo).toBeVisible();
  await expect(video).toHaveAttribute("preload", "none");
  await expect(video.locator("source")).toHaveAttribute(
    "src",
    "/media/blackproof-parcours-utilisateur.mp4",
  );

  await launchVideo.click();
  await expect(videoDialog).toBeVisible();

  const viewport = page.viewportSize();
  const dialogBox = await videoDialog.boundingBox();
  expect(viewport).not.toBeNull();
  expect(dialogBox).not.toBeNull();
  expect(dialogBox?.width).toBeGreaterThanOrEqual((viewport?.width ?? 0) - 1);
  expect(dialogBox?.height).toBeGreaterThanOrEqual((viewport?.height ?? 0) - 1);

  await page.getByRole("button", { name: "Fermer la vidéo" }).click();
  await expect(videoDialog).toBeHidden();
  await expect(video).toHaveJSProperty("paused", true);
});
