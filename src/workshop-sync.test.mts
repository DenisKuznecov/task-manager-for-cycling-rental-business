import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  paginationNextUrl,
  parseOrderListDocument,
  SOURCE_ORDER_INCLUDE,
} from "./lib/booqable/fetch-source-snapshot.ts";
import {
  decodeSyncCursor,
  encodeSyncCursor,
  isEligibleManualSyncOrder,
  skipReason,
} from "./lib/workshop/domain/commands.ts";
import {
  parseBooqableWebhookOrderId,
  sandboxBackfillAllowed,
  webhookDeliveryStatus,
  workshopSyncAllowed,
} from "./lib/workshop/application/sync-env.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = join(root, "src");

function collectTsFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(path));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(path);
    }
  }
  return files;
}

function readSrc(relativePath: string): string {
  return readFileSync(join(srcRoot, relativePath), "utf8");
}

const FORBIDDEN_DOMAIN_IMPORT =
  /(?:from\s+["'](?:next(?:\/|$)|@supabase\/)|import\(["'](?:next(?:\/|$)|@supabase\/)|from\s+["'][^"']*booqable[^"']*["']|import\(["'][^"']*booqable[^"']*["'])/;

const FORBIDDEN_UI_APPLICATION =
  /from\s+["']@\/src\/lib\/workshop\/application(?:\/|$)|from\s+["']\.\.\/.*application/;

test("workshopSyncAllowed is false on preview and staging git ref", () => {
  assert.equal(workshopSyncAllowed({}), true);
  assert.equal(workshopSyncAllowed({ VERCEL_ENV: "production" }), true);
  assert.equal(
    workshopSyncAllowed({
      VERCEL_ENV: "production",
      VERCEL_GIT_COMMIT_REF: "main",
    }),
    true,
  );
  assert.equal(workshopSyncAllowed({ VERCEL_ENV: "preview" }), false);
  assert.equal(
    workshopSyncAllowed({ VERCEL_GIT_COMMIT_REF: "staging" }),
    false,
  );
});

test("sandboxBackfillAllowed is true only when VERCEL_ENV is unset", () => {
  assert.equal(sandboxBackfillAllowed({}), true);
  assert.equal(sandboxBackfillAllowed({ VERCEL_ENV: "" }), true);
  assert.equal(sandboxBackfillAllowed({ VERCEL_ENV: "production" }), false);
  assert.equal(sandboxBackfillAllowed({ VERCEL_ENV: "preview" }), false);
});

test("webhook signal uses only data[id]", () => {
  assert.equal(
    parseBooqableWebhookOrderId("data[id]=order-344&data[status]=new&data[number]="),
    "order-344",
  );
  assert.equal(parseBooqableWebhookOrderId("data[status]=reserved&data[number]=344"), null);
  assert.equal(parseBooqableWebhookOrderId(""), null);
  assert.equal(parseBooqableWebhookOrderId("data[id]="), null);
  assert.equal(
    parseBooqableWebhookOrderId("data[id]=%20order-344%20"),
    "order-344",
  );

  const webhook = readSrc("app/api/webhooks/booqable/route.ts");
  assert.match(webhook, /parseBooqableWebhookOrderId/);
  assert.doesNotMatch(webhook, /data\[status\]/);
  assert.doesNotMatch(webhook, /data\[number\]/);
  assert.doesNotMatch(webhook, /Provided secret/);
  assert.doesNotMatch(webhook, /secret: \$\{/);
  assert.match(webhook, /workshopSyncAllowed/);
  assert.match(webhook, /reconcileBooqableOrder/);
});

test("fetch include is the complete source snapshot path", () => {
  assert.equal(
    SOURCE_ORDER_INCLUDE,
    "customer,coupon,lines,lines.planning,lines.planning.stock_item_plannings,lines.planning.stock_item_plannings.stock_item,lines.item",
  );
});

test("paginationNextUrl follows strings and href objects, rejects malformed next", () => {
  assert.equal(paginationNextUrl(null, "https://example.test/page/1"), null);
  assert.equal(
    paginationNextUrl(
      { next: "https://example.test/page/2" },
      "https://example.test/page/1",
    ),
    "https://example.test/page/2",
  );
  assert.equal(
    paginationNextUrl(
      { next: { href: "/page/2" } },
      "https://example.test/page/1",
    ),
    "https://example.test/page/2",
  );
  assert.throws(() => paginationNextUrl({ next: { rel: "next" } }, "https://example.test/"));
  assert.throws(
    () =>
      paginationNextUrl(
        { next: "https://evil.test/page/2" },
        "https://example.test/page/1",
      ),
    /INVALID_SNAPSHOT/,
  );
});

test("next 7 days scope skips reserved orders starting after the window", () => {
  const now = new Date("2026-08-22T12:00:00Z");
  const inWindow = {
    id: "near",
    status: "reserved",
    number: 1,
    startsAt: "2026-08-24T10:00:00+02:00",
  };
  const later = {
    id: "later",
    status: "reserved",
    number: 2,
    startsAt: "2026-09-10T10:00:00+02:00",
  };
  assert.equal(isEligibleManualSyncOrder(inWindow, "next_7_days", now), true);
  assert.equal(isEligibleManualSyncOrder(later, "next_7_days", now), false);
  assert.equal(isEligibleManualSyncOrder(later, "all_reserved", now), true);
  assert.equal(
    isEligibleManualSyncOrder({ ...later, status: "stopped" }, "all_reserved", now),
    false,
  );
  assert.equal(
    isEligibleManualSyncOrder({ ...inWindow, status: "started" }, "next_7_days", now),
    false,
  );
  assert.equal(
    isEligibleManualSyncOrder({ ...inWindow, status: "canceled" }, "all_reserved", now),
    false,
  );
  assert.equal(skipReason(later, "next_7_days", now), "outside next 7 days");
  assert.equal(skipReason({ ...inWindow, status: "started" }, "next_7_days", now), "skipped non-reserved status");
  assert.equal(skipReason(inWindow, "next_7_days", now), null);

  const loop = readSrc("lib/workshop/application/manual-sync.ts");
  assert.match(loop, /const skip = skipReason\(order, scope\)/);
  assert.match(loop, /skipped: true/);
  assert.match(loop, /continue;/);
});

test("opaque sync cursor carries versioned scope and page", () => {
  const encoded = encodeSyncCursor({
    v: 1,
    scope: "next_7_days",
    page: 2,
    runId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  });
  const decoded = decodeSyncCursor(encoded);
  assert.equal(decoded?.v, 1);
  assert.equal(decoded?.scope, "next_7_days");
  assert.equal(decoded?.page, 2);
  assert.equal(decoded?.runId, "cccccccc-cccc-4ccc-8ccc-cccccccccccc");
  assert.equal(
    decodeSyncCursor(
      Buffer.from(
        JSON.stringify({
          v: 2,
          scope: "next_7_days",
          page: 2,
          runId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        }),
        "utf8",
      ).toString("base64url"),
    ),
    null,
  );
  assert.equal(
    decodeSyncCursor(
      Buffer.from(
        JSON.stringify({
          v: 1,
          scope: "yesterday",
          page: 2,
          runId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        }),
        "utf8",
      ).toString("base64url"),
    ),
    null,
  );
  assert.equal(
    decodeSyncCursor(
      Buffer.from(
        JSON.stringify({
          v: 1,
          scope: "next_7_days",
          page: 0,
          runId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        }),
        "utf8",
      ).toString("base64url"),
    ),
    null,
  );
});

test("src has no leftover dual-write order sync helpers", () => {
  const oldWriter = ["sync", "Booqable", "Order"].join("");
  const oldFetch = ["fetch", "Booqable", "Order"].join("");
  for (const file of collectTsFiles(srcRoot)) {
    if (file.endsWith("workshop-sync.test.mts")) continue;
    const source = readFileSync(file, "utf8");
    assert.equal(
      source.includes(oldWriter) || source.includes(oldFetch),
      false,
      `${file} must not call the old sync writer`,
    );
  }
});

test("workshop domain imports neither Next.js, Supabase, nor Booqable", () => {
  const domainDir = join(srcRoot, "lib/workshop/domain");
  for (const file of collectTsFiles(domainDir)) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      FORBIDDEN_DOMAIN_IMPORT,
      `${file} must not import Next.js, Supabase, or Booqable`,
    );
  }
});

test("workshop UI does not import the application layer", () => {
  const uiDir = join(srcRoot, "app/workshop");
  for (const file of collectTsFiles(uiDir)) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      FORBIDDEN_UI_APPLICATION,
      `${file} must not import workshop application`,
    );
    assert.doesNotMatch(source, /from\s+["']@\/src\/lib\/booqable/);
  }
});

test("workshop public index does not export application", () => {
  const source = readSrc("lib/workshop/index.ts");
  assert.match(source, /export \* as workshopActions/);
  assert.match(source, /export \* as workshopData/);
  assert.match(source, /export \* as workshopDomain/);
  assert.doesNotMatch(source, /application/);
});

test("sandbox reseed stays on the new reconciler and requires a session", () => {
  const source = readSrc("app/api/sandbox/booqable/sync-orders/route.ts");
  assert.match(source, /sandboxBackfillAllowed/);
  assert.match(source, /get_user_role/);
  assert.match(source, /reconcileBooqableOrder/);
  assert.match(source, /trigger === "sandbox"|\"sandbox\"/);
  assert.doesNotMatch(source, new RegExp(["sync", "Booqable", "Order"].join("")));
  assert.match(source, /getUser\(/);
});

test("task page exposes a large Sync order from Booqable control", () => {
  const source = readSrc("app/workshop/_components/WorkshopTask.tsx");
  assert.match(source, /Sync order details from Booqable/);
  assert.match(source, /syncOrderFromBooqable/);
  assert.match(source, /tabletMode \? "large" : "medium"/);
});

test("workshop queue exposes next 7 days sync", () => {
  const source = readSrc("app/workshop/_components/WorkshopQueue.tsx");
  assert.match(source, /Sync next 7 days/);
  assert.doesNotMatch(source, /Sync all reserved/);
  assert.match(source, /startManualSync/);
  assert.doesNotMatch(source, /resumeManualSync/);
  assert.doesNotMatch(source, /Resume sync/);
  assert.match(source, /booqable_sync_runs/);
  assert.match(source, /Last full sync/);
});

test("next 7 days start walks reserved pages until done", () => {
  const manual = readSrc("lib/workshop/application/manual-sync.ts");
  const queue = readSrc("app/workshop/_components/WorkshopQueue.tsx");

  assert.match(manual, /if \(scope === "next_7_days"\)/);
  assert.match(manual, /return withStartedManualSync\(data, walkNext7DaysReservedPages\)/);
  assert.match(manual, /walkNext7DaysReservedPages/);
  assert.match(manual, /while \(hasMore\)/);
  assert.match(manual, /booqable_finish_sync_run/);
  assert.match(manual, /startLeaseRenewLoop/);
  assert.match(manual, /workshop_start_manual_sync/);
  assert.match(
    manual,
    /async function walkNext7DaysReservedPages[\s\S]*const nextCursor = pageFailed\s*\?\s*encodeSyncCursor\([\s\S]*?\)\s*:\s*null/,
  );
  assert.match(manual, /return continueManualSync\(data, scope, 1\)/);
  assert.doesNotMatch(queue, /resumeManualSync/);
  assert.match(
    queue,
    /if \(isPending \|\| \(health\.state === "in_progress" && !health\.cursor\)\) return/,
  );
  assert.match(queue, /if \(!result\.ok\) \{\s*setSyncError\([\s\S]*?\}\s*router\.refresh\(\)/);
});

test("webhook maps busy to 200 and other reconcile failures to 500", () => {
  assert.deepEqual(webhookDeliveryStatus({ allowed: false }), {
    status: 200,
    ignored: true,
  });
  assert.deepEqual(
    webhookDeliveryStatus({
      allowed: true,
      result: { ok: false, code: "SYNC_IN_PROGRESS" },
    }),
    { status: 200, ignored: false },
  );
  assert.deepEqual(
    webhookDeliveryStatus({
      allowed: true,
      result: { ok: false, code: "SOURCE_UNAVAILABLE" },
    }),
    { status: 500, ignored: false },
  );
  assert.deepEqual(webhookDeliveryStatus({ allowed: true, result: { ok: true } }), {
    status: 200,
    ignored: false,
  });

  const webhook = readSrc("app/api/webhooks/booqable/route.ts");
  assert.match(webhook, /webhookDeliveryStatus/);
  assert.match(webhook, /status: 401/);
  assert.match(webhook, /Unauthorized webhook attempt/);
  assert.match(webhook, /ignored: true/);
});

test("list sync fetches one reserved page of 50 and retries Retry-After", () => {
  const source = readSrc("lib/booqable/fetch-source-snapshot.ts");
  assert.match(source, /const LIST_PAGE_SIZE = 50/);
  assert.match(source, /const MAX_ATTEMPTS = 3/);
  assert.match(source, /filter\[status\]": "reserved"/);
  assert.match(source, /Retry-After/);
  assert.match(source, /page\[size\]/);
});

test("staff sync and per-task sync share reconcile and gate preview", () => {
  const manual = readSrc("lib/workshop/application/manual-sync.ts");
  const reconcile = readSrc("lib/workshop/application/reconcile-order.ts");
  assert.match(manual, /workshopSyncAllowed\(\)/);
  assert.match(manual, /SOURCE_UNAVAILABLE/);
  assert.match(manual, /reconcileBooqableOrder\(booqableOrderId, "task"/);
  assert.match(manual, /reconcileBooqableOrder\(order\.id, "manual"/);
  assert.match(reconcile, /trigger === "sandbox"/);
  assert.match(reconcile, /snapshot\.sourceStatus === "reserved"/);
  assert.match(reconcile, /booqable_release_order_lease/);
  assert.match(reconcile, /ORDER_LEASE_TTL_MS = 2 \* 60 \* 1000/);
});

test("sandbox denies mechanic and partner and redirects anonymous", () => {
  const source = readSrc("app/api/sandbox/booqable/sync-orders/route.ts");
  assert.match(
    source,
    /redirect\("\/login\?next=\/api\/sandbox\/booqable\/sync-orders"\)/,
  );
  assert.match(source, /role !== "admin" && role !== "manager"/);
  assert.match(source, /code: "FORBIDDEN"/);
  assert.match(source, /sandboxBackfillAllowed/);
  assert.match(source, /fetchAllOrdersListPage/);
});

test("list document rejects missing data, bad rows, and empty pages with next", () => {
  const current = "https://example.test/api/4/orders?page=1";
  const row = {
    id: "ord-1",
    attributes: { status: "reserved", number: 1, starts_at: "2026-08-24T10:00:00Z" },
  };
  assert.deepEqual(parseOrderListDocument({ data: [row] }, current).orders[0]?.id, "ord-1");
  assert.throws(() => parseOrderListDocument({ data: { id: "ord-1" } }, current));
  assert.throws(() => parseOrderListDocument({ data: [{ attributes: {} }] }, current));
  assert.throws(() => parseOrderListDocument({ data: [row], included: {} }, current));
  assert.throws(() =>
    parseOrderListDocument(
      { data: [], links: { next: "https://example.test/api/4/orders?page=2" } },
      current,
    ),
  );
});

test("task page keeps Sync on the cancelled tombstone and shows inline errors", () => {
  const source = readSrc("app/workshop/_components/WorkshopTask.tsx");
  assert.match(source, /isTombstone = task\.status === "cancelled"/);
  assert.match(source, /\{syncButton\}/);
  assert.match(source, /commandError \?/);
  assert.match(source, /variant="error"/);
});
