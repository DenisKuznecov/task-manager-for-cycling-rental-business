# Adversarial Architecture Review — Workshop Tasks MVP Spine

**Reviewed:** 2026-08-18  
**Target:** `../ARCHITECTURE-SPINE.md`  
**Lens:** adversarial architecture seams  
**Inputs checked:** current PRD, PRD addendum, approved 2026-08-18 sprint-change proposal, project context, and the retained architecture memlog.

## Verdict

**CHANGES REQUIRED.** The spine is materially aligned with the compressed MVP, but it does not yet completely constrain independently built units at the source-derivation, claim-refresh, return-preemption, reassignment, and evidence-concurrency seams. The retained project context also continues to state retired enterprise contracts as unconditional project rules, so an implementer can satisfy its project instructions while violating the MVP spine.

This review intentionally tests pairs of feature units that each follow the active ADs literally. Findings are architectural only: a finding means the present text permits different observable behavior, not that every implementation will choose the unsafe branch.

## Critical findings

None found.

## High findings

### H1 — The canonical apply path and the Workshop task-creation capability have no single named owner

**Spine locations:** Design Paradigm; AD-2; AD-3; AD-5; capability map “Manager-assigned task creation and category.”

**Independent units**

- **Unit A — canonical adapter / ingestion story:** interprets “`apply_canonical_order_graph`” updating “Canonical source + Workshop state” as authority to derive the task, snapshot Prep Items, cancel/replace it, create its initial history, and flag reconfirmation inside the canonical apply transaction.
- **Unit B — Workshop task story:** interprets AD-2 and the capability map as requiring a named Workshop “Bike Task creation RPC” after canonical source state is applied. It independently queries the new canonical assignment and creates the task/history/snapshot there.

Both preserve the canonical projection, avoid raw payloads, and use database transactions. They still differ on where the task derivation runs, whether a canonical apply can complete without a Workshop mutation, and whether the task creation uniqueness/history transaction spans source application. The two implementations can race into duplicate creation, or the second can observe a source replacement/cancellation state that the first already acted upon.

**Required closure:** Name one database-owned task-derivation function and its caller. State whether `apply_canonical_order_graph` invokes that function in the same transaction, and prohibit every other source-triggered task creation/cancel/replace/reconfirm path. Bind the task uniqueness key and the exact source-apply result returned when derivation is blocked.

### H2 — A successful claim refresh can change or remove the requested task without a required typed claim outcome

**Spine locations:** AD-4, AD-5, AD-9, AD-15.

**Independent units**

- **Unit A — claim adapter:** refetches and applies, then calls the conditional claim RPC with the task ID displayed before refresh. If the task is now `Cancelled`, `Replaced`, or no longer has a valid exact assignment, the RPC returns the generic claim conflict/current state.
- **Unit B — source-apply derivation:** accepts the current source state and atomically cancels/replaces the displayed task (possibly creating a different task for a replacement StockItem) before the claim RPC begins.

AD-15 says failed refresh stops the claim, but not what happens when refresh succeeds and makes the target unclaimable, terminal, replaced, or a different Return/Prep task. AD-9 only requires a typed result for revision mismatch. A generic error, a “claimed” response for a successor, or a stale task-detail refresh are all plausible, incompatible implementations.

**Required closure:** Define an exhaustive post-refresh claim result contract: claimed target; target transitioned with its authoritative terminal/replaced state and successor reference when available; target no longer exists/is unauthorized; and refresh failed. The claim must never silently retarget to a successor, and source application plus conditional claim must use a defined re-read/lock boundary.

### H3 — Return preemption does not require clearing an in-flight Prep or Re-check assignment

**Spine locations:** AD-6; AD-8; FR-18 / FR-19 in the PRD.

**Independent units**

- **Unit A — returned-order derivation:** changes an Actionable task in `In Prep` to `Needs Return Check`, retains its M1 assignment because AD-6 explicitly mandates assignment clearing for cancellation, replacement, force-close, and Done only.
- **Unit B — queue / claim implementation:** follows FR-18’s “becomes claimable for Return Check” rule and clears that assignment so another mechanic can claim it.

The first makes Return not actually available; the second terminates an active owner’s authority. Neither behavior is selected by the spine, and the first owner can still submit an in-flight Item/reconfirmation command unless the return transition also fences it.

**Required closure:** Make Return entry one atomic transition that clears the prior assignment, advances the task revision, invalidates pending Prep/Re-check commands through the phase/revision guard, records the interrupted owner/work in history, and produces exactly one unassigned `Needs Return Check` state. State whether a manager reassignment can occur in the same transaction (normally it should not).

### H4 — Return Snapshot category selection can diverge from the task’s frozen Prep category

**Spine locations:** AD-5, AD-7, AD-13, Deferred “Relevant-change field list.”

**Independent units**

- **Unit A — Return transition:** follows FR-3 and reads the active Return template for the source bike’s *current* tag-selected category when it becomes returned.
- **Unit B — snapshot service:** treats the category captured at task creation as task identity/context and selects the Return template in that same frozen category, because AD-5 says the Prep category comes from the source assignment and AD-7 stresses snapshot immutability.

Both retain immutable snapshots. They produce different Return checklists when an assigned StockItem’s ProductGroup tags/category change between Prep creation and Return. AD-13 calls a relevant `In Prep` source change a reconfirmation case but does not say whether category is mutable, disallowed, or a replacement condition; after handoff it forbids reopening without settling Return template selection.

**Required closure:** Declare one immutable `task_category` owner and Return rule: either Return always pins the creation category, or an authoritative category change has a named task transition and history event before Return snapshot selection. Define fail-closed behavior for an unknown/conflicting current tag at return; it must not produce an arbitrary or empty template.

### H5 — Manager reassignment can bypass M2 independence and active-Prep reconfirmation ownership

**Spine locations:** AD-6, AD-8, AD-10, AD-13; FR-13, FR-15, FR-17.

**Independent units**

- **Unit A — manager intervention RPC:** reassigns any active task to the manager-selected mechanic while preserving confirmed outcomes, as FR-17 and AD-10 require.
- **Unit B — M2/reconfirmation transition RPC:** allows only the task’s M1 to reconfirm an `In Prep` change and prevents the M1 from claiming Re-check.

If a manager reassigns `In Prep`, the text does not say whether the new assignee may reconfirm or whether reconfirmation remains tied to the departed mechanic. If a manager reassigns `Needs Re-check`/`In Re-check` to the task’s M1, the claim rule might reject it but the manager capability might accept it. Both routes can claim literal compliance because no explicit reassignment postcondition revalidates M1/M2 identity, phase, and any open reconfirmation obligation.

**Required closure:** Specify manager reassignment by phase. It must reject an M2 assignment to the recorded M1; for `In Prep`, define whether reassignment preserves an already-cleared reconfirmation or opens/requires reconfirmation by the new assignee; and for all active phases, increment the task revision and record a single ownership transition. Do not let reassignment invoke a separate direct-write path.

### H6 — The task revision contract does not fence source-driven reconfirmation or Return transitions

**Spine locations:** AD-4, AD-6, AD-9, AD-13, Consistency Conventions “Time and revisions.”

**Independent units**

- **Unit A — canonical apply:** flags a relevant source change and records current context/reconfirmation state but regards this as integration state, so it does not increment `workshop_bike_task.revision`.
- **Unit B — M1 handoff client/RPC:** sends the displayed task revision and may hand off while the source apply occurs because its expected revision still matches; it only checks a reconfirmation flag as previously loaded.

The same problem occurs when a source apply makes Return Check the only work. AD-9 says accepted “task state-changing commands” increment a revision, but never classifies source application’s changes to phase, actionability, context, or reconfirmation as a revisioned task mutation. A stale command can therefore be accepted after a source transition, or two units may choose different stale-result behavior.

**Required closure:** State that any canonical apply changing task actionability, Work Phase, source context relevant to handoff, reconfirmation flag, or Return eligibility increments the same task workflow revision atomically with its history event. All task commands must lock/re-read those fields after their expected-revision check; mismatch returns a stable `stale_source_state`/authoritative-state result.

### H7 — Retained project context still imposes retired enterprise scope as active implementation rules

**Locations:** `project-context.md` “Critical Don't-Miss Rules” Booqable source envelope/canonical projection/refresh model; retained architecture memlog entries 81–145; Spine AD-5, AD-14, AD-16, AD-19.

The project context says the canonical projection identity is `(order_external_id, line_external_id, source_unit_discriminator, replacement_chain_incarnation)`, requires immutable membership/predecessor links, describes broad `review_updated_configuration`, and retains a v1 refresh model around reconciliation concepts. The retained memlog includes activation epochs, enrollment cohorts, JIT proofs, correction successors, workers, reconciliation, and manual retry/repair contracts. The MVP spine expressly forbids replacement chains, source identity platforms, Work Cycles, retry/reconciliation, repair APIs, rollout control, and enterprise recovery.

An implementation unit that obeys the project-context “always follow” rule can add an incident, membership incarnation, durable operation, repair capability, or migration prerequisite that AD-19 prohibits. Conversely, an MVP implementation can be rejected for not preserving the older contract. The addendum’s source-of-truth statement does not itself mark these project rules as superseded.

**Required closure:** Update or add an explicit, project-context-visible supersession block. It must identify the exact obsolete Booqable/Workshop scope rules and memlog decisions that are no longer binding for this MVP, preserve only the frozen canonical adapter/projection and brownfield-consumer constraints, and prohibit importing their old activation, retry, identity, correction, and rollout requirements into Workshop stories.

## Medium findings

### M1 — Reconfirmation has no durable source-context version or acknowledgement target

**Spine locations:** AD-13, AD-18; FR-15.

AD-13 says a relevant applied source change during `In Prep` sets a reconfirmation flag; M1 explicitly acknowledges it, and a later ordinary Item save may occur before or after that acknowledgement. It does not name the source-context revision/fingerprint that was acknowledged. Two sequential source applies can therefore be collapsed by a Boolean flag: a stale “reconfirm” request can clear a newer change, or implementations can invent incompatible timestamp/fingerprint checks.

**Required closure:** Store a monotonic task-context/reconfirmation generation (or canonical source watermark) and require reconfirmation to acknowledge the displayed generation. A newer apply must advance it; stale acknowledgements return the latest context and leave the newer obligation open. Record both the acknowledged generation and the current context summary in history.

### M2 — M1 and M2 evidence concurrency is underspecified for Item revisions and handoff completion

**Spine locations:** AD-7, AD-9; FR-12 through FR-14.

AD-9 allows Item values to have “their own expected revision where needed,” but no rule defines separate M1 outcome versus M2 attestation records/revisions, whether M1 can edit an M2-enabled Item after handoff (it should not), or how M2 completion compares the frozen M1 value/attestation state. A task-level revision-only implementation serializes every Item save unnecessarily; a loose implementation can accept an M1 edit concurrent with M2 verification and leave M2 attesting a different value.

**Required closure:** Define role-scoped immutable confirmed evidence for each snapshot Item, per-evidence CAS revisions, and phase guards. After successful handoff, M1 Prep evidence is immutable for MVP; M2 verifies the referenced M1 evidence revision/value and fails stale if it changes. The handoff and M2-complete RPCs must lock/re-read all required evidence rather than trust client progress.

### M3 — Attention state has no terminal/source-transition disposition contract

**Spine locations:** AD-6, AD-8, AD-10, AD-18.

Attention is non-blocking and records “current owner context,” but the spine does not say what happens to an open record when the task is Cancelled, Replaced, Force-closed, moves to Return, or is reassigned. One manager-list unit can retain it as unresolved against the old owner; another can auto-resolve it on any terminal transition; another can duplicate a new attention record because the owner changed. All preserve history but produce incompatible operational queues.

**Required closure:** Define an attention lifecycle independent of mechanical outcome: stable open identity, owner/context snapshot rules, terminal disposition (for example, remains open until an attributable manager resolution unless a system resolution reason is explicitly recorded), and whether reassignment updates only current context or creates a new record. Manager Attention read models must use that rule.

### M4 — History has stable names but lacks required causality and source facts for overlapping transitions

**Spine locations:** AD-8, AD-18.

The spine requires a stable snake-case event vocabulary with actor/system source, occurrence time, result, and event-specific facts, but does not require a task revision/resulting phase/outcome or deterministic per-task order in each event. Concurrent claim/source-apply/reassignment/return transactions can therefore yield display histories that disagree about which state each event produced, even while all events are append-only and attributed.

**Required closure:** Define the minimum immutable event envelope: task ID, resulting task revision, transaction-local/per-task sequence, actor XOR system source, event type, occurrence time, resulting outcome/phase/owner where changed, and a versioned payload schema with a display fallback. Require every mutation and source derivation to insert it in the same transaction.

### M5 — RLS/write wording does not distinguish user capability RPCs from the service ingestion path that derives Workshop state

**Spine locations:** AD-3, AD-8, AD-11, Consistency Conventions “Security.”

AD-11 says Workshop data is “mutated only through narrowly granted capability RPCs,” while the design diagram says canonical apply writes “Canonical source + Workshop state” and service-role credentials are limited to backend ingestion. One unit can give the adapter service role direct Workshop table DML to fulfill source derivation; another can create a service-only derivation RPC; a third can expose that RPC to authenticated callers to avoid a second route. The security and audit boundary then differs despite all units respecting RLS for browser reads.

**Required closure:** Define two disjoint write paths: authenticated user capability RPCs for workshop commands, and one non-browser, service-only canonical ingestion/apply RPC which alone may invoke an internal Workshop derivation function. Revoke direct Workshop base-table DML from browser/API roles, prohibit clients from invoking ingestion, and require source-driven history to use a system source rather than impersonating a staff actor.

### M6 — The “no repair/retry” boundary is not reconciled with deterministic visible recovery from refresh failure

**Spine locations:** AD-4, AD-14, AD-19; FR-21 and NFR-3.

AD-4 correctly rejects workers, queues, sweeps, and manual repair APIs. It requires failed claim refresh to be visibly reported, but does not say whether the mechanic may explicitly retry the same claim/action, how duplicate webhook signals are handled after a transient fetch failure, or whether an operator can only wait for a later Booqable signal. Units can therefore respectively add a forbidden per-order retry endpoint, silently repeat fetch in a server action, or leave an Actionable task indefinitely unclaimable despite the confirmed-save/error requirement.

**Required closure:** Permit only user-initiated resubmission of the original claim command (a fresh fetch-and-apply attempt, no durable job or bypass) and webhook delivery’s next independent signal. Define stable transient/terminal refresh result codes and UI behavior. Explicitly prohibit hidden server-action retry loops and direct source/task repair; direct staff retries must not mutate without refetching.

### M7 — “Current task context” has no ownership rule when a replacement or cancellation arrives mid-read

**Spine locations:** AD-5, AD-12, AD-18.

Task detail must show a task-scoped current context and current state. A loader that joins current canonical assignment rows can show replacement-bike/order fields on the original `Replaced` task; a loader that snapshots all context on task creation can show stale rental context during active Prep. Both obey the one minimum vocabulary, field minimization, and local-read requirements.

**Required closure:** Separate immutable task identity/context-at-event data from current source context. State that an open task detail reads only source context still associated with its exact StockItem/task association, while terminal/replaced/cancelled views render the last associated context plus a terminal/replacement fact. The source derivation must atomically establish that association before changing task outcome.

## Positive controls retained

- The compressed Task Outcome / Work Phase vocabulary removes the retired Work Cycle, reset, and same-mechanic override paths.
- The signal-only webhook plus fetch-and-apply rule correctly prevents webhook payloads becoming source truth.
- Immutable Prep/Return snapshots, separate M2 attestation, task-scoped RLS reads, and atomic history are appropriate MVP constraints.
- AD-19 correctly blocks reintroduction of rollout cohorts, background reconciliation, correction successors, and paper-retirement automation. The remaining risk is that older active project-context rules can reintroduce them unless they are explicitly superseded.

