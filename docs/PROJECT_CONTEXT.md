# BLACKPROOF — Project Context

## Identité projet

Nom :
BLACKPROOF

Domaine :
BLACKPROOF.FR

Repo GitHub public, sous AGPL-3.0-only :
https://github.com/l0gfr/BLACKPROOF-AGPL

Clone local :
BLACKPROOF-AGPL/

Serveur cible :
Serveur web Debian

## Nature du produit

BLACKPROOF n'est pas un simple site web.

BLACKPROOF est une app produit composée de :

- un site public ;
- une application local-first ;
- un moteur ProofGraph ;
- une bibliothèque de preuves ;
- un indicateur ProofDebt ;
- un générateur ProofPack ;
- une page de vérification Verify.

## Promesse centrale

BlackProof transforme vos réponses cyber en registre de préparation et de défendabilité structuré, exportable et contrôlable par empreinte — sans uploader vos secrets.

## Positionnement

Ne pas présenter BLACKPROOF comme :

- un outil de conformité NIS2 généraliste ;
- une certification ;
- un audit officiel ;
- une checklist ReCyF ;
- un outil GRC classique ;
- un produit blockchain compliance.

Présenter BLACKPROOF comme un logiciel libre sous AGPL-3.0-only, sans compte :

Cyber evidence pack for suppliers under regulatory and commercial pressure.

En français :

Registre de préparation et de défendabilité d’une réponse cyber pour les fournisseurs soumis à pression réglementaire et commerciale.

## Flux V1

Questionnaire fournisseur
→ mapping NIS2 / ReCyF
→ preuves attendues
→ dette de preuve
→ ProofPack Master interne → ProofPack Delivery externe revu

## Modules clés

- Questionnaire Crusher
- ProofGraph
- Evidence Library
- ProofDebt indicator
- ProofPack
- ProofSeal
- Verify
- Public API

## Stack implémentée

Frontend public :
Astro + TypeScript + Markdown

App :
Astro /app + Svelte + TypeScript

Stockage local :
IndexedDB + Dexie

Validation :
Ajv et schémas JSON générés

Exports :
JSON, Markdown, CSV, HTML

Déploiement :
GitHub public → artefact GitHub Actions vérifié → Debian → Apache

Principe sécurité :
No document upload.
Traitement local dans le navigateur.
Aucune preuve sensible envoyée côté serveur.

## API publique V0

BLACKPROOF expose une API publique read-only pour les contrats de méthode, de preuve et de vérification.

Endpoints V0 :

- GET /api
- GET /api/index.json
- GET /api/methodology.json
- GET /api/evidence-library.json
- GET /api/frameworks.json
- GET /api/proofdebt.json
- GET /api/proofpack/schema.json
- GET /api/verify.json

Principe :

- ouverte pour les contrats ;
- local-first pour les secrets ;
- aucun document sensible accepté côté serveur ;
- pas de promesse de certification ou de conformité réglementaire.

## Architecture cible

blackproof.fr
├── /
├── /product
├── /questionnaire-fournisseur
├── /proofpack
├── /proofgraph
├── /proofdebt
├── /evidence-library
├── /method
├── /api
├── /security
├── /verify
├── /open-source
├── /resources
├── /legal
└── /app

## Boussole produit

Répondre.
Qualifier.
Exporter.
Vérifier.

Ne jamais promettre :
"vous êtes conforme".

Dire plutôt :
"voici où votre registre de préparation est solide, faible, incomplet ou non défendable."

## Development invariant

Every BLACKPROOF code change, especially in the core engine, must pass:

- pnpm check
- pnpm test
- pnpm build
- pnpm audit --prod

before commit.

pnpm check is mandatory. No engine commit should be accepted if TypeScript strict checks fail.
