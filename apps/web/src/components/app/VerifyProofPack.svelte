<script lang="ts">
  import { onMount } from "svelte";

  import {
    SECURITY_LIMITS,
    SecurityValidationError,
    compareProofPackDeliveries,
    exportDeliveryProtocolJson,
    verifyDeliveryRevocation,
    verifyDeliverySignature,
    verifyProofPackJson,
    verifyProofPackDeliveryJson,
    verifyDeliveryReceiptWithSnapshot,
    type ProofPack,
    type ProofPackDelivery,
    type ProofPackDeliveryChangeReport,
    type ProofPackDeliveryRevocation,
    type ProofPackDeliverySignature,
    type VerifyDeliveryReceiptSnapshotResult,
    type VerifyProofPackDeliveryResult,
    type VerifyProofPackDeliveryZipResult,
    type VerifyProofPackResult,
    type VerifyProofPackZipResult,
  } from "@blackproof/core";

  import { DEMO_PROOFPACK_JSON } from "../../lib/demo-assets";
  import { verifyProofPackZipBlob } from "../../lib/proofpack-zip-verifier";
  import { subscribeToLocalStorageWipe } from "../../lib/local-db";

  let fileName = "";
  let rawJson = "";
  let errorMessage = "";
  let isVerifying = false;
  let isLoadingDemo = false;
  let isHydrated = false;
  let result: VerifyProofPackResult | null = null;
  let zipResult: VerifyProofPackZipResult | null = null;
  let deliveryResult: VerifyProofPackDeliveryResult | null = null;
  let deliveryZipResult: VerifyProofPackDeliveryZipResult | null = null;
  let masterProofpack: ProofPack | null = null;
  let receiptSnapshotResults: VerifyDeliveryReceiptSnapshotResult[] = [];
  let currentDelivery: ProofPackDelivery | null = null;
  let comparisonReport: ProofPackDeliveryChangeReport | null = null;
  let signatureResult: { valid: boolean; issuer?: string; signedAt?: string } | null = null;
  let revocationResult: { valid: boolean; reason?: string; revokedAt?: string } | null = null;
  let protocolMessage = "";
  let expectedDeliveryFingerprint = "";
  let expectedFingerprintError = "";
  let primaryFileInput: HTMLInputElement;
  let snapshotFileInput: HTMLInputElement;
  let operationGeneration = 0;

  function verificationDisplayText(value: string): string {
    return value
      .replace(/\bMaster\b/g, "dossier maître")
      .replace(/\bDelivery\b/g, "dossier client");
  }

  function verificationDisplayCode(value: string): string {
    return value
      .replaceAll("MASTER", "DOSSIER_MAÎTRE")
      .replaceAll("DELIVERY", "DOSSIER_CLIENT");
  }

  function severityLabel(value: string): string {
    if (value === "error") return "ERREUR";
    if (value === "warning") return "ALERTE";
    return "INFO";
  }

  onMount(() => {
    isHydrated = true;
    const location = new URL(window.location.href);
    const fragment = new URLSearchParams(location.hash.slice(1));
    const legacy = location.searchParams.getAll("fingerprint");
    const fingerprints = [...fragment.getAll("fingerprint"), ...legacy];
    if (fingerprints.some((value) => !/^bp_sha256_[a-f0-9]{64}$/.test(value)) || new Set(fingerprints).size > 1) {
      expectedFingerprintError = "Lien de vérification invalide ou contradictoire. Confirmez l’empreinte attendue auprès de l’émetteur par un canal de confiance.";
    } else {
      expectedDeliveryFingerprint = fingerprints[0] ?? "";
    }
    if (legacy.length > 0) {
      // Preserve old bindings locally; new links never put fingerprints in HTTP queries.
      location.searchParams.delete("fingerprint");
      for (const fingerprint of legacy) fragment.append("fingerprint", fingerprint);
      location.hash = fragment.toString();
      window.history.replaceState(null, "", `${location.pathname}${location.search}${location.hash}`);
    }
    return subscribeToLocalStorageWipe(() => {
      operationGeneration += 1;
      if (primaryFileInput) primaryFileInput.value = "";
      if (snapshotFileInput) snapshotFileInput.value = "";
      fileName = "";
      rawJson = "";
      result = null;
      zipResult = null;
      deliveryResult = null;
      deliveryZipResult = null;
      masterProofpack = null;
      receiptSnapshotResults = [];
      currentDelivery = null;
      comparisonReport = null;
      signatureResult = null;
      revocationResult = null;
      protocolMessage = "";
      isHydrated = false;
      errorMessage = "Panic Wipe détecté : les fichiers et résultats de vérification ont été effacés. Rechargez la page pour recommencer.";
    });
  });

  async function verifyCurrentJson(generation = operationGeneration) {
    errorMessage = "";
    result = null;
    zipResult = null;
    deliveryResult = null;
    deliveryZipResult = null;
    masterProofpack = null;
    receiptSnapshotResults = [];
    currentDelivery = null;
    comparisonReport = null;
    signatureResult = null;
    revocationResult = null;
    protocolMessage = "";
    isVerifying = true;

    try {
      let parsed: { formatVersion?: string } | null = null;
      try { parsed = JSON.parse(rawJson); } catch {
        const next = await verifyProofPackJson(rawJson);
        if (generation === operationGeneration) result = next;
        return;
      }
      if (["blackproof-proofpack-delivery-v1", "blackproof-proofpack-delivery-v2", "blackproof-proofpack-delivery-v3", "blackproof-proofpack-delivery-v4", "blackproof-proofpack-delivery-v5"].includes(parsed?.formatVersion ?? "")) {
        const next = await verifyProofPackDeliveryJson(rawJson);
        if (generation !== operationGeneration) return;
        deliveryResult = next;
        if (next.isValid) currentDelivery = JSON.parse(rawJson) as ProofPackDelivery;
      } else {
        const next = await verifyProofPackJson(rawJson);
        if (generation !== operationGeneration) return;
        result = next;
        if (result.validSchema) masterProofpack = JSON.parse(rawJson) as ProofPack;
      }
    } catch (error) {
      if (generation !== operationGeneration) return;
      if (error instanceof SecurityValidationError) {
        errorMessage = `${error.code}: ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = "Erreur inconnue pendant la vérification.";
      }
    } finally {
      if (generation === operationGeneration) isVerifying = false;
    }
  }

  async function handleFileChange(event: Event) {
    const generation = ++operationGeneration;
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];

    errorMessage = "";
    result = null;
    zipResult = null;
    deliveryResult = null;
    deliveryZipResult = null;
    masterProofpack = null;
    receiptSnapshotResults = [];
    currentDelivery = null;
    comparisonReport = null;
    signatureResult = null;
    revocationResult = null;
    protocolMessage = "";
    rawJson = "";
    fileName = "";

    if (!file) {
      return;
    }

    fileName = file.name;

    const signature = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    if (generation !== operationGeneration) return;
    const hasZipSignature = signature[0] === 0x50 && signature[1] === 0x4b
      && ((signature[2] === 0x03 && signature[3] === 0x04)
        || (signature[2] === 0x05 && signature[3] === 0x06)
        || (signature[2] === 0x07 && signature[3] === 0x08));
    const isZip = file.name.toLowerCase().endsWith(".zip")
      || file.type === "application/zip"
      || hasZipSignature;

    try {
      if (isZip) {
        isVerifying = true;
        const verifiedZip = await verifyProofPackZipBlob(file);
        if (generation !== operationGeneration) return;
        if (verifiedZip.kind === "delivery-zip") {
          deliveryZipResult = verifiedZip;
          deliveryResult = verifiedZip.deliveryResult;
          if (verifiedZip.isValid) {
            if (!verifiedZip.deliveryJson) throw new Error("delivery.json absent du ZIP vérifié.");
            currentDelivery = JSON.parse(verifiedZip.deliveryJson) as ProofPackDelivery;
          }
        } else {
          zipResult = verifiedZip;
          result = verifiedZip.proofpackResult;
        }
      } else {
        if (file.size > SECURITY_LIMITS.MAX_PROOFPACK_JSON_CHARS) {
          throw new SecurityValidationError(
            "PROOFPACK_TOO_LARGE",
            `Fichier supérieur à ${SECURITY_LIMITS.MAX_PROOFPACK_JSON_CHARS} octets.`
          );
        }
        const text = await file.text();
        if (generation !== operationGeneration) return;
        rawJson = text;
        await verifyCurrentJson(generation);
      }
    } catch (error) {
      if (generation !== operationGeneration) return;
      errorMessage = error instanceof Error ? error.message : "Erreur inconnue pendant la vérification.";
    } finally {
      if (generation === operationGeneration) isVerifying = false;
    }
  }

  async function readDeliveryFile(file: File): Promise<ProofPackDelivery> {
    if (file.size > SECURITY_LIMITS.MAX_PROOFPACK_ZIP_BYTES) throw new Error("Le fichier de comparaison dépasse la limite locale.");
    let json: string;
    const signature = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    const hasZipSignature = signature[0] === 0x50 && signature[1] === 0x4b
      && ((signature[2] === 0x03 && signature[3] === 0x04)
        || (signature[2] === 0x05 && signature[3] === 0x06)
        || (signature[2] === 0x07 && signature[3] === 0x08));
    if (file.name.toLowerCase().endsWith(".zip") || file.type === "application/zip" || hasZipSignature) {
      const verifiedZip = await verifyProofPackZipBlob(file);
      if (verifiedZip.kind !== "delivery-zip") throw new Error("Le ZIP de comparaison n’est pas un dossier client.");
      if (!verifiedZip.isValid) {
        throw new Error(`Dossier client de comparaison invalide : ${verifiedZip.findings[0]?.code ?? "DELIVERY_ZIP_INVALID"}.`);
      }
      if (!verifiedZip.deliveryJson) throw new Error("Le ZIP de comparaison ne contient pas delivery.json.");
      json = verifiedZip.deliveryJson;
    } else {
      if (file.size > SECURITY_LIMITS.MAX_PROOFPACK_JSON_CHARS) throw new Error("Le fichier de comparaison dépasse la limite JSON locale.");
      json = await file.text();
    }
    const verified = await verifyProofPackDeliveryJson(json);
    if (!verified.isValid) throw new Error(`Dossier client de comparaison invalide : ${verified.findings[0]?.code ?? "DELIVERY_INVALID"}.`);
    return JSON.parse(json) as ProofPackDelivery;
  }

  async function compareWithPrevious(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    comparisonReport = null;
    protocolMessage = "";
    if (!file || !currentDelivery) return;
    try {
      const previous = await readDeliveryFile(file);
      comparisonReport = await compareProofPackDeliveries(previous, currentDelivery);
      protocolMessage = "Rapport calculé localement à partir des deux dossiers clients vérifiés.";
    } catch (error) {
      protocolMessage = error instanceof Error ? error.message : "Comparaison impossible.";
    }
  }

  async function verifySignatureFile(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    signatureResult = null;
    protocolMessage = "";
    if (!file || !currentDelivery) return;
    try {
      if (file.size > 100_000) throw new Error("Le fichier de signature dépasse 100 ko.");
      const signature = JSON.parse(await file.text()) as ProofPackDeliverySignature;
      const valid = await verifyDeliverySignature(signature, currentDelivery.fingerprint);
      signatureResult = { valid, issuer: signature.issuer, signedAt: signature.signedAt };
      if (!valid) protocolMessage = "La signature ne correspond pas à ce dossier client ou n’est pas valide.";
    } catch (error) {
      protocolMessage = error instanceof Error ? error.message : "Signature illisible.";
    }
  }

  async function verifyRevocationFile(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    revocationResult = null;
    protocolMessage = "";
    if (!file || !currentDelivery) return;
    try {
      if (file.size > 100_000) throw new Error("Le fichier de révocation dépasse 100 ko.");
      const revocation = JSON.parse(await file.text()) as ProofPackDeliveryRevocation;
      const valid = await verifyDeliveryRevocation(revocation, currentDelivery);
      revocationResult = { valid, reason: revocation.reason, revokedAt: revocation.revokedAt };
      if (!valid) protocolMessage = "La déclaration de révocation ne correspond pas à ce dossier client ou n’est pas valide.";
    } catch (error) {
      protocolMessage = error instanceof Error ? error.message : "Révocation illisible.";
    }
  }

  function downloadComparisonReport() {
    if (!comparisonReport) return;
    const blob = new Blob([exportDeliveryProtocolJson(comparisonReport)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `blackproof-change-report-${comparisonReport.current.deliveryId}.json`;
    link.rel = "noopener";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function handleReceiptSnapshots(event: Event) {
    const generation = operationGeneration;
    const input = event.currentTarget as HTMLInputElement;
    const files = [...(input.files ?? [])];
    receiptSnapshotResults = [];
    errorMessage = "";
    if (!masterProofpack || files.length === 0) return;
    try {
      const results: VerifyDeliveryReceiptSnapshotResult[] = [];
      const seen = new Set<string>();
      for (const file of files) {
        if (file.size > SECURITY_LIMITS.MAX_DELIVERY_SNAPSHOT_CHARS) throw new Error(`${file.name} dépasse la limite d’une copie archivée du dossier client.`);
        const deliveryJson = await file.text();
        if (generation !== operationGeneration) return;
        let deliveryId = "";
        try { deliveryId = JSON.parse(deliveryJson)?.deliveryId ?? ""; } catch { /* verifier reports invalid JSON */ }
        const receipt = masterProofpack.deliveryHistory.find((item) => item.deliveryId === deliveryId);
        if (!receipt) throw new Error(`${file.name} ne correspond à aucun reçu du dossier client dans le dossier maître.`);
        if (seen.has(deliveryId)) throw new Error(`La copie archivée ${deliveryId} a été fournie plusieurs fois.`);
        seen.add(deliveryId);
        results.push(await verifyDeliveryReceiptWithSnapshot(masterProofpack, receipt, deliveryJson, `/deliveryHistory/${masterProofpack.deliveryHistory.indexOf(receipt)}`));
        if (generation !== operationGeneration) return;
      }
      receiptSnapshotResults = results;
    } catch (error) {
      if (generation !== operationGeneration) return;
      errorMessage = error instanceof Error ? error.message : "Impossible de vérifier les copies archivées du dossier client fournies.";
    }
  }

  async function loadDemoProofPack() {
    const generation = operationGeneration;
    errorMessage = "";
    result = null;
    zipResult = null;
    rawJson = "";
    fileName = "";
    isLoadingDemo = true;

    try {
      rawJson = DEMO_PROOFPACK_JSON;
      fileName = "proofpack-demo.json";
      await verifyCurrentJson(generation);
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
</script>

<section class="verify-shell" data-blackproof-verify-ready={isHydrated ? "true" : undefined}>
  <div class="verify-panel">
    <p class="eyebrow">Vérification locale du ProofPack</p>
    <h1>Vérifier l’empreinte d’un ProofPack.</h1>
    <p class="lead">
      Chargez un dossier maître ou un dossier client au format ZIP ou JSON. BLACKPROOF détecte le format
      et vérifie localement le manifeste, les fichiers,
      le schéma, les relations et les empreintes. Aucun envoi serveur n’est effectué.
    </p>

    <ul class="verification-map" aria-label="Contrôles effectués">
      <li>
        <span>ZIP</span>
        <strong>Inventaire strict</strong>
      </li>
      <li>
        <span>Manifeste</span>
        <strong>Tailles et SHA-256</strong>
      </li>
      <li>
        <span>Schéma</span>
        <strong>Structure attendue</strong>
      </li>
      <li>
        <span>Empreinte</span>
        <strong>SHA-256 recalculé</strong>
      </li>
      <li>
        <span>Résumé</span>
        <strong>Cohérence du dossier</strong>
      </li>
      <li>
        <span>Liens</span>
        <strong>Références internes</strong>
      </li>
    </ul>

    <div class="security-note">
      Aucun envoi serveur. Le fichier est lu par le navigateur et vérifié localement.
      L’empreinte ne prouve ni l’identité de l’émetteur, ni la vérité des informations déclarées.
    </div>

    <div class="demo-actions">
      <button class="button primary" type="button" onclick={loadDemoProofPack} disabled={!isHydrated || isLoadingDemo}>
        {isLoadingDemo ? "Chargement..." : "Tester avec le ProofPack démo"}
      </button>
      <a class="button" href="/demo/proofpack-demo.json" download>Télécharger l'exemple</a>
      <a class="button" href="/demo/proofpack-delivery-demo.zip" download>ZIP client de démonstration</a>
      <a class="button" href="/schemas/proofpack-delivery/v5.schema.json">Schéma du dossier client V5</a>
      <a class="button" href="/proofpack">Voir le format ProofPack</a>
    </div>

    <label class="file-drop">
      <span>Choisir un dossier maître ou client, JSON ou ZIP</span>
      <input bind:this={primaryFileInput} type="file" accept=".zip,application/zip,.json,application/json" onchange={handleFileChange} disabled={!isHydrated} />
    </label>

    {#if fileName}
      <p class="file-name">Fichier : {fileName}</p>
    {/if}

    <label class="json-input">
      <span>Ou coller le contenu JSON</span>
      <textarea bind:value={rawJson} rows="10" maxlength={SECURITY_LIMITS.MAX_PROOFPACK_JSON_CHARS}></textarea>
    </label>

    <p class="input-limit">
      Vérification locale. Aucun upload. Limites : {SECURITY_LIMITS.MAX_PROOFPACK_ZIP_BYTES} octets pour le ZIP,
      {SECURITY_LIMITS.MAX_PROOFPACK_JSON_CHARS} caractères pour le JSON.
    </p>

    <div class="actions">
      <button class="button primary" type="button" onclick={() => void verifyCurrentJson()} disabled={isVerifying || !rawJson}>
        {isVerifying ? "Vérification..." : "Vérifier localement"}
      </button>
    </div>

    {#if errorMessage}
      <div class="error-box" role="alert">
        {verificationDisplayText(errorMessage)}
      </div>
    {/if}

    {#if zipResult}
      <section class:valid={zipResult.isValid} class:invalid={!zipResult.isValid} class="verification-status">
        <h2>{zipResult.isValid ? "Contrôles locaux du ZIP et du ProofPack réussis" : "ZIP ProofPack non valide"}</h2>

        <div class="status-grid zip-status-grid">
          <article><span>Schéma manifeste</span><strong>{zipResult.validManifestSchema ? "OK" : "FAIL"}</strong></article>
          <article><span>Empreinte manifeste</span><strong>{zipResult.validManifestFingerprint ? "OK" : "FAIL"}</strong></article>
          <article><span>Liste des fichiers</span><strong>{zipResult.validFileList ? "OK" : "FAIL"}</strong></article>
          <article><span>Tailles</span><strong>{zipResult.validFileSizes ? "OK" : "FAIL"}</strong></article>
          <article><span>SHA-256 fichiers</span><strong>{zipResult.validFileHashes ? "OK" : "FAIL"}</strong></article>
          <article><span>Lien ProofPack</span><strong>{zipResult.validProofPackFingerprintLink ? "OK" : "FAIL"}</strong></article>
          <article><span>Métadonnées ProofPack</span><strong>{zipResult.validManifestMetadataLink ? "OK" : "FAIL"}</strong></article>
          <article><span>Cohérence du fichier XLSX associé</span><strong>{zipResult.sourceImportPresent ? (zipResult.validSourceImportLink ? "OK" : "FAIL") : "N/A"}</strong></article>
          <article><span>Référence structurée de la base personnelle</span><strong>{zipResult.knowledgeUsePresent ? (zipResult.validKnowledgeUseLink ? "OK" : "FAIL") : "N/A"}</strong></article>
        </div>

        <p>
          Ces empreintes permettent de contrôler la correspondance avec le contenu fourni.
          Elles n’authentifient ni l’auteur ni la véracité des déclarations. Sans le fichier XLSX original,
          BLACKPROOF vérifie la cohérence interne du sidecar, pas les cellules du classeur source.
        </p>
      </section>

      <section class="findings">
        <h2>Contrôles du ZIP</h2>
        {#each zipResult.findings as finding}
          <article class={`finding ${finding.severity}`}>
            <div><strong>{verificationDisplayCode(finding.code)}</strong><span>{severityLabel(finding.severity)}</span></div>
            <p>{verificationDisplayText(finding.message)}</p>
            {#if finding.pointer}<code>{finding.pointer}</code>{/if}
          </article>
        {/each}
      </section>
    {/if}

    {#if deliveryZipResult}
      <section class:valid={deliveryZipResult.isValid} class:invalid={!deliveryZipResult.isValid} class="verification-status">
        <h2>{deliveryZipResult.isValid ? "Contrôles locaux du ZIP client réussis" : "ZIP client non valide"}</h2>
        <div class="status-grid zip-status-grid">
          <article><span>Manifeste</span><strong>{deliveryZipResult.validManifestSchema ? "OK" : "FAIL"}</strong></article>
          <article><span>Empreinte manifeste</span><strong>{deliveryZipResult.validManifestFingerprint ? "OK" : "FAIL"}</strong></article>
          <article><span>Inventaire exact</span><strong>{deliveryZipResult.validFileList ? "OK" : "FAIL"}</strong></article>
          <article><span>Tailles</span><strong>{deliveryZipResult.validFileSizes ? "OK" : "FAIL"}</strong></article>
          <article><span>SHA-256 fichiers</span><strong>{deliveryZipResult.validFileHashes ? "OK" : "FAIL"}</strong></article>
          <article><span>Lien du dossier client</span><strong>{deliveryZipResult.validDeliveryFingerprintLink ? "OK" : "FAIL"}</strong></article>
          <article><span>Métadonnées du dossier client</span><strong>{deliveryZipResult.validManifestMetadataLink ? "OK" : "FAIL"}</strong></article>
          {#if deliveryZipResult.deliveryResult}
            <article><span>Schéma du dossier client</span><strong>{deliveryZipResult.deliveryResult.validSchema ? "OK" : "FAIL"}</strong></article>
            <article><span>Empreinte du dossier client</span><strong>{deliveryZipResult.deliveryResult.validFingerprint ? "OK" : "FAIL"}</strong></article>
            <article><span>Références du dossier client</span><strong>{deliveryZipResult.deliveryResult.validLinks ? "OK" : "FAIL"}</strong></article>
            <article><span>Règles du dossier client</span><strong>{deliveryZipResult.deliveryResult.validInvariants ? "OK" : "FAIL"}</strong></article>
          {/if}
        </div>
      </section>
      <section class="findings"><h2>Contrôles du ZIP client</h2>{#each deliveryZipResult.findings as finding}<article class={`finding ${finding.severity}`}><div><strong>{verificationDisplayCode(finding.code)}</strong><span>{severityLabel(finding.severity)}</span></div><p>{verificationDisplayText(finding.message)}</p>{#if finding.pointer}<code>{finding.pointer}</code>{/if}</article>{/each}</section>
    {/if}

    {#if deliveryResult && !deliveryZipResult}
      <section class:valid={deliveryResult.isValid} class:invalid={!deliveryResult.isValid} class="verification-status">
        <h2>{deliveryResult.isValid ? "Contrôles locaux du dossier client réussis" : "Dossier client non valide"}</h2>
        <div class="status-grid">
          <article><span>Schéma du dossier client</span><strong>{deliveryResult.validSchema ? "OK" : "FAIL"}</strong></article>
          <article><span>Empreinte</span><strong>{deliveryResult.validFingerprint ? "OK" : "FAIL"}</strong></article>
          <article><span>Références</span><strong>{deliveryResult.validLinks ? "OK" : "FAIL"}</strong></article>
          <article><span>Invariants</span><strong>{deliveryResult.validInvariants ? "OK" : "FAIL"}</strong></article>
        </div>
        {#if deliveryResult.caseTitle}<p><strong>Dossier :</strong> {deliveryResult.caseTitle}</p>{/if}
      </section>
      <section class="findings"><h2>Résultats du dossier client</h2>{#each deliveryResult.findings as finding}<article class={`finding ${finding.severity}`}><div><strong>{verificationDisplayCode(finding.code)}</strong><span>{severityLabel(finding.severity)}</span></div><p>{verificationDisplayText(finding.message)}</p>{#if finding.pointer}<code>{finding.pointer}</code>{/if}</article>{/each}</section>
    {/if}

    {#if currentDelivery}
      <section class="verification-status bilateral-protocol" aria-labelledby="bilateral-title">
        <p class="eyebrow">Protocole bilatéral · sans compte</p>
        <h2 id="bilateral-title">Comparer, vérifier une signature et archiver ce dossier client.</h2>
        <p>
          Tous les contrôles ci-dessous restent locaux. Le destinataire peut conserver le dossier client, son rapport de
          changements, une signature détachée et une déclaration de révocation sans compte.
        </p>
        <div class="fingerprint-block">
          <span>Dossier client courant</span>
          <code>{currentDelivery.fingerprint}</code>
        </div>
        <article class="finding warning"><div><strong>Statut actuel</strong><span>NON VÉRIFIÉ</span></div><p>Le registre public n’est plus proposé par BLACKPROOF. Les contrôles locaux ne prouvent pas qu’un dossier est encore actif. Confirmez son statut auprès de l’émetteur par un canal de confiance.</p></article>
        {#if expectedFingerprintError}
          <article class="finding error"><div><strong>Lien du classeur de retour</strong><span>FAIL</span></div><p>{expectedFingerprintError}</p></article>
        {:else if expectedDeliveryFingerprint}
          <article class={`finding ${currentDelivery.fingerprint === expectedDeliveryFingerprint ? "info" : "error"}`}>
            <div><strong>Lien du classeur de retour</strong><span>{currentDelivery.fingerprint === expectedDeliveryFingerprint ? "OK" : "FAIL"}</span></div>
            <p>{currentDelivery.fingerprint === expectedDeliveryFingerprint ? "L’empreinte du dossier client correspond au lien inscrit dans le classeur." : "Le dossier client chargé ne correspond pas à l’empreinte demandée par le classeur de retour."}</p>
            <code>{expectedDeliveryFingerprint}</code>
          </article>
        {/if}

        <div class="protocol-grid">
          <label class="file-drop">
            <span>Version précédente à comparer (JSON ou ZIP)</span>
            <input type="file" accept=".zip,application/zip,.json,application/json" onchange={compareWithPrevious} />
          </label>
          <label class="file-drop">
            <span>Signature émetteur détachée (JSON, optionnel)</span>
            <input type="file" accept=".json,application/json" onchange={verifySignatureFile} />
          </label>
          <label class="file-drop">
            <span>Déclaration publique de révocation (JSON)</span>
            <input type="file" accept=".json,application/json" onchange={verifyRevocationFile} />
          </label>
        </div>

        {#if comparisonReport}
          <div class="status-grid">
            <article><span>Ajoutées</span><strong>{comparisonReport.summary.added}</strong></article>
            <article><span>Retirées</span><strong>{comparisonReport.summary.removed}</strong></article>
            <article><span>Modifiées</span><strong>{comparisonReport.summary.changed}</strong></article>
            <article><span>Inchangées</span><strong>{comparisonReport.summary.unchanged}</strong></article>
          </div>
          <div class="findings">
            {#if comparisonReport.changes.length === 0}
              <article class="finding info"><div><strong>Aucun changement</strong><span>OK</span></div><p>Les réponses, réserves et références publiques sont identiques.</p></article>
            {:else}
              {#each comparisonReport.changes as change}
                <article class="finding warning">
                  <div><strong>{change.kind}</strong><span>CHANGE</span></div>
                  <p>{change.question}</p>
                  {#if change.previousAnswer !== undefined}<p><strong>Avant :</strong> {change.previousAnswer}</p>{/if}
                  {#if change.currentAnswer !== undefined}<p><strong>Après :</strong> {change.currentAnswer}</p>{/if}
                  {#if change.previousReservation !== undefined}<p><strong>Réserve avant :</strong> {change.previousReservation}</p>{/if}
                  {#if change.currentReservation !== undefined}<p><strong>Réserve après :</strong> {change.currentReservation}</p>{/if}
                  {#if change.previousEvidence}<p><strong>Références avant :</strong> {change.previousEvidence.join(" · ") || "aucune"}</p>{/if}
                  {#if change.currentEvidence}<p><strong>Références après :</strong> {change.currentEvidence.join(" · ") || "aucune"}</p>{/if}
                </article>
              {/each}
            {/if}
          </div>
          <div class="actions"><button class="button" type="button" onclick={downloadComparisonReport}>Télécharger le rapport JSON</button></div>
          <div class="fingerprint-block"><span>Empreinte du rapport</span><code>{comparisonReport.fingerprint}</code></div>
        {/if}

        {#if signatureResult}
          <article class={`finding ${signatureResult.valid ? "info" : "error"}`}>
            <div><strong>Signature émetteur</strong><span>{signatureResult.valid ? "SIGNATURE COHÉRENTE" : "INVALIDE"}</span></div>
            <p>{signatureResult.valid ? `La signature ECDSA P-256 couvre cette empreinte avec la clé publique incluse. Le libellé d’émetteur « ${signatureResult.issuer ?? "non renseigné"} » n’est pas authentifié sans rattachement externe de cette clé. Signature datée du ${signatureResult.signedAt ?? "date inconnue"}.` : "La signature ne couvre pas exactement l’empreinte de ce dossier client."}</p>
          </article>
        {/if}
        {#if revocationResult}
          <article class={`finding ${revocationResult.valid ? "warning" : "error"}`}>
            <div><strong>Déclaration hors ligne</strong><span>{revocationResult.valid ? "AUTO-COHÉRENTE" : "NON LIÉE"}</span></div>
            <p>{revocationResult.valid ? `Cette déclaration est auto-cohérente et liée à ce dossier, mais son origine n’est pas authentifiée hors ligne. Date déclarée : ${revocationResult.revokedAt ?? "date inconnue"}. Motif déclaré : ${revocationResult.reason ?? "non publié"}. Confirmez son origine et le statut actuel auprès de l’émetteur par un canal de confiance.` : "Ce fichier de révocation ne couvre pas le dossier client chargé."}</p>
          </article>
        {/if}
        {#if protocolMessage}<p class="status-box" role="status">{verificationDisplayText(protocolMessage)}</p>{/if}
      </section>
    {/if}

    {#if result}
      <section class:valid={result.isValid} class:invalid={!result.isValid} class="verification-status">
        <h2>{result.isValid ? "Structure, liens et empreinte cohérents" : "ProofPack non valide"}</h2>

        <div class="status-grid">
          <article>
            <span>Intégrité historique</span>
            <strong>{result.historicalIntegrity ? "VALIDE" : "INVALIDE"}</strong>
          </article>
          <article>
            <span>Cohérence au {result.coherenceAt ?? "non renseignée"}</span>
            <strong>{result.validSummary && result.validInvariants ? "VALIDE" : "INVALIDE"}</strong>
          </article>
          <article>
            <span>Fraîcheur actuelle</span>
            <strong>
              {result.currentFreshness.isFresh
                ? "À JOUR"
                : `${result.currentFreshness.expiredEvidenceCount} EXPIRÉE(S)`}
            </strong>
          </article>
          <article>
            <span>Schéma</span>
            <strong>{result.validSchema ? "OK" : "FAIL"}</strong>
          </article>
          <article>
            <span>Empreinte</span>
            <strong>{result.validFingerprint ? "OK" : "FAIL"}</strong>
          </article>
          <article>
            <span>Résumé</span>
            <strong>{result.validSummary ? "OK" : "FAIL"}</strong>
          </article>
          <article>
            <span>Liens internes</span>
            <strong>{result.validLinks ? "OK" : "FAIL"}</strong>
          </article>
          <article>
            <span>Reçus des dossiers clients</span>
            <strong>{result.validDeliveryHistory ? "OK" : "FAIL"}</strong>
          </article>
        </div>

        {#if result.caseTitle}
          <p><strong>Dossier :</strong> {result.caseTitle}</p>
        {/if}

        {#if result.methodVersion}
          <p><strong>Méthode :</strong> {result.methodVersion}</p>
        {/if}

        {#if result.generatedAt}
          <p><strong>Généré le :</strong> {result.generatedAt}</p>
        {/if}

        {#if result.providedFingerprint}
          <div class="fingerprint-block">
            <span>Empreinte fournie</span>
            <code>{result.providedFingerprint}</code>
          </div>
        {/if}

        {#if result.expectedFingerprint}
          <div class="fingerprint-block">
            <span>Empreinte attendue</span>
            <code>{result.expectedFingerprint}</code>
          </div>
        {/if}
      </section>

      {#if masterProofpack && (masterProofpack.deliveryHistory?.length ?? 0) > 0}
        <section class="verification-status">
          <h2>Vérifier les copies archivées des dossiers clients</h2>
          <p>Ajoutez un ou plusieurs <code>delivery.json</code>. Chaque fichier est contrôlé contre son reçu du dossier maître, son SHA-256 et ses correspondances publiques.</p>
          <label class="file-drop">
            <span>Choisir les copies archivées des dossiers clients</span>
            <input bind:this={snapshotFileInput} type="file" multiple accept=".json,application/json" onchange={handleReceiptSnapshots} disabled={!isHydrated} />
          </label>
          <div class="status-grid">
            <article>
              <span>Copies fournies</span>
              <strong>{receiptSnapshotResults.filter((item) => item.isValid).length}/{masterProofpack.deliveryHistory.length} vérifiés</strong>
            </article>
          </div>
          {#each receiptSnapshotResults as snapshot}
            <article class={`finding ${snapshot.isValid ? "info" : "error"}`}>
              <div><strong>{snapshot.deliveryId}</strong><span>{snapshot.isValid ? "OK" : "FAIL"}</span></div>
              <p>SHA-256 {snapshot.validHash ? "OK" : "FAIL"} · dossier client {snapshot.validDelivery ? "OK" : "FAIL"} · reçu {snapshot.validReceiptLinks ? "OK" : "FAIL"} · correspondances {snapshot.validMappings ? "OK" : "FAIL"}</p>
            </article>
            {#each snapshot.findings as finding}
              <article class={`finding ${finding.severity}`}><div><strong>{verificationDisplayCode(finding.code)}</strong><span>{severityLabel(finding.severity)}</span></div><p>{verificationDisplayText(finding.message)}</p>{#if finding.pointer}<code>{finding.pointer}</code>{/if}</article>
            {/each}
          {/each}
        </section>
      {/if}

      <section class="findings">
        <h2>Résultats de vérification</h2>

        {#if result.findings.length === 0}
          <article class="finding info">
            <div>
              <strong>Aucun écart local détecté</strong>
              <span>OK</span>
            </div>
            <p>
              Le fichier proofpack.json passe les contrôles locaux disponibles. Ce résultat
              n’authentifie pas son émetteur.
            </p>
          </article>
        {:else}
          {#each result.findings as finding}
            <article class={`finding ${finding.severity}`}>
              <div>
                <strong>{verificationDisplayCode(finding.code)}</strong>
                <span>{severityLabel(finding.severity)}</span>
              </div>
              <p>{verificationDisplayText(finding.message)}</p>
              {#if finding.pointer}
                <code>{finding.pointer}</code>
              {/if}
            </article>
          {/each}
        {/if}
      </section>
    {/if}
  </div>
</section>

<style>
  .verify-shell {
    padding: clamp(3.8rem, 8vw, 6.5rem) 0 7rem;
    background: radial-gradient(circle at 8% 5%, light-dark(rgba(62, 105, 97, 0.075), rgba(129, 218, 203, 0.075)), transparent 30rem);
  }

  .verify-panel {
    width: min(1120px, calc(100% - 2.5rem));
    margin: 0 auto;
    border: 0;
    border-radius: 0;
    padding: 0;
    background: transparent;
    box-shadow: none;
  }

  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .security-note {
    border: 0;
    border-left: 2px solid var(--accent);
    border-radius: 0 12px 12px 0;
    padding: 0.95rem 1.1rem;
    margin-top: 1.5rem;
    color: var(--muted);
    background: var(--accent-soft);
  }

  .verification-map {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1px;
    margin-top: 1.4rem;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 18px;
    background: var(--line);
    list-style: none;
  }

  .verification-map li {
    --verification-accent: var(--accent);
    border: 0;
    border-radius: 0;
    padding: 1rem;
    background: light-dark(rgba(248, 250, 246, 0.96), rgba(15, 21, 19, 0.96));
  }

  .verification-map span {
    display: block;
    color: var(--verification-accent);
    font-weight: 680;
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .verification-map li:nth-child(2) { --verification-accent: var(--accent-blue); }
  .verification-map li:nth-child(3) { --verification-accent: var(--accent-violet); }
  .verification-map li:nth-child(4) { --verification-accent: var(--accent-gold); }

  .verification-map strong {
    display: block;
    margin-top: 0.45rem;
    color: var(--text);
    line-height: 1.35;
  }

  .file-drop,
  .json-input {
    display: grid;
    gap: 0.6rem;
    margin-top: 1.2rem;
    color: var(--muted);
    font-weight: 800;
  }

  .protocol-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.8rem;
  }

  .file-drop input,
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

  .file-name {
    color: var(--muted);
  }

  .demo-actions,
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
    margin-top: 1rem;
  }

  .input-limit {
    color: var(--muted);
    font-size: 0.88rem;
  }

  .error-box {
    border: 1px solid light-dark(rgba(122, 46, 42, 0.45), rgba(255, 95, 87, 0.45));
    border-radius: 16px;
    padding: 1rem;
    margin-top: 1rem;
    color: var(--danger);
    background: var(--danger-soft);
  }

  .verification-status {
    border: 1px solid var(--line);
    border-radius: 20px;
    padding: 1.4rem;
    margin-top: 2rem;
    background: light-dark(rgba(24, 66, 46, 0.035), rgba(255, 255, 255, 0.035));
  }

  .verification-status.valid {
    border-color: light-dark(rgba(53, 122, 69, 0.45), rgba(110, 255, 143, 0.45));
  }

  .verification-status.invalid {
    border-color: light-dark(rgba(122, 46, 42, 0.45), rgba(255, 95, 87, 0.45));
  }

  .verification-status h2,
  .findings h2 {
    font-size: clamp(1.7rem, 3vw, 2.6rem);
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1rem;
    margin: 1rem 0;
  }

  .zip-status-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .status-grid article {
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 1rem;
    background: light-dark(rgba(24, 66, 46, 0.035), rgba(255, 255, 255, 0.035));
  }

  .status-grid span,
  .fingerprint-block span {
    display: block;
    color: var(--muted);
    font-size: 0.85rem;
  }

  .status-grid strong {
    display: block;
    margin-top: 0.4rem;
    color: var(--accent);
    font-size: 1.5rem;
  }

  .fingerprint-block {
    margin-top: 1rem;
  }

  .fingerprint-block code {
    display: block;
    overflow-wrap: anywhere;
    color: var(--accent);
    margin-top: 0.4rem;
  }

  .findings {
    display: grid;
    gap: 0.8rem;
    margin-top: 2rem;
  }

  .finding {
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: 1.15rem;
    background: light-dark(rgba(24, 66, 46, 0.035), rgba(255, 255, 255, 0.035));
  }

  .finding.error {
    border-color: light-dark(rgba(122, 46, 42, 0.45), rgba(255, 95, 87, 0.45));
  }

  .finding.warning {
    border-color: light-dark(rgba(122, 98, 49, 0.45), rgba(255, 204, 102, 0.45));
  }

  .finding.info {
    border-color: light-dark(rgba(53, 122, 69, 0.45), rgba(110, 255, 143, 0.45));
  }

  .finding div {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    color: var(--accent);
  }

  .finding p {
    color: var(--muted);
    line-height: 1.5;
  }

  .finding code {
    color: var(--muted);
    overflow-wrap: anywhere;
  }

  @media (max-width: 900px) {
    .verify-shell {
      padding-top: 3rem;
    }

    .verify-panel {
      width: min(100% - 1.25rem, 1120px);
    }

    .verification-map {
      grid-template-columns: 1fr;
    }

    .status-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
