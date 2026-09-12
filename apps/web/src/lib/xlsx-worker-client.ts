import { XLSX_IMPORT_LIMITS } from "./xlsx-contract";
import type { XlsxAnalysisResult, XlsxSurfaceInventory } from "./xlsx-analysis";

type XlsxWorkerResponse =
  | { ok: true; result: XlsxAnalysisResult }
  | { ok: false; error: string };

export function analyzeXlsxInWorker(buffer: ArrayBuffer, inventory: XlsxSurfaceInventory): Promise<XlsxAnalysisResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./xlsx-worker.ts", import.meta.url), { type: "module", name: "blackproof-xlsx-parser" });
    const timeout = window.setTimeout(() => {
      worker.terminate();
      reject(new Error(`XLSX_WORKER_TIMEOUT: délai maximal ${XLSX_IMPORT_LIMITS.workerTimeoutMs} ms dépassé.`));
    }, XLSX_IMPORT_LIMITS.workerTimeoutMs);

    const cleanup = () => {
      window.clearTimeout(timeout);
      worker.terminate();
    };
    worker.onerror = () => {
      cleanup();
      reject(new Error("XLSX_WORKER_ERROR: échec isolé du parseur XLSX."));
    };
    worker.onmessage = (event: MessageEvent<XlsxWorkerResponse>) => {
      cleanup();
      if (event.data.ok) resolve(event.data.result);
      else reject(new Error(event.data.error));
    };
    worker.postMessage({ buffer, inventory }, [buffer]);
  });
}
