import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

// Exercise the URI resolver actually used by each workspace's Ajv instance.
for (const [consumer, manifest] of [
  ["schema tooling", "../package.json"],
  ["core", "../packages/core/package.json"],
  ["verifier", "../packages/verifier/package.json"],
]) {
  const consumerRequire = createRequire(new URL(manifest, import.meta.url));
  const Ajv2020 = consumerRequire("ajv/dist/2020.js").default;

  test(`${consumer} keeps encoded schemes and suffix references inert (GHSA-w74x-v6f9-j3xg, GHSA-333x-w4r6-6crp)`, () => {
    const uri = new Ajv2020().opts.uriResolver;
    for (const input of ["%6Aavascript:alert(1)", "%u006Aavascript:alert(1)", "%64ata:text/plain,synthetic"]) {
      assert.ok(uri.parse(input).error);
      assert.notEqual(uri.parse(input).scheme, "javascript");
    }
    for (const input of ["javascript:alert(1)", "data:text/plain,synthetic", "vbscript:synthetic"]) {
      for (const scheme of [undefined, "custom"]) {
        const serialized = uri.serialize({ scheme, path: input }, { reference: "suffix" });
        assert.equal(uri.parse(serialized).scheme, undefined);
        assert.ok(serialized.includes("%3A"));
      }
      assert.ok(uri.parse(input, { reference: "suffix" }).error);
    }
  });

  test(`${consumer} preserves relative references and rejects authority parser disagreement (GHSA-xhq7-xmqj-769h, GHSA-wjr9-j795-jxcr)`, () => {
    const uri = new Ajv2020().opts.uriResolver;
    for (const reference of ["../outside", "a/../b", "../../same"]) {
      assert.equal(uri.resolve("https://example.test/folder/base/", uri.normalize(reference)), uri.resolve("https://example.test/folder/base/", reference));
    }
    for (const input of ["http://a@b@evil.example/", "https://exam\tple.test/", "https://exam\nple.test/", "https://exam\rple.test/"]) {
      assert.ok(uri.parse(input).error, input);
    }
  });

  test(`${consumer} normalizes percent-encoded host case (GHSA-hrr3-gc8f-f4qj)`, () => {
    const uri = new Ajv2020().opts.uriResolver;
    for (const value of ["//%41.example.test", "//A.example.test", "//%61.example.test"]) {
      assert.equal(uri.parse(value).host, "a.example.test");
      assert.equal(uri.equal(value, "//a.example.test"), true);
      assert.equal(uri.normalize(value), uri.normalize("//a.example.test"));
    }
    assert.equal(uri.equal("//a.example.test", "//b.example.test"), false);
  });

  test(`${consumer} rejects malformed URI host brackets (GHSA-58mr-gqgx-xq4g)`, () => {
    const uri = new Ajv2020().opts.uriResolver;
    for (const value of [
      "http://[",
      "http://[fe80",
      "https://[not-an-ip",
      "http://[not-an-ip]",
      "http://example.test]/",
    ]) {
      assert.ok(uri.parse(value).error, `Malformed host accepted: ${value}`);
    }
  });

  test(`${consumer} preserves valid hosts and local schema reference resolution`, () => {
    const ajv = new Ajv2020({ strict: true });
    const uri = ajv.opts.uriResolver;
    for (const [value, host] of [
      ["https://example.test/a", "example.test"],
      ["http://127.0.0.1/", "127.0.0.1"],
      ["http://[2001:db8::1]/", "2001:db8::1"],
      ["http://[fe80::1%25eth0]/", "fe80::1%eth0"],
    ]) {
      const parsed = uri.parse(value);
      assert.equal(parsed.error, undefined, value);
      assert.equal(parsed.host, host, value);
      assert.equal(uri.parse(uri.normalize(value)).error, undefined, value);
    }

    ajv.addSchema({
      $id: "https://schemas.example.test/defs.json",
      $defs: { name: { type: "string", minLength: 1 } },
    });
    const validate = ajv.compile({
      $id: "https://schemas.example.test/case.json",
      type: "object",
      properties: { name: { $ref: "defs.json#/$defs/name" } },
      required: ["name"],
      additionalProperties: false,
    });
    assert.equal(validate({ name: "Synthetic case" }), true);
    assert.equal(validate({ name: "" }), false);
    assert.equal(validate({}), false);
  });
}
