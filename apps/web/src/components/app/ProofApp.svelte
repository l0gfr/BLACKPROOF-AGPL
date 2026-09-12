<script lang="ts">
  import { onMount } from "svelte";

  import {
    SECURITY_LIMITS,
    SecurityValidationError,
    createProofCaseFromQuestionnaire,
  } from "@blackproof/core";

  import { assertLocalPassphrase } from "../../lib/local-encryption";
  import { MAX_LOCAL_CASE_LABEL_CHARS, saveLocalCase, subscribeToLocalStorageWipe } from "../../lib/local-db";
  import JourneyGuide from "./JourneyGuide.svelte";

  export let onCaseCreated: ((caseId: string, passphrase: string) => void) | undefined = undefined;

  let caseTitle = "Questionnaire cyber fournisseur";
  let companyName = "";
  let clientName = "";
  let localLabel = "";
  let errorMessage = "";
  let isCreatingCase = false;
  let isHydrated = false;
  let passphrase = "";
  let passphraseConfirmation = "";
  let operationGeneration = 0;

  $: passphraseReady = passphrase.length >= 12 && passphraseConfirmation === passphrase;
  $: questionnaireReady = rawQuestionnaire.trim().length > 0;
  $: guideTitle = !passphraseReady
    ? "Choisissez et confirmez la phrase secrète du dossier."
    : !questionnaireReady
      ? "Collez le questionnaire à analyser."
      : "Lancez l’analyse pour ouvrir l’éditeur.";
  $: guideReason = !passphraseReady
    ? "Le questionnaire doit être chiffré avant sa première écriture locale."
    : !questionnaireReady
      ? "Le moteur a besoin du texte source pour créer les questions, preuves attendues et alertes."
      : "L’analyse crée le dossier local et vous conduit directement aux réponses et preuves à compléter.";
  $: guideActionHref = !passphraseReady
    ? "#case-secrets"
    : !questionnaireReady
      ? "#questionnaire-content"
      : "#create-case-action";
  $: guideActionLabel = !passphraseReady
    ? "Aller à la protection"
    : !questionnaireReady
      ? "Aller au questionnaire"
      : "Aller au bouton d’analyse";
  $: guideSteps = [
    { label: "Protéger", state: passphraseReady ? "done" as const : "current" as const },
    { label: "Décrire", state: passphraseReady ? "current" as const : "upcoming" as const },
    { label: "Analyser", state: passphraseReady && questionnaireReady ? "current" as const : "upcoming" as const },
    { label: "Compléter", state: "upcoming" as const },
  ];

  onMount(() => {
    isHydrated = true;
    return subscribeToLocalStorageWipe(() => {
      operationGeneration += 1;
      caseTitle = "";
      companyName = "";
      clientName = "";
      localLabel = "";
      rawQuestionnaire = "";
      passphrase = "";
      passphraseConfirmation = "";
      isHydrated = false;
      errorMessage = "Panic Wipe détecté : le formulaire et ses secrets ont été effacés. Rechargez la page pour recommencer.";
    });
  });

  let rawQuestionnaire = `1. Avez-vous activé le MFA pour les comptes administrateurs ?
2. Disposez-vous d'une procédure de sauvegarde documentée ?
3. Testez-vous régulièrement la restauration des sauvegardes ?
4. Avez-vous une procédure de réponse à incident ?
5. Disposez-vous d'un registre des fournisseurs critiques ?
6. Réalisez-vous des scans de vulnérabilités ou un suivi des correctifs ?
7. Collectez-vous et conservez-vous les journaux de sécurité ?
8. Disposez-vous d'un PRA ou PCA documenté ?`;

  async function createCaseAndOpenEditor() {
    const generation = operationGeneration;
    if (isCreatingCase) return;

    errorMessage = "";
    isCreatingCase = true;

    try {
      assertLocalPassphrase(passphrase);
      if (passphraseConfirmation !== passphrase) throw new Error("Les phrases secrètes ne correspondent pas.");
      const result = await createProofCaseFromQuestionnaire(rawQuestionnaire, {
        title: caseTitle,
        companyName,
        clientName,
      });
      if (generation !== operationGeneration) return;
      const record = await saveLocalCase({
        questionnaire: rawQuestionnaire,
        proofpack: result.proofpack,
        passphrase,
        localLabel,
      });
      if (generation !== operationGeneration) return;

      if (onCaseCreated) onCaseCreated(record.id, passphrase);
      else window.location.assign(`/app/case#id=${encodeURIComponent(record.id)}`);
    } catch (error) {
      if (generation !== operationGeneration) return;
      if (error instanceof SecurityValidationError) {
        errorMessage = `${error.code}: ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = "Erreur inconnue pendant la création du dossier local.";
      }
      if (generation === operationGeneration) isCreatingCase = false;
    }
  }
</script>

<section
  class="app-shell"
  data-blackproof-component="proof-app"
  data-blackproof-hydrated={isHydrated ? "true" : "false"}
>
  <div class="app-panel">
    <div class="page-intro">
      <div class="intro-copy">
        <p class="eyebrow">Nouveau dossier</p>
        <h1>Créez votre dossier, simplement.</h1>
        <p class="lead">
          Importez le questionnaire, protégez-le avec votre phrase secrète, puis travaillez dans un seul espace.
          Vos réponses et vos références restent dans le stockage local de ce navigateur,
          jusqu’à ce que vous téléchargiez ou transmettiez volontairement un export.
        </p>
      </div>

      <ul class="assurance-list" aria-label="Garanties du dossier local">
        <li><span aria-hidden="true">01</span><strong>Local</strong><small>Aucun questionnaire envoyé</small></li>
        <li><span aria-hidden="true">02</span><strong>Chiffré</strong><small>Avant la première sauvegarde</small></li>
        <li><span aria-hidden="true">03</span><strong>Continu</strong><small>Reprenez le dossier plus tard</small></li>
      </ul>
    </div>

    <JourneyGuide
      title={guideTitle}
      reason={guideReason}
      actionLabel={guideActionLabel}
      actionHref={guideActionHref}
      steps={guideSteps}
    />

    <div class="security-note">
      <strong>Vos données restent ici.</strong> L’analyse, le chiffrement et la sauvegarde se font dans ce navigateur.
      Aucun questionnaire ni élément de preuve n’est envoyé à BLACKPROOF.
    </div>

    <section class="form-section" id="case-secrets" aria-labelledby="case-secrets-title">
      <div class="form-section-head">
        <span>1</span>
        <div>
          <h2 id="case-secrets-title">Protéger le dossier</h2>
          <p>Cette phrase chiffre le contenu local. BLACKPROOF ne la stocke pas et ne peut pas la récupérer.</p>
        </div>
      </div>
      <div class="form-grid secure-fields">
        <label>
          <span>Phrase secrète du dossier</span>
          <input type="password" bind:value={passphrase} minlength="12" autocomplete="new-password" disabled={!isHydrated || isCreatingCase} />
        </label>
        <label>
          <span>Confirmer la phrase secrète</span>
          <input type="password" bind:value={passphraseConfirmation} minlength="12" autocomplete="new-password" disabled={!isHydrated || isCreatingCase} />
        </label>
      </div>
      <p class="input-limit">16 caractères ou plus recommandés. Entre 12 et 15 caractères, combinez au moins trois types de caractères.</p>
    </section>

    <section class="form-section" aria-labelledby="case-context-title">
      <div class="form-section-head">
        <span>2</span>
        <div>
          <h2 id="case-context-title">Nommer le dossier</h2>
          <p>Le nom sert à le retrouver. L’entreprise et le client restent optionnels.</p>
        </div>
      </div>
      <div class="form-grid">
        <label>
          <span>Repère local visible avant déverrouillage</span>
          <input bind:value={localLabel} maxlength={MAX_LOCAL_CASE_LABEL_CHARS} placeholder="Ex. Fournisseur A : T3" disabled={!isHydrated || isCreatingCase} />
          <small>Facultatif. Utilisez un libellé non sensible : ce seul repère reste lisible dans l’inventaire chiffré.</small>
        </label>

        <label>
          <span>Nom du dossier</span>
          <input bind:value={caseTitle} maxlength={SECURITY_LIMITS.MAX_CASE_TITLE_CHARS} disabled={!isHydrated || isCreatingCase} />
        </label>

        <label>
          <span>Entreprise</span>
          <input bind:value={companyName} maxlength={SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS} placeholder="Optionnel" disabled={!isHydrated || isCreatingCase} />
        </label>

        <label>
          <span>Client demandeur</span>
          <input bind:value={clientName} maxlength={SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS} placeholder="Optionnel" disabled={!isHydrated || isCreatingCase} />
        </label>
      </div>
    </section>

    <section class="form-section" id="questionnaire-content" aria-labelledby="questionnaire-content-title">
      <div class="form-section-head">
        <span>3</span>
        <div>
          <h2 id="questionnaire-content-title">Vérifier le questionnaire</h2>
          <p>Une question par ligne suffit. Retirez les secrets et les preuves brutes inutiles avant l’analyse.</p>
        </div>
      </div>
      <label class="questionnaire-input">
        <span>Questionnaire brut</span>
        <textarea
          bind:value={rawQuestionnaire}
          rows="12"
          maxlength={SECURITY_LIMITS.MAX_QUESTIONNAIRE_CHARS}
          spellcheck="false"
          disabled={!isHydrated || isCreatingCase}
        ></textarea>
      </label>

      <p class="input-limit">
        Limite moteur : {SECURITY_LIMITS.MAX_QUESTIONNAIRE_CHARS} caractères,
        {SECURITY_LIMITS.MAX_QUESTIONS} questions,
        {SECURITY_LIMITS.MAX_LINE_CHARS} caractères par ligne.
      </p>
    </section>

    {#if errorMessage}
      <div class="error-box" role="alert">{errorMessage}</div>
    {/if}

    {#if isCreatingCase}
      <div class="status-box" role="status">
        Analyse, création du dossier local et ouverture de l’éditeur en cours…
      </div>
    {/if}

    <div class="actions" id="create-case-action">
      <button class="button primary" type="button" onclick={createCaseAndOpenEditor} disabled={!isHydrated || isCreatingCase || passphrase.length < 12 || passphraseConfirmation !== passphrase}>
        {isCreatingCase ? "Création du dossier…" : "Analyser et ouvrir l’éditeur"}
      </button>
      <a class="button" href="/app/cases">Voir les dossiers locaux</a>
    </div>
  </div>
</section>

<style>
  .app-shell {
    position: relative;
    overflow: hidden;
    padding: clamp(3.8rem, 8vw, 6.8rem) 0 7rem;
    background:
      radial-gradient(circle at 9% 3%, rgba(129, 218, 203, 0.08), transparent 30rem),
      radial-gradient(circle at 96% 28%, rgba(136, 205, 160, 0.045), transparent 26rem);
  }

  .app-panel {
    width: min(1120px, calc(100% - 2.5rem));
    margin: 0 auto;
    border: 0;
    border-radius: 0;
    padding: 0;
    background: transparent;
    box-shadow: none;
  }

  .page-intro {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.55fr);
    align-items: end;
    gap: clamp(2rem, 6vw, 5rem);
    margin-bottom: clamp(2.3rem, 5vw, 4rem);
  }

  .intro-copy h1 {
    max-width: 720px;
    margin: 0.85rem 0 1.2rem;
    font-size: clamp(2.35rem, 4.15vw, 3.65rem);
    font-weight: 400;
    line-height: 1.06;
    letter-spacing: -0.032em;
    text-wrap: balance;
  }

  .intro-copy .lead {
    max-width: 700px;
    margin: 0;
    color: #b1bbb4;
    line-height: 1.72;
  }

  .assurance-list {
    display: grid;
    gap: 0;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .assurance-list li {
    --assurance-accent: var(--accent);
    display: grid;
    grid-template-columns: 2rem 1fr;
    gap: 0.08rem 0.7rem;
    padding: 0.85rem 0;
    border-bottom: 1px solid var(--line);
  }

  .assurance-list li:first-child {
    border-top: 1px solid var(--line);
  }

  .assurance-list span {
    grid-row: 1 / 3;
    color: var(--assurance-accent);
    font-family: var(--font-mono);
    font-size: 0.66rem;
    line-height: 1.7;
  }

  .assurance-list strong,
  .assurance-list small {
    display: block;
  }

  .assurance-list li:nth-child(2) {
    --assurance-accent: var(--accent-violet);
  }

  .assurance-list li:nth-child(3) {
    --assurance-accent: var(--accent-gold);
  }

  .assurance-list strong {
    color: var(--text);
    font-size: 0.88rem;
    font-weight: 640;
  }

  .assurance-list small {
    color: var(--muted);
    font-size: 0.76rem;
  }

  .security-note,
  .status-box,
  .error-box {
    border: 0;
    border-left: 2px solid var(--accent);
    border-radius: 0 12px 12px 0;
    padding: 0.95rem 1.1rem;
    margin: 1.3rem 0 2rem;
    color: var(--muted);
    background: linear-gradient(90deg, rgba(129, 218, 203, 0.07), rgba(129, 218, 203, 0.018));
  }

  .security-note strong {
    color: var(--text);
  }

  .error-box {
    border-left-color: var(--danger);
    color: var(--danger);
    background: var(--danger-soft);
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.05rem;
    margin-top: 1.35rem;
  }

  .form-section {
    --section-accent: var(--accent);
    position: relative;
    overflow: hidden;
    margin-top: 1.15rem;
    scroll-margin-top: 10rem;
    border: 1px solid rgba(196, 218, 207, 0.11);
    border-radius: 22px;
    padding: clamp(1.25rem, 3vw, 1.75rem);
    background: linear-gradient(145deg, rgba(21, 28, 26, 0.82), rgba(12, 17, 16, 0.76));
    box-shadow: 0 18px 55px rgba(0, 0, 0, 0.12);
  }

  .form-section::before {
    position: absolute;
    top: -1px;
    left: 1.75rem;
    width: 4.5rem;
    height: 2px;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--section-accent), transparent);
    content: "";
  }

  .form-section:nth-of-type(2) {
    --section-accent: var(--accent-blue);
  }

  .form-section:nth-of-type(3) {
    --section-accent: var(--accent-violet);
  }

  .form-section .form-grid {
    margin-top: 1rem;
  }

  .form-section-head {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
  }

  .form-section-head > span {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    border: 0;
    border-radius: 11px;
    color: var(--section-accent);
    background: color-mix(in srgb, var(--section-accent) 9%, transparent);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    font-weight: 760;
  }

  .form-section-head h2 {
    margin: 0;
    font-size: clamp(1.22rem, 2vw, 1.52rem);
    font-weight: 500;
    letter-spacing: -0.018em;
  }

  .form-section-head p {
    margin: 0.35rem 0 0;
    color: var(--muted);
    line-height: 1.55;
  }

  label {
    display: grid;
    gap: 0.45rem;
    color: var(--muted);
    font-size: 0.88rem;
    font-weight: 610;
  }

  input,
  textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--line);
    min-height: 3.25rem;
    border-radius: 12px;
    padding: 0.9rem 1rem;
    background: rgba(7, 11, 11, 0.72);
    color: var(--text);
    font: inherit;
  }

  textarea {
    resize: vertical;
    line-height: 1.5;
    font-family: var(--font-body);
  }

  input:disabled,
  textarea:disabled {
    opacity: 0.68;
    cursor: wait;
  }

  .questionnaire-input {
    margin-top: 1rem;
  }

  .input-limit {
    color: var(--muted);
    font-size: 0.79rem;
    line-height: 1.5;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
    margin-top: 1.5rem;
    scroll-margin-top: 10rem;
  }

  .secure-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 760px) {
    .app-shell {
      padding-top: 3rem;
    }

    .app-panel {
      width: min(100% - 1.25rem, 1120px);
    }

    .page-intro {
      grid-template-columns: 1fr;
      align-items: start;
      gap: 1.8rem;
    }

    .intro-copy h1 {
      font-size: clamp(2.1rem, 9vw, 2.9rem);
    }

    .form-grid {
      grid-template-columns: 1fr;
    }

    .form-section-head {
      gap: 0.75rem;
    }
  }
</style>
