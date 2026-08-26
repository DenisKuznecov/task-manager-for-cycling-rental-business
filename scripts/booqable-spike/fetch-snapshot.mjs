#!/usr/bin/env node
/**
 * GET-only Booqable snapshot helper for the tenant spike.
 * Never POSTs/PATCHes/PUTs/DELETEs to booqable.com. Never imports sync.ts
 * or a database client.
 *
 * Usage:
 *   node --env-file=.env.local scripts/booqable-spike/fetch-snapshot.mjs <order-number-or-uuid> [--label name] [--timed] [--include "..."] [--probe]
 *   node --env-file=.env.local scripts/booqable-spike/fetch-snapshot.mjs --list-timing
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAPTURE_DIR = path.join(__dirname, "captures");
const WORKING_INCLUDE_FILE = path.join(CAPTURE_DIR, "working-include.txt");

const INCLUDE_CANDIDATES = [
  "lines,lines.planning,lines.planning.stock_item_plannings,lines.planning.stock_item_plannings.stock_item",
  "customer,coupon,lines,lines.planning,lines.planning.stock_item_plannings,lines.planning.stock_item_plannings.stock_item",
  "customer,coupon,lines,lines.planning,lines.planning.stock_item_plannings,lines.planning.stock_item_plannings.stock_item,lines.item",
  "customer,coupon,lines,lines.planning,lines.planning.stock_item_plannings,lines.planning.stock_item_plannings.stock_item,lines.item,lines.item.product_group",
  "plannings,plannings.stock_item_plannings,plannings.stock_item_plannings.stock_item",
  "stock_item_plannings,stock_item_plannings.stock_item",
  "customer,coupon,lines",
];

const TIMED_DELAYS_MS = [0, 1000, 5000, 30000];

function die(message) {
  console.error(`fetch-snapshot: ${message}`);
  process.exit(1);
}

function env() {
  const slug = process.env.BOOQABLE_COMPANY_SLUG;
  const apiKey = process.env.BOOQABLE_API_KEY;
  if (!slug || !apiKey) {
    die("Missing BOOQABLE_COMPANY_SLUG or BOOQABLE_API_KEY");
  }
  return { slug, apiKey };
}

function parseArgs(argv) {
  const args = { positional: [], flags: new Set(), values: {} };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--timed" || token === "--probe" || token === "--list-timing") {
      args.flags.add(token);
    } else if (token === "--label" || token === "--include") {
      const value = argv[++i];
      if (!value) die(`${token} requires a value`);
      args.values[token] = value;
    } else if (token.startsWith("--")) {
      die(`Unknown flag ${token}`);
    } else {
      args.positional.push(token);
    }
  }
  return args;
}

function ensureCaptureDir() {
  fs.mkdirSync(CAPTURE_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function booqableGet(pathnameAndQuery) {
  const { slug, apiKey } = env();
  const url = `https://${slug}.booqable.com${pathnameAndQuery}`;
  const MAX_ATTEMPTS = 3;
  let res;
  const started = performance.now();
  for (let attempt = 1; ; attempt++) {
    res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });
    if (res.status !== 429 || attempt >= MAX_ATTEMPTS) break;
    const retryAfter = res.headers.get("retry-after");
    const waitMs = retryAfter
      ? Number(retryAfter) * 1000
      : 2000 * attempt;
    console.error(
      `fetch-snapshot: HTTP 429 attempt ${attempt}; Retry-After=${retryAfter ?? "absent"}; waiting ${waitMs}ms`,
    );
    await sleep(waitMs);
  }
  const elapsedMs = Math.round(performance.now() - started);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return {
    url: pathnameAndQuery,
    status: res.status,
    ok: res.ok,
    elapsedMs,
    retryAfter: res.headers.get("retry-after"),
    headers: Object.fromEntries(res.headers.entries()),
    bodyText: text,
    json,
  };
}

function writeCapture(label, payload) {
  ensureCaptureDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safe = label.replace(/[^a-z0-9._-]+/gi, "-");
  const file = path.join(CAPTURE_DIR, `${safe}-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  return file;
}

function includedByType(payload, type) {
  return (payload?.included ?? []).filter((row) => row.type === type);
}

function summarize(payload) {
  const data = payload?.data;
  const order = Array.isArray(data) ? data[0] : data;
  const included = payload?.included ?? [];
  const types = {};
  for (const row of included) {
    types[row.type] = (types[row.type] ?? 0) + 1;
  }
  const stockItems = includedByType(payload, "stock_items").map((row) => ({
    id: row.id,
    identifier: row.attributes?.identifier ?? null,
    name: row.attributes?.name ?? null,
  }));
  const products = includedByType(payload, "products").map((row) => ({
    id: row.id,
    tag_list: row.attributes?.tag_list ?? null,
    name: row.attributes?.name ?? null,
  }));
  const groups = includedByType(payload, "product_groups").map((row) => ({
    id: row.id,
    tag_list: row.attributes?.tag_list ?? null,
    name: row.attributes?.name ?? null,
  }));
  const lines = includedByType(payload, "lines").map((row) => ({
    id: row.id,
    title: row.attributes?.title ?? row.attributes?.name ?? null,
    kind: row.attributes?.kind ?? null,
    quantity: row.attributes?.quantity ?? null,
  }));
  return {
    orderId: order?.id ?? null,
    number: order?.attributes?.number ?? null,
    status: order?.attributes?.status ?? null,
    statuses: order?.attributes?.statuses ?? null,
    tag_list: order?.attributes?.tag_list ?? null,
    starts_at: order?.attributes?.starts_at ?? null,
    stops_at: order?.attributes?.stops_at ?? null,
    includedTypes: types,
    stockItems,
    products,
    productGroups: groups,
    lines,
  };
}

async function resolveOrderId(ref) {
  if (isUuid(ref)) return ref;
  const number = Number(ref);
  if (!Number.isInteger(number)) {
    die(`Expected an order number or UUID, got ${ref}`);
  }
  const params = new URLSearchParams({
    "filter[number][eq]": String(number),
    "fields[orders]": "id,status,number",
    "page[size]": "1",
  });
  const result = await booqableGet(`/api/4/orders?${params.toString()}`);
  writeCapture(`lookup-number-${number}`, {
    kind: "lookup",
    at: new Date().toISOString(),
    ...result,
    summary: summarize(result.json),
  });
  if (!result.ok) {
    die(`Lookup by number ${number} failed: HTTP ${result.status}`);
  }
        const rows = Array.isArray(result.json?.data) ? result.json.data : [];
  if (rows.length === 0) {
    die(`No order found with number ${number}`);
  }
  return rows[0].id;
}

function hasPlanningOrStock(payload) {
  const included = payload?.included ?? [];
  return included.some((row) =>
    ["stock_items", "stock_item_plannings", "plannings"].includes(row.type),
  );
}

async function probeIncludes(orderId) {
  const attempts = [];
  let working = null;
  for (const include of INCLUDE_CANDIDATES) {
    const params = new URLSearchParams({ include });
    const result = await booqableGet(
      `/api/4/orders/${orderId}?${params.toString()}`,
    );
    const attempt = {
      include,
      status: result.status,
      elapsedMs: result.elapsedMs,
      hasPlanningOrStock: result.ok ? hasPlanningOrStock(result.json) : false,
      includedTypes: result.ok
        ? summarize(result.json).includedTypes
        : null,
    };
    attempts.push(attempt);
    writeCapture(`probe-${result.status}`, {
      kind: "include-probe",
      at: new Date().toISOString(),
      include,
      ...result,
      summary: result.ok ? summarize(result.json) : null,
    });
    if (result.status === 400 || result.status === 404) {
      console.log(`include probe HTTP ${result.status}: ${include}`);
      continue;
    }
    if (result.ok) {
      if (!hasPlanningOrStock(result.json)) {
        console.log(`include probe HTTP 200 without planning/stock: ${include}`);
        continue;
      }
      working = include;
      break;
    }
    die(`Include probe HTTP ${result.status} for ${include} — stopping`);
  }
  if (working) {
    ensureCaptureDir();
    fs.writeFileSync(WORKING_INCLUDE_FILE, working);
  }
  return { working, attempts };
}

function loadWorkingInclude() {
  if (fs.existsSync(WORKING_INCLUDE_FILE)) {
    return fs.readFileSync(WORKING_INCLUDE_FILE, "utf8").trim();
  }
  return INCLUDE_CANDIDATES[0];
}

async function snapshotOrder(orderId, include, label, delayLabel) {
  const params = new URLSearchParams({ include });
  const fetchedAt = new Date().toISOString();
  const result = await booqableGet(
    `/api/4/orders/${orderId}?${params.toString()}`,
  );
  const summary = result.ok ? summarize(result.json) : null;
  const file = writeCapture(label, {
    kind: "order-snapshot",
    at: fetchedAt,
    delayLabel,
    include,
    ...result,
    summary,
  });
  if (!result.ok) {
    die(`GET order ${orderId} failed: HTTP ${result.status}`);
  }
  console.log(
    JSON.stringify(
      {
        file: path.relative(process.cwd(), file),
        delayLabel,
        elapsedMs: result.elapsedMs,
        retryAfter: result.retryAfter,
        summary,
      },
      null,
      2,
    ),
  );
  return { file, result, summary };
}

async function listTiming() {
  const params = new URLSearchParams({
    "page[size]": "50",
    "page[number]": "1",
    "fields[orders]": "id,status,number",
  });
  const result = await booqableGet(`/api/4/orders?${params.toString()}`);
  if (!result.ok) {
    die(`List timing failed: HTTP ${result.status}`);
  }
  const file = writeCapture("list-timing", {
    kind: "list-timing",
    at: new Date().toISOString(),
    ...result,
    count: result.json?.data?.length ?? null,
  });
  console.log(
    JSON.stringify(
      {
        file: path.relative(process.cwd(), file),
        status: result.status,
        elapsedMs: result.elapsedMs,
        retryAfter: result.retryAfter,
        count: result.json?.data?.length ?? null,
      },
      null,
      2,
    ),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.flags.has("--list-timing")) {
    await listTiming();
    return;
  }
  const ref = args.positional[0];
  if (!ref) die("Pass an order number or UUID");
  const label = args.values["--label"] ?? `order-${ref}`;
  const orderId = await resolveOrderId(ref);

  let include = args.values["--include"] ?? null;
  if (args.flags.has("--probe") || !include) {
    if (!include && !args.flags.has("--probe")) {
      include = loadWorkingInclude();
    }
    if (args.flags.has("--probe")) {
      const probed = await probeIncludes(orderId);
      console.log(
        JSON.stringify(
          { kind: "include-probe", working: probed.working, attempts: probed.attempts },
          null,
          2,
        ),
      );
      include = probed.working;
      if (!include) {
        console.log("include: not observed (no candidate returned HTTP 200)");
        return;
      }
    }
  }

  const delays = args.flags.has("--timed") ? TIMED_DELAYS_MS : [0];
  const t0 = Date.now();
  for (const delay of delays) {
    const wait = delay - (Date.now() - t0);
    if (wait > 0) await sleep(wait);
    await snapshotOrder(orderId, include, `${label}-${delay}ms`, `${delay}ms`);
  }
}

main().catch((err) => {
  console.error("fetch-snapshot:", err);
  process.exit(1);
});
