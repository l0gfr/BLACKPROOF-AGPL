---
title: "Agents IA : à qui donne-t-on les clés de l’entreprise ?"
description: "Messagerie, documents, outils MCP : les agents IA reçoivent des pouvoirs concrets. Comment délimiter leurs accès et garder la maîtrise des actions ?"
publishedAt: 2026-09-16
updatedAt: 2026-09-16
category: "Méthode"
format: "Analyse"
confidence: "Confiance élevée"
author: "Rédaction BLACKPROOF"
tags:
  - agents IA
  - MCP
  - contrôle des accès
  - injection de prompt
  - délégation
  - sécurité des données
readingMinutes: 11
featured: true
draft: false
sources:
  - title: "Back to the Future: Why Agentic AI Needs a Strong Identity Foundation"
    publisher: "NIST"
    url: "https://www.nist.gov/blogs/cybersecurity-insights/back-future-why-agentic-ai-needs-strong-identity-foundation"
    kind: "Source institutionnelle"
    publicationDate: 2026-08-27
    consultedAt: 2026-09-16
  - title: "Managing the cyber risk of agentic AI"
    publisher: "National Cyber Security Centre"
    url: "https://www.ncsc.gov.uk/blogs/managing-the-cyber-risk-of-agentic-ai"
    kind: "Source institutionnelle"
    publicationDate: 2026-08-20
    consultedAt: 2026-09-16
  - title: "Prompt injection is not SQL injection (it may be worse)"
    publisher: "National Cyber Security Centre"
    url: "https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection"
    kind: "Source institutionnelle"
    consultedAt: 2026-09-16
  - title: "Defeating Prompt Injections by Design"
    publisher: "Edoardo Debenedetti et al. / arXiv"
    url: "https://arxiv.org/abs/2503.18813"
    kind: "Recherche"
    publicationDate: 2025-03-24
    consultedAt: 2026-09-16
  - title: "Design Patterns for Securing LLM Agents against Prompt Injections"
    publisher: "Luca Beurer-Kellner et al. / arXiv"
    url: "https://arxiv.org/abs/2506.08837"
    kind: "Recherche"
    publicationDate: 2025-06-10
    consultedAt: 2026-09-16
  - title: "Tools, specification 2025-11-25"
    publisher: "Model Context Protocol"
    url: "https://modelcontextprotocol.io/specification/2025-11-25/server/tools"
    kind: "Source primaire"
    consultedAt: 2026-09-16
  - title: "Authorization, specification 2025-11-25"
    publisher: "Model Context Protocol"
    url: "https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization"
    kind: "Source primaire"
    consultedAt: 2026-09-16
  - title: "Security Best Practices, documentation 2025-11-25"
    publisher: "Model Context Protocol"
    url: "https://modelcontextprotocol.io/docs/2025-11-25/tutorials/security/security_best_practices"
    kind: "Source primaire"
    consultedAt: 2026-09-16
  - title: "Tool Annotations as Risk Vocabulary: What Hints Can and Can't Do"
    publisher: "Model Context Protocol"
    url: "https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/"
    kind: "Source primaire"
    publicationDate: 2026-03-16
    consultedAt: 2026-09-16
  - title: "LLM06:2025 Excessive Agency"
    publisher: "OWASP Gen AI Security Project"
    url: "https://genai.owasp.org/llmrisk/llm062025-excessive-agency/"
    kind: "Source primaire"
    consultedAt: 2026-09-16
  - title: "RFC 7009: OAuth 2.0 Token Revocation"
    publisher: "IETF"
    url: "https://datatracker.ietf.org/doc/html/rfc7009"
    kind: "Source primaire"
    consultedAt: 2026-09-16
  - title: "Logging Cheat Sheet"
    publisher: "OWASP"
    url: "https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html"
    kind: "Source primaire"
    consultedAt: 2026-09-16
---

Une entreprise demande à un agent IA de préparer une réponse à un client. Elle lui ouvre la messagerie et le dossier commercial. Pour gagner du temps, elle ajoute aussi la possibilité d’envoyer des courriels et de créer des liens de partage. Une demande de rédaction vient de s’accompagner d’un pouvoir de transmission.

Cette situation hypothétique ressemble à l’arrivée d’un assistant auquel on remettrait, le même matin, un badge, une délégation de signature et les clés des archives. Chacun de ces accès peut avoir une utilité. Leur réunion mérite une décision explicite. **Lire un document, en transmettre le contenu et autoriser d’autres personnes à le consulter sont des pouvoirs distincts.**

Deux publications récentes éclairent cette question. Le **27 août 2026**, le NIST américain examine les mauvaises pratiques d’identité et d’autorisation qui accompagnent le déploiement des agents. Le **20 août**, le NCSC britannique propose des conseils opérationnels provisoires sur leur encadrement. Leur point commun : organiser les accès, les limites et les moyens d’intervention autour du modèle. [Analyse du NIST](https://www.nist.gov/blogs/cybersecurity-insights/back-future-why-agentic-ai-needs-strong-identity-foundation), [recommandations du NCSC](https://www.ncsc.gov.uk/blogs/managing-the-cyber-risk-of-agentic-ai).

## Une identité pour attribuer les actions

Lorsqu’un agent utilise les identifiants d’un salarié, les opérations peuvent apparaître sous le nom de ce salarié dans les applications concernées. Pour comprendre un incident, il faudra pourtant distinguer la demande humaine, l’action du logiciel et les autorisations dont celui-ci disposait.

Le NIST recommande de traiter les agents comme des entités identifiables, avec leurs propres moyens d’authentification et des droits rattachés à la personne ou au système qui les mandate. Il pointe aussi les clés statiques conservées trop longtemps et les accès trop larges. [NIST, identité et autorisation des agents](https://www.nist.gov/blogs/cybersecurity-insights/back-future-why-agentic-ai-needs-strong-identity-foundation).

Dans notre exemple, le mandat pourrait se limiter au dossier du client concerné, pour la durée de la préparation. L’accès à l’ensemble des archives commerciales demanderait une justification supplémentaire. L’OWASP recommande précisément de réduire les fonctions disponibles et les permissions des systèmes auxquels les agents se connectent. Le contrôle doit aussi exister dans l’application qui détient les données. [OWASP, Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/).

## Un document peut tenter de prendre la parole

Un agent qui consulte un courriel, une page web ou une pièce jointe rencontre du texte fourni par des tiers. Ce contenu peut contenir une consigne destinée à détourner son travail. C’est le principe de l’**injection indirecte de prompt** : une instruction hostile se présente dans les données que le modèle doit traiter. Le NCSC souligne la difficulté de maintenir une séparation fiable entre ces données et les instructions légitimes. [NCSC, analyse de l’injection de prompt](https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection).

Poursuivons le scénario hypothétique. Un courriel demande à l’assistant de joindre à sa réponse un document interne sans rapport avec la demande du client, sous prétexte de terminer une vérification. Pour provoquer une fuite, cette tentative doit encore tromper le modèle, atteindre le document et franchir les contrôles de transmission. La présence d’un texte malveillant ne démontre donc ni une action réussie ni une exfiltration.

La combinaison mérite cependant attention : accès à des informations privées, exposition à du contenu non fiable et possibilité de communiquer vers l’extérieur. Le blog officiel MCP insiste sur l’examen des outils réunis dans une même session. Un outil de consultation et un outil d’envoi peuvent former ensemble un chemin de divulgation. [MCP, analyse des annotations et des combinaisons d’outils](https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/).

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 375" role="img" aria-labelledby="agent-combination-title agent-combination-desc">
    <title id="agent-combination-title">Une combinaison de capacités à encadrer</title>
    <desc id="agent-combination-desc">Trois capacités réunies dans une session peuvent créer un chemin de divulgation : lire des données privées, traiter du contenu non fiable et communiquer vers l’extérieur. La présence de ces capacités ne démontre pas une attaque réussie ; les contrôles et le comportement de l’agent doivent être examinés.</desc>
    <rect width="920" height="375" rx="16" fill="#0b100f" />
    <text x="32" y="44" fill="#f1f4f0" font-size="26" font-weight="700">Trois capacités à examiner ensemble</text>
    <text x="32" y="75" fill="#a3ada6" font-size="18">Une combinaison peut ouvrir un chemin de fuite de données.</text>
    <rect x="32" y="108" width="252" height="163" rx="12" fill="#121816" stroke="#81dacb" />
    <text x="50" y="140" fill="#81dacb" font-size="17" font-weight="700">LIRE</text>
    <text x="50" y="184" fill="#f1f4f0" font-size="20">Des données privées</text>
    <text x="50" y="241" fill="#a3ada6" font-size="15">Contrats, tarifs, dossiers</text>
    <text x="309" y="197" fill="#a3ada6" font-size="30" text-anchor="middle">+</text>
    <rect x="334" y="108" width="252" height="163" rx="12" fill="#121816" stroke="#aa9cc4" />
    <text x="352" y="140" fill="#aa9cc4" font-size="17" font-weight="700">CONSULTER</text>
    <text x="352" y="184" fill="#f1f4f0" font-size="20">Du contenu non fiable</text>
    <text x="352" y="241" fill="#a3ada6" font-size="15">Courriels, pages, pièces</text>
    <text x="611" y="197" fill="#a3ada6" font-size="30" text-anchor="middle">+</text>
    <rect x="636" y="108" width="252" height="163" rx="12" fill="#121816" stroke="#c5a66f" />
    <text x="654" y="140" fill="#c5a66f" font-size="17" font-weight="700">TRANSMETTRE</text>
    <text x="654" y="184" fill="#f1f4f0" font-size="20">Vers un destinataire</text>
    <text x="654" y="211" fill="#f1f4f0" font-size="20">externe</text>
    <text x="654" y="241" fill="#a3ada6" font-size="15">Messages, liens, requêtes</text>
    <text x="460" y="314" fill="#81dacb" font-size="19" font-weight="700" text-anchor="middle">La réussite d’une attaque dépend aussi des contrôles en place.</text>
    <text x="460" y="346" fill="#a3ada6" font-size="18" text-anchor="middle">Ces capacités ne prouvent ni une compromission ni une fuite.</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 360 726" role="img" aria-labelledby="agent-combination-mobile-title agent-combination-mobile-desc">
    <title id="agent-combination-mobile-title">Trois capacités à examiner ensemble</title>
    <desc id="agent-combination-mobile-desc">Trois capacités réunies dans une session peuvent créer un chemin de divulgation : lire des données privées, traiter du contenu non fiable et communiquer vers l’extérieur. La présence de ces capacités ne démontre pas une attaque réussie ; les contrôles et le comportement de l’agent doivent être examinés.</desc>
    <rect width="360" height="726" rx="16" fill="#0b100f" />
    <text x="22" y="36" fill="#f1f4f0" font-size="23" font-weight="700">Trois capacités</text>
    <text x="22" y="66" fill="#f1f4f0" font-size="23" font-weight="700">à examiner ensemble</text>
    <rect x="22" y="94" width="316" height="132" rx="12" fill="#121816" stroke="#81dacb" />
    <text x="40" y="124" fill="#81dacb" font-size="16" font-weight="700">LIRE</text>
    <text x="40" y="162" fill="#f1f4f0" font-size="18">Des données privées</text>
    <text x="40" y="195" fill="#a3ada6" font-size="15">Contrats, tarifs, dossiers</text>
    <text x="180" y="255" fill="#a3ada6" font-size="26" text-anchor="middle">+</text>
    <rect x="22" y="264" width="316" height="132" rx="12" fill="#121816" stroke="#aa9cc4" />
    <text x="40" y="294" fill="#aa9cc4" font-size="16" font-weight="700">CONSULTER</text>
    <text x="40" y="332" fill="#f1f4f0" font-size="18">Du contenu non fiable</text>
    <text x="40" y="365" fill="#a3ada6" font-size="15">Courriels, pages, pièces jointes</text>
    <text x="180" y="425" fill="#a3ada6" font-size="26" text-anchor="middle">+</text>
    <rect x="22" y="434" width="316" height="132" rx="12" fill="#121816" stroke="#c5a66f" />
    <text x="40" y="464" fill="#c5a66f" font-size="16" font-weight="700">TRANSMETTRE</text>
    <text x="40" y="502" fill="#f1f4f0" font-size="18">Vers un destinataire externe</text>
    <text x="40" y="535" fill="#a3ada6" font-size="15">Messages, liens, requêtes</text>
    <text x="22" y="608" fill="#81dacb" font-size="19" font-weight="700">Une voie de fuite possible,</text>
    <text x="22" y="636" fill="#81dacb" font-size="19" font-weight="700">selon les contrôles en place.</text>
    <text x="22" y="674" fill="#a3ada6" font-size="16">Ce schéma ne démontre</text>
    <text x="22" y="700" fill="#a3ada6" font-size="16">aucune fuite effective.</text>
  </svg>
  <figcaption>Schéma des conditions à examiner, sans estimation de probabilité. Source : <a href="https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/">blog officiel MCP, 16 mars 2026</a>. Les contrôles peuvent empêcher la réalisation de la fuite.</figcaption>
</figure>

Le sujet ne se réduit pas à la qualité des consignes. Le projet de recherche **CaMeL** explore une séparation des flux de contrôle et de données autour du modèle, accompagnée de restrictions sur les échanges autorisés. D’autres travaux étudient plusieurs architectures et leurs compromis entre utilité et sécurité. Ces recherches étayent des mécanismes de défense dans des cadres définis ; elles ne certifient pas la sécurité de tous les agents disponibles. [CaMeL](https://arxiv.org/abs/2503.18813), [Design Patterns for Securing LLM Agents](https://arxiv.org/abs/2506.08837).

## MCP relie les outils et pose plusieurs frontières

Le **Model Context Protocol**, ou MCP, permet à une application d’IA de découvrir et d’appeler des outils exposés par des serveurs : consulter une base, interroger un service ou effectuer une opération. La spécification prévoit notamment la validation des entrées et les contrôles d’accès côté serveur. Elle recommande aussi de présenter les paramètres des opérations sensibles à l’utilisateur. Leur mise en œuvre doit être vérifiée dans le logiciel choisi. [Spécification MCP, outils](https://modelcontextprotocol.io/specification/2025-11-25/server/tools).

Une annotation comme `readOnlyHint` décrit le comportement annoncé d’un outil. Elle ne retire aucun droit au programme qui l’exécute. Un serveur non fiable peut fournir une description trompeuse ; un outil qui lit des données peut aussi les rendre accessibles à d’autres composants de la session. L’indication aide à comprendre l’outil, tandis que les permissions effectives et les restrictions réseau déterminent ses possibilités. [MCP, portée et limites des annotations](https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/).

La connexion à un serveur distant ajoute une autre frontière. Le cadre d’autorisation MCP examiné ici, dans sa version du **25 novembre 2025**, concerne les transports HTTP lorsqu’une autorisation est mise en œuvre. Il exige de vérifier que le jeton présenté est destiné au serveur qui le reçoit. Il interdit de transmettre tel quel ce jeton à une API en aval ; l’accès à cette API relève d’une autorisation distincte. Ce cadre n’est pas celui des serveurs locaux communiquant par l’entrée et la sortie standard, dites *stdio*. [MCP, autorisation](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization).

Installer un serveur MCP local revient par ailleurs à exécuter un logiciel. Sa provenance, sa commande de lancement et ses accès aux fichiers ou au réseau comptent. Les recommandations MCP prévoient un consentement explicite à l’exécution et un environnement restreint. Cette dépendance logicielle s’examine aussi dans une [revue du fournisseur et de ses accès](/analyses/due-diligence-cyber-fournisseur-documenter-risque-sans-surcollecter). [MCP, sécurité des serveurs locaux](https://modelcontextprotocol.io/docs/2025-11-25/tutorials/security/security_best_practices).

## Un mandat précis, des permissions vérifiables

« Préparer une réponse client » décrit un résultat attendu. L’organisation peut le traduire en un ensemble limité d’opérations : lire les pièces sélectionnées, produire un brouillon, puis soumettre un envoi déterminé à validation. L’OWASP recommande des fonctions spécialisées et des autorisations minimales, afin de réduire les conséquences d’une action indésirable. Un outil général d’exécution de commandes exige un encadrement plus large qu’une fonction consacrée à une seule opération. [OWASP, réduction des fonctions et des permissions](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/).

Le schéma suivant propose une politique pour notre scénario. Il ne décrit ni une fonction automatique de MCP ni une règle universelle : chaque ligne suppose un contrôle effectivement appliqué par les applications et l’environnement d’exécution.

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 453" role="img" aria-labelledby="agent-mandate-title agent-mandate-desc">
    <title id="agent-mandate-title">Exemple de permissions pour une réponse client</title>
    <desc id="agent-mandate-desc">Exemple hypothétique de mandat : la lecture du dossier sélectionné et la préparation d’un brouillon sont autorisées. La transmission demande une validation du destinataire et du contenu. Le partage de toutes les archives est bloqué. Ces restrictions supposent des contrôles techniques effectifs.</desc>
    <rect width="920" height="453" rx="16" fill="#0b100f" />
    <text x="32" y="44" fill="#f1f4f0" font-size="25" font-weight="700">Préparer une réponse client : un mandat possible</text>
    <text x="32" y="75" fill="#a3ada6" font-size="18">Exemple de politique à faire appliquer par les systèmes.</text>
    <rect x="32" y="101" width="856" height="61" rx="12" fill="#121816" stroke="#81dacb" />
    <text x="50" y="137" fill="#f1f4f0" font-size="20">Lire le dossier sélectionné</text>
    <text x="390" y="136" fill="#a3ada6" font-size="16">Périmètre limité au client</text>
    <text x="858" y="137" fill="#81dacb" font-size="17" font-weight="700" text-anchor="end">AUTORISÉ</text>
    <rect x="32" y="173" width="856" height="61" rx="12" fill="#121816" stroke="#81dacb" />
    <text x="50" y="209" fill="#f1f4f0" font-size="20">Préparer un brouillon</text>
    <text x="390" y="208" fill="#a3ada6" font-size="16">Sans transmission externe</text>
    <text x="858" y="209" fill="#81dacb" font-size="17" font-weight="700" text-anchor="end">AUTORISÉ</text>
    <rect x="32" y="245" width="856" height="61" rx="12" fill="#121816" stroke="#c5a66f" />
    <text x="50" y="281" fill="#f1f4f0" font-size="20">Envoyer la réponse</text>
    <text x="390" y="280" fill="#a3ada6" font-size="16">Destinataire et contenu validés</text>
    <text x="858" y="281" fill="#c5a66f" font-size="17" font-weight="700" text-anchor="end">À VALIDER</text>
    <rect x="32" y="317" width="856" height="61" rx="12" fill="#121816" stroke="#aa9cc4" />
    <text x="50" y="353" fill="#f1f4f0" font-size="20">Partager toutes les archives</text>
    <text x="390" y="352" fill="#a3ada6" font-size="16">Hors du mandat confié</text>
    <text x="858" y="353" fill="#aa9cc4" font-size="17" font-weight="700" text-anchor="end">BLOQUÉ</text>
    <text x="32" y="422" fill="#81dacb" font-size="20" font-weight="700">Chaque permission doit pouvoir être vérifiée et retirée.</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 360 756" role="img" aria-labelledby="agent-mandate-mobile-title agent-mandate-mobile-desc">
    <title id="agent-mandate-mobile-title">Un mandat limité pour préparer une réponse client</title>
    <desc id="agent-mandate-mobile-desc">Exemple hypothétique de mandat : la lecture du dossier sélectionné et la préparation d’un brouillon sont autorisées. La transmission demande une validation du destinataire et du contenu. Le partage de toutes les archives est bloqué. Ces restrictions supposent des contrôles techniques effectifs.</desc>
    <rect width="360" height="756" rx="16" fill="#0b100f" />
    <text x="22" y="35" fill="#f1f4f0" font-size="21" font-weight="700">Préparer une réponse client</text>
    <text x="22" y="66" fill="#a3ada6" font-size="18">Exemple de mandat limité</text>
    <rect x="22" y="93" width="316" height="128" rx="12" fill="#121816" stroke="#81dacb" />
    <text x="40" y="122" fill="#81dacb" font-size="15" font-weight="700">AUTORISÉ</text>
    <text x="40" y="159" fill="#f1f4f0" font-size="19">Lire le dossier sélectionné</text>
    <text x="40" y="197" fill="#a3ada6" font-size="15">Périmètre limité au client</text>
    <rect x="22" y="238" width="316" height="128" rx="12" fill="#121816" stroke="#81dacb" />
    <text x="40" y="267" fill="#81dacb" font-size="15" font-weight="700">AUTORISÉ</text>
    <text x="40" y="304" fill="#f1f4f0" font-size="19">Préparer un brouillon</text>
    <text x="40" y="342" fill="#a3ada6" font-size="15">Sans transmission externe</text>
    <rect x="22" y="383" width="316" height="128" rx="12" fill="#121816" stroke="#c5a66f" />
    <text x="40" y="412" fill="#c5a66f" font-size="15" font-weight="700">À VALIDER</text>
    <text x="40" y="449" fill="#f1f4f0" font-size="19">Envoyer la réponse</text>
    <text x="40" y="487" fill="#a3ada6" font-size="15">Destinataire et contenu validés</text>
    <rect x="22" y="528" width="316" height="128" rx="12" fill="#121816" stroke="#aa9cc4" />
    <text x="40" y="557" fill="#aa9cc4" font-size="15" font-weight="700">BLOQUÉ</text>
    <text x="40" y="592" fill="#f1f4f0" font-size="19">Partager toutes</text>
    <text x="40" y="616" fill="#f1f4f0" font-size="19">les archives</text>
    <text x="40" y="640" fill="#a3ada6" font-size="14">Hors du mandat confié</text>
    <text x="22" y="703" fill="#81dacb" font-size="19" font-weight="700">Des permissions à vérifier,</text>
    <text x="22" y="731" fill="#81dacb" font-size="19" font-weight="700">puis à retirer si nécessaire.</text>
  </svg>
  <figcaption>Proposition pour le scénario de cet article, inspirée des principes de <a href="https://genai.owasp.org/llmrisk/llm062025-excessive-agency/">restriction des fonctions et permissions de l’OWASP</a>. Ces règles doivent être appliquées par les systèmes ; MCP ne les active pas automatiquement.</figcaption>
</figure>

Une vérification utile consiste à essayer, dans un environnement de test, de lire un dossier hors périmètre, d’envoyer à un destinataire non approuvé et d’utiliser un accès retiré. Il faut observer où l’opération est bloquée. Un refus formulé dans la conversation renseigne sur le comportement du modèle ; le refus du service destinataire démontre une restriction sur l’action testée. Ces observations restent limitées à la configuration et aux essais réalisés.

## La validation humaine doit porter sur une action lisible

Le NIST relève un risque de fatigue lorsque les demandes d’autorisation se multiplient. L’utilisateur peut finir par accepter machinalement pour laisser avancer le travail. [NIST, limites des validations répétées](https://www.nist.gov/blogs/cybersecurity-insights/back-future-why-agentic-ai-needs-strong-identity-foundation).

Pour notre réponse client, une validation utile montrerait le destinataire, le texte final, les pièces jointes et la portée du partage. Elle devrait intervenir avant la transmission. La spécification MCP recommande d’afficher les entrées des outils avant leur invocation afin de prévenir les divulgations accidentelles ou malveillantes. [MCP, considérations de sécurité des outils](https://modelcontextprotocol.io/specification/2025-11-25/server/tools).

L’analyse des architectures de défense pose aussi la question de la place laissée au contrôle humain et des restrictions imposées au déroulement de la tâche. Le compromis dépend de l’usage. Une préparation autonome dans un dossier limité peut être acceptable, avec un contrôle distinct au moment de transmettre son résultat. C’est une décision d’organisation à traduire en mécanismes testables. [Recherche sur les architectures de protection des agents](https://arxiv.org/abs/2506.08837).

## Retirer les accès fait partie de la délégation

Le NCSC recommande de pouvoir interrompre rapidement l’activité d’un agent et ses communications. Cette capacité peut dépasser l’arrêt du seul processus visible : elle concerne aussi les connexions et les composants qui l’entourent. [NCSC, arrêt d’urgence](https://www.ncsc.gov.uk/blogs/managing-the-cyber-risk-of-agentic-ai).

Pour les accès OAuth, la révocation possède ses propres modalités. La **RFC 7009** prévoit l’invalidation des jetons et reconnaît de possibles délais de propagation entre serveurs. Elle distingue aussi le traitement des jetons d’accès et de renouvellement. La présence d’un bouton « déconnecter » ne permet donc pas, à elle seule, de conclure que toutes les possibilités d’accès ont disparu. [IETF, OAuth 2.0 Token Revocation](https://datatracker.ietf.org/doc/html/rfc7009).

Dans notre scénario, l’essai de retrait consisterait à couper l’autorisation puis à vérifier que la consultation et l’envoi deviennent impossibles par les chemins concernés. Il faudrait également examiner les partages déjà créés. Une révocation bloque des accès futurs selon sa portée ; elle ne récupère pas un document déjà transmis. La reprise en main exige de distinguer l’arrêt de l’agent, la fermeture des accès et le traitement des actions accomplies.

## Des traces pour comprendre, sans recopier tous les secrets

Une trace exploitable relie une action à une identité, une heure, une ressource, une décision d’autorisation et un résultat. L’OWASP recommande de conserver le contexte nécessaire à l’analyse des événements, tout en évitant l’enregistrement direct des mots de passe, jetons et informations sensibles. Il préconise également de protéger les journaux contre les modifications et de limiter leur consultation. [OWASP, journalisation](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).

Pour l’envoi commercial, on chercherait à rapprocher la validation enregistrée et l’événement produit par la messagerie : destinataire, pièces transmises, succès ou échec. Le récit de l’agent constitue un élément à confronter aux traces des applications. Si elles sont incomplètes, la conclusion doit le rester. Notre analyse sur les [fuites de données et les faits à établir](/analyses/fuite-de-donnees-etablir-avant-de-conclure) développe cette distinction entre tentative, accès et sortie effective de données.

## Une autonomie à dimensionner tâche par tâche

La question opérationnelle consiste à définir les actions autorisées, leurs conditions et les conséquences acceptables d’un échec. Le NCSC invite à proportionner l’autonomie à l’usage et à combiner surveillance, isolation et contrôles techniques. Ses conseils d’août 2026 restent présentés comme provisoires, dans un domaine en évolution. [NCSC, gestion du risque agentique](https://www.ncsc.gov.uk/blogs/managing-the-cyber-risk-of-agentic-ai).

Pour la tâche commerciale décrite ici, la décision peut tenir dans un mandat court : un dossier délimité, un brouillon librement préparé, un envoi précisément validé, des accès retirables et des opérations retraçables. Cette proposition illustre une méthode ; son efficacité dépend de la réalité des contrôles et des tests.

Les sources consultées établissent des mécanismes de risque, des exigences de protocole et des pistes de protection. Elles ne permettent pas de chiffrer la probabilité d’un incident dans une entreprise donnée. Cette évaluation nécessite de connaître ses outils, ses données, ses permissions et ses pratiques. **Déléguer une tâche à un agent suppose de pouvoir expliquer les pouvoirs qu’on lui confie, puis de vérifier qu’ils restent dans les limites décidées.**
