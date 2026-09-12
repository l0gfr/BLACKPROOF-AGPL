# BLACKPROOF demonstration

The fictional supplier Northstar SaaS prepares a cyber questionnaire for Omega
Industrial Group. The demonstration uses the same free, account-free, local-only
application as any other user. No document is uploaded.

This video demonstrates the supplier-questionnaire use case. The same local
workflow also supports a cyber review or an internal audit: replace the fictional
questionnaire with your own review checklist. An external client and a transmitted
export are not prerequisites. The software helps document a review; it does not
perform an audit or assess the truth of referenced evidence documents.

## Replay the working flow

1. Open `/demo` and download `/demo/supplier-questionnaire-demo.csv`.
2. Open `/questionnaire-import` and select that local file.
3. Review the extracted questions, set and confirm a demonstration-only passphrase,
   then select **Protéger et ouvrir le dossier**.
4. In the editor, complete answers, evidence references and reservations. Save changes.
5. Prepare and review a client version in the editor before confirming its export.
6. Download the client ZIP, then select it in `/verify` to check it locally.
7. Download a **Sauvegarde locale complète**, reopen the dossier through `/app/cases`
   and test restoring the backup in a separate browser profile with its passphrase.

For an immediate verification example, use `/demo/proofpack-delivery-demo.zip`.
That prebuilt fictional client export is separate from any dossier you create.
It demonstrates integrity checking, not certification, factual truth or current
online status. It cannot restore the full working dossier.

## Screenshots and video

Show the current interface and label all example data as fictional. Do not use
earlier interfaces, commercial access screens, real customer documents or real
credentials. A recording must distinguish preparing a dossier, producing a backup,
and verifying the client ZIP that it actually exported. Its text alternative must
describe the same actions and limitations.

The homepage video is a silent, captioned recording of the real local UI. It creates
and verifies its own partial client ZIP (one completed answer, nine left to work on),
downloads a separate encrypted backup and reopens the working dossier. It does not
substitute a prebuilt fixture for the newly exported ZIP. A text alternative is
available next to the video and French captions are provided as a local VTT file.

To re-record with a built loopback preview running:

```sh
node scripts/record-open-source-demo.mjs http://127.0.0.1:4353
```

The recorder refuses third-party requests and non-read-only HTTP methods. It uses
only synthetic data, keeps scratch recordings and downloaded test files under
the ignored `artifacts/demo-recording/` directory, and writes the reviewed media
under `apps/web/public/media/`. Inspect the whole recording before publishing it.
