import { proofpackV1Schema } from "@blackproof/core";
import { jsonResponse } from "../../../lib/api-response";

export const prerender = true;

export function GET() {
  return jsonResponse(proofpackV1Schema);
}
