# Release operations

Before promotion, require the full quality gate for the exact commit, a clean
dependency audit, the secret scan and the local-only browser scenarios.

Build production through the GitHub production artifact workflow. Verify the
bundle digest, manifest self-digest, exact commit and each public file.
Use the reviewed atomic deployment procedure in `DEPLOY_APACHE.md`.

After promotion, verify the served `releaseCommit`, source-code link, AGPL text,
local application hydration, CSP, static-only API and private statistics barrier.
Import and export must continue to work without a network connection after
the page is loaded.

For incidents involving local storage, ask only for a description and synthetic
reproduction. Do not request real questionnaires, dossier files, passphrases,
browser profiles or private signing keys. Users restore their own encrypted
backups locally.

Retain the prior static release for rollback. Historical protected server data
is not source code and must never enter an artifact or public repository.
