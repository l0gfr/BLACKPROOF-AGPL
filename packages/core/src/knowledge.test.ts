import { describe, expect, it } from "vitest";
import { buildProofPack, createKnowledgeEntry, createProofCaseFromQuestionnaire, findKnowledgeMatches, applyKnowledgeEntry, reviseKnowledgeEntry, retireKnowledgeEntry, sha256Hex, stableStringify, verifyKnowledgeEntry } from "./index";

async function refingerprint(value: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { fingerprint: _fingerprint, ...base } = value;
  return { ...base, fingerprint: `bp_sha256_${await sha256Hex(stableStringify(base))}` };
}

async function approvedFixture() {
  const result = await createProofCaseFromQuestionnaire("1. Le MFA est-il activé pour les comptes administrateurs ?");
  const question = { ...result.proofpack.questions[0]!, answerText: "Le MFA est imposé aux comptes administrateurs.", answerReservation: "", answerConfidence: "high" as const, answerExportStatus: "ready" as const };
  const proofpack = await buildProofPack(result.proofpack.case, [question], result.proofpack.evidence, result.proofpack.debts, { sourceQuestionnaire: result.proofpack.sourceQuestionnaire, previousProofPack: result.proofpack });
  return { proofpack, question: proofpack.questions[0]! };
}

describe("personal knowledge entries", () => {
  it("creates a fingerprinted approved entry without client labels", async () => {
    const fixture = await approvedFixture();
    const entry = await createKnowledgeEntry({ proofpack: fixture.proofpack, question: fixture.question, approvedByLabel: "RSSI", reviewAt: "2030-01-01T00:00:00.000Z" });
    expect(await verifyKnowledgeEntry(entry)).toBe(true);
    expect(entry).not.toHaveProperty("clientName");
    expect(entry.fingerprint).toMatch(/^bp_sha256_[a-f0-9]{64}$/);
  });

  it("fails closed on malformed knowledge entries", async () => {
    expect(await verifyKnowledgeEntry(null)).toBe(false);
    expect(await verifyKnowledgeEntry({ formatVersion: "blackproof-knowledge-entry-v1", aliases: "not-an-array" })).toBe(false);
  });

  it("rejects self-consistent but structurally invalid knowledge entries", async () => {
    const fixture = await approvedFixture();
    const entry = await createKnowledgeEntry({ proofpack: fixture.proofpack, question: fixture.question });

    expect(await verifyKnowledgeEntry(await refingerprint({ ...entry, unexpected: true }))).toBe(false);
    expect(await verifyKnowledgeEntry(await refingerprint({ ...entry, mappedRequirements: [42] }))).toBe(false);
    expect(await verifyKnowledgeEntry(await refingerprint({
      ...entry,
      provenance: { ...entry.provenance, unexpected: true },
    }))).toBe(false);
    expect(await verifyKnowledgeEntry(await refingerprint({ ...entry, updatedAt: "not-a-date" }))).toBe(false);
    expect(await verifyKnowledgeEntry(await refingerprint({ ...entry, updatedAt: "2026-02-31T12:00:00.000Z" }))).toBe(false);
    expect(await verifyKnowledgeEntry(await refingerprint({ ...entry, aliases: ["MFA", "MFA"] }))).toBe(false);
  });

  it("requires a case-approved answer before promotion", async () => {
    const result = await createProofCaseFromQuestionnaire("Le MFA est-il activé pour les administrateurs ?");
    await expect(createKnowledgeEntry({ proofpack: result.proofpack, question: result.proofpack.questions[0]! })).rejects.toThrow("KNOWLEDGE_ANSWER_REQUIRED");
  });

  it("matches deterministically and always applies as draft", async () => {
    const fixture = await approvedFixture();
    const entry = await createKnowledgeEntry({ proofpack: fixture.proofpack, question: fixture.question, aliases: ["Imposez-vous le MFA aux comptes privilégiés ?"] });
    const next = await createProofCaseFromQuestionnaire("Imposez-vous le MFA aux comptes privilégiés ?");
    const matches = findKnowledgeMatches(next.proofpack.questions[0]!, [entry]);
    expect(matches[0]).toMatchObject({ score: 95, reason: "alias-exact" });
    const applied = applyKnowledgeEntry(entry, next.proofpack.questions[0]!.id);
    expect(applied.patch.answerExportStatus).toBe("draft");
    expect(applied.use.entryFingerprint).toBe(entry.fingerprint);
  });

  it("retires by immutable revision and refuses tampering", async () => {
    const fixture = await approvedFixture();
    const entry = await createKnowledgeEntry({ proofpack: fixture.proofpack, question: fixture.question });
    const retired = await retireKnowledgeEntry(entry);
    expect(retired.status).toBe("retired");
    expect(retired.revisionId).not.toBe(entry.revisionId);
    expect(await verifyKnowledgeEntry({ ...entry, answerText: "Altéré" })).toBe(false);
  });

  it("revises under the same stable id with a new revision and fingerprint", async () => {
    const fixture = await approvedFixture();
    const entry = await createKnowledgeEntry({ proofpack: fixture.proofpack, question: fixture.question });
    const revised = await reviseKnowledgeEntry(entry, { answerText: "Le MFA est imposé et contrôlé trimestriellement.", approvedByLabel: "RSSI", reviewAt: "2030-01-01T00:00:00.000Z" });
    expect(revised.id).toBe(entry.id);
    expect(revised.revisionId).not.toBe(entry.revisionId);
    expect(revised.fingerprint).not.toBe(entry.fingerprint);
    expect(await verifyKnowledgeEntry(revised)).toBe(true);
  });
});
