export function isReturnPackEnabled(): boolean {
  return import.meta.env.PUBLIC_BLACKPROOF_RETURN_PACK_ENABLED === "enabled";
}

export function assertReturnPackEnabled(): void {
  if (!isReturnPackEnabled()) {
    throw new Error("RETURN_PACK_DISABLED: la génération XLSX reste désactivée en production.");
  }
}

export function isKnowledgeVaultEnabled(): boolean {
  return import.meta.env.PUBLIC_BLACKPROOF_KNOWLEDGE_VAULT_ENABLED === "enabled";
}
