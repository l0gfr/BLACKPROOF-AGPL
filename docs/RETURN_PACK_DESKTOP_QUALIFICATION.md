# Qualification bureautique du Return Pack

Décision actuelle : **NO-GO, Return Pack désactivé**.

La qualification porte sur l’octet exact candidat à la publication. Un test unitaire
OOXML ne remplace pas l’ouverture dans les applications bureautiques.

## Candidat et environnement à consigner

- commit et SHA-256 du bundle ;
- SHA-256 de deux générations indépendantes du même Return Pack ;
- version exacte d’Excel Desktop, OS et architecture ;
- version exacte de LibreOffice, OS et architecture ;
- locale, fuseau et paramètres de calcul ;
- identifiant anonymisé du jeu d’essai.

## Matrice obligatoire

| Contrôle | Excel Desktop | LibreOffice | Automatisé OOXML | Critère PASS |
| --- | --- | --- | --- | --- |
| Ouverture sans réparation ni avertissement | NON EXÉCUTÉ | NON EXÉCUTÉ | Candidat local seulement | Aucun dialogue de réparation, format ou sécurité |
| Recalcul complet | NON EXÉCUTÉ | NON EXÉCUTÉ | Sans objet | Aucune cellule, propriété ou relation nouvelle |
| Sauvegarde au format XLSX | NON EXÉCUTÉ | NON EXÉCUTÉ | Sans objet | Sauvegarde sans perte ni conversion demandée |
| Fermeture et réouverture | NON EXÉCUTÉ | NON EXÉCUTÉ | Sans objet | Contenu et présentation attendus conservés |
| Formules | NON EXÉCUTÉ | NON EXÉCUTÉ | Test local présent | Zéro formule et zéro chaîne de calcul |
| Macros et contenu actif | NON EXÉCUTÉ | NON EXÉCUTÉ | Test local présent | Zéro macro, contrôle, objet OLE ou contenu actif |
| Liens et relations externes | NON EXÉCUTÉ | NON EXÉCUTÉ | Test local présent | Zéro lien, connexion ou relation externe |
| Déterminisme avant ouverture | NON EXÉCUTÉ | NON EXÉCUTÉ | À mesurer sur artefact final | Deux générations ont le même SHA-256 |
| Stabilité après round-trip | NON EXÉCUTÉ | NON EXÉCUTÉ | Inventaire à comparer | Les différences sont expliquées par l’application et aucun contenu actif n’apparaît |

## Procédure

1. Générer deux fichiers avec les mêmes entrées et exiger des SHA-256 identiques.
2. Contrôler l’inventaire OOXML, les types de contenu et toutes les relations.
3. Copier le premier fichier sur deux postes isolés, sans extension Office tierce.
4. Exécuter ouverture, recalcul complet, sauvegarde, fermeture et réouverture.
5. Exporter les deux fichiers sauvegardés vers un poste d’analyse et relancer le
   contrôle OOXML fail-closed.
6. Comparer valeurs, chaînes, styles, feuilles et relations. Ne pas exiger que les
   octets post-sauvegarde soient identiques entre applications.
7. Consigner captures, hashes et résultats, puis faire signer par un second lecteur.

Tout avertissement, réparation, formule, macro, lien externe, variation avant
ouverture ou résultat non expliqué maintient le flag
`PUBLIC_BLACKPROOF_RETURN_PACK_ENABLED=disabled`.
