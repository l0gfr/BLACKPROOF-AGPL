# Delivery bilateral protocol

BLACKPROOF Delivery v5 remains the immutable disclosure payload. The bilateral protocol adds detached, fingerprint-bound artifacts so a recipient can verify, compare and archive a transmission locally, without a BLACKPROOF account.

## Artifacts

- `delivery.json` or the strict Delivery ZIP v1: immutable reviewed disclosure.
- `blackproof-delivery-change-report-v1`: comparison of two valid Delivery artifacts matched by normalized question text. It records added, removed and changed answers, reservations and public evidence references.
- `blackproof-delivery-signature-v1`: optional detached ECDSA P-256 signature over one exact Delivery or revocation fingerprint. The issuer label is self-declared; identity assurance depends on out-of-band public-key pinning.
- `blackproof-delivery-revocation-v1`: portable, fingerprinted statement for offline archives. Its self-fingerprint proves structural consistency and Delivery binding, not issuer authority or current revocation status; confirm current status with the issuer through a trusted channel.
- `blackproof-delivery-status-v1`: historical interoperability schema only. No hosted status service is provided by this version. A locally valid fingerprint or signature cannot establish current active or revoked status.

## Return Pack XLSX

Return Pack is disabled in every production artifact. The production build gate fails if the public status does not declare it disabled.

The replacement candidate verifies the selected source file extension, size and exact import SHA-256, but never parses or copies its OOXML package. It reconstructs a new fixed workbook containing only confirmed Delivery answers and a trace sheet, both encoded as inert inline strings. A fail-closed postcondition reopens the candidate, enforces an exact part inventory and rejects formulas, external relationships, active content, DTDs or unexpected content types. Re-enablement requires separate Excel and LibreOffice compatibility evidence plus the dedicated adversarial regression suite; source-workbook preservation is no longer a product promise.

## Standalone verification

`packages/verifier` is an AGPL-3.0-only standalone Node.js CLI/SDK. It does not depend on `@blackproof/core` at runtime and supports Delivery JSON/ZIP verification, comparison, detached signature verification, offline revocation-statement consistency checks without any network lookup. Its source and public contracts are covered by the repository AGPL-3.0-only licence. Its v4/v5 validators are generated from the same frozen canonical schemas as the core validators. ZIP central-directory limits are checked before JSZip extraction; local files are bounded before reading; Markdown, CSV and README sidecars are regenerated from the verified `delivery.json` and compared byte for byte. No file, fingerprint or identifier is transmitted.
