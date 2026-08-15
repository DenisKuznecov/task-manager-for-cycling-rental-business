import { z } from "zod";
import {
  SourceTagListSchema,
  classifyProductGroupTags,
  validateBundleTagAgreement,
  validateProductTagInheritance,
  type WorkshopTagClassification,
} from "./workshop-tags";

/**
 * Editable projection contract. PostgreSQL table/enum labels and the
 * migration-owned field-authority manifest are fixture-checked against
 * these constants — there is no second codegen package and no runtime
 * writer in this story.
 */
export const CANONICAL_PROJECTION_CONTRACT_VERSION = 1;
export const CANONICAL_PROJECTION_MIGRATION =
  "supabase/migrations/20260815000000_expand_canonical_booqable_projection.sql";

export const QUANTITY_ONE_UNIT_DISCRIMINATOR = "single";

export const ADMITTED_RESOURCE_TYPES = [
  "product_group",
  "product",
  "bundle",
  "bundle_item",
  "stock_item",
  "planning",
  "stock_item_planning",
] as const;

export const MEMBERSHIP_IDENTITY_FIELDS = [
  "order_external_id",
  "line_external_id",
  "source_unit_discriminator",
  "replacement_chain_incarnation",
] as const;

export const MEMBERSHIP_IDENTITY_KINDS = [
  "quantity_one_single",
  "stock_item_external_id",
] as const;

export const FORBIDDEN_MEMBERSHIP_IDENTITY_KINDS = [
  "planning_id",
  "stock_item_planning_id",
  "array_position",
] as const;

export const PROJECTION_ROW_ORIGINS = ["local", "booqable"] as const;
export const SOURCE_LIFECYCLES = ["open", "closed"] as const;

export const ENTITY_ORIGINS = [
  "local_customer",
  "booqable_customer",
  "booqable_order",
  "booqable_order_item",
  "booqable_product_group",
  "booqable_product",
  "booqable_bundle",
  "booqable_bundle_item",
  "booqable_stock_item",
  "booqable_planning",
  "booqable_stock_item_planning",
  "booqable_order_bike_membership",
  "booqable_membership_predecessor",
] as const;

export const FIELD_AUTHORITIES = [
  "booqable_source",
  "app_owned",
  "app_derived",
  "compatibility_alias",
] as const;

export const FIELD_WRITERS = [
  "legacy_sync",
  "local_customer_capability",
  "none_until_coordinator_cutover",
] as const;

export const BACKFILL_RULES = [
  "nullable_preserve",
  "derive_from_existing_identity",
  "default_open",
  "not_applicable_new_table",
] as const;

export const FIELD_DISPOSITIONS = [
  "retain",
  "project_source",
  "bounded_archived_pii",
  "compatibility_until_contract",
  "never_auto_merge",
] as const;

export const SHARED_PROJECTION_SOURCE_COLUMNS = [
  "entity_origin",
  "source_lifecycle",
  "source_version",
  "source_updated_at",
  "ingested_at",
] as const;

export const BOOQABLE_SOURCE_TABLES = [
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
] as const;

export const SHARED_PROJECTION_TABLES = [
  "customers",
  "orders",
  "order_items",
] as const;

export const BROWNFIELD_READER_VIEWS = {
  bookings_view: [
    "id",
    "booqable_order_id",
    "order_number",
    "order_number_text",
    "status",
    "starts_at",
    "stops_at",
    "amount_in_cents",
    "partner_id",
    "created_at",
    "customer_name",
    "customer_email",
    "customer_phone",
    "partner_name",
    "partner_slug",
  ],
  partner_customers_view: [
    "id",
    "name",
    "email",
    "phone",
    "birthday",
    "partner_id",
    "order_numbers",
    "order_numbers_text",
  ],
  bike_fits_view: [
    "id",
    "fit_number",
    "fit_number_text",
    "customer_id",
    "customer_name",
    "customer_email",
    "customer_phone",
    "created_by",
    "parent_fit_id",
    "date_of_fit",
    "bike_type",
    "status",
    "fit_label",
    "created_at",
    "updated_at",
  ],
} as const;

export const PG_PROJECTION_ENUM_LABELS = {
  projection_row_origin: PROJECTION_ROW_ORIGINS,
  projection_source_lifecycle: SOURCE_LIFECYCLES,
  projection_entity_origin: ENTITY_ORIGINS,
  projection_field_authority: FIELD_AUTHORITIES,
  projection_field_writer: FIELD_WRITERS,
  projection_backfill_rule: BACKFILL_RULES,
  projection_field_disposition: FIELD_DISPOSITIONS,
} as const;

export type AdmittedResourceType = (typeof ADMITTED_RESOURCE_TYPES)[number];
export type MembershipIdentityKind =
  (typeof MEMBERSHIP_IDENTITY_KINDS)[number];
export type ProjectionRowOrigin = (typeof PROJECTION_ROW_ORIGINS)[number];
export type SourceLifecycle = (typeof SOURCE_LIFECYCLES)[number];
export type EntityOrigin = (typeof ENTITY_ORIGINS)[number];
export type FieldAuthority = (typeof FIELD_AUTHORITIES)[number];
export type FieldWriter = (typeof FIELD_WRITERS)[number];
export type BackfillRule = (typeof BACKFILL_RULES)[number];
export type FieldDisposition = (typeof FIELD_DISPOSITIONS)[number];

export const ProjectionRowOriginSchema = z.enum(PROJECTION_ROW_ORIGINS);
export const SourceLifecycleSchema = z.enum(SOURCE_LIFECYCLES);
export const EntityOriginSchema = z.enum(ENTITY_ORIGINS);
export const FieldAuthoritySchema = z.enum(FIELD_AUTHORITIES);
export const FieldWriterSchema = z.enum(FIELD_WRITERS);
export const BackfillRuleSchema = z.enum(BACKFILL_RULES);
export const FieldDispositionSchema = z.enum(FIELD_DISPOSITIONS);
export const MembershipIdentityKindSchema = z.enum(MEMBERSHIP_IDENTITY_KINDS);

const NonEmptyIdSchema = z.string().trim().min(1);

function isRealUtcDateTime(value: string): boolean {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
  );
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (hour > 23 || minute > 59 || second > 59) {
    return false;
  }
  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day &&
    parsed.getUTCHours() === hour &&
    parsed.getUTCMinutes() === minute &&
    parsed.getUTCSeconds() === second
  );
}

const UtcDateTimeSchema = z.string().refine(isRealUtcDateTime, {
  message: "must be an ISO-8601 timestamp with a real UTC calendar date",
});

export const SourceProvenanceSchema = z
  .object({
    source_version: NonEmptyIdSchema.nullable(),
    source_updated_at: UtcDateTimeSchema.nullable(),
    ingested_at: UtcDateTimeSchema,
    source_lifecycle: SourceLifecycleSchema,
  })
  .strict();

export const MembershipIdentitySchema = z
  .object({
    order_external_id: NonEmptyIdSchema,
    line_external_id: NonEmptyIdSchema,
    source_unit_discriminator: NonEmptyIdSchema,
    replacement_chain_incarnation: z.number().int().positive(),
  })
  .strict();

export const FieldAuthorityEntrySchema = z
  .object({
    entity_origin: EntityOriginSchema,
    field_name: NonEmptyIdSchema,
    authority: FieldAuthoritySchema,
    writer: FieldWriterSchema,
    backfill_rule: BackfillRuleSchema,
    disposition: FieldDispositionSchema,
  })
  .strict();

const provenanceFields = {
  source_version: NonEmptyIdSchema.nullable(),
  source_updated_at: UtcDateTimeSchema.nullable(),
  ingested_at: UtcDateTimeSchema,
  source_lifecycle: SourceLifecycleSchema,
};

export const ProductGroupProjectionSchema = z
  .object({
    resource_type: z.literal("product_group"),
    external_id: NonEmptyIdSchema,
    tag_list: SourceTagListSchema,
    ...provenanceFields,
  })
  .strict();

export const ProductProjectionSchema = z
  .object({
    resource_type: z.literal("product"),
    external_id: NonEmptyIdSchema,
    product_group_external_id: NonEmptyIdSchema.nullable(),
    tag_list: SourceTagListSchema,
    ...provenanceFields,
  })
  .strict();

export const BundleProjectionSchema = z
  .object({
    resource_type: z.literal("bundle"),
    external_id: NonEmptyIdSchema,
    tag_list: SourceTagListSchema,
    ...provenanceFields,
  })
  .strict();

export const BundleItemProjectionSchema = z
  .object({
    resource_type: z.literal("bundle_item"),
    external_id: NonEmptyIdSchema,
    bundle_external_id: NonEmptyIdSchema,
    product_external_id: NonEmptyIdSchema.nullable(),
    product_group_external_id: NonEmptyIdSchema.nullable(),
    ...provenanceFields,
  })
  .strict();

export const StockItemProjectionSchema = z
  .object({
    resource_type: z.literal("stock_item"),
    external_id: NonEmptyIdSchema,
    product_external_id: NonEmptyIdSchema.nullable(),
    ...provenanceFields,
  })
  .strict();

export const PlanningProjectionSchema = z
  .object({
    resource_type: z.literal("planning"),
    external_id: NonEmptyIdSchema,
    order_external_id: NonEmptyIdSchema,
    line_external_id: NonEmptyIdSchema.nullable(),
    ...provenanceFields,
  })
  .strict();

export const StockItemPlanningProjectionSchema = z
  .object({
    resource_type: z.literal("stock_item_planning"),
    external_id: NonEmptyIdSchema,
    planning_external_id: NonEmptyIdSchema.nullable(),
    stock_item_external_id: NonEmptyIdSchema.nullable(),
    ...provenanceFields,
  })
  .strict();

export const MembershipProjectionSchema = z
  .object({
    id: z.string().uuid(),
    order_external_id: NonEmptyIdSchema,
    line_external_id: NonEmptyIdSchema,
    source_unit_discriminator: NonEmptyIdSchema,
    replacement_chain_incarnation: z.number().int().positive(),
    identity_kind: MembershipIdentityKindSchema,
    line_quantity: z.number().int().positive(),
    planning_external_id: NonEmptyIdSchema.nullable(),
    stock_item_planning_external_id: NonEmptyIdSchema.nullable(),
    stock_item_external_id: NonEmptyIdSchema.nullable(),
    ...provenanceFields,
  })
  .strict();

export const MembershipPredecessorSchema = z
  .object({
    successor_id: z.string().uuid(),
    predecessor_id: z.string().uuid(),
  })
  .strict()
  .refine((value) => value.successor_id !== value.predecessor_id, {
    message: "predecessor must reference a different membership",
  });

export const LocalCustomerOriginSchema = z
  .object({
    entity_origin: z.literal("local"),
    booqable_customer_id: z.null(),
  })
  .strict();

export const BooqableCustomerOriginSchema = z
  .object({
    entity_origin: z.literal("booqable"),
    booqable_customer_id: NonEmptyIdSchema,
  })
  .strict();

export const CanonicalGraphSchema = z
  .object({
    product_groups: z.array(ProductGroupProjectionSchema),
    products: z.array(ProductProjectionSchema),
    bundles: z.array(BundleProjectionSchema),
    bundle_items: z.array(BundleItemProjectionSchema),
    stock_items: z.array(StockItemProjectionSchema),
    plannings: z.array(PlanningProjectionSchema),
    stock_item_plannings: z.array(StockItemPlanningProjectionSchema),
    memberships: z.array(MembershipProjectionSchema),
    predecessors: z.array(MembershipPredecessorSchema),
  })
  .strict();

export type SourceProvenance = z.infer<typeof SourceProvenanceSchema>;
export type MembershipIdentity = z.infer<typeof MembershipIdentitySchema>;
export type FieldAuthorityEntry = z.infer<typeof FieldAuthorityEntrySchema>;
export type ProductGroupProjection = z.infer<typeof ProductGroupProjectionSchema>;
export type ProductProjection = z.infer<typeof ProductProjectionSchema>;
export type BundleProjection = z.infer<typeof BundleProjectionSchema>;
export type BundleItemProjection = z.infer<typeof BundleItemProjectionSchema>;
export type StockItemProjection = z.infer<typeof StockItemProjectionSchema>;
export type PlanningProjection = z.infer<typeof PlanningProjectionSchema>;
export type StockItemPlanningProjection = z.infer<
  typeof StockItemPlanningProjectionSchema
>;
export type MembershipProjection = z.infer<typeof MembershipProjectionSchema>;
export type MembershipPredecessor = z.infer<typeof MembershipPredecessorSchema>;
export type CanonicalGraph = z.infer<typeof CanonicalGraphSchema>;

export type CanonicalAdmissionResult =
  | { status: "accepted"; graph: CanonicalGraph }
  | {
      status: "rejected";
      reason: "schema" | "orphan_link" | "membership_identity";
      issues: string[];
    }
  | {
      status: "rejected";
      reason: "tag_admission";
      classification: WorkshopTagClassification;
    };

type ManifestSeed = [
  string,
  FieldAuthority,
  FieldWriter,
  BackfillRule,
  FieldDisposition,
];

function manifestRows(
  entityOrigin: EntityOrigin,
  fields: readonly ManifestSeed[],
): FieldAuthorityEntry[] {
  return fields.map(
    ([field_name, authority, writer, backfill_rule, disposition]) => ({
      entity_origin: entityOrigin,
      field_name,
      authority,
      writer,
      backfill_rule,
      disposition,
    }),
  );
}

const SHARED_SOURCE_STATE_FIELDS = [
  [
    "entity_origin",
    "app_derived",
    "none_until_coordinator_cutover",
    "derive_from_existing_identity",
    "never_auto_merge",
  ],
  [
    "source_lifecycle",
    "booqable_source",
    "none_until_coordinator_cutover",
    "default_open",
    "project_source",
  ],
  [
    "source_version",
    "booqable_source",
    "none_until_coordinator_cutover",
    "nullable_preserve",
    "project_source",
  ],
  [
    "source_updated_at",
    "booqable_source",
    "none_until_coordinator_cutover",
    "nullable_preserve",
    "project_source",
  ],
  [
    "ingested_at",
    "app_owned",
    "none_until_coordinator_cutover",
    "nullable_preserve",
    "project_source",
  ],
] as const satisfies readonly ManifestSeed[];

const NEW_TABLE_IDENTITY_FIELDS = [
  [
    "id",
    "app_owned",
    "none_until_coordinator_cutover",
    "not_applicable_new_table",
    "retain",
  ],
  [
    "external_id",
    "booqable_source",
    "none_until_coordinator_cutover",
    "not_applicable_new_table",
    "project_source",
  ],
] as const satisfies readonly ManifestSeed[];

const NEW_TABLE_SOURCE_STATE_FIELDS = [
  [
    "source_lifecycle",
    "booqable_source",
    "none_until_coordinator_cutover",
    "not_applicable_new_table",
    "project_source",
  ],
  [
    "source_version",
    "booqable_source",
    "none_until_coordinator_cutover",
    "not_applicable_new_table",
    "project_source",
  ],
  [
    "source_updated_at",
    "booqable_source",
    "none_until_coordinator_cutover",
    "not_applicable_new_table",
    "project_source",
  ],
  [
    "ingested_at",
    "app_owned",
    "none_until_coordinator_cutover",
    "not_applicable_new_table",
    "project_source",
  ],
] as const satisfies readonly ManifestSeed[];

const TAG_LIST_FIELD = [
  "tag_list",
  "booqable_source",
  "none_until_coordinator_cutover",
  "not_applicable_new_table",
  "project_source",
] as const satisfies ManifestSeed;

const OPAQUE_LINK_FIELD = [
  "booqable_source",
  "none_until_coordinator_cutover",
  "not_applicable_new_table",
  "project_source",
] as const;

const LOCAL_UUID_LINK_FIELD = [
  "app_owned",
  "none_until_coordinator_cutover",
  "not_applicable_new_table",
  "retain",
] as const;

/**
 * One authority, writer, backfill rule, and disposition per
 * `(entity_origin, field)`. Current brownfield writers stay named so this
 * story can classify fields without changing `sync.ts` or local-customer
 * creation. Completeness checks this map — it is not a second manifest.
 */
const MANIFEST_SEEDS_BY_ORIGIN: Record<
  EntityOrigin,
  readonly ManifestSeed[]
> = {
  local_customer: [
    ["id", "app_owned", "local_customer_capability", "nullable_preserve", "retain"],
    [
      "booqable_customer_id",
      "app_owned",
      "local_customer_capability",
      "nullable_preserve",
      "never_auto_merge",
    ],
    ["name", "app_owned", "local_customer_capability", "nullable_preserve", "retain"],
    ["email", "app_owned", "local_customer_capability", "nullable_preserve", "retain"],
    ["phone", "app_owned", "local_customer_capability", "nullable_preserve", "retain"],
    [
      "birthday",
      "app_owned",
      "local_customer_capability",
      "nullable_preserve",
      "retain",
    ],
    ["sex", "app_owned", "local_customer_capability", "nullable_preserve", "retain"],
    [
      "created_at",
      "app_owned",
      "local_customer_capability",
      "nullable_preserve",
      "retain",
    ],
    [
      "updated_at",
      "app_owned",
      "local_customer_capability",
      "nullable_preserve",
      "retain",
    ],
    [
      "entity_origin",
      "app_owned",
      "none_until_coordinator_cutover",
      "derive_from_existing_identity",
      "never_auto_merge",
    ],
    [
      "source_lifecycle",
      "app_owned",
      "none_until_coordinator_cutover",
      "nullable_preserve",
      "retain",
    ],
    [
      "source_version",
      "app_owned",
      "none_until_coordinator_cutover",
      "nullable_preserve",
      "retain",
    ],
    [
      "source_updated_at",
      "app_owned",
      "none_until_coordinator_cutover",
      "nullable_preserve",
      "retain",
    ],
    [
      "ingested_at",
      "app_owned",
      "none_until_coordinator_cutover",
      "nullable_preserve",
      "retain",
    ],
  ],
  booqable_customer: [
    ["id", "app_owned", "legacy_sync", "nullable_preserve", "retain"],
    [
      "booqable_customer_id",
      "booqable_source",
      "legacy_sync",
      "derive_from_existing_identity",
      "never_auto_merge",
    ],
    [
      "name",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "bounded_archived_pii",
    ],
    [
      "email",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "bounded_archived_pii",
    ],
    [
      "phone",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "bounded_archived_pii",
    ],
    [
      "birthday",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "bounded_archived_pii",
    ],
    [
      "sex",
      "app_owned",
      "local_customer_capability",
      "nullable_preserve",
      "bounded_archived_pii",
    ],
    [
      "created_at",
      "compatibility_alias",
      "legacy_sync",
      "nullable_preserve",
      "compatibility_until_contract",
    ],
    [
      "updated_at",
      "compatibility_alias",
      "legacy_sync",
      "nullable_preserve",
      "compatibility_until_contract",
    ],
    ...SHARED_SOURCE_STATE_FIELDS,
  ],
  booqable_order: [
    ["id", "app_owned", "legacy_sync", "nullable_preserve", "retain"],
    [
      "booqable_order_id",
      "booqable_source",
      "legacy_sync",
      "derive_from_existing_identity",
      "project_source",
    ],
    [
      "order_number",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    ["status", "booqable_source", "legacy_sync", "nullable_preserve", "project_source"],
    [
      "fulfillment_type",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    [
      "starts_at",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    [
      "stops_at",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    [
      "created_at",
      "compatibility_alias",
      "legacy_sync",
      "nullable_preserve",
      "compatibility_until_contract",
    ],
    [
      "updated_at",
      "compatibility_alias",
      "legacy_sync",
      "nullable_preserve",
      "compatibility_until_contract",
    ],
    [
      "delivery_address",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    [
      "billing_address",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    [
      "amount_in_cents",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    ["coupon_id", "app_owned", "legacy_sync", "nullable_preserve", "retain"],
    [
      "coupon_discount_in_cents",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    [
      "discount_type",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    [
      "discount_percentage",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    [
      "partner_id",
      "app_derived",
      "legacy_sync",
      "nullable_preserve",
      "compatibility_until_contract",
    ],
    ["customer_id", "app_owned", "legacy_sync", "nullable_preserve", "never_auto_merge"],
    [
      "partner_promo",
      "app_derived",
      "legacy_sync",
      "nullable_preserve",
      "compatibility_until_contract",
    ],
    [
      "coupon_code_value",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    [
      "payment_status",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    [
      "deposit_in_cents",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    [
      "tax_in_cents",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    [
      "grand_total_with_tax_in_cents",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    [
      "to_be_paid_in_cents",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    [
      "item_count",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    [
      "maps_link_order",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    ...SHARED_SOURCE_STATE_FIELDS,
  ],
  booqable_order_item: [
    ["id", "app_owned", "legacy_sync", "nullable_preserve", "retain"],
    ["order_id", "app_owned", "legacy_sync", "nullable_preserve", "retain"],
    [
      "booqable_line_id",
      "booqable_source",
      "legacy_sync",
      "derive_from_existing_identity",
      "project_source",
    ],
    [
      "booqable_item_id",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    [
      "parent_booqable_line_id",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    ["title", "booqable_source", "legacy_sync", "nullable_preserve", "project_source"],
    [
      "quantity",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    [
      "line_type",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    [
      "charge_label",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    [
      "extra_information",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    [
      "price_each_in_cents",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    [
      "price_in_cents",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "project_source",
    ],
    [
      "position",
      "booqable_source",
      "legacy_sync",
      "nullable_preserve",
      "compatibility_until_contract",
    ],
    ["relevant", "booqable_source", "legacy_sync", "nullable_preserve", "project_source"],
    [
      "created_at",
      "compatibility_alias",
      "legacy_sync",
      "nullable_preserve",
      "compatibility_until_contract",
    ],
    [
      "updated_at",
      "compatibility_alias",
      "legacy_sync",
      "nullable_preserve",
      "compatibility_until_contract",
    ],
    ...SHARED_SOURCE_STATE_FIELDS,
  ],
  booqable_product_group: [
    ...NEW_TABLE_IDENTITY_FIELDS,
    TAG_LIST_FIELD,
    ...NEW_TABLE_SOURCE_STATE_FIELDS,
  ],
  booqable_product: [
    ...NEW_TABLE_IDENTITY_FIELDS,
    ["product_group_external_id", ...OPAQUE_LINK_FIELD],
    ["product_group_id", ...LOCAL_UUID_LINK_FIELD],
    TAG_LIST_FIELD,
    ...NEW_TABLE_SOURCE_STATE_FIELDS,
  ],
  booqable_bundle: [
    ...NEW_TABLE_IDENTITY_FIELDS,
    TAG_LIST_FIELD,
    ...NEW_TABLE_SOURCE_STATE_FIELDS,
  ],
  booqable_bundle_item: [
    ...NEW_TABLE_IDENTITY_FIELDS,
    ["bundle_external_id", ...OPAQUE_LINK_FIELD],
    ["bundle_id", ...LOCAL_UUID_LINK_FIELD],
    ["product_external_id", ...OPAQUE_LINK_FIELD],
    ["product_id", ...LOCAL_UUID_LINK_FIELD],
    ["product_group_external_id", ...OPAQUE_LINK_FIELD],
    ["product_group_id", ...LOCAL_UUID_LINK_FIELD],
    ...NEW_TABLE_SOURCE_STATE_FIELDS,
  ],
  booqable_stock_item: [
    ...NEW_TABLE_IDENTITY_FIELDS,
    ["product_external_id", ...OPAQUE_LINK_FIELD],
    ["product_id", ...LOCAL_UUID_LINK_FIELD],
    ...NEW_TABLE_SOURCE_STATE_FIELDS,
  ],
  booqable_planning: [
    ...NEW_TABLE_IDENTITY_FIELDS,
    ["order_external_id", ...OPAQUE_LINK_FIELD],
    ["order_id", ...LOCAL_UUID_LINK_FIELD],
    ["line_external_id", ...OPAQUE_LINK_FIELD],
    ["order_item_id", ...LOCAL_UUID_LINK_FIELD],
    ...NEW_TABLE_SOURCE_STATE_FIELDS,
  ],
  booqable_stock_item_planning: [
    ...NEW_TABLE_IDENTITY_FIELDS,
    ["planning_external_id", ...OPAQUE_LINK_FIELD],
    ["planning_id", ...LOCAL_UUID_LINK_FIELD],
    ["stock_item_external_id", ...OPAQUE_LINK_FIELD],
    ["stock_item_id", ...LOCAL_UUID_LINK_FIELD],
    ...NEW_TABLE_SOURCE_STATE_FIELDS,
  ],
  booqable_order_bike_membership: [
    [
      "id",
      "app_owned",
      "none_until_coordinator_cutover",
      "not_applicable_new_table",
      "retain",
    ],
    ["order_external_id", ...OPAQUE_LINK_FIELD],
    ["line_external_id", ...OPAQUE_LINK_FIELD],
    [
      "source_unit_discriminator",
      "booqable_source",
      "none_until_coordinator_cutover",
      "not_applicable_new_table",
      "project_source",
    ],
    [
      "replacement_chain_incarnation",
      "app_owned",
      "none_until_coordinator_cutover",
      "not_applicable_new_table",
      "project_source",
    ],
    ["order_id", ...LOCAL_UUID_LINK_FIELD],
    ["order_item_id", ...LOCAL_UUID_LINK_FIELD],
    ["planning_external_id", ...OPAQUE_LINK_FIELD],
    ["planning_id", ...LOCAL_UUID_LINK_FIELD],
    ["stock_item_planning_external_id", ...OPAQUE_LINK_FIELD],
    ["stock_item_planning_id", ...LOCAL_UUID_LINK_FIELD],
    ["stock_item_external_id", ...OPAQUE_LINK_FIELD],
    ["stock_item_id", ...LOCAL_UUID_LINK_FIELD],
    ...NEW_TABLE_SOURCE_STATE_FIELDS,
  ],
  booqable_membership_predecessor: [
    [
      "successor_id",
      "app_owned",
      "none_until_coordinator_cutover",
      "not_applicable_new_table",
      "retain",
    ],
    [
      "predecessor_id",
      "app_owned",
      "none_until_coordinator_cutover",
      "not_applicable_new_table",
      "retain",
    ],
  ],
};

export const FIELD_AUTHORITY_MANIFEST: readonly FieldAuthorityEntry[] =
  ENTITY_ORIGINS.flatMap((origin) =>
    manifestRows(origin, MANIFEST_SEEDS_BY_ORIGIN[origin]),
  );

function membershipKey(membership: MembershipIdentity): string {
  return [
    membership.order_external_id,
    membership.line_external_id,
    membership.source_unit_discriminator,
    String(membership.replacement_chain_incarnation),
  ].join("\0");
}

function rejectDuplicateExternalIds(
  resources: readonly { external_id: string }[],
  label: string,
  issues: string[],
) {
  const seen = new Set<string>();
  for (const resource of resources) {
    if (seen.has(resource.external_id)) {
      issues.push(`duplicate ${label} identity ${resource.external_id}`);
    }
    seen.add(resource.external_id);
  }
}

/**
 * Tag lists stay complete source facts. Category is derived by the existing
 * Workshop tag contract and never stored in place of `tag_list`.
 */
export function admitTaggedResource(
  resource:
    | ProductGroupProjection
    | ProductProjection
    | BundleProjection,
  productGroupTagLists: readonly (readonly string[])[] = [],
): WorkshopTagClassification {
  if (resource.resource_type === "product_group") {
    return classifyProductGroupTags(resource.tag_list);
  }
  if (resource.resource_type === "product") {
    const [productGroupTags = []] = productGroupTagLists;
    return validateProductTagInheritance(resource.tag_list, productGroupTags);
  }
  return validateBundleTagAgreement(resource.tag_list, productGroupTagLists);
}

/**
 * Absence is permanently non-closing. Later stories may close a row only
 * after an independently approved explicit archive signal.
 */
export function applySourceAbsence<T extends { source_lifecycle: SourceLifecycle }>(
  current: T,
): T {
  return current;
}

export function applyExplicitClose(
  current: { source_lifecycle: SourceLifecycle },
  signal: { approved: true } | null,
):
  | { ok: true; source_lifecycle: "closed" }
  | { ok: false; source_lifecycle: SourceLifecycle } {
  if (!signal?.approved) {
    return { ok: false, source_lifecycle: current.source_lifecycle };
  }
  return { ok: true, source_lifecycle: "closed" };
}

/**
 * Fail closed on untagged, unknown, conflicting, inherited, or
 * bundle-disagreeing Workshop tags, and on orphan or illegal identity
 * links. Unknown referenced sources stay unknown instead of being stubbed.
 */
export function admitCanonicalGraph(input: unknown): CanonicalAdmissionResult {
  const parsed = CanonicalGraphSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "rejected",
      reason: "schema",
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "graph"}: ${issue.message}`,
      ),
    };
  }

  const graph = parsed.data;
  const issues: string[] = [];
  rejectDuplicateExternalIds(graph.product_groups, "product_group", issues);
  rejectDuplicateExternalIds(graph.products, "product", issues);
  rejectDuplicateExternalIds(graph.bundles, "bundle", issues);
  rejectDuplicateExternalIds(graph.bundle_items, "bundle_item", issues);
  rejectDuplicateExternalIds(graph.stock_items, "stock_item", issues);
  rejectDuplicateExternalIds(graph.plannings, "planning", issues);
  rejectDuplicateExternalIds(
    graph.stock_item_plannings,
    "stock_item_planning",
    issues,
  );

  const productGroupsById = new Map(
    graph.product_groups.map((resource) => [resource.external_id, resource]),
  );
  const productsById = new Map(
    graph.products.map((resource) => [resource.external_id, resource]),
  );
  const bundlesById = new Map(
    graph.bundles.map((resource) => [resource.external_id, resource]),
  );
  const membershipsById = new Map<string, MembershipProjection>();
  for (const membership of graph.memberships) {
    if (membershipsById.has(membership.id)) {
      issues.push(`duplicate membership id ${membership.id}`);
    }
    membershipsById.set(membership.id, membership);
  }
  const planningIds = new Set(graph.plannings.map((row) => row.external_id));
  const stockItemPlanningIds = new Set(
    graph.stock_item_plannings.map((row) => row.external_id),
  );

  for (const productGroup of graph.product_groups) {
    const classification = admitTaggedResource(productGroup);
    if (classification.status !== "classified") {
      return { status: "rejected", reason: "tag_admission", classification };
    }
  }

  for (const product of graph.products) {
    const productGroup = product.product_group_external_id
      ? productGroupsById.get(product.product_group_external_id)
      : undefined;
    const classification = productGroup
      ? admitTaggedResource(product, [productGroup.tag_list])
      : classifyProductGroupTags(product.tag_list);
    if (classification.status !== "classified") {
      return { status: "rejected", reason: "tag_admission", classification };
    }
  }

  for (const bundle of graph.bundles) {
    const classification = admitTaggedResource(
      bundle,
      containedProductGroupTagLists(
        bundle.external_id,
        graph,
        productGroupsById,
        productsById,
      ),
    );
    if (classification.status !== "classified") {
      return { status: "rejected", reason: "tag_admission", classification };
    }
  }

  for (const bundleItem of graph.bundle_items) {
    if (!bundlesById.has(bundleItem.bundle_external_id)) {
      issues.push(
        `orphan bundle_item ${bundleItem.external_id} references unknown bundle ${bundleItem.bundle_external_id}`,
      );
    }
  }

  const membershipKeys = new Set<string>();
  const lineMemberships = new Map<string, MembershipProjection[]>();

  for (const membership of graph.memberships) {
    const key = membershipKey(membership);
    if (membershipKeys.has(key)) {
      issues.push(`duplicate membership identity ${key.replaceAll("\0", "/")}`);
    }
    membershipKeys.add(key);

    if (
      membership.identity_kind === "quantity_one_single" &&
      (membership.source_unit_discriminator !==
        QUANTITY_ONE_UNIT_DISCRIMINATOR ||
        membership.line_quantity !== 1)
    ) {
      issues.push(
        `membership ${membership.id} may use '${QUANTITY_ONE_UNIT_DISCRIMINATOR}' only for quantity-one lines`,
      );
    }

    if (membership.identity_kind === "stock_item_external_id") {
      if (
        !membership.stock_item_external_id ||
        membership.source_unit_discriminator !==
          membership.stock_item_external_id
      ) {
        issues.push(
          `membership ${membership.id} must use a distinct StockItem external id as discriminator`,
        );
      }
      if (membership.line_quantity > 1 && !membership.stock_item_external_id) {
        issues.push(
          `membership ${membership.id} on a multi-quantity line requires a StockItem id`,
        );
      }
    }

    if (membership.line_quantity > 1) {
      if (membership.identity_kind !== "stock_item_external_id") {
        issues.push(
          `membership ${membership.id} on a multi-quantity line cannot use '${QUANTITY_ONE_UNIT_DISCRIMINATOR}'`,
        );
      }
    }

    if (
      planningIds.has(membership.source_unit_discriminator) ||
      membership.source_unit_discriminator === membership.planning_external_id
    ) {
      issues.push(
        `membership ${membership.id} cannot use a Planning id as identity`,
      );
    }
    if (
      stockItemPlanningIds.has(membership.source_unit_discriminator) ||
      membership.source_unit_discriminator ===
        membership.stock_item_planning_external_id
    ) {
      issues.push(
        `membership ${membership.id} cannot use a StockItemPlanning id as identity`,
      );
    }
    if (
      membership.identity_kind !== "stock_item_external_id" &&
      /^\d+$/.test(membership.source_unit_discriminator)
    ) {
      issues.push(
        `membership ${membership.id} cannot use an array position as identity`,
      );
    }

    const lineKey = `${membership.order_external_id}\0${membership.line_external_id}`;
    const existing = lineMemberships.get(lineKey) ?? [];
    existing.push(membership);
    lineMemberships.set(lineKey, existing);
  }

  for (const [lineKey, memberships] of lineMemberships) {
    const quantity = memberships[0]?.line_quantity ?? 1;
    if (memberships.some((row) => row.line_quantity !== quantity)) {
      issues.push(`inconsistent line_quantity on ${lineKey.replaceAll("\0", "/")}`);
    }
    if (quantity > 1) {
      const discriminators = memberships.map(
        (row) => row.source_unit_discriminator,
      );
      if (new Set(discriminators).size !== discriminators.length) {
        issues.push(
          `multi-quantity line ${lineKey.replaceAll("\0", "/")} requires distinct StockItem ids`,
        );
      }
    }
  }

  for (const predecessor of graph.predecessors) {
    if (!membershipsById.has(predecessor.successor_id)) {
      issues.push(
        `orphan predecessor successor ${predecessor.successor_id} is not in the graph`,
      );
    }
    if (!membershipsById.has(predecessor.predecessor_id)) {
      issues.push(
        `orphan predecessor ${predecessor.predecessor_id} is not in the graph`,
      );
    }
  }

  const orphanIssues = issues.filter((issue) => issue.includes("orphan"));
  const identityIssues = issues.filter((issue) => !issue.includes("orphan"));
  if (orphanIssues.length > 0) {
    return { status: "rejected", reason: "orphan_link", issues: orphanIssues };
  }
  if (identityIssues.length > 0) {
    return {
      status: "rejected",
      reason: "membership_identity",
      issues: identityIssues,
    };
  }

  return { status: "accepted", graph };
}

export function fieldAuthorityKey(entry: FieldAuthorityEntry): string {
  return `${entry.entity_origin}\0${entry.field_name}`;
}

export function manifestSqlTuple(entry: FieldAuthorityEntry): string {
  return `('${entry.entity_origin}', '${entry.field_name}', '${entry.authority}', '${entry.writer}', '${entry.backfill_rule}', '${entry.disposition}')`;
}

/**
 * Every projected `(entity_origin, field)` must appear exactly once so a
 * later writer cannot invent a second authority.
 */
export function assertManifestCompleteness(
  entries: readonly FieldAuthorityEntry[] = FIELD_AUTHORITY_MANIFEST,
): { ok: true } | { ok: false; error: string } {
  const keys = new Set<string>();
  for (const entry of entries) {
    const parsed = FieldAuthorityEntrySchema.safeParse(entry);
    if (!parsed.success) {
      return { ok: false, error: "manifest entry failed schema validation" };
    }
    const key = fieldAuthorityKey(entry);
    if (keys.has(key)) {
      return {
        ok: false,
        error: `duplicate manifest key ${entry.entity_origin}.${entry.field_name}`,
      };
    }
    keys.add(key);
  }

  for (const origin of ENTITY_ORIGINS) {
    for (const [fieldName] of MANIFEST_SEEDS_BY_ORIGIN[origin]) {
      if (
        !entries.some(
          (entry) =>
            entry.entity_origin === origin && entry.field_name === fieldName,
        )
      ) {
        return {
          ok: false,
          error: `manifest missing ${origin}.${fieldName}`,
        };
      }
    }
  }

  return { ok: true };
}

function containedProductGroupTagLists(
  bundleExternalId: string,
  graph: CanonicalGraph,
  productGroupsById: ReadonlyMap<string, ProductGroupProjection>,
  productsById: ReadonlyMap<string, ProductProjection>,
): string[][] {
  const groupIds = new Set<string>();
  for (const item of graph.bundle_items) {
    if (item.bundle_external_id !== bundleExternalId) {
      continue;
    }
    if (item.product_group_external_id) {
      groupIds.add(item.product_group_external_id);
    }
    if (item.product_external_id) {
      const product = productsById.get(item.product_external_id);
      if (product?.product_group_external_id) {
        groupIds.add(product.product_group_external_id);
      }
    }
  }

  const tagLists: string[][] = [];
  for (const groupId of groupIds) {
    const productGroup = productGroupsById.get(groupId);
    if (productGroup) {
      tagLists.push(productGroup.tag_list);
    }
  }
  return tagLists;
}
