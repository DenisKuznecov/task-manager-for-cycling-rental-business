import { createHash } from "node:crypto";
import {
  QUANTITY_ONE_UNIT_DISCRIMINATOR,
  SOURCE_ENVELOPE_SCHEMA_VERSION,
  SourceEnvelopeSchema,
  type CanonicalGraph,
  type MembershipProjection,
  type SourceEnvelope,
} from "@/src/lib/booqable/contracts";

/**
 * Nested-order include is the only contracted fetch path. Standalone
 * StockItem collections stay unverified and must not become the only read.
 */
export const CANONICAL_NESTED_ORDER_INCLUDE =
  "customer,coupon,lines.planning.stock_item_plannings.stock_item.barcode";
export const CANONICAL_ORDER_PROFILE_VERSION = "nested-order@v1";
export const CANONICAL_ADAPTER_PRODUCER_VERSION = "canonical-adapter@v1";

const GHOST_ORDER_STATUSES = new Set(["new", "concept"]);

type JsonApiResource = {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<
    string,
    { data?: { id: string; type: string } | { id: string; type: string }[] | null }
  >;
};

export type CanonicalOrderPayload = {
  data: JsonApiResource;
  included: JsonApiResource[];
};

export type CanonicalNormalizeResult =
  | { status: "discarded"; reason: "ghost" }
  | { status: "invalid"; issues: string[] }
  | {
      status: "normalized";
      envelope: SourceEnvelope;
      graph: CanonicalGraph;
      orderStatus: string;
    };

/**
 * Fetch the nested canonical graph. Webhook bodies stay signal-only;
 * this response is the authority the coordinator may apply.
 */
export async function fetchCanonicalOrder(
  booqableOrderId: string,
): Promise<CanonicalOrderPayload> {
  const slug = process.env.BOOQABLE_COMPANY_SLUG;
  const apiKey = process.env.BOOQABLE_API_KEY;
  if (!slug || !apiKey) {
    throw new Error(
      "Missing BOOQABLE_COMPANY_SLUG or BOOQABLE_API_KEY env var",
    );
  }

  const url = `https://${slug}.booqable.com/api/4/orders/${booqableOrderId}?include=${CANONICAL_NESTED_ORDER_INCLUDE}`;

  const MAX_ATTEMPTS = 3;
  let res: Response;
  for (let attempt = 1; ; attempt++) {
    res = await fetch(url, {
      headers: {
        Accept: "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (res.status !== 429 || attempt >= MAX_ATTEMPTS) break;
    await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Booqable API responded ${res.status} for order ${booqableOrderId}: ${body}`,
    );
  }

  const payload = (await res.json()) as {
    data?: JsonApiResource;
    included?: JsonApiResource[];
  };

  if (!payload.data) {
    throw new Error(
      `Booqable API returned no data for order ${booqableOrderId}`,
    );
  }

  return { data: payload.data, included: payload.included ?? [] };
}

/**
 * Normalize a nested-order payload into a versioned `order_graph`.
 * Ghost `new`/`concept` orders are discarded before any graph is built.
 */
export function normalizeCanonicalOrderPayload(
  payload: { data: JsonApiResource; included?: unknown },
  ingestedAt: string,
): CanonicalNormalizeResult {
  const attrs = payload.data.attributes ?? {};
  const orderStatus = asString(attrs.status) ?? "";
  if (GHOST_ORDER_STATUSES.has(orderStatus)) {
    return { status: "discarded", reason: "ghost" };
  }
  if (!orderStatus) {
    return {
      status: "invalid",
      issues: ["order status is required"],
    };
  }
  if (payload.included !== undefined && !Array.isArray(payload.included)) {
    return {
      status: "invalid",
      issues: ["included must be an array"],
    };
  }

  const included = (payload.included ?? []) as JsonApiResource[];
  const byType = (type: string) => included.filter((row) => row.type === type);
  const findIncluded = (type: string, id: string | null | undefined) =>
    id ? included.find((row) => row.type === type && row.id === id) : undefined;

  const orderId = payload.data.id;
  const orderVersion = sourceVersionOf(attrs, ingestedAt);
  const customerRef = relatedId(payload.data, "customer");
  const customer = findIncluded("customers", customerRef);
  const lineIds = relatedIds(payload.data, "lines");
  const lines = lineIds
    .map((id) => findIncluded("lines", id))
    .filter((row): row is JsonApiResource => Boolean(row));
  const reachablePlanningIds = new Set<string>();
  for (const line of lines) {
    const planningId = relatedId(line, "planning");
    if (planningId) {
      reachablePlanningIds.add(planningId);
    }
  }
  const plannings = byType("plannings").filter((resource) => {
    if (reachablePlanningIds.has(resource.id)) {
      return true;
    }
    const lineId =
      relatedId(resource, "line") ?? asString(resource.attributes?.line_id);
    return Boolean(lineId && lineIds.includes(lineId));
  });
  const planningIds = new Set(plannings.map((resource) => resource.id));
  const reachableSipIds = new Set<string>();
  for (const planning of plannings) {
    for (const sipId of relatedIds(planning, "stock_item_plannings")) {
      reachableSipIds.add(sipId);
    }
  }
  const stockItemPlannings = byType("stock_item_plannings").filter(
    (resource) => {
      if (reachableSipIds.has(resource.id)) {
        return true;
      }
      const planningId =
        relatedId(resource, "planning") ??
        asString(resource.attributes?.planning_id);
      return Boolean(planningId && planningIds.has(planningId));
    },
  );
  const reachableStockItemIds = new Set<string>();
  for (const sip of stockItemPlannings) {
    const stockItemId =
      relatedId(sip, "stock_item") ?? asString(sip.attributes?.stock_item_id);
    if (stockItemId) {
      reachableStockItemIds.add(stockItemId);
    }
  }
  const stockItems = byType("stock_items").filter((resource) =>
    reachableStockItemIds.has(resource.id),
  );
  const productGroups = byType("product_groups");
  const products = byType("products");
  const bundles = byType("bundles");
  const bundleItems = byType("bundle_items");

  const provenance = (resource: JsonApiResource) => ({
    source_version: sourceVersionOf(resource.attributes ?? {}, ingestedAt),
    source_updated_at: asUtc(resource.attributes?.updated_at) ?? ingestedAt,
    ingested_at: ingestedAt,
    source_lifecycle: "open" as const,
  });

  const graph: CanonicalGraph = {
    product_groups: productGroups.map((resource) => ({
      resource_type: "product_group" as const,
      external_id: resource.id,
      tag_list: tagListOf(resource),
      ...provenance(resource),
    })),
    products: products.map((resource) => ({
      resource_type: "product" as const,
      external_id: resource.id,
      product_group_external_id:
        relatedId(resource, "product_group") ??
        asString(resource.attributes?.product_group_id),
      tag_list: tagListOf(resource),
      ...provenance(resource),
    })),
    bundles: bundles.map((resource) => ({
      resource_type: "bundle" as const,
      external_id: resource.id,
      tag_list: tagListOf(resource),
      ...provenance(resource),
    })),
    bundle_items: bundleItems.map((resource) => ({
      resource_type: "bundle_item" as const,
      external_id: resource.id,
      bundle_external_id:
        relatedId(resource, "bundle") ??
        asString(resource.attributes?.bundle_id) ??
        resource.id,
      product_external_id:
        relatedId(resource, "product") ??
        asString(resource.attributes?.product_id),
      product_group_external_id:
        relatedId(resource, "product_group") ??
        asString(resource.attributes?.product_group_id),
      ...provenance(resource),
    })),
    stock_items: stockItems.map((resource) => ({
      resource_type: "stock_item" as const,
      external_id: resource.id,
      product_external_id:
        relatedId(resource, "product") ??
        asString(resource.attributes?.product_id),
      ...provenance(resource),
    })),
    plannings: plannings.map((resource) => ({
      resource_type: "planning" as const,
      external_id: resource.id,
      order_external_id:
        relatedId(resource, "order") ??
        asString(resource.attributes?.order_id) ??
        orderId,
      line_external_id:
        relatedId(resource, "line") ?? asString(resource.attributes?.line_id),
      ...provenance(resource),
    })),
    stock_item_plannings: stockItemPlannings.map((resource) => ({
      resource_type: "stock_item_planning" as const,
      external_id: resource.id,
      planning_external_id:
        relatedId(resource, "planning") ??
        asString(resource.attributes?.planning_id),
      stock_item_external_id:
        relatedId(resource, "stock_item") ??
        asString(resource.attributes?.stock_item_id),
      ...provenance(resource),
    })),
    memberships: [],
    predecessors: [],
  };

  const builtMemberships = buildMemberships(orderId, lines, graph, ingestedAt);
  if (builtMemberships.issues.length > 0) {
    return { status: "invalid", issues: builtMemberships.issues };
  }
  graph.memberships = builtMemberships.memberships;

  const resources: SourceEnvelope["resources"] = [
    {
      resource_type: "order",
      external_id: orderId,
      presence: "known",
      source_version: orderVersion,
      fingerprint_inputs: {
        status: orderStatus || null,
        starts_at: asString(attrs.starts_at),
        stops_at: asString(attrs.stops_at),
        customer_external_id: customerRef,
      },
    },
  ];

  if (customer) {
    resources.push({
      resource_type: "customer",
      external_id: customer.id,
      presence: "known",
      source_version: sourceVersionOf(customer.attributes ?? {}, ingestedAt),
      fingerprint_inputs: {
        name: asString(customer.attributes?.name),
        email: asString(customer.attributes?.email),
        phone: asString(
          (customer.attributes?.properties as Record<string, unknown> | undefined)
            ?.phone,
        ),
        birthday: asString(
          (customer.attributes?.properties as Record<string, unknown> | undefined)
            ?.birthday_date,
        ),
      },
    });
  }

  for (const line of lines) {
    resources.push({
      resource_type: "order_item",
      external_id: line.id,
      presence: "known",
      source_version: sourceVersionOf(line.attributes ?? {}, ingestedAt),
      fingerprint_inputs: {
        quantity: asFiniteNumber(line.attributes?.quantity),
        title: asString(line.attributes?.title),
        line_type: asString(line.attributes?.line_type),
        tag_list: tagListOf(line).join("\0") || null,
      },
    });
  }

  for (const stockItem of stockItems) {
    const barcodeId = relatedId(stockItem, "barcode");
    const barcode = findIncluded("barcodes", barcodeId);
    resources.push({
      resource_type: "stock_item",
      external_id: stockItem.id,
      presence: "known",
      source_version: sourceVersionOf(stockItem.attributes ?? {}, ingestedAt),
      fingerprint_inputs: {
        product_external_id:
          relatedId(stockItem, "product") ??
          asString(stockItem.attributes?.product_id),
        barcode:
          asString(barcode?.attributes?.barcode) ??
          asString(stockItem.attributes?.barcode),
      },
    });
  }

  const envelopeCandidate = {
    kind: "order_graph" as const,
    producer_version: CANONICAL_ADAPTER_PRODUCER_VERSION,
    profile_version: CANONICAL_ORDER_PROFILE_VERSION,
    schema_version: SOURCE_ENVELOPE_SCHEMA_VERSION,
    root: { resource_type: "order", external_id: orderId },
    scopes: [
      { relationship: "included", scope: "complete" as const },
    ],
    resources,
    source_versions: resources
      .filter((resource) => resource.source_version)
      .map((resource) => ({
        resource_type: resource.resource_type,
        external_id: resource.external_id,
        source_version: resource.source_version as string,
      })),
    derived_context_revisions: [],
  };

  const parsed = SourceEnvelopeSchema.safeParse(envelopeCandidate);
  if (!parsed.success) {
    return {
      status: "invalid",
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "envelope"}: ${issue.message}`,
      ),
    };
  }

  return {
    status: "normalized",
    envelope: parsed.data,
    graph,
    orderStatus,
  };
}

function buildMemberships(
  orderId: string,
  lines: JsonApiResource[],
  graph: CanonicalGraph,
  ingestedAt: string,
): { memberships: MembershipProjection[]; issues: string[] } {
  const memberships: MembershipProjection[] = [];
  const issues: string[] = [];
  for (const line of lines) {
    const quantity = asFiniteNumber(line.attributes?.quantity) ?? 1;
    if (quantity < 1) {
      continue;
    }
    const planningId = relatedId(line, "planning");
    const assigned = graph.stock_item_plannings
      .filter((row) => row.planning_external_id === planningId)
      .map((row) => row.stock_item_external_id)
      .filter((id): id is string => Boolean(id));
    const uniqueAssigned = [...new Set(assigned)];
    if (!planningId && uniqueAssigned.length === 0) {
      continue;
    }

    if (quantity === 1) {
      if (uniqueAssigned.length > 1) {
        issues.push(
          `quantity-one line ${line.id} has more than one assigned stock item`,
        );
        continue;
      }
      const stockItemId = uniqueAssigned[0] ?? null;
      const sip = graph.stock_item_plannings.find(
        (row) => row.planning_external_id === planningId,
      );
      memberships.push({
        id: deterministicUuid(`${orderId}:${line.id}:single:1`),
        order_external_id: orderId,
        line_external_id: line.id,
        source_unit_discriminator: QUANTITY_ONE_UNIT_DISCRIMINATOR,
        replacement_chain_incarnation: 1,
        identity_kind: "quantity_one_single",
        line_quantity: 1,
        planning_external_id: planningId,
        stock_item_planning_external_id: sip?.external_id ?? null,
        stock_item_external_id: stockItemId,
        source_version: sourceVersionOf(line.attributes ?? {}, ingestedAt),
        source_updated_at: asUtc(line.attributes?.updated_at) ?? ingestedAt,
        ingested_at: ingestedAt,
        source_lifecycle: "open",
      });
      continue;
    }

    for (const stockItemId of uniqueAssigned) {
      const sip = graph.stock_item_plannings.find(
        (row) =>
          row.planning_external_id === planningId &&
          row.stock_item_external_id === stockItemId,
      );
      memberships.push({
        id: deterministicUuid(`${orderId}:${line.id}:${stockItemId}:1`),
        order_external_id: orderId,
        line_external_id: line.id,
        source_unit_discriminator: stockItemId,
        replacement_chain_incarnation: 1,
        identity_kind: "stock_item_external_id",
        line_quantity: quantity,
        planning_external_id: planningId,
        stock_item_planning_external_id: sip?.external_id ?? null,
        stock_item_external_id: stockItemId,
        source_version: sourceVersionOf(line.attributes ?? {}, ingestedAt),
        source_updated_at: asUtc(line.attributes?.updated_at) ?? ingestedAt,
        ingested_at: ingestedAt,
        source_lifecycle: "open",
      });
    }
  }
  return { memberships, issues };
}

function relatedId(resource: JsonApiResource, name: string): string | null {
  const data = resource.relationships?.[name]?.data;
  if (!data || Array.isArray(data)) {
    return null;
  }
  return data.id;
}

function relatedIds(resource: JsonApiResource, name: string): string[] {
  const data = resource.relationships?.[name]?.data;
  if (!data) {
    return [];
  }
  if (Array.isArray(data)) {
    return data.map((entry) => entry.id).filter(Boolean);
  }
  return data.id ? [data.id] : [];
}

function tagListOf(resource: JsonApiResource): string[] {
  const raw = resource.attributes?.tag_list ?? resource.attributes?.tags;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((entry) => String(entry).trim()).filter(Boolean);
}

function sourceVersionOf(
  attrs: Record<string, unknown>,
  fallback: string,
): string {
  return asString(attrs.updated_at) ?? asString(attrs.created_at) ?? fallback;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asUtc(value: unknown): string | null {
  const text = asString(value);
  if (!text) {
    return null;
  }
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return new Date(parsed).toISOString();
}

function deterministicUuid(seed: string): string {
  const hex = createHash("sha256").update(seed).digest("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${((Number.parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${hex.slice(18, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}
