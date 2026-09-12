---
title: "Brouillon permanent pour vérifier le circuit éditorial"
description: "Ce contenu technique reste volontairement hors des routes publiques et vérifie que le statut draft bloque index, page, flux RSS et sitemap."
publishedAt: 2026-07-19
category: "Méthode"
format: "Méthode"
confidence: "Incertitude forte"
author: "Rédaction BLACKPROOF"
tags:
  - test éditorial
readingMinutes: 1
featured: false
draft: true
sources:
  - title: "Violations de données personnelles : les règles à suivre"
    publisher: "CNIL"
    url: "https://www.cnil.fr/fr/violations-de-donnees-personnelles-les-regles-suivre"
    kind: "Source institutionnelle"
    consultedAt: 2026-07-19
  - title: "Incident Response Recommendations and Considerations for Cybersecurity Risk Management"
    publisher: "NIST"
    url: "https://csrc.nist.gov/pubs/sp/800/61/r3/final"
    kind: "Source institutionnelle"
    publicationDate: 2025-04-03
    consultedAt: 2026-07-19
---

Ce brouillon permanent sert de garde-fou automatisé. Il ne doit apparaître sur aucune surface publique.

Pour conserver le chemin de publication éditoriale, une nouvelle analyse ne
modifie que son fichier Markdown dans cette collection. Les contrôles découvrent
automatiquement les publications et les brouillons : aucun test TypeScript ne
doit être ajouté pour enregistrer un nouveau slug.

Les figures utilisent les classes CSS de la page, sans attribut `style`. Chaque
figure contient une variante desktop et une variante mobile, toutes deux munies
d’un titre et d’une description accessibles.
