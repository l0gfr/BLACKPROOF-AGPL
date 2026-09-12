import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const contentRoot = "apps/web/src/content/analyses";
const distRoot = "apps/web/dist";

const forbiddenSourceRules = [
  [/<script\b/i, "scripts are forbidden in editorial Markdown"],
  [/<(?:iframe|object|embed|form|input|button|textarea|select)\b/i, "active or form markup is forbidden"],
  [/<(?:foreignObject|animate|animateMotion|animateTransform|set|use)\b/i, "active or externally reusable SVG markup is forbidden"],
  [/\son[a-z]+\s*=/i, "event-handler attributes are forbidden"],
  [/\sstyle\s*=/i, "inline style attributes are forbidden by the CSP"],
  [/(?:href|src)\s*=\s*["']?\s*(?:javascript|data|vbscript):/i, "active URL schemes are forbidden"],
  [/!\[[^\]]*\]\(\s*https?:\/\//i, "remote Markdown images are forbidden"],
  [/<(?:img|source|video|audio|script|link)\b[^>]+(?:src|href)\s*=\s*["']https?:\/\//i, "remote runtime assets are forbidden"],
];

function analysisSources() {
  return readdirSync(contentRoot)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => {
      const source = readFileSync(join(contentRoot, file), "utf8");
      return {
        file,
        slug: basename(file, ".md"),
        source,
        published: /\ndraft:\s*false\s*(?:\n|$)/.test(source),
      };
    });
}

function count(source, pattern) {
  return source.match(pattern)?.length ?? 0;
}

function fail(errors, file, message) {
  errors.push(`${file}: ${message}`);
}

export function validateEditorialSources() {
  const entries = analysisSources();
  const errors = entries.flatMap((entry) => validateEditorialSourceEntry(entry));
  return { entries, errors };
}

export function validateEditorialSourceEntry(entry) {
  const errors = [];

  for (const [pattern, message] of forbiddenSourceRules) {
    if (pattern.test(entry.source)) fail(errors, entry.file, message);
  }

  if (!entry.published) return errors;

  const figures = count(entry.source, /<figure\s+class="analysis-figure">/g);
  if (figures < 1 || figures > 3) {
    fail(errors, entry.file, `published analyses require 1 to 3 figures; found ${figures}`);
  }

  const desktopFigures = count(entry.source, /<svg\s+class="analysis-figure-desktop"[^>]*>/g);
  const mobileFigures = count(entry.source, /<svg\s+class="analysis-figure-mobile"[^>]*>/g);
  if (desktopFigures !== figures || mobileFigures !== figures) {
    fail(errors, entry.file, "every figure requires one desktop SVG and one mobile SVG");
  }

  const svgTags = entry.source.match(/<svg\b[^>]*>[\s\S]*?<\/svg>/g) ?? [];
  for (const svg of svgTags) {
    if (
      !/\brole="img"/.test(svg)
      || !/\baria-labelledby="[^"]+ [^"]+"/.test(svg)
      || !/<title\s+id="[^"]+">[^<]+<\/title>/.test(svg)
      || !/<desc\s+id="[^"]+">[^<]+<\/desc>/.test(svg)
    ) {
      fail(errors, entry.file, "every SVG requires role=img, aria-labelledby, title and description");
    }
  }

  return errors;
}

export function validateEditorialDist(entries) {
  const errors = [];
  const indexPath = join(distRoot, "analyses/index.html");
  const feedPath = join(distRoot, "analyses/feed.xml");
  const sitemapPath = join(distRoot, "sitemap.xml");

  for (const path of [indexPath, feedPath, sitemapPath]) {
    if (!existsSync(path)) fail(errors, path, "required editorial output is missing");
  }
  if (errors.length > 0) return errors;

  const index = readFileSync(indexPath, "utf8");
  const feed = readFileSync(feedPath, "utf8");
  const sitemap = readFileSync(sitemapPath, "utf8");

  for (const entry of entries) {
    const route = `/analyses/${entry.slug}`;
    const articlePath = join(distRoot, `analyses/${entry.slug}/index.html`);

    if (!entry.published) {
      if (existsSync(articlePath) || index.includes(route) || feed.includes(route) || sitemap.includes(route)) {
        fail(errors, entry.file, "draft leaked into a public editorial output");
      }
      continue;
    }

    if (!existsSync(articlePath)) {
      fail(errors, entry.file, "published article output is missing");
      continue;
    }
    if (!index.includes(route) || !feed.includes(route) || !sitemap.includes(route)) {
      fail(errors, entry.file, "published article is missing from index, RSS or sitemap");
    }

    const html = readFileSync(articlePath, "utf8");
    const article = html.match(/<article\b[\s\S]*?<\/article>/)?.[0] ?? "";
    if (!/itemtype="https:\/\/schema\.org\/Article"/.test(article)) {
      fail(errors, entry.file, "Schema.org Article metadata is missing");
    }
    if (/\sstyle\s*=/.test(article)) {
      fail(errors, entry.file, "the built article contains CSP-blocked inline styles");
    }
    const sourceFigures = count(entry.source, /<figure\s+class="analysis-figure">/g);
    const builtFigures = count(article, /<figure\s+class="analysis-figure">/g);
    if (sourceFigures !== builtFigures) {
      fail(errors, entry.file, `built figure count differs from source (${builtFigures} versus ${sourceFigures})`);
    }
    if (!/class="source-register"/.test(html)) {
      fail(errors, entry.file, "the source register is missing");
    }
  }

  return errors;
}

function parseArguments(argv) {
  if (argv.length === 0 || (argv.length === 1 && argv[0] === "--source")) return "source";
  if (argv.length === 1 && argv[0] === "--dist") return "dist";
  throw new Error("Usage: check-editorial-content.mjs [--source|--dist]");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const mode = parseArguments(process.argv.slice(2));
    const result = validateEditorialSources();
    const errors = mode === "dist"
      ? [...result.errors, ...validateEditorialDist(result.entries)]
      : result.errors;
    if (errors.length > 0) {
      for (const error of errors) console.error(`EDITORIAL GATE FAIL: ${error}`);
      process.exitCode = 1;
    } else {
      const published = result.entries.filter((entry) => entry.published).length;
      console.log(`Editorial ${mode} gate passed for ${published} published analyses.`);
    }
  } catch (error) {
    console.error(`EDITORIAL GATE FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
