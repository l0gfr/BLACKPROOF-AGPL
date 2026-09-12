import { describe, expect, it } from "vitest";

import {
  SECURITY_LIMITS,
  SecurityValidationError,
  classifyQuestionnaireImportFile,
  importQuestionnaireCsv,
  importQuestionnaireRows,
  importQuestionnaireRowsWithSources,
  importQuestionnaireText,
  importQuestionnaireTsv,
  parseDelimitedRows,
} from "./index";

describe("BLACKPROOF Questionnaire Import", () => {
  it("imports plain text questionnaires", () => {
    const result = importQuestionnaireText(`
1. Avez-vous activé le MFA pour les comptes administrateurs ?
2. Disposez-vous d'une procédure de sauvegarde documentée ?
`);

    expect(result.kind).toBe("text");
    expect(result.questionCount).toBe(2);
    expect(result.normalizedQuestionnaire).toContain("MFA");
  });

  it("warns when retained invisible Unicode characters affect the fingerprint", () => {
    const result = importQuestionnaireText("1. Avez-vous\u200b activé le MFA pour les administrateurs ?");
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: "INVISIBLE_UNICODE_FORMAT_CHARACTERS",
      severity: "warning",
    }));
    expect(result.warnings[0]!.message).toContain("U+200B");
  });

  it("imports semicolon CSV with a Question header", () => {
    const csv = `ID;Question;Réponse
1;Avez-vous activé le MFA pour les comptes administrateurs ?;
2;Disposez-vous d'une procédure de sauvegarde documentée ?;`;

    const result = importQuestionnaireCsv(csv);

    expect(result.kind).toBe("csv");
    expect(result.delimiter).toBe(";");
    expect(result.selectedColumnName).toBe("Question");
    expect(result.questionCount).toBe(2);
  });

  it("imports quoted CSV cells", () => {
    const csv = `Control,Question
AC-1,"Avez-vous activé le MFA pour les comptes administrateurs ?"
BK-1,"Disposez-vous d'une procédure de sauvegarde documentée ?"`;

    const rows = parseDelimitedRows(csv, ",");

    expect(rows[1]?.[1]).toBe("Avez-vous activé le MFA pour les comptes administrateurs ?");
  });

  it("keeps valid multiline and escaped quoted CSV cells", () => {
    const rows = parseDelimitedRows('Control,Question\nAC-1,"Première ligne\nSeconde ligne avec ""précision"" ?"', ",");

    expect(rows[1]?.[1]).toBe('Première ligne\nSeconde ligne avec "précision" ?');
  });

  it("rejects an unterminated quoted CSV field at end of input", () => {
    try {
      parseDelimitedRows('Control,Question\nAC-1,"Champ incomplet', ",");
      throw new Error("Expected the malformed import to be rejected.");
    } catch (error) {
      expect(error).toBeInstanceOf(SecurityValidationError);
      expect((error as SecurityValidationError).code).toBe("IMPORT_UNTERMINATED_QUOTED_FIELD");
    }
  });

  it("imports TSV questionnaires", () => {
    const tsv = `ID\tSecurity Question
1\tCollectez-vous et conservez-vous les journaux de sécurité ?
2\tAvez-vous une procédure de réponse à incident ?`;

    const result = importQuestionnaireTsv(tsv);

    expect(result.kind).toBe("tsv");
    expect(result.delimiter).toBe("\t");
    expect(result.questionCount).toBe(2);
  });

  it("accepts only questionnaire import file extensions", () => {
    expect(classifyQuestionnaireImportFile("audit.csv")).toEqual({ accepted: true, kind: "csv" });
    expect(classifyQuestionnaireImportFile("audit.TSV")).toEqual({ accepted: true, kind: "tsv" });
    expect(classifyQuestionnaireImportFile("audit.md")).toEqual({ accepted: true, kind: "text" });
    expect(classifyQuestionnaireImportFile("questionnaire.XLSX")).toEqual({ accepted: true, kind: "xlsx" });

    expect(classifyQuestionnaireImportFile("payload.pdf")).toMatchObject({
      accepted: false,
      code: "IMPORT_UNSUPPORTED_FILE_TYPE",
    });
    expect(classifyQuestionnaireImportFile("audit.csv\u202E.exe")).toMatchObject({
      accepted: false,
      code: "IMPORT_UNSUPPORTED_FILE_TYPE",
    });
  });

  it("imports already-extracted XLSX text rows without executing spreadsheet logic", () => {
    const result = importQuestionnaireRows([
      ["ID", "Question"],
      ["1", "Avez-vous activé le MFA pour les comptes administrateurs ?"],
      ["2", "Disposez-vous d'une procédure de sauvegarde documentée ?"],
    ], { kind: "xlsx" });

    expect(result.kind).toBe("xlsx");
    expect(result.selectedColumnName).toBe("Question");
    expect(result.questionCount).toBe(2);
  });

  it("derives XLSX question provenance from the same header and deduplication pass", () => {
    const imported = importQuestionnaireRowsWithSources([
      ["Question"],
      ["Décrivez vos contrôles d’accès administrateur."],
      ["Quel est votre processus de contrôle des accès ?"],
      ["Fournissez une description de votre PRA."],
      ["Décrivez votre questionnaire de sécurité."],
    ], { kind: "xlsx" });

    expect(imported.result.questionCount).toBe(4);
    expect(imported.questionSources).toEqual([
      expect.objectContaining({ question: "Décrivez vos contrôles d’accès administrateur.", rowIndex: 1, columnIndex: 0 }),
      expect.objectContaining({ question: "Quel est votre processus de contrôle des accès?", rowIndex: 2, columnIndex: 0 }),
      expect.objectContaining({ question: "Fournissez une description de votre PRA.", rowIndex: 3, columnIndex: 0 }),
      expect.objectContaining({ question: "Décrivez votre questionnaire de sécurité.", rowIndex: 4, columnIndex: 0 }),
    ]);
  });

  it("rejects oversized import payloads", () => {
    expect(() => importQuestionnaireText("x".repeat(SECURITY_LIMITS.MAX_QUESTIONNAIRE_CHARS + 1)))
      .toThrow(SecurityValidationError);
  });

  it("rejects overlong import lines", () => {
    expect(() => importQuestionnaireText("x".repeat(SECURITY_LIMITS.MAX_LINE_CHARS + 1)))
      .toThrow(SecurityValidationError);
  });

  it("rejects too many delimited rows", () => {
    const csv = Array.from({ length: 1_001 }, (_, index) => `Q${index};Avez-vous un contrôle de sécurité numéro ${index} ?`)
      .join("\n");

    expect(() => parseDelimitedRows(csv, ";")).toThrow(SecurityValidationError);
  });

  it("rejects too many delimited columns", () => {
    const csv = Array.from({ length: 81 }, (_, index) => `Colonne ${index}`).join(";");

    expect(() => parseDelimitedRows(csv, ";")).toThrow(SecurityValidationError);
  });

  it("rejects imports with too many extracted questions", () => {
    const csv = [
      "Question",
      ...Array.from(
        { length: SECURITY_LIMITS.MAX_QUESTIONS + 1 },
        (_, index) => `Avez-vous un contrôle de sécurité documenté numéro ${index} ?`
      ),
    ].join("\n");

    expect(() => importQuestionnaireCsv(csv)).toThrow(SecurityValidationError);
  });
});
