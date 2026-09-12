import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const commitPattern = /^[a-f0-9]{40}$/;
const editorialPathPattern = /^apps\/web\/src\/content\/analyses\/[^/]+\.md$/;
const isolatedGitEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")),
);

function runGit(arguments_, cwd) {
  return execFileSync("git", arguments_, {
    cwd,
    env: isolatedGitEnvironment,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function requireCommit(commit, label, cwd) {
  if (!commitPattern.test(commit)) {
    throw new Error(`${label} must be a full lowercase Git commit SHA.`);
  }
  const resolved = runGit(["rev-parse", "--verify", `${commit}^{commit}`], cwd);
  if (resolved !== commit) {
    throw new Error(`${label} does not resolve to the exact requested commit.`);
  }
}

export function classifyChangedPaths(paths) {
  if (!Array.isArray(paths) || paths.length === 0) {
    return {
      scope: "full",
      reason: "no-reviewable-diff",
      paths: [],
    };
  }

  const normalizedPaths = paths.map((path) => String(path).replaceAll("\\", "/"));
  const editorial = normalizedPaths.every((path) => editorialPathPattern.test(path));

  return {
    scope: editorial ? "editorial" : "full",
    reason: editorial ? "analyses-markdown-only" : "non-editorial-path",
    paths: normalizedPaths,
  };
}

export function classifyReleaseScope(base, head, { cwd = process.cwd() } = {}) {
  requireCommit(base, "base", cwd);
  requireCommit(head, "head", cwd);

  try {
    execFileSync("git", ["merge-base", "--is-ancestor", base, head], {
      cwd,
      env: isolatedGitEnvironment,
      stdio: "ignore",
    });
  } catch {
    throw new Error("base must be an ancestor of head.");
  }

  const changed = execFileSync(
    "git",
    ["diff", "--name-only", "--diff-filter=ACDMRTUXB", "-z", base, head],
    {
      cwd,
      env: isolatedGitEnvironment,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const paths = changed.split("\0").filter(Boolean);
  return classifyChangedPaths(paths);
}

function parseArguments(argv) {
  const [base, head, ...options] = argv;
  let githubOutput;

  for (let index = 0; index < options.length; index += 1) {
    if (options[index] === "--github-output") {
      githubOutput = options[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${options[index]}`);
  }

  if (!base || !head) {
    throw new Error("Usage: classify-release-scope.mjs <base-sha> <head-sha> [--github-output <path>]");
  }
  return { base, head, githubOutput };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const { base, head, githubOutput } = parseArguments(process.argv.slice(2));
    const result = classifyReleaseScope(base, head);
    if (githubOutput) {
      appendFileSync(
        githubOutput,
        `scope=${result.scope}\nreason=${result.reason}\nchanged_count=${result.paths.length}\n`,
        "utf8",
      );
    }
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(`RELEASE SCOPE FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
