import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const webRequire = createRequire(new URL("../apps/web/package.json", import.meta.url));
const astroRequire = createRequire(webRequire.resolve("astro/package.json"));
const fontRequire = createRequire(astroRequire.resolve("unifont"));
const undiciPackage = fontRequire.resolve("undici/package.json");
const undiciRequire = createRequire(undiciPackage);
const { EventSourceStream } = undiciRequire("./lib/web/eventsource/eventsource-stream.js");
const { bytesMatch } = undiciRequire("./lib/web/subresource-integrity/subresource-integrity.js");

test("the actual optional font dispatcher resolves patched Undici", () => {
  assert.equal(JSON.parse(readFileSync(undiciPackage, "utf8")).version, "8.12.2");
});

for (const [name, chunks, maxEventSize] of [
  ["data fields", [Buffer.from("data:\n".repeat(1025))], 4096],
  ["retained chunks", Array.from({ length: 1025 }, () => Buffer.from("x")), 4096],
  ["unfinished line", [Buffer.from("data:" + "x".repeat(24))], 16],
]) {
  test("EventSource bounds " + name + " (GHSA-4qv8-2p9j-2685)", () => {
    const parser = new EventSourceStream({ maxEventSize, push: () => {} });
    try {
      let failure;
      for (const chunk of chunks) {
        parser._transform(chunk, "buffer", error => { failure = error; });
        if (failure) break;
      }
      assert.ok(failure, "small adversarial fields/chunks must stop at the parser budget");
    } finally {
      parser.destroy();
    }
  });
}

test("ordinary EventSource events remain usable", () => {
  const events = [];
  const parser = new EventSourceStream({ maxEventSize: 4096, push: event => events.push(event) });
  try {
    let failure;
    parser._transform(Buffer.from("data: synthetic\n\n"), "buffer", error => { failure = error; });
    assert.equal(failure, undefined);
    assert.equal(events[0].options.data, "synthetic");
  } finally {
    parser.destroy();
  }
});

test("Subresource Integrity enforces lowercase, uppercase and mixed-case tokens (GHSA-f72v-6w45-q472)", () => {
  const expected = Buffer.from("synthetic expected bytes");
  const different = Buffer.from("synthetic tampered bytes");
  for (const algorithm of ["sha256", "sha384", "sha512"]) {
    const digest = createHash(algorithm).update(expected).digest("base64");
    for (const spelling of [algorithm, algorithm.toUpperCase(), algorithm.replace("sha", "Sha")]) {
      const metadata = spelling + "-" + digest;
      assert.equal(bytesMatch(expected, metadata), true);
      assert.equal(bytesMatch(different, metadata), false);
    }
  }
});
