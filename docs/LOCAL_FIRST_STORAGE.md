# BLACKPROOF Local-First Storage

Version: blackproof-local-db-v0.8.0-alpha

## Limites des sauvegardes locales

La sauvegarde et la restauration partagent les mêmes budgets navigateur :

- 252 fichiers au maximum en V2, inventaire authentifié inclus quand la sauvegarde est chiffrée ;
- 4,5 Mo encodés au maximum par entrée ;
- 40 Mo de contenu clair cumulé ;
- 50 Mo de contenu stocké et 50 Mo de ZIP ;
- manifeste limité à 256 Ko.

La restauration ouvre la table centrale sans contrôle CRC eager de JSZip, valide
l’inventaire, puis décompresse chaque entrée par flux avec rejet dès que le flux
applicatif constate un dépassement. Les buffers internes de JSZip peuvent cependant
dépasser ponctuellement le seuil : 4,5 Mo est une limite d'acceptation par entrée,
pas une borne absolue de mémoire. La taille réelle et le CRC sont contrôlés pendant
cette extraction.
Le préflight refuse aussi les data descriptors, les divergences entre en-têtes locaux
et centraux, les offsets dupliqués et tout chevauchement entre plages locales. Le
format V2 canonique refuse également les préfixes et espaces inutilisés, les
commentaires, les champs extra, les flags non autorisés et toute compression autre
que STORE ou DEFLATE.
Le manifeste V2 suit `apps/web/src/schemas/local-backup-manifest-v2.schema.json`.

Dans toute sauvegarde complète, le contenu métier et l’inventaire sont chiffrés
mais le manifeste technique reste visible. Une sauvegarde peut être partielle lorsque des snapshots
attendus sont déjà absents du navigateur ; l’interface affiche alors le bilan
inclus/attendu avant le téléchargement.

BLACKPROOF stores local cases in the browser using IndexedDB through Dexie.
Every newly created or imported case requires a passphrase and is stored as an
AES-GCM encrypted envelope. Restore also requires a destination passphrase and
rewrites restored content into an encrypted envelope, including a legacy clear
backup. There is no user path for creating or restoring a new clear-text case.

Historical clear-text IndexedDB records are listed only as redacted technical
cards. The list does not expose their title, parties, metrics or fingerprint. The
editor requires a new confirmed passphrase and atomically rewrites the exact
legacy case and snapshots as encrypted envelopes before returning any decrypted
payload to the page.

The inventory can expose one optional user-chosen `localLabel` of at most 80
characters. The interface marks it as non-sensitive and visible before unlock;
it is never populated automatically from the encrypted title, company, client or
source filename. Users can add, change or remove it without opening the encrypted
payload. The opaque identifier remains available only as a collapsed technical
detail.

The passphrase is never persisted. Losing it makes the encrypted dossier
unrecoverable. BLACKPROOF has no server-side document copy or recovery key.

An unlocked case or Knowledge Vault locks after 15 minutes without keyboard or
pointer activity, or after the page remains in the background for one minute.
Manual lock actions are also available. Locking drops the decrypted working
state, passphrases, previews and private signing material held by the page;
unsaved changes are intentionally abandoned and a passphrase is required again.

On `/app/cases`, BLACKPROOF reads `navigator.storage.persisted()` and offers a
gesture-bound `navigator.storage.persist()` request when supported. A persistent
grant reduces automatic eviction risk but does not survive manual profile deletion.
An encrypted backup kept off-device remains mandatory operational protection.

After a successful unlock, any supported envelope below 600,000 PBKDF2 iterations
is decrypted, re-encrypted at 600,000 and re-read before the old ciphertext is
replaced in the same IndexedDB transaction. The dossier and its encrypted Delivery
snapshots migrate together with revision, storage-epoch and concurrent-writer checks.
The separate Knowledge Vault follows the same verified upgrade rule.

## Purpose

Local storage turns BLACKPROOF from a one-shot generator into a local-first application.

A user can:

- create a ProofPack;
- save it locally;
- reload the browser;
- list local cases;
- export proofpack.json again;
- delete local cases.

## Security model

No document upload.

The browser may store sensitive questionnaire text and evidence metadata locally,
inside encrypted dossier and Delivery-snapshot payloads.

BLACKPROOF must not silently sync these records to a server.

Encryption does not hide every local technical trace. IndexedDB still exposes an
opaque case identifier, envelope/version flags and creation/update timestamps. A
local attacker controlling the browser profile, extension, operating system or a
currently unlocked page remains outside the protection promised by encryption at
rest. Exported/downloaded artifacts are outside IndexedDB and must be protected by
the user and operating system. Auto-lock reduces exposure on an unattended page;
it does not protect a page from code or an extension already running with access
during the unlocked interval.

## Stored data

A decrypted local case payload contains:

- case id;
- case title;
- optional company/client names;
- raw questionnaire text;
- proofpack fingerprint;
- summary metrics;
- generated ProofPack JSON object;
- timestamps.

## Not stored in V0.1

BLACKPROOF does not store evidence binaries.

Users should not store raw secrets, passwords, private keys, tokens or unredacted logs in BLACKPROOF.

## Limits

The local storage layer enforces the same input bounds as the engine:

- questionnaire size limit;
- ProofPack JSON size limit.

## Deletion

Deleting a case removes it from local IndexedDB.

It does not delete exported files already downloaded by the user.


## Reopening a case

Local cases can be reopened from:

    /app/cases

The editor route is:

    /app/case?id=<case_id>

This route is client-side because BLACKPROOF is statically built and local case IDs exist only in IndexedDB.
Creation and questionnaire import switch to this editor inside the same hydrated
Svelte shell and pass the phrase only through component memory. The first editor
open therefore does not request it again. A reload or later navigation creates a
new page context and requires the phrase normally.

The local editor can:

- reload the saved ProofPack;
- show questionnaire source text;
- change evidence statuses;
- recalculate ProofDebt;
- regenerate the SHA-256 fingerprint;
- save the updated case locally;
- export updated ProofPack files.

Avant chaque export Master ou sauvegarde locale complète, l’éditeur vérifie deux fois
que sa révision est toujours celle stockée dans IndexedDB : avant la construction de
l’artefact, puis immédiatement avant le téléchargement. Un onglet obsolète doit être
rechargé et ne peut pas produire silencieusement un ancien Master.

La restauration mémorise la révision éventuellement présente dès que l’identité de la
sauvegarde est connue, puis compare cette observation dans la transaction finale. Une
modification concurrente annule donc la restauration au lieu d’être écrasée.

Le Master et le snapshot créés lors d’un export Delivery sont écrits dans une même
transaction IndexedDB, après contrôle de l’époque et de la révision.

Depuis la version locale 0.6, les snapshots utilisent la clé primaire composée
`[caseId+deliveryId]` et l’AAD `snapshot:<caseId>:<deliveryId>`. Deux dossiers ne
peuvent donc plus s’écraser mutuellement lors d’une restauration, même si une
sauvegarde non fiable réutilise un `deliveryId`. La lecture reste compatible avec
l’ancien AAD afin de permettre la migration des snapshots déjà chiffrés.

La suppression isolée d’un snapshot vérifie dans une transaction unique l’époque,
la révision du Master, l’existence du reçu, son `snapshotSha256` et le `caseId` du
snapshot. Le nettoyage des orphelins lit les dossiers et snapshots puis supprime
dans cette même transaction, afin de se sérialiser avec les écritures Master/snapshot.


## Panic Wipe

`/app/cases` provides a Panic Wipe action.

The wipe advances a persistent storage epoch in the same IndexedDB transaction
that clears cases, Delivery snapshots and locally persisted product/legacy
account credentials. It then clears the separate local knowledge vault. Every
already-loaded case writer keeps the epoch it opened with and must match the
current epoch in its write transaction. `BroadcastChannel` notifications tell
open creation, import, verification, editor and knowledge views to clear
sensitive in-memory state and lock immediately. Consequently, a view opened
before the wipe cannot recreate deleted local storage; it must be reloaded first.

It deletes BLACKPROOF-managed IndexedDB content for the current browser profile.

The user must type:

    EFFACER

Panic Wipe is not a remote wipe and cannot guarantee erasure outside BLACKPROOF's
storage boundary. It does not delete exported ZIP, JSON, CSV or Markdown files,
clipboard history, browser/OS backups, screenshots, printouts, proxy logs or data
already copied by another process. The interface must state these limits before
confirmation.

## Open-source migration

Schema v12 drops only the obsolete `entitlements` object store and removes
`accountLogoutPending` and `checkoutAttemptV1` from metadata. The dossier,
snapshot and storage-epoch records retain their values. Tests seed a native
IndexedDB v110 database, migrate it through the real application and compare
those records byte for byte before decrypting the original dossier.
