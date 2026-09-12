import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

import { cleanupBuiltHtml } from "./build-cleanup.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, "../..");
const productionBuild = process.env.BLACKPROOF_BUILD_PROFILE === "production";
if (productionBuild && process.env.PUBLIC_BLACKPROOF_RETURN_PACK_ENABLED === "enabled") {
  throw new Error("Return Pack must remain disabled in production until the independent desktop-office qualification is signed off.");
}

if (productionBuild && process.env.PUBLIC_BLACKPROOF_KNOWLEDGE_VAULT_ENABLED === "enabled") {
  throw new Error("Knowledge Vault remains disabled until its independent qualification is complete.");
}

function walkHtmlFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }

  const files = [];

  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      files.push(...walkHtmlFiles(path));
    } else if (path.endsWith(".html")) {
      files.push(path);
    }
  }

  return files;
}

function blackproofW3cBuildCleanup() {
  return {
    name: "blackproof-w3c-build-cleanup",
    hooks: {
      "astro:build:done": ({ dir }) => {
        for (const file of walkHtmlFiles(fileURLToPath(dir))) {
          const html = readFileSync(file, "utf8");
          const cleanedHtml = cleanupBuiltHtml(html);

          if (cleanedHtml !== html) {
            writeFileSync(file, cleanedHtml, "utf8");
          }
        }
      },
    },
  };
}

export default defineConfig({
  site: "https://blackproof.fr",
  redirects: {
    "/pilot": "/open-source",
    "/pricing": "/open-source",
    "/access": "/app",
    "/account": "/app/cases",
    "/legal/pilot-order": "/open-source",
    "/legal/conditions-solo": "/open-source",
    "/legal/conditions-solo.txt": "/open-source",
  },
  build: {
    inlineStylesheets: "never",
  },
  markdown: {
    syntaxHighlight: false,
  },
  integrations: [svelte(), blackproofW3cBuildCleanup()],
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "frame-src 'none'",
        "child-src 'none'",
        "form-action 'none'",
        "img-src 'self' data:",
        "font-src 'self'",
        "media-src 'self'",
        "connect-src 'none'",
        "worker-src 'self'",
        "manifest-src 'self'",
      ],
      scriptDirective: {
        resources: ["'self'"],
      },
      styleDirective: {
        resources: ["'self'"],
      },
    },
  },
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
    server: {
      fs: {
        allow: [workspaceRoot],
      },
    },
  },
});
