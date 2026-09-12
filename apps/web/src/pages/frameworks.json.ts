import {
  FRAMEWORK_MAPPING_VERSION,
  getFrameworkDefinitions,
  getFrameworkMappingSummary,
  getFrameworkRequirements,
} from "@blackproof/core";

export const prerender = true;

export function GET() {
  return new Response(
    JSON.stringify(
      {
        version: FRAMEWORK_MAPPING_VERSION,
        summary: getFrameworkMappingSummary(),
        frameworks: getFrameworkDefinitions(),
        requirements: getFrameworkRequirements()
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
