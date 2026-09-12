import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import JSZip from "jszip";
import { compareDeliveries, loadDeliveryFile, loadProtocolJsonFile, sha256Hex, stableStringify, verifyChangeReport, verifyDelivery, verifyDeliveryZip, verifyDetachedSignature, verifyRevocation } from "../src/index.js";

const fixtureUrl = new URL("../../core/src/fixtures/proofpack-delivery-v4-historical.json", import.meta.url);

function currentDelivery(historical) {
  const base = {
    ...structuredClone(historical),
    formatVersion: "blackproof-proofpack-delivery-v5",
    schemaVersion: "blackproof-proofpack-delivery-schema-v5",
    schemaUrl: "https://blackproof.fr/schemas/proofpack-delivery/v5.schema.json",
  };
  delete base.fingerprint;
  return { ...base, fingerprint: `bp_sha256_${sha256Hex(stableStringify(base))}` };
}

function sanitizedExportText(input) {
  return String(input ?? "")
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .trim();
}

function escapedMarkdown(input) {
  return sanitizedExportText(input)
    .replace(/\\/g, "\\\\")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/([`*_{}\[\]()#+\-.!|])/g, "\\$1");
}

function escapedCsv(input) {
  let value = sanitizedExportText(input);
  if (/^[=+\-@\t\r\n]/.test(value) || /^\s*[=+\-@]/.test(value)) value = `'${value}`;
  return `"${value.replace(/"/g, '""')}"`;
}

function canonicalDeliveryFiles(delivery) {
  const responseLines = [
    "# Réponse cyber fournisseur",
    "",
    `Dossier : ${escapedMarkdown(delivery.case.title)}`,
    `Référentiel : ${escapedMarkdown(delivery.case.framework)}`,
    `Empreinte Delivery : ${escapedMarkdown(delivery.fingerprint)}`,
    "",
  ];
  delivery.questions.forEach((question, index) => {
    responseLines.push(`## Question ${index + 1}`, "", escapedMarkdown(question.text), "", "### Réponse", "", escapedMarkdown(question.answer), "");
    if (question.reservation) responseLines.push("### Réserve", "", escapedMarkdown(question.reservation), "");
    if (question.evidence.length > 0) {
      responseLines.push("### Éléments probants déclarés", "");
      for (const evidence of question.evidence) responseLines.push(`- ${escapedMarkdown(evidence.publicReference)}`);
      responseLines.push("");
    }
  });
  const csvRows = [
    ["question_id", "evidence_id", "title", "category", "disclosure", "public_reference"],
    ...delivery.questions.flatMap((question) => question.evidence.map((item) => [
      question.id, item.id, item.title, item.category, item.disclosure, item.publicReference,
    ])),
  ];
  const readme = [
    "# ProofPack Delivery BLACKPROOF",
    "",
    "Ce dossier est destiné à un tiers et a été construit par sélection explicite.",
    "Il ne contient ni brouillons, ni suggestions automatiques, ni réponses marquées ne pas exporter, ni plan de remédiation, ni note interne.",
    "Les preuves éventuellement listées le sont uniquement comme références minimales autorisées.",
    "",
    `Dossier : ${escapedMarkdown(delivery.case.title)}`,
    `Empreinte Delivery : \`${delivery.fingerprint}\``,
    `Identifiant Delivery : \`${delivery.deliveryId}\``,
    `Version de méthode : \`${delivery.methodVersion}\``,
    `Version de schéma : \`${delivery.schemaVersion}\``,
    `Schéma public : ${delivery.schemaUrl}`,
    "La vérification locale couvre le schéma, l’empreinte, les liens et les invariants. Elle n’authentifie pas l’émetteur, la véracité des déclarations, la validité juridique ni un horodatage de confiance.",
    "",
  ].join("\n");
  return [
    { filename: "delivery.json", contentType: "application/json", purpose: "Dossier de transmission externe minimal et lisible par machine.", content: JSON.stringify(delivery, null, 2) },
    { filename: "reponse-fournisseur.md", contentType: "text/markdown", purpose: "Réponses et réserves explicitement autorisées pour le tiers.", content: responseLines.join("\n") },
    { filename: "references-preuves.csv", contentType: "text/csv", purpose: "Références minimales de preuves explicitement autorisées.", content: csvRows.map((row) => row.map(escapedCsv).join(";")).join("\n") },
    { filename: "README.md", contentType: "text/markdown", purpose: "Portée et limites du dossier de transmission.", content: readme },
  ];
}

async function deliveryZip(delivery, overrides = new Map()) {
  const canonicalFiles = canonicalDeliveryFiles(delivery);
  const files = new Map(canonicalFiles.map((file) => [file.filename, overrides.get(file.filename) ?? file.content]));
  const manifestBase = {
    product: "BLACKPROOF",
    manifestVersion: "blackproof-proofpack-delivery-zip-v1",
    caseId: delivery.case.id,
    generatedAt: delivery.generatedAt,
    deliveryFingerprint: delivery.fingerprint,
    files: canonicalFiles.map(({ filename, contentType, purpose }) => {
      const content = files.get(filename);
      return { filename, contentType, purpose, size: Buffer.byteLength(content), sha256: sha256Hex(content) };
    }),
  };
  const manifest = { ...manifestBase, manifestFingerprint: `bp_sha256_${sha256Hex(stableStringify(manifestBase))}` };
  const zip = new JSZip();
  for (const [name, content] of files) zip.file(name, content, { createFolders: false });
  zip.file("manifest.json", JSON.stringify(manifest, null, 2), { createFolders: false });
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

function rewriteDeclaredExpandedSize(input, filename, declaredSize) {
  const output = Buffer.from(input);
  const view = new DataView(output.buffer, output.byteOffset, output.byteLength);
  let updates = 0;
  for (let offset = 0; offset + 30 <= output.byteLength; offset += 1) {
    const signature = view.getUint32(offset, true);
    if (signature === 0x04034b50) {
      const nameLength = view.getUint16(offset + 26, true);
      if (output.subarray(offset + 30, offset + 30 + nameLength).toString("utf8") === filename) {
        view.setUint32(offset + 22, declaredSize, true);
        updates += 1;
      }
    } else if (signature === 0x02014b50 && offset + 46 <= output.byteLength) {
      const nameLength = view.getUint16(offset + 28, true);
      if (output.subarray(offset + 46, offset + 46 + nameLength).toString("utf8") === filename) {
        view.setUint32(offset + 24, declaredSize, true);
        updates += 1;
      }
    }
  }
  assert.equal(updates, 2);
  return output;
}

test("standalone verifier validates a public historical Delivery and detects mutation", async () => {
  const delivery = JSON.parse(await readFile(fixtureUrl, "utf8"));
  assert.equal(verifyDelivery(delivery).isValid, true);
  assert.equal(verifyDelivery({ ...delivery, generatedAt: "2026-07-13" }).isValid, false);
});

test("filesystem inputs are bounded regular files", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "blackproof-verifier-input-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const delivery = currentDelivery(JSON.parse(await readFile(fixtureUrl, "utf8")));
  const deliveryPath = join(directory, "delivery.json");
  const protocolPath = join(directory, "protocol.json");
  const oversizedPath = join(directory, "oversized.json");
  const symlinkPath = join(directory, "delivery-link.json");
  await writeFile(deliveryPath, JSON.stringify(delivery));
  await writeFile(protocolPath, JSON.stringify({ ok: true }));
  await writeFile(oversizedPath, "x".repeat(131_073));
  await symlink(deliveryPath, symlinkPath);

  assert.equal((await loadDeliveryFile(deliveryPath)).fingerprint, delivery.fingerprint);
  assert.deepEqual(await loadProtocolJsonFile(protocolPath), { ok: true });
  await assert.rejects(loadProtocolJsonFile(oversizedPath), /PROTOCOL_ARTIFACT_TOO_LARGE/);
  await assert.rejects(loadDeliveryFile(symlinkPath), /DELIVERY_INPUT_NOT_REGULAR_FILE/);
});

test("standalone verifier uses the canonical generated v4/v5 validators", async () => {
  const historical = JSON.parse(await readFile(fixtureUrl, "utf8"));
  const current = currentDelivery(historical);
  assert.equal(verifyDelivery(current).isValid, true);
  for (const mutate of [
    (value) => { value.generatedAt = "2026-07-13"; },
    (value) => { value.unexpected = true; },
    (value) => { value.verificationProfile.verifies.pop(); },
  ]) {
    const candidate = structuredClone(current);
    mutate(candidate);
    const { fingerprint: _old, ...base } = candidate;
    candidate.fingerprint = `bp_sha256_${sha256Hex(stableStringify(base))}`;
    assert.equal(verifyDelivery(candidate).validSchema, false);
  }
  const duplicate = structuredClone(current);
  duplicate.questions.push(structuredClone(duplicate.questions[0]));
  const { fingerprint: _old, ...base } = duplicate;
  duplicate.fingerprint = `bp_sha256_${sha256Hex(stableStringify(base))}`;
  assert.equal(verifyDelivery(duplicate).validSchema, true);
  assert.equal(verifyDelivery(duplicate).validLinks, false);
  assert.equal(verifyDelivery(duplicate).isValid, false);
});

test("standalone ZIP verifier preflights bounded fixed inventory before extraction", async () => {
  const delivery = currentDelivery(JSON.parse(await readFile(fixtureUrl, "utf8")));
  const valid = await deliveryZip(delivery);
  assert.equal((await verifyDeliveryZip(valid)).isValid, true);

  const duplicateName = Buffer.from(valid);
  let offset = 0;
  while ((offset = duplicateName.indexOf("manifest.json", offset, "utf8")) >= 0) {
    duplicateName.write("delivery.json", offset, "utf8");
    offset += "delivery.json".length;
  }
  await assert.rejects(verifyDeliveryZip(duplicateName), { code: "DELIVERY_ZIP_UNSAFE" });

  const unsafeSize = Buffer.from(valid);
  const view = new DataView(unsafeSize.buffer, unsafeSize.byteOffset, unsafeSize.byteLength);
  for (let cursor = 0; cursor + 30 <= unsafeSize.byteLength; cursor += 1) {
    const signature = view.getUint32(cursor, true);
    if (signature === 0x04034b50) view.setUint32(cursor + 22, 5_000_001, true);
    if (signature === 0x02014b50) view.setUint32(cursor + 24, 5_000_001, true);
  }
  await assert.rejects(verifyDeliveryZip(unsafeSize), { code: "DELIVERY_ZIP_UNSAFE" });
});

test("standalone ZIP verifier rejects runtime expansion inconsistent with validated metadata", async () => {
  const delivery = currentDelivery(JSON.parse(await readFile(fixtureUrl, "utf8")));
  const valid = await deliveryZip(delivery);
  const deliveryBytes = Buffer.byteLength(JSON.stringify(delivery, null, 2));
  const inconsistent = rewriteDeclaredExpandedSize(valid, "delivery.json", deliveryBytes - 1);

  await assert.rejects(verifyDeliveryZip(inconsistent), { code: "DELIVERY_ZIP_UNSAFE" });
});

test("standalone ZIP verifier rejects recomputed manifests for non-canonical sidecars", async () => {
  const delivery = currentDelivery(JSON.parse(await readFile(fixtureUrl, "utf8")));
  for (const filename of ["README.md", "reponse-fournisseur.md", "references-preuves.csv"]) {
    const zip = await deliveryZip(delivery, new Map([[filename, `Contenu non canonique pour ${filename}.`]]));
    const result = await verifyDeliveryZip(zip);
    assert.equal(result.validManifest, true, filename);
    assert.equal(result.validCanonicalSidecars, false, filename);
    assert.equal(result.isValid, false, filename);
  }
});

test("standalone verifier exposes no network lookup", async () => {
  const verifier = await import("../src/index.js");
  assert.equal(Object.hasOwn(verifier, "fetchPublicDeliveryStatus"), false);
});

test("standalone comparison emits a verifiable report", async () => {
  const previous = JSON.parse(await readFile(fixtureUrl, "utf8"));
  const current = structuredClone(previous);
  current.questions[0].answer = `${current.questions[0].answer} Mise à jour.`;
  const { fingerprint: _, ...base } = current;
  const { createHash } = await import("node:crypto");
  current.fingerprint = `bp_sha256_${createHash("sha256").update(stableStringify(base)).digest("hex")}`;
  const report = compareDeliveries(previous, current, "2026-07-13T12:00:00.000Z");
  assert.equal(report.summary.changed, 1);
  assert.equal(verifyChangeReport(report), true);

  const { fingerprint: _reportFingerprint, ...malformedReportBase } = {
    ...report,
    summary: { ...report.summary, changed: report.summary.changed + 1 },
  };
  const malformedReport = {
    ...malformedReportBase,
    fingerprint: `bp_sha256_${sha256Hex(stableStringify(malformedReportBase))}`,
  };
  assert.equal(verifyChangeReport(malformedReport), false);
  const impossibleDateBase = { ...report, generatedAt: "2026-02-31T12:00:00.000Z" };
  const { fingerprint: _impossibleFingerprint, ...impossibleDateWithoutFingerprint } = impossibleDateBase;
  assert.equal(verifyChangeReport({
    ...impossibleDateWithoutFingerprint,
    fingerprint: `bp_sha256_${sha256Hex(stableStringify(impossibleDateWithoutFingerprint))}`,
  }), false);

  const revocationBase = {
    product: "BLACKPROOF",
    formatVersion: "blackproof-delivery-revocation-v1",
    deliveryId: current.deliveryId,
    deliveryFingerprint: current.fingerprint,
    status: "revoked",
    revokedAt: "2026-07-13T12:00:00.000Z",
    unexpected: true,
  };
  const revocation = { ...revocationBase, fingerprint: `bp_sha256_${sha256Hex(stableStringify(revocationBase))}` };
  assert.equal(verifyRevocation(revocation, current), false);

  assert.equal(verifyDetachedSignature({
    product: "BLACKPROOF",
    formatVersion: "blackproof-delivery-signature-v1",
    subjectType: "delivery",
    subjectFingerprint: current.fingerprint,
    algorithm: "ECDSA-P256-SHA256",
    publicKeyJwk: { kty: "EC", crv: "P-256", x: "a".repeat(43), y: "b".repeat(43) },
    signedAt: "2026-07-13T12:00:00.000Z",
    signature: "c".repeat(86),
  }, current.fingerprint), false);
});

test("all published bilateral protocol schemas compile", async () => {
  const ajv = new Ajv2020({ strict: true });
  addFormats(ajv);
  for (const name of ["change-report-v1", "signature-v1", "revocation-v1", "status-v1"]) {
    const schema = JSON.parse(await readFile(new URL(`../schemas/${name}.schema.json`, import.meta.url), "utf8"));
    assert.doesNotThrow(() => ajv.compile(schema), name);
  }
});

test("published signature schema applies the issuer display-safety contract", async () => {
  const ajv = new Ajv2020({ strict: true });
  addFormats(ajv);
  const schema = JSON.parse(await readFile(new URL("../schemas/signature-v1.schema.json", import.meta.url), "utf8"));
  const validate = ajv.compile(schema);
  const signature = {
    product: "BLACKPROOF",
    formatVersion: "blackproof-delivery-signature-v1",
    subjectType: "delivery",
    subjectFingerprint: `bp_sha256_${"a".repeat(64)}`,
    algorithm: "ECDSA-P256-SHA256",
    issuer: "ACME France",
    publicKeyJwk: { kty: "EC", crv: "P-256", x: "a".repeat(43), y: "b".repeat(43) },
    signedAt: "2026-07-13T12:00:00.000Z",
    signature: "c".repeat(86),
  };
  assert.equal(validate(signature), true);
  for (const issuer of [
    ["ACME", String.fromCharCode(10), "France"].join(""),
    ["ACME", String.fromCodePoint(0x2028), "France"].join(""),
    ["ACME", String.fromCodePoint(0x202e), "France"].join(""),
  ]) assert.equal(validate({ ...signature, issuer }), false);
});
