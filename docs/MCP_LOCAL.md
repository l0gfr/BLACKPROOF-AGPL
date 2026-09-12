# MCP local : à quoi sert-il en entreprise ?

BLACKPROOF aide un agent local à contrôler une sortie avant transmission et à
préparer une revue humaine, sans lui livrer les réponses ni les justificatifs.
Le serveur est un composant alpha, pas un service distant ni un auditeur autonome.

## Trois usages immédiats

| Besoin | Outil | Résultat utile |
| --- | --- | --- |
| Préparer une revue cyber, un audit interne ou un questionnaire fournisseur | `blackproof_review_checklist` | Étapes publiques de préparation, à adapter au périmètre de l'entreprise |
| Vérifier un export avant de le transmettre par un canal approuvé | `blackproof_verify_selected` | Schéma, empreinte, liens, invariants ; manifeste et fichiers annexes pour un ZIP ; compteurs de questions, références et réserves si valide |
| Repérer les évolutions entre deux revues | `blackproof_compare_selected` | Nombres de questions ajoutées, retirées, modifiées et inchangées, sans leur contenu |

`blackproof_methodology` explique les contrôles et leurs limites. Les outils
n'acceptent aucun argument : `arguments: {}`. Aucun chemin, URL, contenu de
questionnaire ou secret ne peut être fourni par un appel d'outil.

Un résultat invalide bloque la conclusion « intégrité vérifiée ». Il ne faut pas
transmettre automatiquement : ouvrir le vérificateur local pour examiner le
détail, corriger dans l'application, puis relancer une session avec le nouvel export.
Une réserve est un point à relire, pas une vulnérabilité confirmée. Une empreinte
correcte ne prouve ni la véracité, ni la conformité, ni l'identité de l'émetteur.

## Installation

Prérequis : Linux ou macOS, compte utilisateur non root, Node.js 22.23.2 et
pnpm 10.34.5. Windows est refusé tant qu'un contrôle d'accès natif équivalent
n'a pas été implémenté. Utiliser une révision relue du dépôt et son lockfile.

```sh
pnpm install --frozen-lockfile
pnpm --filter @blackproof/mcp check
pnpm --filter @blackproof/mcp test
```

Le programme est `packages/mcp/bin/blackproof-mcp.mjs`. Le client MCP doit
exécuter Node avec ce fichier, par chemins absolus. Aucun démon, port HTTP,
clé API, compte BLACKPROOF ou service à installer sur le serveur du site.
Ne pas configurer de proxy MCP distant ni de client partagé.

### Mode public, sans fichier

Configuration indicative pour un hôte acceptant la convention `mcpServers`.
Remplacer les chemins par ceux de l'installation locale et suivre la documentation
de l'hôte pour l'emplacement de sa configuration.

```json
{
  "mcpServers": {
    "blackproof-local": {
      "command": "/chemin/vers/node",
      "args": ["/chemin/vers/BLACKPROOF-AGPL/packages/mcp/bin/blackproof-mcp.mjs"]
    }
  }
}
```

Seuls la méthode et les checklists publiques sont disponibles. Le démarrage
n'ouvre aucun dossier utilisateur et ne consulte pas le stockage du navigateur.

### Mode privé, sélection explicite

Avant toute utilisation réelle, l'entreprise doit vérifier que son hôte et son
modèle fonctionnent localement : réseau sortant bloqué, absence de synchronisation,
journalisation des outils désactivée et accès réservé au producteur des preuves.
Le drapeau `--local-only` est une confirmation d'usage, **pas un bac à sable**.
Le serveur ne peut pas attester où un hôte exécutera ensuite son modèle.

Placer uniquement les exports choisis dans un répertoire privé non partagé,
hors dossier synchronisé. Le répertoire immédiat doit appartenir à l'utilisateur
et être accessible à lui seul (`0700`) ; les fichiers, également possédés par lui,
doivent être privés (`0600`). Vérifier aussi les ACL, les sauvegardes et le chiffrement
du disque. Le programme ne change jamais ces permissions à votre place.
Les chemins doivent être absolus, canoniques et sans lien symbolique.

Ajouter aux arguments du client, après le chemin du programme :

```json
["--local-only", "--current", "/repertoire-prive/revue-actuelle.zip"]
```

Pour comparer, ajouter `"--previous", "/repertoire-prive/revue-precedente.zip"`.
Les deux exports doivent partager le même identifiant de dossier, titre et
référentiel, avec des questions non ambiguës.
Les formats acceptés sont Delivery JSON V4/V5 et ZIP Delivery ; ni dossier maître,
ni archive de sauvegarde chiffrée, ni document PDF ou bureautique.

Les fichiers sont lus une seule fois au démarrage. Les contrôles sont calculés,
puis seuls leurs résultats minimisés sont conservés pour les appels. Un changement
du fichier sur disque ne change pas la session : il faut la relancer explicitement.
La session se ferme après quinze minutes ou mille messages. Aucun accès implicite
à un nouveau fichier et aucun outil de création, export, suppression ou signature.

## Essai reproductible sur données fictives

Depuis la racine du dépôt :

```sh
pnpm --filter @blackproof/mcp test
```

Le test lance réellement le serveur et un client MCP officiel en stdio. Il copie
un questionnaire/export fictif dans un répertoire temporaire privé, contrôle le
résultat, compare deux versions et vérifie qu'une chaîne témoin placée dans les
réponses n'apparaît jamais dans les résultats ni les logs. Les fichiers de test
sont retirés à la fin. Aucun service distant et aucun appel à un modèle IA.

Dans votre agent local, demander par exemple : « Explique les contrôles de
BLACKPROOF, puis vérifie l'export que j'ai sélectionné. Signale les réserves à
relire sans tenter d'accéder aux réponses. » L'agent appelle la méthode puis
`blackproof_verify_selected` avec `{}`. Il peut résumer le verdict et les
compteurs, mais doit renvoyer l'utilisateur à l'application pour relire les preuves.

Pour le suivi : « Compare les deux versions sélectionnées et indique s'il faut
une nouvelle revue humaine. » Les questions dont le texte change peuvent apparaître
comme retirées puis ajoutées ; la comparaison n'est pas une analyse sémantique IA.

## Confidentialité et limites vérifiables

- Aucun endpoint MCP public, téléversement, appel réseau, télémétrie, ressource
  partagée, listing de dossiers ou lecture automatique d'IndexedDB.
- Sorties construites par liste blanche : jamais de titre de dossier, identifiant,
  empreinte, réponse, référence de preuve, chemin ou détail brut du vérificateur.
- Erreurs du protocole et du parseur expurgées. Les outils sont réellement sans
  écriture ; les annotations `readOnlyHint` ne sont pas le contrôle d'accès.
- Lectures bornées : JSON de 2 Mo, ZIP de 10 Mo, contrôles d'expansion du
  vérificateur ; messages stdio de 64 Kio. Liens symboliques et liens physiques refusés.
- Le propriétaire POSIX n'est pas une preuve d'identité du producteur original.
  Root, les ACL, un hôte compromis ou un processus malveillant du même compte ne
  sont pas isolés par ces vérifications. Prévoir un compte et une session dédiés.
- Les compteurs eux-mêmes peuvent être sensibles. Un hôte qui les transmet à
  un modèle distant rompt la frontière strictement locale, même si le MCP est local.
- Les exports Delivery sont en clair. Le chiffrement des dossiers du navigateur
  ne les protège pas. Les chaînes JS ne peuvent pas être effacées de la mémoire
  avec une garantie cryptographique ; fermeture du processus ne signifie pas
  effacement sécurisé du swap ou des sauvegardes système.

La revue de code et les tests ne constituent ni une certification de sécurité
ni une garantie contre un poste compromis. Signaler les failles selon `SECURITY.md`.
