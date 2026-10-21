import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, posix, win32 } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";

const rootRequire = createRequire(new URL("../package.json", import.meta.url));
const webRequire = createRequire(new URL("../apps/web/package.json", import.meta.url));
const vitePackage = rootRequire.resolve("vite/package.json");
const bundledSource = readFileSync(join(dirname(vitePackage), "dist/node/chunks/node.js"), "utf8");

// Evaluate only controlled bundled leaf modules. No filesystem, editor
// detection, child process, network or actual Windows command is available.
function leaf(file, platform = "linux", wsl = false) {
  const region = bundledSource.split("//#region ").find(part => part.split("\n", 1)[0].endsWith(`/node_modules/launch-editor/${file}`));
  assert.ok(region, `Missing bundled launch-editor leaf: ${file}`);
  const code = region.slice(region.indexOf("\n") + 1).split("//#endregion", 1)[0];
  const name = code.match(/^var (require_[\w$]+) =/m)?.[1];
  assert.ok(name);
  const paths = platform === "win32" ? win32 : posix;
  const cwd = platform === "win32" ? "C:\\workspace\\app" : "/mnt/c/project";
  const path = { ...paths, resolve: (...parts) => paths.resolve(cwd, ...parts), relative: (from, to) => paths.relative(from || cwd, to) };
  return runInNewContext(`${code}\n${name}()`, {
    __commonJSMin: factory => {
      let module;
      return () => {
        if (!module) { module = { exports: {} }; factory(module.exports, module); }
        return module.exports;
      };
    },
    __require: name => {
      if (name === "path") return path;
      if (name === "os") return { release: () => wsl ? "Microsoft WSL synthetic" : "synthetic" };
      if (name === "url") return { fileURLToPath };
      throw new Error(`Unexpected bundled dependency: ${name}`);
    },
    process: { platform, env: {} },
  }, { timeout: 1000 });
}

test("root, Astro, Svelte integration and Vitest use the patched Vite consumer", () => {
  for (const require of [
    rootRequire,
    createRequire(webRequire.resolve("astro/package.json")),
    createRequire(webRequire.resolve("@astrojs/svelte")),
    createRequire(rootRequire.resolve("vitest/package.json")),
  ]) {
    const resolved = require.resolve("vite/package.json");
    assert.equal(resolved, vitePackage);
    assert.equal(JSON.parse(readFileSync(resolved, "utf8")).version, "8.2.4");
  }
});

test("bundled editor parsing resolves Windows paths after position removal (GHSA-587h-7wmj-h5pm)", () => {
  const parse = leaf("parse-file.js", "win32");
  const parsed = parse("..\\..\\proofs\\report.txt:12:3");
  assert.equal(parsed.fileName, "C:\\proofs\\report.txt");
  assert.equal(parsed.lineNumber, "12");
  assert.equal(parsed.columnNumber, "3");
  assert.equal(parse(":12").fileName, "");
  assert.equal(leaf("parse-file.js")("file:///synthetic/report.txt:7").fileName, "/synthetic/report.txt");
});

test("bundled editor arguments cannot reinterpret WSL filenames as flags (GHSA-r825-w8mm-5pxw)", () => {
  const args = leaf("get-args.js", "linux", true);
  for (const name of ["+review.txt", "-review.txt"]) {
    const path = `/mnt/c/project/${name}`;
    assert.deepEqual(Array.from(args("vim", path)), [`./${name}`]);
    assert.deepEqual(Array.from(args("vim", path, "12", "3")), ["+call cursor(12, 3)", `./${name}`]);
  }
  assert.deepEqual(Array.from(args("code", "/mnt/c/project/report notes.txt", "12", "3")), ["-r", "-g", "./report notes.txt:12:3"]);
});

test("bundled Windows command construction rejects percent expansion and line breaks (GHSA-698v-4r3x-3vcv)", () => {
  const command = leaf("construct-windows-launch-command.js", "win32");
  for (const name of ["100%.txt", "%SYNTHETIC%.txt", "line\nbreak.txt", "line\rbreak.txt"]) {
    assert.throws(() => command("code", [`C:\\proofs\\${name}`]));
  }
  assert.equal(command("code", ["-g", "C:\\proofs\\report notes.txt:12:3"]), 'code -g "C:\\proofs\\report notes.txt:12:3"');
});
