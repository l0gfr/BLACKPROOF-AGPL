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
