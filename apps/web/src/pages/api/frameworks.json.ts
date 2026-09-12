import {
  FRAMEWORK_MAPPING_VERSION,
  getFrameworkDefinitions,
  getFrameworkMappingSummary,
  getFrameworkRequirements,
} from "@blackproof/core";
import { apiEnvelope, jsonResponse } from "../../lib/api-response";

export const prerender = true;

export function GET() {
  return jsonResponse(
    apiEnvelope("frameworks", {
      version: FRAMEWORK_MAPPING_VERSION,
      summary: getFrameworkMappingSummary(),
      frameworks: getFrameworkDefinitions(),
      requirements: getFrameworkRequirements(),
      legacyUrl: "/frameworks.json",
    })
  );
}
