# Good-Spine Rubric Recheck — 2026-08-12 Fixes

**Reviewed:** 2026-08-12  
**Artifact:** `../ARCHITECTURE-SPINE.md`  
**Prior review:** `review-rubric-2026-08-12-update.md`  
**Scope:** remaining critical/high findings only; the spine was not edited.

## Verdict

**FAIL — no critical finding remains, but one high-severity activation/enrollment divergence remains.**

The deterministic spine linter passes with zero findings. The requested fixes close the prior findings:

- AD-6 now clears assignment atomically for reset, invalidation to Needs Prep, forced Return, replacement, force-close, Done, cancellation, and temporary removal.
- AD-14 excludes preview/branch deployments from Booqable, service-role, and Cron credentials and prohibits ingestion, derivation, and activation there.
- AD-15 binds a versioned result-transition catalogue and maps `rejected_retryable` to delayed claimability through budget exhaustion.
- Deferred now gives archived customers one temporary non-divergent rule: preserve existing required values, stop PII refresh, and perform no nulling/anonymization.
- AD-14 ratifies one environment-managed static webhook secret for v1 with non-disclosing comparison, rotation, and authoritative refetch.
- AD-19 centralizes activation in one database-owned, environment-scoped state machine and gates derivation, enrollment, reads, capabilities, and mutations through the same predicate.

## Remaining Critical/High Findings

### H1 — Enabled auto-enrollment references a missing cutover-boundary contract

**Severity:** High  
**Rubric impact:** AD-19 is not fully enforceable against its stated activation/enrollment divergence, and lower-level rollout units can choose incompatible enrollment behavior.

AD-19 says:

> `enabled` permits post-boundary auto-enrollment under AD-14

AD-14 no longer defines that boundary. It does not bind:

- the durable boundary artifact or source sequence that distinguishes post-cutover rentals from pre-existing paper rentals;
- whether the boundary is the two-sweep known-order manifest, an observed source-created sequence, a timestamp, or another authority;
- the eligibility conditions for automatic enrollment;
- the fallback for orders whose creation relative to the boundary cannot be proven.

The Open Activation Gates require two stable sweeps and current enrolled-order materialization, but those prove coverage of known/enrolled orders; they do not define which later orders may auto-enroll. The durable AD-19 environment-proof manifest records sweep boundaries, but recording an unspecified boundary does not give it enrollment semantics.

This is safety-relevant. One implementation can auto-enroll every reserved order first observed after enablement, another only source-proven newly created orders, and another all orders absent from the pilot cohort. Those choices can create digital tasks for rentals already handled on paper or omit legitimate post-cutover work.

**Required closure:** bind the enabled-state enrollment boundary in AD-14 or AD-19. The previous safe contract is sufficient: persist the completed two-sweep known-order manifest at enablement; orders in or ambiguously preceding it never auto-enroll; only a separately fixture-proven source-created sequence may auto-enroll post-boundary rentals; all unresolved cases require attributable operator enrollment.

## Final Assessment

Assignment postconditions, preview environments, retry transitions, archived PII, webhook authentication, and the activation state machine itself now pass the critical/high rubric threshold. The spine becomes a critical/high pass once the dangling post-boundary auto-enrollment reference is replaced by an enforceable boundary and fallback rule.
