// Copies the Vite production build into the directory the Express server
// serves as static files (see README.md "Single-origin SPA + API" and
// server/src/index.js). Run after `npm run build --workspace=client`.

import { cpSync, existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(rootDir, "..", "client", "dist");
const dest = path.join(rootDir, "..", "server", "public");

if (!existsSync(src)) {
  console.error(`Client build not found at ${src} -- run \`npm run build --workspace=client\` first.`);
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });

console.log(`Copied ${src} -> ${dest}`);
