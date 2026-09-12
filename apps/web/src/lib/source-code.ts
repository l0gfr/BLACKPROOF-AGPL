export const SOFTWARE_LICENSE = "AGPL-3.0-only";
const revision = import.meta.env.PUBLIC_BLACKPROOF_RELEASE_COMMIT?.trim();
const defaultSourceUrl = `https://github.com/l0gfr/BLACKPROOF-AGPL/tree/${revision && /^[a-f0-9]{40}$/.test(revision) ? revision : "main"}`;
const configuredSourceUrl = import.meta.env.PUBLIC_BLACKPROOF_SOURCE_URL?.trim();
const sourceUrl = new URL(configuredSourceUrl || defaultSourceUrl);
if (sourceUrl.protocol !== "https:" || sourceUrl.username || sourceUrl.password) {
  throw new Error("PUBLIC_BLACKPROOF_SOURCE_URL must be a public HTTPS source URL without credentials.");
}
export const SOURCE_CODE_URL = sourceUrl.href;
