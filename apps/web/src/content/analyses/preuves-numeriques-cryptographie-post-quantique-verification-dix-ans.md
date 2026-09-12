---
title: "Cryptographie post-quantique : préparer des preuves numériques vérifiables à dix ans"
description: "Empreinte, signature, horodatage et conservation : organiser dès 2026 les éléments nécessaires pour vérifier un dossier numérique dans dix ans."
publishedAt: 2026-07-25
updatedAt: 2026-07-25
category: "Méthode"
format: "Analyse"
confidence: "Confiance élevée"
author: "Rédaction BLACKPROOF"
tags:
  - cryptographie post-quantique
  - preuve numérique
  - signature électronique
  - horodatage
  - crypto-agilité
  - archivage probatoire
readingMinutes: 18
featured: true
draft: false
sources:
  - title: "A Coordinated Implementation Roadmap for the Transition to Post-Quantum Cryptography"
    publisher: "Commission européenne"
    url: "https://digital-strategy.ec.europa.eu/en/library/coordinated-implementation-roadmap-transition-post-quantum-cryptography"
    kind: "Source institutionnelle"
    publicationDate: 2025-06-23
    consultedAt: 2026-07-25
  - title: "Publication de la feuille de route des efforts prioritaires en matière de sécurité numérique de l’État 2026-2027"
    publisher: "ANSSI"
    url: "https://cyber.gouv.fr/actualites/feuille-de-route-des-efforts-prioritaires-en-matiere-de-securite-numerique-de-letat-2026-2027/"
    kind: "Source institutionnelle"
    publicationDate: 2026-04-09
    consultedAt: 2026-07-25
  - title: "ANSSI views on crypto agility"
    publisher: "ANSSI"
    url: "https://messervices.cyber.gouv.fr/guides/ANSSI-views-on-crypto-agility"
    kind: "Source institutionnelle"
    publicationDate: 2026-01-19
    consultedAt: 2026-07-25
  - title: "FaQ sur la Cryptographie post-quantique"
    publisher: "ANSSI"
    url: "https://cyber.gouv.fr/enjeux-technologiques/cryptographie-post-quantique/faq-pqc/"
    kind: "Source institutionnelle"
    publicationDate: 2025-10-08
    consultedAt: 2026-07-25
  - title: "Déclaration du groupe de travail sur la cybersécurité du G7 concernant la préparation d’une migration vers la cryptographie post-quantique"
    publisher: "ANSSI"
    url: "https://cyber.gouv.fr/nous-connaitre/publications/publications-internationales/d%C3%A9claration-du-groupe-de-travail-sur-la-cybers%C3%A9curit%C3%A9-du-g7-concernant-la-pr%C3%A9paration-dune-migration-vers-la-cryptographie-post-quantique/"
    kind: "Source institutionnelle"
    publicationDate: 2026-06-01
    consultedAt: 2026-07-25
  - title: "FIPS 204, Module-Lattice-Based Digital Signature Standard"
    publisher: "NIST"
    url: "https://csrc.nist.gov/pubs/fips/204/final"
    kind: "Source institutionnelle"
    publicationDate: 2024-08-13
    consultedAt: 2026-07-25
  - title: "FIPS 205, Stateless Hash-Based Digital Signature Standard"
    publisher: "NIST"
    url: "https://csrc.nist.gov/pubs/fips/205/final"
    kind: "Source institutionnelle"
    publicationDate: 2024-08-13
    consultedAt: 2026-07-25
  - title: "Working Drafts: Post-Quantum Cryptography Updates to the PIV Standards"
    publisher: "NIST"
    url: "https://www.nist.gov/news-events/news/2026/06/working-drafts-post-quantum-cryptography-updates-piv-standards"
    kind: "Source institutionnelle"
    publicationDate: 2026-06-12
    consultedAt: 2026-07-25
  - title: "Execution of the Migration to Post-Quantum Cryptography"
    publisher: "Office of Management and Budget"
    url: "https://www.whitehouse.gov/wp-content/uploads/2026/06/M-26-15-Execution-of-the-Migration-to-Post-Quantum-Cryptography.pdf"
    kind: "Source institutionnelle"
    publicationDate: 2026-06-22
    consultedAt: 2026-07-25
  - title: "Règlement (UE) no 910/2014 sur l’identification électronique et les services de confiance, version consolidée"
    publisher: "Journal officiel de l’Union européenne"
    url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02014R0910-20241018"
    kind: "Source primaire"
    publicationDate: 2024-10-18
    consultedAt: 2026-07-25
  - title: "ETSI TS 119 511 V1.2.1, Policy and security requirements for trust service providers providing long-term preservation"
    publisher: "ETSI"
    url: "https://www.etsi.org/deliver/etsi_ts/119500_119599/119511/01.02.01_60/ts_119511v010201p.pdf"
    kind: "Source primaire"
    consultedAt: 2026-07-25
  - title: "ETSI EN 319 102-1 V1.4.1, Procedures for Creation and Validation of AdES Digital Signatures"
    publisher: "ETSI"
    url: "https://www.etsi.org/deliver/etsi_en/319100_319199/31910201/01.04.01_60/en_31910201v010401p.pdf"
    kind: "Source primaire"
    consultedAt: 2026-07-25
  - title: "RFC 4998, Evidence Record Syntax"
    publisher: "IETF"
    url: "https://datatracker.ietf.org/doc/rfc4998/"
    kind: "Source primaire"
    publicationDate: 2007-08-20
    consultedAt: 2026-07-25
  - title: "Compact, Efficient and Non-separable Hybrid Signatures"
    publisher: "ANSSI"
    url: "https://cyber.gouv.fr/nous-connaitre/publications/publications-scientifiques/compact-efficient-and-non-separable-hybrid-signatures/"
    kind: "Recherche"
    publicationDate: 2026-04-14
    consultedAt: 2026-07-25
---

Une empreinte calculée aujourd’hui pourra encore être recalculée dans dix ans. Cette possibilité ne garantit pourtant pas, à elle seule, qu’un destinataire saura alors identifier l’émetteur, replacer la signature dans le temps ou établir que les mécanismes cryptographiques étaient fiables au moment de leur utilisation.

La conservation d’une preuve numérique ne consiste donc pas seulement à garder un fichier. Elle doit préserver le contenu, les règles de calcul, la signature éventuelle, le rattachement de la clé, les informations temporelles et les éléments nécessaires à une validation ultérieure. La transition vers la cryptographie post-quantique rend cette distinction urgente, sans permettre de fixer une date certaine à laquelle les mécanismes actuels deviendraient vulnérables.

> Conclusion courte : une preuve durable est un processus de validation renouvelable. L’achat immédiat d’un algorithme post-quantique ne remplace ni l’inventaire des usages cryptographiques, ni la conservation du contexte, ni la préparation d’une migration vérifiable.

## La phase d’inventaire commence en 2026

La [feuille de route européenne publiée le 23 juin 2025](https://digital-strategy.ec.europa.eu/en/library/coordinated-implementation-roadmap-transition-post-quantum-cryptography) demande aux États membres de commencer leur transition vers la cryptographie post-quantique au plus tard à la fin de 2026. La Commission fixe en parallèle un objectif de transition des infrastructures critiques dès que possible et au plus tard à la fin de 2030.

Ces dates sont des orientations adressées aux États membres. Elles ne créent pas, à elles seules, une obligation uniforme imposant à toute entreprise de remplacer toutes ses signatures avant le 31 décembre 2026. Leur portée opérationnelle reste néanmoins nette : attendre l’apparition d’une machine capable d’attaquer la cryptographie actuelle serait incompatible avec la durée nécessaire pour découvrir, qualifier puis remplacer les usages concernés.

En France, la [feuille de route de la sécurité numérique de l’État 2026-2027](https://cyber.gouv.fr/actualites/feuille-de-route-des-efforts-prioritaires-en-matiere-de-securite-numerique-de-letat-2026-2027/) prévoit des premières étapes d’inventaire en 2026 et 2027, avec des objectifs de mise en œuvre à l’horizon 2030. La [déclaration publiée par le groupe de travail cybersécurité du G7 en juin 2026](https://cyber.gouv.fr/nous-connaitre/publications/publications-internationales/d%C3%A9claration-du-groupe-de-travail-sur-la-cybers%C3%A9curit%C3%A9-du-g7-concernant-la-pr%C3%A9paration-dune-migration-vers-la-cryptographie-post-quantique/) place également la gouvernance, l’identification des usages, la gestion des risques et la crypto-agilité au début du parcours.

Le premier livrable utile n’est donc pas une liste d’algorithmes choisis hors contexte. C’est un inventaire reliant chaque mécanisme cryptographique à une fonction, une durée, un propriétaire, un format, un logiciel de vérification et une conséquence en cas d’échec.

## Cinq propriétés à conserver séparément

Une même archive peut réunir plusieurs mécanismes sans produire toutes les garanties que son intitulé laisse imaginer.

| Propriété | Question vérifiée | Mécanisme possible | Limite principale |
| --- | --- | --- | --- |
| Intégrité | Le contenu correspond-il exactement à la version de référence ? | Empreinte cryptographique et manifeste | L’empreinte n’identifie pas son auteur |
| Signature technique | La clé privée associée à cette clé publique a-t-elle signé le contenu ? | Signature numérique | La clé publique doit encore être rattachée au bon émetteur |
| Origine | Qui contrôlait la clé au moment pertinent ? | Certificat, annuaire de confiance ou rattachement externe | Un libellé saisi dans un fichier reste déclaratif |
| Temporalité | Le contenu ou la signature existait-il à un moment donné ? | Jeton d’horodatage ou autre preuve temporelle | Une date inscrite par le signataire n’est pas une horloge indépendante |
| Conservation | La validation reste-t-elle possible malgré l’expiration ou la dépréciation ? | Données de validation, renouvellement et preuve d’archive | Le stockage seul ne renouvelle aucune garantie |

La véracité du contenu forme encore une question distincte. Une signature techniquement valide peut couvrir une déclaration fausse, une conclusion dépassée ou un document attribué à une clé dont le propriétaire réel n’a jamais été établi. Cette frontière rejoint la [méthode BLACKPROOF](/method) : l’intégrité d’une pièce, son origine et la conclusion qu’elle soutient doivent rester explicites.

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 560" role="img" aria-labelledby="pqc-layers-title pqc-layers-desc">
    <title id="pqc-layers-title">Les cinq couches d’une preuve numérique durable</title>
    <desc id="pqc-layers-desc">Une pile relie le contenu et son empreinte à la signature, au rattachement de la clé, à la preuve temporelle puis à la conservation et au renouvellement.</desc>
    <rect x="88" y="408" width="744" height="92" rx="18" fill="#121816" stroke="#52645e" />
    <rect x="126" y="320" width="668" height="82" rx="18" fill="#121816" stroke="#81dacb" />
    <rect x="164" y="236" width="592" height="78" rx="18" fill="#121816" stroke="#aa9cc4" />
    <rect x="202" y="156" width="516" height="74" rx="18" fill="#121816" stroke="#c5a66f" />
    <rect x="240" y="80" width="440" height="70" rx="18" fill="#0b100f" stroke="#81dacb" />
    <text x="116" y="442" fill="#78827c" font-size="13" font-family="ui-monospace, monospace">01 · CONTENU ET EMPREINTE</text>
    <text x="116" y="474" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Octets exacts · format · canonicalisation · algorithme de hachage</text>
    <text x="154" y="352" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">02 · SIGNATURE</text>
    <text x="154" y="382" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Algorithme · paramètres · signature · clé publique</text>
    <text x="192" y="266" fill="#aa9cc4" font-size="13" font-family="ui-monospace, monospace">03 · RATTACHEMENT</text>
    <text x="192" y="295" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Certificat · identité · autorité · politique de confiance</text>
    <text x="230" y="184" fill="#c5a66f" font-size="13" font-family="ui-monospace, monospace">04 · TEMPS</text>
    <text x="230" y="211" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Horodatage · statut des certificats · date de validation</text>
    <text x="268" y="107" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">05 · CONSERVATION</text>
    <text x="268" y="133" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Renouvellement · migration · test indépendant</text>
    <path d="M460 500v38" stroke="#52645e" stroke-width="2" />
    <rect x="236" y="528" width="448" height="26" rx="10" fill="#0b100f" stroke="#33413c" />
    <text x="283" y="547" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">La vérité de la déclaration reste une sixième question.</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 340 830" role="img" aria-labelledby="pqc-layers-mobile-title pqc-layers-mobile-desc">
    <title id="pqc-layers-mobile-title">Les cinq couches d’une preuve numérique durable</title>
    <desc id="pqc-layers-mobile-desc">Cinq blocs verticaux relient le contenu et son empreinte à la signature, au rattachement de la clé, à la preuve temporelle puis à la conservation et au renouvellement.</desc>
    <rect x="20" y="20" width="300" height="116" rx="16" fill="#121816" stroke="#52645e" />
    <rect x="20" y="164" width="300" height="116" rx="16" fill="#121816" stroke="#81dacb" />
    <rect x="20" y="308" width="300" height="116" rx="16" fill="#121816" stroke="#aa9cc4" />
    <rect x="20" y="452" width="300" height="116" rx="16" fill="#121816" stroke="#c5a66f" />
    <rect x="20" y="596" width="300" height="116" rx="16" fill="#0b100f" stroke="#81dacb" />
    <text x="42" y="51" fill="#78827c" font-size="12" font-family="ui-monospace, monospace">01 · CONTENU</text>
    <text x="42" y="81" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Octets exacts et empreinte</text>
    <text x="42" y="107" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Format · canonicalisation · hachage</text>
    <text x="42" y="195" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">02 · SIGNATURE</text>
    <text x="42" y="225" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Algorithme et clé publique</text>
    <text x="42" y="251" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Signature et paramètres</text>
    <text x="42" y="339" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">03 · RATTACHEMENT</text>
    <text x="42" y="369" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Clé reliée à l’émetteur</text>
    <text x="42" y="395" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Certificat ou canal externe</text>
    <text x="42" y="483" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">04 · TEMPS</text>
    <text x="42" y="513" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Existence à un moment donné</text>
    <text x="42" y="539" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Horodatage et statut</text>
    <text x="42" y="627" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">05 · CONSERVATION</text>
    <text x="42" y="657" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Renouveler et migrer</text>
    <text x="42" y="683" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Tester avec un outil indépendant</text>
    <rect x="20" y="752" width="300" height="58" rx="14" fill="#0b100f" stroke="#33413c" />
    <text x="39" y="777" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">La vérité de la déclaration reste</text>
    <text x="39" y="797" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">une question distincte.</text>
  </svg>
  <figcaption>Cadre BLACKPROOF. Les couches se complètent sans devenir interchangeables. Une empreinte cohérente ne remplace ni une identité vérifiée, ni une preuve temporelle.</figcaption>
</figure>

## La menace quantique ne frappe pas toutes les briques de la même façon

Le [mémorandum publié par l’Office of Management and Budget le 22 juin 2026](https://www.whitehouse.gov/wp-content/uploads/2026/06/M-26-15-Execution-of-the-Migration-to-Post-Quantum-Cryptography.pdf) indique qu’aucun ordinateur quantique cryptographiquement pertinent n’est encore connu. Sa date d’apparition ne peut pas être déduite d’une feuille de route administrative. L’incertitude porte sur l’échéance, pas sur la vulnérabilité théorique de certaines familles d’algorithmes.

L’[avis de l’ANSSI sur la transition post-quantique](https://cyber.gouv.fr/enjeux-technologiques/cryptographie-post-quantique/faq-pqc/) distingue deux effets :

- l’algorithme de Shor menace les problèmes mathématiques sur lesquels reposent notamment RSA et la cryptographie sur courbes elliptiques, donc des mécanismes de signature tels qu’ECDSA ;
- l’algorithme de Grover affecte différemment la cryptographie symétrique et certaines propriétés des fonctions de hachage, avec un impact générique plus limité que celui de Shor sur la cryptographie à clé publique.

Cette distinction interdit deux conclusions excessives. Premièrement, une fonction de hachage et une signature ECDSA ne doivent pas recevoir le même diagnostic. Deuxièmement, l’absence actuelle de machine capable d’exécuter l’attaque ne justifie pas de concevoir une archive comme si son mécanisme cryptographique était immuable.

Le NIST a finalisé le [standard de signature ML-DSA FIPS 204](https://csrc.nist.gov/pubs/fips/204/final) et le [standard de signature fondé sur le hachage SLH-DSA FIPS 205](https://csrc.nist.gov/pubs/fips/205/final) le 13 août 2024. Cette disponibilité fournit des primitives standardisées, pas une migration complète des formats, certificats et logiciels existants.

| Brique | Situation établie en 2026 | Décision prudente |
| --- | --- | --- |
| SHA-256 utilisé pour une empreinte | Aucune rupture pratique générale n’est établie dans les sources examinées | Identifier l’algorithme, conserver les octets sources et prévoir un renouvellement vers une fonction plus robuste si la politique l’exige |
| ECDSA P-256 | Repose sur une famille de problèmes visée par Shor en présence d’un ordinateur quantique pertinent | Inventorier les signatures, leur durée de validation et leurs dépendances avant de choisir une migration |
| ML-DSA et SLH-DSA | Les standards NIST FIPS 204 et 205 sont finalisés depuis août 2024 | Tester les formats, performances, bibliothèques, certificats et règles d’interopérabilité avant production |
| Signature hybride | L’ANSSI la recommande lorsqu’une protection post-quantique est pertinente | Définir précisément la combinaison, la politique de validation et le comportement si une branche échoue |
| Canonicalisation et vérificateur | Ne sont pas directement cassés par Shor, mais peuvent devenir indisponibles ou incompatibles | Versionner les règles, publier des vecteurs de test et conserver un vérificateur reproductible |

L’ANSSI recommande une protection hybride à court et moyen terme lorsqu’une protection post-quantique est nécessaire, particulièrement pour les produits destinés à protéger des informations au-delà de 2030. Elle précise aussi qu’une concaténation de signatures classique et post-quantique répond au principe élémentaire d’hybridation. Les propriétés plus exigeantes, comme la non-séparabilité des deux signatures, restent un sujet de recherche et de normalisation, illustré par les [travaux publiés par son laboratoire en avril 2026](https://cyber.gouv.fr/nous-connaitre/publications/publications-scientifiques/compact-efficient-and-non-separable-hybrid-signatures/).

La prudence consiste donc à ne confondre ni standard disponible, ni implémentation évaluée, ni interopérabilité démontrée, ni service qualifié.

## La validation différée exige plus que la signature

Le [standard ETSI EN 319 102-1](https://www.etsi.org/deliver/etsi_en/319100_319199/31910201/01.04.01_60/en_31910201v010401p.pdf) décrit les données nécessaires à une validation de long terme. Il cite notamment les certificats, les informations de révocation et les preuves d’existence qui permettront d’évaluer plus tard l’état de la signature au moment pertinent.

Pour une archive destinée à rester vérifiable, six ensembles doivent être traités :

1. **Les objets originaux.** Conserver les octets exacts du document, de son manifeste et de sa signature, pas seulement une capture ou un export transformé.
2. **La règle de représentation.** Documenter le format, l’encodage et toute canonicalisation appliquée avant le calcul de l’empreinte.
3. **Les identifiants cryptographiques.** Enregistrer l’algorithme, ses paramètres, la clé publique ou le certificat et la version du format de signature.
4. **Le rattachement de confiance.** Conserver le certificat, sa chaîne, la politique applicable, les informations de révocation et la source qui reliait la clé à l’émetteur.
5. **La preuve temporelle.** Distinguer une date déclarée par le signataire d’un jeton produit par une autorité d’horodatage ou d’une autre preuve indépendante.
6. **Le résultat de validation.** Archiver la date, l’outil, sa version, la politique, les entrées utilisées, le résultat et les réserves.

Une dépendance disponible en ligne aujourd’hui peut disparaître avant la fin de conservation. L’ETSI recommande donc d’intégrer les données de validation lorsqu’il n’est pas certain que les vérificateurs pourront encore les obtenir. Un lien vers un certificat, une liste de confiance ou une réponse de statut ne vaut pas conservation de son contenu.

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 500" role="img" aria-labelledby="pqc-lifecycle-title pqc-lifecycle-desc">
    <title id="pqc-lifecycle-title">Cycle de vie d’une preuve numérique destinée à durer</title>
    <desc id="pqc-lifecycle-desc">Une chronologie relie la création du dossier à sa validation initiale, à la surveillance des déclencheurs, au renouvellement avant affaiblissement puis à une vérification indépendante.</desc>
    <path d="M88 224H832" stroke="#52645e" stroke-width="4" />
    <circle cx="88" cy="224" r="14" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="274" cy="224" r="14" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <circle cx="460" cy="224" r="14" fill="#121816" stroke="#c5a66f" stroke-width="3" />
    <circle cx="646" cy="224" r="14" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="832" cy="224" r="14" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <text x="42" y="98" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">CRÉATION</text>
    <text x="42" y="130" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Figer les objets</text>
    <text x="42" y="158" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Empreinte et version</text>
    <text x="216" y="280" fill="#aa9cc4" font-size="13" font-family="ui-monospace, monospace">VALIDATION INITIALE</text>
    <text x="216" y="312" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Capturer le contexte</text>
    <text x="216" y="340" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Certificats · statut · résultat</text>
    <text x="402" y="98" fill="#c5a66f" font-size="13" font-family="ui-monospace, monospace">SURVEILLANCE</text>
    <text x="402" y="130" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Suivre les déclencheurs</text>
    <text x="402" y="158" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Algorithme · clé · outil · format</text>
    <text x="588" y="280" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">RENOUVELLEMENT</text>
    <text x="588" y="312" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Protéger avant faiblesse</text>
    <text x="588" y="340" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Nouvel horodatage ou hachage</text>
    <text x="758" y="98" fill="#aa9cc4" font-size="13" font-family="ui-monospace, monospace">CONTRÔLE</text>
    <text x="758" y="130" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Rejouer ailleurs</text>
    <text x="758" y="158" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Outil indépendant</text>
    <rect x="170" y="398" width="580" height="70" rx="16" fill="#0b100f" stroke="#33413c" />
    <text x="221" y="428" fill="#a3ada6" font-size="15" font-family="system-ui, sans-serif">Déclencheur documenté : expiration, révocation, dépréciation,</text>
    <text x="254" y="452" fill="#a3ada6" font-size="15" font-family="system-ui, sans-serif">changement de format, rupture d’outil ou nouveau risque.</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 340 900" role="img" aria-labelledby="pqc-lifecycle-mobile-title pqc-lifecycle-mobile-desc">
    <title id="pqc-lifecycle-mobile-title">Cycle de vie d’une preuve numérique destinée à durer</title>
    <desc id="pqc-lifecycle-mobile-desc">Une chronologie verticale relie la création du dossier à sa validation initiale, à la surveillance des déclencheurs, au renouvellement avant affaiblissement puis à une vérification indépendante.</desc>
    <path d="M54 60v690" stroke="#52645e" stroke-width="4" />
    <circle cx="54" cy="60" r="12" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="54" cy="208" r="12" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <circle cx="54" cy="356" r="12" fill="#121816" stroke="#c5a66f" stroke-width="3" />
    <circle cx="54" cy="504" r="12" fill="#121816" stroke="#81dacb" stroke-width="3" />
    <circle cx="54" cy="652" r="12" fill="#121816" stroke="#aa9cc4" stroke-width="3" />
    <text x="88" y="49" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">CRÉATION</text>
    <text x="88" y="78" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Figer les objets</text>
    <text x="88" y="103" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Empreinte et version</text>
    <text x="88" y="197" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">VALIDATION INITIALE</text>
    <text x="88" y="226" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Capturer le contexte</text>
    <text x="88" y="251" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Certificats · statut · résultat</text>
    <text x="88" y="345" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">SURVEILLANCE</text>
    <text x="88" y="374" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Suivre les déclencheurs</text>
    <text x="88" y="399" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Algorithme · clé · outil · format</text>
    <text x="88" y="493" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">RENOUVELLEMENT</text>
    <text x="88" y="522" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Protéger avant faiblesse</text>
    <text x="88" y="547" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Nouvel horodatage ou hachage</text>
    <text x="88" y="641" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">CONTRÔLE</text>
    <text x="88" y="670" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Rejouer ailleurs</text>
    <text x="88" y="695" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Outil indépendant</text>
    <rect x="20" y="790" width="300" height="84" rx="14" fill="#0b100f" stroke="#33413c" />
    <text x="39" y="818" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Renouveler avant expiration, révocation,</text>
    <text x="39" y="840" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">dépréciation ou rupture d’outil.</text>
  </svg>
  <figcaption>Proposition méthodologique BLACKPROOF. Le moment du renouvellement dépend de la politique de conservation et de l’évolution de chaque dépendance.</figcaption>
</figure>

## La conservation qualifiée ne se résume pas au stockage

L’article 34 du [règlement eIDAS dans sa version consolidée](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02014R0910-20241018) réserve le service de conservation qualifié des signatures électroniques qualifiées à un prestataire de services de confiance qualifié utilisant des procédures et technologies capables d’étendre leur fiabilité au-delà de la période de validité technologique.

Trois limites doivent rester visibles :

- une signature numérique réalisée dans un navigateur n’est pas automatiquement une signature électronique qualifiée ;
- une sauvegarde redondante ne devient pas un service de conservation qualifié ;
- l’application d’un standard technique ne suffit pas, à elle seule, à conférer la qualité réglementaire de prestataire qualifié.

Le [standard ETSI TS 119 511](https://www.etsi.org/deliver/etsi_ts/119500_119599/119511/01.02.01_60/ts_119511v010201p.pdf) traite deux problèmes proches mais distincts : préserver la capacité de valider une signature et établir l’existence d’un objet numérique à un moment donné. Il envisage explicitement les cas où la clé de signature est ensuite compromise, le certificat expire ou une attaque cryptographique devient réalisable contre l’algorithme de signature ou de hachage.

Le [RFC 4998 de l’IETF](https://datatracker.ietf.org/doc/rfc4998/) formalise une autre brique : l’« Evidence Record », qui peut réunir des horodatages d’archive, certificats, informations de révocation, ancres de confiance et politiques. Il prévoit le renouvellement de l’horodatage lorsque sa clé, son certificat ou son algorithme approche d’une perte de validité, ainsi qu’un renouvellement de l’arbre de hachage lorsque la fonction utilisée devient insuffisante.

Ces mécanismes montrent pourquoi une archive probatoire est vivante. La copie initiale demeure indispensable, mais sa validation doit pouvoir être enrichie avant que ses dépendances ne perdent leur valeur.

## Un inventaire orienté vers la durée de preuve

Un inventaire cryptographique général peut compter des certificats TLS, des tunnels, des secrets applicatifs, des signatures de code et des clés d’accès. Pour la preuve numérique, il faut ajouter la durée pendant laquelle un tiers devra pouvoir refaire le contrôle.

| Champ d’inventaire | Question |
| --- | --- |
| Objet protégé | Quel fichier, manifeste, dossier ou événement doit rester vérifiable ? |
| Propriété attendue | Intégrité, origine, date, autorisation, existence ou combinaison de plusieurs propriétés ? |
| Échéance réelle | Jusqu’à quelle date contractuelle, réglementaire ou contentieuse la validation est-elle nécessaire ? |
| Mécanismes actuels | Quels hachages, signatures, certificats, horodatages et formats interviennent ? |
| Dépendances | Quel navigateur, logiciel, service, registre, annuaire ou tiers fournit la validation ? |
| Matériel conservé | Les certificats, statuts de révocation, politiques, journaux et rapports sont-ils archivés ? |
| Déclencheur | Quel événement impose une revue ou un renouvellement ? |
| Sortie | Un destinataire peut-il vérifier hors du système qui a produit la preuve ? |
| Responsable | Qui surveille, décide, renouvelle et documente l’opération ? |

La durée de dix ans utilisée dans cette analyse est un scénario de travail, pas un seuil juridique universel. Chaque organisation doit partir de ses contrats, de ses obligations de conservation, de ses risques de litige et de la valeur des objets concernés.

## Un protocole de transition en sept décisions

Le protocole suivant est une proposition BLACKPROOF. Il ne remplace ni une politique de certification, ni une analyse juridique, ni les recommandations sectorielles applicables.

1. **Qualifier la propriété attendue.** Écrire séparément ce qui doit être prouvé : intégrité, identité de l’émetteur, autorisation, date ou existence.
2. **Fixer la durée de validation.** Utiliser une date et un fondement précis au lieu de la formule « conservation longue ».
3. **Capturer l’état initial.** Conserver les objets exacts, le résultat de validation, les certificats, le statut de révocation, la politique et la version de l’outil.
4. **Versionner tous les mécanismes.** Rendre explicites l’algorithme, ses paramètres, la canonicalisation, le schéma de données et le format de signature.
5. **Tester une vérification indépendante.** Rejouer le contrôle depuis une machine et un logiciel distincts, sans dépendre d’un compte fournisseur.
6. **Définir les déclencheurs.** Suivre les expirations, révocations, avis de sécurité, dépréciations, ruptures de bibliothèque et changements de format.
7. **Renouveler avant la perte de confiance.** Ajouter une nouvelle protection temporelle ou cryptographique avant que l’ancienne ne devienne insuffisante, puis conserver la chaîne complète.

La [note de l’ANSSI sur la crypto-agilité](https://messervices.cyber.gouv.fr/guides/ANSSI-views-on-crypto-agility) insiste sur la capacité d’un système à modifier ses composants cryptographiques sans dégrader significativement ses fonctions. Pour un format de preuve, cette capacité implique au minimum des identifiants d’algorithmes explicites, des versions non ambiguës, des règles de validation définies et la possibilité d’accepter plusieurs mécanismes pendant une transition.

Les [projets de mise à jour PIV publiés par le NIST en juin 2026](https://www.nist.gov/news-events/news/2026/06/working-drafts-post-quantum-cryptography-updates-piv-standards) illustrent cette logique avec un modèle préliminaire à double pile : conserver les clés et objets classiques tout en ajoutant des références, certificats et objets post-quantiques. Le NIST précise qu’il s’agit de documents de travail préliminaires, pas encore de projets formels. Leur intérêt réside donc dans l’architecture de transition proposée, pas dans une obligation directement transposable.

## Portée actuelle d’un ProofPack BLACKPROOF

Un [ProofPack](/proofpack) utilise une empreinte SHA-256 pour permettre au destinataire de vérifier que le contenu chargé correspond à la version de référence. La page [Vérifier](/verify) recalcule cette empreinte localement. Pour une livraison client, le [schéma public de signature](/schemas/delivery-protocol/signature-v1.schema.json) prévoit aussi une signature détachée ECDSA P-256 couvrant l’empreinte.

Cette signature démontre qu’une clé privée associée à la clé publique incluse a signé l’empreinte. Le nom d’émetteur reste cependant une déclaration tant que le destinataire n’a pas rattaché cette clé à l’organisation par un canal externe fiable. La date inscrite dans le fichier de signature n’est pas un horodatage de confiance indépendant.

Le périmètre actuel doit donc rester formulé précisément :

- l’empreinte vérifie la cohérence du contenu avec une référence donnée ;
- la signature détachée vérifie la possession de la clé privée correspondante ;
- le rattachement de cette clé à l’émetteur dépend d’une preuve externe ;
- le vérificateur n’établit ni la vérité des déclarations, ni leur valeur juridique ;
- BLACKPROOF ne fournit pas actuellement un service qualifié de signature, d’horodatage ou de conservation au sens d’eIDAS.

Pour une conservation sur dix ans, l’organisation devrait archiver avec la livraison la clé publique obtenue par le canal de confiance retenu, la preuve de ce rattachement, les schémas et versions applicables, le résultat du contrôle initial et les décisions de renouvellement. Cette recommandation n’ajoute pas une garantie au produit. Elle rend visible le travail qui reste sous la responsabilité du détenteur de l’archive.

Cette frontière est cohérente avec la [bibliothèque de preuves](/evidence-library) et les indicateurs de [dette de preuve](/proofdebt) : une signature disponible n’efface pas l’absence d’identité vérifiée, de preuve temporelle ou de politique de conservation.

## Dix questions pour le prochain comité de sécurité

1. Quels dossiers créés aujourd’hui devront encore être vérifiables après 2030 ?
2. La durée attendue repose-t-elle sur un contrat, un texte, une politique ou une simple habitude ?
3. L’empreinte couvre-t-elle les octets originaux ou une représentation transformée ?
4. La règle de canonicalisation est-elle publiée, versionnée et testable ?
5. La clé publique est-elle reliée à l’émetteur par une preuve conservée ?
6. La date de signature est-elle déclarative ou produite par une source temporelle indépendante ?
7. Les certificats, statuts de révocation et politiques de validation sont-ils disponibles hors ligne ?
8. Le dossier peut-il être vérifié sans le service qui l’a généré ?
9. Quel événement déclenche un renouvellement cryptographique ?
10. Qui doit décider et prouver que le renouvellement a eu lieu avant la perte de confiance ?

## Inconnues et limites

La date d’apparition d’un ordinateur quantique cryptographiquement pertinent reste inconnue. Les calendriers 2026 et 2030 cités dans cette analyse organisent des transitions institutionnelles. Ils ne prédisent pas cette date.

Les standards post-quantiques, leurs profils d’intégration, leurs implémentations et leur reconnaissance dans les différents cadres de confiance continueront d’évoluer. Le choix d’un algorithme doit être réévalué selon le secteur, le niveau de sécurité, la durée, les contraintes de performance et les autorités compétentes.

Enfin, la validation cryptographique ne tranche pas seule la valeur d’une pièce dans un litige. Le droit applicable, l’identité et l’autorité du signataire, les conditions de collecte, la continuité de la chaîne et la possibilité d’un débat contradictoire restent déterminants.

La décision raisonnable en 2026 n’est donc ni d’annoncer la fin immédiate de toute signature classique, ni d’attendre un événement spectaculaire. Elle consiste à rendre les preuves inventoriables, explicites, exportables et renouvelables avant que leur contexte ne disparaisse.
