import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extractPgEnumLabels } from "@/src/lib/booqable/contracts";
import {
  BROWNFIELD_READER_VIEWS,
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
  WORKSHOP_BUNDLE_TAGS,
  WORKSHOP_PRODUCT_GROUP_TAGS,
  admitCanonicalGraph,
  applyExplicitClose,
  applySourceAbsence,
  assertManifestCompleteness,
  fieldAuthorityKey,
  manifestSqlTuple,
  type CanonicalGraph,
} from "@/src/lib/booqable/contracts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

const PROVENANCE = {
  source_version: "2026-08-15T09:00:00.000Z",
  source_updated_at: "2026-08-15T09:00:00.000Z",
  ingested_at: "2026-08-15T09:05:00.000Z",
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
    bundles: [
      {
        resource_type: "bundle",
        external_id: "bundle_road",
        tag_list: [WORKSHOP_BUNDLE_TAGS.road],
        ...PROVENANCE,
      },
    ],
    bundle_items: [
      {
        resource_type: "bundle_item",
        external_id: "bi_1",
        bundle_external_id: "bundle_road",
        product_external_id: "prod_road",
        product_group_external_id: "pg_road",
        ...PROVENANCE,
      },
    ],
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

describe("canonical projection I/O matrix", () => {
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

  it("rejects untagged, unknown, multiple, inherited, and disagreeing bundle tags", () => {
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

    graph.memberships[1].source_unit_discriminator = "si_1";
    graph.memberships[1].stock_item_external_id = "si_1";
    expect(admitCanonicalGraph(graph)).toMatchObject({
      status: "rejected",
      reason: "membership_identity",
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
    const sql = readFileSync(
      join(repoRoot, CANONICAL_PROJECTION_MIGRATION),
      "utf8",
    );

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
