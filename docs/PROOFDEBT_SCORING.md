# BLACKPROOF ProofDebt Indicator

ProofDebt is not a compliance score.

It is a heuristic indicator for how defensible a cyber evidence dossier is.

Reading bands:

- 0 to 20: non-defensible
- 21 to 50: critical proof debt
- 51 to 70: partially defensible
- 71 to 85: solid with reservations
- 86 to 100: well structured

A high indicator does not mean regulatory conformity.

A low indicator means the dossier should not be sent without reservations.

Penalties are capped per question before the global indicator is calculated.

The ProofPack summary also exposes four separate components:

- response completeness
- evidence coverage
- evidence quality and freshness
- export readiness

Minimum invariants applied by the indicator:

- `ready`: a non-empty answer is required
- `reserved`: both a non-empty answer and a non-empty reservation are required
- `available`: a source system, file reference, URI or document hash is required
- `fresh`: `expiresAt` is absent or is a future date
- `validated`: both `validator` and `validatedAt` are required when validation metadata is claimed
