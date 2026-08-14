import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  allSetupSlotsProven,
  CLASSIFICATION_DEFAULT_MODE,
  CLASSIFICATION_MAPPING_CONFIG_MIGRATION,
  CLASSIFICATION_MODES,
  CLASSIFICATION_PG_ENUM_LABELS,
  CLASSIFICATION_SCHEMA_VERSION,
  ClassificationSourceSchema,
  extractPgEnumLabels,
  isSetupSlotProven,
  liveClassificationSource,
  ProductGroupAllowlistSchema,
  runClassificationContractsCheck,
  TARGETED_UNPROVEN_MESSAGE,
  V1_CLASSIFICATION_SOURCE,
  type ClassificationSource,
} from "@/src/lib/booqable/contracts";
import { WORKSHOP_SETUP_CATEGORIES } from "@/src/lib/workshop-tasks/types";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

const EXPECTED_V1_SOURCE: ClassificationSource = {
  schema_version: 1,
  mode: "review_updated_configuration",
  allowlist: {},
  display_labels: [],
  setup_slots: [
    {
      category: "pedals",
      identifier: null,
      fixtures: { null: null, unknown: null, changed: null, removed: null },
    },
    {
      category: "saddle",
      identifier: null,
      fixtures: { null: null, unknown: null, changed: null, removed: null },
    },
    {
      category: "wheelset",
      identifier: null,
      fixtures: { null: null, unknown: null, changed: null, removed: null },
    },
    {
      category: "power-meter",
      identifier: null,
      fixtures: { null: null, unknown: null, changed: null, removed: null },
    },
    {
      category: "computer-mount",
      identifier: null,
      fixtures: { null: null, unknown: null, changed: null, removed: null },
    },
  ],
  provenance: {
    origin: "editable_source",
    source: "src/lib/booqable/contracts/classification-config.ts",
  },
};

function provenSlots(): ClassificationSource["setup_slots"] {
  return WORKSHOP_SETUP_CATEGORIES.map((category) => ({
    category,
    identifier: `field:${category}`,
    fixtures: {
      null: "null",
      unknown: "unknown",
      changed: "changed",
      removed: "removed",
    },
  }));
}

describe("classification config I/O matrix", () => {
  it("accepts the first-approve v1 source (empty allowlist, unproven slots, broad mode)", () => {
    const parsed = ClassificationSourceSchema.safeParse(liveClassificationSource());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.mode).toBe(CLASSIFICATION_DEFAULT_MODE);
      expect(parsed.data.allowlist).toEqual({});
      expect(parsed.data.display_labels).toEqual([]);
      expect(allSetupSlotsProven(parsed.data.setup_slots)).toBe(false);
    }
  });

  it("rejects targeted mode while any slot lacks identifier or fixtures", () => {
    const parsed = ClassificationSourceSchema.safeParse({
      ...liveClassificationSource(),
      mode: "targeted",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.length).toBeGreaterThan(0);
      expect(
        parsed.error.issues.some(
          (issue) => issue.message === TARGETED_UNPROVEN_MESSAGE,
        ),
      ).toBe(true);
    }
  });

  it("rejects a label-only allowlist key", () => {
    const parsed = ProductGroupAllowlistSchema.safeParse({
      "Road Bike": {
        origin: "business_approved",
        collected_at: "2026-08-14T00:00:00.000Z",
      },
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.length).toBeGreaterThan(0);
    }
  });

  it("rejects an allowlist entry submitted without a UUID key", () => {
    const parsed = ClassificationSourceSchema.safeParse({
      ...liveClassificationSource(),
      allowlist: {
        "analyst-candidate-e-road": {
          origin: "business_approved",
          collected_at: "2026-08-14T00:00:00.000Z",
        },
      },
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.length).toBeGreaterThan(0);
    }
  });

  it("keeps display-only labels off the allowlist", () => {
    const source = liveClassificationSource();
    expect(Object.keys(source.allowlist)).toEqual([]);
    for (const label of source.display_labels) {
      expect(source.allowlist[label.name]).toBeUndefined();
    }
  });

  it("accepts targeted only when every slot is fixture-proven", () => {
    const parsed = ClassificationSourceSchema.safeParse({
      ...liveClassificationSource(),
      schema_version: CLASSIFICATION_SCHEMA_VERSION,
      mode: "targeted",
      setup_slots: provenSlots(),
    });
    expect(parsed.success).toBe(true);
  });

  it("treats trimmed-empty identifiers and fixtures as unproven", () => {
    expect(
      isSetupSlotProven({
        category: "pedals",
        identifier: "   ",
        fixtures: {
          null: "null",
          unknown: "unknown",
          changed: "changed",
          removed: "removed",
        },
      }),
    ).toBe(false);
    expect(
      isSetupSlotProven({
        category: "pedals",
        identifier: "field:pedals",
        fixtures: {
          null: "",
          unknown: "unknown",
          changed: "changed",
          removed: "removed",
        },
      }),
    ).toBe(false);
  });

  it("rejects undeclared source fields", () => {
    const parsed = ClassificationSourceSchema.safeParse({
      ...liveClassificationSource(),
      unexpected_top_level: true,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.error.issues.some((issue) => issue.code === "unrecognized_keys"),
      ).toBe(true);
    }
  });
});

describe("classification drift and fixtures", () => {
  it("passes classification contracts:check against the live source and migration", () => {
    expect(runClassificationContractsCheck()).toEqual({ ok: true });
  });

  it("asserts source labels match the migration text", () => {
    const sql = readFileSync(
      join(repoRoot, CLASSIFICATION_MAPPING_CONFIG_MIGRATION),
      "utf8",
    );

    for (const [typeName, labels] of Object.entries(CLASSIFICATION_PG_ENUM_LABELS)) {
      expect(extractPgEnumLabels(sql, typeName)).toEqual([...labels]);
    }
    expect(CLASSIFICATION_MODES).toEqual([
      "review_updated_configuration",
      "targeted",
    ]);
    expect(CLASSIFICATION_PG_ENUM_LABELS.classification_setup_category).toEqual([
      ...WORKSHOP_SETUP_CATEGORIES,
    ]);
  });

  it("freezes the published v1 snapshot independently of the live source", () => {
    expect(V1_CLASSIFICATION_SOURCE).toEqual(EXPECTED_V1_SOURCE);
    expect(liveClassificationSource()).toEqual(EXPECTED_V1_SOURCE);
  });

  it("fails when the PostgreSQL vocabulary was not regenerated", () => {
    const drifted = `
CREATE TYPE public.classification_config_mode AS ENUM (
  'review_updated_configuration'
);
CREATE TYPE public.classification_config_status AS ENUM (
  'active',
  'superseded'
);
CREATE TYPE public.classification_setup_category AS ENUM (
  'pedals',
  'saddle',
  'wheelset',
  'power-meter',
  'computer-mount'
);
CREATE TYPE public.classification_setup_fixture_kind AS ENUM (
  'null',
  'unknown',
  'changed',
  'removed'
);
CREATE TYPE public.classification_allowlist_origin AS ENUM (
  'business_approved'
);
`;
    const result = runClassificationContractsCheck(drifted);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/vocabulary mismatch|missing regeneration/);
    }
  });

  it("fails closed on unproven targeted in the drift engine", () => {
    const validSql = `
CREATE TYPE public.classification_config_mode AS ENUM (
  'review_updated_configuration',
  'targeted'
);
CREATE TYPE public.classification_config_status AS ENUM (
  'active',
  'superseded'
);
CREATE TYPE public.classification_setup_category AS ENUM (
  'pedals',
  'saddle',
  'wheelset',
  'power-meter',
  'computer-mount'
);
CREATE TYPE public.classification_setup_fixture_kind AS ENUM (
  'null',
  'unknown',
  'changed',
  'removed'
);
CREATE TYPE public.classification_allowlist_origin AS ENUM (
  'business_approved'
);
`;
    const targetedUnproven: ClassificationSource = {
      ...liveClassificationSource(),
      mode: "targeted",
    };
    const result = runClassificationContractsCheck(validSql, targetedUnproven);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/unproven targeted/);
    }
    expect(allSetupSlotsProven(targetedUnproven.setup_slots)).toBe(false);
  });
});
