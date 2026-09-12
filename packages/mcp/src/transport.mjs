import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";

// Keep protocol support in the official SDK. Bound framing and redact SDK
// errors too: validation failures can otherwise echo attacker-controlled text.
export class PrivateStdioTransport extends StdioServerTransport {
  constructor(input = process.stdin, output = process.stdout) {
    super(input, output, { maxBufferSize: 65_536 });
  }
  async start() {
    const receive = this.onmessage;
    let requests = 0;
    this.onmessage = (message) => {
      if (++requests > 1000) { void this.close(); return; }
      receive?.(message);
    };
    return super.start();
  }
  send(message) {
    if (message.error) {
      return super.send({ jsonrpc: "2.0", id: message.id, error: { code: message.error.code, message: "Request refused." } });
    }
    if (message.result?.isError) {
      return super.send({ jsonrpc: "2.0", id: message.id, result: { isError: true, content: [{ type: "text", text: "Request refused." }] } });
    }
    return super.send(message);
  }
}
