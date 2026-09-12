# BLACKPROOF Answer Editor

Version: blackproof-answer-editor-v0.1.0-alpha

The Answer Editor turns a mapped questionnaire into an internal response draft, then an explicitly reviewed Delivery.

## Purpose

BLACKPROOF should not only say which evidence is missing.

It should help produce a careful supplier response:

- answer text;
- reservation;
- answer confidence;
- export status;
- linked evidence;
- residual proof debt.

## Fields

Each question can carry:

- answerText
- answerReservation
- answerConfidence: low, medium, high
- answerExportStatus: draft, ready, reserved, do-not-export

## Export statuses

- draft: not ready for client export
- ready: answer is ready to export
- reserved: answer can be exported with a documented limitation
- do-not-export: answer content and reservation are absent from every ProofPack Delivery

The editor separates two products:

- ProofPack Master: complete internal working dossier;
- ProofPack Delivery: explicit whitelist of validated answers and publishable evidence references.

A Delivery cannot be generated until the user selects each included item and confirms the final third-party review. Confirmation recalculates the Delivery fingerprint from its current content, and ZIP/manifest generation repeats that check immediately before export. Drafts and automatic suggestions are never eligible.

After a Delivery JSON or ZIP is generated, the editor appends an internal receipt to the Master and persists the revised dossier in IndexedDB. The receipt records the Delivery ID and fingerprint, generation date, selected internal question/evidence IDs, filename, status, and optional recipient/operator labels. This history is internal-only and never enters the Delivery payload.

Evidence marked `available` must first carry a complete structured reference. Selecting `available` with an incomplete reference opens the reference editor and leaves the previous evidence status unchanged.

## Security posture

The Answer Editor must help users avoid oversharing.

A good answer can reference sensitive proof without exporting it directly.

## Non-promise

Answer Editor does not certify that a response is legally sufficient or regulatory compliant.
