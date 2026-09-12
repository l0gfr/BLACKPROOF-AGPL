# Chemin de publication éditoriale

Le chemin rapide ne dépend pas d’une déclaration humaine. Le dépôt calcule le
périmètre exact entre deux commits.

## Périmètre autorisé

Une publication est classée `editorial` uniquement si chaque chemin modifié
correspond directement à :

`apps/web/src/content/analyses/<slug>.md`

Un fichier de code, de test, de dépendance, de workflow, de configuration, un
sous-répertoire ou une plage Git invalide impose le périmètre `full`.

## Contrôles conservés

Le chemin éditorial vérifie :

- le schéma Astro et la construction statique complète ;
- l’absence de scripts, formulaires, gestionnaires d’événements, styles en
  ligne, médias tiers et schémas d’URL actifs dans le Markdown ;
- une à trois figures, chacune avec variantes desktop et mobile accessibles ;
- la présence de chaque publication dans l’index, le RSS et le sitemap, et
  l’absence de chaque brouillon ;
- l’absence de débordement horizontal et de requête tierce dans Chromium ;
- les invariants statiques de sécurité du dépôt.

Il n’est pas nécessaire de modifier un test TypeScript pour publier une nouvelle
analyse. Les contrôles éditoriaux découvrent automatiquement la collection.

## Frontières d’exécution

- Le hook `pre-push` exécute le contrôle éditorial borné seulement lorsque le
  diff poussé est prouvé éditorial. Toute ambiguïté relance le contrôle complet.
- GitHub crée un seul workflow de CI par PR. Un job final stable, `CI gate`,
  exige soit le contrôle éditorial, soit les deux contrôles applicatifs complets.
- Aucun CI redondant n’est créé après la fusion. La branche `main` doit donc
  rester protégée contre les pushes directs et exiger `CI gate`.
- La fabrication de production relit le `releaseCommit` servi par
  `https://blackproof.fr/api/status.json`. Le chemin rapide n’est autorisé que
  si ce commit est un ancêtre du SHA demandé et si tout le diff est éditorial.
  Une réponse absente, invalide ou incohérente impose le contrôle complet.
- Même en mode éditorial, l’artefact final est reconstruit avec la confiance de
  production, contrôlé, inventorié, empaqueté et vérifié avant promotion.

Une modification de cette architecture est elle-même un changement `full`.
