# BLACKPROOF Evidence Library

Version: blackproof-evidence-library-v0.1.0-alpha

The Evidence Library is a core BLACKPROOF asset.

It defines what kind of proof is expected for common supplier cyber questionnaire topics.

In the current V0, an `EvidenceItem` is an evidence-readiness record. It can describe,
reference and qualify an expected or declared proof, but it is not itself a notarized
evidence object or a secure document vault.

## Purpose

The library helps answer:

- What evidence is expected?
- How strong is that evidence?
- How sensitive is it?
- Can it be exported?
- Should it be replaced by a controlled extract?
- Which NIS2/ReCyF-style requirement does it support?

## Current categories

- access-control
- backup
- incident-response
- business-continuity
- supplier-security
- governance
- logging-monitoring
- vulnerability-management
- data-protection
- unknown

## Evidence statuses

- expected: evidence is expected but not provided
- available: user declares that the evidence exists and can be referenced or exported safely
- missing: evidence does not exist or has not been found
- expired: evidence exists but is stale
- declared: answer is declarative only
- not-exportable: evidence exists but is too sensitive to export directly

## Available evidence references

The editor refuses the `available` state until a structured reference is complete. The required fields are:

- reference type;
- reference name or identifier;
- source system;
- observation date;
- owner;
- sensitivity;
- export mode (`internal-only` or `reference-only`).

No evidence file is uploaded. File, URI and document-hash reference types map the identifier to the corresponding legacy ProofPack field for backward compatibility.

The same editor exposes optional qualification metadata for expiration, covered scope, validator and validation date, control result, evidence version and chronological history. These fields remain internal to the Master and feed freshness, validation-completeness and ProofDebt analysis where applicable.

These structured fields form the internal reference and are never copied into a
Delivery. A separate optional `publicReference` contains the exact wording the
user authorizes for a third party, for example an attestation number or a note
that an extract is available in a data room. A Delivery v4/v5 evidence item cannot
be created without this explicit public wording; BLACKPROOF never derives it
from internal metadata.

## Security principle

BLACKPROOF must never upload any document of proof. References and evidence metadata are processed locally; downloaded exports are shared by the user outside the app.

A strong dossier can reference evidence, describe controlled extracts, or document reservations without exposing secrets.

## Non-promise

The Evidence Library does not certify compliance.

It helps structure an evidence readiness register and a defensible response dossier.
