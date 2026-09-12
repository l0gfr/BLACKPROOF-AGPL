import { proofPackDeliveryV4Schema } from "@blackproof/core";
import { jsonResponse } from "../lib/api-response";

export const prerender = true;

// Historical V4 contract. The response must remain byte-stable because V4
// documents declare this exact URL and fingerprint their serialized fields.
export function GET() {
  return jsonResponse(proofPackDeliveryV4Schema);
}
