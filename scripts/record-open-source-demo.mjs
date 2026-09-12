// Re-record the real local UI using synthetic fixtures only. No server mutation.
// Start a built preview first, then: node scripts/record-open-source-demo.mjs http://127.0.0.1:4353 /absolute/path/to/ffmpeg
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { soundtrack } from "./create-demo-soundtrack.mjs";
import { join } from "node:path";
import { chromium, expect } from "@playwright/test";

const baseURL = new URL(process.argv[2] ?? "http://127.0.0.1:4353");
assert.ok(baseURL.protocol === "http:" && ["127.0.0.1", "localhost"].includes(baseURL.hostname));
assert.equal(baseURL.pathname, "/");
assert.equal(baseURL.search + baseURL.hash + baseURL.username + baseURL.password, "");
const output = "apps/web/public/media";
const scratch = "artifacts/demo-recording";
const ffmpeg = process.argv[3];
assert.ok(ffmpeg, "Provide the local ffmpeg executable as the third argument");
await mkdir(scratch, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL: baseURL.href, viewport: { width: 1400, height: 900 },
  deviceScaleFactor: 1, reducedMotion: "reduce",
  recordVideo: { dir: scratch, size: { width: 1400, height: 900 } },
});
await context.route("**/*", async (route) => {
  const request = route.request();
  assert.equal(new URL(request.url()).origin, baseURL.origin, "The demo must not contact any third party");
  assert.ok(["GET", "HEAD"].includes(request.method()), "The demo must not send data to any server");
  await route.continue();
});
const page = await context.newPage();
const started = Date.now();
const cues = [];
const passphrase = "fictional-demo-only-not-a-real-secret";
const hold = (ms = 4500) => new Promise((resolve) => setTimeout(resolve, ms));

async function caption(title, detail) {
  cues.push({ at: Date.now() - started, title, detail });
  console.log(title);
  // Captions are selectable, enabled-by-default VTT, not a duplicated band
  // burned into the image. Native controls can hide them or change their size.
}

try {
  await page.goto("/start");
  await page.evaluate(() => document.fonts.ready);
  await caption("Parcours local", "Revues cyber, audits internes et questionnaires. Démonstration avec des données fictives.");
  await hold();
  await page.screenshot({ path: join(output, "blackproof-parcours-local-poster.jpg"), type: "jpeg", quality: 86 });

  await page.goto("/questionnaire-import");
  await expect(page.locator('[data-blackproof-hydrated="true"]')).toBeVisible();
  await caption("01 · Sélectionner le questionnaire sur l’appareil", "L’import lit le fichier dans le navigateur. Aucun téléversement vers BLACKPROOF.");
  await page.getByLabel("Choisir le questionnaire").scrollIntoViewIfNeeded();
  await hold();
  await page.getByLabel("Choisir le questionnaire").setInputFiles("apps/web/public/demo/supplier-questionnaire-demo.csv");
  await expect(page.locator(".preview")).toBeVisible();
  await page.locator(".preview").scrollIntoViewIfNeeded();
  await caption("Relire les questions extraites", "Ce CSV de démonstration contient dix questions. Le document source reste local.");
  await hold();
  await page.getByLabel("Phrase secrète du dossier", { exact: true }).fill(passphrase);
  await page.getByLabel("Confirmer la phrase secrète", { exact: true }).fill(passphrase);
  await caption("02 · Protéger le dossier par une phrase secrète", "Elle chiffre le dossier dans ce navigateur. BLACKPROOF ne peut pas la récupérer.");
  await hold();
  await page.getByRole("button", { name: "Protéger et ouvrir le dossier", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Compléter et préparer le dossier." })).toBeVisible();
  const caseUrl = page.url();
  await caption("03 · Compléter les réponses, sans automatiser le jugement", "Une réponse prête ne prouve pas à elle seule la réalité des mesures déclarées.");
  await page.getByLabel("Réponse à envoyer").first().fill("Exemple fictif : le MFA est activé sur les accès administrateurs du périmètre décrit.");
  await page.getByLabel("Statut d’export").first().selectOption("ready");
  await hold();

  await page.getByRole("button", { name: "Référencer", exact: true }).first().click();
  const evidence = page.locator('[aria-label="Référence de preuve pour Politique MFA"]');
  await evidence.getByLabel("Type de référence pour Politique MFA", { exact: true }).selectOption("file");
  await evidence.getByLabel("Nom ou identifiant de référence pour Politique MFA", { exact: true }).fill("politique-mfa-exemple.pdf");
  await hold(350);
  await evidence.locator("details.evidence-qualification-fields summary").click();
  await hold(350);
  await evidence.getByLabel("Système source pour Politique MFA", { exact: true }).fill("Documentation fictive");
  await hold(350);
  await evidence.getByLabel("Date d’observation pour Politique MFA", { exact: true }).fill("2026-09-12T10:00");
  await hold(350);
  await evidence.getByLabel("Propriétaire pour Politique MFA", { exact: true }).fill("Équipe fictive");
  await hold(350);
  await evidence.getByLabel("Sensibilité pour Politique MFA", { exact: true }).selectOption("internal");
  await evidence.getByLabel("Mode d’export pour Politique MFA", { exact: true }).selectOption("reference-only");
  await evidence.getByText("Ajouter une référence publique pour le client", { exact: true }).click();
  await evidence.getByLabel("Référence publique destinée au client pour Politique MFA", { exact: true }).fill("Politique MFA fictive : synthèse expurgée disponible sur demande.");
  await caption("Une référence, pas un document envoyé", "Le nom, le périmètre et la référence destinée au client sont saisis localement.");
  await hold();
  await evidence.getByRole("button", { name: "Déclarer comme disponible", exact: true }).click();
  await page.getByRole("button", { name: "Sauvegarder les changements", exact: true }).click();
  await expect(page.getByText("Dossier local sauvegardé.", { exact: true })).toBeVisible();
  const review = page.locator(".delivery-review");
  await review.getByRole("button", { name: "Inclure tous les éléments admissibles", exact: true }).click();
  await caption("04 · Relire le contenu exact destiné au client", "Une seule réponse est sélectionnée ici. Les neuf autres restent à travailler.");
  await review.locator(".delivery-final-preview").scrollIntoViewIfNeeded();
  await hold(6500);
  await page.getByRole("checkbox", { name: /J’ai vérifié le contenu exact destiné au client et son empreinte/ }).check();
  const deliveryPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger le ZIP client", exact: true }).click();
  const deliveryPath = join(scratch, "fictional-client.zip");
  await (await deliveryPromise).saveAs(deliveryPath);
  await caption("Télécharger n’est pas transmettre", "Le ZIP est enregistré sur cet appareil. Vous choisirez vous-même comment l’envoyer, hors de BLACKPROOF.");
  await hold(6000);

  await page.locator("details.master-export").getByText("Exports internes et sauvegarde complète", { exact: true }).click();
  await caption("05 · Conserver une sauvegarde chiffrée du travail", "La sauvegarde complète et sa phrase secrète permettent de restaurer le dossier. Le ZIP client ne les remplace pas.");
  await page.getByRole("button", { name: "Sauvegarde locale complète", exact: true }).scrollIntoViewIfNeeded();
  const backupPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Sauvegarde locale complète", exact: true }).click();
  await (await backupPromise).saveAs(join(scratch, "fictional-backup.zip"));
  await hold(6000);

  await page.goto("/verify");
  await expect(page.locator('[data-blackproof-verify-ready="true"]')).toBeVisible();
  await caption("06 · Vérifier le ZIP client qui vient d’être exporté", "La lecture du ZIP et le calcul des empreintes se font sur l’appareil, sans envoyer les fichiers.");
  await page.getByLabel("Choisir un dossier maître ou client, JSON ou ZIP").setInputFiles(deliveryPath);
  const success = page.getByRole("heading", { name: "Contrôles locaux du ZIP client réussis" });
  await expect(success).toBeVisible();
  await success.scrollIntoViewIfNeeded();
  await hold(6500);
  await caption("Intégrité vérifiée, pas certification", "Ces contrôles ne valident ni la véracité des réponses, ni leur conformité, ni leur statut actuel en ligne.");
  await hold(6500);

  await page.goto("/app/cases");
  await expect(page.locator('[data-blackproof-ready="true"]')).toBeVisible();
  await caption("Reprendre le travail dans le même navigateur", "Le dossier enregistré est local et chiffré. Aucun compte ni synchronisation serveur.");
  await page.locator(".case-list").scrollIntoViewIfNeeded();
  await hold();
  await page.goto(caseUrl);
  await page.getByLabel("Phrase secrète du dossier", { exact: true }).fill(passphrase);
  await page.getByRole("button", { name: "Déverrouiller le dossier", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Compléter et préparer le dossier." })).toBeVisible();
  await caption("Vos dossiers restent sur votre appareil", "Sauvegardez régulièrement. Vous gardez le contrôle de vos dossiers et de leur partage.");
  await hold(6000);

  const ended = Date.now() - started;
  await context.close();
  const silent = join(scratch, "parcours-silent.webm");
  const music = join(scratch, "parcours-original.wav");
  const mixed = join(scratch, "parcours-mixed.webm");
  await page.video().saveAs(silent);
  await writeFile(music, soundtrack(ended / 1000));
  const mux = spawnSync(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-i", silent, "-i", music,
    "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "libopus", "-b:a", "80k", "-shortest", mixed], { stdio: "inherit" });
  assert.equal(mux.status, 0, "Local soundtrack mux failed");
  await copyFile(mixed, join(output, "blackproof-parcours-local.webm"));
  cues[0].at = 0;
  const timestamp = (ms) => new Date(ms).toISOString().slice(11, 23);
  const vtt = "WEBVTT\n\n" + cues.map((cue, i) => `${i + 1}\n${timestamp(cue.at)} --> ${timestamp(cues[i + 1]?.at ?? ended)}\n${cue.title}\n${cue.detail}\n`).join("\n");
  await writeFile(join(output, "blackproof-parcours-local.fr.vtt"), vtt);
  await writeFile(join(scratch, "recording.json"), JSON.stringify({ durationMs: ended, cues, input: "supplier-questionnaire-demo.csv", newClientZipBytes: (await readFile(deliveryPath)).length }, null, 2));
  console.log(`Recorded ${cues.length} chapters, ${Math.round(ended / 1000)} seconds; new client ZIP verified locally.`);
} finally {
  await browser.close();
}
