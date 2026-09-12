import Dexie, { type Table } from "dexie";

import {
  SECURITY_LIMITS,
  SecurityValidationError,
  buildProofPack,
  buildQuestionnaireSource,
  assertProofPackSourceImportLink,
  assertProofPackSourceLineage,
  assertProofPackKnowledgeUseLink,
  sanitizeQuestionnaireInput,
  sha256Hex,
  type ProofPack,
  type ProofPackSourceImport,
  type ProofPackSourceLineage,
  type KnowledgeUse,
  verifyProofPackJson,
  verifyProofPackDeliveryJson,
  verifyQuestionnaireSourceBinding,
} from "@blackproof/core";
import { sanitizeLegacyQuestionnaireV1ForMigrationOnly } from "@blackproof/core/migrations";
import {
  decryptLocalPayload,
  decryptLocalPayloadBatch,
  CURRENT_PBKDF2_ITERATIONS,
  encryptLocalPayload,
  encryptLocalPayloadBatch,
  needsLocalEncryptionUpgrade,
  upgradeLocalPayloadBatchEncryption,
  type EncryptedLocalBatchPayload,
  type EncryptedLocalPayload,
} from "./local-encryption";

export const BLACKPROOF_LOCAL_DB_VERSION = "blackproof-local-db-v0.8.0-alpha";
export const LOCAL_ENVELOPE_VERSION = 2 as const;

const STORAGE_EPOCH_KEY = "storageEpoch";
const STORAGE_WIPE_CHANNEL = "blackproof-local-storage";
const STORAGE_EPOCH_CONFLICT_MESSAGE = "Le stockage local a été effacé depuis l’ouverture de cet onglet. Rechargez la page avant toute nouvelle sauvegarde.";
export const MAX_LOCAL_CASE_LABEL_CHARS = 80;

export interface LocalProofCaseRecord {
  encrypted?: false;
  localEnvelopeVersion: typeof LOCAL_ENVELOPE_VERSION;
  id: string;
  title: string;
  localLabel?: string;
  companyName?: string;
  clientName?: string;
  questionnaire: string;
  proofpackFingerprint: string;
  proofDebtScore: number;
  questionCount: number;
  evidenceCount: number;
  proofDebtCount: number;
  createdAt: string;
  updatedAt: string;
  methodVersion: string;
  proofpack: ProofPack;
  sourceImport?: ProofPackSourceImport;
  sourceLineage?: ProofPackSourceLineage;
  knowledgeUses?: KnowledgeUse[];
}

export interface EncryptedLocalProofCaseRecord {
  id: string;
  encrypted: true;
  localEnvelopeVersion: typeof LOCAL_ENVELOPE_VERSION;
  createdAt: string;
  updatedAt: string;
  revisionId?: string;
  localLabel?: string;
  payload: EncryptedLocalPayload | EncryptedLocalBatchPayload;
}

export type StoredLocalProofCaseRecord = LocalProofCaseRecord | EncryptedLocalProofCaseRecord;

export interface LocalCaseListRecord {
  id: string;
  encrypted: true;
  createdAt: string;
  updatedAt: string;
  revisionId?: string;
  localLabel?: string;
  requiresEncryptionMigration: boolean;
}

function normalizeLocalCaseLabel(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace(/\s+/g, " ");
  if (!normalized) return undefined;
  if (normalized.length > MAX_LOCAL_CASE_LABEL_CHARS) {
    throw new Error(`Le repère local est limité à ${MAX_LOCAL_CASE_LABEL_CHARS} caractères.`);
  }
  if (/[\u0000-\u001f\u007f]/u.test(normalized)) {
    throw new Error("Le repère local contient un caractère de contrôle interdit.");
  }
  return normalized;
}

interface LocalDeliverySnapshotRecord {
  deliveryId: string;
  caseId: string;
  createdAt: string;
  encrypted: false;
  deliveryJson: string;
}

interface EncryptedLocalDeliverySnapshotRecord {
  deliveryId: string;
  caseId: string;
  createdAt: string;
  encrypted: true;
  payload: EncryptedLocalPayload | EncryptedLocalBatchPayload;
}

type StoredLocalDeliverySnapshotRecord = LocalDeliverySnapshotRecord | EncryptedLocalDeliverySnapshotRecord;

interface LocalMetadataRecord {
  key: string;
  value: number | string;
}

interface LocalEntitlementRecord {
  key: "current" | "account";
  token: string;
  updatedAt: string;
}

export type LocalBackupSnapshot = { deliveryId: string; deliveryJson: string };

export class LocalQuestionnaireBindingError extends Error {
  readonly actualSha256: string;
  readonly expectedSha256: string;

  constructor(actualSha256: string, expectedSha256: string) {
    super("Le questionnaire local ne correspond pas à l’empreinte du ProofPack.");
    this.name = "LocalQuestionnaireBindingError";
    this.actualSha256 = actualSha256;
    this.expectedSha256 = expectedSha256;
  }
}

export class LocalQuestionnaireCanonicalizationError extends Error {
  constructor() {
    super("Le questionnaire local n’est pas sous sa forme canonique empreintée.");
    this.name = "LocalQuestionnaireCanonicalizationError";
  }
}

export async function verifyLocalQuestionnaireBinding(questionnaire: string, proofpack: ProofPack): Promise<void> {
  assertLocalCaseBounds(questionnaire, proofpack);
  const binding = await verifyQuestionnaireSourceBinding(questionnaire, proofpack);
  const canonicalQuestionnaire = binding.canonicalQuestionnaire;
  if (questionnaire !== canonicalQuestionnaire) {
    throw new LocalQuestionnaireCanonicalizationError();
  }
  if (!binding.isValid) {
    throw new LocalQuestionnaireBindingError(binding.actualSha256, binding.expectedSha256 ?? "absente");
  }
}

export function assertLocalProofCaseRecord(record: LocalProofCaseRecord): void {
  if (
    !record || typeof record !== "object" ||
    record.localEnvelopeVersion !== LOCAL_ENVELOPE_VERSION ||
    record.id !== record.proofpack?.case?.id ||
    record.title !== record.proofpack?.case?.title ||
    record.companyName !== record.proofpack?.case?.companyName ||
    record.clientName !== record.proofpack?.case?.clientName ||
    record.createdAt !== record.proofpack?.case?.createdAt ||
    record.updatedAt !== record.proofpack?.case?.updatedAt ||
    record.proofpackFingerprint !== record.proofpack?.fingerprint ||
    record.methodVersion !== record.proofpack?.methodVersion ||
    record.questionCount !== record.proofpack?.summary?.questionCount ||
    record.evidenceCount !== record.proofpack?.summary?.evidenceCount ||
    record.proofDebtCount !== record.proofpack?.summary?.proofDebtCount ||
    record.proofDebtScore !== record.proofpack?.summary?.proofDebtScore
  ) {
    throw new Error("L’enveloppe du dossier local ne correspond pas à son ProofPack.");
  }
  if (record.questionnaire !== sanitizeQuestionnaireInput(record.questionnaire)) {
    throw new LocalQuestionnaireCanonicalizationError();
  }
  assertLocalCaseBounds(record.questionnaire, record.proofpack);
  if (record.sourceImport) {
    const source = record.sourceImport;
    try {
      assertProofPackSourceImportLink(record.proofpack, source);
    } catch {
      throw new Error("La provenance XLSX locale est invalide.");
    }
  }
  if (record.sourceLineage) {
    try {
      assertProofPackSourceLineage(record.sourceLineage);
      if (record.sourceImport
        || record.sourceLineage.derivedSourceFileName !== record.proofpack.sourceQuestionnaire.fileName
        || record.sourceLineage.derivedSourceSha256 !== record.proofpack.sourceQuestionnaire.normalizedQuestionnaireSha256) {
        throw new Error("lineage mismatch");
      }
    } catch {
      throw new Error("La filiation de la source XLSX dérivée est invalide.");
    }
  }
  if (record.knowledgeUses) {
    try {
      assertProofPackKnowledgeUseLink(record.proofpack, record.knowledgeUses);
    } catch {
      throw new Error("La référence Knowledge locale est invalide.");
    }
  }
}

export function normalizeLegacyLocalProofCaseRecord(record: LocalProofCaseRecord): {
  record: LocalProofCaseRecord;
  migrated: boolean;
  envelopeVersionMigrated: boolean;
  questionnaireCanonicalized: boolean;
  proofpackRevisionMigrated: boolean;
  legacyCanonicalQuestionnaire?: string;
} {
  const legacyCanonicalQuestionnaire = sanitizeLegacyQuestionnaireV1ForMigrationOnly(record.questionnaire);
  const canonicalQuestionnaire = sanitizeQuestionnaireInput(record.questionnaire);
  const questionnaireCanonicalized = canonicalQuestionnaire !== record.questionnaire;
  const requiresProofpackRevision = canonicalQuestionnaire !== legacyCanonicalQuestionnaire;
  const canonicalRecord = questionnaireCanonicalized
    ? { ...record, questionnaire: canonicalQuestionnaire }
    : record;
  const declaredVersion = (record as LocalProofCaseRecord & { localEnvelopeVersion?: number }).localEnvelopeVersion;
  if (declaredVersion === LOCAL_ENVELOPE_VERSION) {
    assertLocalProofCaseRecord(canonicalRecord);
    return {
      record: canonicalRecord,
      migrated: questionnaireCanonicalized,
      envelopeVersionMigrated: false,
      questionnaireCanonicalized,
      proofpackRevisionMigrated: false,
      ...(requiresProofpackRevision ? { legacyCanonicalQuestionnaire } : {}),
    };
  }
  if (declaredVersion !== undefined && declaredVersion !== 1) {
    throw new Error("Version d’enveloppe locale non prise en charge.");
  }

  return {
    record: migrateLocalEnvelopeV1ToV2(canonicalRecord),
    migrated: true,
    envelopeVersionMigrated: true,
    questionnaireCanonicalized,
    proofpackRevisionMigrated: false,
    ...(requiresProofpackRevision ? { legacyCanonicalQuestionnaire } : {}),
  };
}

export async function migrateCanonicalLocalProofCaseRecord(record: LocalProofCaseRecord): Promise<{
  record: LocalProofCaseRecord;
  migrated: boolean;
  envelopeVersionMigrated: boolean;
  questionnaireCanonicalized: boolean;
  proofpackRevisionMigrated: boolean;
}> {
  const normalization = normalizeLegacyLocalProofCaseRecord(record);
  if (!normalization.legacyCanonicalQuestionnaire) return normalization;

  const legacyProofpackVerification = await verifyProofPackJson(JSON.stringify(record.proofpack));
  if (!legacyProofpackVerification.isValid) {
    throw new Error("Le ProofPack historique est invalide. Migration du questionnaire refusée.");
  }

  const legacyQuestionnaire = normalization.legacyCanonicalQuestionnaire;
  const legacySha256 = `sha256:${await sha256Hex(legacyQuestionnaire)}`;
  const source = record.proofpack.sourceQuestionnaire;
  const expectedLegacySha256 = source?.normalizedQuestionnaireSha256 ?? source?.sha256;
  if (typeof expectedLegacySha256 !== "string" || legacySha256 !== expectedLegacySha256) {
    throw new LocalQuestionnaireBindingError(legacySha256, expectedLegacySha256 ?? "absente");
  }

  const questionnaire = normalization.record.questionnaire;
  const sourceQuestionnaire = await buildQuestionnaireSource(questionnaire, {
    fileName: source.fileName,
    format: source.format,
    importedAt: source.importedAt,
    originalFileSha256: source.originalFileSha256,
  });
  const proofCase = { ...record.proofpack.case, updatedAt: new Date().toISOString() };
  const proofpack = await buildProofPack(
    proofCase,
    record.proofpack.questions,
    record.proofpack.evidence,
    record.proofpack.debts,
    { sourceQuestionnaire, previousProofPack: record.proofpack }
  );
  const migratedRecord: LocalProofCaseRecord = {
    ...normalization.record,
    title: proofpack.case.title,
    companyName: proofpack.case.companyName,
    clientName: proofpack.case.clientName,
    questionnaire,
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
  await verifyLocalQuestionnaireBinding(questionnaire, proofpack);

  return {
    record: migratedRecord,
    migrated: true,
    envelopeVersionMigrated: normalization.envelopeVersionMigrated,
    questionnaireCanonicalized: true,
    proofpackRevisionMigrated: true,
  };
}

function migrateLocalEnvelopeV1ToV2(record: LocalProofCaseRecord): LocalProofCaseRecord {
  const proofpackUpdatedAt = record?.proofpack?.case?.updatedAt;
  const legacyUpdatedAt = record?.updatedAt;
  let normalized: LocalProofCaseRecord = { ...record, localEnvelopeVersion: LOCAL_ENVELOPE_VERSION };
  if (legacyUpdatedAt !== proofpackUpdatedAt) {
    const legacyTimestamp = typeof legacyUpdatedAt === "string" ? Date.parse(legacyUpdatedAt) : Number.NaN;
    const proofpackTimestamp = typeof proofpackUpdatedAt === "string" ? Date.parse(proofpackUpdatedAt) : Number.NaN;
    if (!Number.isFinite(legacyTimestamp) || !Number.isFinite(proofpackTimestamp) || legacyTimestamp < proofpackTimestamp) {
      throw new Error("L’enveloppe du dossier local ne correspond pas à son ProofPack.");
    }
    normalized = { ...normalized, updatedAt: proofpackUpdatedAt };
  }

  // Legacy envelopes had no explicit version. The final strict assertion
  // rejects every substitution outside the known timestamp divergence.
  assertLocalProofCaseRecord(normalized);
  return normalized;
}

class BlackProofLocalDatabase extends Dexie {
  cases!: Table<StoredLocalProofCaseRecord, string>;
  deliverySnapshots!: Table<StoredLocalDeliverySnapshotRecord, [string, string]>;
  metadata!: Table<LocalMetadataRecord, string>;

  constructor() {
    super("blackproof-local-first");

    this.version(1).stores({
      cases: "id, title, updatedAt, createdAt, proofpackFingerprint, proofDebtScore",
    });
    this.version(2).stores({
      cases: "id, encrypted, updatedAt, createdAt",
    });
    this.version(3).stores({
      cases: "id, encrypted, updatedAt, createdAt",
      deliverySnapshots: "deliveryId, caseId, createdAt, encrypted",
    });
    this.version(4).stores({
      cases: "id, encrypted, updatedAt, createdAt",
      deliverySnapshots: "deliveryId, caseId, createdAt, encrypted",
    });
    this.version(5).stores({
      cases: "id, encrypted, updatedAt, createdAt",
      deliverySnapshots: "deliveryId, caseId, createdAt, encrypted",
      metadata: "key",
    });
    this.version(6).stores({
      cases: "id, encrypted, updatedAt, createdAt",
      deliverySnapshots: "deliveryId, caseId, createdAt, encrypted",
      deliverySnapshotsV2: "[caseId+deliveryId], deliveryId, caseId, createdAt, encrypted",
      metadata: "key",
    }).upgrade(async (transaction) => {
      const snapshots = await transaction.table<StoredLocalDeliverySnapshotRecord>("deliverySnapshots").toArray();
      await transaction.table<StoredLocalDeliverySnapshotRecord>("deliverySnapshotsV2").bulkPut(snapshots);
    });
    this.version(7).stores({
      cases: "id, encrypted, updatedAt, createdAt",
      deliverySnapshots: null,
      deliverySnapshotsV2: "[caseId+deliveryId], deliveryId, caseId, createdAt, encrypted",
      metadata: "key",
    });
    this.version(8).stores({
      cases: "id, encrypted, updatedAt, createdAt",
      deliverySnapshots: "[caseId+deliveryId], deliveryId, caseId, createdAt, encrypted",
      deliverySnapshotsV2: "[caseId+deliveryId], deliveryId, caseId, createdAt, encrypted",
      metadata: "key",
    }).upgrade(async (transaction) => {
      const snapshots = await transaction.table<StoredLocalDeliverySnapshotRecord>("deliverySnapshotsV2").toArray();
      await transaction.table<StoredLocalDeliverySnapshotRecord>("deliverySnapshots").bulkPut(snapshots);
    });
    this.version(9).stores({
      cases: "id, encrypted, updatedAt, createdAt",
      deliverySnapshots: "[caseId+deliveryId], deliveryId, caseId, createdAt, encrypted",
      deliverySnapshotsV2: null,
      metadata: "key",
    });
    this.version(10).stores({
      cases: "id, encrypted, updatedAt, createdAt",
      deliverySnapshots: "[caseId+deliveryId], deliveryId, caseId, createdAt, encrypted",
      metadata: "key",
      entitlements: "key",
    });
    this.version(11).stores({
      cases: "id, encrypted, updatedAt, createdAt",
      deliverySnapshots: "[caseId+deliveryId], deliveryId, caseId, createdAt, encrypted",
      metadata: "key",
      entitlements: "key",
    }).upgrade(async (transaction) => {
      await transaction.table<LocalEntitlementRecord>("entitlements").bulkDelete(["account", "current"]);
    });
    // Retire access credentials while preserving dossiers, snapshots and storage epochs.
    this.version(12).stores({
      entitlements: null,
    }).upgrade(async (transaction) => {
      await transaction.table<LocalMetadataRecord>("metadata").bulkDelete(["accountLogoutPending", "checkoutAttemptV1"]);
    });
  }
}

export const blackproofLocalDb = new BlackProofLocalDatabase();

async function readStorageEpoch(): Promise<number> {
  const value = (await blackproofLocalDb.metadata.get(STORAGE_EPOCH_KEY))?.value;
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

let sessionStorageEpochPromise: Promise<number> | undefined = typeof indexedDB === "undefined"
  ? undefined
  : readStorageEpoch();

async function getSessionStorageEpoch(): Promise<number> {
  sessionStorageEpochPromise ??= readStorageEpoch();
  return sessionStorageEpochPromise;
}

export async function captureLocalStorageEpoch(): Promise<number> {
  return getSessionStorageEpoch();
}

async function assertSessionStorageEpoch(operationEpoch?: number): Promise<void> {
  const expectedEpoch = operationEpoch ?? await getSessionStorageEpoch();
  if (await readStorageEpoch() !== expectedEpoch) {
    throw new Error(STORAGE_EPOCH_CONFLICT_MESSAGE);
  }
}

export function subscribeToLocalStorageWipe(callback: () => void): () => void {
  if (typeof BroadcastChannel === "undefined") return () => undefined;
  const channel = new BroadcastChannel(STORAGE_WIPE_CHANNEL);
  channel.addEventListener("message", (event) => {
    const epoch = (event.data as { epoch?: unknown } | undefined)?.epoch;
    if (typeof epoch === "number" && Number.isSafeInteger(epoch) && epoch >= 0) {
      sessionStorageEpochPromise = Promise.resolve(epoch);
    }
    callback();
  });
  return () => channel.close();
}

async function decryptStoredPayload<T>(payload: EncryptedLocalPayload | EncryptedLocalBatchPayload, passphrase: string, aad: string): Promise<T> {
  if (payload.version === 2) {
    if (payload.aad !== aad) throw new Error("Le contexte du contenu chiffré ne correspond pas à son emplacement.");
    return (await decryptLocalPayloadBatch<T>([payload], passphrase))[0];
  }
  return decryptLocalPayload<T>(payload, passphrase);
}

function deliverySnapshotAad(caseId: string, deliveryId: string): string {
  return `snapshot:${caseId}:${deliveryId}`;
}

async function decryptStoredDeliverySnapshot(
  stored: EncryptedLocalDeliverySnapshotRecord,
  passphrase: string
): Promise<{ deliveryJson: string }> {
  const legacyAad = `snapshot:${stored.deliveryId}`;
  const aad = stored.payload.version === 2 && stored.payload.aad === legacyAad
    ? legacyAad
    : deliverySnapshotAad(stored.caseId, stored.deliveryId);
  return decryptStoredPayload<{ deliveryJson: string }>(stored.payload, passphrase, aad);
}

function assertLocalOperationActive(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error("Opération locale annulée avant écriture.");
}

async function upgradeLegacyEncryptedCase(
  stored: EncryptedLocalProofCaseRecord,
  record: LocalProofCaseRecord,
  passphrase: string,
  signal?: AbortSignal,
): Promise<void> {
  const operationEpoch = await getSessionStorageEpoch();
  assertLocalOperationActive(signal);
  const observedSnapshots = await blackproofLocalDb.deliverySnapshots.where("caseId").equals(stored.id).toArray();
  assertLocalOperationActive(signal);
  const encryptedSnapshots = observedSnapshots.filter((snapshot): snapshot is EncryptedLocalDeliverySnapshotRecord => snapshot.encrypted);
  if (!needsLocalEncryptionUpgrade(stored.payload) && encryptedSnapshots.every((snapshot) => !needsLocalEncryptionUpgrade(snapshot.payload))) return;

  const clearSnapshots = await Promise.all(encryptedSnapshots.map(async (snapshot) => ({
    snapshot,
    value: await decryptStoredDeliverySnapshot(snapshot, passphrase),
  })));
  assertLocalOperationActive(signal);
  const upgradedPayloads = await upgradeLocalPayloadBatchEncryption([
    { aad: `case:${stored.id}`, value: record },
    ...clearSnapshots.map(({ snapshot, value }) => ({ aad: deliverySnapshotAad(snapshot.caseId, snapshot.deliveryId), value })),
  ], passphrase);
  assertLocalOperationActive(signal);
  const upgradedCasePayload = upgradedPayloads[0];
  if (!upgradedCasePayload || upgradedCasePayload.iterations !== CURRENT_PBKDF2_ITERATIONS) throw new Error("La mise à niveau du dossier chiffré n’a pas produit le format attendu.");
  const upgradedSnapshots = encryptedSnapshots.map((snapshot, index) => ({
    ...snapshot,
    payload: upgradedPayloads[index + 1]!,
  }));

  const verifiedCase = await decryptStoredPayload<LocalProofCaseRecord>(upgradedCasePayload, passphrase, `case:${stored.id}`);
  assertLocalOperationActive(signal);
  if (verifiedCase.id !== record.id || verifiedCase.proofpack.revisionId !== record.proofpack.revisionId) {
    throw new Error("La relecture de l’enveloppe PBKDF2 migrée ne correspond pas au dossier.");
  }
  await Promise.all(upgradedSnapshots.map((snapshot) => decryptStoredDeliverySnapshot(snapshot, passphrase)));
  assertLocalOperationActive(signal);

  await blackproofLocalDb.transaction("rw", blackproofLocalDb.cases, blackproofLocalDb.deliverySnapshots, blackproofLocalDb.metadata, async () => {
    await assertSessionStorageEpoch(operationEpoch);
    assertLocalOperationActive(signal);
    const current = await blackproofLocalDb.cases.get(stored.id);
    if (!current?.encrypted || JSON.stringify(current.payload) !== JSON.stringify(stored.payload)) throw new Error(LOCAL_CASE_CONFLICT_MESSAGE);
    const currentSnapshots = await blackproofLocalDb.deliverySnapshots.where("caseId").equals(stored.id).toArray();
    if (currentSnapshots.length !== observedSnapshots.length) throw new Error(LOCAL_CASE_CONFLICT_MESSAGE);
    const observedByKey = new Map(observedSnapshots.map((snapshot) => [`${snapshot.caseId}:${snapshot.deliveryId}`, JSON.stringify(snapshot)]));
    if (currentSnapshots.some((snapshot) => observedByKey.get(`${snapshot.caseId}:${snapshot.deliveryId}`) !== JSON.stringify(snapshot))) {
      throw new Error(LOCAL_CASE_CONFLICT_MESSAGE);
    }

    await blackproofLocalDb.cases.put({ ...stored, payload: upgradedCasePayload });
    await blackproofLocalDb.deliverySnapshots.bulkPut(upgradedSnapshots);

    const rereadCase = await blackproofLocalDb.cases.get(stored.id);
    if (!rereadCase?.encrypted || JSON.stringify(rereadCase.payload) !== JSON.stringify(upgradedCasePayload)) {
      throw new Error("La relecture du ciphertext PBKDF2 migré a échoué.");
    }
    for (const snapshot of upgradedSnapshots) {
      const reread = await blackproofLocalDb.deliverySnapshots.get([snapshot.caseId, snapshot.deliveryId]);
      if (!reread?.encrypted || JSON.stringify(reread.payload) !== JSON.stringify(snapshot.payload)) {
        throw new Error("La relecture d’un snapshot PBKDF2 migré a échoué.");
      }
    }
  });
}

function assertLocalCaseBounds(questionnaire: string, proofpack: ProofPack): void {
  if (questionnaire.length > SECURITY_LIMITS.MAX_QUESTIONNAIRE_CHARS) {
    throw new SecurityValidationError(
      "LOCAL_QUESTIONNAIRE_TOO_LARGE",
      `Questionnaire exceeds ${SECURITY_LIMITS.MAX_QUESTIONNAIRE_CHARS} characters.`
    );
  }

  const serialized = JSON.stringify(proofpack);

  if (serialized.length > SECURITY_LIMITS.MAX_PROOFPACK_JSON_CHARS) {
    throw new SecurityValidationError(
      "LOCAL_PROOFPACK_TOO_LARGE",
      `ProofPack exceeds ${SECURITY_LIMITS.MAX_PROOFPACK_JSON_CHARS} characters.`
    );
  }
}

const LOCAL_CASE_CONFLICT_MESSAGE = "Ce dossier a été modifié dans un autre onglet. Rechargez-le avant de sauvegarder.";
const LOCAL_CASE_EXPORT_CONFLICT_MESSAGE = "Ce dossier possède une révision plus récente dans un autre onglet. Rechargez-le avant export.";

export interface LocalCaseWriteExpectation {
  exists: boolean;
  encrypted?: boolean;
  revisionId?: string;
  updatedAt?: string;
  storageEpoch?: number;
}

function storedCaseWriteExpectation(stored: StoredLocalProofCaseRecord | undefined): LocalCaseWriteExpectation {
  if (!stored) return { exists: false };
  return {
    exists: true,
    encrypted: stored.encrypted === true,
    revisionId: getStoredLocalCaseRevisionId(stored),
    updatedAt: stored.updatedAt,
  };
}

function assertStoredCaseMatchesExpectation(
  current: StoredLocalProofCaseRecord | undefined,
  expected: LocalCaseWriteExpectation
): void {
  const observed = storedCaseWriteExpectation(current);
  if (
    observed.exists !== expected.exists ||
    observed.encrypted !== expected.encrypted ||
    observed.revisionId !== expected.revisionId ||
    observed.updatedAt !== expected.updatedAt
  ) {
    throw new Error(LOCAL_CASE_CONFLICT_MESSAGE);
  }
}

export async function observeLocalCaseWriteExpectation(id: string, capturedOperationEpoch?: number): Promise<LocalCaseWriteExpectation> {
  const operationEpoch = capturedOperationEpoch ?? await getSessionStorageEpoch();
  return blackproofLocalDb.transaction("r", blackproofLocalDb.cases, blackproofLocalDb.metadata, async () => {
    await assertSessionStorageEpoch(operationEpoch);
    return { ...storedCaseWriteExpectation(await blackproofLocalDb.cases.get(id)), storageEpoch: operationEpoch };
  });
}

export async function assertCurrentLocalRevision(
  id: string,
  expectedRevisionId: string | undefined,
  passphrase?: string
): Promise<void> {
  await blackproofLocalDb.transaction("r", blackproofLocalDb.cases, blackproofLocalDb.metadata, async () => {
    await assertSessionStorageEpoch();
    const stored = await blackproofLocalDb.cases.get(id);
    if (!stored || !expectedRevisionId) throw new Error(LOCAL_CASE_EXPORT_CONFLICT_MESSAGE);
    const currentRevisionId = stored.encrypted
      ? stored.revisionId ?? (passphrase ? (await Dexie.waitFor(decryptStoredPayload<LocalProofCaseRecord>(stored.payload, passphrase, `case:${stored.id}`))).proofpack.revisionId : undefined)
      : stored.proofpack.revisionId;
    if (currentRevisionId !== expectedRevisionId) throw new Error(LOCAL_CASE_EXPORT_CONFLICT_MESSAGE);
  });
}

async function assertBaseRevision(
  stored: StoredLocalProofCaseRecord | undefined,
  baseRevisionId: string | undefined,
  passphrase?: string
): Promise<void> {
  if (!baseRevisionId) return;
  if (!stored) throw new Error(LOCAL_CASE_CONFLICT_MESSAGE);
  const currentRevisionId = stored.encrypted
    ? stored.revisionId ?? (passphrase ? (await decryptStoredPayload<LocalProofCaseRecord>(stored.payload, passphrase, `case:${stored.id}`)).proofpack.revisionId : undefined)
    : stored.proofpack.revisionId;
  if (currentRevisionId !== baseRevisionId) throw new Error(LOCAL_CASE_CONFLICT_MESSAGE);
}

function assertStoredCaseUnchanged(
  current: StoredLocalProofCaseRecord | undefined,
  observed: StoredLocalProofCaseRecord | undefined,
  baseRevisionId?: string
): void {
  if (!observed) {
    if (baseRevisionId || current) throw new Error(LOCAL_CASE_CONFLICT_MESSAGE);
    return;
  }
  if (!current || current.updatedAt !== observed.updatedAt || current.encrypted !== observed.encrypted) {
    throw new Error(LOCAL_CASE_CONFLICT_MESSAGE);
  }
  if (!baseRevisionId) return;
  const currentRevisionId = current.encrypted ? current.revisionId : current.proofpack.revisionId;
  const observedRevisionId = observed.encrypted ? observed.revisionId : observed.proofpack.revisionId;
  if (currentRevisionId !== observedRevisionId) throw new Error(LOCAL_CASE_CONFLICT_MESSAGE);
}

export async function saveLocalCase(input: {
  questionnaire: string;
  proofpack: ProofPack;
  passphrase?: string;
  baseRevisionId?: string;
  sourceImport?: ProofPackSourceImport;
  sourceLineage?: ProofPackSourceLineage;
  knowledgeUses?: KnowledgeUse[];
  localLabel?: string;
}): Promise<LocalProofCaseRecord> {
  const operationEpoch = await getSessionStorageEpoch();
  const canonicalQuestionnaire = sanitizeQuestionnaireInput(input.questionnaire);
  await verifyLocalQuestionnaireBinding(canonicalQuestionnaire, input.proofpack);

  const existing = await blackproofLocalDb.cases.get(input.proofpack.case.id);
  const localLabel = normalizeLocalCaseLabel(input.localLabel ?? existing?.localLabel);
  await assertBaseRevision(existing, input.baseRevisionId, input.passphrase);
  if (!existing && !input.passphrase) {
    throw new Error("Le chiffrement est obligatoire avant la première écriture d’un dossier local.");
  }
  if (!input.passphrase) throw new Error("Le chiffrement est obligatoire pour toute écriture d’un dossier local.");

  const record: LocalProofCaseRecord = {
    localEnvelopeVersion: LOCAL_ENVELOPE_VERSION,
    id: input.proofpack.case.id,
    title: input.proofpack.case.title,
    ...(localLabel ? { localLabel } : {}),
    companyName: input.proofpack.case.companyName,
    clientName: input.proofpack.case.clientName,
    questionnaire: canonicalQuestionnaire,
    proofpackFingerprint: input.proofpack.fingerprint,
    proofDebtScore: input.proofpack.summary.proofDebtScore,
    questionCount: input.proofpack.summary.questionCount,
    evidenceCount: input.proofpack.summary.evidenceCount,
    proofDebtCount: input.proofpack.summary.proofDebtCount,
    createdAt: input.proofpack.case.createdAt,
    updatedAt: input.proofpack.case.updatedAt,
    methodVersion: input.proofpack.methodVersion,
    proofpack: input.proofpack,
    ...(input.sourceImport ? { sourceImport: input.sourceImport } : {}),
    ...(input.sourceLineage ? { sourceLineage: input.sourceLineage } : {}),
    ...(input.knowledgeUses?.length ? { knowledgeUses: input.knowledgeUses } : {}),
  };

  const encryptedRecord: EncryptedLocalProofCaseRecord = {
    id: record.id,
    encrypted: true,
    localEnvelopeVersion: LOCAL_ENVELOPE_VERSION,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    revisionId: record.proofpack.revisionId,
    ...(localLabel ? { localLabel } : {}),
    payload: await encryptLocalPayload(record, input.passphrase),
  };
  await blackproofLocalDb.transaction("rw", blackproofLocalDb.cases, blackproofLocalDb.metadata, async () => {
    await assertSessionStorageEpoch(operationEpoch);
    assertStoredCaseUnchanged(await blackproofLocalDb.cases.get(record.id), existing, input.baseRevisionId);
    await blackproofLocalDb.cases.put(encryptedRecord);
  });

  return record;
}

export async function encryptLocalCaseAndDeliverySnapshots(input: {
  questionnaire: string;
  proofpack: ProofPack;
  passphrase: string;
  baseRevisionId?: string;
  sourceImport?: ProofPackSourceImport;
  sourceLineage?: ProofPackSourceLineage;
  knowledgeUses?: KnowledgeUse[];
  localLabel?: string;
}): Promise<LocalProofCaseRecord> {
  const operationEpoch = await getSessionStorageEpoch();
  const canonicalQuestionnaire = sanitizeQuestionnaireInput(input.questionnaire);
  await verifyLocalQuestionnaireBinding(canonicalQuestionnaire, input.proofpack);

  const existing = await blackproofLocalDb.cases.get(input.proofpack.case.id);
  const localLabel = normalizeLocalCaseLabel(input.localLabel ?? existing?.localLabel);
  await assertBaseRevision(existing, input.baseRevisionId, input.passphrase);
  if (existing?.encrypted) {
    throw new Error("Ce dossier est déjà chiffré.");
  }

  const snapshots = await blackproofLocalDb.deliverySnapshots
    .where("caseId")
    .equals(input.proofpack.case.id)
    .toArray();
  const receipts = new Map(
    (input.proofpack.deliveryHistory ?? []).map((receipt) => [receipt.deliveryId, receipt])
  );
  const clearSnapshots: Array<{ deliveryId: string; caseId: string; createdAt: string; deliveryJson: string }> = [];

  for (const snapshot of snapshots) {
    if (snapshot.encrypted) {
      throw new Error("Un snapshot Delivery est déjà chiffré avec une phrase secrète inconnue.");
    }

    const receipt = receipts.get(snapshot.deliveryId);
    if (!receipt?.snapshotSha256) {
      throw new Error(`Le snapshot Delivery ${snapshot.deliveryId} ne possède pas de hash de référence.`);
    }
    if (await sha256Hex(snapshot.deliveryJson) !== receipt.snapshotSha256) {
      throw new Error(`Le hash du snapshot Delivery ${snapshot.deliveryId} est invalide.`);
    }

    const verification = await verifyProofPackDeliveryJson(snapshot.deliveryJson);
    if (
      !verification.isValid ||
      verification.deliveryId !== snapshot.deliveryId ||
      verification.providedFingerprint !== receipt.fingerprint
    ) {
      const reason = verification.findings.map((finding) => finding.code).join(", ") || "identifiants incohérents";
      throw new Error(`Le snapshot Delivery ${snapshot.deliveryId} est invalide ou ne correspond pas au dossier (${reason}).`);
    }

    clearSnapshots.push({ deliveryId: snapshot.deliveryId, caseId: snapshot.caseId, createdAt: snapshot.createdAt, deliveryJson: snapshot.deliveryJson });
  }

  const record: LocalProofCaseRecord = {
    localEnvelopeVersion: LOCAL_ENVELOPE_VERSION,
    id: input.proofpack.case.id,
    title: input.proofpack.case.title,
    ...(localLabel ? { localLabel } : {}),
    companyName: input.proofpack.case.companyName,
    clientName: input.proofpack.case.clientName,
    questionnaire: canonicalQuestionnaire,
    proofpackFingerprint: input.proofpack.fingerprint,
    proofDebtScore: input.proofpack.summary.proofDebtScore,
    questionCount: input.proofpack.summary.questionCount,
    evidenceCount: input.proofpack.summary.evidenceCount,
    proofDebtCount: input.proofpack.summary.proofDebtCount,
    createdAt: input.proofpack.case.createdAt,
    updatedAt: input.proofpack.case.updatedAt,
    methodVersion: input.proofpack.methodVersion,
    proofpack: input.proofpack,
    ...(input.sourceImport ? { sourceImport: input.sourceImport } : {}),
    ...(input.sourceLineage ? { sourceLineage: input.sourceLineage } : {}),
    ...(input.knowledgeUses?.length ? { knowledgeUses: input.knowledgeUses } : {}),
  };
  const encryptedPayloads = await encryptLocalPayloadBatch([
    { aad: `case:${record.id}`, value: record },
    ...clearSnapshots.map((snapshot) => ({ aad: deliverySnapshotAad(snapshot.caseId, snapshot.deliveryId), value: { deliveryJson: snapshot.deliveryJson } })),
  ], input.passphrase);
  const encryptedCase: EncryptedLocalProofCaseRecord = {
    id: record.id,
    encrypted: true,
    localEnvelopeVersion: LOCAL_ENVELOPE_VERSION,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    revisionId: record.proofpack.revisionId,
    ...(localLabel ? { localLabel } : {}),
    payload: encryptedPayloads[0],
  };
  const encryptedSnapshots: EncryptedLocalDeliverySnapshotRecord[] = clearSnapshots.map((snapshot, index) => ({
    deliveryId: snapshot.deliveryId, caseId: snapshot.caseId, createdAt: snapshot.createdAt, encrypted: true,
    payload: encryptedPayloads[index + 1],
  }));

  await blackproofLocalDb.transaction("rw", blackproofLocalDb.cases, blackproofLocalDb.deliverySnapshots, blackproofLocalDb.metadata, async () => {
    await assertSessionStorageEpoch(operationEpoch);
    assertStoredCaseUnchanged(await blackproofLocalDb.cases.get(record.id), existing, input.baseRevisionId);
    await blackproofLocalDb.deliverySnapshots.bulkPut(encryptedSnapshots);
    await blackproofLocalDb.cases.put(encryptedCase);

    const remainingCleartext = await blackproofLocalDb.deliverySnapshots
      .where("caseId")
      .equals(record.id)
      .and((snapshot) => !snapshot.encrypted)
      .count();
    if (remainingCleartext !== 0) {
      throw new Error("La migration a laissé au moins un snapshot Delivery en clair.");
    }
  });

  return record;
}

export async function listLocalCases(): Promise<LocalCaseListRecord[]> {
  const records = await blackproofLocalDb.cases
    .orderBy("updatedAt")
    .reverse()
    .toArray();
  return records.map((record) => ({
    id: record.id,
    encrypted: true,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    revisionId: getStoredLocalCaseRevisionId(record),
    ...(record.localLabel ? { localLabel: record.localLabel } : {}),
    requiresEncryptionMigration: !record.encrypted,
  }));
}

export async function getLocalCase(id: string, passphrase?: string, signal?: AbortSignal): Promise<LocalProofCaseRecord | undefined> {
  const stored = await blackproofLocalDb.cases.get(id);
  assertLocalOperationActive(signal);
  if (!stored) return undefined;
  if (!stored.encrypted) throw new Error("Ce dossier historique est encore stocké en clair. Une migration chiffrée est requise avant lecture.");
  if (!passphrase) throw new Error("Ce dossier est chiffré. Saisissez sa phrase secrète pour l’ouvrir.");
  const record = await decryptStoredPayload<LocalProofCaseRecord>(stored.payload, passphrase, `case:${id}`);
  assertLocalOperationActive(signal);
  if (record.id !== id) throw new Error("Le dossier chiffré ne correspond pas à son identifiant de stockage.");
  await upgradeLegacyEncryptedCase(stored, record, passphrase, signal);
  assertLocalOperationActive(signal);
  return record;
}

export async function migrateLegacyClearLocalCaseEncryption(id: string, passphrase: string, signal?: AbortSignal): Promise<LocalProofCaseRecord> {
  const operationEpoch = await getSessionStorageEpoch();
  assertLocalOperationActive(signal);
  const observed = await blackproofLocalDb.cases.get(id);
  assertLocalOperationActive(signal);
  if (!observed) throw new Error(`Dossier local introuvable : ${id}`);
  if (observed.encrypted) {
    const existing = await getLocalCase(id, passphrase, signal);
    if (!existing) throw new Error(`Dossier local introuvable : ${id}`);
    return existing;
  }
  const snapshots = await blackproofLocalDb.deliverySnapshots.where("caseId").equals(id).toArray();
  assertLocalOperationActive(signal);
  const clearSnapshots = snapshots.map((snapshot) => {
    if (snapshot.encrypted) throw new Error("Un snapshot Delivery chiffré ne peut pas être rattaché à un ancien dossier stocké en clair.");
    return snapshot;
  });
  const encryptedPayloads = await encryptLocalPayloadBatch([
    { aad: `case:${id}`, value: observed },
    ...clearSnapshots.map((snapshot) => ({ aad: deliverySnapshotAad(snapshot.caseId, snapshot.deliveryId), value: { deliveryJson: snapshot.deliveryJson } })),
  ], passphrase);
  assertLocalOperationActive(signal);
  const encryptedCase: EncryptedLocalProofCaseRecord = {
    id,
    encrypted: true,
    localEnvelopeVersion: LOCAL_ENVELOPE_VERSION,
    createdAt: observed.createdAt,
    updatedAt: observed.updatedAt,
    revisionId: observed.proofpack.revisionId,
    ...(observed.localLabel ? { localLabel: normalizeLocalCaseLabel(observed.localLabel) } : {}),
    payload: encryptedPayloads[0],
  };
  const encryptedSnapshots: EncryptedLocalDeliverySnapshotRecord[] = clearSnapshots.map((snapshot, index) => ({
    deliveryId: snapshot.deliveryId,
    caseId: snapshot.caseId,
    createdAt: snapshot.createdAt,
    encrypted: true,
    payload: encryptedPayloads[index + 1],
  }));
  const observedSnapshotState = JSON.stringify(clearSnapshots
    .map((snapshot) => ({ deliveryId: snapshot.deliveryId, createdAt: snapshot.createdAt, deliveryJson: snapshot.deliveryJson }))
    .sort((left, right) => left.deliveryId.localeCompare(right.deliveryId)));
  await blackproofLocalDb.transaction("rw", blackproofLocalDb.cases, blackproofLocalDb.deliverySnapshots, blackproofLocalDb.metadata, async () => {
    await assertSessionStorageEpoch(operationEpoch);
    assertLocalOperationActive(signal);
    const current = await blackproofLocalDb.cases.get(id);
    if (!current || current.encrypted || current.updatedAt !== observed.updatedAt || current.proofpack.revisionId !== observed.proofpack.revisionId) {
      throw new Error(LOCAL_CASE_CONFLICT_MESSAGE);
    }
    const currentSnapshots = await blackproofLocalDb.deliverySnapshots.where("caseId").equals(id).toArray();
    const currentClearSnapshots = currentSnapshots.map((snapshot) => {
      if (snapshot.encrypted) throw new Error(LOCAL_CASE_CONFLICT_MESSAGE);
      return snapshot;
    });
    const currentSnapshotState = JSON.stringify(currentClearSnapshots
      .map((snapshot) => ({ deliveryId: snapshot.deliveryId, createdAt: snapshot.createdAt, deliveryJson: snapshot.deliveryJson }))
      .sort((left, right) => left.deliveryId.localeCompare(right.deliveryId)));
    if (currentSnapshotState !== observedSnapshotState) throw new Error(LOCAL_CASE_CONFLICT_MESSAGE);
    await blackproofLocalDb.deliverySnapshots.bulkPut(encryptedSnapshots);
    await blackproofLocalDb.cases.put(encryptedCase);
  });
  const migrated = await getLocalCase(id, passphrase);
  if (!migrated) throw new Error("La migration chiffrée du dossier historique n’a pas pu être relue.");
  return migrated;
}

export function isEncryptedLocalCase(
  record: StoredLocalProofCaseRecord
): record is EncryptedLocalProofCaseRecord {
  return record.encrypted === true;
}

export async function isLocalCaseStoredEncrypted(id: string): Promise<boolean> {
  const stored = await blackproofLocalDb.cases.get(id);
  return stored?.encrypted === true;
}

export async function restoreLocalCaseBackup(input: {
  record: LocalProofCaseRecord;
  snapshots: LocalBackupSnapshot[];
  passphrase?: string;
  expectedExisting?: LocalCaseWriteExpectation;
  signal?: AbortSignal;
}): Promise<void> {
  if (!input.passphrase) throw new Error("Une phrase secrète est obligatoire pour restaurer un dossier local.");
  const operationEpoch = input.expectedExisting?.storageEpoch ?? await getSessionStorageEpoch();
  assertLocalOperationActive(input.signal);
  const record = {
    ...input.record,
    questionnaire: sanitizeQuestionnaireInput(input.record.questionnaire),
  };
  assertLocalProofCaseRecord(record);
  await verifyLocalQuestionnaireBinding(record.questionnaire, record.proofpack);
  assertLocalOperationActive(input.signal);
  const existing = await blackproofLocalDb.cases.get(record.id);
  assertLocalOperationActive(input.signal);
  const expectedExisting = input.expectedExisting ?? storedCaseWriteExpectation(existing);
  const batchPayloads = await encryptLocalPayloadBatch([
    { aad: `case:${record.id}`, value: record },
    ...input.snapshots.map((snapshot) => ({ aad: deliverySnapshotAad(record.id, snapshot.deliveryId), value: { deliveryJson: snapshot.deliveryJson } })),
  ], input.passphrase);
  assertLocalOperationActive(input.signal);
  const storedCase: StoredLocalProofCaseRecord = {
    id: record.id, encrypted: true, createdAt: record.createdAt, updatedAt: record.updatedAt,
    localEnvelopeVersion: LOCAL_ENVELOPE_VERSION,
    revisionId: record.proofpack.revisionId,
    ...(record.localLabel ? { localLabel: normalizeLocalCaseLabel(record.localLabel) } : {}),
    payload: batchPayloads[0],
  };
  const storedSnapshots: StoredLocalDeliverySnapshotRecord[] = [];
  for (const [index, snapshot] of input.snapshots.entries()) {
    if (snapshot.deliveryJson.length > SECURITY_LIMITS.MAX_DELIVERY_SNAPSHOT_CHARS) throw new Error("Snapshot Delivery trop volumineux.");
    storedSnapshots.push({
      deliveryId: snapshot.deliveryId, caseId: record.id, createdAt: new Date().toISOString(), encrypted: true,
      payload: batchPayloads[index + 1],
    });
  }
  await blackproofLocalDb.transaction("rw", blackproofLocalDb.cases, blackproofLocalDb.deliverySnapshots, blackproofLocalDb.metadata, async () => {
    await assertSessionStorageEpoch(operationEpoch);
    assertLocalOperationActive(input.signal);
    assertStoredCaseMatchesExpectation(await blackproofLocalDb.cases.get(record.id), expectedExisting);
    await blackproofLocalDb.deliverySnapshots.where("caseId").equals(record.id).delete();
    await blackproofLocalDb.deliverySnapshots.bulkPut(storedSnapshots);
    await blackproofLocalDb.cases.put(storedCase);
  });
}

export async function getDeliverySnapshot(caseId: string, deliveryId: string, passphrase?: string): Promise<string | undefined> {
  const stored = await blackproofLocalDb.deliverySnapshots.get([caseId, deliveryId]);
  if (!stored) return undefined;
  if (stored.caseId !== caseId || stored.deliveryId !== deliveryId) throw new Error("Le snapshot Delivery ne correspond pas à sa clé de stockage.");
  if (!stored.encrypted) return stored.deliveryJson;
  if (!passphrase) throw new Error("Le snapshot Delivery est chiffré. La phrase secrète du dossier est requise.");
  const payload = await decryptStoredDeliverySnapshot(stored, passphrase);
  return payload.deliveryJson;
}

export async function hasDeliverySnapshot(caseId: string, deliveryId: string): Promise<boolean> {
  return (await blackproofLocalDb.deliverySnapshots.get([caseId, deliveryId])) !== undefined;
}

export async function listDeliverySnapshotIdsForCase(caseId: string): Promise<string[]> {
  return (await blackproofLocalDb.deliverySnapshots.where("caseId").equals(caseId).toArray()).map((snapshot) => snapshot.deliveryId);
}

export async function getLocalStorageStatus(caseId: string): Promise<{
  caseBytes: number;
  snapshotBytes: number;
  snapshotCount: number;
  quota?: number;
  usage?: number;
}> {
  const storedCase = await blackproofLocalDb.cases.get(caseId);
  const snapshots = await blackproofLocalDb.deliverySnapshots.where("caseId").equals(caseId).toArray();
  const estimate = await navigator.storage?.estimate?.();
  return {
    caseBytes: storedCase ? new Blob([JSON.stringify(storedCase)]).size : 0,
    snapshotBytes: snapshots.reduce((total, item) => total + new Blob([JSON.stringify(item)]).size, 0),
    snapshotCount: snapshots.length,
    quota: estimate?.quota,
    usage: estimate?.usage,
  };
}

export async function deleteOrphanDeliverySnapshots(): Promise<number> {
  const operationEpoch = await getSessionStorageEpoch();
  return blackproofLocalDb.transaction("rw", blackproofLocalDb.cases, blackproofLocalDb.deliverySnapshots, blackproofLocalDb.metadata, async () => {
    await assertSessionStorageEpoch(operationEpoch);
    const cases = await blackproofLocalDb.cases.toArray();
    const caseIds = new Set(cases.map((item) => item.id));
    const readableReceiptIds = new Map<string, Set<string>>();
    for (const item of cases) {
      if (!item.encrypted) {
        readableReceiptIds.set(item.id, new Set((item.proofpack.deliveryHistory ?? []).map((receipt) => receipt.deliveryId)));
      }
    }
    const orphans = (await blackproofLocalDb.deliverySnapshots.toArray()).filter((item) => {
      if (!caseIds.has(item.caseId)) return true;
      const receiptIds = readableReceiptIds.get(item.caseId);
      return receiptIds ? !receiptIds.has(item.deliveryId) : false;
    });
    await blackproofLocalDb.deliverySnapshots.bulkDelete(orphans.map((item) => [item.caseId, item.deliveryId]));
    return orphans.length;
  });
}

export function localStorageErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return "Quota de stockage local dépassé. Exportez une sauvegarde puis supprimez des snapshots ou dossiers inutiles.";
  }
  return error instanceof Error ? error.message : "Erreur inconnue du stockage local.";
}

export async function deleteDeliverySnapshotForCase(input: {
  caseId: string;
  deliveryId: string;
  expectedRevisionId: string;
  expectedSnapshotSha256: string;
  passphrase?: string;
}): Promise<void> {
  const operationEpoch = await getSessionStorageEpoch();
  await blackproofLocalDb.transaction("rw", blackproofLocalDb.cases, blackproofLocalDb.deliverySnapshots, blackproofLocalDb.metadata, async () => {
    await assertSessionStorageEpoch(operationEpoch);
    const storedCase = await blackproofLocalDb.cases.get(input.caseId);
    if (!storedCase) throw new Error("Le dossier local n’existe plus. Rechargez la page.");
    const current = storedCase.encrypted
      ? input.passphrase
        ? await Dexie.waitFor(decryptStoredPayload<LocalProofCaseRecord>(storedCase.payload, input.passphrase, `case:${input.caseId}`))
        : undefined
      : storedCase;
    if (!current || current.proofpack.revisionId !== input.expectedRevisionId) {
      throw new Error("Ce dossier possède une révision plus récente dans un autre onglet. Rechargez-le avant de supprimer le snapshot.");
    }
    const receipt = current.proofpack.deliveryHistory.find((item) => item.deliveryId === input.deliveryId);
    if (!receipt || receipt.snapshotSha256 !== input.expectedSnapshotSha256) {
      throw new Error("Le reçu Delivery affiché ne correspond plus au Master courant. Rechargez le dossier.");
    }
    const snapshot = await blackproofLocalDb.deliverySnapshots.get([input.caseId, input.deliveryId]);
    if (!snapshot) throw new Error("Snapshot Delivery introuvable dans le stockage local.");
    if (snapshot.caseId !== input.caseId || snapshot.deliveryId !== input.deliveryId) {
      throw new Error("Le snapshot Delivery ne correspond pas au dossier courant.");
    }
    await blackproofLocalDb.deliverySnapshots.delete([input.caseId, input.deliveryId]);
  });
}

export async function saveLocalCaseAndDeleteDeliverySnapshot(input: {
  questionnaire: string;
  proofpack: ProofPack;
  deliveryId: string;
  passphrase?: string;
  baseRevisionId?: string;
  sourceImport?: ProofPackSourceImport;
  sourceLineage?: ProofPackSourceLineage;
  knowledgeUses?: KnowledgeUse[];
  localLabel?: string;
}): Promise<LocalProofCaseRecord> {
  const operationEpoch = await getSessionStorageEpoch();
  if (!input.passphrase) throw new Error("Le chiffrement est obligatoire pour toute écriture d’un dossier local.");
  const canonicalQuestionnaire = sanitizeQuestionnaireInput(input.questionnaire);
  await verifyLocalQuestionnaireBinding(canonicalQuestionnaire, input.proofpack);
  const existing = await blackproofLocalDb.cases.get(input.proofpack.case.id);
  const localLabel = normalizeLocalCaseLabel(input.localLabel ?? existing?.localLabel);
  await assertBaseRevision(existing, input.baseRevisionId, input.passphrase);
  const record: LocalProofCaseRecord = {
    localEnvelopeVersion: LOCAL_ENVELOPE_VERSION,
    id: input.proofpack.case.id,
    title: input.proofpack.case.title,
    ...(localLabel ? { localLabel } : {}),
    companyName: input.proofpack.case.companyName,
    clientName: input.proofpack.case.clientName,
    questionnaire: canonicalQuestionnaire,
    proofpackFingerprint: input.proofpack.fingerprint,
    proofDebtScore: input.proofpack.summary.proofDebtScore,
    questionCount: input.proofpack.summary.questionCount,
    evidenceCount: input.proofpack.summary.evidenceCount,
    proofDebtCount: input.proofpack.summary.proofDebtCount,
    createdAt: input.proofpack.case.createdAt,
    updatedAt: input.proofpack.case.updatedAt,
    methodVersion: input.proofpack.methodVersion,
    proofpack: input.proofpack,
    ...(input.sourceImport ? { sourceImport: input.sourceImport } : {}),
    ...(input.sourceLineage ? { sourceLineage: input.sourceLineage } : {}),
    ...(input.knowledgeUses?.length ? { knowledgeUses: input.knowledgeUses } : {}),
  };
  const stored: EncryptedLocalProofCaseRecord = {
    id: record.id, encrypted: true, createdAt: record.createdAt, updatedAt: record.updatedAt,
    localEnvelopeVersion: LOCAL_ENVELOPE_VERSION,
    revisionId: record.proofpack.revisionId,
    ...(localLabel ? { localLabel } : {}),
    payload: await encryptLocalPayload(record, input.passphrase),
  };
  await blackproofLocalDb.transaction("rw", blackproofLocalDb.cases, blackproofLocalDb.deliverySnapshots, blackproofLocalDb.metadata, async () => {
    await assertSessionStorageEpoch(operationEpoch);
    assertStoredCaseUnchanged(await blackproofLocalDb.cases.get(record.id), existing, input.baseRevisionId);
    await blackproofLocalDb.cases.put(stored);
    await blackproofLocalDb.deliverySnapshots.delete([record.id, input.deliveryId]);
  });
  return record;
}

export async function saveLocalCaseAndDeliverySnapshot(input: {
  questionnaire: string;
  proofpack: ProofPack;
  deliveryId: string;
  deliveryJson: string;
  passphrase?: string;
  baseRevisionId?: string;
  sourceImport?: ProofPackSourceImport;
  sourceLineage?: ProofPackSourceLineage;
  knowledgeUses?: KnowledgeUse[];
  localLabel?: string;
}): Promise<LocalProofCaseRecord> {
  const operationEpoch = await getSessionStorageEpoch();
  if (!input.passphrase) throw new Error("Le chiffrement est obligatoire pour toute écriture d’un dossier local.");
  const canonicalQuestionnaire = sanitizeQuestionnaireInput(input.questionnaire);
  await verifyLocalQuestionnaireBinding(canonicalQuestionnaire, input.proofpack);
  if (input.deliveryJson.length > SECURITY_LIMITS.MAX_DELIVERY_SNAPSHOT_CHARS) {
    throw new SecurityValidationError("DELIVERY_SNAPSHOT_TOO_LARGE", `Delivery snapshot exceeds ${SECURITY_LIMITS.MAX_DELIVERY_SNAPSHOT_CHARS} characters.`);
  }
  const now = new Date().toISOString();
  const existing = await blackproofLocalDb.cases.get(input.proofpack.case.id);
  const localLabel = normalizeLocalCaseLabel(input.localLabel ?? existing?.localLabel);
  await assertBaseRevision(existing, input.baseRevisionId, input.passphrase);
  const record: LocalProofCaseRecord = {
    localEnvelopeVersion: LOCAL_ENVELOPE_VERSION,
    id: input.proofpack.case.id,
    title: input.proofpack.case.title,
    ...(localLabel ? { localLabel } : {}),
    companyName: input.proofpack.case.companyName,
    clientName: input.proofpack.case.clientName,
    questionnaire: canonicalQuestionnaire,
    proofpackFingerprint: input.proofpack.fingerprint,
    proofDebtScore: input.proofpack.summary.proofDebtScore,
    questionCount: input.proofpack.summary.questionCount,
    evidenceCount: input.proofpack.summary.evidenceCount,
    proofDebtCount: input.proofpack.summary.proofDebtCount,
    createdAt: input.proofpack.case.createdAt,
    updatedAt: input.proofpack.case.updatedAt,
    methodVersion: input.proofpack.methodVersion,
    proofpack: input.proofpack,
    ...(input.sourceImport ? { sourceImport: input.sourceImport } : {}),
    ...(input.sourceLineage ? { sourceLineage: input.sourceLineage } : {}),
    ...(input.knowledgeUses?.length ? { knowledgeUses: input.knowledgeUses } : {}),
  };
  const payloads = await encryptLocalPayloadBatch([
    { aad: `case:${record.id}`, value: record },
    { aad: deliverySnapshotAad(record.id, input.deliveryId), value: { deliveryJson: input.deliveryJson } },
  ], input.passphrase);
  const storedCase: EncryptedLocalProofCaseRecord = {
    id: record.id,
    encrypted: true,
    localEnvelopeVersion: LOCAL_ENVELOPE_VERSION,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    revisionId: record.proofpack.revisionId,
    ...(localLabel ? { localLabel } : {}),
    payload: payloads[0],
  };
  const storedSnapshot: EncryptedLocalDeliverySnapshotRecord = {
    deliveryId: input.deliveryId,
    caseId: record.id,
    createdAt: now,
    encrypted: true,
    payload: payloads[1],
  };
  await blackproofLocalDb.transaction("rw", blackproofLocalDb.cases, blackproofLocalDb.deliverySnapshots, blackproofLocalDb.metadata, async () => {
    await assertSessionStorageEpoch(operationEpoch);
    assertStoredCaseUnchanged(await blackproofLocalDb.cases.get(record.id), existing, input.baseRevisionId);
    await blackproofLocalDb.deliverySnapshots.put(storedSnapshot);
    await blackproofLocalDb.cases.put(storedCase);
  });
  return record;
}

export function getStoredLocalCaseRevisionId(record: StoredLocalProofCaseRecord): string | undefined {
  return record.encrypted ? record.revisionId : record.proofpack.revisionId;
}

export async function updateLocalCaseLabel(id: string, label: string, expectedRevisionId: string): Promise<void> {
  const operationEpoch = await getSessionStorageEpoch();
  const localLabel = normalizeLocalCaseLabel(label);
  await blackproofLocalDb.transaction("rw", blackproofLocalDb.cases, blackproofLocalDb.metadata, async () => {
    await assertSessionStorageEpoch(operationEpoch);
    const current = await blackproofLocalDb.cases.get(id);
    if (!current || getStoredLocalCaseRevisionId(current) !== expectedRevisionId) {
      throw new Error("Ce dossier a changé depuis l’affichage de la liste. Rafraîchissez la liste avant de modifier son repère.");
    }
    await blackproofLocalDb.cases.put({ ...current, localLabel });
  });
}

export async function deleteLocalCase(id: string, expectedRevisionId: string): Promise<void> {
  const operationEpoch = await getSessionStorageEpoch();
  await blackproofLocalDb.transaction("rw", blackproofLocalDb.cases, blackproofLocalDb.deliverySnapshots, blackproofLocalDb.metadata, async () => {
    await assertSessionStorageEpoch(operationEpoch);
    const current = await blackproofLocalDb.cases.get(id);
    if (!current || getStoredLocalCaseRevisionId(current) !== expectedRevisionId) {
      throw new Error("Ce dossier a changé depuis l’affichage de la liste. Rafraîchissez la liste avant de le supprimer.");
    }
    await blackproofLocalDb.deliverySnapshots.where("caseId").equals(id).delete();
    await blackproofLocalDb.cases.delete(id);
  });
}

export async function clearLocalCases(): Promise<void> {
  let nextEpoch = 0;
  await blackproofLocalDb.transaction("rw", blackproofLocalDb.cases, blackproofLocalDb.deliverySnapshots, blackproofLocalDb.metadata, async () => {
    nextEpoch = (await readStorageEpoch()) + 1;
    await blackproofLocalDb.deliverySnapshots.clear();
    await blackproofLocalDb.cases.clear();
    await blackproofLocalDb.metadata.put({ key: STORAGE_EPOCH_KEY, value: nextEpoch });
  });
  sessionStorageEpochPromise = Promise.resolve(nextEpoch);
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(STORAGE_WIPE_CHANNEL);
    channel.postMessage({ type: "storage-wiped", epoch: nextEpoch });
    channel.close();
  }
}
