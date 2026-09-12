import JSZip from "jszip";
import { sha256Hex, verifyDeliveryReceiptWithSnapshot, verifyProofPackJson, type DeliveryHistoryEntry, type ProofPack } from "@blackproof/core";
import { decryptLocalPayload, decryptLocalPayloadBatch, encryptLocalPayloadBatch, type EncryptedLocalBatchPayload, type EncryptedLocalPayload } from "./local-encryption";
import { LOCAL_ENVELOPE_VERSION, captureLocalStorageEpoch, getDeliverySnapshot, getLocalCase, hasDeliverySnapshot, isLocalCaseStoredEncrypted, listDeliverySnapshotIdsForCase, migrateCanonicalLocalProofCaseRecord, observeLocalCaseWriteExpectation, restoreLocalCaseBackup, verifyLocalQuestionnaireBinding, type LocalProofCaseRecord } from "./local-db";
import validateBackupManifestV2 from "./generated/local-backup-manifest-v2-validator.js";
import { inspectZipCentralDirectory } from "./zip-preflight";

const BACKUP_VERSION = "blackproof-local-backup-v2";
const LEGACY_BACKUP_VERSION = "blackproof-local-backup-v1";
export const MAX_BACKUP_ENTRY_BYTES = 4_500_000;
export const MAX_BACKUP_CLEAR_BYTES = 40_000_000;
export const MAX_BACKUP_STORED_BYTES = 50_000_000;
export const MAX_BACKUP_ZIP_BYTES = 50_000_000;
export const MAX_BACKUP_V2_FILES = 252;
export const MAX_BACKUP_V1_FILES = 252;
export const MAX_BACKUP_FILES = MAX_BACKUP_V2_FILES;
const MAX_BACKUP_MANIFEST_BYTES = 256_000;
type BackupManifest = { version: typeof BACKUP_VERSION | typeof LEGACY_BACKUP_VERSION; localEnvelopeVersion?: typeof LOCAL_ENVELOPE_VERSION; encrypted: boolean; caseId: string; files: Array<{ path: string; sha256: string; size?: number }>; missingSnapshotDeliveryIds: string[] };
type AuthenticatedInventory = { version: 1; localEnvelopeVersion?: typeof LOCAL_ENVELOPE_VERSION; caseId: string; paths: string[]; missingSnapshotDeliveryIds: string[] };

interface ZipByteStream {
  on(event: "data", callback: (chunk: Uint8Array) => void): ZipByteStream;
  on(event: "error", callback: (error: Error) => void): ZipByteStream;
  on(event: "end", callback: () => void): ZipByteStream;
  pause(): ZipByteStream;
  resume(): ZipByteStream;
}

function isAllowedBackupPath(path: string): boolean {
  return path === "master.json" || path === "inventory.json" || /^snapshots\/[A-Za-z0-9_-]{1,160}\.json$/.test(path);
}

// JSZip 3.10.1 does not expose bounded streaming or central-directory metadata
// publicly. Keep all private API access in this adapter and pin the dependency.
function zipEntryMetadata(entry: JSZip.JSZipObject): { compressedSize: number; uncompressedSize: number; crc32: number } {
  const data = (entry as unknown as { _data?: { compressedSize?: number; uncompressedSize?: number; crc32?: number } })._data;
  return { compressedSize: Number(data?.compressedSize), uncompressedSize: Number(data?.uncompressedSize), crc32: Number(data?.crc32) >>> 0 };
}

const CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  return crc >>> 0;
});

async function extractEntryBounded(entry: JSZip.JSZipObject, limit: number, expanded: { value: number }): Promise<string> {
  return new Promise((resolve, reject) => {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    const chunks: string[] = [];
    let bytes = 0;
    let crc = 0xffffffff;
    let settled = false;
    const stream = (entry as unknown as { internalStream(type: "uint8array"): ZipByteStream }).internalStream("uint8array");
    const fail = (error: Error) => { if (!settled) { settled = true; stream.pause(); reject(error); } };
    stream.on("data", (chunk) => {
      if (settled) return;
      bytes += chunk.byteLength;
      expanded.value += chunk.byteLength;
      if (bytes > limit) return fail(new Error(`Entrée ZIP trop volumineuse : ${entry.name}.`));
      if (expanded.value > MAX_BACKUP_STORED_BYTES + MAX_BACKUP_MANIFEST_BYTES) return fail(new Error("Taille décompressée totale excessive."));
      for (const byte of chunk) crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
      try { chunks.push(decoder.decode(chunk, { stream: true })); } catch { fail(new Error(`Texte UTF-8 invalide : ${entry.name}.`)); }
    });
    stream.on("error", () => fail(new Error(`Entrée ZIP illisible : ${entry.name}.`)));
    stream.on("end", () => {
      if (settled) return;
      try { chunks.push(decoder.decode()); } catch { return fail(new Error(`Texte UTF-8 invalide : ${entry.name}.`)); }
      if (((crc ^ 0xffffffff) >>> 0) !== zipEntryMetadata(entry).crc32) return fail(new Error(`CRC ZIP invalide : ${entry.name}.`));
      settled = true;
      resolve(chunks.join(""));
    });
    stream.resume();
  });
}

function assertManifest(value: unknown): asserts value is BackupManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Manifest de sauvegarde invalide.");
  const manifest = value as Record<string, unknown>;
  if (manifest.version === BACKUP_VERSION) {
    if (!validateBackupManifestV2(value)) throw new Error("Manifest V2 non conforme au schéma canonique.");
    return;
  }
  const keys = Object.keys(manifest).sort();
  if (keys.join("|") !== "caseId|encrypted|files|missingSnapshotDeliveryIds|version") throw new Error("Propriétés du manifest de sauvegarde invalides.");
  if (manifest.version !== LEGACY_BACKUP_VERSION) throw new Error("Version de sauvegarde locale non prise en charge.");
  if (typeof manifest.encrypted !== "boolean" || typeof manifest.caseId !== "string" || manifest.caseId.length < 1 || manifest.caseId.length > 160) throw new Error("Métadonnées du manifest de sauvegarde invalides.");
  if (!Array.isArray(manifest.files) || manifest.files.length < 1 || manifest.files.length > MAX_BACKUP_V1_FILES) throw new Error("Inventaire de sauvegarde invalide.");
  if (!Array.isArray(manifest.missingSnapshotDeliveryIds) || manifest.missingSnapshotDeliveryIds.some((id) => typeof id !== "string" || !/^[A-Za-z0-9_-]{1,160}$/.test(id))) throw new Error("Liste des snapshots absents invalide.");
  if (new Set(manifest.missingSnapshotDeliveryIds).size !== manifest.missingSnapshotDeliveryIds.length) throw new Error("Liste des snapshots absents dupliquée.");
}

export interface LocalBackupBuildResult { blob: Blob; includedSnapshots: number; expectedSnapshots: number; missingSnapshotDeliveryIds: string[]; encrypted: boolean; migratedLegacyEnvelope: boolean; questionnaireCanonicalized: boolean }

export async function assertLocalBackupDeliverySnapshot(
  proofpack: ProofPack,
  receipt: DeliveryHistoryEntry,
  snapshot: string,
): Promise<void> {
  const verification = await verifyDeliveryReceiptWithSnapshot(proofpack, receipt, snapshot);
  if (!verification.isValid) throw new Error(`Le snapshot Delivery ${receipt.deliveryId} est invalide. Sauvegarde refusée.`);
}

export async function buildLocalBackup(record: LocalProofCaseRecord, passphrase?: string): Promise<LocalBackupBuildResult> {
  if (!passphrase) throw new Error("Une phrase secrète est obligatoire pour générer une sauvegarde locale chiffrée.");
  const masterVerification = await verifyProofPackJson(JSON.stringify(record.proofpack));
  if (!masterVerification.isValid) throw new Error("Le Master local est invalide. Sauvegarde refusée.");
  const normalization = await migrateCanonicalLocalProofCaseRecord(record);
  record = normalization.record;
  await verifyLocalQuestionnaireBinding(record.questionnaire, record.proofpack);
  const zip = new JSZip();
  const contents = new Map<string, string>();
  const missingSnapshotDeliveryIds: string[] = [];
  let clearBytes = 0;
  contents.set("master.json", JSON.stringify(record));
  for (const receipt of record.proofpack.deliveryHistory) {
    const snapshot = await getDeliverySnapshot(record.id, receipt.deliveryId, passphrase);
    if (snapshot) {
      await assertLocalBackupDeliverySnapshot(record.proofpack, receipt, snapshot);
      contents.set(`snapshots/${receipt.deliveryId}.json`, snapshot);
    }
    else if (receipt.snapshotSha256) missingSnapshotDeliveryIds.push(receipt.deliveryId);
  }
  if (passphrase) {
    const authenticatedInventory: AuthenticatedInventory = {
      version: 1,
      localEnvelopeVersion: LOCAL_ENVELOPE_VERSION,
      caseId: record.id,
      paths: [...contents.keys()].sort(),
      missingSnapshotDeliveryIds: [...missingSnapshotDeliveryIds].sort(),
    };
    contents.set("inventory.json", JSON.stringify(authenticatedInventory));
  }
  if (contents.size > MAX_BACKUP_V2_FILES) throw new Error(`La sauvegarde dépasse la limite de ${MAX_BACKUP_V2_FILES} fichiers.`);
  for (const [path, cleartext] of contents) {
    const size = new TextEncoder().encode(cleartext).byteLength;
    if (size > MAX_BACKUP_ENTRY_BYTES) throw new Error(`Fichier de sauvegarde trop volumineux : ${path}.`);
    clearBytes += size;
  }
  if (clearBytes > MAX_BACKUP_CLEAR_BYTES) throw new Error(`Contenu de sauvegarde supérieur à ${MAX_BACKUP_CLEAR_BYTES} octets.`);
  const files: BackupManifest["files"] = [];
  const encryptedContents = await encryptLocalPayloadBatch(
    [...contents].map(([path, cleartext]) => ({ aad: path, value: { cleartext } })),
    passphrase,
  );
  let encryptedIndex = 0;
  let storedBytes = 0;
  for (const path of contents.keys()) {
    const stored = JSON.stringify(encryptedContents[encryptedIndex++]);
    zip.file(path, stored, { createFolders: false });
    const size = new TextEncoder().encode(stored).byteLength;
    if (size > MAX_BACKUP_ENTRY_BYTES) throw new Error(`Fichier de sauvegarde trop volumineux : ${path}.`);
    storedBytes += size;
    files.push({ path, sha256: await sha256Hex(stored), size });
  }
  if (storedBytes > MAX_BACKUP_STORED_BYTES) throw new Error(`Contenu encodé de sauvegarde supérieur à ${MAX_BACKUP_STORED_BYTES} octets.`);
  const manifest: BackupManifest = { version: BACKUP_VERSION, localEnvelopeVersion: LOCAL_ENVELOPE_VERSION, encrypted: true, caseId: record.id, files, missingSnapshotDeliveryIds };
  assertManifest(manifest);
  const manifestJson = JSON.stringify(manifest, null, 2);
  const manifestBytes = new TextEncoder().encode(manifestJson).byteLength;
  const conservativeZipUpperBound = storedBytes + Math.ceil(storedBytes / 100) + manifestBytes + ((files.length + 1) * 256);
  if (conservativeZipUpperBound > MAX_BACKUP_ZIP_BYTES) throw new Error(`La sauvegarde dépasserait la limite ZIP de ${MAX_BACKUP_ZIP_BYTES} octets. Réduisez le nombre de snapshots.`);
  zip.file("manifest.json", manifestJson, { createFolders: false });
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  if (blob.size > MAX_BACKUP_ZIP_BYTES) throw new Error(`Archive générée supérieure à ${MAX_BACKUP_ZIP_BYTES} octets. Réduisez le nombre de snapshots.`);
  return { blob, includedSnapshots: contents.size - 2, expectedSnapshots: record.proofpack.deliveryHistory.filter((receipt) => Boolean(receipt.snapshotSha256)).length, missingSnapshotDeliveryIds, encrypted: true, migratedLegacyEnvelope: normalization.envelopeVersionMigrated, questionnaireCanonicalized: normalization.questionnaireCanonicalized };
}

export async function buildLocalBackupBlob(record: LocalProofCaseRecord, passphrase?: string): Promise<Blob> { return (await buildLocalBackup(record, passphrase)).blob; }

export interface RestoreLocalBackupOptions {
  backupPassphrase?: string;
  existingPassphrase?: string;
  targetPassphrase?: string;
  operationEpoch?: number;
  allowDataLoss?: boolean;
  allowPartial?: boolean;
  signal?: AbortSignal;
}

const restoreExpectations = new WeakMap<File, ReturnType<typeof observeLocalCaseWriteExpectation>>();
const restoreOperationEpochs = new WeakMap<File, Promise<number>>();

export async function restoreLocalBackup(file: File, options: RestoreLocalBackupOptions = {}): Promise<{ caseId: string; restoredSnapshots: number; mergedSnapshots: number; deletedSnapshots: number; missingSnapshots: number; encrypted: boolean; migratedLegacyEnvelope: boolean; questionnaireCanonicalized: boolean }> {
  const assertActive = () => {
    if (options.signal?.aborted) throw new Error("Restauration locale annulée avant écriture.");
  };
  assertActive();
  if (file.size > MAX_BACKUP_ZIP_BYTES) throw new Error(`Sauvegarde locale supérieure à ${MAX_BACKUP_ZIP_BYTES} octets.`);
  let operationEpochPromise = restoreOperationEpochs.get(file);
  if (!operationEpochPromise) {
    operationEpochPromise = options.operationEpoch === undefined
      ? captureLocalStorageEpoch()
      : Promise.resolve(options.operationEpoch);
    restoreOperationEpochs.set(file, operationEpochPromise);
  }
  const operationEpoch = await operationEpochPromise;
  assertActive();
  const preflight = await inspectZipCentralDirectory(file, Math.max(MAX_BACKUP_V1_FILES, MAX_BACKUP_V2_FILES) + 2);
  if (preflight.comment) throw new Error("Les commentaires EOCD ne sont pas autorisés dans une sauvegarde locale.");
  const zip = await JSZip.loadAsync(file, { checkCRC32: false, createFolders: false });
  const entries = Object.values(zip.files);
  const jsZipNames = Object.keys(zip.files);
  if (jsZipNames.length !== preflight.names.length || preflight.names.some((name) => !Object.hasOwn(zip.files, name))) {
    throw new Error("L’inventaire traité par JSZip diffère de la table centrale validée.");
  }
  if (entries.length > Math.max(MAX_BACKUP_V1_FILES, MAX_BACKUP_V2_FILES) + 2) throw new Error("La sauvegarde contient trop d’entrées.");
  let declaredExpandedBytes = 0;
  for (const entry of entries) {
    const original = (entry as JSZip.JSZipObject & { unsafeOriginalName?: string }).unsafeOriginalName;
    const legacySnapshotsDirectory = entry.dir && entry.name === "snapshots/";
    if ((entry.dir && !legacySnapshotsDirectory) || (original && original !== entry.name) || (!legacySnapshotsDirectory && entry.name !== "manifest.json" && !isAllowedBackupPath(entry.name))) throw new Error("La sauvegarde contient un chemin inattendu.");
    if (legacySnapshotsDirectory) continue;
    const { compressedSize, uncompressedSize } = zipEntryMetadata(entry);
    if (!Number.isSafeInteger(compressedSize) || !Number.isSafeInteger(uncompressedSize) || compressedSize < 0 || uncompressedSize < 0) throw new Error("Métadonnées ZIP invalides.");
    const limit = entry.name === "manifest.json" ? MAX_BACKUP_MANIFEST_BYTES : MAX_BACKUP_ENTRY_BYTES;
    if (uncompressedSize > limit) throw new Error(`Entrée ZIP trop volumineuse : ${entry.name}.`);
    declaredExpandedBytes += uncompressedSize;
    if (declaredExpandedBytes > MAX_BACKUP_STORED_BYTES + MAX_BACKUP_MANIFEST_BYTES) throw new Error("Taille décompressée totale excessive.");
  }
  const actualExpanded = { value: 0 };
  const manifestEntry = zip.file("manifest.json");
  const manifestText = manifestEntry ? await extractEntryBounded(manifestEntry, MAX_BACKUP_MANIFEST_BYTES, actualExpanded) : undefined;
  if (!manifestText) throw new Error("Manifest de sauvegarde absent.");
  let manifestValue: unknown;
  try { manifestValue = JSON.parse(manifestText); } catch { throw new Error("Manifest de sauvegarde illisible."); }
  assertManifest(manifestValue);
  const manifest = manifestValue;
  let expectedExistingPromise = restoreExpectations.get(file);
  if (!expectedExistingPromise) {
    expectedExistingPromise = observeLocalCaseWriteExpectation(manifest.caseId, operationEpoch);
    restoreExpectations.set(file, expectedExistingPromise);
  }
  const expectedExisting = await expectedExistingPromise;
  const manifestFileLimit = manifest.version === LEGACY_BACKUP_VERSION ? MAX_BACKUP_V1_FILES : MAX_BACKUP_V2_FILES;
  if (manifest.files.length > manifestFileLimit || entries.length > manifestFileLimit + 2) throw new Error("La sauvegarde contient trop d’entrées.");
  const inventoryPaths = new Set<string>();
  for (const descriptor of manifest.files) {
    if (!descriptor || typeof descriptor.path !== "string" || !isAllowedBackupPath(descriptor.path) || inventoryPaths.has(descriptor.path) || !/^[a-f0-9]{64}$/.test(descriptor.sha256)) throw new Error("Inventaire de sauvegarde invalide.");
    const entry = zip.file(descriptor.path);
    if (!entry) throw new Error(`Fichier inventorié absent : ${descriptor.path}.`);
    const descriptorKeys = Object.keys(descriptor as object).sort().join("|");
    if (descriptorKeys !== (manifest.version === BACKUP_VERSION ? "path|sha256|size" : "path|sha256")) throw new Error("Descripteur de fichier invalide.");
    const actualSize = zipEntryMetadata(entry).uncompressedSize;
    if (manifest.version === BACKUP_VERSION && (!Number.isSafeInteger(descriptor.size) || descriptor.size !== actualSize)) throw new Error(`Taille inventoriée invalide : ${descriptor.path}.`);
    inventoryPaths.add(descriptor.path);
  }
  if (!inventoryPaths.has("master.json")) throw new Error("Master absent de l’inventaire.");
  const allowedPaths = new Set(["manifest.json", ...manifest.files.map((item) => item.path), ...(manifest.version === LEGACY_BACKUP_VERSION ? ["snapshots/"] : [])]);
  if (Object.keys(zip.files).some((path) => !allowedPaths.has(path) || path.includes("..") || path.startsWith("/"))) throw new Error("La sauvegarde contient un chemin inattendu.");
  if (manifest.encrypted && !options.backupPassphrase) throw new Error("Cette sauvegarde est chiffrée. Une phrase secrète est requise.");
  const storedByPath = new Map<string, string>();
  let unencryptedClearBytes = 0;
  for (const descriptor of manifest.files) {
    const entry = zip.file(descriptor.path)!;
    const stored = await extractEntryBounded(entry, MAX_BACKUP_ENTRY_BYTES, actualExpanded);
    if (await sha256Hex(stored) !== descriptor.sha256) throw new Error(`Fichier de sauvegarde invalide : ${descriptor.path}.`);
    if (!manifest.encrypted) unencryptedClearBytes += new TextEncoder().encode(stored).byteLength;
    storedByPath.set(descriptor.path, stored);
  }
  if (unencryptedClearBytes > MAX_BACKUP_CLEAR_BYTES) throw new Error("Contenu clair de sauvegarde trop volumineux.");
  const batchCleartext = new Map<string, string>();
  let batchInitialization: Promise<void> | undefined;
  const initializeBatch = () => batchInitialization ??= (async () => {
    if (!manifest.encrypted || manifest.version !== BACKUP_VERSION) return;
    const envelopes: EncryptedLocalBatchPayload[] = [];
    const paths: string[] = [];
    for (const descriptor of manifest.files) {
      const stored = storedByPath.get(descriptor.path);
      if (!stored) throw new Error(`Fichier de sauvegarde invalide : ${descriptor.path}.`);
      const envelope = JSON.parse(stored) as EncryptedLocalBatchPayload;
      if (envelope.version !== 2 || envelope.aad !== descriptor.path) throw new Error(`Contexte chiffré invalide : ${descriptor.path}.`);
      envelopes.push(envelope);
      paths.push(descriptor.path);
    }
    const decrypted = await decryptLocalPayloadBatch<{ cleartext: string }>(envelopes, options.backupPassphrase!);
    assertActive();
    let clearBytes = 0;
    decrypted.forEach((value, index) => {
      const size = new TextEncoder().encode(value.cleartext).byteLength;
      if (size > MAX_BACKUP_ENTRY_BYTES) throw new Error(`Contenu déchiffré trop volumineux : ${paths[index]}.`);
      clearBytes += size;
      batchCleartext.set(paths[index], value.cleartext);
    });
    if (clearBytes > MAX_BACKUP_CLEAR_BYTES) throw new Error("Contenu déchiffré total trop volumineux.");
  })();
  const clear = async (path: string) => {
    const stored = storedByPath.get(path);
    const descriptor = manifest.files.find((item) => item.path === path);
    if (!stored || !descriptor || await sha256Hex(stored) !== descriptor.sha256) throw new Error(`Fichier de sauvegarde invalide : ${path}.`);
    if (!manifest.encrypted) return stored;
    if (manifest.version === BACKUP_VERSION) {
      await initializeBatch();
      const value = batchCleartext.get(path);
      if (value === undefined) throw new Error(`Fichier chiffré absent : ${path}.`);
      return value;
    }
    const parsed = JSON.parse(stored) as EncryptedLocalPayload | EncryptedLocalBatchPayload;
    return (await decryptLocalPayload<{ cleartext: string }>(parsed as EncryptedLocalPayload, options.backupPassphrase!)).cleartext;
  };
  let record = JSON.parse(await clear("master.json")) as LocalProofCaseRecord;
  const masterVerification = await verifyProofPackJson(JSON.stringify(record.proofpack));
  if (!masterVerification.isValid || record.id !== manifest.caseId) throw new Error("Master de sauvegarde invalide.");
  const normalization = await migrateCanonicalLocalProofCaseRecord(record);
  record = normalization.record;
  await verifyLocalQuestionnaireBinding(record.questionnaire, record.proofpack);
  const receiptIds = new Set(record.proofpack.deliveryHistory.map((receipt) => receipt.deliveryId));
  const missingIds = new Set(manifest.missingSnapshotDeliveryIds);
  if (manifest.encrypted && manifest.version === BACKUP_VERSION && !inventoryPaths.has("inventory.json")) {
    throw new Error("Inventaire authentifié absent de la sauvegarde chiffrée.");
  }
  if (manifest.encrypted && inventoryPaths.has("inventory.json")) {
    let authenticatedInventory: AuthenticatedInventory;
    try { authenticatedInventory = JSON.parse(await clear("inventory.json")) as AuthenticatedInventory; }
    catch { throw new Error("Inventaire authentifié de sauvegarde invalide."); }
    const expectedPaths = manifest.files.map((item) => item.path).filter((path) => path !== "inventory.json").sort();
    if (authenticatedInventory.version !== 1 ||
      (authenticatedInventory.localEnvelopeVersion !== undefined && authenticatedInventory.localEnvelopeVersion !== LOCAL_ENVELOPE_VERSION) ||
      authenticatedInventory.caseId !== manifest.caseId ||
      JSON.stringify(authenticatedInventory.paths) !== JSON.stringify(expectedPaths) ||
      JSON.stringify(authenticatedInventory.missingSnapshotDeliveryIds) !== JSON.stringify([...manifest.missingSnapshotDeliveryIds].sort())) {
      throw new Error("Inventaire chiffré altéré ou tronqué.");
    }
  }
  if (manifest.missingSnapshotDeliveryIds.some((id) => !receiptIds.has(id))) throw new Error("Snapshot absent sans reçu correspondant.");
  for (const descriptor of manifest.files.filter((item) => item.path.startsWith("snapshots/"))) {
    const deliveryId = descriptor.path.slice("snapshots/".length, -".json".length);
    if (!receiptIds.has(deliveryId) || missingIds.has(deliveryId)) throw new Error("Inventaire des snapshots incohérent avec le Master.");
  }
  for (const receipt of record.proofpack.deliveryHistory.filter((item) => Boolean(item.snapshotSha256))) {
    const hasFile = inventoryPaths.has(`snapshots/${receipt.deliveryId}.json`);
    const declaredMissing = missingIds.has(receipt.deliveryId);
    if (hasFile === declaredMissing) throw new Error(`État du snapshot incohérent dans le manifest : ${receipt.deliveryId}.`);
  }
  const snapshots: Array<{ deliveryId: string; deliveryJson: string }> = [];
  const mergedSnapshotIds = new Set<string>();
  const existingEncrypted = await isLocalCaseStoredEncrypted(record.id);
  if (existingEncrypted && !options.existingPassphrase) {
    throw new Error("La restauration remplacerait un dossier actuellement chiffré. Saisissez sa phrase secrète actuelle pour conserver le chiffrement.");
  }
  if (existingEncrypted) await getLocalCase(record.id, options.existingPassphrase);
  for (const receipt of record.proofpack.deliveryHistory) {
    const path = `snapshots/${receipt.deliveryId}.json`;
    if (!manifest.files.some((item) => item.path === path)) {
      if (receipt.snapshotSha256 && !manifest.missingSnapshotDeliveryIds?.includes(receipt.deliveryId)) throw new Error(`Snapshot attendu absent sans déclaration : ${receipt.deliveryId}.`);
      if (await hasDeliverySnapshot(record.id, receipt.deliveryId)) {
        const existingJson = await getDeliverySnapshot(record.id, receipt.deliveryId, options.existingPassphrase);
        if (existingJson && (await verifyDeliveryReceiptWithSnapshot(record.proofpack as ProofPack, receipt, existingJson)).isValid) {
          snapshots.push({ deliveryId: receipt.deliveryId, deliveryJson: existingJson });
          mergedSnapshotIds.add(receipt.deliveryId);
        }
      }
      continue;
    }
    const deliveryJson = await clear(path);
    if (!(await verifyDeliveryReceiptWithSnapshot(record.proofpack as ProofPack, receipt, deliveryJson)).isValid) throw new Error(`Snapshot invalide : ${receipt.deliveryId}.`);
    snapshots.push({ deliveryId: receipt.deliveryId, deliveryJson });
  }
  const restoredReceiptIds = new Set(record.proofpack.deliveryHistory.map((receipt) => receipt.deliveryId));
  const currentIds = await listDeliverySnapshotIdsForCase(record.id);
  const deletedSnapshots = currentIds.filter((id) => !restoredReceiptIds.has(id)).length;
  const expectedSnapshots = record.proofpack.deliveryHistory.filter((receipt) => Boolean(receipt.snapshotSha256)).length;
  const missingSnapshots = Math.max(0, expectedSnapshots - snapshots.length);
  if (manifest.missingSnapshotDeliveryIds.length > 0 && !options.allowPartial) {
    throw new Error(`RESTORE_PARTIAL_CONFIRM:${expectedSnapshots}:${manifest.files.filter((item) => item.path.startsWith("snapshots/")).length}:${mergedSnapshotIds.size}:${missingSnapshots}`);
  }
  if (deletedSnapshots > 0 && !options.allowDataLoss) {
    throw new Error(`RESTORE_DATA_LOSS:${snapshots.length}:${record.proofpack.deliveryHistory.filter((receipt) => receipt.snapshotSha256).length}:${deletedSnapshots}`);
  }
  const targetPassphrase = options.targetPassphrase ?? (manifest.encrypted ? options.backupPassphrase : undefined);
  if (!targetPassphrase) throw new Error("Une nouvelle phrase secrète est obligatoire pour restaurer ce dossier sous chiffrement.");
  assertActive();
  await restoreLocalCaseBackup({ record, snapshots, passphrase: targetPassphrase, expectedExisting, signal: options.signal });
  assertActive();
  restoreExpectations.delete(file);
  restoreOperationEpochs.delete(file);
  return { caseId: record.id, restoredSnapshots: snapshots.length, mergedSnapshots: mergedSnapshotIds.size, deletedSnapshots, missingSnapshots, encrypted: Boolean(targetPassphrase), migratedLegacyEnvelope: normalization.envelopeVersionMigrated, questionnaireCanonicalized: normalization.questionnaireCanonicalized };
}
