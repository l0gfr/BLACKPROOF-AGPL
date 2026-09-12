<script lang="ts">
  import { onMount } from "svelte";

  import { restoreLocalBackup } from "../../lib/local-backup";
  import { clearKnowledgeVault } from "../../lib/knowledge-vault";
  import { isKnowledgeVaultEnabled } from "../../lib/feature-flags";
  import { assertLocalPassphrase } from "../../lib/local-encryption";
  import { subscribeToSensitivePageLock, type SensitivePageLockReason } from "../../lib/sensitive-page-lock";
  import JourneyGuide from "./JourneyGuide.svelte";

  import {
    BLACKPROOF_LOCAL_DB_VERSION,
    captureLocalStorageEpoch,
    clearLocalCases,
    deleteOrphanDeliverySnapshots,
    deleteLocalCase,
    listLocalCases,
    MAX_LOCAL_CASE_LABEL_CHARS,
    subscribeToLocalStorageWipe,
    updateLocalCaseLabel,
    type LocalCaseListRecord,
  } from "../../lib/local-db";

  let cases: LocalCaseListRecord[] = [];
  let errorMessage = "";
  let wipeMessage = "";
  let isLoading = true;
  let restoreFileInput: HTMLInputElement;
  let selectedRestoreFile: File | null = null;
  let restoreBackupPassphrase = "";
  let restoreExistingPassphrase = "";
  let restoreTargetPassphrase = "";
  let restoreTargetConfirmation = "";
  let restoreReplaceConfirmed = false;
  let restoreAllowDataLoss = false;
  let restoreAllowPartial = false;
  let restoreDataLossDetails = "";
  let restorePartialDetails = "";
  let isRestoring = false;
  let operationGeneration = 0;
  let restoreAbortController: AbortController | null = null;
  let storagePersistence: "checking" | "persistent" | "not-persistent" | "unsupported" = "checking";
  const knowledgeVaultEnabled = isKnowledgeVaultEnabled();

  $: migrationRequiredCount = cases.filter((item) => item.requiresEncryptionMigration).length;
  $: encryptedCaseCount = cases.length - migrationRequiredCount;
  $: guideTitle = isLoading
    ? "Laissez l’inventaire local se charger."
    : cases.length === 0
      ? "Importez votre premier questionnaire."
      : "Déverrouillez le dossier que vous voulez poursuivre.";
  $: guideReason = isLoading
    ? "BLACKPROOF vérifie le stockage de ce navigateur avant d’afficher les dossiers disponibles."
    : cases.length === 0
      ? "L’import isole les questions utiles et crée l’espace où vous préparerez réponses et preuves."
      : "Chaque dossier est chiffré séparément ; son contenu ne devient lisible qu’après saisie de sa phrase secrète.";
  $: guideActionLabel = cases.length === 0 ? "Importer un questionnaire" : "Aller aux dossiers";
  $: guideActionHref = cases.length === 0 ? "/questionnaire-import" : "#local-case-list";
  $: guideSteps = [
    { label: "Importer", state: cases.length > 0 ? "done" as const : "current" as const },
    { label: "Ouvrir", state: cases.length > 0 ? "current" as const : "upcoming" as const },
    { label: "Compléter", state: "upcoming" as const },
    { label: "Exporter", state: "upcoming" as const },
  ];

  async function refreshCases() {
    const generation = operationGeneration;
    errorMessage = "";
    isLoading = true;

    try {
      const removedOrphans = await deleteOrphanDeliverySnapshots();
      if (generation !== operationGeneration) return;
      const nextCases = await listLocalCases();
      if (generation !== operationGeneration) return;
      cases = nextCases;
      if (removedOrphans > 0) wipeMessage = `${removedOrphans} snapshot(s) orphelin(s) supprimé(s).`;
    } catch (error) {
      if (generation !== operationGeneration) return;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = "Erreur inconnue pendant la lecture locale.";
      }
    } finally {
      if (generation === operationGeneration) isLoading = false;
    }
  }

  async function refreshStoragePersistence() {
    if (!navigator.storage?.persisted) {
      storagePersistence = "unsupported";
      return;
    }
    storagePersistence = await navigator.storage.persisted() ? "persistent" : "not-persistent";
  }

  async function protectStorage() {
    if (!navigator.storage?.persist) {
      storagePersistence = "unsupported";
      return;
    }
    const granted = await navigator.storage.persist();
    storagePersistence = granted || await navigator.storage.persisted() ? "persistent" : "not-persistent";
    wipeMessage = storagePersistence === "persistent"
      ? "Le navigateur signale ce stockage comme persistant sur cet appareil. Un effacement manuel du profil reste destructif."
      : "Le navigateur n’a pas accordé la persistance. Téléchargez une sauvegarde chiffrée et conservez-la hors de cet appareil.";
  }

  async function removeCase(item: LocalCaseListRecord) {
    const generation = operationGeneration;
    const confirmed = window.confirm("Supprimer ce dossier local ? Cette action ne touche pas GitHub ni un serveur.");

    if (!confirmed) return;

    const expectedRevisionId = item.revisionId;
    if (!expectedRevisionId) {
      errorMessage = "La révision de ce dossier ancien est inconnue. Ouvrez-le pour le migrer avant de le supprimer.";
      return;
    }
    try {
      await deleteLocalCase(item.id, expectedRevisionId);
      if (generation !== operationGeneration) return;
      await refreshCases();
    } catch (error) {
      if (generation !== operationGeneration) return;
      errorMessage = error instanceof Error ? error.message : "Impossible de supprimer ce dossier local.";
    }
  }

  async function saveLocalLabel(item: LocalCaseListRecord) {
    const generation = operationGeneration;
    if (!item.revisionId) {
      errorMessage = "Ouvrez d’abord ce dossier historique pour terminer sa migration.";
      return;
    }
    try {
      await updateLocalCaseLabel(item.id, item.localLabel ?? "", item.revisionId);
      if (generation !== operationGeneration) return;
      wipeMessage = item.localLabel?.trim()
        ? "Repère local enregistré. Il reste volontairement visible avant déverrouillage."
        : "Repère local supprimé.";
      await refreshCases();
    } catch (error) {
      if (generation !== operationGeneration) return;
      errorMessage = error instanceof Error ? error.message : "Impossible d’enregistrer le repère local.";
    }
  }

  async function panicWipe() {
    const confirmation = window.prompt(
      "Panic Wipe BLACKPROOF : cette action supprime les dossiers, snapshots et coffre personnel de ce navigateur. Les fichiers déjà téléchargés et le presse-papiers ne peuvent pas être rappelés. Tapez EFFACER pour confirmer."
    );

    if (confirmation !== "EFFACER") {
      wipeMessage = "Panic Wipe annulé.";
      return;
    }

    operationGeneration += 1;
    resetRestoreForm();
    await clearLocalCases();
    await clearKnowledgeVault();
    cases = [];
    wipeMessage = "Dossiers, snapshots et coffre personnel supprimés de ce navigateur. Les fichiers déjà téléchargés et le presse-papiers doivent être effacés séparément.";
    await refreshCases();
  }

  function resetRestoreForm() {
    restoreAbortController?.abort();
    restoreAbortController = null;
    selectedRestoreFile = null;
    restoreBackupPassphrase = "";
    restoreExistingPassphrase = "";
    restoreTargetPassphrase = "";
    restoreTargetConfirmation = "";
    restoreReplaceConfirmed = false;
    restoreAllowDataLoss = false;
    restoreAllowPartial = false;
    restoreDataLossDetails = "";
    restorePartialDetails = "";
    isRestoring = false;
    if (restoreFileInput) restoreFileInput.value = "";
  }

  function lockSensitiveRestoreState(reason: SensitivePageLockReason) {
    operationGeneration += 1;
    resetRestoreForm();
    errorMessage = "";
    wipeMessage = reason === "hidden"
      ? "Restauration annulée après passage prolongé en arrière-plan ; le fichier et les phrases secrètes ont été effacés de cette page."
      : "Restauration annulée après inactivité ; le fichier et les phrases secrètes ont été effacés de cette page.";
  }

  function selectBackup(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    selectedRestoreFile = file;
    restoreBackupPassphrase = "";
    restoreExistingPassphrase = "";
    restoreTargetPassphrase = "";
    restoreTargetConfirmation = "";
    restoreReplaceConfirmed = false;
    restoreAllowDataLoss = false;
    restoreAllowPartial = false;
    restoreDataLossDetails = "";
    restorePartialDetails = "";
    errorMessage = "";
  }

  async function restoreSelectedBackup() {
    const generation = operationGeneration;
    const file = selectedRestoreFile;
    if (!file || isRestoring) return;
    errorMessage = "";
    isRestoring = true;
    const abortController = new AbortController();
    restoreAbortController?.abort();
    restoreAbortController = abortController;
    try {
      assertLocalPassphrase(restoreTargetPassphrase);
      if (restoreTargetConfirmation !== restoreTargetPassphrase) {
        throw new Error("Les deux saisies de la nouvelle phrase secrète ne correspondent pas.");
      }
      if (!restoreReplaceConfirmed) {
        throw new Error("Confirmez que la restauration peut remplacer un dossier portant le même identifiant.");
      }
      if (restoreDataLossDetails && !restoreAllowDataLoss) {
        throw new Error("Confirmez explicitement la suppression des snapshots absents avant de restaurer.");
      }
      if (restorePartialDetails && !restoreAllowPartial) {
        throw new Error("Confirmez explicitement la restauration partielle avant de continuer.");
      }

      const operationEpoch = await captureLocalStorageEpoch();
      if (generation !== operationGeneration) return;
      const restored = await restoreLocalBackup(file, {
        backupPassphrase: restoreBackupPassphrase || undefined,
        existingPassphrase: restoreExistingPassphrase || undefined,
        targetPassphrase: restoreTargetPassphrase,
        operationEpoch,
        allowDataLoss: restoreAllowDataLoss,
        allowPartial: restoreAllowPartial,
        signal: abortController.signal,
      });
      if (generation !== operationGeneration) return;

      const verificationScope = restored.encrypted
        ? "structure, cohérence et intégrité cryptographique vérifiées ; origine non authentifiée"
        : "structure, cohérence et empreintes recalculées vérifiées ; origine non authentifiée";
      const migrationNotice = restored.questionnaireCanonicalized
        ? " Questionnaire migré vers sa forme canonique empreintée."
        : restored.migratedLegacyEnvelope ? " Enveloppe version 13 normalisée." : "";
      wipeMessage = `Sauvegarde restaurée (${verificationScope}) : ${restored.restoredSnapshots} snapshot(s), ${restored.mergedSnapshots} fusionné(s), ${restored.missingSnapshots} absent(s) de la sauvegarde.${migrationNotice}`;
      resetRestoreForm();
      await refreshCases();
    } catch (error) {
      if (generation !== operationGeneration) return;
      if (!(error instanceof Error)) {
        errorMessage = "Impossible de restaurer la sauvegarde locale.";
        return;
      }
      if (error.message === "Cette sauvegarde est chiffrée. Une phrase secrète est requise.") {
        errorMessage = "Cette sauvegarde est chiffrée : saisissez sa phrase secrète dans le champ prévu, puis relancez la restauration.";
        return;
      }
      if (error.message.startsWith("La restauration remplacerait un dossier actuellement chiffré.")) {
        errorMessage = "Un dossier portant le même identifiant existe déjà : saisissez sa phrase secrète actuelle, puis relancez la restauration.";
        return;
      }
      if (error.message.startsWith("RESTORE_DATA_LOSS:")) {
        const [, present, expected, deleted] = error.message.split(":");
        restoreDataLossDetails = `La sauvegarde contient ${present} snapshot(s) sur ${expected}. ${deleted} snapshot(s) actuellement présents seraient supprimés.`;
        errorMessage = "Une décision est requise dans la section Risque de perte ci-dessous.";
        return;
      }
      if (error.message.startsWith("RESTORE_PARTIAL_CONFIRM:")) {
        const [, expected, included, merged, missing] = error.message.split(":");
        restorePartialDetails = `Master valide ; ${included}/${expected} snapshot(s) inclus, ${merged} fusionné(s), ${missing} restant absent(s).`;
        errorMessage = "Une décision est requise dans la section Restauration partielle ci-dessous.";
        return;
      }
      errorMessage = error.message;
    } finally {
      if (restoreAbortController === abortController) restoreAbortController = null;
      if (generation === operationGeneration) isRestoring = false;
    }
  }

  onMount(() => {
    const unsubscribeFromStorageWipe = subscribeToLocalStorageWipe(() => {
      operationGeneration += 1;
      resetRestoreForm();
      cases = [];
      errorMessage = "";
      wipeMessage = "Panic Wipe détecté : l’inventaire et tout fichier de restauration sélectionné ont été effacés de cette page.";
      isLoading = false;
    });
    const unsubscribeFromSensitivePageLock = subscribeToSensitivePageLock((reason) => lockSensitiveRestoreState(reason));
    void refreshStoragePersistence();
    void refreshCases();
    return () => {
      unsubscribeFromStorageWipe();
      unsubscribeFromSensitivePageLock();
    };
  });
</script>

<section class="cases-shell" data-blackproof-ready={isLoading ? undefined : "true"}>
  <div class="cases-panel">
    <p class="eyebrow">{BLACKPROOF_LOCAL_DB_VERSION}</p>
    <h1>Dossiers locaux</h1>
    <p class="lead">
      Les dossiers sauvegardés ici restent dans IndexedDB, dans ce navigateur.
      BLACKPROOF ne les envoie à aucun serveur.
    </p>

    <div class="security-note">
      Stockage local : ces dossiers peuvent contenir des questionnaires et métadonnées sensibles.
      Le mode chiffré protège leur contenu par phrase secrète. Les anciens dossiers non chiffrés
      restent signalés jusqu'à leur conversion.
      <div class="storage-persistence" data-storage-persistence={storagePersistence}>
        <strong>Persistance navigateur :</strong>
        {#if storagePersistence === "persistent"}
          protégée contre l’éviction automatique signalée par ce navigateur.
        {:else if storagePersistence === "not-persistent"}
          non accordée ; une éviction automatique reste possible.
        {:else if storagePersistence === "unsupported"}
          non vérifiable dans ce navigateur.
        {:else}
          vérification en cours.
        {/if}
        {#if storagePersistence === "not-persistent"}
          <button class="button" type="button" onclick={protectStorage}>Protéger le stockage sur cet appareil</button>
        {/if}
        <small>Cette protection ne résiste pas à un effacement manuel du profil. Conservez une sauvegarde chiffrée hors de cet appareil.</small>
      </div>
    </div>

    <JourneyGuide
      title={guideTitle}
      reason={guideReason}
      actionLabel={guideActionLabel}
      actionHref={guideActionHref}
      steps={guideSteps}
    />

    <div class="actions primary-actions" role="group" aria-label="Actions principales">
      <a class="button primary" href="/questionnaire-import">Importer un questionnaire</a>
      <a class="button" href="/app">Créer sans fichier</a>
      <a class="button" href="/faq#retrouver-dossiers">Comment retrouver et sauvegarder mes dossiers ?</a>
      {#if knowledgeVaultEnabled}<a class="button" href="/app/knowledge">Base personnelle</a>{/if}
    </div>
    <div class="actions utility-actions" role="group" aria-label="Sauvegarde et sécurité locales">
      <span>Outils locaux</span>
      <button class="button" type="button" onclick={refreshCases}>Rafraîchir</button>
      <label class="button" class:disabled={isLoading}>Restaurer une sauvegarde<input bind:this={restoreFileInput} class="sr-only" type="file" accept=".zip,application/zip" onchange={selectBackup} disabled={isLoading} /></label>
      <button class="button danger" type="button" onclick={panicWipe}>Panic Wipe</button>
    </div>

    {#if selectedRestoreFile}
      <section class="restore-panel" aria-labelledby="restore-title">
        <div class="restore-head">
          <div>
            <p class="eyebrow">Restauration locale</p>
            <h2 id="restore-title">Vérifier les accès avant d’écrire.</h2>
            <p><strong>Fichier :</strong> {selectedRestoreFile.name}</p>
          </div>
          <button class="button" type="button" onclick={resetRestoreForm} disabled={isRestoring}>Annuler</button>
        </div>
        <p class="restore-help">
          Renseignez les champs utiles en une fois. Les deux premiers restent facultatifs : BLACKPROOF vous indiquera
          précisément lequel manque sans effacer les autres saisies.
        </p>
        <div class="restore-grid">
          <label>
            <span>Phrase de la sauvegarde</span>
            <input aria-label="Phrase de la sauvegarde" type="password" bind:value={restoreBackupPassphrase} autocomplete="current-password" placeholder="Si le ZIP est chiffré" disabled={isRestoring} />
            <small>Ouvre le fichier importé.</small>
          </label>
          <label>
            <span>Phrase actuelle du dossier existant</span>
            <input aria-label="Phrase actuelle du dossier existant" type="password" bind:value={restoreExistingPassphrase} autocomplete="current-password" placeholder="Si ce dossier existe déjà" disabled={isRestoring} />
            <small>Autorise son remplacement sans contourner son chiffrement.</small>
          </label>
          <label>
            <span>Nouvelle phrase locale</span>
            <input aria-label="Nouvelle phrase locale" type="password" bind:value={restoreTargetPassphrase} minlength="12" autocomplete="new-password" disabled={isRestoring} />
            <small>Chiffre le dossier restauré dans ce navigateur.</small>
          </label>
          <label>
            <span>Confirmer la nouvelle phrase</span>
            <input aria-label="Confirmer la nouvelle phrase" type="password" bind:value={restoreTargetConfirmation} minlength="12" autocomplete="new-password" disabled={isRestoring} />
            <small>Doit être identique à la saisie précédente.</small>
          </label>
        </div>
        <label class="restore-confirm">
          <input type="checkbox" bind:checked={restoreReplaceConfirmed} disabled={isRestoring} />
          <span>J’ai compris qu’un dossier portant le même identifiant sera remplacé après vérification de sa phrase actuelle.</span>
        </label>
        {#if restoreDataLossDetails}
          <div class="restore-risk" role="group" aria-labelledby="restore-data-loss-title">
            <strong id="restore-data-loss-title">Risque de perte</strong>
            <p>{restoreDataLossDetails}</p>
            <label><input type="checkbox" bind:checked={restoreAllowDataLoss} /> Je confirme cette suppression.</label>
          </div>
        {/if}
        {#if restorePartialDetails}
          <div class="restore-risk" role="group" aria-labelledby="restore-partial-title">
            <strong id="restore-partial-title">Restauration partielle</strong>
            <p>{restorePartialDetails}</p>
            <label><input type="checkbox" bind:checked={restoreAllowPartial} /> Je confirme la restauration malgré ces absences.</label>
          </div>
        {/if}
        <div class="actions">
          <button
            class="button primary"
            type="button"
            onclick={restoreSelectedBackup}
            disabled={isRestoring || restoreTargetPassphrase.length < 12 || restoreTargetPassphrase !== restoreTargetConfirmation || !restoreReplaceConfirmed}
          >
            {isRestoring ? "Vérification et restauration…" : "Vérifier puis restaurer"}
          </button>
        </div>
      </section>
    {/if}

    {#if errorMessage}
      <div class="error-box" role="alert">{errorMessage}</div>
    {/if}

    {#if wipeMessage}
      <div class="wipe-box" role="status">{wipeMessage}</div>
    {/if}

    {#if isLoading}
      <p class="empty-state">Chargement des dossiers locaux...</p>
    {:else if cases.length === 0}
      <div class="empty-state">
        <strong>Aucun dossier local sauvegardé pour l'instant.</strong>
        <p>Commencez par importer le questionnaire reçu. La création manuelle reste disponible pour un test rapide.</p>
        <div class="empty-actions">
          <a class="button primary" href="/questionnaire-import">Importer un questionnaire</a>
          <a class="button" href="/app">Créer manuellement</a>
          <a class="button" href="/demo">Voir la démo</a>
        </div>
      </div>
    {:else}
      <section class="dashboard-strip" aria-label="Synthèse des dossiers locaux">
        <article>
          <span>Dossiers</span>
          <strong>{cases.length}</strong>
          <small>Repères non sensibles facultatifs</small>
        </article>
        <article>
          <span>Chiffrés</span>
          <strong>{encryptedCaseCount}</strong>
          <small>Déverrouillage individuel requis</small>
        </article>
        <article>
          <span>Mise à niveau</span>
          <strong>{migrationRequiredCount}</strong>
          <small>anciens dossiers à chiffrer avant lecture</small>
        </article>
        <article>
          <span>Confidentialité</span>
                  <strong>🔒</strong>
                  <small>contenu et titres métier masqués au repos</small>
        </article>
      </section>

      <section class="case-list" id="local-case-list" aria-label="Dossiers à déverrouiller">
        {#each cases as item}
          <article class="case-card controlled">
            <div class="case-head">
              <div>
                <p class="kpi">{item.localLabel || `Dossier · ${item.id.slice(-8)}`}</p>
                <h2>{item.requiresEncryptionMigration ? "Protection du dossier requise" : "Dossier protégé"}</h2>
                <p class="case-parties">
                  {item.requiresEncryptionMigration
                    ? "Ancien stockage en clair détecté. BLACKPROOF masque son contenu et exigera une nouvelle phrase secrète avant toute lecture."
                    : "Le titre, les parties, le questionnaire et le ProofPack ne sont pas lisibles sans la phrase secrète."}
                </p>
              </div>
              <div class="score-block"><span>Stockage</span><strong>🔒</strong></div>
            </div>
            <p>Dernière mise à jour : {new Date(item.updatedAt).toLocaleString("fr-FR")}</p>
            <div class="local-label-editor">
              <label for={`local-label-${item.id}`}>
                Repère local non sensible
                <input id={`local-label-${item.id}`} bind:value={item.localLabel} maxlength={MAX_LOCAL_CASE_LABEL_CHARS} placeholder="Ex. Fournisseur A : T3" />
              </label>
              <button class="button" type="button" onclick={() => saveLocalLabel(item)}>Enregistrer le repère</button>
              <small>Visible sans phrase secrète. Le titre métier et le contenu restent chiffrés.</small>
            </div>
            <details class="technical-id"><summary>Identifiant technique</summary><code>{item.id}</code></details>
            <div class="case-actions">
              <a class="button primary" href={`/app/case#id=${encodeURIComponent(item.id)}`}>
                {item.requiresEncryptionMigration ? "Chiffrer puis ouvrir" : "Déverrouiller et continuer"}
              </a>
              <button class="button danger" type="button" onclick={() => removeCase(item)}>Supprimer localement</button>
            </div>
          </article>
        {/each}
      </section>
    {/if}
  </div>
</section>

<style>
  .cases-shell {
    padding: clamp(3.8rem, 8vw, 6.5rem) 0 7rem;
    background: radial-gradient(circle at 8% 5%, rgba(129, 218, 203, 0.075), transparent 30rem);
  }

  .cases-panel {
    width: min(1120px, calc(100% - 2.5rem));
    margin: 0 auto;
    border: 0;
    border-radius: 0;
    padding: 0;
    background: transparent;
    box-shadow: none;
  }

  .security-note {
    border: 0;
    border-left: 2px solid var(--accent);
    border-radius: 0 12px 12px 0;
    padding: 0.95rem 1.1rem;
    margin: 1.5rem 0 1.25rem;
    color: var(--muted);
    background: var(--accent-soft);
  }

  .storage-persistence { display: grid; gap: 0.55rem; margin-top: 0.9rem; }
  .storage-persistence .button { justify-self: start; }
  .storage-persistence small { display: block; }

  .empty-state {
    color: var(--muted);
    border: 1px solid var(--line);
    border-radius: 20px;
    padding: 1.4rem;
    background: rgba(255, 255, 255, 0.025);
  }

  .empty-state strong {
    display: block;
    color: var(--text);
    margin-bottom: 0.45rem;
  }

  .empty-state p {
    margin: 0 0 1rem;
  }

  .empty-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
  }

  .case-list {
    display: grid;
    gap: 1rem;
    margin-top: 2rem;
    scroll-margin-top: 10rem;
  }

  .utility-actions {
    align-items: center;
    margin-top: 1rem;
    border-top: 1px solid var(--line);
    padding-top: 1rem;
  }

  .utility-actions > span {
    margin-right: 0.15rem;
    color: var(--muted-2);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .restore-panel {
    margin-top: 1rem;
    border: 1px solid rgba(121, 216, 200, 0.38);
    border-radius: 20px;
    padding: 1.4rem;
    background: rgba(121, 216, 200, 0.055);
  }

  .restore-head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
  }

  .restore-head h2,
  .restore-head p {
    margin: 0.25rem 0 0;
  }

  .restore-help {
    color: var(--muted);
  }

  .restore-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.85rem;
  }

  .restore-grid label {
    display: grid;
    gap: 0.4rem;
    color: var(--muted);
    font-weight: 750;
  }

  .restore-grid input {
    width: 100%;
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 0.75rem;
    background: var(--field);
    color: var(--text);
    font: inherit;
  }

  .restore-grid small {
    color: var(--muted-2);
    font-weight: 500;
  }

  .restore-confirm,
  .restore-risk label {
    display: flex;
    gap: 0.65rem;
    align-items: flex-start;
    margin-top: 1rem;
    color: var(--muted);
  }

  .restore-confirm input,
  .restore-risk input {
    flex: 0 0 auto;
    margin-top: 0.2rem;
  }

  .restore-risk {
    margin-top: 1rem;
    border: 1px solid rgba(213, 106, 96, 0.5);
    border-radius: 10px;
    padding: 0.85rem;
    color: var(--danger);
    background: var(--danger-soft);
  }

  .restore-risk p {
    margin: 0.4rem 0 0;
  }

  .dashboard-strip {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1px;
    margin-top: 2.2rem;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 18px;
    background: var(--line);
  }

  .dashboard-strip article {
    --metric-accent: var(--accent);
    border: 0;
    border-radius: 0;
    padding: 1.15rem;
    background: rgba(15, 21, 19, 0.96);
  }

  .dashboard-strip span,
  .dashboard-strip small {
    display: block;
    color: var(--muted);
  }

  .dashboard-strip strong {
    display: block;
    margin: 0.3rem 0;
    color: var(--metric-accent);
    font-size: 1.55rem;
    font-weight: 590;
  }

  .dashboard-strip article:nth-child(2) { --metric-accent: var(--accent-blue); }
  .dashboard-strip article:nth-child(3) { --metric-accent: var(--accent-violet); }
  .dashboard-strip article:nth-child(4) { --metric-accent: var(--accent-gold); }

  .case-card {
    border: 1px solid rgba(196, 218, 207, 0.11);
    border-radius: 20px;
    padding: 1.4rem;
    background: linear-gradient(145deg, rgba(21, 28, 26, 0.82), rgba(12, 17, 16, 0.76));
    box-shadow: 0 18px 54px rgba(0, 0, 0, 0.11);
  }

  .case-card.controlled {
    border-color: rgba(113, 191, 155, 0.45);
  }

  .case-head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
  }

  .case-head h2 {
    font-size: clamp(1.4rem, 3vw, 2rem);
    margin: 0;
  }

  .case-parties {
    margin: 0.4rem 0 0;
    color: var(--muted);
  }

  .score-block {
    min-width: 7.5rem;
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 0.75rem;
    text-align: right;
    background: rgba(255, 255, 255, 0.035);
  }

  .score-block span {
    display: block;
    color: var(--muted);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .score-block strong {
    color: var(--accent);
    font-size: 1.45rem;
    font-weight: 610;
  }

  .case-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
    margin-top: 1rem;
  }

  .local-label-editor {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 0.65rem;
    margin-top: 0.9rem;
  }

  .local-label-editor label {
    display: grid;
    gap: 0.4rem;
    color: var(--muted);
    font-weight: 750;
  }

  .local-label-editor input {
    width: 100%;
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 0.75rem;
    background: var(--field);
    color: var(--text);
    font: inherit;
  }

  .local-label-editor small {
    grid-column: 1 / -1;
    color: var(--muted-2);
  }

  .technical-id {
    margin-top: 0.75rem;
    color: var(--muted-2);
  }

  .technical-id code {
    overflow-wrap: anywhere;
  }

  .button.danger {
    border-color: rgba(213, 106, 96, 0.45);
    color: var(--danger);
  }

  .error-box {
    border: 1px solid rgba(213, 106, 96, 0.45);
    border-radius: 16px;
    padding: 1rem;
    margin-top: 1rem;
    color: var(--danger);
    background: var(--danger-soft);
  }

  @media (max-width: 760px) {
    .cases-shell {
      padding-top: 3rem;
    }

    .cases-panel {
      width: min(100% - 1.25rem, 1120px);
    }

    .dashboard-strip {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .case-head {
      display: grid;
    }

    .local-label-editor {
      grid-template-columns: 1fr;
    }

    .restore-grid {
      grid-template-columns: 1fr;
    }

    .score-block {
      width: 100%;
      text-align: left;
    }
  }

  @media (max-width: 520px) {
    .dashboard-strip {
      grid-template-columns: 1fr;
    }
  }
</style>
