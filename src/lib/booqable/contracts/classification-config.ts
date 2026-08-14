import { z } from "zod";
import { WORKSHOP_SETUP_CATEGORIES } from "@/src/lib/workshop-tasks/types";

/**
 * Empty and unproven is the v1 contract. ProductGroup UUIDs and Setup field
 * identifiers are not invented here — later approval adds real keys.
 */
export const CLASSIFICATION_SCHEMA_VERSION = 1;

export const CLASSIFICATION_SOURCE_PATH =
  "src/lib/booqable/contracts/classification-config.ts";

export const CLASSIFICATION_MAPPING_CONFIG_MIGRATION =
  "supabase/migrations/20260814160000_classification_mapping_config.sql";

export const CLASSIFICATION_MODES = [
  "review_updated_configuration",
  "targeted",
] as const;

export const CLASSIFICATION_CONFIG_STATUSES = [
  "active",
  "superseded",
] as const;

export const CLASSIFICATION_ALLOWLIST_ORIGINS = [
  "business_approved",
] as const;

export const CLASSIFICATION_DISPLAY_LABEL_KINDS = [
  "analyst_candidate",
  "excluded",
] as const;

export const CLASSIFICATION_SETUP_FIXTURE_KINDS = [
  "null",
  "unknown",
  "changed",
  "removed",
] as const;

export const CLASSIFICATION_DEFAULT_MODE =
  "review_updated_configuration" as const;

export const CLASSIFICATION_PG_ENUM_LABELS = {
  classification_config_mode: CLASSIFICATION_MODES,
  classification_config_status: CLASSIFICATION_CONFIG_STATUSES,
  classification_setup_category: WORKSHOP_SETUP_CATEGORIES,
  classification_setup_fixture_kind: CLASSIFICATION_SETUP_FIXTURE_KINDS,
  classification_allowlist_origin: CLASSIFICATION_ALLOWLIST_ORIGINS,
} as const;

export type ClassificationMode = (typeof CLASSIFICATION_MODES)[number];
export type ClassificationConfigStatus =
  (typeof CLASSIFICATION_CONFIG_STATUSES)[number];
export type ClassificationAllowlistOrigin =
  (typeof CLASSIFICATION_ALLOWLIST_ORIGINS)[number];
export type ClassificationDisplayLabelKind =
  (typeof CLASSIFICATION_DISPLAY_LABEL_KINDS)[number];
export type ClassificationSetupFixtureKind =
  (typeof CLASSIFICATION_SETUP_FIXTURE_KINDS)[number];

export const ClassificationModeSchema = z.enum(CLASSIFICATION_MODES);
export const ClassificationConfigStatusSchema = z.enum(
  CLASSIFICATION_CONFIG_STATUSES,
);
export const ClassificationAllowlistOriginSchema = z.enum(
  CLASSIFICATION_ALLOWLIST_ORIGINS,
);
export const ClassificationDisplayLabelKindSchema = z.enum(
  CLASSIFICATION_DISPLAY_LABEL_KINDS,
);
export const ClassificationSetupFixtureKindSchema = z.enum(
  CLASSIFICATION_SETUP_FIXTURE_KINDS,
);

const ProductGroupIdSchema = z.string().uuid();

/**
 * Provenance belongs on the UUID key. A display name is never a valid key.
 */
export const AllowlistEntryProvenanceSchema = z
  .object({
    origin: ClassificationAllowlistOriginSchema,
    collected_at: z.string().trim().min(1),
    note: z.string().trim().min(1).optional(),
  })
  .strict();

export const ProductGroupAllowlistSchema = z.record(
  ProductGroupIdSchema,
  AllowlistEntryProvenanceSchema,
);

/**
 * Analyst-candidate and excluded names stay off the allowlist so they cannot
 * classify bikes or create tasks.
 */
export const DisplayOnlyProductGroupLabelSchema = z
  .object({
    name: z.string().trim().min(1),
    kind: ClassificationDisplayLabelKindSchema,
    note: z.string().trim().min(1).optional(),
  })
  .strict();

export const SetupSlotFixturesSchema = z
  .object({
    null: z.string().trim().min(1).nullable(),
    unknown: z.string().trim().min(1).nullable(),
    changed: z.string().trim().min(1).nullable(),
    removed: z.string().trim().min(1).nullable(),
  })
  .strict();

export const SetupSlotSchema = z
  .object({
    category: z.enum(WORKSHOP_SETUP_CATEGORIES),
    identifier: z.string().trim().min(1).nullable(),
    fixtures: SetupSlotFixturesSchema,
  })
  .strict();

export const ClassificationProvenanceSchema = z
  .object({
    origin: z.literal("editable_source"),
    source: z.literal(CLASSIFICATION_SOURCE_PATH),
  })
  .strict();

function rejectIncompleteSetupSlots(
  value: {
    mode: ClassificationMode;
    allowlist: Record<string, unknown>;
    setup_slots: {
      category: (typeof WORKSHOP_SETUP_CATEGORIES)[number];
      identifier: string | null;
      fixtures: {
        null: string | null;
        unknown: string | null;
        changed: string | null;
        removed: string | null;
      };
    }[];
  },
  ctx: z.RefinementCtx,
) {
  const seen = new Set<string>();
  value.setup_slots.forEach((slot, index) => {
    if (seen.has(slot.category)) {
      ctx.addIssue({
        code: "custom",
        path: ["setup_slots", index, "category"],
        message: "duplicate setup category",
      });
    }
    seen.add(slot.category);
  });

  for (const category of WORKSHOP_SETUP_CATEGORIES) {
    if (!seen.has(category)) {
      ctx.addIssue({
        code: "custom",
        path: ["setup_slots"],
        message: `missing setup category ${category}`,
      });
    }
  }

  if (value.mode === "targeted" && !allSetupSlotsProven(value.setup_slots)) {
    ctx.addIssue({
      code: "custom",
      path: ["mode"],
      message: TARGETED_UNPROVEN_MESSAGE,
    });
  }
}

export const ClassificationSourceSchema = z
  .object({
    schema_version: z.literal(CLASSIFICATION_SCHEMA_VERSION),
    mode: ClassificationModeSchema,
    allowlist: ProductGroupAllowlistSchema,
    display_labels: z.array(DisplayOnlyProductGroupLabelSchema),
    setup_slots: z.array(SetupSlotSchema).length(WORKSHOP_SETUP_CATEGORIES.length),
    provenance: ClassificationProvenanceSchema,
  })
  .strict()
  .superRefine(rejectIncompleteSetupSlots);

export type AllowlistEntryProvenance = z.infer<
  typeof AllowlistEntryProvenanceSchema
>;
export type ProductGroupAllowlist = z.infer<typeof ProductGroupAllowlistSchema>;
export type DisplayOnlyProductGroupLabel = z.infer<
  typeof DisplayOnlyProductGroupLabelSchema
>;
export type SetupSlotFixtures = z.infer<typeof SetupSlotFixturesSchema>;
export type SetupSlot = z.infer<typeof SetupSlotSchema>;
export type ClassificationProvenance = z.infer<
  typeof ClassificationProvenanceSchema
>;
export type ClassificationSource = z.infer<typeof ClassificationSourceSchema>;

export const TARGETED_UNPROVEN_MESSAGE =
  "Targeted mode requires proven setup mappings";

export const UNPROVEN_SETUP_FIXTURES = {
  null: null,
  unknown: null,
  changed: null,
  removed: null,
} as const satisfies SetupSlotFixtures;

export const V1_SETUP_SLOTS: SetupSlot[] = [
  {
    category: "pedals",
    identifier: null,
    fixtures: { ...UNPROVEN_SETUP_FIXTURES },
  },
  {
    category: "saddle",
    identifier: null,
    fixtures: { ...UNPROVEN_SETUP_FIXTURES },
  },
  {
    category: "wheelset",
    identifier: null,
    fixtures: { ...UNPROVEN_SETUP_FIXTURES },
  },
  {
    category: "power-meter",
    identifier: null,
    fixtures: { ...UNPROVEN_SETUP_FIXTURES },
  },
  {
    category: "computer-mount",
    identifier: null,
    fixtures: { ...UNPROVEN_SETUP_FIXTURES },
  },
];

export const V1_CLASSIFICATION_SOURCE: ClassificationSource = {
  schema_version: CLASSIFICATION_SCHEMA_VERSION,
  mode: CLASSIFICATION_DEFAULT_MODE,
  allowlist: {},
  display_labels: [],
  setup_slots: V1_SETUP_SLOTS,
  provenance: {
    origin: "editable_source",
    source: CLASSIFICATION_SOURCE_PATH,
  },
};

/**
 * Editable v1 snapshot. Empty allowlist and unproven slots fail closed until
 * business-approved UUIDs and fixture-backed identifiers exist.
 */
export const CLASSIFICATION_ALLOWLIST: ProductGroupAllowlist = {};
export const CLASSIFICATION_DISPLAY_LABELS: DisplayOnlyProductGroupLabel[] = [];
export const CLASSIFICATION_SETUP_SLOTS: readonly SetupSlot[] = V1_SETUP_SLOTS;

function isProvenSetupValue(value: string | null): boolean {
  return value != null && value.trim() !== "";
}

export function isSetupSlotProven(slot: SetupSlot): boolean {
  return (
    isProvenSetupValue(slot.identifier) &&
    isProvenSetupValue(slot.fixtures.null) &&
    isProvenSetupValue(slot.fixtures.unknown) &&
    isProvenSetupValue(slot.fixtures.changed) &&
    isProvenSetupValue(slot.fixtures.removed)
  );
}

/**
 * Targeted stays off until every Workshop Setup Category has a stable
 * identifier and complete null/unknown/changed/removed fixtures.
 */
export function allSetupSlotsProven(
  slots: readonly SetupSlot[],
): boolean {
  if (slots.length !== WORKSHOP_SETUP_CATEGORIES.length) return false;
  const byCategory = new Map(slots.map((slot) => [slot.category, slot]));
  return WORKSHOP_SETUP_CATEGORIES.every((category) => {
    const slot = byCategory.get(category);
    return slot != null && isSetupSlotProven(slot);
  });
}

export function liveClassificationSource(): ClassificationSource {
  return {
    schema_version: CLASSIFICATION_SCHEMA_VERSION,
    mode: CLASSIFICATION_DEFAULT_MODE,
    allowlist: { ...CLASSIFICATION_ALLOWLIST },
    display_labels: CLASSIFICATION_DISPLAY_LABELS.map((label) => ({
      ...label,
    })),
    setup_slots: CLASSIFICATION_SETUP_SLOTS.map((slot) => ({
      category: slot.category,
      identifier: slot.identifier,
      fixtures: { ...slot.fixtures },
    })),
    provenance: {
      origin: "editable_source",
      source: CLASSIFICATION_SOURCE_PATH,
    },
  };
}
