import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "virtual:blackproof-license-runtime": new URL("./src/lib/license-runtime.production.ts", import.meta.url).pathname,
    },
  },
});
