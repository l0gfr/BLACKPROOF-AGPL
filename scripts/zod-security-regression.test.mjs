import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const webRequire = createRequire(new URL("../apps/web/package.json", import.meta.url));
const mcpRequire = createRequire(new URL("../packages/mcp/package.json", import.meta.url));
for (const [name, require] of [
  ["Astro", createRequire(webRequire.resolve("astro/package.json"))],
  ["MCP", mcpRequire],
  ["MCP SDK", createRequire(mcpRequire.resolve("@modelcontextprotocol/server"))],
]) {
  const z = require("zod/v4");
  test(`${name} bounds oversized constrained collections before validating elements (GHSA-mrhx-c7xc-m3w5)`, () => {
    assert.equal(JSON.parse(readFileSync(require.resolve("zod/package.json"), "utf8")).version, "4.6.6");
    let visited = 0;
    const input = new Proxy(Array(32).fill("invalid"), { get(target, key, receiver) {
      if (/^\d+$/.test(String(key))) visited += 1;
      return Reflect.get(target, key, receiver);
    } });
    const schema = z.array(z.number()).max(2);
    const result = schema.safeParse(input);
    assert.equal(result.success, false);
    assert.ok(visited <= 2, "oversized input must not produce one issue per element");
    assert.ok(result.error.issues.length <= 2);
    assert.deepEqual(schema.parse([1, 2]), [1, 2]);
    assert.equal(z.strictObject({}).safeParse({ unexpected: [] }).success, false);
    assert.deepEqual(z.strictObject({}).parse({}), {});
  });
}
