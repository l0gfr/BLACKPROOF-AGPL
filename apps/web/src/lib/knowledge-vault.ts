import Dexie, { type Table } from "dexie";
import {
  KNOWLEDGE_VAULT_VERSION,
  MAX_KNOWLEDGE_ENTRIES,
  sha256Hex,
  stableStringify,
  verifyKnowledgeEntry,
  type KnowledgeEntry,
  type PersonalKnowledgeVault,
} from "@blackproof/core";
import {
  CURRENT_PBKDF2_ITERATIONS,
  decryptLocalPayload,
  encryptLocalPayload,
  needsLocalEncryptionUpgrade,
  upgradeLocalPayloadEncryption,
  type EncryptedLocalPayload,
} from "./local-encryption";

const KNOWLEDGE_DB_NAME = "blackproof-personal-knowledge";
const PERSONAL_VAULT_ID = "personal" as const;
const KNOWLEDGE_BACKUP_VERSION = "blackproof-personal-knowledge-backup-v1" as const;
const MAX_KNOWLEDGE_BACKUP_BYTES = 5_000_000;
const KNOWLEDGE_WIPE_CHANNEL = "blackproof-knowledge-wipe-v1";
const KNOWLEDGE_EPOCH_KEY = "storageEpoch";
const KNOWLEDGE_EPOCH_CONFLICT_MESSAGE = "KNOWLEDGE_VAULT_WIPED: le coffre a été effacé pendant cette opération.";

interface StoredKnowledgeVault {
  id: typeof PERSONAL_VAULT_ID;
  revisionId: string;
  updatedAt: string;
  payload: EncryptedLocalPayload;
}
interface KnowledgeBackup {
  formatVersion: typeof KNOWLEDGE_BACKUP_VERSION;
  exportedAt: string;
  vault: StoredKnowledgeVault;
  fingerprint: string;
}

interface KnowledgeMetadata {
  key: typeof KNOWLEDGE_EPOCH_KEY;
  value: number;
}

class PersonalKnowledgeDatabase extends Dexie {
  vaults!: Table<StoredKnowledgeVault, string>;
  metadata!: Table<KnowledgeMetadata, string>;

  constructor() {
    super(KNOWLEDGE_DB_NAME);
    this.version(1).stores({ vaults: "id, revisionId, updatedAt" });
    this.version(2).stores({ vaults: "id, revisionId, updatedAt", metadata: "key" });
  }
}

const db = new PersonalKnowledgeDatabase();

async function readKnowledgeEpoch(): Promise<number> {
  return (await db.metadata.get(KNOWLEDGE_EPOCH_KEY))?.value ?? 0;
}

let sessionKnowledgeEpochPromise: Promise<number> | undefined = typeof indexedDB === "undefined"
  ? undefined
  : readKnowledgeEpoch();

async function getSessionKnowledgeEpoch(): Promise<number> {
  sessionKnowledgeEpochPromise ??= readKnowledgeEpoch();
  return sessionKnowledgeEpochPromise;
}

export async function captureKnowledgeVaultEpoch(): Promise<number> {
  return getSessionKnowledgeEpoch();
}

async function assertKnowledgeEpoch(operationEpoch: number): Promise<void> {
  if (await readKnowledgeEpoch() !== operationEpoch) throw new Error(KNOWLEDGE_EPOCH_CONFLICT_MESSAGE);
}

function emptyVault(): PersonalKnowledgeVault {
  return {
    formatVersion: KNOWLEDGE_VAULT_VERSION,
    revisionId: "empty",
    updatedAt: new Date(0).toISOString(),
    entries: [],
  };
}

async function assertVault(vault: PersonalKnowledgeVault): Promise<void> {
  if (vault.formatVersion !== KNOWLEDGE_VAULT_VERSION || !vault.revisionId || !Array.isArray(vault.entries) || vault.entries.length > MAX_KNOWLEDGE_ENTRIES) {
    throw new Error("KNOWLEDGE_VAULT_INVALID: format ou limites invalides.");
  }
  const ids = new Set<string>();
  for (const entry of vault.entries) {
    if (ids.has(entry.id)) throw new Error("KNOWLEDGE_VAULT_DUPLICATE_ID: identifiant dupliqué.");
    ids.add(entry.id);
    if (!(await verifyKnowledgeEntry(entry))) throw new Error(`KNOWLEDGE_ENTRY_INVALID: ${entry.id}.`);
  }
}

async function decryptStoredVault(stored: StoredKnowledgeVault, passphrase: string): Promise<PersonalKnowledgeVault> {
  const vault = await decryptLocalPayload<PersonalKnowledgeVault>(stored.payload, passphrase);
  if (vault.revisionId !== stored.revisionId) throw new Error("KNOWLEDGE_VAULT_REVISION_MISMATCH: enveloppe incohérente.");
  await assertVault(vault);
  return vault;
}

async function upgradeStoredVaultEncryption(
  stored: StoredKnowledgeVault,
  vault: PersonalKnowledgeVault,
  passphrase: string,
): Promise<void> {
  if (!needsLocalEncryptionUpgrade(stored.payload)) return;
  const operationEpoch = await getSessionKnowledgeEpoch();
  const payload = await upgradeLocalPayloadEncryption(vault, passphrase);
  if (payload.iterations !== CURRENT_PBKDF2_ITERATIONS) throw new Error("KNOWLEDGE_VAULT_UPGRADE_FAILED: paramètres PBKDF2 inattendus.");
  const verified = await decryptLocalPayload<PersonalKnowledgeVault>(payload, passphrase);
  if (verified.revisionId !== vault.revisionId) throw new Error("KNOWLEDGE_VAULT_UPGRADE_FAILED: relecture incohérente.");

  await db.transaction("rw", db.vaults, db.metadata, async () => {
    await assertKnowledgeEpoch(operationEpoch);
    const current = await db.vaults.get(PERSONAL_VAULT_ID);
    if (!current || JSON.stringify(current.payload) !== JSON.stringify(stored.payload)) {
      throw new Error("KNOWLEDGE_VAULT_CONFLICT: la base a changé dans un autre onglet.");
    }
    await db.vaults.put({ ...current, payload });
    const reread = await db.vaults.get(PERSONAL_VAULT_ID);
    if (!reread || JSON.stringify(reread.payload) !== JSON.stringify(payload)) {
      throw new Error("KNOWLEDGE_VAULT_UPGRADE_FAILED: relecture du ciphertext impossible.");
    }
  });
}

async function persistVault(
  vault: PersonalKnowledgeVault,
  passphrase: string,
  expectedRevisionId?: string,
  capturedOperationEpoch?: number,
): Promise<PersonalKnowledgeVault> {
  const operationEpoch = capturedOperationEpoch ?? await getSessionKnowledgeEpoch();
  await assertVault(vault);
  const current = await db.vaults.get(PERSONAL_VAULT_ID);
  if ((current?.revisionId ?? "empty") !== (expectedRevisionId ?? "empty")) {
    throw new Error("KNOWLEDGE_VAULT_CONFLICT: la base a changé dans un autre onglet.");
  }
  const next: PersonalKnowledgeVault = {
    ...vault,
    revisionId: crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
  };
  const stored: StoredKnowledgeVault = {
    id: PERSONAL_VAULT_ID,
    revisionId: next.revisionId,
    updatedAt: next.updatedAt,
    payload: await encryptLocalPayload(next, passphrase),
  };
  await db.transaction("rw", db.vaults, db.metadata, async () => {
    await assertKnowledgeEpoch(operationEpoch);
    const observed = await db.vaults.get(PERSONAL_VAULT_ID);
    if ((observed?.revisionId ?? "empty") !== (expectedRevisionId ?? "empty")) throw new Error("KNOWLEDGE_VAULT_CONFLICT: la base a changé dans un autre onglet.");
    await db.vaults.put(stored);
  });
  return next;
}

export async function knowledgeVaultExists(): Promise<boolean> {
  return Boolean(await db.vaults.get(PERSONAL_VAULT_ID));
}

export async function loadKnowledgeVault(passphrase: string): Promise<PersonalKnowledgeVault> {
  const stored = await db.vaults.get(PERSONAL_VAULT_ID);
  if (!stored) return emptyVault();
  const vault = await decryptStoredVault(stored, passphrase);
  await upgradeStoredVaultEncryption(stored, vault, passphrase);
  return vault;
}

export async function saveKnowledgeEntry(entry: KnowledgeEntry, passphrase: string, expectedRevisionId?: string): Promise<PersonalKnowledgeVault> {
  const operationEpoch = await getSessionKnowledgeEpoch();
  if (!(await verifyKnowledgeEntry(entry))) throw new Error("KNOWLEDGE_ENTRY_INVALID: entrée altérée.");
  const current = await loadKnowledgeVault(passphrase);
  if (current.revisionId !== (expectedRevisionId ?? "empty")) throw new Error("KNOWLEDGE_VAULT_CONFLICT: rechargez la base.");
  const index = current.entries.findIndex((item) => item.id === entry.id);
  const entries = [...current.entries];
  if (index >= 0) entries[index] = entry;
  else entries.push(entry);
  if (entries.length > MAX_KNOWLEDGE_ENTRIES) throw new Error(`KNOWLEDGE_VAULT_LIMIT: maximum ${MAX_KNOWLEDGE_ENTRIES} entrées.`);
  return persistVault({ ...current, entries }, passphrase, current.revisionId, operationEpoch);
}

export async function clearKnowledgeVault(): Promise<void> {
  let nextEpoch = 0;
  await db.transaction("rw", db.vaults, db.metadata, async () => {
    nextEpoch = (await readKnowledgeEpoch()) + 1;
    await db.vaults.clear();
    await db.metadata.put({ key: KNOWLEDGE_EPOCH_KEY, value: nextEpoch });
  });
  sessionKnowledgeEpochPromise = Promise.resolve(nextEpoch);
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(KNOWLEDGE_WIPE_CHANNEL);
    channel.postMessage({ type: "knowledge-wiped", epoch: nextEpoch });
    channel.close();
  }
}

export function subscribeToKnowledgeVaultWipe(callback: () => void): () => void {
  if (typeof BroadcastChannel === "undefined") return () => undefined;
  const channel = new BroadcastChannel(KNOWLEDGE_WIPE_CHANNEL);
  channel.addEventListener("message", (event) => {
    const epoch = (event.data as { epoch?: unknown } | undefined)?.epoch;
    if (typeof epoch === "number" && Number.isSafeInteger(epoch) && epoch >= 0) {
      sessionKnowledgeEpochPromise = Promise.resolve(epoch);
    }
    callback();
  });
  return () => channel.close();
}

export async function buildKnowledgeBackup(passphrase: string): Promise<Blob> {
  const stored = await db.vaults.get(PERSONAL_VAULT_ID);
  if (!stored) throw new Error("KNOWLEDGE_VAULT_EMPTY: aucune base à sauvegarder.");
  await decryptStoredVault(stored, passphrase);
  const base = { formatVersion: KNOWLEDGE_BACKUP_VERSION, exportedAt: new Date().toISOString(), vault: stored };
  const backup: KnowledgeBackup = { ...base, fingerprint: `bp_sha256_${await sha256Hex(stableStringify(base))}` };
  const content = JSON.stringify(backup, null, 2);
  if (new TextEncoder().encode(content).byteLength > MAX_KNOWLEDGE_BACKUP_BYTES) throw new Error("KNOWLEDGE_BACKUP_TOO_LARGE: sauvegarde trop volumineuse.");
  return new Blob([content], { type: "application/json" });
}

function parseStoredVault(value: unknown): StoredKnowledgeVault {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("KNOWLEDGE_BACKUP_INVALID: coffre absent.");
  const stored = value as Record<string, unknown>;
  if (Object.keys(stored).sort().join("|") !== "id|payload|revisionId|updatedAt" || stored.id !== PERSONAL_VAULT_ID || typeof stored.revisionId !== "string" || typeof stored.updatedAt !== "string") {
    throw new Error("KNOWLEDGE_BACKUP_INVALID: enveloppe de coffre invalide.");
  }
  return stored as unknown as StoredKnowledgeVault;
}

export async function restoreKnowledgeBackup(file: File, backupPassphrase: string, targetPassphrase?: string, capturedOperationEpoch?: number): Promise<PersonalKnowledgeVault> {
  const operationEpoch = capturedOperationEpoch ?? await getSessionKnowledgeEpoch();
  if (file.size > MAX_KNOWLEDGE_BACKUP_BYTES) throw new Error("KNOWLEDGE_BACKUP_TOO_LARGE: sauvegarde trop volumineuse.");
  let parsed: unknown;
  try { parsed = JSON.parse(await file.text()); } catch { throw new Error("KNOWLEDGE_BACKUP_INVALID: JSON illisible."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("KNOWLEDGE_BACKUP_INVALID: objet attendu.");
  const backup = parsed as Record<string, unknown>;
  if (Object.keys(backup).sort().join("|") !== "exportedAt|fingerprint|formatVersion|vault" || backup.formatVersion !== KNOWLEDGE_BACKUP_VERSION || typeof backup.exportedAt !== "string" || typeof backup.fingerprint !== "string") {
    throw new Error("KNOWLEDGE_BACKUP_INVALID: contrat invalide.");
  }
  const storedBackup = parseStoredVault(backup.vault);
  const { fingerprint: _fingerprint, ...base } = backup;
  if (backup.fingerprint !== `bp_sha256_${await sha256Hex(stableStringify(base))}`) throw new Error("KNOWLEDGE_BACKUP_FINGERPRINT_MISMATCH: sauvegarde altérée.");
  const imported = await decryptStoredVault(storedBackup, backupPassphrase);
  const currentStored = await db.vaults.get(PERSONAL_VAULT_ID);
  if (!currentStored) return persistVault({ ...imported, revisionId: "empty" }, targetPassphrase ?? backupPassphrase, undefined, operationEpoch);
  if (!targetPassphrase) throw new Error("KNOWLEDGE_TARGET_PASSPHRASE_REQUIRED: le coffre actuel doit être déverrouillé.");
  const current = await decryptStoredVault(currentStored, targetPassphrase);
  const byId = new Map(current.entries.map((entry) => [entry.id, entry]));
  for (const entry of imported.entries) {
    const existing = byId.get(entry.id);
    if (existing && existing.fingerprint !== entry.fingerprint) throw new Error(`KNOWLEDGE_RESTORE_CONFLICT:${entry.id}`);
    byId.set(entry.id, entry);
  }
  return persistVault({ ...current, entries: [...byId.values()] }, targetPassphrase, current.revisionId, operationEpoch);
}
