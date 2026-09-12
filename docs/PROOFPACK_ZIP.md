# BLACKPROOF ProofPack Master and Delivery ZIP

Version: blackproof-proofpack-zip-v0.2.0-alpha

The legacy complete ProofPack ZIP is the ProofPack Master: an internal-only working dossier generated locally by BLACKPROOF. It can contain drafts, remediation data, sensitive evidence metadata and non-exportable material.

The ProofPack Delivery ZIP is the only third-party transmission container. It is generated from an explicit whitelist after final confirmation and contains only:

- `delivery.json`;
- validated answers and authorised reservations;
- explicitly selected evidence references with minimal metadata;
- a README and integrity manifest.

It never contains drafts, automatic suggestions, `do-not-export` answers, `not-exportable` evidence, evidence paths or hashes, internal Master IDs, the Master fingerprint, the remediation plan, or the internal summary. Delivery v5 assigns fresh public identifiers to every transmission and declares its method, schema and verification limits. Historical V4 files remain verifiable.

For a Master derived by editing an XLSX import as text, `source-lineage.json`
preserves the original XLSX filename/profile/hash, the previous Master
fingerprint, and the derived text filename/hash. It replaces cell-level
`source-import.json`, which would be misleading after the text has changed.

## Master files

- proofpack.json
- reponse-fournisseur.md
- registre-preuves.csv
- plan-remediation.csv
- note-synthese.md
- README.md
- manifest.json
- methodology.json
- source-import.json for XLSX sources

## Delivery files

- delivery.json
- reponse-fournisseur.md
- references-preuves.csv
- README.md
- manifest.json

## Security model

The ZIP is generated locally in the browser.

No upload is required.

The ZIP itself is not a signature.

proofpack.json carries its own SHA-256 fingerprint.

manifest.json carries, for every listed ZIP payload file:

- filename
- content type
- size in UTF-8 bytes
- SHA-256
- purpose

manifest.json also carries a global manifest fingerprint computed over the canonical manifest fields and file entries, excluding the fingerprint field itself.

Master manifest v0.2 declares `sourceProfile`. For a source filename ending in `.xlsx`, `sourceProfile` must be `blackproof-xlsx-import-v1` and `source-import.json` is mandatory. A sidecar is refused for non-XLSX sources. Historical v0.1 archives remain verifiable, but a missing XLSX sidecar produces an explicit legacy warning and no XLSX provenance claim.

## Master verification flow

1. Load the complete ZIP in BLACKPROOF Verify.
2. Check the strict file inventory and absence of unexpected files.
3. Check every listed size and SHA-256 plus the manifest fingerprint.
4. Check proofpack.json schema, summary, invariants, internal links and fingerprint.
5. Confirm that manifest.json points to the fingerprint carried by proofpack.json.
6. When present, validate the strict source-import schema, selected-column cell references, uniqueness, formula counters, XLSX source binding and normalized-question order.

The fingerprints let a recipient check that the contents match the provided fingerprints. They do not authenticate the author or the truth of declarations. Sidecar verification without the original workbook proves internal coherence, not the actual source cells.

## Non-promise

The ZIP is not a certification, legal opinion, qualified audit, timestamping authority or regulatory conformity guarantee.
