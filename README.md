# BLACKPROOF

BLACKPROOF is a free, open-source, local-first cyber evidence app under AGPL-3.0-only.
Create, import, encrypt, export and verify dossiers directly in your browser.
No account, activation key or application server is required.
Use it to prepare cyber reviews, internal audits and supplier questionnaires.
Bring your own review checklist, document answers, evidence references and
reservations, then track the remaining preparation work. Source documents and
audit conclusions still require human assessment; this is not a system scanner
or an automated certification service.

Core flow:

questionnaire ou grille d'audit → réponses et références → preuves attendues → points à corriger → dossier interne → export relu facultatif.

## Project structure

- `apps/web` — public website and local-first app
- `apps/web/src/content/analyses` (sourced Markdown analyses and publication drafts)
- `packages/core` — ProofGraph, ProofDebt, ProofPack logic
- `packages/verifier` — standalone Delivery verifier CLI/SDK
- `tests/e2e` — Chromium tests for the local-first editor and verification flows
- `scripts` — schema generation, security checks and deployment tooling
- `docs` — project context and technical documentation

## Development

Requirements: Node.js 22.23.2 (see `.nvmrc`) and pnpm 10.34.5.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The authoritative local gate is:

```sh
pnpm verify:all
```

`pnpm verify:all` runs schema drift checks, TypeScript/Astro/Svelte validation,
unit tests, the static build, CSP generation, local-only artifact checks, the dependency
and repository security audits, and the Chromium end-to-end tests.

## Local-first boundary

Questionnaires, ProofPacks and Delivery snapshots are processed on the user's device;
saved dossiers are encrypted in browser IndexedDB. No server upload is implemented
or permitted for import, creation, editing, backup or verification. Downloading an
export saves a local file; users transmit it separately, outside BLACKPROOF.
See `docs/LOCAL_FIRST_STORAGE.md` and `docs/SECURITY_MODEL.md` before changing a
storage, export or destructive operation.

## Editorial analyses

The `/analyses` section is generated from a validated Astro content collection.
Drafts are excluded from public routes, RSS and the sitemap. The complete authoring
and verification workflow is documented in `docs/EDITORIAL_ANALYSES.md`.

## Licence and contributions

The original software, documentation, schemas and standalone verifier are
licensed under GNU AGPL version 3 only. See `LICENSE` and `NOTICE`.
Third-party dependencies retain their own licences in `THIRD_PARTY_NOTICES.md`.
Contributions are welcome: see `CONTRIBUTING.md`. Project names and logos are
covered separately by `TRADEMARKS.md`.

Source: https://github.com/l0gfr/BLACKPROOF-AGPL

## Self-hosting

`pnpm build` produces the static site in `apps/web/dist/`. Serve it over HTTPS
(or localhost for development), with the CSP and security headers described in
`docs/DEPLOY_APACHE.md`. Publish the corresponding source of your version and
keep the licence/source link visible.

The application stores dossiers locally in browser IndexedDB. Back up encrypted
dossiers before changing hostname or browser profile: browser storage is scoped
to an origin and is not synchronized by the host.

The hosted public status registry is retired. Local verification and detached
signatures remain available. A historical or unavailable registry must never be
interpreted as proof that a Delivery is currently active.
