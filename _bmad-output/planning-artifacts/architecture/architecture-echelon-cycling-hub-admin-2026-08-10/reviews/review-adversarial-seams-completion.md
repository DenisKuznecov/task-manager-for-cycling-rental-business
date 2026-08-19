# Completion Adversarial Architecture Review — Workshop Tasks MVP Spine

**Reviewed:** 2026-08-18
**Target:** `../ARCHITECTURE-SPINE.md`
**Lens:** adversarial seams — independently compliant units that can still produce different observable behavior
**Scope:** canonical derivation; duplicate, removed, and reappearing assignments; cancellation/replacement/Return precedence; templates; M1/M2; attention; Notes; manager interventions; RLS; online-only operation; and history. The separately flagged `project-context.md` source-alignment work is intentionally excluded.

## Verdict

**REVISE BEFORE STORY DECOMPOSITION.** The spine closes the material seams identified in the preceding review: source derivation has one owner and atomic outcome, assignment removal/reappearance and duplicate association fail closed, claims have an exhaustive post-refresh result, Return preempts active work atomically, active-Prep reconfirmation is generation- and revision-fenced, attention has open-record CAS behavior, and Notes/attention authorization are explicit.

Three remaining high-impact seams can still yield incompatible implementations. Most importantly, the model has no non-claimable state for successfully completed Prep while the rental has not returned. The remaining findings are narrower closure items; none requires reintroducing retired replacement-chain, reconciliation, activation, retry-worker, or offline scope.

## Critical findings

None.

## High findings

### H1 — Completed Prep has no non-claimable pre-return state

**Location:** AD-6, AD-7, AD-12; PRD FR-7, FR-12, and FR-18.

**Trigger condition:** Prep is handed off with no M2 Items, or M2 finishes successfully, before Booqable marks the rental returned.

**Compliant divergence:** FR-12 says the Bike Task then “waits for Return Check when the rental returns.” AD-6 simultaneously requires every `Actionable` task to have exactly one listed Work Phase, and the only remaining unassigned phase is `Needs Return Check`. AD-12/FR-7 make that phase Available Now/claimable, while FR-18 makes Return claimable only on return. One implementation will make the bike claimable for Return immediately; another will invent an unlisted waiting phase or keep it assigned/hidden.

**Required closure:** Add an explicit non-claimable actionable phase such as `Awaiting Return`, or define a distinct non-actionable completed-Prep outcome that becomes `Needs Return Check` only in the Return source transition. State its queue/My Work visibility, manager-intervention eligibility, owner state, task-revision behavior, and history event.

**Potential consequence:** A mechanic can perform a Return checklist before the bike leaves, or independently built queue and task-detail units disagree about whether the task is available.

### H2 — Prep and Re-check Item writes lack a phase-and-owner authorization contract

**Location:** AD-7, AD-9, AD-11; capability map “M1 preparation and handoff” and “Independent M2.”

**Trigger condition:** An authenticated mechanic calls an Item-outcome or attestation capability for a task they do not currently own, or submits an M1 write after Return preemption/reassignment.

**Compliant divergence:** AD-11 requires authenticated capability RPCs and role derivation, while AD-7 identifies M1/M2 behavior but does not state the database authorization predicate for each write. One implementation can permit any `mechanic` role to save an Item; another restricts M1 evidence to the current `In Prep` owner and M2 attestation to the current `In Re-check` owner who differs from recorded M1. Both can use `withAuth`, RLS-protected reads, and history.

**Required closure:** Publish a per-command capability matrix. In the same conditional mutation that checks the evidence/task revision, require: current owner + `In Prep` for Prep/reconfirmation/handoff; current owner + `In Re-check` + actor distinct from immutable M1 for M2 attestation/completion; current owner + `In Return Check` for Return outcomes/completion; and explicit Admin/Manager exceptions, if any. Reject terminal, unassigned, and phase-mismatched writes.

**Potential consequence:** A different mechanic can alter checklist evidence or finish work they never claimed, undermining both the one-owner workflow and trustworthy M1/M2 history.

### H3 — Source cancellation/replacement can overwrite a manager’s Force-closed terminal outcome

**Location:** AD-5, AD-6, AD-8, AD-10; PRD FR-6 and FR-17.

**Trigger condition:** A manager force-closes an assigned task and a later accepted source graph reports cancellation, assignment removal, or a different exact StockItem.

**Compliant divergence:** AD-5 directs source derivation to mark a current task `Cancelled` or `Replaced`; AD-6 only gives `Force-closed` precedence over Return. One implementation preserves the manager’s `Force-closed` outcome and optionally creates a new task for a genuinely new assignment. Another rewrites the original terminal outcome to `Cancelled`/`Replaced` and emits a contradictory source event. Both preserve immutable history and clear assignment.

**Required closure:** Define terminal-outcome precedence separately from Return precedence. In particular, state whether source cancellation/removal/replacement may ever change a `Force-closed` outcome, and whether a new exact assignment after force-close produces a fresh task without rewriting the original. Require the chosen source fact and resulting task state in the same history event.

**Potential consequence:** A manager intervention can disappear from current state, task history can claim two incompatible terminal outcomes, and source-derived successor work differs between implementations.

## Remaining findings

1. **Cancellation and replacement do not have an ordering rule when both facts exist in one accepted graph.**
   - **Location:** AD-5 and AD-6.
   - **Trigger condition:** A Booqable order is cancelled while retained source associations still show a changed/replacement StockItem.
   - **Guard:** State whether order cancellation always wins over assignment replacement, whether it suppresses successor creation, and the single event/revision sequence.
   - **Consequence:** One derivation can create a fresh replacement task for a cancelled rental while another leaves only the cancelled original.

2. **A changed-invalid category on an existing task is not fully classified outside Return.**
   - **Location:** AD-5, AD-7, AD-13.
   - **Trigger condition:** The current source graph for an existing task becomes untagged, unknown, multiple, or conflicting while the task is `Needs Prep`, `Needs Re-check`, or `In Re-check`.
   - **Guard:** Define whether the accepted canonical apply rolls back, preserves the last valid task context while recording an unavailable-source state, or makes a named terminal/source transition. The rule must preserve the “active Prep only” reconfirmation boundary and prohibit a changed category from silently changing a frozen Prep Snapshot.
   - **Consequence:** Task detail, queue eligibility, and Return template selection can diverge after a source classification becomes invalid.

3. **The direct successor reference promised by claim results is not reconciled with the no-replacement-chain boundary.**
   - **Location:** AD-5, AD-9, AD-19.
   - **Trigger condition:** Claim refresh replaces the displayed StockItem and AD-9 returns “successor reference when available.”
   - **Guard:** Define the minimal, one-hop stored/referenceable relation needed to return that result, its history representation, and its deletion/visibility rules; explicitly distinguish it from prohibited replacement-chain algebra.
   - **Consequence:** One implementation returns a usable replacement task reference, while another can only return a generic terminal state because it correctly avoided creating a chain model.

4. **Accepted user mutations are not explicitly required to advance the task workflow revision.**
   - **Location:** AD-8, AD-9, Consistency Conventions “Time and revisions.”
   - **Trigger condition:** A claim, handoff, reassignment, force-close, or completion succeeds while another client holds the prior displayed task revision.
   - **Guard:** State that every accepted mutation changing owner, phase, outcome, Return eligibility, or reconfirmation obligation atomically increments the task revision and writes its corresponding history event; Item/Note evidence retains its stated scoped revision behavior.
   - **Consequence:** A conditional command can accept against an unchanged task revision after an owner/phase transition, producing inconsistent stale-screen behavior.

5. **Initial task creation is not explicitly included in the required task-history event set.**
   - **Location:** AD-5 and AD-8.
   - **Trigger condition:** An exact StockItem first produces a Bike Task through canonical derivation.
   - **Guard:** Require a system-attributed `task_created_from_assignment` (or equivalent stable) event containing the source rental/order, opaque StockItem identity, initial category/template-version references, resulting phase/outcome, and task revision.
   - **Consequence:** A task can have immutable later history but no auditable explanation of why it exists or which source/template facts governed its initial snapshot.

6. **Template-administration authorization is implicit rather than capability-specific.**
   - **Location:** AD-7 and AD-11; PRD FR-1 and FR-2.
   - **Trigger condition:** A mechanic invokes a template create, edit, activate, supersede, or reactivate endpoint/RPC.
   - **Guard:** Add template management to the authorization matrix as Admin/Manager only; require immutable version creation/activation to occur transactionally and reject mechanic/partner callers.
   - **Consequence:** A generic authenticated Workshop capability implementation can allow a mechanic to alter future checklist standards, despite role-gated UI controls.

7. **Notes’ independent revision needs a task-state guard in the same mutation.**
   - **Location:** AD-9 and AD-10.
   - **Trigger condition:** A Notes save issued by the current assignee races with cancellation, replacement, Return preemption, reassignment, or force-close.
   - **Guard:** Require the Notes update to CAS on its Notes revision while lock/re-reading the task’s current actionable phase and owner authorization in the same database mutation; return authoritative Notes/task state when either guard fails.
   - **Consequence:** A stale Notes request can succeed after the author has lost eligibility, or different implementations will reject/accept the same in-flight edit.

## Confirmed controls

- A single service-only derivation function runs during accepted canonical application; missing templates, ambiguous assignment, and duplicate StockItem association fail atomically rather than creating empty work.
- Cancellation/removal, changed StockItems, and reappearing former StockItems have explicit simple-MVP behavior; duplicate exact assignments fail closed.
- Return clears interrupted Prep/Re-check ownership, increments task revision, records interruption, and cannot create a snapshot for `Cancelled`, `Replaced`, or `Force-closed` work.
- Prep M1 identity is fixed by the accepted handoff, M2 evidence is distinct and revisioned, and manager reassignment cannot assign Re-check to recorded M1.
- Attention has one-open-record semantics, expected revisions, actor/role guards, and a manager-resolution-only terminal disposition.
- Workshop reads are task-scoped, source projection tables are service-only, mutations are online-only capabilities, and history has attributed, ordered, revisioned events.

## Excluded external alignment

`_bmad-output/project-context.md` still contains pre-MVP canonical-source rules that the spine identifies as superseded for this release. That separately authorized source-alignment task remains out of scope for this completion review and is not counted as a finding against `ARCHITECTURE-SPINE.md`.

## Recommended path

Resolve H1 through H3 before decomposing stories. Then add the seven compact guards above to the existing AD-5 through AD-11 contracts and derive database tests directly from their trigger conditions. Do not restore retired enterprise lifecycle or recovery infrastructure.
