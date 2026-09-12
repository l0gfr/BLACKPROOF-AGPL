#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { prepareSession } from "../src/inputs.mjs";
import { createServer } from "../src/server.mjs";
import { PrivateStdioTransport } from "../src/transport.mjs";

try {
  const args = process.argv.slice(2);
  let current;
  let previous;
  if (args.length) {
    if (args[0] !== "--local-only" || args[1] !== "--current"
      || ![3, 5].includes(args.length) || (args.length === 5 && args[3] !== "--previous")) throw new Error();
    current = args[2];
    previous = args[4];
  }
  if (!process.getuid?.()) throw new Error();
  const session = await prepareSession(current, previous);
  const transport = new PrivateStdioTransport();
  const handle = serveStdio(() => createServer(session), { transport, maxSubscriptions: 0, onerror: () => { void handle.close(); } });
  const timer = setTimeout(() => { void handle.close(); }, 15 * 60_000);
  timer.unref();
  process.stdin.once("end", () => { clearTimeout(timer); void handle.close(); });
  process.once("SIGINT", () => { void handle.close(); });
  process.once("SIGTERM", () => { void handle.close(); });
} catch {
  // No path, argument, proof, stack or underlying parser error in logs.
  process.stderr.write("BLACKPROOF local session refused. Check the documented startup and private file permissions.\n");
  process.exitCode = 1;
}
