---
title: "Comment prouver qu’un document n’a pas été modifié ?"
description: "Empreinte, signature, cachet et horodatage : un guide simple pour vérifier l’intégrité d’un fichier sans confondre date, auteur et contenu."
publishedAt: 2026-07-31
updatedAt: 2026-07-31
category: "Méthode"
format: "Méthode"
confidence: "Confiance élevée"
author: "Rédaction BLACKPROOF"
tags:
  - intégrité document
  - empreinte numérique
  - signature électronique
  - horodatage électronique
  - preuve numérique
  - authenticité document
readingMinutes: 17
featured: true
draft: false
sources:
  - title: "Code civil, articles 1363 à 1380 : la preuve par écrit"
    publisher: "Légifrance"
    url: "https://www.legifrance.gouv.fr/codes/id/LEGISCTA000032037827"
    kind: "Source primaire"
    consultedAt: 2026-07-31
  - title: "Règlement (UE) no 910/2014 consolidé au 18 octobre 2024, dit eIDAS"
    publisher: "Journal officiel de l’Union européenne"
    url: "https://eur-lex.europa.eu/legal-content/FR/ALL/?uri=CELEX%3A02014R0910-20241018"
    kind: "Source primaire"
    publicationDate: 2024-10-18
    consultedAt: 2026-07-31
  - title: "Liste des prestataires de services de confiance qualifiés dans l’Union européenne"
    publisher: "Commission européenne"
    url: "https://digital-strategy.ec.europa.eu/en/policies/eu-trusted-lists"
    kind: "Source institutionnelle"
    publicationDate: 2025-06-30
    consultedAt: 2026-07-31
  - title: "Guide de sélection du niveau des signatures et des cachets électroniques"
    publisher: "ANSSI"
    url: "https://www.ssi.gouv.fr/uploads/2021/12/anssi-eidas-guide-niveau-signature.pdf"
    kind: "Source institutionnelle"
    consultedAt: 2026-07-31
  - title: "FIPS 180-4, Secure Hash Standard"
    publisher: "NIST"
    url: "https://csrc.nist.gov/pubs/fips/180-4/upd1/final"
    kind: "Source institutionnelle"
    publicationDate: 2015-08-04
    consultedAt: 2026-07-31
  - title: "Digital Evidence Preservation: Considerations for Evidence Handlers, NIST IR 8387"
    publisher: "NIST"
    url: "https://doi.org/10.6028/NIST.IR.8387"
    kind: "Source institutionnelle"
    publicationDate: 2022-09-08
    consultedAt: 2026-07-31
  - title: "Guide to Integrating Forensic Techniques into Incident Response, NIST SP 800-86"
    publisher: "NIST"
    url: "https://csrc.nist.gov/pubs/sp/800/86/final"
    kind: "Source institutionnelle"
    publicationDate: 2006-09-01
    consultedAt: 2026-07-31
  - title: "Intégrité des données numériques"
    publisher: "Bibliothèque nationale de France"
    url: "https://www.bnf.fr/fr/integrite-des-donnees-numeriques"
    kind: "Source institutionnelle"
    consultedAt: 2026-07-31
  - title: "Horodatage : présentation du fonctionnement"
    publisher: "Démarche Numérique"
    url: "https://doc.demarche.numerique.gouv.fr/pour-aller-plus-loin/horodatage"
    kind: "Source institutionnelle"
    consultedAt: 2026-07-31
---

Un contrat, une facture, une photographie ou un rapport est contesté. Une question revient : le fichier présenté aujourd’hui est-il celui qui existait au moment de son envoi ?

La réponse ne tient pas dans le nom du fichier, sa date affichée par l’ordinateur ou son apparence à l’écran. Pour démontrer qu’un document n’a pas été modifié, il faut pouvoir comparer son contenu exact à une référence créée lorsque ce contenu était encore considéré comme fiable. Une empreinte numérique sert à cette comparaison. Si l’identité de l’émetteur ou la date importent également, il faut ajouter une signature, un cachet ou un horodatage adapté.

> Conclusion courte : une empreinte peut établir qu’un fichier correspond à une référence. Elle ne prouve seule ni son auteur, ni sa date, ni la vérité de son contenu.

## Réponse simple en quatre questions

Le mot « authentique » mélange souvent plusieurs attentes. Or chaque mécanisme répond à une question différente.

- **Le fichier est-il resté identique ?** Une empreinte cryptographique compare ses octets à une référence. Cette référence doit elle-même être fiable.
- **Qui a signé ou émis le document ?** Une signature relie une personne au document, tandis qu’un cachet le rattache à une organisation. Le niveau de garantie dépend du procédé.
- **Le document existait-il à une date donnée ?** Un horodatage électronique relie les données à une date et une heure. Il n’établit pas nécessairement leur première date de création.
- **Comment le document a-t-il été conservé ?** Un journal, des reçus et des contrôles expliquent les transferts et vérifications. Toute période non documentée reste une limite.

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 440" role="img" aria-labelledby="document-four-questions-title document-four-questions-desc">
    <title id="document-four-questions-title">Quatre questions distinctes pour qualifier un document numérique</title>
    <desc id="document-four-questions-desc">Quatre cartes associent l’intégrité à une empreinte, l’origine à une signature ou un cachet, le temps à un horodatage et le parcours à un journal de conservation. Une mention finale rappelle qu’aucun de ces mécanismes ne démontre que le contenu est vrai.</desc>
    <rect x="16" y="48" width="208" height="252" rx="18" fill="#121816" stroke="#81dacb" />
    <rect x="242" y="48" width="208" height="252" rx="18" fill="#121816" stroke="#aa9cc4" />
    <rect x="468" y="48" width="208" height="252" rx="18" fill="#121816" stroke="#c5a66f" />
    <rect x="694" y="48" width="208" height="252" rx="18" fill="#121816" stroke="#80c89a" />
    <text x="40" y="86" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">INTÉGRITÉ</text>
    <text x="40" y="128" fill="#f1f4f0" font-size="20" font-family="system-ui, sans-serif">Même fichier ?</text>
    <text x="40" y="174" fill="#81dacb" font-size="18" font-family="system-ui, sans-serif">Empreinte</text>
    <text x="40" y="212" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Compare les octets</text>
    <text x="40" y="236" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">à une référence</text>
    <text x="266" y="86" fill="#aa9cc4" font-size="13" font-family="ui-monospace, monospace">ORIGINE</text>
    <text x="266" y="128" fill="#f1f4f0" font-size="20" font-family="system-ui, sans-serif">Qui l’a émis ?</text>
    <text x="266" y="174" fill="#aa9cc4" font-size="18" font-family="system-ui, sans-serif">Signature</text>
    <text x="266" y="200" fill="#aa9cc4" font-size="18" font-family="system-ui, sans-serif">ou cachet</text>
    <text x="266" y="238" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Relie une identité</text>
    <text x="492" y="86" fill="#c5a66f" font-size="13" font-family="ui-monospace, monospace">TEMPS</text>
    <text x="492" y="128" fill="#f1f4f0" font-size="20" font-family="system-ui, sans-serif">Existait quand ?</text>
    <text x="492" y="174" fill="#c5a66f" font-size="18" font-family="system-ui, sans-serif">Horodatage</text>
    <text x="492" y="212" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Associe une date</text>
    <text x="492" y="236" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">et une heure</text>
    <text x="718" y="86" fill="#80c89a" font-size="13" font-family="ui-monospace, monospace">PARCOURS</text>
    <text x="718" y="128" fill="#f1f4f0" font-size="20" font-family="system-ui, sans-serif">Qui l’a manipulé ?</text>
    <text x="718" y="174" fill="#80c89a" font-size="18" font-family="system-ui, sans-serif">Journal</text>
    <text x="718" y="200" fill="#80c89a" font-size="18" font-family="system-ui, sans-serif">et reçus</text>
    <text x="718" y="238" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Documente les étapes</text>
    <rect x="92" y="342" width="736" height="66" rx="16" fill="#0b100f" stroke="#52645e" />
    <text x="136" y="381" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Aucun de ces mécanismes ne démontre que le contenu dit vrai.</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 340 790" role="img" aria-labelledby="document-four-questions-mobile-title document-four-questions-mobile-desc">
    <title id="document-four-questions-mobile-title">Quatre questions distinctes pour qualifier un document numérique</title>
    <desc id="document-four-questions-mobile-desc">Quatre cartes verticales associent l’intégrité à une empreinte, l’origine à une signature ou un cachet, le temps à un horodatage et le parcours à un journal de conservation. Une mention finale rappelle qu’aucun de ces mécanismes ne démontre que le contenu est vrai.</desc>
    <rect x="20" y="20" width="300" height="140" rx="17" fill="#121816" stroke="#81dacb" />
    <rect x="20" y="178" width="300" height="140" rx="17" fill="#121816" stroke="#aa9cc4" />
    <rect x="20" y="336" width="300" height="140" rx="17" fill="#121816" stroke="#c5a66f" />
    <rect x="20" y="494" width="300" height="140" rx="17" fill="#121816" stroke="#80c89a" />
    <text x="42" y="52" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">INTÉGRITÉ</text>
    <text x="42" y="83" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Même fichier ?</text>
    <text x="42" y="116" fill="#81dacb" font-size="16" font-family="system-ui, sans-serif">Empreinte · compare les octets</text>
    <text x="42" y="210" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">ORIGINE</text>
    <text x="42" y="241" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Qui l’a émis ?</text>
    <text x="42" y="274" fill="#aa9cc4" font-size="16" font-family="system-ui, sans-serif">Signature ou cachet</text>
    <text x="42" y="368" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">TEMPS</text>
    <text x="42" y="399" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Existait quand ?</text>
    <text x="42" y="432" fill="#c5a66f" font-size="16" font-family="system-ui, sans-serif">Horodatage · date et heure</text>
    <text x="42" y="526" fill="#80c89a" font-size="12" font-family="ui-monospace, monospace">PARCOURS</text>
    <text x="42" y="557" fill="#f1f4f0" font-size="18" font-family="system-ui, sans-serif">Qui l’a manipulé ?</text>
    <text x="42" y="590" fill="#80c89a" font-size="16" font-family="system-ui, sans-serif">Journal et reçus</text>
    <rect x="20" y="676" width="300" height="88" rx="16" fill="#0b100f" stroke="#52645e" />
    <text x="42" y="711" fill="#f1f4f0" font-size="14" font-family="system-ui, sans-serif">Aucun mécanisme ne démontre</text>
    <text x="42" y="737" fill="#f1f4f0" font-size="14" font-family="system-ui, sans-serif">que le contenu dit vrai.</text>
  </svg>
  <figcaption>Synthèse BLACKPROOF d’après le Code civil, eIDAS, l’ANSSI et le NIST. Le schéma décrit la portée des mécanismes, pas l’issue d’un litige.</figcaption>
</figure>

Cette séparation évite une erreur fréquente : demander à une seule empreinte de répondre aux quatre questions.

## Une empreinte compare deux états du même fichier

Une fonction de hachage transforme les octets d’un fichier en une valeur de taille fixe appelée empreinte ou condensat. Le [standard FIPS 180-4 du NIST](https://csrc.nist.gov/pubs/fips/180-4/upd1/final) décrit les fonctions de la famille SHA-2, dont SHA-256, et précise que les condensats servent à détecter si un message a changé depuis leur génération.

Le principe est simple :

1. calculer l’empreinte du fichier considéré comme référence ;
2. conserver cette empreinte ;
3. recalculer l’empreinte du fichier reçu ou archivé ;
4. comparer les deux valeurs.

Si les valeurs diffèrent, les octets comparés ne sont pas identiques. Si elles correspondent avec un algorithme cryptographique adapté et une mise en œuvre correcte, la comparaison apporte une très forte assurance que les deux fichiers sont identiques au niveau binaire. Cette assurance n’est pas une égalité mathématique absolue : les fonctions de hachage ont un risque théorique de collision, c’est-à-dire que deux contenus différents produisent la même empreinte. Le choix de l’algorithme sert notamment à maintenir ce risque à un niveau négligeable pour l’usage considéré.

La [Bibliothèque nationale de France](https://www.bnf.fr/fr/integrite-des-donnees-numeriques) présente l’intégrité comme la génération d’une empreinte, son enregistrement comme point de comparaison, puis son contrôle régulier. Elle indique aussi que des fichiers exactement identiques peuvent être détectés même si leurs noms diffèrent. Renommer un fichier ne modifie donc pas nécessairement l’empreinte calculée sur son contenu.

### La référence compte autant que l’algorithme

Une empreinte imprimée dans le même dossier que le fichier, puis modifiable par la même personne, est une référence faible. Il serait possible de changer le document, de recalculer son empreinte et de remplacer les deux.

Le [NIST IR 8387](https://doi.org/10.6028/NIST.IR.8387) recommande, dans le contexte de la conservation de preuves numériques, de calculer l’empreinte au plus près de la collecte et de la stocker séparément, dans un emplacement protégé contre l’écrasement. Cette recommandation révèle la limite fondamentale du hash : **il contrôle une correspondance, mais ne crée pas seul une référence digne de confiance**.

Prenons un exemple. Une entreprise envoie le fichier `rapport.pdf` et publie son empreinte SHA-256 dans un reçu conservé par le destinataire. Six mois plus tard :

- si le fichier disponible produit la même empreinte, il correspond au fichier visé par ce reçu ;
- si l’empreinte diffère, le fichier n’est pas identique ;
- dans les deux cas, l’empreinte ne dit pas qui a rédigé le rapport, si ses affirmations sont exactes ou si la personne qui l’a envoyé était autorisée à le faire.

## La date du fichier n’est pas un horodatage indépendant

Le système d’exploitation affiche souvent une date de création et une date de modification. Ces informations sont utiles pour comprendre un fichier, mais elles ne constituent pas à elles seules une preuve temporelle indépendante.

Le [NIST SP 800-86](https://csrc.nist.gov/pubs/sp/800/86/final) relève plusieurs limites : la date de création peut changer lors d’une copie, certains outils modifient les dates, l’horloge de l’ordinateur peut être incorrecte et un attaquant peut altérer les temps enregistrés. Une date inscrite dans le nom du fichier ou dans son contenu présente une limite encore plus évidente : elle peut être saisie comme n’importe quel autre texte.

Un horodatage électronique répond à une autre logique. Le règlement [eIDAS](https://eur-lex.europa.eu/legal-content/FR/ALL/?uri=CELEX%3A02014R0910-20241018) le définit comme des données électroniques associant d’autres données à un instant particulier et établissant qu’elles existaient à cet instant.

Deux nuances sont essentielles :

- l’horodatage établit une existence au plus tard à l’instant indiqué, pas nécessairement la première date de création du document ;
- il porte sur les données auxquelles il est lié, souvent leur empreinte, pas sur la véracité des phrases ou des chiffres contenus dans le fichier.

L’article 41 d’eIDAS prévoit qu’un horodatage électronique ne peut être privé d’effet juridique ou refusé comme preuve au seul motif qu’il est électronique ou non qualifié. Il réserve toutefois une présomption particulière à l’horodatage électronique qualifié : exactitude de la date et de l’heure indiquées, ainsi qu’intégrité des données associées.

Le statut « qualifié » ne relève pas d’une simple mention commerciale. La [Commission européenne](https://digital-strategy.ec.europa.eu/en/policies/eu-trusted-lists) précise qu’un prestataire et le service concerné ne sont qualifiés que s’ils figurent dans une liste de confiance nationale publiée dans le cadre eIDAS.

Le fonctionnement peut rester simple pour l’utilisateur. [Démarche Numérique](https://doc.demarche.numerique.gouv.fr/pour-aller-plus-loin/horodatage) décrit publiquement son propre mécanisme : l’empreinte d’un ensemble d’opérations est transmise à un service d’horodatage qualifié, qui retourne un jeton. La vérification ultérieure consiste à recalculer l’empreinte puis à contrôler le jeton associé.

## Signature d’une personne et cachet d’une organisation

L’intégrité ne suffit pas toujours. Un contrat appelle généralement une identification du signataire. Une facture ou un rapport automatisé peut plutôt nécessiter d’être rattaché à une organisation.

En droit français, l’[article 1366 du Code civil](https://www.legifrance.gouv.fr/codes/id/LEGISCTA000032037827) accorde à l’écrit électronique la même force probante qu’à l’écrit sur papier, sous réserve que la personne dont il émane puisse être dûment identifiée et qu’il soit établi et conservé dans des conditions garantissant son intégrité. L’article 1367 définit la signature électronique par l’usage d’un procédé fiable d’identification garantissant son lien avec l’acte.

Le règlement eIDAS distingue ensuite deux objets :

- la **signature électronique** est attachée à une personne physique ;
- le **cachet électronique** rattache des données à une personne morale.

L’article 25 d’eIDAS prévoit que la signature électronique qualifiée a un effet juridique équivalent à une signature manuscrite. L’article 35 accorde au cachet électronique qualifié une présomption d’intégrité des données et d’exactitude de leur origine. Les versions avancées doivent être liées à leur créateur et aux données de telle sorte qu’une modification ultérieure soit détectable.

L’[ANSSI](https://www.ssi.gouv.fr/uploads/2021/12/anssi-eidas-guide-niveau-signature.pdf) insiste sur le choix d’un niveau de signature ou de cachet adapté aux risques et aux contraintes réglementaires. Tous les procédés portant l’étiquette « signature électronique » ne fournissent donc pas le même niveau d’identification, de contrôle de la clé ou d’effet juridique.

Une signature valide ne transforme pas le contenu en vérité. Elle relie un signataire à un document selon les garanties du procédé. Elle ne démontre pas, à elle seule, que les déclarations sont exactes, que le signataire disposait d’un mandat suffisant ou que le contrat est valide sur tous ses autres aspects.

## Le dossier minimal autour du document

La bonne unité de conservation n’est souvent pas le fichier seul, mais un petit dossier réunissant le fichier et les éléments nécessaires à sa vérification.

<figure class="analysis-figure">
  <svg class="analysis-figure-desktop" viewBox="0 0 920 535" role="img" aria-labelledby="minimum-proof-folder-title minimum-proof-folder-desc">
    <title id="minimum-proof-folder-title">Les six éléments d’un dossier minimal de vérification</title>
    <desc id="minimum-proof-folder-desc">Six cartes présentent le fichier exact, son empreinte SHA-256, une référence protégée, une preuve d’origine ou de date selon le besoin, le journal des transferts et un résultat de vérification lisible.</desc>
    <rect x="40" y="45" width="250" height="150" rx="18" fill="#121816" stroke="#81dacb" />
    <rect x="335" y="45" width="250" height="150" rx="18" fill="#121816" stroke="#81dacb" />
    <rect x="630" y="45" width="250" height="150" rx="18" fill="#121816" stroke="#aa9cc4" />
    <rect x="40" y="235" width="250" height="150" rx="18" fill="#121816" stroke="#c5a66f" />
    <rect x="335" y="235" width="250" height="150" rx="18" fill="#121816" stroke="#80c89a" />
    <rect x="630" y="235" width="250" height="150" rx="18" fill="#121816" stroke="#52645e" />
    <text x="64" y="80" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">01 · CONTENU</text>
    <text x="64" y="118" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">Fichier exact</text>
    <text x="64" y="151" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Format d’origine et copie</text>
    <text x="64" y="174" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">de travail séparée</text>
    <text x="359" y="80" fill="#81dacb" font-size="13" font-family="ui-monospace, monospace">02 · INTÉGRITÉ</text>
    <text x="359" y="118" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">Empreinte SHA-256</text>
    <text x="359" y="151" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Algorithme, valeur et</text>
    <text x="359" y="174" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">périmètre calculé</text>
    <text x="654" y="80" fill="#aa9cc4" font-size="13" font-family="ui-monospace, monospace">03 · RÉFÉRENCE</text>
    <text x="654" y="118" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">Copie protégée</text>
    <text x="654" y="151" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Empreinte conservée</text>
    <text x="654" y="174" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">séparément</text>
    <text x="64" y="270" fill="#c5a66f" font-size="13" font-family="ui-monospace, monospace">04 · BESOIN</text>
    <text x="64" y="308" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">Origine ou date</text>
    <text x="64" y="341" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Signature, cachet ou</text>
    <text x="64" y="364" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">jeton d’horodatage</text>
    <text x="359" y="270" fill="#80c89a" font-size="13" font-family="ui-monospace, monospace">05 · PARCOURS</text>
    <text x="359" y="308" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">Journal des transferts</text>
    <text x="359" y="341" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Source, acteurs, dates</text>
    <text x="359" y="364" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">et opérations</text>
    <text x="654" y="270" fill="#a3ada6" font-size="13" font-family="ui-monospace, monospace">06 · CONTRÔLE</text>
    <text x="654" y="308" fill="#f1f4f0" font-size="19" font-family="system-ui, sans-serif">Résultat lisible</text>
    <text x="654" y="341" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">Date, outil, entrées</text>
    <text x="654" y="364" fill="#a3ada6" font-size="14" font-family="system-ui, sans-serif">et conclusion limitée</text>
    <rect x="112" y="432" width="696" height="66" rx="16" fill="#0b100f" stroke="#52645e" />
    <text x="149" y="471" fill="#f1f4f0" font-size="16" font-family="system-ui, sans-serif">Ajouter uniquement les mécanismes nécessaires à l’affirmation recherchée.</text>
  </svg>
  <svg class="analysis-figure-mobile" viewBox="0 0 340 970" role="img" aria-labelledby="minimum-proof-folder-mobile-title minimum-proof-folder-mobile-desc">
    <title id="minimum-proof-folder-mobile-title">Les six éléments d’un dossier minimal de vérification</title>
    <desc id="minimum-proof-folder-mobile-desc">Six cartes verticales présentent le fichier exact, son empreinte SHA-256, une référence protégée, une preuve d’origine ou de date selon le besoin, le journal des transferts et un résultat de vérification lisible.</desc>
    <rect x="20" y="20" width="300" height="120" rx="16" fill="#121816" stroke="#81dacb" />
    <rect x="20" y="155" width="300" height="120" rx="16" fill="#121816" stroke="#81dacb" />
    <rect x="20" y="290" width="300" height="120" rx="16" fill="#121816" stroke="#aa9cc4" />
    <rect x="20" y="425" width="300" height="120" rx="16" fill="#121816" stroke="#c5a66f" />
    <rect x="20" y="560" width="300" height="120" rx="16" fill="#121816" stroke="#80c89a" />
    <rect x="20" y="695" width="300" height="120" rx="16" fill="#121816" stroke="#52645e" />
    <text x="42" y="50" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">01 · CONTENU</text>
    <text x="42" y="82" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Fichier exact et copie séparée</text>
    <text x="42" y="185" fill="#81dacb" font-size="12" font-family="ui-monospace, monospace">02 · INTÉGRITÉ</text>
    <text x="42" y="217" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Empreinte SHA-256</text>
    <text x="42" y="320" fill="#aa9cc4" font-size="12" font-family="ui-monospace, monospace">03 · RÉFÉRENCE</text>
    <text x="42" y="352" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Empreinte conservée ailleurs</text>
    <text x="42" y="455" fill="#c5a66f" font-size="12" font-family="ui-monospace, monospace">04 · BESOIN</text>
    <text x="42" y="487" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Origine ou date si nécessaire</text>
    <text x="42" y="590" fill="#80c89a" font-size="12" font-family="ui-monospace, monospace">05 · PARCOURS</text>
    <text x="42" y="622" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Journal des transferts</text>
    <text x="42" y="725" fill="#a3ada6" font-size="12" font-family="ui-monospace, monospace">06 · CONTRÔLE</text>
    <text x="42" y="757" fill="#f1f4f0" font-size="17" font-family="system-ui, sans-serif">Résultat de vérification lisible</text>
    <rect x="20" y="854" width="300" height="90" rx="16" fill="#0b100f" stroke="#52645e" />
    <text x="39" y="888" fill="#f1f4f0" font-size="13" font-family="system-ui, sans-serif">Ajouter les mécanismes nécessaires</text>
    <text x="39" y="913" fill="#f1f4f0" font-size="13" font-family="system-ui, sans-serif">à l’affirmation recherchée.</text>
  </svg>
  <figcaption>Méthode BLACKPROOF fondée sur la séparation entre contenu, intégrité, origine, temps et conservation.</figcaption>
</figure>

Le dossier peut rester très court. Pour un document commercial ordinaire, il peut contenir le fichier, son empreinte, le reçu d’envoi et une note indiquant qui a réalisé le contrôle. Pour un acte engageant fortement les parties, le niveau de signature, l’horodatage, les certificats et le rapport de validation peuvent devenir déterminants.

Le [NIST IR 8387](https://doi.org/10.6028/NIST.IR.8387) recommande aussi de documenter la source du fichier, sa création ou son transfert, puis de suivre sa chaîne de conservation. Cette documentation permet d’expliquer à quel moment l’empreinte a été calculée et qui pouvait encore modifier la référence.

## Cinq cas concrets

### Contrat signé

Le hash permet de retrouver la version exacte. La signature sert à relier l’acte au signataire. Un horodatage peut établir l’existence de la signature ou du document à une date donnée. Il faut conserver les éléments nécessaires à la validation, pas seulement l’image visible d’une signature placée dans le PDF.

### Facture ou rapport émis par une entreprise

Une empreinte contrôle la version. Un cachet électronique peut rattacher les données à une personne morale. Un simple logo ou un nom saisi dans le document ne fournit pas le même mécanisme d’identification.

### Photographie ou vidéo

Calculer rapidement l’empreinte du fichier reçu puis conserver l’original et la référence séparément permet de détecter une modification ultérieure. Cela ne démontre pas automatiquement le lieu, la date de capture, l’identité du photographe ou la fidélité de la scène représentée. Ces éléments réclament une provenance et des vérifications supplémentaires.

### Scan d’un document papier

L’empreinte peut établir que le fichier scanné n’a pas changé depuis la création de la référence. Elle ne prouve pas que le papier scanné était authentique, complet ou signé par la personne indiquée. Le fichier et l’original physique répondent à des questions différentes.

### Capture d’écran

L’empreinte peut protéger le fichier image après sa collecte. La capture ne contient toutefois pas nécessairement l’adresse complète, les en-têtes, les données invisibles, l’historique ou le contexte qui permettraient d’expliquer ce qui a été affiché. Pour un incident ou une enquête, il faut conserver les autres sources disponibles et documenter la collecte. L’analyse BLACKPROOF sur les [fuites de données](/analyses/fuite-de-donnees-etablir-avant-de-conclure) applique cette même discipline : la conclusion ne doit pas dépasser les éléments observables.

## Checklist avant d’envoyer ou d’archiver

- [ ] Identifier le fichier exact, son format et sa version.
- [ ] Conserver l’original sans le rouvrir ni le réenregistrer inutilement.
- [ ] Calculer une empreinte avec un algorithme adapté, par exemple SHA-256.
- [ ] Noter l’algorithme, la valeur, la date du calcul et son auteur.
- [ ] Conserver l’empreinte séparément du fichier ou dans un registre protégé.
- [ ] Ajouter une signature ou un cachet si l’origine doit être établie.
- [ ] Ajouter un horodatage si l’existence à une date précise est déterminante.
- [ ] Conserver les certificats, jetons, reçus et rapports nécessaires à la validation.
- [ ] Documenter chaque transfert important et toute transformation de format.
- [ ] Recalculer l’empreinte à la réception et lors des contrôles d’archive.
- [ ] Écrire séparément ce qui est prouvé, ce qui est seulement déclaré et ce qui reste inconnu.

La [méthode BLACKPROOF](/method) suit ce dernier principe. Le [ProofPack](/proofpack) contient une empreinte recalculable et la page [Vérifier](/verify) contrôle localement les formats et empreintes des dossiers BLACKPROOF. Ce contrôle ne prétend ni authentifier les documents sources ni valider la vérité des déclarations. Un [dossier de démonstration](/proofpack-example) permet d’observer cette limite concrètement.

## Questions fréquentes

### Un hash prouve-t-il la date d’un document ?

Non. Il décrit le contenu fourni au calcul. Pour relier ce contenu à une date indépendante, il faut un mécanisme supplémentaire, par exemple un horodatage électronique ou un reçu conservé par un tiers.

### Deux fichiers ayant la même apparence ont-ils la même empreinte ?

Pas nécessairement. Des métadonnées, une compression différente, une police incorporée ou une structure interne modifiée peuvent changer les octets sans produire de différence visible immédiate. L’empreinte compare les fichiers binaires, pas leur ressemblance visuelle.

### Changer le nom du fichier change-t-il son empreinte ?

Pas si l’empreinte est calculée uniquement sur le contenu et que le renommage ne modifie pas ce contenu. En revanche, une empreinte calculée sur une archive ou un manifeste peut inclure le nom et produire un résultat différent.

### Une image de signature dans un PDF suffit-elle ?

Elle montre une représentation graphique. Elle ne fournit pas, à elle seule, le procédé fiable d’identification et le lien avec l’acte décrits par l’article 1367 du Code civil. Il faut examiner le mécanisme de signature et son résultat de validation.

### La blockchain est-elle obligatoire ?

Non. Le droit européen de l’horodatage qualifié repose sur des prestataires de confiance et des listes officielles, pas sur l’obligation d’utiliser une blockchain. Le NIST IR 8387 reconnaît que la blockchain peut stocker des empreintes, tout en estimant que sa complexité est trop importante pour être justifiée dans la plupart des unités de conservation de preuves étudiées.

### Une empreinte valide prouve-t-elle que le document est vrai ?

Non. Elle permet de vérifier une correspondance avec une référence. Un faux document peut être parfaitement intègre, signé et horodaté. La véracité de son contenu, la qualité de sa source et la légitimité de son usage doivent être évaluées séparément.

## Limites de cette méthode

Cette analyse expose la fonction technique et le cadre juridique général des principaux mécanismes. Elle ne détermine pas la recevabilité ou la force d’un document dans un litige particulier. Le droit applicable, la nature de l’acte, le procédé utilisé, l’identité des parties et la qualité de la conservation peuvent modifier l’analyse.

Une preuve numérique robuste ne repose donc pas sur un mot magique. Elle résulte d’une affirmation précise, d’un mécanisme proportionné et d’un dossier permettant à une autre personne de refaire le contrôle.

Pour une conservation sur plusieurs années, la question ne s’arrête pas au jour de la création. Les formats, certificats, algorithmes et moyens de validation évoluent. L’analyse sur les [preuves numériques vérifiables à dix ans](/analyses/preuves-numeriques-cryptographie-post-quantique-verification-dix-ans) détaille cette dimension de long terme.
