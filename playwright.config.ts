import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4321";
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1";
const previewURL = new URL(baseURL);
const previewPort = Number.parseInt(previewURL.port || "80", 10);

if (!skipWebServer && (
  previewURL.protocol !== "http:"
  || !["127.0.0.1", "localhost"].includes(previewURL.hostname)
  || previewURL.pathname !== "/"
  || previewURL.search
  || previewURL.hash
  || !Number.isInteger(previewPort)
  || previewPort < 1024
  || previewPort > 65535
)) {
  throw new Error("The managed Playwright preview URL must be an unprivileged loopback HTTP origin.");
}

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: skipWebServer
    ? undefined
    : {
        command: `CODEX_THREAD_ID= pnpm --filter @blackproof/web preview --host ${previewURL.hostname} --port ${previewPort}`,
        url: baseURL,
        reuseExistingServer: process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "1",
        timeout: 120_000,
      },
});
