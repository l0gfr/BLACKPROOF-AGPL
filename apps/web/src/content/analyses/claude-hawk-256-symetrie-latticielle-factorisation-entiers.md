---
title: "Claude et HAWK-256 : la symétrie latticielle qui a conduit au retrait de HAWK"
description: "Une récupération de clé classique, son périmètre exact, le retrait de HAWK et les différences avec la factorisation de RSA."
publishedAt: 2026-07-29
updatedAt: 2026-07-29
category: "Vulnérabilités"
format: "Analyse"
confidence: "Confiance élevée"
author: "Rédaction BLACKPROOF"
tags:
  - cryptographie post-quantique
  - HAWK
  - cryptanalyse
  - réseaux euclidiens
  - intelligence artificielle
  - RSA
readingMinutes: 22
featured: false
draft: false
sources:
  - title: "HAWK-n Key Recovery Reduces to SVP in Dimension n/2 + 1"
    publisher: "Anthropic"
    url: "https://www.anthropic.com/document/hawk_key_recovery.pdf"
    kind: "Recherche"
    publicationDate: 2026-07-28
    consultedAt: 2026-07-29
  - title: "cryptography-research-demo: HAWK key recovery"
    publisher: "Anthropic"
    url: "https://github.com/anthropics/cryptography-research-demo/tree/main/HAWK"
    kind: "Source primaire"
    publicationDate: 2026-07-28
    consultedAt: 2026-07-29
  - title: "Discovering cryptographic weaknesses with Claude"
    publisher: "Anthropic"
    url: "https://www.anthropic.com/research/discovering-cryptographic-weaknesses"
    kind: "Source primaire"
    publicationDate: 2026-07-28
    consultedAt: 2026-07-29
  - title: "HAWK-n Key Recovery Reduces to SVP in Dimension n/2 + 1"
    publisher: "NIST PQC Forum"
    url: "https://groups.google.com/a/list.nist.gov/g/pqc-forum/c/2r2u6SbHun4/m/0_I2KOZ_CQAJ"
    kind: "Source primaire"
    publicationDate: 2026-07-28
    consultedAt: 2026-07-29
  - title: "Post-Quantum Cryptography: Additional Digital Signature Schemes, Round 3"
    publisher: "NIST"
    url: "https://csrc.nist.gov/projects/pqc-dig-sig/round-3-additional-signatures"
    kind: "Source institutionnelle"
    consultedAt: 2026-07-29
  - title: "HAWK Specification Document, version 1.0"
    publisher: "HAWK team"
    url: "https://csrc.nist.gov/csrc/media/Projects/pqc-dig-sig/documents/round-1/spec-files/hawk-spec-web.pdf"
    kind: "Source primaire"
    publicationDate: 2023-06-01
    consultedAt: 2026-07-29
  - title: "HAWK: Module LIP Makes Lattice Signatures Fast, Compact and Simple"
    publisher: "ASIACRYPT 2022"
    url: "https://www.iacr.org/archive/asiacrypt2022/137910165/137910165.pdf"
    kind: "Recherche"
    consultedAt: 2026-07-29
  - title: "HAWK: Having Automorphisms Weakens Key"
    publisher: "IACR Communications in Cryptology"
    url: "https://eprint.iacr.org/2025/928"
    kind: "Recherche"
    publicationDate: 2025-05-23
    consultedAt: 2026-07-29
  - title: "CryptanalysisBench: Can LLMs do Cryptanalysis?"
    publisher: "arXiv"
    url: "https://arxiv.org/abs/2607.18538"
    kind: "Recherche"
    publicationDate: 2026-07-20
    consultedAt: 2026-07-29
  - title: "Cryptographic Standards in a Post-Quantum Era"
    publisher: "NIST"
    url: "https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=934896"
    kind: "Source institutionnelle"
    publicationDate: 2022-07-11
    consultedAt: 2026-07-29
  - title: "Polynomial-Time Algorithms for Prime Factorization and Discrete Logarithms on a Quantum Computer"
    publisher: "SIAM Journal on Computing"
    url: "https://epubs.siam.org/doi/10.1137/S0097539795293172"
    kind: "Recherche"
    publicationDate: 1997-10-01
    consultedAt: 2026-07-29
  - title: "Small solutions to polynomial equations, and low exponent RSA vulnerabilities"
    publisher: "IBM Research"
    url: "https://research.ibm.com/publications/small-solutions-to-polynomial-equations-and-low-exponent-rsa-vulnerabilities"
    kind: "Recherche"
    publicationDate: 1997-11-01
    consultedAt: 2026-07-29
  - title: "Finding Small Roots of Bivariate Integer Polynomial Equations Revisited"
    publisher: "EUROCRYPT 2004"
    url: "https://www.iacr.org/cryptodb/archive/2004/EUROCRYPT/2177/2177.pdf"
    kind: "Recherche"
    publicationDate: 2004-05-02
    consultedAt: 2026-07-29
---

Le 28 juillet 2026, Anthropic a publié une récupération de clé contre HAWK, un schéma de signature post-quantique alors candidat au processus NIST. Le lendemain, l’équipe HAWK a confirmé que l’attaque divisait approximativement par deux la taille de bloc nécessaire à la réduction de réseau, puis a [retiré sa proposition](https://groups.google.com/a/list.nist.gov/g/pqc-forum/c/2r2u6SbHun4/m/0_I2KOZ_CQAJ) de la compétition.

Le résultat est sérieux. Son périmètre l’est tout autant.

Il ne s’agit ni d’une attaque quantique, ni d’une rupture de RSA, ni d’un effondrement général de la cryptographie fondée sur les réseaux. HAWK est une **signature**, pas un mécanisme de chiffrement. HAWK-256 était un **paramètre de défi estimé autour de 64 bits**, pas un schéma promettant 256 bits de sécurité. L’attaque est classique, spécifique à la structure algébrique de HAWK et demeure exponentielle pour les grands paramètres.

> Conclusion courte : Claude Mythos Preview a contribué à rendre exploitable une symétrie déjà identifiée comme une voie d’attaque théorique. Le code publié récupère une clé HAWK-256 en quelques heures sur un serveur de référence. L’équipe HAWK a jugé les corrections naïves non compétitives et retiré le candidat. Rien, dans les sources examinées, ne permet d’étendre ce résultat à ML-DSA, ML-KEM, Falcon ou aux réseaux euclidiens en général.

## Le verdict factuel au 29 juillet 2026

| Question | Réponse établie | Limite |
| --- | --- | --- |
| Claude a-t-il « cassé le chiffrement post-quantique » ? | Non. HAWK est un schéma de signature particulier. | La formule mélange fonction cryptographique, famille mathématique et périmètre de l’attaque. |
| Une clé a-t-elle réellement été récupérée ? | Oui, selon le préprint et le code publiés, sur deux clés HAWK-256, avec vérification finale par l’implémentation de référence. | BLACKPROOF n’a pas reproduit le calcul de plusieurs heures ni audité tout le code. |
| HAWK-512 et HAWK-1024 sont-ils pratiquement cassés ? | Non. Le préprint réduit fortement leurs estimations de coût mais indique ne pas avoir tenté HAWK-512. | Les coûts restent des modèles cryptanalytiques, pas des durées mesurées. |
| Le résultat est-il quantique ? | Non. La démonstration et l’implémentation utilisent des calculs classiques de réduction de réseau. | Le terme « post-quantique » décrit la cible, pas la machine de l’attaquant. |
| Le résultat est-il validé ? | L’équipe HAWK a confirmé l’effet central et retiré le candidat. Le code et des instances sont publics. | Le document Anthropic est un préprint récent, sans évaluation académique publiée à cette date. |
| D’autres schémas NIST sont-ils touchés ? | Les auteurs disent explicitement que la construction ne se transfère pas à Falcon et n’affecte pas les autres candidats. | Cette absence de transfert concerne cette attaque précise, pas toutes les recherches futures. |

Cette séparation entre fait, mesure, estimation et extrapolation est indispensable. Une récupération de clé de bout en bout apporte une preuve expérimentale forte sur HAWK-256. Elle ne transforme pas automatiquement chaque estimation asymptotique du préprint en fait mesuré.

## HAWK signe, il ne chiffre pas

Une signature numérique répond à une question d’authenticité et d’intégrité : une personne détenant une clé privée a-t-elle produit une signature vérifiable avec la clé publique correspondante ? Un chiffrement répond à une autre question : comment rendre un contenu illisible sans la clé de déchiffrement ?

La [spécification HAWK](https://csrc.nist.gov/csrc/media/Projects/pqc-dig-sig/documents/round-1/spec-files/hawk-spec-web.pdf) présente HAWK comme un schéma de signature inspiré du problème d’isomorphisme de réseaux. Sa clé secrète peut être représentée par une base courte `B` et sa clé publique par une matrice de Gram `Q = B*B`, où `*` désigne la transposée conjuguée. La matrice publique décrit les produits scalaires de la base sans livrer directement cette base.

Une analogie en deux dimensions aide à visualiser la distinction. Un même quadrillage peut être décrit par plusieurs paires de vecteurs. Certaines bases sont courtes et régulières, d’autres longues et obliques. Publier les relations géométriques du quadrillage ne revient pas nécessairement à révéler la base courte qui permet de l’exploiter.

Dans HAWK, récupérer n’importe quelle base équivalente `B'` vérifiant `B'*B' = Q` suffit. Le [préprint d’Anthropic](https://www.anthropic.com/document/hawk_key_recovery.pdf) précise qu’une telle clé équivalente peut signer à la place de la clé secrète originale. La récupération de clé conduit donc à une capacité de contrefaçon de signatures, pas au déchiffrement d’archives.

## Le nombre 256 désigne un degré, pas une sécurité de 256 bits

La confusion est facile parce que les noms cryptographiques contiennent souvent des nombres associés à une taille ou à un niveau de sécurité. Ici, le suffixe de HAWK désigne le degré `n` du corps cyclotomique utilisé.

La [table des paramètres de la spécification](https://csrc.nist.gov/csrc/media/Projects/pqc-dig-sig/documents/round-1/spec-files/hawk-spec-web.pdf#page=16) distingue trois cas :

| Paramètre | Degré `n` | Position dans la spécification | Sécurité visée à l’origine |
| --- | --- | --- | --- |
| HAWK-256 | 256 | Défi cryptanalytique, trop faible pour une soumission NIST | Environ 64 bits |
| HAWK-512 | 512 | Paramètre candidat | Niveau NIST I |
| HAWK-1024 | 1024 | Paramètre candidat | Niveau NIST V |

La récupération pratique de HAWK-256 est donc exactement le type d’expérience auquel ce paramètre de défi était destiné. Le fait nouveau n’est pas qu’un objectif à 64 bits ait fini par céder. Il réside dans la **méthode structurée** qui réduit aussi les estimations de sécurité des paramètres 512 et 1024.

## Une symétrie transforme le problème public

Un réseau euclidien est un ensemble discret de points obtenu par combinaisons entières de vecteurs de base. Une symétrie, ou automorphisme, est une transformation qui conserve ce réseau et sa géométrie. Une rotation d’un quadrillage carré de 90 degrés en donne une intuition simple : les coordonnées changent, le quadrillage reste le même.

HAWK travaille dans un cadre beaucoup plus riche, un anneau cyclotomique de degré puissance de deux. Dans ce cadre, l’application `τ : ζ ↦ -ζ` est une involution de Galois : l’appliquer deux fois ramène au point de départ.

Le point central du nouveau travail est la construction

`Vτ = B⁻¹ τ(B)`.

Cette matrice dépend en apparence de la clé secrète `B`. Les auteurs montrent pourtant qu’elle satisfait des contraintes linéaires calculables à partir de la seule clé publique `Q`. Les solutions entières de ces contraintes forment un nouveau réseau public, appelé réseau de cocycle `τ`.

Trois propriétés rendent ce détour utile :

1. ce réseau public a un rang `n`, alors que le réseau de clé directement attaqué a un rang `2n` ;
2. `Vτ` y est un vecteur le plus court ;
3. la classe géométrique particulière de ce réseau permet de réduire sa recherche à des appels au problème du plus court vecteur exact, ou SVP, en dimension `n/2 + 1`.

Le SVP demande de trouver un vecteur non nul de longueur minimale dans un réseau. Sa difficulté augmente très vite avec la dimension. Passer d’un bloc proche de `n` à une dimension proche de `n/2` ne divise donc pas seulement un temps par deux. Il réduit l’exposant qui gouverne le coût de l’attaque.

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 570" role="img" aria-labelledby="hawk-flow-title hawk-flow-desc">
    <title id="hawk-flow-title">La récupération de clé HAWK par le cocycle tau</title>
    <desc id="hawk-flow-desc">La clé publique permet de construire un réseau de rang n. Une symétrie de Galois y expose un vecteur court, puis une descente reconstruit une clé équivalente capable de signer.</desc>
    <rect x="44" y="72" width="188" height="122" rx="18" fill="#121816" stroke="#81dacb" />
    <text x="68" y="105" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">CLÉ PUBLIQUE</text>
    <text x="68" y="141" fill="#f1f4f0" font-size="24" font-family="system-ui, sans-serif">Q = B*B</text>
    <text x="68" y="169" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">B reste secrète</text>
    <path d="M232 133h70" stroke="#52645e" stroke-width="3" />
    <path d="M292 125l12 8-12 8" fill="none" stroke="#52645e" stroke-width="3" />
    <rect x="304" y="56" width="260" height="154" rx="18" fill="#121816" stroke="#aa9cc4" />
    <text x="330" y="89" fill="#aa9cc4" font-size="13" font-family="ui-monospace, monospace">SYMÉTRIE DE GALOIS</text>
    <text x="330" y="125" fill="#f1f4f0" font-size="22" font-family="system-ui, sans-serif">τ : ζ ↦ -ζ</text>
    <text x="330" y="158" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Vτ = B⁻¹ τ(B)</text>
    <text x="330" y="185" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Contraintes dérivées de Q</text>
    <path d="M564 133h70" stroke="#52645e" stroke-width="3" />
    <path d="M624 125l12 8-12 8" fill="none" stroke="#52645e" stroke-width="3" />
    <rect x="636" y="56" width="240" height="154" rx="18" fill="#121816" stroke="#c5a66f" />
    <text x="662" y="89" fill="#c5a66f" font-size="13" font-family="ui-monospace, monospace">RÉSEAU PUBLIC</text>
    <text x="662" y="125" fill="#f1f4f0" font-size="21" font-family="system-ui, sans-serif">Rang n</text>
    <text x="662" y="158" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Vτ est le plus court</text>
    <text x="662" y="185" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">SVP en n/2 + 1</text>
    <path d="M756 210v72" stroke="#52645e" stroke-width="3" />
    <path d="M748 272l8 12 8-12" fill="none" stroke="#52645e" stroke-width="3" />
    <rect x="544" y="286" width="332" height="118" rx="18" fill="#0b100f" stroke="#81dacb" />
    <text x="572" y="321" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">DESCENTE</text>
    <text x="572" y="356" fill="#f1f4f0" font-size="20" font-family="system-ui, sans-serif">Reconstruction d’une base B'</text>
    <text x="572" y="384" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">B'*B' = Q</text>
    <path d="M544 345H448" stroke="#52645e" stroke-width="3" />
    <path d="M458 337l-12 8 12 8" fill="none" stroke="#52645e" stroke-width="3" />
    <rect x="72" y="286" width="374" height="118" rx="18" fill="#0b100f" stroke="#81dacb" />
    <text x="100" y="321" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">IMPACT</text>
    <text x="100" y="356" fill="#f1f4f0" font-size="20" font-family="system-ui, sans-serif">La clé équivalente signe</text>
    <text x="100" y="384" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Récupération de clé, puis contrefaçon possible</text>
    <rect x="72" y="454" width="804" height="72" rx="16" fill="#121816" stroke="#33413c" />
    <text x="100" y="483" fill="#78827c" font-size="12" font-family="ui-monospace, monospace">FRONTIÈRE</text>
    <text x="100" y="510" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Attaque classique, exponentielle et spécifique à la structure HAWK étudiée.</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 340 900" role="img" aria-labelledby="hawk-flow-mobile-title hawk-flow-mobile-desc">
    <title id="hawk-flow-mobile-title">La récupération de clé HAWK par le cocycle tau</title>
    <desc id="hawk-flow-mobile-desc">La clé publique mène à la symétrie de Galois, à un réseau public de rang n, à un vecteur court puis à une clé équivalente capable de signer.</desc>
    <rect x="20" y="20" width="300" height="112" rx="16" fill="#121816" stroke="#81dacb" />
    <text x="42" y="50" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">CLÉ PUBLIQUE</text>
    <text x="42" y="82" fill="#f1f4f0" font-size="20" font-family="system-ui, sans-serif">Q = B*B</text>
    <text x="42" y="108" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">B reste secrète</text>
    <path d="M170 132v34" stroke="#52645e" stroke-width="3" />
    <rect x="20" y="166" width="300" height="128" rx="16" fill="#121816" stroke="#aa9cc4" />
    <text x="42" y="196" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">SYMÉTRIE DE GALOIS</text>
    <text x="42" y="228" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">τ : ζ ↦ -ζ</text>
    <text x="42" y="258" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Vτ = B⁻¹ τ(B)</text>
    <text x="42" y="280" fill="#a3ada6" font-size="11" font-family="system-ui, sans-serif">Contraintes calculables depuis Q</text>
    <path d="M170 294v34" stroke="#52645e" stroke-width="3" />
    <rect x="20" y="328" width="300" height="128" rx="16" fill="#121816" stroke="#c5a66f" />
    <text x="42" y="358" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">RÉSEAU PUBLIC</text>
    <text x="42" y="390" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">Rang n</text>
    <text x="42" y="420" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">SVP en dimension n/2 + 1</text>
    <text x="42" y="444" fill="#a3ada6" font-size="11" font-family="system-ui, sans-serif">Vτ est un vecteur le plus court</text>
    <path d="M170 456v34" stroke="#52645e" stroke-width="3" />
    <rect x="20" y="490" width="300" height="112" rx="16" fill="#0b100f" stroke="#81dacb" />
    <text x="42" y="520" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">DESCENTE</text>
    <text x="42" y="552" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Base équivalente B'</text>
    <text x="42" y="578" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">B'*B' = Q</text>
    <path d="M170 602v34" stroke="#52645e" stroke-width="3" />
    <rect x="20" y="636" width="300" height="112" rx="16" fill="#0b100f" stroke="#81dacb" />
    <text x="42" y="666" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">IMPACT</text>
    <text x="42" y="698" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">La clé équivalente signe</text>
    <text x="42" y="724" fill="#a3ada6" font-size="11" font-family="system-ui, sans-serif">Contrefaçon possible</text>
    <rect x="20" y="792" width="300" height="84" rx="14" fill="#121816" stroke="#33413c" />
    <text x="42" y="820" fill="#78827c" font-size="11" font-family="ui-monospace, monospace">FRONTIÈRE</text>
    <text x="42" y="846" fill="#a3ada6" font-size="11" font-family="system-ui, sans-serif">Classique, exponentielle</text>
    <text x="42" y="864" fill="#a3ada6" font-size="11" font-family="system-ui, sans-serif">et spécifique à HAWK.</text>
  </svg>
  <figcaption>Lecture pédagogique du préprint Straznickas-Weis. La réduction formelle et l’implémentation heuristique ne sont pas la même étape de preuve.</figcaption>
</figure>

## Une piste ouverte en 2025 devient une attaque complète

Le travail ne part pas de zéro. En mai 2025, Daniël van Gent et Ludo Pulles avaient publié [HAWK: Having Automorphisms Weakens Key](https://eprint.iacr.org/2025/928). Leur résultat montrait qu’un automorphisme non trivial du réseau entier sous-jacent permettrait de réduire l’attaque à un problème d’isomorphisme d’au plus la moitié du rang, donc de diminuer approximativement de moitié le nombre de bits de sécurité.

Leur article ne fournissait pas l’automorphisme exploitable pour la clé HAWK publique. Il ouvrait une avenue.

Le nouveau préprint construit précisément cet objet à partir de l’involution `τ`, prouve que le cocycle recherché se trouve parmi les vecteurs les plus courts d’un réseau public et utilise une descente antérieure pour revenir à une clé équivalente. Le mérite scientifique attribué à Claude porte donc sur une composition nouvelle de résultats, une construction mathématique et sa vérification calculatoire, pas sur l’apparition spontanée d’un problème inédit.

Cette chronologie importe pour juger le rôle de l’IA. Elle montre une recherche cumulative : lecture de la littérature, formulation d’une hypothèse, rejet de pistes, calculs symboliques, implémentation, confrontation à l’implémentation de référence et revue par l’équipe du schéma.

## Trois niveaux de preuve restent distincts

Le préprint contient une réduction déterministe en temps polynomial de la récupération de clé HAWK vers un nombre polynomial d’appels à un oracle SVP exact en dimension `n/2 + 1`. Cette phrase ne signifie pas que la récupération de clé devient polynomiale : l’oracle SVP exact reste la partie exponentielle.

L’expérience HAWK-256 ajoute deux couches différentes :

1. **La réduction mathématique.** Elle établit la transformation du problème HAWK vers des instances SVP plus petites.
2. **L’algorithme pratique.** Le code remplace les solveurs prouvables par une réduction BKZ et un crible heuristique. Le préprint précise aussi que la descente en tour utilisée dans l’expérience ne reçoit pas de garantie prouvée.
3. **La validation fonctionnelle.** Deux clés HAWK-256 sont récupérées. Chaque clé équivalente produit une signature acceptée par l’implémentation de référence.

Le [dépôt de démonstration](https://github.com/anthropics/cryptography-research-demo/tree/main/HAWK) fournit deux clés publiques, des dépendances épinglées, des points de reprise et un export d’éléments de vérification. Son estimation détaillée totalise environ 3 h 42 sur un serveur Sapphire Rapids à 96 cœurs, dont environ 3 h 13 pour les passes de crible. Cette durée est une mesure annoncée sur la machine de référence, pas un benchmark indépendant de BLACKPROOF.

## Les chiffres changent de sens selon le modèle

Les nombres suivants viennent de la table 1 et de la section 6 du [préprint](https://www.anthropic.com/document/hawk_key_recovery.pdf). Les exposants Core-SVP évaluent le coût d’un appel central. Les estimations en portes incluent le nombre d’appels selon le modèle repris par les auteurs. Elles ne sont donc pas directement interchangeables.

| Paramètre | Taille de bloc ou dimension SVP, avant puis après | Core-SVP par appel, avant puis après | Coût total estimé en portes, avant puis après |
| --- | --- | --- | --- |
| HAWK-256 | 211 → 129 | 2<sup>62</sup> → 2<sup>38</sup> | Pas de total comparable dans la spécification ; récupération pratique publiée |
| HAWK-512 | 452 → 257 | 2<sup>132</sup> → 2<sup>75</sup> | 2<sup>150</sup> → au plus 2<sup>108</sup> |
| HAWK-1024 | 940 → 513 | 2<sup>274</sup> → 2<sup>150</sup> | 2<sup>288</sup> → au plus 2<sup>182</sup> |

Pour HAWK-512 et HAWK-1024, le préprint donne aussi des estimations heuristiques plus basses, autour de 2<sup>80,8</sup> et 2<sup>146,5</sup> portes. Les auteurs les présentent comme dépendantes d’un modèle de progression BKZ et indiquent que les bornes précédentes sont conservatrices. Aucune récupération HAWK-512 n’est rapportée.

L’expression médiatique « sécurité divisée par deux » résume la diminution asymptotique de la dimension ou de la taille de bloc. Elle ne signifie pas que chaque exposant du tableau est exactement divisé par deux, ni qu’une machine donnée exécutera HAWK-512 en une durée déjà mesurée.

L’équipe HAWK a néanmoins [confirmé publiquement](https://groups.google.com/a/list.nist.gov/g/pqc-forum/c/2r2u6SbHun4/m/0_I2KOZ_CQAJ) la réduction approximative de moitié de la taille de bloc. Elle a ajouté que doubler naïvement les paramètres ou passer à des modules de rang supérieur rendrait HAWK non compétitif, puis a retiré le candidat. La [page officielle du troisième tour NIST](https://csrc.nist.gov/projects/pqc-dig-sig/round-3-additional-signatures) porte désormais cette mention.

## Le périmètre n’englobe pas les autres réseaux

Le préprint établit plusieurs frontières techniques :

- l’attaque vise le problème de récupération de clé de HAWK sur des anneaux cyclotomiques de conducteur puissance de deux ;
- la construction utilise une involution d’ordre deux distincte de la conjugaison complexe ;
- l’attaque reste exponentielle ;
- les auteurs expliquent pourquoi leur construction ne se transfère pas à Falcon ;
- certains conducteurs de la forme `p^k` ou `2p^k`, avec `p` premier impair, échappent à cette construction particulière.

La dernière propriété ne constitue pas une preuve de sécurité pour tous les schémas construits sur ces conducteurs. Elle dit seulement que l’ingrédient algébrique précis de l’attaque n’y existe pas sous la même forme.

ML-KEM et ML-DSA utilisent eux aussi des réseaux structurés, mais ils ne reposent pas sur le même problème de récupération de base ni sur le même objet public. Une faiblesse de module-LIP dans HAWK ne devient pas, par voisinage lexical, une faiblesse de Module-LWE ou Module-SIS.

Le constat opérationnel est donc double : HAWK est retiré et ne doit pas être traité comme un futur standard ; les migrations vers les standards post-quantiques existants ne doivent pas être interrompues sur la base de cette attaque. Le [dossier BLACKPROOF sur les preuves vérifiables à dix ans](/analyses/preuves-numeriques-cryptographie-post-quantique-verification-dix-ans) reste fondé sur l’inventaire, la crypto-agilité, les standards publiés et la conservation du contexte de validation.

## Factorisation d’entiers : une autre structure, une autre rupture

RSA publie un entier `N = p × q`, produit de deux grands nombres premiers, et garde secrète l’information permettant de calculer la clé privée. Le problème générique consiste à retrouver `p` et `q` à partir de `N`.

Le [NIST rappelle](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=934896) deux régimes :

- sur ordinateur classique, le crible général des corps de nombres est le meilleur algorithme général connu et son coût est sous-exponentiel dans la taille binaire de `N` ;
- sur un ordinateur quantique hypothétique approprié, l’[algorithme de Shor](https://epubs.siam.org/doi/10.1137/S0097539795293172) résout la factorisation en un nombre d’étapes polynomial dans cette taille.

Shor exploite une périodicité via un problème de recherche d’ordre et une transformée de Fourier quantique. L’attaque HAWK exploite un automorphisme de Galois pour construire un réseau public de plus faible rang, puis cherche des vecteurs courts avec des algorithmes classiques. Les deux attaques utilisent de la structure, mais ni la structure, ni le problème, ni le modèle de calcul ne sont les mêmes.

Une jonction existe toutefois : la réduction de réseau peut aussi attaquer RSA lorsque des informations supplémentaires transforment la factorisation générique en recherche de petites racines.

En 1996 et 1997, Don Coppersmith a montré comment construire des réseaux dont les vecteurs courts révèlent de petites solutions d’équations polynomiales. Son [application à la factorisation](https://research.ibm.com/publications/small-solutions-to-polynomial-equations-and-low-exponent-rsa-vulnerabilities) retrouve les facteurs de `N = p × q` lorsque les `1/4 log2(N)` bits de poids fort de `p` sont connus. Pour des facteurs équilibrés, `p` contient environ `1/2 log2(N)` bits : l’hypothèse revient donc à connaître approximativement la moitié des bits de `p`. Jean-Sébastien Coron a ensuite donné une [présentation simplifiée et une implémentation expérimentale](https://www.iacr.org/cryptodb/archive/2004/EUROCRYPT/2177/2177.pdf) du même cas.

Cette attaque n’est pas un algorithme classique polynomial pour factoriser tout module RSA. Elle dépend d’une fuite ou d’une forme algébrique qui rend la racine inconnue suffisamment petite.

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 600" role="img" aria-labelledby="compare-title compare-desc">
    <title id="compare-title">Trois routes cryptanalytiques à ne pas confondre</title>
    <desc id="compare-desc">Comparaison entre l’attaque HAWK par automorphisme et vecteur court, la factorisation RSA avec fuite partielle par Coppersmith, et la factorisation quantique générique par Shor.</desc>
    <text x="54" y="52" fill="#78827c" font-size="13" font-family="ui-monospace, monospace">PROBLÈME PUBLIC</text>
    <text x="350" y="52" fill="#78827c" font-size="13" font-family="ui-monospace, monospace">STRUCTURE EXPLOITÉE</text>
    <text x="685" y="52" fill="#78827c" font-size="13" font-family="ui-monospace, monospace">RÉSULTAT</text>
    <rect x="40" y="78" width="840" height="132" rx="18" fill="#121816" stroke="#81dacb" />
    <text x="64" y="111" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">HAWK</text>
    <text x="64" y="147" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">Q = B*B</text>
    <text x="64" y="176" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Base B cachée</text>
    <path d="M256 144h74" stroke="#52645e" stroke-width="3" />
    <text x="354" y="129" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Automorphisme τ</text>
    <text x="354" y="158" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">+ SVP en n/2 + 1</text>
    <text x="354" y="185" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Calcul classique exponentiel</text>
    <path d="M606 144h58" stroke="#52645e" stroke-width="3" />
    <text x="688" y="132" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Clé équivalente</text>
    <text x="688" y="163" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">puis signature</text>
    <rect x="40" y="234" width="840" height="132" rx="18" fill="#121816" stroke="#aa9cc4" />
    <text x="64" y="267" fill="#aa9cc4" font-size="13" font-family="ui-monospace, monospace">RSA + FUITE</text>
    <text x="64" y="303" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">N = p × q</text>
    <text x="64" y="332" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Bits de p partiellement connus</text>
    <path d="M256 300h74" stroke="#52645e" stroke-width="3" />
    <text x="354" y="285" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Petites racines</text>
    <text x="354" y="314" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">+ réduction LLL</text>
    <text x="354" y="341" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Coppersmith, hypothèse de fuite</text>
    <path d="M606 300h58" stroke="#52645e" stroke-width="3" />
    <text x="688" y="303" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Facteurs p et q</text>
    <text x="688" y="332" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Cas structuré seulement</text>
    <rect x="40" y="390" width="840" height="132" rx="18" fill="#121816" stroke="#c5a66f" />
    <text x="64" y="423" fill="#c5a66f" font-size="13" font-family="ui-monospace, monospace">RSA GÉNÉRIQUE QUANTIQUE</text>
    <text x="64" y="459" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">N = p × q</text>
    <text x="64" y="488" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Aucune fuite de bits requise</text>
    <path d="M256 456h74" stroke="#52645e" stroke-width="3" />
    <text x="354" y="441" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Recherche d’ordre</text>
    <text x="354" y="470" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">+ Fourier quantique</text>
    <text x="354" y="497" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Shor, calcul quantique polynomial</text>
    <path d="M606 456h58" stroke="#52645e" stroke-width="3" />
    <text x="688" y="459" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Facteurs p et q</text>
    <text x="688" y="488" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Machine adaptée requise</text>
    <rect x="196" y="552" width="528" height="30" rx="10" fill="#0b100f" stroke="#33413c" />
    <text x="236" y="573" fill="#a3ada6" font-size="13" font-family="system-ui, sans-serif">Même mot « structure », trois hypothèses et trois preuves différentes.</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 340 1050" role="img" aria-labelledby="compare-mobile-title compare-mobile-desc">
    <title id="compare-mobile-title">Trois routes cryptanalytiques à ne pas confondre</title>
    <desc id="compare-mobile-desc">HAWK utilise une symétrie et un vecteur court, RSA avec fuite utilise Coppersmith, RSA générique sur ordinateur quantique utilise Shor.</desc>
    <rect x="20" y="20" width="300" height="292" rx="16" fill="#121816" stroke="#81dacb" />
    <text x="42" y="52" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">HAWK</text>
    <text x="42" y="86" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Q = B*B</text>
    <text x="42" y="114" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Base B cachée</text>
    <line x1="42" y1="142" x2="298" y2="142" stroke="#33413c" />
    <text x="42" y="176" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Automorphisme τ</text>
    <text x="42" y="204" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">+ SVP en n/2 + 1</text>
    <text x="42" y="230" fill="#a3ada6" font-size="11" font-family="system-ui, sans-serif">Classique et exponentiel</text>
    <line x1="42" y1="252" x2="298" y2="252" stroke="#33413c" />
    <text x="42" y="283" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">Clé équivalente, puis signature</text>
    <rect x="20" y="336" width="300" height="292" rx="16" fill="#121816" stroke="#aa9cc4" />
    <text x="42" y="368" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">RSA + FUITE</text>
    <text x="42" y="402" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">N = p × q</text>
    <text x="42" y="430" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Bits de p partiellement connus</text>
    <line x1="42" y1="458" x2="298" y2="458" stroke="#33413c" />
    <text x="42" y="492" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Petites racines</text>
    <text x="42" y="520" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">+ réduction LLL</text>
    <text x="42" y="546" fill="#a3ada6" font-size="11" font-family="system-ui, sans-serif">Coppersmith</text>
    <line x1="42" y1="568" x2="298" y2="568" stroke="#33413c" />
    <text x="42" y="599" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">Facteurs, cas structuré seulement</text>
    <rect x="20" y="652" width="300" height="292" rx="16" fill="#121816" stroke="#c5a66f" />
    <text x="42" y="684" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">RSA GÉNÉRIQUE QUANTIQUE</text>
    <text x="42" y="718" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">N = p × q</text>
    <text x="42" y="746" fill="#a3ada6" font-size="12" font-family="system-ui, sans-serif">Aucune fuite requise</text>
    <line x1="42" y1="774" x2="298" y2="774" stroke="#33413c" />
    <text x="42" y="808" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Recherche d’ordre</text>
    <text x="42" y="836" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">+ Fourier quantique</text>
    <text x="42" y="862" fill="#a3ada6" font-size="11" font-family="system-ui, sans-serif">Shor, temps polynomial</text>
    <line x1="42" y1="884" x2="298" y2="884" stroke="#33413c" />
    <text x="42" y="915" fill="#f1f4f0" font-size="15" font-family="system-ui, sans-serif">Facteurs, machine adaptée requise</text>
    <rect x="20" y="980" width="300" height="50" rx="12" fill="#0b100f" stroke="#33413c" />
    <text x="39" y="1002" fill="#a3ada6" font-size="11" font-family="system-ui, sans-serif">Trois hypothèses et trois preuves</text>
    <text x="39" y="1020" fill="#a3ada6" font-size="11" font-family="system-ui, sans-serif">différentes.</text>
  </svg>
  <figcaption>Synthèse BLACKPROOF à partir des travaux Straznickas-Weis, Coppersmith, Coron et Shor. Les réseaux peuvent être une hypothèse de sécurité ou un outil d’attaque selon le problème construit.</figcaption>
</figure>

## La structure algébrique produit efficacité et surface d’attaque

Les anneaux structurés accélèrent les opérations, compactent les clés et rendent possibles des implémentations adaptées aux systèmes contraints. HAWK revendiquait précisément des signatures compactes, une faible mémoire et l’absence de calcul flottant.

Cette efficacité n’est pas gratuite. La structure ajoute des transformations, des sous-corps, des normes et des symétries que le cryptanalyste peut chercher à isoler. Une hypothèse générique sur les réseaux ne suffit alors plus : il faut analyser la distribution exacte des clés, le rang du module, le conducteur, le groupe d’automorphismes et la forme publique réellement exposée.

La leçon ne consiste pas à supprimer toute structure. Elle consiste à la porter intégralement dans le modèle d’attaque. Une symétrie connue et correctement tarifée peut être compatible avec un schéma sûr. Une symétrie qui crée un réseau public de rang inférieur et place un secret parmi ses vecteurs les plus courts change le problème évalué.

## Le rôle de Claude reste une affirmation de processus vérifiable seulement en partie

Anthropic décrit un harnais multi-agents proche de Claude Code, donnant à Mythos Preview accès à Python, Sage, des articles et un environnement de calcul. Un opérateur humain, formé en informatique théorique mais non spécialiste des réseaux, a fourni des orientations de gestion. La recherche, le développement et la vérification auraient pris environ 60 heures et 100 000 dollars de consommation API.

Le [préprint](https://www.anthropic.com/document/hawk_key_recovery.pdf) indique que la majorité des découvertes mathématiques ont été assistées par l’IA, tandis que les auteurs humains ont surtout dirigé, organisé et vérifié le travail. L’[article d’Anthropic](https://www.anthropic.com/research/discovering-cryptographic-weaknesses) va plus loin en attribuant la découverte à Mythos Preview avec une intervention humaine limitée.

Ces éléments proviennent d’Anthropic. Le public peut auditer le résultat mathématique et le code, mais il ne dispose pas de l’intégralité des exécutions infructueuses ni d’un journal indépendant permettant de quantifier exactement la contribution causale du modèle.

Le niveau de confiance ne repose donc pas sur la seule phrase « Claude l’a trouvé ». Il repose sur une chaîne plus solide :

- un préprint détaillé avec théorèmes, hypothèses et limites ;
- un code de récupération de clé publiquement inspectable ;
- deux instances HAWK-256 et une vérification signature/vérification ;
- une divulgation préalable à l’équipe HAWK ;
- la confirmation de l’effet central par cette équipe ;
- une conséquence observable, le retrait du candidat sur le site du NIST.

Le récent [CryptanalysisBench](https://arxiv.org/abs/2607.18538) fournit un cadre expérimental plus large pour mesurer les capacités de plusieurs modèles sur 191 tâches. Il ne prouve pas que les modèles réussiront sur n’importe quel schéma de production. Il renforce surtout la nécessité d’évaluer leurs sorties par des artefacts reproductibles et des critères cryptographiques, pas par la fluidité du raisonnement affiché.

## Six décisions pour les équipes sécurité et preuve

1. **Corriger les inventaires.** HAWK doit être marqué « candidat retiré », pas « standard NIST » ni « algorithme post-quantique approuvé ».
2. **Nommer le paramètre exact.** Un registre cryptographique doit conserver l’algorithme, la version, le jeu de paramètres, la bibliothèque, le format de clé et le statut de standardisation.
3. **Refuser le label générique « PQC ».** Une famille mathématique ne remplace pas une analyse du schéma et de son instanciation.
4. **Conserver le raisonnement de sélection.** Une décision doit rester rattachée aux sources et estimations disponibles à sa date, avec un mécanisme de révision si une attaque change le niveau de confiance.
5. **Exiger des preuves reproductibles pour les alertes IA.** Préprint, code, instances, environnement épinglé, test de bout en bout, validation indépendante et périmètre négatif doivent être séparés.
6. **Préparer le remplacement sans improvisation.** La crypto-agilité consiste à pouvoir remplacer un composant, revalider les formats et renouveler les preuves, pas à permuter un nom d’algorithme dans une configuration.

Pour un dossier probatoire, l’événement HAWK illustre aussi pourquoi la preuve de choix compte. Une organisation doit pouvoir montrer quel statut avait un algorithme lors de la décision, quelles attaques étaient connues, quel paramètre était employé et quel plan de migration existait. La [méthode BLACKPROOF](/method) sépare précisément la pièce, son origine, son intégrité et la conclusion qu’elle permet.

## Inconnues et limites au 29 juillet 2026

- Le préprint Anthropic ne dispose pas encore d’une évaluation académique publiée.
- BLACKPROOF n’a pas exécuté la récupération HAWK-256 sur le serveur de référence ni audité l’ensemble du code Sage, C et du crible.
- L’équipe HAWK confirme l’effet approximatif sur la taille de bloc, mais cette confirmation publique ne remplace pas une réplication complète par plusieurs équipes indépendantes.
- Les estimations HAWK-512 et HAWK-1024 dépendent de modèles de coût et d’heuristiques de réduction de réseau. Aucune récupération pratique de ces paramètres n’est publiée dans les sources examinées.
- Le résultat ne permet pas de prévoir la vitesse des progrès futurs de l’IA en cryptanalyse.
- L’absence de transfert démontré vers Falcon, ML-DSA ou ML-KEM n’est pas une preuve qu’aucune autre attaque ne sera découverte contre ces schémas.

## Une bonne standardisation produit aussi des retraits

Le retrait de HAWK n’est pas un échec du processus public. Un appel ouvert expose des spécifications et des implémentations précisément pour que des attaques puissent être formulées avant un déploiement normatif.

Le résultat du 28 juillet apporte trois enseignements durables. Une symétrie algébrique peut diminuer la dimension effective d’un problème sans rendre l’attaque polynomiale. Les réseaux servent à la fois de fondation cryptographique et d’outil contre des systèmes structurés, y compris certains cas de RSA avec fuite partielle. Enfin, une découverte assistée par IA ne mérite confiance que lorsqu’elle produit des objets contrôlables par d’autres : preuve, code, instances, limites et contradiction possible.

HAWK a été retiré parce qu’une attaque spécifique a modifié son équilibre entre sécurité, taille et performance. La cryptographie post-quantique, elle, n’a pas été « cassée ». Elle vient de subir exactement l’examen adversarial dont dépend sa crédibilité.
