import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] ?? "apps/web/dist";
const status = JSON.parse(readFileSync(join(root, "api/status.json"), "utf8"));
assert.equal(status.securityPosture.accessModel, "open-source");
assert.equal(status.securityPosture.accessRequirement, "none");
assert.equal(status.securityPosture.softwareLicense, "AGPL-3.0-only");
assert.equal(status.securityPosture.publicDeliveryStatusRegistry, false);
assert.ok(!Object.hasOwn(status.securityPosture, "onlinePurchase"));
assert.equal(readFileSync(join(root, "LICENSE.txt"), "utf8"), readFileSync("LICENSE", "utf8"));

const source = new URL(status.securityPosture.sourceCode);
assert.equal(source.protocol, "https:");
assert.equal(source.username, "");
assert.equal(source.password, "");
const sourcePage = readFileSync(join(root, "open-source/index.html"), "utf8");
assert.ok(sourcePage.includes(source.href));
assert.ok(sourcePage.includes("AGPL-3.0-only"));

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    assert.ok(!entry.isSymbolicLink(), `No symlink may enter the public build: ${path}`);
    return entry.isDirectory() ? walk(path) : [path];
  });
}
const forbidden = /\/api\/license|startCheckout|refreshLicense|Licence activée|Créer et exporter nécessite|\bStripe\b|\babonnement\b|offre Solo/i;
for (const path of walk(root).filter((file) => /\.(html|js|json)$/.test(file))) {
  const content = readFileSync(path, "utf8");
  assert.ok(!forbidden.test(content), `Retired payment or access logic in ${path}`);
  if (path.endsWith(".html") && content.includes("Content-Security-Policy")) {
    assert.match(content, /connect-src (?:'|&#39;|&#x27;)none(?:'|&#39;|&#x27;)/, `Network policy missing in ${path}`);
    assert.match(content, /form-action (?:'|&#39;|&#x27;)none(?:'|&#39;|&#x27;)/, `Form policy missing in ${path}`);
  }
}
for (const retired of ["services/license-server/server.mjs", "apps/web/src/lib/license.ts", "apps/web/src/components/app/LicensedSurface.svelte"]) {
  assert.equal(existsSync(retired), false, `Retired runtime remains: ${retired}`);
}
console.log("Open-source build passed: AGPL, matching source, unrestricted local access and no payment runtime.");
