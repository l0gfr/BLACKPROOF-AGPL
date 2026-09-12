# Deploying the static AGPL application

## Build and self-host

Use the versions in `.nvmrc` and `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm verify:all
pnpm csp:render-apache-conf
```

Serve only `apps/web/dist/` over HTTPS. Do not expose the repository root,
build artifacts, source maps, private material or server backups. The generated
Apache configuration is `artifacts/blackproof.fr.conf`. Adapt its hostname,
document root, TLS certificate and optional authenticated statistics section
for your own host. Keep `connect-src 'none'`, `form-action 'none'`, no inline
script execution, the static API method restrictions and the sensitive-file
denial rules.

Set `PUBLIC_BLACKPROOF_SOURCE_URL` to the publicly downloadable corresponding
source of your modified version when building a fork. The default source URL
points to the exact `PUBLIC_BLACKPROOF_RELEASE_COMMIT` in the project repository.
The page `/open-source` and footer must link to source and `/LICENSE.txt`.

Browser storage is scoped to an origin. Changing hosts does not migrate users'
dossiers: users must export encrypted backups and restore them locally.

## Official production artifact

Production uses only the exact bundle from the GitHub production artifact
workflow. The full gate validates source, tests, build, secret scan and browser
scenarios against the same final bytes before packaging. Do not rebuild locally
and describe the result as the CI artifact.

Verify the downloaded ZIP digest, manifest self-digest, `gitCommit`, clean
worktree marker, release inventory and per-file checksums before transfer.
Extract under a new, owner-only release directory. Transfer only the verified
bundle, never a working tree, environment file or protected database.

## Existing-host migration

The retired dynamic backend is removed from the repository. The one-time
transition on an existing host is a separate privileged operation:

1. Snapshot the current dedicated BLACKPROOF virtual host and protected server
   data into an owner-only backup outside the web root. Stop the retired service
   and its timers before copying its database, and check the copy.
2. Keep existing dossiers, protected configuration, keys and backups on the
   server; never publish or delete them as part of the source release.
3. Install the reviewed `activate-static-release.sh`, snapshot helper,
   directory verifier, smoke test and promoter into the root-owned
   `/opt/blackproof-release/` directory. Bootstrap those trusted files from the
   exact checksum-verified artifact under operator control.
4. Run `activate-static-release.sh CANDIDATE_ROOT COMMIT MANIFEST_SHA256` as root.
   It snapshots manifested components, backs up the dedicated configuration,
   retires the dynamic units, installs and checks the static Apache vhost, then
   writes a short-lived receipt bound to this exact artifact. It preserves a
   rollback copy; a failed activation restores the previous configuration and
   unit states.
5. As the ordinary deploy user, prepare
   `/var/www/html/blackproof-candidate-COMMIT` from the verified static artifact
   and the manifest under
   `/var/www/html/blackproof-promotion-COMMIT/artifact-manifest.json`.
   Run the root-owned `promote-static-release.sh` with those two paths, the
   commit, the manifest digest and `open-source`.
6. Promotion checks the receipt and artifact, atomically exchanges the static
   directories, re-verifies every byte and runs the public smoke. On failure,
   it atomically restores the previous static directory. The privileged
   configuration backup is restored separately by the operator if rolling back
   across the architecture transition.

The dedicated target is `/var/www/html/blackproof`. Never deploy into the shared
`/var/www/html` root.

## Live evidence

Require the exact public `releaseCommit`, `accessModel: open-source`,
`accessRequirement: none`, the AGPL licence, publicly accessible matching source,
the full HTTPS smoke, and a hydrated import/editor/verifier. The retired
`/api/license/` namespace must return HTTP 410, including its former status
lookup; no missing or historic record may be presented as active.

Private GoAccess statistics remain authenticated with their separate CSP and
existing log-retention boundary. Their credentials and generated reports are
never part of the public artifact.
