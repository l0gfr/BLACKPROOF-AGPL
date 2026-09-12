import { describe, expect, it } from "vitest";

import { createProofCaseFromQuestionnaire, sha256Hex, stableStringify, type ProofPack } from "@blackproof/core";
import { LOCAL_ENVELOPE_VERSION, LocalQuestionnaireBindingError, LocalQuestionnaireCanonicalizationError, assertLocalProofCaseRecord, migrateCanonicalLocalProofCaseRecord, normalizeLegacyLocalProofCaseRecord, verifyLocalQuestionnaireBinding, type LocalProofCaseRecord } from "./local-db";

function localRecord(): LocalProofCaseRecord {
  const proofpack = {
    case: {
      id: "case_test",
      title: "Dossier canonique",
      companyName: "Entreprise",
      clientName: "Client",
      createdAt: "2026-07-12T00:00:00.000Z",
      updatedAt: "2026-07-12T01:00:00.000Z",
    },
    fingerprint: "a".repeat(64),
    methodVersion: "test",
    sourceQuestionnaire: {
      sha256: "sha256:eba9e2c82b451da657e3900255e9a91880712926eb173fe2ab8dd9e3ebce7c9e",
      normalizedQuestionnaireSha256: "sha256:eba9e2c82b451da657e3900255e9a91880712926eb173fe2ab8dd9e3ebce7c9e",
      size: new TextEncoder().encode("Questionnaire").length,
    },
    summary: {
      questionCount: 1,
      evidenceCount: 2,
      proofDebtCount: 3,
      proofDebtScore: 42,
    },
  } as ProofPack;
  return {
    localEnvelopeVersion: LOCAL_ENVELOPE_VERSION,
    id: proofpack.case.id,
    title: proofpack.case.title,
    companyName: proofpack.case.companyName,
    clientName: proofpack.case.clientName,
    questionnaire: "Questionnaire",
    proofpackFingerprint: proofpack.fingerprint,
    proofDebtScore: proofpack.summary.proofDebtScore,
    questionCount: proofpack.summary.questionCount,
    evidenceCount: proofpack.summary.evidenceCount,
    proofDebtCount: proofpack.summary.proofDebtCount,
    createdAt: proofpack.case.createdAt,
    updatedAt: proofpack.case.updatedAt,
    methodVersion: proofpack.methodVersion,
    proofpack,
  };
}

describe("local ProofPack envelope", () => {
  it("binds display metadata and dates to the embedded ProofPack", () => {
    const record = localRecord();
    expect(() => assertLocalProofCaseRecord(record)).not.toThrow();

    for (const mismatch of [
      { title: "Titre substitué" },
      { companyName: "Autre entreprise" },
      { clientName: "Autre client" },
      { createdAt: "2026-07-11T00:00:00.000Z" },
      { updatedAt: "2026-07-13T00:00:00.000Z" },
    ]) {
      expect(() => assertLocalProofCaseRecord({ ...record, ...mismatch })).toThrow("L’enveloppe du dossier local ne correspond pas à son ProofPack");
    }
  });

  it("normalizes only the version 13 update timestamp divergence", () => {
    const record = localRecord();
    const { localEnvelopeVersion: _version, ...legacyRecord } = record;
    const legacy = { ...legacyRecord, updatedAt: "2026-07-12T01:00:01.000Z" } as LocalProofCaseRecord;
    const normalized = normalizeLegacyLocalProofCaseRecord(legacy);

    expect(normalized.migrated).toBe(true);
    expect(normalized.record.updatedAt).toBe(record.proofpack.case.updatedAt);
    expect(() => assertLocalProofCaseRecord(normalized.record)).not.toThrow();
  });

  it("refuses metadata substitution disguised as a legacy envelope", () => {
    const record = localRecord();
    const { localEnvelopeVersion: _version, ...legacyRecord } = record;
    const legacyTimestamp = "2026-07-12T01:00:01.000Z";

    for (const mismatch of [
      { title: "Titre substitué" },
      { companyName: "Autre entreprise" },
      { clientName: "Autre client" },
      { createdAt: "2026-07-11T00:00:00.000Z" },
      { proofpackFingerprint: "b".repeat(64) },
      { questionCount: 999 },
    ]) {
      expect(() => normalizeLegacyLocalProofCaseRecord({ ...legacyRecord, updatedAt: legacyTimestamp, ...mismatch } as LocalProofCaseRecord))
        .toThrow("L’enveloppe du dossier local ne correspond pas à son ProofPack");
    }
  });

  it("refuses an envelope timestamp older than the embedded ProofPack", () => {
    const record = localRecord();
    const { localEnvelopeVersion: _version, ...legacyRecord } = record;
    expect(() => normalizeLegacyLocalProofCaseRecord({ ...legacyRecord, updatedAt: "2026-07-12T00:59:59.000Z" } as LocalProofCaseRecord))
      .toThrow("L’enveloppe du dossier local ne correspond pas à son ProofPack");
  });

  it("adds the explicit envelope version to canonical legacy records", () => {
    const record = localRecord();
    const { localEnvelopeVersion: _version, ...legacyRecord } = record;
    const normalized = normalizeLegacyLocalProofCaseRecord(legacyRecord as LocalProofCaseRecord);
    expect(normalized).toMatchObject({ migrated: true, record: { localEnvelopeVersion: 2 } });
  });

  it("migrates an explicitly declared version 1 envelope", () => {
    const record = localRecord();
    const normalized = normalizeLegacyLocalProofCaseRecord({ ...record, localEnvelopeVersion: 1 } as unknown as LocalProofCaseRecord);
    expect(normalized).toMatchObject({ migrated: true, record: { localEnvelopeVersion: 2 } });
  });

  it("rejects unknown declared envelope versions", () => {
    const record = localRecord();
    expect(() => normalizeLegacyLocalProofCaseRecord({ ...record, localEnvelopeVersion: 99 } as unknown as LocalProofCaseRecord))
      .toThrow("Version d’enveloppe locale non prise en charge");
  });

  it("binds the local questionnaire to the analyzed source hash", async () => {
    const record = localRecord();
    await expect(verifyLocalQuestionnaireBinding(record.questionnaire, record.proofpack)).resolves.toBeUndefined();
    await expect(verifyLocalQuestionnaireBinding("Questionnaire altéré", record.proofpack)).rejects.toBeInstanceOf(LocalQuestionnaireBindingError);
  });

  it("refuses a non-canonical questionnaire even when its canonical hash matches", async () => {
    const record = localRecord();
    const nonCanonical = " \u202eＱu\u0001estionnaire\t";

    await expect(verifyLocalQuestionnaireBinding(nonCanonical, record.proofpack))
      .rejects.toBeInstanceOf(LocalQuestionnaireCanonicalizationError);
    expect(() => assertLocalProofCaseRecord({ ...record, questionnaire: nonCanonical }))
      .toThrow(LocalQuestionnaireCanonicalizationError);
  });

  it("migrates bidi, control, NFKC and peripheral whitespace variants to the exact hashed text", async () => {
    const record = localRecord();
    const nonCanonical = " \u202eＱu\u0001estionnaire\t";
    const normalized = normalizeLegacyLocalProofCaseRecord({ ...record, questionnaire: nonCanonical });

    expect(normalized).toMatchObject({
      migrated: true,
      questionnaireCanonicalized: true,
      record: { questionnaire: "Questionnaire" },
    });
    await expect(verifyLocalQuestionnaireBinding(normalized.record.questionnaire, normalized.record.proofpack))
      .resolves.toBeUndefined();
  });

  it("authenticates a historical CRLF source before creating a new LF-bound revision", async () => {
    const lf = "1. Le MFA est-il activé ?\n2. Les sauvegardes sont-elles testées ?";
    const crlf = lf.replace(/\n/g, "\r\n");
    const result = await createProofCaseFromQuestionnaire(lf);
    const originalFileSha256 = `sha256:${await sha256Hex("fichier original Windows")}`;
    const legacySourceSha256 = `sha256:${await sha256Hex(crlf)}`;
    const legacyBase = {
      ...result.proofpack,
      sourceQuestionnaire: {
        ...result.proofpack.sourceQuestionnaire,
        sha256: legacySourceSha256,
        normalizedQuestionnaireSha256: legacySourceSha256,
        originalFileSha256,
        size: new TextEncoder().encode(crlf).length,
      },
    };
    const { fingerprint: _fingerprint, ...legacyFingerprintBase } = legacyBase;
    const legacyProofpack = {
      ...legacyBase,
      fingerprint: `bp_sha256_${await sha256Hex(stableStringify(legacyFingerprintBase))}`,
    };
    const record: LocalProofCaseRecord = {
      localEnvelopeVersion: LOCAL_ENVELOPE_VERSION,
      id: legacyProofpack.case.id,
      title: legacyProofpack.case.title,
      companyName: legacyProofpack.case.companyName,
      clientName: legacyProofpack.case.clientName,
      questionnaire: crlf,
      proofpackFingerprint: legacyProofpack.fingerprint,
      proofDebtScore: legacyProofpack.summary.proofDebtScore,
      questionCount: legacyProofpack.summary.questionCount,
      evidenceCount: legacyProofpack.summary.evidenceCount,
      proofDebtCount: legacyProofpack.summary.proofDebtCount,
      createdAt: legacyProofpack.case.createdAt,
      updatedAt: legacyProofpack.case.updatedAt,
      methodVersion: legacyProofpack.methodVersion,
      proofpack: legacyProofpack,
    };

    const migrated = await migrateCanonicalLocalProofCaseRecord(record);
    const expectedLfSha256 = `sha256:${await sha256Hex(lf)}`;

    expect(migrated).toMatchObject({
      migrated: true,
      questionnaireCanonicalized: true,
      proofpackRevisionMigrated: true,
      record: { questionnaire: lf },
    });
    expect(migrated.record.proofpack.id).toBe(legacyProofpack.id);
    expect(migrated.record.proofpack.revisionId).not.toBe(legacyProofpack.revisionId);
    expect(migrated.record.proofpack.fingerprint).not.toBe(legacyProofpack.fingerprint);
    expect(migrated.record.proofpack.sourceQuestionnaire).toMatchObject({
      sha256: expectedLfSha256,
      normalizedQuestionnaireSha256: expectedLfSha256,
      originalFileSha256,
      canonicalizationVersion: "blackproof-questionnaire-canonicalization-v2",
      size: new TextEncoder().encode(lf).length,
    });
    await expect(verifyLocalQuestionnaireBinding(lf, migrated.record.proofpack)).resolves.toBeUndefined();
  });
});
