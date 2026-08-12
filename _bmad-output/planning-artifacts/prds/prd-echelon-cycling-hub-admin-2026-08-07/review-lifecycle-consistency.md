# Lifecycle Consistency Review — Workshop Tasks

## Verdict

**Not yet decision-ready for lifecycle planning.** The PRD has a coherent core model—Booqable owns rental intent, one Bike Task persists within a rental, and selectively invalidated work reuses the normal M1/M2 flow—but the lifecycle contract is incomplete at its highest-risk boundaries. In particular, it does not define a canonical-current-state rule strong enough to satisfy NFR-3, does not provide mutually exclusive rules for cancellation/removal/replacement/reactivation, and does not say which historical Bike Tasks may enter Return Check. Those gaps can produce different visible outcomes from the same Booqable state and can compromise attribution even if every individual FR is implemented literally.

**Finding count:** 3 critical · 8 high · 4 medium · 2 low

## Critical findings

### C1. The PRD promises convergence without defining the authoritative update rule

**Citations:** Vision §1; FR-1, FR-3, FR-26–FR-32, FR-39; NFR-3; Integration and Dependencies §6; Addendum “Booqable synchronization.”

NFR-3 requires the same current Booqable state to converge to the same Bike Task state “regardless of duplicate or out-of-order update delivery,” but the FRs mostly specify event reactions: “becomes reserved,” “a relevant change arrives,” and “marks an order returned.” Those phrases do not establish whether a delivered update is itself authoritative or merely a signal to evaluate Booqable’s current state. The addendum says current data should be refreshed rather than webhook fields treated as authoritative, but this is only an assumption in a technical addendum, not a product-level invariant.

This leaves critical outcomes undefined:

- a stale `reserved` update delivered after `cancelled` or `returned`;
- a repeated relevant update delivered after a mechanic has already redone the invalidated Item;
- an older setup value delivered after a newer value;
- two different event orders that end at the same Booqable state but create different Work Cycle or audit histories.

**Concise fix:** Add a normative integration rule: Booqable’s latest retrievable current order state is authoritative; update notifications only trigger reconciliation. A semantic state/configuration already accepted by Workshop Tasks is a no-op, stale updates cannot regress the accepted lifecycle/configuration, and duplicate delivery cannot create a Bike Task, Work Cycle, invalidation, assignment change, or audit event twice. Define lifecycle precedence for `reserved`, picked up/active rental, `returned`, and `cancelled`, and require history to record only accepted semantic transitions.

### C2. Cancellation, bike removal, replacement, and reactivation are not mutually exclusive

**Citations:** FR-2 and FR-3; FR-30 and FR-32; NFR-3; Discovery Source §3f.

FR-2 says replacing a bike with a different `stock_identifier` closes the former task as Replaced and creates a fresh task. FR-3 says a bike being removed makes its task read-only and that the same order and bike returning to reserved resumes prior state. A Booqable order changing from bike A to bike B is also bike A being removed, so both FRs apply. It is also unclear whether re-adding A later resumes a task already marked Replaced, whether B remains active, or whether Replaced is terminal.

Reactivation creates a second consistency risk. “Resume the prior task state” can restore Preparation Resolved even if setup values or `extra_information` changed while the task was cancelled/read-only. It can also restore an old In Prep or In Re-check assignment without saying whether that owner still owns the work.

**Concise fix:** Add one lifecycle case matrix based on the current order composition, not event arrival order. It must distinguish: whole-order cancellation; temporary removal with no replacement; replacement by a different identifier; re-addition of the same identifier; reversal of a replacement; and multiple currently associated identifiers. State whether Replaced is terminal or reversible. On any reactivation, compare current Booqable intent with the task’s last accepted intent, selectively reopen changed work, and explicitly retain or clear prior stage assignment.

### C3. The return transition can target the wrong task and has no precedence over active preparation

**Citations:** UJ-3; FR-2–FR-4; FR-32; FR-39–FR-42; Discovery Source §3d and §3f.

FR-39 sends “each associated Bike Task” to Needs Return Check. The term “associated” is not bounded to the bikes currently on the returned order, so it can include tasks retained as Cancelled, removed, or Replaced. The transition is also undefined when a currently associated bike is still Needs Prep, In Prep, Needs Re-check, or In Re-check when Booqable becomes returned. Applying FR-39 literally discards the meaning of unresolved prep; preserving the prep state conflicts with the unconditional return trigger.

The PRD also does not say what happens to an active assignee or current Work Cycle, whether a duplicate `returned` signal is a no-op, or whether a later stale `reserved` signal can pull a task out of Return Check or Done.

**Concise fix:** Define the exact return-eligible Bike Task set from Booqable’s current returned order composition. Explicitly exclude or separately handle Cancelled and Replaced historical tasks. Define the return transition from every prep/re-check stage, including what happens to unresolved work, current assignment, and the open Work Cycle. Make returned/Done non-regressible by stale reserved updates and make repeated return reconciliation idempotent.

## High findings

### H1. Selective reopening lacks a stable invalidation baseline and cumulative-change semantics

**Citations:** FR-15, FR-19, FR-26–FR-33; NFR-3; Addendum “Living Bike Task”; Discovery Source §4a.

The PRD defines a prior value, changed highlighting, and affected-Item invalidation, but not the baseline against which unresolved changes are evaluated. It therefore does not determine behavior for A → B → C before resolution, A → B → A, or a duplicate B after an Item has been redone. It also does not say whether a second relevant change during reopened Prep starts another Work Cycle or extends the current one.

There are two concrete omissions:

- Discovery Source §4a says changing built-in `extra_information` resets its required M1/M2 confirmation through the normal selective flow, while FR-19 only requires changed text and an indicator.
- FR-26 introduces a broad “Review updated bike configuration” confirmation for ambiguous changes but never defines whether it is built-in, required, M1-enabled, M2-enabled, or part of the snapshot.

**Concise fix:** Define one unresolved-change set per task against the last physically attested Booqable intent. Multiple changes update that set to the latest current intent without duplicating cycles or resets. Specify whether returning to the baseline still requires physical confirmation. State explicitly that `extra_information` changes reopen its built-in required M1/M2 Item, and define the broad ambiguous confirmation as a required built-in Item with explicit M1/M2 behavior.

### H2. Work Cycle and M1/M2 ownership are ambiguous under reassignment and reopening

**Citations:** FR-8, FR-10, FR-20, FR-25, FR-28–FR-31, FR-45–FR-46; Discovery Source §3g.

M1 and M2 are singular identities for a Work Cycle, but reassignment preserves prior Item outcomes and attribution. If mechanic A resolves some Prep Items and mechanic B is assigned and hands off, the PRD does not say whether A, B, or both count as M1 for the independence rule. FR-25 only requires M2 to differ from “M1,” so a prior Prep contributor could become M2 without an explicit override.

The cycle boundary is also absent. A change during active M1 work keeps M1; a change during active M2 work returns unassigned to Prep; a change after Preparation Resolved opens work again. The PRD never says which of these starts a new Work Cycle, closes the previous one, or replaces the displayed M1 identity.

**Concise fix:** Define when a Work Cycle starts and ends, and define M1 attribution when more than one person contributes Prep because of reassignment. State exactly which Prep actors an M2 must differ from. Require assignment to clear or transfer at each handoff/reopen/cancel/return transition, while preserving historical actors and Item-level attribution.

### H3. Several lifecycle stages have no Booqable-change transition

**Citations:** FR-27–FR-32; FR-4.

The PRD covers changes before first claim, while M1 is active, while M2 is active, and after Preparation Resolved. It does not cover a relevant change while the task is unassigned in Needs Re-check, while it is unassigned in a reopened Needs Prep state, or during Needs/In Return Check. “After customer pickup must not reopen completed preparation work” does not say whether return work refreshes, restarts, or remains unchanged.

**Concise fix:** Add a transition rule for every user-visible stage and each read-only outcome. At minimum, define relevant, ambiguous, and irrelevant update behavior in Needs Prep, In Prep, Needs Re-check, In Re-check, Preparation Resolved, Needs Return Check, In Return Check, Done, Cancelled, and Replaced.

### H4. Needs Attention is declared non-blocking but is also made a prerequisite for Done

**Citations:** Glossary §3; UJ-4; FR-38 and FR-43; FR-4; Discovery Source §3h.

FR-38 says Needs Attention must not block a mechanic from completing their own work. FR-43 says that when a flag is the only concern at the final post-check stage, manager resolution transitions the task to Done. That implies the mechanic can finish Return work but cannot produce the documented Done lifecycle transition until a manager acts. Because Needs Attention is explicitly not a lifecycle state, there is no defined state for “Return work complete, attention still open.”

**Concise fix:** Choose and state one model. Prefer separating `work completed` from `attention open`: Return completion moves the task to Done, while unresolved attention remains independently visible and resolvable. If manager resolution is intentionally required for final closure, add an explicit product concept for completed work pending attention and narrow the “non-blocking” claim to mechanic actions rather than task completion.

### H5. Checklist snapshot timing is incomplete for Prep versus Return

**Citations:** FR-11–FR-12; FR-39; FR-2–FR-5; Addendum “Task stage representation.”

FR-11 defines separate Prep and Return templates, but FR-12 says each Bike Task receives “a Checklist Snapshot” at creation. It is not clear whether both phase templates are snapshotted at task creation, whether the Return template is selected only when the order returns, or which category/version applies if the bike category is corrected before return. Reset, cancellation/reactivation, and replacement behavior are also unstated.

These choices materially change historical consistency: two identical rentals can get different Return work depending on when a manager activates a template unless the timing rule is explicit.

**Concise fix:** State separately when the Prep Snapshot and Return Snapshot are selected and frozen, which bike category determines each, and how reset/reactivation/category correction affect them. State that a replacement creates new snapshots and whether a reactivated same-bike task retains its original snapshots.

### H6. “After customer pickup” is a required boundary with no defined Booqable predicate

**Citations:** FR-32; FR-4; Integration and Dependencies §6; Discovery Source §3e and §5.

FR-32 makes pickup the boundary after which configuration changes must not reopen completed Prep, but the PRD’s Booqable mapping names reserved, cancelled, and returned only. It does not identify the authoritative Booqable condition representing pickup/active rental, or what happens if an order remains technically reserved after the physical pickup.

This ambiguity also affects bike replacement/removal during a rental and the gap between Preparation Resolved and returned.

**Concise fix:** Add the product-level lifecycle predicate that means “customer pickup has occurred,” without prescribing transport or storage. Define configuration, bike-removal, and bike-replacement behavior from that boundary until returned.

### H7. Return acknowledgement cannot literally cover “every” change recorded in a mutable Notes field

**Citations:** FR-23, FR-34, FR-37, FR-41–FR-42; Non-Goals §7.

FR-42 requires acknowledgement that “every rental-specific change described in Notes” has been addressed. Notes is one shared latest-value field with no revision history, and it also contains M2 corrections. A user can overwrite or remove an earlier rental change, and the product has no stable list of changes to acknowledge individually. Structured Modifications exist but are not connected to the return requirement.

**Concise fix:** Either make FR-42 a single explicit attestation that all changes in the **current** Notes value have been reviewed and addressed, or define the stable structured records that must each be acknowledged. Clarify whether Structured Modifications and M2 corrections are included in return completion.

### H8. The PRD does not fully partition Booqable-owned and Workshop-owned fields

**Citations:** Vision §1; FR-2, FR-15, FR-34, FR-37; Integration and Dependencies §6; Addendum “Physical-state authority.”

The PRD correctly says Booqable owns order lifecycle and rental intent and mechanics own physical attestation, but “the system is the record of Booqable intent, change history, and workshop attribution” can be read as Workshop Tasks owning a competing copy of Booqable intent. The boundary is especially unclear for bike category, order-bike membership, setup values, `extra_information`, Notes, Structured Modifications, attention, and derived task lifecycle.

**Concise fix:** Add a product-level source-of-truth list: Booqable owns order lifecycle, current order-bike membership, physical-bike identifier, rental timing, category/configuration, accessories, and `extra_information`; Workshop Tasks owns derived workshop lifecycle, assignments, Work Cycles, Item outcomes, Notes, Structured Modifications, attention, overrides, and audit. State that synchronized Booqable values are displayed snapshots and are not locally editable as Booqable intent.

## Medium findings

### M1. Valid checklist configurations can create impossible M2 work

**Citations:** FR-13, FR-17, FR-20–FR-21, FR-24.

FR-13 independently configures whether M1 performs an Item and whether M2 verifies it. FR-24 assumes an M2-enabled Value Item has an M1-entered target. An M2-enabled/M1-disabled Value Item therefore has no value to verify, and an M2-only Action Item is not an independent re-check of M1 work.

**Concise fix:** Require M2-enabled to imply M1-enabled, or define the intended behavior of M2-only Items. Apply the same validity rule to built-in confirmation Items.

### M2. Queue and one-task ownership rules are not stage-specific enough

**Citations:** FR-6–FR-10; FR-20; FR-39–FR-40.

Available Now is defined as unassigned actionable Bike Tasks, but the PRD does not explicitly say that it includes Needs Prep, Needs Re-check, and Needs Return Check or how users distinguish the required role. “Mechanics must claim one Bike Task at a time” is also ambiguous: it may mean each click claims one bike, or that a mechanic may have only one active assignment globally. Manager assignment is not said to honor the same limit.

**Concise fix:** Define which lifecycle stages appear in the default queue, what role is being claimed in each, and whether one-active-assignment-per-mechanic is a true invariant for both self-claim and manager assignment.

### M3. Attention flag cardinality and clearing rules are incomplete

**Citations:** FR-38, FR-43, FR-46; NFR-3.

The PRD distinguishes system-raised and mechanic-raised Needs Attention but does not say whether a Bike Task can have multiple open flags, whether duplicate sync mismatches deduplicate, whether a system flag clears automatically when Booqable converges, or what cancellation/replacement/reactivation does to open flags. “The flag is the only outstanding concern” assumes a cardinality model that is never stated.

**Concise fix:** Define whether attention is one aggregate flag or multiple attributable concerns; define deduplication, reopen, automatic versus manager clearing, and behavior in Done/Cancelled/Replaced/reactivated tasks.

### M4. Reset and force-close do not have defined lifecycle outcomes

**Citations:** FR-5, FR-44, FR-46; FR-4.

Manager reset must preserve history but has no specified target stage, assignment behavior, Item invalidation scope, or effect on an open Work Cycle. Force-close is distinct from attention resolution but is absent from the user-visible lifecycle and read-only outcomes, so “closed” could mean Done, Cancelled, or a separate outcome.

**Concise fix:** Define allowed source states and resulting state for reset and force-close. State which assignments/outcomes are cleared or retained, whether a reset starts a new Work Cycle, and give force-close an explicit auditable read-only outcome if it is not ordinary Done.

## Low findings

### L1. FR-25 points to the wrong override requirement

**Citation:** FR-25.

FR-25 says the manager override is defined in FR-39, but it is defined in FR-45. FR-39 is the Return Check trigger.

**Concise fix:** Change the cross-reference to FR-45.

### L2. The read-only message is false for bike removal

**Citation:** FR-3.

FR-3 applies the message “This order was cancelled in Booqable” to both order cancellation and bike removal. The message is inaccurate when the order remains reserved but one bike was removed or replaced.

**Concise fix:** Require reason-specific read-only copy for order cancellation, bike removal, and replacement.

## Recommended product-level closure order

1. Establish the canonical Booqable reconciliation and lifecycle-precedence rule (C1).
2. Approve one complete state matrix for cancellation/removal/replacement/reactivation/return (C2–C3, H3, H6).
3. Define Work Cycle, assignment, and independence semantics (H2, M2).
4. Define stable invalidation and checklist snapshot rules (H1, H5, M1).
5. Resolve attention-versus-Done and return-acknowledgement semantics (H4, H7, M3).
6. Bound manager terminal actions and correct the two mechanical inconsistencies (M4, L1–L2).
