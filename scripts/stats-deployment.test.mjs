import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";

const apache = readFileSync("deploy/apache/blackproof.fr.conf.example", "utf8");
const generator = readFileSync("deploy/server/generate-stats.sh", "utf8");
const installer = readFileSync("deploy/server/install-stats.sh", "utf8");
const service = readFileSync("deploy/systemd/blackproof-stats.service.example", "utf8");
const timer = readFileSync("deploy/systemd/blackproof-stats.timer.example", "utf8");
const logrotate = readFileSync("deploy/logrotate/blackproof", "utf8");
const robots = readFileSync("apps/web/src/pages/robots.txt.ts", "utf8");
const manifestSource = readFileSync("scripts/create-deploy-manifest.mjs", "utf8");
const bundleSource = readFileSync("scripts/create-production-bundle.mjs", "utf8");
const productionWorkflow = readFileSync(".github/workflows/deploy-production.yml", "utf8");
const ciWorkflow = readFileSync(".github/workflows/ci.yml", "utf8");
const smoke = readFileSync("scripts/smoke-apache-prod.sh", "utf8");
const releaseComponentSnapshot = readFileSync("deploy/server/snapshot-verified-release-components.mjs", "utf8");
const playwrightConfig = readFileSync("playwright.config.ts", "utf8");

test("production tests the exact credential-free final artifact", () => {
  assert.match(productionWorkflow, /PUBLIC_BLACKPROOF_RELEASE_COMMIT: \$\{\{ github\.sha \}\}/);
  assert.match(productionWorkflow, /pnpm open-source:check/);
  assert.match(productionWorkflow, /pnpm exec playwright test/);
  assert.match(productionWorkflow, /attest-public-production-artifact:/);
  assert.doesNotMatch(productionWorkflow, /services\/license-server|BLACKPROOF_LICENSE|STRIPE_|throwaway/);
  assert.doesNotMatch(playwrightConfig, /commercial-|globalSetup|storageState/);
});

test("GitHub Actions use reviewed immutable Node 24 releases", () => {
  const workflows = `${ciWorkflow}\n${productionWorkflow}`;
  for (const action of [
    "actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0",
    "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020",
    "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a",
    "actions/download-artifact@37930b1c2abaa49bbe596cd826c3c89aef350131",
    "pnpm/action-setup@0977fd99725f1db4007ccb2928dbb4e90d06cc86",
    "actions/attest-build-provenance@0f67c3f4856b2e3261c31976d6725780e5e4c373",
  ]) {
    assert.ok(workflows.includes(action), `reviewed action pin is missing: ${action}`);
  }
  for (const reference of workflows.matchAll(/uses:\s+[^\s@]+@([^\s]+)/g)) {
    assert.match(reference[1], /^[a-f0-9]{40}$/, `action ref must be an immutable commit SHA: ${reference[0]}`);
  }
});

test("the private statistics Alias is authenticated and bypasses only the SPA fallback", () => {
  const directory = apache.match(/<Directory \/var\/www\/html\/blackproof-stats>([\s\S]*?)<\/Directory>/)?.[1];
  assert.ok(directory, "statistics Directory block is missing");
  assert.match(directory, /Options -Indexes -ExecCGI -FollowSymLinks/);
  assert.match(directory, /AuthType Basic/);
  assert.match(directory, /AuthBasicProvider file/);
  assert.match(directory, /AuthUserFile \/etc\/apache2\/blackproof-stats\.htpasswd/);
  assert.match(directory, /Require valid-user/);

  const hiddenPathBlock = apache.indexOf("RewriteCond %{REQUEST_URI} (^|/)\\.");
  const statsBypass = apache.indexOf("RewriteCond %{REQUEST_URI} ^/stats/");
  const fallback = apache.lastIndexOf("RewriteRule ^ /index.html [END]");
  assert.ok(hiddenPathBlock >= 0 && hiddenPathBlock < statsBypass);
  assert.ok(statsBypass < fallback);
  assert.match(apache, /RewriteRule \^\/stats\$ \/stats\/ \[R=308,END,NE\]/);
});

test("retired pilot URLs redirect before existing files and the SPA fallback", () => {
  const pilotRedirect = apache.indexOf("RewriteRule ^/(?:pilot|pricing)/?$ /open-source/ [R=308,END,NE]");
  const pilotTermsRedirect = apache.indexOf("RewriteRule ^/legal/(?:pilot-order|conditions-solo)/?$ /open-source/ [R=308,END,NE]");
  const existingFiles = apache.indexOf("RewriteCond %{DOCUMENT_ROOT}%{REQUEST_URI} -f");
  const fallback = apache.lastIndexOf("RewriteRule ^ /index.html [END]");

  assert.ok(pilotRedirect >= 0, "the retired pilot route redirect is missing");
  assert.ok(pilotTermsRedirect > pilotRedirect, "the retired pilot terms redirect is missing");
  assert.ok(pilotTermsRedirect < existingFiles, "retired offer redirects must run before existing files");
  assert.ok(existingFiles < fallback, "existing-file handling must remain before the SPA fallback");
  assert.ok(smoke.includes('"/pilot/|${BASE_URL}/open-source/|/open-source"'));
  assert.ok(smoke.includes('"/legal/pilot-order/|${BASE_URL}/open-source/|/open-source"'));
  assert.ok(smoke.includes('content=\\"0;url=${expected_client_target}\\"'));
  assert.ok(smoke.includes('&& "$body" != *"1 500"*'));
});

test("GoAccess receives a dedicated CSP without weakening the public build CSP", () => {
  const location = apache.match(/<Location "\/stats\/">([\s\S]*?)<\/Location>/)?.[1];
  assert.ok(location, "statistics Location block is missing");
  assert.match(location, /Header onsuccess unset Content-Security-Policy/);
  assert.match(location, /Header always unset Content-Security-Policy/);
  assert.match(location, /script-src 'self' 'unsafe-inline' 'unsafe-eval'/);
  assert.match(location, /style-src 'self' 'unsafe-inline'/);
  assert.match(location, /connect-src 'none'/);
  assert.match(location, /object-src 'none'/);
  assert.match(location, /frame-ancestors 'none'/);
  assert.match(location, /Cache-Control "private, no-store, max-age=0"/);
  assert.match(location, /X-Robots-Tag "noindex, nofollow, noarchive"/);

  assert.match(
    apache,
    /Header always set Content-Security-Policy "__BLACKPROOF_CSP__" "expr=%\{REQUEST_URI\} !~ m#\^\/stats\/#"/,
  );
  assert.equal((apache.match(/__BLACKPROOF_CSP__/g) ?? []).length, 1);
});

test("the report is privacy-bounded to the existing raw-log retention", () => {
  assert.match(generator, /blackproof-access\.log/);
  assert.match(generator, /--anonymize-ip/);
  assert.match(generator, /--anonymize-level=2/);
  assert.match(generator, /--no-query-string/);
  assert.match(generator, /--keep-last=14/);
  assert.match(generator, /--external-assets/);
  assert.match(generator, /mv -f -- "\$temporary_directory\/index\.html" "\$output_directory\/index\.html"/);
  assert.match(logrotate, /^\s*rotate 14\s*$/m);
  assert.match(logrotate, /^\s*maxage 14\s*$/m);
  assert.match(robots, /Disallow: \/stats\//);
});

test("credentials and report generation are installed with bounded privileges", () => {
  assert.match(installer, /Stats password, 16 characters minimum/);
  assert.match(installer, /htpasswd -i -B -C 12/);
  assert.match(installer, /a2enmod auth_basic authn_file headers alias/);
  assert.match(installer, /chown root:www-data "\$htpasswd_file"/);
  assert.match(installer, /chmod 640 "\$htpasswd_file"/);
  assert.match(installer, /install -d -o blackproof-stats -g www-data -m 2750/);

  for (const invariant of [
    "NoNewPrivileges=true",
    "ProtectSystem=strict",
    "ProtectHome=true",
    "ProtectProc=invisible",
    "RestrictNamespaces=true",
    "MemoryDenyWriteExecute=true",
    "CapabilityBoundingSet=",
    "RestrictAddressFamilies=AF_UNIX",
    "ReadOnlyPaths=/var/log/apache2",
    "ReadWritePaths=/var/www/html/blackproof-stats",
  ]) {
    assert.ok(service.includes(invariant), `missing systemd invariant: ${invariant}`);
  }
  assert.match(timer, /OnCalendar=\*:0\/15/);
  assert.match(timer, /Persistent=true/);
});

test("production smoke proves the unauthenticated barrier and both CSP profiles", () => {
  assert.match(smoke, /private statistics must return 401 without credentials/);
  assert.match(smoke, /private statistics must send exactly one CSP header/);
  assert.match(smoke, /private statistics must send exactly one Basic challenge/);
  assert.match(smoke, /script-src 'self' 'unsafe-inline' 'unsafe-eval'/);
  assert.match(smoke, /FAIL CSP must not contain unsafe-inline/);
  assert.match(smoke, /HTTPS responses must send exactly one HSTS header/);
  assert.match(smoke, /max-age=31536000.*includesubdomains/);
  assert.match(smoke, /\[\[ "\$unknown_api_code" != "404" \]\]/);
  assert.match(smoke, /\[\[ "\$legacy_nav_code" != "404" \]\]/);
  assert.match(smoke, /\[\[ "\$operational_code" != "404" \]\]/);
  assert.match(apache, /SSLProtocol -all \+TLSv1\.2 \+TLSv1\.3/);
});

test("privileged static candidate reads are exact-manifest snapshots only", () => {
  assert.match(releaseComponentSnapshot, /artifactSha256 !== internalDigest/);
  assert.match(releaseComponentSnapshot, /manifest\.gitCommit !== expectedCommit/);
  assert.match(releaseComponentSnapshot, /manifest\.dirtyWorktree !== false/);
  assert.match(releaseComponentSnapshot, /Array\.isArray\(manifest\.releaseComponents\)/);
  assert.match(releaseComponentSnapshot, /releaseComponents\.has\(component\.path\)/);
  assert.match(releaseComponentSnapshot, /constants\.O_RDONLY \| constants\.O_NOFOLLOW/);
  assert.match(releaseComponentSnapshot, /readSync\(descriptor, content, offset/);
  assert.match(releaseComponentSnapshot, /readSync\(descriptor, overflowProbe, 0, 1, size\)/);
  assert.match(releaseComponentSnapshot, /after\.dev !== before\.dev \|\| after\.ino !== before\.ino/);
  assert.match(releaseComponentSnapshot, /after\.mtimeNs !== before\.mtimeNs \|\| after\.ctimeNs !== before\.ctimeNs/);
  assert.match(releaseComponentSnapshot, /content\.byteLength !== specification\.manifestComponent\.size/);
  assert.match(releaseComponentSnapshot, /digest !== specification\.manifestComponent\.sha256/);
  assert.match(releaseComponentSnapshot, /readdirSync\(snapshotRoot\)\.length !== 0/);
});

test("Playwright cannot silently reuse another project's preview server", () => {
  assert.match(playwrightConfig, /previewURL\.hostname/);
  assert.match(playwrightConfig, /previewPort/);
  assert.match(playwrightConfig, /command: `CODEX_THREAD_ID= pnpm --filter @blackproof\/web preview/);
  assert.match(playwrightConfig, /reuseExistingServer: process\.env\.PLAYWRIGHT_REUSE_EXISTING_SERVER === "1"/);
  assert.doesNotMatch(playwrightConfig, /reuseExistingServer: !process\.env\.CI/);
});

test("statistics shell scripts pass bash syntax validation", () => {
  for (const script of [
    "deploy/server/generate-stats.sh",
    "deploy/server/install-stats.sh",
    "deploy/server/activate-static-release.sh",
  ]) {
    const result = spawnSync("bash", ["-n", script], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr || `${script} failed bash -n`);
    assert.notEqual(statSync(script).mode & 0o111, 0, `${script} must remain executable`);
  }
});

test("production artifact contains only public and currently required live-upgrade components", () => {
  const liveComponents = [
    "artifacts/blackproof.fr.conf",
    "artifacts/blackproof-sbom.cdx.json",
    "scripts/smoke-apache-prod.sh",
    "scripts/verify-release-directory.mjs",
    "deploy/server/promote-static-release.sh",
    "deploy/server/activate-static-release.sh",
    "deploy/server/snapshot-verified-release-components.mjs",
  ];
  const manifestBlock = manifestSource.match(/const releaseComponentPaths = \[([\s\S]*?)\n\];/)?.[1];
  const bundleBlock = bundleSource.match(/const roots = \[([\s\S]*?)\n\];/)?.[1];
  const uploadBlock = productionWorkflow.match(/\n          path: \|\n([\s\S]*?)\n          if-no-files-found:/)?.[1];
  assert.ok(manifestBlock && bundleBlock && uploadBlock, "production inventories must remain statically reviewable");
  const manifestComponents = [...manifestBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  const bundleRoots = [...bundleBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  const uploadedPaths = uploadBlock.split("\n").map((line) => line.trim()).filter(Boolean);
  assert.deepEqual(manifestComponents, liveComponents);
  assert.deepEqual(bundleRoots, [
    "apps/web/dist",
    "artifacts/blackproof.fr.conf",
    "artifacts/artifact-manifest.json",
    "artifacts/blackproof-sbom.cdx.json",
    ...liveComponents.slice(2),
  ]);
  assert.deepEqual(uploadedPaths, [
    "apps/web/dist/",
    "artifacts/blackproof.fr.conf",
    "artifacts/artifact-manifest.json",
    "artifacts/blackproof-sbom.cdx.json",
    "artifacts/blackproof-production-bundle.zip",
    ...liveComponents.slice(2),
  ]);
});

test("retired backend cannot receive documents and static APIs are read-only", () => {
  assert.ok(apache.includes("RewriteRule ^/api/license(?:/|$) - [R=410,END]"));
  assert.doesNotMatch(apache, /ProxyPass|127\.0\.0\.1:8797/);
  assert.match(apache, /GET\|HEAD\|OPTIONS/);
  const astro = readFileSync("apps/web/astro.config.mjs", "utf8");
  assert.ok(astro.includes("connect-src 'none'"));
  assert.ok(astro.includes("form-action 'none'"));
});
