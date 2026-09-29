#!/usr/bin/env node
/**
 * Local runner: refresh data/ from Artificial Analysis (when AA_API_KEY is
 * available), then serve the page on http://localhost:8080.
 *
 * The refresh is skipped when the API was checked within FETCH_MAX_AGE_HOURS
 * (tracked in .last-fetch, falling back to the snapshot's fetched_at); run
 * `npm run fetch` to force one. If the key is missing or the fetch fails, the
 * existing snapshot in data/ is served as-is. Pass --no-fetch to skip it.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Local-only by default; --lan (npm run lan) opens it to the local network. Deliberately not an env var:
// zsh sets $HOST to the machine name, and an exported one would expose the server without anyone asking.
const LAN = process.argv.includes("--lan");
const HOST = LAN ? "0.0.0.0" : "127.0.0.1";
const PORT = Number(process.env.PORT) || 8080;
const TYPES = { ".html": "text/html; charset=utf-8", ".json": "application/json; charset=utf-8" };
const FETCH_MAX_AGE_HOURS = 6;

try { process.loadEnvFile(path.join(ROOT, ".env")); } catch {} // .env is optional

// Latest of the last API check and the snapshot's own timestamp; 0 when neither is readable.
async function lastChecked() {
  const times = await Promise.all([
    readFile(path.join(ROOT, ".last-fetch"), "utf8").then((t) => Date.parse(t.trim())).catch(() => NaN),
    readFile(path.join(ROOT, "data/models.json"), "utf8").then((t) => Date.parse(JSON.parse(t).fetched_at)).catch(() => NaN),
  ]);
  return Math.max(0, ...times.filter((t) => !Number.isNaN(t)));
}

if (!process.argv.includes("--no-fetch")) {
  const ageHours = (Date.now() - (await lastChecked())) / 3_600_000;
  if (ageHours < FETCH_MAX_AGE_HOURS) {
    console.log(`Data checked ${ageHours.toFixed(1)}h ago (< ${FETCH_MAX_AGE_HOURS}h); skipping fetch. Run \`npm run fetch\` to refresh now.`);
  } else if (process.env.AA_API_KEY) {
    const r = spawnSync(process.execPath, [path.join(ROOT, "scripts/fetch-aa.mjs")], { stdio: "inherit" });
    if (r.status !== 0) console.warn("Fetch failed; serving the existing snapshot in data/.");
  } else {
    console.warn("AA_API_KEY not set (see .env.example); serving the existing snapshot in data/.");
  }
}

// Only the page and its data files are served; everything else is 404.
const ALLOWED = new Set(["/index.html", "/data/models.json", "/data/changelog.json", "/data/languages.json"]);

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
}).listen(PORT, HOST, () => {
  console.log(`Serving on http://127.0.0.1:${PORT}`);
  if (!LAN) return;
  const lan = Object.values(networkInterfaces()).flat().filter((i) => i.family === "IPv4" && !i.internal);
  lan.forEach((i) => console.log(`             http://${i.address}:${PORT}  (local network)`));
  console.warn("Anyone on the same network can open this page. Stop the server (Ctrl+C) when you are done.");
});
