# Final Good-Spine Rubric Gate — Workshop Tasks

**Reviewed:** 2026-08-12  
**Artifact:** `../ARCHITECTURE-SPINE.md`  
**Intent:** Final validation only; the spine was not edited.  
**Verdict:** **PASS WITH EXPLICIT ACTIVATION BLOCKERS — no critical or high rubric finding remains.**

The second closure pass preserves the prior H1–H5 fixes and closes the additional cross-module, rollout, reconciliation, identity, event, and operational seams exposed during the broader gate. The unresolved source/product conditions are now hard gates: affected contracts and decomposition cannot proceed while their source truth remains unknown. They no longer allow independent units to make incompatible choices.

## Review boundary

The final gate applied the BMad good-spine checklist to the latest spine and architecture memlog, using the finalized PRD/addendum, UX package, completed Workshop brainstorm, completed Booqable technical research, brownfield code/migrations/RLS/deployment/configuration, package lock, project context, and the prior rubric findings as reconciliation evidence.

The deterministic linter passes with zero findings:

- AD-1 through AD-18 are unique and monotonic;
- every AD has Binds, Prevents, and Rule;
- every Stack entry is pinned;
- no placeholder remains.

## Prior H1–H5 closure

- **H1 — source-vector removal semantics: closed.** AD-4 now defines the union comparison domain, complete/partial scope, newer authority for additions/removals, explicit tombstones, equal-vector fingerprint behavior, quarantine, schema-version separation, and queued-work refetch/drain. Absence authority is fixture-gated and otherwise non-closing.
- **H2 — mechanic shared-source reads: closed.** AD-11 prohibits broad mechanic shared-table RLS; AD-18 fixes the task-scoped field allowlist and excluded PII; AD-12 composes task detail through that capability.
- **H3 — multi-quantity FR-1: safely gated.** AD-5 fixes identity/incarnation/cardinality and prohibits guessing. The unresolved source discriminator is an Open Activation Blocker that stops dependent task-creation decomposition or requires explicit FR-1 re-scope.
- **H4 — attention payloads: closed.** AD-10 fixes reason codes, note requirements, requester-only override behavior, issue identity, and found-and-fixed semantics.
- **H5 — FR-3 source conflict: safely gated.** AD-6 fixes one current implementation contract and explicitly requires PRD alignment or an approved enforceable presence lease before affected decomposition.

## Second closure-pass verification

The latest additions prevent new incompatible implementations:

- **Membership concurrency:** AD-5 allows at most one current nonterminal incarnation and performs close/open replacement atomically.
- **Global event presentation:** AD-8 separates per-task causal sequence from deterministic cross-task ordering.
- **Default privileges:** AD-11 applies revocation/default-privilege rules to every object-creating owner and forbids API-role membership or `SET ROLE` escalation.
- **Allowlist evolution:** AD-13 versions classification, requires disabled impact analysis, and prevents removals from silently terminating existing work.
- **Rollout boundary:** AD-14 uses a completed two-sweep known-order manifest, scopes blocking incidents, and leaves emergency disable/repair unconditional.
- **Worker convergence:** AD-15 defines receipt-to-intent correlation, lifecycle states, leases, heartbeats, CAS completion, bounded attempts, successor retry lineage, and exact JIT-gated command classes.
- **Pagination coverage:** AD-15 requires stable sorting, overlap, coverage epochs, and two stable complete sweeps; page absence never deletes.
- **Derived-context changes:** AD-16 records derivation debt for relevant resource, partner-map, and allowlist changes and consumes it through `order_graph` even when source DML is otherwise a no-op.
- **Bad-ingestion repair:** AD-14 binds a narrow correction capability that preserves app-authored evidence, provenance, and correction history without weakening ordinary terminal rules.
- **Read/event seams:** AD-18 versions the field-minimized task-context and Workshop event catalogues across SQL producers, loaders, types, and Activity.
- **Operational retention:** the conventions preserve nonterminal work and sufficient failure/provenance summaries while centralizing compaction windows.

No new critical or high issue arises from these additions.

## Good-spine checklist

- **Real feature-altitude divergence points:** **Pass.** Cross-module ownership, source comparison, identity, lifecycle, reads, events, retries, rollout, and repair are fixed or hard-gated.
- **AD enforceability/prevention:** **Pass.** Rules identify owners, constraints, lock/transaction boundaries, typed states/results, fixture gates, privilege checks, and operational transitions that can be tested.
- **Deferred safety:** **Pass.** Deferred behavior is prohibited or bounded by one current contract; unresolved capability/source choices are under Open Activation Blockers instead.
- **Named technology/current fit:** **Pass.** Versions are accurate brownfield inventory, unsupported Next.js is explicitly not endorsed, and runtime/provider uncertainties are activation gates.
- **Brownfield ratification:** **Pass.** Existing shared data, partner attribution/access, local customers, writers, route conventions, migrations, and CI deployment are preserved through explicit cutover and compatibility contracts.
- **Source capability coverage:** **Pass with gates.** Requirements are represented; capabilities whose source evidence or upstream decision is unavailable cannot decompose or activate until proved or re-scoped.
- **Inherited parent spine:** **Not applicable.**
- **Structural breadth:** **Pass.** Stack, boundaries, data, state, mutation, concurrency, security, UX data flow, deployment/environments, infrastructure, operations, monitoring state, retry, reconciliation, retention, recovery, rollback/correction, and testing are covered.
- **Mechanical integrity:** **Pass.**

## Activation blockers are not rubric findings

The spine correctly retains five hard conditions:

1. prove or re-scope multi-quantity FR-1 identity;
2. align FR-3 or approve a presence lease;
3. approve/prove or re-scope classification, Setup Category, and pickup mappings;
4. prove absence-authority version behavior or keep absence non-closing;
5. complete the supported framework/runtime, SSR cache, deployment, privilege, and CLI baseline.

Each blocker has one safe fallback and prevents affected decomposition or activation. None permits feature units to diverge.

## Final gate conclusion

The latest spine is a valid feature-altitude convergence contract. No critical or high rubric finding remains. Work may decompose only where the Open Activation Blockers permit it, and production activation remains subject to the stated evidence and technology gates.
