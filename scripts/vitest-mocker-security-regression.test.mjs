import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, win32 } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { resolveConfig } from "vite";

const rootRequire = createRequire(new URL("../package.json", import.meta.url));
const vitestRequire = createRequire(rootRequire.resolve("vitest/package.json"));
const mockerPath = vitestRequire.resolve("@vitest/mocker/node");
const { interceptorPlugin, createManualModuleSource } = await import(pathToFileURL(mockerPath).href);
const ts = rootRequire("typescript");

async function fixture(run) {
  const directory = mkdtempSync(join(tmpdir(), "blackproof-mocker-regression-"));
  const root = join(directory, "root");
  mkdirSync(join(root, "folder"), { recursive: true });
  writeFileSync(join(directory, "outside.txt"), "SYNTHETIC OUTSIDE ROOT");
  writeFileSync(join(root, "allowed.txt"), "ordinary local mock");
  writeFileSync(join(root, "folder", "allowed.txt"), "nested local mock");
  writeFileSync(join(root, "folder", ".env"), "SYNTHETIC DENIED FILE");
  writeFileSync(join(root, "..%5coutside.txt"), "literal encoded filename");
  try {
    const config = await resolveConfig({
      configFile: false,
      root: realpathSync(root),
      server: { fs: { allow: [realpathSync(root)] } },
    }, "serve");
    await run(config);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

// Exercise the installed plugin, registry and real Vite allowlist. Only the
// WebSocket delivery mechanism is replaced; no listener or network is opened.
function harness(config, options = {}) {
  const handlers = new Map();
  const replies = [];
  const plugin = interceptorPlugin(options);
  plugin.configureServer({ config, ws: {
    on: (name, callback) => handlers.set(name, callback),
    send: (...reply) => replies.push(reply),
  } });
  return { handlers, replies, load: id => plugin.load.handler(id) };
}

test("actual Vitest consumers resolve the complete patched 4.1.12 family", () => {
  for (const require of [rootRequire,
    createRequire(new URL("../apps/web/package.json", import.meta.url)),
    createRequire(new URL("../packages/core/package.json", import.meta.url)),
  ]) {
    const packagePath = require.resolve("vitest/package.json");
    assert.equal(JSON.parse(readFileSync(packagePath, "utf8")).version, "4.1.12");
    assert.equal(createRequire(packagePath).resolve("@vitest/mocker/node"), mockerPath);
  }
  const packagePath = vitestRequire.resolve("@vitest/mocker/package.json");
  assert.equal(JSON.parse(readFileSync(packagePath, "utf8")).version, "4.1.12");
});

test("redirect registration rejects slash, Windows and mixed traversal before the read sink (GHSA-xp26-3454-mjgp)", async () => {
  await fixture(async config => {
    for (const pathname of ["../outside.txt", "..\\outside.txt", "folder\\..\\..\\outside.txt", "..\\folder/../outside.txt", "folder\\.env"]) {
      const { handlers, replies, load } = harness(config);
      const redirect = `traversal:${pathname}`;
      const event = { type: "redirect", raw: "", id: "/rejected", url: "/rejected", redirect };
      // Backslashes would be path separators at the Windows filesystem sink.
      if (pathname.includes("outside.txt")) {
        assert.ok(win32.relative(config.root, win32.resolve(config.root, new URL(redirect).pathname)).startsWith(".."));
      }
      handlers.get("vitest:interceptor:register")(event);
      assert.equal(event.redirect, redirect, "rejected input must never reach the registry");
      assert.equal(await load(event.id), undefined);
      assert.equal(replies.at(-1)[0], "vitest:interceptor:register:result");
    }
  });
});

for (const [pathname, expected] of [
  ["allowed.txt", "ordinary local mock"],
  ["folder\\allowed.txt", "nested local mock"],
  ["folder/../allowed.txt", "ordinary local mock"],
  ["..%5coutside.txt", "literal encoded filename"],
]) {
  test(`in-root redirect remains readable: ${pathname}`, async () => {
    await fixture(async config => {
      const { handlers, load } = harness(config);
      const event = { type: "redirect", raw: "", id: "/allowed", url: "/allowed", redirect: `traversal:${pathname}` };
      handlers.get("vitest:interceptor:register")(event);
      assert.equal(await load(event.id), expected);
    });
  });
}

test("the existing no-WebSocket-registration mode remains closed", async () => {
  await fixture(async config => {
    const { handlers } = harness(config, { registerWebSocketEvents: false });
    assert.equal(handlers.size, 0);
  });
});

test("manual mock URLs and export names remain data in generated module source (GHSA-qxg6-89mg-rqv8)", () => {
  const keys = ["ordinary", 'quote"key', "line\nkey"];
  for (const url of ["ordinary-local", 'x"); globalThis.syntheticInjected = 1; void("', "quote\"\nurl"]) {
    const source = createManualModuleSource(url, keys);
    const parsed = ts.createSourceFile("synthetic.mjs", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    assert.equal(parsed.parseDiagnostics.length, 0);
    const initializer = parsed.statements[0].declarationList.declarations[0].initializer;
    assert.ok(ts.isAwaitExpression(initializer) && ts.isCallExpression(initializer.expression));
    const args = initializer.expression.arguments;
    assert.equal(args.length, 1);
    assert.ok(ts.isStringLiteral(args[0]));
    assert.equal(args[0].text, url);
    const exported = parsed.statements.filter(ts.isExportDeclaration)
      .flatMap(statement => statement.exportClause.elements.map(element => element.name.text));
    assert.deepEqual(exported, keys);
  }
});

test("a rejected redirect cannot replace an already registered local mock", async () => {
  await fixture(async config => {
    const { handlers, load } = harness(config);
    const register = handlers.get("vitest:interceptor:register");
    const event = { type: "redirect", raw: "", id: "/existing", url: "/existing" };
    register({ ...event, redirect: "traversal:allowed.txt" });
    register({ ...event, redirect: "traversal:..\\outside.txt" });
    assert.equal(await load(event.id), "ordinary local mock");
  });
});
