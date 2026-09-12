<script lang="ts">
  import { onMount } from "svelte";
  import KnowledgeBase from "./KnowledgeBase.svelte";
  import LocalCaseEditor from "./LocalCaseEditor.svelte";
  import LocalCases from "./LocalCases.svelte";
  import ProofApp from "./ProofApp.svelte";
  import QuestionnaireImport from "./QuestionnaireImport.svelte";
  import { isKnowledgeVaultEnabled } from "../../lib/feature-flags";

  type Surface = "create" | "import" | "cases" | "case" | "knowledge";
  let { surface }: { surface: Surface } = $props();
  let ready = $state(false);
  let currentSurface = $state<Surface>("create");
  let transientPassphrase = $state("");
  const knowledgeVaultEnabled = isKnowledgeVaultEnabled();

  onMount(() => {
    currentSurface = surface;
    ready = true;
  });

  function openCreatedCase(caseId: string, passphrase: string): void {
    transientPassphrase = passphrase;
    window.history.replaceState(null, "", `/app/case#id=${encodeURIComponent(caseId)}`);
    currentSurface = "case";
  }
</script>

{#if !ready}
  <section class="section"><div class="container" aria-busy="true"><p>Ouverture de l’application locale…</p><noscript>JavaScript est nécessaire pour chiffrer et traiter les dossiers dans votre navigateur.</noscript></div></section>
{:else if currentSurface === "create"}<ProofApp onCaseCreated={openCreatedCase} />
{:else if currentSurface === "import"}<QuestionnaireImport onCaseCreated={openCreatedCase} />
{:else if currentSurface === "cases"}<LocalCases />
{:else if currentSurface === "case"}<LocalCaseEditor initialPassphrase={transientPassphrase} onPassphraseConsumed={() => { transientPassphrase = ""; }} />
{:else if knowledgeVaultEnabled}<KnowledgeBase />
{:else}
  <section class="section"><div class="container"><p class="eyebrow">Fonction avancée désactivée</p><h1>La base personnelle n’est pas disponible dans cette version.</h1><p class="lead">La création de dossiers, leur chiffrement et les exports restent disponibles. La réutilisation inter-dossiers sera réintroduite après convergence avec le modèle produit principal.</p><a class="button primary" href="/app/cases">Revenir aux dossiers</a></div></section>
{/if}
