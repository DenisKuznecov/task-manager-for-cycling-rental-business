# Adversarial Incompatible-Units Review — Updated Architecture Spine

## Verdict

**FAIL — the spine still permits independently implemented units to obey every AD literally while disagreeing at consequential runtime seams.**

The repository-owned contracts close many DTO-level disagreements, but they do not close the semantic choices below. These are not requests for ordinary schema detail. Each finding constructs two one-level-down implementation units that can both cite the current ADs as satisfied and still cannot safely compose.

## Review Method

- Target: `../ARCHITECTURE-SPINE.md`, updated 2026-08-12.
- Test: construct Unit A and Unit B one decomposition level below the spine.
- Hole criterion: both units follow every applicable AD literally, but their composition disagrees on authority, identity, state transition, freshness, activation, recovery, or proof.
- Excluded: choices already forced through an authoritative repository contract whose required semantics are explicit in the spine; ordinary column/index naming; external facts already fenced by an activation blocker.

## Findings

### 1. CRITICAL — A JIT command can be authorized by a fetch that began before the command

**Unit A — JIT adapter.** On claim, handoff, completion, reset, or force-close, it finds the order's existing leased intent and waits for that attempt. If the attempt returns current-attempt `applied` or `no_op`, it invokes the mutation RPC. This obeys AD-15: all refresh uses AD-16, work is coalesced, and a current attempt produced an allowed result.

**Unit B — bounded worker.** A reconciliation or webhook attempt may have started its authoritative fetch before the user pressed the command. It completes under a valid lease and unchanged `receipt_generation`; no later webhook receipt exists, so AD-15's receipt fence is satisfied.

**Incompatibility.** The consequential command is authorized by authority observed before the command began. `receipt_generation` fences webhook receipts, not JIT demand. “Current-attempt” does not require `fetch_started_at >= command_requested_at`, a JIT generation covered by the attempt, or a successor fetch when joining pre-existing work.

**Required closure.** Give JIT requests their own monotonic demand generation and require the authorizing attempt to cover it with a fetch begun after that generation, or explicitly prohibit JIT from joining an attempt whose fetch fence predates the command.

### 2. CRITICAL — JIT refresh and optimistic workflow revision have no binding handoff

**Unit A — server action.** It receives browser revision `R`, performs mandatory JIT, then submits the transition with expected revision `R`. If JIT advanced source/requirement generations and workflow revision to `R+1`, the RPC rejects stale work. This obeys AD-9's explicit expected-revision rule.

**Unit B — transition coordinator.** It performs JIT, reads authoritative revision `R+1`, and submits `R+1` to the transition RPC after re-reading confirmed evidence. This obeys AD-15's requirement that transitions re-read local records after JIT and avoids making every source-changing refresh force a retry.

**Incompatibility.** Unit A requires the user to see and reconfirm the post-refresh state; Unit B can complete against a revision the user never saw. The result contract does not state whether the browser revision remains the controlling CAS value, whether two revisions are supplied, or which JIT changes are allowed to commute with the command.

**Required closure.** Define a single command envelope carrying displayed revision plus JIT result/revision and bind exact continuation rules: either any JIT workflow-revision advance returns stale, or enumerate predicates under which the RPC may rebase while still proving the displayed intent remains valid.

### 3. CRITICAL — Emergency disable can split UI actionability from derivation state

**Unit A — application activation gate.** “Emergency disable” turns off Workshop routes and action adapters immediately, while ingestion and derivation continue converging in the background so recovery remains warm.

**Unit B — database integration gate.** “Emergency disable” switches derivation to `derivation_disabled`, preserves debt/watermarks, and leaves read-only routes visible for incident handling.

**Incompatibility.** Both implement an ungated emergency disable and preserve recovery, but they disagree on whether source acceptance may still derive tasks and whether users may still read Workshop state. If independently deployed or toggled, routes may remain actionable while derivation is disabled, or hidden while new tasks and lifecycle effects continue materializing.

**Required closure.** Define one environment-scoped activation state machine, its owner, atomic transition, and the exact behavior of reads, mutations, JIT, background ingestion, task derivation, enrollment, and operator repair in each state.

### 4. HIGH — `order_bike_memberships` has two plausible owners and writers

**Unit A — integration coordinator.** Treats memberships as admitted shared source facts under AD-3. The coordinator writes/ closes `order_bike_memberships`, then invokes the Workshop-owned derivation function to create or update tasks.

**Unit B — Workshop derivation RPC.** Treats membership creation and task creation as the atomic Workshop derivation promised by AD-4/AD-16. The coordinator writes source projection only and invokes a Workshop-owned function that creates both membership and task.

**Incompatibility.** AD-3 says the integration module owns projected source fields; AD-11 says the coordinator invokes a Workshop-owned derivation function without general Workshop grants; AD-16 says `order_graph` is the only unit allowed to derive “memberships/tasks.” The spine never classifies the membership relation itself as integration-owned source projection or Workshop-owned derived aggregate. Privilege ownership, lock acquisition, correction authority, and rollback tests differ.

**Required closure.** Put the membership relation and every field in the authority manifest, name its sole function owner/writer, and state whether membership mutation occurs before or inside the Workshop derivation call.

### 5. HIGH — Explicit removal evidence does not deterministically map to task overlay or membership closure

**Unit A — source derivation.** Maps an explicit removed OrderItem or StockItemPlanning to a closed membership plus task overlay `cancelled`, because AD-4 permits explicit removed state to close a child/membership and AD-6 preserves cancelled work.

**Unit B — source derivation.** Retains the membership and maps the same evidence to `temporarily_removed`, because the source may re-add the same bike and AD-6 defines reversible same-bike reactivation. It closes only an explicit order cancellation as `cancelled`.

**Incompatibility.** Both avoid absence-based closure and both preserve history, but queues, reassociation, Return eligibility, cycle pause/closure, and re-add incarnation behavior diverge. The `known | unknown | removed` envelope lacks the domain removal reason needed to choose among source-row closure, reversible unavailability, cancellation, replacement, and incident-only handling.

**Required closure.** Define a fixture-backed removal-to-domain matrix per resource/relationship and source state, including required membership current/closed state, task overlay, cycle effect, assignment clearing, re-add behavior, and event type.

### 6. HIGH — Pilot cohort identity and enforcement are not canonical

**Unit A — enrollment worker.** During pilot, auto-enrolls every post-boundary order with a proven source-created sequence, because AD-14 expressly permits those orders to auto-enroll. The web layer exposes only explicitly selected pilot orders.

**Unit B — enrollment worker.** During pilot, enrolls and derives only orders in the approved pilot cohort; all other post-boundary orders retain debt until general activation.

**Incompatibility.** Both preserve the two-sweep boundary and require explicit pilot approval, but Unit A creates hidden production tasks/events outside the pilot while Unit B does not. General activation then starts from different task populations, watermarks, incident scopes, and evidence histories.

**Required closure.** Define the durable pilot cohort key and epoch, the component that enforces it, and whether cohort exclusion blocks enrollment, derivation, routes, mutations, or some exact combination. State how post-boundary orders behave in pilot versus general activation.

### 7. HIGH — Activation, rollback, and resume approvals have no durable authority contract

**Unit A — deployment gate.** Treats a CI environment variable or deployment approval as the explicit pilot/general activation and resume authority. Any repository deploy approver can flip it.

**Unit B — operator control.** Persists an environment/epoch approval row through an admin-only RPC and treats that database record as authoritative; deployment alone cannot activate or resume.

**Incompatibility.** Both can honestly claim explicit approval, emergency disable, and an approved rollback procedure. They disagree on the authoritative state, eligible actor, attribution, atomicity with the boundary manifest, and what survives rollback/redeploy. A deployment can activate while the database says disabled, or the database can resume while the application flag remains off.

**Required closure.** Name the sole activation authority and actor roles, require a durable attributable approval record, and bind deployment configuration to the same state machine rather than allowing two control planes.

### 8. HIGH — Activation depends on incident severity that no AD classifies

**Unit A — incident producer.** Marks unresolved exact-assignment shortfalls, phase `unknown`, and unmapped Setup values as medium operational incidents because safe fallbacks prevent wrong mutation.

**Unit B — activation checker.** Blocks only high-severity derivation/security incidents as AD-14 says, so it permits activation with those medium incidents.

An equally literal incident producer can classify the same conditions as high because they prevent complete derivation or lifecycle automation, causing the checker to block.

**Incompatibility.** The activation outcome depends on a severity choice delegated to individual producers. The versioned operational contract covers incident identity/resolution, but the spine does not bind condition-to-severity or condition-to-blocking semantics.

**Required closure.** Define a repository-owned incident catalogue with stable code, severity, blocking scope, auto/manual resolution, acknowledgement requirement, and activation effect for every mandatory incident branch.

### 9. HIGH — Broad Setup fallback has no shared definition of a “relevant configuration change”

**Unit A — normalizer/context comparator.** In broad-fallback mode, advances `review_updated_configuration` only when normalized Setup Category values change. Null-to-unknown observation changes and accessory changes are not Setup changes.

**Unit B — Workshop invalidator.** Interprets “every relevant configuration change” as any accepted bike configuration intent change, including accessories, missing/unknown normalization state, and removed values, and expects the built-in generation to advance for all of them.

**Incompatibility.** Both forbid title matching and both use the mandatory built-in, but the comparator and invalidator disagree on when physical re-review is required. The required null/unknown/changed/removed fixtures do not define the semantic change set, first-baseline behavior, or transition from broad fallback to targeted mappings.

**Required closure.** Define the canonical broad-fallback fingerprint and baseline rules, list included/excluded fields and null/unknown transitions, and specify migration behavior when a mapping version changes between broad and targeted modes.

### 10. HIGH — Source lifecycle facts do not bind one domain transition matrix

**Unit A — phase mapper.** Emits `stopped` per physical bike as soon as that bike's exact StockItemPlanning stops and automatically moves its associated task to Return-eligible state, even if the order is only partially stopped.

**Unit B — lifecycle derivation.** Accepts the same per-bike `stopped` fact but waits for full-order stop/return confirmation before moving any bike task to `Needs Return Check`; until then the bike remains Preparation Resolved.

**Incompatibility.** Both use exact Planning/StockItem context, keep unknown fail-closed, and can pass reserved/partial/full stop fixtures if those fixtures assert only normalized phase. They disagree on the consequential mapping from normalized phase to task transition, association, cycle closure, and Return generation.

**Required closure.** Add a per-bike source-fact-to-domain-transition matrix for reserved, partial/full start, partial/full stop, cancellation, removal, re-add, and order-level versus bike-level conflicts. Fixtures must assert resulting task/cycle state, not merely normalized phase.

### 11. HIGH — Lease fencing does not explicitly fence source mutation before terminal completion

**Unit A — ingestion caller.** Starts fetch under lease generation 4, the lease expires, and generation 5 is claimed. Unit A still calls the ingestion RPC with attempt generation 4; source comparison accepts the graph, but intent completion later fails CAS. It argues that AD-15 only requires unchanged generations for “completion” and AD-4 says attempt generation never outranks source versions.

**Unit B — refresh-intent worker.** Assumes an expired attempt cannot mutate anything and proceeds under generation 5 expecting the database still reflects only generation-5 work. Its expired-lease test asserts late ingestion rejection, based on leases being the concurrency/recovery authority and attempt generations fencing work.

**Incompatibility.** Both readings are supported by the text. Allowing late source/derivation mutation can create events, invalidations, and task revisions from an attempt recorded as non-completing; rejecting it requires the ingestion RPC to make lease validity an acceptance precondition, which is not stated and appears to compete with “attempt generation never outranks source versions.”

**Required closure.** State explicitly whether lease/attempt fencing guards only intent-state completion or the entire source-plus-derivation transaction. Define the required result and incident behavior for a valid newer source graph delivered by an expired attempt.

### 12. MEDIUM — Operator retry budget and lineage can make a compliant retry permanently inert

**Unit A — retry RPC.** Creates a successor intent with a fresh bounded attempt budget. It preserves the failed predecessor and treats explicit operator action as authorization for a new bounded recovery run.

**Unit B — worker budget policy.** Carries consumed attempts across the successor lineage to prevent unlimited retries; a successor attached after `exhausted` has zero automatic attempts until a separate budget override exists.

**Incompatibility.** AD-15 says attempts append under one bounded budget and operator retry creates/joins a successor intent, but it does not say whether “one” budget is per intent, per receipt generation, per root lineage, or per operator retry. Both preserve lineage and boundedness; one retries and the other creates inert successor work.

**Required closure.** Define budget scope, reset authority, successor initial state, maximum operator retries, and the exact event/incident result when a retry is created after exhaustion.

### 13. MEDIUM — Reconciliation cursor and overlap semantics can disagree while both remain “stable”

**Unit A — adapter paginator.** Sorts Booqable orders by `(updated_at, external_id)` and overlaps the last timestamp bucket on resume.

**Unit B — checkpoint store.** Persists a stable opaque page cursor plus last external ID and considers a sweep complete when the provider cursor ends. It cannot reconstruct Unit A's timestamp overlap after restart or provider cursor expiry.

**Incompatibility.** AD-15 requires stable sort, overlap, lease-fenced epochs, and two stable complete sweeps, but does not bind the cursor tuple, tie-breaker, overlap boundary, restart rule, or definition of a stable complete sweep under concurrent updates. Either unit independently satisfies the words; together they can skip or endlessly repeat boundary orders, and they disagree on when the activation manifest is complete.

**Required closure.** Put pagination order, persisted cursor shape, tie-breaker, overlap window, restart behavior, and sweep-stability predicate in the operational contract and mandatory recovery fixtures.

## Cross-Finding Consequences

- Findings 1 and 2 mean “JIT required” is not yet equivalent to “the command was checked against authority fetched for this command.”
- Findings 3, 6, 7, and 8 leave activation distributed across application flags, database derivation mode, cohort policy, deployment approval, and producer-selected incident severity.
- Findings 4 and 5 leave the most important cross-module aggregate—order-bike membership—without one writer and one removal state machine.
- Findings 9 and 10 permit normalized source facts to be individually correct while their physical-work consequences diverge.
- Findings 11–13 allow recovery components to disagree about whether work is fenced, retryable, or sweep-complete.

## Gate Conclusion

The prior claim that no valid incompatible pair remains is not supportable against the updated spine. The architecture is substantially constrained, but decomposition should not treat the JIT authorization fence, activation state machine, membership ownership/removal matrix, source-to-lifecycle mapping, or lease mutation fence as ordinary story-level choices. Those are feature-altitude compatibility decisions and must be bound before independent units implement them.
