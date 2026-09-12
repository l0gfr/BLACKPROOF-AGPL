import { expect, test } from "@playwright/test";

const screenshotPaths = [
  "/guides/faq-dossiers-locaux.png",
  "/guides/faq-phrase-secrete.png",
  "/guides/faq-sauvegarde.png",
] as const;

test("client FAQ states the current account and local-storage boundary plainly", async ({ page }) => {
  await page.goto("/faq");

  await expect(page.getByRole("heading", {
    level: 1,
    name: "Retrouver ses dossiers sans confondre compte et stockage local.",
  })).toBeVisible();
  await expect(page.getByText("pas de login", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Voir mes dossiers locaux" }).first()).toHaveAttribute("href", "/app/cases");
  await expect(page.getByRole("heading", { name: "Un logiciel ouvert, des dossiers locaux." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sauvegarder et restaurer" })).toBeVisible();
  await expect(page.locator(".faq-list details")).toHaveCount(25);
});

test("FAQ illustrations are local, descriptive and available", async ({ page, request }) => {
  await page.goto("/faq");

  const images = page.locator(".guide-shot img");
  await expect(images).toHaveCount(screenshotPaths.length);

  const imageSources = await images.evaluateAll((elements) => elements.map((element) => ({
    src: element.getAttribute("src"),
    alt: element.getAttribute("alt"),
  })));

  expect(imageSources.map((image) => image.src)).toEqual(screenshotPaths);
  expect(imageSources.every((image) => (image.alt?.length ?? 0) > 40)).toBe(true);
  expect(imageSources.every((image) => image.src?.startsWith("/guides/"))).toBe(true);

  for (const path of screenshotPaths) {
    const response = await request.get(path);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toBe("image/png");
    expect(Array.from((await response.body()).subarray(0, 8))).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
  }
});

test("account, access, cases and resources point users to the FAQ", async ({ page }) => {
  for (const [path, label] of [
    ["/app/cases", "Comment retrouver et sauvegarder mes dossiers ?"],
    ["/resources", "FAQ client"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("link", { name: label }).first()).toBeVisible();
  }
});

test("client FAQ remains readable without horizontal overflow", async ({ page }) => {
  for (const viewport of [
    { width: 1280, height: 820 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/faq");
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(horizontalOverflow).toBe(false);
  }
});
