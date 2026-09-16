import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { renderAnalysisOgImage } from "./analysis-og";

describe("static analysis social images", () => {
  it.each([
    "Agents IA : à qui donne-t-on les clés de l’entreprise ?",
    "W".repeat(110),
    'Évaluer <b>un accès</b> & ses limites : "preuve", sécurité, confidentialité',
  ])("renders a bounded, opaque PNG with long or escaped text: %s", async (title) => {
    const png = await renderAnalysisOgImage({
      title, category: "Chaîne d’approvisionnement", publishedAt: new Date("2026-09-16T00:00:00Z"),
    });
    const metadata = await sharp(png).metadata();
    expect(metadata).toMatchObject({ format: "png", width: 1200, height: 630 });
    expect((await sharp(png).stats()).isOpaque).toBe(true);
    expect(png.length).toBeLessThan(500_000);
  }, 15_000);

  it("rejects unbounded titles and invalid dates", async () => {
    const valid = { title: "Une analyse de sécurité", category: "Méthode", publishedAt: new Date("2026-09-16") };
    for (const invalid of [{ title: "a".repeat(111) }, { title: " " }, { publishedAt: new Date("invalid") }]) {
      await expect(renderAnalysisOgImage({ ...valid, ...invalid })).rejects.toThrow("Invalid analysis image metadata");
    }
  });
});
