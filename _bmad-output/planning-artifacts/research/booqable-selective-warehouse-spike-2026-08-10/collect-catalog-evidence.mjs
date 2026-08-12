import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

const root = new URL("../../../../", import.meta.url);
const outputPath = new URL("catalog-evidence.json", import.meta.url);

function parseEnv(text) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        const key = line.slice(0, separator);
        let value = line.slice(separator + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        return [key, value];
      }),
  );
}

function hashId(value) {
  return value
    ? createHash("sha256").update(String(value)).digest("hex").slice(0, 12)
    : null;
}

const env = parseEnv(await readFile(new URL(".env.local", root), "utf8"));
const slug = env.BOOQABLE_COMPANY_SLUG;
const apiKey = env.BOOQABLE_API_KEY;
if (!slug || !apiKey) throw new Error("Missing Booqable credentials");

const baseUrl = `https://${slug}.booqable.com/api/4`;
let requestCount = 0;
let retryCount = 0;
const responseMs = [];

async function getPage(resource, page) {
  const query = new URLSearchParams({
    "page[number]": String(page),
    "page[size]": "50",
  });
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const started = performance.now();
    requestCount += 1;
    const response = await fetch(`${baseUrl}/${resource}?${query}`, {
      method: "GET",
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
    });
    responseMs.push(Math.round(performance.now() - started));
    if (response.status === 429 && attempt < 4) {
      retryCount += 1;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(8_000, 500 * 2 ** (attempt - 1))),
      );
      continue;
    }
    if (!response.ok) {
      throw new Error(`GET /${resource} failed with ${response.status}`);
    }
    return response.json();
  }
  throw new Error(`GET /${resource} exhausted retries`);
}

async function listAll(resource) {
  const rows = [];
  for (let page = 1; page <= 100; page += 1) {
    const payload = await getPage(resource, page);
    const data = Array.isArray(payload?.data) ? payload.data : [];
    rows.push(...data);
    if (data.length < 50) break;
  }
  return rows;
}

const started = performance.now();
const [
  productGroups,
  products,
  stockItems,
  stockItemPlannings,
  bundles,
  bundleItems,
  orders,
  plannings,
] = await Promise.all([
  listAll("product_groups"),
  listAll("products"),
  listAll("stock_items"),
  listAll("stock_item_plannings"),
  listAll("bundles"),
  listAll("bundle_items"),
  listAll("orders"),
  listAll("plannings"),
]);

const productsById = new Map(products.map((item) => [item.id, item]));
const stockItemsById = new Map(stockItems.map((item) => [item.id, item]));
const ordersById = new Map(orders.map((item) => [item.id, item]));
const assignedStockItemIds = new Set(
  stockItemPlannings
    .map((item) => item.attributes?.stock_item_id)
    .filter(Boolean),
);

const groupSummaries = productGroups
  .map((group) => {
    const groupProducts = products.filter(
      (product) => product.attributes?.product_group_id === group.id,
    );
    const groupProductIds = new Set(groupProducts.map((product) => product.id));
    const groupStockItems = stockItems.filter(
      (stockItem) =>
        stockItem.attributes?.product_group_id === group.id ||
        groupProductIds.has(stockItem.attributes?.product_id),
    );
    return {
      group_id_hash: hashId(group.id),
      name: group.attributes?.name ?? null,
      group_name: group.attributes?.group_name ?? null,
      product_type: group.attributes?.product_type ?? null,
      trackable: group.attributes?.trackable ?? null,
      tracking_type: group.attributes?.tracking_type ?? null,
      archived: Boolean(
        group.attributes?.archived || group.attributes?.archived_at,
      ),
      product_count: groupProducts.length,
      stock_item_count: groupStockItems.length,
      stock_items_with_identifier: groupStockItems.filter(
        (item) => Boolean(item.attributes?.identifier),
      ).length,
      assigned_stock_item_count: groupStockItems.filter((item) =>
        assignedStockItemIds.has(item.id),
      ).length,
    };
  })
  .sort((a, b) =>
    String(a.name ?? a.group_name).localeCompare(String(b.name ?? b.group_name)),
  );

const explicitNonBikeTrackableGroups = new Set([
  "Bike case B&W bike box II",
  "Lock ",
  "Support Van",
]);
const candidateBikeGroups = productGroups.filter((group) => {
  const attrs = group.attributes ?? {};
  return (
    attrs.product_type === "rental" &&
    attrs.trackable === true &&
    !explicitNonBikeTrackableGroups.has(attrs.name)
  );
});
const candidateBikeGroupIds = new Set(candidateBikeGroups.map((item) => item.id));
const candidateBikeProductIds = new Set(
  products
    .filter((item) =>
      candidateBikeGroupIds.has(item.attributes?.product_group_id),
    )
    .map((item) => item.id),
);
const candidateBikeStockItems = stockItems.filter(
  (item) =>
    candidateBikeGroupIds.has(item.attributes?.product_group_id) ||
    candidateBikeProductIds.has(item.attributes?.product_id),
);
const candidateBikeStockItemIds = new Set(
  candidateBikeStockItems.map((item) => item.id),
);
const candidateBikePlannings = plannings.filter((item) =>
  candidateBikeProductIds.has(item.attributes?.item_id),
);
const candidateBikePlanningIds = new Set(
  candidateBikePlannings.map((item) => item.id),
);
const candidateBikeAssignmentRows = stockItemPlannings.filter(
  (item) =>
    candidateBikeStockItemIds.has(item.attributes?.stock_item_id) ||
    candidateBikePlanningIds.has(item.attributes?.planning_id),
);
const candidateBikeAssignmentsByPlanning = new Map();
for (const assignment of candidateBikeAssignmentRows) {
  const planningId = assignment.attributes?.planning_id;
  if (!planningId) continue;
  const current = candidateBikeAssignmentsByPlanning.get(planningId) ?? 0;
  candidateBikeAssignmentsByPlanning.set(planningId, current + 1);
}

const bikeCoverageByOrderStatus = {};
let expectedBikeUnits = 0;
let exactBikeAssignments = 0;
let unknownBikeAssignments = 0;
const ordersWithBikePlanning = new Set();
const ordersWithExactBikeAssignment = new Set();
for (const planning of candidateBikePlannings) {
  const attrs = planning.attributes ?? {};
  const quantity = Number.isFinite(Number(attrs.quantity))
    ? Math.max(0, Number(attrs.quantity))
    : 0;
  const assignments = candidateBikeAssignmentsByPlanning.get(planning.id) ?? 0;
  const exact = Math.min(quantity, assignments);
  const unknown = Math.max(0, quantity - assignments);
  const order = ordersById.get(attrs.order_id);
  const status = order?.attributes?.status ?? "unknown";
  const current = bikeCoverageByOrderStatus[status] ?? {
    planning_rows: 0,
    expected_units: 0,
    exact_assignments: 0,
    unknown_assignments: 0,
  };
  current.planning_rows += 1;
  current.expected_units += quantity;
  current.exact_assignments += exact;
  current.unknown_assignments += unknown;
  bikeCoverageByOrderStatus[status] = current;
  expectedBikeUnits += quantity;
  exactBikeAssignments += exact;
  unknownBikeAssignments += unknown;
  if (attrs.order_id) ordersWithBikePlanning.add(attrs.order_id);
  if (attrs.order_id && exact > 0) ordersWithExactBikeAssignment.add(attrs.order_id);
}

const assignmentStatusCounts = {};
let assignmentRowsWithCompleteKeys = 0;
let assignmentRowsMissingKeys = 0;
let assignmentRowsWithKnownStockItem = 0;
let assignmentRowsWithIdentifier = 0;
for (const assignment of stockItemPlannings) {
  const attrs = assignment.attributes ?? {};
  const status = attrs.status ?? "unknown";
  assignmentStatusCounts[status] = (assignmentStatusCounts[status] ?? 0) + 1;
  const complete = Boolean(
    assignment.id &&
      attrs.order_id &&
      attrs.planning_id &&
      attrs.stock_item_id,
  );
  if (complete) assignmentRowsWithCompleteKeys += 1;
  else assignmentRowsMissingKeys += 1;
  const stockItem = stockItemsById.get(attrs.stock_item_id);
  if (stockItem) assignmentRowsWithKnownStockItem += 1;
  if (stockItem?.attributes?.identifier) assignmentRowsWithIdentifier += 1;
}

const productGroupIds = new Set(productGroups.map((item) => item.id));
const productRowsWithKnownGroup = products.filter((product) =>
  productGroupIds.has(product.attributes?.product_group_id),
).length;
const stockRowsWithKnownProduct = stockItems.filter((stockItem) =>
  productsById.has(stockItem.attributes?.product_id),
).length;

const report = {
  generated_at: new Date().toISOString(),
  safety: {
    methods_used: ["GET"],
    customer_data_requested: false,
    raw_payloads_persisted: false,
    opaque_ids_persisted_as_sha256_prefixes: true,
    product_group_labels_persisted:
      "Catalog labels are retained to support a one-time deterministic workshop classification; they are not used to infer physical-bike identity.",
  },
  collection_counts: {
    product_groups: productGroups.length,
    products: products.length,
    stock_items: stockItems.length,
    stock_item_plannings: stockItemPlannings.length,
    bundles: bundles.length,
    bundle_items: bundleItems.length,
    orders: orders.length,
    plannings: plannings.length,
  },
  relationship_coverage: {
    products_with_known_product_group: productRowsWithKnownGroup,
    stock_items_with_known_product: stockRowsWithKnownProduct,
    stock_items_with_known_product_group: stockItems.filter((item) =>
      productGroupIds.has(item.attributes?.product_group_id),
    ).length,
    archived_stock_items: stockItems.filter(
      (item) => item.attributes?.archived || item.attributes?.archived_at,
    ).length,
    stock_items_with_identifier: stockItems.filter((item) =>
      Boolean(item.attributes?.identifier),
    ).length,
    assignment_rows_with_complete_keys: assignmentRowsWithCompleteKeys,
    assignment_rows_missing_keys: assignmentRowsMissingKeys,
    assignment_rows_with_known_stock_item: assignmentRowsWithKnownStockItem,
    assignment_rows_with_stock_identifier: assignmentRowsWithIdentifier,
  },
  assignment_status_counts: assignmentStatusCounts,
  candidate_bike_classification: {
    status:
      "Analyst candidate only; production must store an explicit stable ProductGroup allowlist approved by the business.",
    rule:
      "Trackable rental ProductGroups with stock, excluding the explicitly observed non-bike groups Bike case B&W bike box II, Lock, and Support Van. Labels classify a stable group once and are never used to infer assignment identity.",
    candidate_group_count: candidateBikeGroups.length,
    candidate_group_id_hashes: candidateBikeGroups.map((item) => hashId(item.id)),
    candidate_stock_item_count: candidateBikeStockItems.length,
    candidate_stock_items_with_identifier: candidateBikeStockItems.filter(
      (item) => Boolean(item.attributes?.identifier),
    ).length,
  },
  historical_bike_assignment_coverage: {
    candidate_bike_planning_rows: candidateBikePlannings.length,
    orders_with_candidate_bike_planning: ordersWithBikePlanning.size,
    orders_with_at_least_one_exact_bike_assignment:
      ordersWithExactBikeAssignment.size,
    expected_bike_units: expectedBikeUnits,
    exact_assignment_units: exactBikeAssignments,
    explicit_unknown_units: unknownBikeAssignments,
    exact_coverage_percentage:
      expectedBikeUnits > 0
        ? Number(((exactBikeAssignments / expectedBikeUnits) * 100).toFixed(1))
        : null,
    exact_assignment_rows: candidateBikeAssignmentRows.length,
    unique_assigned_candidate_bikes: new Set(
      candidateBikeAssignmentRows
        .map((item) => item.attributes?.stock_item_id)
        .filter(Boolean),
    ).size,
    by_order_status: bikeCoverageByOrderStatus,
  },
  product_groups: groupSummaries,
  bundle_relationship_shape: {
    bundles_with_id: bundles.filter((item) => Boolean(item.id)).length,
    bundle_items_with_bundle_and_target: bundleItems.filter(
      (item) =>
        item.id &&
        item.attributes?.bundle_id &&
        (item.attributes?.product_id || item.attributes?.product_group_id),
    ).length,
  },
  runtime: {
    elapsed_ms: Math.round(performance.now() - started),
    request_count: requestCount,
    retry_count: retryCount,
    response_ms_max: Math.max(...responseMs),
  },
};

await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify({
    ok: true,
    groups: productGroups.length,
    products: products.length,
    stock_items: stockItems.length,
    assignments: stockItemPlannings.length,
    requests: requestCount,
    elapsed_ms: report.runtime.elapsed_ms,
    output: outputPath.pathname,
  }),
);
