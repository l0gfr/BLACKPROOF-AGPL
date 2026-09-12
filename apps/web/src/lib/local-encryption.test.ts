import { describe, expect, it } from "vitest";

import {
  assertLocalPassphrase,
  CURRENT_PBKDF2_ITERATIONS,
  decryptLocalPayload,
  encryptLocalPayload,
  MAX_LOCAL_PASSPHRASE_LENGTH,
  needsLocalEncryptionUpgrade,
  upgradeLocalPayloadEncryption,
  type EncryptedLocalPayload,
} from "./local-encryption";

const LEGACY_ITERATIONS = 310_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

async function createLegacyEnvelope(value: unknown, passphrase: string): Promise<EncryptedLocalPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: asArrayBuffer(salt), iterations: LEGACY_ITERATIONS },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asArrayBuffer(iv) },
    key,
    new TextEncoder().encode(JSON.stringify(value))
  );
  return {
    version: 1,
    algorithm: "AES-GCM",
    keyDerivation: "PBKDF2-SHA-256",
    iterations: LEGACY_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

describe("local encryption passphrase policy", () => {
  it("rejects trivial repeated passphrases for new encryption", async () => {
    expect(() => assertLocalPassphrase("aaaaaaaaaaaa")).toThrow(/trop prévisible/i);
    await expect(encryptLocalPayload({ secret: true }, "aaaaaaaaaaaa")).rejects.toThrow(/trop prévisible/i);
  });

  it("accepts a long memorable passphrase and round-trips its payload", async () => {
    const passphrase = "correct cheval batterie agrafe";
    expect(() => assertLocalPassphrase(passphrase)).not.toThrow();
    const envelope = await encryptLocalPayload({ secret: "canary" }, passphrase);
    expect(envelope.iterations).toBe(600_000);
    await expect(decryptLocalPayload<{ secret: string }>(envelope, passphrase)).resolves.toEqual({ secret: "canary" });
  });

  it("still decrypts a legacy envelope created with a now-rejected passphrase", async () => {
    const legacyPassphrase = "aaaaaaaaaaaa";
    const envelope = await createLegacyEnvelope({ legacy: "still-readable" }, legacyPassphrase);

    expect(() => assertLocalPassphrase(legacyPassphrase)).toThrow(/trop prévisible/i);
    await expect(decryptLocalPayload<{ legacy: string }>(envelope, legacyPassphrase)).resolves.toEqual({
      legacy: "still-readable",
    });

    const upgraded = await upgradeLocalPayloadEncryption({ legacy: "still-readable" }, legacyPassphrase);
    expect(upgraded.iterations).toBe(CURRENT_PBKDF2_ITERATIONS);
    expect(needsLocalEncryptionUpgrade(envelope)).toBe(true);
    expect(needsLocalEncryptionUpgrade(upgraded)).toBe(false);
    await expect(decryptLocalPayload<{ legacy: string }>(upgraded, legacyPassphrase)).resolves.toEqual({
      legacy: "still-readable",
    });
  });

  it("rejects oversized passphrases before PBKDF2", async () => {
    const oversized = "a".repeat(MAX_LOCAL_PASSPHRASE_LENGTH + 1);
    expect(() => assertLocalPassphrase(oversized)).toThrow(/dépasser 1024/i);
    await expect(encryptLocalPayload({ secret: true }, oversized)).rejects.toThrow(/dépasser 1024/i);
  });
});
