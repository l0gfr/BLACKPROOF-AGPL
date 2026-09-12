import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function walkHtmlFiles(dir) {
  const files = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isSymbolicLink()) {
      throw new Error(`Symbolic links are forbidden in the CSP source artifact: ${path}`);
    } else if (entry.isDirectory()) {
      files.push(...walkHtmlFiles(path));
    } else if (entry.isFile() && path.endsWith(".html")) {
      files.push(path);
    } else if (!entry.isFile()) {
      throw new Error(`Non-regular CSP source artifact is forbidden: ${path}`);
    }
  }

  return files;
}

function extractCsp(html, file) {
  const match = html.match(/<meta\s+http-equiv=["']content-security-policy["']\s+content="([^"]+)"/i)
    ?? html.match(/<meta\s+http-equiv=["']content-security-policy["']\s+content='([^']+)'/i);

  if (!match) {
    const refresh = html.match(/<meta\s+http-equiv=["']refresh["']\s+content=["']0;url=(\/[a-z0-9][a-z0-9/-]*)["']/i);
    if (refresh) {
      const target = refresh[1];
      const canonical = `href="https://blackproof.fr${target}"`;
      const localLink = `href="${target}"`;
      if (
        !html.includes('<meta name="robots" content="noindex">')
        || !html.includes(canonical)
        || !html.includes(localLink)
        || /<script\b|<style\b|\son[a-z]+\s*=|javascript:/i.test(html)
      ) {
        throw new Error(`Unsafe static redirect without Astro CSP meta in ${file}`);
      }
      return null;
    }
    throw new Error(`Missing Astro CSP meta in ${file}`);
  }

  return match[1].trim();
}

export function extractBuildCsp(distDir = "apps/web/dist") {
  const root = lstatSync(distDir);
  if (root.isSymbolicLink() || !root.isDirectory()) {
    throw new Error(`CSP source artifact root must be a real non-symlink directory: ${distDir}`);
  }
  const htmlFiles = walkHtmlFiles(distDir);

  if (htmlFiles.length === 0) {
    throw new Error(`No HTML files found in ${distDir}`);
  }

  const cspValues = htmlFiles
    .map((file) => extractCsp(readFileSync(file, "utf8"), file))
    .filter((value) => value !== null);

  if (cspValues.length === 0) {
    throw new Error(`No Astro CSP-bearing HTML files found in ${distDir}`);
  }
  const uniqueCspValues = [...new Set(cspValues)];

  if (uniqueCspValues.length !== 1) {
    throw new Error(`Expected one shared CSP value, found ${uniqueCspValues.length}`);
  }

  const csp = uniqueCspValues[0];

  if (csp.includes("'unsafe-inline'")) {
    throw new Error("Build CSP still contains unsafe-inline");
  }

  if (!csp.includes("script-src ") || !csp.includes("'sha256-")) {
    throw new Error("Build CSP is missing script-src hashes");
  }

  if (!csp.includes("style-src ") || !csp.includes("'sha256-")) {
    throw new Error("Build CSP is missing style-src hashes");
  }

  const apacheDirectives = [
    ...csp.replace(/;$/, "").split(";").map((directive) => directive.trim()).filter(Boolean),
    "script-src-attr 'none'",
    "upgrade-insecure-requests",
  ];

  return [...new Set(apacheDirectives)].join("; ");
}
