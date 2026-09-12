const ENCRYPTION_VERSION = 1 as const;
export const CURRENT_PBKDF2_ITERATIONS = 600_000;
const MIN_SUPPORTED_PBKDF2_ITERATIONS = 310_000;
export const MAX_PBKDF2_ITERATIONS = 1_000_000;
export const MIN_LOCAL_PASSPHRASE_LENGTH = 12;
export const MAX_LOCAL_PASSPHRASE_LENGTH = 1_024;
const SALT_BYTES = 16;
const IV_BYTES = 12;

export interface EncryptedLocalPayload {
  version: typeof ENCRYPTION_VERSION;
  algorithm: "AES-GCM";
  keyDerivation: "PBKDF2-SHA-256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

export interface EncryptedLocalBatchPayload {
  version: 2;
  algorithm: "AES-GCM";
  keyDerivation: "PBKDF2-SHA-256";
  iterations: number;
  salt: string;
  iv: string;
  aad: string;
  ciphertext: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  assertLegacyCompatiblePassphrase(passphrase);

  if (!Number.isSafeInteger(iterations) || iterations < MIN_SUPPORTED_PBKDF2_ITERATIONS || iterations > MAX_PBKDF2_ITERATIONS) {
    throw new Error("Nombre d’itérations PBKDF2 hors limites.");
  }

  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: asArrayBuffer(salt), iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function assertLegacyCompatiblePassphrase(passphrase: string): void {
  const length = Array.from(passphrase).length;
  if (length < MIN_LOCAL_PASSPHRASE_LENGTH) {
    throw new Error("La phrase secrète doit contenir au moins 12 caractères.");
  }
  if (length > MAX_LOCAL_PASSPHRASE_LENGTH) {
    throw new Error(`La phrase secrète ne peut pas dépasser ${MAX_LOCAL_PASSPHRASE_LENGTH} caractères.`);
  }
}

export function needsLocalEncryptionUpgrade(payload: EncryptedLocalPayload | EncryptedLocalBatchPayload): boolean {
  return Number.isSafeInteger(payload.iterations) && payload.iterations < CURRENT_PBKDF2_ITERATIONS;
}

export function assertLocalPassphrase(passphrase: string): void {
  assertLegacyCompatiblePassphrase(passphrase);

  const analyzed = passphrase.normalize("NFKC");
  const distinctCharacters = new Set(Array.from(analyzed)).size;
  if (distinctCharacters < 6) {
    throw new Error("Phrase secrète trop prévisible : utilisez au moins 6 caractères distincts.");
  }

  if (Array.from(analyzed).length < 16) {
    const characterClasses = [
      /\p{Ll}/u.test(analyzed),
      /\p{Lu}/u.test(analyzed),
      /\p{N}/u.test(analyzed),
      /[^\p{L}\p{N}]/u.test(analyzed),
    ].filter(Boolean).length;
    if (characterClasses < 3) {
      throw new Error("Une phrase secrète de moins de 16 caractères doit combiner au moins 3 types de caractères.");
    }
  }
}

async function encryptLocalPayloadInternal(value: unknown, passphrase: string, legacyUpgrade: boolean): Promise<EncryptedLocalPayload> {
  if (legacyUpgrade) assertLegacyCompatiblePassphrase(passphrase);
  else assertLocalPassphrase(passphrase);
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt, CURRENT_PBKDF2_ITERATIONS);
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asArrayBuffer(iv) },
    key,
    plaintext
  );

  return {
    version: ENCRYPTION_VERSION,
    algorithm: "AES-GCM",
    keyDerivation: "PBKDF2-SHA-256",
    iterations: CURRENT_PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function encryptLocalPayload(value: unknown, passphrase: string): Promise<EncryptedLocalPayload> {
  return encryptLocalPayloadInternal(value, passphrase, false);
}

export async function upgradeLocalPayloadEncryption(value: unknown, passphrase: string): Promise<EncryptedLocalPayload> {
  return encryptLocalPayloadInternal(value, passphrase, true);
}

async function encryptLocalPayloadBatchInternal(
  values: Array<{ aad: string; value: unknown }>,
  passphrase: string,
  legacyUpgrade: boolean,
): Promise<EncryptedLocalBatchPayload[]> {
  if (legacyUpgrade) assertLegacyCompatiblePassphrase(passphrase);
  else assertLocalPassphrase(passphrase);
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await deriveKey(passphrase, salt, CURRENT_PBKDF2_ITERATIONS);
  return Promise.all(values.map(async ({ aad, value }) => {
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const additionalData = new TextEncoder().encode(aad);
    const plaintext = new TextEncoder().encode(JSON.stringify(value));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: asArrayBuffer(iv), additionalData: asArrayBuffer(additionalData) },
      key,
      plaintext
    );
    return {
      version: 2 as const,
      algorithm: "AES-GCM" as const,
      keyDerivation: "PBKDF2-SHA-256" as const,
      iterations: CURRENT_PBKDF2_ITERATIONS,
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv),
      aad,
      ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    };
  }));
}

export async function encryptLocalPayloadBatch(
  values: Array<{ aad: string; value: unknown }>,
  passphrase: string
): Promise<EncryptedLocalBatchPayload[]> {
  return encryptLocalPayloadBatchInternal(values, passphrase, false);
}

export async function upgradeLocalPayloadBatchEncryption(
  values: Array<{ aad: string; value: unknown }>,
  passphrase: string
): Promise<EncryptedLocalBatchPayload[]> {
  return encryptLocalPayloadBatchInternal(values, passphrase, true);
}

export async function decryptLocalPayloadBatch<T>(
  envelopes: EncryptedLocalBatchPayload[],
  passphrase: string
): Promise<T[]> {
  if (envelopes.length === 0) return [];
  const first = envelopes[0];
  if (!first || first.version !== 2 || first.algorithm !== "AES-GCM" || first.keyDerivation !== "PBKDF2-SHA-256") throw new Error("Format de chiffrement groupé non pris en charge.");
  if (!Number.isSafeInteger(first.iterations) || first.iterations < MIN_SUPPORTED_PBKDF2_ITERATIONS || first.iterations > MAX_PBKDF2_ITERATIONS) throw new Error("Nombre d’itérations PBKDF2 hors limites.");
  const salt = base64ToBytes(first.salt);
  const key = await deriveKey(passphrase, salt, first.iterations);
  try {
    const values: T[] = [];
    for (const envelope of envelopes) {
      if (envelope.version !== 2 || envelope.algorithm !== "AES-GCM" || envelope.keyDerivation !== "PBKDF2-SHA-256" || envelope.salt !== first.salt || envelope.iterations !== first.iterations) throw new Error("Paramètres de chiffrement groupé incohérents.");
      const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: asArrayBuffer(base64ToBytes(envelope.iv)), additionalData: asArrayBuffer(new TextEncoder().encode(envelope.aad)) },
        key,
        asArrayBuffer(base64ToBytes(envelope.ciphertext))
      );
      values.push(JSON.parse(new TextDecoder().decode(plaintext)) as T);
    }
    return values;
  } catch {
    throw new Error("Phrase secrète incorrecte ou sauvegarde chiffrée altérée.");
  }
}

export async function decryptLocalPayload<T>(envelope: EncryptedLocalPayload, passphrase: string): Promise<T> {
  if (
    envelope.version !== ENCRYPTION_VERSION ||
    envelope.algorithm !== "AES-GCM" ||
    envelope.keyDerivation !== "PBKDF2-SHA-256" ||
    !Number.isSafeInteger(envelope.iterations) ||
    envelope.iterations < MIN_SUPPORTED_PBKDF2_ITERATIONS ||
    envelope.iterations > MAX_PBKDF2_ITERATIONS
  ) {
    throw new Error("Format de chiffrement local non pris en charge.");
  }

  try {
    const salt = base64ToBytes(envelope.salt);
    const iv = base64ToBytes(envelope.iv);
    const key = await deriveKey(passphrase, salt, envelope.iterations);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: asArrayBuffer(iv) },
      key,
      asArrayBuffer(base64ToBytes(envelope.ciphertext))
    );
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch {
    throw new Error("Phrase secrète incorrecte ou dossier chiffré altéré.");
  }
}
