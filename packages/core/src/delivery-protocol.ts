import type {
  ProofPackDelivery,
  ProofPackDeliveryChange,
  ProofPackDeliveryChangeReport,
  ProofPackDeliveryRevocation,
  ProofPackDeliverySignature,
} from "./types";
import { SECURITY_LIMITS, sha256Hex, stableStringify } from "./security";
import { verifyProofPackDeliveryJson } from "./verify-delivery";

export const DELIVERY_CHANGE_REPORT_VERSION = "blackproof-delivery-change-report-v1" as const;
export const DELIVERY_SIGNATURE_VERSION = "blackproof-delivery-signature-v1" as const;
export const DELIVERY_REVOCATION_VERSION = "blackproof-delivery-revocation-v1" as const;
export const DELIVERY_SIGNATURE_ALGORITHM = "ECDSA-P256-SHA256" as const;

const fingerprintPattern = /^bp_sha256_[a-f0-9]{64}$/;
const base64UrlPattern = /^[A-Za-z0-9_-]{86}$/;
const p256CoordinatePattern = /^[A-Za-z0-9_-]{43}$/;
const deliveryIdPattern = /^delivery_[a-f0-9]{32}$/;
const isoTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const unsafeIssuerCharacterPattern = /[\u0000-\u001F\u007F-\u009F\u061C\u200E\u200F\u2028-\u202E\u2066-\u2069]/u;
const changeKinds = new Set<ProofPackDeliveryChange["kind"]>([
  "added",
  "removed",
  "answer-changed",
  "reservation-changed",
  "evidence-changed",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: unknown, required: readonly string[], optional: readonly string[] = []): value is Record<string, unknown> {
  if (!isRecord(value) || required.some((key) => !Object.hasOwn(value, key))) return false;
  return Object.keys(value).every((key) => required.includes(key) || optional.includes(key));
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40 || !isoTimestampPattern.test(value)) return false;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return false;
  const canonical = new Date(parsed).toISOString();
  return value === canonical || (!value.includes(".") && canonical === value.replace("Z", ".000Z"));
}

function isBoundedText(value: unknown, maxChars: number, allowEmpty = false): value is string {
  return typeof value === "string" && value.length <= maxChars && (allowEmpty || value.trim().length > 0);
}

function isSafeIssuerLabel(value: unknown): value is string {
  return isBoundedText(value, SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS)
    && !unsafeIssuerCharacterPattern.test(value);
}

function isBoundedTextArray(value: unknown, maxItems: number, maxChars: number): value is string[] {
  return Array.isArray(value) && value.length <= maxItems
    && value.every((item) => isBoundedText(item, maxChars));
}

function isDeliveryReference(value: unknown): value is ProofPackDeliveryChangeReport["previous"] {
  return hasExactKeys(value, ["deliveryId", "fingerprint", "generatedAt"])
    && typeof value.deliveryId === "string" && deliveryIdPattern.test(value.deliveryId)
    && typeof value.fingerprint === "string" && fingerprintPattern.test(value.fingerprint)
    && isIsoTimestamp(value.generatedAt);
}

function isChange(value: unknown): value is ProofPackDeliveryChange {
  if (!isRecord(value) || !isBoundedText(value.question, SECURITY_LIMITS.MAX_ANSWER_CHARS)
    || typeof value.kind !== "string" || !changeKinds.has(value.kind as ProofPackDeliveryChange["kind"])) return false;
  switch (value.kind) {
    case "added":
      return hasExactKeys(value, ["question", "kind", "currentAnswer", "currentEvidence"], ["currentReservation"])
        && isBoundedText(value.currentAnswer, SECURITY_LIMITS.MAX_ANSWER_CHARS)
        && (value.currentReservation === undefined || isBoundedText(value.currentReservation, SECURITY_LIMITS.MAX_RESERVATION_CHARS))
        && isBoundedTextArray(value.currentEvidence, SECURITY_LIMITS.MAX_QUESTIONS, SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS);
    case "removed":
      return hasExactKeys(value, ["question", "kind", "previousAnswer", "previousEvidence"], ["previousReservation"])
        && isBoundedText(value.previousAnswer, SECURITY_LIMITS.MAX_ANSWER_CHARS)
        && (value.previousReservation === undefined || isBoundedText(value.previousReservation, SECURITY_LIMITS.MAX_RESERVATION_CHARS))
        && isBoundedTextArray(value.previousEvidence, SECURITY_LIMITS.MAX_QUESTIONS, SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS);
    case "answer-changed":
      return hasExactKeys(value, ["question", "kind", "previousAnswer", "currentAnswer"])
        && isBoundedText(value.previousAnswer, SECURITY_LIMITS.MAX_ANSWER_CHARS)
        && isBoundedText(value.currentAnswer, SECURITY_LIMITS.MAX_ANSWER_CHARS)
        && value.previousAnswer !== value.currentAnswer;
    case "reservation-changed":
      return hasExactKeys(value, ["question", "kind"], ["previousReservation", "currentReservation"])
        && (value.previousReservation === undefined || isBoundedText(value.previousReservation, SECURITY_LIMITS.MAX_RESERVATION_CHARS))
        && (value.currentReservation === undefined || isBoundedText(value.currentReservation, SECURITY_LIMITS.MAX_RESERVATION_CHARS))
        && (value.previousReservation !== undefined || value.currentReservation !== undefined)
        && value.previousReservation !== value.currentReservation;
    case "evidence-changed":
      return hasExactKeys(value, ["question", "kind", "previousEvidence", "currentEvidence"])
        && isBoundedTextArray(value.previousEvidence, SECURITY_LIMITS.MAX_QUESTIONS, SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS)
        && isBoundedTextArray(value.currentEvidence, SECURITY_LIMITS.MAX_QUESTIONS, SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS)
        && !sameStrings(value.previousEvidence, value.currentEvidence);
    default:
      return false;
  }
}

function isChangeSummary(value: unknown, changes: readonly ProofPackDeliveryChange[]): value is ProofPackDeliveryChangeReport["summary"] {
  if (!hasExactKeys(value, ["added", "removed", "changed", "unchanged"])) return false;
  const counters = [value.added, value.removed, value.changed, value.unchanged];
  if (!counters.every((counter) => Number.isSafeInteger(counter) && Number(counter) >= 0 && Number(counter) <= SECURITY_LIMITS.MAX_QUESTIONS)) return false;
  const changedQuestions = new Set(changes.filter((item) => item.kind.endsWith("changed")).map((item) => normalizeQuestion(item.question))).size;
  return value.added === changes.filter((item) => item.kind === "added").length
    && value.removed === changes.filter((item) => item.kind === "removed").length
    && value.changed === changedQuestions;
}

function normalizeQuestion(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("fr-FR");
}

function evidenceReferences(question: ProofPackDelivery["questions"][number]): string[] {
  return question.evidence.map((item) => item.publicReference.trim()).sort();
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function assertValidDelivery(delivery: ProofPackDelivery, label: string): Promise<void> {
  const result = await verifyProofPackDeliveryJson(JSON.stringify(delivery));
  if (!result.isValid) throw new Error(`${label} invalide : ${result.findings[0]?.code ?? "DELIVERY_INVALID"}.`);
}

function questionMap(delivery: ProofPackDelivery, label: string): Map<string, ProofPackDelivery["questions"][number]> {
  const output = new Map<string, ProofPackDelivery["questions"][number]>();
  for (const question of delivery.questions) {
    const key = normalizeQuestion(question.text);
    if (output.has(key)) throw new Error(`${label} contient deux questions indistinguables pour la comparaison.`);
    output.set(key, question);
  }
  return output;
}

export async function compareProofPackDeliveries(
  previous: ProofPackDelivery,
  current: ProofPackDelivery,
  generatedAt = new Date().toISOString(),
): Promise<ProofPackDeliveryChangeReport> {
  if (!isIsoTimestamp(generatedAt)) throw new Error("La date du rapport de comparaison est invalide.");
  await assertValidDelivery(previous, "Le Delivery précédent");
  await assertValidDelivery(current, "Le Delivery courant");
  if (previous.case.title.trim() !== current.case.title.trim() || previous.case.framework.trim() !== current.case.framework.trim()) {
    throw new Error("Les deux Delivery ne déclarent pas le même titre de dossier et le même référentiel.");
  }

  const previousQuestions = questionMap(previous, "Le Delivery précédent");
  const currentQuestions = questionMap(current, "Le Delivery courant");
  const keys = [...new Set([...previousQuestions.keys(), ...currentQuestions.keys()])].sort();
  const changes: ProofPackDeliveryChange[] = [];
  let unchanged = 0;

  for (const key of keys) {
    const before = previousQuestions.get(key);
    const after = currentQuestions.get(key);
    if (!before && after) {
      changes.push({ question: after.text, kind: "added", currentAnswer: after.answer, ...(after.reservation ? { currentReservation: after.reservation } : {}), currentEvidence: evidenceReferences(after) });
      continue;
    }
    if (before && !after) {
      changes.push({ question: before.text, kind: "removed", previousAnswer: before.answer, ...(before.reservation ? { previousReservation: before.reservation } : {}), previousEvidence: evidenceReferences(before) });
      continue;
    }
    if (!before || !after) continue;
    let changed = false;
    if (before.answer !== after.answer) {
      changes.push({ question: after.text, kind: "answer-changed", previousAnswer: before.answer, currentAnswer: after.answer });
      changed = true;
    }
    if ((before.reservation ?? "") !== (after.reservation ?? "")) {
      changes.push({ question: after.text, kind: "reservation-changed", ...(before.reservation ? { previousReservation: before.reservation } : {}), ...(after.reservation ? { currentReservation: after.reservation } : {}) });
      changed = true;
    }
    const previousEvidence = evidenceReferences(before);
    const currentEvidence = evidenceReferences(after);
    if (!sameStrings(previousEvidence, currentEvidence)) {
      changes.push({ question: after.text, kind: "evidence-changed", previousEvidence, currentEvidence });
      changed = true;
    }
    if (!changed) unchanged += 1;
  }

  const changedQuestions = new Set(changes.filter((item) => item.kind.endsWith("changed")).map((item) => normalizeQuestion(item.question))).size;
  const base = {
    product: "BLACKPROOF" as const,
    formatVersion: DELIVERY_CHANGE_REPORT_VERSION,
    previous: { deliveryId: previous.deliveryId, fingerprint: previous.fingerprint, generatedAt: previous.generatedAt },
    current: { deliveryId: current.deliveryId, fingerprint: current.fingerprint, generatedAt: current.generatedAt },
    case: { title: current.case.title, framework: current.case.framework },
    generatedAt,
    summary: {
      added: changes.filter((item) => item.kind === "added").length,
      removed: changes.filter((item) => item.kind === "removed").length,
      changed: changedQuestions,
      unchanged,
    },
    changes,
  };
  return { ...base, fingerprint: `bp_sha256_${await sha256Hex(stableStringify(base))}` };
}

export async function verifyDeliveryChangeReport(report: unknown): Promise<boolean> {
  if (!hasExactKeys(report, ["product", "formatVersion", "previous", "current", "case", "generatedAt", "summary", "changes", "fingerprint"])
    || report.product !== "BLACKPROOF" || report.formatVersion !== DELIVERY_CHANGE_REPORT_VERSION
    || !isDeliveryReference(report.previous) || !isDeliveryReference(report.current)
    || !hasExactKeys(report.case, ["title", "framework"])
    || !isBoundedText(report.case.title, SECURITY_LIMITS.MAX_CASE_TITLE_CHARS)
    || !isBoundedText(report.case.framework, SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS)
    || !isIsoTimestamp(report.generatedAt)
    || !Array.isArray(report.changes) || report.changes.length > SECURITY_LIMITS.MAX_QUESTIONS * 4
    || !report.changes.every(isChange)
    || !isChangeSummary(report.summary, report.changes)
    || typeof report.fingerprint !== "string") return false;
  const { fingerprint, ...base } = report;
  return fingerprintPattern.test(fingerprint)
    && fingerprint === `bp_sha256_${await sha256Hex(stableStringify(base))}`;
}

export async function createDeliveryRevocation(
  delivery: ProofPackDelivery,
  reason?: string,
  revokedAt = new Date().toISOString(),
): Promise<ProofPackDeliveryRevocation> {
  await assertValidDelivery(delivery, "Le Delivery à révoquer");
  if (!isIsoTimestamp(revokedAt)) throw new Error("La date de révocation est invalide.");
  const normalizedReason = reason?.trim();
  if (normalizedReason && normalizedReason.length > SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS) {
    throw new Error(`Le motif de révocation dépasse ${SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS} caractères.`);
  }
  const base = {
    product: "BLACKPROOF" as const,
    formatVersion: DELIVERY_REVOCATION_VERSION,
    deliveryId: delivery.deliveryId,
    deliveryFingerprint: delivery.fingerprint,
    status: "revoked" as const,
    revokedAt,
    ...(normalizedReason ? { reason: normalizedReason } : {}),
  };
  return { ...base, fingerprint: `bp_sha256_${await sha256Hex(stableStringify(base))}` };
}

export async function verifyDeliveryRevocation(
  revocation: unknown,
  delivery?: ProofPackDelivery,
): Promise<boolean> {
  if (!hasExactKeys(revocation, ["product", "formatVersion", "deliveryId", "deliveryFingerprint", "status", "revokedAt", "fingerprint"], ["reason"])
    || typeof revocation.fingerprint !== "string"
    || typeof revocation.deliveryFingerprint !== "string" || typeof revocation.deliveryId !== "string"
    || !deliveryIdPattern.test(revocation.deliveryId) || !isIsoTimestamp(revocation.revokedAt)
    || (revocation.reason !== undefined && !isBoundedText(revocation.reason, SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS))) return false;
  const { fingerprint, ...base } = revocation;
  if (revocation.product !== "BLACKPROOF" || revocation.formatVersion !== DELIVERY_REVOCATION_VERSION
    || revocation.status !== "revoked" || !fingerprintPattern.test(revocation.deliveryFingerprint)
    || !fingerprintPattern.test(fingerprint)
    || fingerprint !== `bp_sha256_${await sha256Hex(stableStringify(base))}`) return false;
  return !delivery || (delivery.deliveryId === revocation.deliveryId && delivery.fingerprint === revocation.deliveryFingerprint);
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function assertPublicSigningKey(value: unknown): asserts value is JsonWebKey {
  if (!hasExactKeys(value, ["kty", "crv", "x", "y"], ["key_ops", "ext", "use", "kid"])
    || value.kty !== "EC" || value.crv !== "P-256"
    || typeof value.x !== "string" || !p256CoordinatePattern.test(value.x)
    || typeof value.y !== "string" || !p256CoordinatePattern.test(value.y)
    || (value.key_ops !== undefined && (!Array.isArray(value.key_ops) || value.key_ops.length !== 1 || value.key_ops[0] !== "verify"))
    || (value.ext !== undefined && value.ext !== true)
    || (value.use !== undefined && value.use !== "sig")
    || (value.kid !== undefined && (typeof value.kid !== "string" || !/^[A-Za-z0-9._-]{1,64}$/.test(value.kid)))) {
    throw new Error("La clé publique de signature doit être une JWK EC P-256 sans composante privée.");
  }
}

export async function generateDeliverySigningKeyPair(): Promise<{ publicKeyJwk: JsonWebKey; privateKeyJwk: JsonWebKey }> {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  return { publicKeyJwk: await crypto.subtle.exportKey("jwk", pair.publicKey), privateKeyJwk: await crypto.subtle.exportKey("jwk", pair.privateKey) };
}

export async function signDeliveryFingerprint(input: {
  subjectType: "delivery" | "revocation";
  subjectFingerprint: string;
  issuer: string;
  privateKeyJwk: JsonWebKey;
  signedAt?: string;
}): Promise<ProofPackDeliverySignature> {
  if (!fingerprintPattern.test(input.subjectFingerprint)) throw new Error("L’empreinte à signer est invalide.");
  const subjectType: unknown = (input as { subjectType?: unknown }).subjectType;
  if (subjectType !== "delivery" && subjectType !== "revocation") throw new Error("Le type d’artefact à signer est invalide.");
  const validatedSubjectType: "delivery" | "revocation" = subjectType;
  if (!isSafeIssuerLabel(input.issuer)) throw new Error("Le nom de l’émetteur est invalide.");
  const issuer = input.issuer.trim();
  if (input.privateKeyJwk.kty !== "EC" || input.privateKeyJwk.crv !== "P-256" || typeof input.privateKeyJwk.d !== "string") {
    throw new Error("La clé privée de signature doit être une JWK EC P-256.");
  }
  const privateKey = await crypto.subtle.importKey("jwk", input.privateKeyJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const publicKeyJwk = { ...input.privateKeyJwk };
  delete publicKeyJwk.d;
  publicKeyJwk.key_ops = ["verify"];
  assertPublicSigningKey(publicKeyJwk);
  const signedAt = input.signedAt ?? new Date().toISOString();
  if (!isIsoTimestamp(signedAt)) throw new Error("La date de signature est invalide.");
  const base = {
    product: "BLACKPROOF" as const,
    formatVersion: DELIVERY_SIGNATURE_VERSION,
    subjectType: validatedSubjectType,
    subjectFingerprint: input.subjectFingerprint,
    algorithm: DELIVERY_SIGNATURE_ALGORITHM,
    issuer,
    publicKeyJwk,
    signedAt,
  };
  const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, new TextEncoder().encode(stableStringify(base))));
  return { ...base, signature: base64Url(signature) };
}

export async function verifyDeliverySignature(signature: unknown, expectedFingerprint?: string): Promise<boolean> {
  try {
    if (!hasExactKeys(signature, ["product", "formatVersion", "subjectType", "subjectFingerprint", "algorithm", "issuer", "publicKeyJwk", "signedAt", "signature"])
      || signature.product !== "BLACKPROOF" || signature.formatVersion !== DELIVERY_SIGNATURE_VERSION
      || signature.algorithm !== DELIVERY_SIGNATURE_ALGORITHM || typeof signature.subjectFingerprint !== "string"
      || !fingerprintPattern.test(signature.subjectFingerprint)
      || (expectedFingerprint !== undefined && signature.subjectFingerprint !== expectedFingerprint)
      || (signature.subjectType !== "delivery" && signature.subjectType !== "revocation")
      || !isSafeIssuerLabel(signature.issuer)
      || !isIsoTimestamp(signature.signedAt)
      || typeof signature.signature !== "string" || !base64UrlPattern.test(signature.signature)) return false;
    assertPublicSigningKey(signature.publicKeyJwk);
    const { signature: encoded, ...base } = signature;
    const publicKey = await crypto.subtle.importKey("jwk", signature.publicKeyJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    const signatureBytes = fromBase64Url(encoded);
    return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, publicKey, signatureBytes.buffer as ArrayBuffer, new TextEncoder().encode(stableStringify(base)));
  } catch {
    return false;
  }
}

export function exportDeliveryProtocolJson(value: ProofPackDeliveryChangeReport | ProofPackDeliveryRevocation | ProofPackDeliverySignature): string {
  return JSON.stringify(value, null, 2);
}
