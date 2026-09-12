import { extractBuildCsp } from "./shared/csp.mjs";

const distDir = process.argv[2] ?? "apps/web/dist";

console.log(extractBuildCsp(distDir));
