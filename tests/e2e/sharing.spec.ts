import { expect, test } from "@playwright/test";

const analysisPath = "/analyses/fuite-de-donnees-etablir-avant-de-conclure";
const externalShareHosts = new Set([
  "x.com",
  "bsky.app",
  "www.linkedin.com",
  "www.facebook.com",
]);

test("public pages expose passive share links without contacting social networks", async ({ page }) => {
  const contactedExternalHosts = new Set<string>();

  page.on("request", (request) => {
    const host = new URL(request.url()).hostname;
    if (externalShareHosts.has(host)) contactedExternalHosts.add(host);
  });

  for (const [path, canonicalUrl, heading] of [
    ["/", "https://blackproof.fr/", "Partager BLACKPROOF"],
    [analysisPath, `https://blackproof.fr${analysisPath}`, "Partager cette page"],
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

test("Open Graph preview is local, large and complete", async ({ page, request }) => {
  await page.goto(analysisPath);

  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://blackproof.fr/og/blackproof.png",
  );
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", /BLACKPROOF/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    "content",
    "https://blackproof.fr/og/blackproof.png",
  );

  const imageResponse = await request.get("/og/blackproof.png");
  expect(imageResponse.ok()).toBe(true);
  expect(imageResponse.headers()["content-type"]).toBe("image/png");
});
