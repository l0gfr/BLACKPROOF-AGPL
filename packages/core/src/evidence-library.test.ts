import { describe, expect, it } from "vitest";

import {
  detectCategory,
  getEvidenceLibraryItems,
  getEvidenceLibrarySummary,
} from "./index";

describe("BLACKPROOF Evidence Library", () => {
  it("exposes a non-empty evidence library", () => {
    const items = getEvidenceLibraryItems();

    expect(items.length).toBeGreaterThan(10);
    expect(items.every((item) => item.id && item.title && item.category)).toBe(true);
  });

  it("keeps evidence template ids unique", () => {
    const ids = getEvidenceLibraryItems().map((item) => item.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("exposes a versioned summary", () => {
    const summary = getEvidenceLibrarySummary();

    expect(summary.version).toBe("blackproof-evidence-library-v0.1.0-alpha");
    expect(summary.itemCount).toBeGreaterThan(10);
    expect(summary.categoryCount).toBeGreaterThan(5);
  });

  it("maps common supplier questionnaire terms to the right categories", () => {
    expect(detectCategory("Avez-vous activé le MFA pour les comptes administrateurs ?")).toBe("access-control");
    expect(detectCategory("Disposez-vous d'une procédure de sauvegarde documentée ?")).toBe("backup");
    expect(detectCategory("Avez-vous une procédure de réponse à incident ?")).toBe("incident-response");
    expect(detectCategory("Disposez-vous d'un registre des fournisseurs critiques ?")).toBe("supplier-security");
    expect(detectCategory("Réalisez-vous des scans de vulnérabilités ou un suivi des correctifs ?")).toBe("vulnerability-management");
    expect(detectCategory("Collectez-vous et conservez-vous les journaux de sécurité ?")).toBe("logging-monitoring");
  });
});
