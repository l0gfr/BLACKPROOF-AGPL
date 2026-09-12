import { SOFTWARE_LICENSE, SOURCE_CODE_URL } from "../../lib/source-code";
import {
  BLACKPROOF_PUBLIC_API_VERSION,
  apiEnvelope,
  jsonResponse,
} from "../../lib/api-response";
import {
  PUBLIC_CHANGELOG,
  PUBLIC_PRODUCT_BOUNDARIES,
  PUBLIC_STATUS_UPDATED_AT,
} from "../../lib/public-product-truth";

export const prerender = true;
const returnPackEnabled = import.meta.env.PUBLIC_BLACKPROOF_RETURN_PACK_ENABLED === "enabled";
const knowledgeVaultEnabled = import.meta.env.PUBLIC_BLACKPROOF_KNOWLEDGE_VAULT_ENABLED === "enabled";
const releaseCommit = import.meta.env.PUBLIC_BLACKPROOF_RELEASE_COMMIT?.trim() ?? null;

const publicContracts = [
  "/api/index.json",
  "/api/status.json",
  "/api/methodology.json",
  "/api/evidence-library.json",
  "/api/frameworks.json",
  "/api/proofdebt.json",
  "/api/proofpack/schema.json",
  "/schemas/proofpack/v1.schema.json",
  "/schemas/proofpack/v2.schema.json",
  "/schemas/proofpack/v3.schema.json",
  "/schemas/source-import/v1.schema.json",
  "/schemas/proofpack-delivery/v4.schema.json",
  "/schemas/proofpack-delivery/v5.schema.json",
  "/schemas/delivery-protocol/change-report-v1.schema.json",
  "/schemas/delivery-protocol/signature-v1.schema.json",
  "/schemas/delivery-protocol/revocation-v1.schema.json",
  "/schemas/delivery-protocol/status-v1.schema.json",
  "/canonicalization-vectors.json",
  "/api/verify.json",
] as const;

const publicArtifacts = [
  "/demo/proofpack-demo.json",
  "/demo/reponse-fournisseur-demo.md",
  "/demo/registre-preuves-demo.csv",
  "/demo/plan-remediation-demo.csv",
  "/demo/note-synthese-demo.md",
  "/demo/proofpack-bundle-manifest.json",
  "/demo/proofpack-delivery-demo.json",
  "/demo/proofpack-delivery-demo.zip",
] as const;

export function GET() {
  return jsonResponse(
    apiEnvelope("public-status", {
      version: BLACKPROOF_PUBLIC_API_VERSION,
      publicState: "alpha",
      updatedAt: PUBLIC_STATUS_UPDATED_AT,
      baseUrl: "https://blackproof.fr",
      releaseCommit,
      securityPosture: {
        publicSiteStatic: true,
        access: "libre et gratuit",
        accessRequirement: "none",
        accessModel: "open-source",
        softwareLicense: SOFTWARE_LICENSE,
        sourceCode: SOURCE_CODE_URL,
        httpsRequired: true,
        noDocumentUpload: true,
        noTrackers: true,
        noCdn: true,
        noGoogleFonts: true,
        publicApiReadOnly: true,
        publicDeliveryStatusRegistry: false,
        returnPackGeneration: returnPackEnabled ? "available" : "unavailable",
        knowledgeVault: knowledgeVaultEnabled ? "available" : "unavailable",
        deliveryStatusRegistry: "retired; current status unavailable",
        browserSupport: {
          supported: ["Chrome Desktop", "Edge Desktop"],
          notYetQualified: ["Firefox", "Safari", "mobile browsers"],
        },
      },
      publicContracts,
      immutableDeliverySchemas: [
        {
          version: "blackproof-proofpack-delivery-schema-v4",
          url: "https://blackproof.fr/schemas/proofpack-delivery/v4.schema.json",
          sha256: "dd96ff1ba81b8fcd6650beb74ffa6f1579b42f997349378200734bbdbe24f97e",
        },
        {
          version: "blackproof-proofpack-delivery-schema-v5",
          url: "https://blackproof.fr/schemas/proofpack-delivery/v5.schema.json",
          sha256: "a4a6b424e0d960c95020cd0b6c43b5bfe4dff8ac43f9147a2720c90d1d123234",
        },
      ],
      publicArtifacts,
      changelog: PUBLIC_CHANGELOG,
      boundaries: [...PUBLIC_PRODUCT_BOUNDARIES, "Parcours produit pris en charge sur Chrome et Edge Desktop uniquement."],
    })
  );
}
