import { expect, test } from "@playwright/test";

const analysisPath = "/analyses/fuite-de-donnees-etablir-avant-de-conclure";

test("public pages expose passive share links without contacting social networks", async ({ page }) => {
  const contactedExternalHosts = new Set<string>();

  page.on("request", (request) => {
    const host = new URL(request.url()).hostname;
    if (!["127.0.0.1", "localhost"].includes(host)) contactedExternalHosts.add(host);
  });

  for (const [path, canonicalUrl, heading] of [
    ["/", "https://blackproof.fr/", "Partager BLACKPROOF"],
    [analysisPath, `https://blackproof.fr${analysisPath}`, "Partager cette analyse"],
    ["/faq", "https://blackproof.fr/faq/", "Partager cette page"],
    ["/proofpack-example", "https://blackproof.fr/proofpack-example/", "Partager cette page"],
    ["/start", "https://blackproof.fr/start/", "Partager cette page"],
  ] as const) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.getByText("Aucun réseau n’est contacté avant votre clic.")).toBeVisible();

    const destinations = {
      x: page.getByRole("link", { name: "Partager sur X" }),
      bluesky: page.getByRole("link", { name: "Partager sur Bluesky" }),
      linkedin: page.getByRole("link", { name: "Partager sur LinkedIn" }),
      facebook: page.getByRole("link", { name: "Partager sur Facebook" }),
      email: page.getByRole("link", { name: "Partager par e-mail" }),
    };

    for (const link of [destinations.x, destinations.bluesky, destinations.linkedin, destinations.facebook]) {
      await expect(link.locator("svg")).toHaveCount(1);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noreferrer/);
      await expect(link).toHaveAttribute("rel", /nofollow/);
    }

    const xUrl = new URL(await destinations.x.getAttribute("href") ?? "");
    expect(xUrl.hostname).toBe("x.com");
    expect(xUrl.pathname).toBe("/intent/post");
    expect(xUrl.searchParams.get("text")).toContain(canonicalUrl);

    const blueskyUrl = new URL(await destinations.bluesky.getAttribute("href") ?? "");
    expect(blueskyUrl.hostname).toBe("bsky.app");
    expect(blueskyUrl.pathname).toBe("/intent/compose");
    expect(blueskyUrl.searchParams.get("text")).toContain(canonicalUrl);

    const linkedInUrl = new URL(await destinations.linkedin.getAttribute("href") ?? "");
    expect(linkedInUrl.hostname).toBe("www.linkedin.com");
    expect(linkedInUrl.pathname).toBe("/sharing/share-offsite/");
    expect(linkedInUrl.searchParams.get("url")).toBe(canonicalUrl);

    const facebookUrl = new URL(await destinations.facebook.getAttribute("href") ?? "");
    expect(facebookUrl.hostname).toBe("www.facebook.com");
    expect(facebookUrl.pathname).toBe("/sharer/sharer.php");
    expect(facebookUrl.searchParams.get("u")).toBe(canonicalUrl);

    const emailUrl = new URL(await destinations.email.getAttribute("href") ?? "");
    expect(emailUrl.protocol).toBe("mailto:");
    expect(emailUrl.searchParams.get("body")).toContain(canonicalUrl);

    for (const link of Object.values(destinations)) {
      const href = await link.getAttribute("href");
      expect(href).not.toMatch(/(?:utm_|fbclid|gclid|li_fat_id)/i);
    }
  }

  expect([...contactedExternalHosts]).toEqual([]);
});

test("copy link stays local and reports success accessibly", async ({ page }) => {
  await page.addInitScript(() => {
    const clipboardWrites: string[] = [];
    Object.defineProperty(window, "__blackproofClipboardWrites", {
      configurable: true,
      value: clipboardWrites,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          clipboardWrites.push(value);
        },
      },
    });
  });

  await page.goto(analysisPath);
  const copyButton = page.getByRole("button", { name: "Copier le lien" });
  await copyButton.click();

  await expect(copyButton).toHaveAttribute("data-copy-state", "copied");
  await expect(copyButton).toContainText("Lien copié");
  await expect(copyButton.locator("[aria-live='polite']")).toHaveText("Lien copié");

  const writes = await page.evaluate(() => (
    window as typeof window & { __blackproofClipboardWrites: string[] }
  ).__blackproofClipboardWrites);
  expect(writes).toEqual([`https://blackproof.fr${analysisPath}`]);
});

test("copy link falls back locally when Clipboard API is denied", async ({ page }) => {
  await page.addInitScript(() => {
    const fallbackCopies: string[] = [];
    Object.defineProperty(window, "__blackproofFallbackCopies", {
      configurable: true,
      value: fallbackCopies,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Clipboard permission denied");
        },
      },
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: (command: string) => {
        const activeElement = document.activeElement;
        if (command !== "copy" || !(activeElement instanceof HTMLTextAreaElement)) return false;
        fallbackCopies.push(activeElement.value);
        return true;
      },
    });
  });

  await page.goto(analysisPath);
  const copyButton = page.getByRole("button", { name: "Copier le lien" });
  await copyButton.click();

  await expect(copyButton).toHaveAttribute("data-copy-state", "copied");
  await expect(copyButton).toContainText("Lien copié");

  const fallbackCopies = await page.evaluate(() => (
    window as typeof window & { __blackproofFallbackCopies: string[] }
  ).__blackproofFallbackCopies);
  expect(fallbackCopies).toEqual([`https://blackproof.fr${analysisPath}`]);
});

test("each published analysis has a local, unique social image and consistent metadata", async ({ page, request }) => {
  await page.goto("/analyses");
  const paths = await page.locator(".analysis-card a").evaluateAll((links) => (
    [...new Set(links.map((link) => new URL((link as HTMLAnchorElement).href).pathname))]
      .filter((path) => path.startsWith("/analyses/") && !path.endsWith("feed.xml"))
  ));
  expect(paths.length).toBeGreaterThan(0);
  const images = new Set<string>();
  for (const path of paths) {
    await page.goto(path);
    const title = await page.locator("h1").innerText();
    const image = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(image).toMatch(/^https:\/\/blackproof\.fr\/og\/analyses\/[a-z0-9-]+-[a-f0-9]{12}\.png$/);
    expect(images.has(image!)).toBe(false);
    images.add(image!);
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", `${title} | Analyses BLACKPROOF`);
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");
    await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute("content", "image/png");
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", image!);
    await expect(page.locator('meta[itemprop="image"]')).toHaveAttribute("content", image!);

    const imageResponse = await request.get(new URL(image!).pathname);
    expect(imageResponse.ok()).toBe(true);
    expect(imageResponse.headers()["content-type"]).toBe("image/png");
    const png = await imageResponse.body();
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
    expect(png.length).toBeLessThan(500_000);
  }
});

test("article sharing is attached to its heading, labelled on mobile and free of URL state", async ({ page }) => {
  const path = "/analyses/agents-ia-cles-entreprise-acces-mcp";
  for (const width of [1280, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${path}?utm_source=discard&customer=PRIVATE#private`);
    const panel = page.locator(".analysis-header [data-share-panel]");
    await expect(page.locator("[data-share-panel]")).toHaveCount(1);
    await expect(panel.getByRole("heading", { name: "Partager cette analyse" })).toBeVisible();
    await expect(panel.locator(".share-action")).toHaveCount(6);
    for (const action of await panel.locator(".share-action").all()) {
      await expect(action).toBeVisible();
      await expect(action.locator("svg")).toHaveCount(1);
      const bounds = (await action.boundingBox())!;
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(await action.locator("span:not(.share-icon):not(.sr-only)").evaluate((label) => (
        getComputedStyle(label).position !== "absolute"
      ))).toBe(true);
    }
    for (const href of await panel.locator("a").evaluateAll((links) => links.map((link) => decodeURIComponent(link.href)))) {
      expect(href).toContain(`https://blackproof.fr${path}`);
      expect(href).not.toMatch(/PRIVATE|utm_source|customer=|#private|localhost|127\.0\.0\.1/);
    }
    await expect(panel.locator("[data-share-copy]")).toHaveAttribute("data-share-url", `https://blackproof.fr${path}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("copy reports failure honestly when both local clipboard methods fail", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("denied"); } } });
    Object.defineProperty(document, "execCommand", { configurable: true, value: () => false });
  });
  await page.goto(analysisPath);
  const button = page.getByRole("button", { name: "Copier le lien" });
  await button.click();
  await expect(button).toHaveAttribute("data-copy-state", "error");
  await expect(button.locator("[aria-live='polite']")).toHaveText("Copie impossible");
});

test("article share links work without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 320, height: 1000 } });
  const page = await context.newPage();
  await page.goto(analysisPath);
  for (const name of ["X", "LinkedIn", "Facebook", "Bluesky"]) {
    await expect(page.getByRole("link", { name: `Partager sur ${name}`, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Partager par e-mail" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});
