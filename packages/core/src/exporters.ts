import type { ProofPack } from "./types";
import { assertProofPackKnowledgeUseLink, type KnowledgeUse } from "./knowledge";
import { escapeMarkdown, sha256Hex, stableStringify } from "./security";
import { csv } from "./utils";
import { methodology } from "./methodology";
import {
  SOURCE_IMPORT_FORMAT_VERSION,
  XLSX_SOURCE_IMPORT_PROFILE,
  assertProofPackSourceImport,
  assertProofPackSourceImportLink,
  assertProofPackSourceLineage,
  type ProofPackSourceImport,
  type ProofPackSourceImportFile,
  type ProofPackSourceLineage,
} from "./source-import";

export interface ProofPackZipManifestFile {
  filename: string;
  contentType: string;
  size: number;
  sha256: string;
  purpose: string;
}

export interface ProofPackZipFile {
  filename: string;
  contentType: string;
  purpose: string;
  content: string;
}

export interface ProofPackKnowledgeUseFile {
  formatVersion: "blackproof-proofpack-knowledge-use-v1";
  caseId: string;
  proofpackFingerprint: string;
  uses: KnowledgeUse[];
}

export interface ProofPackZipManifest {
  product: "BLACKPROOF";
  manifestVersion: "blackproof-proofpack-zip-v0.2.0-alpha";
  sourceProfile: "none" | typeof XLSX_SOURCE_IMPORT_PROFILE;
  caseId: string;
  caseTitle: string;
  generatedAt: string;
  proofpackFingerprint: string;
  methodVersion: string;
  files: ProofPackZipManifestFile[];
  manifestFingerprint: string;
  manifestFingerprintScope: string;
  disclaimer: string;
}

const PROOFPACK_ZIP_FILE_DESCRIPTORS = [
  {
    filename: "proofpack.json",
    contentType: "application/json",
    purpose: "Dossier maître interne complet, exploitable par machine, avec empreinte SHA-256 du contenu."
  },
  {
    filename: "reponse-fournisseur.md",
    contentType: "text/markdown",
    purpose: "Vue interne complète des réponses, réserves, preuves et dettes de preuve."
  },
  {
    filename: "registre-preuves.csv",
    contentType: "text/csv",
    purpose: "Registre maître interne des preuves, y compris les éléments sensibles ou non exportables."
  },
  {
    filename: "plan-remediation.csv",
    contentType: "text/csv",
    purpose: "Plan de remédiation interne de la dette de preuve."
  },
  {
    filename: "note-synthese.md",
    contentType: "text/markdown",
    purpose: "Note de synthèse interne sur les risques et actions prioritaires."
  },
  {
    filename: "README.md",
    contentType: "text/markdown",
    purpose: "Explication lisible de cet export BLACKPROOF."
  },
  {
    filename: "methodology.json",
    contentType: "application/json",
    purpose: "Version de la méthode BLACKPROOF utilisée par cet export."
  }
] as const;

/** Sérialisation du ProofPack Master. Interne uniquement, jamais pour une transmission tierce. */
export function exportProofPackJson(proofpack: ProofPack): string {
  return JSON.stringify(proofpack, null, 2);
}

function answerStatusLabel(status: string): string {
  if (status === "ready") return "Prête à exporter";
  if (status === "reserved") return "Avec réserve";
  if (status === "do-not-export") return "Ne pas exporter";
  return "Brouillon";
}

function confidenceLabel(confidence: string): string {
  if (confidence === "high") return "Haute";
  if (confidence === "medium") return "Moyenne";
  return "Faible";
}

function severityLabel(severity: string): string {
  if (severity === "critical") return "Critique";
  if (severity === "high") return "Élevée";
  if (severity === "medium") return "Moyenne";
  return "Faible";
}

function decisionView(proofpack: ProofPack): string {
  if (proofpack.summary.proofDebtScore <= 20) {
    return "Lecture heuristique : reprise indispensable. Les informations saisies font apparaître des lacunes majeures ; une personne compétente doit décider des corrections et de toute transmission.";
  }

  if (proofpack.summary.proofDebtScore <= 50) {
    return "Lecture heuristique : préparation très incomplète. Le dossier peut servir au travail interne, mais toute transmission appelle une revue approfondie.";
  }

  if (proofpack.summary.proofDebtScore <= 70) {
    return "Lecture heuristique : préparation partielle. Plusieurs lacunes déclarées doivent être corrigées, réservées ou explicitement acceptées par le responsable de la revue.";
  }

  if (proofpack.summary.proofDebtScore <= 85) {
    return "Lecture heuristique : préparation avancée avec réserves. Une revue humaine reste nécessaire avant toute transmission.";
  }

  return "Lecture heuristique : registre bien structuré selon les informations saisies. Cela ne valide ni les documents sources, ni la vérité des déclarations, ni leur acceptation par un tiers.";
}

export function exportSupplierResponseMarkdown(proofpack: ProofPack): string {
  const lines: string[] = [];

  lines.push("# Réponse cyber fournisseur");
  lines.push("");
  lines.push(`Dossier : ${escapeMarkdown(proofpack.case.title)}`);
  lines.push(`Généré le : ${escapeMarkdown(proofpack.generatedAt)}`);
  lines.push(`Référentiel : ${escapeMarkdown(proofpack.case.framework)}`);
  lines.push(`Format Master : ${escapeMarkdown(proofpack.formatVersion)}`);
  lines.push(`Schéma Master : ${escapeMarkdown(proofpack.schemaVersion)}`);
  lines.push(`Méthode : ${escapeMarkdown(proofpack.methodVersion)}`);
  lines.push(`Empreinte : ${escapeMarkdown(proofpack.fingerprint)}`);
  lines.push("");
  lines.push("## Synthèse");
  lines.push("");
  lines.push(`- Questions: ${proofpack.summary.questionCount}`);
  lines.push(`- Preuves attendues: ${proofpack.summary.evidenceCount}`);
  lines.push(`- Dettes de preuve: ${proofpack.summary.proofDebtCount}`);
  lines.push(`- Indicateur ProofDebt: ${proofpack.summary.proofDebtScore}/100`);
  lines.push(`- Complétude des réponses: ${proofpack.summary.responseCompletenessScore}/100`);
  lines.push(`- Statuts de preuve renseignés: ${proofpack.summary.evidenceCoverageScore}/100`);
  lines.push(`- Qualité déclarée / fraîcheur datée: ${proofpack.summary.evidenceQualityFreshnessScore}/100`);
  lines.push(`- Préparation à l'export: ${proofpack.summary.exportReadinessScore}/100`);
  lines.push("");
  lines.push("> BLACKPROOF structure un registre de préparation cyber à partir des informations saisies. Il ne vérifie pas les documents sources et ne fournit ni certification, ni avis juridique, ni audit qualifié, ni garantie de conformité réglementaire.");
  lines.push("");

  proofpack.questions.forEach((question, index) => {
    const evidence = proofpack.evidence.filter((item) => item.questionId === question.id);
    const debts = proofpack.debts.filter((debt) => debt.questionId === question.id);

    lines.push(`## Question ${index + 1}`);
    lines.push("");
    lines.push(escapeMarkdown(question.text));
    lines.push("");
    lines.push(`- Catégorie : ${escapeMarkdown(question.category)}`);
    lines.push(`- Criticité : ${escapeMarkdown(question.criticality)}`);
    lines.push(`- Exigences liées : ${question.mappedRequirements.map(escapeMarkdown).join(", ")}`);
    lines.push("");
    const answerText = question.answerText.trim() || "Réponse non renseignée.";

    const answerReservation = question.answerReservation.trim();
    const answerConfidence = question.answerConfidence;
    const answerExportStatus = question.answerExportStatus;

    lines.push("### Réponse");
    lines.push("");
    lines.push(`- Statut d'export : ${escapeMarkdown(answerStatusLabel(answerExportStatus))}`);
    lines.push(`- Confiance : ${escapeMarkdown(confidenceLabel(answerConfidence))}`);
    lines.push("");
    lines.push(escapeMarkdown(answerText));
    lines.push("");

    if (answerReservation) {
      lines.push("### Réserve");
      lines.push("");
      lines.push(escapeMarkdown(answerReservation));
      lines.push("");
    }

    lines.push("### Preuves attendues");
    lines.push("");

    for (const item of evidence) {
      lines.push(
        `- ${escapeMarkdown(item.title)} : ${escapeMarkdown(item.status)} : ${escapeMarkdown(item.recommendedFormat)}`
      );
    }

    if (debts.length > 0) {
      lines.push("");
      lines.push("### Dette de preuve");
      lines.push("");

      for (const debt of debts) {
        lines.push(
          `- ${escapeMarkdown(severityLabel(debt.severity))}: ${escapeMarkdown(debt.reason)} Action : ${escapeMarkdown(debt.recommendedAction)}`
        );
      }
    }

    lines.push("");
  });

  return lines.join("\n");
}

export function exportEvidenceRegisterCsv(proofpack: ProofPack): string {
  return csv([
    [
      "case_id",
      "question_id",
      "evidence_id",
      "title",
      "category",
      "status",
      "sensitivity",
      "strength",
      "recommended_format",
      "linked_requirements",
      "reference_type",
      "reference_id",
      "public_reference",
      "export_mode",
      "file_name",
      "file_uri",
      "document_hash",
      "source_system",
      "owner",
      "observed_at",
      "expires_at",
      "covered_scope",
      "validator",
      "validated_at",
      "control_result",
      "version",
      "history",
    ],
    ...proofpack.evidence.map((item) => [
      item.caseId,
      item.questionId,
      item.id,
      item.title,
      item.category,
      item.status,
      item.sensitivity,
      item.strength,
      item.recommendedFormat,
      item.linkedRequirements.join(", "),
      item.referenceType ?? "",
      item.referenceId ?? "",
      item.publicReference ?? "",
      item.exportMode ?? "",
      item.fileName ?? "",
      item.fileUri ?? "",
      item.documentHash ?? "",
      item.sourceSystem ?? "",
      item.owner ?? "",
      item.observedAt ?? "",
      item.expiresAt ?? "",
      item.coveredScope ?? "",
      item.validator ?? "",
      item.validatedAt ?? "",
      item.controlResult ?? "",
      item.version ?? "",
      item.history?.join(" | ") ?? "",
    ]),
  ]);
}

export function exportRemediationBacklogCsv(proofpack: ProofPack): string {
  return csv([
    [
      "case_id",
      "question_id",
      "evidence_id",
      "severity",
      "reason",
      "recommended_action",
    ],
    ...proofpack.debts.map((debt) => [
      debt.caseId,
      debt.questionId,
      debt.evidenceId ?? "",
      debt.severity,
      debt.reason,
      debt.recommendedAction,
    ]),
  ]);
}


function utf8Size(input: string): number {
  return new TextEncoder().encode(input).byteLength;
}

export function buildProofPackSourceImportFile(proofpack: ProofPack, sourceImport: ProofPackSourceImport): ProofPackSourceImportFile {
  assertProofPackSourceImportLink(proofpack, sourceImport);
  const file: ProofPackSourceImportFile = {
    formatVersion: SOURCE_IMPORT_FORMAT_VERSION,
    caseId: proofpack.case.id,
    sourceQuestionnaire: proofpack.sourceQuestionnaire,
    ...sourceImport,
  };
  assertProofPackSourceImport(file, { file: true });
  return file;
}

export function buildProofPackKnowledgeUseFile(proofpack: ProofPack, knowledgeUses: KnowledgeUse[]): ProofPackKnowledgeUseFile {
  assertProofPackKnowledgeUseLink(proofpack, knowledgeUses);
  return { formatVersion: "blackproof-proofpack-knowledge-use-v1", caseId: proofpack.case.id, proofpackFingerprint: proofpack.fingerprint, uses: knowledgeUses };
}

export function buildProofPackZipFiles(proofpack: ProofPack, sourceImport?: ProofPackSourceImport, knowledgeUses: KnowledgeUse[] = [], sourceLineage?: ProofPackSourceLineage): ProofPackZipFile[] {
  const isXlsxSource = proofpack.sourceQuestionnaire.fileName.toLowerCase().endsWith(".xlsx");
  if (isXlsxSource && !sourceImport) throw new Error("SOURCE_IMPORT_REQUIRED_FOR_XLSX: New XLSX Master ZIP exports require source-import.json.");
  if (!isXlsxSource && sourceImport) throw new Error("SOURCE_IMPORT_REFUSED_FOR_NON_XLSX: source-import.json can only be attached to an XLSX source.");
  if (sourceImport) assertProofPackSourceImportLink(proofpack, sourceImport);
  if (sourceLineage) {
    assertProofPackSourceLineage(sourceLineage);
    const sourceSha256 = proofpack.sourceQuestionnaire.normalizedQuestionnaireSha256 ?? proofpack.sourceQuestionnaire.sha256;
    if (sourceImport
      || sourceLineage.derivedSourceFileName !== proofpack.sourceQuestionnaire.fileName
      || sourceLineage.derivedSourceSha256 !== sourceSha256
      || sourceLineage.originalFileSha256 !== proofpack.sourceQuestionnaire.originalFileSha256) {
      throw new Error("SOURCE_LINEAGE_LINK_MISMATCH: source-lineage.json does not match the derived ProofPack source.");
    }
  }
  assertProofPackKnowledgeUseLink(proofpack, knowledgeUses);
  const files: ProofPackZipFile[] = [
    {
      ...PROOFPACK_ZIP_FILE_DESCRIPTORS[0],
      content: exportProofPackJson(proofpack)
    },
    {
      ...PROOFPACK_ZIP_FILE_DESCRIPTORS[1],
      content: exportSupplierResponseMarkdown(proofpack)
    },
    {
      ...PROOFPACK_ZIP_FILE_DESCRIPTORS[2],
      content: exportEvidenceRegisterCsv(proofpack)
    },
    {
      ...PROOFPACK_ZIP_FILE_DESCRIPTORS[3],
      content: exportRemediationBacklogCsv(proofpack)
    },
    {
      ...PROOFPACK_ZIP_FILE_DESCRIPTORS[4],
      content: exportBoardMemoMarkdown(proofpack)
    },
    {
      ...PROOFPACK_ZIP_FILE_DESCRIPTORS[5],
      content: exportProofPackReadmeMarkdown(proofpack, Boolean(sourceImport), knowledgeUses.length > 0, Boolean(sourceLineage))
    },
    {
      ...PROOFPACK_ZIP_FILE_DESCRIPTORS[6],
      content: JSON.stringify(methodology, null, 2)
    }
  ];
  if (sourceImport) {
    files.push({
      filename: "source-import.json",
      contentType: "application/json",
      purpose: "Provenance reproductible de l’import XLSX, sélection source et qualification des cellules à formule.",
      content: JSON.stringify(buildProofPackSourceImportFile(proofpack, sourceImport), null, 2),
    });
  }
  if (knowledgeUses.length > 0) {
    files.push({
      filename: "knowledge-use.json",
      contentType: "application/json",
      purpose: "Provenance interne des formulations appliquées depuis la base personnelle locale.",
      content: JSON.stringify(buildProofPackKnowledgeUseFile(proofpack, knowledgeUses), null, 2),
    });
  }
  if (sourceLineage) {
    files.push({
      filename: "source-lineage.json",
      contentType: "application/json",
      purpose: "Filiation explicite entre le XLSX importé, le Master précédent et la source texte dérivée.",
      content: JSON.stringify(sourceLineage, null, 2),
    });
  }
  return files;
}

export async function buildProofPackZipManifest(proofpack: ProofPack, sourceImport?: ProofPackSourceImport, knowledgeUses: KnowledgeUse[] = [], sourceLineage?: ProofPackSourceLineage): Promise<ProofPackZipManifest> {
  const files = await Promise.all(
    buildProofPackZipFiles(proofpack, sourceImport, knowledgeUses, sourceLineage).map(async (file) => ({
      filename: file.filename,
      contentType: file.contentType,
      size: utf8Size(file.content),
      sha256: await sha256Hex(file.content),
      purpose: file.purpose
    }))
  );

  const manifestWithoutFingerprint: Omit<ProofPackZipManifest, "manifestFingerprint"> = {
    product: "BLACKPROOF",
    manifestVersion: "blackproof-proofpack-zip-v0.2.0-alpha",
    sourceProfile: sourceImport?.profile ?? "none",
    caseId: proofpack.case.id,
    caseTitle: proofpack.case.title,
    generatedAt: new Date().toISOString(),
    proofpackFingerprint: proofpack.fingerprint,
    methodVersion: proofpack.methodVersion,
    files,
    manifestFingerprintScope: "SHA-256 over canonical manifest fields and file entries, excluding manifestFingerprint.",
    disclaimer: "BLACKPROOF est un outil de structuration de preuves cyber. Ce ZIP n'est ni une certification, ni un avis juridique, ni un audit qualifié, ni une garantie de conformité réglementaire."
  };

  return {
    ...manifestWithoutFingerprint,
    manifestFingerprint: `bp_sha256_${await sha256Hex(stableStringify(manifestWithoutFingerprint))}`,
  };
}

export async function exportProofPackZipManifestJson(proofpack: ProofPack, sourceImport?: ProofPackSourceImport, knowledgeUses: KnowledgeUse[] = [], sourceLineage?: ProofPackSourceLineage): Promise<string> {
  return JSON.stringify(await buildProofPackZipManifest(proofpack, sourceImport, knowledgeUses, sourceLineage), null, 2);
}

export function exportProofPackReadmeMarkdown(proofpack: ProofPack, includesSourceImport = false, includesKnowledgeUse = false, includesSourceLineage = false): string {
  const lines: string[] = [];

  lines.push("# ProofPack Master BLACKPROOF : interne uniquement");
  lines.push("");
  lines.push(`Dossier : ${escapeMarkdown(proofpack.case.title)}`);
  lines.push(`ID dossier : ${escapeMarkdown(proofpack.case.id)}`);
  lines.push(`Généré : ${escapeMarkdown(proofpack.generatedAt)}`);
  lines.push(`Format Master : ${escapeMarkdown(proofpack.formatVersion)}`);
  lines.push(`Schéma Master : ${escapeMarkdown(proofpack.schemaVersion)}`);
  lines.push(`Méthode : ${escapeMarkdown(proofpack.methodVersion)}`);
  lines.push(`Empreinte ProofPack : \`${proofpack.fingerprint}\``);
  lines.push("");
  lines.push("> Ne pas transmettre ce dossier maître à un tiers. Utiliser exclusivement un ProofPack Delivery construit après revue explicite.");
  lines.push("");
  lines.push("## Synthèse");
  lines.push("");
  lines.push(`- Questions: ${proofpack.summary.questionCount}`);
  lines.push(`- Preuves: ${proofpack.summary.evidenceCount}`);
  lines.push(`- Dettes de preuve: ${proofpack.summary.proofDebtCount}`);
  lines.push(`- Indicateur ProofDebt: ${proofpack.summary.proofDebtScore}/100`);
  lines.push(`- Complétude des réponses: ${proofpack.summary.responseCompletenessScore}/100`);
  lines.push(`- Statuts de preuve renseignés: ${proofpack.summary.evidenceCoverageScore}/100`);
  lines.push(`- Qualité déclarée / fraîcheur datée: ${proofpack.summary.evidenceQualityFreshnessScore}/100`);
  lines.push(`- Préparation à l'export: ${proofpack.summary.exportReadinessScore}/100`);
  lines.push("");
  lines.push("## Fichiers");
  lines.push("");

  for (const file of PROOFPACK_ZIP_FILE_DESCRIPTORS) {
    lines.push(`- ${escapeMarkdown(file.filename)} : ${escapeMarkdown(file.purpose)}`);
  }

  if (includesSourceImport) {
    lines.push("- source-import.json : sidecar de cohérence de l’import XLSX avec feuille et colonne déclarées, puis origine littérale ou formule mémorisée de chaque question. Sans le classeur original, il ne prouve pas les cellules source.");
  }
  if (includesKnowledgeUse) {
    lines.push("- knowledge-use.json : provenance interne des formulations copiées depuis la base personnelle ; une application reste un brouillon à revoir dans le dossier.");
  }
  if (includesSourceLineage) {
    lines.push("Filiation source : `source-lineage.json` relie le XLSX initial, le Master précédent et la source texte dérivée.");
    lines.push("");
  }

  lines.push("- manifest.json : manifeste ZIP avec taille et empreinte SHA-256 de chaque fichier listé.");

  lines.push("");
  lines.push("## Vérification");
  lines.push("");
  lines.push("Pour vérifier le ProofPack exporté :");
  lines.push("");
  lines.push("1. Ouvrir la page Vérifier de BLACKPROOF.");
  lines.push("2. Charger directement le ZIP ProofPack.");
  lines.push("3. Contrôler automatiquement l'inventaire, les tailles, les SHA-256 et l'empreinte du manifeste.");
  lines.push("4. Contrôler le schéma, les relations internes et l'empreinte de proofpack.json.");
  lines.push("");
  lines.push("L'empreinte permet de contrôler que le contenu correspond à l'empreinte fournie. Elle n'authentifie ni l'auteur ni la véracité des déclarations.");
  lines.push("");
  lines.push("## Limite");
  lines.push("");
  lines.push("BLACKPROOF est un outil de structuration de preuves cyber. Ce ZIP n'est ni une certification, ni un avis juridique, ni un audit qualifié, ni une garantie de conformité réglementaire.");
  lines.push("");

  return lines.join("\n");
}

export async function exportProofPackZipBundleMetadata(proofpack: ProofPack, sourceImport?: ProofPackSourceImport, knowledgeUses: KnowledgeUse[] = []): Promise<string> {
  return stableStringify(await buildProofPackZipManifest(proofpack, sourceImport, knowledgeUses));
}


export function exportBoardMemoMarkdown(proofpack: ProofPack): string {
  const lines: string[] = [];

  const criticalDebts = proofpack.debts.filter((debt) => debt.severity === "critical");
  const highDebts = proofpack.debts.filter((debt) => debt.severity === "high");

  const missingOrWeakEvidence = proofpack.evidence.filter((item) =>
    item.status === "expected" ||
    item.status === "missing" ||
    item.status === "expired" ||
    item.status === "declared"
  );

  const sensitiveEvidence = proofpack.evidence.filter((item) =>
    item.status === "not-exportable" ||
    item.sensitivity === "confidential" ||
    item.sensitivity === "secret"
  );

  const readyAnswers = proofpack.questions.filter((question) => question.answerExportStatus === "ready");
  const reservedAnswers = proofpack.questions.filter((question) => question.answerExportStatus === "reserved");
  const doNotExportAnswers = proofpack.questions.filter((question) => question.answerExportStatus === "do-not-export");
  const draftAnswers = proofpack.questions.filter((question) => question.answerExportStatus === "draft");

  lines.push("# Note de synthèse BLACKPROOF");
  lines.push("");
  lines.push(`Dossier : ${escapeMarkdown(proofpack.case.title)}`);
  lines.push(`ID dossier : ${escapeMarkdown(proofpack.case.id)}`);
  lines.push(`Généré le : ${escapeMarkdown(proofpack.generatedAt)}`);
  lines.push(`Format Master : ${escapeMarkdown(proofpack.formatVersion)}`);
  lines.push(`Schéma Master : ${escapeMarkdown(proofpack.schemaVersion)}`);
  lines.push(`Méthode : ${escapeMarkdown(proofpack.methodVersion)}`);
  lines.push(`Empreinte ProofPack : \`${proofpack.fingerprint}\``);
  lines.push("");
  lines.push("## Synthèse décisionnelle");
  lines.push("");
  lines.push(`- Indicateur ProofDebt: ${proofpack.summary.proofDebtScore}/100`);
  lines.push(`- Complétude des réponses: ${proofpack.summary.responseCompletenessScore}/100`);
  lines.push(`- Statuts de preuve renseignés: ${proofpack.summary.evidenceCoverageScore}/100`);
  lines.push(`- Qualité déclarée / fraîcheur datée: ${proofpack.summary.evidenceQualityFreshnessScore}/100`);
  lines.push(`- Préparation à l'export: ${proofpack.summary.exportReadinessScore}/100`);
  lines.push(`- Questions: ${proofpack.summary.questionCount}`);
  lines.push(`- Preuves: ${proofpack.summary.evidenceCount}`);
  lines.push(`- Dettes de preuve: ${proofpack.summary.proofDebtCount}`);
  lines.push(`- Dettes critiques: ${proofpack.summary.criticalDebtCount}`);
  lines.push(`- Dettes élevées: ${proofpack.summary.highDebtCount}`);
  lines.push("");
  lines.push(decisionView(proofpack));

  lines.push("");
  lines.push("## Dette de preuve critique et élevée");
  lines.push("");

  const priorityDebts = [...criticalDebts, ...highDebts].slice(0, 12);

  if (priorityDebts.length === 0) {
    lines.push("Aucune dette critique ou élevée détectée.");
  } else {
    for (const debt of priorityDebts) {
      const question = proofpack.questions.find((item) => item.id === debt.questionId);
      lines.push(`- ${escapeMarkdown(severityLabel(debt.severity))}: ${escapeMarkdown(debt.reason)}`);
      if (question) {
        lines.push(`  - Question: ${escapeMarkdown(question.text)}`);
      }
      lines.push(`  - Action: ${escapeMarkdown(debt.recommendedAction)}`);
    }
  }

  lines.push("");
  lines.push("## Position de preuve");
  lines.push("");
  lines.push(`- Preuves faibles, manquantes, périmées ou déclaratives: ${missingOrWeakEvidence.length}`);
  lines.push(`- Preuves sensibles ou non exportables: ${sensitiveEvidence.length}`);
  lines.push("");

  if (missingOrWeakEvidence.length > 0) {
    lines.push("### Preuves à traiter");
    lines.push("");
    for (const item of missingOrWeakEvidence.slice(0, 12)) {
      lines.push(`- ${escapeMarkdown(item.title)} : ${escapeMarkdown(item.status)} : ${escapeMarkdown(item.category)}`);
    }
    lines.push("");
  }

  if (sensitiveEvidence.length > 0) {
    lines.push("### Gestion des preuves sensibles");
    lines.push("");
    for (const item of sensitiveEvidence.slice(0, 12)) {
      lines.push(`- ${escapeMarkdown(item.title)} : ${escapeMarkdown(item.sensitivity)} : ${escapeMarkdown(item.status)}`);
    }
    lines.push("");
    lines.push("Recommandation : fournir des extraits contrôlés, attestations ou réserves documentées plutôt que des preuves sensibles brutes.");
    lines.push("");
  }

  lines.push("## Préparation des réponses fournisseur");
  lines.push("");
  lines.push(`- Réponses prêtes: ${readyAnswers.length}`);
  lines.push(`- Réponses avec réserve: ${reservedAnswers.length}`);
  lines.push(`- Réponses à ne pas exporter: ${doNotExportAnswers.length}`);
  lines.push(`- Réponses brouillon: ${draftAnswers.length}`);
  lines.push("");

  if (doNotExportAnswers.length > 0) {
    lines.push("### Réponses non prêtes pour export");
    lines.push("");
    for (const question of doNotExportAnswers.slice(0, 12)) {
      lines.push(`- ${escapeMarkdown(question.text)}`);
    }
    lines.push("");
  }

  if (reservedAnswers.length > 0) {
    lines.push("### Réponses avec réserves");
    lines.push("");
    for (const question of reservedAnswers.slice(0, 12)) {
      lines.push(`- ${escapeMarkdown(question.text)}`);
      if (question.answerReservation) {
        lines.push(`  - Réserve: ${escapeMarkdown(question.answerReservation)}`);
      }
    }
    lines.push("");
  }

  lines.push("## Actions prioritaires");
  lines.push("");

  const priorityActions = proofpack.debts.slice(0, 10);

  if (priorityActions.length === 0) {
    lines.push("Aucune action prioritaire détectée.");
  } else {
    for (const debt of priorityActions) {
      lines.push(`- ${escapeMarkdown(debt.recommendedAction)}`);
    }
  }

  lines.push("");
  lines.push("## Limite");
  lines.push("");
  lines.push("BLACKPROOF est un outil de structuration de preuves cyber. Cette note n'est ni une certification, ni un avis juridique, ni un audit qualifié, ni une garantie de conformité réglementaire.");
  lines.push("");

  return lines.join("\n");
}
