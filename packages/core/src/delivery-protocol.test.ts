import { describe, expect, it } from "vitest";
import { buildProofPackDelivery } from "./delivery";
import {
  compareProofPackDeliveries,
  createDeliveryRevocation,
  generateDeliverySigningKeyPair,
  signDeliveryFingerprint,
  verifyDeliveryChangeReport,
  verifyDeliveryRevocation,
  verifyDeliverySignature,
} from "./delivery-protocol";
import { createProofCaseFromQuestionnaire } from "./questionnaire";
import { sha256Hex, stableStringify } from "./security";

async function refingerprint<T extends Record<string, unknown>>(value: T): Promise<T> {
  const { fingerprint: _fingerprint, ...base } = value;
  return { ...base, fingerprint: `bp_sha256_${await sha256Hex(stableStringify(base))}` } as unknown as T;
}

async function signRawProtocolBase(base: Record<string, unknown>, privateKeyJwk: JsonWebKey): Promise<Record<string, unknown>> {
  const key = await crypto.subtle.importKey("jwk", privateKeyJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(stableStringify(base)),
  ));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return { ...base, signature: btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "") };
}

async function delivery(answer: string) {
  const result = await createProofCaseFromQuestionnaire("1. Disposez-vous de sauvegardes testées ?");
  const question = result.proofpack.questions[0]!;
  question.answerText = answer;
  question.answerExportStatus = "ready";
  return buildProofPackDelivery(result.proofpack, { questionIds: [question.id], evidenceIds: [], confirmed: true });
}

describe("bilateral Delivery protocol", () => {
  it("creates a fingerprinted change report", async () => {
    const previous = await delivery("Oui, chaque trimestre.");
    const current = await delivery("Oui, chaque mois.");
    current.case.title = previous.case.title;
    current.case.framework = previous.case.framework;
    const { fingerprint: _, ...base } = current;
    current.fingerprint = `bp_sha256_${await sha256Hex(stableStringify(base))}`;
    const report = await compareProofPackDeliveries(previous, current, "2026-07-13T12:00:00.000Z");
    expect(report.summary).toEqual({ added: 0, removed: 0, changed: 1, unchanged: 0 });
    expect(report.changes[0]?.kind).toBe("answer-changed");
    expect(await verifyDeliveryChangeReport(report)).toBe(true);
  });

  it("binds revocation and optional issuer signature to exact fingerprints", async () => {
    const subject = await delivery("Oui.");
    const revocation = await createDeliveryRevocation(subject, "Remplacé", "2026-07-13T12:00:00.000Z");
    expect(await verifyDeliveryRevocation(revocation, subject)).toBe(true);
    const keys = await generateDeliverySigningKeyPair();
    const signature = await signDeliveryFingerprint({ subjectType: "delivery", subjectFingerprint: subject.fingerprint, issuer: "ACME", privateKeyJwk: keys.privateKeyJwk, signedAt: "2026-07-13T12:00:00.000Z" });
    expect(await verifyDeliverySignature(signature, subject.fingerprint)).toBe(true);
    expect(await verifyDeliverySignature({ ...signature, issuer: "Mallory" }, subject.fingerprint)).toBe(false);
  });

  it("rejects terminal control and bidirectional formatting characters in issuer labels", async () => {
    const subject = await delivery("Oui.");
    const keys = await generateDeliverySigningKeyPair();
    const unsafeIssuers = [
      ["ACME", String.fromCharCode(10), "France"].join(""),
      ["ACME", String.fromCodePoint(0x2028), "France"].join(""),
      ["ACME", String.fromCodePoint(0x202e), "France"].join(""),
    ];

    for (const issuer of unsafeIssuers) {
      await expect(signDeliveryFingerprint({
        subjectType: "delivery",
        subjectFingerprint: subject.fingerprint,
        issuer,
        privateKeyJwk: keys.privateKeyJwk,
        signedAt: "2026-07-13T12:00:00.000Z",
      })).rejects.toThrow("émetteur");

      const signed = await signRawProtocolBase({
        product: "BLACKPROOF",
        formatVersion: "blackproof-delivery-signature-v1",
        subjectType: "delivery",
        subjectFingerprint: subject.fingerprint,
        algorithm: "ECDSA-P256-SHA256",
        issuer,
        publicKeyJwk: keys.publicKeyJwk,
        signedAt: "2026-07-13T12:00:00.000Z",
      }, keys.privateKeyJwk);
      expect(await verifyDeliverySignature(signed, subject.fingerprint)).toBe(false);
    }
  });

  it("fails closed on malformed protocol payloads", async () => {
    expect(await verifyDeliveryChangeReport(null)).toBe(false);
    expect(await verifyDeliveryRevocation({})).toBe(false);
    expect(await verifyDeliverySignature({ publicKeyJwk: { kty: "EC" } })).toBe(false);
  });

  it("rejects structurally invalid protocol objects even when their own hash or signature matches", async () => {
    const previous = await delivery("Oui, chaque trimestre.");
    const current = await delivery("Oui, chaque mois.");
    current.case.title = previous.case.title;
    current.case.framework = previous.case.framework;
    const { fingerprint: _fingerprint, ...deliveryBase } = current;
    current.fingerprint = `bp_sha256_${await sha256Hex(stableStringify(deliveryBase))}`;

    const report = await compareProofPackDeliveries(previous, current, "2026-07-13T12:00:00.000Z");
    const malformedReport = await refingerprint({
      ...report,
      summary: { ...report.summary, changed: report.summary.changed + 1 },
    } as unknown as Record<string, unknown>);
    expect(await verifyDeliveryChangeReport(malformedReport)).toBe(false);
    expect(await verifyDeliveryChangeReport(await refingerprint({
      ...report,
      generatedAt: "2026-02-31T12:00:00.000Z",
    } as unknown as Record<string, unknown>))).toBe(false);

    const revocation = await createDeliveryRevocation(current, "Remplacé", "2026-07-13T12:00:00.000Z");
    const malformedRevocation = await refingerprint({ ...revocation, unexpected: true } as unknown as Record<string, unknown>);
    expect(await verifyDeliveryRevocation(malformedRevocation, current)).toBe(false);

    const keys = await generateDeliverySigningKeyPair();
    const validSignature = await signDeliveryFingerprint({
      subjectType: "delivery",
      subjectFingerprint: current.fingerprint,
      issuer: "ACME",
      privateKeyJwk: keys.privateKeyJwk,
      signedAt: "2026-07-13T12:00:00.000Z",
    });
    const { signature: _signature, issuer: _issuer, ...malformedBase } = validSignature;
    const malformedSignature = await signRawProtocolBase(malformedBase, keys.privateKeyJwk);
    expect(await verifyDeliverySignature(malformedSignature, current.fingerprint)).toBe(false);
  });
});
