import { lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { extractBuildCsp } from "./shared/csp.mjs";

const templatePath = process.argv[2] ?? "deploy/apache/blackproof.fr.conf.example";
const outputPath = process.argv[3] ?? "artifacts/blackproof.fr.conf";
const distDir = process.argv[4] ?? "apps/web/dist";

const distStat = lstatSync(distDir);
if (distStat.isSymbolicLink() || !distStat.isDirectory()) {
  throw new Error(`CSP source artifact root must be a real non-symlink directory: ${distDir}`);
}
rmSync(join(distDir, "deploy"), { recursive: true, force: true });

const template = readFileSync(templatePath, "utf8");
const csp = extractBuildCsp(distDir);

if (!template.includes("__BLACKPROOF_CSP__")) {
  throw new Error(`${templatePath} is missing __BLACKPROOF_CSP__ placeholder`);
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, template.replace("__BLACKPROOF_CSP__", csp), "utf8");

console.log(`Rendered Apache config: ${outputPath}`);
console.log(`CSP source artifact: ${distDir}`);
