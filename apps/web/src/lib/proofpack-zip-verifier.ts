import JSZip from "jszip";

import {
  SECURITY_LIMITS,
  SecurityValidationError,
  verifyProofPackZipFiles,
  verifyProofPackDeliveryZipFiles,
  type VerifyProofPackDeliveryZipResult,
  type VerifyProofPackZipResult,
} from "@blackproof/core";
import { inspectZipCentralDirectory } from "./zip-preflight";

interface ZipByteStream {
  on(event: "data", callback: (chunk: Uint8Array) => void): ZipByteStream;
  on(event: "error", callback: (error: Error) => void): ZipByteStream;
  on(event: "end", callback: () => void): ZipByteStream;
  pause(): ZipByteStream;
  resume(): ZipByteStream;
}

async function extractEntryBounded(
  entry: JSZip.JSZipObject,
  expandedTotal: { value: number },
  expected: { crc32: number; uncompressedSize: number },
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let fileBytes = 0;
    let crc = 0xffffffff;
    let settled = false;
    const stream = (entry as unknown as {
      internalStream(type: "uint8array"): ZipByteStream;
    }).internalStream("uint8array");

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      stream.pause();
      reject(error);
    };

    stream.on("data", (chunk: Uint8Array) => {
      if (settled) return;
      fileBytes += chunk.byteLength;
      expandedTotal.value += chunk.byteLength;
      if (fileBytes > expected.uncompressedSize) {
        fail(new SecurityValidationError(
          "PROOFPACK_ZIP_INVALID",
          `${entry.name} expands beyond its validated size.`
        ));
        return;
      }
      if (fileBytes > SECURITY_LIMITS.MAX_PROOFPACK_ZIP_FILE_BYTES) {
        fail(new SecurityValidationError(
          "PROOFPACK_ZIP_FILE_TOO_LARGE",
          `${entry.name} exceeds ${SECURITY_LIMITS.MAX_PROOFPACK_ZIP_FILE_BYTES} expanded bytes.`
        ));
        return;
      }
      if (expandedTotal.value > SECURITY_LIMITS.MAX_PROOFPACK_ZIP_EXPANDED_BYTES) {
        fail(new SecurityValidationError(
          "PROOFPACK_ZIP_EXPANDED_TOO_LARGE",
          `Expanded ZIP exceeds ${SECURITY_LIMITS.MAX_PROOFPACK_ZIP_EXPANDED_BYTES} bytes.`
        ));
        return;
      }
      for (const byte of chunk) crc = CRC32_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
      chunks.push(chunk);
    });
    stream.on("error", (error: Error) => fail(error));
    stream.on("end", () => {
      if (settled) return;
      if (fileBytes !== expected.uncompressedSize) {
        fail(new SecurityValidationError("PROOFPACK_ZIP_INVALID", `${entry.name} does not match its validated size.`));
        return;
      }
      if (((crc ^ 0xffffffff) >>> 0) !== expected.crc32) {
        fail(new SecurityValidationError("PROOFPACK_ZIP_INVALID", `${entry.name} fails its CRC check.`));
        return;
      }
      const bytes = new Uint8Array(fileBytes);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      settled = true;
      resolve(bytes);
    });
    stream.resume();
  });
}

const CRC32_TABLE = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

export type VerifyProofPackZipBlobResult = VerifyProofPackZipResult
  | (VerifyProofPackDeliveryZipResult & { deliveryJson?: string });

export async function verifyProofPackZipBlob(blob: Blob): Promise<VerifyProofPackZipBlobResult> {
  if (blob.size > SECURITY_LIMITS.MAX_PROOFPACK_ZIP_BYTES) {
    throw new SecurityValidationError(
      "PROOFPACK_ZIP_TOO_LARGE",
      `ZIP exceeds ${SECURITY_LIMITS.MAX_PROOFPACK_ZIP_BYTES} bytes.`
    );
  }

  let preflight: Awaited<ReturnType<typeof inspectZipCentralDirectory>>;
  try {
    preflight = await inspectZipCentralDirectory(blob, SECURITY_LIMITS.MAX_PROOFPACK_ZIP_ENTRIES);
  } catch (error) {
    throw new SecurityValidationError("PROOFPACK_ZIP_INVALID", error instanceof Error ? error.message : "ZIP preflight failed.");
  }
  const commentMatch = preflight.comment.match(/^(blackproof-proofpack-zip-v0\.[12]\.0-alpha|blackproof-proofpack-delivery-zip-v1) \| (bp_sha256_[a-f0-9]{64})$/);
  if (preflight.comment && !commentMatch) {
    throw new SecurityValidationError("PROOFPACK_ZIP_INVALID", "ZIP comment does not match a supported BLACKPROOF artifact marker.");
  }
  if (preflight.entries.some((entry) => entry.name.endsWith("/"))) {
    throw new SecurityValidationError("PROOFPACK_ZIP_UNEXPECTED_DIRECTORY", "ZIP directories are not allowed; all files must be at the root.");
  }
  let declaredExpandedBytes = 0;
  for (const entry of preflight.entries) {
    if (entry.uncompressedSize > SECURITY_LIMITS.MAX_PROOFPACK_ZIP_FILE_BYTES) {
      throw new SecurityValidationError(
        "PROOFPACK_ZIP_FILE_TOO_LARGE",
        `${entry.name} exceeds ${SECURITY_LIMITS.MAX_PROOFPACK_ZIP_FILE_BYTES} expanded bytes.`
      );
    }
    declaredExpandedBytes += entry.uncompressedSize;
    if (declaredExpandedBytes > SECURITY_LIMITS.MAX_PROOFPACK_ZIP_EXPANDED_BYTES) {
      throw new SecurityValidationError(
        "PROOFPACK_ZIP_EXPANDED_TOO_LARGE",
        `Expanded ZIP exceeds ${SECURITY_LIMITS.MAX_PROOFPACK_ZIP_EXPANDED_BYTES} bytes.`
      );
    }
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(await blob.arrayBuffer(), { checkCRC32: false, createFolders: false });
  } catch {
    throw new SecurityValidationError("PROOFPACK_ZIP_INVALID", "ZIP cannot be opened.");
  }

  const allEntries = Object.values(zip.files);
  if (allEntries.some((entry) => entry.dir)) {
    throw new SecurityValidationError("PROOFPACK_ZIP_UNEXPECTED_DIRECTORY", "ZIP directories are not allowed; all files must be at the root.");
  }
  const entries = allEntries;
  if (entries.length > SECURITY_LIMITS.MAX_PROOFPACK_ZIP_ENTRIES) {
    throw new SecurityValidationError(
      "PROOFPACK_ZIP_TOO_MANY_FILES",
      `ZIP contains more than ${SECURITY_LIMITS.MAX_PROOFPACK_ZIP_ENTRIES} files.`
    );
  }
  if (entries.length !== preflight.entryCount || preflight.names.some((name) => !Object.hasOwn(zip.files, name))) {
    throw new SecurityValidationError("PROOFPACK_ZIP_INVALID", "The ZIP runtime inventory differs from the validated central directory.");
  }

  const files = new Map<string, Uint8Array>();
  const expandedTotal = { value: 0 };

  for (const entry of entries) {
    const unsafeOriginalName = (entry as JSZip.JSZipObject & { unsafeOriginalName?: string }).unsafeOriginalName;
    if (unsafeOriginalName && unsafeOriginalName !== entry.name) {
      throw new SecurityValidationError("PROOFPACK_ZIP_UNSAFE_PATH", `Unsafe ZIP path rejected: ${unsafeOriginalName}.`);
    }

    const expected = preflight.entries.find((item) => item.name === entry.name);
    if (!expected) throw new SecurityValidationError("PROOFPACK_ZIP_INVALID", `Validated ZIP entry is missing: ${entry.name}.`);
    const bytes = await extractEntryBounded(entry, expandedTotal, expected);
    files.set(entry.name, bytes);
  }

  const manifestBytes = files.get("manifest.json");
  if (manifestBytes) {
    let manifest: { manifestVersion?: unknown } | undefined;
    try {
      manifest = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(manifestBytes));
    } catch {
      // The strict Master verifier will return the canonical unreadable-manifest finding.
    }
    if (manifest?.manifestVersion === "blackproof-proofpack-delivery-zip-v1") {
      const result = await verifyProofPackDeliveryZipFiles(files);
      if (commentMatch && (commentMatch[1] !== "blackproof-proofpack-delivery-zip-v1" || result.deliveryResult?.providedFingerprint !== commentMatch[2])) {
        throw new SecurityValidationError("PROOFPACK_ZIP_INVALID", "ZIP comment does not match the verified Delivery fingerprint.");
      }
      const deliveryBytes = files.get("delivery.json");
      if (!deliveryBytes) return result;
      try {
        return {
          ...result,
          deliveryJson: new TextDecoder("utf-8", { fatal: true }).decode(deliveryBytes),
        };
      } catch {
        return result;
      }
    }
  }
  const result = await verifyProofPackZipFiles(files);
  if (commentMatch && (commentMatch[1] === "blackproof-proofpack-delivery-zip-v1" || result.proofpackResult?.providedFingerprint !== commentMatch[2])) {
    throw new SecurityValidationError("PROOFPACK_ZIP_INVALID", "ZIP comment does not match the verified Master fingerprint.");
  }
  return result;
}
