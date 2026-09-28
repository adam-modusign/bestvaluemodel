#!/usr/bin/env node
/**
 * Local runner: refresh data/ from Artificial Analysis (when AA_API_KEY is
 * available), then serve the page on http://localhost:8080.
 *
 * If the key is missing or the fetch fails, the last committed snapshot in
 * data/ is served as-is. Pass --no-fetch to skip the refresh.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT) || 8080;
const TYPES = { ".html": "text/html; charset=utf-8", ".json": "application/json; charset=utf-8" };

try { process.loadEnvFile(path.join(ROOT, ".env")); } catch {} // .env is optional

if (!process.argv.includes("--no-fetch")) {
  if (process.env.AA_API_KEY) {
    const r = spawnSync(process.execPath, [path.join(ROOT, "scripts/fetch-aa.mjs")], { stdio: "inherit" });
    if (r.status !== 0) console.warn("Fetch failed; serving the existing snapshot in data/.");
  } else {
    console.warn("AA_API_KEY not set (see .env.example); serving the existing snapshot in data/.");
  }
}

// Only the page and the two data files are served; everything else is 404.
const ALLOWED = new Set(["/index.html", "/data/models.json", "/data/changelog.json"]);

createServer(async (req, res) => {
  let p = new URL(req.url, "http://x").pathname;
  if (p === "/") p = "/index.html";
  if (req.method !== "GET" || !ALLOWED.has(p)) {
    res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
    return;
  }
  try {
    const body = await readFile(path.join(ROOT, p));
    res.writeHead(200, {
      "content-type": TYPES[path.extname(p)],
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    }).end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
  }
}).listen(PORT, HOST, () => console.log(`Serving on http://127.0.0.1:${PORT}`));
