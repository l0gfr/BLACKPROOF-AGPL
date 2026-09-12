import type { APIRoute } from "astro";

export const GET: APIRoute = () => (
  new Response(`# BLACKPROOF

BLACKPROOF prépare des revues cyber, audits internes et questionnaires fournisseurs dans un dossier local structuré, exportable et contrôlable par empreinte, sans upload de documents. Logiciel libre sous AGPL-3.0-only, sans compte.

## Positionnement

- Préparation documentaire pour les équipes sécurité, l'audit interne et les réponses fournisseurs.
- Traitement local : le traitement des preuves sensibles reste côté navigateur.
- Pas de tracker, pas de Google Fonts, pas de CDN.
- Pas de promesse de conformité automatique, de certification ou d'audit officiel.

## Pages humaines

- Accueil : https://blackproof.fr/
- Parcours guidé : https://blackproof.fr/start
- Ressources : https://blackproof.fr/resources
- Documentation API : https://blackproof.fr/api
- Documentation du serveur MCP local : https://blackproof.fr/mcp
- Analyses cyber : https://blackproof.fr/analyses
- Flux RSS des analyses : https://blackproof.fr/analyses/feed.xml
- Doctrine : https://blackproof.fr/about
- Cas d'usage : https://blackproof.fr/use-cases
- Page catégorie anti-GRC : https://blackproof.fr/grc
- Démo guidée : https://blackproof.fr/demo
- Statut public : https://blackproof.fr/status
- Logiciel libre : https://blackproof.fr/open-source
- Exemple ProofPack : https://blackproof.fr/proofpack-example
- Vérifier un Master ou une Delivery : https://blackproof.fr/verify
- Sécurité : https://blackproof.fr/security
- RGPD : https://blackproof.fr/rgpd

## Contrats publics

- API : https://blackproof.fr/api
- Catalogue JSON : https://blackproof.fr/api/index.json
- Statut JSON : https://blackproof.fr/api/status.json
- Méthodologie JSON : https://blackproof.fr/api/methodology.json
- Bibliothèque de preuves JSON : https://blackproof.fr/api/evidence-library.json
- Référentiels JSON : https://blackproof.fr/api/frameworks.json
- Schéma ProofPack : https://blackproof.fr/api/proofpack/schema.json
- Vérification : https://blackproof.fr/api/verify.json
- Schéma ProofPack Delivery V4 historique : https://blackproof.fr/schemas/proofpack-delivery/v4.schema.json
- Schéma ProofPack Delivery V5 courant : https://blackproof.fr/schemas/proofpack-delivery/v5.schema.json
- Schémas protocole Delivery bilatéral : https://blackproof.fr/schemas/delivery-protocol/change-report-v1.schema.json ; https://blackproof.fr/schemas/delivery-protocol/signature-v1.schema.json ; https://blackproof.fr/schemas/delivery-protocol/revocation-v1.schema.json ; https://blackproof.fr/schemas/delivery-protocol/status-v1.schema.json
- Vérificateur CLI/SDK autonome AGPL-3.0-only : packages/verifier dans le code source public https://github.com/l0gfr/BLACKPROOF-AGPL

## Artefacts de démonstration fictifs et publics

- Questionnaire démo : https://blackproof.fr/demo/supplier-questionnaire-demo.csv
- ProofPack JSON avec empreinte SHA-256 : https://blackproof.fr/demo/proofpack-demo.json
- Réponse fournisseur : https://blackproof.fr/demo/reponse-fournisseur-demo.md
- Registre de preuves : https://blackproof.fr/demo/registre-preuves-demo.csv
- Plan ProofDebt : https://blackproof.fr/demo/plan-remediation-demo.csv
- Note de synthèse : https://blackproof.fr/demo/note-synthese-demo.md
- Manifeste du pack : https://blackproof.fr/demo/proofpack-bundle-manifest.json
- ProofPack Delivery JSON : https://blackproof.fr/demo/proofpack-delivery-demo.json
- ProofPack Delivery ZIP : https://blackproof.fr/demo/proofpack-delivery-demo.zip

## Limites

Ne pas décrire BLACKPROOF comme une certification, une garantie de conformité ou un outil de collecte serveur de preuves sensibles.
Les fichiers des utilisateurs ne sont pas publiés par BLACKPROOF. Les URL ci-dessus désignent uniquement des exemples fictifs ou des contrats techniques publics.
Le serveur MCP alpha est fourni dans packages/mcp et fonctionne localement en stdio, en lecture seule. Aucun endpoint MCP public n’est exposé. Les fichiers privés sont sélectionnés explicitement au démarrage ; l’hôte et le modèle doivent rester locaux. Les outils ne renvoient que des contrôles et compteurs, jamais les réponses ni les justificatifs.
`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  })
);
