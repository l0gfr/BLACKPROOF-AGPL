import { getMappedRequirements } from "./evidence";
import type { ProofCategory } from "./types";

export const FRAMEWORK_MAPPING_VERSION = "blackproof-framework-mapping-v0.1.0-alpha";

export type FrameworkId = "nis2-eu" | "recyf-fr" | "blackproof-custom";

export interface FrameworkDefinition {
  id: FrameworkId;
  label: string;
  jurisdiction: string;
  status: "official-source" | "country-pack-alpha" | "internal";
  purpose: string;
  disclaimer: string;
  sourceUrl?: string;
}

export interface FrameworkRequirement {
  id: string;
  frameworkId: FrameworkId;
  family: ProofCategory;
  label: string;
  shortDescription: string;
  evidenceIntent: string;
  typicalEvidenceIds: string[];
  proofDebtHint: string;
  legalStatus: "evidence-working-map" | "non-official-alpha" | "custom";
}

export interface FrameworkMappingSummary {
  version: string;
  frameworkCount: number;
  requirementCount: number;
  frameworks: Array<{
    id: FrameworkId;
    label: string;
    requirementCount: number;
  }>;
}

export const frameworkDefinitions: FrameworkDefinition[] = [
  {
    id: "nis2-eu",
    label: "NIS 2, familles de travail BLACKPROOF",
    jurisdiction: "European Union",
    status: "official-source",
    purpose: "Cartographie éditoriale BLACKPROOF inspirée des familles de gestion du risque, notification, chaîne d'approvisionnement et gouvernance de la directive NIS 2.",
    disclaimer: "Ce mapping BLACKPROOF ne constitue pas un avis juridique, une certification ou une transposition nationale officielle.",
    sourceUrl: "https://digital-strategy.ec.europa.eu/en/policies/nis2-directive"
  },
  {
    id: "recyf-fr",
    label: "ReCyF, cartographie de travail BLACKPROOF",
    jurisdiction: "France",
    status: "country-pack-alpha",
    purpose: "Couche française de travail pour relier les fiches de preuve BLACKPROOF aux familles cyber d'un dossier fournisseur.",
    disclaimer: "Cartographie alpha BLACKPROOF à relire contre les textes et guides officiels applicables avant tout usage commercial ou contractuel.",
    sourceUrl: "https://messervices.cyber.gouv.fr/documents-ressources/20260317_NIS_V2_ReCyF_v2.5.pdf"
  },
  {
    id: "blackproof-custom",
    label: "BLACKPROOF, questions personnalisées ou sans correspondance",
    jurisdiction: "Internal",
    status: "internal",
    purpose: "Espace de qualification pour les questions non reconnues automatiquement par le moteur.",
    disclaimer: "Une exigence personnalisée doit être qualifiée manuellement avant toute décision de transmission."
  }
];

export const frameworkRequirements: FrameworkRequirement[] = [
  {
    id: "nis2.risk-management.access-control",
    frameworkId: "nis2-eu",
    family: "access-control",
    label: "Éléments relatifs aux accès et à l’authentification",
    shortDescription: "Preuves liées aux accès, comptes privilégiés, authentification et revues d'accès.",
    evidenceIntent: "Montrer que les accès sensibles sont gouvernés, protégés et périodiquement revus.",
    typicalEvidenceIds: ["access-mfa-policy", "access-admin-review"],
    proofDebtHint: "Une déclaration MFA sans preuve de politique, configuration ou revue reste une dette critique.",
    legalStatus: "evidence-working-map"
  },
  {
    id: "recyf.access-control",
    frameworkId: "recyf-fr",
    family: "access-control",
    label: "Contrôle des accès",
    shortDescription: "Famille de travail pour MFA, comptes administrateurs et gestion des privilèges.",
    evidenceIntent: "Relier les réponses d'accès aux preuves MFA et revues de comptes.",
    typicalEvidenceIds: ["access-mfa-policy", "access-admin-review"],
    proofDebtHint: "Les comptes à privilèges doivent être documentés avec plus qu'une simple réponse déclarative.",
    legalStatus: "non-official-alpha"
  },

  {
    id: "nis2.risk-management.business-continuity",
    frameworkId: "nis2-eu",
    family: "backup",
    label: "Éléments relatifs aux sauvegardes et à la restauration",
    shortDescription: "Preuves de sauvegarde, conservation, restauration et reprise.",
    evidenceIntent: "Montrer que les données peuvent être restaurées et que la procédure est testée.",
    typicalEvidenceIds: ["backup-policy", "backup-restore-test"],
    proofDebtHint: "Une politique de backup sans test de restauration reste insuffisante.",
    legalStatus: "evidence-working-map"
  },
  {
    id: "recyf.backup",
    frameworkId: "recyf-fr",
    family: "backup",
    label: "Sauvegardes",
    shortDescription: "Famille de travail pour procédures de sauvegarde et tests de restauration.",
    evidenceIntent: "Associer les réponses backup à une procédure et à un test daté.",
    typicalEvidenceIds: ["backup-policy", "backup-restore-test"],
    proofDebtHint: "Le test de restauration est souvent la preuve forte.",
    legalStatus: "non-official-alpha"
  },

  {
    id: "nis2.incident-handling",
    frameworkId: "nis2-eu",
    family: "incident-response",
    label: "Éléments relatifs au traitement des incidents",
    shortDescription: "Preuves de procédure, escalade, registre, qualification et notification d'incident.",
    evidenceIntent: "Montrer que l'organisation sait détecter, qualifier, traiter et tracer un incident.",
    typicalEvidenceIds: ["incident-response-plan", "incident-register"],
    proofDebtHint: "Une procédure non testée ou sans registre reste faible.",
    legalStatus: "evidence-working-map"
  },
  {
    id: "recyf.incident-response",
    frameworkId: "recyf-fr",
    family: "incident-response",
    label: "Réponse à incident",
    shortDescription: "Famille de travail pour procédures de réponse à incident et registre.",
    evidenceIntent: "Associer la réponse incident à des documents et traces exploitables.",
    typicalEvidenceIds: ["incident-response-plan", "incident-register"],
    proofDebtHint: "Le registre ou un exercice documenté renforce fortement la réponse.",
    legalStatus: "non-official-alpha"
  },

  {
    id: "nis2.risk-management.continuity",
    frameworkId: "nis2-eu",
    family: "business-continuity",
    label: "Éléments relatifs à la continuité et à la gestion de crise",
    shortDescription: "Preuves de PRA, PCA, continuité d'activité et reprise en situation dégradée.",
    evidenceIntent: "Montrer que la continuité ou la reprise est préparée, documentée et testable.",
    typicalEvidenceIds: ["bcp-plan"],
    proofDebtHint: "Un PRA/PCA périmé ou non testé doit être documenté comme dette résiduelle.",
    legalStatus: "evidence-working-map"
  },
  {
    id: "recyf.business-continuity",
    frameworkId: "recyf-fr",
    family: "business-continuity",
    label: "Continuité et reprise",
    shortDescription: "Famille de travail pour PRA, PCA et résilience opérationnelle.",
    evidenceIntent: "Relier les questions de continuité à un plan exploitable.",
    typicalEvidenceIds: ["bcp-plan"],
    proofDebtHint: "La fraîcheur et le périmètre du plan doivent être visibles.",
    legalStatus: "non-official-alpha"
  },

  {
    id: "nis2.supply-chain-security",
    frameworkId: "nis2-eu",
    family: "supplier-security",
    label: "Éléments relatifs à la sécurité de la chaîne d’approvisionnement",
    shortDescription: "Preuves relatives aux fournisseurs critiques, tiers, prestataires et sous-traitants.",
    evidenceIntent: "Montrer que les fournisseurs critiques sont identifiés, suivis et revus.",
    typicalEvidenceIds: ["supplier-policy", "supplier-register"],
    proofDebtHint: "Un registre fournisseur complet peut être sensible : préférer extrait contrôlé ou synthèse.",
    legalStatus: "evidence-working-map"
  },
  {
    id: "recyf.supplier-security",
    frameworkId: "recyf-fr",
    family: "supplier-security",
    label: "Sécurité fournisseurs",
    shortDescription: "Famille de travail pour vendor risk, tiers et fournisseurs critiques.",
    evidenceIntent: "Associer les réponses supply chain à une politique et un registre.",
    typicalEvidenceIds: ["supplier-policy", "supplier-register"],
    proofDebtHint: "La preuve doit montrer le périmètre et la criticité sans exposer la liste complète si sensible.",
    legalStatus: "non-official-alpha"
  },

  {
    id: "nis2.governance",
    frameworkId: "nis2-eu",
    family: "governance",
    label: "Éléments relatifs à la gouvernance et à la gestion des risques",
    shortDescription: "Preuves de gouvernance, responsabilité, politiques, risques et pilotage sécurité.",
    evidenceIntent: "Montrer que la cybersécurité est gouvernée et suivie.",
    typicalEvidenceIds: ["security-policy", "risk-register"],
    proofDebtHint: "Une politique générale ne prouve pas l'exécution effective des contrôles.",
    legalStatus: "evidence-working-map"
  },
  {
    id: "recyf.governance",
    frameworkId: "recyf-fr",
    family: "governance",
    label: "Gouvernance",
    shortDescription: "Famille de travail pour politique SSI, registre des risques et pilotage.",
    evidenceIntent: "Associer les réponses de gouvernance à des éléments de pilotage vérifiables.",
    typicalEvidenceIds: ["security-policy", "risk-register"],
    proofDebtHint: "Le registre de risques est plus fort qu'une politique générique seule.",
    legalStatus: "non-official-alpha"
  },

  {
    id: "nis2.detection",
    frameworkId: "nis2-eu",
    family: "logging-monitoring",
    label: "Éléments relatifs à la détection, aux journaux et à la supervision",
    shortDescription: "Preuves liées aux journaux, traces, supervision, SIEM, EDR ou surveillance sécurité.",
    evidenceIntent: "Montrer que les événements utiles sont collectés, conservés et supervisés.",
    typicalEvidenceIds: ["logging-policy", "monitoring-evidence"],
    proofDebtHint: "Les logs bruts sont sensibles : exporter une synthèse ou une preuve expurgée.",
    legalStatus: "evidence-working-map"
  },
  {
    id: "recyf.logging-monitoring",
    frameworkId: "recyf-fr",
    family: "logging-monitoring",
    label: "Journalisation et supervision",
    shortDescription: "Famille de travail pour logs, SIEM, EDR, détection et conservation des traces.",
    evidenceIntent: "Relier les réponses de journalisation à une politique et une preuve de supervision.",
    typicalEvidenceIds: ["logging-policy", "monitoring-evidence"],
    proofDebtHint: "La preuve doit éviter d'exposer des traces sensibles.",
    legalStatus: "non-official-alpha"
  },

  {
    id: "nis2.risk-management.vulnerability",
    frameworkId: "nis2-eu",
    family: "vulnerability-management",
    label: "Éléments relatifs aux vulnérabilités et aux correctifs",
    shortDescription: "Preuves de patch management, scans, CVE, durcissement et remédiation.",
    evidenceIntent: "Montrer que les vulnérabilités sont identifiées, priorisées et corrigées.",
    typicalEvidenceIds: ["patch-policy", "scan-report"],
    proofDebtHint: "Un scan complet peut être trop sensible : préférer synthèse, ticket ou backlog expurgé.",
    legalStatus: "evidence-working-map"
  },
  {
    id: "recyf.vulnerability-management",
    frameworkId: "recyf-fr",
    family: "vulnerability-management",
    label: "Vulnérabilités et correctifs",
    shortDescription: "Famille de travail pour patching, scans, CVE et remédiation.",
    evidenceIntent: "Associer les réponses de vulnérabilité à une procédure et un suivi concret.",
    typicalEvidenceIds: ["patch-policy", "scan-report"],
    proofDebtHint: "Le suivi de remédiation rend la réponse plus défendable qu'une politique seule.",
    legalStatus: "non-official-alpha"
  },

  {
    id: "nis2.risk-management.encryption",
    frameworkId: "nis2-eu",
    family: "data-protection",
    label: "Éléments relatifs au chiffrement et à la confidentialité",
    shortDescription: "Fiches de preuve relatives au chiffrement et à la confidentialité des données.",
    evidenceIntent: "Montrer que les données sensibles sont protégées sans exposer de secret.",
    typicalEvidenceIds: ["data-encryption-policy"],
    proofDebtHint: "Ne jamais exporter clés, secrets, configurations complètes ou chemins sensibles.",
    legalStatus: "evidence-working-map"
  },
  {
    id: "recyf.data-protection",
    frameworkId: "recyf-fr",
    family: "data-protection",
    label: "Chiffrement et confidentialité",
    shortDescription: "Famille de travail cyber pour le chiffrement, les données sensibles et la confidentialité. Elle ne constitue pas une cartographie RGPD complète.",
    evidenceIntent: "Associer les réponses data protection à une politique ou un extrait contrôlé.",
    typicalEvidenceIds: ["data-encryption-policy"],
    proofDebtHint: "Les preuves de chiffrement doivent être expurgées et contextualisées.",
    legalStatus: "non-official-alpha"
  },

  {
    id: "custom.unmapped",
    frameworkId: "blackproof-custom",
    family: "unknown",
    label: "Question sans correspondance de travail",
    shortDescription: "Question non reconnue par le moteur V1.",
    evidenceIntent: "Forcer une qualification manuelle avant export sérieux.",
    typicalEvidenceIds: ["generic-evidence"],
    proofDebtHint: "Un élément non mappé doit être revu avant d'être présenté au client.",
    legalStatus: "custom"
  }
];

export function getFrameworkDefinitions(): FrameworkDefinition[] {
  return frameworkDefinitions;
}

export function getFrameworkRequirements(): FrameworkRequirement[] {
  return frameworkRequirements;
}

export function getFrameworkRequirementById(id: string): FrameworkRequirement | undefined {
  return frameworkRequirements.find((requirement) => requirement.id === id);
}

export function resolveRequirementIds(ids: string[]): FrameworkRequirement[] {
  return ids
    .map((id) => getFrameworkRequirementById(id))
    .filter((requirement): requirement is FrameworkRequirement => Boolean(requirement));
}

export function getFrameworkRequirementsForCategory(category: ProofCategory): FrameworkRequirement[] {
  return frameworkRequirements.filter((requirement) => requirement.family === category);
}

export function getFrameworkRequirementsForFramework(frameworkId: FrameworkId): FrameworkRequirement[] {
  return frameworkRequirements.filter((requirement) => requirement.frameworkId === frameworkId);
}

export function getRequirementCoverageForCategory(category: ProofCategory): {
  category: ProofCategory;
  mappedRequirementIds: string[];
  requirements: FrameworkRequirement[];
  missingRequirementIds: string[];
} {
  const mappedRequirementIds = getMappedRequirements(category);
  const requirements = resolveRequirementIds(mappedRequirementIds);
  const knownIds = new Set(requirements.map((requirement) => requirement.id));

  return {
    category,
    mappedRequirementIds,
    requirements,
    missingRequirementIds: mappedRequirementIds.filter((id) => !knownIds.has(id))
  };
}

export function getFrameworkMappingSummary(): FrameworkMappingSummary {
  return {
    version: FRAMEWORK_MAPPING_VERSION,
    frameworkCount: frameworkDefinitions.length,
    requirementCount: frameworkRequirements.length,
    frameworks: frameworkDefinitions.map((framework) => ({
      id: framework.id,
      label: framework.label,
      requirementCount: getFrameworkRequirementsForFramework(framework.id).length
    }))
  };
}
