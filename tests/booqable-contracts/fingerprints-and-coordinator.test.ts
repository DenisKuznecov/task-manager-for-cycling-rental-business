import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CANONICAL_FINGERPRINT_FIELD_BINDINGS,
  QUANTITY_ONE_UNIT_DISCRIMINATOR,
  SOURCE_ENVELOPE_SCHEMA_VERSION,
  WORKSHOP_PRODUCT_GROUP_TAGS,
  fingerprintResource,
  hashFingerprintInputs,
  pickFingerprintInputs,
  type CanonicalGraph,
  type SourceEnvelope,
} from "@/src/lib/booqable/contracts";
import {
  CANONICAL_ADAPTER_PRODUCER_VERSION,
  CANONICAL_NESTED_ORDER_INCLUDE,
  CANONICAL_ORDER_PROFILE_VERSION,
  normalizeCanonicalOrderPayload,
  type CanonicalOrderPayload,
} from "@/src/lib/booqable/canonical-adapter";
import {
  carryForwardOmittedChildren,
  compareMergedState,
  ingestCanonicalOrderGraph,
  prepareCanonicalApply,
  rentalLineAttentionFacts,
} from "@/src/lib/booqable/ingestion-coordinator";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const fixture = JSON.parse(
  readFileSync(
    join(repoRoot, "tests/fixtures/booqable/canonical-order-graph.json"),
    "utf8",
  ),
) as CanonicalOrderPayload;

const INGESTED_AT = "2026-08-17T09:05:00.000Z";
const PROVENANCE = {
  source_version: "2026-08-17T09:00:00.000Z",
  source_updated_at: "2026-08-17T09:00:00.000Z",
  ingested_at: INGESTED_AT,
  source_lifecycle: "open" as const,
};

function validGraph(): CanonicalGraph {
  return {
    product_groups: [
      {
        resource_type: "product_group",
        external_id: "pg_road",
        tag_list: [WORKSHOP_PRODUCT_GROUP_TAGS.road, "season-2026"],
        ...PROVENANCE,
      },
    ],
    products: [
      {
        resource_type: "product",
        external_id: "prod_road",
        product_group_external_id: "pg_road",
        tag_list: [WORKSHOP_PRODUCT_GROUP_TAGS.road, "season-2026"],
        ...PROVENANCE,
      },
    ],
    bundles: [],
    bundle_items: [],
    stock_items: [
      {
        resource_type: "stock_item",
        external_id: "si_1",
        product_external_id: "prod_road",
        ...PROVENANCE,
      },
    ],
    plannings: [
      {
        resource_type: "planning",
        external_id: "plan_1",
        order_external_id: "ord_1",
        line_external_id: "line_1",
        ...PROVENANCE,
      },
    ],
    stock_item_plannings: [
      {
        resource_type: "stock_item_planning",
        external_id: "sip_1",
        planning_external_id: "plan_1",
        stock_item_external_id: "si_1",
        ...PROVENANCE,
      },
    ],
    memberships: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        order_external_id: "ord_1",
        line_external_id: "line_1",
        source_unit_discriminator: QUANTITY_ONE_UNIT_DISCRIMINATOR,
        replacement_chain_incarnation: 1,
        identity_kind: "quantity_one_single",
        line_quantity: 1,
        planning_external_id: "plan_1",
        stock_item_planning_external_id: "sip_1",
        stock_item_external_id: "si_1",
        ...PROVENANCE,
      },
    ],
    predecessors: [],
  };
}

function validEnvelope(overrides: Partial<SourceEnvelope> = {}): SourceEnvelope {
  return {
    kind: "order_graph",
    producer_version: CANONICAL_ADAPTER_PRODUCER_VERSION,
    profile_version: CANONICAL_ORDER_PROFILE_VERSION,
    schema_version: SOURCE_ENVELOPE_SCHEMA_VERSION,
    root: { resource_type: "order", external_id: "ord_1" },
    scopes: [{ relationship: "included", scope: "complete" }],
    resources: [
      {
        resource_type: "order",
        external_id: "ord_1",
        presence: "known",
        source_version: PROVENANCE.source_version,
        fingerprint_inputs: {
          status: "reserved",
          starts_at: "2026-08-17T08:00:00.000Z",
          stops_at: "2026-08-20T18:00:00.000Z",
          customer_external_id: "cus_1",
        },
      },
      {
        resource_type: "customer",
        external_id: "cus_1",
        presence: "known",
        source_version: PROVENANCE.source_version,
        fingerprint_inputs: {
          name: "Ada Rider",
          email: "ada@example.com",
          phone: "+34600000000",
          birthday: "1990-04-12",
        },
      },
    ],
    source_versions: [
      {
        resource_type: "order",
        external_id: "ord_1",
        source_version: PROVENANCE.source_version,
      },
    ],
    derived_context_revisions: [],
    ...overrides,
  };
}

describe("canonical nested-order profile", () => {
  it("contracts the nested-order include and producer/profile versions", () => {
    expect(CANONICAL_NESTED_ORDER_INCLUDE).toBe(
      "customer,coupon,lines.planning.stock_item_plannings.stock_item.barcode",
    );
    expect(CANONICAL_ORDER_PROFILE_VERSION).toBe("nested-order@v1");
    expect(CANONICAL_ADAPTER_PRODUCER_VERSION).toBe("canonical-adapter@v1");
  });

  it("normalizes the fixture into a versioned order_graph", () => {
    const result = normalizeCanonicalOrderPayload(fixture, INGESTED_AT);
    expect(result.status).toBe("normalized");
    if (result.status !== "normalized") {
      return;
    }
    expect(result.envelope.kind).toBe("order_graph");
    expect(result.envelope.profile_version).toBe(CANONICAL_ORDER_PROFILE_VERSION);
    expect(result.envelope.schema_version).toBe(1);
    expect(result.graph.stock_items[0]?.external_id).toBe("si_1");
    expect(result.graph.memberships[0]).toMatchObject({
      identity_kind: "quantity_one_single",
      line_quantity: 1,
      stock_item_external_id: "si_1",
    });
    expect(result.orderStatus).toBe("reserved");
    expect(result.graph.memberships).toHaveLength(1);
    expect(
      result.graph.memberships.some(
        (membership) => membership.line_external_id === "line_accessory",
      ),
    ).toBe(false);
    expect(result.graph.bundles).toEqual([
      expect.objectContaining({
        external_id: "bundle_road",
        tag_list: ["workshop-road-bike-bundle"],
      }),
    ]);
    expect(result.graph.bundle_items).toEqual([
      expect.objectContaining({
        external_id: "bi_road",
        bundle_external_id: "bundle_road",
        product_external_id: "prod_road",
        product_group_external_id: "pg_road",
      }),
    ]);
    const accessory = result.envelope.resources.find(
      (resource) => resource.external_id === "line_accessory",
    );
    expect(accessory?.fingerprint_inputs?.tag_list).toContain("workshop-helmet");
    expect(accessory?.fingerprint_inputs?.tag_list).toBe(
      "size-m\0workshop-helmet",
    );
    expect(
      rentalLineAttentionFacts(result.graph, result.envelope).some(
        (row) => row.line_external_id === "line_accessory",
      ),
    ).toBe(false);
  });

  it("normalizes order-item tags in a stable order", () => {
    const reordered = structuredClone(fixture);
    const line = reordered.included.find((row) => row.id === "line_bike");
    if (Array.isArray(line?.attributes?.tag_list)) {
      line.attributes.tag_list = [...line.attributes.tag_list].reverse();
    }

    const original = normalizeCanonicalOrderPayload(fixture, INGESTED_AT);
    const normalized = normalizeCanonicalOrderPayload(reordered, INGESTED_AT);
    expect(original.status).toBe("normalized");
    expect(normalized.status).toBe("normalized");
    if (original.status !== "normalized" || normalized.status !== "normalized") {
      return;
    }
    const originalLine = original.envelope.resources.find(
      (resource) => resource.external_id === "line_bike",
    );
    const reorderedLine = normalized.envelope.resources.find(
      (resource) => resource.external_id === "line_bike",
    );
    expect(reorderedLine?.fingerprint_inputs?.tag_list).toBe(
      originalLine?.fingerprint_inputs?.tag_list,
    );
  });

  it("rejects missing status and a non-array included document", () => {
    const blankStatus = structuredClone(fixture);
    blankStatus.data.attributes = { ...blankStatus.data.attributes, status: "" };
    expect(normalizeCanonicalOrderPayload(blankStatus, INGESTED_AT)).toEqual({
      status: "invalid",
      issues: ["order status is required"],
    });

    expect(
      normalizeCanonicalOrderPayload(
        { data: fixture.data, included: { not: "an-array" } },
        INGESTED_AT,
      ),
    ).toEqual({
      status: "invalid",
      issues: ["included must be an array"],
    });
  });

  it("builds two stock-item memberships for a quantity-2 bike line", () => {
    const qty2 = structuredClone(fixture);
    const bikeLine = qty2.included.find((row) => row.id === "line_bike");
    if (bikeLine?.attributes) {
      bikeLine.attributes.quantity = 2;
    }
    const planning = qty2.included.find((row) => row.id === "plan_1");
    if (planning?.relationships?.stock_item_plannings) {
      planning.relationships.stock_item_plannings.data = [
        { id: "sip_1", type: "stock_item_plannings" },
        { id: "sip_2", type: "stock_item_plannings" },
      ];
    }
    qty2.included.push(
      {
        id: "sip_2",
        type: "stock_item_plannings",
        attributes: {
          created_at: "2026-08-16T10:00:00.000Z",
          updated_at: "2026-08-17T09:00:00.000Z",
        },
        relationships: {
          planning: { data: { id: "plan_1", type: "plannings" } },
          stock_item: { data: { id: "si_2", type: "stock_items" } },
        },
      },
      {
        id: "si_2",
        type: "stock_items",
        attributes: {
          created_at: "2026-08-01T10:00:00.000Z",
          updated_at: "2026-08-17T09:00:00.000Z",
        },
        relationships: {
          product: { data: { id: "prod_road", type: "products" } },
        },
      },
    );

    const result = normalizeCanonicalOrderPayload(qty2, INGESTED_AT);
    expect(result.status).toBe("normalized");
    if (result.status !== "normalized") {
      return;
    }
    const bikeMemberships = result.graph.memberships.filter(
      (membership) => membership.line_external_id === "line_bike",
    );
    expect(bikeMemberships).toHaveLength(2);
    expect(bikeMemberships.map((row) => row.identity_kind)).toEqual([
      "stock_item_external_id",
      "stock_item_external_id",
    ]);
    expect(
      bikeMemberships.map((row) => row.stock_item_external_id).sort(),
    ).toEqual(["si_1", "si_2"]);
  });

  it("keeps one open membership and one unidentified unit on a short quantity-2 line", () => {
    const qty2 = structuredClone(fixture);
    const bikeLine = qty2.included.find((row) => row.id === "line_bike");
    if (bikeLine?.attributes) {
      bikeLine.attributes.quantity = 2;
    }
    const result = normalizeCanonicalOrderPayload(qty2, INGESTED_AT);
    expect(result.status).toBe("normalized");
    if (result.status !== "normalized") {
      return;
    }
    const bikeMemberships = result.graph.memberships.filter(
      (membership) => membership.line_external_id === "line_bike",
    );
    expect(bikeMemberships).toHaveLength(1);
    expect(bikeMemberships[0]).toMatchObject({
      identity_kind: "stock_item_external_id",
      stock_item_external_id: "si_1",
      source_lifecycle: "open",
    });
    expect(rentalLineAttentionFacts(result.graph, result.envelope)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          line_external_id: "line_bike",
          line_quantity: 2,
          identified_count: 1,
          unidentified_count: 1,
        }),
      ]),
    );
  });

  it("rejects a quantity-one line with more than one assigned stock item", () => {
    const conflicted = structuredClone(fixture);
    const planning = conflicted.included.find((row) => row.id === "plan_1");
    if (planning?.relationships?.stock_item_plannings) {
      planning.relationships.stock_item_plannings.data = [
        { id: "sip_1", type: "stock_item_plannings" },
        { id: "sip_2", type: "stock_item_plannings" },
      ];
    }
    conflicted.included.push({
      id: "sip_2",
      type: "stock_item_plannings",
      attributes: {
        created_at: "2026-08-16T10:00:00.000Z",
        updated_at: "2026-08-17T09:00:00.000Z",
      },
      relationships: {
        planning: { data: { id: "plan_1", type: "plannings" } },
        stock_item: { data: { id: "si_2", type: "stock_items" } },
      },
    });
    conflicted.included.push({
      id: "si_2",
      type: "stock_items",
      attributes: {
        created_at: "2026-08-16T10:00:00.000Z",
        updated_at: "2026-08-17T09:00:00.000Z",
      },
      relationships: {
        product: { data: { id: "prod_road", type: "products" } },
      },
    });
    const result = normalizeCanonicalOrderPayload(conflicted, INGESTED_AT);
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") {
      return;
    }
    expect(result.issues.join(" ")).toMatch(/line_bike/);
  });

  it("discards new and concept ghost orders before building a graph", () => {
    const ghost = structuredClone(fixture);
    ghost.data.attributes = { ...ghost.data.attributes, status: "concept" };
    expect(normalizeCanonicalOrderPayload(ghost, INGESTED_AT)).toEqual({
      status: "discarded",
      reason: "ghost",
    });

    const newGhost = structuredClone(fixture);
    newGhost.data.attributes = { ...newGhost.data.attributes, status: "new" };
    expect(normalizeCanonicalOrderPayload(newGhost, INGESTED_AT)).toEqual({
      status: "discarded",
      reason: "ghost",
    });
  });
});

describe("canonical fingerprints", () => {
  it("hashes only approved meaningful fields and stays deterministic", () => {
    expect([...CANONICAL_FINGERPRINT_FIELD_BINDINGS.order]).toEqual([
      "status",
      "starts_at",
      "stops_at",
      "customer_external_id",
    ]);
    const first = fingerprintResource("order", {
      status: "reserved",
      starts_at: "2026-08-17T08:00:00.000Z",
      stops_at: "2026-08-20T18:00:00.000Z",
      customer_external_id: "cus_1",
      ignored: "do-not-hash",
    });
    const second = fingerprintResource("order", {
      ignored: "still-ignored",
      customer_external_id: "cus_1",
      stops_at: "2026-08-20T18:00:00.000Z",
      starts_at: "2026-08-17T08:00:00.000Z",
      status: "reserved",
    });
    expect(first.source_fingerprint).toBe(second.source_fingerprint);
    expect(first.fingerprint_inputs).not.toHaveProperty("ignored");
  });

  it("keeps accessory tag lists as opaque source facts", () => {
    const inputs = pickFingerprintInputs("order_item", {
      quantity: 1,
      title: "Helmet",
      line_type: "rental",
      tag_list: ["workshop-helmet", "size-m"],
    });
    expect(inputs.tag_list).toBe("size-m\0workshop-helmet");
    expect(hashFingerprintInputs(inputs)).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("comparator and coordinator", () => {
  it("applies a new accepted graph and records attention remaining count", async () => {
    const graph = validGraph();
    graph.memberships[0].line_quantity = 3;
    graph.memberships[0].identity_kind = "stock_item_external_id";
    graph.memberships[0].source_unit_discriminator = "si_1";
    const envelope = validEnvelope();
    const prepared = prepareCanonicalApply({
      graph,
      envelope,
      accepted: null,
      orderStatus: "reserved",
    });
    expect(prepared.result).toBe("applied");
    expect(rentalLineAttentionFacts(prepared.payload.graph)[0]).toMatchObject({
      line_quantity: 3,
      identified_count: 1,
      unidentified_count: 2,
    });

    const applied = await ingestCanonicalOrderGraph(
      { apply: async () => "applied" },
      { graph, envelope, accepted: null, orderStatus: "reserved" },
    );
    expect(applied.result).toBe("applied");
  });

  it("returns no_op for an exact carried-forward repeat", () => {
    const graph = validGraph();
    const envelope = validEnvelope();
    const first = prepareCanonicalApply({
      graph,
      envelope,
      accepted: null,
      orderStatus: "reserved",
    });
    const repeat = prepareCanonicalApply({
      graph,
      envelope,
      accepted: {
        graph,
        sourceVector: first.payload.source_vector,
        sourceFingerprint: first.payload.merged_fingerprint,
        schemaVersion: 1,
        orderStatus: "reserved",
      },
      orderStatus: "reserved",
    });
    expect(repeat.result).toBe("no_op");
    expect(repeat.payload.graph.memberships).toHaveLength(1);
  });

  it("quarantines tag admission without writing membership", () => {
    const graph = validGraph();
    graph.product_groups[0].tag_list = ["season-2026"];
    const prepared = prepareCanonicalApply({
      graph,
      envelope: validEnvelope(),
      accepted: null,
      orderStatus: "reserved",
    });
    expect(prepared.result).toBe("quarantined");
    expect(prepared.payload.incident).toMatchObject({
      kind: "unauthoritative_addition",
      field_name: "tag_admission",
    });
    expect(prepared.payload.graph.memberships).toHaveLength(0);
  });

  it("quarantines equal version with a different meaningful fingerprint", () => {
    const graph = validGraph();
    const envelope = validEnvelope();
    const first = prepareCanonicalApply({
      graph,
      envelope,
      accepted: null,
      orderStatus: "reserved",
    });
    const changed = validEnvelope();
    changed.resources[0].fingerprint_inputs = {
      ...changed.resources[0].fingerprint_inputs,
      status: "reserved",
      starts_at: "2026-08-18T08:00:00.000Z",
    };
    const conflict = prepareCanonicalApply({
      graph,
      envelope: changed,
      accepted: {
        graph,
        sourceVector: first.payload.source_vector,
        sourceFingerprint: first.payload.merged_fingerprint,
        schemaVersion: 1,
        orderStatus: "reserved",
      },
      orderStatus: "reserved",
    });
    expect(conflict.result).toBe("quarantined");
    expect(conflict.payload.incident?.kind).toBe("equal_version_conflict");
  });

  it("carries an omitted child forward and keeps the absence outside the fingerprint", () => {
    const accepted = validGraph();
    const incoming = validGraph();
    incoming.stock_items = [];
    const { graph, omissions } = carryForwardOmittedChildren(incoming, accepted);
    expect(graph.stock_items).toHaveLength(1);
    expect(omissions).toEqual([
      { resource_type: "stock_item", external_id: "si_1" },
    ]);
    expect(graph.memberships[0]?.source_lifecycle).toBe("open");
  });

  it("records omitted_child on a no-op when the incoming graph omits a carried child", () => {
    const graph = validGraph();
    const envelope = validEnvelope();
    envelope.resources.push({
      resource_type: "stock_item",
      external_id: "si_1",
      presence: "known",
      source_version: PROVENANCE.source_version,
      fingerprint_inputs: {
        product_external_id: "prod_road",
        barcode: "ECH-ROAD-001",
      },
    });
    const first = prepareCanonicalApply({
      graph,
      envelope,
      accepted: null,
      orderStatus: "reserved",
    });
    expect(first.result).toBe("applied");

    const incoming = validGraph();
    incoming.stock_items = [];
    const incomingEnvelope = {
      ...envelope,
      resources: envelope.resources.filter(
        (resource) =>
          !(
            resource.resource_type === "stock_item" &&
            resource.external_id === "si_1"
          ),
      ),
    };
    const omitted = prepareCanonicalApply({
      graph: incoming,
      envelope: incomingEnvelope,
      accepted: {
        graph,
        sourceVector: first.payload.source_vector,
        sourceFingerprint: first.payload.merged_fingerprint,
        schemaVersion: 1,
        orderStatus: "reserved",
        acceptedEnvelopeResources: envelope.resources,
      },
      orderStatus: "reserved",
    });

    expect(omitted.result).toBe("no_op");
    expect(omitted.payload.graph.stock_items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ external_id: "si_1" }),
      ]),
    );
    expect(omitted.payload.omissions).toEqual([
      { resource_type: "stock_item", external_id: "si_1" },
    ]);
    expect(omitted.payload.merged_fingerprint).toBe(
      first.payload.merged_fingerprint,
    );
    expect(omitted.payload.incident?.kind).toBe("omitted_child");
  });

  it("quarantines older, incomparable, and unauthoritative present state through prepareCanonicalApply", () => {
    const graph = validGraph();
    const envelope = validEnvelope();
    const first = prepareCanonicalApply({
      graph,
      envelope,
      accepted: null,
      orderStatus: "reserved",
    });
    const accepted = {
      graph,
      sourceVector: first.payload.source_vector,
      sourceFingerprint: first.payload.merged_fingerprint,
      schemaVersion: 1,
      orderStatus: "reserved",
    };

    const olderEnvelope = validEnvelope();
    olderEnvelope.source_versions[0].source_version = "2026-08-16T09:00:00.000Z";
    olderEnvelope.resources[0].source_version = "2026-08-16T09:00:00.000Z";
    const older = prepareCanonicalApply({
      graph,
      envelope: olderEnvelope,
      accepted,
      orderStatus: "reserved",
    });
    expect(older.result).toBe("quarantined");
    expect(older.payload.incident?.kind).toBe("older_present_state");

    const newerEnvelope = validEnvelope();
    newerEnvelope.source_versions[0].source_version = "2026-08-18T09:00:00.000Z";
    newerEnvelope.resources[0].source_version = "2026-08-18T09:00:00.000Z";
    const newerGraph = validGraph();
    newerGraph.stock_items.push({
      resource_type: "stock_item",
      external_id: "si_new",
      product_external_id: "prod_road",
      ...PROVENANCE,
    });
    const newer = prepareCanonicalApply({
      graph: newerGraph,
      envelope: newerEnvelope,
      accepted,
      orderStatus: "reserved",
    });
    expect(newer.result).toBe("applied");

    const incomparableEnvelope = validEnvelope();
    incomparableEnvelope.source_versions[0].source_version = "not-a-timestamp";
    incomparableEnvelope.resources[0].source_version = "not-a-timestamp";
    const incomparable = prepareCanonicalApply({
      graph,
      envelope: incomparableEnvelope,
      accepted,
      orderStatus: "reserved",
    });
    expect(incomparable.result).toBe("quarantined");
    expect(incomparable.payload.incident?.kind).toBe(
      "incomparable_present_state",
    );

    const addition = validGraph();
    addition.stock_items.push({
      resource_type: "stock_item",
      external_id: "si_new",
      product_external_id: "prod_road",
      ...PROVENANCE,
    });
    const unauthoritative = prepareCanonicalApply({
      graph: addition,
      envelope,
      accepted,
      orderStatus: "reserved",
    });
    expect(unauthoritative.result).toBe("quarantined");
    expect(unauthoritative.payload.incident?.kind).toBe(
      "unauthoritative_addition",
    );
  });

  it("changes the per-row stock-item fingerprint when only barcode changes", () => {
    const graph = validGraph();
    const withBarcode = (barcode: string): SourceEnvelope => {
      const envelope = validEnvelope();
      envelope.resources.push({
        resource_type: "stock_item",
        external_id: "si_1",
        presence: "known",
        source_version: PROVENANCE.source_version,
        fingerprint_inputs: {
          product_external_id: "prod_road",
          barcode,
        },
      });
      return envelope;
    };

    const first = prepareCanonicalApply({
      graph,
      envelope: withBarcode("ECH-ROAD-001"),
      accepted: null,
      orderStatus: "reserved",
    });
    const second = prepareCanonicalApply({
      graph,
      envelope: withBarcode("ECH-ROAD-002"),
      accepted: null,
      orderStatus: "reserved",
    });
    const firstFp = first.payload.resource_fingerprints.find(
      (row) => row.resource_type === "stock_item" && row.external_id === "si_1",
    );
    const secondFp = second.payload.resource_fingerprints.find(
      (row) => row.resource_type === "stock_item" && row.external_id === "si_1",
    );
    expect(firstFp?.source_fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(secondFp?.source_fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(firstFp?.source_fingerprint).not.toBe(secondFp?.source_fingerprint);
  });

  it("quarantines older, incomparable, unsupported, and unauthoritative present state", () => {
    const older = compareMergedState({
      schemaVersion: 1,
      rootExternalId: "ord_1",
      incomingVector: [
        {
          resource_type: "order",
          external_id: "ord_1",
          source_version: "2026-08-16T09:00:00.000Z",
        },
      ],
      incomingFingerprint: "aaa",
      accepted: {
        graph: validGraph(),
        sourceVector: [
          {
            resource_type: "order",
            external_id: "ord_1",
            source_version: "2026-08-17T09:00:00.000Z",
          },
        ],
        sourceFingerprint: "bbb",
        schemaVersion: 1,
        orderStatus: "reserved",
      },
    });
    expect(older).toMatchObject({
      result: "quarantined",
      incidentKind: "older_present_state",
      incidentResourceType: "order",
      incidentResourceExternalId: "ord_1",
    });

    const incomparable = compareMergedState({
      schemaVersion: 1,
      rootExternalId: "ord_1",
      incomingVector: [
        {
          resource_type: "order",
          external_id: "ord_1",
          source_version: "not-a-timestamp",
        },
      ],
      incomingFingerprint: "aaa",
      accepted: {
        graph: validGraph(),
        sourceVector: [
          {
            resource_type: "order",
            external_id: "ord_1",
            source_version: "2026-08-17T09:00:00.000Z",
          },
        ],
        sourceFingerprint: "bbb",
        schemaVersion: 1,
        orderStatus: "reserved",
      },
    });
    expect(incomparable).toMatchObject({
      incidentKind: "incomparable_present_state",
      incidentResourceType: "order",
      incidentResourceExternalId: "ord_1",
    });

    expect(
      compareMergedState({
        schemaVersion: 2,
        rootExternalId: "ord_1",
        incomingVector: [],
        incomingFingerprint: "aaa",
        accepted: null,
      }).incidentKind,
    ).toBe("unsupported_schema");

    const addition = compareMergedState({
      schemaVersion: 1,
      rootExternalId: "ord_1",
      incomingVector: [
        {
          resource_type: "order",
          external_id: "ord_1",
          source_version: "2026-08-17T09:00:00.000Z",
        },
        {
          resource_type: "stock_item",
          external_id: "si_new",
          source_version: "2026-08-17T09:00:00.000Z",
        },
      ],
      incomingFingerprint: "ccc",
      accepted: {
        graph: validGraph(),
        sourceVector: [
          {
            resource_type: "order",
            external_id: "ord_1",
            source_version: "2026-08-17T09:00:00.000Z",
          },
        ],
        sourceFingerprint: "bbb",
        schemaVersion: 1,
        orderStatus: "reserved",
      },
    });
    expect(addition).toMatchObject({
      incidentKind: "unauthoritative_addition",
      incidentResourceType: "stock_item",
      incidentResourceExternalId: "si_new",
    });

    expect(
      compareMergedState({
        schemaVersion: 1,
        rootExternalId: "ord_1",
        incomingVector: [
          {
            resource_type: "order",
            external_id: "ord_1",
            source_version: "2026-08-17T11:00:00+02",
          },
        ],
        incomingFingerprint: "bbb",
        accepted: {
          graph: validGraph(),
          sourceVector: [
            {
              resource_type: "order",
              external_id: "ord_1",
              source_version: "2026-08-17T11:00:00+02",
            },
          ],
          sourceFingerprint: "bbb",
          schemaVersion: 1,
          orderStatus: "reserved",
        },
      }).result,
    ).toBe("no_op");
  });
});
