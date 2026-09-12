import { statusV1 } from "../../../lib/delivery-protocol-schemas";
import { jsonResponse } from "../../../lib/api-response";
export const prerender = true;
export function GET() { return jsonResponse(statusV1); }
