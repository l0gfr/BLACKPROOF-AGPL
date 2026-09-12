---
title: "Due diligence cyber fournisseur : documenter le risque sans surcollecter"
description: "Une méthode proportionnée pour qualifier un fournisseur TIC, conserver des preuves utiles et protéger les informations sensibles."
publishedAt: 2026-07-30
updatedAt: 2026-07-30
category: "Chaîne d’approvisionnement"
format: "Méthode"
confidence: "Confiance élevée"
author: "Rédaction BLACKPROOF"
tags:
  - risque fournisseur
  - chaîne d’approvisionnement
  - due diligence
  - C-SCRM
  - NIS 2
  - minimisation des données
readingMinutes: 22
featured: true
draft: false
sources:
  - title: "NIST Cybersecurity Supply Chain Risk Management: Due Diligence Assessment Quick-Start Guide"
    publisher: "NIST"
    url: "https://csrc.nist.gov/pubs/sp/1326/final"
    kind: "Source institutionnelle"
    publicationDate: 2026-07-08
    consultedAt: 2026-07-30
  - title: "Cybersecurity Supply Chain Risk Management Practices for Systems and Organizations"
    publisher: "NIST"
    url: "https://csrc.nist.gov/pubs/sp/800/161/r1/upd1/final"
    kind: "Source institutionnelle"
    publicationDate: 2022-05-05
    consultedAt: 2026-07-30
  - title: "Developing Security, Privacy, and Cybersecurity Supply Chain Risk Management Plans for Systems"
    publisher: "NIST"
    url: "https://csrc.nist.gov/pubs/sp/800/18/r2/final"
    kind: "Source institutionnelle"
    publicationDate: 2026-06-30
    consultedAt: 2026-07-30
  - title: "Directive (UE) 2022/2555 concernant des mesures destinées à assurer un niveau élevé commun de cybersécurité dans l’Union"
    publisher: "Journal officiel de l’Union européenne"
    url: "https://eur-lex.europa.eu/eli/dir/2022/2555/oj/fra"
    kind: "Source primaire"
    publicationDate: 2022-12-27
    consultedAt: 2026-07-30
  - title: "Règlement d’exécution (UE) 2024/2690 établissant les exigences techniques et méthodologiques NIS 2"
    publisher: "Journal officiel de l’Union européenne"
    url: "https://eur-lex.europa.eu/eli/reg_impl/2024/2690/oj/fra"
    kind: "Source primaire"
    publicationDate: 2024-10-18
    consultedAt: 2026-07-30
  - title: "NIS2 Technical Implementation Guidance"
    publisher: "ENISA"
    url: "https://www.enisa.europa.eu/publications/nis2-technical-implementation-guidance"
    kind: "Source institutionnelle"
    publicationDate: 2025-06-26
    consultedAt: 2026-07-30
  - title: "Règlement (UE) 2016/679 relatif à la protection des données à caractère personnel"
    publisher: "Journal officiel de l’Union européenne"
    url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj/fra"
    kind: "Source primaire"
    publicationDate: 2016-05-04
    consultedAt: 2026-07-30
  - title: "Sécurité des données : les règles essentielles pour protéger les données et votre activité"
    publisher: "CNIL"
    url: "https://www.cnil.fr/fr/securite-des-donnees-les-regles-essentielles"
    kind: "Source institutionnelle"
    publicationDate: 2026-06-19
    consultedAt: 2026-07-30
---

Le 8 juillet 2026, le NIST a finalisé le [SP 1326](https://csrc.nist.gov/pubs/sp/1326/final), un guide de démarrage consacré à la due diligence cyber des fournisseurs de technologies de l’information et de la communication. Son objectif est limité mais concret : fournir un socle d’investigation raisonnable avant une acquisition ou pour un système déjà utilisé.

Le document ne transforme pas un questionnaire en audit, une certification en garantie ni une recherche publique en évaluation complète du risque. Il distingue au contraire la due diligence initiale des revues fournisseur et des évaluations plus robustes de la chaîne d’approvisionnement.

Cette distinction répond à un problème fréquent. Les équipes achats et sécurité demandent parfois le même classeur à tous les fournisseurs, accumulent des politiques, captures, listes de salariés et rapports techniques, puis résument le résultat par une note. Le volume documentaire augmente. La capacité de décision, elle, ne progresse pas nécessairement.

> Conclusion courte : une due diligence utile ne cherche pas le maximum de documents. Elle relie un fournisseur, un produit et un usage déterminés à des constats datés, des sources qualifiées, des inconnues explicites et une décision révisable.

## Synthèse exécutive

- **Le SP 1326 propose cinq catégories de recherche.** Elles couvrent la propriété, le contrôle ou l’influence étrangers, la provenance, la résilience, les pratiques cyber fondamentales et les différents rangs de la chaîne d’approvisionnement.
- **La due diligence reste une étape préliminaire.** Le NIST la présente comme un précurseur des revues fournisseur et, dans de nombreux cas, comme une base pour les dimensions menace et vulnérabilité d’une évaluation plus complète du risque.
- **La profondeur doit dépendre de la criticité.** Le guide recommande de prioriser les fournisseurs et d’adapter le niveau d’investigation aux ressources disponibles et à la criticité de l’acquisition.
- **Le droit européen demande une approche proportionnée.** L’article 21 de NIS 2 vise notamment la sécurité des relations avec les fournisseurs directs. Le règlement d’exécution 2024/2690 détaille la sélection, les clauses contractuelles et le suivi pour les catégories d’entités qu’il couvre.
- **La preuve peut être conservée sans copier toutes les pièces.** Un registre peut distinguer les informations publiques, les attestations du fournisseur et les éléments sensibles examinés sous contrôle.
- **Une inconnue n’est ni un échec automatique ni une conformité implicite.** Elle doit rester visible, être reliée au risque concerné puis faire l’objet d’une décision : investigation complémentaire, mesure contractuelle, contrôle compensatoire, acceptation ou refus.

## La due diligence ne remplace ni l’audit ni l’évaluation du risque

Le [SP 1326](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.1326.pdf) définit la due diligence de gestion du risque cyber de chaîne d’approvisionnement, ou C-SCRM, comme la recherche et la vérification des informations disponibles et pertinentes sur un fournisseur ou un produit. La due diligence de base repose sur des informations publiquement accessibles, sans solliciter directement le fournisseur. Sa version renforcée peut utiliser des jeux de données commerciaux, des sources propriétaires et des outils spécialisés.

Le guide demande de valider les constats contre plusieurs sources lorsque cela est possible. Il précise aussi que la due diligence constitue une étape fondatrice, pas l’analyse complète. Le [SP 800-161 Rev. 1](https://csrc.nist.gov/pubs/sp/800/161/r1/upd1/final) couvre un ensemble beaucoup plus large : stratégie, politiques, plans, contrôles et évaluations du risque sur plusieurs niveaux de l’organisation.

Une réponse « oui » à une question de sécurité n’établit donc pas à elle seule :

- que le contrôle existe pour le produit et l’environnement considérés ;
- qu’il couvre tous les utilisateurs ou composants pertinents ;
- qu’il fonctionnait à la date de l’évaluation ;
- qu’il réduit effectivement le risque pour l’usage prévu ;
- que le client dispose des droits contractuels nécessaires pour être informé ou agir.

Le dossier doit conserver la nature exacte de l’élément. Une page publique constitue une source. Une attestation constitue une déclaration attribuée. Un rapport d’audit apporte une assurance dans son périmètre. Un test observé apporte un résultat daté. Aucun de ces éléments ne doit être renommé « preuve de conformité » sans préciser ce qu’il permet réellement d’établir.

## Cinq axes à instruire, pas cinq scores à additionner

Les cinq catégories du NIST proviennent des facteurs de risque de base du SP 800-161. Elles organisent la recherche, mais le guide laisse à chaque organisation le soin de définir ses paramètres, sa tolérance au risque et ses niveaux de préoccupation.

| Axe du SP 1326 | Question opérationnelle | Éléments recherchables | Limite à conserver |
| --- | --- | --- | --- |
| Propriété, contrôle ou influence étrangers, FOCI | Quels intérêts, pouvoirs ou cadres juridiques peuvent influencer les opérations du fournisseur ? | Actionnariat, contrôle, dirigeants, juridictions, fusions annoncées, sources officielles | Un pays, une nationalité ou une implantation ne constitue pas à lui seul une conclusion de risque |
| Provenance | D’où viennent le produit, ses composants, son développement et ses changements ? | Entité juridique, lieux de développement ou d’hébergement, dépôts, documentation de licence, nomenclature logicielle | Une nomenclature de composants ne démontre pas que le logiciel est sûr |
| Résilience | Le fournisseur peut-il continuer à remplir ses obligations ? | Continuité, fiabilité, incidents, fin de support, difficultés réglementaires ou opérationnelles, mesures correctives | Un incident ancien n’établit pas le niveau de risque actuel sans contexte ni réponse du fournisseur |
| Pratiques cyber fondamentales | Quelles pratiques protègent le fournisseur et le produit ? | Développement sécurisé, correctifs, vulnérabilités, versions obsolètes, sécurité des services exposés, attestations | Une observation externe ne donne qu’une vue partielle et datée |
| Rangs de la chaîne | Quelles dépendances se trouvent derrière le fournisseur direct ? | Sous-traitants critiques, composants, dépendances communes, fournisseur unique, concentration | La profondeur augmente la visibilité, mais aussi fortement le coût et la difficulté de vérification |

Le volet FOCI est formulé dans un contexte fédéral américain. Le guide renvoie notamment à des listes d’exclusion et de contrôle des États-Unis. Une organisation européenne ne peut pas transposer mécaniquement ces listes ni transformer une origine géographique en verdict. Elle doit définir les risques qu’elle cherche à traiter, les sources légitimes et la relation entre le constat, le système concerné et la décision.

Le même principe vaut pour les autres axes. Une vulnérabilité corrigée, une procédure de développement sécurisé ou un sous-traitant présent dans plusieurs chaînes n’a de sens qu’avec son périmètre, sa date, son impact possible et les mesures existantes.

## Trois modes de preuve évitent l’aspirateur documentaire

Le questionnaire classique mélange souvent des informations déjà publiques, des déclarations que seul le fournisseur peut produire et des pièces internes très sensibles. Les séparer permet de choisir un mode de vérification proportionné.

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 520" role="img" aria-labelledby="supplier-evidence-title supplier-evidence-desc">
    <title id="supplier-evidence-title">Trois modes de preuve pour une due diligence fournisseur proportionnée</title>
    <desc id="supplier-evidence-desc">Le schéma sépare les informations publiques vérifiables, les attestations attribuées au fournisseur et les pièces sensibles examinées sous contrôle. Seuls les constats nécessaires rejoignent le registre de décision.</desc>
    <rect x="22" y="52" width="252" height="248" rx="18" fill="#121816" stroke="#81dacb" />
    <text x="46" y="86" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">01 · PUBLIC</text>
    <text x="46" y="121" fill="#f1f4f0" font-size="20" font-family="system-ui, sans-serif">Vérifier</text>
    <text x="46" y="156" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Registre officiel</text>
    <text x="46" y="181" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Avis d’autorité</text>
    <text x="46" y="206" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Documentation produit</text>
    <text x="46" y="231" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Historique daté</text>
    <rect x="54" y="254" width="188" height="28" rx="9" fill="#0b100f" />
    <text x="72" y="273" fill="#81dacb" font-size="12" font-family="system-ui, sans-serif">Source + date + portée</text>
    <rect x="334" y="52" width="252" height="248" rx="18" fill="#121816" stroke="#aa9cc4" />
    <text x="358" y="86" fill="#aa9cc4" font-size="13" font-family="ui-monospace, monospace">02 · ATTESTÉ</text>
    <text x="358" y="121" fill="#f1f4f0" font-size="20" font-family="system-ui, sans-serif">Attribuer</text>
    <text x="358" y="156" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Réponse du fournisseur</text>
    <text x="358" y="181" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Périmètre déclaré</text>
    <text x="358" y="206" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Exceptions signalées</text>
    <text x="358" y="231" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Signataire et validité</text>
    <rect x="366" y="254" width="188" height="28" rx="9" fill="#0b100f" />
    <text x="383" y="273" fill="#aa9cc4" font-size="12" font-family="system-ui, sans-serif">Déclaration, pas test</text>
    <rect x="646" y="52" width="252" height="248" rx="18" fill="#121816" stroke="#c5a66f" />
    <text x="670" y="86" fill="#c5a66f" font-size="13" font-family="ui-monospace, monospace">03 · SENSIBLE</text>
    <text x="670" y="121" fill="#f1f4f0" font-size="20" font-family="system-ui, sans-serif">Examiner</text>
    <text x="670" y="156" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Rapport sous contrôle</text>
    <text x="670" y="181" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Échantillon technique</text>
    <text x="670" y="206" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Démonstration encadrée</text>
    <text x="670" y="231" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Accès restreint</text>
    <rect x="678" y="254" width="188" height="28" rx="9" fill="#0b100f" />
    <text x="696" y="273" fill="#c5a66f" font-size="12" font-family="system-ui, sans-serif">Constat sans copie brute</text>
    <path d="M148 320v52h312m0 0h312v-52" fill="none" stroke="#52645e" stroke-width="3" />
    <path d="M460 300v72" stroke="#52645e" stroke-width="3" />
    <path d="m451 360 9 12 9-12" fill="none" stroke="#52645e" stroke-width="3" />
    <rect x="184" y="392" width="552" height="88" rx="16" fill="#0b100f" stroke="#81dacb" />
    <text x="218" y="424" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">REGISTRE DE DÉCISION</text>
    <text x="218" y="454" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Constat, portée, statut, limite, décision et prochain contrôle</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 340 960" role="img" aria-labelledby="supplier-evidence-mobile-title supplier-evidence-mobile-desc">
    <title id="supplier-evidence-mobile-title">Trois modes de preuve pour une due diligence fournisseur proportionnée</title>
    <desc id="supplier-evidence-mobile-desc">Les informations publiques sont vérifiées, les déclarations sont attribuées et les pièces sensibles sont examinées sous contrôle avant d’inscrire un constat minimal dans le registre.</desc>
    <rect x="20" y="24" width="300" height="212" rx="17" fill="#121816" stroke="#81dacb" />
    <text x="44" y="58" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">01 · PUBLIC</text>
    <text x="44" y="91" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">Vérifier</text>
    <text x="44" y="124" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Registre, autorité, documentation</text>
    <text x="44" y="148" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Historique daté et recoupé</text>
    <rect x="44" y="178" width="208" height="30" rx="9" fill="#0b100f" />
    <text x="61" y="198" fill="#81dacb" font-size="12" font-family="system-ui, sans-serif">Source + date + portée</text>
    <path d="M170 236v42" stroke="#52645e" stroke-width="3" />
    <rect x="20" y="278" width="300" height="212" rx="17" fill="#121816" stroke="#aa9cc4" />
    <text x="44" y="312" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">02 · ATTESTÉ</text>
    <text x="44" y="345" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">Attribuer</text>
    <text x="44" y="378" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Réponse, signataire, validité</text>
    <text x="44" y="402" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Périmètre et exceptions</text>
    <rect x="44" y="432" width="208" height="30" rx="9" fill="#0b100f" />
    <text x="61" y="452" fill="#aa9cc4" font-size="12" font-family="system-ui, sans-serif">Déclaration, pas test</text>
    <path d="M170 490v42" stroke="#52645e" stroke-width="3" />
    <rect x="20" y="532" width="300" height="212" rx="17" fill="#121816" stroke="#c5a66f" />
    <text x="44" y="566" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">03 · SENSIBLE</text>
    <text x="44" y="599" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">Examiner</text>
    <text x="44" y="632" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Rapport, échantillon, démonstration</text>
    <text x="44" y="656" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Accès restreint et conclusion bornée</text>
    <rect x="44" y="686" width="228" height="30" rx="9" fill="#0b100f" />
    <text x="61" y="706" fill="#c5a66f" font-size="12" font-family="system-ui, sans-serif">Constat sans copie brute</text>
    <path d="M170 744v42" stroke="#52645e" stroke-width="3" />
    <path d="m161 774 9 12 9-12" fill="none" stroke="#52645e" stroke-width="3" />
    <rect x="20" y="786" width="300" height="130" rx="17" fill="#0b100f" stroke="#81dacb" />
    <text x="44" y="822" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">REGISTRE DE DÉCISION</text>
    <text x="44" y="854" fill="#f1f4f0" font-size="14" font-family="system-ui, sans-serif">Constat, portée, limite, décision</text>
    <text x="44" y="878" fill="#f1f4f0" font-size="14" font-family="system-ui, sans-serif">et prochain contrôle</text>
  </svg>
  <figcaption>Cette séparation est une proposition opérationnelle BLACKPROOF. Le SP 1326 ne prescrit pas ce format de registre.</figcaption>
</figure>

### Informations publiques vérifiables

Une recherche publique peut établir l’identité juridique, l’actionnariat publié, certaines implantations, les versions supportées, des avis d’autorités, des vulnérabilités connues ou des engagements documentés. Le registre doit conserver la source, la date de consultation, le périmètre et, lorsque l’information peut changer, un extrait ou une copie contrôlée.

Une page marketing reste une déclaration du fournisseur, même si elle est publique. Son existence est vérifiable. L’efficacité du contrôle qu’elle décrit ne l’est pas nécessairement.

### Attestations attribuées

Lorsque l’information n’est pas publique, le fournisseur peut produire une réponse bornée : contrôle concerné, produit ou service couvert, environnement, exceptions, date, durée de validité et personne ou fonction responsable.

L’attestation est utile parce qu’elle attribue une affirmation. Elle peut soutenir une clause contractuelle et rendre une divergence ultérieure observable. Elle ne devient pas un test indépendant du seul fait qu’elle est signée.

### Éléments sensibles examinés sous contrôle

Une architecture détaillée, un rapport de test d’intrusion, une liste de comptes, des journaux bruts ou un dossier individuel peuvent créer une nouvelle exposition. Le [SP 1326](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.1326.pdf) avertit d’ailleurs que l’agrégation de constats publics sur des vulnérabilités peut exiger une classification et une protection renforcées.

Il est souvent possible de conserver le résultat de la revue plutôt qu’une copie complète :

- document examiné et version ;
- personne ou fonction ayant réalisé l’examen ;
- date, périmètre et méthode ;
- critères vérifiés ;
- exceptions et réserves ;
- conclusion utilisable dans la décision ;
- emplacement contrôlé de l’original, si sa conservation est nécessaire.

Cette solution n’est pas universelle. Une exigence réglementaire, une procédure contentieuse ou un risque critique peut justifier la conservation de la pièce. La justification, les accès et la durée doivent alors être explicites.

## Le registre de preuve doit répondre à une décision

Un dossier exploitable relie chaque constat à un usage. Sans cette liaison, l’équipe sait qu’un fournisseur possède une certification ou une procédure, mais ne sait pas si elle couvre le service acheté.

| Champ | Contenu attendu | Erreur évitée |
| --- | --- | --- |
| Exigence ou risque | Question précise et raison de l’évaluation | Collecter une pièce sans savoir quelle décision elle éclaire |
| Objet évalué | Entité, produit, version, service, environnement et usage | Étendre une conclusion au-delà de son périmètre |
| Affirmation | Formulation exacte attribuée à sa source | Transformer une déclaration en fait indépendant |
| Élément de preuve | URL, document, attestation, observation ou test | Mélanger des niveaux d’assurance différents |
| Origine et auteur | Autorité, fournisseur, auditeur, équipe interne ou outil | Masquer un conflit d’intérêts ou une source indirecte |
| Date et validité | Publication, observation, expiration et actualité attendue | Réutiliser un résultat devenu obsolète |
| Vérification | Recoupé, observé, seulement déclaré, contredit ou inconnu | Afficher un faux statut binaire |
| Sensibilité | Public, interne, confidentiel, accès restreint | Diffuser une pièce plus largement que nécessaire |
| Limite | Angle mort, échantillon, exclusion, impossibilité de conclure | Surinterpréter l’élément |
| Décision | Condition, action, responsable, échéance et risque résiduel | Archiver sans traiter |
| Révision | Date planifiée ou événement déclencheur | Considérer la due diligence comme définitive |

Le [SP 800-18 Rev. 2](https://csrc.nist.gov/pubs/sp/800/18/r2/final), finalisé le 30 juin 2026, fournit un complément utile. Il relie le plan C-SCRM au système concerné, aux exigences, aux responsabilités et au suivi des contrôles. Il prévoit aussi qu’une capacité de surveillance continue des fournisseurs critiques puisse alerter les responsables lorsque la posture de risque change.

Le résultat n’est donc pas une bibliothèque documentaire indépendante du système. C’est une partie du dossier de gestion du risque.

## NIS 2 demande une appréciation proportionnée des fournisseurs directs

L’[article 21 de la directive NIS 2](https://eur-lex.europa.eu/eli/dir/2022/2555/oj/fra) demande aux entités essentielles et importantes des mesures techniques, opérationnelles et organisationnelles appropriées et proportionnées. La sécurité de la chaîne d’approvisionnement fait partie du socle, notamment pour les relations avec les fournisseurs et prestataires de services directs.

Son paragraphe 3 demande de prendre en compte les vulnérabilités propres à chaque fournisseur direct, la qualité globale de ses produits et ses pratiques de cybersécurité, y compris ses procédures de développement sécurisé. Ce texte ne prescrit pas un questionnaire universel ni une quantité de pièces identique pour tous.

Le [règlement d’exécution (UE) 2024/2690](https://eur-lex.europa.eu/eli/reg_impl/2024/2690/oj/fra) rend cette logique plus opérationnelle pour les catégories d’entités qu’il énumère : fournisseurs DNS, registres de domaines de premier niveau, cloud, centres de données, réseaux de diffusion de contenu, services gérés ou de sécurité gérés, certaines plateformes numériques et prestataires de confiance.

Pour ces entités, l’annexe prévoit notamment :

- des critères de sélection et de contractualisation ;
- la prise en compte des pratiques cyber, du développement sécurisé, de la qualité, de la résilience et du verrouillage fournisseur ;
- des clauses adaptées sur les incidents, l’audit, les vulnérabilités, la sous-traitance et la fin du contrat ;
- un registre à jour des fournisseurs directs et des produits, services ou processus TIC fournis ;
- une surveillance planifiée et des revues après certains changements ou incidents.

Le [guide technique de l’ENISA](https://www.enisa.europa.eu/publications/nis2-technical-implementation-guidance) fournit des exemples de mise en œuvre et de preuves : politique de chaîne d’approvisionnement, contrats, résultats d’évaluations fournisseur, suivi des niveaux de service, incidents liés à des tiers et processus de sortie. L’ENISA précise que ce guide n’est pas juridiquement contraignant et ne remplace ni les textes ni les instructions des autorités nationales.

Pour la qualification du champ et de la transposition, l’analyse [NIS 2 en France : périmètre, obligations et preuves](/analyses/nis-2-france-perimetre-obligations-preuves) doit rester distincte de la méthode présentée ici.

## La minimisation s’applique juridiquement aux données personnelles

Un dossier fournisseur peut contenir des données à caractère personnel : coordonnées nominatives, identités de dirigeants ou d’administrateurs, dossiers de formation, informations issues d’incidents, traces de connexion ou données relatives à des vérifications d’antécédents.

Lorsque le RGPD s’applique, son [article 5](https://eur-lex.europa.eu/eli/reg/2016/679/oj/fra) impose notamment la limitation des finalités, la minimisation, l’exactitude, la limitation de la conservation et une sécurité appropriée. Son article 25 demande que seules les données personnelles nécessaires à chaque finalité spécifique soient traitées par défaut. La [CNIL](https://www.cnil.fr/fr/securite-des-donnees-les-regles-essentielles) rappelle en juin 2026 qu’une donnée non indispensable ne devrait pas être demandée et qu’une conservation indéfinie crée une exposition inutile.

Cette obligation ne s’étend pas automatiquement, au titre du RGPD, à tous les secrets d’affaires et documents techniques dépourvus de données personnelles. Leur collecte reste néanmoins un risque de sécurité et de confidentialité. Le classement, le besoin d’en connaître, les engagements contractuels et la durée de conservation doivent être organisés séparément.

Quelques substitutions réduisent la collecte sans supprimer le contrôle :

| Objectif | Élément minimal possible | Investigation renforcée si justifiée | Collecte à éviter par défaut |
| --- | --- | --- | --- |
| Vérifier la couverture MFA | Attestation datée, populations couvertes, exceptions et méthode | Démonstration ou échantillon de configuration sous contrôle | Export complet des comptes et identités |
| Évaluer la gestion des correctifs | Politique, périmètre, délais cibles et indicateurs agrégés | Échantillon de tickets reliés à des actifs critiques | Inventaire technique complet sans besoin défini |
| Comprendre un incident | Chronologie, périmètre, impact, cause établie et mesures correctives | Rapport d’analyse consulté sous accord de confidentialité | Journaux bruts et données de victimes sans finalité précise |
| Identifier les dépendances | Sous-traitants et composants nécessaires au service évalué | Cartographie des rangs critiques et dépendances communes | Annuaire exhaustif des tiers sans rapport avec le service |
| Examiner le développement sécurisé | Politique, rôles, processus de vulnérabilité, portée des attestations | Traçabilité d’une version, nomenclature logicielle, test ciblé | Copie générale du code source ou des secrets de développement |

Ce tableau est une proposition BLACKPROOF. Le niveau nécessaire dépend du risque, du contrat, du secteur, des obligations applicables et de la capacité de l’élément à modifier la décision.

## Une note globale masque les désaccords entre les preuves

Additionner des réponses « oui » puis convertir le total en pourcentage crée une apparence de précision. Un fournisseur peut obtenir une bonne note tout en présentant une dépendance unique critique, une version non maintenue ou une exception MFA sur les comptes d’administration.

Le SP 1326 invite les organisations à définir leurs propres niveaux de préoccupation selon leur tolérance au risque. Cela ne dispense pas de conserver le raisonnement. Au minimum, chaque constat devrait séparer :

1. **l’observation** : information trouvée, document reçu ou test effectué ;
2. **son statut** : établi, seulement déclaré, contredit, obsolète ou inconnu ;
3. **la portée** : produit, version, environnement, population et période ;
4. **le risque concerné** : menace, vulnérabilité, impact et dépendance ;
5. **la décision** : accepter, conditionner, compenser, approfondir ou refuser ;
6. **le responsable** : personne autorisée à prendre et à revoir cette décision.

Une certification peut apporter une assurance forte sur un système de management dans un périmètre donné tout en restant muette sur une fonctionnalité précise. Une vulnérabilité publique peut être incontestable tout en étant déjà corrigée sur la version utilisée. Une réponse refusée peut protéger un secret légitime sans prouver la présence ni l’absence du contrôle.

Le registre doit permettre ces nuances. Il ne doit pas les écraser.

## Un refus documentaire devient une incertitude à traiter

Le refus de transmettre un rapport complet ne signifie pas automatiquement que le fournisseur cache une faiblesse. Il peut résulter d’une obligation de confidentialité, d’un secret d’affaires, d’un risque pour ses autres clients ou d’une interdiction contractuelle.

La réponse proportionnée consiste à chercher une autre voie :

- extrait expurgé ou lettre d’attestation ;
- rapport de certification et périmètre exact ;
- examen en salle virtuelle sans téléchargement ;
- démonstration contrôlée ;
- revue par un tiers autorisé ;
- droit contractuel d’audit ou de réception d’un rapport ;
- contrôle compensatoire chez le client ;
- risque résiduel formellement accepté.

Si aucune voie ne permet de réduire l’incertitude à un niveau acceptable, le dossier doit le dire. L’absence de preuve ne devient ni preuve d’absence, ni validation silencieuse.

## La revue suit le cycle de vie, pas la date du questionnaire

Le SP 1326 recommande de définir quand les informations doivent être actualisées et d’envisager une surveillance continue. Le règlement 2024/2690 exige, pour son périmètre, des revues planifiées et une réaction aux changements significatifs ou aux incidents. L’ENISA cite aussi les évolutions opérationnelles, le non-respect d’obligations, les nouvelles menaces et vulnérabilités comme déclencheurs possibles d’une revue non planifiée.

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 560" role="img" aria-labelledby="supplier-lifecycle-title supplier-lifecycle-desc">
    <title id="supplier-lifecycle-title">Le cycle de vie d’une décision fournisseur fondée sur des preuves</title>
    <desc id="supplier-lifecycle-desc">Cinq étapes relient la criticité de l’usage, la due diligence, la sélection et le contrat, la surveillance puis la sortie ou le renouvellement. Les incidents et changements importants déclenchent une nouvelle évaluation.</desc>
    <path d="M94 238H826" stroke="#52645e" stroke-width="4" />
    <circle cx="94" cy="238" r="15" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="277" cy="238" r="15" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <circle cx="460" cy="238" r="15" fill="#121816" stroke="#c5a66f" stroke-width="3" />
    <circle cx="643" cy="238" r="15" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="826" cy="238" r="15" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <rect x="22" y="62" width="144" height="116" rx="16" fill="#121816" stroke="#81dacb" />
    <text x="42" y="92" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">01 · CADRER</text>
    <text x="42" y="122" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Usage et criticité</text>
    <text x="42" y="148" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Données, impact</text>
    <rect x="205" y="298" width="144" height="116" rx="16" fill="#121816" stroke="#aa9cc4" />
    <text x="225" y="328" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">02 · CHERCHER</text>
    <text x="225" y="358" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Due diligence</text>
    <text x="225" y="384" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Faits et inconnues</text>
    <rect x="388" y="62" width="144" height="116" rx="16" fill="#121816" stroke="#c5a66f" />
    <text x="408" y="92" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">03 · DÉCIDER</text>
    <text x="408" y="122" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Choix et contrat</text>
    <text x="408" y="148" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Conditions, sortie</text>
    <rect x="571" y="298" width="144" height="116" rx="16" fill="#121816" stroke="#81dacb" />
    <text x="591" y="328" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">04 · SUIVRE</text>
    <text x="591" y="358" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Service et risque</text>
    <text x="591" y="384" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Écarts, incidents</text>
    <rect x="754" y="62" width="144" height="116" rx="16" fill="#0b100f" stroke="#aa9cc4" />
    <text x="774" y="92" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">05 · REVOIR</text>
    <text x="774" y="122" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Renouveler ou sortir</text>
    <text x="774" y="148" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Effacer, archiver</text>
    <path d="M826 198C826 18 94 18 94 198" fill="none" stroke="#33413c" stroke-width="2" stroke-dasharray="7 7" />
    <path d="m84 187 10 11 10-11" fill="none" stroke="#33413c" stroke-width="2" />
    <rect x="102" y="454" width="716" height="72" rx="15" fill="#0b100f" stroke="#33413c" />
    <text x="132" y="482" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">DÉCLENCHEURS</text>
    <text x="132" y="508" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Incident, acquisition, nouvelle dépendance, fin de support, changement de service ou de risque</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 340 980" role="img" aria-labelledby="supplier-lifecycle-mobile-title supplier-lifecycle-mobile-desc">
    <title id="supplier-lifecycle-mobile-title">Le cycle de vie d’une décision fournisseur fondée sur des preuves</title>
    <desc id="supplier-lifecycle-mobile-desc">Le cycle vertical part de l’usage et de la criticité, passe par la due diligence, la décision contractuelle et la surveillance, puis conduit au renouvellement ou à la sortie.</desc>
    <path d="M50 74v650" stroke="#52645e" stroke-width="4" />
    <circle cx="50" cy="74" r="12" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="50" cy="234" r="12" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <circle cx="50" cy="394" r="12" fill="#121816" stroke="#c5a66f" stroke-width="3" />
    <circle cx="50" cy="554" r="12" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="50" cy="714" r="12" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <rect x="80" y="24" width="240" height="100" rx="15" fill="#121816" stroke="#81dacb" />
    <text x="100" y="54" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">01 · CADRER</text>
    <text x="100" y="84" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">Usage, données, criticité</text>
    <rect x="80" y="184" width="240" height="100" rx="15" fill="#121816" stroke="#aa9cc4" />
    <text x="100" y="214" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">02 · CHERCHER</text>
    <text x="100" y="244" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">Faits, sources, inconnues</text>
    <rect x="80" y="344" width="240" height="100" rx="15" fill="#121816" stroke="#c5a66f" />
    <text x="100" y="374" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">03 · DÉCIDER</text>
    <text x="100" y="404" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">Choix, conditions, sortie</text>
    <rect x="80" y="504" width="240" height="100" rx="15" fill="#121816" stroke="#81dacb" />
    <text x="100" y="534" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">04 · SUIVRE</text>
    <text x="100" y="564" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">Service, écarts, incidents</text>
    <rect x="80" y="664" width="240" height="100" rx="15" fill="#0b100f" stroke="#aa9cc4" />
    <text x="100" y="694" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">05 · REVOIR</text>
    <text x="100" y="724" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">Renouveler, sortir, effacer</text>
    <path d="M50 724C8 724 8 74 50 74" fill="none" stroke="#33413c" stroke-width="2" stroke-dasharray="7 7" />
    <path d="m39 84 11-10 11 10" fill="none" stroke="#33413c" stroke-width="2" />
    <rect x="20" y="820" width="300" height="122" rx="15" fill="#0b100f" stroke="#33413c" />
    <text x="44" y="852" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">DÉCLENCHEURS</text>
    <text x="44" y="880" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Incident, acquisition, dépendance,</text>
    <text x="44" y="902" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">fin de support ou changement de risque</text>
  </svg>
  <figcaption>Le cycle est une proposition opérationnelle BLACKPROOF. Une revue planifiée n’exclut jamais une réévaluation déclenchée par un événement.</figcaption>
</figure>

Les déclencheurs doivent être définis avant l’événement. Parmi les signaux utiles :

- changement d’actionnariat, fusion ou acquisition ;
- modification du produit, de l’hébergement, des lieux de traitement ou du service ;
- nouveau sous-traitant critique ou dépendance commune découverte ;
- fin de support, version obsolète ou vulnérabilité significative ;
- incident affectant le produit, le fournisseur ou une dépendance ;
- non-respect d’un niveau de service ou d’une obligation contractuelle ;
- évolution de la criticité de l’usage ou des données confiées ;
- information nouvelle d’une autorité ou d’une source qualifiée.

La fréquence calendaire reste nécessaire pour les éléments qui vieillissent silencieusement. Elle doit être plus courte pour un service critique ou fortement évolutif que pour un produit isolé, stable et sans accès aux données.

## Le dossier minimal de décision

Avant de signer ou de renouveler, l’équipe devrait être capable de produire un dossier autonome comprenant :

1. le service, le produit, la version et l’entité juridique évalués ;
2. l’usage prévu, les données concernées et la criticité ;
3. les critères de décision approuvés ;
4. les cinq axes du SP 1326 lorsqu’ils sont pertinents ;
5. les constats avec leurs sources, dates et statuts ;
6. les déclarations attribuées au fournisseur ;
7. les pièces sensibles examinées et les limites de la revue ;
8. les inconnues et contradictions non résolues ;
9. les mesures contractuelles et contrôles compensatoires ;
10. le risque résiduel et l’autorité qui l’accepte ;
11. les événements déclencheurs et la prochaine revue ;
12. les règles d’accès, de conservation et d’effacement du dossier.

Le [Questionnaire Crusher](/questionnaire-crusher) peut aider à transformer une demande fournisseur en exigences et dette documentaire. La [bibliothèque de preuves](/evidence-library) fournit des repères sur les justificatifs possibles. Ces outils ne décident toutefois ni de la criticité, ni de la suffisance d’une preuve, ni de l’acceptation du risque.

## Limites et inconnues au 30 juillet 2026

- Le SP 1326 est un guide NIST récent, centré sur les fournisseurs TIC et largement illustré par le contexte fédéral américain. Ce n’est ni une certification ni une obligation juridique européenne.
- Le SP 1326 complète le SP 800-161 Rev. 1. Il ne remplace pas une évaluation du risque de chaîne d’approvisionnement ni une revue technique lorsque celles-ci sont nécessaires.
- Le règlement d’exécution 2024/2690 détaille les exigences pour les catégories d’entités visées par l’article 21, paragraphe 5, de NIS 2. Il ne doit pas être présenté comme le référentiel directement applicable à toutes les organisations.
- Le guide ENISA apporte des exemples de preuves et de mise en œuvre, mais il n’est pas juridiquement contraignant.
- Le principe de minimisation du RGPD concerne les données à caractère personnel. La réduction de la collecte de secrets techniques ou commerciaux repose sur d’autres obligations et sur la gestion du risque.
- Aucune matrice générique ne peut déterminer seule si une preuve est suffisante. La conclusion dépend du service, de la menace, de l’impact, du secteur, du contrat et des obligations applicables.

La méthode proposée organise les questions et les éléments de preuve. Elle ne fournit pas un label fournisseur et ne remplace ni un conseil juridique, ni un audit, ni la décision d’une autorité compétente.

## Questions de contrôle

1. Le fournisseur, le produit, la version et l’usage sont-ils identifiés sans ambiguïté ?
2. Chaque demande documentaire est-elle reliée à un risque ou à une exigence précise ?
3. Les faits publics, déclarations, attestations, observations et tests sont-ils distingués ?
4. Les sources, auteurs, dates, périmètres et limites sont-ils conservés ?
5. La criticité justifie-t-elle la profondeur d’investigation demandée ?
6. Une pièce sensible peut-elle être examinée sans être copiée ?
7. Les données personnelles demandées sont-elles nécessaires à une finalité définie ?
8. Les refus, contradictions et inconnues restent-ils visibles dans la décision ?
9. Les mesures contractuelles répondent-elles aux constats réellement établis ?
10. Un responsable, une échéance et un déclencheur de révision sont-ils associés à chaque action ?
11. Le dossier permet-il de justifier le risque résiduel sans divulguer inutilement le système du fournisseur ?
12. Les règles de conservation et d’effacement sont-elles prévues dès l’ouverture du dossier ?

Une due diligence est terminée lorsque la décision est explicable, bornée et révisable. Elle ne l’est pas lorsque le dernier fichier demandé arrive dans un répertoire.
