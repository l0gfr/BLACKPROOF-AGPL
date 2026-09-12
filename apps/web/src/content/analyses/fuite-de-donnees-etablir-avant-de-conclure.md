---
title: "Fuite de données : ce qu’il faut établir avant de conclure"
description: "Une méthode pour distinguer incident, violation, exfiltration, volume revendiqué et impact démontré sans transformer les inconnues en certitudes."
publishedAt: 2026-07-19
updatedAt: 2026-07-19
category: "Fuites de données"
format: "Méthode"
confidence: "Établi"
author: "Rédaction BLACKPROOF"
tags:
  - fuite de données
  - réponse à incident
  - preuve numérique
  - notification CNIL
readingMinutes: 7
featured: true
draft: false
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
  - title: "Journalisation des flux réseau, première partie"
    publisher: "CERT-FR"
    url: "https://www.cert.ssi.gouv.fr/actualite/CERTFR-2014-ACT-024/"
    kind: "Source institutionnelle"
    publicationDate: 2014-06-13
    consultedAt: 2026-07-19
---

Une organisation annonce un « incident de sécurité ». Un groupe revendique une exfiltration. Un volume circule sur les réseaux sociaux. Ces trois informations peuvent concerner le même événement sans avoir la même valeur probante.

La première discipline consiste donc à **ne pas fusionner des assertions de nature différente**. Une analyse solide doit préciser ce qui est observé, ce qui est déclaré par une partie intéressée et ce qui reste à démontrer.

> Conclusion courte : un incident confirmé ne prouve pas à lui seul une exfiltration, et une exfiltration ne permet pas à elle seule de valider le volume ou le contenu revendiqués.

## Les mots décrivent des faits différents

La [CNIL](https://www.cnil.fr/fr/violations-de-donnees-personnelles-les-regles-suivre) rattache la violation de données personnelles à une atteinte à la disponibilité, à l’intégrité ou à la confidentialité. Une indisponibilité causée par un rançongiciel peut donc constituer une violation même si aucune publication de données n’est démontrée. Inversement, une revendication publique ne suffit pas à établir qu’un système précis a été compromis.

Il faut au minimum distinguer quatre niveaux :

1. **Incident** : un événement de sécurité est détecté ou reconnu.
2. **Compromission** : un accès non autorisé à un système ou à un compte est établi.
3. **Exfiltration** : la sortie de données hors du périmètre autorisé est étayée.
4. **Divulgation** : des données sont rendues accessibles à des tiers non autorisés.

Ces niveaux peuvent se cumuler. Ils ne doivent pas être déduits les uns des autres sans élément supplémentaire.

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 330" role="img" aria-labelledby="proof-flow-title proof-flow-desc">
    <title id="proof-flow-title">Du signal public à la conclusion limitée</title>
    <desc id="proof-flow-desc">Quatre blocs relient le signal initial aux faits observables, aux preuves recoupées puis à une conclusion dont le niveau de confiance est explicite.</desc>
    <rect x="18" y="30" width="200" height="150" rx="18" fill="#121816" stroke="#52645e" />
    <rect x="250" y="30" width="200" height="150" rx="18" fill="#121816" stroke="#81dacb" />
    <rect x="482" y="30" width="200" height="150" rx="18" fill="#121816" stroke="#aa9cc4" />
    <rect x="714" y="30" width="188" height="150" rx="18" fill="#121816" stroke="#c5a66f" />
    <path d="M218 105h32M450 105h32M682 105h32" stroke="#78827c" stroke-width="2" />
    <path d="M240 97l10 8-10 8M472 97l10 8-10 8M704 97l10 8-10 8" fill="none" stroke="#78827c" stroke-width="2" />
    <text x="42" y="70" fill="#a3ada6" font-size="15" font-family="ui-monospace, monospace">01 · SIGNAL</text>
    <text x="42" y="105" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">Annonce, alerte,</text>
    <text x="42" y="132" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">revendication</text>
    <text x="274" y="70" fill="#81dacb" font-size="15" font-family="ui-monospace, monospace">02 · OBSERVABLE</text>
    <text x="274" y="105" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">Fait daté et</text>
    <text x="274" y="132" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">circonscrit</text>
    <text x="506" y="70" fill="#aa9cc4" font-size="15" font-family="ui-monospace, monospace">03 · PREUVE</text>
    <text x="506" y="105" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">Sources recoupées,</text>
    <text x="506" y="132" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">périmètre qualifié</text>
    <text x="738" y="70" fill="#c5a66f" font-size="15" font-family="ui-monospace, monospace">04 · CONCLUSION</text>
    <text x="738" y="105" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">Portée et niveau</text>
    <text x="738" y="132" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">de confiance</text>
    <rect x="168" y="230" width="584" height="62" rx="16" fill="#0b100f" stroke="#33413c" />
    <text x="197" y="267" fill="#a3ada6" font-size="17" font-family="system-ui, sans-serif">À chaque étape : faits établis · hypothèses · inconnues · preuve suivante</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 340 690" role="img" aria-labelledby="proof-flow-mobile-title proof-flow-mobile-desc">
    <title id="proof-flow-mobile-title">Du signal public à la conclusion limitée</title>
    <desc id="proof-flow-mobile-desc">Quatre blocs verticaux relient le signal initial aux faits observables, aux preuves recoupées puis à une conclusion dont le niveau de confiance est explicite.</desc>
    <rect x="20" y="20" width="300" height="110" rx="16" fill="#121816" stroke="#52645e" />
    <rect x="20" y="165" width="300" height="110" rx="16" fill="#121816" stroke="#81dacb" />
    <rect x="20" y="310" width="300" height="110" rx="16" fill="#121816" stroke="#aa9cc4" />
    <rect x="20" y="455" width="300" height="110" rx="16" fill="#121816" stroke="#c5a66f" />
    <path d="M170 130v35M170 275v35M170 420v35" stroke="#78827c" stroke-width="2" />
    <path d="M162 155l8 10 8-10M162 300l8 10 8-10M162 445l8 10 8-10" fill="none" stroke="#78827c" stroke-width="2" />
    <text x="42" y="53" fill="#a3ada6" font-size="13" font-family="ui-monospace, monospace">01 · SIGNAL</text>
    <text x="42" y="84" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Annonce, alerte, revendication</text>
    <text x="42" y="198" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">02 · OBSERVABLE</text>
    <text x="42" y="229" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Fait daté et circonscrit</text>
    <text x="42" y="343" fill="#aa9cc4" font-size="13" font-family="ui-monospace, monospace">03 · PREUVE</text>
    <text x="42" y="374" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Sources recoupées, périmètre qualifié</text>
    <text x="42" y="488" fill="#c5a66f" font-size="13" font-family="ui-monospace, monospace">04 · CONCLUSION</text>
    <text x="42" y="519" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Portée et niveau de confiance</text>
    <rect x="20" y="605" width="300" height="64" rx="16" fill="#0b100f" stroke="#33413c" />
    <text x="38" y="632" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Faits établis · hypothèses · inconnues</text>
    <text x="38" y="654" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">· preuve suivante</text>
  </svg>
  <figcaption>Cadre BLACKPROOF. Le niveau de conclusion ne doit jamais dépasser le niveau de preuve disponible.</figcaption>
</figure>

## Cinq questions avant de reprendre un chiffre

Un volume de comptes ou de fichiers est souvent l’élément le plus repris. C’est aussi l’un des plus difficiles à vérifier rapidement. Avant publication, cinq questions doivent recevoir une réponse, même partielle :

- **Quelle est la source du chiffre ?** Organisation touchée, autorité, document judiciaire, chercheur, attaquant ou simple reprise médiatique.
- **Que compte-t-il ?** Personnes, comptes, lignes, fichiers, objets de stockage ou occurrences dupliquées.
- **Quel est le périmètre temporel ?** Date de l’intrusion, fenêtre d’accès, date de détection et date de divulgation.
- **Quel échantillon est observable ?** Un extrait peut authentifier certaines données sans démontrer la taille totale revendiquée.
- **Quelles vérifications sont indépendantes ?** Plusieurs articles reprenant une même déclaration ne constituent pas plusieurs confirmations.

| Mention | Ce qu’elle autorise à écrire | Ce qu’elle n’autorise pas à écrire |
| --- | --- | --- |
| Confirmé par l’organisation | L’incident reconnu et son périmètre déclaré | La totalité des détails non publiés |
| Revendiqué par l’attaquant | L’existence de la revendication | L’authenticité, le volume ou l’exhaustivité |
| Échantillon authentifié | La présence de données cohérentes dans l’échantillon | La taille du jeu complet |
| Information inconnue | La question reste ouverte | Une estimation présentée comme un fait |

## La chronologie compte autant que le volume

Une analyse doit séparer au moins quatre dates : début possible de l’accès, détection, prise de connaissance et communication publique. La date d’une publication de données n’est pas nécessairement celle de l’exfiltration. La date d’une revendication n’est pas celle de la compromission.

Le [NIST SP 800-61 Rev. 3](https://csrc.nist.gov/pubs/sp/800/61/r3/final), finalisé en avril 2025, replace la réponse à incident dans l’ensemble de la gestion du risque cyber. Cette approche invite à examiner la préparation, la détection, la réponse et la récupération au lieu de réduire l’événement à son moment médiatique.

Les journaux techniques sont déterminants pour reconstruire cette chronologie. Le [CERT-FR](https://www.cert.ssi.gouv.fr/actualite/CERTFR-2014-ACT-024/) rappelle notamment que les traces réseau utiles doivent permettre d’identifier la source et la destination d’un flux et de le qualifier. Une absence de trace ne démontre pas une absence d’exfiltration. Elle réduit la capacité à conclure.

## Le délai de 72 heures n’est pas un délai d’enquête complet

Pour une violation de données personnelles présentant un risque, la CNIL indique que la notification doit intervenir dans les meilleurs délais et au plus tard 72 heures après la prise de connaissance. Le point de départ repose sur un degré de certitude raisonnable qu’un incident a eu lieu et a touché des données personnelles.

Ce délai ne signifie pas que toutes les réponses forensiques doivent être disponibles. La CNIL prévoit une notification initiale qui peut être complétée. La communication publique, la notification réglementaire et la fin de l’investigation sont donc trois jalons distincts.

## Une grille de publication réfutable

BLACKPROOF retiendra quatre blocs visibles pour les analyses d’incident :

1. **Faits établis** : éléments directement soutenus par les sources listées.
2. **Hypothèses** : interprétations possibles, avec leur niveau de confiance.
3. **Inconnues** : questions que les données publiques ne permettent pas de trancher.
4. **Preuves attendues** : éléments qui confirmeraient ou invalideraient la conclusion.

Cette grille rejoint la logique de la [bibliothèque de preuves](/evidence-library) et des [indicateurs ProofDebt](/proofdebt) de BLACKPROOF : rendre visible ce qui manque plutôt que combler le vide par une formule définitive.

Une analyse n’est pas affaiblie lorsqu’elle dit « inconnu ». Elle devient plus utile, car le lecteur sait exactement où s’arrête la preuve disponible et ce qui pourrait faire évoluer la conclusion.
