import { describe, expect, it } from "vitest";
import JSZip from "jszip";

import { inspectZipCentralDirectory } from "./zip-preflight";

const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const EOCD_SIGNATURE = 0x06054b50;

async function buildZip(names: string[]): Promise<Uint8Array> {
  const zip = new JSZip();
  names.forEach((name) => zip.file(name, "", { createFolders: false }));
  return zip.generateAsync({ type: "uint8array", compression: "STORE" });
}

function blobFrom(bytes: Uint8Array): Blob {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new Blob([buffer]);
}

function findSignature(bytes: Uint8Array, signature: number, from = 0): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = from; offset <= bytes.byteLength - 4; offset += 1) {
    if (view.getUint32(offset, true) === signature) return offset;
  }
  throw new Error(`Signature ZIP introuvable : ${signature.toString(16)}`);
}

function insertByte(bytes: Uint8Array, offset: number): Uint8Array {
  const result = new Uint8Array(bytes.byteLength + 1);
  result.set(bytes.subarray(0, offset), 0);
  result[offset] = 0x41;
  result.set(bytes.subarray(offset), offset + 1);
  return result;
}

describe("ZIP central-directory preflight", () => {
  it("accepts a regular archive at the BLACKPROOF entry limit", async () => {
    const bytes = await buildZip(Array.from({ length: 254 }, (_, index) => `entry-${index}.json`));
    const result = await inspectZipCentralDirectory(blobFrom(bytes), 254);

    expect(result.entryCount).toBe(254);
    expect(result.names).toHaveLength(254);
  });

  it("rejects too many entries before JSZip materializes them", async () => {
    const bytes = await buildZip(Array.from({ length: 255 }, (_, index) => `entry-${index}.json`));

    await expect(inspectZipCentralDirectory(blobFrom(bytes), 254)).rejects.toThrow("trop d’entrées");
  });

  it("rejects duplicate names from the real central directory", async () => {
    const bytes = await buildZip(["master.json", "second.json"]);
    const first = findSignature(bytes, CENTRAL_DIRECTORY_SIGNATURE);
    const second = findSignature(bytes, CENTRAL_DIRECTORY_SIGNATURE, first + 4);
    bytes.set(new TextEncoder().encode("master.json"), second + 46);

    await expect(inspectZipCentralDirectory(blobFrom(bytes), 254)).rejects.toThrow("dupliqué");
  });

  it("rejects a central name that differs from its local header name", async () => {
    const bytes = await buildZip(["master.json"]);
    const central = findSignature(bytes, CENTRAL_DIRECTORY_SIGNATURE);
    bytes.set(new TextEncoder().encode("shadow.json"), central + 46);

    await expect(inspectZipCentralDirectory(blobFrom(bytes), 254)).rejects.toThrow("diffère du nom central");
  });

  it("rejects duplicate local-header offsets", async () => {
    const bytes = await buildZip(["master.json", "second.json"]);
    const first = findSignature(bytes, CENTRAL_DIRECTORY_SIGNATURE);
    const second = findSignature(bytes, CENTRAL_DIRECTORY_SIGNATURE, first + 4);
    const view = new DataView(bytes.buffer);
    view.setUint32(second + 42, view.getUint32(first + 42, true), true);

    await expect(inspectZipCentralDirectory(blobFrom(bytes), 254)).rejects.toThrow("Offset d’en-tête local ZIP dupliqué");
  });

  it("rejects central and local compression or flag mismatches", async () => {
    const source = await buildZip(["master.json"]);
    const central = findSignature(source, CENTRAL_DIRECTORY_SIGNATURE);

    const compressionMismatch = source.slice();
    new DataView(compressionMismatch.buffer).setUint16(central + 10, 8, true);
    await expect(inspectZipCentralDirectory(blobFrom(compressionMismatch), 254)).rejects.toThrow("compression ZIP locale diffère");

    const flagMismatch = source.slice();
    new DataView(flagMismatch.buffer).setUint16(central + 8, 0x0008, true);
    await expect(inspectZipCentralDirectory(blobFrom(flagMismatch), 254)).rejects.toThrow("flags ZIP locaux diffèrent");
  });

  it("rejects data descriptors even when local and central flags agree", async () => {
    const bytes = await buildZip(["master.json"]);
    const central = findSignature(bytes, CENTRAL_DIRECTORY_SIGNATURE);
    const view = new DataView(bytes.buffer);
    const local = view.getUint32(central + 42, true);
    view.setUint16(central + 8, 0x0008, true);
    view.setUint16(local + 6, 0x0008, true);

    await expect(inspectZipCentralDirectory(blobFrom(bytes), 254)).rejects.toThrow("data descriptors ZIP ne sont pas pris en charge");
  });

  it("rejects overlapping local entry ranges", async () => {
    const bytes = await buildZip(["master.json", "second.json"]);
    const firstCentral = findSignature(bytes, CENTRAL_DIRECTORY_SIGNATURE);
    const view = new DataView(bytes.buffer);
    const firstLocal = view.getUint32(firstCentral + 42, true);
    view.setUint32(firstCentral + 20, 1, true);
    view.setUint32(firstLocal + 18, 1, true);

    await expect(inspectZipCentralDirectory(blobFrom(bytes), 254)).rejects.toThrow("Plages d’entrées ZIP locales chevauchées");
  });

  it("rejects entry names longer than the BLACKPROOF format permits", async () => {
    const bytes = await buildZip([`${"a".repeat(181)}.json`]);

    await expect(inspectZipCentralDirectory(blobFrom(bytes), 254)).rejects.toThrow("Nom d’entrée ZIP trop long");
  });

  it("rejects multi-disk and ZIP64 markers", async () => {
    const source = await buildZip(["master.json"]);
    const eocd = findSignature(source, EOCD_SIGNATURE);
    const multiDisk = source.slice();
    new DataView(multiDisk.buffer).setUint16(eocd + 4, 1, true);
    await expect(inspectZipCentralDirectory(blobFrom(multiDisk), 254)).rejects.toThrow("multi-disques");

    const zip64 = source.slice();
    new DataView(zip64.buffer).setUint16(eocd + 10, 0xffff, true);
    await expect(inspectZipCentralDirectory(blobFrom(zip64), 254)).rejects.toThrow("ZIP64");
  });

  it("rejects an impossible central-directory position", async () => {
    const bytes = await buildZip(["master.json"]);
    const eocd = findSignature(bytes, EOCD_SIGNATURE);
    new DataView(bytes.buffer).setUint32(eocd + 16, eocd + 1, true);

    await expect(inspectZipCentralDirectory(blobFrom(bytes), 254)).rejects.toThrow("Table centrale ZIP invalide");
  });

  it("rejects prefixes and unused gaps around local entries", async () => {
    const source = await buildZip(["master.json"]);
    const prefixed = insertByte(source, 0);
    const prefixedCentral = findSignature(prefixed, CENTRAL_DIRECTORY_SIGNATURE);
    const prefixedEocd = findSignature(prefixed, EOCD_SIGNATURE);
    const prefixedView = new DataView(prefixed.buffer);
    prefixedView.setUint32(prefixedCentral + 42, prefixedView.getUint32(prefixedCentral + 42, true) + 1, true);
    prefixedView.setUint32(prefixedEocd + 16, prefixedView.getUint32(prefixedEocd + 16, true) + 1, true);
    await expect(inspectZipCentralDirectory(blobFrom(prefixed), 254)).rejects.toThrow("Préfixe");

    const central = findSignature(source, CENTRAL_DIRECTORY_SIGNATURE);
    const gap = insertByte(source, central);
    const gapEocd = findSignature(gap, EOCD_SIGNATURE);
    new DataView(gap.buffer).setUint32(gapEocd + 16, central + 1, true);
    await expect(inspectZipCentralDirectory(blobFrom(gap), 254)).rejects.toThrow("Espace inutilisé avant la table centrale");
  });

  it("bounds comments and rejects extra fields, non-canonical flags and compression methods", async () => {
    const source = await buildZip(["master.json"]);
    const eocd = findSignature(source, EOCD_SIGNATURE);
    const commented = insertByte(source, source.byteLength);
    new DataView(commented.buffer).setUint16(eocd + 20, 1, true);
    await expect(inspectZipCentralDirectory(blobFrom(commented), 254)).resolves.toMatchObject({ comment: "A" });

    const oversizedComment = new Uint8Array(source.byteLength + 161);
    oversizedComment.set(source);
    oversizedComment.fill(0x41, source.byteLength);
    new DataView(oversizedComment.buffer).setUint16(eocd + 20, 161, true);
    await expect(inspectZipCentralDirectory(blobFrom(oversizedComment), 254)).rejects.toThrow("Commentaire EOCD ZIP trop volumineux");

    const central = findSignature(source, CENTRAL_DIRECTORY_SIGNATURE);
    const centralNameLength = new DataView(source.buffer).getUint16(central + 28, true);
    const withExtra = insertByte(source, central + 46 + centralNameLength);
    const extraView = new DataView(withExtra.buffer);
    extraView.setUint16(central + 30, 1, true);
    const extraEocd = findSignature(withExtra, EOCD_SIGNATURE);
    extraView.setUint32(extraEocd + 12, extraView.getUint32(extraEocd + 12, true) + 1, true);
    await expect(inspectZipCentralDirectory(blobFrom(withExtra), 254)).rejects.toThrow("Champs extra");

    const flags = source.slice();
    const flagsView = new DataView(flags.buffer);
    const local = flagsView.getUint32(central + 42, true);
    flagsView.setUint16(central + 8, 0x0001, true);
    flagsView.setUint16(local + 6, 0x0001, true);
    await expect(inspectZipCentralDirectory(blobFrom(flags), 254)).rejects.toThrow("Flags ZIP non autorisés");

    const compression = source.slice();
    const compressionView = new DataView(compression.buffer);
    compressionView.setUint16(central + 10, 12, true);
    compressionView.setUint16(local + 8, 12, true);
    await expect(inspectZipCentralDirectory(blobFrom(compression), 254)).rejects.toThrow("Méthode de compression ZIP non autorisée");
  });
});
