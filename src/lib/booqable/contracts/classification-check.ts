import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { extractPgEnumLabels, type ContractsCheckResult } from "./check";
import {
  allSetupSlotsProven,
  CLASSIFICATION_MAPPING_CONFIG_MIGRATION,
  CLASSIFICATION_PG_ENUM_LABELS,
  CLASSIFICATION_SCHEMA_VERSION,
  ClassificationSourceSchema,
  liveClassificationSource,
  V1_CLASSIFICATION_SOURCE,
  type ClassificationSource,
} from "./classification-config";
import { WORKSHOP_SETUP_CATEGORIES } from "@/src/lib/workshop-tasks/types";

function sameStringList(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return left.length === right.length && left.every((value, i) => value === right[i]);
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, current) => {
    if (current && typeof current === "object" && !Array.isArray(current)) {
      return Object.fromEntries(
        Object.entries(current as Record<string, unknown>).sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      );
    }
    return current;
  });
}

function sameClassificationSource(
  left: ClassificationSource,
  right: ClassificationSource,
): boolean {
  return stableJson(left) === stableJson(right);
}

function contractsRepoRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "../../../..");
}

/**
 * Fail closed when the editable classification source, frozen v1 snapshot, or
 * PostgreSQL enum labels diverge — runtime reads the Active row, so a silent
 * rewrite would approve the wrong allowlist or unlock targeted too early.
 */
export function runClassificationContractsCheck(
  sqlSource?: string,
  liveSource?: ClassificationSource,
): ContractsCheckResult {
  let sql = sqlSource;
  if (sql === undefined) {
    try {
      sql = readFileSync(
        join(contractsRepoRoot(), CLASSIFICATION_MAPPING_CONFIG_MIGRATION),
        "utf8",
      );
    } catch {
      return {
        ok: false,
        error: `migration is missing ${CLASSIFICATION_MAPPING_CONFIG_MIGRATION} (missing regeneration)`,
      };
    }
  }

  const live = liveSource ?? liveClassificationSource();
  if (live.mode === "targeted" && !allSetupSlotsProven(live.setup_slots)) {
    return {
      ok: false,
      error: "unproven targeted: setup identifiers or fixtures are incomplete",
    };
  }

  const parsed = ClassificationSourceSchema.safeParse(live);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "live classification source is invalid",
    };
  }

  if (live.schema_version !== CLASSIFICATION_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `live schema version ${live.schema_version} does not match CLASSIFICATION_SCHEMA_VERSION ${CLASSIFICATION_SCHEMA_VERSION}`,
    };
  }

  if (
    live.schema_version === 1 &&
    !sameClassificationSource(live, V1_CLASSIFICATION_SOURCE)
  ) {
    return {
      ok: false,
      error:
        "v1 classification source drifted from the frozen empty-allowlist unproven snapshot",
    };
  }

  if (
    !sameStringList(
      live.setup_slots.map((slot) => slot.category),
      WORKSHOP_SETUP_CATEGORIES,
    )
  ) {
    return {
      ok: false,
      error: "setup slot categories drifted from WORKSHOP_SETUP_CATEGORIES",
    };
  }

  if (
    !sameStringList(
      CLASSIFICATION_PG_ENUM_LABELS.classification_setup_category,
      WORKSHOP_SETUP_CATEGORIES,
    )
  ) {
    return {
      ok: false,
      error:
        "classification_setup_category labels drifted from WORKSHOP_SETUP_CATEGORIES",
    };
  }

  for (const [typeName, labels] of Object.entries(CLASSIFICATION_PG_ENUM_LABELS)) {
    const sqlLabels = extractPgEnumLabels(sql, typeName);
    if (!sqlLabels) {
      return {
        ok: false,
        error: `migration is missing CREATE TYPE ${typeName} AS ENUM (missing regeneration)`,
      };
    }
    if (!sameStringList(labels, sqlLabels)) {
      return {
        ok: false,
        error: `vocabulary mismatch for ${typeName}: source [${labels.join(", ")}] vs migration [${sqlLabels.join(", ")}]`,
      };
    }
  }

  return { ok: true };
}
