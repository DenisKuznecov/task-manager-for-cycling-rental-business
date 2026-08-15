---
title: Workshop Tasks
status: final
created: 2026-08-07
updated: 2026-08-12
---

# PRD: Workshop Tasks

## 0. Document Purpose

This PRD defines the first release of Workshop Tasks for product, UX, architecture, and implementation planning. It uses Glossary terminology, groups capabilities into features with stable FR IDs, and keeps product behavior separate from technical implementation. It reflects the completed per-bike workshop-task brainstorming session and the decisions from this PRD session. Technical assumptions and rejected models are in `addendum.md`.

## 1. Vision

Workshop Tasks digitizes the mechanics' paper workflow so every bike's preparation, independent selective re-check, rental-specific changes, and return inspection are visible and attributable. It is a responsive web feature inside the existing admin hub, suitable for workshop tablets and phones as well as desktop management screens.

The product's outcome is bike quality, not checklist completion. A mechanic must be able to see available work, claim one bike, perform every required action, hand it to another mechanic for applicable independent checks, resolve the preparation, and move to the next bike without using a paper checklist.

Booqable remains the authority for the rental order lifecycle. Workshop Tasks translates Booqable's current rental intent into actionable physical-bike work and keeps that work synchronized when the order changes.

The system is the record of synchronized Booqable intent, change history, and workshop attribution. Mechanics remain the authority on whether the physical bike actually matches the required state; a digital outcome records their attestation rather than independently proving bike condition.

## 2. Target Users and Jobs

### 2.1 Users

- **Preparation Mechanic (M1):** Claims one Bike Task, prepares the bike, completes required Prep Items, records relevant changes, and hands the work to independent verification.
- **Re-check Mechanic (M2):** Independently verifies applicable Re-check Items and records any correction made to the bike.
- **Return-check Mechanic:** Completes the category-specific Return Checklist and acknowledges every Structured Modification from the same rental.
- **Admin / Manager:** Manages Checklist Templates, assigns or reassigns work, handles Needs Attention flags, and uses explicit overrides when normal work cannot proceed.
- **Booqable:** An external system actor and the authority for orders, bikes, rental timing, configuration, and lifecycle state.

### 2.2 Jobs To Be Done

- When bikes require preparation, mechanics need to find and claim the next actionable bike without searching through orders or asking a manager.
- While working at the bike, M1 needs a fast, clear checklist containing the current rental configuration so the tablet supports rather than distracts from physical work.
- Before a bike is considered prepared, M2 needs to make an independent attestation on the configured subset of checks.
- When Booqable changes the required bike configuration, mechanics need the affected work to become actionable again without restarting unrelated work.
- After return, a mechanic needs durable records of rental-specific physical changes and a suitable Return Checklist so temporary changes can be reversed.
- Managers need trustworthy attribution and intervention controls without becoming a required gate in the normal flow.

### 2.3 Core Operational Flows

- **UJ-1 — Prepare and verify one bike:** M1 opens Available Now, claims a Bike Task, completes all required Prep Items, records rental-specific changes as Structured Modifications when needed, and hands off. If Re-check Items apply, M2 claims the verification, independently resolves them, and completes Preparation. The next actionable Bike Task is immediately available.
- **UJ-2 — Absorb a Booqable configuration change:** While M1 is preparing a claimed bike, a workshop-relevant Booqable update changes the required physical configuration. The same Bike Task stays assigned to M1 and opens the broad configuration-review requirement by default. If Epic 6 later proves a complete Setup Category mapping from stable source identifiers and fixtures, only the affected Items invalidate. Prep and any applicable Re-check remain the path to completion.
- **UJ-3 — Check a returned bike:** When Booqable marks the order returned, the Return Checklist becomes actionable for each currently associated bike. The return-check mechanic reviews Notes and Structured Modifications, performs category-specific checks, acknowledges each Structured Modification, and completes the Bike Task.
- **UJ-4 — Handle an exception:** A mechanic raises Needs Attention without blocking their own work. For a same-mechanic Re-check exception, M1 raises a request and a manager explicitly Approves or Declines it. A manager also finds and resolves other open flags in the Manager Attention List, reassigns work, resets stale work, or force-closes a genuinely abandoned Bike Task.

## 3. Glossary

- **Bike Task** — The persistent workshop record for one physical bike within one rental order. Stable physical identity uses Booqable's opaque StockItem external ID; the human-readable `stock_identifier` is display and workshop-confirmation data. A quantity-one bike line may provisionally lack both values and later attach them without recreating the task; a multi-quantity line produces Bike Tasks only for exact distinct StockItem assignments.
- **Waiting for Bike ID** — A visible non-claimable Bike Task state used until a quantity-one provisional task has an exact StockItem assignment and Booqable provides its human-readable `stock_identifier`.
- **Integration Incident** — A deduplicated operational record of Booqable source uncertainty or an unsafe mapping. It is visible for resolution but is not claimable workshop work and must not fabricate a Bike Task.
- **Work Cycle** — One Prep pass plus any applicable independent Re-check caused by initial preparation or selectively reopened work.
- **M1** — The Preparation Mechanic for the current Work Cycle. When multiple mechanics contribute Prep through reassignment, the current assignee who hands off is M1 for independence purposes.
- **M2** — The independent Re-check Mechanic for the current Work Cycle.
- **Prep Item** — An Action Item or Value Item completed by M1.
- **Re-check Item** — An Item configured for independent M2 verification; M2-enabled requires M1-enabled.
- **Return Item** — An Item in a category-specific Return Checklist.
- **Action Item** — An Item resolved as Done or N/A.
- **Value Item** — An Item resolved by entering a value; it has no N/A outcome.
- **Checklist Template** — An admin-authored, versioned definition for a bike category and phase.
- **Prep Snapshot** — The immutable Prep Checklist Template version copied into a Bike Task when the task is created.
- **Return Snapshot** — The immutable Return Checklist Template version selected when the Bike Task enters Needs Return Check.
- **Setup Category** — A bounded Booqable configuration group used for context and grouping, and by Epic 6 for selective invalidation only after a complete source-backed mapping is proven. The initial set is Pedals, Saddle, Wheelset, Power meter, and Computer mount.
- **Available Now** — The default queue of unassigned, claimable Bike Tasks ordered by rental start date.
- **My Work** — The mechanic's currently assigned Bike Tasks so work can be resumed after interruption.
- **Preparation Resolved** — The state reached when all required Prep Items and applicable Re-check Items for the current Work Cycle are resolved.
- **Needs Attention** — A non-blocking flag indicating a system mismatch or a manager judgment call. It is orthogonal to lifecycle completion.
- **Manager Attention List** — The first-release list of unresolved Needs Attention flags for managers.
- **Notes** — One shared, latest-value free-text field for supplementary rental context and M2 corrections.
- **Structured Modification** — A durable, attributable record of a physical change made to the bike during the rental. It is the authoritative return-acknowledgement unit.

## 4. Features and Functional Requirements

### 4.1 Booqable-driven Bike Task lifecycle

**Description:** Workshop Tasks creates and maintains one Bike Task per independently identified physical bike in a Booqable rental. The task follows relevant Booqable lifecycle changes while preserving workshop history. Realizes UJ-1, UJ-2, and UJ-3.

#### FR-1: Create per-bike work from reserved orders

When a Booqable order becomes reserved, the system must reconcile independently addressable Bike Tasks for the physical bikes that Booqable identifies on each bike line. A quantity-one bike line may create one provisional Bike Task in Waiting for Bike ID before its StockItem is known. A multi-quantity line creates one Bike Task per exact distinct StockItem assignment; the system must not create indistinguishable provisional per-unit tasks from quantity, array position, title, or a generated ordinal. When planned quantity exceeds exact assignments, the system must expose one deduplicated Integration Incident with expected, identified, and unknown counts. Later exact assignments create the missing Bike Tasks without recreating existing tasks. The incident resolves only when exact assignments cover the expected quantity or authoritative explicit source evidence decreases the planned quantity.

**Testable consequences:**
- Draft, new, or concept orders do not make workshop work actionable.
- Repeated reconciliation of the same current order state does not create duplicate Bike Tasks for an exact StockItem or duplicate Integration Incidents for the same unknown shortfall.
- A multi-bike order creates independently addressable Bike Tasks only for exact StockItem assignments on multi-quantity lines.
- A reserved quantity-one bike line without an exact StockItem assignment or human-readable `stock_identifier` still creates a Bike Task in Waiting for Bike ID. The task is visible but not claimable until Booqable provides both; the same task then becomes claimable without recreation.
- An unknown multi-unit shortfall is visible through its Integration Incident but is not claimable workshop work.
- Replacement, removal, and re-add preserve the physical-bike incarnation and history rules in FR-2 and FR-3.
- ProductGroup `tag_list` is authoritative for category admission: exactly one controlled Workshop bike tag classifies the bike. Runtime Bike Task identity remains the exact StockItem external ID and must not depend on line title, ProductGroup label, or tag value.
- The controlled ProductGroup tags are `workshop-road-bike`, `workshop-e-road-bike`, `workshop-e-city-bike`, `workshop-gravel-bike`, `workshop-mtb-bike`, and `workshop-e-mtb-bike`. Untagged entities create no Workshop work; unknown, multiple, or conflicting Workshop tags create an Integration Incident and no task.
- Waiting for Bike ID is a trial first-release behavior and may be revisited if mechanics need to start work before the identifier arrives.

#### FR-2: Preserve physical-bike identity

Once Booqable provides an exact StockItem assignment, the Bike Task must associate with that stable opaque external ID so workshop history cannot move silently between physical bikes. The human-readable `stock_identifier` must be displayed for workshop confirmation but must not replace the StockItem external ID as task identity.

**Testable consequences:**
- Replacing bike A with bike B closes A's Bike Task as Replaced and creates a fresh Bike Task for B.
- Replaced is terminal for that task instance. If bike A is later re-added to the same order, the system creates a new Bike Task rather than reopening the Replaced task.
- Explicit validated removal of a bike with no replacement makes that Bike Task read-only. Generic absence is non-closing. If the same StockItem external ID returns to the same reserved order, the system resumes the prior non-Replaced task unassigned after reconciling current Booqable intent, as defined by FR-3.
- Actionable Bike Tasks must show the human-readable `stock_identifier` so the mechanic can verify they are working on the correct bike.

#### FR-3: Handle cancellation and reactivation

When an order is authoritatively cancelled, the system must make each of its Bike Tasks read-only, preserve history, and atomically clear active assignment. When explicit validated source evidence shows that a bike was removed without replacement, only that bike's task becomes read-only, and its active assignment must also be cleared atomically. Generic absence from a refresh must not establish removal.

**Testable consequences:**
- Order cancellation uses copy explaining that the order was cancelled in Booqable and no further work is needed.
- Bike removal without replacement uses copy explaining that the bike was removed from the order.
- Replacement uses Replaced outcome and copy identifying the replacement.
- If the same order and eligible physical bike returns to an actionable source state, the system preserves the Bike Task's safe prior stage and evidence, reconciles current Booqable intent, selectively reopens changed required work, and returns the task unassigned for an ordinary claim.
- The first release must not infer mechanic presence from an open screen, session, lifecycle stage, or recent save. Retaining assignment after cancellation or removal would require a separately approved presence-lease capability.
- Stale reserved updates must not regress a Cancelled, Returned, Done, or Replaced outcome.

#### FR-4: Expose a predictable lifecycle

The user-visible lifecycle must be:

`Waiting for Bike ID → Needs Prep → In Prep → Needs Re-check → In Re-check → Preparation Resolved → Needs Return Check → In Return Check → Done`

The Re-check states must be skipped when the current Work Cycle contains no M2-enabled Items. Cancelled, Replaced, and Force-closed are read-only outcomes. Needs Attention is not a lifecycle state.

#### FR-5: Allow a manager reset

An Admin / Manager must be able to reset stale workshop work while preserving the pre-reset audit history. Reset returns the Bike Task to Needs Prep unassigned, preserves historical outcomes as audit, and invalidates unresolved current-cycle work so preparation can restart cleanly.

### 4.2 Queue, claiming, and ownership

**Description:** Mechanics work bike by bike. The system exposes actionable work, supports self-claiming and manager assignment, and prevents conflicting ownership. Realizes UJ-1.

#### FR-6: Provide Available Now and My Work

The default mechanic queue must show unassigned, claimable Bike Tasks in Needs Prep, Needs Re-check, or Needs Return Check, ordered by rental start date, earliest first. Waiting for Bike ID tasks are visible but not claimable.

Every mechanic must also be able to open My Work and resume any Bike Task currently assigned to them at the authoritative unresolved point.

#### FR-7: Keep bikes independently actionable

Mechanics must claim one Bike Task at a time as the unit of work. Bikes from the same order may be prepared in parallel by different mechanics, and each bike must enter Re-check as soon as its own Prep work is complete.

#### FR-8: Support self-claim and manager assignment

A mechanic must be able to claim an available Bike Task, and an Admin / Manager must be able to assign or reassign it explicitly. The system must not assign mechanics automatically.

Reassignment must preserve resolved Item outcomes and their attribution unless an explicit reset or Booqable-driven invalidation rule applies. The receiving mechanic must see current unresolved work, retained confirmed outcomes, invalidated outcomes, and current-cycle ownership.

#### FR-9: Resolve concurrent claims safely

Concurrent claims must use first-writer-wins behavior. The first valid claim succeeds; later claimants are informed that the Bike Task already has an assignee.

#### FR-10: Preserve per-cycle ownership

M1 and M2 identities apply to the current Work Cycle rather than permanently to the Bike Task. A new Work Cycle starts when Prep becomes actionable after initial creation, after selective reopening of completed preparation, or after a change returns active Re-check to Prep.

A mechanic who performs reopened Prep becomes M1 for that cycle. M2 must differ from the current Work Cycle's M1 unless a manager override is recorded.

### 4.3 Versioned checklist definition and execution

**Description:** Admin-authored Checklist Templates define stable work language. Each Bike Task uses immutable phase snapshots while Setup Category links provide current Booqable context. Broad configuration review is the initial change mode; Epic 6 may enable targeted invalidation only from complete source-backed mapping evidence. Realizes UJ-1 and UJ-2.

#### FR-11: Manage category-specific templates

An Admin / Manager must be able to create, activate, supersede, and reactivate separate Prep and Return Checklist Templates for e-city, e-road, road, gravel, MTB, and E-MTB bikes.

Template activation must not require every Setup Category to have a linked Item. Administrators own checklist coverage quality; incomplete coverage is not a blocking validation rule.

#### FR-12: Snapshot templates by phase

Each Bike Task must receive a Prep Snapshot when the task is created. It must receive a Return Snapshot when it enters Needs Return Check, using the then-active Return template for the bike's current category. Later template edits apply only to future snapshots and must not alter existing progress or history.

#### FR-13: Configure item type and applicability

For each admin-authored Item, an Admin / Manager must be able to define:
- whether it is an Action Item or Value Item;
- whether it is required;
- whether M1 performs it;
- whether M2 independently verifies it; and
- an optional Setup Category link.

M2-enabled must require M1-enabled. The same validity rule applies to built-in confirmation Items.

#### FR-14: Keep admin-authored Items visible

All admin-authored Items must remain visible regardless of the current Booqable selection. A Setup Category link controls grouping, context, and selective invalidation, not visibility.

For the first release, a Setup Category whose current value is `No` must remain visible, show that value, and allow non-applicable Action Items to resolve as N/A. This behavior is explicitly subject to post-pilot review.

#### FR-15: Show current configuration context

A linked Item group must display the current Booqable Setup Category value. When that value changed during active work, it must also identify the prior value until the affected work is resolved.

#### FR-16: Resolve Action Items honestly

An Action Item must be resolved as Done or N/A. Either outcome satisfies completion, but the recorded outcome must remain distinguishable in history.

#### FR-17: Resolve Value Items with a value

A Value Item must require a value when configured as required and must not offer N/A. Optional Value Items may remain blank.

#### FR-18: Block incomplete handoff

M1 must not hand off a Work Cycle while any required Prep Item is unresolved. Optional Items may remain unresolved. Handoff and completion must use only server-confirmed outcomes and must leave the resulting ownership and lifecycle state unambiguous.

#### FR-19: Include built-in confirmation Items

The system must include Booqable `extra_information` as a built-in required M1/M2 confirmation Item for both bundled and flat orders. Changes to `extra_information` must reopen that Item through the normal selective flow.

When `extra_information` changes, the current text and a clear change indicator must be visible; the previous text must be available on demand. The exact interaction design is deferred to UX.

The system must also include a built-in required "Review updated bike configuration" confirmation Item for relevant but ambiguous Booqable changes. That Item must state the known changed source, affected scope, current authoritative configuration, prior accepted configuration when available, and why selective classification failed.

### 4.4 Independent selective Re-check

**Description:** M2 independently attests that configured aspects of the physical bike match the required state. M2 does not approve M1's answers; M2 completes a fresh check. Realizes UJ-1 and UJ-2.

#### FR-20: Start Re-check per bike

When M1 completes all required Prep Items, the Bike Task must immediately enter Needs Re-check if at least one M2-enabled Item applies to the current Work Cycle.

#### FR-21: Require independent resolution

M2 must independently resolve each applicable Re-check Action Item as Done or N/A and attest each applicable Value Item passed verification. M1 outcomes must not satisfy M2 work.

#### FR-22: Show M1 identity to M2

M2 must be able to see the identity of the current Work Cycle's M1 to support direct workshop communication.

#### FR-23: Record corrections without rejecting M1

When M2 finds and corrects a discrepancy, M2 must finish the independent verification and record the correction. Durable physical corrections that must later be reversed use Structured Modifications; supplementary explanation may go in Notes. The workflow must not use approve/reject semantics against M1's recorded response.

#### FR-24: Verify target values without duplicate entry

For an M2-enabled Value Item, M1 records the target value. M2 physically verifies and adjusts the bike if needed, then records that verification passed. The system must not require M2 to enter a second value or record whether an adjustment was needed.

#### FR-25: Enforce two-person verification

M2 must differ from the current Work Cycle's M1 unless an Admin / Manager explicitly approves the per-task override request defined in FR-45.

### 4.5 Selective reopening after Booqable changes

**Description:** A Bike Task is living workshop work while the order remains reserved and not yet picked up. Relevant configuration changes invalidate only affected work and reuse the normal Prep and Re-check flow. Realizes UJ-2.

#### FR-26: Classify update outcomes

The system must handle Booqable updates through three outcomes:
- a relevant change advances the built-in broad `review_updated_configuration` confirmation in the initial mode;
- after Epic 6 proves and activates a complete stable Setup Category mapping, a recognized relevant change may invalidate only Items linked to the changed Setup Category; and
- a non-workshop-relevant change refreshes data silently.

Product, ProductGroup, and Bundle `tag_list` values are persisted as read-only Booqable source facts, but v1 does not interpret or configure accessory tags before Epic 6. Category-level selective invalidation may activate only when every active Setup Category has a stable source field, relation, or accessory-tag identifier covered by redacted fixtures for null, unknown, changed, and removed values. Display labels are not mapping keys. Missing or stale proof keeps broad mode active rather than blocking all Workshop Task execution.

Invalidation is evaluated against the last physically attested Booqable intent for the Bike Task. Multiple unresolved changes converge to the latest current intent without duplicating Work Cycles or resets.

#### FR-27: Refresh silently before work starts

Before a Bike Task is first claimed, Booqable updates must refresh task details without persistent change alerts.

#### FR-28: Keep active M1 work assigned

If a relevant change arrives while M1 is working, the Bike Task must remain assigned to M1, identify the change, invalidate affected Items, and block handoff until affected required work is resolved again.

#### FR-29: Return active M2 or unassigned Re-check work to Prep

If a relevant change arrives while the Bike Task is in Needs Re-check or In Re-check, the same Bike Task must return to Needs Prep unassigned and re-enter the ordinary queue.

#### FR-30: Reopen completed preparation safely

If a relevant change arrives after Preparation Resolved but while the order remains reserved and not yet picked up, the same Bike Task must return unassigned to Needs Prep with only affected work reopened.

#### FR-31: Preserve independent verification on reopened work

Every reopened Work Cycle must repeat M2 verification for any invalidated M2-enabled Items. If the former M2 claims reopened Prep, another mechanic must verify it unless a manager override is recorded.

#### FR-32: Limit reopening by rental progress

Configuration changes after customer pickup must not reopen completed preparation work. Pickup/active rental is the Booqable condition after reserved and before returned.

During Needs Return Check or In Return Check, configuration refreshes may update displayed context but must not reopen Prep/Re-check or restart Return work automatically.

#### FR-33: Make changed work self-clearing

Changed Items must be visibly highlighted. Resolving the affected Item must clear its highlight without requiring a separate acknowledgement action. Each accepted relevant change must leave an attributable history entry with prior/current values when known, affected Items, and resulting Work Cycle effect.

### 4.6 Notes, accessories, modifications, and attention

**Description:** The Bike Task contains the rental-specific context mechanics need without guessing ambiguous Booqable associations. Exceptions remain visible without blocking physical work. Realizes UJ-1, UJ-3, and UJ-4.

#### FR-34: Maintain shared rental Notes

Each Bike Task must provide one shared Notes field containing its latest value as supplementary context. Notes must follow the same rental into Return Check but must not automatically carry into a later rental and must not be the sole durable record of return-relevant physical changes.

#### FR-35: Show bike-focused accessory context

The Bike Task must present bundle-linked accessories and manager-authored `extra_information` in one bike-focused area with clear source labels.

#### FR-36: Never guess flat-order associations

For flat orders, the system must rely on manager-authored `extra_information` for each bike. If it is missing, a mechanic can raise Needs Attention and contact the manager; the mechanic may still hand off the Bike Task.

#### FR-37: Record structured modifications

A mechanic must be able to record a defined physical change as a Structured Modification on the Bike Task. Structured Modifications are durable, attributable, and cannot be silently overwritten by Notes edits.

The system must include a read-only "last touched" lookup for the same `stock_identifier`; that lookup must not imply a complete cross-rental bike history.

#### FR-38: Distinguish attention signals

The system must distinguish:
- system-raised Needs Attention for order or synchronization mismatch;
- mechanic-recorded "found and fixed" history that requires no action; and
- mechanic-raised Needs Attention requiring manager judgment.

Needs Attention must not block a mechanic from completing their own work or from transitioning a Bike Task to Done. Open flags remain independently visible in the Manager Attention List until resolved.

First-release mechanic-raised Needs Attention uses exactly these reasons:
- `same_mechanic_recheck_override`;
- `missing_or_unclear_bike_order_information`; and
- `manager_decision_needed`.

Missing/unclear information and manager-decision reasons require a short creation explanation. A same-mechanic Re-check override request requires no explanation. The override request does not block another eligible mechanic from claiming Re-check; it preserves the ordinary independence rule for the requesting M1 until a manager explicitly approves the exception.

### 4.7 Return Check

**Description:** Return work is a simpler one-mechanic flow triggered by Booqable and informed by preparation history from the same rental. Realizes UJ-3.

#### FR-39: Trigger Return Check

When Booqable marks an order returned, each Bike Task currently associated with that returned order must enter Needs Return Check and expose its Return Snapshot. Cancelled and Replaced historical tasks are not return-eligible.

If the Bike Task is still in Prep or Re-check when the order returns, the system must force Needs Return Check, clear active assignment, preserve unresolved Prep/Re-check history as visible context, and make return work the only actionable work.

Repeated return reconciliation is idempotent. Stale reserved updates must not pull a task out of Needs Return Check, In Return Check, or Done.

#### FR-40: Use a single return-check mechanic

One return-check mechanic must complete the Return Checklist. Return Check does not require an M2 stage.

#### FR-41: Carry same-rental context into Return Check

The return-check mechanic must see the Bike Task's Notes and Structured Modifications from the same rental, including unfinished Prep/Re-check history when present.

#### FR-42: Require Structured Modification acknowledgement

Return Check must not complete until the mechanic acknowledges each open Structured Modification for the rental. Notes remain available as supplementary context and do not replace per-modification acknowledgement.

### 4.8 Manager controls and audit history

**Description:** Manager actions solve exceptional cases while normal work remains mechanic-driven. Attribution makes the digital workflow more trustworthy than paper. Realizes UJ-4.

#### FR-43: Resolve Needs Attention

An Admin / Manager must be able to discover unresolved Needs Attention flags in the Manager Attention List and resolve them. Missing/unclear information and manager-decision reasons require a short manager resolution note. Resolving a flag clears only that flag; it is not required to complete the Bike Task, and an open flag must not prevent Done when mechanical work is complete. Same-mechanic Re-check override requests are resolved through FR-45.

#### FR-44: Force-close abandoned work

An Admin / Manager must have a distinct force-close action for genuinely stuck or abandoned Bike Tasks. Force-close is a read-only terminal outcome distinct from Done, Cancelled, and ordinary attention resolution.

#### FR-45: Request, approve, or decline same-mechanic Re-check

When no second mechanic is available, the system must take no automatic action. M1 may raise a same-mechanic Re-check override request for the current Bike Task and Work Cycle without an explanation. An Admin / Manager must explicitly Approve or Decline that request.

Approval authorizes assignment of that Work Cycle's Re-check to M1 or the approving Admin / Manager for that Bike Task only. It must never authorize another Bike Task or later Work Cycle. Decline resolves the request without changing ordinary two-person eligibility. No written request explanation or manager resolution note is required in the first release.

The audit history must record the requester, decision, deciding Admin / Manager, time, Bike Task, Work Cycle, M1, and resulting assignment when applicable.

#### FR-46: Preserve attributable history

The system must preserve the actor and time for claims, assignments, reassignments, Item outcomes, handoffs, verification completion, Structured Modifications, attention changes, overrides, resets, cancellation, replacement, configuration-driven invalidations, and force-close.

FR-47 and FR-48 are cross-cutting (Booqable reconciliation and stale open-screen concurrency). They are kept at the end of this section for contiguous FR numbering.

#### FR-47: Reconcile against current Booqable state

Update notifications only trigger reconciliation against Booqable's latest retrievable current order state. That current state is authoritative.

**Testable consequences:**
- A semantic state or configuration already accepted by Workshop Tasks is a no-op.
- Duplicate delivery cannot create a Bike Task, Work Cycle, invalidation, assignment change, or audit event twice.
- Stale updates cannot regress accepted lifecycle or configuration.
- Accepted Booqable precedence is reserved → picked up/active rental → returned. An authoritative current cancellation suspends further prep work and clears assignment; a later authoritative same-bike reactivation may resume under FR-3, but stale reserved updates must not clear the cancellation.

#### FR-48: Reject stale open-screen actions

If ownership or lifecycle changes while a Bike Task is open on a device, the system must surface the new authoritative state, reject stale saves and transitions, and preserve typed input long enough for the mechanic to understand or retry appropriately.

## 5. Cross-Cutting Non-Functional Requirements

### NFR-1: Workshop usability

The complete Prep and Re-check flow must be practical on a workshop tablet without a parallel paper checklist. Frequent actions must be tap-friendly and readable at tablet size. Mechanics must be able to identify the next required physical action and current target configuration without leaving the Bike Task for Booqable.

### NFR-2: Responsive form factor

Mechanic workflows must support workshop phones and tablets; manager workflows must also support desktop screens.

### NFR-3: Predictable synchronization

The same current Booqable state must converge to the same correct Bike Task state regardless of duplicate or out-of-order update delivery. The system must not lose or duplicate Bike Tasks.

### NFR-4: Confirmed save and failure visibility

Every save, claim, handoff, or lifecycle transition must leave server-confirmed versus unsaved state unambiguous. A failed save must identify the affected action, retain typed input for retry while the Bike Task remains open, and never present failed work as successfully recorded. Handoff and completion may use only confirmed outcomes. Reopening a Bike Task must show the authoritative persisted state.

### NFR-5: Clear loading and pending feedback

Page and route transitions must show clear loading feedback so mechanics never face a blank or unexplained wait on workshop tablets. In-flight actions—claim, Item save, handoff, completion, and similar mutations—must show an obvious pending state, remain distinguishable from confirmed outcomes (NFR-4), and must prevent double submission while pending. Exact visual treatment is left to UX; the acceptance bar is continuous, unambiguous feedback during every wait that affects workshop work.

### NFR-6: Audit integrity

Attribution and historical outcomes must remain trustworthy after reassignment, reopening, reset, cancellation, replacement, and manager intervention.

### NFR-7: Authorized access

Only authenticated staff may access Workshop Tasks. Mechanic operations and Admin / Manager controls must follow the existing staff-role boundaries and server-side data-access policies.

### NFR-8: Online-only operation

The first release may require a live network connection and does not promise offline operation. It does require the confirmed-save and retry behavior in NFR-4 for transient failures while the session remains open.

## 6. Integration and Dependencies

### Source-of-truth partition

- **Booqable owns:** order lifecycle, current order-bike membership, stable opaque StockItem external identity, human-readable `stock_identifier`, Product/ProductGroup/Bundle `tag_list`, rental timing, bike category/configuration, accessories, and `extra_information`.
- **Workshop Tasks owns:** derived workshop lifecycle, assignments, Work Cycles, Item outcomes, Notes, Structured Modifications, Needs Attention, overrides, and audit history.
- Synchronized Booqable values are displayed snapshots and are not locally editable as Booqable intent.

### Dependencies and assumptions

- Booqable order-update delivery triggers reconciliation of current order state.
- Exactly one controlled ProductGroup Workshop bike tag classifies category; corresponding Bundles use the matching `workshop-*-bike-bundle` tag and must agree with their contained bike ProductGroup.
- Admitted Product, ProductGroup, and Bundle tags are persisted as source facts. Untagged entities create no Workshop work; unknown, multiple, or conflicting Workshop tags fail closed with an Integration Incident.
- Bundled-order accessory-to-bike association depends on Booqable parent linkage.
- Broad configuration review is the initial mode. Targeted Setup Category invalidation belongs to Epic 6 and depends on a mapping version in which all five active Setup Categories use stable source identifiers and fixture-backed normalized values.
- In v1, generic absence from a Booqable response never establishes bike removal or closes a source child, membership, or Bike Task. Removal requires a validated explicit archive/tombstone or another separately fixture-proven explicit removed state from the canonical refresh path.
- The existing admin authentication and staff roles provide the access boundary.
- `[ASSUMPTION]` Booqable webhooks provide enough information to identify the changed order and refresh current order data.
- `[ASSUMPTION]` Draft, new, and concept orders are filtered before workshop work becomes actionable.
- `[ASSUMPTION]` Bundled accessory parent linkage is stable enough to display accessories against the correct bike.
- `[ASSUMPTION]` Workshop devices normally have a usable network connection.
- `[ASSUMPTION]` Selective reopening can compare last accepted workshop configuration with refreshed current Booqable data.
- `[ASSUMPTION]` Booqable exposes a distinguishable picked-up/active-rental condition between reserved and returned.

Until Epic 6 proves all five active Setup Categories through a stable mapping version, targeted invalidation remains disabled and broad configuration review applies to all relevant changes. Accessory tags remain persisted but uninterpreted until that work. If bundled parent linkage fails technical discovery, bike-specific accessory display must be re-scoped before implementation commits to that behavior.

## 7. Non-Goals

The first release will not:

- replace Booqable's full rental order lifecycle;
- build complete cross-rental physical-bike history, usage frequency, or analytics;
- support offline work or recovery of unsaved local changes after the session is lost;
- assign mechanics automatically;
- generate runtime checklist Items from Booqable accessories;
- provide a Workshop classification-approval screen or a second local category authority;
- interpret or configure accessory tags before Epic 6;
- maintain Notes revision history;
- integrate Bike Fit reports into checklist Items;
- create separate revalidation tasks, statuses, queues, or manager pings;
- infer flat-order accessory-to-bike associations;
- require manager approval before ordinary work enters the queue;
- provide manager dashboards, mechanic performance views, changed-work filters, or broader workshop analytics beyond the Manager Attention List; or
- allow claiming work before `stock_identifier` arrives, unless later pilot evidence changes that trial rule.

## 8. First-Release Scope

### 8.1 In Scope

- Booqable-driven per-physical-bike Bike Tasks and lifecycle synchronization, including quantity-one Waiting for Bike ID and Integration Incidents for ambiguous multi-quantity shortfalls
- Available Now, My Work, claiming, assignment, reassignment, and concurrency handling
- Versioned category-specific Prep and Return Checklist Templates with phase-specific snapshots
- Always-visible admin-authored Items with optional Setup Category links
- Action Item Done/N/A outcomes and Value Item entry
- Attributed M1 preparation and selective independent M2 verification
- Broad configuration review after relevant reserved-order changes, with targeted reopening available only after Epic 6 proves a complete stable mapping
- Same-rental Notes, durable Structured Modifications, and accessory context
- Needs Attention, Manager Attention List, manager interventions, and attributable audit history
- One-mechanic Return Check with per-Structured-Modification acknowledgement
- Confirmed-save / retry behavior for transient online failures
- Clear page/route loading and in-flight action pending feedback
- Responsive tablet/phone mechanic experience and desktop manager support

### 8.2 Follow-up Capabilities

The following remain valuable but will be reconsidered after the first release is operating predictably:

- manager date-range summaries and status tiles;
- manager Tomorrow/Upcoming filters and corresponding status counts beyond the Manager Attention List;
- mechanic performance views using M1/M2 attribution;
- changed-work visibility through queue filtering;
- broader workshop analytics based on trusted usage data; and
- possibly allowing claim before bike ID arrives, if Waiting for Bike ID creates operational friction.

## 9. Success Metrics

### Primary

- **SM-1 — Paperless preparation completion:** During rollout observation, mechanics can routinely discover, claim, prepare, hand off, independently re-check, resolve, and move to the next Bike Task using a tablet without a manual paper checklist. Validates FR-6 through FR-25.
- **SM-2 — Predictable Booqable convergence:** Observed Booqable updates produce no duplicate or missing exact-StockItem Bike Tasks; source tags classify all six categories without a second local authority; untagged entities produce no work; ambiguous identity or unknown/multiple/conflicting Workshop tags produce deduplicated Integration Incidents rather than guessed work; the queue reflects current order state; relevant changes open broad review until any complete Epic 6 mapping safely targets affected work; irrelevant changes do not interrupt mechanics; and repeated updates converge to the same correct state. Validates FR-1 through FR-5, FR-26 through FR-33, FR-47, and FR-48.

### Secondary

- **SM-3 — Paperless Return Check:** Mechanics can complete post-rental Return Check, including Structured Modification acknowledgement, without a paper checklist. Validates FR-37 and FR-39 through FR-42.
- **SM-4 — Traceable workshop activity:** Staff can determine who prepared, verified, corrected, reassigned, overrode, or resolved each Bike Task and when. Validates FR-20 through FR-25 and FR-43 through FR-46.

### Counter-metrics

- **SM-C1 — Preparation speed:** Tablet-based work must not materially slow bike preparation relative to the paper baseline.
- **SM-C2 — Preparation quality:** The paperless rollout must not increase missed required checks, unresolved configuration mismatches, or avoidable Re-check discrepancies.
- **SM-C3 — Mechanic focus:** Mechanics must not experience the tablet workflow as cumbersome or distracting from physical-bike work.

### Paper-retirement gate

Paper may be retired only after a pilot that covers at least one full peak prep cycle plus return checks across the usual bike categories, and only when:

1. mechanics report they can work comfortably without paper;
2. observers see no material slowdown, missed required checks, or unpredictable Booqable sync issues; and
3. no rollback trigger has occurred.

Rollback to paper if sync creates missing or duplicate Bike Tasks, or if save/handoff failures leave mechanics unsure what was recorded.

## 10. Rollout and Change Management

1. Configure and review initial category-specific Checklist Templates.
2. Run Workshop Tasks alongside the current paper process for a short baseline and controlled pilot covering peak prep and return work.
3. Observe complete Prep/Re-check cycles across all six bike categories, Waiting for Bike ID → claim transitions, untagged and conflicting-tag exclusion/incidents, ambiguous multi-quantity incidents, broad-review and any fixture-proven targeted Booqable changes, cancellation, explicit removal, replacement, same-bike reactivation with preserved safe stage/evidence and cleared assignment, save retries, and Return Checks.
4. Collect direct mechanic feedback on comfort, speed, clarity, and focus.
5. Retire the paper preparation checklist only when the paper-retirement gate in §9 is met.
6. Revisit Waiting for Bike ID claimability, always-visible `No` display, and deferred manager/reporting capabilities using pilot evidence.

## 11. Open Questions

1. Which stable source identifiers—including any future accessory tags—and fixture-backed normalized values complete one mapping version for all five initial Setup Categories? This is Epic 6 discovery; broad review remains active until all five meet that proof.
2. Is bundled-order parent linkage stable for every supported order configuration?
3. What exact progressive-disclosure interaction should UX use for previous `extra_information`?
4. Does the always-visible `No` behavior remain comfortable after mechanics use it on real tasks?
5. Does Waiting for Bike ID create enough friction that claim-before-ID should be reconsidered?
6. What exact Booqable field or status maps to picked-up/active rental for FR-32?

Questions 1, 2, and 6 are technical-discovery dependencies that can re-scope selective invalidation, accessory display, or reopening boundaries. Question 1 does not block source ingestion, tag-based bike classification, or broad configuration review. Questions 3–5 are UX/pilot questions and do not block architecture.

## 12. Assumptions Index

- Booqable update delivery can identify an order and support refreshing its current state (§6).
- Draft, new, and concept orders are filtered before workshop work becomes actionable (§6).
- Bundled accessory parent linkage reliably associates accessories with bikes (§6).
- Workshop devices normally have a usable network connection (§6).
- Selective reopening can compare last accepted workshop configuration with refreshed current Booqable data (§6).
- Booqable exposes a distinguishable picked-up/active-rental condition between reserved and returned (§6).
