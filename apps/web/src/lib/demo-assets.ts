export const DEMO_SUPPLIER_QUESTIONNAIRE_CSV = `ID;Question;Owner;Comment
Q1;Avez-vous activé le MFA pour les comptes administrateurs ?;IT;Contrôle critique demandé par le client
Q2;Disposez-vous d'une procédure de sauvegarde documentée ?;IT;Fournir une synthèse, pas les chemins internes
Q3;Testez-vous régulièrement la restauration des sauvegardes ?;IT;Preuve datée attendue
Q4;Avez-vous une procédure de réponse à incident ?;Security;Procédure et chaîne d'escalade
Q5;Disposez-vous d'un registre des fournisseurs critiques ?;Procurement;Extrait contrôlé recommandé
Q6;Réalisez-vous des scans de vulnérabilités ou un suivi des correctifs ?;Security;Rapport expurgé ou backlog synthétique
Q7;Collectez-vous et conservez-vous les journaux de sécurité ?;Security;Éviter l'export de logs bruts
Q8;Disposez-vous d'un PRA ou PCA documenté ?;Operations;Résumé du périmètre et date de mise à jour
Q9;Chiffrez-vous les données sensibles au repos et en transit ?;Engineering;Ne pas exposer de secrets ou clés
Q10;Une politique de sécurité du système d'information est-elle formalisée ?;Management;Politique SSI ou extrait contrôlé`;

export const DEMO_PROOFPACK_JSON = `{
  "id": "proofpack_demo_northstar_saas_20260710",
  "case": {
    "id": "case_demo_northstar_saas",
    "title": "Northstar SaaS - Revue cyber client",
    "companyName": "Northstar SaaS",
    "clientName": "Omega Industrial Group",
    "framework": "NIS2/ReCyF V1",
    "createdAt": "2026-07-10T00:00:00.000Z",
    "updatedAt": "2026-07-10T00:00:00.000Z",
    "status": "ready"
  },
  "sourceQuestionnaire": {
    "fileName": "northstar-demo-questionnaire.txt",
    "format": "text",
    "importedAt": "2026-07-10T00:00:00.000Z",
    "sha256": "sha256:0725af3ddf463a918ca8be5b0b3617da30249548e822fbab12489c777b9baeb9",
    "size": 180
  },
  "questions": [
    {
      "id": "question_demo_mfa_admin",
      "caseId": "case_demo_northstar_saas",
      "text": "Avez-vous activé le MFA pour les comptes administrateurs ?",
      "category": "access-control",
      "criticality": "critical",
      "mappedRequirements": ["NIS2-ART21-ACCESS-CONTROL"],
      "suggestedAnswer": "Répondre avec le périmètre MFA, les exceptions documentées et les preuves exportables.",
      "evidenceIds": ["evidence_demo_mfa_policy"],
      "confidence": "high",
      "answerText": "MFA activé pour les comptes administrateurs. Les exceptions éventuelles sont documentées dans le registre interne.",
      "answerReservation": "Ne pas exporter la liste nominative des comptes administrateurs.",
      "answerConfidence": "high",
      "answerExportStatus": "ready"
    },
    {
      "id": "question_demo_restore_test",
      "caseId": "case_demo_northstar_saas",
      "text": "Testez-vous régulièrement la restauration des sauvegardes ?",
      "category": "backup",
      "criticality": "high",
      "mappedRequirements": ["NIS2-ART21-BACKUP-RESTORE"],
      "suggestedAnswer": "Répondre avec la dernière date de test, le périmètre et les limites.",
      "evidenceIds": ["evidence_demo_restore_report"],
      "confidence": "medium",
      "answerText": "Des tests de restauration sont réalisés sur un périmètre prioritaire.",
      "answerReservation": "Le périmètre complet et les chemins internes ne sont pas exportés.",
      "answerConfidence": "medium",
      "answerExportStatus": "reserved"
    },
    {
      "id": "question_demo_supplier_register",
      "caseId": "case_demo_northstar_saas",
      "text": "Disposez-vous d’un registre des fournisseurs critiques ?",
      "category": "supplier-security",
      "criticality": "medium",
      "mappedRequirements": ["NIS2-ART21-SUPPLIER-RISK"],
      "suggestedAnswer": "Répondre avec l’existence du registre et exporter uniquement un extrait contrôlé.",
      "evidenceIds": ["evidence_demo_supplier_register"],
      "confidence": "medium",
      "answerText": "Un registre des fournisseurs critiques existe et fait l’objet d’une revue périodique.",
      "answerReservation": "Le registre complet est confidentiel ; seul un extrait contrôlé peut être partagé.",
      "answerConfidence": "medium",
      "answerExportStatus": "reserved"
    }
  ],
  "evidence": [
    {
      "id": "evidence_demo_mfa_policy",
      "caseId": "case_demo_northstar_saas",
      "questionId": "question_demo_mfa_admin",
      "templateId": "template_access_control_mfa_policy",
      "title": "Politique MFA administrateurs",
      "category": "access-control",
      "description": "Extrait de politique MFA, statut d’activation et règle d’exception.",
      "sensitivity": "internal",
      "status": "available",
      "strength": "strong",
      "recommendedFormat": "PDF expurgé ou extrait contrôlé",
      "linkedRequirements": ["NIS2-ART21-ACCESS-CONTROL"],
      "fileName": "mfa-admin-policy-redacted.pdf",
      "fileUri": "local://evidence/mfa-admin-policy-redacted.pdf",
      "documentHash": "sha256:7c3f2b6e0f0f4f5f4b8a65f5b5d6e2c8e7f2d1a0c9b8a7e6d5c4b3a291807f6e",
      "sourceSystem": "IAM",
      "owner": "RSSI",
      "observedAt": "2026-07-08T09:00:00.000Z",
      "expiresAt": "2027-07-08T09:00:00.000Z",
      "coveredScope": "Comptes administrateurs production",
      "validator": "Responsable sécurité",
      "validatedAt": "2026-07-09T14:00:00.000Z",
      "controlResult": "Politique déclarée active, exceptions nominatives non exportées",
      "version": "2026.07",
      "history": ["2026-07-08: fiche déclarée disponible pour l'exemple public"]
    },
    {
      "id": "evidence_demo_restore_report",
      "caseId": "case_demo_northstar_saas",
      "questionId": "question_demo_restore_test",
      "templateId": "template_backup_restore_test",
      "title": "Rapport de test de restauration",
      "category": "backup",
      "description": "Dernière campagne de restauration, périmètre testé et résultat synthétique.",
      "sensitivity": "confidential",
      "status": "declared",
      "strength": "medium",
      "recommendedFormat": "Note de synthèse datée",
      "linkedRequirements": ["NIS2-ART21-BACKUP-RESTORE"],
      "sourceSystem": "Runbook sauvegarde",
      "owner": "SRE",
      "observedAt": "2026-06-20T10:30:00.000Z",
      "coveredScope": "Périmètre prioritaire uniquement",
      "controlResult": "Déclaratif, rapport complet non exporté"
    },
    {
      "id": "evidence_demo_supplier_register",
      "caseId": "case_demo_northstar_saas",
      "questionId": "question_demo_supplier_register",
      "templateId": "template_supplier_register",
      "title": "Registre fournisseurs critiques",
      "category": "supplier-security",
      "description": "Existence du registre, processus de revue et extrait non sensible.",
      "sensitivity": "confidential",
      "status": "not-exportable",
      "strength": "medium",
      "recommendedFormat": "Attestation ou extrait contrôlé",
      "linkedRequirements": ["NIS2-ART21-SUPPLIER-RISK"],
      "sourceSystem": "Vendor management",
      "owner": "DPO",
      "observedAt": "2026-07-01T08:00:00.000Z",
      "coveredScope": "Fournisseurs critiques",
      "controlResult": "Existence déclarée, registre complet confidentiel"
    }
  ],
  "debts": [
    {
      "id": "debt_demo_restore_scope",
      "caseId": "case_demo_northstar_saas",
      "questionId": "question_demo_restore_test",
      "evidenceId": "evidence_demo_restore_report",
      "severity": "high",
      "reason": "Le test de restauration est déclaré mais le périmètre exportable reste partiel.",
      "recommendedAction": "Produire une note de test expurgée avec date, périmètre, résultat et responsable."
    },
    {
      "id": "debt_demo_supplier_register_export",
      "caseId": "case_demo_northstar_saas",
      "questionId": "question_demo_supplier_register",
      "evidenceId": "evidence_demo_supplier_register",
      "severity": "medium",
      "reason": "Le registre complet est confidentiel et ne peut pas être transmis tel quel.",
      "recommendedAction": "Préparer un extrait contrôlé ou une attestation de revue fournisseurs."
    }
  ],
  "summary": {
    "questionCount": 3,
    "evidenceCount": 3,
    "proofDebtCount": 2,
    "criticalDebtCount": 0,
    "highDebtCount": 1,
    "responseCompletenessScore": 100,
    "evidenceCoverageScore": 100,
    "evidenceQualityFreshnessScore": 63,
    "exportReadinessScore": 83,
    "proofDebtScore": 74
  },
  "methodVersion": "blackproof-method-v0.1.0-alpha",
  "generatedAt": "2026-07-10T00:00:00.000Z",
  "fingerprint": "bp_sha256_89dd23b8e7cb9565a693e9d5e1f5fc73629c84c4e3326b26eea013d38cb008e0"
}`;
