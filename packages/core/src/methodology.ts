export const BLACKPROOF_METHOD_VERSION = "blackproof-method-v0.1.0-alpha";

export const proofGraphSteps = [
  {
    id: "source",
    label: "Source",
    definition: "Point d'entrée de la demande : questionnaire client, clause contractuelle, exigence NIS2/ReCyF, audit, politique interne ou demande de direction.",
    output: "Une demande traçable, datée et rattachée à un contexte."
  },
  {
    id: "requirement",
    label: "Exigence",
    definition: "Traduction de la source en exigence de sécurité compréhensible : contrôle attendu, objectif de sécurité, mesure, clause ou risque couvert.",
    output: "Une exigence catégorisée et mappable."
  },
  {
    id: "evidence",
    label: "Preuve",
    definition: "Fiche de préparation décrivant l'élément attendu ou déclaré : procédure, politique, capture expurgée, journal, rapport, ticket, attestation, registre ou test.",
    output: "Une preuve attendue, déclarée disponible, manquante, périmée, déclarative ou non exportable."
  },
  {
    id: "test",
    label: "Test",
    definition: "Indice permettant d'évaluer si la preuve tient réellement : fraîcheur, périmètre, force probante, cohérence, sensibilité et réutilisabilité.",
    output: "Un niveau de couverture heuristique et une limite explicite."
  },
  {
    id: "debt",
    label: "Dette",
    definition: "Écart entre la réponse déclarée et le niveau de preuve attendu. La dette peut être critique, haute, moyenne ou faible.",
    output: "Une dette de preuve priorisée."
  },
  {
    id: "action",
    label: "Action",
    definition: "Correction concrète : ajouter une preuve, produire un extrait contrôlé, documenter une réserve, exclure un périmètre ou planifier une remédiation.",
    output: "Un backlog de remédiation utilisable."
  }
] as const;

export const evidenceStatusDefinitions = [
  {
    status: "expected",
    label: "Attendue",
    meaning: "La preuve est attendue mais n'a pas encore été fournie.",
    proofDebtImpact: "Crée une dette de preuve."
  },
  {
    status: "available",
    label: "Déclarée disponible",
    meaning: "L'utilisateur déclare que la preuve existe et peut être référencée ou exportée selon sa sensibilité. BLACKPROOF ne vérifie pas encore le fichier source.",
    proofDebtImpact: "Réduit ou supprime la dette associée."
  },
  {
    status: "missing",
    label: "Manquante",
    meaning: "La preuve attendue n'existe pas ou n'a pas été retrouvée.",
    proofDebtImpact: "Maintient une dette de preuve."
  },
  {
    status: "expired",
    label: "Périmée",
    meaning: "La preuve existe mais sa fraîcheur ou sa validité est insuffisante.",
    proofDebtImpact: "Crée une dette élevée."
  },
  {
    status: "declared",
    label: "Déclarative",
    meaning: "La réponse repose sur une déclaration sans preuve vérifiable suffisante.",
    proofDebtImpact: "Crée une dette moyenne."
  },
  {
    status: "not-exportable",
    label: "Non exportable",
    meaning: "La preuve existe mais ne peut pas être exportée telle quelle car elle est sensible.",
    proofDebtImpact: "Crée une dette résiduelle et appelle un extrait contrôlé ou une attestation."
  }
] as const;

export const proofDebtScoreBands = [
  {
    min: 0,
    max: 20,
    label: "Reprise indispensable",
    meaning: "Selon les réponses et statuts saisis, le dossier comporte des lacunes majeures à traiter avant toute décision humaine de transmission."
  },
  {
    min: 21,
    max: 50,
    label: "Préparation très incomplète",
    meaning: "Selon les informations saisies, le dossier reste un support de travail interne et appelle une revue approfondie."
  },
  {
    min: 51,
    max: 70,
    label: "Préparation partielle",
    meaning: "Les statuts saisis font apparaître des éléments utiles et plusieurs points encore incomplets ou fragiles."
  },
  {
    min: 71,
    max: 85,
    label: "Préparation avancée avec réserves",
    meaning: "Les réponses et références déclarées sont largement préparées, avec des limites qui restent à relire et documenter."
  },
  {
    min: 86,
    max: 100,
    label: "Registre bien structuré",
    meaning: "Les informations saisies forment un registre cohérent et réutilisable. Ce niveau ne valide ni les preuves sources, ni la vérité des déclarations, ni leur acceptation par un tiers."
  }
] as const;

export const proofPackFiles = [
  {
    filename: "proofpack.json",
    purpose: "Format Master interne contenant le dossier structuré, son résumé, ses preuves, ses dettes et son empreinte."
  },
  {
    filename: "reponse-fournisseur.md",
    purpose: "Vue interne complète des réponses et réserves."
  },
  {
    filename: "registre-preuves.csv",
    purpose: "Registre de préparation des preuves attendues, déclarées disponibles, sensibles, manquantes ou périmées."
  },
  {
    filename: "plan-remediation.csv",
    purpose: "Plan des actions à mener pour réduire la dette de preuve."
  },
  {
    filename: "note-synthese.md",
    purpose: "Synthèse direction issue du ProofPack : score, dette, preuves sensibles, réponses prêtes et actions prioritaires."
  }
] as const;

export const blackproofSecurityInvariants = [
  "Aucun envoi serveur",
  "Traitement local dans le navigateur",
  "Aucune preuve sensible envoyée côté serveur",
  "Entrées bornées au niveau moteur",
  "Exports CSV protégés contre la formula injection",
  "Exports Markdown échappés",
  "Fingerprint ProofPack en SHA-256",
  "Vérification locale du ZIP ProofPack complet et de proofpack.json",
  "Transmission externe construite par liste blanche et confirmation explicite",
  "Absence structurelle des brouillons et éléments non exportables dans ProofPack Delivery",
  "Aucune promesse de certification réglementaire"
] as const;

export const methodology = {
  product: "BLACKPROOF",
  version: BLACKPROOF_METHOD_VERSION,
  promise: "Transformer des réponses cyber en Master interne structuré puis en Delivery externe revu, minimal et contrôlable par empreinte.",
  nonPromise: "BLACKPROOF ne fournit ni certification, ni audit qualifié, ni avis juridique, ni garantie de conformité.",
  proofGraphSteps,
  evidenceStatusDefinitions,
  proofDebtScoreBands,
  proofPackFiles,
  securityInvariants: blackproofSecurityInvariants
} as const;
