import { sha256Hex, stableStringify, type ProofPackDelivery } from "@blackproof/core";

export async function buildDemoDelivery(): Promise<ProofPackDelivery> {
  const base = {
    product: "BLACKPROOF" as const,
    formatVersion: "blackproof-proofpack-delivery-v5" as const,
    methodVersion: "blackproof-method-v0.1.0-alpha",
    schemaVersion: "blackproof-proofpack-delivery-schema-v5" as const,
    schemaUrl: "https://blackproof.fr/schemas/proofpack-delivery/v5.schema.json" as const,
    deliveryId: `delivery_${"1".repeat(32)}`,
    verificationProfile: {
      id: "blackproof-local-integrity-v1" as const,
      verifies: ["schema", "fingerprint", "links", "invariants"] as ["schema", "fingerprint", "links", "invariants"],
      doesNotVerify: ["issuer-identity", "declaration-truth", "legal-validity", "trusted-timestamp"] as ["issuer-identity", "declaration-truth", "legal-validity", "trusted-timestamp"],
    },
    case: { id: `case_${"2".repeat(32)}`, title: "Northstar SaaS : Delivery démo", framework: "Cartographie BLACKPROOF NIS 2 / ReCyF, v0.1 alpha" },
    questions: [{
      id: `question_${"3".repeat(32)}`, text: "Le MFA est-il activé pour les administrateurs ?",
      answer: "Le MFA est activé pour les comptes administrateurs.",
      evidence: [{ id: `evidence_${"4".repeat(32)}`, title: "Attestation MFA expurgée", category: "access-control" as const, disclosure: "reference-only" as const, publicReference: "Attestation MFA 2026, consultable sous NDA" }],
    }],
    generatedAt: "2026-07-11T10:00:00.000Z",
  };
  return { ...base, fingerprint: `bp_sha256_${await sha256Hex(stableStringify(base))}` };
}
