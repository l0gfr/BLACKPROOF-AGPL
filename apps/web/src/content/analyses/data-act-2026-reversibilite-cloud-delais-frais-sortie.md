---
title: "Data Act 2026 : réversibilité cloud, délais et limites du « zéro frais » en 2027"
description: "Analyser les délais, les actifs exportables et les obligations IaaS, PaaS et SaaS, puis tester une sortie vérifiable avant le 12 janvier 2027."
publishedAt: 2026-07-23
updatedAt: 2026-07-23
category: "Réglementation"
format: "Analyse"
confidence: "Confiance élevée"
author: "Rédaction BLACKPROOF"
tags:
  - Data Act
  - réversibilité cloud
  - portabilité
  - IaaS
  - SaaS
  - frais de sortie
readingMinutes: 20
featured: true
draft: false
sources:
  - title: "Règlement (UE) 2023/2854 concernant des règles harmonisées portant sur l’équité de l’accès aux données et de l’utilisation des données"
    publisher: "Journal officiel de l’Union européenne"
    url: "https://eur-lex.europa.eu/eli/reg/2023/2854/oj/fra"
    kind: "Source primaire"
    publicationDate: 2023-12-22
    consultedAt: 2026-07-23
  - title: "Data Act explained"
    publisher: "Commission européenne"
    url: "https://digital-strategy.ec.europa.eu/en/factpages/data-act-explained"
    kind: "Source institutionnelle"
    consultedAt: 2026-07-23
  - title: "Frequently Asked Questions about the Data Act, version 1.4"
    publisher: "Commission européenne"
    url: "https://digital-strategy.ec.europa.eu/en/library/commission-publishes-frequently-asked-questions-about-data-act"
    kind: "Source institutionnelle"
    publicationDate: 2026-01-22
    consultedAt: 2026-07-23
  - title: "Model Contractual Terms and Standard Contractual Clauses for cloud computing contracts"
    publisher: "Commission européenne"
    url: "https://digital-strategy.ec.europa.eu/en/library/draft-recommendation-non-binding-model-contractual-terms-data-access-and-use-and-non-binding"
    kind: "Source institutionnelle"
    publicationDate: 2025-11-19
    consultedAt: 2026-07-23
  - title: "Proposition COM(2025) 837, Digital Omnibus"
    publisher: "Commission européenne"
    url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=COM%3A2025%3A0837%3AFIN"
    kind: "Source primaire"
    publicationDate: 2025-11-19
    consultedAt: 2026-07-23
  - title: "Procédure 2025/0360(COD), Digital Omnibus"
    publisher: "Observatoire législatif du Parlement européen"
    url: "https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2025%2F0360%28COD%29"
    kind: "Source institutionnelle"
    consultedAt: 2026-07-23
  - title: "Règlement (UE) 2022/2554 sur la résilience opérationnelle numérique du secteur financier"
    publisher: "Journal officiel de l’Union européenne"
    url: "https://eur-lex.europa.eu/eli/reg/2022/2554/oj/fra"
    kind: "Source primaire"
    publicationDate: 2022-12-27
    consultedAt: 2026-07-23
---

Le Data Act s’applique depuis le 12 septembre 2025. Son chapitre VI encadre le passage d’un service de traitement de données vers un autre fournisseur, vers une infrastructure interne ou, sous conditions, la suppression des données et actifs numériques. En 2026, l’enjeu n’est plus de promettre une « portabilité » abstraite. Il consiste à savoir précisément ce qui peut être transféré, dans quel délai, avec quelle assistance et sous quelle forme de preuve.

## Synthèse exécutive

- **Le droit au changement de fournisseur dépasse un simple export.** Le règlement traite les données exportables, les actifs numériques, les interfaces, la continuité du service, le délai de récupération et l’effacement final. Une archive téléchargée ne démontre pas à elle seule la possibilité de reprendre l’activité ailleurs.
- **Le calendrier normal peut déjà dépasser trois mois.** Le contrat peut prévoir jusqu’à deux mois de préavis avant une période de transition normalement limitée à trente jours calendaires. Une impossibilité technique justifiée ouvre une période alternative pouvant atteindre sept mois.
- **La suppression des frais au 12 janvier 2027 ne rend pas toute migration gratuite.** Le règlement distingue les frais de changement de fournisseur des frais de service standard et des pénalités de résiliation anticipée. Un usage parallèle de plusieurs services peut aussi générer des frais continus de sortie de données.
- **Les obligations techniques diffèrent selon le modèle de service.** L’IaaS impose au fournisseur source de faciliter l’équivalence fonctionnelle. Le PaaS et le SaaS reposent notamment sur des interfaces ouvertes et un export structuré, couramment utilisé et lisible par machine.
- **Le Digital Omnibus ne modifie pas encore le droit applicable.** La proposition COM(2025) 837 prévoit des allègements ciblés, mais la procédure 2025/0360(COD) attend encore une décision en commission parlementaire au 23 juillet 2026. Une exemption proposée ne doit pas être traitée comme une règle en vigueur.

> Conclusion courte : le Data Act crée un cadre de sortie opposable au fournisseur. La capacité réelle de migrer reste à démontrer par un test qui relie contrat, inventaire des actifs, export, intégrité, restauration, continuité et effacement.

## La réversibilité porte sur des données et des actifs utilisables

Le [règlement (UE) 2023/2854](https://eur-lex.europa.eu/eli/reg/2023/2854/oj/fra) vise les « services de traitement de données ». La [FAQ de la Commission, version 1.4](https://digital-strategy.ec.europa.eu/en/library/commission-publishes-frequently-asked-questions-about-data-act), confirme que cette définition couvre les modèles IaaS, PaaS et SaaS lorsqu’ils présentent les caractéristiques prévues par l’article 2, paragraphe 8. L’utilisation d’une fonctionnalité appuyée sur du cloud ne suffit pas toujours : il faut aussi vérifier qu’un client utilise le service de traitement de données en tant que tel.

Deux ensembles doivent être distingués :

| Ensemble | Périmètre réglementaire | Point de contrôle |
| --- | --- | --- |
| Données exportables | Données d’entrée et de sortie, ainsi que les métadonnées directement ou indirectement générées ou co-générées par l’usage du service, hors éléments protégés par les droits de propriété intellectuelle ou secrets d’affaires du fournisseur ou d’un tiers | Liste des jeux de données, schémas, formats, volumes, relations et métadonnées nécessaires à leur interprétation |
| Actifs numériques | Éléments sur lesquels le client dispose d’un droit d’usage et qui sont nécessaires pour utiliser efficacement ses données dans l’environnement de destination | Configurations, paramètres de sécurité, droits d’accès, images de machines virtuelles, conteneurs, applications ou autres éléments pertinents selon le service |

Le contrat doit fournir une spécification exhaustive des catégories de données et d’actifs pouvant être transférées. Il peut également préciser des catégories liées au fonctionnement interne du service qui sont exclues afin de protéger les secrets d’affaires du fournisseur. Cette exclusion ne doit toutefois ni empêcher ni retarder le changement de fournisseur prévu à l’article 23.

Cette frontière mérite un examen document par document. Une mention générique comme « toutes les données client sont exportables » ne dit rien du schéma, des relations, des journaux, des paramètres d’identité, des clés gérées par le client ou des versions nécessaires à la reprise.

## Le calendrier contractuel comporte plusieurs horloges

L’article 25 ne fixe pas un délai unique. Il organise une séquence qui commence avec la notification du client et se termine après la récupération puis l’effacement. Le préavis contractuel permettant d’engager le changement ne peut pas dépasser deux mois. La période de transition qui suit est normalement limitée à trente jours calendaires.

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 520" role="img" aria-labelledby="data-act-timeline-title data-act-timeline-desc">
    <title id="data-act-timeline-title">Délais du changement de fournisseur prévus par l’article 25 du Data Act</title>
    <desc id="data-act-timeline-desc">La notification ouvre un préavis maximal de deux mois, suivi d’une transition normalement limitée à trente jours calendaires. Une impossibilité technique justifiée sous quatorze jours ouvrables peut conduire à une transition alternative de sept mois au maximum. Après la transition, le client dispose d’au moins trente jours pour récupérer ses données avant leur effacement.</desc>
    <rect x="28" y="42" width="864" height="410" rx="22" fill="#0b100f" stroke="#33413c" />
    <text x="62" y="78" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">PARCOURS NORMAL</text>
    <path d="M92 170H828" stroke="#52645e" stroke-width="3" />
    <circle cx="92" cy="170" r="11" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="330" cy="170" r="11" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="560" cy="170" r="11" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <circle cx="828" cy="170" r="11" fill="#121816" stroke="#c5a66f" stroke-width="3" />
    <text x="62" y="116" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Notification</text>
    <text x="210" y="211" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">PRÉAVIS</text>
    <text x="188" y="236" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">2 mois maximum</text>
    <text x="407" y="116" fill="#aa9cc4" font-size="13" font-family="ui-monospace, monospace">TRANSITION</text>
    <text x="395" y="141" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">30 jours calendaires</text>
    <text x="642" y="211" fill="#c5a66f" font-size="13" font-family="ui-monospace, monospace">RÉCUPÉRATION</text>
    <text x="647" y="236" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">30 jours minimum</text>
    <text x="786" y="116" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">Effacement</text>
    <path d="M330 170v105h100" fill="none" stroke="#aa9cc4" stroke-width="2" />
    <path d="M420 267l10 8-10 8" fill="none" stroke="#aa9cc4" stroke-width="2" />
    <rect x="430" y="276" width="398" height="118" rx="16" fill="#121816" stroke="#aa9cc4" />
    <text x="456" y="310" fill="#aa9cc4" font-size="13" font-family="ui-monospace, monospace">IMPOSSIBILITÉ TECHNIQUE JUSTIFIÉE</text>
    <text x="456" y="340" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">Information sous 14 jours ouvrables</text>
    <text x="456" y="370" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Période alternative : 7 mois maximum</text>
    <text x="62" y="424" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Le client peut choisir une transition plus longue. Les délais doivent rester reliés aux conditions réelles du contrat.</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 340 920" role="img" aria-labelledby="data-act-timeline-mobile-title data-act-timeline-mobile-desc">
    <title id="data-act-timeline-mobile-title">Délais du changement de fournisseur prévus par l’article 25 du Data Act</title>
    <desc id="data-act-timeline-mobile-desc">La notification ouvre un préavis maximal de deux mois, suivi d’une transition normalement limitée à trente jours calendaires. Une impossibilité technique justifiée sous quatorze jours ouvrables peut conduire à une transition alternative de sept mois au maximum. Après la transition, le client dispose d’au moins trente jours pour récupérer ses données avant leur effacement.</desc>
    <rect x="20" y="20" width="300" height="860" rx="18" fill="#0b100f" stroke="#33413c" />
    <text x="42" y="56" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">PARCOURS NORMAL</text>
    <path d="M70 105v430" stroke="#52645e" stroke-width="3" />
    <circle cx="70" cy="105" r="10" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="70" cy="235" r="10" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="70" cy="365" r="10" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <circle cx="70" cy="495" r="10" fill="#121816" stroke="#c5a66f" stroke-width="3" />
    <text x="100" y="102" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">NOTIFICATION</text>
    <text x="100" y="132" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Demande du client</text>
    <text x="100" y="232" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">PRÉAVIS</text>
    <text x="100" y="262" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">2 mois maximum</text>
    <text x="100" y="362" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">TRANSITION</text>
    <text x="100" y="392" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">30 jours calendaires</text>
    <text x="100" y="492" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">RÉCUPÉRATION</text>
    <text x="100" y="522" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">30 jours minimum</text>
    <rect x="42" y="590" width="256" height="212" rx="15" fill="#121816" stroke="#aa9cc4" />
    <text x="62" y="624" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">AUTRE PARCOURS</text>
    <text x="62" y="660" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">Impossibilité technique</text>
    <text x="62" y="688" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Justification sous 14 jours ouvrables</text>
    <text x="62" y="730" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">Transition alternative</text>
    <text x="62" y="758" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">7 mois maximum</text>
    <text x="42" y="844" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Effacement après récupération et clôture.</text>
  </svg>
  <figcaption>Délais issus de l’article 25 du règlement (UE) 2023/2854. La branche longue suppose une impossibilité technique motivée par le fournisseur.</figcaption>
</figure>

Le fournisseur source doit assister le client et les tiers autorisés, maintenir une continuité raisonnable, fournir les informations nécessaires et conserver un niveau de sécurité élevé pendant le changement. Si trente jours sont techniquement insuffisants, il doit informer le client dans les quatorze jours ouvrables suivant la demande, justifier l’impossibilité et proposer une période alternative qui ne dépasse pas sept mois. Le client peut aussi choisir une période de transition plus longue, adaptée à ses besoins.

Après la transition, le contrat doit prévoir une période minimale de trente jours calendaires pour récupérer les données. L’effacement intervient à son terme, sauf date ultérieure convenue, une fois le changement mené à bien.

Ces maxima ne constituent ni un objectif de reprise ni une garantie de continuité métier. Une organisation qui découvre le format de ses exports après la notification peut consommer le préavis en analyse, puis la transition en corrections. Le test préalable permet de mesurer la durée réellement nécessaire avant de s’engager sur une date.

## IaaS, PaaS et SaaS ne portent pas la même obligation technique

L’article 30 distingue l’infrastructure des autres modèles de service. Présenter tous les fournisseurs comme responsables du rétablissement complet chez un concurrent créerait une attente que le texte ne soutient pas.

| Modèle | Obligation technique centrale du fournisseur source | Limite à retenir |
| --- | --- | --- |
| IaaS | Prendre toutes les mesures raisonnables pour faciliter l’équivalence fonctionnelle dans un service de destination du même type, notamment par les capacités, informations, documentations, appuis techniques et outils appropriés | Le fournisseur source n’a pas à reconstruire le service dans l’environnement du fournisseur de destination |
| PaaS | Mettre gratuitement des interfaces ouvertes à disposition du client et du fournisseur de destination, puis permettre l’export dans un format structuré, couramment utilisé et lisible par machine | La disponibilité d’une interface ne garantit ni la compatibilité des composants ni la reprise des comportements propres à la plateforme |
| SaaS | Même socle d’interfaces ouvertes et d’export structuré lorsqu’il s’agit d’un service de traitement de données au sens du règlement | La réimplantation des règles métier, intégrations et automatismes peut rester à la charge du client et du fournisseur de destination |

La FAQ officielle précise aussi le traitement des services développés sur mesure et non proposés à grande échelle. L’article 31 leur applique un régime particulier, mais ne les exclut pas intégralement du chapitre VI. Les interfaces ouvertes et l’export structuré restent notamment cités par la Commission. Les services de test ou d’évaluation, fournis pour une durée limitée hors production, relèvent d’une autre exemption étroite.

La qualification doit donc être établie service par service. Le nom commercial « SaaS » ou « cloud privé » ne remplace ni la définition de l’article 2 ni l’analyse des caractéristiques du contrat.

## La gratuité de 2027 laisse plusieurs coûts hors champ

Du 11 janvier 2024 au 12 janvier 2027, le fournisseur peut facturer des frais réduits de changement de fournisseur. L’article 29 plafonne ces frais aux coûts directement liés à l’opération concernée. À partir du 12 janvier 2027, il ne peut plus imposer de tels frais au client pour la procédure de changement.

Le mot « gratuit » serait pourtant trompeur. La définition réglementaire des frais de changement de fournisseur exclut les frais de service standard et les pénalités de résiliation anticipée. Avant la conclusion du contrat, le fournisseur doit communiquer clairement ces montants ainsi que les frais réduits applicables pendant la période transitoire.

| Poste | Situation au 12 janvier 2027 | Vérification utile |
| --- | --- | --- |
| Assistance ou opération facturée au titre du changement de fournisseur | Frais de changement interdits | Devis détaillé, base contractuelle et qualification de chaque ligne |
| Sortie ponctuelle de données liée au changement | Incluse dans la suppression des frais de changement selon la FAQ de la Commission | Volume, fenêtre, destination et preuve du lien avec la procédure |
| Frais de service standard jusqu’à l’échéance | Non supprimés par l’article 29 | Durée ferme, échéance, préavis et facturation résiduelle |
| Pénalité de résiliation anticipée | Distincte des frais de changement dans le règlement en vigueur | Clause, montant, transparence précontractuelle et droit national applicable |
| Sortie continue de données dans un usage multicloud parallèle | Peut rester facturée selon la FAQ, car elle ne correspond pas à une sortie ponctuelle | Politique tarifaire, volumes courants et architecture cible |
| Adaptation, restauration et qualification chez le fournisseur de destination | Hors prix imposé au fournisseur source par l’article 29 | Budget interne, prestation de destination, outillage et temps d’arrêt |

Cette séparation impose une discipline de chiffrage. Un fournisseur qui annonce « zéro frais de sortie » peut respecter l’article 29 tout en laissant subsister une échéance ferme, des coûts de destination et un travail important de transformation. La décision doit comparer le coût complet du scénario, pas une seule ligne tarifaire.

## Le contrat doit permettre une sortie observable

L’article 25 exige un contrat écrit et disponible avant signature. Il impose notamment les modalités d’information du fournisseur, les droits et obligations pendant le changement, les catégories de données et actifs portables, les exclusions, le délai de récupération et l’effacement.

Les [clauses contractuelles types publiées par la Commission](https://digital-strategy.ec.europa.eu/en/library/draft-recommendation-non-binding-model-contractual-terms-data-access-and-use-and-non-binding) sont volontaires. Trois ensembles traduisent directement le chapitre VI : changement et sortie, résiliation, sécurité et continuité d’activité. Trois autres traitent l’absence de dispersion des clauses, la protection contre les modifications injustifiées et la responsabilité. Elles constituent une base de négociation, pas une certification de conformité du contrat final.

Une revue utile doit relier chaque clause à une action et à une trace :

| Engagement contractuel | Action à tester | Preuve attendue |
| --- | --- | --- |
| Catégories de données exportables | Générer un export complet sur un dossier représentatif | Inventaire, manifeste, schémas, volumes, dates et empreintes |
| Actifs numériques | Relever les configurations, droits et composants nécessaires | Liste versionnée, droits d’usage et dépendances |
| Assistance du fournisseur | Ouvrir une demande selon le canal contractuel | Horodatage, interlocuteurs, réponses, limites et délais |
| Continuité pendant la transition | Exécuter l’export sans dégrader un service critique | Mesures de disponibilité, incidents et décisions |
| Récupération | Importer les données dans une destination contrôlée | Journaux, erreurs, éléments manquants et résultat d’intégrité |
| Effacement | Fermer la période de récupération puis demander la suppression | Confirmation du fournisseur, périmètre, date et exceptions de conservation |

## Une réversibilité défendable se teste de bout en bout

Le protocole suivant est une proposition opérationnelle de BLACKPROOF. Il ne constitue ni un délai réglementaire supplémentaire ni une interprétation officielle. Son objectif est de produire un dossier que les équipes sécurité, juridique, achats, produit et exploitation peuvent relire ensemble.

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 500" role="img" aria-labelledby="data-act-proof-title data-act-proof-desc">
    <title id="data-act-proof-title">Chaîne de preuve d’un test de réversibilité cloud</title>
    <desc id="data-act-proof-desc">Le test relie le contrat, l’inventaire, l’export, les contrôles d’intégrité, la restauration, la validation métier, puis la révocation des accès et l’effacement. Chaque étape produit une preuve et un écart éventuel.</desc>
    <rect x="28" y="38" width="864" height="400" rx="22" fill="#0b100f" stroke="#33413c" />
    <text x="58" y="74" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">PROTOCOLE BLACKPROOF</text>
    <path d="M82 158H838" stroke="#52645e" stroke-width="3" />
    <circle cx="82" cy="158" r="11" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="208" cy="158" r="11" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="334" cy="158" r="11" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <circle cx="460" cy="158" r="11" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <circle cx="586" cy="158" r="11" fill="#121816" stroke="#c5a66f" stroke-width="3" />
    <circle cx="712" cy="158" r="11" fill="#121816" stroke="#c5a66f" stroke-width="3" />
    <circle cx="838" cy="158" r="11" fill="#121816" stroke="#78827c" stroke-width="3" />
    <text x="52" y="112" fill="#f1f4f0" font-size="14" font-family="system-ui, sans-serif">Contrat</text>
    <text x="176" y="198" fill="#f1f4f0" font-size="14" font-family="system-ui, sans-serif">Inventaire</text>
    <text x="307" y="112" fill="#f1f4f0" font-size="14" font-family="system-ui, sans-serif">Export</text>
    <text x="436" y="198" fill="#f1f4f0" font-size="14" font-family="system-ui, sans-serif">Intégrité</text>
    <text x="550" y="112" fill="#f1f4f0" font-size="14" font-family="system-ui, sans-serif">Restauration</text>
    <text x="674" y="198" fill="#f1f4f0" font-size="14" font-family="system-ui, sans-serif">Validation</text>
    <text x="802" y="112" fill="#f1f4f0" font-size="14" font-family="system-ui, sans-serif">Clôture</text>
    <rect x="60" y="250" width="800" height="132" rx="17" fill="#121816" stroke="#33413c" />
    <text x="88" y="286" fill="#aa9cc4" font-size="13" font-family="ui-monospace, monospace">DOSSIER DE PREUVE</text>
    <text x="88" y="320" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">Versions · horodatages · empreintes · journaux · critères d’acceptation · décisions</text>
    <text x="88" y="350" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Chaque écart reçoit un responsable, une échéance et une nouvelle vérification.</text>
    <text x="60" y="416" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Résultat attendu : savoir reprendre un service, pas seulement télécharger une archive.</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 340 980" role="img" aria-labelledby="data-act-proof-mobile-title data-act-proof-mobile-desc">
    <title id="data-act-proof-mobile-title">Chaîne de preuve d’un test de réversibilité cloud</title>
    <desc id="data-act-proof-mobile-desc">Le test relie le contrat, l’inventaire, l’export, les contrôles d’intégrité, la restauration, la validation métier, puis la révocation des accès et l’effacement. Chaque étape produit une preuve et un écart éventuel.</desc>
    <rect x="20" y="20" width="300" height="930" rx="18" fill="#0b100f" stroke="#33413c" />
    <text x="42" y="56" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">PROTOCOLE BLACKPROOF</text>
    <path d="M68 104v560" stroke="#52645e" stroke-width="3" />
    <circle cx="68" cy="104" r="10" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="68" cy="194" r="10" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="68" cy="284" r="10" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <circle cx="68" cy="374" r="10" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <circle cx="68" cy="464" r="10" fill="#121816" stroke="#c5a66f" stroke-width="3" />
    <circle cx="68" cy="554" r="10" fill="#121816" stroke="#c5a66f" stroke-width="3" />
    <circle cx="68" cy="644" r="10" fill="#121816" stroke="#78827c" stroke-width="3" />
    <text x="98" y="110" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Contrat et scénario</text>
    <text x="98" y="200" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Inventaire des actifs</text>
    <text x="98" y="290" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Export représentatif</text>
    <text x="98" y="380" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Contrôles d’intégrité</text>
    <text x="98" y="470" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Restauration</text>
    <text x="98" y="560" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Validation métier</text>
    <text x="98" y="650" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Révocation et effacement</text>
    <rect x="42" y="724" width="256" height="170" rx="15" fill="#121816" stroke="#33413c" />
    <text x="62" y="758" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">PREUVES</text>
    <text x="62" y="798" fill="#f1f4f0" font-size="14" font-family="system-ui, sans-serif">Versions et horodatages</text>
    <text x="62" y="829" fill="#f1f4f0" font-size="14" font-family="system-ui, sans-serif">Empreintes et journaux</text>
    <text x="62" y="860" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Critères, décisions et écarts</text>
    <text x="42" y="924" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">La reprise doit être observée et relue.</text>
  </svg>
  <figcaption>Proposition méthodologique BLACKPROOF. Le règlement fixe les droits et obligations, tandis que le protocole organise les preuves de leur exécution.</figcaption>
</figure>

### 1. Délimiter le scénario

Le dossier nomme le service source, la destination, le périmètre, la date de référence, le motif de sortie et les fonctions concernées. Il distingue un transfert complet, une réinternalisation, une suppression sans transfert et un usage multicloud parallèle, car les obligations et les coûts ne sont pas identiques.

### 2. Geler l’inventaire

Les données, actifs numériques, interfaces, identités, secrets, dépendances et exclusions sont placés dans un inventaire versionné. Chaque exclusion doit renvoyer au contrat ou à une limite technique identifiée, pas à une appréciation orale.

### 3. Produire et contrôler l’export

L’équipe enregistre la version du service, l’heure de début et de fin, le compte utilisé, les volumes, les formats, les erreurs et les empreintes cryptographiques. Les journaux contenant des données personnelles ou des secrets sont expurgés avant partage, sans supprimer les éléments nécessaires à la vérification.

### 4. Restaurer dans une destination distincte

Le test importe l’export sans dépendre de la session source. Les schémas, relations, droits, configurations et automatismes sont contrôlés séparément. Pour l’IaaS, l’évaluation porte sur le résultat matériellement comparable et sur l’assistance fournie par la source, pas sur une identité parfaite entre deux environnements.

### 5. Valider avec des critères métier

Le service restauré exécute un petit ensemble d’opérations représentatives définies avant le test. Les critères portent sur l’exactitude des données, la sécurité, les droits, les performances nécessaires et les fonctions indispensables. Un export techniquement lisible mais inutilisable par les métiers reste un échec de réversibilité.

### 6. Fermer les accès et les données

La clôture recense les identités révoquées, les clés renouvelées, les intégrations arrêtées, les données encore récupérables et la confirmation d’effacement. Les obligations de conservation légale ou les sauvegardes résiduelles doivent être documentées avec leur périmètre et leur durée.

## Le Digital Omnibus reste une proposition

La Commission a présenté la [proposition COM(2025) 837](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=COM%3A2025%3A0837%3AFIN) le 19 novembre 2025. Pour le chapitre VI du Data Act, le texte proposé prévoit notamment :

- un régime allégé pour certains services conçus sur mesure, non disponibles sur étagère et inutilisables sans adaptation préalable à l’écosystème du client, lorsqu’ils reposent sur un contrat conclu au plus tard le 12 septembre 2025 ;
- un régime allégé pour certains services autres que l’IaaS fournis par une PME ou une petite entreprise à moyenne capitalisation sur la base d’un contrat conclu au plus tard à cette même date ;
- la possibilité explicite de prévoir des pénalités proportionnées de résiliation anticipée dans certains contrats à durée déterminée portant sur des services autres que l’IaaS.

La proposition maintient toutefois l’article 29 dans ces régimes allégés. La réduction puis la suppression des frais de changement de fournisseur ne serait donc pas écartée.

Au 23 juillet 2026, l’[Observatoire législatif du Parlement européen](https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2025%2F0360%28COD%29) classe la procédure 2025/0360(COD) dans l’état « awaiting committee decision ». Un projet de rapport de commission est daté du 22 juin 2026. Le texte de 2025 n’est donc pas le droit adopté. Les contrats doivent être évalués au regard du règlement en vigueur, avec une veille séparée sur les éventuelles modifications futures.

## Data Act et DORA répondent à deux contrôles différents

Le Data Act est transversal. Il impose des obligations au fournisseur de services de traitement de données et organise les droits du client pendant la sortie. [DORA](https://eur-lex.europa.eu/eli/reg/2022/2554/oj/fra) vise les entités financières et demande, pour les services ICT soutenant des fonctions critiques ou importantes, des stratégies de sortie complètes, documentées, suffisamment testées et revues périodiquement.

Une entité financière peut donc mobiliser le contrat Data Act pour obtenir un export, une assistance et un calendrier, sans avoir encore satisfait son propre devoir DORA de préparer la continuité. À l’inverse, un plan DORA interne ne remplace pas les clauses nécessaires face au fournisseur.

Notre [analyse sur les dépendances ICT et les plans de sortie DORA](/analyses/dora-sous-traitance-ict-dependances-plans-sortie) approfondit cette articulation pour le secteur financier.

## Plan d’action en trente jours

Ce calendrier est une proposition de préparation interne. Il ne correspond pas à la période de transition réglementaire de l’article 25.

### Jours 1 à 7 : contrat et qualification

- qualifier chaque service à partir de la définition réglementaire, sans se limiter à son étiquette commerciale ;
- relever préavis, durée ferme, frais, assistance, catégories exportables, exclusions, récupération et effacement ;
- identifier les divergences entre contrat principal, annexes, documentation publique et console.

### Jours 8 à 14 : inventaire et export

- construire l’inventaire des données et actifs numériques ;
- produire un export représentatif ;
- documenter format, schéma, volume, durée, coût, erreurs et intégrité ;
- ouvrir les demandes d’assistance prévues au contrat.

### Jours 15 à 23 : restauration et validation

- restaurer dans une destination distincte ;
- tester les identités, les règles métier, les intégrations et les contrôles de sécurité ;
- mesurer le temps de reprise et la charge humaine ;
- classer les écarts qui empêchent une sortie dans les délais.

### Jours 24 à 30 : décision et preuve

- chiffrer les frais réglementés et les coûts hors champ séparément ;
- corriger ou renégocier les clauses bloquantes ;
- approuver le scénario, les critères et les responsabilités ;
- assembler les pièces selon une [méthode de preuve traçable](/method), puis enregistrer les manques dans une [dette de preuve](/proofdebt).

## Questions ouvertes avant toute décision

1. Le service entre-t-il dans la définition réglementaire ou le client utilise-t-il seulement une fonctionnalité appuyée sur une infrastructure cloud ?
2. Le scénario est-il un changement complet, une réinternalisation, une suppression ou un usage multicloud parallèle ?
3. Les données exportables et les actifs numériques sont-ils énumérés avec assez de précision pour être restaurés ?
4. Les exclusions invoquées protègent-elles réellement un secret d’affaires sans empêcher ni retarder la sortie ?
5. Le délai contractuel commence-t-il au bon événement et distingue-t-il préavis, transition, récupération et effacement ?
6. Le devis sépare-t-il frais de changement, service standard, pénalité de résiliation, sortie continue de données et travail de destination ?
7. Les critères d’acceptation permettent-ils de juger un résultat comparable sans exiger du fournisseur source une reconstruction qu’il ne contrôle pas ?
8. La preuve d’effacement couvre-t-elle les données actives, les copies temporaires et les sauvegardes selon leurs cycles documentés ?

## Limites de l’analyse

Cette analyse traite principalement le chapitre VI du Data Act et les services de traitement de données. Elle ne couvre pas en détail l’accès aux données de produits connectés, les demandes du secteur public, les clauses abusives de partage de données ni le régime complet de protection des données personnelles.

Le règlement ne supprime pas les obligations issues du RGPD, du droit des contrats, du secret des affaires ou des règles sectorielles. La qualification d’un service, la validité d’une pénalité et l’étendue d’une obligation peuvent dépendre du contrat et du droit applicable. Une décision contentieuse ou une opération de sortie à fort impact appelle une revue juridique dédiée.

Les recommandations de test, la matrice de preuve et le plan de trente jours sont des propositions méthodologiques de BLACKPROOF. Elles ne sont pas présentées comme des obligations ajoutées par le Data Act.

Les sources ont été contrôlées le 23 juillet 2026. Le statut de la procédure 2025/0360(COD) doit être revérifié avant toute décision fondée sur le Digital Omnibus.
