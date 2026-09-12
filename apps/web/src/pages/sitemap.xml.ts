import type { APIRoute } from "astro";
import {
  getAnalysisLastModified,
  getAnalysisPath,
  getPublishedAnalyses,
} from "../lib/analyses";

const site = "https://blackproof.fr";

const routes = [
  ["/", "1.0"],
  ["/start", "0.95"],
  ["/analyses", "0.92"],
  ["/resources", "0.9"],
  ["/use-cases", "0.9"],
  ["/grc", "0.9"],
  ["/status", "0.88"],
  ["/proofpack-example", "0.88"],
  ["/questionnaire-import", "0.86"],
  ["/demo", "0.84"],
  ["/security", "0.84"],
  ["/api", "0.82"],
  ["/mcp", "0.82"],
  ["/about", "0.8"],
  ["/open-source", "0.78"],
  ["/method", "0.74"],
  ["/proofpack", "0.74"],
  ["/proofdebt", "0.72"],
  ["/evidence-library", "0.72"],
  ["/frameworks", "0.7"],
  ["/verify", "0.7"],
  ["/questionnaire-crusher", "0.68"],
  ["/app", "0.64"],
  ["/app/cases", "0.58"],
  ["/rgpd", "0.5"],
  ["/legal", "0.5"]
];

export const GET: APIRoute = async () => {
  const updatedAt = new Date().toISOString().slice(0, 10);
  const analyses = await getPublishedAnalyses();
  const staticUrls = routes
    .map(([path, priority]) => (
      `  <url>
    <loc>${site}${path}</loc>
    <lastmod>${updatedAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`
    ))
    .join("\n");
  const analysisUrls = analyses
    .map((entry) => (
      `  <url>
    <loc>${site}${getAnalysisPath(entry)}</loc>
    <lastmod>${getAnalysisLastModified(entry).toISOString().slice(0, 10)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${entry.data.featured ? "0.82" : "0.74"}</priority>
  </url>`
    ))
    .join("\n");
  const urls = [staticUrls, analysisUrls].filter(Boolean).join("\n");

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
};
