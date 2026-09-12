import { describe, expect, it } from "vitest";

import {
  buildProofPackZipFiles,
  buildProofPackZipManifest,
  createProofCaseFromQuestionnaire,
  exportProofPackReadmeMarkdown,
  exportProofPackZipBundleMetadata,
  exportProofPackZipManifestJson,
  sha256Hex,
  stableStringify,
  verifyProofPackZipFiles,
  type ProofPackSourceImport,
  type ProofPackSourceLineage,
  type KnowledgeUse,
} from "./index";

const encode = (value: string) => new TextEncoder().encode(value);

async function replaceManifest(files: Map<string, Uint8Array>, manifest: any): Promise<void> {
  const { manifestFingerprint: _previous, ...manifestBase } = manifest;
  manifest.manifestFingerprint = `bp_sha256_${await sha256Hex(stableStringify(manifestBase))}`;
  files.set("manifest.json", encode(JSON.stringify(manifest, null, 2)));
}

async function replaceManifestFile(files: Map<string, Uint8Array>, manifest: any, filename: string, value: unknown): Promise<void> {
  const content = JSON.stringify(value, null, 2);
  files.set(filename, encode(content));
  const descriptor = manifest.files.find((file: { filename?: string }) => file.filename === filename);
  if (!descriptor) throw new Error(`Missing descriptor for ${filename}.`);
  descriptor.size = encode(content).byteLength;
  descriptor.sha256 = await sha256Hex(content);
  await replaceManifest(files, manifest);
}

async function buildZipFileMap(proofpack: Parameters<typeof buildProofPackZipFiles>[0]) {
  const files = new Map(
    buildProofPackZipFiles(proofpack).map((file) => [file.filename, encode(file.content)])
  );
  files.set("manifest.json", encode(await exportProofPackZipManifestJson(proofpack)));
  return files;
}

const xlsxSourceImport: ProofPackSourceImport = {
  profile: "blackproof-xlsx-import-v1",
  sourceFormat: "xlsx",
  selectedSheet: "Security Questionnaire",
  selectedColumn: 6,
  selectedColumnName: "Question ".repeat(38).trim(),
  formulaCount: 2,
  formulaWithoutCachedValueCount: 1,
  hiddenSheetCount: 1,
  externalLinkPartCount: 1,
  externalRelationshipCount: 1,
  connectionPartCount: 0,
  queryTablePartCount: 0,
  warnings: ["LOW_COLUMN_CONFIDENCE: revue humaine nécessaire"],
  questionSources: [{ question: "Avez-vous activé le MFA pour les comptes administrateurs?", source: "cached-formula-value", cellReference: "F3" }],
  ignoredFormulaCells: ["F4"],
};

describe("BLACKPROOF ProofPack ZIP metadata", () => {
  it("builds a manifest for a ProofPack ZIP export", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs ?"
    );

    const manifest = await buildProofPackZipManifest(result.proofpack);

    expect(manifest.product).toBe("BLACKPROOF");
    expect(manifest.manifestVersion).toBe("blackproof-proofpack-zip-v0.2.0-alpha");
    expect(manifest.sourceProfile).toBe("none");
    expect(manifest.proofpackFingerprint).toBe(result.proofpack.fingerprint);
    expect(manifest.manifestFingerprint).toMatch(/^bp_sha256_[a-f0-9]{64}$/);
    expect(manifest.files.some((file) => file.filename === "proofpack.json")).toBe(true);
    expect(manifest.files.some((file) => file.filename === "note-synthese.md")).toBe(true);
    expect(manifest.files.some((file) => file.filename === "methodology.json")).toBe(true);

    for (const file of manifest.files) {
      expect(file.size).toBeGreaterThan(0);
      expect(file.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("hashes every generated ZIP payload file in the manifest", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Disposez-vous d'un registre des fournisseurs critiques ?"
    );

    const files = buildProofPackZipFiles(result.proofpack);
    const manifest = await buildProofPackZipManifest(result.proofpack);

    expect(manifest.files.map((file) => file.filename).sort()).toEqual(
      files.map((file) => file.filename).sort()
    );

    for (const file of files) {
      const manifestFile = manifest.files.find((item) => item.filename === file.filename);

      expect(manifestFile).toBeDefined();
      expect(manifestFile?.size).toBe(new TextEncoder().encode(file.content).byteLength);
      expect(manifestFile?.sha256).toBe(await sha256Hex(file.content));
    }
  });

  it("exports manifest JSON", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Disposez-vous d'une procédure de sauvegarde documentée ?"
    );

    const parsed = JSON.parse(await exportProofPackZipManifestJson(result.proofpack));

    expect(parsed.product).toBe("BLACKPROOF");
    expect(parsed.proofpackFingerprint).toBe(result.proofpack.fingerprint);
    expect(parsed.files[0].sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(parsed.files[0].size).toBeGreaterThan(0);
  });

  it("exports a README containing verification instructions", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous une procédure de réponse à incident ?"
    );

    const readme = exportProofPackReadmeMarkdown(result.proofpack);

    expect(readme).toContain("ProofPack Master BLACKPROOF");
    expect(readme).toContain("Ne pas transmettre ce dossier maître à un tiers");
    expect(readme).toContain("Vérification");
    expect(readme).toContain(result.proofpack.fingerprint);
  });

  it("exports deterministic bundle metadata for the same manifest content shape", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Collectez-vous et conservez-vous les journaux de sécurité ?"
    );

    const metadata = await exportProofPackZipBundleMetadata(result.proofpack);

    expect(metadata).toContain("BLACKPROOF");
    expect(metadata).toContain(result.proofpack.fingerprint);
    expect(metadata).toContain("manifestFingerprint");
  });

  it("verifies the complete ZIP inventory, manifest and ProofPack chain", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs ?"
    );
    const verification = await verifyProofPackZipFiles(await buildZipFileMap(result.proofpack));

    expect(verification.isValid).toBe(true);
    expect(verification.validManifestSchema).toBe(true);
    expect(verification.validManifestFingerprint).toBe(true);
    expect(verification.validFileList).toBe(true);
    expect(verification.validFileSizes).toBe(true);
    expect(verification.validFileHashes).toBe(true);
    expect(verification.validProofPackFingerprintLink).toBe(true);
    expect(verification.validManifestMetadataLink).toBe(true);
    expect(verification.proofpackResult?.isValid).toBe(true);
  });

  it("inventories and semantically binds XLSX source-import.json to proofpack.json", async () => {
    const result = await createProofCaseFromQuestionnaire(
      `1. ${xlsxSourceImport.questionSources[0]!.question}`,
      { sourceFileName: "questionnaire.xlsx", sourceFormat: "unknown", sourceOriginalFileSha256: `sha256:${"a".repeat(64)}` }
    );
    const files = new Map(buildProofPackZipFiles(result.proofpack, xlsxSourceImport).map((file) => [file.filename, encode(file.content)]));
    files.set("manifest.json", encode(await exportProofPackZipManifestJson(result.proofpack, xlsxSourceImport)));

    const verification = await verifyProofPackZipFiles(files);
    expect(verification.isValid).toBe(true);
    expect(verification.validSourceImportLink).toBe(true);
    expect(verification.sourceImportPresent).toBe(true);
    expect(files.has("source-import.json")).toBe(true);
  });

  it("uses the same prefix normalization in XLSX production and ZIP verification", async () => {
    const prefixed = structuredClone(xlsxSourceImport);
    prefixed.questionSources[0]!.question = "Q1: Avez-vous activé le MFA pour les comptes administrateurs?";
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs?",
      { sourceFileName: "prefixed.xlsx", sourceFormat: "unknown", sourceOriginalFileSha256: `sha256:${"c".repeat(64)}` },
    );
    const files = new Map(buildProofPackZipFiles(result.proofpack, prefixed).map((file) => [file.filename, encode(file.content)]));
    files.set("manifest.json", encode(await exportProofPackZipManifestJson(result.proofpack, prefixed)));

    const verification = await verifyProofPackZipFiles(files);
    expect(verification.isValid).toBe(true);
    expect(verification.validSourceImportLink).toBe(true);
  });

  it("exports and verifies explicit lineage for an edited XLSX-derived text source", async () => {
    const originalFileSha256 = `sha256:${"d".repeat(64)}`;
    const result = await createProofCaseFromQuestionnaire("1. Le MFA est-il activé ?", {
      sourceFileName: "security-edited.txt",
      sourceFormat: "text",
      sourceOriginalFileSha256: originalFileSha256,
    });
    const lineage: ProofPackSourceLineage = {
      formatVersion: "blackproof-source-lineage-v1",
      derivation: "xlsx-text-edit",
      originalFileName: "security.xlsx",
      originalFileSha256,
      originalImportProfile: "blackproof-xlsx-import-v1",
      previousProofPackFingerprint: `bp_sha256_${"e".repeat(64)}`,
      derivedSourceFileName: result.proofpack.sourceQuestionnaire.fileName,
      derivedSourceSha256: result.proofpack.sourceQuestionnaire.normalizedQuestionnaireSha256!,
      derivedAt: "2026-07-13T00:00:00.000Z",
    };
    const files = new Map(buildProofPackZipFiles(result.proofpack, undefined, [], lineage).map((file) => [file.filename, encode(file.content)]));
    files.set("manifest.json", encode(await exportProofPackZipManifestJson(result.proofpack, undefined, [], lineage)));

    const verification = await verifyProofPackZipFiles(files);
    expect(verification.isValid).toBe(true);
    expect(verification.sourceLineagePresent).toBe(true);
    expect(verification.validSourceLineageLink).toBe(true);
    expect(new TextDecoder().decode(files.get("source-lineage.json"))).toContain(lineage.previousProofPackFingerprint);
  });

  it("requires source-import.json for new XLSX manifests but warns on legacy archives", async () => {
    const result = await createProofCaseFromQuestionnaire(`1. ${xlsxSourceImport.questionSources[0]!.question}`, {
      sourceFileName: "security.xlsx",
      sourceFormat: "unknown",
      sourceOriginalFileSha256: `sha256:${"a".repeat(64)}`,
    });
    const originalFiles = new Map(buildProofPackZipFiles(result.proofpack, xlsxSourceImport).map((file) => [file.filename, encode(file.content)]));
    const newManifest: any = await buildProofPackZipManifest(result.proofpack, xlsxSourceImport);
    originalFiles.delete("source-import.json");
    newManifest.files = newManifest.files.filter((file: { filename?: string }) => file.filename !== "source-import.json");
    await replaceManifest(originalFiles, newManifest);

    const current = await verifyProofPackZipFiles(originalFiles);
    expect(current.isValid).toBe(false);
    expect(current.validSourceImportLink).toBe(false);
    expect(current.findings.some((item) => item.code === "ZIP_SOURCE_IMPORT_REQUIRED")).toBe(true);

    const legacyFiles = new Map(originalFiles);
    const legacyManifest = structuredClone(newManifest);
    legacyManifest.manifestVersion = "blackproof-proofpack-zip-v0.1.0-alpha";
    delete legacyManifest.sourceProfile;
    await replaceManifest(legacyFiles, legacyManifest);
    const legacy = await verifyProofPackZipFiles(legacyFiles);
    expect(legacy.isValid).toBe(true);
    expect(legacy.sourceImportPresent).toBe(false);
    expect(legacy.findings).toContainEqual(expect.objectContaining({ code: "ZIP_SOURCE_IMPORT_LEGACY_MISSING", severity: "warning" }));
  });

  it("refuses XLSX provenance grafted onto CSV and impossible cell metadata", async () => {
    const csv = await createProofCaseFromQuestionnaire(`1. ${xlsxSourceImport.questionSources[0]!.question}`, {
      sourceFileName: "security.csv",
      sourceFormat: "csv",
      sourceOriginalFileSha256: `sha256:${"b".repeat(64)}`,
    });
    expect(() => buildProofPackZipFiles(csv.proofpack, xlsxSourceImport)).toThrow("SOURCE_IMPORT_REFUSED_FOR_NON_XLSX");
    const csvFiles = new Map(buildProofPackZipFiles(csv.proofpack).map((file) => [file.filename, encode(file.content)]));
    const csvManifest: any = await buildProofPackZipManifest(csv.proofpack);
    csvManifest.sourceProfile = "blackproof-xlsx-import-v1";
    csvManifest.files.push({ filename: "source-import.json", contentType: "application/json", size: 0, sha256: "0".repeat(64), purpose: "Injected XLSX provenance." });
    const csvGraft = {
      formatVersion: "blackproof-source-import-v1",
      caseId: csv.proofpack.case.id,
      sourceQuestionnaire: csv.proofpack.sourceQuestionnaire,
      ...xlsxSourceImport,
    };
    await replaceManifestFile(csvFiles, csvManifest, "source-import.json", csvGraft);
    const graftVerification = await verifyProofPackZipFiles(csvFiles);
    expect(graftVerification.isValid).toBe(false);
    expect(graftVerification.validFileHashes).toBe(true);
    expect(graftVerification.validSourceImportLink).toBe(false);

    const xlsx = await createProofCaseFromQuestionnaire(`1. ${xlsxSourceImport.questionSources[0]!.question}`, {
      sourceFileName: "security.xlsx",
      sourceFormat: "unknown",
      sourceOriginalFileSha256: `sha256:${"a".repeat(64)}`,
    });
    expect(() => buildProofPackZipFiles(xlsx.proofpack)).toThrow("SOURCE_IMPORT_REQUIRED_FOR_XLSX");

    const files = new Map(buildProofPackZipFiles(xlsx.proofpack, xlsxSourceImport).map((file) => [file.filename, encode(file.content)]));
    const manifest: any = await buildProofPackZipManifest(xlsx.proofpack, xlsxSourceImport);
    const sidecar = JSON.parse(new TextDecoder().decode(files.get("source-import.json")!));
    sidecar.questionSources[0].cellReference = "A999";
    sidecar.formulaCount = 0;
    sidecar.formulaWithoutCachedValueCount = 0;
    sidecar.ignoredFormulaCells = [];
    await replaceManifestFile(files, manifest, "source-import.json", sidecar);
    const invalid = await verifyProofPackZipFiles(files);
    expect(invalid.isValid).toBe(false);
    expect(invalid.validFileHashes).toBe(true);
    expect(invalid.validSourceImportLink).toBe(false);
    expect(invalid.findings.some((item) => item.code === "ZIP_SOURCE_IMPORT_SCHEMA_INVALID")).toBe(true);
  });

  it("refuses to produce a ZIP when a structurally valid XLSX sidecar describes other questions", async () => {
    const result = await createProofCaseFromQuestionnaire("1. Une question différente ?", {
      sourceFileName: "security.xlsx",
      sourceFormat: "unknown",
      sourceOriginalFileSha256: `sha256:${"a".repeat(64)}`,
    });
    expect(() => buildProofPackZipFiles(result.proofpack, xlsxSourceImport))
      .toThrow("SOURCE_IMPORT_LINK_QUESTION_MISMATCH");
  });

  it("inventories and binds personal knowledge provenance without changing proofpack v3", async () => {
    const result = await createProofCaseFromQuestionnaire("Le MFA est-il activé pour les administrateurs ?");
    const use: KnowledgeUse = {
      formatVersion: "blackproof-knowledge-use-v1",
      questionId: result.proofpack.questions[0]!.id,
      entryId: "knowledge_test",
      entryRevisionId: "knowledge_revision_test",
      entryFingerprint: `bp_sha256_${"a".repeat(64)}`,
      appliedAt: "2026-07-12T12:00:00.000Z",
    };
    const files = new Map(buildProofPackZipFiles(result.proofpack, undefined, [use]).map((file) => [file.filename, encode(file.content)]));
    files.set("manifest.json", encode(await exportProofPackZipManifestJson(result.proofpack, undefined, [use])));
    const verification = await verifyProofPackZipFiles(files);
    expect(verification.isValid).toBe(true);
    expect(verification.knowledgeUsePresent).toBe(true);
    expect(verification.validKnowledgeUseLink).toBe(true);
    expect(files.has("knowledge-use.json")).toBe(true);
    expect(new TextDecoder().decode(files.get("proofpack.json")!)).not.toContain("knowledgeUses");
    expect(() => buildProofPackZipFiles(result.proofpack, undefined, [{ ...use, entryId: "" }]))
      .toThrow("KNOWLEDGE_USE_LINK_INVALID");
  });

  it("rejects a rehashed source-import sidecar that no longer matches proofpack provenance", async () => {
    const result = await createProofCaseFromQuestionnaire(
      `1. ${xlsxSourceImport.questionSources[0]!.question}`,
      { sourceFileName: "questionnaire.xlsx", sourceFormat: "unknown", sourceOriginalFileSha256: `sha256:${"a".repeat(64)}` }
    );
    const files = new Map(buildProofPackZipFiles(result.proofpack, xlsxSourceImport).map((file) => [file.filename, encode(file.content)]));
    const manifest = await buildProofPackZipManifest(result.proofpack, xlsxSourceImport);
    const sourceImport = JSON.parse(new TextDecoder().decode(files.get("source-import.json")!));
    sourceImport.sourceQuestionnaire.fileName = "other.xlsx";
    const changed = JSON.stringify(sourceImport, null, 2);
    files.set("source-import.json", encode(changed));
    const descriptor = manifest.files.find((file) => file.filename === "source-import.json")!;
    descriptor.size = encode(changed).byteLength;
    descriptor.sha256 = await sha256Hex(changed);
    const { manifestFingerprint: _old, ...manifestBase } = manifest;
    manifest.manifestFingerprint = `bp_sha256_${await sha256Hex(stableStringify(manifestBase))}`;
    files.set("manifest.json", encode(JSON.stringify(manifest, null, 2)));

    const verification = await verifyProofPackZipFiles(files);
    expect(verification.isValid).toBe(false);
    expect(verification.validFileHashes).toBe(true);
    expect(verification.validSourceImportLink).toBe(false);
    expect(verification.findings.some((item) => item.code === "ZIP_SOURCE_IMPORT_LINK_MISMATCH")).toBe(true);
  });

  it("rejects unexpected and modified ZIP payload files", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Disposez-vous d'une procédure de sauvegarde documentée ?"
    );
    const files = await buildZipFileMap(result.proofpack);
    files.set("note-synthese.md", encode("Contenu modifié."));
    files.set("unexpected.txt", encode("Fichier injecté."));

    const verification = await verifyProofPackZipFiles(files);

    expect(verification.isValid).toBe(false);
    expect(verification.validFileList).toBe(false);
    expect(verification.validFileSizes).toBe(false);
    expect(verification.validFileHashes).toBe(false);
    expect(verification.findings.map((item) => item.code)).toEqual(expect.arrayContaining([
      "ZIP_FILE_UNEXPECTED",
      "ZIP_FILE_SIZE_MISMATCH",
      "ZIP_FILE_HASH_MISMATCH",
    ]));
  });

  it("rejects a recalculated payload when the manifest fingerprint is stale", async () => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous une procédure de réponse à incident ?"
    );
    const files = await buildZipFileMap(result.proofpack);
    const manifest = JSON.parse(new TextDecoder().decode(files.get("manifest.json")!));
    manifest.caseTitle = "Titre altéré";
    files.set("manifest.json", encode(JSON.stringify(manifest, null, 2)));

    const verification = await verifyProofPackZipFiles(files);

    expect(verification.isValid).toBe(false);
    expect(verification.validManifestFingerprint).toBe(false);
    expect(verification.findings.some((item) => item.code === "ZIP_MANIFEST_FINGERPRINT_MISMATCH")).toBe(true);
  });

  it.each([
    ["caseId", "case_misleading"],
    ["caseTitle", "Titre trompeur"],
    ["methodVersion", "blackproof-method-misleading"],
  ])("rejects manifest %s metadata even with a recomputed manifest fingerprint", async (field, value) => {
    const result = await createProofCaseFromQuestionnaire(
      "1. Avez-vous activé le MFA pour les comptes administrateurs ?"
    );
    const files = await buildZipFileMap(result.proofpack);
    const manifest = JSON.parse(new TextDecoder().decode(files.get("manifest.json")!));
    manifest[field] = value;
    const { manifestFingerprint: _previous, ...base } = manifest;
    manifest.manifestFingerprint = `bp_sha256_${await sha256Hex(stableStringify(base))}`;
    files.set("manifest.json", encode(JSON.stringify(manifest, null, 2)));

    const verification = await verifyProofPackZipFiles(files);

    expect(verification.isValid).toBe(false);
    expect(verification.validManifestFingerprint).toBe(true);
    expect(verification.validProofPackFingerprintLink).toBe(true);
    expect(verification.validManifestMetadataLink).toBe(false);
    expect(verification.findings.some((item) => item.code === "ZIP_MANIFEST_METADATA_LINK_MISMATCH")).toBe(true);
  });
});
