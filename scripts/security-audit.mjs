import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const MINIMUM_SAFE_ASTRO_VERSION = [7, 1, 0];

function parseStableVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  return match ? match.slice(1).map(Number) : null;
}

function versionIsAtLeast(version, minimum) {
  const parsed = parseStableVersion(version);
  if (!parsed) return false;
  return parsed.some((part, index) => part > minimum[index]
    && parsed.slice(0, index).every((value, previousIndex) => value === minimum[previousIndex]))
    || parsed.every((part, index) => part === minimum[index]);
}

const ROOTS = [
  "apps/web/src",
  "apps/web/public",
  "packages/core/src",
  "packages/verifier/src",
];

const API_PAGES_ROOT = "apps/web/src/pages/api";

const forbiddenPatterns = [
  {
    pattern: /\beval\s*\(/,
    reason: "eval() is forbidden. Imported questionnaires must never become executable code.",
  },
  {
    pattern: /\bnew\s+Function\b/,
    reason: "Function constructor is forbidden. Imported questionnaires must never become executable code.",
  },
  {
    pattern: /\bFunction\s*\(/,
    reason: "Function constructor calls are forbidden. Imported questionnaires must never become executable code.",
  },
  {
    pattern: /\bfetch\s*\(/,
    reason: "Network egress is forbidden by default. Use explicit security review before adding fetch().",
  },
  {
    pattern: /\bXMLHttpRequest\b/,
    reason: "XHR is forbidden by default. BLACKPROOF must remain no-upload/no-egress by default.",
  },
  {
    pattern: /\bWebSocket\b/,
    reason: "WebSocket is forbidden by default.",
  },
  {
    pattern: /\bnavigator\.sendBeacon\b/,
    reason: "sendBeacon is forbidden. It can silently exfiltrate data.",
  },
  {
    pattern: /\blocalStorage\b/,
    reason: "Use IndexedDB via the reviewed local-db layer, not localStorage.",
  },
  {
    pattern: /\bsessionStorage\b/,
    reason: "Use IndexedDB via the reviewed local-db layer, not sessionStorage.",
  },
  {
    pattern: /\binnerHTML\b/,
    reason: "innerHTML is forbidden. Treat imported questionnaires as untrusted.",
  },
  {
    pattern: /\bouterHTML\b/,
    reason: "outerHTML is forbidden. Treat imported questionnaires as untrusted.",
  },
  {
    pattern: /\binsertAdjacentHTML\b/,
    reason: "insertAdjacentHTML is forbidden. Treat imported questionnaires as untrusted.",
  },
  {
    pattern: /\bsetHTML\b/,
    reason: "setHTML is forbidden. Treat imported questionnaires as untrusted.",
  },
  {
    pattern: /\bDOMParser\b/,
    reason: "DOMParser is forbidden by default. Do not parse imported content as markup.",
  },
  {
    pattern: /\bset:html\b/,
    reason: "Astro set:html is forbidden unless explicitly reviewed.",
  },
  {
    pattern: /\btransition:animate\b/,
    reason: "Astro transition animations are forbidden by default. Dynamic animation values require an explicit injection review.",
  },
  {
    pattern: /<script\s+is:inline/i,
    reason: "Inline scripts are forbidden to allow a strict CSP.",
  },
  {
    pattern: /<script[^>]+src=["']https?:\/\//i,
    reason: "Third-party scripts are forbidden.",
  },
  {
    pattern: /<iframe\b/i,
    reason: "Iframes are forbidden by default.",
  },
];

const forbiddenApiPatterns = [
  {
    pattern: /\bexport\s+(?:async\s+)?function\s+(POST|PUT|PATCH|DELETE)\b/,
    reason: "The public API V0 must remain read-only. Do not add write/upload methods without an explicit security design.",
  },
  {
    pattern: /Access-Control-Allow-Origin["']?\s*[:,]\s*["']\*/i,
    reason: "Wildcard CORS is forbidden by default on BLACKPROOF public API routes.",
  },
];

const forbiddenAstroPatterns = [
  {
    pattern: /<script(?![^>]*\bsrc=)[^>]*>/i,
    reason: "Inline Astro scripts are forbidden. Use a static self-hosted script file so CSP can enforce script-src 'self'.",
  },
];

const forbiddenMarkupPatterns = [
  {
    pattern: /\sstyle\s*=/i,
    reason: "Inline style attributes are forbidden. Use CSS classes so CSP can avoid style-src 'unsafe-inline'.",
  },
  {
    pattern: /<div\b(?=[^>]*\baria-label=)(?![^>]*\brole=)[^>]*>/i,
    reason: "W3C forbids aria-label on generic div elements. Add an explicit semantic role or remove the aria-label.",
  },
];

const forbiddenPrivacyPatterns = [
  {
    pattern: /\b(?:google-analytics|googletagmanager|gtag\s*\(|dataLayer|plausible|matomo|umami|hotjar|clarity|segment\.com|mixpanel|amplitude)\b/i,
    reason: "Trackers and analytics SDKs are forbidden. BLACKPROOF must stay privacy-first.",
  },
  {
    pattern: /\b(?:fonts\.googleapis\.com|fonts\.gstatic\.com)\b/i,
    reason: "Google Fonts are forbidden. Use local/system fonts only.",
  },
  {
    pattern: /\b(?:unpkg\.com|cdn\.jsdelivr\.net|jsdelivr\.net|cdnjs\.cloudflare\.com|bootstrapcdn\.com|cdn\.skypack\.dev|esm\.sh)\b/i,
    reason: "Public CDNs are forbidden. Runtime assets must be self-hosted.",
  },
  {
    pattern: /@import\s+(?:url\()?["']?https?:\/\//i,
    reason: "Remote CSS imports are forbidden. Styles must be local.",
  },
  {
    pattern: /url\(["']?https?:\/\/[^"')]+["']?\)/i,
    reason: "Remote CSS assets are forbidden. Fonts and images must be local/self-hosted.",
  },
  {
    pattern: /<(?:script|img|iframe|source|video|audio|link)\b[^>]+(?:src|href)=["']https?:\/\//i,
    reason: "Remote runtime assets are forbidden. No trackers, CDNs, remote fonts or external embeds.",
  },
];


function walk(dir) {
  const files = [];

  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      files.push(...walk(path));
    } else if (/\.(ts|tsx|js|jsx|astro|svelte|mjs|css|html|svg)$/.test(path)) {
      files.push(path);
    }
  }

  return files;
}

function walkAll(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...walkAll(path));
    else files.push(path);
  }
  return files;
}

function normalizePath(path) {
  return path.split("\\").join("/");
}

let failed = false;

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const normalizedFile = normalizePath(file);
    const content = readFileSync(file, "utf8");

    for (const rule of forbiddenPatterns) {
      if (rule.pattern.test(content)) {

        console.error(`SECURITY AUDIT FAIL: ${normalizedFile}`);
        console.error(`  ${rule.reason}`);
        console.error(`  Pattern: ${rule.pattern}`);
        failed = true;
      }
    }

    if (normalizedFile.startsWith(`${API_PAGES_ROOT}/`)) {
      const isApiHumanPage = normalizedFile === "apps/web/src/pages/api.astro";
      const isMachineJsonRoute = normalizedFile.endsWith(".json.ts");

      if (!isApiHumanPage && !isMachineJsonRoute) {
        console.error(`SECURITY AUDIT FAIL: ${normalizedFile}`);
        console.error("  Public API machine routes must use .json.ts so Apache serves a stable JSON content type under nosniff.");
        failed = true;
      }

      for (const rule of forbiddenApiPatterns) {
        if (rule.pattern.test(content)) {
          console.error(`SECURITY AUDIT FAIL: ${normalizedFile}`);
          console.error(`  ${rule.reason}`);
          console.error(`  Pattern: ${rule.pattern}`);
          failed = true;
        }
      }
    }

    if (normalizedFile.endsWith(".astro")) {
      for (const rule of forbiddenAstroPatterns) {
        if (rule.pattern.test(content)) {
          console.error(`SECURITY AUDIT FAIL: ${normalizedFile}`);
          console.error(`  ${rule.reason}`);
          console.error(`  Pattern: ${rule.pattern}`);
          failed = true;
        }
      }
    }

    if (/\.(astro|svelte)$/.test(normalizedFile)) {
      for (const rule of forbiddenMarkupPatterns) {
        if (rule.pattern.test(content)) {
          console.error(`SECURITY AUDIT FAIL: ${normalizedFile}`);
          console.error(`  ${rule.reason}`);
          console.error(`  Pattern: ${rule.pattern}`);
          failed = true;
        }
      }
    }

    if (
      normalizedFile.startsWith("apps/web/src/") ||
      normalizedFile.startsWith("apps/web/public/")
    ) {
      for (const rule of forbiddenPrivacyPatterns) {
        if (rule.pattern.test(content)) {
          console.error(`SECURITY AUDIT FAIL: ${normalizedFile}`);
          console.error(`  ${rule.reason}`);
          console.error(`  Pattern: ${rule.pattern}`);
          failed = true;
        }
      }
    }
  }
}

const localBackupSource = readFileSync("apps/web/src/lib/local-backup.ts", "utf8");
const proofpackZipSource = readFileSync("apps/web/src/lib/proofpack-zip-verifier.ts", "utf8");
if (/JSZip\.loadAsync\([^)]*[\s\S]{0,300}checkCRC32:\s*true/.test(localBackupSource)) {
  console.error("SECURITY AUDIT FAIL: local backup ZIP must not enable eager JSZip CRC decompression.");
  failed = true;
}
if (!/checkCRC32:\s*false/.test(localBackupSource) || !/internalStream\("uint8array"\)/.test(localBackupSource)) {
  console.error("SECURITY AUDIT FAIL: local backup ZIP extraction must remain streaming and explicitly bounded.");
  failed = true;
}
if (/checkCRC32:\s*true/.test(proofpackZipSource) || !/inspectZipCentralDirectory/.test(proofpackZipSource) || !/internalStream\("uint8array"\)/.test(proofpackZipSource)) {
  console.error("SECURITY AUDIT FAIL: ProofPack ZIP verification must preflight and stream under limits without eager CRC decompression.");
  failed = true;
}

const apacheTemplate = readFileSync("deploy/apache/blackproof.fr.conf.example", "utf8");
const releaseComponentSnapshotSource = readFileSync("deploy/server/snapshot-verified-release-components.mjs", "utf8");
const productionSmokeScript = readFileSync("scripts/smoke-apache-prod.sh", "utf8");
const productionBundleVerifierSource = readFileSync("scripts/verify-production-bundle.mjs", "utf8");
const releaseDirectoryVerifierSource = readFileSync("scripts/verify-release-directory.mjs", "utf8");
const staticPromotionSource = readFileSync("deploy/server/promote-static-release.sh", "utf8");
const rootPackageJson = readFileSync("package.json", "utf8");
const pnpmWorkspaceSource = readFileSync("pnpm-workspace.yaml", "utf8");
const webPackageJson = JSON.parse(readFileSync("apps/web/package.json", "utf8"));
const installedAstroPackageJson = JSON.parse(readFileSync("apps/web/node_modules/astro/package.json", "utf8"));
const nodeVersion = readFileSync(".nvmrc", "utf8").trim();
const productionWorkflow = readFileSync(".github/workflows/deploy-production.yml", "utf8");
const ciWorkflow = readFileSync(".github/workflows/ci.yml", "utf8");
const localDbSource = readFileSync("apps/web/src/lib/local-db.ts", "utf8");
const appSurfaceSource = readFileSync("apps/web/src/components/app/AppSurface.svelte", "utf8");
const localCasesSource = readFileSync("apps/web/src/components/app/LocalCases.svelte", "utf8");
const localCaseEditorSource = readFileSync("apps/web/src/components/app/LocalCaseEditor.svelte", "utf8");
const knowledgeBaseSource = readFileSync("apps/web/src/components/app/KnowledgeBase.svelte", "utf8");
const sensitivePageLockSource = readFileSync("apps/web/src/lib/sensitive-page-lock.ts", "utf8");
const featureFlagsSource = readFileSync("apps/web/src/lib/feature-flags.ts", "utf8");
const knowledgeVaultSource = readFileSync("apps/web/src/lib/knowledge-vault.ts", "utf8");
const returnPackSource = readFileSync("apps/web/src/lib/return-pack.ts", "utf8");
const standaloneVerifierSource = readFileSync("packages/verifier/src/index.js", "utf8");
const validatorGeneratorSource = readFileSync("scripts/generate-proofpack-validator.mjs", "utf8");
const declaredAstroFloor = webPackageJson.dependencies?.astro?.replace(/^\^/, "");
if (
  !versionIsAtLeast(declaredAstroFloor, MINIMUM_SAFE_ASTRO_VERSION)
  || !versionIsAtLeast(installedAstroPackageJson.version, MINIMUM_SAFE_ASTRO_VERSION)
) {
  console.error("SECURITY AUDIT FAIL: Astro must remain at 7.1.0 or newer to close GHSA-4g3v-8h47-v7g6.");
  failed = true;
}
if (
  !/^minimumReleaseAge: 1440$/m.test(pnpmWorkspaceSource)
  || !/^blockExoticSubdeps: true$/m.test(pnpmWorkspaceSource)
  || !/^packageManagerStrictVersion: true$/m.test(pnpmWorkspaceSource)
  || !/^strictDepBuilds: true$/m.test(pnpmWorkspaceSource)
  || !/^allowBuilds:\n  esbuild: true\n  sharp: true$/m.test(pnpmWorkspaceSource)
  || /^dangerouslyAllowAllBuilds:/m.test(pnpmWorkspaceSource)
) {
  console.error("SECURITY AUDIT FAIL: pnpm must keep the reviewed release-age, source and lifecycle-script supply-chain boundaries.");
  failed = true;
}
const workflowSources = `${ciWorkflow}\n${productionWorkflow}`;
const actionReferences = [...workflowSources.matchAll(/uses:\s+[^\s@]+@([^\s]+)/g)];
if (
  actionReferences.length === 0
  || actionReferences.some((reference) => !/^[a-f0-9]{40}$/.test(reference[1]))
  || !/actions\/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0/.test(workflowSources)
  || !/actions\/setup-node@820762786026740c76f36085b0efc47a31fe5020/.test(workflowSources)
  || !/actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a/.test(workflowSources)
  || !/actions\/download-artifact@37930b1c2abaa49bbe596cd826c3c89aef350131/.test(workflowSources)
  || !/pnpm\/action-setup@0977fd99725f1db4007ccb2928dbb4e90d06cc86/.test(workflowSources)
  || (workflowSources.match(/version: 10\.34\.5/g) ?? []).length !== 3
) {
  console.error("SECURITY AUDIT FAIL: GitHub workflows must use the reviewed immutable Node 24 action releases and pnpm version.");
  failed = true;
}
if (
  !/PUBLIC_BLACKPROOF_KNOWLEDGE_VAULT_ENABLED === "enabled"/.test(featureFlagsSource)
  || !/const knowledgeVaultEnabled = isKnowledgeVaultEnabled\(\)/.test(localCaseEditorSource)
  || !/knowledgeVaultEnabled && knowledgeFormQuestionId/.test(localCaseEditorSource)
  || !/La base personnelle n’est pas disponible dans cette version/.test(appSurfaceSource)
  || !/knowledgeVaultEnabled.*\/app\/knowledge/.test(localCasesSource)
) {
  console.error("SECURITY AUDIT FAIL: the cross-case knowledge vault must remain feature-disabled and hidden from the controlled pilot by default.");
  failed = true;
}
if (
  !/PUBLIC_BLACKPROOF_RETURN_PACK_ENABLED === "enabled"/.test(featureFlagsSource)
  || !/assertReturnPackEnabled\(\)/.test(returnPackSource)
  || !/CLEAN_PACKAGE_PATHS/.test(returnPackSource)
  || !/assertCleanReturnPackPackage/.test(returnPackSource)
  || !/copiedSourcePackageParts: 0/.test(returnPackSource)
  || !/RETURN_PACK_POSTCONDITION_FAILED/.test(returnPackSource)
  || /JSZip\.loadAsync\(sourceBytes/.test(returnPackSource)
  || !/returnPackEnabled && record\?\.sourceImport/.test(localCaseEditorSource)
) {
  console.error("SECURITY AUDIT FAIL: Return Pack must stay feature-disabled by default and reconstruct only a fixed clean OOXML package without parsing or copying source parts.");
  failed = true;
}
if (
  !/generated\/delivery-v4-validator\.js/.test(standaloneVerifierSource)
  || !/generated\/delivery-v5-validator\.js/.test(standaloneVerifierSource)
  || !/inspectDeliveryZip\(bytes\)/.test(standaloneVerifierSource)
  || !/MAX_DELIVERY_EXPANDED_BYTES/.test(standaloneVerifierSource)
  || /\bfetch\s*\(/.test(standaloneVerifierSource)
  || !/packages\/verifier\/src\/generated/.test(validatorGeneratorSource)
) {
  console.error("SECURITY AUDIT FAIL: the standalone verifier must use canonical generated validators and bounded local ZIP/file inputs without network calls.");
  failed = true;
}
const localEncryptionSource = readFileSync("apps/web/src/lib/local-encryption.ts", "utf8");
if (
  !/CURRENT_PBKDF2_ITERATIONS = 600_000/.test(localEncryptionSource)
  || !/MIN_SUPPORTED_PBKDF2_ITERATIONS = 310_000/.test(localEncryptionSource)
  || !/MAX_LOCAL_PASSPHRASE_LENGTH = 1_024/.test(localEncryptionSource)
  || !/upgradeLocalPayloadBatchEncryption/.test(localDbSource)
  || !/upgradeLocalPayloadEncryption/.test(knowledgeVaultSource)
) {
  console.error("SECURITY AUDIT FAIL: new local encryption must use 600,000 PBKDF2 iterations while retaining bounded legacy decryption.");
  failed = true;
}
if (!/navigator\.storage\?\.persisted/.test(localCasesSource) || !/navigator\.storage\?\.persist/.test(localCasesSource)) {
  console.error("SECURITY AUDIT FAIL: local-only product storage must expose and request browser persistence under user control.");
  failed = true;
}
if (
  !/DEFAULT_IDLE_MS = 15 \* 60_000/.test(sensitivePageLockSource)
  || !/DEFAULT_HIDDEN_MS = 60_000/.test(sensitivePageLockSource)
  || !/document\.hidden/.test(sensitivePageLockSource)
  || !/subscribeToSensitivePageLock/.test(localCaseEditorSource)
  || !/subscribeToSensitivePageLock/.test(knowledgeBaseSource)
  || !/subscribeToSensitivePageLock/.test(localCasesSource)
  || !/function lockSensitiveEditorState\([^)]*\) \{[\s\S]{0,180}operationGeneration \+= 1;/.test(localCaseEditorSource)
  || !/async function loadCase\([^)]*\) \{[\s\S]{0,240}const generation = \+\+operationGeneration;/.test(localCaseEditorSource)
  || !/refreshSnapshotAvailability\([^)]*, generation\)/.test(localCaseEditorSource)
  || !/lockSensitiveRestoreState/.test(localCasesSource)
  || !/loadAbortController\?\.abort\(\)/.test(localCaseEditorSource)
  || !/restoreAbortController\?\.abort\(\)/.test(localCasesSource)
  || !/assertLocalOperationActive\(signal\)/.test(localDbSource)
  || !/signal: options\.signal/.test(localBackupSource)
  || !/proofpack = null/.test(localCaseEditorSource)
  || !/issuerPrivateKeyJwk = null/.test(localCaseEditorSource)
  || !/unlockPassphrase = ""/.test(localCaseEditorSource)
  || !/vault = null/.test(knowledgeBaseSource)
  || !/passphrase = ""/.test(knowledgeBaseSource)
) {
  console.error("SECURITY AUDIT FAIL: sensitive views and restore flows must invalidate in-flight operations before erasing decrypted state and secrets.");
  failed = true;
}
const productionBuildJob = productionWorkflow.match(/build-publish-artifact:([\s\S]*?)(?=\n  attest-public-production-artifact:)/)?.[1] ?? "";
const publicAttestationJob = productionWorkflow.match(/attest-public-production-artifact:([\s\S]*)$/)?.[1] ?? "";
if (
  productionBuildJob.length === 0
  || /id-token: write|attestations: write/.test(productionBuildJob)
  || !/if: github\.event\.repository\.visibility == 'public'/.test(publicAttestationJob)
  || !/permissions:[\s\S]{0,120}contents: read[\s\S]{0,120}id-token: write[\s\S]{0,120}attestations: write/.test(publicAttestationJob)
) {
  console.error("SECURITY AUDIT FAIL: OIDC and attestation rights must exist only in the separate public-only provenance job.");
  failed = true;
}
if (!/!existing && !input\.passphrase/.test(localDbSource) || !/chiffrement est obligatoire avant la première écriture/.test(localDbSource)) {
  console.error("SECURITY AUDIT FAIL: the storage layer must reject a new cleartext local case even if UI checks are bypassed.");
  failed = true;
}
if (!/migrateLegacyClearLocalCaseEncryption/.test(localDbSource) || !/migration chiffrée est requise avant lecture/.test(localDbSource)) {
  console.error("SECURITY AUDIT FAIL: legacy cleartext cases must be redacted and encrypted before the editor can read them.");
  failed = true;
}
if (!/if \(!input\.passphrase\) throw new Error\("Une phrase secrète est obligatoire pour restaurer/.test(localDbSource)) {
  console.error("SECURITY AUDIT FAIL: the low-level restore primitive must never write a cleartext case.");
  failed = true;
}
if (!/if \(!passphrase\) throw new Error\("Une phrase secrète est obligatoire pour générer/.test(localBackupSource)) {
  console.error("SECURITY AUDIT FAIL: full local backups must never be generated in cleartext.");
  failed = true;
}
for (const component of ["ProofApp.svelte", "QuestionnaireImport.svelte", "VerifyProofPack.svelte", "LocalCaseEditor.svelte"]) {
  const source = readFileSync(`apps/web/src/components/app/${component}`, "utf8");
  if (!/subscribeToLocalStorageWipe/.test(source)) {
    console.error(`SECURITY AUDIT FAIL: ${component} must erase in-memory document state after a cross-tab Panic Wipe.`);
    failed = true;
  }
}
if (!/https:\/\/blackproof\.fr%\{REQUEST_URI\}/.test(apacheTemplate) || !/HTTP_HOST\} !\^blackproof\\\.fr\$/.test(apacheTemplate)) {
  console.error("SECURITY AUDIT FAIL: HTTP, www and unmatched Host requests must redirect to the canonical apex origin.");
  failed = true;
}
if (/\+FollowSymLinks/.test(apacheTemplate) || !/Options -Indexes -FollowSymLinks/.test(apacheTemplate)) {
  console.error("SECURITY AUDIT FAIL: Apache must not follow symbolic links in the BLACKPROOF document root.");
  failed = true;
}
if (!/SSLProtocol -all \+TLSv1\.2 \+TLSv1\.3/.test(apacheTemplate)) {
  console.error("SECURITY AUDIT FAIL: the BLACKPROOF HTTPS vhost must explicitly require TLS 1.2 or TLS 1.3.");
  failed = true;
}
if (
  !/\[\[ "\$unknown_api_code" != "404" \]\]/.test(productionSmokeScript)
  || !/\[\[ "\$legacy_nav_code" != "404" \]\]/.test(productionSmokeScript)
  || !/\[\[ "\$operational_code" != "404" \]\]/.test(productionSmokeScript)
) {
  console.error("SECURITY AUDIT FAIL: production smoke checks must require exact 404 boundaries for absent and operational paths.");
  failed = true;
}
const deployManifestSource = readFileSync("scripts/create-deploy-manifest.mjs", "utf8");
const renderApacheSource = readFileSync("scripts/render-apache-conf.mjs", "utf8");
const sharedCspSource = readFileSync("scripts/shared/csp.mjs", "utf8");
if (
  !/entry\.isSymbolicLink\(\)/.test(deployManifestSource)
  || !/releaseComponents/.test(deployManifestSource)
  || !/lstatSync\(path\)/.test(deployManifestSource)
  || !/forbiddenSecretPatterns/.test(deployManifestSource)
  || !/lstatSync\(distDir\)/.test(deployManifestSource)
  || !/distStat\.isSymbolicLink\(\)/.test(deployManifestSource)
) {
  console.error("SECURITY AUDIT FAIL: the release manifest must reject symlinks and cover server-side release components.");
  failed = true;
}
if (
  !/MAX_ENTRY_COUNT = 10_000/.test(productionBundleVerifierSource)
  || !/MAX_TOTAL_UNCOMPRESSED_BYTES = 200_000_000/.test(productionBundleVerifierSource)
  || !/constants\.O_RDONLY \| constants\.O_NOFOLLOW/.test(productionBundleVerifierSource)
  || !/fstatSync\(descriptor, \{ bigint: true \}\)/.test(productionBundleVerifierSource)
  || !/after\.mtimeNs !== before\.mtimeNs \|\| after\.ctimeNs !== before\.ctimeNs/.test(productionBundleVerifierSource)
  || !/creatorSystem !== 3 \|\| unixMode !== 0o100644/.test(productionBundleVerifierSource)
  || !/Multi-disk and ZIP64 production bundles are forbidden/.test(productionBundleVerifierSource)
  || !/unsafe or duplicate entry/.test(productionBundleVerifierSource)
  || !/checkCRC32: false/.test(productionBundleVerifierSource)
  || !/internalStream\("uint8array"\)/.test(productionBundleVerifierSource)
) {
  console.error("SECURITY AUDIT FAIL: the production bundle verifier must preflight its inventory and stream real extraction under fixed limits.");
  failed = true;
}
if (
  !/MAX_MANIFEST_BYTES = 10_000_000/.test(releaseDirectoryVerifierSource)
  || !/MAX_FILE_BYTES = 32_000_000/.test(releaseDirectoryVerifierSource)
  || !/MAX_TOTAL_BYTES = 200_000_000/.test(releaseDirectoryVerifierSource)
  || !/constants\.O_RDONLY \| constants\.O_NOFOLLOW/.test(releaseDirectoryVerifierSource)
  || !/fstatSync\(descriptor, \{ bigint: true \}\)/.test(releaseDirectoryVerifierSource)
  || !/after\.mtimeNs !== before\.mtimeNs \|\| after\.ctimeNs !== before\.ctimeNs/.test(releaseDirectoryVerifierSource)
  || !/artifactSha256 !== expectedArtifactSha256/.test(releaseDirectoryVerifierSource)
  || !/trusted_script="\$service_directory\/promote-static-release\.sh"/.test(staticPromotionSource)
  || !/verifier_path="\$service_directory\/verify-release-directory\.mjs"/.test(staticPromotionSource)
  || !/smoke_path="\$service_directory\/smoke-apache-prod\.sh"/.test(staticPromotionSource)
  || !/root:root:755/.test(staticPromotionSource)
  || !/root:root:644/.test(staticPromotionSource)
  || !/atomic_exchange\nrollback_required=1[\s\S]*?"\$runtime" "\$verifier_path"[\s\S]*?"\$current_root"[\s\S]*?"\$expected_commit" "\$expected_artifact_sha256"[\s\S]*?status_body=/.test(staticPromotionSource)
) {
  console.error("SECURITY AUDIT FAIL: release promotion must re-read bounded regular files and verify the served directory immediately after atomic exchange.");
  failed = true;
}
if (
  !/lstatSync\(distDir\)/.test(renderApacheSource)
  || !/distStat\.isSymbolicLink\(\)/.test(renderApacheSource)
  || !/lstatSync\(distDir\)/.test(sharedCspSource)
  || !/root\.isSymbolicLink\(\)/.test(sharedCspSource)
  || !/entry\.isSymbolicLink\(\)/.test(sharedCspSource)
) {
  console.error("SECURITY AUDIT FAIL: CSP rendering must reject symlinked roots and child artifacts before cleanup or reads.");
  failed = true;
}
if (
  !/compressedPublicSuffix/.test(deployManifestSource)
  || !/allowedPublicArchives/.test(deployManifestSource)
  || !/assertAllowedArchive/.test(deployManifestSource)
  || !/inspectZipCentralDirectory/.test(deployManifestSource)
  || !/checkCRC32: false/.test(deployManifestSource)
  || !/unsafeOriginalName/.test(deployManifestSource)
  || !/uncompressedSize/.test(deployManifestSource)
  || !/internalStream\("uint8array"\)/.test(deployManifestSource)
  || !/actualCrc !== expected\.crc32/.test(deployManifestSource)
) {
  console.error("SECURITY AUDIT FAIL: compressed public artifacts must fail closed except for bounded, inventory-checked allowlisted demos.");
  failed = true;
}
if (
  !/proofpack-delivery-demo\\\.zip/.test(apacheTemplate)
  || !/zip\|7z\|rar\|tar\|tgz\|gz\|bz2\|xz\|zst\|br\|jar\|war\|dmg\|iso/.test(apacheTemplate)
) {
  console.error("SECURITY AUDIT FAIL: Apache must deny compressed static artifacts except the reviewed Delivery demo ZIP.");
  failed = true;
}
for (const file of walkAll("artifacts")) {
  const normalizedFile = normalizePath(file);
  const suspiciousName = /private[-_.]?key|license-private/i.test(normalizedFile);
  const content = statSync(file).size <= 1_000_000 ? readFileSync(file) : Buffer.alloc(0);
  if (suspiciousName || content.includes(Buffer.from("PRIVATE KEY"))) {
    console.error(`SECURITY AUDIT FAIL: private key material is forbidden under artifacts/: ${normalizedFile}`);
    failed = true;
  }
}
const schemaMediaTypeBlock = [...apacheTemplate.matchAll(/<FilesMatch "[^"]*">[\s\S]*?<\/FilesMatch>/g)]
  .map((match) => match[0])
  .find((block) => block.includes("ForceType application/schema+json")) ?? "";
if (!schemaMediaTypeBlock.includes("\\.schema\\.json")) {
  console.error("SECURITY AUDIT FAIL: versioned and Delivery JSON Schemas must be served as application/schema+json.");
  failed = true;
}
if (!/RewriteCond %\{REQUEST_URI\} \^\/schemas\(\?:\/\|\$\)[\s\S]*?RewriteRule \^ - \[R=404,END\]/.test(apacheTemplate)) {
  console.error("SECURITY AUDIT FAIL: unknown /schemas routes must return a real 404 before the HTML fallback.");
  failed = true;
}
if (!/RewriteCond %\{REQUEST_URI\} \^\/deploy\(\?:\/\|\$\)[\s\S]*?RewriteRule \^ - \[R=404,END\]/.test(apacheTemplate)) {
  console.error("SECURITY AUDIT FAIL: /deploy operational artifacts must be denied explicitly.");
  failed = true;
}
if (!/RedirectMatch 404 "\^\/api\/\(\?![^\"]*questionnaire-import\\\.json\$/.test(apacheTemplate)) {
  console.error("SECURITY AUDIT FAIL: the public XLSX import contract must remain in the explicit API allowlist.");
  failed = true;
}
if (!/<LocationMatch "\^\/\(\?:schemas\/proofpack\/[\s\S]*?schemas\/proofpack-delivery\/v\[0-9\]\+\\\.schema\\\.json[\s\S]*?Header always set Access-Control-Allow-Origin "\*"[\s\S]*?Header always set Cross-Origin-Resource-Policy "cross-origin"[\s\S]*?Header always unset Access-Control-Allow-Credentials[\s\S]*?<\/LocationMatch>/.test(apacheTemplate)) {
  console.error("SECURITY AUDIT FAIL: public ProofPack contracts need credential-free, narrowly scoped browser CORS.");
  failed = true;
}

if (nodeVersion !== "22.23.2" || !/"node": ">=22\.23\.2 <23"/.test(rootPackageJson)
  || !/"packageManager": "pnpm@10\.34\.5"/.test(rootPackageJson)) {
  console.error("SECURITY AUDIT FAIL: build tooling must retain the reviewed Node and pnpm versions.");
  failed = true;
}
if (!/artifactSha256 !== internalDigest/.test(releaseComponentSnapshotSource)
  || !/artifactSha256 !== expectedArtifactSha256/.test(releaseComponentSnapshotSource)
  || !/manifest\.gitCommit !== expectedCommit/.test(releaseComponentSnapshotSource)
  || !/manifest\.dirtyWorktree !== false/.test(releaseComponentSnapshotSource)
  || !/constants\.O_RDONLY \| constants\.O_NOFOLLOW/.test(releaseComponentSnapshotSource)
  || !/after\.mtimeNs !== before\.mtimeNs \|\| after\.ctimeNs !== before\.ctimeNs/.test(releaseComponentSnapshotSource)) {
  console.error("SECURITY AUDIT FAIL: privileged activation must consume exact-manifest regular-file snapshots.");
  failed = true;
}
if (!/name: CI gate\n\s+if: always\(\)/.test(ciWorkflow)
  || !/classify-release-scope\.mjs/.test(ciWorkflow)
  || !/scope == 'full'/.test(ciWorkflow)
  || !/Run every business scenario against the exact production artifact/.test(productionWorkflow)
  || !/production-dist-before\.sha256/.test(productionWorkflow)
  || !/production-dist-after\.sha256/.test(productionWorkflow)
  || !/pnpm open-source:check/.test(productionWorkflow)
  || !/pnpm exec playwright test --project=chromium --workers=1/.test(productionWorkflow)
  || !/artifact:bundle-verify/.test(productionWorkflow)) {
  console.error("SECURITY AUDIT FAIL: production must test the exact open-source artifact before publishing.");
  failed = true;
}
const astroConfig = readFileSync("apps/web/astro.config.mjs", "utf8");
if (!/connect-src 'none'/.test(astroConfig) || !/form-action 'none'/.test(astroConfig)
  || /ProxyPass/.test(apacheTemplate)) {
  console.error("SECURITY AUDIT FAIL: the local application must block network connections and server-side document submission.");
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log("BLACKPROOF security audit passed.");
