# BLACKPROOF Questionnaire Crusher

Version: blackproof-questionnaire-crusher-v0.2.0-alpha

Questionnaire Crusher extracts a raw supplier cyber questionnaire and proposes a structured working review. It does not understand the documents like an auditor and does not validate source evidence.

## Pipeline

1. Raw questionnaire
2. Question extraction
3. Category detection
4. Deterministic working correspondence
5. Evidence expectation
6. Heuristic coverage level
7. Alerts
8. Unmapped queue
9. Critical queue

## Heuristic coverage level

This is not statistical confidence. It is a deterministic rule-coverage level for the alpha classifier.

- high / règles de correspondance trouvées: category detected, working requirements resolved, evidence templates available
- medium / correspondance à revoir: category detected but human review remains necessary
- low / qualification manuelle nécessaire: unknown, ambiguous or incomplete rule coverage

The current alpha classifier is local, deterministic and rule-based. It should later be evaluated on a real questionnaire corpus with precision, recall, unknown-category rate, human-correction rate and error families.

## Status

- mapped: deterministic working correspondence found
- critical: heuristic priority requiring strong evidence and human review
- needs-review: working correspondence found but human review required
- unmapped: no sufficiently precise rule found

## Security principle

The module runs entirely on the user's device and must never upload questionnaires.

## Product scope

Say:

BLACKPROOF extracts supplier cyber questionnaires, proposes working correspondences and helps prepare the evidence review.

Do not say:

BLACKPROOF certifies questionnaire compliance.

BLACKPROOF validates the source documents or decides that a response can be accepted by a third party.
