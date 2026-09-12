import { exportProofPackDeliveryJson } from "@blackproof/core";
import { buildDemoDelivery } from "../../lib/demo-delivery";

export const prerender = true;
export async function GET() { return new Response(exportProofPackDeliveryJson(await buildDemoDelivery()), { headers: { "content-type": "application/json; charset=utf-8" } }); }
