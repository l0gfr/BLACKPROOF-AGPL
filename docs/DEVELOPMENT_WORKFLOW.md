# BLACKPROOF - Development Workflow

## Security-first rule

BLACKPROOF is a high-security local-first cyber evidence product.

Every code change, especially in the core engine, must pass the full local quality gate before commit.

## Mandatory local gate

Run this before every commit:

    pnpm check
    pnpm test
    pnpm build
    pnpm audit
    pnpm audit --prod

## Non-negotiable rule

Do not commit engine code if pnpm check fails.

Tests and build are not enough.

A change is acceptable only when all of the following are green:

- TypeScript check
- security and unit tests
- static build
- full dependency audit, including development tooling
- separate production dependency audit

## Standard commit flow

    git status --short
    git add <reviewed-paths>
    git commit -m "Meaningful commit message"
    git push

## BLACKPROOF core principle

The engine must remain local-first, no-upload, strictly typed, bounded on inputs, safe on exports, verifiable by cryptographic fingerprint, and documented before expansion.

## Public repository boundary

The AGPL repository starts from reviewed source without the former private Git
history. Never push the old repository, its branches, stashes or tags here.
Keep credentials, private configuration, databases, backups and client documents
outside the public tree. Use synthetic test fixtures only.

Repository protection and secret push protection must be checked on GitHub;
their availability is not proof that they are enabled. The local pre-push hook
is an additional guardrail, not a substitute for required CI checks.

## Local pre-push hook

The local hook runs before every push:

    pnpm check
    pnpm test
    pnpm build
    pnpm audit
    pnpm audit --prod

The hook is configured with:

    git config core.hooksPath .githooks

Emergency bypass exists with:

    git push --no-verify

Using `--no-verify` must remain exceptional and should never be used for core engine changes.
