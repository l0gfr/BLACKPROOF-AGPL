# BLACKPROOF Public API

Version: blackproof-public-api-v0.1.0-alpha

BLACKPROOF exposes a public, read-only API for method, schema and evidence contracts.

This API is intentionally not an upload surface for sensitive questionnaires or evidence.

## Public endpoints

- `GET /api`
- `GET /api/index.json`
- `GET /api/status.json`
- `GET /api/methodology.json`
- `GET /api/evidence-library.json`
- `GET /api/frameworks.json`
- `GET /api/proofdebt.json`
- `GET /api/proofpack/schema.json`
- `GET /schemas/proofpack/v1.schema.json`
- `GET /schemas/proofpack/v2.schema.json`
- `GET /schemas/proofpack/v3.schema.json`
- `GET /canonicalization-vectors.json`
- `GET /api/verify.json`

## Security position

- No document upload.
- Public endpoints are read-only.
- The static API does not accept sensitive evidence.
- ProofPack verification is exposed as a contract and browser/local workflow.
- A future server-side verification endpoint must be explicit, bounded and non-persistent.

## Product value

`/api` is the human-readable API page. `/api/index.json` is the machine-readable API manifest. `/api/status.json` exposes the public product status, changelog, contracts and limits.

The API turns BLACKPROOF into a machine-readable evidence format:

- agents can read the method without guessing;
- buyers can inspect the ProofPack schema;
- suppliers can integrate ProofDebt semantics;
- reviewers can understand verification checks before receiving a dossier.

BLACKPROOF remains local-first for secrets and open for method contracts.

## Public demo artifacts

The public ProofPack example is exposed as static files:

- `/demo/supplier-questionnaire-demo.csv`
- `/demo/proofpack-demo.json`
- `/demo/reponse-fournisseur-demo.md`
- `/demo/registre-preuves-demo.csv`
- `/demo/plan-remediation-demo.csv`
- `/demo/note-synthese-demo.md`
- `/demo/proofpack-bundle-manifest.json`

These files are deliberately fictitious and expurgated. They demonstrate the portable dossier shape: supplier answer, evidence register, ProofDebt remediation plan, human summary, machine-readable ProofPack and manifest.
