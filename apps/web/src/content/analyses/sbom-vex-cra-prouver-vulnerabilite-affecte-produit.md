---
title: "SBOM et VEX sous le CRA : prouver qu’une vulnérabilité affecte, ou non, un produit"
description: "Une méthode traçable pour relier composant, vulnérabilité, exploitabilité, produit exact et décision sans confondre inventaire et preuve."
publishedAt: 2026-07-30
updatedAt: 2026-07-30
category: "Chaîne d’approvisionnement"
format: "Méthode"
confidence: "Confiance élevée"
author: "Rédaction BLACKPROOF"
tags:
  - SBOM
  - VEX
  - Cyber Resilience Act
  - CSAF
  - vulnérabilité
  - chaîne logicielle
readingMinutes: 22
featured: true
draft: false
sources:
  - title: "Règlement (UE) 2024/2847 concernant des exigences de cybersécurité horizontales pour les produits comportant des éléments numériques"
    publisher: "Journal officiel de l’Union européenne"
    url: "https://eur-lex.europa.eu/eli/reg/2024/2847/oj/fra"
    kind: "Source primaire"
    publicationDate: 2024-11-20
    consultedAt: 2026-07-30
  - title: "Guidelines on the application of the Cyber Resilience Act"
    publisher: "Commission européenne"
    url: "https://ec.europa.eu/newsroom/dae/redirection/document/131456"
    kind: "Source institutionnelle"
    publicationDate: 2026-07-27
    consultedAt: 2026-07-30
  - title: "Cyber Resilience Act implementation"
    publisher: "Commission européenne"
    url: "https://digital-strategy.ec.europa.eu/en/policies/cyber-resilience-act-implementation"
    kind: "Source institutionnelle"
    consultedAt: 2026-07-30
  - title: "SBOM Adoption State of Play 2026"
    publisher: "ENISA"
    url: "https://www.enisa.europa.eu/publications/sbom-adoption-state-of-play-2026"
    kind: "Source institutionnelle"
    publicationDate: 2026-06-09
    consultedAt: 2026-07-30
  - title: "Common Security Advisory Framework Version 2.0"
    publisher: "OASIS Open"
    url: "https://docs.oasis-open.org/csaf/csaf/v2.0/os/csaf-v2.0-os.html"
    kind: "Source primaire"
    publicationDate: 2022-11-18
    consultedAt: 2026-07-30
  - title: "Minimum Requirements for Vulnerability Exploitability eXchange"
    publisher: "Cybersecurity and Infrastructure Security Agency"
    url: "https://www.cisa.gov/sites/default/files/2023-04/minimum-requirements-for-vex-508c.pdf"
    kind: "Source institutionnelle"
    consultedAt: 2026-07-30
  - title: "Technical Guideline TR-03183 Cyber Resilience Requirements for Manufacturers and Products, Part 2: Software Bill of Materials"
    publisher: "Bundesamt für Sicherheit in der Informationstechnik"
    url: "https://www.bsi.bund.de/EN/Themen/Unternehmen-und-Organisationen/Standards-und-Zertifizierung/Technische-Richtlinien/TR-nach-Thema-sortiert/tr03183/tr-03183.html"
    kind: "Source institutionnelle"
    consultedAt: 2026-07-30
---

Une alerte associe une CVE à une bibliothèque retrouvée dans un produit. Le produit est-il affecté ? La réponse peut être oui, non, ou pas encore établie. Elle ne se déduit ni du seul inventaire des composants, ni du seul score de la vulnérabilité, ni de l’absence d’exploitation observée.

Le [Cyber Resilience Act](https://eur-lex.europa.eu/eli/reg/2024/2847/oj/fra) impose aux fabricants d’identifier et de documenter les vulnérabilités et les composants de leurs produits, notamment au moyen d’une nomenclature logicielle, ou SBOM. Il leur impose aussi de traiter les vulnérabilités et, à partir du 11 septembre 2026, de signaler celles qui sont activement exploitées dans leurs produits. Le règlement ne transforme pourtant pas chaque correspondance entre un composant et une CVE en constat d’exploitabilité.

La [guidance C(2026) 5252 publiée par la Commission le 27 juillet 2026](https://ec.europa.eu/newsroom/dae/redirection/document/131456) le précise au paragraphe 218 : si le code vulnérable d’un composant tiers n’est pas atteignable, ou si la vulnérabilité n’est pas exploitée dans le produit du fabricant, cette vulnérabilité ne relève pas pour lui du signalement obligatoire de l’article 14. Elle reste soumise aux obligations de traitement des vulnérabilités et peut appeler un signalement volontaire ainsi qu’une information du fournisseur du composant.

> Conclusion courte : la SBOM dit ce qui compose une version du produit. Un VEX peut déclarer comment une vulnérabilité s’applique à un produit précis. La preuve réside dans la chaîne qui relie ces deux objets à l’artefact livré, aux conditions d’exploitation, aux tests, à la décision et à sa date de réexamen.

## Trois objets, trois questions

Les sigles masquent parfois la fonction réelle des documents. Leur séparation évite de demander à un fichier plus qu’il ne peut établir.

| Objet | Question principale | Limite |
| --- | --- | --- |
| SBOM | Quels composants et relations de dépendance sont inclus dans le logiciel du produit ? | Elle n’établit pas, à elle seule, que le code vulnérable est présent, atteignable ou exploitable. |
| Avis de vulnérabilité | Quelle faille est décrite, pour quelles versions du composant et avec quelles informations disponibles ? | Il ne connaît pas nécessairement le produit qui intègre le composant, sa compilation ou sa configuration. |
| VEX | Quel statut l’émetteur attribue-t-il à un produit précis vis-à-vis d’une vulnérabilité précise ? | C’est une assertion structurée. Sa fiabilité dépend de l’identité de l’émetteur, du périmètre, de la justification et des preuves conservées. |

Le CRA définit la SBOM comme un enregistrement formel contenant les détails et les relations de la chaîne d’approvisionnement des composants inclus dans les éléments logiciels d’un produit. L’annexe I, partie II, point 1, demande un format couramment utilisé et lisible par machine, couvrant au minimum les dépendances de premier niveau.

Le règlement ne définit pas le VEX et ne l’impose pas comme format de conformité. Le VEX est un instrument opérationnel, spécifié notamment dans le profil VEX de [CSAF 2.0](https://docs.oasis-open.org/csaf/csaf/v2.0/os/csaf-v2.0-os.html) et dans les [exigences minimales publiées par la CISA](https://www.cisa.gov/sites/default/files/2023-04/minimum-requirements-for-vex-508c.pdf). Il peut rendre une conclusion exploitable par une machine, mais ne remplace ni l’analyse de risque du CRA, ni le dossier technique, ni la responsabilité du fabricant.

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 520" role="img" aria-labelledby="sbom-vex-chain-title sbom-vex-chain-desc">
    <title id="sbom-vex-chain-title">Chaîne de qualification d’une vulnérabilité dans un produit</title>
    <desc id="sbom-vex-chain-desc">Un produit et une version exacts conduisent à une SBOM, puis à une correspondance avec une vulnérabilité, une analyse technique d’exploitabilité, une déclaration VEX et une décision assortie d’une échéance de réexamen.</desc>
    <path d="M160 166H760" stroke="#52645e" stroke-width="4" />
    <path d="M760 166l-13-8v16z" fill="#52645e" />
    <rect x="24" y="102" width="152" height="128" rx="18" fill="#121816" stroke="#81dacb" />
    <text x="48" y="137" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">PÉRIMÈTRE</text>
    <text x="48" y="172" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Produit</text>
    <text x="48" y="198" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Version, build, hash</text>
    <rect x="204" y="102" width="152" height="128" rx="18" fill="#121816" stroke="#aa9cc4" />
    <text x="228" y="137" fill="#aa9cc4" font-size="13" font-family="ui-monospace, monospace">INVENTAIRE</text>
    <text x="228" y="172" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">SBOM</text>
    <text x="228" y="198" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Composants, relations</text>
    <rect x="384" y="102" width="152" height="128" rx="18" fill="#121816" stroke="#c5a66f" />
    <text x="408" y="137" fill="#c5a66f" font-size="13" font-family="ui-monospace, monospace">SIGNAL</text>
    <text x="408" y="172" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Correspondance</text>
    <text x="408" y="198" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Version et CVE</text>
    <rect x="564" y="102" width="152" height="128" rx="18" fill="#121816" stroke="#dd8f72" />
    <text x="588" y="137" fill="#dd8f72" font-size="13" font-family="ui-monospace, monospace">ANALYSE</text>
    <text x="588" y="172" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Exploitabilité</text>
    <text x="588" y="198" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Code, chemin, contrôle</text>
    <rect x="744" y="102" width="152" height="128" rx="18" fill="#121816" stroke="#81dacb" />
    <text x="768" y="137" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">DÉCLARATION</text>
    <text x="768" y="172" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">VEX</text>
    <text x="768" y="198" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Statut et justification</text>
    <path d="M820 230v78H100v-78" fill="none" stroke="#33413c" stroke-width="3" stroke-dasharray="7 7" />
    <rect x="170" y="308" width="580" height="132" rx="20" fill="#0b100f" stroke="#52645e" />
    <text x="205" y="346" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">Décision vérifiable et révisable</text>
    <text x="205" y="380" fill="#a3ada6" font-size="15" font-family="system-ui, sans-serif">Action, propriétaire, éléments de preuve, date et déclencheurs de réexamen</text>
    <text x="205" y="411" fill="#81dacb" font-size="14" font-family="ui-monospace, monospace">AUCUN MAILLON NE SUFFIT SEUL</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 340 960" role="img" aria-labelledby="sbom-vex-chain-mobile-title sbom-vex-chain-mobile-desc">
    <title id="sbom-vex-chain-mobile-title">Chaîne de qualification d’une vulnérabilité dans un produit</title>
    <desc id="sbom-vex-chain-mobile-desc">Un produit et une version exacts conduisent à une SBOM, puis à une correspondance avec une vulnérabilité, une analyse technique d’exploitabilité, une déclaration VEX et une décision assortie d’une échéance de réexamen.</desc>
    <path d="M48 112v650" stroke="#52645e" stroke-width="4" />
    <path d="M48 762l-8-13h16z" fill="#52645e" />
    <rect x="72" y="30" width="244" height="122" rx="18" fill="#121816" stroke="#81dacb" />
    <text x="96" y="62" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">PÉRIMÈTRE</text>
    <text x="96" y="92" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Produit exact</text>
    <text x="96" y="120" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Version, build, hash</text>
    <rect x="72" y="172" width="244" height="122" rx="18" fill="#121816" stroke="#aa9cc4" />
    <text x="96" y="204" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">INVENTAIRE</text>
    <text x="96" y="234" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">SBOM</text>
    <text x="96" y="262" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Composants et relations</text>
    <rect x="72" y="314" width="244" height="122" rx="18" fill="#121816" stroke="#c5a66f" />
    <text x="96" y="346" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">SIGNAL</text>
    <text x="96" y="376" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Version et CVE</text>
    <text x="96" y="404" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Correspondance à vérifier</text>
    <rect x="72" y="456" width="244" height="122" rx="18" fill="#121816" stroke="#dd8f72" />
    <text x="96" y="488" fill="#dd8f72" font-size="12" font-family="ui-monospace, monospace">ANALYSE</text>
    <text x="96" y="518" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Exploitabilité</text>
    <text x="96" y="546" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Code, chemin, contrôle</text>
    <rect x="72" y="598" width="244" height="122" rx="18" fill="#121816" stroke="#81dacb" />
    <text x="96" y="630" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">DÉCLARATION</text>
    <text x="96" y="660" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">VEX</text>
    <text x="96" y="688" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Statut et justification</text>
    <rect x="20" y="784" width="300" height="144" rx="20" fill="#0b100f" stroke="#52645e" />
    <text x="42" y="820" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Décision révisable</text>
    <text x="42" y="852" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Action, preuves, propriétaire,</text>
    <text x="42" y="876" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">date et déclencheurs.</text>
    <text x="42" y="904" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">AUCUN MAILLON NE SUFFIT SEUL</text>
  </svg>
  <figcaption>Modèle opérationnel BLACKPROOF. Il organise les éléments nécessaires à la décision, sans ajouter une obligation de format au CRA.</figcaption>
</figure>

## Le CRA demande une SBOM, pas sa publication générale

L’annexe I du règlement oblige le fabricant à identifier et documenter les vulnérabilités et les composants contenus dans le produit, en établissant une SBOM dans un format lisible par machine. L’annexe VII place aussi cette nomenclature dans la documentation technique et demande de décrire le processus de traitement des vulnérabilités.

Cette obligation ne signifie pas que la SBOM complète doit être rendue publique. Deux passages fixent une frontière plus précise :

- l’annexe VII prévoit sa transmission à une autorité de surveillance du marché sur demande motivée, lorsque l’accès est nécessaire pour contrôler la conformité ;
- l’annexe II demande d’indiquer où la SBOM est accessible aux utilisateurs seulement si le fabricant décide de la leur fournir.

La [guidance de la Commission](https://ec.europa.eu/newsroom/dae/redirection/document/131456), au paragraphe 220, ajoute une logique de proportionnalité : une information détaillée n’a pas à être rendue publique ou communiquée sans discernement. Dans les environnements sensibles, les détails techniques peuvent être limités. Une politique de partage peut donc distinguer un VEX public, une information client authentifiée et un dossier complet accessible à l’autorité compétente, à condition de ne pas masquer une information de sécurité que les utilisateurs doivent recevoir.

Le contenu exact et le format de la SBOM peuvent encore être précisés par un acte d’exécution au titre de l’article 13, paragraphe 24. Sur sa [page consacrée à la mise en œuvre du CRA](https://digital-strategy.ec.europa.eu/en/policies/cyber-resilience-act-implementation), consultée le 30 juillet 2026, la Commission annonçait les premiers livrables de normalisation pour le troisième trimestre 2026 et ne listait pas encore un tel acte. Cette situation est datée : elle doit être revérifiée avant d’arrêter un format contractuel ou un dossier de conformité.

## Une adoption réelle, mais encore incomplète

L’[enquête 2026 de l’ENISA](https://www.enisa.europa.eu/publications/sbom-adoption-state-of-play-2026) fournit un état des pratiques, avec une limite importante : ses 334 réponses, recueillies à la fin de 2025, proviennent pour plus de 65 % d’organisations de plus de 250 salariés et pour environ 65 % d’organisations établies dans l’Union. Les résultats ne décrivent donc pas mécaniquement toutes les entreprises européennes.

Dans cet échantillon :

- 78 % des répondants avaient commencé leur adoption de la SBOM ;
- 44 % se situaient encore au stade du pilote ou d’un déploiement limité ;
- 25 % déclaraient une adoption large ;
- 9 % déclaraient une pratique mature et entièrement automatisée ;
- 62 % citaient l’exhaustivité parmi les difficultés techniques ;
- 37 % citaient la qualité des données ;
- 35 % jugeaient la mise en correspondance des vulnérabilités « assez difficile » et 23 % « extrêmement difficile ».

L’ENISA rapporte aussi CycloneDX comme format le plus utilisé par les répondants, à 44 %, devant SPDX à 29 %. Ces pourcentages décrivent les réponses reçues, pas une hiérarchie juridique : le CRA ne désigne aucun de ces formats dans son texte.

Le constat utile est moins spectaculaire que le slogan. Produire un fichier SBOM est devenu courant. Garantir qu’il correspond à l’artefact livré, qu’il est assez complet pour l’usage visé et qu’il permet une qualification fiable des vulnérabilités reste un travail d’ingénierie et de gouvernance.

## Une correspondance CVE n’est qu’un signal

Une plateforme de gestion des vulnérabilités rapproche généralement un identifiant de composant, sa version et un avis de vulnérabilité. Cette opération peut générer des faux positifs et des faux négatifs pour plusieurs raisons : version mal identifiée, composant renommé, correctif rétroporté sans changement de version, plage de versions imprécise, code exclu à la compilation, bibliothèque incluse mais jamais appelée, fonctionnalité désactivée ou données d’avis mises à jour après l’analyse.

La qualification doit progresser par questions séparées :

1. **Le composant est-il présent dans l’artefact exact ?** La réponse doit viser le binaire, l’image, le paquet ou le firmware distribué, pas seulement un fichier de dépendances du dépôt source.
2. **La version ou la révision vulnérable est-elle présente ?** Une étiquette de version peut ne pas révéler un correctif rétroporté. Le patch, le commit ou le contenu binaire peuvent devenir nécessaires.
3. **Le code vulnérable est-il inclus ?** Des options de compilation, l’édition de liens ou la génération du paquet peuvent l’avoir exclu.
4. **Le code peut-il être exécuté dans le produit ?** Une fonction présente mais non appelée n’a pas le même statut qu’un chemin réellement atteignable.
5. **Un adversaire peut-il contrôler les données ou conditions nécessaires ?** L’entrée, les privilèges, la configuration et la frontière de confiance doivent être établis.
6. **Des protections intégrées empêchent-elles complètement les vecteurs connus ?** Une réduction de probabilité ne suffit pas à conclure automatiquement à l’absence d’effet.
7. **Que reste-t-il inconnu ?** L’absence de preuve n’est pas une preuve d’absence. Le statut approprié peut être « en cours d’investigation ».

Le CRA définit une « vulnérabilité exploitable » par la possibilité de l’utiliser effectivement dans des conditions opérationnelles pratiques. Sa guidance, aux paragraphes 231 et 235, confirme qu’une vulnérabilité signalée ou trouvée dans une base publique n’est pas nécessairement applicable ou exploitable dans chaque produit. Le fabricant doit enquêter et confirmer.

## Quatre statuts VEX, sans statut par défaut

Le profil VEX de [CSAF 2.0](https://docs.oasis-open.org/csaf/csaf/v2.0/os/csaf-v2.0-os.html) encode quatre statuts :

- <code>known_<wbr>affected</code> : la vulnérabilité affecte le produit et une action de correction ou de réduction du risque est indiquée ;
- <code>known_<wbr>not_<wbr>affected</code> : l’émetteur déclare le produit non affecté et doit fournir une justification structurée ou un exposé d’impact ;
- `fixed` : le produit identifié contient le correctif ;
- <code>under_<wbr>investigation</code> : l’analyse n’a pas encore permis de conclure.

Le document de la CISA utilise les libellés `affected`, <code>not_<wbr>affected</code>, `fixed` et <code>under_<wbr>investigation</code>. Cette différence de vocabulaire entre formats n’autorise pas une traduction approximative des statuts. Le format choisi doit conserver sa sémantique normative.

La CISA précise également qu’il n’existe pas de statut par défaut et qu’un VEX peut être incomplet. Omettre une vulnérabilité ne signifie donc ni « non affecté », ni « aucune investigation en cours ». Pour automatiser sans créer une fausse assurance, le consommateur doit distinguer au moins trois cas : déclaration présente et valide, déclaration expirée ou contredite, absence de déclaration.

### Cinq justifications possibles pour « non affecté »

CSAF 2.0 et les exigences minimales de la CISA retiennent cinq familles :

1. <code>component_<wbr>not_<wbr>present</code> : le sous-composant vulnérable n’est pas dans le produit ;
2. <code>vulnerable_<wbr>code_<wbr>not_<wbr>present</code> : le composant est présent, mais le code vulnérable ne l’est pas ;
3. <code>vulnerable_<wbr>code_<wbr>not_<wbr>in_<wbr>execute_<wbr>path</code> : le code est présent, mais le produit ne l’appelle pas et ne peut pas l’exécuter ;
4. <code>vulnerable_<wbr>code_<wbr>cannot_<wbr>be_<wbr>controlled_<wbr>by_<wbr>adversary</code> : le code est utilisé, mais l’adversaire ne peut pas contrôler les conditions nécessaires à l’exploitation ;
5. <code>inline_<wbr>mitigations_<wbr>already_<wbr>exist</code> : des protections intégrées, non désactivables et non contournables par l’attaquant empêchent complètement les vecteurs connus.

Une mesure compensatoire externe ne devient pas automatiquement une justification de non-affectation. Un filtrage réseau, une règle de pare-feu ou une procédure d’exploitation peuvent réduire le risque tout en laissant le produit affecté. Dans ce cas, le statut « affecté » accompagné d’une mesure de réduction du risque est généralement plus fidèle que « non affecté ».

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 660" role="img" aria-labelledby="vex-decision-title vex-decision-desc">
    <title id="vex-decision-title">Arbre de décision pour attribuer un statut VEX</title>
    <desc id="vex-decision-desc">L’analyse vérifie le produit exact, la présence du composant et du code vulnérable, puis son exploitabilité. Une inconnue conduit à un statut en cours d’investigation, une atteinte confirmée à affecté, une absence justifiée à non affecté et une version corrigée à fixed.</desc>
    <rect x="330" y="24" width="260" height="72" rx="16" fill="#121816" stroke="#81dacb" />
    <text x="367" y="55" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Produit et build exacts</text>
    <text x="377" y="80" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Identité et SBOM reliées</text>
    <path d="M460 96v36" stroke="#52645e" stroke-width="3" />
    <rect x="300" y="132" width="320" height="78" rx="16" fill="#121816" stroke="#aa9cc4" />
    <text x="348" y="178" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Composant ou code vulnérable présent ?</text>
    <path d="M300 171H154v66" fill="none" stroke="#52645e" stroke-width="3" />
    <text x="216" y="160" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">NON</text>
    <rect x="32" y="237" width="244" height="86" rx="16" fill="#121816" stroke="#81dacb" />
    <text x="68" y="272" fill="#81dacb" font-size="14" font-family="ui-monospace, monospace">KNOWN NOT AFFECTED</text>
    <text x="68" y="298" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Justification de présence</text>
    <path d="M620 171H766v66" fill="none" stroke="#52645e" stroke-width="3" />
    <text x="680" y="160" fill="#c5a66f" font-size="13" font-family="ui-monospace, monospace">INCONNU</text>
    <rect x="644" y="237" width="244" height="86" rx="16" fill="#121816" stroke="#c5a66f" />
    <text x="675" y="272" fill="#c5a66f" font-size="14" font-family="ui-monospace, monospace">UNDER INVESTIGATION</text>
    <text x="675" y="298" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Délai et preuve attendue</text>
    <path d="M460 210v90" stroke="#52645e" stroke-width="3" />
    <text x="476" y="258" fill="#dd8f72" font-size="13" font-family="ui-monospace, monospace">OUI</text>
    <rect x="300" y="300" width="320" height="90" rx="16" fill="#121816" stroke="#dd8f72" />
    <text x="339" y="338" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Exploitable dans des conditions</text>
    <text x="358" y="365" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">opérationnelles pratiques ?</text>
    <path d="M300 345H154v80" fill="none" stroke="#52645e" stroke-width="3" />
    <text x="216" y="414" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">NON</text>
    <rect x="32" y="425" width="244" height="86" rx="16" fill="#121816" stroke="#81dacb" />
    <text x="68" y="460" fill="#81dacb" font-size="14" font-family="ui-monospace, monospace">KNOWN NOT AFFECTED</text>
    <text x="68" y="486" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Justification technique</text>
    <path d="M620 345H766v80" fill="none" stroke="#52645e" stroke-width="3" />
    <text x="680" y="414" fill="#c5a66f" font-size="13" font-family="ui-monospace, monospace">INCONNU</text>
    <rect x="644" y="425" width="244" height="86" rx="16" fill="#121816" stroke="#c5a66f" />
    <text x="675" y="460" fill="#c5a66f" font-size="14" font-family="ui-monospace, monospace">UNDER INVESTIGATION</text>
    <text x="675" y="486" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Délai et preuve attendue</text>
    <path d="M460 390v35" stroke="#52645e" stroke-width="3" />
    <text x="476" y="414" fill="#dd8f72" font-size="13" font-family="ui-monospace, monospace">OUI</text>
    <rect x="336" y="425" width="248" height="86" rx="16" fill="#121816" stroke="#dd8f72" />
    <text x="383" y="460" fill="#dd8f72" font-size="14" font-family="ui-monospace, monospace">KNOWN AFFECTED</text>
    <text x="383" y="486" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Action et échéance</text>
    <path d="M460 511v48" stroke="#52645e" stroke-width="3" />
    <rect x="336" y="559" width="248" height="74" rx="16" fill="#0b100f" stroke="#81dacb" />
    <text x="422" y="592" fill="#81dacb" font-size="14" font-family="ui-monospace, monospace">FIXED</text>
    <text x="384" y="616" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Version corrigée identifiée</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 340 980" role="img" aria-labelledby="vex-decision-mobile-title vex-decision-mobile-desc">
    <title id="vex-decision-mobile-title">Arbre de décision pour attribuer un statut VEX</title>
    <desc id="vex-decision-mobile-desc">L’analyse vérifie le produit exact, la présence du composant et du code vulnérable, puis son exploitabilité. Une inconnue conduit à un statut en cours d’investigation, une atteinte confirmée à affecté, une absence justifiée à non affecté et une version corrigée à fixed.</desc>
    <rect x="28" y="24" width="284" height="80" rx="16" fill="#121816" stroke="#81dacb" />
    <text x="69" y="58" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Produit et build exacts</text>
    <text x="79" y="84" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Identité et SBOM reliées</text>
    <path d="M170 104v36" stroke="#52645e" stroke-width="3" />
    <rect x="28" y="140" width="284" height="92" rx="16" fill="#121816" stroke="#aa9cc4" />
    <text x="58" y="176" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Composant ou code vulnérable</text>
    <text x="126" y="204" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">présent ?</text>
    <path d="M170 232v18H90v20M170 250h80v20M170 232v188" fill="none" stroke="#52645e" stroke-width="3" />
    <rect x="20" y="270" width="140" height="105" rx="16" fill="#121816" stroke="#81dacb" />
    <text x="74" y="296" fill="#81dacb" font-size="11" font-family="ui-monospace, monospace">NON</text>
    <text x="52" y="321" fill="#81dacb" font-size="11" font-family="ui-monospace, monospace">KNOWN NOT</text>
    <text x="63" y="342" fill="#81dacb" font-size="11" font-family="ui-monospace, monospace">AFFECTED</text>
    <text x="47" y="363" fill="#a3ada6" font-size="11" font-family="system-ui, sans-serif">Présence exclue</text>
    <rect x="180" y="270" width="140" height="105" rx="16" fill="#121816" stroke="#c5a66f" />
    <text x="224" y="296" fill="#c5a66f" font-size="11" font-family="ui-monospace, monospace">INCONNU</text>
    <text x="220" y="321" fill="#c5a66f" font-size="11" font-family="ui-monospace, monospace">UNDER</text>
    <text x="202" y="342" fill="#c5a66f" font-size="11" font-family="ui-monospace, monospace">INVESTIGATION</text>
    <text x="204" y="363" fill="#a3ada6" font-size="11" font-family="system-ui, sans-serif">Preuve attendue</text>
    <text x="183" y="404" fill="#dd8f72" font-size="12" font-family="ui-monospace, monospace">OUI</text>
    <rect x="28" y="420" width="284" height="110" rx="16" fill="#121816" stroke="#dd8f72" />
    <text x="64" y="460" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Exploitable dans des conditions</text>
    <text x="75" y="488" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">opérationnelles pratiques ?</text>
    <path d="M170 530v20H90v20M170 550h80v20M170 530v190" fill="none" stroke="#52645e" stroke-width="3" />
    <rect x="20" y="570" width="140" height="105" rx="16" fill="#121816" stroke="#81dacb" />
    <text x="74" y="596" fill="#81dacb" font-size="11" font-family="ui-monospace, monospace">NON</text>
    <text x="52" y="621" fill="#81dacb" font-size="11" font-family="ui-monospace, monospace">KNOWN NOT</text>
    <text x="63" y="642" fill="#81dacb" font-size="11" font-family="ui-monospace, monospace">AFFECTED</text>
    <text x="45" y="663" fill="#a3ada6" font-size="11" font-family="system-ui, sans-serif">Raison technique</text>
    <rect x="180" y="570" width="140" height="105" rx="16" fill="#121816" stroke="#c5a66f" />
    <text x="224" y="596" fill="#c5a66f" font-size="11" font-family="ui-monospace, monospace">INCONNU</text>
    <text x="220" y="621" fill="#c5a66f" font-size="11" font-family="ui-monospace, monospace">UNDER</text>
    <text x="202" y="642" fill="#c5a66f" font-size="11" font-family="ui-monospace, monospace">INVESTIGATION</text>
    <text x="204" y="663" fill="#a3ada6" font-size="11" font-family="system-ui, sans-serif">Preuve attendue</text>
    <text x="183" y="704" fill="#dd8f72" font-size="12" font-family="ui-monospace, monospace">OUI</text>
    <rect x="40" y="720" width="260" height="100" rx="16" fill="#121816" stroke="#dd8f72" />
    <text x="103" y="760" fill="#dd8f72" font-size="13" font-family="ui-monospace, monospace">KNOWN AFFECTED</text>
    <text x="109" y="790" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Action et échéance</text>
    <path d="M170 820v50" stroke="#52645e" stroke-width="3" />
    <rect x="80" y="870" width="180" height="80" rx="16" fill="#0b100f" stroke="#81dacb" />
    <text x="149" y="904" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">FIXED</text>
    <text x="109" y="930" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Version corrigée</text>
  </svg>
  <figcaption>Arbre de qualification inspiré des statuts et justifications de CSAF 2.0 et des exigences minimales VEX de la CISA. Les branches représentent des décisions documentaires, pas un test automatique universel.</figcaption>
</figure>

## Le produit exact est la première preuve

Un VEX portant sur « Produit X » sans version, branche, révision, date ou empreinte laisse une ambiguïté majeure. La CISA demande qu’une déclaration identifie au moins un produit et exactement une vulnérabilité. Elle recommande de réutiliser les identifiants de la SBOM et accepte notamment les versions, plages de versions, empreintes et identifiants de commit.

Une granularité trop large propage une conclusion au-delà de son domaine de validité. Si le statut, la justification ou l’action change pour une partie des produits, les exigences minimales de la CISA demandent des déclarations distinctes pour les sous-ensembles concernés. Une famille commerciale n’est donc un périmètre sûr que si chaque version incluse partage réellement le même statut et les mêmes conditions techniques.

Le dossier minimal peut relier :

| Champ | Contenu attendu |
| --- | --- |
| Produit | nom fournisseur, nom produit, version, édition, plateforme |
| Artefact | type, URI interne, empreinte cryptographique, date de construction |
| SBOM | format et version, identifiant, empreinte, générateur, date, profondeur connue |
| Vulnérabilité | identifiant, source, version de l’avis, date de consultation |
| Correspondance | composant, version, méthode de rapprochement, ambiguïtés |
| Exploitabilité | code présent, chemin d’exécution, entrée contrôlable, privilèges, configuration |
| VEX | émetteur, statut, justification ou action, version, horodatage |
| Décision | propriétaire, approbateur, action, échéance, déclencheurs de réexamen |

Une signature numérique peut attester l’intégrité et l’identité déclarée de l’émetteur. Elle ne prouve pas la justesse de l’analyse. Le document de la CISA recommande la signature des documents et déclarations VEX, et CSAF prévoit la validation du rôle de l’émetteur et de la structure. Le consommateur doit encore décider s’il fait confiance à cet émetteur pour ce produit et cette conclusion.

## Une démonstration technique proportionnée

Le niveau de preuve dépend de la conclusion, de l’incertitude et du risque du produit. Une justification « composant absent » peut être étayée par une analyse de l’artefact et une SBOM générée au moment de la construction. Une justification « code non exécutable » demande davantage : chemin d’appel, configuration, édition de liens, tests ou analyse statique ciblée. Une justification fondée sur une protection intégrée exige d’établir que cette protection couvre complètement les vecteurs connus, ne peut pas être désactivée par l’utilisateur et ne peut pas être contournée par l’adversaire.

Les éléments possibles comprennent :

- manifeste de construction et empreinte de l’artefact ;
- SBOM générée depuis le paquet livré, avec résultat des contrôles de complétude ;
- diff du correctif amont et preuve de rétroportage ;
- carte des appels, trace d’exécution ou test ciblé ;
- configuration effective et paramètres de compilation ;
- scénario d’attaque, préconditions et frontières de confiance ;
- résultat reproductible, environnement et version des outils ;
- revue humaine, contre-signature et limites connues.

Tous ces éléments n’ont pas vocation à être publics. Ils doivent en revanche être retrouvables et reliés à la déclaration. La [bibliothèque de preuves BLACKPROOF](/evidence-library) peut structurer les pièces attendues, tandis que la méthode exposée dans [la due diligence cyber fournisseur](/analyses/due-diligence-cyber-fournisseur-documenter-risque-sans-surcollecter/) aide à limiter la collecte au nécessaire.

## Cinq raccourcis qui fragilisent la conclusion

### « Le scanner ne remonte rien »

Un résultat négatif dépend de la couverture du scanner, de la qualité de la SBOM, de la base consultée et de sa date. Il ne démontre pas que le composant ou la vulnérabilité sont absents. Le dossier doit conserver les entrées, la version de l’outil, la source des avis et les limites de détection.

### « Aucun exploit n’a été observé »

L’absence d’exploitation observée ne démontre pas l’absence d’exploitabilité. Elle peut être pertinente pour distinguer une vulnérabilité exploitable d’une vulnérabilité activement exploitée, deux définitions distinctes du CRA. Elle ne suffit pas à conclure « non affecté ».

### « Le composant n’est pas dans le dépôt »

Une dépendance peut être ajoutée par une image de base, un outil d’empaquetage, une étape de construction ou un fournisseur de firmware. La vérification doit viser l’artefact livré et sa chaîne de construction.

### « Le chemin n’est pas utilisé dans notre configuration »

Cette conclusion doit nommer la configuration concernée. Une option activable, une édition différente ou un déploiement client peuvent changer le statut. Si le VEX couvre plusieurs configurations, elles doivent partager la même conclusion ou être séparées.

### « Le pare-feu nous protège »

Une mesure externe peut réduire la vraisemblance ou l’impact. Elle ne supprime pas nécessairement la vulnérabilité du produit. Sauf démonstration répondant aux conditions strictes d’une protection intégrée, la déclaration doit conserver le statut affecté et décrire la mesure compensatoire.

## Un exemple fictif, sans raccourci

Considérons un produit fictif `Passerelle A`, version `4.2.7`, construit sous l’empreinte `H1`. Sa SBOM mentionne la bibliothèque `Parser B` en version `2.4`. Un avis attribue la vulnérabilité fictive `VULN-EXEMPLE-1` aux versions 2.3 à 2.5 lorsque la fonction `decodeRemote()` traite une entrée distante.

Trois dossiers peuvent conduire à trois conclusions différentes :

- **Cas 1 :** l’analyse de l’artefact `H1` montre que `decodeRemote()` a été exclue à la compilation. Un VEX « non affecté » peut citer la justification <code>vulnerable_<wbr>code_<wbr>not_<wbr>present</code>, avec le manifeste de compilation et le contrôle binaire.
- **Cas 2 :** la fonction est présente, mais l’équipe ne sait pas encore si une entrée distante peut l’atteindre dans toutes les configurations vendues. Le statut honnête est <code>under_<wbr>investigation</code>, avec un propriétaire, un test attendu et une échéance.
- **Cas 3 :** une requête distante atteint la fonction. Le produit est affecté. Le VEX indique l’action de réduction du risque et la version corrigée attendue. Après vérification du correctif dans une nouvelle empreinte `H2`, une déclaration distincte peut attribuer le statut `fixed` à cette version.

Cet exemple illustre une méthode, pas une vulnérabilité réelle. Les noms, identifiants et résultats sont fictifs.

## Une décision doit pouvoir expirer

Une conclusion valable le 30 juillet peut devenir fausse après une nouvelle construction, une mise à jour de l’avis ou la découverte d’un chemin d’attaque. Un registre utile associe donc chaque statut à une règle de réexamen.

Déclencheurs possibles :

- nouvelle version, nouvelle empreinte ou nouvelle plateforme du produit ;
- ajout, suppression ou mise à jour d’un composant ;
- modification de la plage de versions vulnérables ou de la description de la faille ;
- publication d’une preuve de concept, d’un exploit ou de nouvelles conditions d’exploitation ;
- changement de configuration, d’interface exposée ou de frontière de confiance ;
- nouvelle déclaration VEX de l’amont, correction ou retrait d’une déclaration ;
- échéance calendaire fixée pour une investigation non terminée.

La guidance de la Commission, aux paragraphes 238 à 240, présente les tests réguliers comme un processus alimenté par les nouvelles informations. Elle n’impose pas de répéter mécaniquement des tests inchangés. La logique utile consiste à rejouer le contrôle qui peut invalider la conclusion, avec une entrée et une sortie comparables.

## Le composant tiers ne transfère pas la responsabilité

L’article 13, paragraphe 5, demande au fabricant qui intègre un composant tiers d’exercer une diligence raisonnable afin qu’il ne compromette pas la cybersécurité du produit. La guidance de la Commission distingue cette diligence de l’analyse de risque du produit : les deux sont complémentaires. Une documentation du fournisseur, des rapports de test ou une déclaration VEX amont peuvent alimenter l’analyse, mais le fabricant doit vérifier que le composant répond aux besoins de sécurité de son propre produit.

L’article 13, paragraphe 6, prévoit aussi qu’un fabricant qui identifie une vulnérabilité dans un composant intégré la signale au mainteneur ou au fabricant du composant et lui communique, le cas échéant, le correctif qu’il a développé. La guidance précise que cette obligation concerne la version effectivement intégrée et qu’il faut éviter les signalements dupliqués.

Un VEX amont doit donc être traité comme une preuve attribuée :

- qui l’a émis et avec quel rôle ;
- quel composant, quelle version et quelle vulnérabilité il couvre ;
- à quelle date et dans quelle version du document ;
- quelle justification ou action il fournit ;
- si ses conditions correspondent à l’intégration réelle ;
- quels éléments permettraient de le contredire.

Le [Questionnaire Crusher](/questionnaire-crusher) peut transformer ces questions en exigences fournisseur. La réponse n’est complète que lorsqu’elle rejoint le produit exact et sa propre analyse.

## Partager sans exposer inutilement

Le besoin de transparence varie selon le destinataire. Une architecture de diffusion peut prévoir :

1. **une information publique minimale**, par exemple un avis de sécurité ou un VEX ne révélant pas de détail exploitable supplémentaire ;
2. **un espace client authentifié**, pour les versions concernées, les mesures de réduction du risque et les mises à jour ;
3. **un dossier technique contrôlé**, avec artefacts, analyses et pièces détaillées pour les personnes habilitées ;
4. **une voie de transmission à l’autorité**, en réponse à une demande motivée et dans le périmètre nécessaire.

Cette segmentation ne doit pas servir à retarder une alerte nécessaire. Elle évite en revanche de publier sans nécessité l’inventaire complet, les configurations sensibles ou les chemins internes. Le principe est cohérent avec la guidance 2026 de la Commission et avec la distinction opérée par le CRA entre la documentation technique, l’information des utilisateurs et l’accès de l’autorité.

## Questions utiles côté acheteur

Un acheteur n’a pas besoin d’exiger indistinctement toutes les SBOM et tous les rapports. Il peut demander des réponses vérifiables :

- la SBOM correspond-elle à l’artefact livré ou seulement au dépôt source ?
- quel niveau de dépendance couvre-t-elle et quelles exclusions sont connues ?
- quels identifiants permettent de relier SBOM, VEX, avis et version du produit ?
- qui émet et approuve le VEX ?
- quel délai cible s’applique au statut <code>under_<wbr>investigation</code> ?
- quelles preuves soutiennent un statut « non affecté » ?
- quelles mises à jour rendent une déclaration obsolète ?
- comment le fournisseur avertit-il le client d’un changement de statut ?
- quelle information est accessible publiquement, sous authentification et sur demande ?

Le but n’est pas d’obtenir davantage de fichiers. Il est de savoir si une affirmation importante peut être reliée à un produit, une vulnérabilité, une preuve, une décision et une date.

## Limites et inconnues à conserver

La guidance C(2026) 5252 est non contraignante. Elle indique elle-même que l’interprétation faisant autorité appartient à la Cour de justice de l’Union européenne. Elle éclaire la mise en œuvre, mais ne remplace ni le règlement, ni les futurs actes d’exécution, ni les normes harmonisées.

Les [exigences minimales de la CISA](https://www.cisa.gov/sites/default/files/2023-04/minimum-requirements-for-vex-508c.pdf) sont également explicites : ce document issu d’un travail communautaire n’est ni une norme formelle, ni une politique officielle contraignante de la CISA. CSAF 2.0 est en revanche un standard OASIS, mais son utilisation reste un choix de mise en œuvre tant qu’un contrat ou un texte applicable ne l’impose pas.

La [TR-03183-2 du BSI](https://www.bsi.bund.de/EN/Themen/Unternehmen-und-Organisationen/Standards-und-Zertifizierung/Technische-Richtlinien/TR-nach-Thema-sortiert/tr03183/tr-03183.html) fournit une référence européenne détaillée pour la SBOM et le BSI indique la mettre à jour continuellement en préparation du CRA et de la normalisation européenne. Elle n’est pas, à elle seule, la preuve d’une conformité au CRA dans toute l’Union.

Enfin, ni une SBOM valide, ni un VEX signé, ni un scan sans alerte ne garantissent l’exactitude de la conclusion. Ils rendent le raisonnement transportable et contrôlable. La preuve vient de leur rattachement à l’artefact, de la qualité de l’analyse et de la capacité à réviser la décision.

## Checklist de publication d’un statut

- [ ] Le produit, la version, la plateforme et l’artefact sont identifiés sans ambiguïté.
- [ ] La SBOM est reliée à cet artefact et ses limites de couverture sont documentées.
- [ ] La source et la version de l’avis de vulnérabilité sont conservées.
- [ ] La présence du composant et du code vulnérable est vérifiée séparément.
- [ ] Le chemin d’exécution, les entrées contrôlables et les préconditions sont analysés.
- [ ] Une inconnue produit un statut d’investigation, pas une conclusion négative.
- [ ] Le statut « non affecté » comporte une justification admise et ses éléments de preuve.
- [ ] Le statut « affecté » comporte une action, un responsable et une échéance.
- [ ] L’émetteur, la version et l’horodatage du VEX sont vérifiables.
- [ ] Les déclencheurs de réexamen et la date de prochaine revue sont définis.
- [ ] Le niveau de diffusion protège les détails sensibles sans priver les destinataires d’une information nécessaire.
- [ ] Le dossier distingue l’exigence du CRA, le standard technique choisi et les décisions internes.

La mise en place doit aussi rejoindre le circuit de [signalement du CRA à partir du 11 septembre 2026](/analyses/cyber-resilience-act-signalements-septembre-2026/). Une vulnérabilité peut être affectante sans être activement exploitée, et activement exploitée dans un composant sans être exploitable dans chaque produit qui l’intègre. La valeur de la chaîne SBOM-VEX est précisément de conserver ces distinctions jusqu’à la décision.
