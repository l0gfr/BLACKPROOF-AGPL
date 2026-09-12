export const PUBLIC_STATUS_UPDATED_AT = "2026-09-12";

export const PUBLIC_CHANGELOG = [
  {
    date: "2026-09-12",
    area: "open-source",
    title: "BLACKPROOF devient un logiciel libre",
    change: "Le code est publié sous AGPL-3.0-only. La création, l’import et les exports sont accessibles librement dans le navigateur.",
  },
  {
    date: "2026-07-20",
    area: "product-language",
    title: "Indicateur de préparation clarifié",
    change: "L’indicateur repose uniquement sur les informations saisies. Il ne juge pas les documents sources et ne décide pas si un dossier peut être transmis.",
  },
  {
    date: "2026-07-20",
    area: "verification-language",
    title: "Portée des contrôles clarifiée",
    change: "La vérification distingue désormais la structure, les empreintes, la signature cryptographique, l’identité déclarée et la véracité des informations.",
  },
  {
    date: "2026-07-13",
    area: "delivery-contracts",
    title: "Versions client documentées",
    change: "Les anciennes versions client restent vérifiables et le format actuel possède sa propre adresse publique.",
  },
  {
    date: "2026-07-12",
    area: "xlsx-import",
    title: "Import XLSX sécurisé",
    change: "L’import local conserve une provenance structurée des questions extraites et refuse les formats non pris en charge.",
  },
  {
    date: "2026-07-10",
    area: "public-contracts",
    title: "Contrats et démonstration publics",
    change: "Les schémas, la méthode, les règles de vérification et des livrables fictifs sont consultables sans compte.",
  },
  {
    date: "2026-07-09",
    area: "public-site",
    title: "Ouverture du site",
    change: "La surface publique et l’application locale sont accessibles en HTTPS.",
  },
] as const;

export const PUBLIC_PRODUCT_BOUNDARIES = [
  "Pas de certification automatique.",
  "Pas d’audit officiel.",
  "Pas de validation automatique des documents sources ou de la véracité des déclarations.",
  "Aucun stockage serveur de questionnaires ou de preuves sensibles.",
  "Pas de promesse de conformité réglementaire.",
] as const;
