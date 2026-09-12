# Publier une analyse cyber

La rubrique publique vit sous `/analyses`. Les textes sont des fichiers Markdown validés au build dans `apps/web/src/content/analyses`.

## Circuit de publication

1. Créer un fichier dont le nom décrit le sujet, en minuscules et avec des tirets.
2. Commencer avec `draft: true`.
3. Renseigner au moins deux sources vérifiées dans la tâche de rédaction en cours.
4. Distinguer dans le texte les faits, les hypothèses, les inconnues et les éléments qui permettraient de conclure.
5. Ajouter entre une et trois infographies SVG inline avec un titre, une description accessible et une légende.
6. Vérifier chaque lien, date, chiffre, unité et périmètre directement dans la source citée.
7. Exécuter le contrôle éditorial et le build.
8. Passer `draft` à `false` seulement après la relecture finale.

## Métadonnées requises

```yaml
---
title: "Titre précis de l’analyse"
description: "Résumé autonome entre 70 et 170 caractères."
publishedAt: 2026-07-19
updatedAt: 2026-07-19
category: "Fuites de données"
format: "Analyse"
confidence: "Confiance élevée"
author: "Rédaction BLACKPROOF"
tags:
  - donnée compromise
readingMinutes: 8
featured: false
draft: true
sources:
  - title: "Titre exact de la source"
    publisher: "Organisme ou rédaction"
    url: "https://source.example/document"
    kind: "Source primaire"
    publicationDate: 2026-07-18
    consultedAt: 2026-07-19
---
```

Catégories autorisées : `Fuites de données`, `Intrusions`, `Rançongiciels`, `Vulnérabilités`, `Chaîne d’approvisionnement`, `Réglementation`, `Méthode`.

Formats autorisés : `Analyse`, `Décryptage`, `Méthode`.

Niveaux autorisés : `Établi`, `Confiance élevée`, `Confiance moyenne`, `Incertitude forte`.

Types de source autorisés : `Source primaire`, `Source institutionnelle`, `Recherche`, `Presse de référence`.

## Citations et sources

Le registre de sources affiché en fin d’article ne remplace pas les liens placés près des affirmations qu’ils étayent. Un article de presse qui reprend une communication ne devient pas une seconde confirmation indépendante. Une source inaccessible, ambiguë ou non vérifiée dans la tâche en cours ne doit pas soutenir une affirmation publique.

Pour une actualité, rechercher d’abord la communication de l’organisation concernée, les autorités compétentes, les avis CERT, les documents judiciaires et les dépôts réglementaires. La presse de référence sert à compléter et à contextualiser.

## Contrôles locaux

Avec Node 22.23.2 et pnpm 10.34.5 :

```sh
pnpm --filter @blackproof/web check
pnpm build
pnpm exec playwright test tests/e2e/editorial.spec.ts tests/e2e/accessibility.spec.ts tests/e2e/visual-system.spec.ts --workers=1
```

Les assertions éditoriales vérifient qu’un brouillon ne produit ni route, ni entrée RSS, ni entrée dans le sitemap.
