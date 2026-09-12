# Contributing to BLACKPROOF

Contributions are welcome under AGPL-3.0-only, the same licence as the project.
By submitting a contribution, you confirm that you have the right to contribute
it under that licence. Copyright remains with the respective authors.

Discuss substantial changes in an issue first. Keep patches focused and include
tests for changes to encryption, imports, verification or data migrations.

Use the Node.js version in `.nvmrc` and the pnpm version in `package.json`:

```sh
pnpm install --frozen-lockfile
pnpm verify:all
```

Follow `SECURITY.md` for vulnerability reports. Never submit real questionnaires,
private keys, credentials or sensitive evidence. Use synthetic fixtures.
