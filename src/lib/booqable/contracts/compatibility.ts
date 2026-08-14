/**
 * Published v1 compatibility matrix. The drift check compares live envelope
 * vocabulary against this snapshot so an in-place rewrite cannot hide an
 * unversioned additive or breaking change.
 */
export const SOURCE_ENVELOPE_SCHEMA_VERSION = 1;

export const COMPATIBILITY_CHANGE_KINDS = [
  "optional_field",
  "enum_value_added",
  "required_field_removed",
  "required_field_renamed",
  "enum_value_dropped",
] as const;

export type CompatibilityChangeKind =
  (typeof COMPATIBILITY_CHANGE_KINDS)[number];

/**
 * Additive changes are the only documented v1 evolution path. Breaking
 * changes are named so the check can fail them closed when the schema
 * version is not bumped.
 */
export const COMPATIBILITY_RULES = {
  schemaVersion: SOURCE_ENVELOPE_SCHEMA_VERSION,
  additiveRequiresVersionBump: true,
  breakingRequiresVersionBump: true,
  additive: ["optional_field", "enum_value_added"] as const,
  breaking: [
    "required_field_removed",
    "required_field_renamed",
    "enum_value_dropped",
  ] as const,
  deprecation:
    "v1 retains every published enum value and required field; values may be marked deprecated in a later matrix but must not be dropped without a schema-version bump",
} as const;

/**
 * Comparator admission is owned by a later story. These frozen v1 result
 * bindings keep adapters from inventing a different no-op/quarantine rule.
 */
export const COMPARATOR_SEMANTICS = {
  fingerprintDomain: "merged_effective_state_after_carry_forward",
  omissionsInFingerprint: false,
  genericAbsenceCloses: false,
  equalVectorEqualFingerprint: "no_op",
  equalVectorDifferentFingerprint: "quarantined",
  olderPresentComponent: "quarantined",
  unresolvedIncomparability: "quarantined",
  conflictMutates: false,
} as const;

export type EnvelopeVocabulary = {
  schemaVersion: number;
  kinds: readonly string[];
  scopes: readonly string[];
  presences: readonly string[];
  results: readonly string[];
  requiredEnvelopeFields: readonly string[];
  optionalEnvelopeFields: readonly string[];
  requiredIdentityFields: readonly string[];
  requiredResourceSlotFields: readonly string[];
  pgEnumTypes: readonly string[];
};

export const V1_VOCABULARY: EnvelopeVocabulary = {
  schemaVersion: 1,
  kinds: ["order_graph", "resource_batch"],
  scopes: ["complete", "partial"],
  presences: ["known", "unknown", "removed"],
  results: [
    "applied",
    "no_op",
    "derivation_disabled",
    "quarantined",
    "rejected_retryable",
    "rejected_terminal",
  ],
  requiredEnvelopeFields: [
    "kind",
    "producer_version",
    "profile_version",
    "schema_version",
    "root",
    "scopes",
    "resources",
    "source_versions",
    "derived_context_revisions",
  ],
  optionalEnvelopeFields: [],
  requiredIdentityFields: ["resource_type", "external_id"],
  requiredResourceSlotFields: [
    "resource_type",
    "external_id",
    "presence",
    "source_version",
    "fingerprint_inputs",
  ],
  pgEnumTypes: [
    "source_envelope_kind",
    "source_relationship_scope",
    "source_resource_presence",
    "source_apply_result",
  ],
};

export const SOURCE_ENVELOPE_VOCABULARY_MIGRATION =
  "supabase/migrations/20260814140000_source_envelope_vocabulary.sql";
