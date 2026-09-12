import {
  evidenceTemplatesByCategory,
  getMappedRequirements,
} from "./evidence";

import type {
  EvidenceTemplate,
  ProofCategory,
} from "./types";

export const EVIDENCE_LIBRARY_VERSION = "blackproof-evidence-library-v0.1.0-alpha";

export interface EvidenceCategoryDefinition {
  label: string;
  useWhen: string;
  limitations: string;
}

export interface EvidenceLibraryItem extends EvidenceTemplate {
  categoryLabel: string;
  useWhen: string;
  limitations: string;
  mappedRequirements: string[];
  evidenceStatusAdvice: string;
}

export const evidenceCategoryDefinitions: Record<ProofCategory, EvidenceCategoryDefinition> = {
  "access-control": {
    label: "Contrôle des accès",
    useWhen: "Questionnaires portant sur MFA, comptes administrateurs, IAM, privilèges, revues d'accès ou authentification.",
    limitations: "Une politique seule ne suffit pas toujours : les accès privilégiés exigent souvent une preuve de configuration ou de revue récente."
  },
  backup: {
    label: "Sauvegardes",
    useWhen: "Questions sur sauvegardes, restauration, fréquence, conservation, RPO/RTO ou résilience des données.",
    limitations: "Une procédure de sauvegarde sans test de restauration reste une preuve faible."
  },
  "incident-response": {
    label: "Réponse à incident",
    useWhen: "Questions sur détection, qualification, escalade, notification, gestion de crise ou registre d'incidents.",
    limitations: "Une procédure non testée ou sans registre associé reste surtout déclarative."
  },
  "business-continuity": {
    label: "Continuité et reprise",
    useWhen: "Questions sur PRA, PCA, reprise d'activité, continuité métier, crise majeure ou disaster recovery.",
    limitations: "Un plan ancien ou non testé doit être marqué comme dette résiduelle."
  },
  "supplier-security": {
    label: "Sécurité fournisseurs",
    useWhen: "Questions sur tiers, sous-traitants, fournisseurs critiques, vendor risk ou prestataires.",
    limitations: "Un registre complet peut contenir des informations sensibles : préférer un extrait contrôlé."
  },
  governance: {
    label: "Gouvernance sécurité",
    useWhen: "Questions sur politique SSI, responsabilités, risques, direction, comité sécurité ou pilotage.",
    limitations: "Une politique générale ne prouve pas l'exécution effective des contrôles."
  },
  "logging-monitoring": {
    label: "Journalisation et supervision",
    useWhen: "Questions sur logs, journaux de sécurité, SIEM, EDR, surveillance, détection ou conservation des traces.",
    limitations: "Les logs bruts sont sensibles : exporter une synthèse, une capture expurgée ou une attestation."
  },
  "vulnerability-management": {
    label: "Vulnérabilités et correctifs",
    useWhen: "Questions sur patching, CVE, scans, durcissement, pentest, remédiation ou suivi de vulnérabilités.",
    limitations: "Un rapport de scan complet est souvent trop sensible : préférer une synthèse ou un backlog expurgé."
  },
  "data-protection": {
    label: "Chiffrement et confidentialité",
    useWhen: "Questions sur chiffrement, confidentialité, données sensibles, RGPD/GDPR ou encryption.",
    limitations: "Ne jamais exposer de secret, clé, configuration complète ou chemin sensible dans un export client."
  },
  unknown: {
    label: "À qualifier",
    useWhen: "Questions non reconnues automatiquement par le moteur V1.",
    limitations: "Doit être mappé manuellement avant d'être considéré comme défendable."
  }
};

export function getEvidenceLibraryItems(): EvidenceLibraryItem[] {
  const entries = Object.entries(evidenceTemplatesByCategory) as Array<[ProofCategory, EvidenceTemplate[]]>;

  return entries.flatMap(([category, templates]) => {
    const definition = evidenceCategoryDefinitions[category];

    return templates.map((template) => ({
      ...template,
      categoryLabel: definition.label,
      useWhen: definition.useWhen,
      limitations: definition.limitations,
      mappedRequirements: getMappedRequirements(category),
      evidenceStatusAdvice: "Marquer disponible uniquement si la preuve existe, est récente, contextualisée et exportable ou référencée sans exposer de secret."
    }));
  });
}

export function getEvidenceLibraryByCategory(category: ProofCategory): EvidenceLibraryItem[] {
  return getEvidenceLibraryItems().filter((item) => item.category === category);
}

export function getEvidenceLibrarySummary() {
  const items = getEvidenceLibraryItems();

  return {
    version: EVIDENCE_LIBRARY_VERSION,
    itemCount: items.length,
    categoryCount: Object.keys(evidenceCategoryDefinitions).length,
    categories: Object.entries(evidenceCategoryDefinitions).map(([category, definition]) => ({
      category,
      label: definition.label,
      itemCount: items.filter((item) => item.category === category).length
    }))
  };
}
