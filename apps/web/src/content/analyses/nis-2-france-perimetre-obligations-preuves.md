---
title: "NIS 2 en France : qui est concerné et que préparer dès maintenant"
description: "Périmètre, gouvernance, sécurité, notifications et preuves à préparer sans confondre la directive européenne avec sa transposition française en cours."
publishedAt: 2026-07-19
updatedAt: 2026-07-20
category: "Réglementation"
format: "Décryptage"
confidence: "Confiance élevée"
author: "Rédaction BLACKPROOF"
tags:
  - NIS 2
  - cybersécurité
  - gouvernance
  - gestion des risques
  - notification d’incident
  - ReCyF
readingMinutes: 14
featured: true
draft: false
sources:
  - title: "Directive (UE) 2022/2555 concernant des mesures destinées à assurer un niveau élevé commun de cybersécurité dans l’ensemble de l’Union"
    publisher: "Journal officiel de l’Union européenne"
    url: "https://eur-lex.europa.eu/eli/dir/2022/2555"
    kind: "Source primaire"
    publicationDate: 2022-12-27
    consultedAt: 2026-07-19
  - title: "La directive NIS 2"
    publisher: "ANSSI"
    url: "https://cyber.gouv.fr/reglementation/cybersecurite-systemes-dinformation/directives-nis-nis2-et-dispositif-saiv/directive-nis-2/"
    kind: "Source institutionnelle"
    consultedAt: 2026-07-20
  - title: "Projet de loi relatif à la résilience des infrastructures critiques et au renforcement de la cybersécurité"
    publisher: "Assemblée nationale"
    url: "https://www.assemblee-nationale.fr/dyn/17/dossiers/DLR5L17N50731"
    kind: "Source primaire"
    consultedAt: 2026-07-20
  - title: "Comment savoir si la directive NIS 2 s’applique à mon entité ?"
    publisher: "MonEspaceNIS2 - ANSSI"
    url: "https://aide.monespacenis2.cyber.gouv.fr/fr/article/comment-savoir-si-la-directive-nis-2-sapplique-a-mon-entite-1o0q47s/"
    kind: "Source institutionnelle"
    consultedAt: 2026-07-19
  - title: "Référentiel Cyber France, version 2.5"
    publisher: "ANSSI"
    url: "https://messervices.cyber.gouv.fr/documents-ressources/20260317_NIS_V2_ReCyF_v2.5.pdf"
    kind: "Source institutionnelle"
    publicationDate: 2026-03-17
    consultedAt: 2026-07-20
  - title: "Directive on measures for a high common level of cybersecurity across the Union - NIS2 Directive FAQs"
    publisher: "Commission européenne"
    url: "https://digital-strategy.ec.europa.eu/en/faqs/directive-measures-high-common-level-cybersecurity-across-union-nis2-directive-faqs"
    kind: "Source institutionnelle"
    consultedAt: 2026-07-19
  - title: "Règlement d’exécution (UE) 2024/2690"
    publisher: "Journal officiel de l’Union européenne"
    url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R2690"
    kind: "Source primaire"
    publicationDate: 2024-10-17
    consultedAt: 2026-07-19
  - title: "NIS2 Technical Implementation Guidance"
    publisher: "ENISA"
    url: "https://www.enisa.europa.eu/publications/nis2-technical-implementation-guidance"
    kind: "Source institutionnelle"
    publicationDate: 2025-06-26
    consultedAt: 2026-07-19
---

NIS 2 ne se résume ni à une liste de produits de sécurité, ni à un audit à réussir une fois. La directive place la gestion du risque cyber dans la gouvernance de l’organisation, impose un socle de mesures techniques, opérationnelles et organisationnelles, et organise la notification des incidents importants.

En France, une précision commande toute l’analyse : **la transposition nationale est encore en cours au 20 juillet 2026**. L’[ANSSI](https://cyber.gouv.fr/reglementation/cybersecurite-systemes-dinformation/directives-nis-nis2-et-dispositif-saiv/directive-nis-2/) parle toujours de « futures entités essentielles et importantes ». Le [dossier de l’Assemblée nationale](https://www.assemblee-nationale.fr/dyn/17/dossiers/DLR5L17N50731) montre un texte adopté par le Sénat le 12 mars 2025, puis un texte de commission déposé à l’Assemblée le 10 septembre 2025, sans adoption définitive affichée.

> Conclusion courte : il est possible et utile de se préparer maintenant, mais il serait inexact de présenter le projet de loi français ou le ReCyF de mars 2026 comme un cadre national définitivement adopté.

## Trois couches à ne pas confondre

La [directive (UE) 2022/2555](https://eur-lex.europa.eu/eli/dir/2022/2555) a fixé au 17 octobre 2024 la date limite de transposition par les États membres. Elle définit le cadre européen : périmètre, gouvernance, gestion des risques, notification, supervision et sanctions. Sa mise en œuvre concrète dépend ensuite du droit national, sauf lorsqu’un règlement européen directement applicable précise certaines obligations.

En France, le projet de loi « Résilience » doit assurer cette transposition. Le **Référentiel Cyber France, version 2.5**, publié par l’ANSSI le 17 mars 2026, se présente explicitement comme un [document de travail](https://messervices.cyber.gouv.fr/documents-ressources/20260317_NIS_V2_ReCyF_v2.5.pdf). L’ANSSI précise que ses moyens acceptables de conformité ne sont, par défaut, pas obligatoires et que le document dépend encore du projet de loi et de ses textes d’application.

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 390" role="img" aria-labelledby="nis-layers-title nis-layers-desc">
    <title id="nis-layers-title">Les trois couches du cadre NIS 2 en France</title>
    <desc id="nis-layers-desc">La directive européenne définit le socle, la transposition française en cours doit fixer le droit national et la préparation opérationnelle peut commencer sans attendre.</desc>
    <rect x="20" y="38" width="268" height="246" rx="18" fill="#121816" stroke="#81dacb" />
    <rect x="326" y="38" width="268" height="246" rx="18" fill="#121816" stroke="#aa9cc4" />
    <rect x="632" y="38" width="268" height="246" rx="18" fill="#121816" stroke="#c5a66f" />
    <path d="M288 161h38M594 161h38" stroke="#78827c" stroke-width="2" />
    <path d="M316 153l10 8-10 8M622 153l10 8-10 8" fill="none" stroke="#78827c" stroke-width="2" />
    <text x="44" y="78" fill="#81dacb" font-size="14" font-family="ui-monospace, monospace">01 · UNION EUROPÉENNE</text>
    <text x="44" y="116" fill="#f1f4f0" font-size="21" font-family="system-ui, sans-serif">Directive 2022/2555</text>
    <text x="44" y="151" fill="#a3ada6" font-size="15" font-family="system-ui, sans-serif">Socle NIS 2</text>
    <text x="44" y="178" fill="#a3ada6" font-size="15" font-family="system-ui, sans-serif">Articles 20, 21 et 23</text>
    <text x="44" y="219" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Échéance de transposition</text>
    <text x="44" y="244" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">17 octobre 2024</text>
    <text x="350" y="78" fill="#aa9cc4" font-size="14" font-family="ui-monospace, monospace">02 · DROIT FRANÇAIS</text>
    <text x="350" y="116" fill="#f1f4f0" font-size="21" font-family="system-ui, sans-serif">Transposition en cours</text>
    <text x="350" y="151" fill="#a3ada6" font-size="15" font-family="system-ui, sans-serif">Projet de loi Résilience</text>
    <text x="350" y="178" fill="#a3ada6" font-size="15" font-family="system-ui, sans-serif">Textes d’application attendus</text>
    <text x="350" y="219" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">ReCyF 2.5</text>
    <text x="350" y="244" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Document de travail</text>
    <text x="656" y="78" fill="#c5a66f" font-size="14" font-family="ui-monospace, monospace">03 · ORGANISATION</text>
    <text x="656" y="116" fill="#f1f4f0" font-size="21" font-family="system-ui, sans-serif">Préparation immédiate</text>
    <text x="656" y="151" fill="#a3ada6" font-size="15" font-family="system-ui, sans-serif">Périmètre documenté</text>
    <text x="656" y="178" fill="#a3ada6" font-size="15" font-family="system-ui, sans-serif">Risques et responsabilités</text>
    <text x="656" y="205" fill="#a3ada6" font-size="15" font-family="system-ui, sans-serif">Incidents et continuité</text>
    <text x="656" y="244" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Preuves vérifiables</text>
    <rect x="112" y="324" width="696" height="42" rx="12" fill="#0b100f" stroke="#33413c" />
    <text x="150" y="351" fill="#a3ada6" font-size="15" font-family="system-ui, sans-serif">Une source européenne, un texte français provisoire et une pratique utile n’ont pas la même portée.</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 340 790" role="img" aria-labelledby="nis-layers-mobile-title nis-layers-mobile-desc">
    <title id="nis-layers-mobile-title">Les trois couches du cadre NIS 2 en France</title>
    <desc id="nis-layers-mobile-desc">La directive européenne définit le socle, la transposition française en cours doit fixer le droit national et la préparation opérationnelle peut commencer sans attendre.</desc>
    <rect x="20" y="20" width="300" height="190" rx="16" fill="#121816" stroke="#81dacb" />
    <rect x="20" y="250" width="300" height="190" rx="16" fill="#121816" stroke="#aa9cc4" />
    <rect x="20" y="480" width="300" height="190" rx="16" fill="#121816" stroke="#c5a66f" />
    <path d="M170 210v40M170 440v40" stroke="#78827c" stroke-width="2" />
    <path d="M162 240l8 10 8-10M162 470l8 10 8-10" fill="none" stroke="#78827c" stroke-width="2" />
    <text x="42" y="54" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">01 · UNION EUROPÉENNE</text>
    <text x="42" y="88" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">Directive 2022/2555</text>
    <text x="42" y="121" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Socle NIS 2 · articles 20, 21 et 23</text>
    <text x="42" y="157" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Échéance : 17 octobre 2024</text>
    <text x="42" y="284" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">02 · DROIT FRANÇAIS</text>
    <text x="42" y="318" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">Transposition en cours</text>
    <text x="42" y="351" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Projet de loi et textes attendus</text>
    <text x="42" y="387" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">ReCyF 2.5 : document de travail</text>
    <text x="42" y="514" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">03 · ORGANISATION</text>
    <text x="42" y="548" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">Préparation immédiate</text>
    <text x="42" y="581" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Périmètre, risques, incidents</text>
    <text x="42" y="617" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Décisions et preuves vérifiables</text>
    <rect x="20" y="710" width="300" height="58" rx="14" fill="#0b100f" stroke="#33413c" />
    <text x="38" y="735" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Ne pas attribuer la même portée</text>
    <text x="38" y="754" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">à ces trois couches.</text>
  </svg>
  <figcaption>État vérifié le 20 juillet 2026. Sources : directive (UE) 2022/2555, dossier de l’Assemblée nationale et ANSSI.</figcaption>
</figure>

## Êtes-vous concerné ? Une qualification, pas une intuition

NIS 2 couvre des types d’entités relevant de **18 secteurs** répartis entre l’annexe I, consacrée aux secteurs hautement critiques, et l’annexe II, qui regroupe d’autres secteurs critiques. Cette appartenance sectorielle ne suffit pas toujours. La taille de l’entité, sa personnalité morale, ses entreprises partenaires ou liées, la nature exacte du service et certains cas d’inclusion indépendants de la taille doivent aussi être examinés.

| Annexe I, secteurs hautement critiques | Annexe II, autres secteurs critiques |
| --- | --- |
| Énergie, transports, secteur bancaire, infrastructures des marchés financiers, santé | Services postaux et d’expédition, déchets, produits chimiques, alimentation |
| Eau potable, eaux usées, infrastructures numériques, gestion de services TIC interentreprises | Certaines activités de fabrication, fournisseurs numériques, recherche |
| Administration publique, espace |  |

La qualification détaillée dépend des définitions et renvois contenus dans les annexes de la [directive](https://eur-lex.europa.eu/eli/dir/2022/2555), pas d’un intitulé commercial. Par exemple, « fournisseur de services gérés » répond à une définition juridique précise. L’[ANSSI](https://aide.monespacenis2.cyber.gouv.fr/fr/article/comment-savoir-si-la-directive-nis-2-sapplique-a-mon-entite-1o0q47s/) rappelle aussi qu’il appartient à l’entité d’évaluer son périmètre et que MonEspaceNIS2 fournit une orientation générale, appelée à évoluer avec la transposition.

La distinction entre **entité essentielle** et **entité importante** repose principalement sur le secteur, la taille et certains statuts particuliers. Des fournisseurs DNS, registres de noms de domaine de premier niveau et prestataires de services de confiance qualifiés peuvent notamment relever du régime quelle que soit leur taille. Des entités peuvent aussi être désignées en raison de leur criticité. Une analyse de périmètre sérieuse doit donc conserver les pièces ayant permis la conclusion : activité exacte, effectif, données financières, structure du groupe, implantations et éventuelle réglementation sectorielle.

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 410" role="img" aria-labelledby="scope-path-title scope-path-desc">
    <title id="scope-path-title">Chemin de qualification du périmètre NIS 2</title>
    <desc id="scope-path-desc">La qualification part de l’entité juridique et de ses activités, examine les annexes, la taille et les cas particuliers, puis documente une conclusion à confirmer selon le droit national.</desc>
    <rect x="28" y="44" width="190" height="120" rx="16" fill="#121816" stroke="#52645e" />
    <rect x="250" y="44" width="190" height="120" rx="16" fill="#121816" stroke="#81dacb" />
    <rect x="472" y="44" width="190" height="120" rx="16" fill="#121816" stroke="#aa9cc4" />
    <rect x="694" y="44" width="198" height="120" rx="16" fill="#121816" stroke="#c5a66f" />
    <path d="M218 104h32M440 104h32M662 104h32" stroke="#78827c" stroke-width="2" />
    <path d="M240 96l10 8-10 8M462 96l10 8-10 8M684 96l10 8-10 8" fill="none" stroke="#78827c" stroke-width="2" />
    <text x="50" y="76" fill="#a3ada6" font-size="13" font-family="ui-monospace, monospace">01 · ENTITÉ</text>
    <text x="50" y="108" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Personne morale</text>
    <text x="50" y="134" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Activités et services</text>
    <text x="272" y="76" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">02 · SECTEUR</text>
    <text x="272" y="108" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Annexe I ou II</text>
    <text x="272" y="134" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Définition exacte</text>
    <text x="494" y="76" fill="#aa9cc4" font-size="13" font-family="ui-monospace, monospace">03 · CRITÈRES</text>
    <text x="494" y="108" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Taille et groupe</text>
    <text x="494" y="134" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Cas particuliers</text>
    <text x="716" y="76" fill="#c5a66f" font-size="13" font-family="ui-monospace, monospace">04 · CONCLUSION</text>
    <text x="716" y="108" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Essentielle, importante</text>
    <text x="716" y="134" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">ou hors périmètre</text>
    <path d="M124 164v70h666v-70" fill="none" stroke="#33413c" stroke-width="2" stroke-dasharray="6 7" />
    <rect x="142" y="234" width="636" height="118" rx="18" fill="#0b100f" stroke="#33413c" />
    <text x="174" y="270" fill="#81dacb" font-size="14" font-family="ui-monospace, monospace">DOSSIER DE QUALIFICATION</text>
    <text x="174" y="304" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Sources, hypothèses, données de taille, liens capitalistiques, pays et décision</text>
    <text x="174" y="332" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">À réviser lorsque la transposition ou la structure de l’entité évolue</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 340 810" role="img" aria-labelledby="scope-path-mobile-title scope-path-mobile-desc">
    <title id="scope-path-mobile-title">Chemin de qualification du périmètre NIS 2</title>
    <desc id="scope-path-mobile-desc">La qualification part de l’entité juridique et de ses activités, examine les annexes, la taille et les cas particuliers, puis documente une conclusion à confirmer selon le droit national.</desc>
    <rect x="20" y="20" width="300" height="108" rx="15" fill="#121816" stroke="#52645e" />
    <rect x="20" y="160" width="300" height="108" rx="15" fill="#121816" stroke="#81dacb" />
    <rect x="20" y="300" width="300" height="108" rx="15" fill="#121816" stroke="#aa9cc4" />
    <rect x="20" y="440" width="300" height="108" rx="15" fill="#121816" stroke="#c5a66f" />
    <path d="M170 128v32M170 268v32M170 408v32" stroke="#78827c" stroke-width="2" />
    <path d="M162 150l8 10 8-10M162 290l8 10 8-10M162 430l8 10 8-10" fill="none" stroke="#78827c" stroke-width="2" />
    <text x="42" y="52" fill="#a3ada6" font-size="12" font-family="ui-monospace, monospace">01 · ENTITÉ</text>
    <text x="42" y="82" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Personne morale, activités, services</text>
    <text x="42" y="192" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">02 · SECTEUR</text>
    <text x="42" y="222" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Annexe I ou II, définition exacte</text>
    <text x="42" y="332" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">03 · CRITÈRES</text>
    <text x="42" y="362" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Taille, groupe, cas particuliers</text>
    <text x="42" y="472" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">04 · CONCLUSION</text>
    <text x="42" y="502" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Essentielle, importante ou hors périmètre</text>
    <rect x="20" y="606" width="300" height="164" rx="16" fill="#0b100f" stroke="#33413c" />
    <text x="42" y="640" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">DOSSIER DE QUALIFICATION</text>
    <text x="42" y="674" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">Sources et données de taille</text>
    <text x="42" y="700" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">Liens capitalistiques et pays</text>
    <text x="42" y="733" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Décision datée et révisable</text>
  </svg>
  <figcaption>Cadre de décision BLACKPROOF fondé sur les articles 2 et 3 et les annexes I et II de la directive. Il ne remplace pas une qualification juridique.</figcaption>
</figure>

### Quatre erreurs de périmètre fréquentes

- **Raisonner par marque plutôt que par personne morale.** L’assujettissement porte sur une entité juridique et ses activités. Un groupe peut réunir plusieurs conclusions différentes.
- **S’arrêter au code d’activité principal.** Les annexes renvoient à la nature du service effectivement fourni et à des définitions sectorielles.
- **Appliquer un seuil isolé.** Les règles européennes relatives aux entreprises partenaires et liées peuvent modifier l’analyse de taille.
- **Oublier les régimes sectoriels.** L’article 4 de la directive prévoit une articulation avec les actes de l’Union qui imposent des obligations d’effet au moins équivalent. Il faut donc analyser, entre autres, l’éventuelle application de DORA aux entités financières concernées au lieu d’empiler mécaniquement les textes.

## Les obligations structurantes

### La direction approuve et supervise

L’article 20 de la [directive](https://eur-lex.europa.eu/eli/dir/2022/2555) demande que les organes de direction approuvent les mesures de gestion des risques et supervisent leur mise en œuvre. Il prévoit aussi une formation des membres de ces organes. NIS 2 fait donc du risque cyber un sujet de décision et de contrôle, pas seulement une délégation au responsable de la sécurité.

Une preuve utile n’est pas la présence du mot « cyber » dans un procès-verbal. Elle doit montrer quelle décision a été prise, sur quel périmètre, à partir de quelle information, avec quel responsable, quelle échéance et quel suivi.

### Dix familles minimales de gestion des risques

L’article 21 impose des mesures appropriées et proportionnées, fondées sur une approche tous risques. Il énumère au moins dix familles :

1. politiques d’analyse des risques et de sécurité des systèmes d’information ;
2. gestion des incidents ;
3. continuité, sauvegardes, reprise et gestion de crise ;
4. sécurité de la chaîne d’approvisionnement ;
5. sécurité de l’acquisition, du développement et de la maintenance, y compris les vulnérabilités ;
6. évaluation de l’efficacité des mesures ;
7. cyberhygiène et formation ;
8. cryptographie et chiffrement lorsque pertinent ;
9. sécurité des ressources humaines, contrôle d’accès et gestion des actifs ;
10. authentification multifacteur ou continue et communications sécurisées, selon les besoins.

La proportionnalité n’est pas une dispense générale. La directive demande de prendre en compte l’exposition au risque, la taille, la probabilité et la gravité des incidents, ainsi que leurs conséquences sociétales et économiques. Une mesure écartée doit donc reposer sur une justification compréhensible et révisable.

Le [règlement d’exécution (UE) 2024/2690](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R2690) précise directement les exigences techniques et méthodologiques pour une liste déterminée d’acteurs numériques : DNS, registres de domaines de premier niveau, cloud, centres de données, réseaux de diffusion de contenu, services gérés, services de sécurité gérés, places de marché, moteurs de recherche, réseaux sociaux et services de confiance. **Il ne faut pas étendre automatiquement ses critères détaillés à tous les secteurs NIS 2.** L’[ENISA](https://www.enisa.europa.eu/publications/nis2-technical-implementation-guidance) a publié en juin 2025 un guide de mise en œuvre destiné à ce même périmètre et précise que ce guide n’est pas juridiquement contraignant.

### La notification commence avant la fin de l’enquête

Pour un incident important, l’article 23 organise une séquence générale à partir du moment où l’entité en a connaissance : alerte précoce dans les 24 heures, notification dans les 72 heures, rapport intermédiaire si le CSIRT ou l’autorité le demande, puis rapport final au plus tard un mois après la notification. Si l’incident est encore en cours, un rapport d’avancement remplace temporairement le rapport final.

La [Commission européenne](https://digital-strategy.ec.europa.eu/en/faqs/directive-measures-high-common-level-cybersecurity-across-union-nis2-directive-faqs) confirme que l’alerte précoce vise une réaction rapide et ne suppose pas une investigation achevée. Des règles particulières existent, notamment pour certains services de confiance, et les modalités françaises doivent encore être confirmées par les textes de transposition.

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 330" role="img" aria-labelledby="incident-timeline-title incident-timeline-desc">
    <title id="incident-timeline-title">Séquence générale de notification d’un incident important</title>
    <desc id="incident-timeline-desc">À partir de la prise de connaissance, une alerte précoce intervient dans les 24 heures, une notification dans les 72 heures et un rapport final au plus tard un mois après cette notification.</desc>
    <path d="M92 158H828" stroke="#52645e" stroke-width="4" />
    <circle cx="92" cy="158" r="13" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="310" cy="158" r="13" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="524" cy="158" r="13" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <circle cx="828" cy="158" r="13" fill="#121816" stroke="#c5a66f" stroke-width="3" />
    <text x="50" y="65" fill="#81dacb" font-size="14" font-family="ui-monospace, monospace">T0</text>
    <text x="50" y="96" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Prise de connaissance</text>
    <text x="50" y="120" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Incident important</text>
    <text x="256" y="205" fill="#81dacb" font-size="14" font-family="ui-monospace, monospace">≤ 24 HEURES</text>
    <text x="256" y="236" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Alerte précoce</text>
    <text x="256" y="260" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Signal initial</text>
    <text x="474" y="65" fill="#aa9cc4" font-size="14" font-family="ui-monospace, monospace">≤ 72 HEURES</text>
    <text x="474" y="96" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Notification</text>
    <text x="474" y="120" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Évaluation initiale</text>
    <text x="734" y="205" fill="#c5a66f" font-size="14" font-family="ui-monospace, monospace">≤ 1 MOIS</text>
    <text x="734" y="236" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Rapport final</text>
    <text x="734" y="260" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Ou avancement</text>
    <rect x="252" y="286" width="416" height="30" rx="10" fill="#0b100f" stroke="#33413c" />
    <text x="278" y="306" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Rapport intermédiaire sur demande de l’autorité</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 340 750" role="img" aria-labelledby="incident-timeline-mobile-title incident-timeline-mobile-desc">
    <title id="incident-timeline-mobile-title">Séquence générale de notification d’un incident important</title>
    <desc id="incident-timeline-mobile-desc">À partir de la prise de connaissance, une alerte précoce intervient dans les 24 heures, une notification dans les 72 heures et un rapport final au plus tard un mois après cette notification.</desc>
    <path d="M70 70v550" stroke="#52645e" stroke-width="4" />
    <circle cx="70" cy="70" r="12" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="70" cy="220" r="12" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="70" cy="370" r="12" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <circle cx="70" cy="620" r="12" fill="#121816" stroke="#c5a66f" stroke-width="3" />
    <text x="102" y="55" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">T0</text>
    <text x="102" y="84" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Prise de connaissance</text>
    <text x="102" y="108" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Incident important</text>
    <text x="102" y="205" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">≤ 24 HEURES</text>
    <text x="102" y="234" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Alerte précoce</text>
    <text x="102" y="258" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Signal initial</text>
    <text x="102" y="355" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">≤ 72 HEURES</text>
    <text x="102" y="384" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Notification</text>
    <text x="102" y="408" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Évaluation initiale</text>
    <rect x="102" y="466" width="208" height="70" rx="12" fill="#0b100f" stroke="#33413c" />
    <text x="120" y="493" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Rapport intermédiaire</text>
    <text x="120" y="514" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">sur demande</text>
    <text x="102" y="605" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">≤ 1 MOIS</text>
    <text x="102" y="634" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Rapport final</text>
    <text x="102" y="658" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Ou rapport d’avancement</text>
    <rect x="20" y="700" width="300" height="34" rx="10" fill="#0b100f" stroke="#33413c" />
    <text x="39" y="722" fill="#a3ada6" font-size="11" font-family="system-ui, sans-serif">Les modalités nationales restent à confirmer.</text>
  </svg>
  <figcaption>Séquence générale de l’article 23 de la directive. Les délais courent à partir de la prise de connaissance, pas de la fin de l’analyse forensique.</figcaption>
</figure>

### Supervision et sanctions ne sont pas identiques

La directive distingue les régimes de supervision. Les entités essentielles peuvent faire l’objet de contrôles ex ante et ex post, notamment des inspections, audits et demandes d’informations. Pour les entités importantes, la supervision est en principe ex post, lorsqu’une autorité dispose d’éléments laissant penser à un manquement. Cette différence ne réduit pas les obligations de gestion des risques ou de notification.

Pour les violations des articles 21 ou 23, l’article 34 demande aux États membres de prévoir, pour les entreprises, des plafonds d’amendes administratives atteignant au moins le montant le plus élevé entre **10 millions d’euros ou 2 % du chiffre d’affaires annuel mondial** pour les entités essentielles, et **7 millions d’euros ou 1,4 %** pour les entités importantes. Ce sont des minima européens pour les plafonds nationaux, pas des amendes automatiques. Les règles françaises de contrôle, de procédure et de sanction dépendent de la transposition définitive.

## Un plan de préparation en 90 jours

Le calendrier suivant est une **proposition opérationnelle BLACKPROOF**, pas un délai légal. Il vise à produire des décisions et des preuves réutilisables sans figer prématurément une interprétation du futur droit français.

### Jours 1 à 15 : qualifier et gouverner

- nommer un sponsor exécutif et un responsable de la préparation ;
- établir le dossier de qualification par personne morale, activité, secteur, taille, structure de groupe et pays ;
- utiliser [MonEspaceNIS2](https://aide.monespacenis2.cyber.gouv.fr/fr/) comme outil d’orientation, sans le transformer en avis juridique définitif ;
- recenser les activités et services puis les systèmes d’information qui les supportent ;
- consigner les inconnues, les hypothèses et la date de prochaine revue.

Le ReCyF de mars 2026 demande, dans son objectif 1, une liste tenue à jour des activités, services et systèmes d’information associés. Commencer par cette relation métier-SI est plus utile qu’un inventaire technique sans contexte.

### Jours 16 à 45 : mesurer les écarts et préparer l’incident

- comparer les pratiques existantes aux dix familles de l’article 21 ;
- construire une matrice d’écarts avec risque, responsable, décision, échéance et preuve attendue ;
- définir le critère d’escalade vers l’équipe chargée d’évaluer un incident potentiellement important ;
- préparer les contacts, délégations et canaux de notification accessibles en mode dégradé ;
- tester sur table la séquence 24 heures, 72 heures et un mois avec les équipes sécurité, juridique, métiers, communication et direction.

La notification NIS 2 doit aussi être articulée avec les autres obligations possibles, notamment celles relatives aux violations de données personnelles, aux autorités sectorielles, aux contrats et aux assurances. Un événement peut déclencher plusieurs analyses sans que leurs critères ni leurs destinataires soient identiques. La méthode publiée dans notre analyse sur les [fuites de données](/analyses/fuite-de-donnees-etablir-avant-de-conclure) aide à séparer faits établis, hypothèses et inconnues pendant cette phase.

### Jours 46 à 90 : traiter, tester et prouver

- prioriser les risques et faire accepter explicitement les risques résiduels par le bon niveau de décision ;
- tester une restauration et documenter le résultat, les écarts et les corrections ;
- revoir les comptes privilégiés, l’authentification multifacteur et les accès des prestataires ;
- identifier les fournisseurs critiques, les dépendances et les obligations de sécurité ou de notification à contractualiser ;
- définir des indicateurs montrant l’efficacité réelle des mesures ;
- réunir un dossier de preuves cohérent, daté, attribué et révisable.

## La preuve attendue n’est pas le document le plus volumineux

| Sujet | Preuve utile | Faux sentiment de sécurité |
| --- | --- | --- |
| Gouvernance | Décision approuvée, responsable, échéance et suivi | Politique signée sans preuve de supervision |
| Périmètre | Activités, services, SI, dépendances et justifications | Export brut de CMDB sans lien métier |
| Risques | Méthode, registre, traitement et acceptation résiduelle | Audit ponctuel non relié aux décisions |
| Incident | Critères, contacts, exercice horodaté et retour d’expérience | Plan jamais testé |
| Continuité | Test de restauration, résultat et corrections | Tableau de sauvegardes au vert |
| Fournisseurs | Dépendances, criticité, exigences et revues | Questionnaire sans vérification |
| Efficacité | Indicateurs, tests, écarts et clôture des actions | Accumulation de scans sans décision |

Cette logique rejoint la [bibliothèque de preuves](/evidence-library) et les indicateurs de [dette de preuve](/proofdebt) de BLACKPROOF. Une pièce n’est utile que si son origine, son périmètre, sa date, son propriétaire et la conclusion qu’elle soutient sont explicites.

## Limites de l’analyse NIS 2

- **« Nous sommes certifiés NIS 2. »** La directive n’instaure pas une certification générale portant ce nom.
- **« ISO 27001 prouve automatiquement la conformité. »** Une certification peut contribuer à la démonstration sur son périmètre, mais elle ne tranche ni l’assujettissement, ni toutes les obligations, ni les exigences nationales à venir.
- **« Le ReCyF 2.5 est déjà obligatoire. »** L’ANSSI le qualifie de document de travail et précise la portée non obligatoire, par défaut, de ses moyens acceptables de conformité.
- **« Un prestataire conforme transfère sa conformité au client. »** L’article 21 impose précisément de gérer la sécurité de la chaîne d’approvisionnement et les relations avec les fournisseurs directs.
- **« Le rapport de 24 heures doit être complet. »** La première échéance porte sur une alerte précoce. L’évaluation est ensuite enrichie.
- **« Un outil produit la conformité. »** Un outil peut structurer les exigences, les écarts et les preuves. Il ne remplace ni la décision de la direction, ni l’analyse juridique, ni la réalité des mesures déployées.

BLACKPROOF peut aider à cartographier des attentes vers des preuves, à qualifier les manques et à préparer un dossier vérifiable. Sa [méthode](/method) et sa [cartographie de référentiels](/frameworks) n’établissent pas une certification NIS 2 et ne remplacent pas un audit ou un conseil juridique qualifié.

## Huit questions à poser au prochain comité de direction

1. Quelles personnes morales avons-nous réellement évaluées, et à quelle date ?
2. Quelles activités et quels services nous placent potentiellement dans une annexe NIS 2 ?
3. Quels systèmes d’information supportent ces services, y compris chez des tiers ?
4. Qui peut décider qu’un incident est potentiellement important, de jour comme de nuit ?
5. Pouvons-nous produire une alerte fiable en 24 heures sans attendre la fin de la forensique ?
6. Quelle restauration critique avons-nous réellement testée au cours des douze derniers mois ?
7. Quels risques résiduels ont été explicitement acceptés par la direction ?
8. Quelle preuve ferait aujourd’hui défaut face à un contrôle, et qui doit la produire ?

Une préparation crédible ne cherche pas à déclarer la conformité avant le droit applicable. Elle rend le périmètre, les décisions, les mesures et les preuves suffisamment explicites pour être vérifiés, corrigés et adaptés lorsque la transposition française sera définitive.
