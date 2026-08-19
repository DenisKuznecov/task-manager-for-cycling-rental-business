# Final Completion Adversarial Seam Review — Workshop Tasks MVP Spine

**Reviewed:** 2026-08-18  
**Target:** `../ARCHITECTURE-SPINE.md`  
**Inputs:** current `prd.md`, `addendum.md`, approved sprint-change proposal, prior completion review  
**Lens:** adversarial seams — independently compliant units that can still produce different observable behavior  
**Scope:** the newly completed rules for `Awaiting Return`, source-terminal precedence and invalid tags, task command authorization, manager/Notes/attention behavior, creation/revision/history, and simple replacement without chains.

## Verdict

**REVISE BEFORE STORY DECOMPOSITION.** The spine resolves the prior completed-Prep gap with the explicitly approved non-claimable `Awaiting Return` phase. That phase is correctly excluded from defects here; its separately noted PRD glossary/FR-12 text update is a source-maintenance follow-up, not a spine defect.

The completed rules also now close the earlier source-derivation, M1 identity, Item-command authorization, Notes CAS, creation-history, and no-chain ambiguities. Four high seams remain. They concern invalid category tags that accompany a terminal source fact, preservation of `Done`, M1 claiming Re-check, and attention's promised current-owner context after assignment-clearing transitions. The remaining observations are compact guards for story/database-test decomposition; none requires replacement chains, correction successors, retry/reconciliation infrastructure, or another lifecycle model.

## Critical findings

None.

## High findings

### H1 — Invalid category tags can suppress an otherwise winning cancellation or assignment-removal transition

**Location:** AD-5, AD-6, AD-13.  
**Trigger condition:** A refresh reports an order cancellation, or removes the exact assignment, while the same source graph is untagged, has multiple/unknown/conflicting category tags, or a Bundle/ProductGroup disagreement.  
**Compliant divergence:** AD-5 says order cancellation wins over assignment changes and assignment removal cancels the current task. AD-13 says an invalid tag on an existing task returns a typed failure, preserves the last accepted context, and makes no queue/lifecycle mutation. One derivation validates tags first and leaves a previously actionable task unchanged; another applies the terminal source fact first and rejects only category-dependent derivation.  
**Required closure:** Publish a precedence rule for terminal source facts versus classification failure. At minimum, say whether cancellation and exact-assignment removal are applied without category validation, and distinguish them from Return, which cannot create a category-dependent snapshot when the category is invalid. Bind the chosen disposition to one history event/revision result.  
**Potential consequence:** An unassigned or cancelled bike can remain claimable merely because its concurrently refreshed tags were malformed.

### H2 — Source transitions can overwrite `Done`

**Location:** AD-5 and AD-6.  
**Trigger condition:** A completed Return task later receives a canonical graph that is cancelled, removes its exact assignment, or substitutes a different exact StockItem.  
**Compliant divergence:** AD-5 protects `Force-closed` from cancellation/removal/replacement but does not protect `Done`; its ordinary wording can therefore change the current task to `Cancelled` or `Replaced`. Another implementation treats all completed terminal outcomes as immutable and records the source fact without changing `Done`.  
**Required closure:** State explicit source-transition precedence for `Done`: whether source cancellation/removal/replacement preserves `Done`, or may replace it, and require the resulting source fact and task disposition in the same immutable event.  
**Potential consequence:** A successfully returned and completed bike can lose its durable completion outcome, with contradictory terminal history across implementations.

### H3 — Recorded M1 can claim a Re-check task even though they cannot complete it

**Location:** AD-7, AD-9, AD-11; PRD FR-8 and FR-13.  
**Trigger condition:** The mechanic recorded as M1 submits the ordinary claim command while the task is unassigned `Needs Re-check`.  
**Compliant divergence:** AD-11 forbids that actor from M2 outcome/completion, but its claim rule only requires the normal conditional mutation. One implementation admits M1's claim, moving the task to `In Re-check` where M1 cannot attest; another rejects the claim under the M1/M2 separation rule.  
**Required closure:** Add M2-distinctness to the `Needs Re-check` claim predicate itself, and return the authoritative unavailable/unauthorized claim result without changing owner or phase. Test it under simultaneous M1/M2 claims.  
**Potential consequence:** M1 can strand the task in an assigned Re-check phase that no authorized M2 can claim, defeating independent sign-off.

### H4 — Open attention's “current owner context” can become stale when ownership is cleared outside reassignment

**Location:** AD-6, AD-10, AD-18.  
**Trigger condition:** A task with open attention is returned while Prep/Re-check is assigned, or is cancelled, replaced, force-closed, or completed. Each transition clears task assignment.  
**Compliant divergence:** AD-10 requires open attention to retain current-owner context and explicitly updates it on reassignment, while it only says the record remains open through Return and terminal outcomes. One implementation clears/updates the attention owner context in the same transition; another leaves the prior mechanic displayed until a manager resolves it.  
**Required closure:** Require every assignment-clearing transition to atomically update open attention records to the resulting owner context (normally `null`) while retaining the historical owner in its existing task/history event. Specify that this bookkeeping does not create a duplicate open occurrence.  
**Potential consequence:** The Manager Attention List can present a former mechanic as the current owner of a task that is unassigned or terminal, leading to incorrect intervention.

## Remaining findings

1. **Creation from a source graph already marked returned has no explicit snapshot/phase ordering.**
   - **Location:** AD-5, AD-6, AD-7, AD-8.
   - **Trigger condition:** An exact assigned StockItem is first admitted by a current-order refresh whose rental is already returned.
   - **Guard:** Define whether creation atomically copies both required snapshots and lands directly in unassigned `Needs Return Check`, or whether such a graph produces a typed non-creation result. Require the creation and Return events/revisions to be unambiguous if both occur in one source transaction.
   - **Consequence:** One implementation can expose Prep work for an already returned bike while another exposes only Return work.

2. **The eligible assignee role for claims and manager reassignment is not explicit.**
   - **Location:** AD-10 and AD-11.
   - **Trigger condition:** An Admin/Manager claims a task, or a manager reassigns active work to an Admin/Manager rather than a mechanic.
   - **Guard:** State whether executable task ownership is mechanic-only or whether specified manager/admin operational exceptions are intended; enforce the same rule in claim and reassignment predicates.
   - **Consequence:** Implementations can either allow managers to become M1/M2/Return actors or reject a manager workflow the product team expected to use.

3. **“Attention update” has no defined mutable surface or actor rule.**
   - **Location:** AD-10.
   - **Trigger condition:** A caller invokes the named attention update operation after an open record exists.
   - **Guard:** Enumerate which fields are mutable (for example, no reason mutation because it forms the open-record key), who may update them, and whether owner-context updates are system-only side effects.
   - **Consequence:** A generic update endpoint can let a mechanic rewrite the manager-facing exception reason or create behavior inconsistent with one-open-record identity.

4. **The history event for an invalid-source failure is not specified.**
   - **Location:** AD-8 and AD-13.
   - **Trigger condition:** Invalid category tags are encountered for an existing task and the task state is intentionally preserved.
   - **Guard:** State whether the typed source failure writes a system-attributed immutable history event (and whether repeated identical failures are deduplicated), or is only logged outside task history.
   - **Consequence:** Staff cannot consistently determine why current source context was withheld, while an implementation that logs every retry can flood task history.

5. **A source transition that creates a fresh replacement task does not state attention disposition on the prior task.**
   - **Location:** AD-5 and AD-10.
   - **Trigger condition:** An actionable task with unresolved attention is replaced by a different exact StockItem.
   - **Guard:** State whether the prior task's open attention remains only on that terminal task, whether the new task starts clean, and prohibit implicit copying unless a later product rule authorizes it.
   - **Consequence:** One implementation carries an exception about bike A onto bike B; another loses the exception from the manager's current operational view.

6. **The visible history contract does not state how interrupted Prep/Re-check evidence is labelled after Return preemption.**
   - **Location:** AD-6, AD-7, AD-8, AD-18.
   - **Trigger condition:** A returned refresh interrupts assigned `In Prep` or `In Re-check` work with unresolved or confirmed Items.
   - **Guard:** Require the Return transition event to name the interrupted phase and owner, and require the history read model to render retained Prep/M2 evidence as interrupted rather than Return evidence.
   - **Consequence:** A history UI can make incomplete Prep/Re-check work appear to have completed as part of Return.

7. **The reassignment reason's history placement is not defined when it also changes attention owner context.**
   - **Location:** AD-8 and AD-10.
   - **Trigger condition:** A manager reassigns an active task with one or more open attention records.
   - **Guard:** Define whether one reassignment event contains the manager reason and resulting owner plus the attention-context update, or whether there is a separate system event; preserve one task revision for the atomic transition.
   - **Consequence:** Audit timelines can differ in event count/order for the same manager action, complicating attribution and tests.

8. **`Awaiting Return` manager force-close is explicit, but its abandoned-work criterion is not.**
   - **Location:** AD-6 and AD-10.
   - **Trigger condition:** A manager force-closes a task that finished Prep and has waited for a rental return, rather than an actively abandoned mechanic assignment.
   - **Guard:** State whether any `Awaiting Return` task is force-close eligible with the existing reason requirement, or add a specific age/source condition if that is intended.
   - **Consequence:** Managers and implementations can disagree over whether a non-claimable wait state may be terminally closed.

9. **The task-detail read contract does not say how `Awaiting Return` is represented to a manager.**
   - **Location:** AD-6, AD-12, AD-18.
   - **Trigger condition:** A manager opens a completed-Prep task before return.
   - **Guard:** Name the task-detail presentation contract: phase/state is visible, it is absent from Available Now and My Work, and the permitted manager controls remain attention/force-close only.
   - **Consequence:** A queue implementation can correctly hide the task while a detail implementation mistakenly offers a claim or reassignment control.

10. **The no-chain rule lacks a direct testable boundary for replacement task navigation.**
   - **Location:** AD-5, AD-9, AD-19.
   - **Trigger condition:** A claimant refreshes the displayed task and its exact StockItem has been replaced.
   - **Guard:** State that the claim result contains only the displayed task's terminal/replaced state and never a successor task ID or traversal link; the new independently keyed task is discovered through normal queue reads.
   - **Consequence:** A convenience response can silently introduce a one-hop replacement relation that later becomes an unapproved chain API.

## Confirmed controls

- `Awaiting Return` provides the approved non-claimable state after Prep resolves; it is excluded from this review's defect count.
- Exact assignment removal, reappearance, duplicate association, missing templates, and required derivation failure have explicit fail-closed/atomic handling.
- Cancellation wins assignment changes; `Cancelled`, `Replaced`, and `Force-closed` beat Return; `Force-closed` is protected from later source cancellation/removal/replacement.
- Prep, M2, and Return Item/transition writes have owner, phase, and M1/M2 identity predicates; Notes retain independent CAS plus task-state authorization.
- Task creation and all stated workflow mutations write ordered, attributed history with task revisions, without adding replacement chains.
- Attention has one-open-record identity, CAS behavior, restricted reasons, and manager-only resolution; `Awaiting Return` remains manager-operable without becoming claimable.

## Recommended path

Resolve H1 through H4 before story decomposition. Add the ten compact guards as acceptance tests where they remain product-relevant, starting with source terminal/category precedence, `Done` terminal precedence, the Re-check claim predicate, and attention owner-context clearing. Keep the approved `Awaiting Return` PRD wording update separate from any spine defect decision, and preserve the simple no-chain MVP boundary.
