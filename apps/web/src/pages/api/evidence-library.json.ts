import {
  EVIDENCE_LIBRARY_VERSION,
  getEvidenceLibraryItems,
  getEvidenceLibrarySummary,
} from "@blackproof/core";
import { apiEnvelope, jsonResponse } from "../../lib/api-response";

export const prerender = true;

export function GET() {
  return jsonResponse(
    apiEnvelope("evidence-library", {
      version: EVIDENCE_LIBRARY_VERSION,
      summary: getEvidenceLibrarySummary(),
      items: getEvidenceLibraryItems(),
      legacyUrl: "/evidence-library.json",
    })
  );
}
