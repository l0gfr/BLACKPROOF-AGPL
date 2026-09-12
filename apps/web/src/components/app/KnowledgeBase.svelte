<script lang="ts">
  import { onMount } from "svelte";
  import { reviseKnowledgeEntry, retireKnowledgeEntry, type KnowledgeEntry, type PersonalKnowledgeVault } from "@blackproof/core";
  import { buildKnowledgeBackup, captureKnowledgeVaultEpoch, knowledgeVaultExists, loadKnowledgeVault, restoreKnowledgeBackup, saveKnowledgeEntry, subscribeToKnowledgeVaultWipe } from "../../lib/knowledge-vault";
  import { subscribeToLocalStorageWipe } from "../../lib/local-db";
  import { assertLocalPassphrase } from "../../lib/local-encryption";
  import { subscribeToSensitivePageLock, type SensitivePageLockReason } from "../../lib/sensitive-page-lock";

  let vault: PersonalKnowledgeVault | null = null;
  let passphrase = "";
  let exists = false;
  let isLoading = true;
  let errorMessage = "";
  let statusMessage = "";
  let restoreFileInput: HTMLInputElement;
  let unlockPassphrase = "";
  let unlockConfirmation = "";
  let selectedRestoreFile: File | null = null;
  let restoreBackupPassphrase = "";
  let restoreCurrentPassphrase = "";
  let isRestoring = false;
  let editingEntryId = "";
  let revisionAnswerText = "";
  let revisionReservation = "";
  let revisionApplicability = "";
  let revisionApprovedBy = "";
  let revisionReviewDate = "";
  let operationGeneration = 0;

  $: approvedEntries = vault?.entries.filter((entry) => entry.status === "approved") ?? [];
  $: retiredEntries = vault?.entries.filter((entry) => entry.status === "retired") ?? [];
  $: reviewDueCount = approvedEntries.filter((entry) => entry.reviewAt && Date.parse(entry.reviewAt) <= Date.now()).length;

  function lockSensitiveState(reason: SensitivePageLockReason | "manual") {
    operationGeneration += 1;
    if (restoreFileInput) restoreFileInput.value = "";
    vault = null;
    passphrase = "";
    unlockPassphrase = "";
    unlockConfirmation = "";
    selectedRestoreFile = null;
    restoreBackupPassphrase = "";
    restoreCurrentPassphrase = "";
    isRestoring = false;
    editingEntryId = "";
    revisionAnswerText = "";
    revisionReservation = "";
    revisionApplicability = "";
    revisionApprovedBy = "";
    revisionReviewDate = "";
    errorMessage = "";
    statusMessage = reason === "manual"
      ? "Coffre verrouillé : les données déchiffrées et la phrase secrète ont été effacées de cette page."
      : "Coffre verrouillé automatiquement après inactivité ou passage prolongé en arrière-plan.";
  }

  onMount(() => {
    let active = true;
    const generation = operationGeneration;
    const handleWipe = () => {
      operationGeneration += 1;
      if (restoreFileInput) restoreFileInput.value = "";
      vault = null;
      passphrase = "";
      unlockPassphrase = "";
      unlockConfirmation = "";
      selectedRestoreFile = null;
      restoreBackupPassphrase = "";
      restoreCurrentPassphrase = "";
      editingEntryId = "";
      exists = false;
      statusMessage = "";
      errorMessage = "Panic Wipe détecté : le coffre déverrouillé et la phrase secrète ont été effacés de cette page.";
    };
    const unsubscribeFromKnowledgeWipe = subscribeToKnowledgeVaultWipe(handleWipe);
    const unsubscribeFromStorageWipe = subscribeToLocalStorageWipe(handleWipe);
    const unsubscribeFromSensitivePageLock = subscribeToSensitivePageLock((reason) => lockSensitiveState(reason));
    void knowledgeVaultExists().then((value) => {
      if (active && generation === operationGeneration) exists = value;
    }).finally(() => {
      if (active && generation === operationGeneration) isLoading = false;
    });
    return () => {
      active = false;
      vault = null;
      passphrase = "";
      unsubscribeFromKnowledgeWipe();
      unsubscribeFromStorageWipe();
      unsubscribeFromSensitivePageLock();
    };
  });

  async function unlockOrCreate() {
    const generation = operationGeneration;
    errorMessage = "";
    statusMessage = "";
    try {
      const first = unlockPassphrase;
      if (!first) return;
      if (!exists) assertLocalPassphrase(first);
      if (!exists && unlockConfirmation !== first) throw new Error("Les phrases secrètes ne correspondent pas.");
      const loaded = await loadKnowledgeVault(first);
      if (generation !== operationGeneration) return;
      passphrase = first;
      vault = loaded;
      unlockPassphrase = "";
      unlockConfirmation = "";
      statusMessage = exists ? "Base personnelle déverrouillée pour cette page." : "Base personnelle initialisée en mémoire. La première entrée créera le coffre chiffré.";
    } catch (error) {
      if (generation !== operationGeneration) return;
      errorMessage = error instanceof Error ? error.message : "Impossible d’ouvrir la base personnelle.";
    }
  }

  async function retire(entry: KnowledgeEntry) {
    const generation = operationGeneration;
    if (!vault || !passphrase || !window.confirm("Retirer cette formulation des suggestions futures ? Les dossiers qui l’ont déjà utilisée ne seront pas modifiés.")) return;
    try {
      const retired = await retireKnowledgeEntry(entry);
      if (generation !== operationGeneration) return;
      const saved = await saveKnowledgeEntry(retired, passphrase, vault.revisionId);
      if (generation !== operationGeneration) return;
      vault = saved;
      exists = true;
      statusMessage = "Entrée retirée par une nouvelle révision immuable.";
    } catch (error) {
      if (generation !== operationGeneration) return;
      errorMessage = error instanceof Error ? error.message : "Impossible de retirer cette entrée.";
    }
  }

  function beginRevision(entry: KnowledgeEntry) {
    editingEntryId = entry.id;
    revisionAnswerText = entry.answerText;
    revisionReservation = entry.answerReservation;
    revisionApplicability = entry.applicabilityNotes;
    revisionApprovedBy = entry.approvedByLabel ?? "";
    revisionReviewDate = entry.reviewAt?.slice(0, 10) ?? "";
    errorMessage = "";
  }

  function cancelRevision() {
    editingEntryId = "";
    revisionAnswerText = "";
    revisionReservation = "";
    revisionApplicability = "";
    revisionApprovedBy = "";
    revisionReviewDate = "";
  }

  async function revise(entry: KnowledgeEntry) {
    const generation = operationGeneration;
    if (!vault || !passphrase) return;
    try {
      const revised = await reviseKnowledgeEntry(entry, {
        answerText: revisionAnswerText,
        answerReservation: revisionReservation,
        applicabilityNotes: revisionApplicability,
        approvedByLabel: revisionApprovedBy,
        reviewAt: revisionReviewDate ? `${revisionReviewDate}T00:00:00.000Z` : undefined,
      });
      if (generation !== operationGeneration) return;
      const saved = await saveKnowledgeEntry(revised, passphrase, vault.revisionId);
      if (generation !== operationGeneration) return;
      vault = saved;
      cancelRevision();
      statusMessage = "Nouvelle révision approuvée localement et empreintée.";
    } catch (error) {
      if (generation !== operationGeneration) return;
      errorMessage = error instanceof Error ? error.message : "Impossible de réviser cette entrée.";
    }
  }

  async function downloadBackup() {
    const generation = operationGeneration;
    if (!passphrase) return;
    try {
      const blob = await buildKnowledgeBackup(passphrase);
      if (generation !== operationGeneration) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "blackproof-personal-knowledge-backup.json";
      link.rel = "noopener";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      if (generation !== operationGeneration) return;
      errorMessage = error instanceof Error ? error.message : "Impossible de sauvegarder la base.";
    }
  }

  function selectRestoreBackup(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    selectedRestoreFile = file;
    restoreBackupPassphrase = "";
    restoreCurrentPassphrase = passphrase;
    errorMessage = "";
  }

  function cancelRestore() {
    selectedRestoreFile = null;
    restoreBackupPassphrase = "";
    restoreCurrentPassphrase = "";
    isRestoring = false;
    if (restoreFileInput) restoreFileInput.value = "";
  }

  async function restoreBackup() {
    const generation = operationGeneration;
    const file = selectedRestoreFile;
    if (!file || isRestoring) return;
    isRestoring = true;
    const operationEpoch = await captureKnowledgeVaultEpoch();
    if (generation !== operationGeneration) return;
    try {
      const backupPassphrase = restoreBackupPassphrase;
      if (!backupPassphrase) return;
      if (generation !== operationGeneration) return;
      const target = passphrase || restoreCurrentPassphrase;
      if (exists && !target) throw new Error("Saisissez la phrase actuelle du coffre pour fusionner sans écrasement.");
      if (generation !== operationGeneration) return;
      const restored = await restoreKnowledgeBackup(file, backupPassphrase, target || undefined, operationEpoch);
      if (generation !== operationGeneration) return;
      passphrase = target || backupPassphrase;
      vault = restored;
      exists = true;
      statusMessage = `Sauvegarde fusionnée : ${restored.entries.length} entrée(s), aucun conflit silencieux.`;
      cancelRestore();
    } catch (error) {
      if (generation !== operationGeneration) return;
      errorMessage = error instanceof Error ? error.message : "Impossible de restaurer la base.";
    } finally {
      if (generation === operationGeneration) isRestoring = false;
    }
  }
</script>

<section class="knowledge-shell" data-blackproof-knowledge-ready={isLoading ? undefined : "true"}>
  <div class="knowledge-panel">
    <p class="eyebrow">Coffre personnel local v1</p>
    <h1>Réponses approuvées</h1>
    <p class="lead">Réutilisez des formulations approuvées localement sans les valider automatiquement pour un nouveau client.</p>

    <div class="security-note">
      Le coffre est chiffré par phrase secrète et reste dans ce navigateur. « Approuvée » signifie marquée localement comme réutilisable ; BLACKPROOF n’authentifie pas l’identité de l’approbateur.
    </div>

    <div class="actions">
      {#if !vault}<a class="button primary" href="#knowledge-access">{exists ? "Déverrouiller la base" : "Initialiser la base"}</a>{/if}
      <a class="button" href="/app/cases">Ouvrir les dossiers</a>
      {#if vault}<button class="button" type="button" onclick={downloadBackup} disabled={vault.entries.length === 0}>Sauvegarder la base</button>{/if}
      {#if vault}<button class="button" type="button" onclick={() => lockSensitiveState("manual")}>Verrouiller maintenant</button>{/if}
      <label class="button">Restaurer / fusionner<input bind:this={restoreFileInput} class="sr-only" type="file" accept=".json,application/json" onchange={selectRestoreBackup} /></label>
    </div>

    {#if !vault}
      <section class="inline-form" id="knowledge-access" aria-labelledby="knowledge-access-title">
        <p class="eyebrow">Action requise</p>
        <h2 id="knowledge-access-title">{exists ? "Déverrouiller le coffre." : "Protéger le nouveau coffre."}</h2>
        <p>{exists ? "La phrase reste uniquement en mémoire dans cette page." : "La première formulation enregistrée créera le coffre chiffré. BLACKPROOF ne peut pas récupérer cette phrase."}</p>
        <div class="form-grid">
          <label>
            <span>Phrase secrète de la base personnelle</span>
            <input type="password" bind:value={unlockPassphrase} autocomplete={exists ? "current-password" : "new-password"} />
          </label>
          {#if !exists}
            <label>
              <span>Confirmer la phrase secrète de la base personnelle</span>
              <input type="password" bind:value={unlockConfirmation} autocomplete="new-password" />
            </label>
          {/if}
        </div>
        <button class="button primary" type="button" onclick={unlockOrCreate} disabled={unlockPassphrase.length < 12 || (!exists && unlockConfirmation !== unlockPassphrase)}>{exists ? "Déverrouiller la base" : "Initialiser la base"}</button>
      </section>
    {/if}

    {#if selectedRestoreFile}
      <section class="inline-form" aria-labelledby="knowledge-restore-title">
        <p class="eyebrow">Restauration sélectionnée</p>
        <h2 id="knowledge-restore-title">Vérifier les deux coffres avant fusion.</h2>
        <p><strong>Fichier :</strong> {selectedRestoreFile.name}. Aucune entrée existante n’est écrasée silencieusement.</p>
        <div class="form-grid">
          <label>
            <span>Phrase secrète de la sauvegarde Knowledge</span>
            <input type="password" bind:value={restoreBackupPassphrase} autocomplete="current-password" />
          </label>
          {#if exists && !passphrase}
            <label>
              <span>Phrase secrète du coffre personnel actuel</span>
              <input type="password" bind:value={restoreCurrentPassphrase} autocomplete="current-password" />
            </label>
          {/if}
        </div>
        <div class="actions">
          <button class="button primary" type="button" onclick={restoreBackup} disabled={isRestoring || !restoreBackupPassphrase || (exists && !passphrase && !restoreCurrentPassphrase)}>{isRestoring ? "Vérification…" : "Vérifier puis fusionner"}</button>
          <button class="button" type="button" onclick={cancelRestore} disabled={isRestoring}>Annuler</button>
        </div>
      </section>
    {/if}

    {#if errorMessage}<div class="error-box" role="alert">{errorMessage}</div>{/if}
    {#if statusMessage}<div class="status-box" role="status">{statusMessage}</div>{/if}

    {#if vault}
      <section class="metrics" aria-label="Synthèse de la base personnelle">
        <article><span>Approuvées localement</span><strong>{approvedEntries.length}</strong></article>
        <article><span>Revue échue</span><strong>{reviewDueCount}</strong></article>
        <article><span>Retirées</span><strong>{retiredEntries.length}</strong></article>
      </section>

      {#if approvedEntries.length === 0}
        <div class="empty-state"><strong>Aucune réponse approuvée.</strong><p>Ouvrez un dossier, validez une réponse puis utilisez « Ajouter à la base personnelle ».</p></div>
      {:else}
        <section class="entry-list">
          {#each approvedEntries as entry}
            <article class="entry-card">
              <div class="entry-head"><div><small>{entry.category} · révision {entry.revisionId}</small><h2>{entry.canonicalQuestion}</h2></div><span>{entry.reviewAt && Date.parse(entry.reviewAt) <= Date.now() ? "Revue requise" : "Approuvée localement"}</span></div>
              <p>{entry.answerText}</p>
              {#if entry.answerReservation}<p class="reservation"><strong>Réserve :</strong> {entry.answerReservation}</p>{/if}
              {#if entry.applicabilityNotes}<p><strong>Périmètre :</strong> {entry.applicabilityNotes}</p>{/if}
              <div class="tags">{#each entry.mappedRequirements as requirement}<span>{requirement}</span>{/each}</div>
              <small>Déclarée par {entry.approvedByLabel ?? "utilisateur local non renseigné"} le {new Date(entry.approvedAt).toLocaleString("fr-FR")} · empreinte {entry.fingerprint}</small>
              <div class="actions"><button class="button" type="button" onclick={() => beginRevision(entry)}>Créer une nouvelle révision</button><button class="button danger" type="button" onclick={() => retire(entry)}>Retirer des suggestions</button></div>
              {#if editingEntryId === entry.id}
                <section class="inline-form revision-form" aria-label={`Nouvelle révision de ${entry.canonicalQuestion}`}>
                  <p>Relisez la formulation et son périmètre ensemble. La révision précédente reste dans l’historique immuable.</p>
                  <label><span>Nouvelle formulation approuvée localement</span><textarea bind:value={revisionAnswerText} rows="4"></textarea></label>
                  <label><span>Réserve réutilisable éventuelle</span><textarea bind:value={revisionReservation} rows="2"></textarea></label>
                  <label><span>Périmètre d’applicabilité</span><textarea bind:value={revisionApplicability} rows="2"></textarea></label>
                  <div class="form-grid">
                    <label><span>Libellé de l’approbateur local</span><input bind:value={revisionApprovedBy} /></label>
                    <label><span>Prochaine revue</span><input type="date" bind:value={revisionReviewDate} /></label>
                  </div>
                  <div class="actions"><button class="button primary" type="button" onclick={() => revise(entry)} disabled={!revisionAnswerText.trim()}>Enregistrer la nouvelle révision</button><button class="button" type="button" onclick={cancelRevision}>Annuler</button></div>
                </section>
              {/if}
            </article>
          {/each}
        </section>
      {/if}
    {/if}
  </div>
</section>

<style>
  .knowledge-shell { padding: 4rem 0; }
  .knowledge-panel { width: min(980px, calc(100% - 2rem)); margin: 0 auto; border: 1px solid var(--line); border-radius: 14px; padding: 1.35rem; background: rgba(12, 16, 17, .96); box-shadow: var(--shadow-soft); }
  .actions, .tags { display: flex; flex-wrap: wrap; gap: .65rem; margin-top: 1rem; }
  .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: .75rem; margin: 1.2rem 0; }
  .metrics article, .entry-card { border: 1px solid var(--line); border-radius: 12px; padding: 1rem; background: rgba(255,255,255,.025); }
  .metrics span, .metrics strong { display: block; }
  .metrics strong { color: var(--accent); font-size: 1.5rem; }
  .entry-list { display: grid; gap: .9rem; }
  .entry-head { display: flex; justify-content: space-between; gap: 1rem; }
  .entry-head h2 { margin: .25rem 0; font-size: 1.05rem; }
  .entry-head > span, .tags span { border: 1px solid var(--line); border-radius: 999px; padding: .25rem .5rem; color: var(--accent); font-size: .72rem; }
  .entry-card > small { display: block; color: var(--muted); overflow-wrap: anywhere; }
  .reservation { color: var(--warning); }
  .inline-form { margin-top: 1rem; border: 1px solid rgba(121,216,200,.35); border-radius: 12px; padding: 1rem; background: var(--accent-soft); scroll-margin-top: 8rem; }
  .inline-form h2 { margin: .2rem 0; font-size: 1.2rem; }
  .inline-form p { color: var(--muted); }
  .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .8rem; margin-bottom: 1rem; }
  .inline-form label { display: grid; gap: .4rem; margin-top: .7rem; color: var(--muted); font-weight: 750; }
  .inline-form input, .inline-form textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--line); border-radius: 10px; padding: .75rem; background: var(--field); color: var(--text); font: inherit; }
  .revision-form { border-color: var(--line); background: rgba(255,255,255,.025); }
  @media (max-width: 700px) { .metrics, .form-grid { grid-template-columns: 1fr; } .entry-head { display: block; } }
</style>
