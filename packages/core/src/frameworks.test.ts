import { describe, expect, it } from "vitest";

import {
  detectCategory,
  getFrameworkMappingSummary,
  getFrameworkRequirementById,
  getFrameworkRequirements,
  getFrameworkRequirementsForCategory,
  getMappedRequirements,
  getRequirementCoverageForCategory,
} from "./index";

const categories = [
  "access-control",
  "backup",
  "incident-response",
  "business-continuity",
  "supplier-security",
  "governance",
  "logging-monitoring",
  "vulnerability-management",
  "data-protection",
  "unknown",
] as const;

describe("BLACKPROOF Framework Mapping", () => {
  it("exposes a versioned framework mapping summary", () => {
    const summary = getFrameworkMappingSummary();

    expect(summary.version).toBe("blackproof-framework-mapping-v0.1.0-alpha");
    expect(summary.frameworkCount).toBeGreaterThanOrEqual(3);
    expect(summary.requirementCount).toBeGreaterThan(10);
  });

  it("keeps requirement ids unique", () => {
    const ids = getFrameworkRequirements().map((requirement) => requirement.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves every requirement id emitted by category mapping", () => {
    for (const category of categories) {
      const coverage = getRequirementCoverageForCategory(category);
      expect(coverage.missingRequirementIds).toEqual([]);
    }
  });

  it("provides at least one NIS2 and one ReCyF-style requirement for mapped categories", () => {
    for (const category of categories.filter((item) => item !== "unknown")) {
      const requirements = getFrameworkRequirementsForCategory(category);
      expect(requirements.some((requirement) => requirement.frameworkId === "nis2-eu")).toBe(true);
      expect(requirements.some((requirement) => requirement.frameworkId === "recyf-fr")).toBe(true);
    }
  });

  it("links detected questionnaire categories to known framework requirements", () => {
    const category = detectCategory("Avez-vous activé le MFA pour les comptes administrateurs ?");
    const requirementIds = getMappedRequirements(category);

    expect(requirementIds.map((id) => getFrameworkRequirementById(id)).every(Boolean)).toBe(true);
  });
});
