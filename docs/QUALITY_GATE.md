# Garde-fou qualité local et CI

BLACKPROOF utilise Oxlint et son moteur typé tsgolint comme alternative locale et gratuite à GitHub Code Quality. Les versions sont épinglées dans le lockfile et le même contrôle s’exécute en développement et dans la CI.

Le contrôle couvre les quatre familles de dette observées lors du diagnostic initial :

- code défensif inutile et conditions toujours vraies ou fausses avec `typescript/no-unnecessary-condition` ;
- affectations écrasées ou jamais relues avec `no-useless-assignment` ;
- conditions constantes avec `no-constant-condition` et `no-constant-binary-expression` ;
- variables, imports, fonctions ou classes inutilisés avec `no-unused-vars`.

Les validateurs générés sont exclus du lint. Leur intégrité reste contrôlée par `pnpm schema:check`, qui refuse tout écart entre les schémas sources et les fichiers générés. Les composants Astro et Svelte restent couverts par leurs vérificateurs dédiés, car un linter JavaScript générique ne voit pas de manière fiable les usages dans leurs templates.

Le contrôle syntaxique s’applique à l’ensemble du code maintenu à la main. Le contrôle typé est volontairement limité au cœur TypeScript, avec son propre `tsconfig`, afin d’éviter les inférences trompeuses sur les entrées JavaScript dynamiques et les frontières runtime.

Commande locale :

```sh
pnpm quality:lint
```

`pnpm check` exécute ce garde-fou avant les contrôles de schéma, de licence et de type. Toute nouvelle violation bloque donc la CI.
