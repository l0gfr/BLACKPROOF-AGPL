import { fileURLToPath } from "node:url";

export function validateProductionWorkflowConfig(environment = process.env) {
  const commit = environment.PUBLIC_BLACKPROOF_RELEASE_COMMIT?.trim();
  if (!commit || !/^[a-f0-9]{40}$/.test(commit)) {
    throw new Error("PUBLIC_BLACKPROOF_RELEASE_COMMIT must be the exact 40-character production commit.");
  }
  if (environment.PUBLIC_BLACKPROOF_RETURN_PACK_ENABLED === "enabled") {
    throw new Error("Return Pack is not qualified for production.");
  }
  if (environment.PUBLIC_BLACKPROOF_KNOWLEDGE_VAULT_ENABLED === "enabled") {
    throw new Error("Knowledge Vault is not qualified for production.");
  }
  const source = environment.PUBLIC_BLACKPROOF_SOURCE_URL?.trim();
  if (source) {
    const url = new URL(source);
    if (url.protocol !== "https:" || url.username || url.password) {
      throw new Error("Source code must be available at a public HTTPS URL without credentials.");
    }
  }
  return { commit, accessModel: "open-source" };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const result = validateProductionWorkflowConfig();
    console.log(`Production workflow preflight passed for commit=${result.commit}, access=${result.accessModel}.`);
  } catch (error) {
    console.error(`PRODUCTION WORKFLOW PREFLIGHT FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
