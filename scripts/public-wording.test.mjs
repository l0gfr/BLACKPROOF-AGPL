import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import test from "node:test";

const root = process.cwd();
const publicRoots = [
  "apps/web/src/pages",
  "apps/web/src/components",
  "apps/web/src/content",
];
const publicSourceExtensions = new Set([".astro", ".svelte", ".md", ".ts"]);

function listFiles(path) {
  const absolute = join(root, path);
  if (statSync(absolute).isFile()) return [path];
  return readdirSync(absolute).flatMap((name) => listFiles(join(path, name)));
}

const publicFiles = publicRoots
  .flatMap(listFiles)
  .filter((path) => publicSourceExtensions.has(extname(path)));

const forbiddenInternalMarkers = [
  /Stripe[- ]test/i,
  /Stripe live/i,
  /\bwebhooks?\b/i,
  /\bStripe worker\b/i,
  /\bworker Stripe\b/i,
  /Ledger SQLite/i,
  /migration PBKDF2/i,
  /gate commercial/i,
  /candidateCommit/i,
  /qualificationScriptSha256/i,
  /serviceSha256/i,
  /rollback material/i,
  /\/opt\/blackproof/i,
  /deploy\/server/i,
  /\bpreuve de staging\b/i,
  /\blot P0\b/i,
  /Parcours de paiement test/i,
  /moyens? de paiement de test/i,
  /environnement de test/i,
];

const forbiddenProductClaims = [
  /Identité P-256 générée/i,
  /\bPrêt à exporter\b/i,
  /\bExport à bloquer\b/i,
  /Le dossier peut partir/i,
  /Cohérence et empreinte vérifiées/i,
  /Comparer, authentifier et archiver/i,
  /Preuve déclarée disponible avec une référence valide/i,
];

test("public wording excludes internal development narratives", () => {
  for (const path of publicFiles) {
    const source = readFileSync(join(root, path), "utf8");
    for (const marker of forbiddenInternalMarkers) {
      assert.doesNotMatch(source, marker, `${relative(root, path)} exposes ${marker}`);
    }
  }
});

test("public surfaces contain no payment or access-licensing flow", () => {
  for (const path of publicFiles) {
    const source = readFileSync(join(root, path), "utf8");
    assert.doesNotMatch(source, /\bStripe\b|\babonnement\b|souscrire|offre Solo|licence-required/i, `${relative(root, path)} exposes a retired commercial flow`);
  }
});

test("public wording does not overstate automated judgment", () => {
  for (const path of publicFiles) {
    const source = readFileSync(join(root, path), "utf8");
    for (const marker of forbiddenProductClaims) {
      assert.doesNotMatch(source, marker, `${relative(root, path)} contains overstated wording ${marker}`);
    }
  }
});

test("public headings avoid generic ce que and ce qui constructions", () => {
  for (const path of publicFiles) {
    const source = readFileSync(join(root, path), "utf8");

    if (extname(path) === ".md") {
      for (const line of source.split(/\r?\n/)) {
        if (!/^#{1,6}\s+/.test(line)) continue;
        assert.doesNotMatch(line, /\bce (?:que|qui)\b/i, `${relative(root, path)} contains a generic Markdown heading: ${line}`);
      }
      continue;
    }

    for (const match of source.matchAll(/<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
      const heading = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      assert.doesNotMatch(heading, /\bce (?:que|qui)\b/i, `${relative(root, path)} contains a generic HTML heading: ${heading}`);
    }
  }
});

test("public status uses business-facing fields", () => {
  const statusSource = readFileSync(join(root, "apps/web/src/pages/api/status.json.ts"), "utf8");
  for (const internalField of [
    "isolatedLicenseService",
    "licenseServicePrepared",
    "businessContentSentToLicenseService",
    "licenseEnforcement:",
    "selfServiceCheckout:",
    "commercialMode,",
  ]) {
    assert.ok(!statusSource.includes(internalField), `status contract exposes ${internalField}`);
  }
  assert.match(statusSource, /accessRequirement:/);
  assert.match(statusSource, /accessModel: "open-source"/);
  assert.match(statusSource, /publicDeliveryStatusRegistry: false/);
  assert.doesNotMatch(statusSource, /onlinePurchase:|localBusinessContentSharedForPayment:/);
});

test("free software license and public legal boundaries are consistent", () => {
  const legal = readFileSync(join(root, "apps/web/src/components/LegalNotice.astro"), "utf8");
  assert.doesNotMatch(legal, /deploy\/|configuration livrée|reste à prouver|avant vente/i);
  assert.doesNotMatch(legal, /\b\d{1,4}\s+(?:rue|avenue|boulevard|impasse|allée|chemin)\b/i);
  const license = readFileSync(join(root, "LICENSE"), "utf8");
  assert.match(license, /GNU AFFERO GENERAL PUBLIC LICENSE/);
  assert.match(license, /Version 3, 19 November 2007/);
  for (const path of ["package.json", "apps/web/package.json", "packages/core/package.json", "packages/verifier/package.json"]) {
    assert.equal(JSON.parse(readFileSync(join(root, path), "utf8")).license, "AGPL-3.0-only");
  }
  const verifier = readFileSync(join(root, "packages/verifier/README.md"), "utf8");
  assert.match(verifier, /AGPL-3.0-only/);
  assert.doesNotMatch(verifier, /propriétaire|proprietary|--status-url/);
});
