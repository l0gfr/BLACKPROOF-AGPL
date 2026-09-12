import type {
  EvidenceTemplate,
  ProofCategory,
} from "./types";

const categoryRules: Array<{
  category: ProofCategory;
  keywords: string[];
}> = [
  {
    category: "access-control",
    keywords: [
      "mfa",
      "2fa",
      "multi-factor",
      "multifacteur",
      "authentification",
      "admin",
      "administrateur",
      "privilège",
      "privileged",
      "iam",
      "accès",
      "access"
    ],
  },
  {
    category: "backup",
    keywords: [
      "backup",
      "sauvegarde",
      "restore",
      "restauration",
      "snapshot",
      "rpo",
      "rto"
    ],
  },
  {
    category: "incident-response",
    keywords: [
      "incident",
      "notification",
      "alerte",
      "breach",
      "compromission",
      "crise",
      "forensic"
    ],
  },
  {
    category: "business-continuity",
    keywords: [
      "pra",
      "pca",
      "bcp",
      "continuité",
      "reprise",
      "résilience",
      "disaster recovery"
    ],
  },
  {
    category: "supplier-security",
    keywords: [
      "fournisseur",
      "fournisseurs",
      "supplier",
      "suppliers",
      "sous-traitant",
      "sous-traitants",
      "third party",
      "third-party",
      "vendor",
      "prestataire",
      "prestataires"
    ],
  },
  {
    category: "logging-monitoring",
    keywords: [
      "log",
      "logs",
      "journal",
      "journaux",
      "journalisation",
      "siem",
      "monitoring",
      "surveillance",
      "détection",
      "edr",
      "trace"
    ],
  },
  {
    category: "vulnerability-management",
    keywords: [
      "patch",
      "correctif",
      "correctifs",
      "vulnérabilité",
      "vulnérabilités",
      "vulnerability",
      "scan",
      "scans",
      "cve",
      "pentest",
      "durcissement"
    ],
  },
  {
    category: "data-protection",
    keywords: [
      "donnée",
      "data",
      "chiffrement",
      "encryption",
      "confidentialité",
      "sensible",
      "rgpd",
      "gdpr"
    ],
  },
  {
    category: "governance",
    keywords: [
      "politique",
      "policy",
      "gouvernance",
      "responsable",
      "rssI",
      "risk",
      "risque",
      "comité",
      "direction"
    ],
  },
];

export const evidenceTemplatesByCategory: Record<ProofCategory, EvidenceTemplate[]> = {
  "access-control": [
    {
      id: "access-mfa-policy",
      title: "Politique MFA",
      category: "access-control",
      description: "Document décrivant les règles d'authentification multifacteur.",
      sensitivity: "internal",
      strength: "medium",
      recommendedFormat: "PDF, Markdown, lien interne ou extrait contrôlé",
    },
    {
      id: "access-admin-review",
      title: "Revue des comptes administrateurs",
      category: "access-control",
      description: "Preuve de revue périodique des comptes à privilèges.",
      sensitivity: "confidential",
      strength: "strong",
      recommendedFormat: "CSV expurgé, rapport de revue ou capture anonymisée",
    },
  ],
  backup: [
    {
      id: "backup-policy",
      title: "Procédure de sauvegarde",
      category: "backup",
      description: "Procédure décrivant la fréquence, le périmètre et la conservation des sauvegardes.",
      sensitivity: "internal",
      strength: "medium",
      recommendedFormat: "PDF, Markdown ou extrait contrôlé",
    },
    {
      id: "backup-restore-test",
      title: "Preuve de test de restauration",
      category: "backup",
      description: "Preuve datée qu'une restauration a été testée avec succès.",
      sensitivity: "confidential",
      strength: "strong",
      recommendedFormat: "Rapport de test, ticket, journal ou compte rendu",
    },
  ],
  "incident-response": [
    {
      id: "incident-response-plan",
      title: "Procédure de réponse à incident",
      category: "incident-response",
      description: "Procédure de détection, qualification, escalade et notification d'incident.",
      sensitivity: "internal",
      strength: "medium",
      recommendedFormat: "PDF, Markdown ou lien interne",
    },
    {
      id: "incident-register",
      title: "Registre des incidents",
      category: "incident-response",
      description: "Registre ou journal des incidents de sécurité et de leur traitement.",
      sensitivity: "confidential",
      strength: "strong",
      recommendedFormat: "CSV expurgé, rapport ou extrait anonymisé",
    },
  ],
  "business-continuity": [
    {
      id: "bcp-plan",
      title: "PRA / PCA",
      category: "business-continuity",
      description: "Plan de continuité ou de reprise d'activité.",
      sensitivity: "confidential",
      strength: "medium",
      recommendedFormat: "PDF, extrait contrôlé ou mémo de synthèse",
    },
  ],
  "supplier-security": [
    {
      id: "supplier-policy",
      title: "Politique de sécurité fournisseurs",
      category: "supplier-security",
      description: "Règles de sélection, suivi et revue des fournisseurs critiques.",
      sensitivity: "internal",
      strength: "medium",
      recommendedFormat: "PDF, Markdown ou extrait contrôlé",
    },
    {
      id: "supplier-register",
      title: "Registre des fournisseurs critiques",
      category: "supplier-security",
      description: "Liste qualifiée des fournisseurs critiques avec propriétaires et risques.",
      sensitivity: "confidential",
      strength: "strong",
      recommendedFormat: "CSV expurgé ou extrait anonymisé",
    },
  ],
  governance: [
    {
      id: "security-policy",
      title: "Politique de sécurité du système d'information",
      category: "governance",
      description: "Document de gouvernance décrivant les règles de sécurité applicables.",
      sensitivity: "internal",
      strength: "medium",
      recommendedFormat: "PDF, Markdown ou page interne",
    },
    {
      id: "risk-register",
      title: "Registre des risques cyber",
      category: "governance",
      description: "Registre des risques identifiés, propriétaires, statuts et plans d'action.",
      sensitivity: "confidential",
      strength: "strong",
      recommendedFormat: "CSV expurgé, tableur ou extrait contrôlé",
    },
  ],
  "logging-monitoring": [
    {
      id: "logging-policy",
      title: "Politique de journalisation",
      category: "logging-monitoring",
      description: "Règles de collecte, conservation et revue des journaux.",
      sensitivity: "internal",
      strength: "medium",
      recommendedFormat: "PDF, Markdown ou extrait contrôlé",
    },
    {
      id: "monitoring-evidence",
      title: "Preuve de supervision sécurité",
      category: "logging-monitoring",
      description: "Capture ou rapport montrant la supervision active des événements de sécurité.",
      sensitivity: "confidential",
      strength: "strong",
      recommendedFormat: "Capture expurgée, rapport SIEM ou ticket",
    },
  ],
  "vulnerability-management": [
    {
      id: "patch-policy",
      title: "Procédure de gestion des correctifs",
      category: "vulnerability-management",
      description: "Procédure décrivant la priorisation et le traitement des vulnérabilités.",
      sensitivity: "internal",
      strength: "medium",
      recommendedFormat: "PDF, Markdown ou extrait contrôlé",
    },
    {
      id: "scan-report",
      title: "Rapport de scan ou suivi de vulnérabilités",
      category: "vulnerability-management",
      description: "Preuve de scan, suivi CVE ou backlog de remédiation.",
      sensitivity: "confidential",
      strength: "strong",
      recommendedFormat: "Rapport expurgé, ticketing ou synthèse",
    },
  ],
  "data-protection": [
    {
      id: "data-encryption-policy",
      title: "Politique de chiffrement",
      category: "data-protection",
      description: "Règles de chiffrement des données sensibles au repos et en transit.",
      sensitivity: "internal",
      strength: "medium",
      recommendedFormat: "PDF, Markdown ou extrait contrôlé",
    },
  ],
  unknown: [
    {
      id: "generic-evidence",
      title: "Preuve documentaire à qualifier",
      category: "unknown",
      description: "Élément de preuve à rattacher manuellement à une exigence.",
      sensitivity: "internal",
      strength: "weak",
      recommendedFormat: "Document, capture, ticket, registre ou mémo",
    },
  ],
};

export function detectCategory(text: string): ProofCategory {
  const lowered = text.toLowerCase();

  const match = categoryRules.find((rule) =>
    rule.keywords.some((keyword) => matchesKeyword(lowered, keyword))
  );

  return match?.category ?? "unknown";
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesKeyword(text: string, keyword: string): boolean {
  const normalizedKeyword = keyword.toLowerCase();
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(normalizedKeyword)}(?![\\p{L}\\p{N}])`, "u");

  return pattern.test(text);
}

function matchesAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => matchesKeyword(text, keyword));
}

export function detectCriticality(text: string, category: ProofCategory) {
  const lowered = text.toLowerCase();

  if (matchesAnyKeyword(lowered, ["admin", "administrateur", "mfa", "2fa", "incident majeur", "restauration", "pra"])) {
    return "critical" as const;
  }

  if (
    category === "access-control" ||
    category === "backup" ||
    category === "incident-response" ||
    category === "business-continuity"
  ) {
    return "high" as const;
  }

  if (
    category === "supplier-security" ||
    category === "vulnerability-management" ||
    category === "logging-monitoring" ||
    category === "data-protection"
  ) {
    return "medium" as const;
  }

  return "low" as const;
}

export function getMappedRequirements(category: ProofCategory): string[] {
  const map: Record<ProofCategory, string[]> = {
    "access-control": ["recyf.access-control", "nis2.risk-management.access-control"],
    backup: ["recyf.backup", "nis2.risk-management.business-continuity"],
    "incident-response": ["recyf.incident-response", "nis2.incident-handling"],
    "business-continuity": ["recyf.business-continuity", "nis2.risk-management.continuity"],
    "supplier-security": ["recyf.supplier-security", "nis2.supply-chain-security"],
    governance: ["recyf.governance", "nis2.governance"],
    "logging-monitoring": ["recyf.logging-monitoring", "nis2.detection"],
    "vulnerability-management": ["recyf.vulnerability-management", "nis2.risk-management.vulnerability"],
    "data-protection": ["recyf.data-protection", "nis2.risk-management.encryption"],
    unknown: ["custom.unmapped"],
  };

  return map[category];
}

export function getEvidenceTemplates(category: ProofCategory): EvidenceTemplate[] {
  return evidenceTemplatesByCategory[category];
}
