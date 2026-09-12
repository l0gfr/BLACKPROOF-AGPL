/// <reference lib="webworker" />

import { analyzeXlsxArrayBuffer, type XlsxSurfaceInventory } from "./xlsx-analysis";

interface XlsxWorkerRequest {
  buffer: ArrayBuffer;
  inventory: XlsxSurfaceInventory;
}

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = async (event: MessageEvent<XlsxWorkerRequest>) => {
  try {
    const result = await analyzeXlsxArrayBuffer(event.data.buffer, event.data.inventory);
    self.postMessage({ ok: true, result });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : "XLSX_WORKER_UNKNOWN_ERROR",
    });
  }
};

export {};
