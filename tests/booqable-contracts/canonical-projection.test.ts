import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extractPgEnumLabels } from "@/src/lib/booqable/contracts";
import {
  BROWNFIELD_READER_VIEWS,
  CANONICAL_COORDINATOR_ENUM_MIGRATION,
  CANONICAL_COORDINATOR_MIGRATION,
  CANONICAL_PROJECTION_CONTRACT_VERSION,
  CANONICAL_PROJECTION_MIGRATION,
  ENTITY_ORIGINS,
  FIELD_AUTHORITY_MANIFEST,
  FORBIDDEN_MEMBERSHIP_IDENTITY_KINDS,
  LocalCustomerOriginSchema,
  MEMBERSHIP_IDENTITY_FIELDS,
  PG_PROJECTION_ENUM_LABELS,
  QUANTITY_ONE_UNIT_DISCRIMINATOR,
  SHARED_PROJECTION_SOURCE_COLUMNS,
  SHARED_PROJECTION_TABLES,
  WORKSHOP_BIKE_CATEGORIES,
  WORKSHOP_BUNDLE_TAGS,
  WORKSHOP_PRODUCT_GROUP_TAGS,
  admitCanonicalGraph,
  applyExplicitClose,
  applySourceAbsence,
  assertManifestCompleteness,
  fieldAuthorityKey,
  manifestSqlTuple,
  type CanonicalGraph,
  type WorkshopBikeCategory,
} from "@/src/lib/booqable/contracts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

const PROVENANCE = {
  source_version: "2026-08-15T09:00:00.000Z",
  source_updated_at: "2026-08-15T09:00:00.000Z",
  ingested_at: "2026-08-15T09:05:00.000Z",
  source_lifecycle: "open" as const,
};

function catalogIds(category: WorkshopBikeCategory) {
  const slug = category.replace(/-/g, "_");
  return {
    productGroup: `pg_${slug}`,
    product: `prod_${slug}`,
    bundle: `bundle_${slug}`,
  };
}

function validGraph(category: WorkshopBikeCategory = "road"): CanonicalGraph {
  const ids = catalogIds(category);
  return {
    product_groups: [
      {
        resource_type: "product_group",
        external_id: ids.productGroup,
        tag_list: [WORKSHOP_PRODUCT_GROUP_TAGS[category], "season-2026"],
        ...PROVENANCE,
      },
    ],
    products: [
      {
        resource_type: "product",
        external_id: ids.product,
        product_group_external_id: ids.productGroup,
        tag_list: [WORKSHOP_PRODUCT_GROUP_TAGS[category], "season-2026"],
        ...PROVENANCE,
      },
    ],
    bundles: [
      {
        resource_type: "bundle",
        external_id: ids.bundle,
        tag_list: [WORKSHOP_BUNDLE_TAGS[category]],
        ...PROVENANCE,
      },
    ],
    bundle_items: [
      {
        resource_type: "bundle_item",
        external_id: "bi_1",
        bundle_external_id: ids.bundle,
        product_external_id: ids.product,
        product_group_external_id: ids.productGroup,
        ...PROVENANCE,
      },
    ],
    stock_items: [
      {
        resource_type: "stock_item",
        external_id: "si_1",
        product_external_id: ids.product,
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

describe("canonical projection I/O matrix", () => {
  it.each(WORKSHOP_BIKE_CATEGORIES)(
    "admits a %s ProductGroup, matching Product inheritance, and agreeing Bundle",
    (category) => {
      const result = admitCanonicalGraph(validGraph(category));
      expect(result.status).toBe("accepted");
      if (result.status !== "accepted") {
        return;
      }
      expect(result.graph.product_groups[0].tag_list).toEqual([
        WORKSHOP_PRODUCT_GROUP_TAGS[category],
        "season-2026",
      ]);
      expect(result.graph.products[0].tag_list).toEqual([
        WORKSHOP_PRODUCT_GROUP_TAGS[category],
        "season-2026",
      ]);
      expect(result.graph.bundles[0].tag_list).toEqual([
        WORKSHOP_BUNDLE_TAGS[category],
      ]);
    },
  );

  it("accepts a valid tagged graph with complete tags, provenance, and membership identity", () => {
    const result = admitCanonicalGraph(validGraph());
    expect(result.status).toBe("accepted");
    if (result.status === "accepted") {
      expect(result.graph.product_groups[0].tag_list).toEqual([
        WORKSHOP_PRODUCT_GROUP_TAGS.road,
        "season-2026",
      ]);
      expect(result.graph.product_groups[0].tag_list).not.toEqual(["road"]);
      expect(result.graph.memberships[0]).toMatchObject({
        order_external_id: "ord_1",
        line_external_id: "line_1",
        source_unit_discriminator: QUANTITY_ONE_UNIT_DISCRIMINATOR,
        replacement_chain_incarnation: 1,
      });
    }
  });

  it("rejects untagged, unknown, multiple, conflicting, inherited, and disagreeing bundle tags", () => {
    const untagged = validGraph();
    untagged.product_groups[0].tag_list = ["season-2026"];
    const untaggedResult = admitCanonicalGraph(untagged);
    expect(untaggedResult).toMatchObject({
      status: "rejected",
      reason: "tag_admission",
      classification: { status: "untagged" },
    });

    const unknown = validGraph();
    unknown.product_groups[0].tag_list = ["workshop-tandem-bike"];
    expect(admitCanonicalGraph(unknown)).toMatchObject({
      status: "rejected",
      reason: "tag_admission",
      classification: { status: "incident", code: "unknown_workshop_tag" },
    });

    const multiple = validGraph();
    multiple.product_groups[0].tag_list = [
      WORKSHOP_PRODUCT_GROUP_TAGS.road,
      WORKSHOP_PRODUCT_GROUP_TAGS.gravel,
    ];
    expect(admitCanonicalGraph(multiple)).toMatchObject({
      status: "rejected",
      reason: "tag_admission",
      classification: {
        status: "incident",
        code: "multiple_workshop_bike_tags",
      },
    });

    const conflicting = validGraph();
    conflicting.product_groups[0].tag_list = [WORKSHOP_BUNDLE_TAGS.road];
    expect(admitCanonicalGraph(conflicting)).toMatchObject({
      status: "rejected",
      reason: "tag_admission",
      classification: {
        status: "incident",
        code: "conflicting_resource_tag",
      },
    });

    const inherited = validGraph();
    inherited.products[0].tag_list = [WORKSHOP_PRODUCT_GROUP_TAGS.gravel];
    expect(admitCanonicalGraph(inherited)).toMatchObject({
      status: "rejected",
      reason: "tag_admission",
      classification: { status: "incident", code: "product_tag_mismatch" },
    });

    const disagreeing = validGraph();
    disagreeing.bundles[0].tag_list = [WORKSHOP_BUNDLE_TAGS.gravel];
    expect(admitCanonicalGraph(disagreeing)).toMatchObject({
      status: "rejected",
      reason: "tag_admission",
      classification: {
        status: "incident",
        code: "bundle_product_group_mismatch",
      },
    });
  });

  it("keeps unknown referenced sources without creating orphan bundle or predecessor links", () => {
    const partial = validGraph();
    partial.products[0].product_group_external_id = "pg_missing";
    const accepted = admitCanonicalGraph(partial);
    expect(accepted.status).toBe("accepted");

    const orphanBundleItem = validGraph();
    orphanBundleItem.bundle_items.push({
      ...orphanBundleItem.bundle_items[0],
      external_id: "bi_orphan",
      bundle_external_id: "bundle_missing",
    });
    expect(admitCanonicalGraph(orphanBundleItem)).toMatchObject({
      status: "rejected",
      reason: "orphan_link",
    });

    const orphanPredecessor = validGraph();
    orphanPredecessor.predecessors = [
      {
        successor_id: "11111111-1111-4111-8111-111111111111",
        predecessor_id: "22222222-2222-4222-8222-222222222222",
      },
    ];
    expect(admitCanonicalGraph(orphanPredecessor)).toMatchObject({
      status: "rejected",
      reason: "orphan_link",
    });
  });

  it("preserves local customers and refuses auto-merge with a Booqable identity", () => {
    expect(
      LocalCustomerOriginSchema.safeParse({
        entity_origin: "local",
        booqable_customer_id: null,
      }).success,
    ).toBe(true);
    expect(
      LocalCustomerOriginSchema.safeParse({
        entity_origin: "local",
        booqable_customer_id: "cus_1",
      }).success,
    ).toBe(false);
    expect(
      LocalCustomerOriginSchema.safeParse({
        entity_origin: "booqable",
        booqable_customer_id: null,
      }).success,
    ).toBe(false);
  });

  it("never closes or deletes on absence without an approved explicit close signal", () => {
    const open = { source_lifecycle: "open" as const };
    expect(applySourceAbsence(open)).toEqual(open);
    expect(applyExplicitClose(open, null)).toEqual({
      ok: false,
      source_lifecycle: "open",
    });
    expect(applyExplicitClose(open, { approved: true })).toEqual({
      ok: true,
      source_lifecycle: "closed",
    });
  });

  it("requires UTC provenance and an approved close signal before admitting closed source state", () => {
    const invalidTimestamp = validGraph();
    invalidTimestamp.products[0].source_updated_at =
      "2026-08-15T09:00:00+99:99";
    expect(admitCanonicalGraph(invalidTimestamp)).toMatchObject({
      status: "rejected",
      reason: "schema",
    });

    const unapprovedClose = validGraph();
    unapprovedClose.products[0].source_lifecycle = "closed";
    expect(admitCanonicalGraph(unapprovedClose)).toMatchObject({
      status: "rejected",
      reason: "schema",
    });

    unapprovedClose.products[0].close_approved = true;
    expect(admitCanonicalGraph(unapprovedClose).status).toBe("accepted");
  });

  it("rejects NUL-bearing external identities", () => {
    const graph = validGraph();
    graph.products[0].external_id = "prod\0road";
    expect(admitCanonicalGraph(graph)).toMatchObject({
      status: "rejected",
      reason: "schema",
    });
  });

  it("rejects Planning ids, StockItemPlanning ids, and array positions as membership identity", () => {
    expect(FORBIDDEN_MEMBERSHIP_IDENTITY_KINDS).toEqual([
      "planning_id",
      "stock_item_planning_id",
      "array_position",
    ]);
    expect(MEMBERSHIP_IDENTITY_FIELDS).toEqual([
      "order_external_id",
      "line_external_id",
      "source_unit_discriminator",
      "replacement_chain_incarnation",
    ]);

    const planningIdentity = validGraph();
    planningIdentity.memberships[0].source_unit_discriminator = "plan_1";
    expect(admitCanonicalGraph(planningIdentity)).toMatchObject({
      status: "rejected",
      reason: "membership_identity",
    });

    const stockItemPlanningIdentity = validGraph();
    stockItemPlanningIdentity.memberships[0].source_unit_discriminator =
      "sip_1";
    expect(admitCanonicalGraph(stockItemPlanningIdentity)).toMatchObject({
      status: "rejected",
      reason: "membership_identity",
    });

    const arrayPosition = validGraph();
    arrayPosition.memberships[0].source_unit_discriminator = "0";
    expect(admitCanonicalGraph(arrayPosition)).toMatchObject({
      status: "rejected",
      reason: "membership_identity",
    });
  });

  it("admits a bundle that agrees with its contained ProductGroup in a two-category catalog", () => {
    const twoCategories = validGraph();
    twoCategories.product_groups.push({
      resource_type: "product_group",
      external_id: "pg_gravel",
      tag_list: [WORKSHOP_PRODUCT_GROUP_TAGS.gravel],
      ...PROVENANCE,
    });
    expect(admitCanonicalGraph(twoCategories).status).toBe("accepted");

    twoCategories.bundle_items[0] = {
      ...twoCategories.bundle_items[0],
      product_external_id: null,
      product_group_external_id: "pg_gravel",
    };
    expect(admitCanonicalGraph(twoCategories)).toMatchObject({
      status: "rejected",
      reason: "tag_admission",
      classification: {
        status: "incident",
        code: "bundle_product_group_mismatch",
      },
    });
  });

  it("rejects a BundleItem whose explicit ProductGroup conflicts with its Product", () => {
    const graph = validGraph();
    graph.product_groups.push({
      resource_type: "product_group",
      external_id: "pg_road_other",
      tag_list: [WORKSHOP_PRODUCT_GROUP_TAGS.road],
      ...PROVENANCE,
    });
    graph.bundle_items[0].product_group_external_id = "pg_road_other";

    expect(admitCanonicalGraph(graph)).toMatchObject({
      status: "rejected",
      reason: "inconsistent_link",
    });
  });

  it("requires distinct StockItem ids on multi-quantity lines", () => {
    const graph = validGraph();
    graph.stock_items.push({
      resource_type: "stock_item",
      external_id: "si_2",
      product_external_id: "prod_road",
      ...PROVENANCE,
    });
    graph.memberships = [
      {
        ...graph.memberships[0],
        identity_kind: "stock_item_external_id",
        line_quantity: 2,
        source_unit_discriminator: "si_1",
        stock_item_external_id: "si_1",
      },
      {
        ...graph.memberships[0],
        id: "22222222-2222-4222-8222-222222222222",
        identity_kind: "stock_item_external_id",
        line_quantity: 2,
        source_unit_discriminator: "si_2",
        stock_item_external_id: "si_2",
        replacement_chain_incarnation: 1,
      },
    ];
    expect(admitCanonicalGraph(graph).status).toBe("accepted");

    const incomplete = structuredClone(graph);
    incomplete.memberships.pop();
    expect(admitCanonicalGraph(incomplete).status).toBe("accepted");

    const excess = structuredClone(graph);
    excess.stock_items.push({
      resource_type: "stock_item",
      external_id: "si_3",
      product_external_id: "prod_road",
      ...PROVENANCE,
    });
    excess.memberships.push({
      ...graph.memberships[0],
      id: "33333333-3333-4333-8333-333333333333",
      identity_kind: "stock_item_external_id",
      line_quantity: 2,
      source_unit_discriminator: "si_3",
      stock_item_external_id: "si_3",
    });
    expect(admitCanonicalGraph(excess)).toMatchObject({
      status: "rejected",
      reason: "membership_identity",
    });

    graph.memberships[1].source_unit_discriminator = "si_1";
    graph.memberships[1].stock_item_external_id = "si_1";
    expect(admitCanonicalGraph(graph)).toMatchObject({
      status: "rejected",
      reason: "membership_identity",
    });
  });

  it("rejects predecessor links that violate the persisted one-to-one relationship", () => {
    const graph = validGraph();
    graph.memberships.push({
      ...graph.memberships[0],
      id: "22222222-2222-4222-8222-222222222222",
      replacement_chain_incarnation: 2,
      source_lifecycle: "closed",
      close_approved: true,
    });
    graph.predecessors = [
      {
        successor_id: graph.memberships[0].id,
        predecessor_id: graph.memberships[1].id,
      },
      {
        successor_id: graph.memberships[0].id,
        predecessor_id: graph.memberships[1].id,
      },
    ];

    expect(admitCanonicalGraph(graph)).toMatchObject({
      status: "rejected",
      reason: "membership_identity",
      issues: expect.arrayContaining([
        `duplicate predecessor successor ${graph.memberships[0].id}`,
        `duplicate predecessor membership ${graph.memberships[1].id}`,
      ]),
    });
  });
});

describe("canonical projection drift", () => {
  it("owns a complete one-row-per-field manifest", () => {
    expect(CANONICAL_PROJECTION_CONTRACT_VERSION).toBe(1);
    expect(assertManifestCompleteness()).toEqual({ ok: true });
    expect(new Set(FIELD_AUTHORITY_MANIFEST.map(fieldAuthorityKey)).size).toBe(
      FIELD_AUTHORITY_MANIFEST.length,
    );
    expect(
      new Set(FIELD_AUTHORITY_MANIFEST.map((row) => row.entity_origin)),
    ).toEqual(new Set(ENTITY_ORIGINS));
  });

  it("fixture-checks contract vocabulary and manifest tuples against the migration", () => {
    const sql = [
      CANONICAL_PROJECTION_MIGRATION,
      CANONICAL_COORDINATOR_ENUM_MIGRATION,
      CANONICAL_COORDINATOR_MIGRATION,
    ]
      .map((path) => readFileSync(join(repoRoot, path), "utf8"))
      .join("\n");

    for (const [typeName, labels] of Object.entries(PG_PROJECTION_ENUM_LABELS)) {
      expect(extractPgEnumLabels(sql, typeName)).toEqual([...labels]);
    }

    for (const table of [
      ...SHARED_PROJECTION_TABLES,
    ]) {
      expect(sql).toContain(`ALTER TABLE public.${table}`);
    }
    for (const column of SHARED_PROJECTION_SOURCE_COLUMNS) {
      expect(sql).toContain(`ADD COLUMN IF NOT EXISTS ${column}`);
    }
    for (const table of [
      "booqable_product_groups",
      "booqable_products",
      "booqable_bundles",
      "booqable_bundle_items",
      "booqable_stock_items",
      "booqable_plannings",
      "booqable_stock_item_plannings",
      "booqable_order_bike_memberships",
      "booqable_membership_predecessors",
      "booqable_field_authority_manifest",
      "booqable_accepted_order_graphs",
      "booqable_integration_incidents",
      "booqable_rental_line_attention",
    ]) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
    }

    expect(sql).toContain("ON DELETE RESTRICT");
    expect(sql).not.toMatch(/ON DELETE CASCADE/i);
    expect(sql).not.toMatch(/CREATE OR REPLACE VIEW/i);
    for (const viewName of Object.keys(BROWNFIELD_READER_VIEWS)) {
      expect(sql).not.toContain(viewName);
    }

    for (const entry of FIELD_AUTHORITY_MANIFEST) {
      expect(sql).toContain(manifestSqlTuple(entry));
    }
  });
});
