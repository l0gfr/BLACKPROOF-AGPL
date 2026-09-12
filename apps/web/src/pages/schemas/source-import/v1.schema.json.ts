import { sourceImportV1Schema } from "@blackproof/core";
import { jsonResponse } from "../../../lib/api-response";

export const prerender = true;

export function GET() {
  return jsonResponse(sourceImportV1Schema);
}
