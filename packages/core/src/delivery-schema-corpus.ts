import type { ProofPackDelivery } from "./types";

export interface ProofPackDeliverySchemaCorpusCase {
  id: string;
  expectedValid: boolean;
  payload: unknown;
}

export function buildProofPackDeliverySchemaCorpus(
  delivery: ProofPackDelivery
): ProofPackDeliverySchemaCorpusCase[] {
  const mutate = (change: (payload: any) => void): unknown => {
    const payload = structuredClone(delivery);
    change(payload);
    return payload;
  };

  return [
    { id: "delivery-valid-baseline", expectedValid: true, payload: structuredClone(delivery) },
    {
      id: "delivery-valid-generated-at-with-offset",
      expectedValid: true,
      payload: mutate((payload) => { payload.generatedAt = "2026-07-11T10:30:00+02:00"; }),
    },
    {
      id: "delivery-invalid-generated-at-date-only",
      expectedValid: false,
      payload: mutate((payload) => { payload.generatedAt = "2026-07-11"; }),
    },
    {
      id: "delivery-invalid-generated-at-without-timezone",
      expectedValid: false,
      payload: mutate((payload) => { payload.generatedAt = "2026-07-11T10:30:00"; }),
    },
    {
      id: "delivery-invalid-schema-version",
      expectedValid: false,
      payload: mutate((payload) => { payload.schemaVersion = "blackproof-proofpack-delivery-schema-v999"; }),
    },
    {
      id: "delivery-invalid-unversioned-schema-url",
      expectedValid: false,
      payload: mutate((payload) => { payload.schemaUrl = "https://blackproof.fr/proofpack-delivery-schema.json"; }),
    },
    {
      id: "delivery-invalid-verification-profile",
      expectedValid: false,
      payload: mutate((payload) => { payload.verificationProfile.doesNotVerify.pop(); }),
    },
    {
      id: "delivery-invalid-additional-root-property",
      expectedValid: false,
      payload: mutate((payload) => { payload.unexpected = true; }),
    },
    {
      id: "delivery-invalid-internal-case-id",
      expectedValid: false,
      payload: mutate((payload) => { payload.case.id = "case-internal-master-id"; }),
    },
    {
      id: "delivery-invalid-internal-question-id",
      expectedValid: false,
      payload: mutate((payload) => { payload.questions[0].id = "question-internal-master-id"; }),
    },
    {
      id: "delivery-invalid-internal-evidence-id",
      expectedValid: false,
      payload: mutate((payload) => {
        payload.questions[0].evidence = [{
          id: "evidence-internal-master-id",
          title: "Attestation",
          category: "access-control",
          disclosure: "reference-only",
          publicReference: "Référence publique",
        }];
      }),
    },
    {
      id: "delivery-invalid-v4-internal-question-metadata",
      expectedValid: false,
      payload: mutate((payload) => { payload.questions[0].criticality = "critical"; }),
    },
    {
      id: "delivery-invalid-answer-too-long",
      expectedValid: false,
      payload: mutate((payload) => { payload.questions[0].answer = "a".repeat(10_001); }),
    },
  ];
}
