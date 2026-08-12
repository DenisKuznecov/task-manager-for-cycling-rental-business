# Activation-Blocker Research Reconciliation Review

**Reviewed:** 2026-08-12  
**Research authority:** `technical-workshop-architecture-open-activation-blockers-research-2026-08-12.md`  
**Architecture target:** `ARCHITECTURE-SPINE.md`  
**Review mode:** traceability and semantic-accuracy review; no source edits

## Verdict

**Substantially reconciled, but not fully activation-complete.**

The updated Architecture Spine accurately adopts all five principal research decisions:

1. exact-StockItem-only identity for multi-quantity lines, with incident-only handling of unidentified quantity;
2. explicit-tombstone-only closure, with generic absence permanently non-closing in v1;
3. unconditional FR-3 unassignment on removal/cancellation and ordinary reclaim on reactivation;
4. ProductGroup UUID allowlisting, fixture-gated Setup mapping or broad-review fallback, and fixture-gated per-bike lifecycle normalization;
5. the supported/pinned technology baseline and pre-foundation security containment.

Cron/runtime recovery, capability security, disabled/shadow rollout, and the principal activation gates also landed accurately. The spine is therefore faithful at the architectural-decision level.

It is not a complete transcription of the research's verification contract. Three material closure conditions are not explicit enough to be reliably enforced during decomposition: the multi-quantity remap/replacement fixture gate, the full minimum test matrix, and approval of the rollback/repair procedure before pilot. There is also one ambiguity in removal version authority that could reject a valid explicit child tombstone if interpreted as requiring a parent/relationship version advance.

## Reconciliation Method

Each architecture-relevant research finding was checked for:

- semantic adoption, not merely mention;
- preservation of uncertainty and fail-closed behavior;
- an owning architecture decision or convention;
- a corresponding activation gate where research made proof mandatory;
- absence of stronger unsupported claims.

Ratings:

- **Accurate** — decision and necessary gate landed without material semantic drift.
- **Mostly accurate** — decision landed, but proof/gating detail is incomplete or ambiguous.
- **Missing** — architecture-relevant research requirement did not land.
- **Conflict** — spine asserts behavior inconsistent with the research authority.

## Traceability Results

### 1. Multi-quantity physical-unit identity — Mostly accurate

**Research finding**

- A Planning quantity may exceed the number of exact StockItemPlannings.
- No verified source-backed discriminator exists for each unspecified unit.
- `single` is valid only for a quantity-one provisional line.
- Multi-quantity memberships/tasks may be created only for exact distinct StockItem assignments.
- The unknown shortfall must be represented by one deduplicated incident, never generated ordinals or array positions.
- Activation proof must cover partial/exact assignment, remap, removal, replacement, and re-add.

**Spine landing**

- AD-5 adopts `(order_external_id, line_external_id, source_unit_discriminator, incarnation)`.
- It limits provisional `single` to quantity-one lines.
- It uses physical StockItem external ID for multi-quantity membership and explicitly forbids StockItemPlanning ID, array position, and generated ordinal as lifetime identity.
- It records one deduplicated expected/exact/unknown incident and creates no guessed task.
- It defines same-stock remap, different-StockItem replacement, re-add, terminal-history, and correction-successor behavior.
- The Open Activation Gates require FR-1 documentary closure.

**Gap**

The research makes the multi-quantity behavior fixture-gated, specifically including assignment, partial assignment, remap, removal, replacement, and re-add. The spine requires generic “fixtures” in AD-14 and lifecycle/archive fixtures in the Open Activation Gates, but it does not explicitly gate activation or dependent decomposition on the complete multi-quantity identity fixture set. The lifecycle/archive gate is not a substitute for proving identity continuity and incarnation behavior.

**Required reconciliation**

Treat the following as mandatory activation evidence even though the current gate text does not enumerate it: quantity-one provisional-to-exact attachment; multi-quantity partial/exact assignment; same-stock remap; different-stock replacement; removal; and re-add, all proving no ordinal identity and no duplicate membership/task.

### 2. Absence authority — Mostly accurate

**Research finding**

- JSON:API `data: []` proves response representation, not removal causality or parent-version advancement.
- Generic absence is permanently non-closing in v1, even in a complete relationship.
- Closure requires an explicit validated archive/tombstone or another fixture-proven explicit removed semantic state from the canonical refetch path.
- Silent absence may update observations and incidents but must not terminally mutate history.

**Spine landing**

- AD-4 states that generic absence is permanently non-closing even when transport-complete.
- It permits closure only from validated explicit archive/tombstone or independently fixture-proven removed state through canonical refetch.
- It limits absence to observation metadata/incidents.
- AD-13 and the Open Activation Gates require explicit Planning and StockItemPlanning archive fixtures and retain `unknown`/incident behavior otherwise.
- AD-15 makes reconciliation absence non-deleting.

**Ambiguity**

AD-4 also says that explicit removals require “newer root/relationship authority” plus a validated removed state. The research specifically found that Booqable does not guarantee parent `order.updated_at` advancement for every child removal. If “root/relationship authority” is interpreted as a mandatory parent/relationship timestamp advance, the spine would reject a valid child tombstone whose own `archived_at` or equivalent explicit version is authoritative. That is safer than wrongful closure, but it is not the research's intended closure rule and could make documented tombstones unusable.

**Required reconciliation**

The comparator contract must make explicit that independently versioned child tombstone/archive evidence can satisfy removal authority without assuming parent `updated_at` advanced. If the architecture intentionally requires an additional relationship authority signal, a fixture must prove that signal exists for the target account.

### 3. FR-3 assignment behavior — Accurate

**Research finding**

- “Same mechanic is still actively working” is unenforceable without a presence lease.
- Removal/cancellation atomically clears assignment.
- Valid same-bike reactivation preserves safe stage/evidence, reconciles current intent, and returns unassigned for ordinary claim.
- Presence must not be inferred from stage, screen, session, or recent save.

**Spine landing**

- AD-6 adopts unconditional assignment clearing on removal/cancellation.
- It preserves prior safe stage/outcomes and returns valid same-bike reactivation unassigned.
- It explicitly states that v1 has no presence lease and requires PRD alignment before decomposition.
- AD-14 and the Open Activation Gates include FR-3 documentary closure.
- The lifecycle model keeps source availability separate from workflow stage.

No material drift found.

### 4. ProductGroup classification — Accurate

**Research finding**

- ProductGroup UUID is the stable classification key.
- Analyst candidates and hashed evidence are not business approval and cannot populate the runtime allowlist.
- Activation requires a business-approved, versioned list of actual UUIDs.
- Labels are display-only.
- Unmapped trackable groups fail closed and open an incident.

**Spine landing**

- AD-13 requires immutable business-approved allowlist versions keyed by actual ProductGroup UUID.
- Labels never classify at runtime and analyst candidates are explicitly not approval.
- Newly observed unmapped trackable groups fail closed.
- Allowlist change semantics include disabled impact analysis, explicit enrollment/backfill, and incident-first removal handling.
- AD-14 and Open Activation Gates require actual UUID approval before activation.

No material drift found.

### 5. Setup Category mapping — Accurate

**Research finding**

- No evidence establishes stable source mapping for Pedals, Saddle, Wheelset, Power meter, or Computer mount.
- Name/label matching is unacceptable.
- Targeted invalidation may activate only with stable identifiers and fixture-backed normalization.
- Otherwise v1 must use broad `review_updated_configuration`; missing targeted mapping must not block all Workshop execution.

**Spine landing**

- AD-13 enables targeted invalidation only when every active category has stable approved identifiers and fixtures for null, unknown, changed, and removed values.
- It forbids title/label mapping.
- It activates/advances the built-in broad review requirement when targeted mapping is not safe.
- AD-7 makes Setup coverage non-blocking context.
- Open Activation Gates require either stable mappings or explicit broad-review re-scope.

No material drift found.

### 6. Pickup, Return, and lifecycle mapping — Accurate

**Research finding**

- Order status alone is too coarse.
- Per-bike phase must derive from exact StockItemPlanning/Planning context.
- Partial start and stop are valid.
- Target-account fixtures are required for reserved, partial/full start, partial/full stop, cancellation, removal, and re-add.
- Until fixtures pass, phase remains `unknown` and cannot automate Return.

**Spine landing**

- AD-13 derives assigned-not-started, started-not-stopped, and stopped from exact Planning/StockItem context.
- It keeps phase `unknown` and blocks automatic Return until the named target-account fixtures pass.
- AD-6 gates Return eligibility on current authoritative association and source overlay.
- Open Activation Gates repeat the lifecycle/archive proof condition.

No material drift found. Implementation must still ensure aggregate Planning counters are never used to arbitrarily assign started/stopped status among multiple exact StockItems; fixtures must prove the exact-unit discriminator used by the adapter.

### 7. Technology baseline — Accurate with one minor proof omission

**Research finding**

- Retain TypeScript, PostgreSQL 17, Supabase, Vercel, and the modular monolith.
- Next.js 14 is unsupported; migrate through a tested supported-LTS path, preferring 16.x unless compatibility requires staged 15.x.
- Pin Node 24.x and one tested stable Supabase CLI in source and CI.
- Apply `@supabase/ssr@0.10.0` cache-prevention headers during refresh.
- Verify local/staging/production PostgreSQL and extension parity; the staging extension query timeout remains unresolved.
- No broker, warehouse, edge runtime, or new service is required.

**Spine landing**

- Stack inventory marks Next.js 14 unsupported and requires the supported-LTS migration.
- AD-14 preserves the 14 → supported-LTS compatibility gate and prefers 16.x.
- AD-14 pins Node 24.x and a tested stable Supabase CLI in source and CI.
- AD-14 applies Supabase SSR-provided cache-prevention headers.
- AD-14 verifies PostgreSQL 17, extension/migration parity, and affected auth/build/PDF/editor/email/routes.
- The architecture remains ordinary Node.js/PostgreSQL/Vercel and adds no unnecessary infrastructure.

**Minor omission**

The spine does not explicitly preserve the research checklist's requirement that the prior staging extension timeout be resolved or explained, nor the exact refresh fixture assertion `Cache-Control: private, no-store`. Both are implied by parity/header verification but should remain explicit evidence in the implementation or environment-proof story.

### 8. Security baseline — Accurate

**Research finding**

- Stop logging rejected caller-supplied webhook secrets.
- Remove or strongly authenticate and least-privilege the unauthenticated service-role sandbox route.
- Restrict service-role use to ingestion.
- Use `security_invoker` views where appropriate.
- Put definer functions in an unexposed schema, use `search_path = ''`, revoke `PUBLIC`, lock default privileges, and test effective API roles.
- API roles, including service role, must have no direct authoritative source/event DML after cutover.

**Spine landing**

- AD-11 captures the capability-role model, unexposed internal functions, fixed path, schema qualification, same-migration revocation, locked defaults, no role inheritance/escalation, and minimum wrapper grants.
- AD-11 explicitly removes direct authoritative source/event DML from API roles including service role.
- AD-14 makes secret logging and sandbox-route containment pre-foundation work.
- Open Activation Gates require effective-role tests and containment.

No material drift found.

### 9. Cron, runtime, and recovery — Accurate

**Research finding**

- The documented Hobby Fluid Compute envelope is 300 seconds, not the stale universal 10-second assumption.
- Runtime headroom does not replace durable recovery.
- One protected Vercel Cron route should validate `Authorization: Bearer ${CRON_SECRET}`.
- Overlap and duplicate invocation remain possible.
- Database leases, receipt generations, bounded attempts, backoff/checkpoints, and durable terminal states are the authority.
- No in-process singleton may be trusted.

**Spine landing**

- AD-15 explicitly names the documented 300-second envelope but rejects it as concurrency/recovery authority.
- It requires the Cron bearer token and rejects missing/mismatched authorization.
- Receipt generations, covered generations, lease generations, CAS, expiry, bounded attempts, successor work, incidents, retries, and stable sweeps are specified.
- AD-14 requires bounded shadow reconciliation and disabled deployment proof.

No material drift found. The implementation story should still assign explicit execution budgets that stop with margin before the platform limit and preserve progress at each bounded unit.

### 10. Testing and quality floor — Mostly accurate

**Research finding**

The minimum package is not generic “add tests”; it names:

- adapter fixtures for allowlist branches, single/multi identity, lifecycle phases, explicit archives, non-closing absence, partial scopes, and unsupported schema;
- pgTAP tests for envelope vocabulary, comparator branches, atomicity/rollback, disabled debt, cardinality/incarnation, lifecycle/FR-3, revisions, append-only events, and effective-role permissions;
- true multi-session tests for concurrent claims, overlapping ingestion, checklist activation/snapshot selection, and expired-lease late completion;
- local reset, database tests, lint, and generated type checks using the pinned CLI.

**Spine landing**

- AD-4 requires fixtures for every comparator branch.
- AD-7 and AD-9 define checklist locks, revisions, and first-writer behavior.
- AD-11 requires effective-role allowed/denied fixtures.
- AD-14 requires fixtures plus effective-role and multi-session tests before foundation expansion.
- Structural Seed creates adapter/contracts/workers and database-test locations.
- Deferred correctly states that pgTAP, adapter-fixture, and multi-session floors are not deferred.

**Gap**

The spine never consolidates the research's minimum matrix. Several mandatory proofs are therefore only inferable, especially:

- transaction rollback across source projection, Workshop derivation, and event insertion;
- disabled derivation debt/watermark behavior;
- all four named multi-session races;
- the complete adapter fixture set;
- `supabase test db`, lint, reset, and generated-type checks as one activation package.

This is a traceability weakness: a story decomposition could satisfy the prose with a smaller test set than the research authorized.

**Required reconciliation**

Carry the research's “Testing and Quality Assurance” checklist forward verbatim or as testable story acceptance criteria. Do not treat broad AD-14 wording as permission to reduce the floor.

### 11. Activation gates and rollout — Mostly accurate

**Research finding**

Activation requires:

- approved FR-1 and FR-3 amendments;
- approved actual ProductGroup UUIDs;
- stable Setup fixtures or broad-review approval;
- lifecycle/archive fixtures;
- security and technology fixes;
- caller cutover and legacy DML revocation;
- disabled derivation that preserves debt;
- local, staging, and production proof;
- two stable complete disabled sweeps;
- every enrolled order materialized at enable boundary;
- no scoped blocking incident;
- explicit pilot cohort and approved rollback/repair procedure;
- separate general activation and paper-retirement decisions.

**Spine landing**

- AD-14 sequences documentary closure → containment → foundation → caller cutover → contract → dependent Workshop → environment proof → pilot → general activation.
- It specifies disabled observed/materialized watermarks and forced enrolled-order derivation.
- It defines a two-sweep boundary manifest and handling for orders absent from it.
- It scopes blocking incidents and preserves emergency disable.
- Open Activation Gates accurately summarize documentary, business/configuration, lifecycle/archive, technology/security, and environment/activation proof.
- The deployment diagram separates pilot, general activation, paper retirement gate, and rollback.

**Gap**

The research requires the pilot cohort **and rollback/repair procedure** to be approved. The spine requires explicit pilot approval and defines emergency disable/repair mechanics, but it does not explicitly make approval of the operational rollback/repair procedure a pilot gate.

**Required reconciliation**

Before pilot, require a reviewed procedure that names emergency disable, authoritative refetch/reconciliation, incident handling, correction-successor use for irreversible false derivation, evidence retention, and decision authority for resuming.

### 12. Other architecture-relevant findings — Accurate

- The anti-corruption layer and one versioned envelope landed in AD-1 and AD-16.
- `order_graph` as the sole task-deriving unit and `resource_batch` as debt-producing only landed in AD-16.
- Current state plus append-only attributable history landed in AD-8.
- PostgreSQL transaction/advisory-lock/revision ownership landed in AD-2, AD-7, and AD-9.
- Read models/RPCs and no client-side aggregation landed in AD-12 and Consistency Conventions.
- Git/CI-only remote DDL landed in AD-14 and Migrations conventions.
- Expand → prove → switch → contract and separate framework migration/foundation risk landed in AD-14 and the deployment sequence.
- Activation as positive evidence rather than absence of errors landed through boundary manifests, stable sweeps, scoped incidents, and explicit pilot/general gates.

## Top Findings

1. **All principal research decisions landed.** There is no missing blocker-resolution decision and no unsafe reintroduction of ordinal identity, generic-absence closure, label mapping, order-status-only lifecycle, or inferred mechanic presence.
2. **Removal version authority needs clarification.** AD-4 must not accidentally require parent `updated_at` advancement when an independently authoritative child archive/tombstone is present.
3. **The multi-quantity proof gate is under-specified.** Identity/incarnation fixtures for remap, replacement, and re-add are mandatory but not enumerated in the Open Activation Gates.
4. **The test floor is dispersed and incomplete as a traceable contract.** The research's exact adapter, pgTAP, multi-session, reset/lint/type-generation matrix must survive into stories.
5. **Pilot approval is missing an explicit rollback/repair-procedure condition.** Emergency mechanics exist, but procedural approval is not stated as a gate.
6. **Two minor environment proofs should remain explicit.** Resolve/explain the staging extension timeout and assert the SSR refresh response is `private, no-store`.

## Final Assessment

The Architecture Spine is safe to use as the architectural substrate **provided implementation-readiness and story decomposition carry forward the research's stricter verification checklist**. It should not yet be represented as containing every activation-proof detail.

No spine edit is required to understand the adopted architecture decisions. However, activation governance must close the three material gaps above either through a later spine amendment, a binding implementation-readiness register, or explicit story acceptance criteria. Until then, the accurate status is:

**Architecture ambiguity resolved; activation evidence contract partially reconciled; production activation still blocked.**
