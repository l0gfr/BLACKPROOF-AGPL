import { expect, test, type Page } from "@playwright/test";

async function storedTheme(page: Page, value?: unknown) {
  return page.evaluate((value) => new Promise((resolve, reject) => {
    const request = indexedDB.open("blackproof-ui-preferences", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("preferences");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("preferences", value === undefined ? "readonly" : "readwrite");
      const operation = value === undefined ? tx.objectStore("preferences").get("theme") : tx.objectStore("preferences").put(value, "theme");
      tx.oncomplete = () => { db.close(); resolve(operation.result); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  }), value);
}

test("theme defaults to dark and persists only an explicit local choice", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Activer le thème clair" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("button", { name: "Activer le thème sombre" })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => storedTheme(page)).toBe("light");
  await page.goto("/faq");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.locator("html").evaluate((el) => getComputedStyle(el).colorScheme)).toBe("light");
  await page.getByRole("button", { name: "Activer le thème sombre" }).click();
  await expect.poll(() => storedTheme(page)).toBe("dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("theme works without persistent storage", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", { get() { throw new Error("Storage denied"); } });
  });
  await page.goto("/start");
  await page.getByRole("button", { name: "Activer le thème clair" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Activer le thème sombre" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("theme rejects unknown stored values", async ({ page }) => {
  await page.goto("/");
  await storedTheme(page, { theme: "light", untrusted: true });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("light theme covers reading, import, editor and verification surfaces", async ({ page }) => {
  await page.goto("/");
  await storedTheme(page, "light");
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of ["/", "/start", "/proofpack-example", "/faq", "/rgpd", "/api", "/app", "/app/cases", "/questionnaire-import", "/verify"]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      if (["/app", "/questionnaire-import"].includes(path)) await expect(page.locator('[data-blackproof-hydrated="true"]')).toBeVisible();
      if (path === "/app/cases") await expect(page.locator('[data-blackproof-ready="true"]')).toBeVisible();
      if (path === "/verify") await expect(page.locator('[data-blackproof-verify-ready="true"]')).toBeVisible();
      const values = await page.evaluate(() => {
        const styles = getComputedStyle(document.documentElement);
        return { scheme: styles.colorScheme, bg: styles.backgroundColor,
          foreground: getComputedStyle(document.body).color,
          overflow: document.documentElement.scrollWidth > innerWidth + 1 };
      });
      expect(values.scheme, path).toBe("light");
      expect(values.bg, path).toBe("rgb(245, 247, 242)");
      expect(values.foreground, path).toBe("rgb(23, 43, 34)");
      expect(values.overflow, `${path} at ${width}`).toBe(false);
      await expect(page.getByRole("button", { name: "Activer le thème sombre" })).toBeVisible();
    }
  }
});

test("theme preference is isolated from dossier storage and refreshes between tabs", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Activer le thème clair" }).click();
  await expect.poll(() => storedTheme(page)).toBe("light");
  expect(await page.evaluate(async () => (await indexedDB.databases()).map(db => db.name))).toEqual(["blackproof-ui-preferences"]);
  const other = await page.context().newPage();
  await other.goto("/start");
  await expect(other.locator("html")).toHaveAttribute("data-theme", "light");
  await other.getByRole("button", { name: "Activer le thème sombre" }).click();
  await expect.poll(() => storedTheme(other)).toBe("dark");
  await page.bringToFront();
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await other.close();
});

test("navigation icons stay decorative and dropdowns remain keyboard accessible", async ({ page }) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/start");
    for (const name of ["Comprendre", "Utiliser", "Ressources"]) {
      const summary = page.locator(".nav-group > summary").filter({ hasText: name });
      await summary.focus();
      await page.keyboard.press("Enter");
      const menu = summary.locator("..").locator(".nav-menu");
      await expect(menu).toBeVisible();
      for (const link of await menu.locator("a").all()) {
        await expect(link.locator('[aria-hidden="true"] svg')).toHaveCount(1);
        expect(await link.innerText()).not.toBe("");
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await menu.locator("a").first().focus();
      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();
      await expect(summary).toBeFocused();
    }
  }
});
