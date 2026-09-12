import type { APIRoute } from "astro";
import {
  getAnalysisLastModified,
  getAnalysisPath,
  getPublishedAnalyses,
} from "../../lib/analyses";

const site = "https://blackproof.fr";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export const GET: APIRoute = async () => {
  const analyses = await getPublishedAnalyses();
  const latestUpdate = analyses.length > 0
    ? new Date(Math.max(...analyses.map((entry) => getAnalysisLastModified(entry).getTime()))).toUTCString()
    : new Date("2026-01-01T00:00:00Z").toUTCString();
  const items = analyses.map((entry) => {
    const url = `${site}${getAnalysisPath(entry)}`;

    return `    <item>
      <title>${escapeXml(entry.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${entry.data.publishedAt.toUTCString()}</pubDate>
      <category>${escapeXml(entry.data.category)}</category>
      <description>${escapeXml(entry.data.description)}</description>
    </item>`;
  }).join("\n");

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Analyses cyber BLACKPROOF</title>
    <link>${site}/analyses</link>
    <atom:link href="${site}/analyses/feed.xml" rel="self" type="application/rss+xml" />
    <description>Analyses cyber sourcées sur les fuites de données, intrusions, rançongiciels et vulnérabilités.</description>
    <language>fr-FR</language>
    <lastBuildDate>${latestUpdate}</lastBuildDate>
${items}
  </channel>
</rss>
`, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
