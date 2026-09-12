import JSZip from "jszip";
import { buildProofPackDeliveryZipFiles, exportProofPackDeliveryManifestJson } from "@blackproof/core";
import { buildDemoDelivery } from "../../lib/demo-delivery";

export const prerender = true;
const ZIP_DATE = new Date("1980-01-01T00:00:00.000Z");

export async function GET() {
  const delivery = await buildDemoDelivery();
  const zip = new JSZip();
  for (const file of buildProofPackDeliveryZipFiles(delivery)) {
    zip.file(file.filename, file.content, { createFolders: false, date: ZIP_DATE });
  }
  zip.file("manifest.json", await exportProofPackDeliveryManifestJson(delivery), { createFolders: false, date: ZIP_DATE });
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 }, platform: "UNIX" });
  return new Response(bytes as unknown as BodyInit, { headers: { "content-type": "application/zip", "content-disposition": "attachment; filename=blackproof-delivery-demo.zip" } });
}
