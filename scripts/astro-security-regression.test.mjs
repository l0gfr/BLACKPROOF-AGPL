import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { extractBuildCsp } from "./shared/csp.mjs";

const webRequire = createRequire(new URL("../apps/web/package.json", import.meta.url));
const astroPackagePath = webRequire.resolve("astro/package.json");
const astroPackage = JSON.parse(readFileSync(astroPackagePath, "utf8"));
const transitionModuleUrl = pathToFileURL(join(dirname(astroPackagePath), "dist/runtime/server/transition.js"));
const { renderTransition } = await import(transitionModuleUrl.href);

function compareVersions(left, right) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  }
  return 0;
}

test("Astro stays on the patched View Transition release line", () => {
  assert.ok(compareVersions(astroPackage.version, "7.1.0") >= 0);
});

test("Astro transition styles keep dynamic values inside the style context", () => {
  const contextBoundaryMarker = "</style><template data-security-regression></template><style>";
  const animation = {
    forwards: {
      old: {
        name: "blackproof-security-regression",
        duration: contextBoundaryMarker,
      },
    },
  };
  const result = { _metadata: { extraHead: [] } };

  renderTransition(result, "security-regression", animation);

  const renderedHead = String(result._metadata.extraHead[0]);
  assert.equal((renderedHead.match(/<\/style>/g) ?? []).length, 1);
  assert.ok(!renderedHead.includes(contextBoundaryMarker));
  assert.match(renderedHead, /\\3C style>/);
  assert.match(renderedHead, /animation-duration:/);
});

test("CSP extraction accepts only inert local Astro redirect documents", () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "blackproof-csp-redirect-"));
  const redirectRoot = join(fixtureRoot, "pilot");
  mkdirSync(redirectRoot);
  writeFileSync(
    join(fixtureRoot, "index.html"),
    `<meta http-equiv="content-security-policy" content="default-src 'self'; script-src 'self' 'sha256-script'; style-src 'self' 'sha256-style'">`,
  );
  writeFileSync(
    join(redirectRoot, "index.html"),
    '<!doctype html><title>Redirecting to: /pricing</title><meta http-equiv="refresh" content="0;url=/pricing"><meta name="robots" content="noindex"><link rel="canonical" href="https://blackproof.fr/pricing"><body><a href="/pricing">Redirecting</a></body>',
  );

  try {
    const csp = extractBuildCsp(fixtureRoot);
    assert.match(csp, /script-src 'self' 'sha256-script'/);
    assert.match(csp, /style-src 'self' 'sha256-style'/);

    writeFileSync(
      join(redirectRoot, "index.html"),
      '<meta http-equiv="refresh" content="0;url=/pricing"><meta name="robots" content="noindex"><link rel="canonical" href="https://blackproof.fr/pricing"><a href="/pricing" onclick="steal()">Redirecting</a>',
    );
    assert.throws(() => extractBuildCsp(fixtureRoot), /Unsafe static redirect/);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
