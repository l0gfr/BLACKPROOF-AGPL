# Security Policy

BLACKPROOF follows a high-security local-first model.

## Current security status

The project is in alpha.

Security invariants:
- no upload by default;
- no hidden telemetry;
- no untrusted HTML rendering;
- cryptographic ProofPack fingerprints;
- CSV formula injection defense;
- strict input limits.

## Supported versions

BLACKPROOF is an alpha product without long-term-support branches. Security fixes are
applied to the current `main` branch and the current production release. Superseded
commits and locally modified builds do not receive backports.

## Private reporting channel

Report vulnerabilities privately to `contact@l0g.fr` with the subject
`[SECURITY BLACKPROOF]`. This is the dedicated routing convention for security reports.

Include, when possible:

- affected route, feature, commit or artifact version;
- reproducible steps and security impact;
- a minimal proof of concept without real customer data;
- whether the issue is already public;
- a safe way to contact the reporter.

Do not attach sensitive questionnaires, real evidence, secrets, credentials, client
names or supplier documents. Use synthetic data and request a safer transfer method
first if an encrypted artifact is necessary.

## Response targets

- acknowledgement target: five business days;
- initial triage or request for additional information: ten business days;
- remediation and disclosure timing: agreed case by case according to severity and
  release risk.

These are good-faith targets for an alpha project, not a contractual SLA.

## Coordinated disclosure

Keep the report private while it is reproduced and remediated. BLACKPROOF will confirm
the affected versions, coordinate a reasonable publication date with the reporter and
credit the reporter when requested. Public issues should contain no exploit details or
sensitive data before a fix is available. If immediate user protection requires a
public advisory, the advisory will minimize operational exploit detail.

## Reporting boundaries

Do not disclose sensitive questionnaires, real evidence, secrets, credentials, client names or supplier documents in public issues.
