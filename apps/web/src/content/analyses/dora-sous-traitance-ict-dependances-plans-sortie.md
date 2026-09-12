---
title: "DORA 2026 : sous-traitance ICT, dépendances critiques et plans de sortie"
description: "Relier fonctions critiques, fournisseurs, sous-traitants, contrats et tests de sortie pour transformer le registre DORA en dispositif de résilience."
publishedAt: 2026-07-21
updatedAt: 2026-07-21
category: "Réglementation"
format: "Analyse"
confidence: "Confiance élevée"
author: "Rédaction BLACKPROOF"
tags:
  - DORA
  - risque fournisseur
  - sous-traitance ICT
  - registre d’information
  - plan de sortie
  - résilience opérationnelle
readingMinutes: 19
featured: true
draft: false
sources:
  - title: "Règlement (UE) 2022/2554 sur la résilience opérationnelle numérique du secteur financier"
    publisher: "Journal officiel de l’Union européenne"
    url: "https://eur-lex.europa.eu/eli/reg/2022/2554/oj/fra"
    kind: "Source primaire"
    publicationDate: 2022-12-27
    consultedAt: 2026-07-21
  - title: "Règlement d’exécution (UE) 2024/2956 sur les modèles types du registre d’informations"
    publisher: "Journal officiel de l’Union européenne"
    url: "https://eur-lex.europa.eu/eli/reg_impl/2024/2956/oj/fra"
    kind: "Source primaire"
    publicationDate: 2024-12-02
    consultedAt: 2026-07-21
  - title: "Règlement délégué (UE) 2024/1773 sur la politique relative aux services ICT soutenant des fonctions critiques ou importantes"
    publisher: "Journal officiel de l’Union européenne"
    url: "https://eur-lex.europa.eu/eli/reg_del/2024/1773/oj/fra"
    kind: "Source primaire"
    publicationDate: 2024-06-25
    consultedAt: 2026-07-21
  - title: "Règlement délégué (UE) 2025/532 sur la sous-traitance des services ICT soutenant des fonctions critiques ou importantes"
    publisher: "Journal officiel de l’Union européenne"
    url: "https://eur-lex.europa.eu/eli/reg_del/2025/532/oj/fra"
    kind: "Source primaire"
    publicationDate: 2025-07-02
    consultedAt: 2026-07-21
  - title: "Digital Operational Resilience Act (DORA)"
    publisher: "Autorité de contrôle prudentiel et de résolution"
    url: "https://acpr.banque-france.fr/fr/reglementation/focus-sur-la-reglementation/transverse/digital-operational-resilience-act-dora"
    kind: "Source institutionnelle"
    publicationDate: 2026-03-20
    consultedAt: 2026-07-21
  - title: "The European Supervisory Authorities designate critical ICT third-party providers under DORA"
    publisher: "Autorité bancaire européenne"
    url: "https://www.eba.europa.eu/publications-and-media/press-releases/european-supervisory-authorities-designate-critical-ict-third-party-providers-under-digital"
    kind: "Source institutionnelle"
    publicationDate: 2025-11-18
    consultedAt: 2026-07-21
  - title: "DORA oversight"
    publisher: "Autorité bancaire européenne"
    url: "https://www.eba.europa.eu/activities/direct-supervision-and-oversight/digital-operational-resilience-act/dora-oversight"
    kind: "Source institutionnelle"
    consultedAt: 2026-07-21
  - title: "Preparations for reporting of DORA registers of information"
    publisher: "Autorité bancaire européenne"
    url: "https://www.eba.europa.eu/activities/direct-supervision-and-oversight/digital-operational-resilience-act/preparation-dora-application"
    kind: "Source institutionnelle"
    consultedAt: 2026-07-21
  - title: "Enhancing Third-party Risk Management and Oversight: A toolkit for financial institutions and financial authorities"
    publisher: "Financial Stability Board"
    url: "https://www.fsb.org/2023/12/final-report-on-enhancing-third-party-risk-management-and-oversight-a-toolkit-for-financial-institutions-and-financial-authorities/"
    kind: "Source institutionnelle"
    publicationDate: 2023-12-04
    consultedAt: 2026-07-21
---

Le règlement DORA s’applique depuis le 17 janvier 2025. En France, l’[ACPR](https://acpr.banque-france.fr/fr/reglementation/focus-sur-la-reglementation/transverse/digital-operational-resilience-act-dora) indique une remise des registres d’information au 31 mars 2026. Le sujet n’est donc plus de préparer un inventaire de principe, mais de maintenir une représentation exploitable des services ICT, des fonctions qu’ils soutiennent et des dépendances qui peuvent interrompre ces fonctions.

## Synthèse exécutive

- **Le registre DORA n’est pas un annuaire fournisseurs.** Les modèles réglementaires relient un accord contractuel, un service ICT, une fonction utilisatrice et une chaîne de prestataires. Pour les fonctions critiques ou importantes, ils demandent aussi une appréciation de la substituabilité, de l’impact d’un arrêt, de l’existence d’un plan de sortie et des solutions alternatives.
- **Le fournisseur direct ne résume pas le risque.** Le règlement d’exécution 2024/2956 demande d’identifier les sous-traitants dont l’interruption compromettrait la sécurité ou la continuité du service critique. Le règlement délégué 2025/532 ajoute la localisation, la concentration, la longueur de chaîne, les données traitées et la transférabilité aux facteurs à évaluer.
- **La clause contractuelle ne prouve pas la capacité de sortie.** DORA exige des plans complets, documentés, testés et revus périodiquement. Une sortie crédible doit montrer que les données, accès, configurations, compétences et contrôles métier peuvent être transférés dans un délai compatible avec la continuité attendue.
- **La surveillance européenne d’un prestataire critique ne transfère aucune responsabilité.** La première liste de prestataires ICT critiques a été publiée le 18 novembre 2025 à partir des registres transmis. Ce dispositif traite un risque systémique, mais complète seulement la gestion des risques qui reste à la charge de chaque entité financière.

> Conclusion courte : la preuve décisive n’est pas la présence d’un fournisseur dans un fichier. C’est la capacité à partir d’une fonction critique, parcourir toute sa chaîne de service, retrouver les droits contractuels applicables et démontrer qu’une interruption ou une sortie a été préparée dans des conditions réalistes.

## Le registre relie quatre objets, pas quatre fichiers

L’article 28 du [règlement DORA](https://eur-lex.europa.eu/eli/reg/2022/2554/oj/fra) impose de maintenir et mettre à jour un registre relatif à **tous les accords contractuels portant sur l’utilisation de services ICT fournis par des prestataires tiers**. Les accords soutenant des fonctions critiques ou importantes doivent y être distingués des autres.

Le [règlement d’exécution (UE) 2024/2956](https://eur-lex.europa.eu/eli/reg_impl/2024/2956/oj/fra) donne au registre une structure relationnelle. Quatre clés relient ses modèles : la référence de l’accord contractuel, l’identifiant de l’entité ou du prestataire, l’identifiant de la fonction et le type de service ICT. Ce dessin change la nature du contrôle. Une ligne « fournisseur cloud » sans fonction utilisatrice, service précis ni contrat de rattachement ne permet pas de reconstituer l’exposition.

| Objet | Question de contrôle | Information attendue dans le registre |
| --- | --- | --- |
| Accord contractuel | Quel texte ouvre le service, pour quelle entité et jusqu’à quand ? | Référence unique, nature de l’accord, dates, droit applicable, préavis |
| Service ICT | Quelle capacité technique est réellement consommée ? | Type de service, description, données, pays de fourniture et de stockage |
| Fonction | Quelle activité dépend du service et avec quel impact ? | Entité utilisatrice, identifiant de fonction, criticité, motif et impact d’une interruption |
| Chaîne de service | Qui contribue réellement à la fourniture ? | Prestataire direct, prestataires intragroupe, sous-traitants pertinents, rangs et liens de dépendance |

Le modèle B_07.01 va plus loin pour les services soutenant une fonction critique ou importante. Il demande notamment la substituabilité du prestataire, le motif d’une substitution difficile, la date du dernier audit, l’existence d’un plan de sortie, la possibilité de réinternalisation, l’impact d’un arrêt et l’identification éventuelle d’un autre prestataire.

Un champ « plan de sortie : oui » n’établit pourtant ni la qualité du plan ni son exécution. Il signale l’objet à vérifier. La valeur opérationnelle apparaît lorsque le registre renvoie vers le contrat, l’analyse de risque, le dernier test et les écarts encore ouverts.

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 470" role="img" aria-labelledby="dora-chain-title dora-chain-desc">
    <title id="dora-chain-title">Chaîne de dépendance d’un service ICT sous DORA</title>
    <desc id="dora-chain-desc">Une fonction critique dépend d’un service ICT et d’un accord contractuel, puis d’un prestataire direct et de sous-traitants pertinents. Les informations de localisation, de données, de concentration et de substituabilité accompagnent la chaîne.</desc>
    <rect x="30" y="52" width="174" height="116" rx="16" fill="#121816" stroke="#81dacb" stroke-width="2" />
    <rect x="244" y="52" width="174" height="116" rx="16" fill="#121816" stroke="#aa9cc4" stroke-width="2" />
    <rect x="458" y="52" width="174" height="116" rx="16" fill="#121816" stroke="#c5a66f" stroke-width="2" />
    <rect x="672" y="52" width="218" height="116" rx="16" fill="#121816" stroke="#78827c" stroke-width="2" />
    <path d="M204 110h40M418 110h40M632 110h40" stroke="#52645e" stroke-width="2" />
    <path d="M234 102l10 8-10 8M448 102l10 8-10 8M662 102l10 8-10 8" fill="none" stroke="#52645e" stroke-width="2" />
    <text x="52" y="83" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">FONCTION</text>
    <text x="52" y="115" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Critique ou</text>
    <text x="52" y="140" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">importante</text>
    <text x="266" y="83" fill="#aa9cc4" font-size="13" font-family="ui-monospace, monospace">SERVICE ICT</text>
    <text x="266" y="115" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Usage, données</text>
    <text x="266" y="140" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Accord contractuel</text>
    <text x="480" y="83" fill="#c5a66f" font-size="13" font-family="ui-monospace, monospace">RANG 1</text>
    <text x="480" y="115" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Prestataire</text>
    <text x="480" y="140" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">direct</text>
    <text x="694" y="83" fill="#a3ada6" font-size="13" font-family="ui-monospace, monospace">RANGS SUIVANTS</text>
    <text x="694" y="115" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Sous-traitants</text>
    <text x="694" y="140" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">soutenant le service</text>
    <path d="M117 168v70M331 168v70M545 168v70M781 168v70" stroke="#33413c" stroke-width="2" />
    <path d="M117 238h664" stroke="#33413c" stroke-width="2" />
    <rect x="70" y="238" width="780" height="172" rx="18" fill="#0b100f" stroke="#33413c" />
    <text x="102" y="274" fill="#81dacb" font-size="14" font-family="ui-monospace, monospace">ATTRIBUTS À RELIER</text>
    <rect x="102" y="298" width="155" height="44" rx="11" fill="#121816" stroke="#52645e" />
    <rect x="279" y="298" width="155" height="44" rx="11" fill="#121816" stroke="#52645e" />
    <rect x="456" y="298" width="155" height="44" rx="11" fill="#121816" stroke="#52645e" />
    <rect x="633" y="298" width="185" height="44" rx="11" fill="#121816" stroke="#52645e" />
    <text x="126" y="325" fill="#f1f4f0" font-size="14" font-family="system-ui, sans-serif">Localisation</text>
    <text x="311" y="325" fill="#f1f4f0" font-size="14" font-family="system-ui, sans-serif">Données</text>
    <text x="484" y="325" fill="#f1f4f0" font-size="14" font-family="system-ui, sans-serif">Concentration</text>
    <text x="659" y="325" fill="#f1f4f0" font-size="14" font-family="system-ui, sans-serif">Substituabilité</text>
    <text x="102" y="378" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Le lien entre objets permet d’identifier le point de défaillance, le droit applicable</text>
    <text x="102" y="400" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">et la preuve disponible, sans réduire le dossier à une fiche fournisseur.</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 340 940" role="img" aria-labelledby="dora-chain-mobile-title dora-chain-mobile-desc">
    <title id="dora-chain-mobile-title">Chaîne de dépendance d’un service ICT sous DORA</title>
    <desc id="dora-chain-mobile-desc">Une fonction critique dépend d’un service ICT et d’un accord contractuel, puis d’un prestataire direct et de sous-traitants pertinents. Les informations de localisation, de données, de concentration et de substituabilité accompagnent la chaîne.</desc>
    <rect x="20" y="20" width="300" height="112" rx="15" fill="#121816" stroke="#81dacb" stroke-width="2" />
    <rect x="20" y="166" width="300" height="112" rx="15" fill="#121816" stroke="#aa9cc4" stroke-width="2" />
    <rect x="20" y="312" width="300" height="112" rx="15" fill="#121816" stroke="#c5a66f" stroke-width="2" />
    <rect x="20" y="458" width="300" height="112" rx="15" fill="#121816" stroke="#78827c" stroke-width="2" />
    <path d="M170 132v34M170 278v34M170 424v34" stroke="#52645e" stroke-width="2" />
    <path d="M162 156l8 10 8-10M162 302l8 10 8-10M162 448l8 10 8-10" fill="none" stroke="#52645e" stroke-width="2" />
    <text x="42" y="52" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">FONCTION</text>
    <text x="42" y="84" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Critique ou importante</text>
    <text x="42" y="198" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">SERVICE ICT</text>
    <text x="42" y="230" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Usage, données, contrat</text>
    <text x="42" y="344" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">RANG 1</text>
    <text x="42" y="376" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Prestataire direct</text>
    <text x="42" y="490" fill="#a3ada6" font-size="12" font-family="ui-monospace, monospace">RANGS SUIVANTS</text>
    <text x="42" y="522" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Sous-traitants pertinents</text>
    <rect x="20" y="624" width="300" height="274" rx="16" fill="#0b100f" stroke="#33413c" />
    <text x="42" y="658" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">ATTRIBUTS À RELIER</text>
    <text x="42" y="704" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">Localisation et données</text>
    <text x="42" y="738" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">Concentration et substituabilité</text>
    <text x="42" y="790" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">La chaîne relie le point de défaillance,</text>
    <text x="42" y="813" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">le droit applicable et la preuve disponible.</text>
    <text x="42" y="858" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Une fiche fournisseur isolée ne suffit pas.</text>
  </svg>
  <figcaption>Lecture opérationnelle des modèles B_02.02, B_05.02, B_06.01 et B_07.01 du règlement d’exécution 2024/2956.</figcaption>
</figure>

## La chaîne utile s’arrête au risque matériel, pas au premier nom connu

Le registre n’exige pas une collecte indifférenciée de toutes les entreprises qui composent Internet. Le modèle B_05.02 inclut tous les prestataires directs et intragroupe. Pour les services soutenant une fonction critique ou importante, il inclut aussi **tous les sous-traitants qui sous-tendent effectivement le service**, c’est-à-dire ceux dont l’interruption compromettrait sa sécurité ou sa continuité.

Cette règle donne un critère de profondeur. L’équipe doit pouvoir expliquer pourquoi un acteur a été inclus, pourquoi un autre ne l’a pas été et sur quelle information repose cette conclusion. Une liste de sous-traitants copiée depuis une page juridique publique peut servir d’amorce, mais elle ne précise pas nécessairement le service consommé, le rang dans la chaîne, la localisation effective ni l’impact d’une interruption.

Le [règlement délégué (UE) 2025/532](https://eur-lex.europa.eu/eli/reg_del/2025/532/oj/fra) impose, avant la conclusion du contrat, d’évaluer si le prestataire direct peut identifier les sous-traitants qui soutiennent la fonction critique ou importante, informer l’entité financière et lui fournir les informations nécessaires. L’entité doit aussi apprécier :

- la longueur et la complexité de la chaîne ;
- la nature des données partagées ;
- les pays où le service est effectivement fourni et où les données sont traitées ou stockées ;
- la concentration sur un sous-traitant unique ou un petit nombre d’acteurs ;
- l’effet de la sous-traitance sur la transférabilité du service ;
- l’impact d’une défaillance sur la continuité et la disponibilité ;
- les obstacles possibles à l’exercice des droits d’accès, d’inspection et d’audit.

L’évaluation doit être reprise périodiquement lorsque l’environnement évolue, notamment en présence de changements touchant les fonctions soutenues, les menaces ICT, la concentration ou les risques géopolitiques. S’appuyer sur l’évaluation réalisée par le fournisseur direct est possible, mais l’article 3 du règlement délégué précise que cette dépendance ne limite pas la responsabilité finale de l’entité financière.

### Les changements de sous-traitance appellent une décision

Le contrat doit prévoir une information suffisamment anticipée sur les changements matériels de sous-traitance. Il doit aussi ménager un délai raisonnable pendant lequel l’entité financière peut approuver le changement ou s’y opposer. Si le changement dépasse sa tolérance au risque, elle doit pouvoir demander une modification avant sa mise en œuvre.

Le règlement délégué prévoit un droit de résiliation dans trois cas précis : mise en œuvre malgré une opposition, changement réalisé avant la fin du préavis sans approbation, ou sous-traitance d’un service critique ou important que le contrat n’autorisait pas explicitement à sous-traiter.

Un dispositif praticable doit donc distinguer quatre états : changement annoncé, analyse en cours, décision rendue et modification effectivement appliquée. Sans cette chronologie, l’organisation peut connaître la nouvelle chaîne sans pouvoir prouver qu’elle l’a évaluée à temps.

## Le contrat fixe les leviers, l’exploitation montre s’ils fonctionnent

L’article 30 de DORA établit un socle pour les accords portant sur des services ICT. Il demande notamment une description complète des fonctions et services, les conditions de sous-traitance, les localisations, la protection des données, leur accès et leur restitution, les niveaux de service, l’assistance en cas d’incident, la coopération avec les autorités et les droits de résiliation.

Pour un service soutenant une fonction critique ou importante, le contrat doit ajouter des objectifs de service quantitatifs et qualitatifs précis, les notifications susceptibles d’affecter la fourniture, des plans de continuité testés, la coopération aux tests de pénétration fondés sur la menace lorsqu’ils sont applicables, des droits de contrôle et d’audit, ainsi qu’une période de transition adéquate permettant un transfert vers un autre prestataire ou une réinternalisation.

| Levier contractuel | Question à vérifier | Trace d’exécution utile |
| --- | --- | --- |
| Description du service | Les composants, fonctions et sous-traitances autorisées sont-ils délimités ? | Annexe de service versionnée et reliée au registre |
| Localisations | Les pays de fourniture, de traitement et de stockage sont-ils connus et notifiés avant changement ? | Dernière déclaration reçue, analyse du changement et décision |
| Niveaux de service | Les seuils permettent-ils une action corrective rapide ? | Mesures brutes, écarts, escalades et clôtures |
| Audit et inspection | Le droit peut-il être exercé par l’entité, son mandataire et l’autorité ? | Plan d’audit, demandes, rapport, limites rencontrées et traitement |
| Restitution des données | Le format est-il accessible en cas d’arrêt ou de résiliation ? | Export réel, schéma, contrôle d’intégrité et test d’import |
| Transition | Le service continue-t-il assez longtemps pour migrer ou réinternaliser ? | Calendrier testé, ressources, dépendances et critères d’acceptation |

Une certification du prestataire, un rapport d’assurance ou un audit mutualisé peuvent alimenter l’analyse. Ils ne doivent pas être présentés comme couvrant automatiquement le bon service, la bonne période et toutes les dépendances. Le modèle B_07.01 distingue d’ailleurs la date d’un audit du service de la date de réception d’une certification ou d’un rapport d’audit interne du prestataire.

## La liste des prestataires critiques n’est pas une liste d’approbation

Les autorités européennes de surveillance ont publié la [première liste de prestataires tiers de services ICT critiques](https://www.eba.europa.eu/publications-and-media/press-releases/european-supervisory-authorities-designate-critical-ict-third-party-providers-under-digital) le 18 novembre 2025. La désignation s’est appuyée sur les registres d’information et sur des critères comprenant l’importance systémique, le soutien de fonctions critiques ou importantes et la substituabilité.

Cette désignation déclenche une surveillance européenne conduite par une autorité de surveillance principale. Elle n’est ni une certification du prestataire ni une garantie attachée à chaque service vendu. L’[EBA](https://www.eba.europa.eu/activities/direct-supervision-and-oversight/digital-operational-resilience-act/dora-oversight) précise que ce cadre complète, sans les remplacer, la responsabilité des entités financières dans la gestion de leurs risques ICT et leur supervision par les autorités compétentes.

Deux conclusions pratiques en découlent :

1. un prestataire absent de la liste peut rester essentiel au fonctionnement d’une entité particulière et doit être traité selon la criticité du service réellement consommé ;
2. la présence d’un prestataire dans la liste ne dispense pas de vérifier le contrat, la chaîne de sous-traitance, les localisations, le niveau de service et la capacité de sortie propres à l’accord concerné.

Le registre sert ainsi deux niveaux différents. Il permet à l’entité de gérer son exposition particulière et fournit aux autorités les données nécessaires pour détecter des dépendances systémiques. Confondre ces niveaux conduit soit à sous-estimer un fournisseur local difficile à remplacer, soit à croire qu’un grand fournisseur surveillé transfère sa résilience à tous ses clients.

## Un plan de sortie crédible commence par un scénario réaliste

L’article 28 demande des stratégies de sortie pour les services soutenant des fonctions critiques ou importantes. L’entité doit pouvoir sortir sans interrompre ses activités, limiter sa conformité réglementaire ni dégrader la continuité et la qualité des services rendus aux clients. Les plans doivent être complets, documentés, suffisamment testés et revus périodiquement.

Le [règlement délégué (UE) 2024/1773](https://eur-lex.europa.eu/eli/reg_del/2024/1773/oj/fra) précise que chaque accord concerné doit disposer d’un plan documenté, réaliste et réalisable, fondé sur des scénarios plausibles et des hypothèses raisonnables. Son calendrier doit être compatible avec les conditions de sortie et de résiliation du contrat. Les scénarios cités couvrent l’interruption imprévue et persistante, la prestation inappropriée ou défaillante et la fin inattendue de l’accord.

Les textes cités exigent une revue et un test périodiques, sans fixer dans ces dispositions un rythme uniforme pour tous les accords. La fréquence, la profondeur et la combinaison des scénarios doivent donc être justifiées par la criticité, l’impact, la substituabilité et l’évolution de la chaîne.

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 430" role="img" aria-labelledby="dora-exit-title dora-exit-desc">
    <title id="dora-exit-title">Parcours d’un test de sortie DORA</title>
    <desc id="dora-exit-desc">Le test part d’un scénario et de critères d’acceptation, extrait les actifs, les transfère vers une solution alternative, remet le service en fonctionnement, vérifie le résultat métier et clôt les accès et écarts.</desc>
    <path d="M76 130H844" stroke="#52645e" stroke-width="3" />
    <circle cx="76" cy="130" r="12" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="230" cy="130" r="12" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="384" cy="130" r="12" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <circle cx="538" cy="130" r="12" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <circle cx="692" cy="130" r="12" fill="#121816" stroke="#c5a66f" stroke-width="3" />
    <circle cx="844" cy="130" r="12" fill="#121816" stroke="#c5a66f" stroke-width="3" />
    <text x="48" y="66" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">01</text>
    <text x="48" y="94" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">Scénario</text>
    <text x="188" y="176" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">02</text>
    <text x="188" y="204" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">Extraire</text>
    <text x="342" y="66" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">03</text>
    <text x="342" y="94" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">Transférer</text>
    <text x="496" y="176" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">04</text>
    <text x="496" y="204" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">Remettre en service</text>
    <text x="650" y="66" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">05</text>
    <text x="650" y="94" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">Accepter</text>
    <text x="802" y="176" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">06</text>
    <text x="778" y="204" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">Clôturer</text>
    <rect x="64" y="252" width="792" height="120" rx="18" fill="#0b100f" stroke="#33413c" />
    <text x="94" y="286" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">PREUVES DU TEST</text>
    <text x="94" y="320" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Plan approuvé · export et intégrité · journaux de migration · résultat métier</text>
    <text x="94" y="348" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Durées observées · accès révoqués · écarts, décisions et nouveau test planifié</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 340 940" role="img" aria-labelledby="dora-exit-mobile-title dora-exit-mobile-desc">
    <title id="dora-exit-mobile-title">Parcours d’un test de sortie DORA</title>
    <desc id="dora-exit-mobile-desc">Le test part d’un scénario et de critères d’acceptation, extrait les actifs, les transfère vers une solution alternative, remet le service en fonctionnement, vérifie le résultat métier et clôt les accès et écarts.</desc>
    <path d="M66 58v620" stroke="#52645e" stroke-width="3" />
    <circle cx="66" cy="58" r="11" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="66" cy="178" r="11" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="66" cy="298" r="11" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <circle cx="66" cy="418" r="11" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <circle cx="66" cy="538" r="11" fill="#121816" stroke="#c5a66f" stroke-width="3" />
    <circle cx="66" cy="658" r="11" fill="#121816" stroke="#c5a66f" stroke-width="3" />
    <text x="100" y="48" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">01 · SCÉNARIO</text>
    <text x="100" y="77" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Déclencheur et acceptation</text>
    <text x="100" y="168" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">02 · EXTRAIRE</text>
    <text x="100" y="197" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Données et configurations</text>
    <text x="100" y="288" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">03 · TRANSFÉRER</text>
    <text x="100" y="317" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Solution alternative</text>
    <text x="100" y="408" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">04 · REMETTRE EN SERVICE</text>
    <text x="100" y="437" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Accès, flux et contrôles</text>
    <text x="100" y="528" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">05 · ACCEPTER</text>
    <text x="100" y="557" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Vérification métier</text>
    <text x="100" y="648" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">06 · CLÔTURER</text>
    <text x="100" y="677" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Accès, écarts et décisions</text>
    <rect x="20" y="746" width="300" height="152" rx="16" fill="#0b100f" stroke="#33413c" />
    <text x="42" y="780" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">PREUVES DU TEST</text>
    <text x="42" y="817" fill="#f1f4f0" font-size="14" font-family="system-ui, sans-serif">Journaux, intégrité, résultat métier</text>
    <text x="42" y="845" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Durées, accès révoqués et écarts</text>
    <text x="42" y="871" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Nouveau test planifié</text>
  </svg>
  <figcaption>Protocole opérationnel proposé pour matérialiser les exigences de sortie des articles 28 et 30 de DORA et de l’article 10 du règlement délégué 2024/1773.</figcaption>
</figure>

### Un test utile produit un résultat falsifiable

Le test n’a pas besoin de provoquer une rupture de production pour être probant. Son périmètre et ses limites doivent en revanche être explicites. Un exercice peut, par exemple, isoler un jeu de données représentatif, utiliser le mécanisme d’export contractuel, restaurer le service dans un environnement alternatif et faire valider les fonctions essentielles par le métier.

| Étape | Contrôle à exécuter | Résultat à conserver |
| --- | --- | --- |
| Scénario | Défaillance, interruption persistante, changement refusé ou résiliation | Hypothèses, périmètre, responsables et critères d’acceptation approuvés |
| Extraction | Récupérer données, configurations, journaux et documentation nécessaires | Horodatage, format, volume, contrôle d’intégrité et éléments manquants |
| Transfert | Charger les actifs chez un autre prestataire ou dans une solution interne | Scripts, erreurs, transformations, dépendances et temps observé |
| Remise en service | Rétablir identités, secrets, flux réseau, supervision et sauvegardes | Journaux techniques et contrôles de sécurité |
| Acceptation | Vérifier les opérations critiques et la qualité de service | Cas de test métier, résultat, réserves et décision de reprise |
| Clôture | Révoquer les accès devenus inutiles et traiter les résidus | Preuve de révocation, exceptions, actions correctives et prochaine échéance |

Les durées mesurées doivent être comparées aux objectifs de continuité, aux engagements contractuels et au calendrier du plan. Une durée théorique ou communiquée par le fournisseur ne remplace pas une observation. Si une migration complète est impossible ou disproportionnée, le dossier doit l’indiquer et préciser la partie testée, les contrôles compensatoires et le risque résiduel accepté.

Le [Financial Stability Board](https://www.fsb.org/2023/12/final-report-on-enhancing-third-party-risk-management-and-oversight-a-toolkit-for-financial-institutions-and-financial-authorities/) propose lui aussi une gestion couvrant tout le cycle de la relation avec un tiers et la cartographie des concentrations jusque dans les chaînes de fourniture. Son cadre est un outil international flexible, pas une interprétation juridique de DORA. Il renforce néanmoins la cohérence opérationnelle d’une approche qui relie registre, suivi, continuité et sortie.

## Un dossier de contrôle compact peut suffire

La matrice suivante est une **proposition opérationnelle BLACKPROOF**. Elle ne remplace ni les modèles du règlement d’exécution 2024/2956 ni les exigences propres de l’autorité compétente. Son rôle est de relier les informations déclaratives aux décisions et aux tests qui permettent de les défendre.

| Bloc | Pièces minimales | Critère de qualité |
| --- | --- | --- |
| Périmètre | Fonction, entité utilisatrice, service ICT, criticité, accord | Une personne indépendante peut reconstituer la relation |
| Chaîne | Prestataire direct, rangs suivants, service soutenu, pays, données | Chaque inclusion ou exclusion importante est justifiée et datée |
| Risque | Interruption, concentration, substituabilité, auditabilité, géopolitique | Les hypothèses, sources et inconnues sont séparées |
| Contrat | Sous-traitance, notification, audit, restitution, résiliation, transition | La clause est reliée au contrat signé et à sa version en vigueur |
| Exploitation | Niveaux de service, incidents, changements, audits et actions | Les écarts conduisent à une décision, un responsable et une échéance |
| Sortie | Scénario, alternative, ressources, test, résultat et corrections | Le plan contient des observations, pas seulement des intentions |
| Gouvernance | Tolérance au risque, arbitrage, acceptation résiduelle et revue | Le décideur, la date, le périmètre et les réserves sont explicites |

La [bibliothèque de preuves](/evidence-library) permet de structurer les pièces par nature et la [dette de preuve](/proofdebt) aide à rendre visibles les affirmations qui restent insuffisamment étayées. La méthode ne consiste pas à accumuler des documents. Elle consiste à rendre chaque conclusion vérifiable, révisable et rattachée au bon service.

## Quatre semaines pour reprendre le contrôle

Ce calendrier est une proposition de travail, pas un délai réglementaire.

### Semaine 1 : partir des fonctions

- confirmer la liste des fonctions critiques ou importantes et leur propriétaire métier ;
- relier chaque fonction aux services ICT effectivement utilisés ;
- rapprocher les références contractuelles des identifiants présents dans le registre ;
- consigner les relations encore inconnues au lieu de les compléter par supposition.

### Semaine 2 : parcourir les chaînes

- obtenir du prestataire direct les sous-traitants qui soutiennent effectivement chaque service critique ;
- documenter rangs, liens, pays de fourniture, lieux de traitement et catégories de données ;
- rechercher les concentrations communes à plusieurs services ou contrats ;
- dater la source de chaque information et le prochain événement de revue.

### Semaine 3 : tester les leviers contractuels

- vérifier les droits de notification, d’objection, d’audit, de restitution, de résiliation et de transition ;
- comparer les clauses signées aux pratiques réelles du prestataire ;
- demander un export représentatif selon le mécanisme contractuel ;
- qualifier les écarts et les faire arbitrer par les équipes juridique, sécurité, achat et métier.

### Semaine 4 : exécuter un test de sortie ciblé

- choisir un service dont l’impact et la substituabilité sont déjà évalués ;
- faire approuver le scénario, le périmètre et les critères d’acceptation ;
- exécuter l’extraction, le transfert et la validation métier sur un périmètre maîtrisé ;
- enregistrer les durées, les défauts, les décisions et la date du prochain test.

## Limites et contresens à écarter

- **« Le registre est remis une fois par an, donc une mise à jour annuelle suffit. »** DORA impose de maintenir et mettre à jour le registre. La remise annuelle ne transforme pas une chaîne mouvante en photographie annuelle acceptable.
- **« Tous les sous-traitants de tous les fournisseurs doivent être cartographiés sans limite. »** Le modèle précise la profondeur attendue. Pour les fonctions critiques ou importantes, le critère porte sur les sous-traitants qui sous-tendent effectivement le service et dont l’interruption compromettrait sa sécurité ou sa continuité.
- **« Le prestataire est sur la liste européenne, donc il est approuvé. »** La désignation répond à des critères de criticité systémique et ouvre une surveillance. Elle ne certifie pas chaque service ni chaque contrat.
- **« Une clause de portabilité vaut test de sortie. »** La clause ouvre un droit. Le test établit si les formats, délais, dépendances et ressources permettent réellement de l’exercer.
- **« Un autre fournisseur figure dans le registre, donc le service est substituable. »** La substitution dépend aussi des données, de la technologie, des compétences, des coûts, des délais et des risques de migration.
- **« L’intragroupe réduit naturellement le risque. »** Le règlement 2024/1773 demande d’appliquer la politique aux prestataires ICT intragroupe. La proximité capitalistique ne supprime ni la dépendance technique ni les contraintes transfrontières.
- **« DORA et NIS 2 produisent le même dossier. »** Les textes peuvent se croiser, mais leurs périmètres, autorités et mécanismes ne sont pas identiques. Notre [analyse NIS 2](/analyses/nis-2-france-perimetre-obligations-preuves) détaille la qualification propre à cette directive.

BLACKPROOF peut relier attentes, pièces, réserves et décisions dans un dossier vérifiable. Sa [méthode](/method) ne qualifie pas juridiquement une fonction, ne certifie pas un contrat et ne garantit pas qu’un plan de sortie réussira. Ces conclusions nécessitent les responsables métier, techniques, juridiques et de contrôle compétents.

## Dix questions pour le prochain comité de résilience

1. Quelle fonction critique ou importante dépend de quel service ICT, sous quel contrat ?
2. Quel acteur fournit réellement chaque composant indispensable au-delà du fournisseur direct ?
3. Quelle source établit la chaîne actuelle et quand a-t-elle été vérifiée ?
4. Quels services partagent le même sous-traitant, la même région ou la même technologie propriétaire ?
5. Quel changement matériel de sous-traitance avons-nous récemment approuvé, refusé ou laissé expirer ?
6. Dans quel format récupérons-nous les données, configurations et journaux nécessaires à une sortie ?
7. Quelle alternative a été identifiée et quelle partie de la migration a été réellement testée ?
8. Combien de temps le dernier exercice a-t-il pris, et à quel objectif cette durée a-t-elle été comparée ?
9. Quels écarts du dernier test restent ouverts, avec quel responsable et quelle échéance ?
10. Quelle décision de risque résiduel a été prise lorsque la substitution complète n’était pas réaliste ?

Une organisation maîtrise sa dépendance lorsqu’elle peut répondre à ces questions avec des informations datées, des contrats en vigueur et des résultats observés. Le registre fournit l’ossature. La résilience apparaît dans les liens, les décisions et les tests.

État des textes et des sources vérifié le 21 juillet 2026. Cette analyse expose un cadre de travail documenté et ne constitue pas un avis juridique.
