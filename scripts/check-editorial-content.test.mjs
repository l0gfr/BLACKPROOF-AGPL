import assert from "node:assert/strict";
import test from "node:test";
import { validateEditorialSourceEntry } from "./check-editorial-content.mjs";

function entry(source, published = true) {
  return { file: "fixture.md", slug: "fixture", source, published };
}

const accessibleFigure = `
<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" role="img" aria-labelledby="desktop-title desktop-desc">
    <title id="desktop-title">Desktop title</title>
    <desc id="desktop-desc">Desktop description</desc>
  </svg>
  <svg class="analysis-figure-mobile" role="img" aria-labelledby="mobile-title mobile-desc">
    <title id="mobile-title">Mobile title</title>
    <desc id="mobile-desc">Mobile description</desc>
  </svg>
</figure>`;

test("accepts a static published analysis with paired accessible figures", () => {
  assert.deepEqual(validateEditorialSourceEntry(entry(accessibleFigure)), []);
});

test("rejects active markup, inline styles and remote runtime assets", () => {
  for (const payload of [
    `${accessibleFigure}<script>alert(1)</script>`,
    accessibleFigure.replace("<figure", '<figure style="padding: 1rem"'),
    `${accessibleFigure}<img src="https://tracker.invalid/pixel">`,
    `${accessibleFigure}<svg><foreignObject>active</foreignObject></svg>`,
    `${accessibleFigure}<a href="javascript:alert(1)">active</a>`,
  ]) {
    assert.ok(validateEditorialSourceEntry(entry(payload)).length > 0, payload);
  }
});

test("rejects missing figures and incomplete desktop or mobile alternatives", () => {
  assert.match(validateEditorialSourceEntry(entry("plain text")).join("\n"), /1 to 3 figures/);
  assert.match(
    validateEditorialSourceEntry(entry(accessibleFigure.replace(/<svg class="analysis-figure-mobile"[\s\S]*?<\/svg>/, ""))).join("\n"),
    /desktop SVG and one mobile SVG/,
  );
});

test("drafts still receive active-content checks without requiring publication figures", () => {
  assert.deepEqual(validateEditorialSourceEntry(entry("draft text", false)), []);
  assert.match(
    validateEditorialSourceEntry(entry('<script src="/bad.js"></script>', false)).join("\n"),
    /scripts are forbidden/,
  );
});
