import { proofPackDeliveryV4Schema } from "@blackproof/core";
import { jsonResponse } from "../../../lib/api-response";

export const prerender = true;

export function GET() {
  return jsonResponse(proofPackDeliveryV4Schema);
}
