import { expect, test } from "@playwright/test";

test("internal audits and cyber reviews are explicit, without implying automated audit conclusions", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("revues cyber et audits internes");
  await expect(page.getByRole("heading", { name: "Questionnaires fournisseurs", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Audits internes", exact: true })).toBeVisible();
  await page.goto("/use-cases");
  await expect(page.getByRole("heading", { name: "Préparer un dossier d’audit interne documenté." })).toBeVisible();
  await expect(page.locator("main")).toContainText("Les conclusions d’audit restent humaines");
  await expect(page.locator("main")).toContainText("ne remplace ni le jugement d’un auditeur");
  await page.goto("/app");
  await expect(page.locator('[data-blackproof-hydrated="true"]')).toBeVisible();
  await expect(page.getByLabel("Destinataire ou équipe interne", { exact: true })).not.toHaveAttribute("required", "");
  await expect(page.getByLabel("Nom du dossier", { exact: true })).toHaveValue("Revue cyber");
});

test("start cards align content rows and leave breathing room after icons", async ({ page }) => {
  for (const width of [1440, 1280, 960, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/start");
    await page.evaluate(() => document.fonts.ready);
    const cards = await page.locator(".start-card").evaluateAll((elements) => elements.map((card) => {
      const bounds = card.getBoundingClientRect();
      const head = card.querySelector(".start-card-head")!.getBoundingClientRect();
      const title = card.querySelector("h2")!.getBoundingClientRect();
      const text = card.querySelector(":scope > p")!.getBoundingClientRect();
      const button = card.querySelector(".button")!.getBoundingClientRect();
      return { top: bounds.top, title: title.top, text: text.top, button: button.top,
        iconGap: title.top - head.bottom, textGap: text.top - title.bottom,
        inside: button.bottom <= bounds.bottom && text.right <= bounds.right };
    }));
    expect(cards).toHaveLength(4);
    for (const card of cards) {
      expect(card.iconGap).toBeGreaterThanOrEqual(12);
      expect(card.textGap).toBeGreaterThanOrEqual(12);
      expect(card.inside).toBe(true);
      for (const peer of cards.filter((other) => Math.abs(other.top - card.top) < 1)) {
        for (const row of ["title", "text", "button"] as const) expect(Math.abs(card[row] - peer[row])).toBeLessThan(1);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("example count and label never overlap, including enlarged text", async ({ page }) => {
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/proofpack-example");
    for (const enlarged of [false, true]) {
      if (enlarged) await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      const layout = await page.locator(".example-scorecard").evaluate((card) => {
        const outer = card.getBoundingClientRect();
        const number = card.querySelector(".score-ring-lite")!.getBoundingClientRect();
        const label = card.querySelector(".example-question-count > div")!.getBoundingClientRect();
        const hash = card.querySelector("code")!.getBoundingClientRect();
        return { separated: label.left >= number.right || label.top >= number.bottom,
          inside: label.right <= outer.right && hash.right <= outer.right,
          fullHash: card.querySelector("code")!.scrollWidth <= hash.width + 1 };
      });
      expect(layout).toEqual({ separated: true, inside: true, fullHash: true });
    }
  }
});

test("local workspaces share only the public homepage, never URL state or dossier data", async ({ page }) => {
  for (const path of ["/app", "/app/cases", "/app/case", "/questionnaire-import", "/verify"]) {
    await page.goto(`${path}?customer=SYNTHETIC_PRIVATE_NAME#id=case_SYNTHETIC_PRIVATE_ID`);
    const panel = page.locator("[data-share-panel]");
    await expect(panel).toHaveCount(1);
    await expect(panel).toContainText("jamais vos dossiers");
    const links = await panel.locator("a").evaluateAll((elements) => elements.map((a) => decodeURIComponent(a.href)));
    for (const href of links) {
      expect(href).toContain("https://blackproof.fr/");
      expect(href).not.toMatch(/SYNTHETIC|customer=|case_|#id=|localhost|127\.0\.0\.1/);
    }
    await expect(panel.locator("[data-share-copy]")).toHaveAttribute("data-share-url", "https://blackproof.fr/");
  }
});

test("share links remain visible, local icons accessible, with scripts disabled", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/faq?utm_source=discard#private");
    const panel = page.locator("[data-share-panel]");
    for (const label of ["Partager sur X", "Partager sur Facebook", "Partager sur LinkedIn", "Partager par e-mail"]) {
      const link = panel.getByRole("link", { name: label, exact: true });
      await expect(link).toBeVisible();
      await expect(link.locator("svg")).toHaveCount(1);
      const box = (await link.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.y + box.height).toBeLessThan(900);
      expect(decodeURIComponent(await link.getAttribute("href") ?? "")).not.toMatch(/utm_source|#private/);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await context.close();
});

test("legal aliases and FAQ state the same absolute no-upload boundary", async ({ page }) => {
  for (const path of ["/rgpd", "/legal"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Vos documents restent sur votre appareil. Aucun téléversement." })).toBeVisible();
    await expect(page.locator("main")).not.toContainText("par défaut");
    await expect(page.locator("main")).toContainText("BLACKPROOF ne reçoit ni les questionnaires");
  }
  await page.goto("/demo");
  await expect(page.locator(".final-cta .button.primary")).toHaveAttribute("href", "/questionnaire-import");
});

test("local erasure is separate, explicit and cancelable, with padded feedback", async ({ page }) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/app/cases");
    await expect(page.locator('[data-blackproof-ready="true"]')).toBeVisible();
    await expect(page.locator(".utility-actions")).not.toContainText("Effacer");
    await expect(page.locator("#local-wipe-help")).toContainText("Les fichiers téléchargés ne sont pas effacés");
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Tapez EFFACER pour confirmer");
      await dialog.dismiss();
    });
    await page.getByRole("button", { name: "Effacer les données locales", exact: true }).click();
    const message = page.locator(".wipe-box");
    await expect(message).toContainText("Aucune donnée n’a été supprimée");
    expect(await message.evaluate((el) => parseFloat(getComputedStyle(el).paddingTop))).toBeGreaterThanOrEqual(16);
    expect(await message.evaluate((el) => parseFloat(getComputedStyle(el).marginTop))).toBeGreaterThanOrEqual(16);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
});

test("navigation and footer address users without a customer FAQ", async ({ page }) => {
  for (const path of ["/", "/faq", "/start", "/resources", "/app/cases"]) {
    await page.goto(path);
    await expect(page.locator("body")).not.toContainText(/FAQ client|compte payant|abonnement/i);
    await expect(page.locator("footer").getByRole("link", { name: "Aide et FAQ", exact: true })).toHaveCount(1);
  }
});
