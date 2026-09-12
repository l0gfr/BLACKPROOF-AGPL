# BLACKPROOF user flow

BLACKPROOF is free software under AGPL-3.0-only. There is no user account or
activation step. Questionnaires, evidence, dossiers and verification inputs are
processed on the user's device. No document upload or server synchronization is
implemented or permitted.

## Choose a starting point

- `/start`: understand the sequence and choose the next action.
- `/questionnaire-import`: start from a CSV, TSV, text or supported XLSX questionnaire.
- `/app`: start directly from pasted questionnaire text.
- `/app/cases`: reopen an encrypted dossier or restore a downloaded backup.
- `/verify`: check a received or exported dossier locally.
- `/demo`: follow the fictional example before using your own data.

Creation, editing and export are supported on Chrome or Edge on a computer.
Firefox, Safari and mobile browsers are not currently supported for these flows.

## From questionnaire to recipient

1. Select the questionnaire locally, inspect the extracted questions and confirm
   an XLSX import if requested. Selecting a file does not send it to a server.
2. Choose and confirm the dossier's passphrase, then select **Protéger et ouvrir
   le dossier**. The encrypted dossier is saved in this browser profile.
3. Complete the answers and evidence references, document reservations and review
   the flagged issues. Save your changes. The app does not inspect external
   evidence documents or certify the truth of a declaration.
4. Prepare a client version from the dossier editor. Review the exact answers,
   references and reservations selected for the recipient before confirming export.
5. Download the client files to your device, then check them in `/verify`.
   Integrity checks are not a certification or an assessment of factual truth.
   No online registry establishes whether a previously exported version is current.
6. Send the reviewed files yourself through your organization's chosen channel,
   outside BLACKPROOF. Social share buttons share the public website, never a dossier.

## Resume and protect work

The same browser profile can reopen the dossier with its passphrase. The passphrase
cannot be recovered by BLACKPROOF. Browser storage can be erased or evicted.

Download a **Sauvegarde locale complète** from the editor, check the completeness
message, keep a protected copy outside this device and test restoration in another
browser profile. A client export is not a backup of the working dossier. Changing
hostname, browser, profile or device requires explicitly restoring the encrypted
backup. See `/faq` and `docs/LOCAL_FIRST_STORAGE.md`.

## Guided demonstration

See `docs/DEMO_SCENARIO.md`. Use only the fictional files in `/demo/` for screenshots,
recordings and support examples; never record real client data or a real passphrase.
