import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  classifyChangedPaths,
  classifyReleaseScope,
} from "./classify-release-scope.mjs";

const isolatedGitEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")),
);

function git(cwd, arguments_) {
  return execFileSync("git", arguments_, {
    cwd,
    env: isolatedGitEnvironment,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function commit(cwd, message) {
  git(cwd, ["add", "."]);
  git(cwd, ["commit", "-m", message]);
  return git(cwd, ["rev-parse", "HEAD"]);
}

test("only direct analysis Markdown paths receive the editorial scope", () => {
  assert.equal(classifyChangedPaths([
    "apps/web/src/content/analyses/example.md",
    "apps/web/src/content/analyses/second-example.md",
  ]).scope, "editorial");

  for (const path of [
    "apps/web/src/content/analyses/nested/example.md",
    "apps/web/src/content/analyses/example.mdx",
    "apps/web/src/pages/analyses/index.astro",
    "tests/e2e/editorial.spec.ts",
    ".github/workflows/ci.yml",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      classifyChangedPaths(["apps/web/src/content/analyses/example.md", path]).scope,
      "full",
      path,
    );
  }
  assert.equal(classifyChangedPaths([]).scope, "full");
});

test("Git classification accepts an editorial commit and fails closed on code or invalid ranges", () => {
  const repository = mkdtempSync(join(tmpdir(), "blackproof-release-scope-"));

  try {
    git(repository, ["init", "-b", "main"]);
    git(repository, ["config", "user.name", "BLACKPROOF test"]);
    git(repository, ["config", "user.email", "test@invalid.example"]);
    mkdirSync(join(repository, "apps/web/src/content/analyses"), { recursive: true });
    writeFileSync(join(repository, "README.md"), "base\n");
    const base = commit(repository, "base");

    writeFileSync(
      join(repository, "apps/web/src/content/analyses/example.md"),
      "---\ndraft: false\n---\n",
    );
    const editorialHead = commit(repository, "article");
    assert.equal(classifyReleaseScope(base, editorialHead, { cwd: repository }).scope, "editorial");

    writeFileSync(join(repository, "package.json"), "{}\n");
    const codeHead = commit(repository, "code");
    assert.equal(classifyReleaseScope(editorialHead, codeHead, { cwd: repository }).scope, "full");
    assert.equal(classifyReleaseScope(base, codeHead, { cwd: repository }).scope, "full");

    assert.throws(
      () => classifyReleaseScope(editorialHead, base, { cwd: repository }),
      /ancestor/,
    );
    assert.throws(
      () => classifyReleaseScope("main", codeHead, { cwd: repository }),
      /full lowercase Git commit SHA/,
    );
    assert.equal(classifyReleaseScope(codeHead, codeHead, { cwd: repository }).scope, "full");
  } finally {
    rmSync(repository, { recursive: true, force: true });
  }
});
