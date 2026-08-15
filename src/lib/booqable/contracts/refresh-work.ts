import { z } from "zod";

/**
 * Durable refresh-inbox contract. PostgreSQL enums, catalogue rows, and
 * retry constants are fixture-checked against these values so workers
 * cannot invent a fourteenth transition or a different budget.
 */
export const REFRESH_WORK_CONTRACT_VERSION = 1;
export const REFRESH_WORK_MIGRATION =
  "supabase/migrations/20260815140000_persist_authoritative_refresh_work.sql";

export const REFRESH_INTENT_STATES = [
  "claimable",
  "leased",
  "succeeded",
  "exhausted",
  "quarantined",
  "rejected_terminal",
] as const;

export const OPEN_REFRESH_INTENT_STATES = ["claimable", "leased"] as const;

export const TERMINAL_REFRESH_INTENT_STATES = [
  "succeeded",
  "exhausted",
  "quarantined",
  "rejected_terminal",
] as const;

export const REFRESH_DELIVERY_IDENTITY_KINDS = [
  "provider_event_id",
  "body_hmac_sha256",
] as const;

/**
 * Six apply results plus the first-use operational codes. Unknown newer
 * codes fail closed and never transition an intent.
 */
export const REFRESH_TRANSITION_CODES = [
  "applied",
  "no_op",
  "derivation_disabled",
  "quarantined",
  "rejected_retryable",
  "rejected_terminal",
  "upstream_rate_limited",
  "upstream_server_error",
  "upstream_timeout",
  "terminal_validation_failed",
  "source_conflict_quarantined",
  "lease_superseded",
  "unknown_transition_code",
] as const;

export const REFRESH_RETRY_POLICY = {
  maxAttempts: 3,
  backoffSeconds: [30, 120],
} as const;

export const REFRESH_OPERATIONAL_TABLES = [
  "booqable_refresh_receipts",
  "booqable_refresh_intents",
  "booqable_refresh_receipt_intents",
  "booqable_refresh_attempts",
  "booqable_refresh_transition_catalogue",
  "booqable_refresh_incidents",
] as const;

export const REFRESH_WORK_RPCS = [
  "record_booqable_refresh_work",
  "claim_booqable_refresh_intent",
  "heartbeat_booqable_refresh_intent",
  "complete_booqable_refresh_intent",
  "reclaim_booqable_refresh_intent",
  "create_booqable_refresh_operator_successor",
] as const;

export const PG_REFRESH_ENUM_LABELS = {
  refresh_intent_state: REFRESH_INTENT_STATES,
  refresh_delivery_identity_kind: REFRESH_DELIVERY_IDENTITY_KINDS,
} as const;

export const REFRESH_CATALOGUE_SEVERITIES = [
  "info",
  "warning",
  "error",
] as const;
export const REFRESH_CATALOGUE_DEDUPE_SCOPES = [
  "none",
  "source_root",
  "source_root_code",
] as const;
export const REFRESH_CATALOGUE_ACTIVATION_EFFECTS = [
  "none",
  "block_activation",
] as const;
export const REFRESH_CATALOGUE_RESOLUTIONS = [
  "none",
  "retry",
  "operator_successor",
  "manual",
] as const;
export const REFRESH_CATALOGUE_ACKNOWLEDGEMENTS = [
  "none",
  "required",
] as const;

export type RefreshIntentState = (typeof REFRESH_INTENT_STATES)[number];
export type RefreshDeliveryIdentityKind =
  (typeof REFRESH_DELIVERY_IDENTITY_KINDS)[number];
export type RefreshTransitionCode = (typeof REFRESH_TRANSITION_CODES)[number];
export type RefreshCatalogueSeverity =
  (typeof REFRESH_CATALOGUE_SEVERITIES)[number];
export type RefreshCatalogueDedupeScope =
  (typeof REFRESH_CATALOGUE_DEDUPE_SCOPES)[number];
export type RefreshCatalogueActivationEffect =
  (typeof REFRESH_CATALOGUE_ACTIVATION_EFFECTS)[number];
export type RefreshCatalogueResolution =
  (typeof REFRESH_CATALOGUE_RESOLUTIONS)[number];
export type RefreshCatalogueAcknowledgement =
  (typeof REFRESH_CATALOGUE_ACKNOWLEDGEMENTS)[number];

export const RefreshIntentStateSchema = z.enum(REFRESH_INTENT_STATES);
export const RefreshDeliveryIdentityKindSchema = z.enum(
  REFRESH_DELIVERY_IDENTITY_KINDS,
);
export const RefreshTransitionCodeSchema = z.enum(REFRESH_TRANSITION_CODES);

const NonEmptyIdSchema = z.string().trim().min(1);

export const RefreshReceiptInputSchema = z
  .object({
    provider: NonEmptyIdSchema,
    source_kind: NonEmptyIdSchema,
    source_external_id: NonEmptyIdSchema,
    delivery_identity: NonEmptyIdSchema,
    delivery_identity_kind: RefreshDeliveryIdentityKindSchema,
    contract_version: z.literal(REFRESH_WORK_CONTRACT_VERSION),
  })
  .strict();

export const RefreshCatalogueEntrySchema = z
  .object({
    code: RefreshTransitionCodeSchema,
    contract_version: z.literal(REFRESH_WORK_CONTRACT_VERSION),
    producer: NonEmptyIdSchema,
    severity: z.enum(REFRESH_CATALOGUE_SEVERITIES),
    dedupe_scope: z.enum(REFRESH_CATALOGUE_DEDUPE_SCOPES),
    retryable: z.boolean(),
    activation_effect: z.enum(REFRESH_CATALOGUE_ACTIVATION_EFFECTS),
    resolution: z.enum(REFRESH_CATALOGUE_RESOLUTIONS),
    acknowledgement: z.enum(REFRESH_CATALOGUE_ACKNOWLEDGEMENTS),
    consumes_attempt: z.boolean(),
    next_state: RefreshIntentStateSchema.nullable(),
    uses_retry_backoff: z.boolean(),
    records_incident: z.boolean(),
    allows_operator_successor: z.boolean(),
    fail_closed: z.boolean(),
    max_attempts: z.number().int().positive(),
    retry_backoff_seconds: z.array(z.number().int().nonnegative()).readonly(),
    retry_exhausted_state: RefreshIntentStateSchema.nullable(),
    successor_state: RefreshIntentStateSchema.nullable(),
    successor_max_attempts: z.number().int().positive().nullable(),
  })
  .strict();

export type RefreshReceiptInput = z.infer<typeof RefreshReceiptInputSchema>;
export type RefreshCatalogueEntry = z.infer<typeof RefreshCatalogueEntrySchema>;

type CataloguePolicyFields = Pick<
  RefreshCatalogueEntry,
  | "max_attempts"
  | "retry_backoff_seconds"
  | "retry_exhausted_state"
  | "successor_state"
  | "successor_max_attempts"
>;
type CatalogueSeed = Omit<
  RefreshCatalogueEntry,
  "contract_version" | keyof CataloguePolicyFields
> &
  Partial<CataloguePolicyFields>;

function catalogueEntry(seed: CatalogueSeed): RefreshCatalogueEntry {
  return {
    ...seed,
    contract_version: REFRESH_WORK_CONTRACT_VERSION,
    max_attempts: seed.max_attempts ?? REFRESH_RETRY_POLICY.maxAttempts,
    retry_backoff_seconds:
      seed.retry_backoff_seconds ??
      (seed.uses_retry_backoff
        ? [...REFRESH_RETRY_POLICY.backoffSeconds]
        : []),
    retry_exhausted_state:
      seed.retry_exhausted_state ??
      (seed.uses_retry_backoff ? "exhausted" : null),
    successor_state:
      seed.successor_state ??
      (seed.allows_operator_successor ? "claimable" : null),
    successor_max_attempts:
      seed.successor_max_attempts ??
      (seed.allows_operator_successor
        ? REFRESH_RETRY_POLICY.maxAttempts
        : null),
  };
}

/**
 * v1 rules. Completing an intent reads this table — producers do not
 * choose free-form severity, budget, or successor behavior.
 */
export const REFRESH_TRANSITION_CATALOGUE: readonly RefreshCatalogueEntry[] = [
  catalogueEntry({
    code: "applied",
    producer: "coordinator",
    severity: "info",
    dedupe_scope: "none",
    retryable: false,
    activation_effect: "none",
    resolution: "none",
    acknowledgement: "none",
    consumes_attempt: false,
    next_state: "succeeded",
    uses_retry_backoff: false,
    records_incident: false,
    allows_operator_successor: false,
    fail_closed: false,
  }),
  catalogueEntry({
    code: "no_op",
    producer: "coordinator",
    severity: "info",
    dedupe_scope: "none",
    retryable: false,
    activation_effect: "none",
    resolution: "none",
    acknowledgement: "none",
    consumes_attempt: false,
    next_state: "succeeded",
    uses_retry_backoff: false,
    records_incident: false,
    allows_operator_successor: false,
    fail_closed: false,
  }),
  catalogueEntry({
    code: "derivation_disabled",
    producer: "coordinator",
    severity: "info",
    dedupe_scope: "none",
    retryable: false,
    activation_effect: "none",
    resolution: "none",
    acknowledgement: "none",
    consumes_attempt: false,
    next_state: "succeeded",
    uses_retry_backoff: false,
    records_incident: false,
    allows_operator_successor: false,
    fail_closed: false,
  }),
  catalogueEntry({
    code: "quarantined",
    producer: "coordinator",
    severity: "error",
    dedupe_scope: "source_root_code",
    retryable: false,
    activation_effect: "block_activation",
    resolution: "operator_successor",
    acknowledgement: "required",
    consumes_attempt: true,
    next_state: "quarantined",
    uses_retry_backoff: false,
    records_incident: true,
    allows_operator_successor: true,
    fail_closed: false,
  }),
  catalogueEntry({
    code: "rejected_retryable",
    producer: "coordinator",
    severity: "warning",
    dedupe_scope: "none",
    retryable: true,
    activation_effect: "none",
    resolution: "retry",
    acknowledgement: "none",
    consumes_attempt: true,
    next_state: "claimable",
    uses_retry_backoff: true,
    records_incident: false,
    allows_operator_successor: true,
    fail_closed: false,
  }),
  catalogueEntry({
    code: "rejected_terminal",
    producer: "coordinator",
    severity: "error",
    dedupe_scope: "source_root_code",
    retryable: false,
    activation_effect: "block_activation",
    resolution: "operator_successor",
    acknowledgement: "required",
    consumes_attempt: true,
    next_state: "rejected_terminal",
    uses_retry_backoff: false,
    records_incident: true,
    allows_operator_successor: true,
    fail_closed: false,
  }),
  catalogueEntry({
    code: "upstream_rate_limited",
    producer: "booqable_adapter",
    severity: "warning",
    dedupe_scope: "none",
    retryable: true,
    activation_effect: "none",
    resolution: "retry",
    acknowledgement: "none",
    consumes_attempt: true,
    next_state: "claimable",
    uses_retry_backoff: true,
    records_incident: false,
    allows_operator_successor: true,
    fail_closed: false,
  }),
  catalogueEntry({
    code: "upstream_server_error",
    producer: "booqable_adapter",
    severity: "warning",
    dedupe_scope: "none",
    retryable: true,
    activation_effect: "none",
    resolution: "retry",
    acknowledgement: "none",
    consumes_attempt: true,
    next_state: "claimable",
    uses_retry_backoff: true,
    records_incident: false,
    allows_operator_successor: true,
    fail_closed: false,
  }),
  catalogueEntry({
    code: "upstream_timeout",
    producer: "booqable_adapter",
    severity: "warning",
    dedupe_scope: "none",
    retryable: true,
    activation_effect: "none",
    resolution: "retry",
    acknowledgement: "none",
    consumes_attempt: true,
    next_state: "claimable",
    uses_retry_backoff: true,
    records_incident: false,
    allows_operator_successor: true,
    fail_closed: false,
  }),
  catalogueEntry({
    code: "terminal_validation_failed",
    producer: "booqable_adapter",
    severity: "error",
    dedupe_scope: "source_root_code",
    retryable: false,
    activation_effect: "block_activation",
    resolution: "operator_successor",
    acknowledgement: "required",
    consumes_attempt: true,
    next_state: "rejected_terminal",
    uses_retry_backoff: false,
    records_incident: true,
    allows_operator_successor: true,
    fail_closed: false,
  }),
  catalogueEntry({
    code: "source_conflict_quarantined",
    producer: "coordinator",
    severity: "error",
    dedupe_scope: "source_root_code",
    retryable: false,
    activation_effect: "block_activation",
    resolution: "operator_successor",
    acknowledgement: "required",
    consumes_attempt: true,
    next_state: "quarantined",
    uses_retry_backoff: false,
    records_incident: true,
    allows_operator_successor: true,
    fail_closed: false,
  }),
  catalogueEntry({
    code: "lease_superseded",
    producer: "refresh_inbox",
    severity: "warning",
    dedupe_scope: "none",
    retryable: true,
    activation_effect: "none",
    resolution: "retry",
    acknowledgement: "none",
    consumes_attempt: false,
    next_state: "claimable",
    uses_retry_backoff: false,
    records_incident: false,
    allows_operator_successor: false,
    fail_closed: false,
  }),
  catalogueEntry({
    code: "unknown_transition_code",
    producer: "refresh_inbox",
    severity: "error",
    dedupe_scope: "source_root_code",
    retryable: false,
    activation_effect: "block_activation",
    resolution: "manual",
    acknowledgement: "required",
    consumes_attempt: false,
    next_state: null,
    uses_retry_backoff: false,
    records_incident: true,
    allows_operator_successor: false,
    fail_closed: true,
  }),
];

export type ApplyRefreshTransitionResult =
  | {
      ok: true;
      code: RefreshTransitionCode;
      nextState: RefreshIntentState | null;
      attemptCount: number;
      claimableAfterSeconds: number | null;
      recordsIncident: boolean;
      allowsOperatorSuccessor: boolean;
    }
  | { ok: false; code: "unknown_transition_code" };

/**
 * Catalogue-owned outcome. Unknown codes fail closed so a newer worker
 * cannot invent a transition the inbox has not registered.
 */
export function applyRefreshTransition(
  code: string,
  attemptCount: number,
): ApplyRefreshTransitionResult {
  const parsed = RefreshTransitionCodeSchema.safeParse(code);
  if (!parsed.success) {
    return { ok: false, code: "unknown_transition_code" };
  }

  const entry = REFRESH_TRANSITION_CATALOGUE.find(
    (row) => row.code === parsed.data,
  );
  if (!entry || entry.fail_closed) {
    return { ok: false, code: "unknown_transition_code" };
  }

  const nextAttemptCount = entry.consumes_attempt
    ? attemptCount + 1
    : attemptCount;

  if (entry.next_state === null) {
    return {
      ok: true,
      code: entry.code,
      nextState: null,
      attemptCount: nextAttemptCount,
      claimableAfterSeconds: null,
      recordsIncident: entry.records_incident,
      allowsOperatorSuccessor: entry.allows_operator_successor,
    };
  }

  if (entry.uses_retry_backoff) {
    if (nextAttemptCount >= entry.max_attempts) {
      return {
        ok: true,
        code: entry.code,
        nextState: "exhausted",
        attemptCount: nextAttemptCount,
        claimableAfterSeconds: null,
        recordsIncident: entry.records_incident,
        allowsOperatorSuccessor: true,
      };
    }

    const delayIndex = nextAttemptCount - 1;
    const delay =
      entry.retry_backoff_seconds[
        Math.min(delayIndex, entry.retry_backoff_seconds.length - 1)
      ] ?? null;

    return {
      ok: true,
      code: entry.code,
      nextState: "claimable",
      attemptCount: nextAttemptCount,
      claimableAfterSeconds: delay,
      recordsIncident: entry.records_incident,
      allowsOperatorSuccessor: entry.allows_operator_successor,
    };
  }

  return {
    ok: true,
    code: entry.code,
    nextState: entry.next_state,
    attemptCount: nextAttemptCount,
    claimableAfterSeconds: null,
    recordsIncident: entry.records_incident,
    allowsOperatorSuccessor: entry.allows_operator_successor,
  };
}

/**
 * Provider event IDs win when present so retries of the same delivery
 * coalesce. Otherwise the HMAC stands in for the body we must not keep.
 */
export function resolveRefreshDeliveryIdentity(input: {
  providerEventId: string | null | undefined;
  bodyHmacSha256: string;
}): {
  delivery_identity: string;
  delivery_identity_kind: RefreshDeliveryIdentityKind;
} {
  const providerEventId = input.providerEventId?.trim() ?? "";
  if (providerEventId.length > 0) {
    return {
      delivery_identity: providerEventId,
      delivery_identity_kind: "provider_event_id",
    };
  }

  const hmac = input.bodyHmacSha256.trim();
  if (hmac.length === 0) {
    throw new Error("refresh delivery identity requires a body HMAC");
  }

  return {
    delivery_identity: hmac,
    delivery_identity_kind: "body_hmac_sha256",
  };
}

export function refreshCatalogueSqlTuple(entry: RefreshCatalogueEntry): string {
  const nextState = entry.next_state === null ? "NULL" : `'${entry.next_state}'`;
  const retryBackoff = `ARRAY[${entry.retry_backoff_seconds.join(", ")}]::integer[]`;
  const retryExhaustedState =
    entry.retry_exhausted_state === null
      ? "NULL"
      : `'${entry.retry_exhausted_state}'`;
  const successorState =
    entry.successor_state === null ? "NULL" : `'${entry.successor_state}'`;
  const successorMaxAttempts = entry.successor_max_attempts ?? "NULL";
  return `('${entry.code}', ${entry.contract_version}, '${entry.producer}', '${entry.severity}', '${entry.dedupe_scope}', ${entry.retryable}, '${entry.activation_effect}', '${entry.resolution}', '${entry.acknowledgement}', ${entry.consumes_attempt}, ${nextState}, ${entry.uses_retry_backoff}, ${entry.records_incident}, ${entry.allows_operator_successor}, ${entry.fail_closed}, ${entry.max_attempts}, ${retryBackoff}, ${retryExhaustedState}, ${successorState}, ${successorMaxAttempts})`;
}

export function assertRefreshCatalogueCompleteness(
  entries: readonly RefreshCatalogueEntry[] = REFRESH_TRANSITION_CATALOGUE,
): { ok: true } | { ok: false; error: string } {
  const codes = new Set<string>();
  for (const entry of entries) {
    const parsed = RefreshCatalogueEntrySchema.safeParse(entry);
    if (!parsed.success) {
      return { ok: false, error: "catalogue entry failed schema validation" };
    }
    if (codes.has(entry.code)) {
      return { ok: false, error: `duplicate catalogue code ${entry.code}` };
    }
    codes.add(entry.code);
  }

  for (const code of REFRESH_TRANSITION_CODES) {
    if (!codes.has(code)) {
      return { ok: false, error: `catalogue missing ${code}` };
    }
  }

  return { ok: true };
}
