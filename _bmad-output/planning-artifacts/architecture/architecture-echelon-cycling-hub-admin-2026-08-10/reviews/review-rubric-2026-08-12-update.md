# Good-Spine Rubric Review — 2026-08-12 Research Reconciliation Update

**Reviewed:** 2026-08-12  
**Artifact:** `../ARCHITECTURE-SPINE.md`  
**Focus:** reconciliation of `technical-workshop-architecture-open-activation-blockers-research-2026-08-12.md`  
**Intent:** validation only; the spine was not edited.

## Verdict

**FAIL — the research reconciliation itself is substantially complete, but the spine still misses one high-severity workflow invariant and leaves several operational/environmental choices loose enough for lower-level units to diverge.**

The update correctly landed the five research decisions: exact-StockItem-only multi-quantity identity, explicit-tombstone-only closure, unconditional FR-3 unassignment, UUID allowlisting with safe Setup fallback, and the supported/pinned technology and security gate. It also corrected the prior review's child-tombstone authority ambiguity, consolidated the minimum proof matrix, made the staging timeout and SSR header assertions explicit, and added rollback/repair-procedure approval before pilot.

The deterministic spine linter passes with zero findings. Current-version checks also support the named baseline: Next.js 14.2.35 is unsupported while 16.x is Active LTS and 15.x is Maintenance LTS; Vercel supports Node 24.x as its default major; PostgreSQL 17 remains supported; `@supabase/ssr` 0.10.0 supplies response cache headers that callers must propagate; and Booqable's official current API remains v4.

Mechanical correctness and research traceability do not close the semantic findings below.

## Findings

### H1 — Assignment disposition is not bound for several mandatory lifecycle transitions

**Severity:** High  
**Rubric impact:** misses a real feature-level divergence point; AD-2's stated prevention is not fully achieved; driving requirements FR-5, FR-29, FR-30, FR-39, and the terminal-state model are not fully bound.

AD-2 says a lifecycle stage cannot change without its assignment changing consistently, but AD-6 only specifies assignment clearing for removal/cancellation and unassigned reactivation. It does not state the assignment result for:

- manager reset to Needs Prep, which FR-5 requires to be unassigned;
- relevant change from Needs Re-check, In Re-check, or Preparation Resolved back to Needs Prep, which FR-29/FR-30 require to be unassigned;
- forced Return from active Prep/Re-check, which FR-39 requires to clear assignment;
- replacement, force-close, and Done, where leaving a stale assignee would make terminal/read-only work disagree with My Work and assignment read models.

The state diagram and Work Cycle closure rules decide stage/cycle behavior, but no constraint or transition postcondition makes `assignee_id` null for those paths. One story can preserve the prior mechanic while another clears them, and both can claim compliance with the current Rule.

**Required closure:** bind an assignment postcondition for every reset, invalidation, forced-Return, and terminal transition, and include it in the lifecycle pgTAP matrix.

### M1 — Vercel preview/non-authoritative environments are silent

**Severity:** Medium  
**Rubric impact:** the deployment/environments dimension is not completely decided, deferred, or open.

The spine covers local, staging, production-disabled, pilot, and general activation, and calls this the “current two-environment path.” It says nothing about Vercel preview deployments or other branch deployments. For an integration with service credentials, Cron, webhook routes, source writes, and environment-scoped rollout state, omission is material: previews could be disabled, use an isolated database, point at staging read-only, or inherit production-scoped credentials.

Repository migration workflows establish `staging` and `main` database deployment paths, but they do not prove that Vercel previews are absent or harmless. Lower-level deployment and environment-variable stories can therefore choose incompatible behavior.

**Required closure:** explicitly exclude preview deployments from integration execution, or define their database, Booqable identity, Cron/webhook behavior, secrets, and activation-state policy.

### M2 — `rejected_retryable` has no deterministic intent-state transition

**Severity:** Medium  
**Rubric impact:** AD-15 is not fully enforceable against its stated retry/recovery divergence.

AD-16 defines `rejected_retryable`, but AD-15's intent states are `claimable | leased | succeeded | exhausted | quarantined | rejected_terminal`. The Rule does not map a retryable rejection to lease release, delayed claimability, an in-lease retry, or exhaustion, and it does not bind which retryable conditions consume the bounded attempt budget.

Worker, JIT, and operator-retry stories can implement different transitions while each using the named vocabulary. That can produce either hot-looping or permanently stranded work.

**Required closure:** add a result-to-intent transition table, including lease/CAS effects, attempt-budget consumption, successor behavior, and incident opening/auto-resolution.

### M3 — Archived-customer PII remains a divergence under Deferred

**Severity:** Medium  
**Rubric impact:** a Deferred item can still let projection and migration units diverge.

Deferred prohibits automated retention/anonymization until policy exists, while AD-17 postpones the minimal projected customer fields and archived-row behavior to an authority manifest required only before production activation. The integration foundation can therefore be decomposed before the archive contract exists.

Separate units could freeze existing PII, continue refreshing it, null selected fields, or retain every current field while all claiming that they did not implement automated anonymization. AD-17's statement that archived PII does not expand or refresh “beyond that contract” does not help before the contract is fixed.

**Required closure:** make the customer/archive authority-manifest decision a pre-foundation gate, or bind a temporary rule such as preserve existing values, cease PII refresh after explicit archive, and perform no nulling until policy approval.

### M4 — Webhook authentication is contained but not ratified

**Severity:** Medium  
**Rubric impact:** brownfield security reality is only partially ratified.

The research accepted the current static webhook secret as a bounded v1 mechanism if it is compared without disclosure, rotated through environment management, and followed by authoritative refetch. AD-14 only requires stopping secret logging; it does not ratify the current query-secret contract, require rotation, or mark webhook authentication as an open replacement decision.

An implementation unit can preserve the current query parameter, another can move it to a header, and another can invent HMAC/request signing. Those choices affect Booqable configuration and deployment together.

**Required closure:** ratify the static environment-managed secret for v1 with non-disclosing comparison and rotation, or explicitly gate activation on a named replacement supported by Booqable.

### L1 — Cron dispatch cadence and job multiplexing are implicit

**Severity:** Low  
**Rubric impact:** operational implementation can drift without violating AD-15.

The spine names one Cron schedule, a bounded worker, prompt webhook receipt, and nightly reconciliation, but does not decide how one schedule provides low-latency intent processing and nightly sweep initiation. A minute-level dispatcher that starts nightly work by due-state and a once-nightly Cron are materially different recovery envelopes.

**Required closure:** bind the dispatcher cadence or define it as repository configuration with a freshness/repair acceptance bound and a single due-job selection contract.

### L2 — NFR-1/NFR-2 are claimed but have no architecture-level responsive invariant

**Severity:** Low  
**Rubric impact:** requirement coverage is overstated in the Capability → Architecture Map.

The map says NFR-1/NFR-2 are governed by AD-9 and AD-12, but those Rules cover stale writes, pending/error feedback, URL state, and data refresh—not phone/tablet responsiveness, tap-friendly controls, readability, or keeping the next physical action and current target configuration visible. The UX package may own visual detail, but the spine should either inherit that contract explicitly or stop claiming these NFRs are governed by the cited ADs.

**Required closure:** add an inherited UX constraint or mark responsive presentation as delegated to the binding UX source with acceptance retained there.

### L3 — “Exactly one active template version” is not enforced by the named constraint

**Severity:** Low  
**Rubric impact:** part of AD-7's Rule overstates database enforceability.

AD-7 says a uniqueness constraint maintains exactly one active version. A unique/partial unique constraint enforces at most one, not at least one. The Rule separately says missing active versions block, which is safe, but that means the actual invariant is “at most one active; none is a typed blocking condition.”

**Required closure:** use the enforceable wording and test both duplicate activation rejection and missing-active blocking.

### L4 — The structural seed conflicts with the identity rule's observation model

**Severity:** Low  
**Rubric impact:** seed can mislead lower-level data-model work despite AD-5 being stronger.

The ER seed connects `STOCK_ITEM_PLANNINGS` to `ORDER_BIKE_MEMBERSHIPS` as if one planning-assignment row proves the membership. AD-5 says StockItemPlanning IDs are observations, same-stock remap preserves membership identity, and quantity-one provisional membership may exist before an exact assignment. The seed does not show a history/observation relation capable of multiple assignment observations per membership.

**Required closure:** stories must follow AD-5 over the diagram; the eventual schema should model StockItemPlanning observations separately from immutable membership identity.

### L5 — Conditional least-privilege wording lacks a proof outcome

**Severity:** Low  
**Rubric impact:** one security gate is not binary.

AD-14 requires a least-privileged Booqable identity “where supported” but does not say what evidence proves support is unavailable or what compensating boundary applies. The research similarly treats this as provider-dependent, but a gate must still yield a recorded pass/fail outcome.

**Required closure:** record capability discovery and, if Booqable cannot scope the token, require the dedicated integration identity, server-only storage, rotation, and projection-side write minimization as the accepted fallback.

## 2026-08-12 Research Reconciliation Assessment

The update accurately closes the previous reconciliation findings:

- child tombstones may carry independent closure authority without parent `updated_at`;
- the complete multi-quantity identity fixture set is mandatory;
- the adapter/pgTAP/multi-session/reset-test-lint-types matrix is one binding package;
- SSR `private, no-store` and the staging extension timeout are explicit environment evidence;
- pilot approval includes a reviewed rollback/repair procedure and resume authority.

No research decision was weakened or contradicted. The remaining High finding is a pre-existing driving-requirement omission exposed by re-walking the complete spine, not a regression in those five research amendments.

## Rubric Summary

- **Real divergence points:** Fail — assignment postconditions remain open.
- **AD enforceability:** Fail — AD-15 lacks the retryable result/state transition; AD-7 overstates “exactly one.”
- **Deferred safety:** Fail — archived-customer handling can diverge before its manifest is fixed.
- **Named technology/current fit:** Pass.
- **Brownfield ratification:** Pass with a medium webhook-auth qualification.
- **Driving requirements:** Fail at FR-5/FR-29/FR-30/FR-39 assignment semantics; otherwise strong.
- **Inherited parent spine:** Not applicable.
- **Feature-altitude breadth:** Fail — preview/non-authoritative environments are silent; operations are otherwise unusually complete.
- **Mechanical integrity:** Pass — zero linter findings.

## Final Assessment

The spine is substantially stronger after the 2026-08-12 reconciliation and is safe as a source-contract and activation-gate reference. It is not yet a fully passing feature-altitude convergence contract because assignment behavior across key lifecycle transitions can still be implemented incompatibly. Close H1 before story decomposition for reset, invalidation, Return, and terminal flows; close M1–M4 before integration foundation or environment work is split across units.
