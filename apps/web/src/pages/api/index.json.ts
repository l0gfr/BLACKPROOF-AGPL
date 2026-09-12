import {
  BLACKPROOF_PUBLIC_API_VERSION,
  apiEnvelope,
  jsonResponse,
} from "../../lib/api-response";

export const prerender = true;

const endpoints = [
  {
    path: "/api/index.json",
    method: "GET",
    resource: "api-index",
    stability: "alpha",
    description: "Index de l'API publique BLACKPROOF exploitable par machine.",
  },
  {
    path: "/api/status.json",
    method: "GET",
    resource: "public-status",
    stability: "alpha",
    description: "Statut public BLACKPROOF : version, posture, contrats, changelog et limites assumées.",
  },
  {
    path: "/api/methodology.json",
    method: "GET",
    resource: "methodology",
    stability: "alpha",
    description: "Méthode BLACKPROOF versionnée, étapes ProofGraph, statuts de preuve et invariants de sécurité.",
  },
  {
    path: "/api/evidence-library.json",
    method: "GET",
    resource: "evidence-library",
    stability: "alpha",
    description: "Modèles publics de preuves attendues et définitions de catégories utilisés par BLACKPROOF.",
  },
  {
    path: "/api/frameworks.json",
    method: "GET",
    resource: "frameworks",
    stability: "alpha",
    description: "Définitions publiques de référentiels, exigences et cartographies BLACKPROOF.",
  },
  {
    path: "/api/proofdebt.json",
    method: "GET",
    resource: "proofdebt",
    stability: "alpha",
    description: "Modèle d'indicateur ProofDebt, bandes et signaux d'interprétation.",
  },
  {
    path: "/api/proofpack/schema.json",
    method: "GET",
    resource: "proofpack-schema",
    stability: "alpha",
    description: "Point de découverte compatible du JSON Schema ProofPack et de ses versions immuables.",
  },
  {
    path: "/schemas/proofpack/v1.schema.json",
    method: "GET",
    resource: "proofpack-schema-v1",
    stability: "stable",
    description: "Schéma immuable des ProofPacks historiques sans version de format explicite.",
  },
  {
    path: "/schemas/proofpack/v2.schema.json",
    method: "GET",
    resource: "proofpack-schema-v2",
    stability: "stable",
    description: "Schéma immuable des ProofPacks Master v2 publiés, conservé octet par octet.",
  },
  {
    path: "/schemas/proofpack/v3.schema.json",
    method: "GET",
    resource: "proofpack-schema-v3",
    stability: "stable",
    description: "Schéma immuable courant des ProofPacks Master v3, avec identité de révision et historique Delivery explicites.",
  },
  {
    path: "/schemas/source-import/v1.schema.json",
    method: "GET",
    resource: "source-import-schema-v1",
    stability: "stable",
    description: "Schéma immuable du sidecar source-import.json pour le profil XLSX V1.",
  },
  {
    path: "/canonicalization-vectors.json",
    method: "GET",
    resource: "questionnaire-canonicalization-vectors",
    stability: "stable",
    description: "Vecteurs UTF-8 publics pour réimplémenter et tester les canonicalisations questionnaire v1 et v2.",
  },
  {
    path: "/schemas/proofpack-delivery/v4.schema.json",
    method: "GET",
    resource: "proofpack-delivery-schema-v4",
    stability: "stable",
    description: "JSON Schema historique V4 immuable du fichier delivery.json, conservé pour les exports pré-registre.",
  },
  {
    path: "/schemas/proofpack-delivery/v5.schema.json",
    method: "GET",
    resource: "proofpack-delivery-schema-v5",
    stability: "stable",
    description: "JSON Schema V5 immuable courant du fichier delivery.json, publié sous son URL versionnée.",
  },
  {
    path: "/schemas/delivery-protocol/change-report-v1.schema.json",
    method: "GET",
    resource: "delivery-change-report-schema-v1",
    stability: "stable",
    description: "JSON Schema du rapport de changements bilatéral entre deux Delivery valides.",
  },
  {
    path: "/schemas/delivery-protocol/signature-v1.schema.json",
    method: "GET",
    resource: "delivery-signature-schema-v1",
    stability: "stable",
    description: "JSON Schema de la signature émetteur ECDSA P-256 détachée et optionnelle.",
  },
  {
    path: "/schemas/delivery-protocol/revocation-v1.schema.json",
    method: "GET",
    resource: "delivery-revocation-schema-v1",
    stability: "stable",
    description: "JSON Schema de la déclaration de révocation archivable hors ligne.",
  },
  {
    path: "/schemas/delivery-protocol/status-v1.schema.json",
    method: "GET",
    resource: "delivery-status-schema-v1",
    stability: "stable",
    description: "JSON Schema du statut courant retourné par le registre public sans compte.",
  },
  {
    path: "/questionnaire-import.json",
    method: "GET",
    resource: "questionnaire-import-contract-alias",
    stability: "alpha",
    description: "Alias racine du contrat public d’import questionnaire.",
  },
  {
    path: "/api/questionnaire-import.json",
    method: "GET",
    resource: "questionnaire-import-contract",
    stability: "alpha",
    description: "Contrat public des formats, limites et garanties de l’import local, dont le profil XLSX borné.",
  },
  {
    path: "/api/verify.json",
    method: "GET",
    resource: "verify-contract",
    stability: "alpha",
    description: "Contrat de vérification locale des ProofPacks. Cette route statique ne téléverse ni ne stocke aucun ProofPack.",
  },
] as const;

const publicArtifacts = [
  {
    path: "/canonicalization-vectors.json",
    role: "canonicalization-test-vectors",
    description: "Entrées, octets canoniques et SHA-256 de référence pour les canonicalisations v1 et v2.",
  },
  {
    path: "/demo/supplier-questionnaire-demo.csv",
    role: "input-questionnaire",
    description: "Questionnaire fournisseur fictif pour rejouer le flux de démonstration.",
  },
  {
    path: "/demo/proofpack-demo.json",
    role: "proofpack-json",
    description: "ProofPack public avec empreinte SHA-256 contrôlable localement.",
  },
  {
    path: "/demo/proofpack-delivery-demo.json",
    role: "proofpack-delivery-json",
    description: "ProofPack Delivery minimal et vérifiable localement.",
  },
  {
    path: "/demo/proofpack-delivery-demo.zip",
    role: "proofpack-delivery-zip",
    description: "ZIP Delivery complet avec manifeste et empreintes vérifiables.",
  },
  {
    path: "/demo/reponse-fournisseur-demo.md",
    role: "supplier-answer",
    description: "Réponse fournisseur exemple avec réserves explicites.",
  },
  {
    path: "/demo/registre-preuves-demo.csv",
    role: "evidence-register",
    description: "Registre de preuves, sensibilités, statuts et formats recommandés.",
  },
  {
    path: "/demo/plan-remediation-demo.csv",
    role: "proofdebt-remediation",
    description: "Plan de réduction de dette de preuve.",
  },
  {
    path: "/demo/note-synthese-demo.md",
    role: "executive-summary",
    description: "Synthèse humaine du dossier avant transmission.",
  },
  {
    path: "/demo/proofpack-bundle-manifest.json",
    role: "bundle-manifest",
    description: "Manifeste public des fichiers du ProofPack de démonstration.",
  },
] as const;

const humanPages = [
  {
    path: "/open-source",
    role: "software-license",
    description: "Logiciel libre AGPL-3.0-only, code source et documentation technique.",
  },
  {
    path: "/grc",
    role: "category-positioning",
    description: "Comparaison entre le pilotage de conformité d’un GRC et la préparation d’un dossier client avec BLACKPROOF.",
  },
  {
    path: "/proofpack-example",
    role: "public-proofpack-example",
    description: "Exemple public d'un ProofPack manipulable avec proofpack.json à empreinte.",
  },
] as const;

export function GET() {
  return jsonResponse(
    apiEnvelope("api-index", {
      version: BLACKPROOF_PUBLIC_API_VERSION,
      baseUrl: "https://blackproof.fr",
      status: "alpha",
      positioning: "Contrats publics en lecture seule pour registres de préparation cyber. Les questionnaires et preuves sensibles restent locaux par défaut.",
      endpoints,
      humanPages,
      publicArtifacts,
    })
  );
}
