<script lang="ts">
  import { onMount } from "svelte";

  import {
    SECURITY_LIMITS,
    SecurityValidationError,
    classifyQuestionnaireImportFile,
    createProofCaseFromQuestionnaire,
    importQuestionnaireCsv,
    importQuestionnaireText,
    importQuestionnaireTsv,
    sha256Hex,
    type QuestionnaireImportKind,
    type QuestionnaireImportResult,
    type ProofPackSourceImport,
  } from "@blackproof/core";

  import { DEMO_SUPPLIER_QUESTIONNAIRE_CSV } from "../../lib/demo-assets";
  import { assertLocalPassphrase } from "../../lib/local-encryption";
  import { MAX_LOCAL_CASE_LABEL_CHARS, saveLocalCase, subscribeToLocalStorageWipe } from "../../lib/local-db";
  import { XLSX_IMPORT_LIMITS, XLSX_MIME_TYPE } from "../../lib/xlsx-contract";
  import { preflightXlsxFile } from "../../lib/xlsx-preflight";
  import type { XlsxAnalysisResult } from "../../lib/xlsx-analysis";
  import { analyzeXlsxInWorker } from "../../lib/xlsx-worker-client";
  import JourneyGuide from "./JourneyGuide.svelte";

  export let onCaseCreated: ((caseId: string, passphrase: string) => void) | undefined = undefined;

  let kind: QuestionnaireImportKind = "csv";
  let rawInput = "";

  let result: QuestionnaireImportResult | null = null;
  let errorMessage = "";
  let statusMessage = "";
  let importedFilename = "";
  let originalFileSha256 = "";
  let isCreatingCase = false;
  let isLoadingDemo = false;
  let isParsingXlsx = false;
  let isHydrated = false;
  let xlsxAnalysis: XlsxAnalysisResult | null = null;
  let selectedXlsxSheet = "";
  let xlsxConfirmed = false;
  let xlsxMimeWarning = "";
  let fileInput: HTMLInputElement;
  let operationGeneration = 0;
  let passphrase = "";
  let passphraseConfirmation = "";
  let localLabel = "";

  $: guideTitle = isParsingXlsx
    ? "Vérification du fichier en cours…"
    : xlsxAnalysis && !xlsxConfirmed
      ? "Vérifiez la feuille retenue."
      : result?.questionCount
        ? "Vérifiez les questions détectées."
        : "Ajoutez le questionnaire reçu.";
  $: guideReason = isParsingXlsx
    ? "BLACKPROOF contrôle sa structure sans exécuter les formules."
    : xlsxAnalysis && !xlsxConfirmed
      ? "Cette confirmation évite de partir de la mauvaise feuille."
      : result?.questionCount
        ? "Si la liste est correcte, protégez le dossier puis commencez les réponses."
        : "Le fichier reste dans ce navigateur et n’est envoyé à aucun serveur.";
  $: guideActionLabel = isParsingXlsx
    ? "Vérification en cours"
    : xlsxAnalysis && !xlsxConfirmed
      ? "Voir la feuille"
      : result?.questionCount
        ? "Protéger le dossier"
        : "Choisir un fichier";
  $: guideActionHref = xlsxAnalysis && !xlsxConfirmed
    ? "#xlsx-review"
    : result?.questionCount
      ? "#create-local-case"
      : "#questionnaire-source";
  $: guideSteps = [
    { label: "Ajouter", state: result || xlsxAnalysis ? "done" as const : "current" as const },
    { label: "Vérifier", state: result ? (kind !== "xlsx" || xlsxConfirmed ? "done" as const : "current" as const) : "upcoming" as const },
    { label: "Protéger", state: result && (kind !== "xlsx" || xlsxConfirmed) ? "current" as const : "upcoming" as const },
    { label: "Répondre", state: "upcoming" as const },
  ];

  onMount(() => {
    isHydrated = true;
    return subscribeToLocalStorageWipe(() => {
      operationGeneration += 1;
      if (fileInput) fileInput.value = "";
      rawInput = "";
      result = null;
      importedFilename = "";
      originalFileSha256 = "";
      passphrase = "";
      passphraseConfirmation = "";
      localLabel = "";
      resetXlsxReview();
      isHydrated = false;
      errorMessage = "Panic Wipe détecté : l’import, le fichier et les aperçus ont été effacés. Rechargez la page pour recommencer.";
      statusMessage = "";
    });
  });

  function resetXlsxReview() {
    xlsxAnalysis = null;
    selectedXlsxSheet = "";
    xlsxConfirmed = false;
    xlsxMimeWarning = "";
  }

  function analyzeImport() {
    errorMessage = "";
    statusMessage = "";
    result = null;
    resetXlsxReview();

    try {
      if (kind === "text") {
        result = importQuestionnaireText(rawInput);
      } else if (kind === "csv") {
        result = importQuestionnaireCsv(rawInput);
      } else if (kind === "tsv") {
        result = importQuestionnaireTsv(rawInput);
      } else {
        throw new SecurityValidationError("XLSX_CONFIRM_REQUIRED", "Rechargez le fichier XLSX et confirmez une feuille avant l’import.");
      }

      statusMessage = result.questionCount > 0
        ? ""
        : "Aucune question exploitable détectée. Vérifiez le fichier source.";
    } catch (error) {
      if (error instanceof SecurityValidationError) {
        errorMessage = `${error.code}: ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = "Erreur inconnue pendant l'import.";
      }
    }
  }

  async function handleFileChange(event: Event) {
    const generation = operationGeneration;
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    errorMessage = "";
    statusMessage = "";
    result = null;
    resetXlsxReview();
    importedFilename = file.name;
    originalFileSha256 = "";

    const fileDecision = classifyQuestionnaireImportFile(file.name);

    if (!fileDecision.accepted) {
      errorMessage = `${fileDecision.code}: ${fileDecision.message}`;
      return;
    }

    if (fileDecision.kind !== "xlsx" && file.size > SECURITY_LIMITS.MAX_QUESTIONNAIRE_CHARS) {
      errorMessage = `IMPORT_TOO_LARGE: fichier supérieur à ${SECURITY_LIMITS.MAX_QUESTIONNAIRE_CHARS} octets.`;
      return;
    }

    kind = fileDecision.kind;

    try {
      if (kind === "xlsx") {
        isParsingXlsx = true;
        const preflight = await preflightXlsxFile(file);
        if (generation !== operationGeneration) return;
        const buffer = await file.arrayBuffer();
        if (generation !== operationGeneration) return;
        const originalHash = `sha256:${await sha256Hex(new Uint8Array(buffer))}`;
        if (generation !== operationGeneration) return;
        originalFileSha256 = originalHash;
        xlsxMimeWarning = preflight.mimeWarning ?? "";
        const analysis = await analyzeXlsxInWorker(buffer, {
          externalLinkPartCount: preflight.externalLinkPartCount,
          connectionPartCount: preflight.connectionPartCount,
          queryTablePartCount: preflight.queryTablePartCount,
        });
        if (generation !== operationGeneration) return;
        xlsxAnalysis = analysis;
        const bestSheet = [...xlsxAnalysis.sheets].sort((left, right) => right.result.questionCount - left.result.questionCount)[0]!;
        selectedXlsxSheet = bestSheet.name;
        result = bestSheet.result;
        statusMessage = `${result.questionCount} questions détectées dans la feuille « ${bestSheet.name} », colonne ${result.selectedColumnName ?? ((result.selectedColumn ?? 0) + 1)}. Confirmez la feuille avant de créer le dossier.`;
        return;
      }
      const originalBytes = new Uint8Array(await file.arrayBuffer());
      if (generation !== operationGeneration) return;
      const originalHash = `sha256:${await sha256Hex(originalBytes)}`;
      if (generation !== operationGeneration) return;
      originalFileSha256 = originalHash;
      rawInput = new TextDecoder("utf-8", { fatal: true }).decode(originalBytes);
      analyzeImport();
    } catch (error) {
      if (generation !== operationGeneration) return;
      errorMessage = error instanceof Error ? error.message : "IMPORT_READ_ERROR: lecture du fichier impossible.";
    } finally {
      if (generation === operationGeneration) isParsingXlsx = false;
    }
  }

  function selectXlsxSheet() {
    if (!xlsxAnalysis) return;
    const selected = xlsxAnalysis.sheets.find((sheet) => sheet.name === selectedXlsxSheet);
    if (!selected) return;
    result = selected.result;
    xlsxConfirmed = false;
    statusMessage = `${result.questionCount} questions détectées dans la feuille « ${selected.name} », colonne ${result.selectedColumnName ?? ((result.selectedColumn ?? 0) + 1)}. Confirmation requise.`;
  }

  function confirmXlsxImport() {
    if (!xlsxAnalysis || !result || !selectedXlsxSheet) return;
    xlsxConfirmed = true;
    statusMessage = `Feuille « ${selectedXlsxSheet} » confirmée : ${result.questionCount} questions prêtes à être importées.`;
  }

  async function loadDemoQuestionnaire() {
    const generation = operationGeneration;
    errorMessage = "";
    statusMessage = "";
    result = null;
    resetXlsxReview();
    isLoadingDemo = true;

    try {
      kind = "csv";
      importedFilename = "supplier-questionnaire-demo.csv";
      rawInput = DEMO_SUPPLIER_QUESTIONNAIRE_CSV;
      const originalHash = `sha256:${await sha256Hex(rawInput)}`;
      if (generation !== operationGeneration) return;
      originalFileSha256 = originalHash;
      analyzeImport();
    } catch (error) {
      if (generation !== operationGeneration) return;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = "Erreur inconnue pendant le chargement de la démonstration.";
      }
    } finally {
      if (generation === operationGeneration) isLoadingDemo = false;
    }
  }

  async function copyNormalizedQuestionnaire() {
    if (!result) return;

    await navigator.clipboard.writeText(result.normalizedQuestionnaire);
    statusMessage = "Liste des questions copiée dans le presse-papiers.";
  }

  async function createLocalCaseFromImport() {
    const generation = operationGeneration;
    if (!result) return;
    if (kind === "xlsx" && !xlsxConfirmed) {
      errorMessage = "XLSX_CONFIRM_REQUIRED: confirmez explicitement la feuille sélectionnée.";
      return;
    }

    errorMessage = "";
    statusMessage = "";
    isCreatingCase = true;

    try {
      assertLocalPassphrase(passphrase);
      if (passphraseConfirmation !== passphrase) {
        throw new Error("Les phrases secrètes ne correspondent pas.");
      }
      if (result.questionCount === 0) {
        throw new SecurityValidationError(
          "IMPORT_EMPTY_QUESTIONNAIRE",
          "Impossible de créer un dossier sans question exploitable."
        );
      }

      const title = importedFilename
        ? `Import ${importedFilename}`
        : "Questionnaire importé";

      const engineResult = await createProofCaseFromQuestionnaire(result.normalizedQuestionnaire, {
        title,
        sourceFileName: importedFilename || `questionnaire.${kind}`,
        // ProofPack Master v3 is immutable and predates the XLSX enum. The original
        // .xlsx filename and hash remain explicit while its legacy format field stays valid.
        sourceFormat: kind === "xlsx" ? "unknown" : kind,
        sourceOriginalFileSha256: originalFileSha256 || undefined,
      });
      if (generation !== operationGeneration) return;

      let sourceImport: ProofPackSourceImport | undefined;
      if (kind === "xlsx" && xlsxAnalysis && selectedXlsxSheet && result.selectedColumn !== undefined) {
        const selectedSheet = xlsxAnalysis.sheets.find((sheet) => sheet.name === selectedXlsxSheet);
        if (!selectedSheet) throw new Error("XLSX_SELECTED_SHEET_MISSING: feuille confirmée introuvable.");
        if (selectedSheet.questionSources.length !== result.questions.length) {
          throw new Error("XLSX_QUESTION_PROVENANCE_INCOMPLETE: la provenance cellule par cellule ne couvre pas toutes les questions.");
        }
        sourceImport = {
          profile: xlsxAnalysis.version,
          sourceFormat: "xlsx",
          selectedSheet: selectedXlsxSheet,
          selectedColumn: result.selectedColumn + 1,
          ...(result.selectedColumnName ? { selectedColumnName: result.selectedColumnName } : {}),
          formulaCount: xlsxAnalysis.formulaCount,
          formulaWithoutCachedValueCount: xlsxAnalysis.formulaWithoutCachedValueCount,
          hiddenSheetCount: xlsxAnalysis.hiddenSheetCount,
          externalLinkPartCount: xlsxAnalysis.externalLinkPartCount,
          externalRelationshipCount: xlsxAnalysis.externalRelationshipCount,
          connectionPartCount: xlsxAnalysis.connectionPartCount,
          queryTablePartCount: xlsxAnalysis.queryTablePartCount,
          warnings: [...result.warnings.map((warning) => `${warning.code}: ${warning.message}`), ...(xlsxMimeWarning ? [xlsxMimeWarning] : [])],
          questionSources: selectedSheet.questionSources,
          ignoredFormulaCells: selectedSheet.ignoredFormulaCells,
        };
      }

      const record = await saveLocalCase({
        questionnaire: result.normalizedQuestionnaire,
        proofpack: engineResult.proofpack,
        passphrase,
        localLabel,
        sourceImport,
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
    } finally {
      if (generation === operationGeneration) isCreatingCase = false;
    }
  }
</script>

<section
  class="import-shell"
  data-blackproof-component="questionnaire-import"
  data-blackproof-hydrated={isHydrated ? "true" : "false"}
>
  <div class="import-panel">
    <header class="import-intro">
      <div class="intro-copy">
        <p class="eyebrow">Espace de travail sécurisé</p>
        <h1>Transformez un questionnaire en dossier de réponse.</h1>
        <p class="lead">
          Ajoutez le fichier reçu. BLACKPROOF repère les questions, prépare le dossier
          et garde vos données dans ce navigateur.
        </p>
      </div>

      <div class="privacy-card" role="list" aria-label="Garanties de confidentialité">
        <div role="listitem">
          <span class="assurance-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.4-2.8 8.4-7 10-4.2-1.6-7-5.6-7-10V6l7-3z"/><path d="M9 12l2 2 4-5"/></svg>
          </span>
          <span><strong>Traitement local</strong><small>Aucun fichier envoyé</small></span>
        </div>
        <div role="listitem">
          <span class="assurance-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M5 5l14 14"/><path d="M6 9V5h4"/><path d="M14 19h5v-5"/><path d="M9 15l6-6"/></svg>
          </span>
          <span><strong>Contenu maîtrisé</strong><small>Actif bloqué, formules non exécutées</small></span>
        </div>
        <div role="listitem">
          <span class="assurance-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>
          </span>
          <span><strong>Dossier protégé</strong><small>Chiffré avant l’enregistrement</small></span>
        </div>
      </div>
    </header>

    <JourneyGuide
      title={guideTitle}
      reason={guideReason}
      actionLabel={guideActionLabel}
      actionHref={guideActionHref}
      steps={guideSteps}
    />

    <section class="source-stage" aria-labelledby="source-stage-title">
      <div class="stage-heading">
        <span class="stage-number" aria-hidden="true">01</span>
        <div>
          <h2 id="source-stage-title">Ajoutez votre questionnaire</h2>
          <p>Le fichier original reste intact. Vérifiez les éléments détectés par BLACKPROOF avant de poursuivre.</p>
        </div>
      </div>

      <label class="file-input primary-source" id="questionnaire-source">
        <span class="source-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 16V4"/><path d="M7.5 8.5L12 4l4.5 4.5"/><path d="M5 13v5a2 2 0 002 2h10a2 2 0 002-2v-5"/></svg>
        </span>
        <span class="source-copy">
          <strong>Déposez le fichier ici</strong>
          <small>ou cliquez pour le sélectionner</small>
          <em>XLSX, CSV, TSV, TXT ou MD</em>
        </span>
        <span class="source-cta">Parcourir</span>
        <input aria-label="Choisir le questionnaire" bind:this={fileInput} type="file" accept={`.txt,.md,.csv,.tsv,.xlsx,text/plain,text/csv,text/tab-separated-values,${XLSX_MIME_TYPE}`} onchange={handleFileChange} disabled={!isHydrated || isParsingXlsx} />
      </label>

      <div class="quick-actions">
        <button class="quick-action" type="button" onclick={loadDemoQuestionnaire} disabled={!isHydrated || isLoadingDemo}>
          <span class="quick-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M8 4h8l3 3v13H5V4h3z"/><path d="M8 11h8M8 15h6"/></svg>
          </span>
          <span>
            <strong>{isLoadingDemo ? "Chargement…" : "Tester avec un exemple"}</strong>
            <small>Découvrir le parcours sans utiliser vos données</small>
          </span>
          <i aria-hidden="true">→</i>
        </button>

        {#if kind !== "xlsx"}
          <details class="paste-panel quick-action">
            <summary>
              <span class="quick-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M8 4h8v4H8z"/><path d="M7 6H5v14h14V6h-2"/><path d="M8 12h8M8 16h6"/></svg>
              </span>
              <span><strong>Coller le contenu</strong><small>Pour un texte ou un tableau simple</small></span>
              <i aria-hidden="true">+</i>
            </summary>
            <div class="paste-content">
              <div class="form-grid">
                <label>
                  <span>Format du contenu collé</span>
                  <select bind:value={kind} disabled={!isHydrated}>
                    <option value="csv">CSV</option>
                    <option value="tsv">TSV</option>
                    <option value="text">Texte simple</option>
                  </select>
                </label>
              </div>

              <label class="raw-input">
                <span>Contenu à analyser</span>
                <textarea bind:value={rawInput} rows="10" maxlength={SECURITY_LIMITS.MAX_QUESTIONNAIRE_CHARS} spellcheck="false" disabled={!isHydrated}></textarea>
              </label>

              <p class="input-limit">
                Traitement local, limité à {SECURITY_LIMITS.MAX_QUESTIONNAIRE_CHARS} caractères.
              </p>
              <button class="button primary" type="button" onclick={analyzeImport} disabled={!isHydrated || !rawInput.trim()}>Détecter les questions</button>
            </div>
          </details>
        {/if}
      </div>

      <div class="demo-links-row">
        <span>Besoin d’un support de démonstration ?</span>
        <a href="/demo/supplier-questionnaire-demo.csv" download>Télécharger le fichier exemple</a>
        <a href="/demo">Voir le scénario détaillé</a>
      </div>

      <div class="source-help">
      <details class="security-note">
        <summary>Voir les protections appliquées</summary>
        <p>
          Un questionnaire fournisseur peut contenir des informations confidentielles.
          BLACKPROOF le traite localement, mais ne chargez pas de secrets inutiles.
        </p>
        <ul>
          <li>pas de mots de passe ;</li>
          <li>pas de clés API ;</li>
          <li>pas de tokens ;</li>
          <li>pas de logs bruts ;</li>
          <li>pas de données personnelles non nécessaires ;</li>
          <li>pas de preuves non expurgées.</li>
        </ul>
        <p>
          XLSX est traité localement dans un environnement isolé du reste de la page. Les formules ne sont jamais exécutées,
          le contenu actif est refusé et les feuilles masquées ne sont pas importées.
        </p>
      </details>

      <details class="limits-panel">
        <summary>Formats acceptés et limites techniques</summary>
        <ul>
          <li>{XLSX_IMPORT_LIMITS.maxCompressedBytes / 1_000_000} Mo compressés et {XLSX_IMPORT_LIMITS.maxExpandedBytes / 1_000_000} Mo décompressés ;</li>
          <li>{XLSX_IMPORT_LIMITS.maxEntries} entrées ZIP et ratio maximal {XLSX_IMPORT_LIMITS.maxCompressionRatio}:1 ;</li>
          <li>{XLSX_IMPORT_LIMITS.maxSheets} feuilles, {XLSX_IMPORT_LIMITS.maxRowsPerSheet} lignes et {XLSX_IMPORT_LIMITS.maxColumnsPerSheet} colonnes par feuille ;</li>
          <li>{XLSX_IMPORT_LIMITS.maxNonEmptyCells} cellules textuelles non vides et {XLSX_IMPORT_LIMITS.maxCellCharacters} caractères par cellule ;</li>
          <li>{XLSX_IMPORT_LIMITS.maxQuestions} questions extraites et délai maximal de {XLSX_IMPORT_LIMITS.workerTimeoutMs / 1000} secondes.</li>
        </ul>
        <p>Seul .xlsx est accepté. Le MIME navigateur peut être officiel, vide ou générique ; la signature ZIP et la structure OOXML standard restent obligatoires. XLS, XLSM, XLSB, XLAM et ODS sont refusés.</p>
      </details>
      </div>
    </section>

    {#if errorMessage}
      <div class="error-box" role="alert">{errorMessage}</div>
    {/if}

    {#if statusMessage}
      <div class="status-box" aria-live="polite">{statusMessage}</div>
    {/if}

    {#if xlsxAnalysis}
      <section class="xlsx-review" id="xlsx-review" aria-labelledby="xlsx-review-title">
        <h2 id="xlsx-review-title">Vérifiez la feuille retenue.</h2>
        <label>
          <span>Feuille à utiliser</span>
          <select bind:value={selectedXlsxSheet} onchange={selectXlsxSheet}>
            {#each xlsxAnalysis.sheets as sheet}
              <option value={sheet.name}>{sheet.name} : {sheet.result.questionCount} question(s)</option>
            {/each}
          </select>
        </label>
        <details class="technical-checks">
          <summary>Voir les contrôles appliqués au classeur</summary>
          <ul>
            <li>{xlsxAnalysis.formulaCount} formule(s) non exécutée(s), dont {xlsxAnalysis.formulaWithoutCachedValueCount} sans valeur mémorisée ignorée(s) ;</li>
            <li>{xlsxAnalysis.externalLinkPartCount} partie(s) OOXML <code>externalLink</code> détectée(s), non importée(s) ;</li>
            <li>{xlsxAnalysis.externalRelationshipCount} relation(s) avec <code>TargetMode="External"</code> détectée(s), non importée(s) ;</li>
            <li>{xlsxAnalysis.connectionPartCount} partie(s) <code>connections.xml</code> et {xlsxAnalysis.queryTablePartCount} partie(s) <code>queryTable</code> détectée(s), non importée(s) ;</li>
            <li>{xlsxAnalysis.hiddenSheetCount} feuille(s) masquée(s) non importée(s).</li>
          </ul>
        </details>
        {#if xlsxMimeWarning}<p class="mime-warning">{xlsxMimeWarning}</p>{/if}
        <button class="button primary" type="button" onclick={confirmXlsxImport} disabled={xlsxConfirmed}>
          {xlsxConfirmed ? "Feuille retenue" : "Utiliser cette feuille"}
        </button>
      </section>
    {/if}

    {#if result}
      {#if result.warnings.length > 0}
        <section class="warnings">
          <h2>Points à vérifier</h2>
          {#each result.warnings as warning}
            <article class="warning-card">
              <strong>{warning.code}</strong>
              <p>{warning.message}</p>
            </article>
          {/each}
        </section>
      {/if}

      <section class="preview">
        <div class="result-heading">
          <span aria-hidden="true">✓</span>
          <div>
            <h2>{result.questionCount} question{result.questionCount > 1 ? "s" : ""} détectée{result.questionCount > 1 ? "s" : ""}</h2>
            <p class="preview-help">Relisez la liste. Si elle est correcte, protégez le dossier pour continuer.</p>
          </div>
        </div>
        {#if kind === "xlsx" && xlsxAnalysis && selectedXlsxSheet}
          <ol class="question-preview">
            {#each xlsxAnalysis.sheets.find((sheet) => sheet.name === selectedXlsxSheet)?.questionSources ?? [] as item}
              <li>
                <span>{item.question}</span>
                <small class:cachedFormula={item.source === "cached-formula-value"}>
                  {item.source === "cached-formula-value" ? "Valeur mémorisée d’une formule" : "Cellule littérale"} · {item.cellReference}
                </small>
              </li>
            {/each}
          </ol>
        {:else}
          <pre>{result.normalizedQuestionnaire}</pre>
        {/if}

        <details class="import-details">
          <summary>Détails de la détection et actions avancées</summary>
          <dl>
            <div><dt>Lignes lues</dt><dd>{result.rowCount}</dd></div>
            <div><dt>Colonnes lues</dt><dd>{result.columnCount}</dd></div>
            <div><dt>Colonne retenue</dt><dd>{result.selectedColumnName ?? (result.selectedColumn !== undefined ? result.selectedColumn + 1 : "texte")}</dd></div>
          </dl>
          <div class="actions">
            <button class="button" type="button" onclick={copyNormalizedQuestionnaire}>Copier la liste des questions</button>
            <a class="button" href="/app">Créer un dossier sans cet import</a>
          </div>
        </details>
      </section>

      {#if result.questionCount > 0}
        <section class="next-step" id="create-local-case" aria-labelledby="create-local-case-title">
          <div class="next-step-copy">
            <span>Dernière étape avant les réponses</span>
            <h2 id="create-local-case-title">Protégez ce dossier.</h2>
            <p>
              Choisissez une phrase secrète propre à ce dossier. Le questionnaire est chiffré
              avant d’être enregistré dans ce navigateur.
            </p>
            <details class="context-help">
              <summary>À quoi sert la phrase secrète ?</summary>
              <p>
                BLACKPROOF ne la stocke pas et ne peut pas la récupérer. Vous devrez la saisir
                à chaque réouverture du dossier.
              </p>
            </details>
          </div>
          <div class="secret-fields">
            <label>
              <span>Nom affiché dans la liste (optionnel)</span>
              <input bind:value={localLabel} maxlength={MAX_LOCAL_CASE_LABEL_CHARS} placeholder="Ex. Fournisseur A : T3" disabled={isCreatingCase} />
            </label>
            <small>Utilisez un nom non sensible : il restera visible avant le déverrouillage.</small>
            <label>
              <span>Phrase secrète du dossier</span>
              <input type="password" bind:value={passphrase} minlength="12" autocomplete="new-password" disabled={isCreatingCase} />
            </label>
            <label>
              <span>Confirmer la phrase secrète</span>
              <input type="password" bind:value={passphraseConfirmation} minlength="12" autocomplete="new-password" disabled={isCreatingCase} />
            </label>
            <small>16 caractères ou plus recommandés. Entre 12 et 15, utilisez au moins trois types de caractères.</small>
            <button
              class="button primary"
              type="button"
              onclick={() => createLocalCaseFromImport()}
              disabled={isCreatingCase || (kind === "xlsx" && !xlsxConfirmed) || passphrase.length < 12 || passphraseConfirmation !== passphrase}
            >
              {isCreatingCase ? "Protection du dossier…" : "Protéger et ouvrir le dossier"}
            </button>
          </div>
        </section>
      {/if}
    {/if}
  </div>
</section>

<style>
  .import-shell {
    padding: 4rem 0;
  }

  .import-panel {
    width: min(980px, calc(100% - 2rem));
    margin: 0 auto;
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 1.35rem;
    background: linear-gradient(180deg, light-dark(rgba(248, 250, 246, 0.96), rgba(18, 23, 22, 0.96)), light-dark(rgba(248, 250, 246, 0.96), rgba(12, 16, 17, 0.96)));
    box-shadow: var(--shadow-soft);
  }

  .next-step span {
    display: block;
    color: var(--accent);
    font-weight: 900;
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .security-note p {
    margin: 0.45rem 0;
  }

  .mime-warning,
  .question-preview small {
    color: var(--muted);
  }

  .question-preview li {
    margin-bottom: 0.8rem;
  }

  .question-preview span,
  .question-preview small {
    display: block;
  }

  .question-preview small.cachedFormula {
    color: var(--warning, light-dark(var(--warning), #f5c46b));
    font-weight: 700;
  }

  .security-note ul {
    margin: 0.6rem 0;
    padding-left: 1.2rem;
  }

  .security-note li {
    margin: 0.25rem 0;
  }

  .security-note summary,
  .context-help summary,
  .paste-panel summary,
  .technical-checks summary,
  .import-details summary {
    cursor: pointer;
    color: var(--text);
    font-weight: 800;
  }

  .security-note,
  .status-box,
  .limits-panel,
  .xlsx-review {
    border: 1px solid var(--line);
    border-left: 3px solid var(--accent);
    border-radius: 16px;
    padding: 1rem;
    margin-top: 1rem;
    color: var(--muted);
    background: var(--accent-soft);
  }

  .source-help {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.7rem;
  }

  .file-input,
  .raw-input,
  .form-grid label,
  .xlsx-review label,
  .secret-fields label {
    display: grid;
    gap: 0.45rem;
    margin-top: 1rem;
    color: var(--muted);
    font-weight: 700;
  }

  input,
  select,
  textarea {
    width: 100%;
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 0.9rem 1rem;
    background: var(--field);
    color: var(--text);
    font: inherit;
  }

  textarea {
    resize: vertical;
    line-height: 1.5;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .input-limit {
    color: var(--muted);
    font-size: 0.88rem;
  }

  .limits-panel,
  .xlsx-review {
    margin-top: 1rem;
  }

  .paste-panel,
  .import-details {
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 0.85rem 1rem;
    margin-top: 0.8rem;
    background: light-dark(rgba(24, 66, 46, 0.02), rgba(255, 255, 255, 0.02));
  }

  .limits-panel summary {
    cursor: pointer;
    color: var(--text);
    font-weight: 800;
  }

  .limits-panel ul,
  .xlsx-review ul {
    padding-left: 1.2rem;
    color: var(--muted);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
    margin-top: 1rem;
  }

  .error-box {
    border: 1px solid light-dark(rgba(102, 51, 46, 0.45), rgba(213, 106, 96, 0.45));
    border-radius: 16px;
    padding: 1rem;
    margin-top: 1rem;
    color: var(--danger);
    background: var(--danger-soft);
  }

  .warning-card {
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 1rem;
    background: light-dark(rgba(24, 66, 46, 0.035), rgba(255, 255, 255, 0.035));
  }

  .warnings,
  .preview {
    margin-top: 2rem;
  }

  .result-heading {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .result-heading > span {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    width: 1.8rem;
    height: 1.8rem;
    border-radius: 999px;
    color: #07100e;
    background: var(--accent);
    font-weight: 950;
  }

  .result-heading h2,
  .result-heading p {
    margin: 0;
  }

  .result-heading p {
    margin-top: 0.35rem;
  }

  .preview-help {
    color: var(--muted);
    line-height: 1.5;
  }

  .import-details dl {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.7rem;
    margin: 0.85rem 0 0;
  }

  .import-details dl div {
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 0.7rem;
  }

  .import-details dt {
    color: var(--muted);
    font-size: 0.76rem;
  }

  .import-details dd {
    margin: 0.25rem 0 0;
    color: var(--text);
    font-weight: 800;
    overflow-wrap: anywhere;
  }

  .technical-checks {
    margin: 0.9rem 0;
  }

  .next-step {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
    align-items: start;
    gap: 1rem;
    border: 1px solid light-dark(rgba(58, 104, 96, 0.35), rgba(121, 216, 200, 0.35));
    border-radius: 14px;
    padding: 1rem;
    margin-top: 1rem;
    background: linear-gradient(135deg, light-dark(rgba(58, 104, 96, 0.1), rgba(121, 216, 200, 0.10)), light-dark(rgba(61, 96, 74, 0.055), rgba(128, 200, 154, 0.055)));
  }

  .next-step h2 {
    margin: 0.3rem 0 0;
    font-size: 1.25rem;
  }

  .next-step p {
    margin: 0.45rem 0 0;
    color: var(--muted);
    line-height: 1.45;
  }

  .context-help {
    margin-top: 0.85rem;
    border-top: 1px solid var(--line);
    padding-top: 0.75rem;
  }

  .context-help p {
    font-size: 0.86rem;
  }

  .secret-fields {
    display: grid;
    gap: 0.7rem;
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 0.9rem;
    background: light-dark(rgba(248, 250, 246, 0.52), rgba(8, 12, 12, 0.52));
  }

  .secret-fields label {
    margin-top: 0;
  }

  .secret-fields small {
    color: var(--muted);
    font-size: 0.78rem;
    line-height: 1.4;
  }

  .secret-fields .button {
    justify-self: start;
  }

  .warning-card p {
    color: var(--muted);
  }

  pre {
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 1rem;
    overflow: auto;
    color: var(--text);
    background: var(--field);
    white-space: pre-wrap;
  }

  @media (max-width: 900px) {
    .next-step {
      grid-template-columns: 1fr;
    }

    .import-details dl {
      grid-template-columns: 1fr;
    }

    .source-help {
      grid-template-columns: 1fr;
    }
  }

  /* Workspace refresh: a calmer, more spacious hierarchy for professional use. */
  .import-shell {
    position: relative;
    overflow: hidden;
    padding: clamp(3.5rem, 7vw, 6.5rem) 0 7rem;
    background:
      radial-gradient(circle at 12% 7%, light-dark(rgba(58, 104, 96, 0.095), rgba(121, 216, 200, 0.095)), transparent 29rem),
      radial-gradient(circle at 91% 30%, light-dark(rgba(61, 96, 74, 0.06), rgba(128, 200, 154, 0.06)), transparent 25rem);
  }

  .import-shell::before {
    position: absolute;
    top: 8rem;
    right: -8rem;
    width: 21rem;
    height: 21rem;
    border: 1px solid light-dark(rgba(58, 104, 96, 0.09), rgba(121, 216, 200, 0.09));
    border-radius: 50%;
    content: "";
    pointer-events: none;
  }

  .import-panel {
    position: relative;
    width: min(1120px, calc(100% - 2.5rem));
    margin: 0 auto;
    border: 0;
    border-radius: 0;
    padding: 0;
    background: transparent;
    box-shadow: none;
  }

  .import-intro {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.55fr);
    align-items: end;
    gap: clamp(2rem, 6vw, 5rem);
    margin-bottom: clamp(2rem, 4vw, 3.25rem);
  }

  .intro-copy h1 {
    max-width: 760px;
    margin: 0.8rem 0 1.15rem;
    font-family: var(--font-body);
    font-size: clamp(2.35rem, 4.15vw, 3.65rem);
    font-weight: 400;
    line-height: 1.06;
    letter-spacing: -0.032em;
    text-wrap: balance;
  }

  .intro-copy .lead {
    max-width: 680px;
    margin: 0;
    color: light-dark(var(--muted), #b5beb8);
    font-size: clamp(1rem, 1.5vw, 1.16rem);
    line-height: 1.72;
  }

  .privacy-card {
    display: grid;
    gap: 0;
    overflow: hidden;
    border: 1px solid light-dark(rgba(24, 66, 46, 0.11), rgba(196, 218, 207, 0.11));
    border-radius: 18px;
    background:
      linear-gradient(155deg, light-dark(rgba(248, 250, 246, 0.86), rgba(29, 39, 36, 0.86)), light-dark(rgba(248, 250, 246, 0.9), rgba(14, 19, 19, 0.9)));
    box-shadow: 0 18px 54px rgba(0, 0, 0, 0.12);
  }

  .privacy-card > div {
    --assurance-accent: var(--accent);
    display: grid;
    grid-template-columns: 2.35rem 1fr;
    align-items: center;
    gap: 0.8rem;
    min-width: 0;
    padding: 0.95rem 1rem;
  }

  .privacy-card > div + div {
    border-top: 1px solid light-dark(rgba(24, 66, 46, 0.11), rgba(176, 201, 190, 0.11));
  }

  .privacy-card strong,
  .privacy-card small {
    display: block;
  }

  .privacy-card strong {
    color: var(--text);
    font-size: 0.86rem;
    font-weight: 620;
  }

  .privacy-card small {
    margin-top: 0.18rem;
    color: var(--muted);
    font-size: 0.73rem;
    line-height: 1.4;
  }

  .assurance-icon,
  .source-icon,
  .quick-icon {
    display: grid;
    place-items: center;
    border-radius: 12px;
    color: var(--assurance-accent, var(--accent));
    background: color-mix(in srgb, var(--assurance-accent, var(--accent)) 9%, transparent);
  }

  .privacy-card > div:nth-child(2) {
    --assurance-accent: var(--accent-violet);
  }

  .privacy-card > div:nth-child(3) {
    --assurance-accent: var(--accent-gold);
  }

  .assurance-icon {
    width: 2.35rem;
    height: 2.35rem;
  }

  .assurance-icon svg,
  .source-icon svg,
  .quick-icon svg {
    width: 1.25rem;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.65;
  }

  .source-stage {
    margin-top: 1.5rem;
    border: 1px solid light-dark(rgba(24, 66, 46, 0.11), rgba(196, 218, 207, 0.11));
    border-radius: 22px;
    padding: clamp(1.25rem, 4vw, 2.4rem);
    background:
      linear-gradient(145deg, light-dark(rgba(248, 250, 246, 0.96), rgba(22, 29, 27, 0.96)), light-dark(rgba(248, 250, 246, 0.985), rgba(12, 16, 17, 0.985)));
    box-shadow: 0 24px 76px rgba(0, 0, 0, 0.17);
  }

  .stage-heading {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    max-width: 760px;
    margin-bottom: 1.5rem;
  }

  .stage-number {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    width: 2.45rem;
    height: 2.45rem;
    border: 1px solid light-dark(rgba(58, 104, 96, 0.26), rgba(121, 216, 200, 0.26));
    border-radius: 50%;
    color: var(--accent);
    background: light-dark(rgba(58, 104, 96, 0.055), rgba(121, 216, 200, 0.055));
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 800;
  }

  .stage-heading h2 {
    margin: 0;
    font-family: var(--font-body);
    font-size: clamp(1.45rem, 2.7vw, 2.05rem);
    font-weight: 500;
    letter-spacing: -0.022em;
  }

  .stage-heading p {
    margin: 0.45rem 0 0;
    color: var(--muted);
    line-height: 1.6;
  }

  .file-input.primary-source {
    position: relative;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: clamp(0.9rem, 2.5vw, 1.4rem);
    min-height: 170px;
    margin: 0;
    overflow: hidden;
    border: 1px dashed light-dark(rgba(58, 104, 96, 0.45), rgba(121, 216, 200, 0.45));
    border-radius: 22px;
    padding: clamp(1.2rem, 4vw, 2rem);
    cursor: pointer;
    background:
      radial-gradient(circle at 12% 15%, light-dark(rgba(58, 104, 96, 0.12), rgba(121, 216, 200, 0.12)), transparent 18rem),
      linear-gradient(135deg, light-dark(rgba(58, 104, 96, 0.065), rgba(121, 216, 200, 0.065)), light-dark(rgba(24, 66, 46, 0.018), rgba(255, 255, 255, 0.018)));
    transition: border-color 180ms ease, background 180ms ease, transform 180ms ease;
  }

  .file-input.primary-source:hover,
  .file-input.primary-source:has(input:focus-visible) {
    border-color: light-dark(rgba(58, 104, 96, 0.8), rgba(121, 216, 200, 0.8));
    background:
      radial-gradient(circle at 12% 15%, light-dark(rgba(58, 104, 96, 0.17), rgba(121, 216, 200, 0.17)), transparent 18rem),
      linear-gradient(135deg, light-dark(rgba(58, 104, 96, 0.09), rgba(121, 216, 200, 0.09)), light-dark(rgba(24, 66, 46, 0.025), rgba(255, 255, 255, 0.025)));
    transform: translateY(-1px);
  }

  .file-input.primary-source:has(input:focus-visible) {
    outline: 2px solid light-dark(rgba(58, 104, 96, 0.28), rgba(121, 216, 200, 0.28));
    outline-offset: 4px;
  }

  .source-icon {
    width: 4.15rem;
    height: 4.15rem;
    border: 1px solid light-dark(rgba(58, 104, 96, 0.2), rgba(121, 216, 200, 0.2));
    border-radius: 18px;
    background: light-dark(rgba(248, 250, 246, 0.52), rgba(8, 15, 14, 0.52));
    box-shadow: inset 0 0 28px rgba(121, 216, 200, 0.055);
  }

  .source-icon svg {
    width: 1.8rem;
  }

  .source-copy strong,
  .source-copy small,
  .source-copy em {
    display: block;
  }

  .source-copy strong {
    color: var(--text);
    font-size: clamp(1.1rem, 2vw, 1.35rem);
    font-weight: 620;
  }

  .source-copy small {
    margin-top: 0.25rem;
    color: var(--muted);
    font-size: 0.9rem;
    font-weight: 500;
  }

  .source-copy em {
    margin-top: 0.7rem;
    color: var(--accent);
    font-family: var(--font-mono);
    font-size: 0.67rem;
    font-style: normal;
    font-weight: 720;
    letter-spacing: 0.08em;
  }

  .source-cta {
    border: 1px solid light-dark(rgba(58, 104, 96, 0.36), rgba(121, 216, 200, 0.36));
    border-radius: 11px;
    padding: 0.8rem 1.1rem;
    color: #07100e;
    background: linear-gradient(135deg, #8fe1d3, #8dcea2);
    font-size: 0.82rem;
    font-weight: 640;
    box-shadow: 0 12px 32px rgba(121, 216, 200, 0.12);
  }

  .file-input.primary-source input {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    border: 0;
    white-space: nowrap;
  }

  .quick-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.8rem;
    margin-top: 0.85rem;
  }

  .quick-action {
    min-width: 0;
    margin: 0;
    border: 1px solid light-dark(rgba(24, 66, 46, 0.14), rgba(176, 201, 190, 0.14));
    border-radius: 17px;
    padding: 0;
    color: var(--text);
    background: light-dark(rgba(24, 66, 46, 0.022), rgba(255, 255, 255, 0.022));
    transition: border-color 160ms ease, background 160ms ease;
  }

  button.quick-action,
  .quick-action > summary {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.8rem;
    width: 100%;
    min-height: 84px;
    border: 0;
    padding: 0.8rem 1rem;
    color: inherit;
    background: transparent;
    cursor: pointer;
    font: inherit;
    text-align: left;
  }

  .quick-action:hover,
  .quick-action[open] {
    border-color: light-dark(rgba(58, 104, 96, 0.3), rgba(121, 216, 200, 0.3));
    background: light-dark(rgba(58, 104, 96, 0.04), rgba(121, 216, 200, 0.04));
  }

  .quick-action > summary {
    list-style: none;
  }

  .quick-action > summary::-webkit-details-marker {
    display: none;
  }

  .quick-action strong,
  .quick-action small {
    display: block;
  }

  .quick-action strong {
    color: var(--text);
    font-size: 0.9rem;
    font-weight: 610;
  }

  .quick-action small {
    margin-top: 0.2rem;
    color: var(--muted);
    font-size: 0.74rem;
    line-height: 1.4;
  }

  .quick-action i {
    color: var(--accent);
    font-size: 1rem;
    font-style: normal;
  }

  .quick-icon {
    width: 2.75rem;
    height: 2.75rem;
  }

  .paste-content {
    border-top: 1px solid var(--line);
    padding: 0 1rem 1.1rem;
  }

  .demo-links-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.55rem 1rem;
    margin: 1rem 0 0;
    padding: 0 0.25rem;
    color: var(--muted-2);
    font-size: 0.75rem;
  }

  .demo-links-row a {
    color: var(--muted);
    text-decoration: underline;
    text-decoration-color: rgba(121, 216, 200, 0.26);
    text-underline-offset: 0.2rem;
  }

  .source-help {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.8rem;
    margin-top: 1.75rem;
    padding-top: 1.1rem;
    border-top: 1px solid light-dark(rgba(24, 66, 46, 0.1), rgba(176, 201, 190, 0.1));
  }

  .source-help .security-note,
  .source-help .limits-panel {
    margin: 0;
    border: 0;
    border-radius: 14px;
    padding: 0.85rem 1rem;
    color: var(--muted);
    background: light-dark(rgba(24, 66, 46, 0.018), rgba(255, 255, 255, 0.018));
  }

  .source-help summary,
  .import-details summary,
  .technical-checks summary,
  .context-help summary {
    color: light-dark(var(--muted), #cdd5cf);
    font-size: 0.82rem;
    font-weight: 680;
  }

  .status-box,
  .error-box {
    border-radius: 18px;
    padding: 1rem 1.15rem;
    margin-top: 1.25rem;
  }

  .xlsx-review,
  .preview,
  .next-step,
  .warnings {
    margin-top: 1.5rem;
  }

  .xlsx-review,
  .preview,
  .next-step {
    border: 1px solid light-dark(rgba(24, 66, 46, 0.11), rgba(196, 218, 207, 0.11));
    border-radius: 20px;
    padding: clamp(1.2rem, 3vw, 1.8rem);
    background: linear-gradient(145deg, light-dark(rgba(248, 250, 246, 0.96), rgba(23, 31, 29, 0.96)), light-dark(rgba(248, 250, 246, 0.97), rgba(12, 16, 17, 0.97)));
    box-shadow: 0 18px 58px rgba(0, 0, 0, 0.12);
  }

  .xlsx-review {
    border-left: 1px solid light-dark(rgba(24, 66, 46, 0.16), rgba(176, 201, 190, 0.16));
    color: var(--muted);
  }

  .xlsx-review h2,
  .preview h2,
  .next-step h2,
  .warnings h2 {
    font-family: var(--font-body);
    letter-spacing: -0.025em;
  }

  .result-heading {
    gap: 1rem;
  }

  .result-heading > span {
    width: 2.35rem;
    height: 2.35rem;
    border: 1px solid light-dark(rgba(58, 104, 96, 0.34), rgba(121, 216, 200, 0.34));
    color: var(--accent);
    background: light-dark(rgba(58, 104, 96, 0.08), rgba(121, 216, 200, 0.08));
  }

  .preview pre,
  .question-preview {
    max-height: 440px;
    margin: 1.25rem 0 0;
    overflow: auto;
    border: 1px solid light-dark(rgba(24, 66, 46, 0.12), rgba(176, 201, 190, 0.12));
    border-radius: 18px;
    padding: 1.15rem;
    background: light-dark(rgba(248, 250, 246, 0.42), rgba(6, 10, 10, 0.42));
  }

  .question-preview {
    padding-left: 2.7rem;
  }

  .import-details {
    margin-top: 1rem;
    border-color: light-dark(rgba(24, 66, 46, 0.12), rgba(176, 201, 190, 0.12));
    border-radius: 16px;
    background: light-dark(rgba(24, 66, 46, 0.018), rgba(255, 255, 255, 0.018));
  }

  .import-details dl div {
    border: 0;
    border-radius: 12px;
    background: light-dark(rgba(24, 66, 46, 0.025), rgba(255, 255, 255, 0.025));
  }

  .next-step {
    grid-template-columns: minmax(0, 0.85fr) minmax(340px, 1.15fr);
    gap: clamp(1.5rem, 5vw, 4rem);
    border-color: light-dark(rgba(58, 104, 96, 0.26), rgba(121, 216, 200, 0.26));
    background:
      radial-gradient(circle at 0 0, light-dark(rgba(58, 104, 96, 0.12), rgba(121, 216, 200, 0.12)), transparent 22rem),
      linear-gradient(145deg, light-dark(rgba(248, 250, 246, 0.97), rgba(22, 31, 28, 0.97)), light-dark(rgba(248, 250, 246, 0.98), rgba(12, 17, 17, 0.98)));
  }

  .next-step h2 {
    margin-top: 0.55rem;
    font-size: clamp(1.7rem, 3vw, 2.4rem);
  }

  .secret-fields {
    gap: 0.85rem;
    border-color: light-dark(rgba(24, 66, 46, 0.15), rgba(176, 201, 190, 0.15));
    border-radius: 18px;
    padding: 1.15rem;
    background: light-dark(rgba(248, 250, 246, 0.38), rgba(5, 9, 9, 0.38));
  }

  input,
  select,
  textarea {
    border-radius: 12px;
    border-color: light-dark(rgba(24, 66, 46, 0.18), rgba(176, 201, 190, 0.18));
    background: light-dark(rgba(248, 250, 246, 0.72), rgba(7, 11, 12, 0.72));
  }

  input:focus,
  select:focus,
  textarea:focus {
    border-color: light-dark(rgba(58, 104, 96, 0.62), rgba(121, 216, 200, 0.62));
    outline: 3px solid light-dark(rgba(58, 104, 96, 0.1), rgba(121, 216, 200, 0.1));
  }

  @media (max-width: 900px) {
    .import-intro {
      grid-template-columns: 1fr;
      align-items: start;
      gap: 1.8rem;
    }

    .privacy-card {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .privacy-card > div {
      grid-template-columns: auto 1fr;
    }

    .privacy-card > div + div {
      border-top: 0;
      border-left: 1px solid light-dark(rgba(24, 66, 46, 0.11), rgba(176, 201, 190, 0.11));
    }

    .next-step {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 680px) {
    .import-shell {
      padding-top: 2.8rem;
    }

    .import-panel {
      width: min(100% - 1.25rem, 1120px);
    }

    .intro-copy h1 {
      font-size: clamp(2.1rem, 9vw, 2.9rem);
    }

    .privacy-card,
    .quick-actions,
    .source-help {
      grid-template-columns: 1fr;
    }

    .privacy-card > div + div {
      border-top: 1px solid light-dark(rgba(24, 66, 46, 0.11), rgba(176, 201, 190, 0.11));
      border-left: 0;
    }

    .source-stage {
      border-radius: 22px;
    }

    .file-input.primary-source {
      grid-template-columns: auto 1fr;
      min-height: 150px;
    }

    .source-cta {
      grid-column: 1 / -1;
      justify-self: stretch;
      text-align: center;
    }

    .source-icon {
      width: 3.45rem;
      height: 3.45rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .file-input.primary-source {
      transition: none;
    }
  }
</style>
