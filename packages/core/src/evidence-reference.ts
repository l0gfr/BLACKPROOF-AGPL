import type { EvidenceItem } from "./types";

function hasText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function hasEvidenceSource(item: EvidenceItem): boolean {
  return [item.referenceId, item.sourceSystem, item.fileName, item.fileUri, item.documentHash].some(hasText);
}

export function isEvidenceReferenceComplete(item: EvidenceItem): boolean {
  return Boolean(
    item.referenceType
    && hasText(item.referenceId)
    && hasText(item.sourceSystem)
    && hasText(item.owner)
    && item.exportMode
    && typeof item.observedAt === "string"
    && Number.isFinite(Date.parse(item.observedAt))
  );
}
