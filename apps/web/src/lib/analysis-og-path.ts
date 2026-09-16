import { createHash } from "node:crypto";
import type { AnalysisEntry } from "./analyses";

// Bump when the card design or bundled font changes, to refresh social caches.
export const ANALYSIS_OG_VERSION = 1;

export function getAnalysisOgPath(entry: AnalysisEntry): string {
  const revision = createHash("sha256")
    .update(JSON.stringify([
      ANALYSIS_OG_VERSION,
      entry.data.title,
      entry.data.category,
      entry.data.publishedAt.toISOString(),
    ]))
    .digest("hex").slice(0, 12);
  return `/og/analyses/${entry.id}-${revision}.png`;
}
