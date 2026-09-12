import {
  EVIDENCE_LIBRARY_VERSION,
  getEvidenceLibraryItems,
  getEvidenceLibrarySummary,
} from "@blackproof/core";

export const prerender = true;

export function GET() {
  return new Response(
    JSON.stringify(
      {
        version: EVIDENCE_LIBRARY_VERSION,
        summary: getEvidenceLibrarySummary(),
        items: getEvidenceLibraryItems()
      },
      null,
      2
    ),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=3600"
      }
    }
  );
}
