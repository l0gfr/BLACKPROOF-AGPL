import type { ProofPack } from "./types";

export interface ProofPackSchemaCorpusCase {
  id: string;
  expectedValid: boolean;
  payload: unknown;
}

export function buildProofPackSchemaCorpus(proofpack: ProofPack): ProofPackSchemaCorpusCase[] {
  const mutate = (change: (payload: any) => void): unknown => {
    const payload = structuredClone(proofpack);
    change(payload);
    return payload;
  };

  return [
    {
      id: "valid-baseline",
      expectedValid: true,
      payload: structuredClone(proofpack),
    },
    {
      id: "valid-generated-at-with-offset",
      expectedValid: true,
      payload: mutate((payload) => { payload.generatedAt = "2026-07-11T10:30:00+02:00"; }),
    },
    {
      id: "valid-historical-v1-with-implicit-canonicalization-v1",
      expectedValid: true,
      payload: mutate((payload) => {
        delete payload.formatVersion;
        delete payload.schemaVersion;
        delete payload.sourceQuestionnaire.canonicalizationVersion;
      }),
    },
    {
      id: "invalid-v3-without-canonicalization-version",
      expectedValid: false,
      payload: mutate((payload) => { delete payload.sourceQuestionnaire.canonicalizationVersion; }),
    },
    {
      id: "invalid-unsupported-format-version",
      expectedValid: false,
      payload: mutate((payload) => { payload.formatVersion = "blackproof-proofpack-v999"; }),
    },
    {
      id: "invalid-v3-without-revision-id",
      expectedValid: false,
      payload: mutate((payload) => { delete payload.revisionId; }),
    },
    {
      id: "invalid-v3-without-delivery-history",
      expectedValid: false,
      payload: mutate((payload) => { delete payload.deliveryHistory; }),
    },
    {
      id: "invalid-generated-at-without-timezone",
      expectedValid: false,
      payload: mutate((payload) => { payload.generatedAt = "2026-07-11T10:30:00"; }),
    },
    {
      id: "invalid-case-date-without-timezone",
      expectedValid: false,
      payload: mutate((payload) => { payload.case.createdAt = "2026-07-11T10:30:00"; }),
    },
    {
      id: "invalid-evidence-date-without-timezone",
      expectedValid: false,
      payload: mutate((payload) => { payload.evidence[0].observedAt = "2026-07-11T10:30:00"; }),
    },
    {
      id: "invalid-additional-root-property",
      expectedValid: false,
      payload: mutate((payload) => { payload.unexpected = true; }),
    },
    {
      id: "invalid-evidence-status",
      expectedValid: false,
      payload: mutate((payload) => { payload.evidence[0].status = "unverified"; }),
    },
  ];
}
