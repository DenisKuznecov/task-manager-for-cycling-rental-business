import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

const root = new URL("../../../../", import.meta.url);
const envPath = new URL(".env.local", root);
const outputPath = new URL("live-evidence.json", import.meta.url);
const fullScan = process.argv.includes("--full");
const sampleSize = fullScan ? Number.POSITIVE_INFINITY : 3;
const pageSize = 50;

function parseEnv(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

function hashId(value) {
  if (!value) return null;
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 12);
}

function resourceShape(resource) {
  return {
    type: resource?.type ?? null,
    id_present: Boolean(resource?.id),
    attribute_keys: Object.keys(resource?.attributes ?? {}).sort(),
    relationship_keys: Object.keys(resource?.relationships ?? {}).sort(),
  };
}

function mergeShape(target, resource) {
  if (!resource?.type) return;
  const current = target.get(resource.type) ?? {
    type: resource.type,
    observed_count: 0,
    id_present: false,
    attribute_keys: new Set(),
    relationship_keys: new Set(),
    sample_id_hashes: new Set(),
  };
  const shape = resourceShape(resource);
  current.observed_count += 1;
  current.id_present ||= shape.id_present;
  for (const key of shape.attribute_keys) current.attribute_keys.add(key);
  for (const key of shape.relationship_keys) current.relationship_keys.add(key);
  if (resource.id && current.sample_id_hashes.size < 3) {
    current.sample_id_hashes.add(hashId(resource.id));
  }
  target.set(resource.type, current);
}

function serializeShapes(shapes) {
  return [...shapes.values()]
    .map((shape) => ({
      ...shape,
      attribute_keys: [...shape.attribute_keys].sort(),
      relationship_keys: [...shape.relationship_keys].sort(),
      sample_id_hashes: [...shape.sample_id_hashes],
    }))
    .sort((a, b) => a.type.localeCompare(b.type));
}

const env = parseEnv(await readFile(envPath, "utf8"));
const slug = env.BOOQABLE_COMPANY_SLUG;
const apiKey = env.BOOQABLE_API_KEY;
if (!slug || !apiKey) {
  throw new Error("Required Booqable credentials are missing from .env.local");
}

const baseUrl = `https://${slug}.booqable.com/api/4`;
const metrics = {
  request_count: 0,
  retry_count: 0,
  rate_limit_count: 0,
  response_ms: [],
};

async function getJson(path, { allowFailure = false } = {}) {
  if (!path.startsWith("/")) throw new Error("Only relative GET paths are allowed");
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const started = performance.now();
    metrics.request_count += 1;
    const response = await fetch(`${baseUrl}${path}`, {
      method: "GET",
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });
    metrics.response_ms.push(Math.round(performance.now() - started));
    if (response.status === 429 && attempt < maxAttempts) {
      metrics.rate_limit_count += 1;
      metrics.retry_count += 1;
      const delay = Math.min(8_000, 500 * 2 ** (attempt - 1));
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    if (!response.ok) {
      const result = { ok: false, status: response.status };
      if (allowFailure) return result;
      throw new Error(`Booqable GET ${path.split("?")[0]} failed: ${response.status}`);
    }
    return { ok: true, status: response.status, body: await response.json() };
  }
  throw new Error(`Booqable GET ${path.split("?")[0]} exhausted retries`);
}

async function listAll(resource) {
  const rows = [];
  const pageObservations = [];
  for (let page = 1; page <= 100; page += 1) {
    const query = new URLSearchParams({
      "page[number]": String(page),
      "page[size]": String(pageSize),
    });
    const result = await getJson(`/${resource}?${query}`);
    const data = Array.isArray(result.body?.data) ? result.body.data : [];
    pageObservations.push({
      page,
      count: data.length,
      meta_keys: Object.keys(result.body?.meta ?? {}).sort(),
      links_keys: Object.keys(result.body?.links ?? {}).sort(),
    });
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return { rows, pageObservations };
}

const startedAt = new Date().toISOString();
const started = performance.now();
const shapes = new Map();
const ordersResult = await listAll("orders");
for (const order of ordersResult.rows) mergeShape(shapes, order);

const statusCounts = {};
let archivedOrderCount = 0;
for (const order of ordersResult.rows) {
  const status = order.attributes?.status ?? "unknown";
  statusCounts[status] = (statusCounts[status] ?? 0) + 1;
  if (order.attributes?.archived_at || order.attributes?.archived) {
    archivedOrderCount += 1;
  }
}

const selectedOrders = ordersResult.rows.slice(0, sampleSize);
const detailObservations = [];
const assignmentKeys = new Set();
const assignedStockItemKeys = new Set();
let ordersWithAssignments = 0;
let ordersWithoutAssignments = 0;
let assignmentRowsMissingStockItemId = 0;
let assignedStockItemsWithIdentifier = 0;
let assignedStockItemsWithoutIdentifier = 0;

const include =
  "customer,lines.planning.stock_item_plannings.stock_item.barcode";

for (const order of selectedOrders) {
  const query = new URLSearchParams({ include });
  const result = await getJson(`/orders/${order.id}?${query}`);
  const primary = result.body?.data;
  const included = Array.isArray(result.body?.included)
    ? result.body.included
    : [];
  mergeShape(shapes, primary);
  for (const resource of included) mergeShape(shapes, resource);

  const assignments = included.filter(
    (resource) => resource.type === "stock_item_plannings",
  );
  const stockItems = new Map(
    included
      .filter((resource) => resource.type === "stock_items")
      .map((resource) => [resource.id, resource]),
  );
  if (assignments.length > 0) ordersWithAssignments += 1;
  else ordersWithoutAssignments += 1;

  let exactAssignments = 0;
  let missingAssignments = 0;
  for (const assignment of assignments) {
    const stockItemId =
      assignment.attributes?.stock_item_id ??
      assignment.relationships?.stock_item?.data?.id ??
      null;
    if (!stockItemId) {
      assignmentRowsMissingStockItemId += 1;
      missingAssignments += 1;
      continue;
    }
    exactAssignments += 1;
    assignmentKeys.add(assignment.id);
    assignedStockItemKeys.add(stockItemId);
    const stockItem = stockItems.get(stockItemId);
    const identifier = stockItem?.attributes?.identifier;
    if (identifier) assignedStockItemsWithIdentifier += 1;
    else assignedStockItemsWithoutIdentifier += 1;
  }

  detailObservations.push({
    order_id_hash: hashId(order.id),
    status: primary?.attributes?.status ?? order.attributes?.status ?? "unknown",
    archived: Boolean(
      primary?.attributes?.archived_at ??
        primary?.attributes?.archived ??
        order.attributes?.archived_at ??
        order.attributes?.archived,
    ),
    included_types: [...new Set(included.map((item) => item.type))].sort(),
    exact_assignment_count: exactAssignments,
    assignment_rows_missing_stock_item_id: missingAssignments,
  });
}

const collectionResources = [
  "customers",
  "product_groups",
  "products",
  "bundles",
  "bundle_items",
  "stock_items",
  "plannings",
  "stock_item_plannings",
];
const collectionProbes = [];
for (const resource of collectionResources) {
  const query = new URLSearchParams({
    "page[number]": "1",
    "page[size]": "1",
  });
  const result = await getJson(`/${resource}?${query}`, { allowFailure: true });
  const first = result.ok && Array.isArray(result.body?.data)
    ? result.body.data[0]
    : null;
  if (first) mergeShape(shapes, first);
  collectionProbes.push({
    resource,
    supported: result.ok,
    status: result.status,
    first_resource_shape: first ? resourceShape(first) : null,
    meta_keys:
      result.ok && result.body?.meta
        ? Object.keys(result.body.meta).sort()
        : [],
  });
}

const sortedResponseMs = [...metrics.response_ms].sort((a, b) => a - b);
const percentile = (p) => {
  if (sortedResponseMs.length === 0) return null;
  const index = Math.min(
    sortedResponseMs.length - 1,
    Math.floor(sortedResponseMs.length * p),
  );
  return sortedResponseMs[index];
};

const report = {
  generated_at: new Date().toISOString(),
  mode: fullScan ? "full" : "sample",
  safety: {
    methods_used: ["GET"],
    raw_payloads_persisted: false,
    customer_pii_persisted: false,
    source_ids_persisted_as_sha256_prefixes: true,
  },
  orders: {
    list_count: ordersResult.rows.length,
    status_counts: statusCounts,
    archived_attribute_count: archivedOrderCount,
    pages: ordersResult.pageObservations,
    detail_scan_count: selectedOrders.length,
    orders_with_assignment_rows: ordersWithAssignments,
    orders_without_assignment_rows: ordersWithoutAssignments,
  },
  assignments: {
    exact_assignment_rows: assignmentKeys.size,
    unique_assigned_stock_items: assignedStockItemKeys.size,
    rows_missing_stock_item_id: assignmentRowsMissingStockItemId,
    assigned_stock_item_occurrences_with_identifier:
      assignedStockItemsWithIdentifier,
    assigned_stock_item_occurrences_without_identifier:
      assignedStockItemsWithoutIdentifier,
    note:
      "Counts cover observed stock-item assignments. Bike-only classification requires a verified Product/ProductGroup mapping and is not inferred from titles.",
  },
  order_details: detailObservations,
  collection_probes: collectionProbes,
  observed_resource_shapes: serializeShapes(shapes),
  runtime: {
    started_at: startedAt,
    elapsed_ms: Math.round(performance.now() - started),
    request_count: metrics.request_count,
    retry_count: metrics.retry_count,
    rate_limit_count: metrics.rate_limit_count,
    response_ms_p50: percentile(0.5),
    response_ms_p95: percentile(0.95),
    response_ms_max: sortedResponseMs.at(-1) ?? null,
  },
};

await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify({
    ok: true,
    mode: report.mode,
    orders: report.orders.list_count,
    details: report.orders.detail_scan_count,
    assignments: report.assignments.exact_assignment_rows,
    requests: report.runtime.request_count,
    elapsed_ms: report.runtime.elapsed_ms,
    output: outputPath.pathname,
  }),
);
