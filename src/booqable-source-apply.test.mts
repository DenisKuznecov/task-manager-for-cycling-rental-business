import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  InvalidSourceSnapshotError,
  parseSourceOrderSnapshot,
} from "./lib/booqable/parse-source-snapshot.ts";
import { SourceOrderSnapshotV1Schema } from "./lib/workshop/domain/source-snapshot.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = join(root, "src");

function loadFixture(): unknown {
  return JSON.parse(
    readFileSync(
      join(srcRoot, "lib/booqable/fixtures/source-order-snapshot-v1.json"),
      "utf8",
    ),
  );
}

function cloneFixture(): {
  data: {
    id: string;
    type: string;
    relationships?: {
      customer?: { data?: { id: string; type: string } | null };
      lines?: { data?: Array<{ id: string; type: string }> | null };
    };
    attributes?: Record<string, unknown>;
  };
  included: Array<Record<string, unknown>>;
  links?: unknown;
} {
  return JSON.parse(JSON.stringify(loadFixture()));
}

function omitIncluded(payload: { included: Array<Record<string, unknown>> }, id: string) {
  payload.included = payload.included.filter((entry) => entry.id !== id);
}

function collectTsFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(path));
    } else if (entry.name.endsWith(".ts")) {
      files.push(path);
    }
  }
  return files;
}

const FORBIDDEN_IMPORT =
  /from\s+["'](?:next(?:\/|$)|@supabase\/|.*\bbooqable\b)/;

test("fixture parses to SourceOrderSnapshotV1 with identified road assignment", () => {
  const snapshot = parseSourceOrderSnapshot(loadFixture(), "2026-08-21T14:00:00.000Z");
  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.fetchedAt, "2026-08-21T14:00:00.000Z");
  assert.equal(snapshot.sourceStatus, "reserved");
  assert.equal(snapshot.order.booqableOrderId, "order-fixture-v1");
  assert.equal(snapshot.order.orderNumber, 344);
  assert.equal(snapshot.order.mapsLinkOrder, "https://maps.example.test/order-fixture-v1");
  assert.equal(snapshot.order.partnerPromo, null);
  assert.equal(snapshot.customer?.booqableCustomerId, "customer-fixture-v1");
  assert.equal(snapshot.customer?.birthday, "1990-05-17");
  assert.equal(snapshot.coupon, null);
  assert.equal(snapshot.lines.length, 4);

  const mount = snapshot.lines.find((line) => line.booqableLineId === "line-mount");
  assert.equal(mount?.quantity, 0);

  assert.equal(snapshot.assignments.length, 1);
  const assignment = snapshot.assignments[0];
  assert.equal(assignment.stockItemId, "stock-road-1");
  assert.equal(assignment.sipId, "sip-road-1");
  assert.equal(assignment.displayId, "RF89RIVXL-2");
  assert.equal(assignment.title, "Focus IZALCO");
  assert.deepEqual(assignment.workshopTags, ["workshop-road-bike"]);
  assert.equal(
    snapshot.assignments.some((row) =>
      row.workshopTags.includes("workshop-road-bike-bundle"),
    ),
    false,
  );
  assert.equal("id" in assignment, false);
  assert.equal(SourceOrderSnapshotV1Schema.safeParse(snapshot).success, true);
});

test("unidentified sibling is omitted from assignments", () => {
  const payload = cloneFixture();
  payload.data.relationships?.lines?.data?.push({
    id: "line-unidentified",
    type: "lines",
  });
  payload.included.push({
    id: "line-unidentified",
    type: "lines",
    attributes: {
      item_id: "product-unidentified",
      parent_line_id: null,
      title: "Unidentified gravel",
      quantity: 1,
      line_type: "charge",
      position: 5,
      relevant: true,
    },
    relationships: {
      planning: { data: { id: "planning-unidentified", type: "plannings" } },
      item: { data: { id: "product-unidentified", type: "products" } },
    },
  });
  payload.included.push({
    id: "planning-unidentified",
    type: "plannings",
    attributes: {},
    relationships: { stock_item_plannings: { data: [] } },
  });
  payload.included.push({
    id: "product-unidentified",
    type: "products",
    attributes: { tag_list: ["workshop-gravel-bike"] },
  });

  const snapshot = parseSourceOrderSnapshot(payload, "2026-08-21T14:00:00.000Z");
  assert.equal(snapshot.assignments.length, 1);
  assert.equal(snapshot.assignments[0].stockItemId, "stock-road-1");
  assert.equal(
    snapshot.lines.some((line) => line.booqableLineId === "line-unidentified"),
    true,
  );
});

test("links.next without extra pages is INVALID_SNAPSHOT", () => {
  const payload = cloneFixture();
  payload.links = { next: "https://example.test/api/4/orders?page=2" };
  assert.throws(
    () => parseSourceOrderSnapshot(payload, "2026-08-21T14:00:00.000Z"),
    InvalidSourceSnapshotError,
  );
});

test("links.next href object is INVALID_SNAPSHOT", () => {
  const payload = cloneFixture();
  payload.links = { next: { href: "https://example.test/page=2" } };
  assert.throws(
    () => parseSourceOrderSnapshot(payload, "2026-08-21T14:00:00.000Z"),
    InvalidSourceSnapshotError,
  );
});

test("string false relevant is INVALID_SNAPSHOT", () => {
  const payload = cloneFixture();
  const bike = payload.included.find((entry) => entry.id === "line-bike");
  assert.ok(bike);
  bike.attributes = { ...(bike.attributes as object), relevant: "false" };
  assert.throws(
    () => parseSourceOrderSnapshot(payload, "2026-08-21T14:00:00.000Z"),
    InvalidSourceSnapshotError,
  );
});

test("omitted order.relationships.lines is INVALID_SNAPSHOT", () => {
  const payload = cloneFixture();
  assert.ok(payload.data.relationships);
  delete payload.data.relationships.lines;
  assert.throws(
    () => parseSourceOrderSnapshot(payload, "2026-08-21T14:00:00.000Z"),
    InvalidSourceSnapshotError,
  );
});

test("extra included line not in relationships.lines is ignored", () => {
  const payload = cloneFixture();
  payload.included.push({
    id: "line-extra-unrelated",
    type: "lines",
    attributes: {
      item_id: "product-extra-unrelated",
      title: "Unrelated extra",
      quantity: 1,
      relevant: true,
    },
    relationships: {
      planning: { data: { id: "planning-extra-unrelated", type: "plannings" } },
      item: { data: { id: "product-extra-unrelated", type: "products" } },
    },
  });
  payload.included.push({
    id: "planning-extra-unrelated",
    type: "plannings",
    attributes: {},
    relationships: {
      stock_item_plannings: {
        data: [{ id: "sip-extra-unrelated", type: "stock_item_plannings" }],
      },
    },
  });
  payload.included.push({
    id: "sip-extra-unrelated",
    type: "stock_item_plannings",
    attributes: {},
    relationships: {
      stock_item: { data: { id: "stock-extra-unrelated", type: "stock_items" } },
    },
  });
  payload.included.push({
    id: "stock-extra-unrelated",
    type: "stock_items",
    attributes: { identifier: "XX-1" },
  });
  payload.included.push({
    id: "product-extra-unrelated",
    type: "products",
    attributes: { tag_list: ["workshop-road-bike"] },
  });

  const snapshot = parseSourceOrderSnapshot(payload, "2026-08-21T14:00:00.000Z");
  assert.equal(
    snapshot.lines.some((line) => line.booqableLineId === "line-extra-unrelated"),
    false,
  );
  assert.equal(snapshot.assignments.length, 1);
  assert.equal(snapshot.assignments[0].stockItemId, "stock-road-1");
});

test("missing order data is INVALID_SNAPSHOT", () => {
  assert.throws(
    () => parseSourceOrderSnapshot({ included: [] }, "2026-08-21T14:00:00.000Z"),
    InvalidSourceSnapshotError,
  );
});

test("dangling includes are INVALID_SNAPSHOT", () => {
  const cases = [
    { id: "customer-fixture-v1", label: "customer" },
    { id: "product-road", label: "item product" },
    { id: "planning-bike", label: "planning" },
    { id: "sip-road-1", label: "SIP" },
    { id: "stock-road-1", label: "stock_item" },
  ];
  for (const { id, label } of cases) {
    const payload = cloneFixture();
    omitIncluded(payload, id);
    assert.throws(
      () => parseSourceOrderSnapshot(payload, "2026-08-21T14:00:00.000Z"),
      InvalidSourceSnapshotError,
      `omitting ${label} include must throw`,
    );
  }
});

test("parser output keys match SQL snapshot keys", () => {
  const snapshot = parseSourceOrderSnapshot(loadFixture(), "2026-08-21T14:00:00.000Z");
  const required = [
    "schemaVersion",
    "sourceStatus",
    "assignments",
    "lines",
    "customer",
    "order",
    "coupon",
  ];
  for (const key of required) {
    assert.equal(key in snapshot, true, `envelope missing ${key}`);
  }
  assert.equal("startsAt" in snapshot.order, true);
  assert.ok(snapshot.customer);
  assert.equal("booqableCustomerId" in snapshot.customer, true);
  const line = snapshot.lines[0];
  assert.equal("booqableLineId" in line, true);
  assert.equal("parentBooqableLineId" in line, true);
  assert.equal("quantity" in line, true);
  const assignment = snapshot.assignments[0];
  for (const key of ["sipId", "stockItemId", "displayId", "title", "workshopTags"]) {
    assert.equal(key in assignment, true, `assignment missing ${key}`);
  }

  const schemaSource = readFileSync(
    join(srcRoot, "lib/workshop/domain/source-snapshot.ts"),
    "utf8",
  );
  const zodKeys = new Set(
    [...schemaSource.matchAll(/^\s{2}(\w+):/gm)].map((match) => match[1]),
  );
  const sql = readFileSync(
    join(root, "supabase/migrations/20260821160000_workshop_source_apply.sql"),
    "utf8",
  );
  const sqlSnapshotKeys = new Set<string>();
  for (const match of sql.matchAll(
    /p_snapshot((?:->'[^']+')*)(?:->>'([^']+)')?/g,
  )) {
    for (const step of match[1].matchAll(/->'([^']+)'/g)) {
      sqlSnapshotKeys.add(step[1]);
    }
    if (match[2]) sqlSnapshotKeys.add(match[2]);
  }
  const validationOnly = new Set(["links", "next"]);
  for (const key of sqlSnapshotKeys) {
    if (validationOnly.has(key)) continue;
    assert.equal(
      zodKeys.has(key),
      true,
      `SQL snapshot key ${key} is not defined on the Zod contract`,
    );
  }
});

test("domain module does not export the parser", () => {
  const source = readFileSync(
    join(srcRoot, "lib/workshop/domain/index.ts"),
    "utf8",
  );
  assert.doesNotMatch(source, /parseSourceOrderSnapshot/);
  assert.doesNotMatch(source, /parse-source-snapshot/);
  assert.match(source, /SourceOrderSnapshotV1Schema/);
  assert.equal(typeof SourceOrderSnapshotV1Schema.parse, "function");
});

test("workshop domain imports neither Next.js, Supabase, nor Booqable", () => {
  const domainDir = join(srcRoot, "lib/workshop/domain");
  for (const file of collectTsFiles(domainDir)) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      FORBIDDEN_IMPORT,
      `${file} must not import Next.js, Supabase, or Booqable`,
    );
  }
});

test("parser does not import Next.js or write a database", () => {
  const source = readFileSync(
    join(srcRoot, "lib/booqable/parse-source-snapshot.ts"),
    "utf8",
  );
  assert.doesNotMatch(source, /from\s+["']next(?:\/|$)/);
  assert.doesNotMatch(source, /from\s+["']@supabase\//);
  assert.doesNotMatch(source, /\.from\(/);
  assert.doesNotMatch(source, /createClient/);
});
