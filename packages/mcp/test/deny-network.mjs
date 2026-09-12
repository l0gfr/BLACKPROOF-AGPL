// Test-only tripwires. Never shipped as the production isolation boundary.
import net from "node:net";
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import { syncBuiltinESMExports } from "node:module";
let attempted = false;
function deny() { attempted = true; throw new Error("NETWORK_FORBIDDEN_IN_TEST"); }
globalThis.fetch = deny;
net.Socket.prototype.connect = deny;
net.Server.prototype.listen = deny;
http.request = deny; https.request = deny;
dns.lookup = deny; dns.resolve = deny;
syncBuiltinESMExports();
process.once("exit", () => { if (attempted) process.stderr.write("NETWORK_ATTEMPT_DETECTED\n"); });
