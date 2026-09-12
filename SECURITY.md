# Security Policy

BLACKPROOF follows a high-security local-first model.

## Current security status

The project is in alpha.

Security invariants:
- no document upload for any operation;
- no hidden telemetry;
- no untrusted HTML rendering;
- cryptographic ProofPack fingerprints;
- CSV formula injection defense;
- strict input limits.

## Required boundary for local MCP support

The local stdio MCP implementation is alpha, not security-certified.
Every integration must:
- expose read-only tools only, with no creation, modification, export,
  signing, deletion, shell execution or network-fetch capability;
- keep proof files on the producing user's device, with access limited
  to that user's explicitly authorized local session;
- expose no proof files, contents, paths, identifiers or listings through
  public endpoints, shared resources, logs or telemetry;
- refuse cross-user access and reads outside explicitly selected inputs;
- treat tool results as sensitive: a local server does not prevent an
  agent from forwarding results to a remote model;
- require an end-to-end local client/model boundary for strict local use.

Read-only annotations are not access controls. Browser encryption does
not protect an unlocked session or plaintext downloaded exports from a
compromised device. These limitations must not be described as zero risk.

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
