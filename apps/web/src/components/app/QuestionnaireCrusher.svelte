<script lang="ts">
  import {
    SECURITY_LIMITS,
    SecurityValidationError,
    analyzeQuestionnaireForCrusher,
    questionnaireCrusherCapabilities,
    type Criticality,
    type EvidenceSensitivity,
    type ProofCategory,
    type QuestionDiagnosticAlertSeverity,
    type QuestionDiagnosticStatus,
    type QuestionnaireCrusherReport,
  } from "@blackproof/core";

  const statusLabels: Record<QuestionDiagnosticStatus, string> = {
    mapped: "Correspondance trouvée",
    "needs-review": "À revoir",
    unmapped: "Sans correspondance",
    critical: "Priorité critique",
  };
  const criticalityLabels: Record<Criticality, string> = {
    low: "priorité faible",
    medium: "priorité moyenne",
    high: "priorité élevée",
    critical: "priorité critique",
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
  const sensitivityLabels: Record<EvidenceSensitivity, string> = {
    public: "public",
    internal: "interne",
    confidential: "confidentiel",
    secret: "secret",
  };
  const strengthLabels = {
    weak: "faible",
    medium: "moyenne",
    strong: "forte",
  } as const;
  const alertSeverityLabels: Record<QuestionDiagnosticAlertSeverity, string> = {
    info: "Information",
    warning: "Attention",
    critical: "Priorité critique",
  };

  let rawQuestionnaire = `1. Avez-vous activé le MFA pour les comptes administrateurs ?
2. Disposez-vous d'une procédure de sauvegarde documentée ?
3. Testez-vous régulièrement la restauration des sauvegardes ?
4. Avez-vous une procédure de réponse à incident ?
5. Disposez-vous d'un registre des fournisseurs critiques ?
6. Réalisez-vous des scans de vulnérabilités ou un suivi des correctifs ?
7. Collectez-vous et conservez-vous les journaux de sécurité ?
8. Disposez-vous d'un PRA ou PCA documenté ?`;

  let report: QuestionnaireCrusherReport | null = null;
  let errorMessage = "";

  function analyze() {
    errorMessage = "";
    report = null;

    try {
      report = analyzeQuestionnaireForCrusher(rawQuestionnaire);
    } catch (error) {
      if (error instanceof SecurityValidationError) {
        errorMessage = `${error.code}: ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = "Erreur inconnue pendant l'analyse.";
      }
    }
  }
</script>

<section class="crusher-shell">
  <div class="crusher-panel">
    <p class="eyebrow">Diagnostic local</p>
    <h1>Préparer la revue d’un questionnaire cyber.</h1>
    <p class="lead">
      Collez un questionnaire fournisseur. BLACKPROOF extrait les questions, applique des règles déterministes
      par mots-clés et catégories, puis propose des correspondances de travail et des preuves à préparer.
      Chaque résultat doit être relu par une personne compétente.
    </p>

    <div class="grid two">
      {#each questionnaireCrusherCapabilities as capability}
        <article class="capability-card">{capability}</article>
      {/each}
    </div>

    <label class="questionnaire-input">
      <span>Questionnaire brut</span>
      <textarea
        bind:value={rawQuestionnaire}
        rows="12"
        maxlength={SECURITY_LIMITS.MAX_QUESTIONNAIRE_CHARS}
        spellcheck="false"
      ></textarea>
    </label>

    <p class="input-limit">
      Analyse locale. Aucun upload. Limite : {SECURITY_LIMITS.MAX_QUESTIONNAIRE_CHARS} caractères.
    </p>

    {#if errorMessage}
      <div class="error-box" role="alert">{errorMessage}</div>
    {/if}

    <div class="actions">
      <button class="button primary" type="button" onclick={analyze}>
        Analyser le questionnaire
      </button>
    </div>

    {#if report}
      <section class="summary-grid">
        <article class="metric"><span>Questions</span><strong>{report.summary.questionCount}</strong></article>
        <article class="metric"><span>Règles trouvées</span><strong>{report.summary.mappedCount}</strong></article>
        <article class="metric"><span>Priorité critique</span><strong>{report.summary.criticalCount}</strong></article>
        <article class="metric"><span>Sans correspondance</span><strong>{report.summary.unmappedCount}</strong></article>
        <article class="metric"><span>Qualification manuelle</span><strong>{report.summary.manualQualificationCount}</strong></article>
      </section>

      <section class="result-list">
        <h2>Diagnostics</h2>

        {#each report.diagnostics as diagnostic}
          <article class={`question-card ${diagnostic.status}`}>
            <div class="question-head">
              <p>{diagnostic.index}. {diagnostic.text}</p>
              <span>{statusLabels[diagnostic.status]}</span>
            </div>

            <div class="tags">
              <span>{categoryLabels[diagnostic.category]}</span>
              <span>{criticalityLabels[diagnostic.criticality]}</span>
              <span>couverture des règles : {diagnostic.heuristicCoverageLabel}</span>
            </div>

            <p>{diagnostic.heuristicCoverageRationale}</p>

            <h3>Correspondances de travail</h3>
            <ul>
              {#each diagnostic.resolvedRequirements as requirement}
                <li>
                  <strong>{requirement.id}</strong>
                  <small>{requirement.label}</small>
                </li>
              {/each}
            </ul>

            <h3>Preuves attendues</h3>
            <ul>
              {#each diagnostic.expectedEvidence as evidence}
                <li>
                  <strong>{evidence.title}</strong>
                  <small>{sensitivityLabels[evidence.sensitivity]} · force {strengthLabels[evidence.strength]} · {evidence.recommendedFormat}</small>
                </li>
              {/each}
            </ul>

            {#if diagnostic.alerts.length > 0}
              <h3>Alertes</h3>
              <ul>
                {#each diagnostic.alerts as alert}
                  <li>
                    <strong>{alertSeverityLabels[alert.severity]}</strong>
                    <small>{alert.message}</small>
                  </li>
                {/each}
              </ul>
            {/if}
          </article>
        {/each}
      </section>

      <p class="input-limit">{report.disclaimer}</p>
    {/if}
  </div>
</section>

<style>
  .crusher-shell {
    padding: 4rem 0;
  }

  .crusher-panel {
    width: min(980px, calc(100% - 2rem));
    margin: 0 auto;
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 1.35rem;
    background: linear-gradient(180deg, rgba(18, 23, 22, 0.96), rgba(12, 16, 17, 0.96));
    box-shadow: var(--shadow-soft);
  }

  .capability-card {
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 1rem;
    color: var(--muted);
    background: rgba(255, 255, 255, 0.035);
  }

  label {
    display: grid;
    gap: 0.45rem;
    color: var(--muted);
    font-weight: 700;
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

  .questionnaire-input {
    margin-top: 1.5rem;
  }

  .input-limit {
    color: var(--muted);
    font-size: 0.88rem;
  }

  .error-box {
    border: 1px solid rgba(255, 95, 87, 0.45);
    border-radius: 16px;
    padding: 1rem;
    margin-top: 1rem;
    color: var(--danger);
    background: var(--danger-soft);
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1rem;
    margin-top: 2rem;
  }

  .metric {
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.035);
  }

  .metric span {
    display: block;
    color: var(--muted);
    font-size: 0.85rem;
  }

  .metric strong {
    display: block;
    margin-top: 0.5rem;
    color: var(--accent);
    font-size: 1.45rem;
  }

  .result-list {
    display: grid;
    gap: 1rem;
    margin-top: 2.5rem;
  }

  .question-card {
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 1.2rem;
    background: rgba(255, 255, 255, 0.035);
  }

  .question-card.critical {
    border-color: rgba(213, 170, 98, 0.45);
  }

  .question-card.unmapped {
    border-color: rgba(213, 106, 96, 0.45);
  }

  .question-head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
  }

  .question-head p {
    margin: 0;
    font-weight: 800;
    line-height: 1.45;
  }

  .question-head span {
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 0.35rem 0.6rem;
    color: var(--accent);
    font-size: 0.8rem;
    text-transform: uppercase;
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

  @media (max-width: 900px) {
    .summary-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
