import { resolve } from "node:path";
import sharp from "sharp";

// Astro builds and the web package's tests both run from apps/web.
const fontfile = resolve("assets/fonts/IBMPlexSans.ttf");

function escapeText(text: string): string {
  return text.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  })[character]!);
}

async function textLayer(text: string, size: number, color: string, width: number) {
  return sharp({ text: {
    text: `<span foreground="${color}">${escapeText(text)}</span>`,
    font: `IBM Plex Sans Semi-Bold ${size}`,
    fontfile,
    width,
    wrap: "word-char",
    rgba: true,
    dpi: 72,
  } }).png().toBuffer({ resolveWithObject: true });
}

export async function renderAnalysisOgImage(data: {
  title: string;
  category: string;
  publishedAt: Date;
}): Promise<Buffer> {
  // Public content is schema-validated upstream; keep this renderer bounded too.
  if (!data.title.trim() || data.title.length > 110 || !data.category.trim()
    || data.category.length > 60 || !Number.isFinite(data.publishedAt.getTime())) {
    throw new Error("Invalid analysis image metadata");
  }

  const renderedTitle = await textLayer(data.title, 68, "#f3f6f2", 1056);
  // Ink bounds can exceed Pango's wrap width on some platforms. Fit the entire
  // raster instead of clipping glyphs or relying on platform-specific metrics.
  const title = await sharp(renderedTitle.data)
    .resize({ width: 1056, height: 270, fit: "inside", withoutEnlargement: true })
    .png().toBuffer({ resolveWithObject: true });

  const date = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris",
  }).format(data.publishedAt);
  const [brand, section, category, published, domain] = await Promise.all([
    textLayer("BLACKPROOF", 29, "#f3f6f2", 320),
    textLayer("ANALYSES", 19, "#8ee5d1", 300),
    textLayer(data.category.toLocaleUpperCase("fr-FR"), 22, "#8ee5d1", 1056),
    textLayer(date, 23, "#a8b2ab", 700),
    textLayer("blackproof.fr", 23, "#f3f6f2", 260),
  ]);

  // Only controlled geometry enters SVG; all metadata is escaped Pango text.
  const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <defs>
      <linearGradient id="bg" x2="1" y2="1"><stop stop-color="#172b24"/><stop offset="1" stop-color="#060a09"/></linearGradient>
      <pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M56 0H0V56" fill="none" stroke="#8ee5d1" stroke-opacity=".035"/></pattern>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <rect width="1200" height="630" fill="url(#grid)"/>
    <rect width="7" height="630" fill="#8ee5d1"/>
    <rect y="490" width="7" height="68" fill="#e0b66f"/>
    <path d="M72 66h32l12 12v40H72z M104 66v12h12 M83 99h21 M83 107h13" fill="none" stroke="#8ee5d1" stroke-width="2"/>
    <circle cx="114" cy="68" r="4" fill="#e0b66f"/>
    <path d="M72 516h1056" stroke="#8ee5d1" stroke-opacity=".3"/>
    <path d="M1056 516h72" stroke="#e0b66f" stroke-width="2"/>
  </svg>`);

  return sharp(background).composite([
    { input: brand.data, left: 138, top: 65 },
    { input: section.data, left: 140, top: 103 },
    { input: category.data, left: 72, top: 163 },
    { input: title.data, left: 72, top: 214 + Math.floor((270 - title.info.height) / 2) },
    { input: published.data, left: 72, top: 554 },
    { input: domain.data, left: 1128 - domain.info.width, top: 554 },
  ]).png({ compressionLevel: 9 }).toBuffer();
}
