<script lang="ts">
  import { onMount } from "svelte";

  import {
    SECURITY_LIMITS,
    SOURCE_LINEAGE_FORMAT_VERSION,
    XLSX_SOURCE_IMPORT_PROFILE,
    SecurityValidationError,
    buildProofPackDelivery,
    buildProofPackDeliveryZipFiles,
    buildProofDebt,
    buildProofPack,
    buildQuestionnaireSource,
    createProofCaseFromQuestionnaire,
    createDeliveryRevocation,
    exportBoardMemoMarkdown,
    exportEvidenceRegisterCsv,
    exportProofPackJson,
    exportProofPackDeliveryJson,
    exportDeliveryResponseMarkdown,
    exportDeliveryProtocolJson,
    exportRemediationBacklogCsv,
    exportSupplierResponseMarkdown,
    isEvidenceReferenceComplete,
    sha256Hex,
    verifyProofPackDeliveryJson,
    confirmProofPackDeliveryPreview,
    applyKnowledgeEntry,
    createKnowledgeEntry,
    findKnowledgeMatches,
    generateDeliverySigningKeyPair,
    signDeliveryFingerprint,
    type AnswerConfidence,
    type AnswerExportStatus,
    type Criticality,
    type DeliveryHistoryEntry,
    type EvidenceExportMode,
    type EvidenceItem,
    type EvidenceReferenceType,
    type EvidenceSensitivity,
    type EvidenceStatus,
    type ProofPack,
    type ProofPackDelivery,
    type ProofPackQuestionnaireSource,
    type ProofPackSourceLineage,
    type ProofQuestion,
    type KnowledgeMatch,
    type PersonalKnowledgeVault,
    type ProofCategory,
    type ProofDebtSeverity,
  } from "@blackproof/core";

  import {
    getLocalCase,
    captureLocalStorageEpoch,
    getDeliverySnapshot,
    hasDeliverySnapshot,
    getLocalStorageStatus,
    localStorageErrorMessage,
    LocalQuestionnaireBindingError,
    migrateCanonicalLocalProofCaseRecord,
    migrateLegacyClearLocalCaseEncryption,
    restoreLocalCaseBackup,
    deleteDeliverySnapshotForCase,
    assertCurrentLocalRevision,
    saveLocalCase,
    saveLocalCaseAndDeliverySnapshot,
    subscribeToLocalStorageWipe,
    verifyLocalQuestionnaireBinding,
    type LocalProofCaseRecord,
    saveLocalCaseAndDeleteDeliverySnapshot,
  } from "../../lib/local-db";
  import { assertLocalPassphrase } from "../../lib/local-encryption";
  import { isKnowledgeVaultEnabled, isReturnPackEnabled } from "../../lib/feature-flags";
  import { subscribeToSensitivePageLock, type SensitivePageLockReason } from "../../lib/sensitive-page-lock";

  import { buildProofPackDeliveryZipBlob, buildProofPackDeliveryZipFilename, buildProofPackZipBlob, buildProofPackZipFilename } from "../../lib/proofpack-zip";
  import { buildLocalBackup } from "../../lib/local-backup";
  import { knowledgeVaultExists, loadKnowledgeVault, saveKnowledgeEntry } from "../../lib/knowledge-vault";
  import { buildReturnPackXlsx, type ReturnPackBuildResult } from "../../lib/return-pack";
  import JourneyGuide from "./JourneyGuide.svelte";

  export let initialPassphrase = "";
  export let onPassphraseConsumed: (() => void) | undefined = undefined;

  type ExportPostureTone = "blocked" | "review" | "controlled" | "ready";
  const PROOFPACK_REBUILD_DEBOUNCE_MS = 300;
  const returnPackEnabled = isReturnPackEnabled();
  const knowledgeVaultEnabled = isKnowledgeVaultEnabled();

  type ProofPriority = {
    debtId: string;
    questionId: string;
    questionText: string;
    severity: "critical" | "high" | "medium" | "low";
    reason: string;
    recommendedAction: string;
  };

  let caseId = "";
  let record: LocalProofCaseRecord | null = null;
  let pendingSourceLineage: Omit<ProofPackSourceLineage, "derivedSourceFileName" | "derivedSourceSha256" | "derivedAt"> | null = null;
  let baseRevisionId: string | undefined;
  let localPassphrase: string | undefined;
  let proofpack: ProofPack | null = null;
  let questionnaire = "";
  let errorMessage = "";
  let statusMessage = "";
  let isLoading = true;
  let isSaving = false;
  let isReanalyzing = false;
  let isProofpackRecalculating = false;
  let dirty = false;
  let storageInvalidated = false;
  let operationGeneration = 0;
  let loadAbortController: AbortController | null = null;
  let analysisOutOfDate = false;
  let questionnaireBindingActualSha256 = "";
  let questionnaireBindingExpectedSha256 = "";
  let editRevision = 0;
  let completedProofpackRevision = 0;
  let rebuildQueue: Promise<void> = Promise.resolve();
  let rebuildDebounceTimer: number | undefined;
  let deliveryQuestionIds: string[] = [];
  let deliveryEvidenceIds: string[] = [];
  let deliveryConfirmed = false;
  let deliveryConfirmedFingerprint = "";
  let deliveryPreview: ProofPackDelivery | null = null;
  let deliveryPreviewMasterFingerprint = "";
  let deliveryPreviewJson = "";
  let deliveryPreviewMarkdown = "";
  let deliveryPreviewRequest = 0;
  let deliveryMessage = "";
  let snapshotAvailable: Record<string, boolean> = {};
  let localStorageStatus: Awaited<ReturnType<typeof getLocalStorageStatus>> | null = null;
  let deliveryRecipientLabel = "";
  let deliveryConfirmedBy = "";
  let returnPackBuild: ReturnPackBuildResult | null = null;
  let returnPackConfirmed = false;
  let returnPackMessage = "";
  let isBuildingReturnPack = false;
  let issuerName = "";
  let issuerPrivateKeyJwk: JsonWebKey | null = null;
  let signatureMessage = "";
  let revocationReason = "";
  let receiptMessage = "";
  let lastDeliveryZipFilename = "";
  let activeQuestionId = "";
  let questionEvidenceBatchStatuses: Record<string, EvidenceStatus> = {};
  let openEvidenceReferenceIds: string[] = [];
  let openEvidenceQualificationIds: string[] = [];
  let evidenceReferenceMessages: Record<string, string> = {};
  let knowledgePassphrase = "";
  let knowledgeVault: PersonalKnowledgeVault | null = null;
  let knowledgeMatches: Record<string, KnowledgeMatch[]> = {};
  let knowledgeFormQuestionId = "";
  let knowledgeFormIntent: "search" | "promote" | null = null;
  let knowledgeFormVaultExists = false;
  let knowledgeUnlockInput = "";
  let knowledgeUnlockConfirmation = "";
  let knowledgeApprovedBy = "";
  let knowledgeApplicability = "";
  let knowledgeAliases = "";
  let knowledgeReviewDate = "";
  let unlockMode: "existing" | "migration" | null = null;
  let unlockPassphrase = "";
  let unlockPassphraseConfirmation = "";
  let unlockError = "";

  const evidenceStatusOptions: Array<{ value: EvidenceStatus; label: string }> = [
    { value: "expected", label: "Attendue" },
    { value: "available", label: "Déclarée disponible" },
    { value: "missing", label: "Manquante" },
    { value: "declared", label: "Déclarative" },
    { value: "expired", label: "Périmée" },
    { value: "not-exportable", label: "Sensible / non exportable" },
  ];

  const evidenceReferenceTypeOptions: Array<{ value: EvidenceReferenceType; label: string }> = [
    { value: "file", label: "Fichier" },
    { value: "uri", label: "URI" },
    { value: "source-record", label: "Enregistrement source" },
    { value: "document-hash", label: "Empreinte documentaire" },
  ];

  const evidenceSensitivityOptions: Array<{ value: EvidenceSensitivity; label: string }> = [
    { value: "public", label: "Publique" },
    { value: "internal", label: "Interne" },
    { value: "confidential", label: "Confidentielle" },
    { value: "secret", label: "Secrète" },
  ];

  const evidenceExportModeOptions: Array<{ value: EvidenceExportMode; label: string }> = [
    { value: "internal-only", label: "Interne uniquement" },
    { value: "reference-only", label: "Référence seulement" },
  ];

  const evidenceStrengthLabels: Record<EvidenceItem["strength"], string> = {
    weak: "Faible",
    medium: "Moyenne",
    strong: "Forte",
  };

  const answerConfidenceOptions: Array<{ value: AnswerConfidence; label: string }> = [
    { value: "low", label: "Faible" },
    { value: "medium", label: "Moyenne" },
    { value: "high", label: "Haute" },
  ];

  const answerExportStatusOptions: Array<{ value: AnswerExportStatus; label: string }> = [
    { value: "draft", label: "Brouillon" },
    { value: "ready", label: "Prête à exporter" },
    { value: "reserved", label: "Avec réserve" },
    { value: "do-not-export", label: "Ne pas exporter" },
  ];

  const criticalityLabels: Record<Criticality, string> = {
    low: "Priorité faible",
    medium: "Priorité moyenne",
    high: "Priorité élevée",
    critical: "Priorité critique",
  };

  const categoryLabels: Record<ProofCategory, string> = {
    "access-control": "Contrôle des accès",
    backup: "Sauvegardes",
    "incident-response": "Réponse à incident",
    "business-continuity": "Continuité et reprise",
    "supplier-security": "Sécurité fournisseurs",
    governance: "Gouvernance",
    "logging-monitoring": "Journalisation et supervision",
    "vulnerability-management": "Vulnérabilités et correctifs",
    "data-protection": "Chiffrement et confidentialité",
    unknown: "Catégorie à qualifier",
  };

  const debtSeverityLabels: Record<ProofDebtSeverity, string> = {
    low: "Faible",
    medium: "Moyenne",
    high: "Élevée",
    critical: "Critique",
  };

  $: summary = proofpack?.summary;
  $: readyAnswers = proofpack?.questions.filter((question) => question.answerExportStatus === "ready").length ?? 0;
  $: reservedAnswers = proofpack?.questions.filter((question) => question.answerExportStatus === "reserved").length ?? 0;
  $: blockedAnswers = proofpack?.questions.filter((question) => question.answerExportStatus === "do-not-export").length ?? 0;
  $: draftAnswers = proofpack?.questions.filter((question) => !question.answerExportStatus || question.answerExportStatus === "draft").length ?? 0;
  $: exportableAnswers = readyAnswers + reservedAnswers;
  $: exportProgress = proofpack?.questions.length
    ? Math.round((exportableAnswers / proofpack.questions.length) * 100)
    : 0;
  $: weakEvidenceCount = proofpack?.evidence.filter((item) =>
    item.status === "expected" ||
    item.status === "missing" ||
    item.status === "expired" ||
    item.status === "declared"
  ).length ?? 0;
  $: sensitiveEvidenceCount = proofpack?.evidence.filter((item) =>
    item.status === "not-exportable" ||
    item.sensitivity === "confidential" ||
    item.sensitivity === "secret"
  ).length ?? 0;
  $: exportPosture = getExportPosture(
    proofpack,
    summary,
    blockedAnswers,
    draftAnswers,
    reservedAnswers,
    weakEvidenceCount,
    sensitiveEvidenceCount
  );
  $: proofPriorities = getProofPriorities(proofpack);
  $: hasFreshProofpack = proofpack !== null && !isProofpackRecalculating && completedProofpackRevision === editRevision;
  $: proofpackActionsDisabled = isSaving || isReanalyzing || analysisOutOfDate || !hasFreshProofpack;
  $: deliveryReviewDisabled = proofpackActionsDisabled || dirty;
  $: deliveryPreviewCurrent = Boolean(
    deliveryPreview && proofpack && deliveryPreviewMasterFingerprint === proofpack.fingerprint
  );
  $: deliveryActionsDisabled = deliveryReviewDisabled || !deliveryConfirmed ||
    !deliveryPreviewCurrent || deliveryConfirmedFingerprint !== deliveryPreview?.fingerprint;
  $: deliveryAlreadyGenerated = (proofpack?.deliveryHistory.length ?? 0) > 0;
  $: eligibleDeliveryQuestions = proofpack?.questions.filter(isDeliveryQuestionEligible) ?? [];
  $: eligibleDeliveryEvidence = proofpack?.evidence.filter((item) =>
    isDeliveryEvidenceEligible(item, eligibleDeliveryQuestions.map((question) => question.id))
  ) ?? [];
  $: partialDeliveryReady = eligibleDeliveryQuestions.length > 0;
  $: savedWorkReady = partialDeliveryReady && !dirty && !analysisOutOfDate && hasFreshProofpack;
  $: excludedDeliveryQuestionCount = (proofpack?.questions.length ?? 0) - eligibleDeliveryQuestions.length;
  $: guideTitle = analysisOutOfDate
    ? "Réanalysez le questionnaire avant de continuer."
    : isProofpackRecalculating
      ? "Attendez la nouvelle empreinte du dossier."
      : dirty
        ? "Sauvegardez les changements dans ce navigateur."
        : deliveryQuestionIds.length === 0 && partialDeliveryReady
          ? draftAnswers > 0
            ? `Préparez une livraison partielle avec ${eligibleDeliveryQuestions.length} réponse${eligibleDeliveryQuestions.length > 1 ? "s" : ""}.`
            : "Préparez le contenu exact destiné au client."
          : deliveryQuestionIds.length === 0 && draftAnswers > 0
            ? `Traitez une première réponse parmi les ${draftAnswers} brouillons.`
            : deliveryQuestionIds.length === 0 && !partialDeliveryReady
              ? "Requalifiez une réponse avant de préparer une livraison."
            : !deliveryConfirmed
              ? "Relisez la prévisualisation puis confirmez-la."
              : returnPackEnabled && record?.sourceImport && !returnPackBuild
                ? "Préparez le classeur de réponses avant la transmission."
                : "Générez le dossier client contrôlé.";
  $: guideReason = analysisOutOfDate
    ? "Le questionnaire source et le dossier analysé ne correspondent plus ; la sauvegarde et les téléchargements restent verrouillés."
    : isProofpackRecalculating
      ? "Chaque modification doit produire une empreinte fraîche avant sauvegarde ou export."
      : dirty
        ? "La sauvegarde fixe la révision locale et l’empreinte qui serviront à la revue d’export."
        : deliveryQuestionIds.length === 0 && partialDeliveryReady
          ? draftAnswers > 0
            ? `Les ${draftAnswers} brouillon${draftAnswers > 1 ? "s" : ""} restent dans le dossier maître et ne seront pas transmis. Vous pourrez les compléter plus tard.`
            : "Rien n’est transmis par défaut ; vous autorisez explicitement chaque réponse et chaque référence publique."
          : deliveryQuestionIds.length === 0 && draftAnswers > 0
            ? "Une seule réponse prête ou avec réserve suffit pour commencer une livraison partielle ; les autres restent locales."
            : deliveryQuestionIds.length === 0 && !partialDeliveryReady
              ? "Toutes les réponses sont actuellement non exportables. Aucune livraison vide ne peut être confirmée."
            : !deliveryConfirmed
              ? "La confirmation est liée au contenu exact et à son empreinte, pas à une sélection abstraite."
              : returnPackEnabled && record?.sourceImport && !returnPackBuild
                ? "Le classeur BLACKPROOF propre reste lié à l’empreinte exacte du dossier client confirmé."
                : "Le ZIP client contient uniquement les éléments relus et confirmés pour ce destinataire.";
  $: guideActionLabel = analysisOutOfDate
    ? "Aller à Réanalyser"
    : isProofpackRecalculating
      ? "Voir l’état du dossier"
      : dirty
        ? "Aller à Sauvegarder"
        : deliveryQuestionIds.length === 0 && partialDeliveryReady
          ? draftAnswers > 0 ? "Préparer la livraison partielle" : "Aller à la sélection"
          : deliveryQuestionIds.length === 0 && draftAnswers > 0
            ? "Aller au prochain brouillon"
            : deliveryQuestionIds.length === 0 && !partialDeliveryReady
              ? "Revoir les réponses"
            : !deliveryConfirmed
              ? "Aller à la confirmation"
              : returnPackEnabled && record?.sourceImport && !returnPackBuild
                ? "Préparer le classeur"
                : "Aller à l’export";
  $: guideActionHref = analysisOutOfDate || dirty
    ? "#editor-actions"
    : isProofpackRecalculating
      ? "#editor-status"
      : deliveryQuestionIds.length === 0 && partialDeliveryReady
          ? "#delivery-review"
        : deliveryQuestionIds.length === 0 && draftAnswers > 0
          ? "#questions-and-evidence"
        : deliveryQuestionIds.length === 0 && !partialDeliveryReady
          ? "#questions-and-evidence"
        : !deliveryConfirmed
          ? "#delivery-confirmation"
          : returnPackEnabled && record?.sourceImport && !returnPackBuild
            ? "#return-pack"
            : "#delivery-export-actions";
  $: guideSteps = [
    { label: "Dossier", state: "done" as const },
    { label: "Réponse prête", state: partialDeliveryReady ? "done" as const : "current" as const },
    { label: "Sauvegarder", state: !partialDeliveryReady ? "upcoming" as const : savedWorkReady ? "done" as const : "current" as const },
    { label: "Envoi client", state: deliveryAlreadyGenerated ? "done" as const : savedWorkReady ? "current" as const : "upcoming" as const },
  ];

  function isDeliveryQuestionEligible(question: ProofQuestion): boolean {
    return (question.answerExportStatus === "ready" || question.answerExportStatus === "reserved")
      && Boolean(question.answerText?.trim())
      && (question.answerExportStatus !== "reserved" || Boolean(question.answerReservation?.trim()));
  }

  function isDeliveryEvidenceEligible(item: EvidenceItem, selectedQuestionIds = deliveryQuestionIds): boolean {
    return item.status === "available"
      && item.exportMode !== "internal-only"
      && Boolean(item.publicReference?.trim())
      && selectedQuestionIds.includes(item.questionId);
  }

  function reconcileDeliverySelection(nextProofpack: ProofPack) {
    const eligibleQuestionIds = new Set(nextProofpack.questions.filter(isDeliveryQuestionEligible).map((question) => question.id));
    deliveryQuestionIds = deliveryQuestionIds.filter((id) => eligibleQuestionIds.has(id));
    const eligibleEvidenceIds = new Set(nextProofpack.evidence
      .filter((item) => isDeliveryEvidenceEligible(item, deliveryQuestionIds))
      .map((item) => item.id));
    deliveryEvidenceIds = deliveryEvidenceIds.filter((id) => eligibleEvidenceIds.has(id));
  }

  function selectAllEligibleDeliveryContent() {
    if (!proofpack || deliveryReviewDisabled) return;
    deliveryQuestionIds = proofpack.questions.filter(isDeliveryQuestionEligible).map((question) => question.id);
    deliveryEvidenceIds = proofpack.evidence
      .filter((item) => isDeliveryEvidenceEligible(item, deliveryQuestionIds))
      .map((item) => item.id);
    void refreshDeliveryPreview();
  }

  function clearDeliverySelection() {
    deliveryQuestionIds = [];
    deliveryEvidenceIds = [];
    clearDeliveryPreview("Sélection du dossier client effacée.");
  }

  function operationIsActive(generation: number): boolean {
    return !storageInvalidated && generation === operationGeneration;
  }

  function lockSensitiveEditorState(reason: SensitivePageLockReason | "manual") {
    loadAbortController?.abort();
    loadAbortController = null;
    operationGeneration += 1;
    editRevision += 1;
    deliveryPreviewRequest += 1;
    if (rebuildDebounceTimer) {
      window.clearTimeout(rebuildDebounceTimer);
      rebuildDebounceTimer = undefined;
    }
    dirty = false;
    isLoading = false;
    isSaving = false;
    isReanalyzing = false;
    isProofpackRecalculating = false;
    localPassphrase = undefined;
    baseRevisionId = undefined;
    record = null;
    proofpack = null;
    questionnaire = "";
    pendingSourceLineage = null;
    deliveryPreview = null;
    deliveryPreviewJson = "";
    deliveryPreviewMarkdown = "";
    deliveryConfirmed = false;
    deliveryConfirmedFingerprint = "";
    deliveryQuestionIds = [];
    deliveryEvidenceIds = [];
    deliveryRecipientLabel = "";
    deliveryConfirmedBy = "";
    deliveryMessage = "";
    returnPackBuild = null;
    returnPackConfirmed = false;
    returnPackMessage = "";
    isBuildingReturnPack = false;
    issuerName = "";
    issuerPrivateKeyJwk = null;
    signatureMessage = "";
    revocationReason = "";
    receiptMessage = "";
    lastDeliveryZipFilename = "";
    activeQuestionId = "";
    snapshotAvailable = {};
    localStorageStatus = null;
    questionnaireBindingActualSha256 = "";
    questionnaireBindingExpectedSha256 = "";
    openEvidenceQualificationIds = [];
    evidenceReferenceMessages = {};
    knowledgeVault = null;
    knowledgePassphrase = "";
    knowledgeMatches = {};
    resetKnowledgeForm();
    unlockMode = "existing";
    unlockPassphrase = "";
    unlockPassphraseConfirmation = "";
    unlockError = "";
    errorMessage = "";
    statusMessage = reason === "manual"
      ? "Dossier verrouillé : le contenu déchiffré et les phrases secrètes ont été effacés de cette page."
      : "Dossier verrouillé automatiquement après inactivité ou passage prolongé en arrière-plan. Les modifications non sauvegardées ont été abandonnées.";
    onPassphraseConsumed?.();
  }

  function clearReturnPack(message = "") {
    returnPackBuild = null;
    returnPackConfirmed = false;
    returnPackMessage = message;
  }

  function clearDeliveryPreview(message = "", preserveReturnPack = false) {
    deliveryPreviewRequest += 1;
    deliveryPreview = null;
    deliveryPreviewMasterFingerprint = "";
    deliveryPreviewJson = "";
    deliveryPreviewMarkdown = "";
    deliveryConfirmed = false;
    deliveryConfirmedFingerprint = "";
    deliveryMessage = message;
    if (!preserveReturnPack) clearReturnPack();
  }

  async function refreshDeliveryPreview() {
    const generation = operationGeneration;
    const request = ++deliveryPreviewRequest;
    deliveryConfirmed = false;
    deliveryConfirmedFingerprint = "";
    deliveryMessage = "";
    clearReturnPack();

    if (!proofpack || deliveryQuestionIds.length === 0 || deliveryReviewDisabled) {
      deliveryPreview = null;
      deliveryPreviewJson = "";
      deliveryPreviewMarkdown = "";
      return;
    }

    try {
      const preview = await buildProofPackDelivery(proofpack, {
        questionIds: deliveryQuestionIds,
        evidenceIds: deliveryEvidenceIds,
        confirmed: true,
      });
      if (request !== deliveryPreviewRequest || !operationIsActive(generation)) return;
      deliveryPreview = preview;
      deliveryPreviewMasterFingerprint = proofpack.fingerprint;
      deliveryPreviewJson = exportProofPackDeliveryJson(preview);
      deliveryPreviewMarkdown = exportDeliveryResponseMarkdown(preview);
    } catch (error) {
      if (request !== deliveryPreviewRequest || !operationIsActive(generation)) return;
      deliveryPreview = null;
      deliveryPreviewMasterFingerprint = "";
      deliveryPreviewJson = "";
      deliveryPreviewMarkdown = "";
      deliveryMessage = error instanceof Error ? error.message : "Impossible de préparer l’aperçu du dossier client.";
    }
  }

  function resetDeliveryReview(preserveReturnPack = false, clearSelection = false) {
    if (clearSelection) {
      deliveryQuestionIds = [];
      deliveryEvidenceIds = [];
    }
    clearDeliveryPreview("La confirmation du dossier client a été réinitialisée après modification.", preserveReturnPack);
  }

  function toggleDeliveryQuestion(questionId: string, checked: boolean) {
    deliveryQuestionIds = checked
      ? [...deliveryQuestionIds, questionId]
      : deliveryQuestionIds.filter((id) => id !== questionId);
    if (!checked && proofpack) {
      const evidenceIds = new Set(proofpack.evidence.filter((item) => item.questionId === questionId).map((item) => item.id));
      deliveryEvidenceIds = deliveryEvidenceIds.filter((id) => !evidenceIds.has(id));
    }
    void refreshDeliveryPreview();
  }

  function toggleDeliveryEvidence(evidenceId: string, checked: boolean) {
    deliveryEvidenceIds = checked
      ? [...deliveryEvidenceIds, evidenceId]
      : deliveryEvidenceIds.filter((id) => id !== evidenceId);
    void refreshDeliveryPreview();
  }

  function toggleDeliveryConfirmation(checked: boolean) {
    deliveryConfirmed = checked && Boolean(deliveryPreview);
    deliveryConfirmedFingerprint = deliveryConfirmed ? deliveryPreview!.fingerprint : "";
    deliveryMessage = "";
    if (!deliveryConfirmed) clearReturnPack();
  }

  async function confirmedDelivery(): Promise<ProofPackDelivery | null> {
    if (!deliveryPreview || !proofpack || !deliveryPreviewCurrent) return null;
    return await confirmProofPackDeliveryPreview(deliveryPreview, deliveryConfirmedFingerprint);
  }

  async function prepareReturnPack(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const sourceFile = input.files?.[0];
    clearReturnPack();
    if (!returnPackEnabled) {
      input.value = "";
      clearReturnPack("L’export vers un nouveau classeur XLSX est temporairement indisponible.");
      return;
    }
    if (!sourceFile || !proofpack || !record?.sourceImport) return;
    const generation = operationGeneration;
    isBuildingReturnPack = true;
    try {
      const delivery = await confirmedDelivery();
      if (!delivery) throw new Error("Confirmez d’abord l’aperçu exact du dossier client.");
      const selectedQuestions = proofpack.questions.filter((question) => deliveryQuestionIds.includes(question.id));
      if (selectedQuestions.length !== delivery.questions.length) throw new Error("La correspondance entre le dossier maître et le dossier client est incomplète.");
      const built = await buildReturnPackXlsx({
        sourceFile,
        proofpack,
        sourceImport: record.sourceImport,
        delivery,
        questionMappings: selectedQuestions.map((question, index) => ({
          masterQuestionId: question.id,
          deliveryQuestionId: delivery.questions[index]!.id,
        })),
      });
      if (!operationIsActive(generation)) return;
      returnPackBuild = built;
      returnPackMessage = `${built.preview.changes.length} cellule(s) préparée(s). Relisez l’avant/après avant le téléchargement.`;
    } catch (error) {
      if (!operationIsActive(generation)) return;
      returnPackMessage = error instanceof Error ? error.message : "Impossible de préparer le classeur de réponses XLSX.";
      input.value = "";
    } finally {
      if (operationIsActive(generation)) isBuildingReturnPack = false;
    }
  }

  function downloadReturnPack() {
    if (!returnPackEnabled) {
      clearReturnPack("L’export vers un nouveau classeur XLSX est temporairement indisponible.");
      return;
    }
    if (!returnPackBuild || !returnPackConfirmed) return;
    downloadBlob(returnPackBuild.filename, returnPackBuild.blob);
    returnPackMessage = "Téléchargement du classeur demandé au navigateur. Le fichier reste lié à l’empreinte du dossier client affichée.";
  }

  async function generateIssuerSigningIdentity() {
    const generation = operationGeneration;
    try {
      const pair = await generateDeliverySigningKeyPair();
      if (!operationIsActive(generation)) return;
      issuerPrivateKeyJwk = pair.privateKeyJwk;
      downloadFile("blackproof-issuer-private-key.jwk.json", JSON.stringify(pair.privateKeyJwk, null, 2), "application/json");
      signatureMessage = "Paire de clés P-256 générée en mémoire. La clé privée vient d’être proposée au téléchargement : conservez-la hors de BLACKPROOF pour signer les versions suivantes.";
    } catch (error) {
      if (!operationIsActive(generation)) return;
      signatureMessage = error instanceof Error ? error.message : "Impossible de générer la clé de signature.";
    }
  }

  async function loadIssuerSigningKey(event: Event) {
    const generation = operationGeneration;
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    issuerPrivateKeyJwk = null;
    signatureMessage = "";
    if (!file) return;
    try {
      if (file.size > 100_000) throw new Error("Le fichier de clé dépasse 100 ko.");
      const key = JSON.parse(await file.text()) as JsonWebKey;
      if (!operationIsActive(generation)) return;
      if (key.kty !== "EC" || key.crv !== "P-256" || typeof key.d !== "string") throw new Error("Clé privée JWK EC P-256 attendue.");
      issuerPrivateKeyJwk = key;
      signatureMessage = "Clé privée chargée uniquement en mémoire pour cette page.";
    } catch (error) {
      if (!operationIsActive(generation)) return;
      input.value = "";
      signatureMessage = error instanceof Error ? error.message : "Clé de signature illisible.";
    }
  }

  async function downloadIssuerSignature() {
    if (!issuerPrivateKeyJwk) return;
    const generation = operationGeneration;
    const privateKeyJwk = issuerPrivateKeyJwk;
    try {
      const delivery = await confirmedDelivery();
      if (!operationIsActive(generation)) return;
      if (!delivery) throw new Error("Confirmez d’abord l’aperçu exact du dossier client.");
      const signature = await signDeliveryFingerprint({
        subjectType: "delivery",
        subjectFingerprint: delivery.fingerprint,
        issuer: issuerName,
        privateKeyJwk,
      });
      if (!operationIsActive(generation)) return;
      downloadFile(`blackproof-signature-${delivery.deliveryId}.json`, exportDeliveryProtocolJson(signature), "application/json");
      signatureMessage = "Signature détachée générée. Elle authentifie la possession de la clé ; le nom d’émetteur reste une déclaration à rattacher à une clé connue du destinataire.";
    } catch (error) {
      if (!operationIsActive(generation)) return;
      signatureMessage = error instanceof Error ? error.message : "Impossible de signer le dossier client.";
    }
  }

  async function updateLocalReceiptStatus(deliveryId: string, status: "generated" | "sent" | "revoked") {
    const generation = operationGeneration;
    if (!proofpack || !record) return;
    const source = { ...proofpack, deliveryHistory: proofpack.deliveryHistory.map((receipt) => receipt.deliveryId === deliveryId ? { ...receipt, status } : receipt) };
    const proofCase = { ...source.case, updatedAt: new Date().toISOString() };
    const debts = buildProofDebt(proofCase, source.questions, source.evidence, source.debts);
    const rebuilt = await buildProofPack(proofCase, source.questions, source.evidence, debts, { sourceQuestionnaire: source.sourceQuestionnaire, previousProofPack: source });
    const saved = await saveLocalCase({ questionnaire, proofpack: rebuilt, passphrase: localPassphrase, baseRevisionId, sourceImport: record.sourceImport, sourceLineage: record.sourceLineage, knowledgeUses: record.knowledgeUses });
    if (!operationIsActive(generation)) return;
    record = saved;
    proofpack = saved.proofpack;
    baseRevisionId = saved.proofpack.revisionId;
  }

  async function markDeliverySent(receipt: DeliveryHistoryEntry) {
    const generation = operationGeneration;
    receiptMessage = "";
    if (!window.confirm("Confirmez que vous avez envoyé ce dossier. Cette indication reste locale et ne prouve pas sa réception.")) return;
    try {
      await updateLocalReceiptStatus(receipt.deliveryId, "sent");
      if (!operationIsActive(generation)) return;
      receiptMessage = "Envoi déclaré dans le journal local. Aucun contenu n’a été transmis par cette action.";
    } catch (error) {
      if (!operationIsActive(generation)) return;
      receiptMessage = error instanceof Error ? error.message : "Impossible de mettre à jour le journal local.";
    }
  }

  async function revokeDeliveryLocally(receipt: DeliveryHistoryEntry) {
    const generation = operationGeneration;
    receiptMessage = "";
    try {
      const deliveryJson = await getDeliverySnapshot(caseId, receipt.deliveryId, localPassphrase);
      if (!operationIsActive(generation)) return;
      if (!deliveryJson) throw new Error("Copie archivée du dossier client requise pour produire la déclaration de révocation.");
      const delivery = JSON.parse(deliveryJson) as ProofPackDelivery;
      if (!(await verifyProofPackDeliveryJson(deliveryJson)).isValid || delivery.fingerprint !== receipt.fingerprint) throw new Error("Copie archivée du dossier client invalide ou non liée au reçu.");
      if (!operationIsActive(generation)) return;
      const revocation = await createDeliveryRevocation(delivery, revocationReason || undefined);
      if (!operationIsActive(generation)) return;
      if (!operationIsActive(generation)) return;
      await updateLocalReceiptStatus(receipt.deliveryId, "revoked");
      if (!operationIsActive(generation)) return;
      downloadFile(`blackproof-revocation-${receipt.deliveryId}.json`, exportDeliveryProtocolJson(revocation), "application/json");
      receiptMessage = `Dossier client ${receipt.deliveryId} marqué révoqué dans le journal local ; transmettez la déclaration JSON au destinataire par un canal de confiance.`;
    } catch (error) {
      if (!operationIsActive(generation)) return;
      receiptMessage = error instanceof Error ? error.message : "Déclaration de révocation impossible.";
    }
  }

  function getProofpackRebuildDebounceMs(): number {
    const configured = Number((globalThis as typeof globalThis & {
      __BLACKPROOF_REBUILD_DEBOUNCE_MS?: number;
    }).__BLACKPROOF_REBUILD_DEBOUNCE_MS);

    if (Number.isFinite(configured) && configured >= 0 && configured <= 2_000) {
      return configured;
    }

    return PROOFPACK_REBUILD_DEBOUNCE_MS;
  }

  function migrateLegacyAnswerReservations(source: ProofPack): {
    proofpack: ProofPack;
    migrated: boolean;
  } {
    let migrated = false;
    const questions = source.questions.map((question) => {
      const legacyQuestion = question as ProofQuestion & { answerRéserve?: string };

      if (typeof legacyQuestion.answerRéserve !== "string") {
        return question;
      }

      const { answerRéserve, ...currentQuestion } = legacyQuestion;
      migrated = true;

      return {
        ...currentQuestion,
        answerReservation: currentQuestion.answerReservation || answerRéserve,
      };
    });

    return {
      proofpack: migrated ? { ...source, questions } : source,
      migrated,
    };
  }

  function migrateLegacyEvidenceReferences(source: ProofPack): {
    proofpack: ProofPack;
    migrated: boolean;
    downgradedIds: string[];
  } {
    let migrated = false;
    const downgradedIds: string[] = [];
    const evidence = source.evidence.map((item) => {
      if (item.status !== "available" || isEvidenceReferenceComplete(item)) return item;

      const referenceType = item.referenceType
        ?? (item.fileUri ? "uri"
          : item.documentHash ? "document-hash"
            : item.fileName ? "file"
              : item.sourceSystem ? "source-record"
                : undefined);
      const referenceId = item.referenceId
        ?? item.fileUri
        ?? item.documentHash
        ?? item.fileName;
      const normalized = {
        ...item,
        referenceType,
        referenceId,
        exportMode: item.exportMode ?? "internal-only" as const,
      };

      migrated = true;
      if (!isEvidenceReferenceComplete(normalized)) {
        normalized.status = "expected";
        downgradedIds.push(item.id);
      }
      return normalized;
    });

    return {
      proofpack: migrated ? { ...source, evidence } : source,
      migrated,
      downgradedIds,
    };
  }

  function hasQuestionnaireSource(source: ProofPack): source is ProofPack & {
    sourceQuestionnaire: ProofPackQuestionnaireSource;
  } {
    return typeof (source as ProofPack & { sourceQuestionnaire?: ProofPackQuestionnaireSource }).sourceQuestionnaire?.sha256 === "string";
  }

  function flagQuestionnaireBindingError(error: unknown): boolean {
    if (!(error instanceof LocalQuestionnaireBindingError)) return false;
    analysisOutOfDate = true;
    dirty = false;
    questionnaireBindingActualSha256 = error.actualSha256;
    questionnaireBindingExpectedSha256 = error.expectedSha256;
    statusMessage = "Questionnaire local différent du questionnaire analysé. Relancez l’analyse avant toute sauvegarde ou export.";
    return true;
  }

  async function assertQuestionnaireReadyForExport(current: ProofPack): Promise<void> {
    await verifyLocalQuestionnaireBinding(questionnaire, current);
  }

  async function buildLocalQuestionnaireSource(
    text: string,
    source?: ProofPackQuestionnaireSource
  ): Promise<ProofPackQuestionnaireSource> {
    return buildQuestionnaireSource(text, {
      fileName: source?.fileName ?? "questionnaire-local.txt",
      format: source?.format ?? "text",
      importedAt: source?.importedAt ?? new Date().toISOString(),
      originalFileSha256: source?.originalFileSha256,
    });
  }

  async function rebuildMigratedProofpack(source: ProofPack, sourceQuestionnaireText: string): Promise<ProofPack> {
    const proofCase = {
      ...source.case,
      updatedAt: new Date().toISOString(),
    };

    const migrated = migrateLegacyAnswerReservations(source);
    const evidenceMigration = migrateLegacyEvidenceReferences(migrated.proofpack);
    const sourceQuestionnaire = hasQuestionnaireSource(source)
      ? source.sourceQuestionnaire
      : await buildLocalQuestionnaireSource(sourceQuestionnaireText);

    const needsIdentityMigration = typeof (source as Partial<ProofPack>).revisionId !== "string"
      || !Array.isArray((source as Partial<ProofPack>).deliveryHistory);
    if (!migrated.migrated && !evidenceMigration.migrated && hasQuestionnaireSource(source) && !needsIdentityMigration) {
      return source;
    }

    const debts = buildProofDebt(proofCase, evidenceMigration.proofpack.questions, evidenceMigration.proofpack.evidence, source.debts);
    return buildProofPack(proofCase, evidenceMigration.proofpack.questions, evidenceMigration.proofpack.evidence, debts, {
      sourceQuestionnaire,
      previousProofPack: source,
    });
  }

  async function unlockCaseFromForm() {
    unlockError = "";
    try {
      assertLocalPassphrase(unlockPassphrase);
      if (unlockMode === "migration" && unlockPassphraseConfirmation !== unlockPassphrase) {
        throw new Error("Les phrases secrètes ne correspondent pas.");
      }
      await loadCase(unlockPassphrase);
    } catch (error) {
      unlockError = error instanceof Error ? error.message : "Déverrouillage impossible.";
    }
  }

  async function loadCase(providedPassphrase = "") {
    loadAbortController?.abort();
    const abortController = new AbortController();
    loadAbortController = abortController;
    const generation = ++operationGeneration;
    errorMessage = "";
    statusMessage = "";
    unlockError = "";
    isLoading = true;

    try {
      await captureLocalStorageEpoch();
      if (!operationIsActive(generation)) return;
      const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search);
      caseId = params.get("id") ?? "";

      if (!caseId) {
        errorMessage = "Aucun identifiant de dossier fourni dans l’URL.";
        return;
      }

      let found: LocalProofCaseRecord | undefined;
      try {
        found = await getLocalCase(caseId, providedPassphrase || undefined, abortController.signal);
        if (!operationIsActive(generation)) return;
      } catch (error) {
        if (!operationIsActive(generation)) return;
        if (error instanceof Error && error.message.includes("migration chiffrée")) {
          if (!providedPassphrase) {
            unlockMode = "migration";
            return;
          }
          assertLocalPassphrase(providedPassphrase);
          found = await migrateLegacyClearLocalCaseEncryption(caseId, providedPassphrase, abortController.signal);
          if (!operationIsActive(generation)) return;
          localPassphrase = providedPassphrase;
          statusMessage = "Dossier historique chiffré avant lecture.";
        } else {
          if (!(error instanceof Error) || (!error.message.includes("chiffré") && !error.message.includes("Phrase secrète"))) throw error;
          if (!providedPassphrase) {
            unlockMode = "existing";
            return;
          }
          unlockMode = "existing";
          unlockError = error.message;
          return;
        }
      }

      if (!found) {
        errorMessage = `Dossier local introuvable : ${caseId}`;
        return;
      }
      if (providedPassphrase) {
        if (!operationIsActive(generation)) return;
        localPassphrase = providedPassphrase;
        onPassphraseConsumed?.();
      }
      unlockMode = null;
      unlockPassphrase = "";
      unlockPassphraseConfirmation = "";
      if (!operationIsActive(generation)) return;

      const foundRevisionId = (found.proofpack as Partial<ProofPack>).revisionId;
      const envelopeNormalization = await migrateCanonicalLocalProofCaseRecord(found);
      if (!operationIsActive(generation)) return;
      const migratedLegacyEnvelope = envelopeNormalization.migrated;
      const migratedCanonicalQuestionnaire = envelopeNormalization.questionnaireCanonicalized;
      const migratedQuestionnaireProofpack = envelopeNormalization.proofpackRevisionMigrated;
      let migratedLegacySource = false;
      found = envelopeNormalization.record;
      if (hasQuestionnaireSource(found.proofpack)) {
        try {
          await verifyLocalQuestionnaireBinding(found.questionnaire, found.proofpack);
          if (!operationIsActive(generation)) return;
        } catch (error) {
          if (!operationIsActive(generation)) return;
          if (!flagQuestionnaireBindingError(error)) throw error;
          questionnaire = found.questionnaire;
          record = found;
          baseRevisionId = found.proofpack.revisionId;
          proofpack = found.proofpack;
          editRevision = 0;
          completedProofpackRevision = 0;
          isProofpackRecalculating = false;
          await refreshSnapshotAvailability(proofpack.deliveryHistory ?? [], generation);
          if (!operationIsActive(generation)) return;
          const bindingErrorStorageStatus = await getLocalStorageStatus(caseId);
          if (!operationIsActive(generation)) return;
          localStorageStatus = bindingErrorStorageStatus;
          return;
        }
      }
      if (!hasQuestionnaireSource(found.proofpack)) {
        const migratedProofpack = await rebuildMigratedProofpack(found.proofpack, found.questionnaire);
        if (!operationIsActive(generation)) return;
        found = await saveLocalCase({
          questionnaire: found.questionnaire,
          proofpack: migratedProofpack,
          passphrase: localPassphrase,
          baseRevisionId: typeof foundRevisionId === "string" ? foundRevisionId : undefined,
          sourceImport: found.sourceImport,
          sourceLineage: found.sourceLineage,
          knowledgeUses: found.knowledgeUses,
        });
        if (!operationIsActive(generation)) return;
        migratedLegacySource = true;
      } else if (migratedLegacyEnvelope) {
        found = await saveLocalCase({
          questionnaire: envelopeNormalization.record.questionnaire,
          proofpack: envelopeNormalization.record.proofpack,
          passphrase: localPassphrase,
          baseRevisionId: typeof foundRevisionId === "string" ? foundRevisionId : undefined,
          sourceImport: found.sourceImport,
          sourceLineage: found.sourceLineage,
          knowledgeUses: found.knowledgeUses,
        });
        if (!operationIsActive(generation)) return;
      }

      const legacySnapshots = found.proofpack.deliveryHistory.filter((receipt) => receipt.deliveryJson);
      if (legacySnapshots.length > 0) {
        const allSnapshots = (await Promise.all(found.proofpack.deliveryHistory.map(async (receipt) => ({
          deliveryId: receipt.deliveryId,
          deliveryJson: receipt.deliveryJson ?? await getDeliverySnapshot(caseId, receipt.deliveryId, localPassphrase),
        })))).filter((item): item is { deliveryId: string; deliveryJson: string } => Boolean(item.deliveryJson));
        if (!operationIsActive(generation)) return;
        const deliveryHistory = found.proofpack.deliveryHistory.map(({ deliveryJson: _deliveryJson, ...receipt }) => receipt);
        const source = { ...found.proofpack, deliveryHistory };
        const proofCase = { ...source.case, updatedAt: new Date().toISOString() };
        const debts = buildProofDebt(proofCase, source.questions, source.evidence, source.debts);
        const migrated = await buildProofPack(proofCase, source.questions, source.evidence, debts, {
          sourceQuestionnaire: source.sourceQuestionnaire,
          previousProofPack: source,
        });
        if (!operationIsActive(generation)) return;
        const migratedRecord: LocalProofCaseRecord = {
          ...found,
          title: migrated.case.title,
          companyName: migrated.case.companyName,
          clientName: migrated.case.clientName,
          proofpack: migrated,
          proofpackFingerprint: migrated.fingerprint,
          createdAt: migrated.case.createdAt,
          updatedAt: migrated.case.updatedAt,
        };
        await restoreLocalCaseBackup({ record: migratedRecord, snapshots: allSnapshots, passphrase: localPassphrase });
        if (!operationIsActive(generation)) return;
        found = migratedRecord;
        statusMessage = `${legacySnapshots.length} ancienne(s) copie(s) de dossier client extraite(s) vers le stockage séparé.`;
      }

      questionnaire = found.questionnaire;
      const loaded = migrateLegacyAnswerReservations(found.proofpack);
      const evidenceMigration = migrateLegacyEvidenceReferences(loaded.proofpack);
      const needsSourceMigration = !hasQuestionnaireSource(found.proofpack);
      const needsIdentityMigration = typeof (found.proofpack as Partial<ProofPack>).revisionId !== "string"
        || !Array.isArray((found.proofpack as Partial<ProofPack>).deliveryHistory);

      if (loaded.migrated || evidenceMigration.migrated || needsSourceMigration || needsIdentityMigration) {
        const migratedProofpack = await rebuildMigratedProofpack(found.proofpack, found.questionnaire);
        if (!operationIsActive(generation)) return;

        const savedRecord = await saveLocalCase({
          questionnaire,
          proofpack: migratedProofpack,
          passphrase: localPassphrase,
          baseRevisionId: typeof found.proofpack.revisionId === "string" ? found.proofpack.revisionId : undefined,
          sourceImport: found.sourceImport,
          sourceLineage: found.sourceLineage,
          knowledgeUses: found.knowledgeUses,
        });
        if (!operationIsActive(generation)) return;
        record = savedRecord;
        baseRevisionId = record.proofpack.revisionId;
        proofpack = record.proofpack;
        editRevision = 0;
        completedProofpackRevision = 0;
        isProofpackRecalculating = false;
        analysisOutOfDate = false;
        questionnaireBindingActualSha256 = "";
        questionnaireBindingExpectedSha256 = "";
        dirty = false;
        openEvidenceReferenceIds = evidenceMigration.downgradedIds;
        statusMessage = loaded.migrated
          ? "Dossier chargé. Ancienne réserve migrée, empreinte recalculée et dossier sauvegardé."
          : evidenceMigration.downgradedIds.length > 0
            ? "Dossier chargé. Les preuves disponibles sans référence complète ont été remises en attente."
            : evidenceMigration.migrated
              ? "Dossier chargé. Références de preuves anciennes normalisées et sauvegardées."
              : "Dossier chargé. Empreinte du questionnaire source ajoutée et dossier sauvegardé.";
      } else {
        record = found;
        baseRevisionId = found.proofpack.revisionId;
        proofpack = found.proofpack;
        editRevision = 0;
        completedProofpackRevision = 0;
        isProofpackRecalculating = false;
        analysisOutOfDate = false;
        questionnaireBindingActualSha256 = "";
        questionnaireBindingExpectedSha256 = "";
        dirty = false;
        statusMessage = migratedLegacySource
          ? "Dossier chargé. Empreinte du questionnaire source ajoutée et dossier sauvegardé."
          : migratedQuestionnaireProofpack
            ? "Dossier chargé. Questionnaire migré vers sa représentation canonique LF, nouvelle révision empreintée et sauvegardée."
          : migratedCanonicalQuestionnaire
            ? "Dossier chargé. Questionnaire local migré vers sa forme canonique empreintée et sauvegardé."
          : migratedLegacyEnvelope
            ? "Dossier chargé. Enveloppe locale version 13 normalisée et sauvegardée."
            : "Dossier chargé depuis IndexedDB.";
      }
      if (!activeQuestionId || !proofpack?.questions.some((question) => question.id === activeQuestionId)) {
        activeQuestionId = proofpack?.questions[0]?.id ?? "";
      }
      await refreshSnapshotAvailability(proofpack?.deliveryHistory ?? [], generation);
      if (!operationIsActive(generation)) return;
      const finalStorageStatus = await getLocalStorageStatus(caseId);
      if (!operationIsActive(generation)) return;
      localStorageStatus = finalStorageStatus;
    } catch (error) {
      if (!operationIsActive(generation)) return;
      if (error instanceof Error) {
        if (unlockMode && providedPassphrase) {
          unlockError = error.message;
          errorMessage = "";
        } else {
          errorMessage = error.message;
        }
      } else {
        errorMessage = "Erreur inconnue pendant le chargement local.";
      }
    } finally {
      if (loadAbortController === abortController) loadAbortController = null;
      if (operationIsActive(generation)) isLoading = false;
    }
  }

  async function refreshSnapshotAvailability(receipts: DeliveryHistoryEntry[], generation = operationGeneration) {
    const entries = await Promise.all(
      receipts.map(async (receipt) => [receipt.deliveryId, await hasDeliverySnapshot(caseId, receipt.deliveryId)] as const)
    );
    if (operationIsActive(generation)) snapshotAvailable = Object.fromEntries(entries);
  }

  function scheduleProofpackRebuild(
    source: ProofPack,
    statusText: (rebuilt: ProofPack) => string
  ) {
    const generation = operationGeneration;
    if (rebuildDebounceTimer) {
      window.clearTimeout(rebuildDebounceTimer);
    }

    const revision = editRevision + 1;
    editRevision = revision;
    dirty = true;
    isProofpackRecalculating = true;
    statusMessage = "Recalcul du dossier en cours…";

    rebuildDebounceTimer = window.setTimeout(() => {
      rebuildQueue = rebuildQueue
        .catch(() => undefined)
        .then(async () => {
          const proofCase = {
            ...source.case,
            updatedAt: new Date().toISOString(),
          };

          const debts = buildProofDebt(proofCase, source.questions, source.evidence, source.debts);
          const rebuilt = await buildProofPack(proofCase, source.questions, source.evidence, debts, {
            sourceQuestionnaire: source.sourceQuestionnaire,
            previousProofPack: source,
          });

          if (revision !== editRevision || !operationIsActive(generation)) {
            return;
          }

          proofpack = rebuilt;
          completedProofpackRevision = revision;
          isProofpackRecalculating = false;
          statusMessage = statusText(rebuilt);
        })
        .catch((error) => {
          if (revision !== editRevision || !operationIsActive(generation)) {
            return;
          }

          isProofpackRecalculating = false;
          if (error instanceof SecurityValidationError) {
            errorMessage = `${error.code}: ${error.message}`;
          } else if (error instanceof Error) {
            errorMessage = error.message;
          } else {
            errorMessage = "Erreur inconnue pendant le recalcul du dossier.";
          }
        });
    }, getProofpackRebuildDebounceMs());
  }

  function rebuildProofpackWithQuestions(questions: ProofQuestion[]) {
    if (!proofpack) return;

    const proofCase = {
      ...proofpack.case,
      updatedAt: new Date().toISOString(),
    };
    const nextProofpack = {
      ...proofpack,
      case: proofCase,
      questions,
    };

    proofpack = nextProofpack;
    reconcileDeliverySelection(nextProofpack);
    scheduleProofpackRebuild(nextProofpack, () => "Réponse mise à jour. Empreinte recalculée.");
  }

  async function updateQuestionFields(
    questionId: string,
    patch: Partial<Pick<ProofQuestion, "answerText" | "answerReservation" | "answerConfidence" | "answerExportStatus">>
  ) {
    if (!proofpack) return;
    resetDeliveryReview();
    const invalidatesKnowledge = "answerText" in patch || "answerReservation" in patch || "answerConfidence" in patch;
    if (invalidatesKnowledge && record?.knowledgeUses?.some((use) => use.questionId === questionId)) {
      record = { ...record, knowledgeUses: record.knowledgeUses.filter((use) => use.questionId !== questionId) };
      knowledgeMatches = { ...knowledgeMatches, [questionId]: [] };
    }

    const questions = proofpack.questions.map((question) =>
      question.id === questionId
        ? {
            ...question,
            ...patch,
          }
        : question
    );

    rebuildProofpackWithQuestions(questions);
  }

  function resetKnowledgeForm() {
    knowledgeFormQuestionId = "";
    knowledgeFormIntent = null;
    knowledgeUnlockInput = "";
    knowledgeUnlockConfirmation = "";
    knowledgeApprovedBy = "";
    knowledgeApplicability = "";
    knowledgeAliases = "";
    knowledgeReviewDate = "";
  }

  async function runKnowledgeSearch(question: ProofQuestion, generation = operationGeneration) {
    if (!knowledgeVault || !operationIsActive(generation)) return;
    errorMessage = "";
    try {
      if (findKnowledgeMatches(question, knowledgeVault.entries).some((match) => match.score >= 95 && match.entry.answerText === question.answerText && match.entry.answerReservation === question.answerReservation)) {
        throw new Error("KNOWLEDGE_DUPLICATE: une formulation identique est déjà approuvée pour cette question ou un alias exact.");
      }
      const matches = findKnowledgeMatches(question, knowledgeVault.entries);
      knowledgeMatches = { ...knowledgeMatches, [question.id]: matches };
      statusMessage = matches.length ? `${matches.length} formulation(s) candidate(s), aucune appliquée automatiquement.` : "Aucune formulation suffisamment proche dans la base personnelle.";
      resetKnowledgeForm();
    } catch (error) {
      if (!operationIsActive(generation)) return;
      errorMessage = error instanceof Error ? error.message : "Impossible de consulter la base personnelle.";
    }
  }

  async function beginKnowledgeAction(question: ProofQuestion, intent: "search" | "promote") {
    const generation = operationGeneration;
    if (knowledgeVault && knowledgePassphrase) {
      if (intent === "search") {
        await runKnowledgeSearch(question, generation);
        return;
      }
      resetKnowledgeForm();
      knowledgeFormQuestionId = question.id;
      knowledgeFormIntent = "promote";
      return;
    }
    knowledgeFormVaultExists = await knowledgeVaultExists();
    if (!operationIsActive(generation)) return;
    resetKnowledgeForm();
    knowledgeFormQuestionId = question.id;
    knowledgeFormIntent = intent;
  }

  async function submitKnowledgeUnlock(question: ProofQuestion) {
    const generation = operationGeneration;
    errorMessage = "";
    try {
      assertLocalPassphrase(knowledgeUnlockInput);
      if (!knowledgeFormVaultExists && knowledgeUnlockConfirmation !== knowledgeUnlockInput) {
        throw new Error("Les phrases secrètes de la base personnelle ne correspondent pas.");
      }
      const loadedVault = await loadKnowledgeVault(knowledgeUnlockInput);
      if (!operationIsActive(generation)) return;
      knowledgeVault = loadedVault;
      knowledgePassphrase = knowledgeUnlockInput;
      knowledgeUnlockInput = "";
      knowledgeUnlockConfirmation = "";
      if (knowledgeFormIntent === "search") await runKnowledgeSearch(question, generation);
    } catch (error) {
      if (!operationIsActive(generation)) return;
      errorMessage = error instanceof Error ? error.message : "Impossible d’ouvrir la base personnelle.";
    }
  }

  async function savePromotedKnowledge(question: ProofQuestion) {
    const generation = operationGeneration;
    if (!proofpack || !knowledgeVault || !knowledgePassphrase) return;
    errorMessage = "";
    try {
      const reviewAt = knowledgeReviewDate ? `${knowledgeReviewDate}T00:00:00.000Z` : undefined;
      const entry = await createKnowledgeEntry({
        proofpack,
        question,
        aliases: knowledgeAliases.split("|").map((value) => value.trim()).filter(Boolean),
        applicabilityNotes: knowledgeApplicability,
        approvedByLabel: knowledgeApprovedBy,
        reviewAt,
      });
      if (!operationIsActive(generation)) return;
      const savedVault = await saveKnowledgeEntry(entry, knowledgePassphrase, knowledgeVault.revisionId);
      if (!operationIsActive(generation)) return;
      knowledgeVault = savedVault;
      statusMessage = "Formulation ajoutée au coffre personnel chiffré. Elle restera un brouillon lors de chaque application.";
      knowledgeMatches = { ...knowledgeMatches, [question.id]: findKnowledgeMatches(question, knowledgeVault.entries) };
      resetKnowledgeForm();
    } catch (error) {
      if (!operationIsActive(generation)) return;
      errorMessage = error instanceof Error ? error.message : "Impossible d’ajouter cette formulation à la base personnelle.";
    }
  }

  function useKnowledgeMatch(question: ProofQuestion, match: KnowledgeMatch) {
    if (!proofpack || !record) return;
    const applied = applyKnowledgeEntry(match.entry, question.id);
    const questions = proofpack.questions.map((item) => item.id === question.id ? { ...item, ...applied.patch } : item);
    const uses = [...(record.knowledgeUses ?? []).filter((use) => use.questionId !== question.id), applied.use];
    record = { ...record, knowledgeUses: uses };
    resetDeliveryReview();
    rebuildProofpackWithQuestions(questions);
    statusMessage = "Formulation copiée comme brouillon. Vérifiez le périmètre, les preuves et le statut avant export.";
  }

  function handleRéponseTextChange(questionId: string, event: Event) {
    const textarea = event.currentTarget as HTMLTextAreaElement;
    void updateQuestionFields(questionId, { answerText: textarea.value });
  }

  function handleRéponseRéserveChange(questionId: string, event: Event) {
    const textarea = event.currentTarget as HTMLTextAreaElement;
    void updateQuestionFields(questionId, { answerReservation: textarea.value });
  }

  function handleRéponseConfidenceChange(questionId: string, event: Event) {
    const select = event.currentTarget as HTMLSelectElement;
    void updateQuestionFields(questionId, { answerConfidence: select.value as AnswerConfidence });
  }

  function handleRéponseExportStatusChange(questionId: string, event: Event) {
    const select = event.currentTarget as HTMLSelectElement;
    void updateQuestionFields(questionId, { answerExportStatus: select.value as AnswerExportStatus });
  }

  type EvidencePatch = Partial<Pick<EvidenceItem,
    | "status"
    | "referenceType"
    | "referenceId"
    | "publicReference"
    | "sourceSystem"
    | "observedAt"
    | "owner"
    | "sensitivity"
    | "exportMode"
    | "fileName"
    | "fileUri"
    | "documentHash"
    | "expiresAt"
    | "coveredScope"
    | "validator"
    | "validatedAt"
    | "controlResult"
    | "version"
    | "history"
  >>;

  function normalizeEvidenceReference(item: EvidenceItem, patch: EvidencePatch): EvidenceItem {
    const next = { ...item, ...patch };

    if ("referenceType" in patch || "referenceId" in patch) {
      next.fileName = undefined;
      next.fileUri = undefined;
      next.documentHash = undefined;

      const referenceId = next.referenceId?.trim();
      if (referenceId) {
        if (next.referenceType === "file") next.fileName = referenceId;
        if (next.referenceType === "uri") next.fileUri = referenceId;
        if (next.referenceType === "document-hash") next.documentHash = referenceId;
      }
    }

    if (next.status === "available" && !isEvidenceReferenceComplete(next)) {
      next.status = "expected";
    }

    return next;
  }

  function rebuildProofpackWithEvidence(evidenceId: string, patch: EvidencePatch, message: string) {
    if (!proofpack) return;
    resetDeliveryReview();

    const proofCase = {
      ...proofpack.case,
      updatedAt: new Date().toISOString(),
    };

    const evidence = proofpack.evidence.map((item) =>
      item.id === evidenceId ? normalizeEvidenceReference(item, patch) : item
    );
    const nextProofpack = {
      ...proofpack,
      case: proofCase,
      evidence,
    };

    proofpack = nextProofpack;
    reconcileDeliverySelection(nextProofpack);
    scheduleProofpackRebuild(
      nextProofpack,
      (rebuilt) => `${message} Indice de dette de preuve : ${rebuilt.summary.proofDebtScore}/100.`
    );
  }

  function handleEvidenceStatusChange(evidenceId: string, event: Event) {
    const select = event.currentTarget as HTMLSelectElement;
    const status = select.value as EvidenceStatus;
    const item = proofpack?.evidence.find((candidate) => candidate.id === evidenceId);
    if (!item) return;

    if (status === "available" && !isEvidenceReferenceComplete(item)) {
      select.value = item.status;
      openEvidenceReferenceIds = openEvidenceReferenceIds.includes(evidenceId)
        ? openEvidenceReferenceIds
        : [...openEvidenceReferenceIds, evidenceId];
      openEvidenceQualificationIds = openEvidenceQualificationIds.includes(evidenceId)
        ? openEvidenceQualificationIds
        : [...openEvidenceQualificationIds, evidenceId];
      evidenceReferenceMessages = {
        ...evidenceReferenceMessages,
        [evidenceId]: "Renseignez une référence complète avant de déclarer cette preuve disponible.",
      };
      return;
    }

    const patch: EvidencePatch = status === "not-exportable"
      ? { status, exportMode: "internal-only" }
      : { status };
    rebuildProofpackWithEvidence(evidenceId, patch, "Statut de preuve mis à jour.");
  }

  function selectQuestionEvidenceBatchStatus(questionId: string, event: Event) {
    questionEvidenceBatchStatuses = {
      ...questionEvidenceBatchStatuses,
      [questionId]: (event.currentTarget as HTMLSelectElement).value as EvidenceStatus,
    };
  }

  function applyEvidenceStatusToQuestion(questionId: string) {
    if (!proofpack) return;
    const status = questionEvidenceBatchStatuses[questionId] ?? "expected";
    if (status === "available") return;
    resetDeliveryReview();

    const proofCase = { ...proofpack.case, updatedAt: new Date().toISOString() };
    const evidence = proofpack.evidence.map((item) => {
      if (item.questionId !== questionId) return item;
      return normalizeEvidenceReference(item, status === "not-exportable"
        ? { status, exportMode: "internal-only" }
        : { status });
    });
    const nextProofpack = { ...proofpack, case: proofCase, evidence };
    proofpack = nextProofpack;
    reconcileDeliverySelection(nextProofpack);
    const label = evidenceStatusOptions.find((option) => option.value === status)?.label ?? status;
    scheduleProofpackRebuild(
      nextProofpack,
      (rebuilt) => `Toutes les preuves de la question sont marquées « ${label} ». Indice de dette de preuve : ${rebuilt.summary.proofDebtScore}/100.`
    );
  }

  function showQuestion(questionId: string) {
    activeQuestionId = questionId;
    window.requestAnimationFrame(() => {
      document.getElementById(`question-${questionId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function showNextQuestionMatching(predicate: (question: ProofQuestion) => boolean) {
    if (!proofpack || proofpack.questions.length === 0) return;
    const activeIndex = Math.max(0, proofpack.questions.findIndex((question) => question.id === activeQuestionId));
    const ordered = [
      ...proofpack.questions.slice(activeIndex + 1),
      ...proofpack.questions.slice(0, activeIndex + 1),
    ];
    const next = ordered.find(predicate);
    if (next) showQuestion(next.id);
  }

  function showNextDraftQuestion() {
    showNextQuestionMatching((question) => !question.answerExportStatus || question.answerExportStatus === "draft");
  }

  function showNextQuestionWithOpenEvidence() {
    if (!proofpack) return;
    const openQuestionIds = new Set(proofpack.evidence
      .filter((item) => item.status === "expected" || item.status === "missing" || item.status === "expired" || item.status === "declared")
      .map((item) => item.questionId));
    showNextQuestionMatching((question) => openQuestionIds.has(question.id));
  }

  function openEvidenceReferenceEditor(evidenceId: string) {
    openEvidenceReferenceIds = openEvidenceReferenceIds.includes(evidenceId)
      ? openEvidenceReferenceIds.filter((id) => id !== evidenceId)
      : [...openEvidenceReferenceIds, evidenceId];
  }

  function updateEvidenceReference(evidenceId: string, patch: EvidencePatch) {
    evidenceReferenceMessages = { ...evidenceReferenceMessages, [evidenceId]: "" };
    rebuildProofpackWithEvidence(evidenceId, patch, "Référence de preuve mise à jour.");
  }

  function handleEvidenceObservedAtChange(evidenceId: string, event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const parsed = Date.parse(input.value);
    updateEvidenceReference(evidenceId, {
      observedAt: Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined,
    });
  }

  function handleEvidenceDateChange(
    evidenceId: string,
    field: "expiresAt" | "validatedAt",
    event: Event
  ) {
    const input = event.currentTarget as HTMLInputElement;
    const parsed = Date.parse(input.value);
    updateEvidenceReference(evidenceId, {
      [field]: Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined,
    });
  }

  function updateEvidenceHistory(evidenceId: string, value: string) {
    const history = value
      .split("\n")
      .map((entry) => entry.trim())
      .filter(Boolean);
    updateEvidenceReference(evidenceId, { history: history.length > 0 ? history : undefined });
  }

  function observedAtInputValue(value: string | undefined): string {
    if (!value || !Number.isFinite(Date.parse(value))) return "";
    const date = new Date(value);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  }

  function evidenceReferenceIdentityCompletion(item: EvidenceItem): number {
    return [
      Boolean(item.referenceType),
      Boolean(item.referenceId?.trim()),
    ].filter(Boolean).length;
  }

  function evidenceQualificationCompletion(item: EvidenceItem): number {
    return [
      Boolean(item.sourceSystem?.trim()),
      Boolean(item.owner?.trim()),
      Boolean(item.exportMode),
      typeof item.observedAt === "string" && Number.isFinite(Date.parse(item.observedAt)),
    ].filter(Boolean).length;
  }

  function useCurrentEvidenceObservationTime(evidenceId: string) {
    updateEvidenceReference(evidenceId, { observedAt: new Date().toISOString() });
  }

  function reuseEvidenceContextForQuestion(questionId: string, sourceEvidenceId: string) {
    if (!proofpack) return;
    const source = proofpack.evidence.find((item) => item.id === sourceEvidenceId);
    if (!source || evidenceQualificationCompletion(source) < 4) {
      evidenceReferenceMessages = {
        ...evidenceReferenceMessages,
        [sourceEvidenceId]: "Qualifiez d’abord la source, la date, le propriétaire et le mode d’export.",
      };
      return;
    }

    resetDeliveryReview();
    const proofCase = { ...proofpack.case, updatedAt: new Date().toISOString() };
    const evidence = proofpack.evidence.map((item) => {
      if (item.questionId !== questionId || item.id === sourceEvidenceId) return item;
      return normalizeEvidenceReference(item, {
        sourceSystem: source.sourceSystem,
        observedAt: source.observedAt,
        owner: source.owner,
        sensitivity: source.sensitivity,
        exportMode: source.exportMode,
      });
    });
    const nextProofpack = { ...proofpack, case: proofCase, evidence };
    proofpack = nextProofpack;
    reconcileDeliverySelection(nextProofpack);
    scheduleProofpackRebuild(
      nextProofpack,
      () => "Contexte recopié sur les autres preuves de la question. Le type, l’identifiant et la référence publique restent propres à chaque preuve."
    );
  }

  function markEvidenceAvailable(evidenceId: string) {
    const item = proofpack?.evidence.find((candidate) => candidate.id === evidenceId);
    if (!item || !isEvidenceReferenceComplete(item)) {
      evidenceReferenceMessages = {
        ...evidenceReferenceMessages,
        [evidenceId]: "La référence reste incomplète. Tous les champs sont obligatoires.",
      };
      return;
    }

    evidenceReferenceMessages = { ...evidenceReferenceMessages, [evidenceId]: "" };
    openEvidenceReferenceIds = openEvidenceReferenceIds.filter((id) => id !== evidenceId);
    rebuildProofpackWithEvidence(evidenceId, { status: "available" }, "Preuve déclarée disponible avec une référence complète.");
  }

  function markQuestionnaireDirty() {
    resetDeliveryReview(false, true);
    if (record?.sourceImport && proofpack?.sourceQuestionnaire.originalFileSha256) {
      pendingSourceLineage = {
        formatVersion: SOURCE_LINEAGE_FORMAT_VERSION,
        derivation: "xlsx-text-edit",
        originalFileName: proofpack.sourceQuestionnaire.fileName,
        originalFileSha256: proofpack.sourceQuestionnaire.originalFileSha256,
        originalImportProfile: XLSX_SOURCE_IMPORT_PROFILE,
        previousProofPackFingerprint: proofpack.fingerprint,
      };
    } else if (record?.sourceLineage && proofpack) {
      pendingSourceLineage = {
        formatVersion: SOURCE_LINEAGE_FORMAT_VERSION,
        derivation: "xlsx-text-edit",
        originalFileName: record.sourceLineage.originalFileName,
        originalFileSha256: record.sourceLineage.originalFileSha256,
        originalImportProfile: record.sourceLineage.originalImportProfile,
        previousProofPackFingerprint: proofpack.fingerprint,
      };
    }
    if (record?.sourceImport || record?.knowledgeUses?.length) record = { ...record, sourceImport: undefined, knowledgeUses: [] };
    dirty = true;
    analysisOutOfDate = true;
    questionnaireBindingActualSha256 = "";
    questionnaireBindingExpectedSha256 = "";
    statusMessage = "Questionnaire source modifié : relancez l’analyse avant sauvegarde ou export.";
  }

  type SaveCurrentCaseResult = { ok: true; record: LocalProofCaseRecord } | { ok: false };

  async function saveCurrentCase(passphrase = localPassphrase): Promise<SaveCurrentCaseResult> {
    const generation = operationGeneration;
    if (!proofpack) return { ok: false };

    if (analysisOutOfDate) {
      errorMessage = "Questionnaire source modifié : relancez l’analyse avant de sauvegarder ce dossier.";
      return { ok: false };
    }

    if (!hasFreshProofpack) {
      errorMessage = "Recalcul du dossier en cours. Attendez la nouvelle empreinte avant de sauvegarder.";
      return { ok: false };
    }

    errorMessage = "";
    statusMessage = "";
    isSaving = true;

    try {
      const savedRecord = await saveLocalCase({
        questionnaire,
        proofpack,
        passphrase,
        baseRevisionId,
        sourceImport: record?.sourceImport,
        sourceLineage: record?.sourceLineage,
        knowledgeUses: record?.knowledgeUses,
      });
      if (!operationIsActive(generation)) return { ok: false };
      record = savedRecord;

      baseRevisionId = record.proofpack.revisionId;
      dirty = false;
      statusMessage = "Dossier local sauvegardé.";
      return { ok: true, record };
    } catch (error) {
      if (!operationIsActive(generation)) return { ok: false };
      if (flagQuestionnaireBindingError(error)) {
        return { ok: false };
      } else if (error instanceof SecurityValidationError) {
        errorMessage = `${error.code}: ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = "Erreur inconnue pendant la sauvegarde.";
      }
      return { ok: false };
    } finally {
      if (operationIsActive(generation)) isSaving = false;
    }
  }

  async function reanalyzeQuestionnaire() {
    const generation = operationGeneration;
    if (!proofpack) return;

    const confirmed = window.confirm(
      "Réanalyser le questionnaire va reconstruire les questions, preuves et dettes. Les statuts de preuve actuels seront réinitialisés. Continuer ?"
    );

    if (!confirmed) return;

    errorMessage = "";
    statusMessage = "";
    isReanalyzing = true;

    try {
      const previousCase = proofpack.case;
      const previousSource = proofpack.sourceQuestionnaire;
      const editedXlsxSource = pendingSourceLineage !== null;
      const editedFileName = editedXlsxSource
        ? previousSource.fileName.toLowerCase().endsWith(".xlsx")
          ? `${previousSource.fileName.replace(/\.xlsx$/i, "")}-edited.txt`
          : previousSource.fileName
        : previousSource.fileName;

      const rebuilt = await createProofCaseFromQuestionnaire(questionnaire, {
        title: previousCase.title,
        companyName: previousCase.companyName,
        clientName: previousCase.clientName,
        framework: previousCase.framework,
        sourceFileName: editedFileName,
        sourceFormat: editedXlsxSource ? "text" : previousSource.format,
        sourceOriginalFileSha256: previousSource.originalFileSha256,
      });
      if (!operationIsActive(generation)) return;

      const proofCase = {
        ...rebuilt.case,
        id: previousCase.id,
        createdAt: previousCase.createdAt,
        updatedAt: new Date().toISOString(),
      };

      const questions = rebuilt.questions.map((question) => ({
        ...question,
        caseId: proofCase.id,
      }));

      const evidence = rebuilt.evidence.map((item) => ({
        ...item,
        caseId: proofCase.id,
      }));

      const debts = buildProofDebt(proofCase, questions, evidence, proofpack.debts);
      const nextProofpack = await buildProofPack(proofCase, questions, evidence, debts, {
        sourceQuestionnaire: rebuilt.proofpack.sourceQuestionnaire,
        previousProofPack: proofpack,
      });
      if (!operationIsActive(generation)) return;
      proofpack = nextProofpack;
      if (record && editedXlsxSource && pendingSourceLineage) {
        record = {
          ...record,
          sourceLineage: {
            ...pendingSourceLineage,
            derivedSourceFileName: proofpack.sourceQuestionnaire.fileName,
            derivedSourceSha256: proofpack.sourceQuestionnaire.normalizedQuestionnaireSha256 ?? proofpack.sourceQuestionnaire.sha256,
            derivedAt: new Date().toISOString(),
          },
        };
        pendingSourceLineage = null;
      }
      editRevision += 1;
      completedProofpackRevision = editRevision;
      isProofpackRecalculating = false;
      analysisOutOfDate = false;
      questionnaireBindingActualSha256 = "";
      questionnaireBindingExpectedSha256 = "";

      dirty = true;
      if (record?.knowledgeUses?.length) record = { ...record, knowledgeUses: [] };
      statusMessage = `Questionnaire réanalysé. Indice de dette de preuve : ${proofpack.summary.proofDebtScore}/100.`;
    } catch (error) {
      if (!operationIsActive(generation)) return;
      if (error instanceof SecurityValidationError) {
        errorMessage = `${error.code}: ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = "Erreur inconnue pendant la réanalyse.";
      }
    } finally {
      if (operationIsActive(generation)) isReanalyzing = false;
    }
  }

  function downloadFile(filename: string, content: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    downloadBlob(filename, blob);
  }

  function downloadBlob(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    link.click();

    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function downloadZip() {
    if (!proofpack || !hasFreshProofpack || analysisOutOfDate) return;
    const generation = operationGeneration;
    const current = proofpack;
    try {
      await assertQuestionnaireReadyForExport(current);
      if (!operationIsActive(generation)) return;
      await assertCurrentLocalRevision(current.case.id, baseRevisionId, localPassphrase);
      const blob = await buildProofPackZipBlob(current, record?.sourceImport, record?.knowledgeUses, record?.sourceLineage);
      if (!operationIsActive(generation)) return;
      await assertCurrentLocalRevision(current.case.id, baseRevisionId, localPassphrase);
      if (!operationIsActive(generation)) return;
      downloadBlob(buildProofPackZipFilename(current), blob);
    } catch (error) {
      if (!operationIsActive(generation)) return;
      if (!flagQuestionnaireBindingError(error)) errorMessage = localStorageErrorMessage(error);
    }
  }

  async function downloadDeliveryZip() {
    if (!proofpack || deliveryActionsDisabled) return;
    const generation = operationGeneration;
    try {
      const delivery = await confirmedDelivery();
      if (!operationIsActive(generation)) return;
      if (!delivery) return;
      const blob = await buildProofPackDeliveryZipBlob(delivery);
      if (!operationIsActive(generation)) return;
      const filename = buildProofPackDeliveryZipFilename(delivery);
      if (!await recordDeliveryReceipt(delivery, filename)) return;
      if (!operationIsActive(generation)) return;
      downloadBlob(filename, blob);
      lastDeliveryZipFilename = filename;
      deliveryMessage = "ZIP client généré ; le reçu et le fichier delivery.json sont archivés localement.";
    } catch (error) {
      if (!operationIsActive(generation)) return;
      deliveryMessage = error instanceof Error ? error.message : "Impossible de générer le ZIP client.";
    }
  }

  async function downloadDeliveryJson() {
    if (!proofpack || deliveryActionsDisabled) return;
    const generation = operationGeneration;
    try {
      const delivery = await confirmedDelivery();
      if (!operationIsActive(generation)) return;
      if (!delivery) return;
      const filename = `blackproof-delivery-${delivery.deliveryId}.json`;
      if (!await recordDeliveryReceipt(delivery, filename)) return;
      if (!operationIsActive(generation)) return;
      downloadFile(filename, exportProofPackDeliveryJson(delivery), "application/json");
      deliveryMessage = "delivery.json généré et export archivé localement.";
    } catch (error) {
      if (!operationIsActive(generation)) return;
      deliveryMessage = error instanceof Error ? error.message : "Impossible de générer delivery.json.";
    }
  }

  async function recordDeliveryReceipt(delivery: ProofPackDelivery, filename: string): Promise<boolean> {
    const generation = operationGeneration;
    if (!proofpack) throw new Error("Dossier maître indisponible pour enregistrer le reçu d’envoi.");
    const currentProofpack = proofpack;
    if (proofpack.deliveryHistory.length >= SECURITY_LIMITS.MAX_DELIVERY_HISTORY_ENTRIES) {
      throw new Error(`La limite de ${SECURITY_LIMITS.MAX_DELIVERY_HISTORY_ENTRIES} exports archivés est atteinte pour ce dossier maître.`);
    }
    const deliveryJson = exportProofPackDeliveryJson(delivery);
    if (deliveryJson.length > SECURITY_LIMITS.MAX_DELIVERY_SNAPSHOT_CHARS) {
      throw new Error(`La copie archivée du dossier client dépasse la limite locale de ${SECURITY_LIMITS.MAX_DELIVERY_SNAPSHOT_CHARS} caractères.`);
    }
    const selectedQuestionIds = [...deliveryQuestionIds];
    const selectedEvidenceIds = [...deliveryEvidenceIds];
    const receipt: DeliveryHistoryEntry = {
      deliveryId: delivery.deliveryId,
      fingerprint: delivery.fingerprint,
      generatedAt: delivery.generatedAt,
      ...(deliveryRecipientLabel.trim() ? { recipientLabel: deliveryRecipientLabel.trim() } : {}),
      ...(deliveryConfirmedBy.trim() ? { confirmedBy: deliveryConfirmedBy.trim() } : {}),
      selectedQuestionIds,
      selectedEvidenceIds,
      questionMappings: currentProofpack.questions
        .filter((question) => selectedQuestionIds.includes(question.id))
        .map((question, index) => ({ masterQuestionId: question.id, deliveryQuestionId: delivery.questions[index]!.id })),
      evidenceMappings: currentProofpack.questions
        .filter((question) => selectedQuestionIds.includes(question.id))
        .flatMap((question, questionIndex) => currentProofpack.evidence
          .filter((item) => item.questionId === question.id && selectedEvidenceIds.includes(item.id))
          .map((item, evidenceIndex) => ({ masterEvidenceId: item.id, deliveryEvidenceId: delivery.questions[questionIndex]!.evidence[evidenceIndex]!.id }))),
      snapshotSha256: await sha256Hex(deliveryJson),
      filename,
      status: "generated",
    };
    const source = {
      ...proofpack,
      deliveryHistory: [...proofpack.deliveryHistory, receipt],
    };
    const proofCase = { ...source.case, updatedAt: new Date().toISOString() };
    const debts = buildProofDebt(proofCase, source.questions, source.evidence, source.debts);
    const rebuilt = await buildProofPack(proofCase, source.questions, source.evidence, debts, {
      sourceQuestionnaire: source.sourceQuestionnaire,
      previousProofPack: source,
    });
    if (!operationIsActive(generation)) return false;
    if (exportProofPackJson(rebuilt).length > SECURITY_LIMITS.MAX_PROOFPACK_JSON_CHARS) {
      throw new Error("Le dossier maître dépasserait la limite locale de vérification après archivage de cet export.");
    }
    const savedRecord = await saveLocalCaseAndDeliverySnapshot({
      questionnaire,
      proofpack: rebuilt,
      deliveryId: delivery.deliveryId,
      deliveryJson,
      passphrase: localPassphrase,
      baseRevisionId,
      sourceImport: record?.sourceImport,
      sourceLineage: record?.sourceLineage,
      knowledgeUses: record?.knowledgeUses,
    });
    if (!operationIsActive(generation)) return false;
    proofpack = rebuilt;
    record = savedRecord;
    baseRevisionId = savedRecord.proofpack.revisionId;
    snapshotAvailable = { ...snapshotAvailable, [delivery.deliveryId]: true };
    const nextStorageStatus = await getLocalStorageStatus(proofpack.case.id);
    if (!operationIsActive(generation)) return false;
    localStorageStatus = nextStorageStatus;
    editRevision += 1;
    completedProofpackRevision = editRevision;
    dirty = false;
    resetDeliveryReview(false, true);
    return true;
  }

  async function downloadProofPackJson() {
    if (!proofpack || !hasFreshProofpack || analysisOutOfDate) return;
    const generation = operationGeneration;
    const current = proofpack;
    try {
      await assertQuestionnaireReadyForExport(current);
      if (!operationIsActive(generation)) return;
      await assertCurrentLocalRevision(current.case.id, baseRevisionId, localPassphrase);
      const content = exportProofPackJson(current);
      await assertCurrentLocalRevision(current.case.id, baseRevisionId, localPassphrase);
      if (!operationIsActive(generation)) return;
      downloadFile(`${current.case.id}-master.json`, content, "application/json");
    } catch (error) {
      if (!operationIsActive(generation)) return;
      if (!flagQuestionnaireBindingError(error)) errorMessage = localStorageErrorMessage(error);
    }
  }

  async function downloadLocalBackup() {
    if (!record || !proofpack || !hasFreshProofpack || analysisOutOfDate) return;
    const generation = operationGeneration;
    const current = proofpack;
    const currentRecord = record;
    try {
      if (!localPassphrase) {
        throw new Error("Chiffrez d’abord ce dossier pour générer une sauvegarde locale complète.");
      }
      await assertCurrentLocalRevision(current.case.id, baseRevisionId, localPassphrase);
      const backup = await buildLocalBackup(currentRecord, localPassphrase);
      if (!operationIsActive(generation)) return;
      await assertCurrentLocalRevision(current.case.id, baseRevisionId, localPassphrase);
      if (backup.missingSnapshotDeliveryIds.length > 0 && !window.confirm(`Sauvegarde partielle : dossier maître inclus, ${backup.includedSnapshots}/${backup.expectedSnapshots} copie(s) archivée(s), ${backup.missingSnapshotDeliveryIds.length} absente(s). Télécharger malgré tout ?`)) {
        statusMessage = "Téléchargement de la sauvegarde partielle annulé.";
        return;
      }
      await assertCurrentLocalRevision(current.case.id, baseRevisionId, localPassphrase);
      if (!operationIsActive(generation)) return;
      const url = URL.createObjectURL(backup.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "blackproof-local-backup.zip";
      link.rel = "noopener";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      const completeness = backup.missingSnapshotDeliveryIds.length === 0
        ? `Sauvegarde complète : dossier maître inclus, ${backup.includedSnapshots}/${backup.expectedSnapshots} copie(s) archivée(s).`
        : `Sauvegarde partielle : dossier maître inclus, ${backup.includedSnapshots}/${backup.expectedSnapshots} copie(s) archivée(s), ${backup.missingSnapshotDeliveryIds.length} absente(s).`;
      const migrationNotice = backup.questionnaireCanonicalized
        ? " Questionnaire migré vers sa forme canonique empreintée dans la sauvegarde."
        : backup.migratedLegacyEnvelope ? " Enveloppe version 13 normalisée dans la sauvegarde." : "";
      statusMessage = `${completeness}${migrationNotice} Manifeste technique visible ; contenus et inventaire chiffrés. Vérifiez l’enregistrement du fichier.`;
    } catch (error) {
      if (!operationIsActive(generation)) return;
      if (!flagQuestionnaireBindingError(error)) errorMessage = localStorageErrorMessage(error);
    }
  }

  async function downloadArchivedDelivery(receipt: DeliveryHistoryEntry) {
    const generation = operationGeneration;
    deliveryMessage = "";
    try {
      if (!(await hasDeliverySnapshot(caseId, receipt.deliveryId))) {
        snapshotAvailable = { ...snapshotAvailable, [receipt.deliveryId]: false };
        throw new Error("Copie archivée du dossier client introuvable dans le stockage local.");
      }
      const deliveryJson = receipt.deliveryJson ?? await getDeliverySnapshot(caseId, receipt.deliveryId, localPassphrase);
      if (!operationIsActive(generation)) return;
      if (!deliveryJson) throw new Error("Copie archivée du dossier client introuvable dans le stockage local.");
      if (receipt.snapshotSha256 && await sha256Hex(deliveryJson) !== receipt.snapshotSha256) throw new Error("Empreinte de la copie locale invalide.");
      if (!(await verifyProofPackDeliveryJson(deliveryJson)).isValid) throw new Error("Copie locale du dossier client invalide.");
      if (!operationIsActive(generation)) return;
      downloadFile(`${receipt.deliveryId}-delivery.json`, deliveryJson, "application/json");
      deliveryMessage = "Téléchargement de la copie archivée demandé au navigateur. Vérifiez que le fichier a bien été enregistré.";
    } catch (error) {
      if (!operationIsActive(generation)) return;
      deliveryMessage = localStorageErrorMessage(error);
    }
  }

  async function removeLocalDeliverySnapshot(receipt: DeliveryHistoryEntry) {
    const generation = operationGeneration;
    deliveryMessage = "";
    if (!window.confirm("Supprimer définitivement cette copie locale ? Vérifiez auparavant que votre téléchargement est lisible. Le reçu et son empreinte resteront dans le dossier maître.")) return;
    try {
      if (!(await hasDeliverySnapshot(caseId, receipt.deliveryId))) {
        if (!operationIsActive(generation)) return;
        snapshotAvailable = { ...snapshotAvailable, [receipt.deliveryId]: false };
        throw new Error("Copie archivée du dossier client introuvable dans le stockage local.");
      }
      if (!proofpack || !baseRevisionId || !receipt.snapshotSha256) {
        throw new Error("Le reçu affiché ne possède pas les garanties nécessaires à cette suppression.");
      }
      await deleteDeliverySnapshotForCase({
        caseId: proofpack.case.id,
        deliveryId: receipt.deliveryId,
        expectedRevisionId: baseRevisionId,
        expectedSnapshotSha256: receipt.snapshotSha256,
        passphrase: localPassphrase,
      });
      if (!operationIsActive(generation)) return;
      snapshotAvailable = { ...snapshotAvailable, [receipt.deliveryId]: false };
      localStorageStatus = await getLocalStorageStatus(caseId);
      if (!operationIsActive(generation)) return;
      deliveryMessage = "Copie locale supprimée. Le reçu et son empreinte restent dans le dossier maître.";
    } catch (error) {
      if (!operationIsActive(generation)) return;
      deliveryMessage = localStorageErrorMessage(error);
    }
  }

  async function deleteGeneratedDeliveryExport(receipt: DeliveryHistoryEntry) {
    const generation = operationGeneration;
    if (!proofpack || receipt.status !== "generated") return;
    if (!window.confirm("Confirmez que cet export n’a pas été envoyé. Le reçu sera retiré du dossier maître et la copie locale supprimée.")) return;
    const source = { ...proofpack, deliveryHistory: proofpack.deliveryHistory.filter((item) => item.deliveryId !== receipt.deliveryId) };
    const proofCase = { ...source.case, updatedAt: new Date().toISOString() };
    const debts = buildProofDebt(proofCase, source.questions, source.evidence, source.debts);
    const rebuilt = await buildProofPack(proofCase, source.questions, source.evidence, debts, {
      sourceQuestionnaire: source.sourceQuestionnaire,
      previousProofPack: source,
    });
    if (!operationIsActive(generation)) return;
    const savedRecord = await saveLocalCaseAndDeleteDeliverySnapshot({ questionnaire, proofpack: rebuilt, deliveryId: receipt.deliveryId, passphrase: localPassphrase, baseRevisionId, sourceImport: record?.sourceImport, sourceLineage: record?.sourceLineage, knowledgeUses: record?.knowledgeUses });
    if (!operationIsActive(generation)) return;
    proofpack = rebuilt;
    record = savedRecord;
    baseRevisionId = savedRecord.proofpack.revisionId;
    editRevision += 1;
    completedProofpackRevision = editRevision;
    dirty = false;
    deliveryMessage = "Export non envoyé supprimé du journal local.";
  }

  async function downloadSupplierResponse() {
    if (!proofpack || !hasFreshProofpack || analysisOutOfDate) return;
    const generation = operationGeneration;
    const current = proofpack;
    try {
      await assertQuestionnaireReadyForExport(current);
      if (!operationIsActive(generation)) return;
      await assertCurrentLocalRevision(current.case.id, baseRevisionId, localPassphrase);
      const content = exportSupplierResponseMarkdown(current);
      await assertCurrentLocalRevision(current.case.id, baseRevisionId, localPassphrase);
      if (!operationIsActive(generation)) return;
      downloadFile(`${current.case.id}-reponse-fournisseur.md`, content, "text/markdown");
    } catch (error) {
      if (!operationIsActive(generation)) return;
      if (!flagQuestionnaireBindingError(error)) errorMessage = localStorageErrorMessage(error);
    }
  }

  async function downloadEvidenceRegister() {
    if (!proofpack || !hasFreshProofpack || analysisOutOfDate) return;
    const generation = operationGeneration;
    const current = proofpack;
    try {
      await assertQuestionnaireReadyForExport(current);
      if (!operationIsActive(generation)) return;
      await assertCurrentLocalRevision(current.case.id, baseRevisionId, localPassphrase);
      const content = exportEvidenceRegisterCsv(current);
      await assertCurrentLocalRevision(current.case.id, baseRevisionId, localPassphrase);
      if (!operationIsActive(generation)) return;
      downloadFile(`${current.case.id}-registre-preuves.csv`, content, "text/csv");
    } catch (error) {
      if (!operationIsActive(generation)) return;
      if (!flagQuestionnaireBindingError(error)) errorMessage = localStorageErrorMessage(error);
    }
  }

  async function downloadBacklog() {
    if (!proofpack || !hasFreshProofpack || analysisOutOfDate) return;
    const generation = operationGeneration;
    const current = proofpack;
    try {
      await assertQuestionnaireReadyForExport(current);
      if (!operationIsActive(generation)) return;
      await assertCurrentLocalRevision(current.case.id, baseRevisionId, localPassphrase);
      const content = exportRemediationBacklogCsv(current);
      await assertCurrentLocalRevision(current.case.id, baseRevisionId, localPassphrase);
      if (!operationIsActive(generation)) return;
      downloadFile(`${current.case.id}-plan-remediation.csv`, content, "text/csv");
    } catch (error) {
      if (!operationIsActive(generation)) return;
      if (!flagQuestionnaireBindingError(error)) errorMessage = localStorageErrorMessage(error);
    }
  }

  async function downloadBoardMemo() {
    if (!proofpack || !hasFreshProofpack || analysisOutOfDate) return;
    const generation = operationGeneration;
    const current = proofpack;
    try {
      await assertQuestionnaireReadyForExport(current);
      if (!operationIsActive(generation)) return;
      await assertCurrentLocalRevision(current.case.id, baseRevisionId, localPassphrase);
      const content = exportBoardMemoMarkdown(current);
      await assertCurrentLocalRevision(current.case.id, baseRevisionId, localPassphrase);
      if (!operationIsActive(generation)) return;
      downloadFile(`${current.case.id}-note-synthese.md`, content, "text/markdown");
    } catch (error) {
      if (!operationIsActive(generation)) return;
      if (!flagQuestionnaireBindingError(error)) errorMessage = localStorageErrorMessage(error);
    }
  }

  function getExportPosture(
    currentProofpack: ProofPack | null,
    currentSummary: ProofPack["summary"] | undefined,
    currentBlockedAnswers: number,
    currentDraftAnswers: number,
    currentReservedAnswers: number,
    currentWeakEvidenceCount: number,
    currentSensitiveEvidenceCount: number
  ): { tone: ExportPostureTone; label: string; detail: string } {
    if (!currentProofpack || !currentSummary) {
      return {
        tone: "review",
        label: "Analyse en attente",
        detail: "Chargez un dossier local pour préparer la revue avant une éventuelle transmission.",
      };
    }

    if (currentSummary.criticalDebtCount > 0 || currentBlockedAnswers > 0 || currentSummary.proofDebtScore < 45) {
      return {
        tone: "blocked",
        label: "Revue renforcée requise",
        detail: "Les données saisies signalent une dette critique, une réponse exclue ou une préparation très incomplète. La décision reste humaine.",
      };
    }

    if (currentSummary.highDebtCount > 0 || currentWeakEvidenceCount > 0 || currentDraftAnswers > 0) {
      return {
        tone: "review",
        label: "Revue humaine nécessaire",
        detail: "Les données saisies signalent des points incomplets ou fragiles à examiner avant toute décision de transmission.",
      };
    }

    if (currentReservedAnswers > 0 || currentSensitiveEvidenceCount > 0) {
      return {
        tone: "controlled",
        label: "Transmission à décider",
        detail: "Des réserves ou références sensibles sont présentes. Vérifiez le périmètre exact avant de décider d’un export.",
      };
    }

    return {
      tone: "ready",
      label: "Aucun blocage déclaré",
      detail: "Aucun blocage prioritaire n’est calculé à partir des saisies. BLACKPROOF ne valide ni les sources ni l’acceptation par le destinataire.",
    };
  }

  function getProofPriorities(currentProofpack: ProofPack | null): ProofPriority[] {
    if (!currentProofpack) return [];

    const severityRank = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    } as const;

    const priorities: ProofPriority[] = [];
    const seenQuestions = new Set<string>();

    for (const debt of currentProofpack.debts
      .map((debt) => {
        const question = currentProofpack.questions.find((item) => item.id === debt.questionId);

        return {
          debtId: debt.id,
          questionId: debt.questionId,
          questionText: question?.text ?? "Question non retrouvée",
          severity: debt.severity,
          reason: debt.reason,
          recommendedAction: debt.recommendedAction,
        };
      })
      .sort((left, right) => severityRank[left.severity] - severityRank[right.severity])) {
      if (seenQuestions.has(debt.questionId)) continue;

      priorities.push(debt);
      seenQuestions.add(debt.questionId);

      if (priorities.length >= 5) break;
    }

    return priorities;
  }

  onMount(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    const unsubscribeFromSensitivePageLock = subscribeToSensitivePageLock((reason) => lockSensitiveEditorState(reason));
    const unsubscribeFromStorageWipe = subscribeToLocalStorageWipe(() => {
      storageInvalidated = true;
      unsubscribeFromSensitivePageLock();
      lockSensitiveEditorState("manual");
      caseId = "";
      unlockMode = null;
      statusMessage = "";
      errorMessage = "Panic Wipe détecté dans un autre onglet. L’état en mémoire a été effacé et cet éditeur ne peut plus sauvegarder.";
    });
    void loadCase(initialPassphrase);

    return () => {
      loadAbortController?.abort();
      loadAbortController = null;
      window.removeEventListener("beforeunload", handleBeforeUnload);
      unsubscribeFromSensitivePageLock();
      unsubscribeFromStorageWipe();
      if (rebuildDebounceTimer) {
        window.clearTimeout(rebuildDebounceTimer);
      }
    };
  });
</script>

<section
  class="case-editor-shell"
  data-blackproof-knowledge-loaded={knowledgeVault ? "true" : "false"}
  data-blackproof-knowledge-secret-loaded={knowledgePassphrase ? "true" : "false"}
>
  <div class="case-editor-panel">
    <p class="eyebrow">Éditeur de dossier local</p>
    <h1>{proofpack ? "Compléter et préparer le dossier." : "Rouvrir un dossier local."}</h1>
    <p class="lead">
      {proofpack
        ? "Traitez les réponses et preuves, sauvegardez, puis relisez exactement le contenu destiné au client."
        : "Déverrouillez le dossier pour reprendre les réponses, preuves et exports conservés dans ce navigateur."}
    </p>

    <div class="security-note">
      Aucun envoi serveur. Ce dossier est lu depuis IndexedDB et reste dans ce navigateur.
    </div>

    {#if proofpack}
      <div class="actions">
        <button class="button" type="button" onclick={() => lockSensitiveEditorState("manual")}>Verrouiller maintenant</button>
      </div>
    {/if}

    {#if isLoading}
      <p class="empty-state">Chargement du dossier local...</p>
    {:else if unlockMode}
      <section class="unlock-panel" aria-labelledby="unlock-title">
        <p class="eyebrow">{unlockMode === "migration" ? "Migration locale" : "Dossier chiffré"}</p>
        <h2 id="unlock-title">{unlockMode === "migration" ? "Protéger puis ouvrir ce dossier historique." : "Déverrouiller ce dossier."}</h2>
        <p>
          {unlockMode === "migration"
            ? "Choisissez une phrase secrète : le dossier sera chiffré avant que son contenu soit affiché."
            : "Saisissez la phrase secrète choisie à la création. La page se verrouille après 15 minutes d’inactivité ou une minute prolongée en arrière-plan."}
        </p>
        {#if statusMessage}<div class="status-box" role="status">{statusMessage}</div>{/if}
        <label>
          <span>Phrase secrète du dossier</span>
          <input type="password" bind:value={unlockPassphrase} autocomplete={unlockMode === "migration" ? "new-password" : "current-password"} />
        </label>
        {#if unlockMode === "migration"}
          <label>
            <span>Confirmer la phrase secrète</span>
            <input type="password" bind:value={unlockPassphraseConfirmation} autocomplete="new-password" />
          </label>
        {/if}
        <small>16 caractères ou plus recommandés. BLACKPROOF ne peut pas récupérer cette phrase.</small>
        {#if unlockError}<div class="error-box" role="alert">{unlockError}</div>{/if}
        <div class="actions">
          <button class="button primary" type="button" onclick={unlockCaseFromForm} disabled={unlockPassphrase.length < 12 || (unlockMode === "migration" && unlockPassphraseConfirmation !== unlockPassphrase)}>
            {unlockMode === "migration" ? "Chiffrer et ouvrir" : "Déverrouiller le dossier"}
          </button>
          <a class="button" href="/app/cases">Retour aux dossiers</a>
        </div>
      </section>
    {:else if errorMessage}
      <div class="error-box" role="alert">{errorMessage}</div>
      <div class="actions">
        <a class="button" href="/app/cases">Retour aux dossiers locaux</a>
      </div>
    {:else if proofpack && summary}
      <JourneyGuide
        title={guideTitle}
        reason={guideReason}
        actionLabel={guideActionLabel}
        actionHref={guideActionHref}
        steps={guideSteps}
        sticky={false}
        compact={true}
      />

      <section class="case-top">
        <div>
          <p class="kpi">{proofpack.case.id}</p>
          <h2>{proofpack.case.title}</h2>
          <p>{proofpack.case.companyName ?? "Entreprise non renseignée"} → {proofpack.case.clientName ?? "Client non renseigné"}</p>
        </div>

        <div class="score-card">
          <span>Indice de dette de preuve</span>
          <strong>{summary.proofDebtScore}/100</strong>
        </div>
      </section>

      <details class="editor-overview">
        <summary>
          <span>Bilan et priorités</span>
          <strong>{exportProgress}% des réponses qualifiées</strong>
          <small>{summary.questionCount} questions · {weakEvidenceCount} preuves faibles ou manquantes</small>
        </summary>
        <div class="editor-overview-content">
          <div class="summary-grid">
            <article class="metric"><span>Questions</span><strong>{summary.questionCount}</strong></article>
            <article class="metric"><span>Fiches de preuve</span><strong>{summary.evidenceCount}</strong></article>
            <article class="metric"><span>Écarts calculés</span><strong>{summary.proofDebtCount}</strong></article>
            <article class="metric"><span>Réponses préparées</span><strong>{summary.responseCompletenessScore}/100</strong></article>
            <article class="metric"><span>Statuts renseignés</span><strong>{summary.evidenceCoverageScore}/100</strong></article>
            <article class="metric"><span>Qualité et fraîcheur déclarées</span><strong>{summary.evidenceQualityFreshnessScore}/100</strong></article>
            <article class="metric"><span>Préparation de l’export</span><strong>{summary.exportReadinessScore}/100</strong></article>
            <article class="metric"><span>Empreinte</span><code>{proofpack.fingerprint}</code></article>
          </div>

          <p class="input-limit">Les indices utilisent uniquement les réponses, statuts, dates et références saisis. Ils ne valident pas les documents sources.</p>

          <section class="decision-panel">
            <article class={`export-posture ${exportPosture.tone}`}>
              <span>Aide à la revue</span>
              <strong>{exportPosture.label}</strong>
              <p>{exportPosture.detail}</p>
            </article>

            <article class="export-readiness">
              <div class="readiness-head">
                <span>Réponses marquées pour l’export</span>
                <strong>{exportProgress}%</strong>
              </div>
              <progress max="100" value={exportProgress}>{exportProgress}%</progress>
              <div class="readiness-grid">
                <span><strong>{readyAnswers}</strong> prêtes</span>
                <span><strong>{reservedAnswers}</strong> avec réserve</span>
                <span><strong>{draftAnswers}</strong> brouillons</span>
                <span><strong>{blockedAnswers}</strong> bloquées</span>
              </div>
            </article>
          </section>

          <section class="proof-priorities">
            <div class="section-head">
              <div>
                <span>Priorités avant export</span>
                <h2>Renforcer les preuves avant l’export.</h2>
              </div>
              <p>{weakEvidenceCount} preuves faibles ou manquantes · {sensitiveEvidenceCount} preuves sensibles</p>
            </div>

            {#if proofPriorities.length === 0}
              <article class="priority-card empty">
                <strong>Aucun écart prioritaire calculé.</strong>
                <p>Ce résultat dépend uniquement des informations saisies. Relisez les sources et décidez du périmètre avant toute transmission.</p>
              </article>
            {:else}
              <div class="priority-list">
                {#each proofPriorities as priority}
                  <article class={`priority-card ${priority.severity}`}>
                    <span>{debtSeverityLabels[priority.severity]}</span>
                    <strong>{priority.questionText}</strong>
                    <p>{priority.reason}</p>
                    <small>{priority.recommendedAction}</small>
                  </article>
                {/each}
              </div>
            {/if}
          </section>
        </div>
      </details>

      <div id="editor-status" class="editor-status">
        {#if statusMessage}
          <div class="status-box">{statusMessage}</div>
        {/if}

        {#if dirty}
          <div class="dirty-box">
            Modifications non sauvegardées dans IndexedDB.
          </div>
        {/if}

        {#if analysisOutOfDate}
          <div class="dirty-box" role="alert">
            Questionnaire source modifié : le dossier analysé ne correspond plus au texte affiché.
            Relancez l’analyse avant sauvegarde ou export.
            {#if questionnaireBindingActualSha256 && questionnaireBindingExpectedSha256}
              <small>Empreinte locale : <code>{questionnaireBindingActualSha256}</code></small>
              <small>Empreinte analysée : <code>{questionnaireBindingExpectedSha256}</code></small>
            {/if}
          </div>
        {/if}

        {#if isProofpackRecalculating}
          <div class="dirty-box" role="status">
            Recalcul de l’empreinte en cours. Sauvegarde et exports sont temporairement verrouillés.
          </div>
        {/if}
      </div>

      {@render questionsAndEvidence(proofpack)}

      <section class="editor-actions" id="editor-actions" aria-label="Actions du dossier">
        <button class="button primary" type="button" onclick={() => void saveCurrentCase()} disabled={proofpackActionsDisabled}>
          {isSaving ? "Sauvegarde..." : isProofpackRecalculating ? "Recalcul en cours..." : "Sauvegarder les changements"}
        </button>
        <span class="security-state">🔒 Dossier chiffré</span>
        <button class="button" type="button" onclick={reanalyzeQuestionnaire} disabled={isReanalyzing || isProofpackRecalculating}>
          {isReanalyzing ? "Réanalyse..." : "Réanalyser le questionnaire"}
        </button>
        <a class="button" href="/app/cases">Retour aux dossiers</a>
        <a class="button" href="/verify">Vérifier</a>
      </section>

      <details class="questionnaire-block advanced-panel" id="questionnaire-source-editor">
        <summary>Modifier le questionnaire source</summary>
        <div class="advanced-panel-content">
          <h2>Questionnaire source</h2>
          <p>
            Modifiez ce texte uniquement si les questions importées sont incomplètes ou incorrectes. Le dossier devra
            ensuite être réanalysé avant toute sauvegarde ou export.
          </p>
          <textarea aria-label="Questionnaire source" bind:value={questionnaire} rows="10" spellcheck="false" oninput={markQuestionnaireDirty}></textarea>
        </div>
      </details>

      <section class="exports delivery-review" id="delivery-review">
        <div class="section-head">
          <div>
            <span>Dossier client · transmission externe</span>
            <h2>Choisir puis vérifier les éléments destinés au client.</h2>
          </div>
          <p>
            Rien n’est inclus sans action de votre part. Les brouillons, réponses non exportables, preuves internes
            et métadonnées de travail restent exclus.
          </p>
        </div>

        <ol class="micro-steps" aria-label="Étapes de préparation du dossier client">
          <li><span>1</span><strong>Sélectionner</strong><small>les réponses prêtes ou avec réserve</small></li>
          <li><span>2</span><strong>Ajouter</strong><small>les seules références publiques utiles</small></li>
          <li><span>3</span><strong>Relire</strong><small>le contenu exact et son empreinte</small></li>
          <li><span>4</span><strong>Confirmer</strong><small>puis télécharger le ZIP client</small></li>
        </ol>

        <div class="reference-grid delivery-receipt-fields">
          <label>
            <span>Destinataire du dossier client (optionnel)</span>
            <input
              bind:value={deliveryRecipientLabel}
              maxlength={SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS}
              placeholder="Exemple : Client X"
            />
          </label>
          <label>
            <span>Personne ayant relu le dossier (optionnel)</span>
            <input
              bind:value={deliveryConfirmedBy}
              maxlength={SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS}
              placeholder="Exemple : Alice Martin"
            />
          </label>
        </div>

        <div class="delivery-batch-actions" role="group" aria-label="Actions de sélection du dossier client">
          <div>
            <strong>{eligibleDeliveryQuestions.length} réponses admissibles</strong>
            <small>{eligibleDeliveryEvidence.length} références publiques admissibles</small>
          </div>
          <button class="button primary" type="button" onclick={selectAllEligibleDeliveryContent} disabled={deliveryReviewDisabled || eligibleDeliveryQuestions.length === 0}>
            Inclure tous les éléments admissibles
          </button>
          <button class="button" type="button" onclick={clearDeliverySelection} disabled={deliveryQuestionIds.length === 0 && deliveryEvidenceIds.length === 0}>
            Effacer la sélection
          </button>
          {#if deliveryQuestionIds.length > 0 && !deliveryPreviewCurrent}
            <button class="button" type="button" onclick={() => void refreshDeliveryPreview()} disabled={deliveryReviewDisabled}>
              Actualiser l’aperçu
            </button>
          {/if}
        </div>
        {#if dirty}
          <p class="delivery-excluded-note">Enregistrez les modifications avant de préparer le dossier client.</p>
        {/if}

        <details class="delivery-selection-details">
          <summary>
            Ajuster la sélection ligne par ligne
            <small>{deliveryQuestionIds.length} réponse{deliveryQuestionIds.length > 1 ? "s" : ""} · {deliveryEvidenceIds.length} référence{deliveryEvidenceIds.length > 1 ? "s" : ""} sélectionnée{deliveryEvidenceIds.length > 1 ? "s" : ""}</small>
          </summary>
        <div class="delivery-list">
          <h3>Réponses admissibles</h3>
          {#if eligibleDeliveryQuestions.length === 0}
            <p class="empty-state">Aucune réponse n’est encore prête. Revenez aux questions pour terminer leur qualification.</p>
          {/if}
          {#each eligibleDeliveryQuestions as question}
            <label>
              <input
                type="checkbox"
                checked={deliveryQuestionIds.includes(question.id)}
                disabled={deliveryReviewDisabled}
                onchange={(event) => toggleDeliveryQuestion(question.id, (event.currentTarget as HTMLInputElement).checked)}
              />
              <span>
                <strong>{question.text}</strong>
                <small>
                  {question.answerExportStatus === "reserved" ? "Prête avec la réserve saisie" : "Prête à être envoyée"}
                </small>
              </span>
            </label>
          {/each}
          {#if excludedDeliveryQuestionCount > 0}
            <p class="delivery-excluded-note">{excludedDeliveryQuestionCount} réponse{excludedDeliveryQuestionCount > 1 ? "s ne sont" : " n’est"} pas admissible{excludedDeliveryQuestionCount > 1 ? "s" : ""}. <a href="#questions-and-evidence">Revenir aux questions</a></p>
          {/if}

          <h3>Références publiques admissibles</h3>
          {#if eligibleDeliveryEvidence.length === 0}
            <p class="empty-state">Aucune référence publique complète n’est disponible pour les réponses admissibles.</p>
          {/if}
          {#each eligibleDeliveryEvidence as item}
            {@const parentSelected = deliveryQuestionIds.includes(item.questionId)}
            <label class:ineligible={!parentSelected}>
              <input
                type="checkbox"
                checked={deliveryEvidenceIds.includes(item.id)}
                disabled={!parentSelected || deliveryReviewDisabled}
                onchange={(event) => toggleDeliveryEvidence(item.id, (event.currentTarget as HTMLInputElement).checked)}
              />
              <span>
                <strong>{item.title}</strong>
                <small>{parentSelected ? "Seul le texte public saisi sera transmis" : "Sélectionnez d’abord la réponse associée"}</small>
              </span>
            </label>
          {/each}
        </div>
        </details>

        {#if deliveryPreview}
          <section class="delivery-final-preview" aria-labelledby="delivery-preview-title">
            <div class="delivery-preview-head">
              <div>
                <span>Prévisualisation exacte liée à l’empreinte</span>
                <h3 id="delivery-preview-title">Contenu exact associé à votre confirmation</h3>
              </div>
              <code>{deliveryPreview.fingerprint}</code>
            </div>

            <div class="delivery-preview-questions">
              {#each deliveryPreview.questions as question}
                <article>
                  <dl>
                    <div><dt>Identifiant</dt><dd><code>{question.id}</code></dd></div>
                    <div><dt>Question</dt><dd>{question.text}</dd></div>
                    <div><dt>Réponse exacte</dt><dd>{question.answer}</dd></div>
                    <div><dt>Réserve exacte</dt><dd>{question.reservation ?? "Aucune réserve transmise"}</dd></div>
                    <div>
                      <dt>Éléments probants déclarés</dt>
                      <dd>
                        {#if question.evidence.length > 0}
                          <ul>
                            {#each question.evidence as evidence}
                              <li><code>{evidence.id}</code> · {evidence.publicReference}</li>
                            {/each}
                          </ul>
                        {:else}
                          Aucun élément probant déclaré
                        {/if}
                      </dd>
                    </div>
                  </dl>
                </article>
              {/each}
            </div>

            <div class="delivery-preview-files">
              <h4>Fichiers produits</h4>
              <ul>
                {#each [...buildProofPackDeliveryZipFiles(deliveryPreview).map((file) => file.filename), "manifest.json"] as filename}
                  <li><code>{filename}</code></li>
                {/each}
              </ul>
            </div>

            <details open>
              <summary>Contenu final de reponse-fournisseur.md</summary>
              <pre>{deliveryPreviewMarkdown}</pre>
            </details>
            <details>
              <summary>Contenu exact de delivery.json · identifiants et métadonnées</summary>
              <pre>{deliveryPreviewJson}</pre>
            </details>
          </section>
        {:else if deliveryQuestionIds.length > 0}
          <p class="status-box" role="status">Préparation de la prévisualisation finale…</p>
        {/if}

        <label class="delivery-confirmation" id="delivery-confirmation">
          <input
            type="checkbox"
            checked={deliveryConfirmed}
            disabled={deliveryReviewDisabled || !deliveryPreviewCurrent}
            onchange={(event) => toggleDeliveryConfirmation((event.currentTarget as HTMLInputElement).checked)}
          />
          <span>
            J’ai vérifié le contenu exact destiné au client et son empreinte
            {deliveryPreview ? ` ${deliveryPreview.fingerprint}.` : "."}
          </span>
        </label>

        {#if !deliveryActionsDisabled}
          <div class="export-buttons" id="delivery-export-actions">
            <button class="button primary" type="button" onclick={downloadDeliveryZip}>Télécharger le ZIP client</button>
            <button class="button" type="button" onclick={downloadDeliveryJson}>Télécharger le JSON client</button>
          </div>
          <details class="context-help">
            <summary>Signer ce dossier client avec une paire de clés (optionnel)</summary>
            <p>
              La signature détachée couvre exactement l’empreinte affichée. La clé privée reste en mémoire et n’est jamais
              envoyée. Le destinataire doit connaître ou épingler votre clé publique : le nom déclaré n’est pas un certificat.
            </p>
            <div class="reference-grid delivery-receipt-fields">
              <label>
                <span>Libellé d’émetteur déclaré</span>
                <input bind:value={issuerName} maxlength={SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS} placeholder="Exemple : ACME SAS" />
              </label>
              <label>
                <span>Réutiliser une clé privée JWK P-256</span>
                <input type="file" accept=".json,application/json" onchange={loadIssuerSigningKey} />
              </label>
            </div>
            <div class="export-buttons">
              <button class="button" type="button" onclick={() => void generateIssuerSigningIdentity()}>Générer une nouvelle paire de clés</button>
              <button class="button" type="button" disabled={!issuerPrivateKeyJwk || !issuerName.trim()} onclick={() => void downloadIssuerSignature()}>Télécharger la signature JSON</button>
            </div>
            {#if signatureMessage}<p class="status-box" role="status">{signatureMessage}</p>{/if}
          </details>
        {/if}

        {#if returnPackEnabled && record?.sourceImport && deliveryPreview && deliveryConfirmed}
          <section class="delivery-final-preview" id="return-pack" aria-labelledby="return-pack-title">
            <div class="delivery-preview-head">
              <div>
                <span>Classeur de réponses XLSX · fichier BLACKPROOF propre</span>
                <h3 id="return-pack-title">Exporter les réponses validées dans un nouveau classeur borné.</h3>
              </div>
              <code>{deliveryPreview.fingerprint}</code>
            </div>
            <ol class="micro-steps" aria-label="Étapes du classeur de réponses XLSX">
              <li><span>1</span><strong>Resélectionner</strong><small>le XLSX source exact</small></li>
              <li><span>2</span><strong>Vérifier</strong><small>son empreinte source</small></li>
              <li><span>3</span><strong>Relire</strong><small>les valeurs littérales exportées</small></li>
              <li><span>4</span><strong>Télécharger</strong><small>le classeur propre lié au dossier client</small></li>
            </ol>
            <p>
              Le navigateur vérifie le SHA-256 du classeur importé, mais ne copie et ne parse aucune de ses parties OOXML.
              Un nouveau classeur BLACKPROOF à inventaire fixe contient uniquement les questions, réponses, réserves et
              références source sous forme de valeurs littérales, plus l’identifiant, l’empreinte et le lien de vérification.
            </p>
            <div class="reference-grid delivery-receipt-fields">
              <label>
                <span>Classeur XLSX source exact</span>
                <input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  disabled={isBuildingReturnPack}
                  onchange={prepareReturnPack}
                />
              </label>
            </div>
            <p class="input-limit">
              Feuille source : <strong>{record.sourceImport.selectedSheet}</strong> · questions en colonne {record.sourceImport.selectedColumn} · aucun envoi.
            </p>

            {#if returnPackBuild}
              <div class="delivery-preview-files">
                <h4>Aperçu exact des cellules modifiées</h4>
                <ul>
                  {#each returnPackBuild.preview.changes as change}
                    <li>
                      <code>{returnPackBuild.preview.sheetName}!{change.answerCell}</code>
                      <strong>{change.question}</strong>
                      <span>Avant : {change.previousValue || "cellule vide"}</span>
                      <span>Après : {change.nextValue}</span>
                    </li>
                  {/each}
                </ul>
              </div>
              <p>
                Construction propre : aucune partie du package source copiée, inventaire OOXML fixe, valeurs littérales
                uniquement, sans formule, relation externe, macro, connexion ni objet actif.
              </p>
              <p>
                Traçabilité : <a href={returnPackBuild.preview.verifierUrl}>{returnPackBuild.preview.verifierUrl}</a>
              </p>
              <p>
                Statut courant non vérifié. Les contrôles locaux ne prouvent pas que le dossier est toujours actif.
              </p>
              <label class="delivery-confirmation">
                <input type="checkbox" bind:checked={returnPackConfirmed} />
                <span>J’ai relu les cellules avant/après et l’empreinte du dossier client liée au classeur.</span>
              </label>
              <div class="export-buttons">
                <button class="button primary" type="button" disabled={!returnPackConfirmed} onclick={downloadReturnPack}>Télécharger le classeur de réponses XLSX</button>
              </div>
            {/if}
            {#if returnPackMessage}<p class="status-box" role="status">{returnPackMessage}</p>{/if}
          </section>
        {/if}
        {#if deliveryMessage}<p class="status-box" role="status">{deliveryMessage}</p>{/if}
        {#if lastDeliveryZipFilename}
          <section class="post-export-verification" aria-labelledby="post-export-verification-title">
            <div>
              <span>Étape suivante</span>
              <h3 id="post-export-verification-title">Vérifier le ZIP avant de l’envoyer.</h3>
              <p>Ouvrez la page de vérification, puis choisissez <code>{lastDeliveryZipFilename}</code>. Le contrôle reste local dans le navigateur.</p>
            </div>
            <a class="button primary" href="/verify">Vérifier le ZIP téléchargé</a>
          </section>
        {/if}

        {#if proofpack.deliveryHistory.length > 0}
          <details class="delivery-history">
            <summary>Historique des dossiers clients ({proofpack.deliveryHistory.length})</summary>
            <h3 id="delivery-history-title">Journal local des exports</h3>
            <p>{proofpack.deliveryHistory.length}/{SECURITY_LIMITS.MAX_DELIVERY_HISTORY_ENTRIES} reçus · les copies archivées sont stockées séparément du dossier maître. Le statut « généré » ne prouve pas un envoi au destinataire.</p>
            {#if proofpack.deliveryHistory.length >= Math.floor(SECURITY_LIMITS.MAX_DELIVERY_HISTORY_ENTRIES * 0.8)}
              <p class="status-box">Le journal approche de sa limite. Exportez le dossier maître et retirez les reçus devenus inutiles avant de poursuivre.</p>
            {/if}
            <p><code>{proofpack.id}</code> · révision <code>{proofpack.revisionId}</code></p>
            <details class="context-help">
              <summary>Journal d’envoi et déclaration locale de révocation</summary>
              <p>
                Ces indications restent dans ce navigateur. BLACKPROOF n’envoie pas le dossier au destinataire.
                Une déclaration de révocation doit être transmise séparément par un canal de confiance ;
                elle ne constitue pas un statut public authentifié.
              </p>
              <label>
                <span>Motif de la déclaration de révocation (optionnel, 240 caractères)</span>
                <input bind:value={revocationReason} maxlength={SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS} placeholder="Exemple : remplacé par une version corrigée" />
              </label>
              {#if receiptMessage}<p class="status-box" role="status">{receiptMessage}</p>{/if}
            </details>
            {#if localStorageStatus}
              <p class="status-box">
                Stockage de ce dossier : {((localStorageStatus.caseBytes + localStorageStatus.snapshotBytes) / 1_048_576).toFixed(2)} Mo,
                dont {localStorageStatus.snapshotCount} copie(s) archivée(s) ({(localStorageStatus.snapshotBytes / 1_048_576).toFixed(2)} Mo).
                {#if localStorageStatus.quota && localStorageStatus.usage}
                  Navigateur : {(localStorageStatus.usage / 1_048_576).toFixed(0)} Mo utilisés sur {(localStorageStatus.quota / 1_048_576).toFixed(0)} Mo estimés.
                  {#if localStorageStatus.usage / localStorageStatus.quota >= 0.8}
                    Attention : le stockage local estimé dépasse 80 % du quota. Exportez une sauvegarde et nettoyez les données inutiles.
                  {/if}
                {/if}
              </p>
            {/if}
            <ul>
              {#each [...proofpack.deliveryHistory].reverse() as receipt}
                <li>
                  <strong>{receipt.recipientLabel ?? "Destinataire non renseigné"}</strong>
                  <span>{receipt.generatedAt} · {receipt.status === "generated" ? "généré" : receipt.status === "sent" ? "envoyé" : "révoqué"}</span>
                  <code>{receipt.deliveryId}</code>
                  <small>{receipt.filename} · {receipt.fingerprint}</small>
                  {#if snapshotAvailable[receipt.deliveryId]}
                    <button class="button" type="button" onclick={() => void downloadArchivedDelivery(receipt)}>Télécharger la copie archivée</button>
                    <button class="button" type="button" onclick={() => void removeLocalDeliverySnapshot(receipt)}>Supprimer la copie locale</button>
                  {:else}
                    <small>Copie locale absente · empreinte conservée dans le reçu.</small>
                  {/if}
                  {#if receipt.status === "generated"}
                    <button class="button" type="button" onclick={() => void markDeliverySent(receipt)}>Marquer comme envoyé</button>
                  {:else if receipt.status === "sent"}
                    <button class="button" type="button" onclick={() => void revokeDeliveryLocally(receipt)}>Déclarer une révocation locale</button>
                  {:else if receipt.status === "revoked"}
                    <small>Révocation consignée localement. Transmettez la déclaration au destinataire par un canal de confiance.</small>
                  {/if}
                  {#if receipt.status === "generated"}<button class="button" type="button" onclick={() => deleteGeneratedDeliveryExport(receipt)}>Supprimer cet export non envoyé</button>{/if}
                </li>
              {/each}
            </ul>
          </details>
        {/if}
      </section>

      <details class="exports master-export advanced-panel">
        <summary>Exports internes et sauvegarde complète</summary>
        <div class="advanced-panel-content">
          <div class="section-head">
            <div>
              <span>Dossier maître · interne uniquement</span>
              <h2>Conserver le dossier complet dans l’environnement contrôlé.</h2>
            </div>
            <p>Ces fichiers contiennent les brouillons, réserves, preuves, métadonnées, écarts et notes internes. Ne les transmettez pas à un tiers.</p>
          </div>
          <div class="export-buttons">
            <button class="button" type="button" onclick={downloadZip} disabled={proofpackActionsDisabled}>Télécharger le ZIP maître</button>
            <button class="button" type="button" onclick={downloadProofPackJson} disabled={proofpackActionsDisabled}>Télécharger le JSON maître</button>
            <button class="button" type="button" onclick={() => void downloadLocalBackup()} disabled={proofpackActionsDisabled}>Sauvegarde locale complète</button>
            <button class="button" type="button" onclick={downloadSupplierResponse} disabled={proofpackActionsDisabled}>Réponse interne</button>
            <button class="button" type="button" onclick={downloadEvidenceRegister} disabled={proofpackActionsDisabled}>Registre interne</button>
            <button class="button" type="button" onclick={downloadBacklog} disabled={proofpackActionsDisabled}>Plan de remédiation</button>
            <button class="button" type="button" onclick={downloadBoardMemo} disabled={proofpackActionsDisabled}>Synthèse interne</button>
          </div>
        </div>
      </details>

      {#snippet questionsAndEvidence(currentProofpack: ProofPack)}
      <section class="result-list" id="questions-and-evidence">
        <div class="section-head work-head">
          <div>
            <span>Travail du dossier</span>
            <h2>Questions et preuves</h2>
          </div>
          <p>Commencez ici : chaque réponse doit être qualifiée avant de pouvoir entrer dans le dossier client.</p>
        </div>

        <ol class="micro-steps" aria-label="Étapes pour chaque question">
          <li><span>1</span><strong>Rédiger</strong><small>la réponse exacte à envoyer</small></li>
          <li><span>2</span><strong>Qualifier</strong><small>prête, avec réserve ou non exportable</small></li>
          <li><span>3</span><strong>Référencer</strong><small>la preuve interne et, si utile, publique</small></li>
        </ol>

        <div class="work-quick-actions" role="group" aria-label="Navigation rapide du questionnaire">
          <div>
            <strong>Questionnaire long</strong>
            <small>Sautez les éléments déjà traités sans modifier leur ordre.</small>
          </div>
          <button class="button compact" type="button" onclick={showNextDraftQuestion} disabled={draftAnswers === 0}>
            Prochain brouillon · {draftAnswers}
          </button>
          <button class="button compact" type="button" onclick={showNextQuestionWithOpenEvidence} disabled={weakEvidenceCount === 0}>
            Prochaine preuve à qualifier · {weakEvidenceCount}
          </button>
        </div>

        <details class="context-help answer-help">
          <summary>Comment choisir le statut d’export ?</summary>
          <p><strong>Prête à exporter</strong> si la formulation peut partir telle quelle. <strong>Avec réserve</strong> si une limite doit accompagner la réponse. <strong>Ne pas exporter</strong> si elle doit rester interne. Laissez <strong>Brouillon</strong> tant que la revue n’est pas terminée.</p>
        </details>

        {#each currentProofpack.questions as question, questionIndex}
          {@const knowledgeUse = record?.knowledgeUses?.find((use) => use.questionId === question.id)}
          {@const questionKnowledgeMatches = knowledgeMatches[question.id] ?? []}
          {@const questionDebts = currentProofpack.debts.filter((debt) => debt.questionId === question.id)}
          {@const questionEvidence = currentProofpack.evidence.filter((item) => item.questionId === question.id)}
          <details
            class="question-card"
            id={`question-${question.id}`}
            open={activeQuestionId === question.id}
          >
            <summary class="question-head" onclick={() => activeQuestionId = question.id}>
              <div>
                <p>{question.text}</p>
                <small>
                  Export : {answerExportStatusOptions.find((option) => option.value === (question.answerExportStatus ?? "draft"))?.label}
                  · Confiance : {answerConfidenceOptions.find((option) => option.value === (question.answerConfidence ?? question.confidence))?.label}
                  · {questionEvidence.length} preuve{questionEvidence.length > 1 ? "s" : ""}
                </small>
              </div>
              <span class={`criticality ${question.criticality}`}>{criticalityLabels[question.criticality]}</span>
            </summary>

            <div class="question-body">

            <div class="tags">
              <span>{categoryLabels[question.category]}</span>
              {#each question.mappedRequirements as requirement}
                <span>{requirement}</span>
              {/each}
            </div>

            <section class="answer-editor">
              <div class="answer-head">
                <div>
                  <h3>Réponse fournisseur</h3>
                  <p>Réponse envoyable, réserve explicite et niveau de confiance.</p>
                </div>
                {#if question.answerExportStatus === "ready"}
                  <span class="answer-badge ready">Prête</span>
                {:else if question.answerExportStatus === "reserved"}
                  <span class="answer-badge reserved">Réserve</span>
                {:else if question.answerExportStatus === "do-not-export"}
                  <span class="answer-badge blocked">Bloquée</span>
                {:else}
                  <span class="answer-badge draft">Brouillon</span>
                {/if}
              </div>

              {#if knowledgeVaultEnabled}<div class="knowledge-actions">
                <button class="button" type="button" onclick={() => void beginKnowledgeAction(question, "search")}>Chercher dans la base personnelle</button>
                <button
                  class="button"
                  type="button"
                  onclick={() => void beginKnowledgeAction(question, "promote")}
                  disabled={!question.answerText?.trim() || (question.answerExportStatus !== "ready" && question.answerExportStatus !== "reserved")}
                >Ajouter à la base personnelle</button>
                {#if knowledgeUse}<small>Issue de l’entrée {knowledgeUse.entryId}, révision {knowledgeUse.entryRevisionId}. Toute modification manuelle retire cette liaison.</small>{/if}
              </div>{/if}

              {#if knowledgeVaultEnabled && knowledgeFormQuestionId === question.id && knowledgeFormIntent}
                <section class="knowledge-form" aria-label={`Base personnelle pour ${question.text}`}>
                  {#if !knowledgeVault || !knowledgePassphrase}
                    <h4>{knowledgeFormVaultExists ? "Déverrouiller la base personnelle" : "Protéger la nouvelle base personnelle"}</h4>
                    <p>Pourquoi : les formulations réutilisables restent dans un coffre chiffré distinct. La phrase reste en mémoire de cet onglet uniquement.</p>
                    <div class="knowledge-form-grid">
                      <label><span>Phrase secrète de la base personnelle</span><input type="password" bind:value={knowledgeUnlockInput} autocomplete={knowledgeFormVaultExists ? "current-password" : "new-password"} /></label>
                      {#if !knowledgeFormVaultExists}<label><span>Confirmer la phrase secrète de la base personnelle</span><input type="password" bind:value={knowledgeUnlockConfirmation} autocomplete="new-password" /></label>{/if}
                    </div>
                    <div class="actions"><button class="button primary" type="button" onclick={() => void submitKnowledgeUnlock(question)} disabled={knowledgeUnlockInput.length < 12 || (!knowledgeFormVaultExists && knowledgeUnlockConfirmation !== knowledgeUnlockInput)}>{knowledgeFormIntent === "search" ? "Déverrouiller puis chercher" : "Déverrouiller puis continuer"}</button><button class="button" type="button" onclick={resetKnowledgeForm}>Annuler</button></div>
                  {:else if knowledgeFormIntent === "promote"}
                    <h4>Décrire la portée avant d’ajouter.</h4>
                    <p>Cette entrée sera proposée comme brouillon uniquement. Le libellé d’approbateur est déclaratif et non authentifié.</p>
                    <div class="knowledge-form-grid">
                      <label><span>Libellé de l’approbateur local</span><input bind:value={knowledgeApprovedBy} placeholder="Optionnel" /></label>
                      <label><span>Date de prochaine revue</span><input type="date" bind:value={knowledgeReviewDate} /></label>
                    </div>
                    <label><span>Périmètre d’applicabilité</span><textarea bind:value={knowledgeApplicability} rows="2" placeholder="Éléments à revérifier à chaque réutilisation"></textarea></label>
                    <label><span>Variantes exactes de la question</span><input bind:value={knowledgeAliases} placeholder="Séparées par |, optionnel" /></label>
                    <div class="actions"><button class="button primary" type="button" onclick={() => void savePromotedKnowledge(question)}>Ajouter comme formulation réutilisable</button><button class="button" type="button" onclick={resetKnowledgeForm}>Annuler</button></div>
                  {/if}
                </section>
              {/if}

              {#if knowledgeVaultEnabled && questionKnowledgeMatches.length > 0}
                <div class="knowledge-matches">
                  {#each questionKnowledgeMatches as match}
                    <article>
                      <div><strong>{match.entry.canonicalQuestion}</strong><small>{match.score}/100 · {match.reason}{match.reviewRequired ? " · revue requise" : ""}</small></div>
                      <p>{match.entry.answerText}</p>
                      {#if match.entry.applicabilityNotes}<small>Périmètre : {match.entry.applicabilityNotes}</small>{/if}
                      {#if match.reviewRequired}<small>Cette entrée exige une nouvelle revue avant validation.</small>{/if}
                      <button class="button primary" type="button" onclick={() => useKnowledgeMatch(question, match)}>Copier comme brouillon</button>
                    </article>
                  {/each}
                </div>
              {/if}

              <div class="answer-grid">
                <label>
                  <span>Statut d’export</span>
                  <select
                    value={question.answerExportStatus ?? "draft"}
                    onchange={(event) => handleRéponseExportStatusChange(question.id, event)}
                  >
                    {#each answerExportStatusOptions as option}
                      <option value={option.value}>{option.label}</option>
                    {/each}
                  </select>
                </label>

                <label>
                  <span>Confiance déclarée</span>
                  <select
                    value={question.answerConfidence ?? question.confidence}
                    onchange={(event) => handleRéponseConfidenceChange(question.id, event)}
                  >
                    {#each answerConfidenceOptions as option}
                      <option value={option.value}>{option.label}</option>
                    {/each}
                  </select>
                </label>
              </div>

              <label>
                <span>Réponse à envoyer</span>
                <textarea
                  rows="4"
                  maxlength={SECURITY_LIMITS.MAX_ANSWER_CHARS}
                  value={question.answerText ?? ""}
                  placeholder={question.suggestedAnswer}
                  oninput={(event) => handleRéponseTextChange(question.id, event)}
                ></textarea>
              </label>

              <label>
                <span>Réserve / limite à documenter</span>
                <textarea
                  rows="3"
                  maxlength={SECURITY_LIMITS.MAX_RESERVATION_CHARS}
                  value={question.answerReservation ?? ""}
                  placeholder="Exemple : preuve déclarée disponible mais non exportable ; extrait contrôlé fourni sur demande."
                  oninput={(event) => handleRéponseRéserveChange(question.id, event)}
                ></textarea>
              </label>

            </section>

            <div class="evidence-section-head">
              <div>
                <h3>Preuves</h3>
                <small>{questionEvidence.length} élément{questionEvidence.length > 1 ? "s" : ""} à qualifier</small>
              </div>
              {#if questionEvidence.length > 1}
                <div class="evidence-batch-actions" role="group" aria-label={`Mise à jour groupée des preuves pour ${question.text}`}>
                  <label>
                    <span>Appliquer un statut commun</span>
                    <select
                      value={questionEvidenceBatchStatuses[question.id] ?? "expected"}
                      onchange={(event) => selectQuestionEvidenceBatchStatus(question.id, event)}
                    >
                      {#each evidenceStatusOptions.filter((option) => option.value !== "available") as option}
                        <option value={option.value}>{option.label}</option>
                      {/each}
                    </select>
                  </label>
                  <button class="button compact" type="button" onclick={() => applyEvidenceStatusToQuestion(question.id)}>
                    Appliquer aux {questionEvidence.length} preuves
                  </button>
                </div>
              {/if}
            </div>
            <ul>
              {#each questionEvidence as item}
                {@const referenceEditorOpen = openEvidenceReferenceIds.includes(item.id) || (item.status === "available" && !isEvidenceReferenceComplete(item))}
                <li class="evidence-row">
                  <div class="evidence-summary">
                    <div>
                      <strong>{item.title}</strong>
                      <small>
                        {evidenceStatusOptions.find((option) => option.value === item.status)?.label}
                        · {evidenceSensitivityOptions.find((option) => option.value === item.sensitivity)?.label}
                        · force {evidenceStrengthLabels[item.strength]}
                      </small>
                    </div>

                    <div class="evidence-actions">
                      <select
                        value={item.status}
                        aria-label={`Statut de preuve pour ${item.title}`}
                        onchange={(event) => handleEvidenceStatusChange(item.id, event)}
                      >
                        {#each evidenceStatusOptions as option}
                          <option value={option.value}>{option.label}</option>
                        {/each}
                      </select>
                      <button class="button compact" type="button" onclick={() => openEvidenceReferenceEditor(item.id)}>
                        {referenceEditorOpen
                          ? "Masquer la référence"
                          : evidenceReferenceIdentityCompletion(item) < 2
                            ? "Référencer"
                            : isEvidenceReferenceComplete(item)
                              ? "Modifier la référence"
                              : "Finir la qualification"}
                      </button>
                    </div>
                  </div>

                  {#if referenceEditorOpen}
                    <section class="evidence-reference" aria-label={`Référence de preuve pour ${item.title}`}>
                      <p>
                        La référence interne sert au suivi local et n’entre jamais dans le dossier client. La référence publique
                        est un texte séparé, contrôlé par vous, transmis uniquement si cet élément est sélectionné.
                        Aucun fichier n’est envoyé.
                      </p>

                      <div class="evidence-completion">
                        <div>
                          <strong>{evidenceReferenceIdentityCompletion(item)}/2 pour référencer</strong>
                          <small>Le type et l’identifiant suffisent pour conserver une première trace dans le dossier maître.</small>
                        </div>
                        <progress max="2" value={evidenceReferenceIdentityCompletion(item)}>{evidenceReferenceIdentityCompletion(item)} sur 2</progress>
                      </div>

                      <h4>Référence minimale · jamais transmise</h4>

                      <div class="reference-grid evidence-identity-grid">
                        <label>
                          <span>Type de référence</span>
                          <select
                            aria-label={`Type de référence pour ${item.title}`}
                            value={item.referenceType ?? ""}
                            onchange={(event) => updateEvidenceReference(item.id, {
                              referenceType: ((event.currentTarget as HTMLSelectElement).value || undefined) as EvidenceReferenceType | undefined,
                            })}
                          >
                            <option value="">Sélectionner</option>
                            {#each evidenceReferenceTypeOptions as option}
                              <option value={option.value}>{option.label}</option>
                            {/each}
                          </select>
                        </label>

                        <label>
                          <span>Nom ou identifiant</span>
                          <input
                            aria-label={`Nom ou identifiant de référence pour ${item.title}`}
                            value={item.referenceId ?? ""}
                            maxlength={SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS}
                            placeholder="Exemple : mfa-admin-policy-v3.pdf"
                            oninput={(event) => updateEvidenceReference(item.id, {
                              referenceId: (event.currentTarget as HTMLInputElement).value,
                            })}
                          />
                        </label>
                      </div>

                      <p class="reference-minimum-note">
                        Vous pouvez vous arrêter ici. Pour déclarer la preuve disponible, ouvrez la qualification et renseignez quatre champs supplémentaires.
                      </p>

                      <details
                        class="evidence-qualification-fields"
                        open={openEvidenceQualificationIds.includes(item.id)}
                        ontoggle={(event) => {
                          const open = (event.currentTarget as HTMLDetailsElement).open;
                          openEvidenceQualificationIds = open
                            ? openEvidenceQualificationIds.includes(item.id)
                              ? openEvidenceQualificationIds
                              : [...openEvidenceQualificationIds, item.id]
                            : openEvidenceQualificationIds.filter((id) => id !== item.id);
                        }}
                      >
                        <summary>
                          <span>Qualifier comme disponible</span>
                          <small>{evidenceQualificationCompletion(item)}/4 champs</small>
                        </summary>
                        <p>Ces informations rendent la référence contrôlable sans joindre ni téléverser le document.</p>
                        <div class="reference-grid evidence-qualification-grid">
                        <label>
                          <span>Système source</span>
                          <input
                            aria-label={`Système source pour ${item.title}`}
                            value={item.sourceSystem ?? ""}
                            maxlength={SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS}
                            placeholder="Exemple : IAM, GED, GRC interne"
                            oninput={(event) => updateEvidenceReference(item.id, {
                              sourceSystem: (event.currentTarget as HTMLInputElement).value,
                            })}
                          />
                        </label>

                        <label>
                          <span>Date d’observation</span>
                          <input
                            type="datetime-local"
                            aria-label={`Date d’observation pour ${item.title}`}
                            value={observedAtInputValue(item.observedAt)}
                            onchange={(event) => handleEvidenceObservedAtChange(item.id, event)}
                          />
                        </label>

                        <label>
                          <span>Propriétaire</span>
                          <input
                            aria-label={`Propriétaire pour ${item.title}`}
                            value={item.owner ?? ""}
                            maxlength={SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS}
                            placeholder="Exemple : RSSI"
                            oninput={(event) => updateEvidenceReference(item.id, {
                              owner: (event.currentTarget as HTMLInputElement).value,
                            })}
                          />
                        </label>

                        <label>
                          <span>Sensibilité</span>
                          <select
                            aria-label={`Sensibilité pour ${item.title}`}
                            value={item.sensitivity}
                            onchange={(event) => updateEvidenceReference(item.id, {
                              sensitivity: (event.currentTarget as HTMLSelectElement).value as EvidenceSensitivity,
                            })}
                          >
                            {#each evidenceSensitivityOptions as option}
                              <option value={option.value}>{option.label}</option>
                            {/each}
                          </select>
                        </label>

                        <label>
                          <span>Mode d’export</span>
                          <select
                            aria-label={`Mode d’export pour ${item.title}`}
                            value={item.exportMode ?? ""}
                            onchange={(event) => updateEvidenceReference(item.id, {
                              exportMode: ((event.currentTarget as HTMLSelectElement).value || undefined) as EvidenceExportMode | undefined,
                            })}
                          >
                            <option value="">Sélectionner</option>
                            {#each evidenceExportModeOptions as option}
                              <option value={option.value}>{option.label}</option>
                            {/each}
                          </select>
                        </label>
                        </div>

                        <div class="evidence-qualification-actions">
                          <button class="button compact" type="button" onclick={() => useCurrentEvidenceObservationTime(item.id)}>
                            Utiliser la date et l’heure actuelles
                          </button>
                          {#if questionEvidence.length > 1 && evidenceQualificationCompletion(item) === 4}
                            <button class="button compact" type="button" onclick={() => reuseEvidenceContextForQuestion(question.id, item.id)}>
                              Réutiliser ce contexte pour les {questionEvidence.length - 1} autres preuves
                            </button>
                          {/if}
                        </div>

                        <button
                          class="button primary"
                          type="button"
                          disabled={!isEvidenceReferenceComplete(item) || proofpackActionsDisabled}
                          onclick={() => markEvidenceAvailable(item.id)}
                        >
                          Déclarer comme disponible
                        </button>
                      </details>

                        <details class="evidence-advanced-fields">
                          <summary>Informations internes complémentaires</summary>
                          <div class="reference-grid evidence-advanced-grid">
                            <label>
                              <span>Date d’expiration</span>
                              <input
                                type="datetime-local"
                                aria-label={`Date d’expiration pour ${item.title}`}
                                value={observedAtInputValue(item.expiresAt)}
                                onchange={(event) => handleEvidenceDateChange(item.id, "expiresAt", event)}
                              />
                            </label>

                            <label>
                              <span>Validateur déclaré</span>
                              <input
                                aria-label={`Validateur déclaré pour ${item.title}`}
                                value={item.validator ?? ""}
                                maxlength={SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS}
                                placeholder="Exemple : Responsable contrôle interne"
                                oninput={(event) => updateEvidenceReference(item.id, {
                                  validator: (event.currentTarget as HTMLInputElement).value || undefined,
                                })}
                              />
                            </label>

                            <label>
                              <span>Date de validation déclarée</span>
                              <input
                                type="datetime-local"
                                aria-label={`Date de validation déclarée pour ${item.title}`}
                                value={observedAtInputValue(item.validatedAt)}
                                onchange={(event) => handleEvidenceDateChange(item.id, "validatedAt", event)}
                              />
                            </label>

                            <label>
                              <span>Version de la preuve</span>
                              <input
                                aria-label={`Version de la preuve pour ${item.title}`}
                                value={item.version ?? ""}
                                maxlength={SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS}
                                placeholder="Exemple : 2026.07"
                                oninput={(event) => updateEvidenceReference(item.id, {
                                  version: (event.currentTarget as HTMLInputElement).value || undefined,
                                })}
                              />
                            </label>

                            <label class="public-reference-field">
                              <span>Périmètre couvert</span>
                              <textarea
                                aria-label={`Périmètre couvert pour ${item.title}`}
                                rows="3"
                                value={item.coveredScope ?? ""}
                                maxlength={SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS}
                                placeholder="Exemple : comptes administrateurs de production"
                                oninput={(event) => updateEvidenceReference(item.id, {
                                  coveredScope: (event.currentTarget as HTMLTextAreaElement).value || undefined,
                                })}
                              ></textarea>
                            </label>

                            <label class="public-reference-field">
                              <span>Résultat du contrôle</span>
                              <textarea
                                aria-label={`Résultat du contrôle pour ${item.title}`}
                                rows="3"
                                value={item.controlResult ?? ""}
                                maxlength={SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS}
                                placeholder="Exemple : contrôle conforme, deux exceptions documentées"
                                oninput={(event) => updateEvidenceReference(item.id, {
                                  controlResult: (event.currentTarget as HTMLTextAreaElement).value || undefined,
                                })}
                              ></textarea>
                            </label>

                            <label class="public-reference-field">
                              <span>Historique</span>
                              <textarea
                                aria-label={`Historique pour ${item.title}`}
                                rows="4"
                                value={item.history?.join("\n") ?? ""}
                                maxlength={SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS}
                                placeholder="Une entrée par ligne"
                                oninput={(event) => updateEvidenceHistory(
                                  item.id,
                                  (event.currentTarget as HTMLTextAreaElement).value
                                )}
                              ></textarea>
                              <small>Une entrée par ligne. L’ordre saisi est conservé dans le registre interne.</small>
                            </label>
                          </div>
                        </details>

                      <details class="evidence-public-reference">
                        <summary>
                          <span>Ajouter une référence publique pour le client</span>
                          <small>{item.publicReference?.trim() ? "Renseignée" : "Facultative"}</small>
                        </summary>
                        <label class="public-reference-field">
                            <span>Texte exact destiné au client</span>
                            <textarea
                              aria-label={`Référence publique destinée au client pour ${item.title}`}
                              rows="3"
                              value={item.publicReference ?? ""}
                              maxlength={SECURITY_LIMITS.MAX_METADATA_FIELD_CHARS}
                              placeholder="Exemple : Rapport d’audit externe 2026, consultable sous NDA"
                              oninput={(event) => updateEvidenceReference(item.id, {
                                publicReference: (event.currentTarget as HTMLTextAreaElement).value,
                              })}
                            ></textarea>
                            <small>Ce texte exact pourra apparaître dans delivery.json, le Markdown et le registre externe.</small>
                          </label>
                      </details>

                      {#if evidenceReferenceMessages[item.id]}
                        <p class="reference-error" role="alert">{evidenceReferenceMessages[item.id]}</p>
                      {/if}
                    </section>
                  {/if}
                </li>
              {/each}
            </ul>

            <div class="question-action-strip" class:ready={!dirty && !proofpackActionsDisabled}>
              <span>{dirty ? "Modifications à enregistrer" : "Modifications enregistrées"}</span>
              {#if dirty}
                <button class="button primary compact" type="button" onclick={() => void saveCurrentCase()} disabled={proofpackActionsDisabled}>
                  Enregistrer cette question
                </button>
              {:else if savedWorkReady}
                <a class="button primary compact" href="#delivery-review">
                  {draftAnswers > 0 ? `Préparer une livraison partielle · ${eligibleDeliveryQuestions.length} réponse${eligibleDeliveryQuestions.length > 1 ? "s" : ""}` : "Préparer le dossier client"}
                </a>
              {/if}
            </div>

            <details class="question-debts">
              <summary>Écarts et actions ({questionDebts.length})</summary>
              {#if questionDebts.length === 0}
                <p class="no-debt">Aucun écart calculé pour cette question selon les informations saisies.</p>
              {:else}
                <ul class="debt-list">
                  {#each questionDebts as debt}
                    <li class={debt.severity}>
                      <strong>{debtSeverityLabels[debt.severity]}</strong>
                      <small>{debt.reason}</small>
                      <em>{debt.recommendedAction}</em>
                    </li>
                  {/each}
                </ul>
              {/if}
            </details>

            <nav class="question-navigation" aria-label={`Navigation depuis la question ${questionIndex + 1}`}>
              <button
                class="button compact"
                type="button"
                disabled={questionIndex === 0}
                onclick={() => {
                  const previousQuestion = currentProofpack.questions[questionIndex - 1];
                  if (previousQuestion) showQuestion(previousQuestion.id);
                }}
              >Question précédente</button>
              <span>{questionIndex + 1} / {currentProofpack.questions.length}</span>
              <button
                class="button primary compact"
                type="button"
                disabled={questionIndex === currentProofpack.questions.length - 1}
                onclick={() => {
                  const nextQuestion = currentProofpack.questions[questionIndex + 1];
                  if (nextQuestion) showQuestion(nextQuestion.id);
                }}
              >Question suivante</button>
            </nav>
            </div>
          </details>
        {/each}
      </section>
      {/snippet}
    {/if}
  </div>
</section>

<style>
  .case-editor-shell {
    padding: clamp(3.8rem, 8vw, 6.5rem) 0 7rem;
    background: radial-gradient(circle at 8% 5%, light-dark(rgba(62, 105, 97, 0.075), rgba(129, 218, 203, 0.075)), transparent 30rem);
  }

  .case-editor-panel {
    width: min(1120px, calc(100% - 2.5rem));
    margin: 0 auto;
    border: 0;
    border-radius: 0;
    padding: 0;
    background: transparent;
    box-shadow: none;
  }

  .security-note,
  .status-box,
  .dirty-box {
    border: 0;
    border-left: 2px solid var(--accent);
    border-radius: 0 12px 12px 0;
    padding: 0.95rem 1.1rem;
    margin-top: 1rem;
    color: var(--muted);
    background: var(--accent-soft);
  }

  .editor-status,
  .editor-actions,
  .questionnaire-block,
  .delivery-review,
  .delivery-confirmation,
  .result-list,
  #delivery-export-actions {
    scroll-margin-top: 6rem;
  }

  .editor-overview,
  .advanced-panel,
  .delivery-history,
  .question-debts,
  .evidence-advanced-fields {
    border: 1px solid var(--line);
    border-radius: 14px;
    background: light-dark(rgba(24, 66, 46, 0.025), rgba(255, 255, 255, 0.025));
  }

  .editor-overview {
    margin-top: 1.25rem;
  }

  .editor-overview > summary,
  .advanced-panel > summary,
  .delivery-history > summary,
  .question-debts > summary,
  .evidence-advanced-fields > summary {
    cursor: pointer;
    color: var(--text);
    font-weight: 800;
  }

  .editor-overview > summary,
  .advanced-panel > summary,
  .delivery-history > summary {
    padding: 0.95rem 1rem;
  }

  .editor-overview > summary span,
  .editor-overview > summary strong,
  .editor-overview > summary small {
    display: block;
  }

  .editor-overview > summary span {
    color: var(--accent);
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .editor-overview > summary strong {
    margin-top: 0.25rem;
    font-size: 1.05rem;
  }

  .editor-overview-content,
  .advanced-panel-content {
    padding: 0 1rem 1rem;
  }

  .dirty-box {
    border-left-color: var(--warning);
  }

  .error-box {
    border: 1px solid light-dark(rgba(102, 51, 46, 0.45), rgba(213, 106, 96, 0.45));
    border-radius: 16px;
    padding: 1rem;
    margin-top: 1rem;
    color: var(--danger);
    background: var(--danger-soft);
  }

  .empty-state {
    color: var(--muted);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 1rem;
    background: light-dark(rgba(24, 66, 46, 0.035), rgba(255, 255, 255, 0.035));
  }

  .unlock-panel {
    width: min(620px, 100%);
    margin: 1.5rem auto 0;
    border: 1px solid light-dark(rgba(58, 104, 96, 0.34), rgba(121, 216, 200, 0.34));
    border-radius: 14px;
    padding: 1rem;
    background: var(--accent-soft);
  }

  .unlock-panel > p:not(.eyebrow),
  .unlock-panel > small {
    display: block;
    color: var(--muted);
    line-height: 1.5;
  }

  .unlock-panel label {
    display: grid;
    gap: 0.45rem;
    margin-top: 0.85rem;
    color: var(--muted);
    font-weight: 800;
  }

  .unlock-panel input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 0.85rem;
    background: var(--field);
    color: var(--text);
    font: inherit;
  }

  .case-top {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
    margin-top: 2rem;
  }

  .case-top h2 {
    margin: 0;
  }

  .case-top p {
    color: var(--muted);
  }

  .score-card {
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: 1rem;
    min-width: 160px;
    background: light-dark(rgba(24, 66, 46, 0.035), rgba(255, 255, 255, 0.035));
  }

  .score-card span {
    display: block;
    color: var(--muted);
  }

  .score-card strong {
    display: block;
    margin-top: 0.4rem;
    color: var(--accent);
    font-size: 1.45rem;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .metric {
    --metric-accent: var(--accent);
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: 1.1rem;
    background: light-dark(rgba(24, 66, 46, 0.025), rgba(255, 255, 255, 0.025));
  }

  .metric span {
    display: block;
    color: var(--muted);
    font-size: 0.85rem;
  }

  .metric strong {
    display: block;
    margin-top: 0.5rem;
    color: var(--metric-accent);
    font-size: 1.5rem;
    font-weight: 590;
  }

  .metric:nth-child(2) { --metric-accent: var(--accent-blue); }
  .metric:nth-child(3) { --metric-accent: var(--accent-violet); }
  .metric:nth-child(4) { --metric-accent: var(--accent-gold); }

  .metric code {
    display: block;
    margin-top: 0.5rem;
    color: var(--accent);
    overflow-wrap: anywhere;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .decision-panel {
    display: grid;
    grid-template-columns: minmax(240px, 0.85fr) minmax(0, 1.15fr);
    gap: 1rem;
    margin-top: 1rem;
  }

  .export-posture,
  .export-readiness,
  .proof-priorities,
  .priority-card {
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 1rem;
    background: light-dark(rgba(24, 66, 46, 0.035), rgba(255, 255, 255, 0.035));
  }

  .export-posture {
    border-left: 4px solid var(--accent);
  }

  .export-posture.blocked {
    border-left-color: var(--danger);
    background: var(--danger-soft);
  }

  .export-posture.review {
    border-left-color: var(--warning);
  }

  .export-posture.ready,
  .export-posture.controlled {
    border-left-color: var(--ok);
  }

  .export-posture span,
  .section-head span {
    display: block;
    color: var(--accent);
    font-size: 0.78rem;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .export-posture strong {
    display: block;
    margin-top: 0.45rem;
    color: var(--text);
    font-size: 1.35rem;
  }

  .export-posture p,
  .section-head p,
  .priority-card p,
  .answer-head p,
  .no-debt {
    color: var(--muted);
    line-height: 1.5;
  }

  .readiness-head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    color: var(--muted);
  }

  .readiness-head strong {
    color: var(--accent);
    font-size: 1.35rem;
  }

  progress {
    display: block;
    width: 100%;
    height: 0.8rem;
    margin-top: 0.8rem;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--field);
    accent-color: var(--accent);
  }

  progress::-webkit-progress-bar {
    background: var(--field);
  }

  progress::-webkit-progress-value {
    border-radius: 999px;
    background: linear-gradient(90deg, var(--accent), var(--ok));
  }

  progress::-moz-progress-bar {
    border-radius: 999px;
    background: linear-gradient(90deg, var(--accent), var(--ok));
  }

  .readiness-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.7rem;
    margin-top: 0.9rem;
  }

  .readiness-grid span {
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 0.65rem;
    color: var(--muted);
    background: light-dark(rgba(24, 66, 46, 0.03), rgba(255, 255, 255, 0.03));
  }

  .readiness-grid strong {
    display: block;
    color: var(--text);
    font-size: 1.2rem;
  }

  .proof-priorities {
    margin-top: 1rem;
  }

  .section-head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
  }

  .work-head {
    margin-bottom: 0.9rem;
  }

  .micro-steps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.55rem;
    margin: 1rem 0;
    padding: 0;
    list-style: none;
  }

  .micro-steps li {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.05rem 0.55rem;
    align-items: center;
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 0.7rem;
    background: light-dark(rgba(24, 66, 46, 0.025), rgba(255, 255, 255, 0.025));
  }

  .micro-steps li > span {
    display: grid;
    grid-row: 1 / 3;
    place-items: center;
    width: 1.45rem;
    height: 1.45rem;
    border: 1px solid light-dark(rgba(58, 104, 96, 0.38), rgba(121, 216, 200, 0.38));
    border-radius: 999px;
    color: var(--accent);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    font-weight: 900;
  }

  .micro-steps strong,
  .micro-steps small {
    display: block;
  }

  .micro-steps small {
    color: var(--muted);
    font-size: 0.72rem;
    line-height: 1.35;
  }

  .work-quick-actions {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin: 0.85rem 0;
    border: 1px solid light-dark(rgba(58, 104, 96, 0.2), rgba(121, 216, 200, 0.2));
    border-radius: 12px;
    padding: 0.75rem;
    background: light-dark(rgba(58, 104, 96, 0.035), rgba(121, 216, 200, 0.035));
  }

  .work-quick-actions > div {
    min-width: min(100%, 230px);
    margin-right: auto;
  }

  .work-quick-actions strong,
  .work-quick-actions small {
    display: block;
  }

  .work-quick-actions small {
    margin-top: 0.15rem;
    color: var(--muted);
    font-size: 0.72rem;
  }

  .context-help {
    margin: 0.8rem 0;
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 0.75rem 0.85rem;
    color: var(--muted);
    background: light-dark(rgba(24, 66, 46, 0.025), rgba(255, 255, 255, 0.025));
  }

  .context-help summary {
    cursor: pointer;
    color: var(--text);
    font-weight: 800;
  }

  .context-help p {
    margin: 0.65rem 0 0;
    line-height: 1.5;
  }

  .context-help p strong {
    color: var(--text);
  }

  .answer-help {
    margin-bottom: 1rem;
  }

  .section-head h2 {
    margin: 0.35rem 0 0;
    font-size: 1.35rem;
    line-height: 1.18;
  }

  .delivery-review {
    border: 1px solid var(--accent);
    border-radius: 14px;
    padding: 1rem;
  }

  .delivery-batch-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.65rem;
    margin-top: 1rem;
    padding: 0.8rem;
    border: 1px solid light-dark(rgba(58, 104, 96, 0.28), rgba(121, 216, 200, 0.28));
    border-radius: 12px;
    background: light-dark(rgba(58, 104, 96, 0.045), rgba(121, 216, 200, 0.045));
  }

  .delivery-batch-actions > div {
    flex: 1 1 230px;
  }

  .delivery-batch-actions strong,
  .delivery-batch-actions small {
    display: block;
  }

  .delivery-excluded-note {
    margin: 0.3rem 0 0;
    color: var(--muted);
  }

  .delivery-selection-details {
    margin-top: 0.9rem;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: light-dark(rgba(24, 66, 46, 0.02), rgba(255, 255, 255, 0.02));
  }

  .delivery-selection-details > summary {
    display: flex;
    cursor: pointer;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.8rem 0.9rem;
    color: var(--text);
    font-weight: 800;
  }

  .delivery-selection-details > summary small {
    color: var(--muted);
    font-weight: 600;
  }

  .delivery-selection-details .delivery-list {
    padding: 0 0.8rem 0.8rem;
  }

  .post-export-verification {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 1rem;
    padding: 1rem;
    border: 1px solid var(--accent);
    border-radius: 14px;
    background: var(--accent-soft);
  }

  .post-export-verification span {
    color: var(--accent);
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .post-export-verification h3,
  .post-export-verification p {
    margin: 0.3rem 0 0;
  }

  .post-export-verification p {
    color: var(--muted);
  }

  .master-export {
    border: 1px solid var(--warning);
    border-radius: 14px;
    padding: 0;
  }

  .master-export > summary {
    color: var(--warning);
  }

  .delivery-history {
    margin-top: 1rem;
    padding: 0 1rem 1rem;
  }

  .delivery-history > summary {
    margin: 0 -1rem;
  }

  .delivery-list {
    display: grid;
    gap: 0.65rem;
    margin-top: 1rem;
  }

  .delivery-list h3 {
    margin: 1rem 0 0;
  }

  .delivery-list label,
  .delivery-confirmation {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 0.8rem;
    background: light-dark(rgba(24, 66, 46, 0.03), rgba(255, 255, 255, 0.03));
  }

  .delivery-list label.ineligible {
    opacity: 0.58;
  }

  .delivery-list input,
  .delivery-confirmation input {
    margin-top: 0.2rem;
  }

  .delivery-list span,
  .delivery-list small {
    display: block;
  }

  .delivery-list small {
    margin-top: 0.25rem;
    color: var(--muted);
  }

  .delivery-confirmation {
    margin-top: 1rem;
    border-color: var(--accent);
    font-weight: 800;
  }

  .delivery-final-preview {
    display: grid;
    gap: 1rem;
    margin-top: 1.25rem;
    padding: 1rem;
    border: 1px solid var(--line-strong);
    border-radius: 12px;
    background: light-dark(rgba(248, 250, 246, 0.18), rgba(0, 0, 0, 0.18));
  }

  .delivery-preview-head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
  }

  .delivery-preview-head h3,
  .delivery-preview-files h4 {
    margin: 0.25rem 0 0;
  }

  .delivery-preview-head code {
    max-width: 48%;
    overflow-wrap: anywhere;
  }

  .delivery-preview-questions {
    display: grid;
    gap: 0.75rem;
  }

  .delivery-preview-questions article {
    padding: 0.9rem;
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .delivery-preview-questions dl,
  .delivery-preview-questions dl div {
    display: grid;
    gap: 0.35rem;
  }

  .delivery-preview-questions dl {
    margin: 0;
    gap: 0.8rem;
  }

  .delivery-preview-questions dt {
    color: var(--muted);
    font-size: 0.78rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .delivery-preview-questions dd {
    margin: 0;
    white-space: pre-wrap;
  }

  .delivery-preview-questions ul,
  .delivery-preview-files ul {
    margin: 0.4rem 0 0;
    padding-left: 1.25rem;
  }

  .delivery-final-preview details {
    border-top: 1px solid var(--line);
    padding-top: 0.8rem;
  }

  .delivery-final-preview summary {
    cursor: pointer;
    font-weight: 800;
  }

  .delivery-final-preview pre {
    max-height: 28rem;
    overflow: auto;
    margin: 0.75rem 0 0;
    padding: 0.85rem;
    border-radius: 8px;
    background: light-dark(rgba(248, 250, 246, 1), #090d12);
    color: var(--text);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .priority-list {
    display: grid;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .priority-card {
    display: grid;
    gap: 0.35rem;
    border-left: 4px solid var(--line-strong);
  }

  .priority-card.critical,
  .priority-card.high {
    border-left-color: var(--danger);
  }

  .priority-card.medium {
    border-left-color: var(--warning);
  }

  .priority-card.low,
  .priority-card.empty {
    border-left-color: var(--accent);
  }

  .priority-card span {
    color: var(--accent);
    font-size: 0.78rem;
    font-weight: 900;
    text-transform: uppercase;
  }

  .priority-card small {
    color: var(--text);
  }

  .editor-actions,
  .export-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
    margin-top: 1.5rem;
  }

  button.button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .answer-editor {
    border: 1px solid light-dark(rgba(24, 66, 46, 0.11), rgba(196, 218, 207, 0.11));
    border-radius: 20px;
    padding: 1.25rem;
    margin: 1rem 0;
    background: linear-gradient(145deg, light-dark(rgba(248, 250, 246, 0.8), rgba(21, 28, 26, 0.8)), light-dark(rgba(248, 250, 246, 0.72), rgba(12, 17, 16, 0.72)));
  }

  .question-action-strip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-top: 0.9rem;
    padding: 0.7rem;
    border: 1px solid light-dark(rgba(103, 87, 53, 0.35), rgba(214, 181, 111, 0.35));
    border-radius: 12px;
    color: var(--warning);
    background: light-dark(rgba(103, 87, 53, 0.06), rgba(214, 181, 111, 0.06));
  }

  .question-action-strip.ready {
    border-color: light-dark(rgba(58, 104, 96, 0.3), rgba(121, 216, 200, 0.3));
    color: var(--accent);
    background: light-dark(rgba(58, 104, 96, 0.045), rgba(121, 216, 200, 0.045));
  }

  .evidence-section-head,
  .evidence-batch-actions,
  .question-navigation,
  .evidence-completion {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
  }

  .evidence-section-head {
    margin-top: 1rem;
  }

  .evidence-section-head h3,
  .evidence-section-head small {
    display: block;
    margin: 0;
  }

  .evidence-section-head small,
  .evidence-completion small {
    margin-top: 0.2rem;
    color: var(--muted);
  }

  .evidence-batch-actions {
    justify-content: flex-end;
  }

  .evidence-batch-actions label {
    display: grid;
    gap: 0.25rem;
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 700;
  }

  .evidence-batch-actions select {
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 0.45rem 0.65rem;
    background: var(--field);
    color: var(--text);
    font: inherit;
  }

  .question-navigation {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line);
  }

  .question-navigation span {
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 0.76rem;
  }

  .answer-editor label {
    display: grid;
    gap: 0.45rem;
    margin-top: 0.85rem;
    color: var(--muted);
    font-weight: 700;
  }

  .answer-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .answer-editor select {
    width: 100%;
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 0.55rem 0.75rem;
    background: var(--field);
    color: var(--text);
    font: inherit;
  }

  .answer-head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
  }

  .answer-head h3 {
    margin: 0;
  }

  .answer-head p {
    margin: 0.35rem 0 0;
  }

  .answer-badge {
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 0.35rem 0.6rem;
    color: var(--muted);
    font-size: 0.78rem;
    font-weight: 900;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .answer-badge.ready {
    border-color: light-dark(rgba(61, 96, 74, 0.45), rgba(128, 200, 154, 0.45));
    color: var(--ok);
  }

  .answer-badge.reserved {
    border-color: light-dark(rgba(103, 87, 53, 0.45), rgba(214, 181, 111, 0.45));
    color: var(--warning);
  }

  .answer-badge.blocked {
    border-color: light-dark(rgba(108, 58, 53, 0.45), rgba(224, 120, 111, 0.45));
    color: var(--danger);
  }

  .questionnaire-block,
  .exports {
    margin-top: 2.5rem;
  }

  .questionnaire-block p {
    color: var(--muted);
  }

  textarea {
    width: 100%;
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 0.9rem 1rem;
    background: var(--field);
    color: var(--text);
    font: inherit;
    resize: vertical;
    line-height: 1.5;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .result-list {
    display: grid;
    gap: 1rem;
    margin-top: 2.5rem;
  }

  .question-card {
    border: 1px solid var(--line);
    border-radius: 20px;
    padding: 0;
    scroll-margin-top: 6rem;
    background: linear-gradient(145deg, light-dark(rgba(248, 250, 246, 0.8), rgba(21, 28, 26, 0.8)), light-dark(rgba(248, 250, 246, 0.72), rgba(12, 17, 16, 0.72)));
  }

  .question-head {
    display: flex;
    cursor: pointer;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
    padding: 1.1rem 1.2rem;
    list-style: none;
  }

  .question-head::-webkit-details-marker {
    display: none;
  }

  .question-card[open] .question-head {
    border-bottom: 1px solid var(--line);
  }

  .question-body {
    padding: 0 1.2rem 1.2rem;
  }

  .question-head p {
    margin: 0;
    font-weight: 800;
    line-height: 1.45;
  }

  .question-head .criticality {
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 0.35rem 0.6rem;
    color: var(--accent);
    font-size: 0.8rem;
    text-transform: uppercase;
  }

  .criticality.critical,
  .criticality.high {
    border-color: light-dark(rgba(108, 58, 53, 0.45), rgba(224, 120, 111, 0.45));
    color: var(--danger);
  }

  .criticality.medium {
    border-color: light-dark(rgba(103, 87, 53, 0.45), rgba(214, 181, 111, 0.45));
    color: var(--warning);
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 1rem 0;
  }

  .tags span {
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 0.3rem 0.55rem;
    color: var(--muted);
    font-size: 0.78rem;
  }

  ul {
    margin: 0;
    padding-left: 1.2rem;
    color: var(--muted);
  }

  li + li {
    margin-top: 0.45rem;
  }

  small {
    display: block;
    color: var(--muted);
    line-height: 1.4;
  }

  .evidence-row {
    display: grid;
    gap: 1rem;
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 0.85rem;
    background: light-dark(rgba(24, 66, 46, 0.025), rgba(255, 255, 255, 0.025));
  }

  .evidence-summary,
  .evidence-actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    justify-content: space-between;
  }

  .evidence-actions {
    flex-wrap: wrap;
  }

  .evidence-actions select {
    min-width: 210px;
  }

  .evidence-row select {
    width: 100%;
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 0.55rem 0.75rem;
    background: var(--field);
    color: var(--text);
    font: inherit;
  }

  .button.compact {
    padding: 0.55rem 0.75rem;
  }

  .evidence-reference {
    border-top: 1px solid var(--line);
    padding-top: 0.85rem;
  }

  .reference-minimum-note {
    margin: 0.2rem 0 0.85rem;
    border-left: 2px solid var(--accent-blue);
    padding-left: 0.75rem;
    color: var(--muted);
    font-size: 0.78rem;
  }

  .evidence-qualification-fields,
  .evidence-public-reference {
    margin-top: 0.75rem;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: light-dark(rgba(24, 66, 46, 0.022), rgba(255, 255, 255, 0.022));
  }

  .evidence-qualification-fields > summary,
  .evidence-public-reference > summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    cursor: pointer;
    padding: 0.8rem 0.9rem;
    color: var(--text);
    font-weight: 800;
  }

  .evidence-qualification-fields > summary small,
  .evidence-public-reference > summary small {
    color: var(--accent);
    font-size: 0.72rem;
    font-weight: 700;
  }

  .evidence-qualification-fields > p {
    margin: 0;
    padding: 0 0.9rem;
    color: var(--muted);
    font-size: 0.78rem;
  }

  .evidence-qualification-grid,
  .evidence-public-reference > label {
    margin-inline: 0.9rem;
  }

  .evidence-qualification-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    margin: 0 0.9rem 0.8rem;
  }

  .evidence-qualification-fields > .button {
    margin: 0 0.9rem 0.9rem;
  }

  .evidence-public-reference > label {
    margin-top: 0;
    margin-bottom: 0.9rem;
  }

  .evidence-advanced-fields {
    margin-top: 0.75rem;
  }

  .evidence-advanced-fields > summary,
  .question-debts > summary {
    padding: 0.75rem 0.85rem;
  }

  .evidence-advanced-grid {
    margin: 0;
    padding: 0 0.85rem 0.85rem;
  }

  .evidence-reference > p {
    color: var(--muted);
    line-height: 1.5;
  }

  .evidence-completion {
    margin: 0.9rem 0;
    border: 1px solid light-dark(rgba(58, 104, 96, 0.28), rgba(121, 216, 200, 0.28));
    border-radius: 12px;
    padding: 0.75rem;
    background: light-dark(rgba(58, 104, 96, 0.045), rgba(121, 216, 200, 0.045));
  }

  .evidence-completion > div {
    min-width: 0;
  }

  .evidence-completion strong,
  .evidence-completion small {
    display: block;
  }

  .evidence-completion progress {
    flex: 0 0 150px;
    width: 150px;
    margin: 0;
  }

  .reference-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    margin: 0.85rem 0;
  }

  .reference-grid label,
  .reference-grid span {
    display: grid;
    gap: 0.35rem;
  }

  .reference-grid input,
  .reference-grid select,
  .reference-grid textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 0.65rem 0.75rem;
    background: var(--field);
    color: var(--text);
    font: inherit;
  }

  .public-reference-field {
    grid-column: 1 / -1;
  }

  .public-reference-field small {
    color: var(--muted);
    font-weight: 500;
  }

  .reference-error {
    color: var(--danger) !important;
  }

  .debt-list {
    display: grid;
    gap: 0.6rem;
    padding-left: 0;
    list-style: none;
  }

  .question-debts {
    margin-top: 1rem;
  }

  .question-debts .debt-list,
  .question-debts .no-debt {
    margin: 0;
    padding: 0 0.85rem 0.85rem;
  }

  .debt-list li {
    border: 1px solid var(--line);
    border-left: 4px solid var(--line-strong);
    border-radius: 12px;
    padding: 0.75rem;
    background: light-dark(rgba(24, 66, 46, 0.025), rgba(255, 255, 255, 0.025));
  }

  .debt-list li.critical,
  .debt-list li.high {
    border-left-color: var(--danger);
  }

  .debt-list li.medium {
    border-left-color: var(--warning);
  }

  .debt-list li.low {
    border-left-color: var(--accent);
  }

  .debt-list em {
    display: block;
    margin-top: 0.35rem;
    color: var(--text);
    font-style: normal;
    line-height: 1.45;
  }

  .knowledge-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.9rem;
  }

  .knowledge-actions small {
    color: var(--accent);
    overflow-wrap: anywhere;
  }

  .knowledge-matches {
    display: grid;
    gap: 0.65rem;
    margin-bottom: 1rem;
  }

  .knowledge-matches article {
    border: 1px solid light-dark(rgba(58, 104, 96, 0.28), rgba(121, 216, 200, 0.28));
    border-radius: 12px;
    padding: 0.8rem;
    background: light-dark(rgba(58, 104, 96, 0.045), rgba(121, 216, 200, 0.045));
  }

  .knowledge-matches strong,
  .knowledge-matches small {
    display: block;
  }

  .knowledge-matches small {
    color: var(--muted);
  }

  .knowledge-form {
    margin-bottom: 1rem;
    border: 1px solid light-dark(rgba(58, 104, 96, 0.34), rgba(121, 216, 200, 0.34));
    border-radius: 12px;
    padding: 0.9rem;
    background: light-dark(rgba(58, 104, 96, 0.055), rgba(121, 216, 200, 0.055));
  }

  .knowledge-form h4,
  .knowledge-form p {
    margin: 0 0 0.55rem;
  }

  .knowledge-form p {
    color: var(--muted);
  }

  .knowledge-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.7rem;
  }

  .knowledge-form label {
    display: grid;
    gap: 0.4rem;
    margin-top: 0.65rem;
    color: var(--muted);
    font-weight: 750;
  }

  .knowledge-form input,
  .knowledge-form textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 0.72rem;
    background: var(--field);
    color: var(--text);
    font: inherit;
  }

  @media (max-width: 900px) {
    .case-editor-shell {
      padding-top: 3rem;
    }

    .case-editor-panel {
      width: min(100% - 1.25rem, 1120px);
    }

    .case-top,
    .decision-panel,
    .summary-grid,
    .evidence-row,
    .answer-grid,
    .reference-grid {
      grid-template-columns: 1fr;
      flex-direction: column;
    }

    .knowledge-form-grid {
      grid-template-columns: 1fr;
    }

    .evidence-summary,
    .evidence-actions {
      align-items: stretch;
      flex-direction: column;
    }

    .summary-grid {
      display: grid;
    }

    .readiness-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .section-head,
    .answer-head,
    .post-export-verification,
    .work-quick-actions,
    .question-action-strip,
    .evidence-section-head,
    .evidence-batch-actions,
    .evidence-completion {
      flex-direction: column;
    }

    .post-export-verification,
    .work-quick-actions,
    .question-action-strip,
    .evidence-section-head,
    .evidence-batch-actions,
    .evidence-completion {
      align-items: stretch;
    }

    .evidence-completion progress {
      width: 100%;
      flex-basis: auto;
    }

    .delivery-selection-details > summary {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
