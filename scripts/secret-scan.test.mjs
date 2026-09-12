import assert from "node:assert/strict";
import test from "node:test";

import { isBinaryPrefix, scanTextForSecrets, scanVersionableFiles } from "./check-secrets.mjs";

test("versionable-file secret scanner recognizes binary prefixes before text size policy", () => {
  assert.equal(isBinaryPrefix(Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70])), true);
  assert.equal(isBinaryPrefix(Buffer.from("plain UTF-8 text", "utf8")), false);
});

test("versionable-file secret scanner detects credentials without returning their values", () => {
  const stripeKey = ["sk", "live", "A".repeat(32)].join("_");
  const githubKey = `ghp_${"B".repeat(36)}`;
  assert.deepEqual(scanTextForSecrets(`a=${stripeKey}\nb=${githubKey}`), [
    "Stripe secret key",
    "GitHub credential",
  ]);
});

test("versionable-file secret scanner permits explicit fixtures and placeholders", () => {
  assert.deepEqual(scanTextForSecrets([
    "STRIPE_SECRET_KEY=sk_live_fixture",
    "STRIPE_WEBHOOK_SECRET=replace_with_webhook_secret",
    "token=github_pat_example_placeholder",
  ].join("\n")), []);
});

test("current versionable repository files contain no high-confidence secret", () => {
  assert.deepEqual(scanVersionableFiles(), []);
});
