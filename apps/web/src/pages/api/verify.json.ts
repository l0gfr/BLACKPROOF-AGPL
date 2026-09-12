import { METHOD_VERSION } from "@blackproof/core";
import { apiEnvelope, jsonResponse } from "../../lib/api-response";

export const prerender = true;

const checks = [
  {
    id: "zip-manifest",
    label: "ZIP et manifeste",
    description: "Contrôler l’inventaire strict, les fichiers inattendus, les tailles, les SHA-256 et l’empreinte canonique du manifeste.",
  },
  {
    id: "schema",
    label: "Structure du schéma",
    description: "Valider les champs requis du ProofPack, les valeurs énumérées et les structures tableaux/objets.",
  },
  {
    id: "fingerprint",
    label: "Empreinte SHA-256",
    description: "Recalculer l'empreinte canonique du contenu et la comparer à proofpack.fingerprint.",
  },
  {
    id: "summary",
    label: "Cohérence de la synthèse",
    description: "Recalculer les compteurs, dettes et scores à la date proofpack.generatedAt pour une vérification historique reproductible.",
  },
  {
    id: "current-freshness",
    label: "Fraîcheur actuelle non bloquante",
    description: "Signaler séparément les preuves expirées à la date de vérification sans invalider l’intégrité historique.",
  },
  {
    id: "links",
    label: "Intégrité des liens",
    description: "Vérifier que questions, preuves et dettes pointent vers des identifiants existants.",
  },
] as const;

export function GET() {
  return jsonResponse(
    apiEnvelope("verify-contract", {
      version: METHOD_VERSION,
      supportedMethods: ["GET"],
      serverSideUpload: false,
      sensitiveEvidenceAccepted: false,
      verifyPage: "/verify",
      schemaUrl: "/api/proofpack/schema.json",
      immutableMasterSchemas: {
        v1: "/schemas/proofpack/v1.schema.json",
        v2: "/schemas/proofpack/v2.schema.json",
        v3: "/schemas/proofpack/v3.schema.json",
      },
      canonicalizationVectorsUrl: "/canonicalization-vectors.json",
      deliverySchemaUrl: "/schemas/proofpack-delivery/v5.schema.json",
      immutableDeliverySchemas: {
        v4: "/schemas/proofpack-delivery/v4.schema.json",
        v5: "/schemas/proofpack-delivery/v5.schema.json",
      },
      sourceImportSchemaUrl: "/schemas/source-import/v1.schema.json",
      sourceImportVerificationScope: "Internal sidecar consistency only; source-cell proof requires the original XLSX and import-profile replay.",
      bilateralDeliveryProtocol: {
        accountRequiredForRecipient: false,
        openVerifierPackage: "@blackproof/verifier",
        openVerifierLicense: "AGPL-3.0-only",
        publicStatusRegistry: false,
        currentStatus: "unavailable; local integrity verification is not current-status verification",
        schemas: {
          changeReport: "/schemas/delivery-protocol/change-report-v1.schema.json",
          signature: "/schemas/delivery-protocol/signature-v1.schema.json",
          revocation: "/schemas/delivery-protocol/revocation-v1.schema.json",
          status: "/schemas/delivery-protocol/status-v1.schema.json",
        },
      },
      schemaValidation: {
        engine: "Ajv standalone",
        discoverySchema: "/api/proofpack/schema.json",
        selection: "formatVersion absent means historical v1; explicit v2 and v3 values select their matching immutable schema",
        sameValidatorInNodeAndBrowser: true,
        runtimeCodeGeneration: false,
      },
      checks,
      contract: {
        input: "Master JSON/ZIP, Delivery JSON/ZIP, optional previous Delivery, detached signature or revocation statement",
        output: "Automatic Master or Delivery verification result, plus optional change, signature and revocation checks",
        note: "BLACKPROOF est actuellement statique et exclusivement local. La vérification se fait dans le navigateur ou dans un environnement local/privé, pas via une route publique de téléversement.",
      },
    })
  );
}
