import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { extractBuildCsp } from "./shared/csp.mjs";

const webRequire = createRequire(new URL("../apps/web/package.json", import.meta.url));
const astroPackagePath = webRequire.resolve("astro/package.json");
const astroPackage = JSON.parse(readFileSync(astroPackagePath, "utf8"));
const astroRequire = createRequire(astroPackagePath);
const transitionModuleUrl = pathToFileURL(join(dirname(astroPackagePath), "dist/runtime/server/transition.js"));
const { renderTransition } = await import(transitionModuleUrl.href);
const { loadRemoteImage, revalidateRemoteImage } = await import(pathToFileURL(join(dirname(astroPackagePath), "dist/assets/build/remote.js")).href);

test("Astro cache policy refuses wildcard Vary responses", () => {
  const CachePolicy = astroRequire("http-cache-semantics");
  const request = { url: "https://images.example.test/synthetic.png", method: "GET", headers: {} };
  const response = (vary) => ({ status: 200, headers: { "cache-control": "public, max-age=3600", vary } });
  assert.equal(new CachePolicy(request, response("accept-language")).satisfiesWithoutRevalidation(request), true);
  for (const vary of ["*", "accept-language, *"]) {
    assert.equal(new CachePolicy(request, response(vary)).satisfiesWithoutRevalidation(request), false);
  }
});

test("Astro never gives private remote-image responses a reusable cache lifetime", async () => {
  const url = "https://images.example.test/synthetic.png";
  const imageConfig = { domains: ["images.example.test"], remotePatterns: [] };
  for (const cacheControl of ["private, max-age=3600", "no-store, max-age=3600"]) {
    const fetchFn = async () => new Response(new Uint8Array([1, 2, 3]), {
      headers: { "cache-control": cacheControl, "set-cookie": "synthetic=fixture" },
    });
    for (const load of [
      () => loadRemoteImage(url, fetchFn, imageConfig),
      () => revalidateRemoteImage(url, {}, fetchFn, imageConfig),
    ]) {
      const before = Date.now();
      const result = await load();
      assert.ok(result.expires >= before && result.expires <= Date.now());
      assert.deepEqual(Array.from(result.data), [1, 2, 3]);
      assert.equal(Object.hasOwn(result, "headers"), false);
    }
  }
});

test("Astro TOML parsing does not rescan the whole document for key separators (GHSA-r4xh-jqrq-34v2)", () => {
  const tomlUrl = pathToFileURL(astroRequire.resolve("smol-toml")).href;
  execFileSync(process.execPath, ["--input-type=module", "--eval", `
    import assert from "node:assert/strict";
    import { parse } from ${JSON.stringify(tomlUrl)};
    const document = Array.from({ length: 100 }, (_, i) => "key" + i + " = " + i).join("\\n");
    const original = String.prototype.indexOf;
    String.prototype.indexOf = function (needle, from) {
      assert.ok(!(needle === "." && String(this) === document), "key parsing must not search the whole remaining document");
      return original.call(this, needle, from);
    };
    try {
      const result = parse(document);
      assert.equal(Object.keys(result).length, 100);
      assert.equal(result.key0, 0);
      assert.equal(result.key99, 99);
    } finally {
      String.prototype.indexOf = original;
    }
    const nested = parse('title = "local"\\n[section]\\nvalue = 42');
    assert.equal(nested.title, "local");
    assert.equal(nested.section.value, 42);
    assert.throws(() => parse("duplicate = 1\\nduplicate = 2"));
  `], { timeout: 5000, stdio: "pipe" });
});

test("Astro CSS source maps reject invalid and amplified section offsets (GHSA-68fv-2mgg-jv7q)", () => {
  const svgoRequire = createRequire(astroRequire.resolve("svgo"));
  const cssRequire = createRequire(svgoRequire.resolve("css-tree"));
  const { SourceMapConsumer, SourceMapGenerator } = cssRequire("source-map-js");
  const flat = { version: 3, sources: ["synthetic.css"], names: [], mappings: "AAAA" };
  const indexed = (line, map = flat) => ({ version: 3, sections: [{ offset: { line, column: 0 }, map }] });
  for (const line of [-1, 0.5, Infinity, 10_000_001]) {
    assert.throws(() => new SourceMapConsumer(indexed(line)), /Section offset/);
  }
  assert.throws(() => new SourceMapConsumer(indexed(6_000_000, indexed(6_000_000))), /nested sections/);
  const valid = new SourceMapConsumer(indexed(2));
  const generator = new SourceMapGenerator();
  valid.eachMapping((mapping) => generator.addMapping({
    generated: { line: mapping.generatedLine, column: mapping.generatedColumn },
    original: { line: mapping.originalLine, column: mapping.originalColumn },
    source: mapping.source,
  }));
  const rebuilt = new SourceMapConsumer(generator.toString());
  assert.equal(rebuilt.originalPositionFor({ line: 3, column: 0 }).source, "synthetic.css");
});

// Resolve the actual transitive dependency for each consumer, not a test-only copy.
for (const consumer of ["astro", "svelte"]) {
  const consumerRequire = createRequire(webRequire.resolve(`${consumer}/package.json`));
  const devalueUrl = pathToFileURL(consumerRequire.resolve("devalue")).href;
  const { parse, unflatten, stringify, stringifyAsync, uneval } = await import(devalueUrl);

  // Evaluate only generated code from the synthetic, bounded fixtures below.
  const evaluate = (source, context = {}) => runInNewContext(`(${source})`, context, { timeout: 1000 });

  test(`${consumer} devalue serializes only visible Buffer bytes (GHSA-j22f-vq7h-c4qm)`, async () => {
    const backing = Buffer.alloc(64, 255);
    const first = backing.subarray(8, 10);
    const second = backing.subarray(24, 27);
    first.set([1, 2]);
    second.set([3, 4, 5]);
    const value = { first, again: first, second };
    value.self = value;
    const copiedFirst = new Uint8Array([1, 2]);
    const expected = { first: copiedFirst, again: copiedFirst, second: new Uint8Array([3, 4, 5]) };
    expected.self = expected;

    for (const [serialize, deserialize] of [[stringify, parse], [stringifyAsync, parse], [uneval, evaluate]]) {
      const serialized = await serialize(value);
      assert.equal(serialized, await serialize(expected), "output must contain no unused backing-store bytes");
      const result = deserialize(serialized);
      assert.deepEqual(Array.from(result.first), [1, 2]);
      assert.deepEqual(Array.from(result.second), [3, 4, 5]);
      assert.equal(result.first.buffer.byteLength, 2);
      assert.equal(result.second.buffer.byteLength, 3);
      assert.notEqual(result.first.buffer, result.second.buffer);
      assert.equal(result.first, result.again);
      assert.equal(result.self, result);
      assert.equal(deserialize(await serialize(backing.subarray(8, 8))).buffer.byteLength, 0);

      // Ordinary typed-array views intentionally retain their shared backing store.
      const buffer = new Uint8Array([0, 1, 2, 3]).buffer;
      const typed = deserialize(await serialize({ buffer, view: new Uint8Array(buffer, 1, 2) }));
      assert.equal(typed.view.buffer, typed.buffer);
      assert.equal(typed.view.byteOffset, 1);
      assert.deepEqual(Array.from(new Uint8Array(typed.buffer)), [0, 1, 2, 3]);
    }
  });

  test(`${consumer} devalue rejects coerced null-prototype keys (GHSA-4q55-j62x-fr9h)`, () => {
    for (const key of [["__proto__"], ["ordinary"], 1]) {
      const flattened = [["null", key, 1], 42];
      assert.throws(() => parse(JSON.stringify(flattened)));
      assert.throws(() => unflatten(flattened));
    }
    const valid = Object.assign(Object.create(null), { ordinary: 42 });
    assert.deepEqual(parse(stringify(valid)), valid);
  });

  test(`${consumer} devalue handles caught async rejections (GHSA-x5rw-q4pp-hg5g)`, () => {
    execFileSync(process.execPath, ["--unhandled-rejections=strict", "--input-type=module", "--eval", `
      import assert from "node:assert/strict";
      import { setTimeout as delay } from "node:timers/promises";
      import { stringifyAsync, parse } from ${JSON.stringify(devalueUrl)};
      for (const nested of [false, true]) {
        const failure = new Error("synthetic failure");
        const failing = nested
          ? Promise.resolve().then(() => ({ failing: Promise.reject(failure) }))
          : Promise.reject(failure);
        await assert.rejects(stringifyAsync({ slow: delay(20, 42), failing }), error => error === failure);
        await delay(30);
      }
      assert.deepEqual(parse(await stringifyAsync({ answer: Promise.resolve(42) })), { answer: 42 });
    `], { timeout: 5000, stdio: "pipe" });
  });

  test(`${consumer} devalue keeps repeated primitive output bounded (GHSA-mcm9-63f2-9j32)`, () => {
    for (const makePrimitive of [(length) => "x".repeat(length), (length) => BigInt("9".repeat(length))]) {
      let previousLength = 0;
      for (const size of [64, 128]) {
        const primitive = makePrimitive(size * 4);
        const encoded = JSON.stringify([Array(size).fill(1), typeof primitive === "bigint" ? ["BigInt", String(primitive)] : primitive]);
        const value = parse(encoded);
        const serialized = uneval(value);
        assert.ok(serialized.length < encoded.length * 4);
        if (previousLength) assert.ok(serialized.length < previousLength * 2.3);
        previousLength = serialized.length;
        assert.deepEqual(Array.from(evaluate(serialized)), value);
      }
    }
  });

  test(`${consumer} devalue bounds sparse traversal (GHSA-hx4r-w6wj-j8fg)`, () => {
    for (const kind of ["empty", "single", "shared", "cyclic"]) {
      const sparse = [];
      sparse.length = 4096;
      if (kind !== "empty") sparse[4095] = 42;
      let probes = 0;
      const probe = () => assert.ok(++probes <= 100, "only populated indices should be inspected");
      const proxy = new Proxy(sparse, {
        get(target, key, receiver) { probe(); return Reflect.get(target, key, receiver); },
        has(target, key) { probe(); return Reflect.has(target, key); },
        getOwnPropertyDescriptor(target, key) { probe(); return Reflect.getOwnPropertyDescriptor(target, key); },
      });
      if (kind === "cyclic") sparse[4095] = proxy;
      const serialized = uneval(kind === "shared" ? [proxy, proxy] : proxy);
      assert.ok(serialized.length < 300);
      const result = evaluate(serialized);
      const restored = kind === "shared" ? result[0] : result;
      assert.equal(restored.length, 4096);
      assert.deepEqual(Object.keys(restored), kind === "empty" ? [] : ["4095"]);
      if (kind !== "empty") assert.equal(restored[4095], kind === "cyclic" ? restored : 42);
      if (kind === "shared") assert.equal(result[0], result[1]);
    }
  });

  test(`${consumer} devalue avoids eager sparse allocation (GHSA-wf3x-273g-mvxv)`, () => {
    for (const shared of [false, true]) {
      const sparse = [];
      sparse[4095] = sparse;
      const serialized = uneval(shared ? [sparse, sparse] : sparse);
      // Refuse dense numeric-length allocations instead of testing with large memory consumption.
      const result = evaluate(serialized, {
        Array: (...args) => {
          assert.ok(!(args.length === 1 && typeof args[0] === "number" && args[0] >= 1024), "sparse evaluation must avoid eager allocation");
          return Array(...args);
        },
      });
      const restored = shared ? result[0] : result;
      assert.equal(restored.length, 4096);
      assert.deepEqual(Object.keys(restored), ["4095"]);
      assert.equal(restored[4095], restored);
      if (shared) assert.equal(result[0], result[1]);
    }
  });

  test(`${consumer} devalue rejects out-of-bounds references (GHSA-9rgm-9g3h-6x36)`, () => {
    // Tiny boundary cases exercise the upstream fix without a resource-exhaustion payload.
    for (const index of [1, 7]) {
      for (const flattened of [[["Set", index]], [[index]], [{ value: index }], [[-7, 1, 0, index]]]) {
        assert.throws(() => parse(JSON.stringify(flattened)), /Invalid input/);
        assert.throws(() => unflatten(flattened), /Invalid input/);
      }
    }
  });

  test(`${consumer} devalue preserves legitimate typed and circular values`, () => {
    const value = {
      date: new Date("2026-01-01T00:00:00.000Z"),
      map: new Map([["synthetic", new Set([1, 2])]]),
      sparse: [, "local"],
      absent: undefined,
    };
    value.self = value;
    const serialized = stringify(value);
    assert.deepEqual(parse(serialized), value);
    assert.deepEqual(unflatten(JSON.parse(serialized)), value);
    const custom = parse('[["URL","https://example.invalid/"]]', { URL: (input) => new URL(input) });
    assert.equal(custom.href, "https://example.invalid/");
  });
}

function compareVersions(left, right) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  }
  return 0;
}

test("Astro stays on the patched View Transition release line", () => {
  assert.ok(compareVersions(astroPackage.version, "7.1.0") >= 0);
});

test("Astro transition styles keep dynamic values inside the style context", () => {
  const contextBoundaryMarker = "</style><template data-security-regression></template><style>";
  const animation = {
    forwards: {
      old: {
        name: "blackproof-security-regression",
        duration: contextBoundaryMarker,
      },
    },
  };
  const result = { _metadata: { extraHead: [] } };

  renderTransition(result, "security-regression", animation);

  const renderedHead = String(result._metadata.extraHead[0]);
  assert.equal((renderedHead.match(/<\/style>/g) ?? []).length, 1);
  assert.ok(!renderedHead.includes(contextBoundaryMarker));
  assert.match(renderedHead, /\\3C style>/);
  assert.match(renderedHead, /animation-duration:/);
});

test("CSP extraction accepts only inert local Astro redirect documents", () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "blackproof-csp-redirect-"));
  const redirectRoot = join(fixtureRoot, "pilot");
  mkdirSync(redirectRoot);
  writeFileSync(
    join(fixtureRoot, "index.html"),
    `<meta http-equiv="content-security-policy" content="default-src 'self'; script-src 'self' 'sha256-script'; style-src 'self' 'sha256-style'">`,
  );
  writeFileSync(
    join(redirectRoot, "index.html"),
    '<!doctype html><title>Redirecting to: /pricing</title><meta http-equiv="refresh" content="0;url=/pricing"><meta name="robots" content="noindex"><link rel="canonical" href="https://blackproof.fr/pricing"><body><a href="/pricing">Redirecting</a></body>',
  );

  try {
    const csp = extractBuildCsp(fixtureRoot);
    assert.match(csp, /script-src 'self' 'sha256-script'/);
    assert.match(csp, /style-src 'self' 'sha256-style'/);

    writeFileSync(
      join(redirectRoot, "index.html"),
      '<meta http-equiv="refresh" content="0;url=/pricing"><meta name="robots" content="noindex"><link rel="canonical" href="https://blackproof.fr/pricing"><a href="/pricing" onclick="steal()">Redirecting</a>',
    );
    assert.throws(() => extractBuildCsp(fixtureRoot), /Unsafe static redirect/);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
