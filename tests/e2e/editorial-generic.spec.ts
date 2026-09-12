import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { expect, test } from "@playwright/test";

const contentRoot = "apps/web/src/content/analyses";
const entries = readdirSync(contentRoot)
  .filter((file) => file.endsWith(".md"))
  .sort()
  .map((file) => {
    const source = readFileSync(join(contentRoot, file), "utf8");
    return {
      slug: basename(file, ".md"),
      published: /\ndraft:\s*false\s*(?:\n|$)/.test(source),
    };
  });

test("every published analysis is indexed while drafts remain private", async ({ request }) => {
  const index = await (await request.get("/analyses")).text();
  const feed = await (await request.get("/analyses/feed.xml")).text();
  const sitemap = await (await request.get("/sitemap.xml")).text();

  for (const entry of entries) {
    const route = `/analyses/${entry.slug}`;
    const response = await request.get(route);
    if (entry.published) {
      expect(response.status(), route).toBe(200);
      expect(index, route).toContain(route);
      expect(feed, route).toContain(route);
      expect(sitemap, route).toContain(route);
    } else {
      expect(response.status(), route).toBe(404);
      expect(index, route).not.toContain(route);
      expect(feed, route).not.toContain(route);
      expect(sitemap, route).not.toContain(route);
    }
  }
});

for (const entry of entries.filter((candidate) => candidate.published)) {
  test(`${entry.slug} remains static, sourced and responsive`, async ({ page }) => {
    const thirdPartyRequests = new Set<string>();
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (!["127.0.0.1", "localhost"].includes(url.hostname)) thirdPartyRequests.add(url.origin);
    });

    for (const viewport of [
      { width: 1280, height: 820 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      const response = await page.goto(`/analyses/${entry.slug}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('article[itemtype="https://schema.org/Article"]')).toHaveCount(1);
      const figureCount = await page.locator("figure.analysis-figure").count();
      expect(figureCount).toBeGreaterThanOrEqual(1);
      expect(figureCount).toBeLessThanOrEqual(3);
      expect(await page.locator(".source-register li").count()).toBeGreaterThanOrEqual(2);
      const horizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(horizontalOverflow).toBe(false);
    }

    expect([...thirdPartyRequests]).toEqual([]);
  });
}
