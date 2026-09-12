import { lstatSync, rmSync } from "node:fs";
import { join } from "node:path";

const distRoot = "apps/web/dist";
const prerenderRoot = join(distRoot, ".prerender");

try {
  const stat = lstatSync(prerenderRoot);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error(`Refusing to clean an unexpected Astro prerender path: ${prerenderRoot}`);
  }
  rmSync(prerenderRoot, { recursive: true, force: false });
  console.log(`Removed Astro build-only directory: ${prerenderRoot}`);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
  console.log("Astro build-only .prerender directory is already absent.");
}
