---
title: "Cyber Resilience Act : préparer les signalements obligatoires de septembre 2026"
description: "À partir du 11 septembre 2026, quels produits et événements notifier, selon quels délais, avec quelles preuves et quelles limites d’interprétation."
publishedAt: 2026-07-20
updatedAt: 2026-07-20
category: "Réglementation"
format: "Analyse"
confidence: "Confiance élevée"
author: "Rédaction BLACKPROOF"
tags:
  - Cyber Resilience Act
  - CRA
  - vulnérabilité
  - incident de sécurité
  - notification
  - sécurité produit
readingMinutes: 18
featured: true
draft: false
sources:
  - title: "Règlement (UE) 2024/2847 concernant des exigences de cybersécurité horizontales pour les produits comportant des éléments numériques"
    publisher: "Journal officiel de l’Union européenne"
    url: "https://eur-lex.europa.eu/eli/reg/2024/2847/oj/fra"
    kind: "Source primaire"
    publicationDate: 2024-11-20
    consultedAt: 2026-07-20
  - title: "FAQs on the Cyber Resilience Act, version 1.3"
    publisher: "Commission européenne"
    url: "https://ec.europa.eu/newsroom/dae/redirection/document/122331"
    kind: "Source institutionnelle"
    publicationDate: 2026-07-01
    consultedAt: 2026-07-20
  - title: "Cyber Resilience Act - Reporting obligations"
    publisher: "Commission européenne"
    url: "https://digital-strategy.ec.europa.eu/en/policies/cra-reporting"
    kind: "Source institutionnelle"
    publicationDate: 2026-06-08
    consultedAt: 2026-07-20
  - title: "Single Reporting Platform (SRP) - Frequently Asked Questions"
    publisher: "ENISA"
    url: "https://www.enisa.europa.eu/topics/product-security-and-certification/single-reporting-platform-srp"
    kind: "Source institutionnelle"
    publicationDate: 2026-07-17
    consultedAt: 2026-07-20
  - title: "Règlement délégué (UE) 2026/881 sur le report de la diffusion des notifications"
    publisher: "Journal officiel de l’Union européenne"
    url: "https://eur-lex.europa.eu/eli/reg_del/2026/881/oj/fra"
    kind: "Source primaire"
    publicationDate: 2026-04-20
    consultedAt: 2026-07-20
---

Le Cyber Resilience Act ne commencera pas d’un seul bloc en décembre 2027. Son article 14 crée une échéance beaucoup plus proche : **à partir du 11 septembre 2026, les fabricants devront signaler les vulnérabilités activement exploitées et les incidents graves ayant des répercussions sur la sécurité de leurs produits comportant des éléments numériques**.

Cette obligation ne vise ni toute vulnérabilité découverte, ni tout incident observé. Elle impose de qualifier un produit, un événement et un moment de prise de connaissance, puis d’enrichir le signalement selon plusieurs échéances. Une organisation qui attend septembre pour identifier ses produits, ses responsables et ses sources de preuve risque donc de perdre du temps avant même d’avoir commencé l’analyse technique.

> Conclusion courte : le premier signalement peut intervenir avant que l’enquête soit complète. La préparation utile consiste à savoir ce qui est établi, ce qui reste à confirmer et qui peut décider, notifier et informer les utilisateurs dans les délais.

## Trois dates, trois objets différents

Le [règlement (UE) 2024/2847](https://eur-lex.europa.eu/eli/reg/2024/2847/oj/fra) est entré en vigueur le 10 décembre 2024. Son calendrier d’application distingue ensuite trois étapes :

- les articles 35 à 51, relatifs notamment aux organismes d’évaluation de la conformité, s’appliquent depuis le 11 juin 2026 ;
- l’article 14, consacré aux signalements obligatoires des fabricants, s’applique à partir du 11 septembre 2026 ;
- la plupart des autres dispositions, dont les exigences essentielles de cybersécurité et les obligations générales de conformité des fabricants, s’appliqueront à partir du 11 décembre 2027.

Cette chronologie empêche un raccourci fréquent : **septembre 2026 n’est pas la date d’application générale de tout le CRA**. C’est la date d’entrée en application des signalements prévus par l’article 14.

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 390" role="img" aria-labelledby="cra-calendar-title cra-calendar-desc">
    <title id="cra-calendar-title">Les trois étapes d’application du Cyber Resilience Act</title>
    <desc id="cra-calendar-desc">Le règlement est entré en vigueur en décembre 2024, les organismes d’évaluation sont concernés depuis juin 2026, les signalements commencent en septembre 2026 et l’application générale intervient en décembre 2027.</desc>
    <path d="M82 174H838" stroke="#52645e" stroke-width="4" />
    <circle cx="82" cy="174" r="14" fill="#121816" stroke="#78827c" stroke-width="3" />
    <circle cx="330" cy="174" r="14" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <circle cx="568" cy="174" r="14" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="838" cy="174" r="14" fill="#121816" stroke="#c5a66f" stroke-width="3" />
    <text x="42" y="70" fill="#78827c" font-size="14" font-family="ui-monospace, monospace">10 DÉC. 2024</text>
    <text x="42" y="104" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Entrée en vigueur</text>
    <text x="274" y="225" fill="#aa9cc4" font-size="14" font-family="ui-monospace, monospace">11 JUIN 2026</text>
    <text x="274" y="259" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Articles 35 à 51</text>
    <text x="274" y="286" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Organismes d’évaluation</text>
    <text x="506" y="70" fill="#81dacb" font-size="14" font-family="ui-monospace, monospace">11 SEPT. 2026</text>
    <text x="506" y="104" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Article 14</text>
    <text x="506" y="131" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Signalements obligatoires</text>
    <text x="742" y="225" fill="#c5a66f" font-size="14" font-family="ui-monospace, monospace">11 DÉC. 2027</text>
    <text x="742" y="259" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Application générale</text>
    <rect x="164" y="326" width="592" height="42" rx="12" fill="#0b100f" stroke="#33413c" />
    <text x="213" y="352" fill="#a3ada6" font-size="15" font-family="system-ui, sans-serif">Une échéance de signalement ne vaut pas conformité générale anticipée.</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 340 760" role="img" aria-labelledby="cra-calendar-mobile-title cra-calendar-mobile-desc">
    <title id="cra-calendar-mobile-title">Les trois étapes d’application du Cyber Resilience Act</title>
    <desc id="cra-calendar-mobile-desc">Le règlement est entré en vigueur en décembre 2024, les organismes d’évaluation sont concernés depuis juin 2026, les signalements commencent en septembre 2026 et l’application générale intervient en décembre 2027.</desc>
    <path d="M64 70v550" stroke="#52645e" stroke-width="4" />
    <circle cx="64" cy="70" r="12" fill="#121816" stroke="#78827c" stroke-width="3" />
    <circle cx="64" cy="220" r="12" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <circle cx="64" cy="370" r="12" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="64" cy="520" r="12" fill="#121816" stroke="#c5a66f" stroke-width="3" />
    <text x="96" y="57" fill="#78827c" font-size="12" font-family="ui-monospace, monospace">10 DÉC. 2024</text>
    <text x="96" y="86" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Entrée en vigueur</text>
    <text x="96" y="207" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">11 JUIN 2026</text>
    <text x="96" y="236" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Articles 35 à 51</text>
    <text x="96" y="262" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Organismes d’évaluation</text>
    <text x="96" y="357" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">11 SEPT. 2026</text>
    <text x="96" y="386" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Signalements</text>
    <text x="96" y="412" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Article 14</text>
    <text x="96" y="507" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">11 DÉC. 2027</text>
    <text x="96" y="536" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Application générale</text>
    <rect x="20" y="650" width="300" height="80" rx="14" fill="#0b100f" stroke="#33413c" />
    <text x="39" y="681" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Le signalement de 2026 ne vaut pas</text>
    <text x="39" y="704" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">conformité générale anticipée.</text>
  </svg>
  <figcaption>Calendrier établi à partir des articles 69 et 71 du règlement. État vérifié le 20 juillet 2026.</figcaption>
</figure>

## Quels produits et quels acteurs sont concernés ?

Le CRA définit un produit comportant des éléments numériques comme un produit logiciel ou matériel et ses solutions de traitement de données à distance, y compris les composants logiciels ou matériels mis sur le marché séparément. Selon l’[article 2](https://eur-lex.europa.eu/eli/reg/2024/2847/oj/fra), son utilisation prévue ou raisonnablement prévisible doit comprendre une connexion directe ou indirecte, logique ou physique, à un dispositif ou à un réseau.

La [FAQ de la Commission, version 1.3](https://ec.europa.eu/newsroom/dae/redirection/document/122331), propose trois questions cumulatives :

1. s’agit-il d’un produit comportant des éléments numériques au sens du règlement ?
2. est-il mis à disposition sur le marché de l’Union ?
3. son utilisation prévue ou raisonnablement prévisible comprend-elle la connexion définie par le règlement ?

Le périmètre ne peut donc pas être déduit du seul mot « logiciel », « cloud » ou « objet connecté ». La Commission précise notamment qu’un service SaaS autonome, conçu hors de la responsabilité du fabricant d’un produit, n’est pas en lui-même un produit comportant des éléments numériques. Il peut toutefois relever du CRA lorsqu’il constitue une solution de traitement de données à distance conçue sous la responsabilité du fabricant et dont l’absence empêcherait le produit d’exécuter une de ses fonctions.

Le règlement prévoit aussi des exclusions sectorielles, notamment pour certains dispositifs médicaux, dispositifs médicaux de diagnostic in vitro, véhicules, produits certifiés dans le cadre de l’aviation civile et équipements marins. La qualification doit être conduite depuis l’article 2 et les textes sectoriels concernés, pas depuis une liste commerciale simplifiée.

### Les produits anciens ne sont pas automatiquement hors jeu

L’article 69, paragraphe 3, rend l’article 14 applicable aux produits relevant du champ du CRA qui ont été mis sur le marché avant le 11 décembre 2027. La FAQ de la Commission confirme que les signalements commencent le 11 septembre 2026 pour ces produits également.

Pour un ancien produit, le fabricant peut ne plus disposer de l’environnement de construction, des outils ou des compétences permettant une investigation complète. La Commission indique que l’obligation de signalement demeure, même si les autres obligations de gestion des vulnérabilités du CRA ne s’appliquent pas encore à ce produit. Ce décalage rend l’inventaire des versions anciennes particulièrement important.

La FAQ de l’ENISA précise toutefois que l’obligation ne s’étend pas à une vulnérabilité dont le fabricant connaissait déjà l’exploitation active avant l’entrée en application des signalements. Cette précision porte sur le moment de la prise de connaissance, pas sur l’âge du produit. Le dossier doit donc conserver la date et la substance du premier signal fiable au lieu de déduire la réponse de la seule date de commercialisation.

### Le déclarant n’est pas toujours le fabricant d’origine

Le fabricant porte l’obligation principale. Mais les articles 21 et 22 prévoient aussi qu’un importateur, un distributeur ou une autre personne peut être considéré comme fabricant lorsqu’il met le produit sur le marché sous son propre nom ou sa propre marque, ou lorsqu’il réalise une modification substantielle puis remet le produit à disposition sur le marché.

Les **intendants de logiciels ouverts** relèvent d’un régime spécifique. L’article 24 leur applique le signalement des vulnérabilités activement exploitées dans la mesure où ils participent au développement des produits concernés. Le signalement des incidents graves et l’information des utilisateurs leur sont applicables lorsque ces incidents touchent les réseaux et systèmes d’information qu’ils fournissent pour le développement de ces produits.

Cette situation ne doit pas être confondue avec l’exclusion prévue à l’article 2, paragraphe 3, pour les logiciels libres et ouverts développés ou fournis hors du cadre d’une activité commerciale. Le considérant 18 précise que le mode de financement du développement ne suffit pas, à lui seul, à déterminer la nature commerciale de l’activité et que la fourniture d’un produit libre et ouvert non monétisé par son fabricant ne devrait pas être considérée comme une activité commerciale.

## Quels événements doivent être signalés ?

L’article 14 sépare deux branches : la vulnérabilité activement exploitée et l’incident grave ayant des répercussions sur la sécurité du produit. Une vulnérabilité connue, une preuve de concept publique ou un incident affectant un utilisateur ne franchissent pas automatiquement ces seuils.

### Une vulnérabilité doit être activement exploitée

L’article 3 définit la vulnérabilité activement exploitée comme une vulnérabilité pour laquelle il existe des éléments de preuve fiables montrant qu’un acteur malveillant l’a exploitée dans un système sans l’autorisation du propriétaire.

La [FAQ de la Commission](https://ec.europa.eu/newsroom/dae/redirection/document/122331) en déduit deux distinctions importantes :

- une vulnérabilité zero-day est soumise au signalement obligatoire s’il existe une preuve fiable de son exploitation malveillante ;
- une vulnérabilité découverte de bonne foi par un chercheur, un programme de bug bounty ou un laboratoire, sans preuve d’exploitation malveillante, n’est pas une vulnérabilité activement exploitée au sens de l’article 14. Elle peut faire l’objet d’un signalement volontaire au titre de l’article 15.

La preuve attendue n’est donc pas seulement celle de l’existence d’une faille. Elle doit relier cette faille à une exploitation malveillante réelle.

### Un composant tiers ne transfère pas automatiquement l’analyse

Lorsqu’une vulnérabilité activement exploitée provient d’un composant intégré, le fabricant du produit qui l’intègre doit la signaler si elle est contenue et exploitable dans son produit. Le fabricant du composant doit également la signaler si ce composant a été mis sur le marché séparément.

À l’inverse, la Commission précise que si le fabricant sait qu’un composant contient une vulnérabilité mais établit qu’elle ne peut pas être exploitée dans son produit, cette vulnérabilité n’est pas activement exploitée dans ce produit et n’est pas soumise au signalement obligatoire pour celui-ci. La conclusion exige cependant une analyse documentée, pas une simple absence d’alerte dans un outil de composition logicielle.

### Un incident doit franchir le seuil de gravité du CRA

Selon l’article 14, paragraphe 5, un incident ayant des répercussions sur la sécurité du produit est grave lorsqu’au moins une des conditions suivantes est remplie :

- il entache ou est susceptible d’entacher la capacité du produit à protéger la disponibilité, l’authenticité, l’intégrité ou la confidentialité de données ou de fonctions sensibles ou importantes ;
- il a conduit ou est susceptible de conduire à l’introduction ou à l’exécution d’un code malveillant dans le produit ou dans le réseau et les systèmes d’information d’un utilisateur du produit.

Le texte ne conditionne pas ce seuil à un nombre minimal d’utilisateurs, à une durée d’indisponibilité uniforme ou à un montant de perte. Une organisation qui ajoute ses propres seuils de tri doit donc veiller à ne pas neutraliser les deux critères juridiques.

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 520" role="img" aria-labelledby="cra-decision-title cra-decision-desc">
    <title id="cra-decision-title">Décider si un événement relève du signalement obligatoire du CRA</title>
    <desc id="cra-decision-desc">Le produit doit relever du CRA, puis l’événement doit être soit une vulnérabilité activement exploitée, soit un incident répondant à l’un des deux critères de gravité de l’article 14.</desc>
    <rect x="316" y="24" width="288" height="82" rx="16" fill="#121816" stroke="#81dacb" />
    <text x="350" y="57" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">ÉTAPE 1</text>
    <text x="350" y="84" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Produit dans le champ du CRA ?</text>
    <path d="M460 106v52M460 158H224M460 158h236" fill="none" stroke="#52645e" stroke-width="2" />
    <path d="M216 148l8 10 8-10M688 148l8 10 8-10" fill="none" stroke="#52645e" stroke-width="2" />
    <rect x="40" y="158" width="368" height="126" rx="18" fill="#121816" stroke="#aa9cc4" />
    <text x="68" y="192" fill="#aa9cc4" font-size="13" font-family="ui-monospace, monospace">BRANCHE A · VULNÉRABILITÉ</text>
    <text x="68" y="225" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Preuve fiable d’exploitation malveillante ?</text>
    <text x="68" y="253" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">La seule découverte de la faille ne suffit pas.</text>
    <rect x="512" y="158" width="368" height="126" rx="18" fill="#121816" stroke="#c5a66f" />
    <text x="540" y="192" fill="#c5a66f" font-size="13" font-family="ui-monospace, monospace">BRANCHE B · INCIDENT</text>
    <text x="540" y="225" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Au moins un critère de gravité ?</text>
    <text x="540" y="253" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Protection compromise ou code malveillant.</text>
    <path d="M224 284v64M696 284v64" stroke="#52645e" stroke-width="2" />
    <path d="M216 338l8 10 8-10M688 338l8 10 8-10" fill="none" stroke="#52645e" stroke-width="2" />
    <rect x="116" y="348" width="216" height="76" rx="15" fill="#0b100f" stroke="#81dacb" />
    <rect x="588" y="348" width="216" height="76" rx="15" fill="#0b100f" stroke="#81dacb" />
    <text x="153" y="381" fill="#81dacb" font-size="14" font-family="ui-monospace, monospace">ARTICLE 14</text>
    <text x="142" y="406" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Signalement obligatoire</text>
    <text x="625" y="381" fill="#81dacb" font-size="14" font-family="ui-monospace, monospace">ARTICLE 14</text>
    <text x="614" y="406" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Signalement obligatoire</text>
    <rect x="300" y="458" width="320" height="42" rx="12" fill="#0b100f" stroke="#33413c" />
    <text x="337" y="484" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Sinon, signalement volontaire possible.</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 340 860" role="img" aria-labelledby="cra-decision-mobile-title cra-decision-mobile-desc">
    <title id="cra-decision-mobile-title">Décider si un événement relève du signalement obligatoire du CRA</title>
    <desc id="cra-decision-mobile-desc">Le produit doit relever du CRA, puis l’événement doit être soit une vulnérabilité activement exploitée, soit un incident répondant à l’un des deux critères de gravité de l’article 14.</desc>
    <rect x="20" y="20" width="300" height="92" rx="16" fill="#121816" stroke="#81dacb" />
    <text x="42" y="51" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">ÉTAPE 1</text>
    <text x="42" y="82" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Produit dans le champ du CRA ?</text>
    <path d="M170 112v50" stroke="#52645e" stroke-width="2" />
    <path d="M162 152l8 10 8-10" fill="none" stroke="#52645e" stroke-width="2" />
    <rect x="20" y="162" width="300" height="140" rx="16" fill="#121816" stroke="#aa9cc4" />
    <text x="42" y="195" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">VULNÉRABILITÉ</text>
    <text x="42" y="229" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Exploitation malveillante</text>
    <text x="42" y="254" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">étayée par une preuve fiable ?</text>
    <text x="42" y="279" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Une faille seule ne suffit pas.</text>
    <path d="M170 302v50" stroke="#52645e" stroke-width="2" />
    <path d="M162 342l8 10 8-10" fill="none" stroke="#52645e" stroke-width="2" />
    <rect x="20" y="352" width="300" height="140" rx="16" fill="#121816" stroke="#c5a66f" />
    <text x="42" y="385" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">INCIDENT</text>
    <text x="42" y="419" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Au moins un des deux</text>
    <text x="42" y="444" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">critères de gravité ?</text>
    <text x="42" y="469" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Protection ou code malveillant.</text>
    <path d="M170 492v50" stroke="#52645e" stroke-width="2" />
    <path d="M162 532l8 10 8-10" fill="none" stroke="#52645e" stroke-width="2" />
    <rect x="20" y="542" width="300" height="94" rx="16" fill="#0b100f" stroke="#81dacb" />
    <text x="42" y="576" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">SI LE SEUIL EST FRANCHI</text>
    <text x="42" y="607" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Signalement obligatoire</text>
    <rect x="20" y="686" width="300" height="104" rx="16" fill="#0b100f" stroke="#33413c" />
    <text x="42" y="721" fill="#a3ada6" font-size="12" font-family="ui-monospace, monospace">SINON</text>
    <text x="42" y="752" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Signalement volontaire possible</text>
  </svg>
  <figcaption>Arbre de lecture fondé sur les articles 3, 14 et 15. La qualification reste propre au produit et aux faits disponibles.</figcaption>
</figure>

## 24 heures, 72 heures, puis un rapport final

Les deux branches suivent la même première cadence, mais leur rapport final n’a ni la même échéance ni le même contenu. Tous les délais sont formulés « sans retard injustifié » avec une limite maximale. Le plafond de 24 ou 72 heures ne doit donc pas être interprété comme un délai d’attente automatique.

| Étape | Vulnérabilité activement exploitée | Incident grave |
| --- | --- | --- |
| Alerte précoce | Au plus tard 24 heures après la prise de connaissance. Indiquer, le cas échéant, les États membres où le produit a été mis à disposition. | Au plus tard 24 heures après la prise de connaissance. Indiquer au minimum si des actes illicites ou malveillants sont suspectés et, le cas échéant, les États membres concernés. |
| Notification | Au plus tard 72 heures après la prise de connaissance. Donner les informations disponibles sur le produit, la nature générale de l’exploitation et de la vulnérabilité, ainsi que les mesures prises et celles accessibles aux utilisateurs. | Au plus tard 72 heures après la prise de connaissance. Donner la nature de l’incident, son évaluation initiale, les mesures prises et celles accessibles aux utilisateurs. |
| Rapport final | Au plus tard 14 jours après la mise à disposition d’une mesure corrective ou d’atténuation. Décrire la vulnérabilité, sa gravité, ses répercussions, l’acteur malveillant lorsqu’il est connu et la mesure disponible. | Dans un délai d’un mois à compter de la notification à 72 heures. Décrire l’incident, sa gravité, ses répercussions, la menace ou la cause profonde probable et les mesures d’atténuation. |

Le CSIRT désigné comme coordinateur peut demander un rapport intermédiaire de situation. L’article 14, paragraphe 8, impose aussi au fabricant d’informer les utilisateurs touchés et, lorsque cela est approprié, tous les utilisateurs de la vulnérabilité ou de l’incident ainsi que des mesures qu’ils peuvent prendre. Le texte ne fixe pas pour cette information un délai chiffré identique aux trois rapports, mais permet aux CSIRT d’informer les utilisateurs si le fabricant ne le fait pas en temps utile et si cette communication est proportionnée et nécessaire.

### L’alerte de 24 heures n’est pas un rapport forensique complet

La [FAQ SRP de l’ENISA](https://www.enisa.europa.eu/topics/product-security-and-certification/single-reporting-platform-srp), mise à jour le 17 juillet 2026, distingue les champs obligatoires, conditionnels et facultatifs à chaque étape. À 24 heures, le type de notification, le niveau, le nom du fabricant ou de l’intendant de logiciel ouvert, le produit et un titre sont notamment obligatoires. Un identifiant CVE ou EUVD est facultatif à ce stade.

À 72 heures, la nature générale de la vulnérabilité et de son exploitation, ou la nature et l’évaluation initiale de l’incident, deviennent obligatoires. Les mesures déjà prises et celles proposées aux utilisateurs doivent aussi être renseignées. Le détail complet de la vulnérabilité ou de l’incident est réservé au rapport final.

Cette progression confirme une règle opérationnelle : une information encore inconnue doit rester identifiée comme telle. Elle ne doit pas être remplacée par une estimation présentée comme un fait.

## Où va le signalement ?

Le fabricant utilise la plateforme unique de signalement, ou SRP, établie et administrée par l’ENISA. Le signalement passe par le point final du CSIRT désigné comme coordinateur et est simultanément mis à la disposition de l’ENISA. Le CSIRT initial diffuse ensuite la notification aux CSIRT des États membres dans lesquels le fabricant a indiqué que le produit avait été mis à disposition.

Le règlement situe l’établissement principal dans l’État membre où sont principalement prises les décisions relatives à la cybersécurité des produits. Si cet État ne peut pas être déterminé, il retient l’établissement qui compte le plus grand nombre de salariés dans l’Union. Pour un fabricant qui n’est pas établi dans l’Union, l’article 14, paragraphe 7, prévoit notamment de considérer l’établissement du mandataire. Cette qualification doit être faite sur la personne morale qui porte le produit, pas seulement sur le lieu où se trouve l’équipe de sécurité.

### Déclarer une information sensible ne donne pas un droit de veto

Le fabricant peut indiquer le degré de sensibilité attribué aux informations notifiées. Dans des circonstances exceptionnelles, le CSIRT initial peut décider de retarder leur diffusion pendant la durée strictement nécessaire.

Le [règlement délégué (UE) 2026/881](https://eur-lex.europa.eu/eli/reg_del/2026/881/oj/fra) encadre ce report. Il peut notamment intervenir lorsque les risques de cybersécurité liés à la diffusion l’emportent sur ses bénéfices et ne peuvent pas être suffisamment réduits par des protocoles comme TLP ou PAP. Le texte prévoit des cas liés à la disponibilité prochaine d’une mesure efficace, au risque de faciliter la création d’une technique d’exploitation, à la possibilité de ne partager temporairement que les informations nécessaires à l’atténuation ou à une divulgation coordonnée de vulnérabilité.

La décision appartient au CSIRT. Une classification de sensibilité émise par le fabricant constitue une information à examiner, pas une garantie que le rapport restera limité à son destinataire initial. Le règlement délégué précise en outre que l’accès de l’ENISA ne peut être restreint que dans des circonstances particulièrement exceptionnelles, pour l’une des trois conditions de l’article 16, paragraphe 2, et uniquement pour la notification à 72 heures d’une vulnérabilité activement exploitée. Même dans ce cas, un socle d’informations reste transmis simultanément à l’ENISA.

## Le dossier de preuve à préparer avant septembre

La grille suivante est une **proposition opérationnelle BLACKPROOF**. Elle ne remplace ni le formulaire SRP, ni une analyse juridique. Elle vise à conserver les éléments qui permettent de comprendre et de réviser la décision de signaler.

| Bloc | Éléments à conserver | Question à laquelle ils répondent |
| --- | --- | --- |
| Produit | Personne morale fabricante, nom du produit, versions, composants, traitement à distance, pays de mise à disposition | Quel produit et quel acteur relèvent du CRA ? |
| Prise de connaissance | Signal d’origine, contenu original, date et heure, destinataire interne, première qualification | À quel moment le délai a-t-il commencé ? |
| Exploitation | Indicateurs, télémétrie, rapport client, avis d’autorité ou recherche, lien entre la faille et l’exploitation | Existe-t-il une preuve fiable d’exploitation malveillante ? |
| Gravité | Données ou fonctions touchées, effets observés ou possibles, présence ou risque de code malveillant | L’incident franchit-il un des critères de l’article 14, paragraphe 5 ? |
| Décision | Faits établis, hypothèses, inconnues, responsable, heure, motif et niveau de confiance | Pourquoi signaler, ne pas signaler ou réexaminer ? |
| Notification | Copie de chaque version, identifiant, accusé de réception, auteur, heure, champs modifiés | Que contenait le signalement à chaque échéance ? |
| Utilisateurs | Population concernée, message, canal, date, mesures proposées et limites | Qui a été informé et sur quelle base ? |
| Correction | Correctif ou atténuation, date de disponibilité, versions visées, validation et restrictions | Quelle mesure ferme ou réduit le risque ? |

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 410" role="img" aria-labelledby="cra-evidence-title cra-evidence-desc">
    <title id="cra-evidence-title">La chaîne de preuve d’un signalement CRA</title>
    <desc id="cra-evidence-desc">La prise de connaissance déclenche une qualification documentée, suivie des versions successives du signalement, de l’information des utilisateurs et du rapport final.</desc>
    <rect x="24" y="72" width="160" height="108" rx="16" fill="#121816" stroke="#78827c" />
    <rect x="208" y="72" width="160" height="108" rx="16" fill="#121816" stroke="#aa9cc4" />
    <rect x="392" y="72" width="160" height="108" rx="16" fill="#121816" stroke="#81dacb" />
    <rect x="576" y="72" width="160" height="108" rx="16" fill="#121816" stroke="#81dacb" />
    <rect x="760" y="72" width="136" height="108" rx="16" fill="#121816" stroke="#c5a66f" />
    <path d="M184 126h24M368 126h24M552 126h24M736 126h24" stroke="#52645e" stroke-width="2" />
    <path d="M198 118l10 8-10 8M382 118l10 8-10 8M566 118l10 8-10 8M750 118l10 8-10 8" fill="none" stroke="#52645e" stroke-width="2" />
    <text x="46" y="105" fill="#78827c" font-size="12" font-family="ui-monospace, monospace">T0</text>
    <text x="46" y="135" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Signal reçu</text>
    <text x="46" y="159" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Source conservée</text>
    <text x="230" y="105" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">QUALIFIER</text>
    <text x="230" y="135" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Seuil et produit</text>
    <text x="230" y="159" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Décision datée</text>
    <text x="414" y="105" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">24 HEURES</text>
    <text x="414" y="135" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Alerte précoce</text>
    <text x="414" y="159" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Version archivée</text>
    <text x="598" y="105" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">72 HEURES</text>
    <text x="598" y="135" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Notification</text>
    <text x="598" y="159" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Analyse enrichie</text>
    <text x="782" y="105" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">FINAL</text>
    <text x="782" y="135" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Rapport</text>
    <text x="782" y="159" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Mesure liée</text>
    <path d="M472 180v72H748" fill="none" stroke="#33413c" stroke-width="2" stroke-dasharray="6 7" />
    <rect x="176" y="252" width="568" height="104" rx="18" fill="#0b100f" stroke="#33413c" />
    <text x="208" y="287" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">EN PARALLÈLE</text>
    <text x="208" y="318" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Informer les utilisateurs, conserver les inconnues et tracer les corrections</text>
    <text x="208" y="342" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Chaque version doit rester attribuée, horodatée et reliée aux faits disponibles.</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 340 920" role="img" aria-labelledby="cra-evidence-mobile-title cra-evidence-mobile-desc">
    <title id="cra-evidence-mobile-title">La chaîne de preuve d’un signalement CRA</title>
    <desc id="cra-evidence-mobile-desc">La prise de connaissance déclenche une qualification documentée, suivie des versions successives du signalement, de l’information des utilisateurs et du rapport final.</desc>
    <path d="M62 72v620" stroke="#52645e" stroke-width="3" />
    <circle cx="62" cy="72" r="11" fill="#121816" stroke="#78827c" stroke-width="3" />
    <circle cx="62" cy="210" r="11" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <circle cx="62" cy="348" r="11" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="62" cy="486" r="11" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="62" cy="624" r="11" fill="#121816" stroke="#c5a66f" stroke-width="3" />
    <text x="94" y="58" fill="#78827c" font-size="12" font-family="ui-monospace, monospace">T0</text>
    <text x="94" y="87" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Signal reçu</text>
    <text x="94" y="111" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Source originale conservée</text>
    <text x="94" y="196" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">QUALIFIER</text>
    <text x="94" y="225" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Produit, seuil, décision</text>
    <text x="94" y="249" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Faits et inconnues séparés</text>
    <text x="94" y="334" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">24 HEURES</text>
    <text x="94" y="363" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Alerte précoce</text>
    <text x="94" y="387" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Copie et accusé conservés</text>
    <text x="94" y="472" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">72 HEURES</text>
    <text x="94" y="501" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Analyse enrichie</text>
    <text x="94" y="525" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Mesures et sensibilité</text>
    <text x="94" y="610" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">RAPPORT FINAL</text>
    <text x="94" y="639" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Impact et correction</text>
    <text x="94" y="663" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Conclusion reliée aux preuves</text>
    <rect x="20" y="744" width="300" height="132" rx="16" fill="#0b100f" stroke="#33413c" />
    <text x="42" y="779" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">EN PARALLÈLE</text>
    <text x="42" y="810" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">Informer les utilisateurs</text>
    <text x="42" y="836" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">et tracer les corrections</text>
  </svg>
  <figcaption>Proposition de chaîne documentaire BLACKPROOF. Le formulaire officiel et les instructions du CSIRT restent prioritaires.</figcaption>
</figure>

Cette structure rejoint la [bibliothèque de preuves](/evidence-library) et les indicateurs de [dette de preuve](/proofdebt) de BLACKPROOF. Un document isolé n’établit pas une conclusion s’il n’est pas relié au bon produit, à la bonne version, à une source et au moment où la décision a été prise.

## Incertitudes au 20 juillet 2026

La base juridique du signalement est établie. Plusieurs modalités opérationnelles restent toutefois en cours de finalisation :

- l’ENISA indique que la SRP sera opérationnelle au 11 septembre 2026, mais l’adresse publique dédiée n’est pas encore publiée ;
- les représentants utiliseront un compte EU Login. La validation de leur capacité à agir pour un fabricant sera réalisée par le CSIRT après le premier accès, en parallèle du signalement, sans bloquer la possibilité de notifier ;
- l’ENISA indique qu’aucune API ne sera fournie à ce stade, même si une organisation peut automatiser son propre workflow interne ;
- la liste des CSIRT désignés comme coordinateurs doit encore être fournie sur la page de l’ENISA ;
- la FAQ de la Commission est un document de travail vivant et non une interprétation juridiquement contraignante. Les orientations finales prévues par l’article 26 sont encore annoncées comme à venir.

Ces inconnues ne bloquent pas la préparation. Elles imposent de séparer ce qui peut être construit dès maintenant de ce qui devra être vérifié à l’ouverture du service.

## Huit contrôles à réaliser avant l’ouverture de la plateforme

1. **Recenser les produits et versions.** Inclure les produits anciens encore concernés par l’article 14.
2. **Identifier la personne morale fabricante.** Vérifier les cas de marque propre, d’importation et de modification substantielle.
3. **Désigner le décideur de qualification.** Il doit pouvoir statuer de jour comme de nuit avec les équipes produit, sécurité et juridique.
4. **Conserver l’heure de prise de connaissance.** Le premier ticket interne n’est pas toujours le premier signal reçu par l’organisation.
5. **Tester les deux critères.** Exploitation malveillante fiable pour une vulnérabilité, critères de gravité de l’article 14 pour un incident.
6. **Préparer les champs de 24 et 72 heures.** Ne pas attendre un incident pour découvrir les identifiants de produit, pays et responsables.
7. **Organiser l’information des utilisateurs.** Définir les canaux, validations et moyens d’adresser les versions réellement touchées.
8. **Archiver chaque version.** Conserver le contenu envoyé, l’heure, l’auteur, l’accusé de réception et les corrections ultérieures.

Le même événement peut aussi nécessiter une analyse au titre de NIS 2, de la protection des données, d’un contrat ou d’un régime sectoriel. Les critères et destinataires ne doivent pas être fusionnés par commodité. Notre [analyse NIS 2](/analyses/nis-2-france-perimetre-obligations-preuves) et notre méthode de qualification des [fuites de données](/analyses/fuite-de-donnees-etablir-avant-de-conclure) permettent de traiter séparément ces branches.

## Limites de l’analyse

- **« Toute CVE doit être signalée. »** Le signalement obligatoire exige une vulnérabilité activement exploitée contenue dans le produit.
- **« Toute zero-day doit être signalée. »** Sans preuve fiable d’exploitation malveillante, la seule absence de correctif ne suffit pas.
- **« Les produits vendus avant 2027 sont exclus. »** L’article 14 s’applique aussi aux produits antérieurs qui relèvent du champ du CRA.
- **« Une notification classée sensible restera chez un seul CSIRT. »** Le report de diffusion est une décision encadrée du CSIRT, pas un choix unilatéral du fabricant.
- **« Les petites entreprises sont dispensées. »** Le règlement écarte les amendes administratives pour les microentreprises et petites entreprises en cas de non-respect de la seule échéance d’alerte à 24 heures. Il ne supprime ni l’obligation de signaler, ni les autres obligations applicables.
- **« Le rapport de 24 heures doit contenir la cause profonde. »** Il s’agit d’une alerte précoce. L’analyse est enrichie à 72 heures puis dans le rapport final.
- **« Le formulaire établira la conformité. »** Une plateforme transmet des informations. Elle ne qualifie pas à la place du fabricant son produit, les faits ou la fiabilité des preuves.

La bonne préparation ne consiste pas à fabriquer une certitude avant l’enquête. Elle consiste à rendre la décision suffisamment explicite pour être transmise dans les délais, vérifiée après coup et corrigée lorsque de nouveaux éléments apparaissent. La [méthode BLACKPROOF](/method) peut structurer ce dossier, mais elle ne remplace ni l’interprétation du règlement par les autorités et les juridictions compétentes, ni un conseil juridique adapté au produit et à l’organisation.
