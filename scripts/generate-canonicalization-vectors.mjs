import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createServer } from "vite";

const checkOnly = process.argv.includes("--check");
const outputPath = resolve("apps/web/public/canonicalization-vectors.json");
const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

let security;
try {
  security = await vite.ssrLoadModule("/packages/core/src/security.ts");
} finally {
  await vite.close();
}

const cases = [
  ["lf", "Question 1\nQuestion 2"],
  ["crlf", "Question 1\r\nQuestion 2"],
  ["cr", "Question 1\rQuestion 2"],
  ["nfkc", "Ｆｒａｎｃｅ ﬁ"],
  ["bidi", "abc\u202Edef\u061Cghi"],
  ["control-characters", "A\u0000B\u000BC\u007FD"],
  ["surrounding-spaces", "  texte français entouré  "],
  ["preserved-invisible-format-characters", "A\u200BB\u200CC\u200DD\u2060E\uFEFFF"],
  ["french-and-non-latin", "Sécurité 中文 العربية हिन्दी"],
];
const versions = [
  security.QUESTIONNAIRE_CANONICALIZATION_V1,
  security.QUESTIONNAIRE_CANONICALIZATION_V2,
];
const vectors = [];

for (const [id, input] of cases) {
  for (const version of versions) {
    const canonical = security.canonicalizeQuestionnaireInput(input, version);
    vectors.push({
      id,
      version,
      inputUtf8Base64: Buffer.from(input, "utf8").toString("base64"),
      canonicalUtf8Base64: Buffer.from(canonical, "utf8").toString("base64"),
      sha256: await security.sha256Hex(canonical),
    });
  }
}

const generated = `${JSON.stringify({
  formatVersion: "blackproof-canonicalization-vectors-v1",
  encoding: "UTF-8",
  hash: "SHA-256",
  vectors,
}, null, 2)}\n`;

if (checkOnly) {
  let current = "";
  try {
    current = await readFile(outputPath, "utf8");
  } catch {
    // The drift error below also covers a missing artifact.
  }
  if (current !== generated) {
    console.error("Canonicalization vectors are stale. Run: pnpm vectors:generate");
    process.exit(1);
  }
  console.log("Canonicalization vectors match the implementation.");
} else {
  await writeFile(outputPath, generated, "utf8");
  console.log(`Generated canonicalization vectors: ${outputPath}`);
}
