import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  COMPARATOR_SEMANTICS,
  REQUIRED_ENVELOPE_FIELDS,
  SOURCE_ENVELOPE_VOCABULARY_MIGRATION,
  V1_VOCABULARY,
  assessCompatibility,
  extractPgEnumLabels,
  liveEnvelopeVocabulary,
  runContractsCheck,
  type EnvelopeVocabulary,
} from "@/src/lib/booqable/contracts";
import {
  PG_ENUM_LABELS,
  SOURCE_APPLY_RESULTS,
  SourceApplyResultSchema,
  SourceEnvelopeSchema,
  type SourceEnvelope,
} from "@/src/lib/booqable/contracts/source-envelope";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

function validEnvelope(kind: SourceEnvelope["kind"]): SourceEnvelope {
  return {
    kind,
    producer_version: "booqable-adapter@unreleased",
    profile_version: "nested-order@unreleased",
    schema_version: 1,
    root: { resource_type: "order", external_id: "ord_1" },
    scopes: [{ relationship: "included", scope: "complete" }],
    resources: [
      {
        resource_type: "order",
        external_id: "ord_1",
        presence: "known",
        source_version: "2026-08-14T10:00:00.000Z",
        fingerprint_inputs: { status: "reserved", note: null },
      },
    ],
    source_versions: [
      {
        resource_type: "order",
        external_id: "ord_1",
        source_version: "2026-08-14T10:00:00.000Z",
      },
    ],
    derived_context_revisions: [{ context: "partner_map", revision: 0 }],
  };
}

function withOmittedField(
  envelope: SourceEnvelope,
  field: (typeof REQUIRED_ENVELOPE_FIELDS)[number],
): Record<string, unknown> {
  const { [field]: _omitted, ...rest } = envelope;
  return rest;
}

describe("source envelope I/O matrix", () => {
  it("accepts a valid order_graph", () => {
    const parsed = SourceEnvelopeSchema.safeParse(validEnvelope("order_graph"));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.kind).toBe("order_graph");
    }
  });

  it("accepts a valid resource_batch with the same header fields", () => {
    const parsed = SourceEnvelopeSchema.safeParse(
      validEnvelope("resource_batch"),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.kind).toBe("resource_batch");
    }
  });

  it.each(REQUIRED_ENVELOPE_FIELDS)(
    "fails closed when %s is missing",
    (field) => {
      const parsed = SourceEnvelopeSchema.safeParse(
        withOmittedField(validEnvelope("order_graph"), field),
      );
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues.length).toBeGreaterThan(0);
        expect(parsed.error.issues.some((issue) => issue.path.includes(field))).toBe(
          true,
        );
      }
    },
  );

  it("rejects an unknown kind", () => {
    const parsed = SourceEnvelopeSchema.safeParse({
      ...validEnvelope("order_graph"),
      kind: "catalog_snapshot",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.length).toBeGreaterThan(0);
    }
  });

  it("fails closed on schema_version 2", () => {
    const parsed = SourceEnvelopeSchema.safeParse({
      ...validEnvelope("order_graph"),
      schema_version: 2,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.length).toBeGreaterThan(0);
    }
  });

  it("accepts null fingerprint_inputs", () => {
    const envelope = validEnvelope("order_graph");
    envelope.resources[0] = {
      ...envelope.resources[0],
      fingerprint_inputs: null,
    };
    const parsed = SourceEnvelopeSchema.safeParse(envelope);
    expect(parsed.success).toBe(true);
  });

  it("rejects an unknown result code", () => {
    const parsed = SourceApplyResultSchema.safeParse("newer_unknown_code");
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.length).toBeGreaterThan(0);
    }
  });

  it("rejects illegal presence and scope values", () => {
    const presence = SourceEnvelopeSchema.safeParse({
      ...validEnvelope("order_graph"),
      resources: [
        {
          resource_type: "order",
          external_id: "ord_1",
          presence: "deleted",
          source_version: "v1",
          fingerprint_inputs: {},
        },
      ],
    });
    const scope = SourceEnvelopeSchema.safeParse({
      ...validEnvelope("order_graph"),
      scopes: [{ relationship: "included", scope: "full" }],
    });

    expect(presence.success).toBe(false);
    expect(scope.success).toBe(false);
    if (!presence.success) {
      expect(presence.error.issues.length).toBeGreaterThan(0);
    }
    if (!scope.success) {
      expect(scope.error.issues.length).toBeGreaterThan(0);
    }
  });
});

describe("drift and compatibility", () => {
  it("passes contracts:check against the live source and migration", () => {
    expect(runContractsCheck()).toEqual({ ok: true });
  });

  it("asserts TypeScript labels match the migration text", () => {
    const sql = readFileSync(
      join(repoRoot, SOURCE_ENVELOPE_VOCABULARY_MIGRATION),
      "utf8",
    );

    for (const [typeName, labels] of Object.entries(PG_ENUM_LABELS)) {
      expect(extractPgEnumLabels(sql, typeName)).toEqual([...labels]);
    }
    expect(SOURCE_APPLY_RESULTS).toEqual([
      "applied",
      "no_op",
      "derivation_disabled",
      "quarantined",
      "rejected_retryable",
      "rejected_terminal",
    ]);
    expect(COMPARATOR_SEMANTICS.equalVectorEqualFingerprint).toBe("no_op");
    expect(COMPARATOR_SEMANTICS.equalVectorDifferentFingerprint).toBe(
      "quarantined",
    );
    expect(COMPARATOR_SEMANTICS.olderPresentComponent).toBe("quarantined");
    expect(COMPARATOR_SEMANTICS.unresolvedIncomparability).toBe("quarantined");
    expect(sql).toMatch(
      /CREATE TYPE\s+public\.source_canonical_identity\s+AS\s*\(\s*resource_type\s+text\s*,\s*external_id\s+text\s*\)/i,
    );
  });

  it("fails when the PostgreSQL vocabulary was not regenerated", () => {
    const drifted = `
CREATE TYPE public.source_envelope_kind AS ENUM (
  'order_graph'
);
CREATE TYPE public.source_relationship_scope AS ENUM (
  'complete',
  'partial'
);
CREATE TYPE public.source_resource_presence AS ENUM (
  'known',
  'unknown',
  'removed'
);
CREATE TYPE public.source_apply_result AS ENUM (
  'applied',
  'no_op',
  'derivation_disabled',
  'quarantined',
  'rejected_retryable',
  'rejected_terminal'
);
`;
    const result = runContractsCheck(drifted);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/vocabulary mismatch|missing regeneration/);
    }
  });

  it("fails an unversioned breaking change", () => {
    const candidate: EnvelopeVocabulary = {
      ...liveEnvelopeVocabulary(),
      results: V1_VOCABULARY.results.filter((code) => code !== "no_op"),
    };
    const verdict = assessCompatibility(V1_VOCABULARY, candidate);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.change).toBe("breaking");
      expect(verdict.reason).toMatch(/unversioned breaking change/);
    }
  });

  it("fails an unversioned additive change", () => {
    const candidate: EnvelopeVocabulary = {
      ...liveEnvelopeVocabulary(),
      results: [...V1_VOCABULARY.results, "deferred"],
    };
    const verdict = assessCompatibility(V1_VOCABULARY, candidate);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.change).toBe("additive");
      expect(verdict.reason).toMatch(/unversioned additive change/);
    }
  });

  it("passes a documented additive change with a schema-version bump", () => {
    const candidate: EnvelopeVocabulary = {
      ...liveEnvelopeVocabulary(),
      schemaVersion: V1_VOCABULARY.schemaVersion + 1,
      results: [...V1_VOCABULARY.results, "deferred"],
      optionalEnvelopeFields: ["trace_id"],
    };
    const verdict = assessCompatibility(V1_VOCABULARY, candidate);
    expect(verdict).toEqual({ ok: true, change: "additive" });
  });
});
