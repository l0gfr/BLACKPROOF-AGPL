import { createHash } from "node:crypto";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import JSZip from "jszip";
import { createServer } from "vite";

const baseUrl = (process.argv[2] ?? "https://blackproof.fr").replace(/\/$/, "");
const isLocalPreview = /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(baseUrl);
const schemaSpecs = [
  {
    path: "/schemas/proofpack/v1.schema.json",
    id: "https://blackproof.fr/schemas/proofpack/v1.schema.json",
    sha256: "c6c1d162abc0aada780df954338989999596461727e770d475d81ba2a3813d26",
  },
  {
    path: "/schemas/proofpack/v2.schema.json",
    id: "https://blackproof.fr/schemas/proofpack/v2.schema.json",
    sha256: "4edb89244670fca5624bda95d93e617bfd34a92c9981bfba5ace1d6f83f4bdb2",
  },
  {
    path: "/schemas/proofpack/v3.schema.json",
    id: "https://blackproof.fr/schemas/proofpack/v3.schema.json",
    sha256: "7bd8cfb8bcfb5cb1cbd5ddf8f9b157aa1c6dc71503916239a76b80b8691b2c6c",
  },
];
const deliverySchemaSpec = {
  path: "/schemas/proofpack-delivery/v5.schema.json",
  id: "https://blackproof.fr/schemas/proofpack-delivery/v5.schema.json",
  sha256: "a4a6b424e0d960c95020cd0b6c43b5bfe4dff8ac43f9147a2720c90d1d123234",
};
const historicalDeliverySchemaSpec = {
  path: "/schemas/proofpack-delivery/v4.schema.json",
  id: "https://blackproof.fr/proofpack-delivery-schema.json",
  sha256: "dd96ff1ba81b8fcd6650beb74ffa6f1579b42f997349378200734bbdbe24f97e",
};
const deliveryProtocolSchemaSpecs = [
  { path: "/schemas/delivery-protocol/change-report-v1.schema.json", id: "https://blackproof.fr/schemas/delivery-protocol/change-report-v1.schema.json", sha256: "036a659f9ba997bec7a015e373a7a3902178f77c7ad2a45a459bcb28d85bed9d" },
  { path: "/schemas/delivery-protocol/signature-v1.schema.json", id: "https://blackproof.fr/schemas/delivery-protocol/signature-v1.schema.json", sha256: "e73ce5c162b6ba95bbe24b957f8ae711d280e99ae3f3e4db4ff69dcd8a250e7a" },
  { path: "/schemas/delivery-protocol/revocation-v1.schema.json", id: "https://blackproof.fr/schemas/delivery-protocol/revocation-v1.schema.json", sha256: "b0882b046381e32a01bbdb6e941e4302b7bbf3f0b17d4032274281d9ca9a744b" },
  { path: "/schemas/delivery-protocol/status-v1.schema.json", id: "https://blackproof.fr/schemas/delivery-protocol/status-v1.schema.json", sha256: "c3ad1ed4f1607dc445c9028a50678262d42e482dd8642639fe51c59629648442" },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchBytes(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
    redirect: "manual",
  });
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { response, bytes };
}

async function fetchJson(path) {
  const { response, bytes } = await fetchBytes(path);
  let json;
  try {
    json = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error(`${path} did not return valid JSON.`);
  }
  return { response, bytes, json };
}

async function loadDeliveryContracts() {
  const vite = await createServer({
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  try {
    const [deliveryModule, deliveryZipModule, deliverySchemaModule] = await Promise.all([
      vite.ssrLoadModule("/packages/core/src/verify-delivery.ts"),
      vite.ssrLoadModule("/packages/core/src/verify-delivery-zip.ts"),
      vite.ssrLoadModule("/packages/core/src/delivery-schema.ts"),
    ]);
    return {
      verifyProofPackDeliveryJson: deliveryModule.verifyProofPackDeliveryJson,
      verifyProofPackDeliveryZipFiles: deliveryZipModule.verifyProofPackDeliveryZipFiles,
      proofPackDeliverySchema: deliverySchemaModule.proofPackDeliverySchema,
      proofPackDeliveryV4Schema: deliverySchemaModule.proofPackDeliveryV4Schema,
    };
  } finally {
    await vite.close();
  }
}

const discovery = await fetchJson("/api/proofpack/schema.json");
assert(discovery.response.status === 200, "Discovery route did not return 200.");
assert(discovery.json?.product === "BLACKPROOF", "Discovery route is not the expected API envelope.");
assert(discovery.json?.schema?.$schema === "https://json-schema.org/draft/2020-12/schema", "Discovery schema is missing root $schema.");
assert(discovery.json?.schema?.$id === undefined, "Discovery schema must not declare an $id for its envelope URL.");
assert(Array.isArray(discovery.json?.schema?.oneOf), "Discovery schema is not an explicit oneOf.");

const schemas = [];
for (const spec of schemaSpecs) {
  const item = await fetchJson(spec.path);
  const contentType = item.response.headers.get("content-type") ?? "";
  const actualSha256 = createHash("sha256").update(item.bytes).digest("hex");

  assert(item.response.status === 200, `${spec.path} did not return 200.`);
  if (!isLocalPreview) {
    assert(contentType.toLowerCase().startsWith("application/schema+json"), `${spec.path} has incorrect Content-Type: ${contentType}`);
  }
  assert(item.json?.$schema === "https://json-schema.org/draft/2020-12/schema", `${spec.path} is missing root $schema.`);
  assert(item.json?.$id === spec.id, `${spec.path} has an incorrect $id.`);
  assert(item.json?.product === undefined, `${spec.path} unexpectedly returned an API envelope.`);
  assert(actualSha256 === spec.sha256, `${spec.path} SHA-256 drift: expected ${spec.sha256}, got ${actualSha256}.`);
  schemas.push(item.json);
}

const expectedRefs = schemaSpecs.map((spec) => spec.id);
assert(
  JSON.stringify(discovery.json.schema.oneOf.map((entry) => entry.$ref)) === JSON.stringify(expectedRefs),
  "Discovery oneOf does not reference exactly V1, V2 and V3."
);

const immutableSchemas = discovery.json?.compatibility?.immutableSchemas;
assert(Array.isArray(immutableSchemas) && immutableSchemas.length === schemaSpecs.length, "Discovery envelope does not publish all immutable schema hashes.");
for (const [index, spec] of schemaSpecs.entries()) {
  assert(immutableSchemas[index]?.url === spec.id, `Discovery immutable URL mismatch for ${spec.path}.`);
  assert(immutableSchemas[index]?.sha256 === spec.sha256, `Discovery immutable hash mismatch for ${spec.path}.`);
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
for (const schema of schemas) ajv.addSchema(schema);
const validateDiscovery = ajv.compile(discovery.json.schema);
const demo = (await fetchJson("/demo/proofpack-demo.json")).json;
assert(validateDiscovery(demo), "Current public demo is not valid against discovery oneOf.");

const {
  verifyProofPackDeliveryJson,
  verifyProofPackDeliveryZipFiles,
  proofPackDeliverySchema,
  proofPackDeliveryV4Schema,
} = await loadDeliveryContracts();
const deliverySchema = await fetchJson(deliverySchemaSpec.path);
assert(deliverySchema.response.status === 200, "Delivery schema route did not return 200.");
if (!isLocalPreview) {
  const contentType = deliverySchema.response.headers.get("content-type") ?? "";
  assert(contentType.toLowerCase().startsWith("application/schema+json"), `Delivery schema has incorrect Content-Type: ${contentType}`);
}
const deliverySchemaSha256 = createHash("sha256").update(deliverySchema.bytes).digest("hex");
assert(deliverySchema.json?.$id === deliverySchemaSpec.id, "Delivery schema has an incorrect versioned $id.");
assert(
  deliverySchemaSha256 === deliverySchemaSpec.sha256,
  `Delivery schema SHA-256 drift: expected ${deliverySchemaSpec.sha256}, got ${deliverySchemaSha256}.`
);
assert(
  JSON.stringify(deliverySchema.json) === JSON.stringify(proofPackDeliverySchema),
  "Public Delivery schema drifted from the verifier contract."
);
const historicalDeliverySchema = await fetchJson(historicalDeliverySchemaSpec.path);
assert(historicalDeliverySchema.response.status === 200, "Versioned historical Delivery V4 schema did not return 200.");
assert(historicalDeliverySchema.json?.$id === historicalDeliverySchemaSpec.id, "Historical Delivery V4 schema has an incorrect $id.");
assert(createHash("sha256").update(historicalDeliverySchema.bytes).digest("hex") === historicalDeliverySchemaSpec.sha256, "Historical Delivery V4 schema hash drifted.");
assert(JSON.stringify(historicalDeliverySchema.json) === JSON.stringify(proofPackDeliveryV4Schema), "Historical Delivery V4 route drifted from its verifier contract.");
const legacyDeliverySchema = await fetchBytes("/proofpack-delivery-schema.json");
assert(legacyDeliverySchema.response.status === 200, "Legacy Delivery V4 schema alias did not return 200.");
assert(
  legacyDeliverySchema.bytes.byteLength === historicalDeliverySchema.bytes.byteLength
  && legacyDeliverySchema.bytes.every((byte, index) => byte === historicalDeliverySchema.bytes[index]),
  "Legacy Delivery V4 schema alias is no longer byte-identical to the frozen V4 contract."
);
for (const spec of deliveryProtocolSchemaSpecs) {
  const protocolSchema = await fetchJson(spec.path);
  assert(protocolSchema.response.status === 200, `${spec.path} did not return 200.`);
  assert(protocolSchema.json?.$id === spec.id, `${spec.path} has an incorrect $id.`);
  assert(createHash("sha256").update(protocolSchema.bytes).digest("hex") === spec.sha256, `${spec.path} hash drifted.`);
  ajv.compile(protocolSchema.json);
}
const validateDeliverySchema = ajv.compile(deliverySchema.json);
const deliveryArtifact = await fetchJson("/demo/proofpack-delivery-demo.json");
assert(deliveryArtifact.response.status === 200, "Public Delivery JSON did not return 200.");
assert(
  (deliveryArtifact.response.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json"),
  "Public Delivery JSON has an incorrect Content-Type."
);
assert(validateDeliverySchema(deliveryArtifact.json), "Public Delivery JSON is invalid against its public schema.");
const deliveryJson = new TextDecoder().decode(deliveryArtifact.bytes);
const deliveryResult = await verifyProofPackDeliveryJson(deliveryJson);
assert(
  deliveryResult.isValid
  && deliveryResult.validSchema
  && deliveryResult.validFingerprint
  && deliveryResult.validLinks
  && deliveryResult.validInvariants,
  `Public Delivery JSON failed local Verify: ${JSON.stringify(deliveryResult.findings)}`
);

const deliveryZipArtifact = await fetchBytes("/demo/proofpack-delivery-demo.zip");
assert(deliveryZipArtifact.response.status === 200, "Public Delivery ZIP did not return 200.");
assert(
  (deliveryZipArtifact.response.headers.get("content-type") ?? "").toLowerCase().startsWith("application/zip"),
  "Public Delivery ZIP has an incorrect Content-Type."
);
const deliveryZip = await JSZip.loadAsync(deliveryZipArtifact.bytes, { checkCRC32: true, createFolders: false });
const deliveryZipFiles = new Map();
for (const entry of Object.values(deliveryZip.files)) {
  assert(!entry.dir, `Public Delivery ZIP contains an unexpected directory: ${entry.name}`);
  const unsafeOriginalName = entry.unsafeOriginalName;
  assert(!unsafeOriginalName || unsafeOriginalName === entry.name, `Public Delivery ZIP contains an unsafe path: ${unsafeOriginalName}`);
  deliveryZipFiles.set(entry.name, await entry.async("uint8array"));
}
const embeddedDeliveryJson = deliveryZipFiles.get("delivery.json");
assert(embeddedDeliveryJson, "Public Delivery ZIP does not contain delivery.json.");
assert(
  embeddedDeliveryJson.byteLength === deliveryArtifact.bytes.byteLength
  && embeddedDeliveryJson.every((byte, index) => byte === deliveryArtifact.bytes[index]),
  "Public standalone Delivery JSON and ZIP delivery.json differ."
);
const deliveryZipResult = await verifyProofPackDeliveryZipFiles(deliveryZipFiles);
assert(
  deliveryZipResult.isValid
  && deliveryZipResult.validManifestSchema
  && deliveryZipResult.validManifestFingerprint
  && deliveryZipResult.validFileList
  && deliveryZipResult.validFileSizes
  && deliveryZipResult.validFileHashes
  && deliveryZipResult.validDeliveryFingerprintLink
  && deliveryZipResult.validManifestMetadataLink
  && deliveryZipResult.deliveryResult?.isValid,
  `Public Delivery ZIP failed local Verify: ${JSON.stringify(deliveryZipResult.findings)}`
);

const formatOnly = structuredClone(demo);
formatOnly.formatVersion = "blackproof-proofpack-v2";
delete formatOnly.schemaVersion;
assert(!validateDiscovery(formatOnly), "Discovery accepted formatVersion V2 without schemaVersion.");

const schemaOnly = structuredClone(demo);
delete schemaOnly.formatVersion;
schemaOnly.schemaVersion = "blackproof-proofpack-schema-v2";
assert(!validateDiscovery(schemaOnly), "Discovery accepted schemaVersion V2 without formatVersion.");

const v2WithoutCanonicalization = structuredClone(demo);
v2WithoutCanonicalization.formatVersion = "blackproof-proofpack-v2";
v2WithoutCanonicalization.schemaVersion = "blackproof-proofpack-schema-v2";
delete v2WithoutCanonicalization.sourceQuestionnaire.canonicalizationVersion;
assert(!validateDiscovery(v2WithoutCanonicalization), "Discovery accepted V2 without canonicalizationVersion.");

assert(schemas[1].required.includes("revisionId") === false, "Published V2 contract drifted unexpectedly.");
assert(schemas[1].required.includes("deliveryHistory") === false, "Published V2 contract drifted unexpectedly.");
assert(schemas[2].required.includes("revisionId"), "V3 does not require revisionId.");
assert(schemas[2].required.includes("deliveryHistory"), "V3 does not require deliveryHistory.");

const unknownResponse = await fetch(`${baseUrl}/schemas/proofpack/unknown.schema.json`, {
  cache: "no-store",
  redirect: "manual",
});
assert(unknownResponse.status === 404, `Unknown schema URL returned ${unknownResponse.status} instead of 404.`);
const unknownDeliveryResponse = await fetch(`${baseUrl}/schemas/proofpack-delivery/v999.schema.json`, {
  cache: "no-store",
  redirect: "manual",
});
assert(
  unknownDeliveryResponse.status === 404,
  `Unknown Delivery schema URL returned ${unknownDeliveryResponse.status} instead of 404.`
);

if (!isLocalPreview) {
  const corsPaths = [
    ...schemaSpecs.map((spec) => spec.path),
    "/canonicalization-vectors.json",
    deliverySchemaSpec.path,
    historicalDeliverySchemaSpec.path,
    ...deliveryProtocolSchemaSpecs.map((spec) => spec.path),
    "/schemas/source-import/v1.schema.json",
    "/questionnaire-import.json",
    "/api/questionnaire-import.json",
    "/api/proofpack/schema.json",
  ];
  for (const path of corsPaths) {
    const response = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
    assert(response.status === 200, `${path} did not return 200 during CORS verification.`);
    assert(response.headers.get("access-control-allow-origin") === "*", `${path} is missing wildcard public CORS.`);
    assert(response.headers.get("cross-origin-resource-policy") === "cross-origin", `${path} is not cross-origin readable.`);
    assert(response.headers.get("access-control-allow-credentials") === null, `${path} must not allow credentials.`);
  }

  const sameOriginResponse = await fetch(`${baseUrl}/api/status.json`, { cache: "no-store" });
  assert(sameOriginResponse.headers.get("access-control-allow-origin") === null, "CORS leaked onto /api/status.json.");
  assert(sameOriginResponse.headers.get("cross-origin-resource-policy") === "same-origin", "/api/status.json lost same-origin CORP.");
}

console.log(`ProofPack public contract passed for ${baseUrl}.`);
for (const spec of schemaSpecs) console.log(`OK   ${spec.path} ${spec.sha256}`);
console.log("OK   discovery exact oneOf and impossible states rejected");
console.log("OK   Delivery JSON schema, fingerprint, links and invariants verified");
console.log(`OK   ${deliverySchemaSpec.path} ${deliverySchemaSpec.sha256}`);
console.log(`OK   ${historicalDeliverySchemaSpec.path} ${historicalDeliverySchemaSpec.sha256}`);
console.log("OK   legacy Delivery V4 schema alias remains byte-identical");
console.log("OK   Delivery ZIP inventory, hashes, manifest and links verified");
console.log("OK   unknown Master and Delivery schema routes 404");
if (!isLocalPreview) console.log("OK   credential-free CORS limited to public format contracts");
