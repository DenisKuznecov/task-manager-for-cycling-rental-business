import { z } from "zod";
import { SOURCE_ENVELOPE_SCHEMA_VERSION } from "./compatibility";

/**
 * Editable vocabulary for both envelope kinds. PostgreSQL enum labels and
 * the compatibility snapshot are fixture-checked against these arrays —
 * there is no second codegen package.
 */
export const SOURCE_ENVELOPE_KINDS = [
  "order_graph",
  "resource_batch",
] as const;
export const RELATIONSHIP_SCOPES = ["complete", "partial"] as const;
export const RESOURCE_PRESENCES = ["known", "unknown", "removed"] as const;
export const SOURCE_APPLY_RESULTS = [
  "applied",
  "no_op",
  "derivation_disabled",
  "quarantined",
  "rejected_retryable",
  "rejected_terminal",
] as const;

export const REQUIRED_ENVELOPE_FIELDS = [
  "kind",
  "producer_version",
  "profile_version",
  "schema_version",
  "root",
  "scopes",
  "resources",
  "source_versions",
  "derived_context_revisions",
] as const;
export const OPTIONAL_ENVELOPE_FIELDS = [] as const;
export const REQUIRED_IDENTITY_FIELDS = [
  "resource_type",
  "external_id",
] as const;
export const REQUIRED_RESOURCE_SLOT_FIELDS = [
  "resource_type",
  "external_id",
  "presence",
  "source_version",
  "fingerprint_inputs",
] as const;

export const PG_ENUM_LABELS = {
  source_envelope_kind: SOURCE_ENVELOPE_KINDS,
  source_relationship_scope: RELATIONSHIP_SCOPES,
  source_resource_presence: RESOURCE_PRESENCES,
  source_apply_result: SOURCE_APPLY_RESULTS,
} as const;

export type SourceEnvelopeKind = (typeof SOURCE_ENVELOPE_KINDS)[number];
export type RelationshipScope = (typeof RELATIONSHIP_SCOPES)[number];
export type ResourcePresence = (typeof RESOURCE_PRESENCES)[number];
export type SourceApplyResult = (typeof SOURCE_APPLY_RESULTS)[number];

export const SourceEnvelopeKindSchema = z.enum(SOURCE_ENVELOPE_KINDS);
export const RelationshipScopeSchema = z.enum(RELATIONSHIP_SCOPES);
export const ResourcePresenceSchema = z.enum(RESOURCE_PRESENCES);

/**
 * Unknown newer result codes fail closed. Later workers must not invent a
 * seventh admission outcome.
 */
export const SourceApplyResultSchema = z.enum(SOURCE_APPLY_RESULTS);

const NonEmptyIdSchema = z.string().trim().min(1);

export const CanonicalIdentitySchema = z.object({
  resource_type: NonEmptyIdSchema,
  external_id: NonEmptyIdSchema,
}).strict();

export const RelationshipScopeEntrySchema = z.object({
  relationship: NonEmptyIdSchema,
  scope: RelationshipScopeSchema,
}).strict();

/**
 * Slots are identity + presence + source version + fingerprint inputs.
 * Attribute lists belong to Stories 2.5–2.6; null is a first-class input.
 */
export const FingerprintScalarSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

export const FingerprintInputsSchema = z
  .record(z.string(), FingerprintScalarSchema)
  .nullable();

export const ResourceSlotSchema = z.object({
  resource_type: NonEmptyIdSchema,
  external_id: NonEmptyIdSchema,
  presence: ResourcePresenceSchema,
  source_version: NonEmptyIdSchema.nullable(),
  fingerprint_inputs: FingerprintInputsSchema,
}).strict();

export const SourceVersionEntrySchema = z.object({
  resource_type: NonEmptyIdSchema,
  external_id: NonEmptyIdSchema,
  source_version: NonEmptyIdSchema,
}).strict();

export const DerivedContextRevisionSchema = z.object({
  context: NonEmptyIdSchema,
  revision: z.number().int().nonnegative(),
}).strict();

function identityKey(resourceType: string, externalId: string): string {
  return `${resourceType}\0${externalId}`;
}

function rejectDuplicateEnvelopeKeys(
  value: {
    scopes: { relationship: string }[];
    resources: { resource_type: string; external_id: string }[];
    source_versions: { resource_type: string; external_id: string }[];
    derived_context_revisions: { context: string }[];
  },
  ctx: z.RefinementCtx,
) {
  const relationships = new Set<string>();
  value.scopes.forEach((entry, index) => {
    if (relationships.has(entry.relationship)) {
      ctx.addIssue({
        code: "custom",
        path: ["scopes", index, "relationship"],
        message: "duplicate relationship scope",
      });
    }
    relationships.add(entry.relationship);
  });

  const resourceIdentities = new Set<string>();
  value.resources.forEach((entry, index) => {
    const key = identityKey(entry.resource_type, entry.external_id);
    if (resourceIdentities.has(key)) {
      ctx.addIssue({
        code: "custom",
        path: ["resources", index],
        message: "duplicate resource identity",
      });
    }
    resourceIdentities.add(key);
  });

  const sourceVersionIdentities = new Set<string>();
  value.source_versions.forEach((entry, index) => {
    const key = identityKey(entry.resource_type, entry.external_id);
    if (sourceVersionIdentities.has(key)) {
      ctx.addIssue({
        code: "custom",
        path: ["source_versions", index],
        message: "duplicate source-version identity",
      });
    }
    sourceVersionIdentities.add(key);
  });

  const derivedContexts = new Set<string>();
  value.derived_context_revisions.forEach((entry, index) => {
    if (derivedContexts.has(entry.context)) {
      ctx.addIssue({
        code: "custom",
        path: ["derived_context_revisions", index, "context"],
        message: "duplicate derived-context revision",
      });
    }
    derivedContexts.add(entry.context);
  });
}

const SourceEnvelopeFieldsSchema = z
  .object({
    producer_version: NonEmptyIdSchema,
    profile_version: NonEmptyIdSchema,
    schema_version: z.literal(SOURCE_ENVELOPE_SCHEMA_VERSION),
    root: CanonicalIdentitySchema,
    scopes: z.array(RelationshipScopeEntrySchema),
    resources: z.array(ResourceSlotSchema),
    source_versions: z.array(SourceVersionEntrySchema),
    derived_context_revisions: z.array(DerivedContextRevisionSchema),
  })
  .strict()
  .superRefine(rejectDuplicateEnvelopeKeys);

/**
 * Tagged units only. `order_graph` is later derivation input;
 * `resource_batch` is catalog/inventory refresh. Fetch-path profiles are
 * identifiers here — they are not implemented in this story.
 */
export const SourceEnvelopeSchema = z.discriminatedUnion("kind", [
  SourceEnvelopeFieldsSchema.extend({
    kind: z.literal("order_graph"),
  }),
  SourceEnvelopeFieldsSchema.extend({
    kind: z.literal("resource_batch"),
  }),
]);

export type CanonicalIdentity = z.infer<typeof CanonicalIdentitySchema>;
export type RelationshipScopeEntry = z.infer<
  typeof RelationshipScopeEntrySchema
>;
export type ResourceSlot = z.infer<typeof ResourceSlotSchema>;
export type SourceVersionEntry = z.infer<typeof SourceVersionEntrySchema>;
export type DerivedContextRevision = z.infer<
  typeof DerivedContextRevisionSchema
>;
export type SourceEnvelope = z.infer<typeof SourceEnvelopeSchema>;
export type FingerprintInputs = z.infer<typeof FingerprintInputsSchema>;
