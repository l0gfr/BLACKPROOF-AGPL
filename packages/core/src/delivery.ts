import type {
  EvidenceItem,
  ProofPack,
  ProofPackDelivery,
  ProofPackDeliveryEvidence,
  ProofPackDeliveryReview,
} from "./types";
import { escapeMarkdown, SECURITY_LIMITS, sha256Hex, stableStringify } from "./security";
import { isEvidenceReferenceComplete } from "./evidence-reference";
import { csv } from "./utils";

export const DELIVERY_FORMAT_VERSION = "blackproof-proofpack-delivery-v5" as const;
export const DELIVERY_SCHEMA_VERSION = "blackproof-proofpack-delivery-schema-v5" as const;
export const DELIVERY_SCHEMA_URL = "https://blackproof.fr/schemas/proofpack-delivery/v5.schema.json" as const;
export const DELIVERY_VERIFICATION_PROFILE = {
  id: "blackproof-local-integrity-v1",
  verifies: ["schema", "fingerprint", "links", "invariants"],
  doesNotVerify: ["issuer-identity", "declaration-truth", "legal-validity", "trusted-timestamp"],
} as const;

export class DeliveryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryValidationError";
  }
}

export async function confirmProofPackDeliveryPreview(
  delivery: ProofPackDelivery,
  confirmedFingerprint: string
): Promise<ProofPackDelivery> {
  const { fingerprint, ...base } = delivery;
  const expectedFingerprint = `bp_sha256_${await sha256Hex(stableStringify(base))}`;

  if (!confirmedFingerprint
    || fingerprint !== expectedFingerprint
    || confirmedFingerprint !== expectedFingerprint) {
    throw new DeliveryValidationError(
      "La confirmation ou le contenu ne correspond plus à l’empreinte de la prévisualisation Delivery. Relancez la revue finale."
    );
  }

  return delivery;
}

export interface ProofPackDeliveryZipFile {
  filename: string;
  contentType: string;
  purpose: string;
  content: string;
}

export interface ProofPackDeliveryManifest {
  product: "BLACKPROOF";
  manifestVersion: "blackproof-proofpack-delivery-zip-v1";
  caseId: string;
  generatedAt: string;
  deliveryFingerprint: string;
  files: Array<{
    filename: string;
    contentType: string;
    purpose: string;
    size: number;
    sha256: string;
  }>;
  manifestFingerprint: string;
}

function isEvidenceEligible(item: EvidenceItem): boolean {
  return item.status === "available"
    && isEvidenceReferenceComplete(item)
    && item.exportMode !== "internal-only"
    && Boolean(item.publicReference?.trim())
    && item.publicReference!.trim().length <= SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS;
}

function randomPublicId(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `${prefix}_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function toDeliveryEvidence(item: EvidenceItem, publicId: string): ProofPackDeliveryEvidence {
  return {
    id: publicId,
    title: item.title,
    category: item.category,
    disclosure: "reference-only",
    publicReference: item.publicReference!.trim(),
  };
}

export async function buildProofPackDelivery(
  master: ProofPack,
  review: ProofPackDeliveryReview
): Promise<ProofPackDelivery> {
  if (!review.confirmed) {
    throw new DeliveryValidationError("La revue finale du contenu destiné au tiers doit être confirmée.");
  }

  const selectedQuestionIds = new Set(review.questionIds);
  const selectedEvidenceIds = new Set(review.evidenceIds);
  const publicQuestionIds = new Map(review.questionIds.map((id) => [id, randomPublicId("question")]));
  const publicEvidenceIds = new Map(review.evidenceIds.map((id) => [id, randomPublicId("evidence")]));

  if (selectedQuestionIds.size === 0) {
    throw new DeliveryValidationError("Sélectionnez au moins une réponse validée pour le dossier de transmission.");
  }

  const unknownQuestionId = [...selectedQuestionIds].find(
    (id) => !master.questions.some((question) => question.id === id)
  );
  if (unknownQuestionId) {
    throw new DeliveryValidationError(`Question inconnue dans la revue Delivery : ${unknownQuestionId}.`);
  }

  const unknownEvidenceId = [...selectedEvidenceIds].find(
    (id) => !master.evidence.some((item) => item.id === id)
  );
  if (unknownEvidenceId) {
    throw new DeliveryValidationError(`Preuve inconnue dans la revue Delivery : ${unknownEvidenceId}.`);
  }

  const questions = master.questions
    .filter((question) => selectedQuestionIds.has(question.id))
    .map((question) => {
      if (question.answerExportStatus !== "ready" && question.answerExportStatus !== "reserved") {
        throw new DeliveryValidationError(
          `La réponse ${question.id} n'est pas validée pour la transmission.`
        );
      }

      const answer = question.answerText.trim();
      if (!answer) {
        throw new DeliveryValidationError(
          `La réponse ${question.id} ne peut pas reprendre une suggestion automatique : saisissez une formulation validée.`
        );
      }
      if (answer.length > SECURITY_LIMITS.MAX_ANSWER_CHARS) {
        throw new DeliveryValidationError(`La réponse ${question.id} dépasse ${SECURITY_LIMITS.MAX_ANSWER_CHARS} caractères.`);
      }

      const reservation = question.answerReservation.trim();
      if (question.answerExportStatus === "reserved" && !reservation) {
        throw new DeliveryValidationError(
          `La réponse réservée ${question.id} doit contenir une réserve validée.`
        );
      }
      if (reservation && reservation.length > SECURITY_LIMITS.MAX_RESERVATION_CHARS) {
        throw new DeliveryValidationError(`La réserve ${question.id} dépasse ${SECURITY_LIMITS.MAX_RESERVATION_CHARS} caractères.`);
      }

      const evidence = master.evidence
        .filter((item) => item.questionId === question.id && selectedEvidenceIds.has(item.id))
        .map((item) => {
          if (!isEvidenceEligible(item)) {
            throw new DeliveryValidationError(
              `La preuve ${item.id} n'est pas publiable : une référence publique explicite est obligatoire pour le Delivery.`
            );
          }
          return toDeliveryEvidence(item, publicEvidenceIds.get(item.id)!);
        });

      return {
        id: publicQuestionIds.get(question.id)!,
        text: question.text,
        answer,
        ...(reservation ? { reservation } : {}),
        evidence,
      };
    });

  const linkedSelectedEvidence = new Set(questions.flatMap((question) => question.evidence.map((item) => item.id)));
  const unlinkedEvidenceId = [...selectedEvidenceIds].find((id) => !linkedSelectedEvidence.has(publicEvidenceIds.get(id)!));
  if (unlinkedEvidenceId) {
    throw new DeliveryValidationError(
      `La preuve ${unlinkedEvidenceId} n'est pas rattachée à une réponse incluse.`
    );
  }

  const generatedAt = new Date().toISOString();
  const deliveryId = randomPublicId("delivery");
  const base = {
    product: "BLACKPROOF" as const,
    formatVersion: DELIVERY_FORMAT_VERSION,
    methodVersion: master.methodVersion,
    schemaVersion: DELIVERY_SCHEMA_VERSION,
    schemaUrl: DELIVERY_SCHEMA_URL,
    deliveryId,
    verificationProfile: DELIVERY_VERIFICATION_PROFILE,
    case: {
      id: randomPublicId("case"),
      title: master.case.title,
      framework: master.case.framework,
    },
    questions,
    generatedAt,
  };

  return {
    ...base,
    fingerprint: `bp_sha256_${await sha256Hex(stableStringify(base))}`,
  };
}

export function exportProofPackDeliveryJson(delivery: ProofPackDelivery): string {
  return JSON.stringify(delivery, null, 2);
}

export function exportDeliveryResponseMarkdown(delivery: ProofPackDelivery): string {
  const lines = [
    "# Réponse cyber fournisseur",
    "",
    `Dossier : ${escapeMarkdown(delivery.case.title)}`,
    `Référentiel : ${escapeMarkdown(delivery.case.framework)}`,
    `Empreinte Delivery : ${escapeMarkdown(delivery.fingerprint)}`,
    "",
  ];

  delivery.questions.forEach((question, index) => {
    lines.push(`## Question ${index + 1}`, "", escapeMarkdown(question.text), "", "### Réponse", "", escapeMarkdown(question.answer), "");
    if (question.reservation) {
      lines.push("### Réserve", "", escapeMarkdown(question.reservation), "");
    }
    if (question.evidence.length > 0) {
      lines.push("### Éléments probants déclarés", "");
      for (const evidence of question.evidence) {
        lines.push(`- ${escapeMarkdown(evidence.publicReference)}`);
      }
      lines.push("");
    }
  });

  return lines.join("\n");
}

export function exportDeliveryEvidenceRegisterCsv(delivery: ProofPackDelivery): string {
  return csv([
    ["question_id", "evidence_id", "title", "category", "disclosure", "public_reference"],
    ...delivery.questions.flatMap((question) =>
      question.evidence.map((item) => [
        question.id,
        item.id,
        item.title,
        item.category,
        item.disclosure,
        item.publicReference,
      ])
    ),
  ]);
}

export function exportProofPackDeliveryReadme(delivery: ProofPackDelivery): string {
  return [
    "# ProofPack Delivery BLACKPROOF",
    "",
    "Ce dossier est destiné à un tiers et a été construit par sélection explicite.",
    "Il ne contient ni brouillons, ni suggestions automatiques, ni réponses marquées ne pas exporter, ni plan de remédiation, ni note interne.",
    "Les preuves éventuellement listées le sont uniquement comme références minimales autorisées.",
    "",
    `Dossier : ${escapeMarkdown(delivery.case.title)}`,
    `Empreinte Delivery : \`${delivery.fingerprint}\``,
    `Identifiant Delivery : \`${delivery.deliveryId}\``,
    `Version de méthode : \`${delivery.methodVersion}\``,
    `Version de schéma : \`${delivery.schemaVersion}\``,
    `Schéma public : ${delivery.schemaUrl}`,
    "La vérification locale couvre le schéma, l’empreinte, les liens et les invariants. Elle n’authentifie pas l’émetteur, la véracité des déclarations, la validité juridique ni un horodatage de confiance.",
    "",
  ].join("\n");
}

export function buildProofPackDeliveryZipFiles(delivery: ProofPackDelivery): ProofPackDeliveryZipFile[] {
  return [
    {
      filename: "delivery.json",
      contentType: "application/json",
      purpose: "Dossier de transmission externe minimal et lisible par machine.",
      content: exportProofPackDeliveryJson(delivery),
    },
    {
      filename: "reponse-fournisseur.md",
      contentType: "text/markdown",
      purpose: "Réponses et réserves explicitement autorisées pour le tiers.",
      content: exportDeliveryResponseMarkdown(delivery),
    },
    {
      filename: "references-preuves.csv",
      contentType: "text/csv",
      purpose: "Références minimales de preuves explicitement autorisées.",
      content: exportDeliveryEvidenceRegisterCsv(delivery),
    },
    {
      filename: "README.md",
      contentType: "text/markdown",
      purpose: "Portée et limites du dossier de transmission.",
      content: exportProofPackDeliveryReadme(delivery),
    },
  ];
}

export async function buildProofPackDeliveryManifest(
  delivery: ProofPackDelivery
): Promise<ProofPackDeliveryManifest> {
  await confirmProofPackDeliveryPreview(delivery, delivery.fingerprint);
  const files = await Promise.all(buildProofPackDeliveryZipFiles(delivery).map(async (file) => ({
    filename: file.filename,
    contentType: file.contentType,
    purpose: file.purpose,
    size: new TextEncoder().encode(file.content).byteLength,
    sha256: await sha256Hex(file.content),
  })));
  const base = {
    product: "BLACKPROOF" as const,
    manifestVersion: "blackproof-proofpack-delivery-zip-v1" as const,
    caseId: delivery.case.id,
    generatedAt: delivery.generatedAt,
    deliveryFingerprint: delivery.fingerprint,
    files,
  };

  return {
    ...base,
    manifestFingerprint: `bp_sha256_${await sha256Hex(stableStringify(base))}`,
  };
}

export async function exportProofPackDeliveryManifestJson(delivery: ProofPackDelivery): Promise<string> {
  return JSON.stringify(await buildProofPackDeliveryManifest(delivery), null, 2);
}
