import type { APIRoute } from "astro";

export const GET: APIRoute = () => (
  new Response(`User-agent: *
Allow: /
Disallow: /stats/

Sitemap: https://blackproof.fr/sitemap.xml
`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  })
);
