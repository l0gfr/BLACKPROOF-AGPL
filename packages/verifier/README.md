# @blackproof/verifier

Vérificateur Node.js autonome sous AGPL-3.0-only pour les artefacts BLACKPROOF Delivery. Il travaille exclusivement sur des fichiers locaux, sans compte ni appel réseau. Le texte complet de la licence est disponible à la racine du dépôt.

```sh
node bin/blackproof-verify.mjs verify delivery.json
node bin/blackproof-verify.mjs verify delivery.zip
node bin/blackproof-verify.mjs compare delivery-precedent.json delivery-courant.json --json
node bin/blackproof-verify.mjs verify-signature delivery.json delivery-signature.json
node bin/blackproof-verify.mjs verify-revocation delivery.json delivery-revocation.json
```

SDK :

```js
import { loadDeliveryFile, verifyDelivery, compareDeliveries } from "@blackproof/verifier";

const previous = await loadDeliveryFile("delivery-v1.zip");
const current = await loadDeliveryFile("delivery-v2.json");
console.log(verifyDelivery(current));
console.log(compareDeliveries(previous, current));
```

Le SDK vérifie les contrats publics Delivery v4/v5, l’empreinte canonique, les identifiants et invariants, le ZIP Delivery v1, ses sidecars canoniques, les rapports de changements v1, les signatures détachées ECDSA P-256 et la cohérence des déclarations de révocation v1. Une déclaration de révocation hors ligne auto-empreinte n’authentifie pas son auteur et ne prouve pas le statut courant : le CLI la qualifie explicitement de non authentifiée, et aucun registre distant n’est interrogé. Confirmez le statut courant auprès de l’émetteur par un canal de confiance. Le vérificateur ne prouve ni la véracité des déclarations ni l’identité civile derrière une clé auto-déclarée.
