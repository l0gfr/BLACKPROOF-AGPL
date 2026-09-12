# Documentation API

L’API publique donne accès aux formats de dossiers, aux règles de vérification
et à la méthode de BLACKPROOF. Un script peut ainsi connaître la structure d’un
export ou les contrôles attendus, sans transmettre de document au site.

Elle est **publique, statique et en lecture seule**, sans compte ni clé API.
Son adresse de base est `https://blackproof.fr`. La version actuelle est
`blackproof-public-api-v0.1.0-alpha`.

## Faire une première requête

Depuis un terminal, lire le catalogue des ressources disponibles :

```sh
curl --fail --silent --show-error https://blackproof.fr/api/index.json
```

Puis lire la version publiée et les limites du produit :

```sh
curl --fail --silent --show-error https://blackproof.fr/api/status.json
```

Ces requêtes utilisent `GET`, sans corps de requête ni authentification.
Les réponses sont des fichiers JSON. Le catalogue contient notamment `endpoints`,
`humanPages` et `publicArtifacts` : les routes, les pages de documentation et les
exemples fictifs disponibles. Il constitue la liste complète des ressources.

Les contrats de l’API indiquent leur `apiVersion` et leur `resource`. Les schémas
JSON possèdent leur propre format et leur propre version : ne pas leur imposer
la structure d’une réponse du catalogue.

## Choisir la bonne ressource

| Besoin | Ressource publique |
| --- | --- |
| Découvrir toutes les routes | [Catalogue API](https://blackproof.fr/api/index.json) |
| Connaître la version publiée et les limites | [Statut public](https://blackproof.fr/api/status.json) |
| Comprendre la méthode et les contrôles | [Méthodologie](https://blackproof.fr/api/methodology.json) |
| Connaître les catégories de justificatifs attendus | [Bibliothèque de preuves](https://blackproof.fr/api/evidence-library.json) |
| Lire les référentiels et leurs exigences | [Référentiels](https://blackproof.fr/api/frameworks.json) |
| Comprendre l’indicateur de préparation | [ProofDebt](https://blackproof.fr/api/proofdebt.json) |
| Connaître les formats et limites de l’import local | [Contrat d’import](https://blackproof.fr/api/questionnaire-import.json) |
| Connaître les contrôles d’un dossier | [Contrat de vérification](https://blackproof.fr/api/verify.json) |

**Le contrat de vérification décrit les contrôles. Il ne vérifie pas un fichier
sur le serveur.** Pour examiner un export, utiliser le
[vérificateur dans le navigateur](https://blackproof.fr/verify) ou le
[serveur MCP local](https://blackproof.fr/mcp).

## Choisir le schéma correspondant à son export

Le dossier maître conserve les informations de travail. La version client,
appelée Delivery, contient les informations sélectionnées pour transmission.
Leurs schémas ne sont pas interchangeables.

- Dossier maître : [point de découverte](https://blackproof.fr/api/proofpack/schema.json),
  [V1 historique](https://blackproof.fr/schemas/proofpack/v1.schema.json),
  [V2 historique](https://blackproof.fr/schemas/proofpack/v2.schema.json) et
  [V3 courante](https://blackproof.fr/schemas/proofpack/v3.schema.json).
- Version client : [Delivery V4 historique](https://blackproof.fr/schemas/proofpack-delivery/v4.schema.json)
  et [Delivery V5 courante](https://blackproof.fr/schemas/proofpack-delivery/v5.schema.json).
- Import XLSX : [schéma de provenance de l’import](https://blackproof.fr/schemas/source-import/v1.schema.json).
- Suivi d’une version client : [rapport de changements](https://blackproof.fr/schemas/delivery-protocol/change-report-v1.schema.json),
  [signature](https://blackproof.fr/schemas/delivery-protocol/signature-v1.schema.json)
  et [déclaration de révocation](https://blackproof.fr/schemas/delivery-protocol/revocation-v1.schema.json).
- Contrôle des empreintes : [exemples de calcul de référence](https://blackproof.fr/canonicalization-vectors.json).

Les adresses versionnées des schémas sont immuables. Utiliser celle qui correspond
au format du fichier reçu et vérifier les erreurs de lecture avant de conclure.
Le contrat API reste en alpha ; une intégration doit vérifier la version annoncée.
Le schéma historique de statut reste publié pour compatibilité, mais le registre
public a été retiré : aucun statut courant de dossier n’est disponible en ligne.

## Essayer avec des données fictives

- [Exemple de dossier expliqué](https://blackproof.fr/proofpack-example)
- [Export client JSON](https://blackproof.fr/demo/proofpack-delivery-demo.json)
- [Archive client ZIP](https://blackproof.fr/demo/proofpack-delivery-demo.zip)
- [Questionnaire CSV](https://blackproof.fr/demo/supplier-questionnaire-demo.csv)

Ces fichiers sont publics et fictifs. Ils permettent d’essayer les formats sans
utiliser les dossiers de votre organisation.

## Données et limites

L’API ne reçoit ni questionnaire, ni justificatif, ni dossier privé. Elle ne propose
aucune route d’envoi de documents, de création de dossier ou d’exécution distante
d’un audit. Les ressources publiques peuvent être mises en cache ; les dossiers
restent traités sur l’appareil de leur utilisateur.

Une structure valide et une empreinte correcte ne prouvent ni la véracité des
réponses, ni l’identité de l’émetteur, ni la conformité. Une relecture humaine
reste nécessaire avant toute transmission.

Le MCP est une intégration distincte, exécutée sur votre poste. Sa
[documentation dédiée](https://blackproof.fr/mcp) décrit l’installation, les outils
et les conditions de confidentialité.
