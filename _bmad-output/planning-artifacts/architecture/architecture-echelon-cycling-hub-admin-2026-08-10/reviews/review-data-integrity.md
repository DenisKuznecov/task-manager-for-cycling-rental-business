# PostgreSQL / Supabase Data-Integrity Final Gate

## Verdict

**PASS — final data-integrity and recovery signoff. No remaining critical or high architecture findings.**

The latest spine closes every previously blocking integrity issue at feature-architecture altitude. It now defines a safe comparator and versioned integration envelope, replay-safe inbox and reconciliation state, immutable identity/history rules, capability-only mutation, recoverable bad-ingestion handling, and bounded operational retention. The remaining work is implementation and fixture proof explicitly gated before production activation, not unresolved architecture.

## Review basis

Reviewed:

- the latest `ARCHITECTURE-SPINE.md`, especially AD-3 through AD-5, AD-8, AD-9, AD-11, AD-13 through AD-18, the consistency conventions, rollout gates, and activation blockers;
- the completed selective-warehouse spike report; and
- the spike's synthetic proof scope and required production fixture scenarios.

The spike remains correctly treated as feasibility evidence rather than proof of the production schema. The spine requires production-contract, concurrency, privilege, lifecycle, and recovery fixtures before activation.

## Prior-finding verification

- **Completeness and tombstones — closed.** AD-4/AD-16 distinguish complete from partial relationship scopes, forbid absence closure from partial/failed/unsupported/unproven reads, encode `known | unknown | removed`, and allow closure only from explicit tombstones or a complete scope with fixture-proven newer authority.

- **Vector conflict and domain — closed.** AD-4 compares the union of accepted and incoming `(resource_type, external_id)` components, defines authority for additions/removals, separates schema version from source time, preserves source-time precedence over attempt generation, makes equal vector/equal fingerprint a no-op, and quarantines equal-vector/different-content, older, and unresolved incomparable input without mutation.

- **Normalizer evolution — closed.** Representation-only rebaseline requires fixture-backed semantic equivalence; semantic changes run ordinary invalidation. Expand/drain workers refetch current authority under their target schema rather than replaying old payloads.

- **Absence authority — closed as an activation gate.** The chosen root/relationship version must be proven to advance on child removal. If proof fails, absence remains non-closing and behavior is explicitly re-scoped to archive/removed evidence.

- **Atomic snapshot and derivation — closed.** The ingestion coordinator applies accepted source state and Workshop derivation in one transaction, including partner/allowlist-derived debt, current-state revisions, events, provenance, and watermarks. Standalone resource batches cannot directly mutate order relationships or Workshop state.

- **Checkpoint commit ordering — closed.** Checkpoints advance only with durable progress-safe entity results; quarantines produce durable gaps and later entities continue. No checkpoint can outrun uncommitted projection work.

- **Page drift — closed.** Reconciliation requires a stable documented sort, one-page overlap, durable coverage epochs, and two consecutive complete sweeps with stable seen-ID/source-fingerprint coverage. Page absence never deletes.

- **Inbox identity and leases — closed.** Append-only receipts correlate through a join to coalesced version-targeted refresh intents. Intents have explicit claimable/leased/terminal states, `lease_expires_at`, heartbeat, lease generation, compare-and-set completion, bounded attempts, expiry reclaim, successor retry lineage, and durable incidents.

- **Consequential command freshness — closed.** Only the current synchronous JIT attempt returning `applied` or `no_op` authorizes lifecycle/consequence-bearing mutation; transitions verify the returned source/derivation watermark under order/task locks. Quarantined or rejected refreshes fail closed.

- **Membership identity/currentness — closed.** Membership natural identity includes order, line, source-unit discriminator, and incarnation. A partial unique constraint or serialized equivalent permits only one current nonterminal incarnation per order/line/unit, and replacement closes old before opening new in one transaction.

- **History and event ordering — closed.** Current state and attributable append-only events commit together. Per-task sequence allocated under the task lock is causal; a monotonic global sequence gives deterministic cross-task presentation and keyset ordering. Direct event mutation is revoked.

- **Privilege roles and RLS — closed.** AD-11 uses non-login owners/capabilities, field-minimized scoped reads, fixed empty search paths, explicit `PUBLIC` revocation, grantor-specific locked default privileges for every object-creating role, prohibited API-role membership/`SET ROLE`, no direct service-role authoritative DML, and fixtures as `anon`, `authenticated`, and `service_role`.

- **Bad-ingestion provenance and correction — closed.** Accepted state persists producer/schema/attempt/epoch provenance. Emergency disable is never incident-gated. A narrowly owned correction capability supersedes false source-derived current state, preserves app-authored evidence and the correction chain, and appends corrective events without weakening ordinary terminal rules.

- **Failed-work retention — closed.** Nonterminal work and incidents persist; successful and old failed attempt details may compact under separate configured windows while retaining first/latest failure, counts, bounded redacted error, outcome summaries, freshness, provenance, and audit references.

- **Archived-customer PII — closed for activation scope.** AD-17 requires the authority manifest to fix the minimum projected fields and archived-row behavior before production activation. Archived PII cannot expand or refresh beyond that contract until the deferred policy is approved. AD-18 limits Workshop task-context exposure and excludes email, phone, birthday, sex, and unrelated customer/order fields.

## Residual implementation obligations

No critical or high architecture findings remain. Implementation must still prove the bound rules with:

- comparator fixtures for duplicate, identical-version conflict, older, incomparable, addition, removal, partial, and schema-transition cases;
- multi-session tests for shared-resource locking, intent claiming/expiry, membership replacement, task/event sequencing, and JIT watermark races;
- interrupted and same-count-reordered pagination fixtures across the required two-sweep convergence rule;
- privilege/default-privilege/role-membership fixtures for all API and capability roles;
- bad-normalizer affected-set selection and corrective-transition fixtures;
- retention compaction tests that preserve provenance, summaries, incidents, and audit references; and
- the activation blockers already listed in the spine, especially multi-quantity identity, source/lifecycle mappings, absence authority, and the technology/security baseline.

These obligations validate the architecture; they do not require another architecture correction unless implementation evidence disproves a bound source assumption.
