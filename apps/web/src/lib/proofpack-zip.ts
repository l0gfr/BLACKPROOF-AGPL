import JSZip from "jszip";

import {
  buildProofPackDeliveryZipFiles,
  buildProofPackZipFiles,
  confirmProofPackDeliveryPreview,
  exportProofPackDeliveryManifestJson,
  exportProofPackZipManifestJson,
  type ProofPack,
  type ProofPackDelivery,
  type ProofPackSourceImport,
  type ProofPackSourceLineage,
  type KnowledgeUse,
} from "@blackproof/core";

export const PROOFPACK_ZIP_VERSION = "blackproof-proofpack-zip-v0.2.0-alpha";

function safeFilenamePart(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "proofpack";
}

export function buildProofPackZipFilename(proofpack: ProofPack): string {
  const title = safeFilenamePart(proofpack.case.title);
  const id = safeFilenamePart(proofpack.case.id);

  return `blackproof-master-${title}-${id}.zip`;
}

export async function buildProofPackZipBlob(proofpack: ProofPack, sourceImport?: ProofPackSourceImport, knowledgeUses: KnowledgeUse[] = [], sourceLineage?: ProofPackSourceLineage): Promise<Blob> {
  const zip = new JSZip();

  for (const file of buildProofPackZipFiles(proofpack, sourceImport, knowledgeUses, sourceLineage)) {
    zip.file(file.filename, file.content);
  }

  zip.file("manifest.json", await exportProofPackZipManifestJson(proofpack, sourceImport, knowledgeUses, sourceLineage));

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: {
      level: 6,
    },
    platform: "UNIX",
    comment: `${PROOFPACK_ZIP_VERSION} | ${proofpack.fingerprint}`,
  });
}

export async function downloadProofPackZip(proofpack: ProofPack): Promise<void> {
  const blob = await buildProofPackZipBlob(proofpack);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = buildProofPackZipFilename(proofpack);
  link.rel = "noopener";
  link.click();

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function buildProofPackDeliveryZipBlob(delivery: ProofPackDelivery): Promise<Blob> {
  await confirmProofPackDeliveryPreview(delivery, delivery.fingerprint);
  const zip = new JSZip();

  for (const file of buildProofPackDeliveryZipFiles(delivery)) {
    zip.file(file.filename, file.content);
  }
  zip.file("manifest.json", await exportProofPackDeliveryManifestJson(delivery));

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    platform: "UNIX",
    comment: `blackproof-proofpack-delivery-zip-v1 | ${delivery.fingerprint}`,
  });
}

export function buildProofPackDeliveryZipFilename(delivery: ProofPackDelivery): string {
  return `blackproof-delivery-${safeFilenamePart(delivery.deliveryId)}.zip`;
}

export async function downloadProofPackDeliveryZip(delivery: ProofPackDelivery): Promise<string> {
  const blob = await buildProofPackDeliveryZipBlob(delivery);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const filename = buildProofPackDeliveryZipFilename(delivery);
  link.download = filename;
  link.rel = "noopener";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return filename;
}
