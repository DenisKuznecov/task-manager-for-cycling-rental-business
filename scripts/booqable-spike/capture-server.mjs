#!/usr/bin/env node
/**
 * Local POST logger for the Booqable tenant spike.
 * Mirrors webhook query-secret auth + form parsing. Does not import
 * sync.ts or write to the app database.
 *
 * Usage:
 *   node --env-file=.env.local scripts/booqable-spike/capture-server.mjs
 *   node --env-file=.env.local scripts/booqable-spike/capture-server.mjs --fail-once
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAPTURE_DIR = path.join(__dirname, "captures");
const PORT = Number(process.env.SPIKE_CAPTURE_PORT || 8787);
const SECRET = process.env.BOOQABLE_WEBHOOK_SECRET;
const failOnce = process.argv.includes("--fail-once");
let hasFailedOnce = false;

function redactUrl(rawUrl) {
  return rawUrl.replace(/([?&]secret=)[^&]*/gi, "$1[REDACTED]");
}

function ensureCaptureDir() {
  fs.mkdirSync(CAPTURE_DIR, { recursive: true });
}

function writeCapture(record) {
  ensureCaptureDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(CAPTURE_DIR, `webhook-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(record, null, 2));
  return file;
}

const server = http.createServer(async (req, res) => {
  const receivedAt = new Date().toISOString();
  const host = req.headers.host ?? `127.0.0.1:${PORT}`;
  const rawUrl = `http://${host}${req.url ?? "/"}`;
  const url = new URL(rawUrl);

  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, failOnce, hasFailedOnce }));
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks).toString("utf8");

  let status = 200;
  let body = { received: true };

  if (!SECRET) {
    console.error("[booqable-spike/capture] BOOQABLE_WEBHOOK_SECRET is missing");
    status = 500;
    body = { error: "Server Configuration Error" };
  } else if (url.searchParams.get("secret") !== SECRET) {
    console.warn("[booqable-spike/capture] Unauthorized webhook attempt");
    status = 401;
    body = { error: "Unauthorized" };
  } else if (failOnce && !hasFailedOnce) {
    hasFailedOnce = true;
    status = 500;
    body = { error: "spike fail-once" };
  } else {
    const form = Object.fromEntries(new URLSearchParams(rawBody).entries());
    const orderStatus = form["data[status]"] || null;
    const orderNumber = form["data[number]"] || null;
    if (orderStatus === "new" || orderStatus === "concept" || !orderNumber) {
      body = { received: true, ignored: true };
    }
  }

  const record = {
    receivedAt,
    method: req.method,
    url: redactUrl(rawUrl),
    headers: req.headers,
    rawBody,
    ourHttpStatus: status,
    failOnceApplied: status === 500 && body.error === "spike fail-once",
  };
  const file = writeCapture(record);
  console.log(
    `[booqable-spike/capture] ${receivedAt} ${req.method} ${redactUrl(rawUrl)} -> ${status} (${path.basename(file)})`,
  );

  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `[booqable-spike/capture] listening on http://127.0.0.1:${PORT}/?secret=<BOOQABLE_WEBHOOK_SECRET>${failOnce ? " (fail-once enabled)" : ""}`,
  );
});
