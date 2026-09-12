import assert from "node:assert/strict";
import test from "node:test";
import { validateProductionWorkflowConfig } from "./check-production-workflow-config.mjs";

test("production requires an exact revision without any access credentials", () => {
  assert.deepEqual(validateProductionWorkflowConfig({ PUBLIC_BLACKPROOF_RELEASE_COMMIT: "a".repeat(40) }), {
    commit: "a".repeat(40), accessModel: "open-source",
  });
  for (const value of ["", "main", "a".repeat(39), "g".repeat(40)]) {
    assert.throws(() => validateProductionWorkflowConfig({ PUBLIC_BLACKPROOF_RELEASE_COMMIT: value }), /exact 40-character/);
  }
});

test("unqualified features remain closed in production", () => {
  for (const name of ["PUBLIC_BLACKPROOF_RETURN_PACK_ENABLED", "PUBLIC_BLACKPROOF_KNOWLEDGE_VAULT_ENABLED"]) {
    assert.throws(() => validateProductionWorkflowConfig({
      PUBLIC_BLACKPROOF_RELEASE_COMMIT: "a".repeat(40), [name]: "enabled",
    }), /not qualified/);
  }
});

test("source links reject executable schemes and embedded credentials", () => {
  for (const source of ["javascript:alert(1)", "http://example.org/source", "https://user:pass@example.org/source"]) {
    assert.throws(() => validateProductionWorkflowConfig({
      PUBLIC_BLACKPROOF_RELEASE_COMMIT: "a".repeat(40), PUBLIC_BLACKPROOF_SOURCE_URL: source,
    }), /public HTTPS/);
  }
});
