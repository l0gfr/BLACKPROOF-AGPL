---
title: "EUDI Wallet fin 2026 : construire une preuve de vérification sans surcollecter"
description: "Partie utilisatrice, attributs, validation et conservation : définir un reçu EUDI Wallet compatible avec la minimisation des données."
publishedAt: 2026-07-27
updatedAt: 2026-07-27
category: "Réglementation"
format: "Analyse"
confidence: "Confiance élevée"
author: "Rédaction BLACKPROOF"
tags:
  - EUDI Wallet
  - eIDAS
  - identité numérique
  - minimisation des données
  - preuve de vérification
  - attestation d’attributs
readingMinutes: 19
featured: true
draft: false
sources:
  - title: "Règlement (UE) no 910/2014 sur l’identification électronique et les services de confiance, version consolidée"
    publisher: "Journal officiel de l’Union européenne"
    url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02014R0910-20241018"
    kind: "Source primaire"
    publicationDate: 2024-10-18
    consultedAt: 2026-07-27
  - title: "Règlement d’exécution (UE) 2025/848 concernant l’enregistrement des parties utilisatrices de portefeuille"
    publisher: "Journal officiel de l’Union européenne"
    url: "https://eur-lex.europa.eu/eli/reg_impl/2025/848/oj/fra"
    kind: "Source primaire"
    publicationDate: 2025-05-07
    consultedAt: 2026-07-27
  - title: "Règlement d’exécution (UE) 2026/1730 modifiant le règlement d’exécution (UE) 2025/848"
    publisher: "Journal officiel de l’Union européenne"
    url: "https://eur-lex.europa.eu/eli/reg_impl/2026/1730/oj/fra"
    kind: "Source primaire"
    publicationDate: 2026-07-22
    consultedAt: 2026-07-27
  - title: "Règlement d’exécution (UE) 2026/1731 concernant les normes et spécifications applicables"
    publisher: "Journal officiel de l’Union européenne"
    url: "https://eur-lex.europa.eu/eli/reg_impl/2026/1731/oj/fra"
    kind: "Source primaire"
    publicationDate: 2026-07-22
    consultedAt: 2026-07-27
  - title: "Règlement d’exécution (UE) 2024/2977 concernant les données d’identification personnelle et les attestations électroniques d’attributs"
    publisher: "Journal officiel de l’Union européenne"
    url: "https://eur-lex.europa.eu/eli/reg_impl/2024/2977/oj/fra"
    kind: "Source primaire"
    publicationDate: 2024-12-04
    consultedAt: 2026-07-27
  - title: "Règlement d’exécution (UE) 2024/2979 concernant l’intégrité et les fonctionnalités essentielles des portefeuilles"
    publisher: "Journal officiel de l’Union européenne"
    url: "https://eur-lex.europa.eu/eli/reg_impl/2024/2979/oj/fra"
    kind: "Source primaire"
    publicationDate: 2024-12-04
    consultedAt: 2026-07-27
  - title: "Règlement d’exécution (UE) 2024/2982 concernant les protocoles et interfaces"
    publisher: "Journal officiel de l’Union européenne"
    url: "https://eur-lex.europa.eu/eli/reg_impl/2024/2982/oj/fra"
    kind: "Source primaire"
    publicationDate: 2024-12-04
    consultedAt: 2026-07-27
  - title: "Règlement (UE) 2016/679 relatif à la protection des données à caractère personnel"
    publisher: "Journal officiel de l’Union européenne"
    url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32016R0679"
    kind: "Source primaire"
    publicationDate: 2016-05-04
    consultedAt: 2026-07-27
  - title: "European Digital Identity Regulation"
    publisher: "Commission européenne"
    url: "https://digital-strategy.ec.europa.eu/en/policies/eudi-regulation"
    kind: "Source institutionnelle"
    publicationDate: 2026-06-22
    consultedAt: 2026-07-27
  - title: "Architecture and Reference Framework, version 2.9.0"
    publisher: "EU Digital Identity Wallet"
    url: "https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework/releases/tag/v2.9.0"
    kind: "Source institutionnelle"
    publicationDate: 2026-05-21
    consultedAt: 2026-07-27
  - title: "Commission urges Member States to rollout EU age verification app"
    publisher: "Commission européenne"
    url: "https://digital-strategy.ec.europa.eu/en/news/commission-urges-member-states-rollout-eu-age-verification-app"
    kind: "Source institutionnelle"
    publicationDate: 2026-04-29
    consultedAt: 2026-07-27
---

L’arrivée des portefeuilles européens d’identité numérique change la façon de demander une identité, un âge, un diplôme ou un droit. Elle ne supprime pas la question probatoire. Une organisation qui accepte une présentation EUDI Wallet doit encore pouvoir expliquer ce qu’elle a demandé, ce qu’elle a validé, selon quelle règle et pendant combien de temps elle conserve le résultat.

La mauvaise réponse consiste à archiver l’attestation complète, son jeton brut et toutes les données reçues « au cas où ». Cette copie peut augmenter le risque sans démontrer correctement la validation effectuée. La bonne unité de preuve est plus étroite : un reçu de vérification intègre, relié à une finalité déclarée et limité aux éléments nécessaires pour rejouer la décision.

> Conclusion courte : la preuve utile n’est pas une copie du portefeuille. C’est la trace intègre d’une vérification déterminée, effectuée à un instant donné, avec une politique et des sources de confiance identifiables.

## Fin 2026 est une échéance de disponibilité, pas un droit de tout demander

La [Commission européenne indique que chaque État membre doit fournir au moins un EUDI Wallet d’ici la fin de 2026](https://digital-strategy.ec.europa.eu/en/policies/eudi-regulation). La règle juridique précise figure à l’article 5 bis du [règlement eIDAS consolidé](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02014R0910-20241018) : le délai est de vingt-quatre mois à compter de l’entrée en vigueur des actes d’exécution visés par le texte.

Cette échéance concerne la mise à disposition des wallets. Elle ne signifie ni que tous les services seront intégrés au même rythme, ni que toutes les interfaces auront atteint leur état technique définitif. Le [règlement d’exécution 2026/1731, publié le 22 juillet 2026](https://eur-lex.europa.eu/eli/reg_impl/2026/1731/oj/fra), illustre cette transition : il met à jour plusieurs normes et spécifications, mais reporte au 11 août 2028 l’application de l’obligation technique imposant aux wallets d’authentifier et de valider le certificat d’enregistrement d’une partie utilisatrice.

Pour une organisation qui prépare un service fin 2026, trois états doivent donc rester distincts :

| État | Question à trancher | Preuve attendue |
| --- | --- | --- |
| Disponibilité | Un wallet certifié et utilisable est-il proposé dans l’État concerné ? | Référence de la solution et statut de confiance |
| Interopérabilité | Le flux choisi fonctionne-t-il avec les wallets et formats ciblés ? | Tests de conformité, versions et résultats |
| Exploitabilité probatoire | La décision peut-elle être expliquée sans conserver l’attestation entière ? | Reçu de vérification et règle de conservation |

L’[Architecture and Reference Framework, dont la version 2.9.0 a été publiée le 21 mai 2026](https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework/releases/tag/v2.9.0), constitue le cadre technique de référence maintenu par l’écosystème européen. Son évolution confirme l’intérêt de conserver la version des profils et du vérificateur mobilisés, plutôt que d’écrire une procédure comme si les dépendances étaient figées.

## La demande d’attributs est liée à une utilisation enregistrée

L’article 5 ter du [règlement eIDAS consolidé](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02014R0910-20241018) impose aux parties qui veulent utiliser le wallet pour un service public ou privé de s’enregistrer dans leur État d’établissement. L’enregistrement comprend l’utilisation prévue et les données que la partie utilisatrice doit demander. Celle-ci ne peut pas demander d’autres données que celles déclarées pour cette utilisation.

Le [règlement d’exécution 2025/848](https://eur-lex.europa.eu/eli/reg_impl/2025/848/oj/fra) détaille ces informations. Pour chaque utilisation prévue, le registre comprend notamment la liste des données, attestations et attributs demandés, avec leur dénomination technique et leur format lisible par machine.

Le [règlement d’exécution 2026/1730](https://eur-lex.europa.eu/eli/reg_impl/2026/1730/oj/fra), publié cinq jours avant cette analyse et entrant en vigueur le 11 août 2026, renforce le mécanisme :

- au moins une autorité de certification doit être autorisée par chaque État membre à délivrer les certificats d’enregistrement ;
- ces certificats doivent être délivrés automatiquement et sans retard injustifié après l’enregistrement ;
- chaque utilisation prévue doit être exprimée dans le certificat ;
- une politique d’accès générale doit indiquer que seules les données enregistrées pour cette utilisation peuvent être demandées ;
- le wallet doit informer l’utilisateur lorsqu’une partie demande une donnée absente du certificat ;
- la partie utilisatrice doit fournir l’URL de la politique de confidentialité correspondant à l’utilisation prévue.

Ces règles construisent un contrôle de périmètre. Elles ne répondent pas seules à la question suivante : quelle trace la partie utilisatrice doit-elle conserver pour démontrer que son propre vérificateur a correctement contrôlé la présentation ?

## Vérifier une présentation ne revient pas à lire un attribut

Une réponse comme `age_over_18 = true` ne devient pas fiable parce qu’elle est affichée dans une interface. Le vérificateur doit séparer les couches qui soutiennent sa décision.

| Couche | Contrôle | Limite de la conclusion |
| --- | --- | --- |
| Partie utilisatrice | Identité de la partie, certificat d’accès et utilisation enregistrée | Ne prouve pas la validité de l’attestation présentée |
| Demande | Attributs demandés conformes à l’utilisation enregistrée | Ne prouve pas que les attributs reçus suffisent à la règle métier |
| Wallet | Authenticité et validité de l’unité de portefeuille selon les mécanismes applicables | Ne prouve pas que toute donnée du wallet est encore valide |
| Attestation | Signature ou cachet, émetteur, période de validité et statut de révocation | Établit un état à l’instant du contrôle, pas une vérité permanente |
| Liaison | Présentation reliée au wallet, à la clé ou au mécanisme prévu par le profil | Ne prouve pas à elle seule l’identité civile de la personne devant l’écran |
| Décision | Règle métier appliquée au résultat validé | Reste une conclusion de la partie utilisatrice |

Le [règlement d’exécution 2024/2977](https://eur-lex.europa.eu/eli/reg_impl/2024/2977/oj/fra) exige que les attestations contiennent les informations nécessaires à leur authentification et à leur validation. Il organise aussi la gestion du statut de validité et la révocation des données d’identification personnelle. Le [règlement eIDAS consolidé](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02014R0910-20241018) place la responsabilité de l’authentification et de la validation des données d’identification personnelle et des attestations demandées sur la partie utilisatrice.

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 550" role="img" aria-labelledby="eudi-flow-title eudi-flow-desc">
    <title id="eudi-flow-title">Du périmètre enregistré au reçu minimal de vérification</title>
    <desc id="eudi-flow-desc">Cinq étapes relient l’utilisation enregistrée à la demande authentifiée, à la divulgation contrôlée par l’utilisateur, à la validation technique puis à un reçu minimal distinct de l’attestation brute.</desc>
    <path d="M104 236H816" stroke="#52645e" stroke-width="4" />
    <circle cx="104" cy="236" r="16" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="282" cy="236" r="16" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <circle cx="460" cy="236" r="16" fill="#121816" stroke="#c5a66f" stroke-width="3" />
    <circle cx="638" cy="236" r="16" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="816" cy="236" r="16" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <rect x="28" y="62" width="152" height="112" rx="16" fill="#121816" stroke="#81dacb" />
    <text x="48" y="91" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">01 · PÉRIMÈTRE</text>
    <text x="48" y="121" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Utilisation</text>
    <text x="48" y="145" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">enregistrée</text>
    <rect x="206" y="298" width="152" height="112" rx="16" fill="#121816" stroke="#aa9cc4" />
    <text x="226" y="327" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">02 · DEMANDE</text>
    <text x="226" y="357" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Partie et requête</text>
    <text x="226" y="381" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">authentifiées</text>
    <rect x="384" y="62" width="152" height="112" rx="16" fill="#121816" stroke="#c5a66f" />
    <text x="404" y="91" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">03 · PARTAGE</text>
    <text x="404" y="121" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Divulgation</text>
    <text x="404" y="145" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">sélective</text>
    <rect x="562" y="298" width="152" height="112" rx="16" fill="#121816" stroke="#81dacb" />
    <text x="582" y="327" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">04 · VALIDATION</text>
    <text x="582" y="357" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Émetteur, statut,</text>
    <text x="582" y="381" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">liaison et règle</text>
    <rect x="740" y="62" width="152" height="112" rx="16" fill="#0b100f" stroke="#aa9cc4" />
    <text x="760" y="91" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">05 · PREUVE</text>
    <text x="760" y="121" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Reçu minimal</text>
    <text x="760" y="145" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">intègre</text>
    <text x="566" y="467" fill="#c5a66f" font-size="14" font-family="system-ui, sans-serif">L’attestation brute reste hors du reçu par défaut</text>
    <rect x="126" y="482" width="668" height="46" rx="13" fill="#0b100f" stroke="#33413c" />
    <text x="171" y="511" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Chaque étape prouve une propriété précise. Aucune ne vaut preuve universelle d’identité.</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 340 870" role="img" aria-labelledby="eudi-flow-mobile-title eudi-flow-mobile-desc">
    <title id="eudi-flow-mobile-title">Du périmètre enregistré au reçu minimal de vérification</title>
    <desc id="eudi-flow-mobile-desc">Cinq étapes verticales relient l’utilisation enregistrée à la demande authentifiée, à la divulgation contrôlée, à la validation puis au reçu minimal.</desc>
    <path d="M48 70v650" stroke="#52645e" stroke-width="4" />
    <circle cx="48" cy="70" r="12" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="48" cy="220" r="12" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <circle cx="48" cy="370" r="12" fill="#121816" stroke="#c5a66f" stroke-width="3" />
    <circle cx="48" cy="520" r="12" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="48" cy="670" r="12" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <rect x="78" y="24" width="242" height="92" rx="15" fill="#121816" stroke="#81dacb" />
    <text x="98" y="53" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">01 · PÉRIMÈTRE</text>
    <text x="98" y="83" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Utilisation enregistrée</text>
    <rect x="78" y="174" width="242" height="92" rx="15" fill="#121816" stroke="#aa9cc4" />
    <text x="98" y="203" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">02 · DEMANDE</text>
    <text x="98" y="233" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Requête authentifiée</text>
    <rect x="78" y="324" width="242" height="92" rx="15" fill="#121816" stroke="#c5a66f" />
    <text x="98" y="353" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">03 · PARTAGE</text>
    <text x="98" y="383" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Divulgation sélective</text>
    <rect x="78" y="474" width="242" height="92" rx="15" fill="#121816" stroke="#81dacb" />
    <text x="98" y="503" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">04 · VALIDATION</text>
    <text x="98" y="533" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Émetteur, statut, règle</text>
    <rect x="78" y="624" width="242" height="92" rx="15" fill="#0b100f" stroke="#aa9cc4" />
    <text x="98" y="653" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">05 · PREUVE</text>
    <text x="98" y="683" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Reçu minimal intègre</text>
    <rect x="20" y="768" width="300" height="78" rx="14" fill="#0b100f" stroke="#33413c" />
    <text x="40" y="798" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">L’attestation brute reste hors du reçu.</text>
    <text x="40" y="820" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Chaque couche garde sa propre limite.</text>
  </svg>
  <figcaption>Cadre BLACKPROOF. Le flux sépare la conformité de la demande, la validation technique et la décision métier. Le reçu proposé n’est pas un format normalisé par les règlements cités.</figcaption>
</figure>

## Le journal du wallet n’est pas le reçu de la partie utilisatrice

Le [règlement d’exécution 2024/2979](https://eur-lex.europa.eu/eli/reg_impl/2024/2979/oj/fra) impose à l’instance de wallet de journaliser toutes ses transactions avec les parties utilisatrices et les autres wallets, qu’elles aboutissent ou non. Le journal comprend au minimum :

- la date et le lieu de la transaction ;
- le nom, les coordonnées et l’identifiant unique de la partie utilisatrice ainsi que son État d’établissement ;
- les types de données demandées et présentées ;
- la raison de l’échec lorsqu’une opération n’aboutit pas.

Le même article impose l’intégrité, l’authenticité et la confidentialité de ces éléments. Il permet à l’utilisateur de les exporter. Leur accès par le fournisseur de wallet est limité aux besoins du service et subordonné au consentement préalable explicite de l’utilisateur.

Ce journal répond à un objectif de traçabilité du wallet et de contrôle par l’utilisateur. Il ne documente pas nécessairement le moteur de validation de la partie utilisatrice, la version exacte de sa politique, les sources de statut consultées, le résultat de chaque contrôle ou la règle métier appliquée.

Dans les textes examinés pour cette analyse, aucun format harmonisé de reçu de vérification destiné à la partie utilisatrice n’est imposé. Concevoir ce reçu relève donc d’une décision d’architecture et de conformité. Il ne faut ni le présenter comme un document officiel EUDI, ni lui attribuer un effet juridique automatique.

## Proposition BLACKPROOF : un reçu minimal de vérification

La structure suivante est une proposition opérationnelle BLACKPROOF. Elle vise à documenter la décision sans dupliquer par défaut le PID, l’attestation électronique d’attributs ou le jeton de présentation.

| Champ proposé | Fonction probatoire | Contenu à éviter |
| --- | --- | --- |
| `receipt_schema` | Identifier le schéma et sa version | Un libellé non versionné |
| `verification_id` | Relier les journaux internes d’un seul traitement | Un identifiant global réutilisé entre services |
| `verified_at` | Fixer l’instant du contrôle avec fuseau explicite | Une date locale ambiguë |
| `intended_use` | Référencer l’utilisation enregistrée et la politique de confidentialité | Une finalité libre réécrite après la transaction |
| `relying_party_check` | Conserver le résultat, l’empreinte et le statut du certificat contrôlé | Le certificat complet si sa copie n’est pas nécessaire |
| `requested_types` et `presented_types` | Montrer le périmètre demandé puis reçu | Les valeurs de tous les attributs |
| `attestation_check` | Enregistrer format, émetteur, validité, statut et résultat cryptographique | Le jeton brut par réflexe |
| `binding_check` | Identifier le contrôle de liaison prévu par le profil | Une affirmation générique « utilisateur authentifié » |
| `decision` | Conserver le résultat strictement nécessaire à la finalité | La donnée source plus précise lorsque le résultat suffit |
| `validator` | Versionner le logiciel, le profil et la politique de validation | « Validation OK » sans règle reproductible |
| `integrity` | Signer ou sceller le reçu et ses références | Une empreinte sans convention de calcul |
| `retention` | Associer fondement, durée, échéance et procédure d’effacement | Une conservation indéfinie « en cas de litige » |

Pour un contrôle d’âge, la [solution européenne recommandée en avril 2026](https://digital-strategy.ec.europa.eu/en/news/commission-urges-member-states-rollout-eu-age-verification-app) illustre le principe de minimisation : prouver le franchissement d’un seuil sans révéler l’âge exact, l’identité ou d’autres informations personnelles. Si le service a seulement besoin de savoir qu’une personne a au moins 18 ans, conserver la date de naissance et le portrait augmente le périmètre sans renforcer nécessairement la preuve de la décision.

Le reçu reste lui-même susceptible de contenir des données à caractère personnel. Un résultat d’âge, une date, un identifiant local ou une combinaison de métadonnées peuvent permettre de distinguer ou de retrouver une personne. La minimisation ne transforme pas automatiquement le reçu en donnée anonyme.

## Conserver la décision, référencer le contexte, écarter le surplus

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 560" role="img" aria-labelledby="eudi-data-title eudi-data-desc">
    <title id="eudi-data-title">Trois décisions de conservation pour une vérification EUDI Wallet</title>
    <desc id="eudi-data-desc">Une matrice distingue les résultats et versions à conserver, les éléments de confiance à référencer et les attributs ou jetons à ne pas garder par défaut.</desc>
    <rect x="30" y="52" width="270" height="420" rx="18" fill="#121816" stroke="#81dacb" />
    <rect x="325" y="52" width="270" height="420" rx="18" fill="#121816" stroke="#c5a66f" />
    <rect x="620" y="52" width="270" height="420" rx="18" fill="#121816" stroke="#aa9cc4" />
    <text x="58" y="91" fill="#81dacb" font-size="14" font-family="ui-monospace, monospace">CONSERVER</text>
    <text x="58" y="126" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">Résultat nécessaire</text>
    <text x="58" y="165" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">• instant de validation</text>
    <text x="58" y="195" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">• décision et code motif</text>
    <text x="58" y="225" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">• politique et version</text>
    <text x="58" y="255" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">• types demandés et reçus</text>
    <text x="58" y="285" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">• règle de conservation</text>
    <rect x="55" y="348" width="220" height="76" rx="13" fill="#0b100f" stroke="#33413c" />
    <text x="78" y="378" fill="#81dacb" font-size="13" font-family="system-ui, sans-serif">Question : suffit-il à</text>
    <text x="78" y="402" fill="#81dacb" font-size="13" font-family="system-ui, sans-serif">expliquer la décision ?</text>
    <text x="353" y="91" fill="#c5a66f" font-size="14" font-family="ui-monospace, monospace">RÉFÉRENCER</text>
    <text x="353" y="126" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">Contexte de confiance</text>
    <text x="353" y="165" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">• certificat et statut</text>
    <text x="353" y="195" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">• émetteur et ancre</text>
    <text x="353" y="225" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">• profil et format</text>
    <text x="353" y="255" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">• outil de vérification</text>
    <text x="353" y="285" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">• utilisation enregistrée</text>
    <rect x="350" y="348" width="220" height="76" rx="13" fill="#0b100f" stroke="#33413c" />
    <text x="372" y="378" fill="#c5a66f" font-size="13" font-family="system-ui, sans-serif">Question : le contexte peut-il</text>
    <text x="372" y="402" fill="#c5a66f" font-size="13" font-family="system-ui, sans-serif">être retrouvé et vérifié ?</text>
    <text x="648" y="91" fill="#aa9cc4" font-size="14" font-family="ui-monospace, monospace">ÉCARTER PAR DÉFAUT</text>
    <text x="648" y="126" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">Données excédentaires</text>
    <text x="648" y="165" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">• PID ou jeton complet</text>
    <text x="648" y="195" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">• portrait ou biométrie</text>
    <text x="648" y="225" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">• date de naissance exacte</text>
    <text x="648" y="255" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">• identifiant transversal</text>
    <text x="648" y="285" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">• métadonnées non utiles</text>
    <rect x="645" y="348" width="220" height="76" rx="13" fill="#0b100f" stroke="#33413c" />
    <text x="667" y="378" fill="#aa9cc4" font-size="13" font-family="system-ui, sans-serif">Question : une obligation ou</text>
    <text x="667" y="402" fill="#aa9cc4" font-size="13" font-family="system-ui, sans-serif">nécessité est-elle établie ?</text>
    <rect x="174" y="500" width="572" height="40" rx="12" fill="#0b100f" stroke="#33413c" />
    <text x="226" y="526" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">La conservation se décide champ par champ, pour une finalité et une durée.</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 340 1040" role="img" aria-labelledby="eudi-data-mobile-title eudi-data-mobile-desc">
    <title id="eudi-data-mobile-title">Trois décisions de conservation pour une vérification EUDI Wallet</title>
    <desc id="eudi-data-mobile-desc">Trois cartes verticales distinguent les résultats à conserver, le contexte de confiance à référencer et les données excédentaires à écarter par défaut.</desc>
    <rect x="20" y="20" width="300" height="292" rx="17" fill="#121816" stroke="#81dacb" />
    <text x="42" y="54" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">CONSERVER</text>
    <text x="42" y="86" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Résultat nécessaire</text>
    <text x="42" y="122" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">• instant et décision</text>
    <text x="42" y="150" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">• politique et version</text>
    <text x="42" y="178" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">• types demandés et reçus</text>
    <text x="42" y="206" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">• règle de conservation</text>
    <rect x="40" y="236" width="260" height="52" rx="12" fill="#0b100f" stroke="#33413c" />
    <text x="58" y="267" fill="#81dacb" font-size="12" font-family="system-ui, sans-serif">Suffit-il à expliquer la décision ?</text>
    <rect x="20" y="338" width="300" height="292" rx="17" fill="#121816" stroke="#c5a66f" />
    <text x="42" y="372" fill="#c5a66f" font-size="13" font-family="ui-monospace, monospace">RÉFÉRENCER</text>
    <text x="42" y="404" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Contexte de confiance</text>
    <text x="42" y="440" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">• certificat et statut</text>
    <text x="42" y="468" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">• émetteur et ancre</text>
    <text x="42" y="496" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">• profil, format et outil</text>
    <text x="42" y="524" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">• utilisation enregistrée</text>
    <rect x="40" y="554" width="260" height="52" rx="12" fill="#0b100f" stroke="#33413c" />
    <text x="58" y="585" fill="#c5a66f" font-size="12" font-family="system-ui, sans-serif">Le contexte reste-t-il vérifiable ?</text>
    <rect x="20" y="656" width="300" height="292" rx="17" fill="#121816" stroke="#aa9cc4" />
    <text x="42" y="690" fill="#aa9cc4" font-size="13" font-family="ui-monospace, monospace">ÉCARTER PAR DÉFAUT</text>
    <text x="42" y="722" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Données excédentaires</text>
    <text x="42" y="758" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">• PID ou jeton complet</text>
    <text x="42" y="786" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">• portrait ou biométrie</text>
    <text x="42" y="814" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">• date de naissance exacte</text>
    <text x="42" y="842" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">• identifiant transversal</text>
    <rect x="40" y="872" width="260" height="52" rx="12" fill="#0b100f" stroke="#33413c" />
    <text x="58" y="903" fill="#aa9cc4" font-size="12" font-family="system-ui, sans-serif">La nécessité est-elle établie ?</text>
    <rect x="20" y="978" width="300" height="42" rx="12" fill="#0b100f" stroke="#33413c" />
    <text x="38" y="1004" fill="#a3ada6" font-size="11" font-family="system-ui, sans-serif">Décider chaque champ, finalité et durée.</text>
  </svg>
  <figcaption>Cadre BLACKPROOF. « Écarter par défaut » ne signifie pas « interdire dans tous les cas ». Une obligation légale ou une nécessité documentée peut justifier certains champs, mais elle doit être établie avant la collecte.</figcaption>
</figure>

Le [RGPD, article 5](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32016R0679), exige que les données soient adéquates, pertinentes et limitées à ce qui est nécessaire pour la finalité. Il impose aussi une durée de conservation n’excédant pas celle nécessaire et la capacité du responsable du traitement à démontrer le respect de ces principes. Son article 25 étend cette exigence à la conception et aux paramètres par défaut.

L’exception doit donc être documentée avant la collecte. Une banque, une autorité publique ou un acteur soumis à une règle sectorielle peut avoir une obligation spécifique d’identification ou de conservation. La présence de cette obligation doit être reliée au champ conservé, à sa durée et à son accès. Le seul souhait de disposer d’un dossier « plus complet » ne démontre pas la nécessité.

## Une empreinte ne rend pas la donnée anonyme

Remplacer un identifiant ou une attestation par une empreinte peut préserver l’intégrité d’une référence et réduire l’exposition directe. Cela ne suffit pas à faire sortir le reçu du RGPD.

Le [considérant 26 du RGPD](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32016R0679) précise que des données pseudonymisées qui peuvent être attribuées à une personne à l’aide d’informations supplémentaires restent des informations concernant une personne identifiable. Une empreinte d’adresse électronique, de numéro client ou de jeton à faible variabilité peut encore permettre une comparaison, une recherche ou une réattribution.

La conception doit distinguer :

- l’empreinte d’un objet pour vérifier son intégrité ;
- un identifiant pseudonyme local pour relier un dossier ;
- une donnée véritablement anonyme, pour laquelle la personne n’est plus identifiable par des moyens raisonnablement susceptibles d’être utilisés.

Le reçu ne doit pas promettre l’anonymat si le système conserve ailleurs la table de correspondance, la transaction métier ou les journaux permettant de retrouver la personne.

## L’accord de partage dans le wallet n’est pas automatiquement la base juridique

Le wallet donne à l’utilisateur un contrôle sur la présentation. Ce geste ne règle pas, à lui seul, la licéité de tout traitement ultérieur par la partie utilisatrice.

Le [règlement d’exécution 2026/1731](https://eur-lex.europa.eu/eli/reg_impl/2026/1731/oj/fra) le dit expressément pour le portrait : la confirmation explicite de sa divulgation constitue une garantie technique, pas en elle-même un fondement juridique du traitement. Le même texte interdit par défaut à la partie utilisatrice de conserver le portrait, sauf nécessité pour l’identification et l’authentification conforme au droit de la protection des données ou obligation prévue par le droit de l’Union ou le droit national.

La partie utilisatrice doit donc identifier séparément :

1. la finalité du traitement ;
2. la base juridique applicable au titre de l’article 6 du RGPD et, le cas échéant, les conditions de l’article 9 ;
3. les attributs strictement nécessaires ;
4. la décision conservée ;
5. la durée et les destinataires du reçu ;
6. la procédure d’exercice des droits et d’effacement.

## Le test opérationnel en huit questions

Avant d’ouvrir un flux EUDI Wallet en production, le RSSI, le DPO, le responsable métier et l’équipe de preuve peuvent exiger huit réponses vérifiables :

1. L’utilisation prévue et chaque attribut demandé figurent-ils dans l’enregistrement de la partie utilisatrice ?
2. Le service peut-il demander une propriété dérivée plutôt que la donnée précise, par exemple un seuil d’âge plutôt que la date de naissance ?
3. Quels contrôles portent sur la partie utilisatrice, le wallet, l’attestation, son émetteur, son statut et sa liaison ?
4. Le résultat distingue-t-il une validation réussie, une absence de donnée, une révocation, une expiration et une erreur technique ?
5. Le reçu permet-il de retrouver la politique, le vérificateur et les sources de confiance utilisés à l’instant du contrôle ?
6. Le reçu est-il intègre, exportable et vérifiable sans dépendre exclusivement du système qui l’a produit ?
7. Chaque donnée conservée possède-t-elle une finalité, une base, une durée et un propriétaire d’effacement ?
8. Un test négatif démontre-t-il que le service refuse ou signale une demande hors périmètre et qu’il n’archive pas le jeton brut par défaut ?

Ces contrôles peuvent rejoindre le [ProofPack](/proofpack) comme pièces versionnées : enregistrement de la partie utilisatrice, politique de validation, matrice des attributs, vecteurs de test, exemple de reçu expurgé et preuve d’effacement. La [méthode BLACKPROOF](/method) permet ensuite de distinguer les faits techniques, la règle métier et la conclusion soutenue.

## Inconnues et limites au 27 juillet 2026

Les points suivants ne doivent pas être présentés comme résolus :

- les registres, procédures d’enregistrement et calendriers de déploiement resteront opérés par les États membres ;
- le règlement 2026/1730 vient d’être publié et n’entre en vigueur que le 11 août 2026 ;
- l’authentification et la validation du certificat d’enregistrement par le wallet ne deviennent obligatoires qu’au 11 août 2028 ;
- les profils, normes référencées et implémentations continuent d’évoluer, comme le montre la mise à jour 2026/1731 ;
- le droit sectoriel peut imposer des contrôles ou des conservations supplémentaires ;
- une validation réussie prouve l’état contrôlé à un instant donné, pas l’exactitude éternelle de l’attribut ni la présence continue de la même personne.

Une organisation ne peut donc pas acheter aujourd’hui une « conformité EUDI fin 2026 » générique. Elle peut en revanche construire un contrat de vérification testable : finalité enregistrée, demande minimale, contrôles versionnés, décision explicite, reçu intègre et effacement démontrable.

## Décision

Le meilleur indicateur de maturité n’est pas le nombre d’attributs qu’un service sait extraire. C’est sa capacité à répondre, pour chaque décision, à quatre questions :

- quelle donnée était nécessaire ;
- quelle propriété a réellement été vérifiée ;
- quelle trace suffit pour le démontrer ;
- à quelle date cette trace sera effacée ou renouvelée.

Le wallet européen apporte des mécanismes de confiance, de divulgation sélective et de contrôle utilisateur. La partie utilisatrice reste responsable de la validation demandée et du traitement qu’elle choisit d’effectuer. Un reçu minimal, signé, versionné et soumis à une durée explicite transforme cette responsabilité en preuve contrôlable sans faire de chaque interaction une nouvelle base d’identité à conserver.
