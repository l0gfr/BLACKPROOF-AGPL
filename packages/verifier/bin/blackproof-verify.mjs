#!/usr/bin/env node
import {
  compareDeliveries,
  loadDeliveryFile,
  loadProtocolJsonFile,
  readDeliveryInputFile,
  verifyDelivery,
  verifyDeliveryZip,
  verifyDetachedSignature,
  verifyRevocation,
} from "../src/index.js";

function usage() {
  console.error("Usage: blackproof-verify verify <delivery.json|zip> | compare <previous> <current> [--json] | verify-signature <delivery> <signature.json> | verify-revocation <delivery> <revocation.json>");
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command) { usage(); return 2; }
  if (command === "verify") {
    const [first, ...options] = args;
    if (!first || options.length > 0) { usage(); return 2; }
    const { bytes, zipByName } = await readDeliveryInputFile(first);
    const result = zipByName ? await verifyDeliveryZip(bytes) : verifyDelivery(bytes.toString("utf8"));
    console.log(result.isValid ? `VALID ${result.delivery?.fingerprint ?? result.deliveryResult?.providedFingerprint}` : `INVALID ${result.findings?.[0]?.code ?? result.deliveryResult?.findings?.[0]?.code ?? "DELIVERY_INVALID"}`);
    return result.isValid ? 0 : 1;
  }
  const [first, second, ...options] = args;
  if (!first || !second) { usage(); return 2; }
  const delivery = await loadDeliveryFile(first);
  if (command === "compare") {
    if (options.length > 1 || (options.length === 1 && options[0] !== "--json")) { usage(); return 2; }
    const current = await loadDeliveryFile(second);
    const report = compareDeliveries(delivery, current);
    console.log(options.includes("--json") ? JSON.stringify(report, null, 2) : `CHANGES added=${report.summary.added} removed=${report.summary.removed} changed=${report.summary.changed} unchanged=${report.summary.unchanged}\nREPORT ${report.fingerprint}`);
    return 0;
  }
  if (options.length > 0) { usage(); return 2; }
  const artifact = await loadProtocolJsonFile(second);
  if (command === "verify-signature") {
    const valid = verifyDetachedSignature(artifact, delivery.fingerprint);
    console.log(valid ? `VALID_SIGNATURE ${artifact.issuer}` : "INVALID_SIGNATURE");
    return valid ? 0 : 1;
  }
  if (command === "verify-revocation") {
    const valid = verifyRevocation(artifact, delivery);
    console.log(valid ? `UNAUTHENTICATED_REVOCATION_STATEMENT ${artifact.revokedAt}` : "INVALID_REVOCATION");
    return valid ? 0 : 1;
  }
  usage();
  return 2;
}

try { process.exitCode = await main(); }
catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 2; }
