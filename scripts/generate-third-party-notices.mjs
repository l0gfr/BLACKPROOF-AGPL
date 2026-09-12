import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const workspaceRoot = resolve(".");
const roots = ["apps/web/package.json", "packages/core/package.json"].map((path) => resolve(path));
const packages = new Map();

function resolvePackageJson(name, parentPackageJson) {
  const require = createRequire(parentPackageJson);
  try {
    return require.resolve(`${name}/package.json`);
  } catch {
    for (const nodeModulesPath of require.resolve.paths(name) ?? []) {
      const candidate = join(nodeModulesPath, name, "package.json");
      if (existsSync(candidate)) return realpathSync(candidate);
    }
    let current = dirname(require.resolve(name));
    while (current !== dirname(current)) {
      const candidate = join(current, "package.json");
      if (existsSync(candidate)) return candidate;
      current = dirname(current);
    }
    throw new Error(`Unable to resolve package metadata for ${name}.`);
  }
}

function visitPackage(packageJsonPath, include = true) {
  const metadata = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const key = `${metadata.name}@${metadata.version}`;
  if (packages.has(key)) return;
  if (include && !metadata.private && !String(metadata.name).startsWith("@blackproof/")) {
    packages.set(key, { metadata, packageJsonPath });
  } else {
    packages.set(key, null);
  }
  for (const dependency of Object.keys(metadata.dependencies ?? {})) {
    visitPackage(resolvePackageJson(dependency, packageJsonPath));
  }
}

for (const root of roots) visitPackage(root, false);

const groups = new Map();
const withoutText = [];
for (const [key, entry] of [...packages.entries()].sort(([left], [right]) => left.localeCompare(right))) {
  if (!entry) continue;
  const directory = dirname(entry.packageJsonPath);
  const licenseFiles = readdirSync(directory)
    .filter((name) => /^(?:licen[cs]e|copying|notice)(?:\.|$)/i.test(name))
    .sort();
  const text = licenseFiles.map((name) => {
    const normalized = readFileSync(join(directory, name), "utf8")
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t]+$/gm, "")
      .trim();
    return `--- ${name} ---\n${normalized}`;
  }).join("\n\n");
  const descriptor = {
    key,
    license: entry.metadata.license ?? "not declared",
    author: typeof entry.metadata.author === "string" ? entry.metadata.author : entry.metadata.author?.name ?? "not declared",
    homepage: entry.metadata.homepage ?? entry.metadata.repository?.url ?? "not declared",
  };
  if (!text) {
    withoutText.push(descriptor);
    continue;
  }
  const digest = createHash("sha256").update(text).digest("hex");
  const group = groups.get(digest) ?? { text, packages: [] };
  group.packages.push(descriptor);
  groups.set(digest, group);
}

const lines = [
  "# Third-party notices",
  "",
  "Generated from the installed production dependency graph. Regenerate after every dependency change with `pnpm notices:generate`.",
  "BLACKPROOF itself is not licensed under the notices below.",
  "",
];
for (const group of groups.values()) {
  lines.push("## Packages", "");
  for (const item of group.packages) lines.push(`- ${item.key} — ${item.license} — ${item.author} — ${item.homepage}`);
  lines.push("", "```text", group.text.replace(/```/g, "` ` `"), "```", "");
}
if (withoutText.length) {
  lines.push("## Packages without an installed notice file", "");
  for (const item of withoutText) lines.push(`- ${item.key} — declared license: ${item.license} — ${item.homepage}`);
  lines.push("");
}

const output = join(workspaceRoot, "THIRD_PARTY_NOTICES.md");
writeFileSync(output, `${lines.join("\n").replace(/\n+$/, "")}\n`, "utf8");
console.log(`Wrote ${output} for ${[...packages.values()].filter(Boolean).length} production packages.`);
