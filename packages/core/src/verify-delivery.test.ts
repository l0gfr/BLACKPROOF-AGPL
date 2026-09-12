import { describe, expect, it } from "vitest";
import historicalDeliveryV4 from "./fixtures/proofpack-delivery-v4-historical.json";
import {
  buildProofPackDelivery, buildProofPackDeliveryManifest, buildProofPackDeliverySchemaCorpus, buildProofPackDeliveryZipFiles,
  createProofCaseFromQuestionnaire, exportProofPackDeliveryJson, sha256Hex, stableStringify,
  verifyProofPackDeliveryJson, verifyProofPackDeliveryZipFiles,
} from "./index";

const encode = (value: string) => new TextEncoder().encode(value);

async function fixture() {
  const master = await createProofCaseFromQuestionnaire("1. Le MFA est-il activé pour les administrateurs ?");
  master.questions[0]!.answerText = "Le MFA est activé.";
  master.questions[0]!.answerExportStatus = "ready";
  const delivery = await buildProofPackDelivery(master.proofpack, { questionIds: [master.questions[0]!.id], evidenceIds: [], confirmed: true });
  return delivery;
}

async function zipMap(delivery: Awaited<ReturnType<typeof fixture>>) {
  const files = new Map(buildProofPackDeliveryZipFiles(delivery).map((file) => [file.filename, encode(file.content)]));
  files.set("manifest.json", encode(JSON.stringify(await buildProofPackDeliveryManifest(delivery), null, 2)));
  return files;
}

async function rebindManifestFile(files: Map<string, Uint8Array>, filename: string): Promise<void> {
  const manifest = JSON.parse(new TextDecoder().decode(files.get("manifest.json")!));
  const bytes = files.get(filename)!;
  const descriptor = manifest.files.find((item: { filename: string }) => item.filename === filename);
  descriptor.size = bytes.byteLength;
  descriptor.sha256 = await sha256Hex(bytes);
  const { manifestFingerprint: _old, ...base } = manifest;
  manifest.manifestFingerprint = `bp_sha256_${await sha256Hex(stableStringify(base))}`;
  files.set("manifest.json", encode(JSON.stringify(manifest, null, 2)));
}

describe("ProofPack Delivery verifier", () => {
  it("keeps the frozen pre-registry Delivery V4 fixture verifiable", async () => {
    const result = await verifyProofPackDeliveryJson(JSON.stringify(historicalDeliveryV4));
    expect(result.isValid).toBe(true);
    expect(result.validSchema).toBe(true);
    expect(result.validFingerprint).toBe(true);
  });

  it("keeps a frozen pre-registry Delivery V4 ZIP verifiable", async () => {
    const files = await zipMap(historicalDeliveryV4 as any);
    const result = await verifyProofPackDeliveryZipFiles(files);
    expect(result.isValid).toBe(true);
    expect(result.deliveryResult?.validSchema).toBe(true);
    expect(result.deliveryResult?.validFingerprint).toBe(true);
  });
  it("applies the shared Delivery schema corpus with strict date-time semantics", async () => {
    const delivery = await fixture();
    for (const corpusCase of buildProofPackDeliverySchemaCorpus(delivery)) {
      const result = await verifyProofPackDeliveryJson(JSON.stringify(corpusCase.payload));
      expect(result.validSchema, corpusCase.id).toBe(corpusCase.expectedValid);
    }
  });

  it("rejects a date-only generatedAt even with a recomputed fingerprint", async () => {
    const delivery = await fixture();
    (delivery as any).generatedAt = "2026-07-11";
    const { fingerprint: _old, ...base } = delivery;
    delivery.fingerprint = `bp_sha256_${await sha256Hex(stableStringify(base))}`;

    const result = await verifyProofPackDeliveryJson(JSON.stringify(delivery));
    expect(result.validSchema).toBe(false);
    expect(result.findings.some((item) => item.code === "DELIVERY_SCHEMA_INVALID_FORMAT" && item.pointer === "/generatedAt")).toBe(true);
  });

  it("verifies Delivery JSON and ZIP", async () => {
    const delivery = await fixture();
    expect((await verifyProofPackDeliveryJson(exportProofPackDeliveryJson(delivery))).isValid).toBe(true);
    const zip = await verifyProofPackDeliveryZipFiles(await zipMap(delivery));
    expect(zip.isValid).toBe(true);
    expect(zip.validCanonicalSidecars).toBe(true);
    expect(zip.validDeliveryFingerprintLink).toBe(true);
    expect(zip.validManifestMetadataLink).toBe(true);
    expect((await buildProofPackDeliveryManifest(delivery)).generatedAt).toBe(delivery.generatedAt);
  });

  it("rejects a manifest generatedAt altered with a recomputed fingerprint", async () => {
    const files = await zipMap(await fixture());
    const manifest = JSON.parse(new TextDecoder().decode(files.get("manifest.json")!));
    manifest.generatedAt = "2039-01-01T00:00:00.000Z";
    const { manifestFingerprint: _old, ...base } = manifest;
    manifest.manifestFingerprint = `bp_sha256_${await sha256Hex(stableStringify(base))}`;
    files.set("manifest.json", encode(JSON.stringify(manifest, null, 2)));

    const result = await verifyProofPackDeliveryZipFiles(files);
    expect(result.isValid).toBe(false);
    expect(result.validManifestFingerprint).toBe(true);
    expect(result.validManifestMetadataLink).toBe(false);
    expect(result.findings).toContainEqual(expect.objectContaining({
      code: "DELIVERY_ZIP_METADATA_LINK_MISMATCH",
      pointer: "/manifest.json/generatedAt",
    }));
  });

  it("keeps legacy Delivery v1 JSON verifiable", async () => {
    const current = await fixture();
    const {
      deliveryId: _deliveryId,
      methodVersion: _methodVersion,
      schemaVersion: _schemaVersion,
      schemaUrl: _schemaUrl,
      verificationProfile: _verificationProfile,
      fingerprint: _currentFingerprint,
      ...currentWithoutV4Fields
    } = current;
    const legacyBase = {
      ...currentWithoutV4Fields,
      formatVersion: "blackproof-proofpack-delivery-v1",
      sourceMasterFingerprint: `bp_sha256_${"1".repeat(64)}`,
      questions: current.questions.map((question) => ({
        ...question,
        category: "access-control" as const,
        criticality: "critical" as const,
        evidence: [{
          id: "ev_legacy_reference",
          title: "Politique MFA",
          category: "access-control" as const,
          disclosure: "reference-only" as const,
        }],
      })),
    };
    const legacy = {
      ...legacyBase,
      fingerprint: `bp_sha256_${await sha256Hex(stableStringify(legacyBase))}`,
    };

    expect((await verifyProofPackDeliveryJson(JSON.stringify(legacy))).isValid).toBe(true);
  });

  it("keeps legacy Delivery v3 JSON verifiable", async () => {
    const current = await fixture();
    const {
      methodVersion: _methodVersion,
      schemaVersion: _schemaVersion,
      schemaUrl: _schemaUrl,
      verificationProfile: _verificationProfile,
      fingerprint: _currentFingerprint,
      ...v3Fields
    } = current;
    const v3Base = {
      ...v3Fields,
      formatVersion: "blackproof-proofpack-delivery-v3",
      questions: current.questions.map((question) => ({
        ...question,
        category: "access-control" as const,
        criticality: "critical" as const,
      })),
    };
    const v3 = { ...v3Base, fingerprint: `bp_sha256_${await sha256Hex(stableStringify(v3Base))}` };

    expect((await verifyProofPackDeliveryJson(JSON.stringify(v3))).isValid).toBe(true);
  });

  it("rejects altered verification limits even with a recomputed fingerprint", async () => {
    const delivery = structuredClone(await fixture()) as any;
    delivery.verificationProfile.doesNotVerify.pop();
    const { fingerprint: _old, ...base } = delivery;
    delivery.fingerprint = `bp_sha256_${await sha256Hex(stableStringify(base))}`;

    const result = await verifyProofPackDeliveryJson(JSON.stringify(delivery));
    expect(result.isValid).toBe(false);
    expect(result.validSchema).toBe(false);
  });

  it("rejects tampered Delivery content", async () => {
    const delivery = await fixture();
    delivery.questions[0]!.answer = "Réponse falsifiée";
    const result = await verifyProofPackDeliveryJson(JSON.stringify(delivery));
    expect(result.isValid).toBe(false);
    expect(result.validFingerprint).toBe(false);
  });

  it("rejects duplicate references even with a recomputed fingerprint", async () => {
    const delivery = await fixture();
    const evidence = { id: `evidence_${"a".repeat(32)}`, title: "Attestation", category: "access-control" as const, disclosure: "reference-only" as const, publicReference: "Attestation publique" };
    delivery.questions[0]!.evidence = [evidence, evidence];
    const { fingerprint: _old, ...base } = delivery;
    delivery.fingerprint = `bp_sha256_${await sha256Hex(stableStringify(base))}`;
    const result = await verifyProofPackDeliveryJson(JSON.stringify(delivery));
    expect(result.isValid).toBe(false);
    expect(result.validFingerprint).toBe(true);
    expect(result.validLinks).toBe(false);
  });

  it("rejects unexpected and hash-modified ZIP files", async () => {
    const files = await zipMap(await fixture());
    files.set("README.md", encode("altéré"));
    files.set("unexpected.txt", encode("injecté"));
    const result = await verifyProofPackDeliveryZipFiles(files);
    expect(result.isValid).toBe(false);
    expect(result.validFileList).toBe(false);
    expect(result.validFileHashes).toBe(false);
  });

  it("rejects non-canonical human-readable sidecars even when the manifest is recomputed", async () => {
    const delivery = await fixture();
    for (const filename of ["README.md", "reponse-fournisseur.md", "references-preuves.csv"]) {
      const files = await zipMap(delivery);
      files.set(filename, encode(`Contenu non canonique pour ${filename}.`));
      await rebindManifestFile(files, filename);

      const result = await verifyProofPackDeliveryZipFiles(files);
      expect(result.validManifestFingerprint, filename).toBe(true);
      expect(result.validFileHashes, filename).toBe(true);
      expect(result.validCanonicalSidecars, filename).toBe(false);
      expect(result.isValid, filename).toBe(false);
    }
  });
});
