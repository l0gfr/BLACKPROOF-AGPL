# BLACKPROOF Questionnaire Import

Version: blackproof-questionnaire-import-v0.2.0-alpha

BLACKPROOF imports supplier questionnaires locally.

## Supported in v0.2

- plain text
- CSV
- TSV
- bounded standard XLSX

## Refused

- XLS
- XLSM, XLSB, XLAM and ODS
- VBA, OLE objects, ActiveX, embedded packages and custom UI
- malformed, encrypted, ZIP64, overlapping or resource-exhausting ZIP packages
- archive-level ZIP comments (re-save as a standard XLSX workbook; worksheet cell comments are unaffected)

## Pipeline

1. Read local file in the browser
2. Detect import kind
3. Parse rows locally
4. Detect the header and question column once
5. Extract questions and their row/column sources in the same transformation pass
6. Deduplicate questions and sources together
7. Produce a normalized questionnaire
8. Qualify each imported XLSX question as a literal cell or cached formula value
9. Retain the XLSX import profile, selected sheet and column, counters, warnings and cell provenance locally
10. Require `source-import.json` in every newly generated XLSX Master ZIP

## Security

No document upload.

The import is bounded by engine limits.

CSV cells are treated as untrusted data.

## XLSX compatibility and integrity

Browser MIME metadata is not trusted as content validation. The official XLSX MIME, an empty MIME, `application/octet-stream`, and `application/zip` are accepted as compatibility hints. The `.xlsx` extension, ZIP signature, bounded archive inventory, standard OOXML workbook type and active-content refusals remain mandatory.

Formulas are never executed. Cached formula values may be imported, but are visibly marked and recorded by cell reference. Formula cells without a cached value are ignored and recorded separately.

## Frozen XLSX import profile V1

`blackproof-xlsx-import-v1` means:

- visible sheets only, followed by explicit human sheet confirmation;
- one header decision and one selected question column per sheet;
- question normalization, splitting and case-insensitive deduplication from `blackproof-questionnaire-import-v0.2.0-alpha`;
- 1-based XLSX cell references attached during that same transformation pass;
- formulas never executed; only parser-supplied cached values may become questions;
- bounds published by `/api/questionnaire-import.json`;
- sidecar contract `/schemas/source-import/v1.schema.json`, pinned by the SHA-256 published in the import contract.

The repository pins conforming and rejected fixtures under `packages/core/fixtures/source-import/`; both the JSON Schema and the stricter semantic validator are exercised in the core test suite.

Changing any of these semantics requires a new XLSX import profile version. The V1 schema validates the portable structure; BLACKPROOF additionally enforces semantic invariants such as selected-column membership, unique ordered questions, formula-count coherence and XLSX source binding.

Without the original XLSX file, `/verify` can establish only the internal coherence and hashes of `source-import.json`. It cannot independently prove the selected sheet or cell contents. Full replay verification remains a future optional mode requiring the original file and a matching import profile implementation.


## Sensitive import warning

Supplier questionnaires may contain confidential information.

Users should not import:

- passwords;
- API keys;
- tokens;
- raw logs;
- unnecessary personal data;
- unredacted evidence;
- secrets or credentials of any kind.

BLACKPROOF processes imports locally, but local-first does not mean risk-free.

When an imported XLSX questionnaire is edited as text and reanalysed, the local
record and the next Master ZIP carry `source-lineage.json`. This sidecar records
the original XLSX filename and import profile, its original-file SHA-256, the
previous Master fingerprint, and the filename/hash of the derived text source.
The XLSX cell-level `source-import.json` is removed because it no longer describes
the edited source exactly.
