# BLACKPROOF web application

Static Astro application containing the public site and the browser-only local-first
workspace. Svelte components provide questionnaire import, case editing, IndexedDB
storage, Master and Delivery exports, local backup/restore and ProofPack verification.

Run commands from the repository root:

```sh
pnpm dev
pnpm --filter @blackproof/web check
pnpm --filter @blackproof/web test
pnpm build
```

Important locations:

- `src/components/app` — local case creation, list and editor;
- `src/lib/local-db.ts` — IndexedDB schema and transactional concurrency controls;
- `src/lib/local-backup.ts` — bounded backup generation and restore validation;
- `src/lib/zip-preflight.ts` — strict ZIP structural preflight;
- `src/pages` — static human and machine-readable routes;
- `src/schemas` — canonical browser-facing schemas;
- `../../tests/e2e` — Playwright coverage for critical browser workflows.

The production output is `apps/web/dist/`. Deployment must target only the dedicated
Apache subtree `/var/www/html/blackproof`, never the shared `/var/www/html` root.
