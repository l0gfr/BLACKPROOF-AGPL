import { methodology } from "@blackproof/core";
import { apiEnvelope, jsonResponse } from "../../lib/api-response";

export const prerender = true;

export function GET() {
  return jsonResponse(
    apiEnvelope("methodology", {
      version: methodology.version,
      data: methodology,
      legacyUrl: "/methodology.json",
    })
  );
}
