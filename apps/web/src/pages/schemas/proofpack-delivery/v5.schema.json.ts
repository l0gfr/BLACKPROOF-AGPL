import { proofPackDeliveryV5Schema } from "@blackproof/core";
import { jsonResponse } from "../../../lib/api-response";

export const prerender = true;

export function GET() {
  return jsonResponse(proofPackDeliveryV5Schema);
}
