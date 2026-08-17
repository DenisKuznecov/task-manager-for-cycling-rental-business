import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  COMPARATOR_SEMANTICS,
  COMPATIBILITY_RULES,
  type EnvelopeVocabulary,
  SOURCE_ENVELOPE_SCHEMA_VERSION,
  SOURCE_ENVELOPE_VOCABULARY_MIGRATION,
  V1_VOCABULARY,
} from "./compatibility";
import {
  OPTIONAL_ENVELOPE_FIELDS,
  PG_ENUM_LABELS,
  RELATIONSHIP_SCOPES,
  REQUIRED_ENVELOPE_FIELDS,
  REQUIRED_IDENTITY_FIELDS,
  REQUIRED_RESOURCE_SLOT_FIELDS,
  RESOURCE_PRESENCES,
  SOURCE_APPLY_RESULTS,
  SOURCE_ENVELOPE_KINDS,
} from "./source-envelope";

export type CompatibilityChange =
  | "identical"
  | "additive"
  | "breaking";

export type CompatibilityVerdict =
  | { ok: true; change: CompatibilityChange }
  | { ok: false; change: CompatibilityChange; reason: string };

export type ContractsCheckResult =
  | { ok: true }
  | { ok: false; error: string };

const LIST_KEYS = [
  "kinds",
  "scopes",
  "presences",
  "results",
  "pgEnumTypes",
] as const satisfies readonly (keyof EnvelopeVocabulary)[];

const REQUIRED_FIELD_KEYS = [
  "requiredEnvelopeFields",
  "requiredIdentityFields",
  "requiredResourceSlotFields",
] as const satisfies readonly (keyof EnvelopeVocabulary)[];

/**
 * Classifies published-vs-candidate vocabulary so CI can fail closed on an
 * unversioned rewrite instead of trusting a hand-updated snapshot.
 */
export function assessCompatibility(
  published: EnvelopeVocabulary,
  candidate: EnvelopeVocabulary,
): CompatibilityVerdict {
  if (
    !Number.isFinite(published.schemaVersion) ||
    !Number.isFinite(candidate.schemaVersion)
  ) {
    return {
      ok: false,
      change: "breaking",
      reason: "schemaVersion is not a finite number",
    };
  }

  const additive: string[] = [];
  const breaking: string[] = [];

  for (const field of requiredOptionalOverlap(published)) {
    breaking.push(`published field ${field} is both required and optional`);
  }
  for (const field of requiredOptionalOverlap(candidate)) {
    breaking.push(`candidate field ${field} is both required and optional`);
  }

  for (const key of LIST_KEYS) {
    const before = published[key];
    const after = candidate[key];
    for (const value of after) {
      if (!before.includes(value)) {
        additive.push(`${key}: added ${value}`);
      }
    }
    for (const value of before) {
      if (!after.includes(value)) {
        breaking.push(`${key}: dropped ${value}`);
      }
    }
  }

  for (const key of REQUIRED_FIELD_KEYS) {
    const before = published[key];
    const after = candidate[key];
    for (const field of before) {
      if (!after.includes(field)) {
        breaking.push(
          candidate.optionalEnvelopeFields.includes(field)
            ? `${key}: ${field} required → optional`
            : `${key}: removed ${field}`,
        );
      }
    }
    for (const field of after) {
      if (!before.includes(field)) {
        breaking.push(`${key}: added required ${field}`);
      }
    }
  }

  for (const field of candidate.optionalEnvelopeFields) {
    if (
      !published.optionalEnvelopeFields.includes(field) &&
      !published.requiredEnvelopeFields.includes(field)
    ) {
      additive.push(`optionalEnvelopeFields: added ${field}`);
    }
  }

  for (const field of published.optionalEnvelopeFields) {
    if (!candidate.optionalEnvelopeFields.includes(field)) {
      if (candidate.requiredEnvelopeFields.includes(field)) {
        breaking.push(`optionalEnvelopeFields: promoted ${field} to required`);
      } else {
        breaking.push(`optionalEnvelopeFields: removed ${field}`);
      }
    }
  }

  const versionUnchanged = candidate.schemaVersion === published.schemaVersion;

  if (candidate.schemaVersion < published.schemaVersion) {
    return {
      ok: false,
      change: "breaking",
      reason: `schema version ${candidate.schemaVersion} is older than published ${published.schemaVersion}`,
    };
  }

  if (breaking.length > 0) {
    if (versionUnchanged && COMPATIBILITY_RULES.breakingRequiresVersionBump) {
      return {
        ok: false,
        change: "breaking",
        reason: `unversioned breaking change: ${breaking.join("; ")}`,
      };
    }
    return { ok: true, change: "breaking" };
  }

  if (additive.length > 0) {
    if (versionUnchanged && COMPATIBILITY_RULES.additiveRequiresVersionBump) {
      return {
        ok: false,
        change: "additive",
        reason: `unversioned additive change: ${additive.join("; ")}`,
      };
    }
    return { ok: true, change: "additive" };
  }

  return { ok: true, change: "identical" };
}

function requiredOptionalOverlap(vocab: EnvelopeVocabulary): string[] {
  return vocab.requiredEnvelopeFields.filter((field) =>
    vocab.optionalEnvelopeFields.includes(field),
  );
}

export function liveEnvelopeVocabulary(): EnvelopeVocabulary {
  return {
    schemaVersion: SOURCE_ENVELOPE_SCHEMA_VERSION,
    kinds: SOURCE_ENVELOPE_KINDS,
    scopes: RELATIONSHIP_SCOPES,
    presences: RESOURCE_PRESENCES,
    results: SOURCE_APPLY_RESULTS,
    requiredEnvelopeFields: REQUIRED_ENVELOPE_FIELDS,
    optionalEnvelopeFields: OPTIONAL_ENVELOPE_FIELDS,
    requiredIdentityFields: REQUIRED_IDENTITY_FIELDS,
    requiredResourceSlotFields: REQUIRED_RESOURCE_SLOT_FIELDS,
    pgEnumTypes: Object.keys(PG_ENUM_LABELS),
  };
}

export function extractPgEnumLabels(
  sql: string,
  typeName: string,
): string[] | null {
  const escaped = typeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = sql.match(
    new RegExp(
      `CREATE TYPE\\s+(?:public\\.)?${escaped}\\s+AS ENUM\\s*\\(([^)]*)\\)`,
      "i",
    ),
  );
  const created = match
    ? [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1])
    : [];
  const added = [
    ...sql.matchAll(
      new RegExp(
        `ALTER TYPE\\s+(?:public\\.)?${escaped}\\s+ADD VALUE IF NOT EXISTS\\s+'([^']+)'`,
        "gi",
      ),
    ),
  ].map((entry) => entry[1]);

  if (created.length === 0 && added.length === 0) {
    return null;
  }

  const labels = [...created];
  for (const label of added) {
    if (!labels.includes(label)) {
      labels.push(label);
    }
  }
  return labels;
}

function sameStringList(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return left.length === right.length && left.every((value, i) => value === right[i]);
}

function contractsRepoRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "../../../..");
}

/**
 * Fail closed when the Zod source, published v1 snapshot, or PostgreSQL
 * enum labels diverge. Later stories consume this package; silent drift
 * would let adapters and SQL disagree about admission.
 */
export function runContractsCheck(sqlSource?: string): ContractsCheckResult {
  let sql = sqlSource;
  if (sql === undefined) {
    try {
      sql = readFileSync(
        join(contractsRepoRoot(), SOURCE_ENVELOPE_VOCABULARY_MIGRATION),
        "utf8",
      );
    } catch {
      return {
        ok: false,
        error: `migration is missing ${SOURCE_ENVELOPE_VOCABULARY_MIGRATION} (missing regeneration)`,
      };
    }
  }

  const live = liveEnvelopeVocabulary();

  if (live.schemaVersion !== SOURCE_ENVELOPE_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `live schema version ${live.schemaVersion} does not match SOURCE_ENVELOPE_SCHEMA_VERSION ${SOURCE_ENVELOPE_SCHEMA_VERSION}`,
    };
  }

  const published = assessCompatibility(V1_VOCABULARY, live);
  if (!published.ok) {
    return { ok: false, error: published.reason };
  }

  for (const [typeName, labels] of Object.entries(PG_ENUM_LABELS)) {
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

  const resultValues = new Set<string>(SOURCE_APPLY_RESULTS);
  const boundResults = [
    COMPARATOR_SEMANTICS.equalVectorEqualFingerprint,
    COMPARATOR_SEMANTICS.equalVectorDifferentFingerprint,
    COMPARATOR_SEMANTICS.olderPresentComponent,
    COMPARATOR_SEMANTICS.unresolvedIncomparability,
  ];
  for (const code of boundResults) {
    if (!resultValues.has(code)) {
      return {
        ok: false,
        error: `comparator semantic "${code}" is not in the six-value result vocabulary`,
      };
    }
  }

  if (COMPARATOR_SEMANTICS.genericAbsenceCloses) {
    return {
      ok: false,
      error: "v1 generic absence must remain non-closing",
    };
  }
  if (COMPARATOR_SEMANTICS.omissionsInFingerprint) {
    return {
      ok: false,
      error: "v1 omission incidents must stay outside the fingerprint",
    };
  }
  if (COMPARATOR_SEMANTICS.conflictMutates) {
    return {
      ok: false,
      error: "v1 quarantine/conflict paths must not mutate",
    };
  }

  if (!sameStringList(V1_VOCABULARY.pgEnumTypes, Object.keys(PG_ENUM_LABELS))) {
    return {
      ok: false,
      error: "published pg enum type names drifted from the editable source",
    };
  }

  return { ok: true };
}
