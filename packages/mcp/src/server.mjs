import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const limitation = "Local integrity checks only; not certification, factual validation, issuer authentication or current online status. Results can be sensitive: use an end-to-end local client and model.";
const result = (value) => ({ content: [{ type: "text", text: JSON.stringify(value) }], structuredContent: value });

export function createServer(session = null) {
  const server = new McpServer({ name: "blackproof-local", version: "0.1.0" });
  function register(name, description, handler) {
    server.registerTool(name, { description, inputSchema: z.strictObject({}), annotations }, () => result(handler()));
  }
  register("blackproof_methodology", "Explain the public scope and limits of local ProofPack checks. No private input.", () => ({
    uses: ["cyber-review", "internal-audit", "supplier-questionnaire"],
    checks: ["schema", "fingerprint", "links", "invariants", "zip-manifest", "canonical-sidecars"],
    disclosure: "No proof content, identifiers, paths, answers or references are returned. No browser storage access, network, resources or writing tools.",
    limitation,
  }));
  register("blackproof_review_checklist", "Get public preparation checklists for cyber reviews, internal audits and supplier questionnaires. No private input; not a regulatory standard or automated audit.", () => ({
    cyberReview: ["Define systems, owners and review date.", "Review access control, backups, incident handling and expected evidence.", "Distinguish declarations from observed evidence; record reservations and follow-up actions."],
    internalAudit: ["Select the organization's control grid and review scope.", "Record evidence references, observations, reservations and accountable owners locally.", "Have a human assess findings and conclusions before selecting the export."],
    supplierQuestionnaire: ["Read the questionnaire locally and check extracted questions.", "Review every answer and explicitly authorize each shareable reference.", "Check the exact export locally before sending it through a separately approved channel."],
    limitation: "Preparation guidance only. Adapt to your organization; no certification or automatic control assessment.",
  }));
  if (session) {
    register("blackproof_verify_selected", "Read the cached integrity result and aggregate counts for the one proof explicitly selected by the local user at startup. No path or content arguments.", () => ({ ...session.current, limitation }));
    if (session.comparison) {
      register("blackproof_compare_selected", "Read aggregate changes between two locally selected proofs. No questions, answers, references or identifiers are disclosed.", () => ({ ...session.comparison, limitation }));
    }
  }
  return server;
}
