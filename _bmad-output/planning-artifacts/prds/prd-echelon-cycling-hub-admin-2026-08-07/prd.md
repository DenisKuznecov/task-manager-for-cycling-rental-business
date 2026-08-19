---
title: Workshop Tasks
status: final
created: 2026-08-07
updated: 2026-08-18
---

# PRD: Workshop Tasks

## 0. Document Purpose

This PRD defines the first operating release of Workshop Tasks for product, UX, architecture, and implementation planning. It uses Glossary terms, groups capabilities into features with stable FR IDs, and keeps product behavior separate from technical implementation. Technical-how and rejected models live in `addendum.md`.

This revision applies the approved Sprint Change Proposal of 2026-08-18. It replaces the prior 48-requirement autonomous-reconciliation plan with a compressed MVP for one three-person workshop. Old FR IDs are retired; the mapping is in the addendum.

## 1. Vision

Workshop Tasks digitizes the mechanics' paper workflow so every bike's preparation, independent re-check, and return inspection are visible and attributable. It is a responsive web feature inside the existing admin hub, suitable for workshop tablets and phones as well as desktop management screens.

The product's outcome is bike quality, not checklist completion. A mechanic must be able to see available work, claim one bike, perform every required action, hand it to another mechanic for applicable independent checks, resolve the preparation, and move to the next bike without using a paper checklist.

Booqable remains the authority for the rental order lifecycle and for which physical bike is assigned. The manager assigns the exact stock ID in Booqable. Workshop Tasks creates work from that assignment, shows current rental context on the Bike Task, and records workshop attribution. Mechanics remain the authority on whether the physical bike matches the required state; a digital outcome records their attestation rather than independently proving bike condition.

## 2. Target Users and Jobs

### 2.1 Users

- **Preparation Mechanic (M1):** Claims one Bike Task, prepares the bike, completes required Prep Items, and hands the work to independent verification.
- **Re-check Mechanic (M2):** Independently signs the Items configured for a second mechanic. M2 must be a different person from that task's M1.
- **Return-check Mechanic:** Completes the category-specific Return Checklist on the same Bike Task after the rental is returned.
- **Admin / Manager:** Maintains Checklist Templates, assigns stock IDs in Booqable, resolves Needs Attention, reassigns work, and force-closes abandoned Bike Tasks.
- **Booqable:** External system actor and the authority for orders, assigned stock IDs, rental timing, configuration, and order lifecycle state.

### 2.2 Jobs To Be Done

- When a manager has assigned a physical bike, mechanics need to find and claim that work without searching through orders.
- While working at the bike, M1 needs a fast checklist with current rental context so the tablet supports physical work.
- Before a bike is considered prepared, M2 needs an independent attestation on the configured subset of checks.
- If Booqable changes while M1 is still preparing, M1 needs to see that and reconfirm before handoff.
- After return, a mechanic needs the same checklist machinery with the Return template so temporary setup can be reversed.
- Managers need to clear exceptions, reassign, or force-close without becoming a gate on ordinary work.

### 2.3 Key User Journeys

- **UJ-1 — Marc prepares a reserved road bike; Inés re-checks it.**
  Marc, the morning prep mechanic, opens Available Now on the workshop tablet and claims the Bike Task for stock `RD-14`. He works the Prep Snapshot at the rack, marks required Action Items Done or N/A, enters required values, and hands off only after every required Prep Item is server-confirmed. Inés, a different mechanic, sees the Bike Task in Needs Re-check, signs the M2 Items independently, and the Bike Task enters `Awaiting Return`. It is not in Available Now or My Work. Marc takes the next available bike.

- **UJ-2 — Pedals change while Marc is still in Prep.**
  While Marc is on `RD-14`, the manager changes the pedal selection in Booqable. The Bike Task stays assigned to Marc and shows that current order context changed. Handoff stays blocked until Marc reviews the current Booqable context and reconfirms the affected preparation. Inés still does M2 afterward; the change does not invent a new workflow.

- **UJ-3 — Tomás checks the returned bike.**
  Booqable marks the order returned. The Bike Task that was `Awaiting Return` becomes unassigned `Needs Return Check`. Tomás claims it, works the Return Snapshot with the same checklist controls, records observations in task history, and closes the Bike Task as Done.

- **UJ-4 — Den clears a stuck bike.**
  Den, the shop manager, opens the Manager Attention List and sees a Bike Task still assigned to a mechanic who left mid-shift, with reason and owner. He reassigns it or force-closes it as abandoned. The intervention records who acted, when, why, and the resulting status. Ordinary completion by a mechanic does not wait on that resolution.

## 3. Glossary

- **Bike Task** — The persistent workshop record for one physical bike within one rental order. It exists only after a manager has assigned an exact Booqable StockItem. Identity is that StockItem's opaque external ID; the human-readable `stock_identifier` is display and confirmation data only.
- **M1** — The Preparation Mechanic who performs accepted Prep handoff on a Bike Task.
- **M2** — The independent Re-check Mechanic for that Bike Task. M2 must differ from M1. There is no override.
- **Prep Item** — An Action Item or Value Item completed by M1 from the Prep Snapshot.
- **Re-check Item** — A Prep Item configured as requiring a second mechanic. M2-enabled implies M1-enabled.
- **Return Item** — An Item in the Return Snapshot.
- **Action Item** — An Item resolved as Done or N/A.
- **Value Item** — An Item resolved by entering a value; it has no N/A outcome.
- **Checklist Template** — An admin-authored, versioned definition for a bike category and phase (Prep or Return).
- **Prep Snapshot** — The immutable Prep Checklist Template version copied into a Bike Task when the task is created.
- **Return Snapshot** — The immutable Return Checklist Template version copied into a Bike Task when Return Check becomes actionable.
- **Available Now** — The queue of unassigned, claimable Bike Tasks.
- **My Work** — The mechanic's currently assigned Bike Tasks.
- **Needs Attention** — A non-blocking flag that a Bike Task needs manager judgment. It is not a Task Outcome.
- **Manager Attention List** — The list of Bike Tasks with unresolved Needs Attention.
- **Notes** — One shared, latest-value free-text field for supplementary rental context.
- **Task Outcome** — The Bike Task's durable result: `Actionable`, `Cancelled`, `Replaced`, `Force-closed`, or `Done`.
- **Work Phase** — The mechanic-visible phase while the Task Outcome is `Actionable`: `Needs Prep`, `In Prep`, `Needs Re-check`, `In Re-check`, `Awaiting Return`, `Needs Return Check`, or `In Return Check`. Re-check phases are skipped when the Prep Snapshot has no Re-check Items.
- **Awaiting Return** — The non-claimable Actionable Work Phase after preparation is complete and before Booqable marks the rental returned. It is not shown in Available Now or My Work. Only a returned authoritative rental moves the Bike Task to unassigned `Needs Return Check`.

## 4. Features

### 4.1 Category-specific checklist standards

**Description:** Managers already maintain versioned Prep and Return templates per bike category, including which Items require a second mechanic. Bike Tasks copy an immutable snapshot rather than a live template. Realizes UJ-1 and UJ-3. This capability is shipped (Epic 1).

#### FR-1: Maintain Prep and Return templates

An Admin / Manager can create, activate, supersede, and reactivate separate Prep and Return Checklist Templates for e-city, e-road, road, gravel, MTB, and E-MTB.

**Consequences (testable):**
- Prep and Return are separate template families per category.
- Activating a new version does not rewrite snapshots already copied onto Bike Tasks.

#### FR-2: Configure Item type and second-mechanic requirement

For each admin-authored Item, an Admin / Manager can define whether it is an Action Item or Value Item, whether it is required, whether M1 performs it, and whether M2 independently verifies it.

**Consequences (testable):**
- M2-enabled requires M1-enabled.
- Required Action Items accept Done or N/A.
- Required Value Items require a value and do not offer N/A.

#### FR-3: Snapshot the active template onto the Bike Task

Each Bike Task receives a Prep Snapshot at creation. It receives a Return Snapshot when Return Check becomes actionable, using the then-active Return template for the bike's current category.

**Consequences (testable):**
- Later template edits do not change in-progress or historical Item outcomes.

### 4.2 Tasks from manager-assigned bikes

**Description:** The manager assigns the physical bike in Booqable. Workshop Tasks creates one Bike Task only after that exact stock ID exists, and chooses the Prep Snapshot from the source category tag. Realizes UJ-1.

#### FR-4: Create a Bike Task only after an exact stock ID

A Bike Task is created only when a manager has assigned an exact Booqable StockItem to the rental. The system does not create work for unassigned, ambiguous, or quantity-only bike lines.

**Consequences (testable):**
- Draft, new, or concept orders create no Bike Task.
- A reserved order with no assigned StockItem creates no Bike Task.
- Repeated refresh of the same assigned StockItem does not create a second Bike Task.

#### FR-5: Select the template from the source category tag

The Bike Task's category, and therefore its Prep Snapshot, comes from the controlled ProductGroup Workshop bike tag on the assigned source bike.

**Consequences (testable):**
- Exactly one of `workshop-road-bike`, `workshop-e-road-bike`, `workshop-e-city-bike`, `workshop-gravel-bike`, `workshop-mtb-bike`, or `workshop-e-mtb-bike` selects the category.
- Untagged, unknown, multiple, or conflicting Workshop tags create no Bike Task.

#### FR-6: Replace or cancel assigned work simply

When the assigned stock ID changes or the rental is cancelled, the existing Bike Task is no longer actionable. A fresh Bike Task is created only for a newly assigned replacement stock ID. History stays on the original Bike Task.

**Consequences (testable):**
- Cancellation sets Task Outcome to `Cancelled`, preserves history, and clears assignment.
- A changed stock ID sets the prior Bike Task to `Replaced` and, if a new exact stock ID is assigned, creates a new Bike Task.
- The same physical bike returning later does not automatically reopen a `Cancelled` or `Replaced` Bike Task.

### 4.3 Queue, claim, and resume

**Description:** Mechanics see manager-created work, claim one Bike Task, and resume assigned work. One owner at a time. Realizes UJ-1 and UJ-3.

#### FR-7: Show Available Now and My Work

Mechanics can see unassigned claimable Bike Tasks in Available Now and their assigned Bike Tasks in My Work.

**Consequences (testable):**
- Available Now includes `Needs Prep`, `Needs Re-check`, and `Needs Return Check` Bike Tasks only.
- My Work includes only the mechanic's currently assigned Bike Tasks and lets the assignee resume at the current unresolved Item. `Awaiting Return` is not in My Work.

#### FR-8: Claim with one owner

A mechanic can claim an available Bike Task. Concurrent claims use first-writer-wins. The system does not auto-assign mechanics.

**Consequences (testable):**
- Exactly one valid claim succeeds; later claimants see the current owner. First-writer-wins applies to `Needs Prep`, `Needs Re-check`, and `Needs Return Check`.
- Claiming `Needs Prep` moves Work Phase to `In Prep`; claiming `Needs Re-check` moves it to `In Re-check`; claiming `Needs Return Check` moves it to `In Return Check`.

#### FR-9: Keep bikes independently actionable

Each Bike Task is claimed and progressed on its own. Bikes on the same order may be prepared in parallel by different mechanics.

**Consequences (testable):**
- Claiming or completing one Bike Task never changes a sibling Bike Task's Work Phase, Task Outcome, or owner.
- Two bikes on the same order can be `In Prep` at the same time for different mechanics.

### 4.4 M1 preparation and handoff

**Description:** M1 works the Prep Snapshot at the bike with current Booqable context visible. Handoff uses only server-confirmed required outcomes. Realizes UJ-1 and UJ-2.

#### FR-10: Show current rental context on the Bike Task

The Bike Task shows the human-readable `stock_identifier`, current category, and current Booqable rental context the mechanic needs to prepare that bike, including manager-authored `extra_information` when present.

**Consequences (testable):**
- M1 can confirm they are on the correct physical bike without opening Booqable as the primary work surface.
- The Bike Task does not treat a webhook payload as current context; context comes from the last successful current-order refresh.

#### FR-11: Record required Prep work

M1 records server-confirmed outcomes for required Prep Items: Action Items as Done or N/A, Value Items as a value.

**Consequences (testable):**
- Optional Items may remain unresolved.
- Done and N/A remain distinguishable in history.

#### FR-12: Hand off only when required Prep is complete

M1 cannot hand off while any required Prep Item is unresolved. Handoff uses only server-confirmed outcomes.

**Consequences (testable):**
- After a valid handoff, Work Phase is `Needs Re-check` if any Re-check Item exists; otherwise Work Phase is `Awaiting Return` and the Bike Task is unassigned.
- Failed saves never appear as recorded handoff.

### 4.5 Independent M2 sign-off

**Description:** Configured Re-check Items are a second-person attestation. M1 cannot complete them. Realizes UJ-1.

#### FR-13: Route Re-check Items to a different mechanic

After handoff, Re-check Items appear for M2. M2 must be a different authenticated mechanic from that Bike Task's M1.

**Consequences (testable):**
- M1 cannot claim or complete Re-check Items on a Bike Task they handed off.
- There is no same-mechanic override.

#### FR-14: Record a separate M2 attestation

M2 independently resolves applicable Re-check Action Items as Done or N/A and attests applicable Value Items. M1 outcomes do not satisfy M2 work.

**Consequences (testable):**
- M2 can see who M1 was.
- For an M2-enabled Value Item, M2 attests verification against M1's value and does not enter a second value.
- After required Re-check work is complete, Work Phase is `Awaiting Return` and the Bike Task is unassigned.

### 4.6 Reconfirm during active preparation

**Description:** The only first-release source-change behavior is visible reconfirmation while M1 still owns Prep. Realizes UJ-2.

#### FR-15: Flag relevant current-order change during In Prep

If a current-order refresh detects a relevant change while Work Phase is `In Prep`, the Bike Task stays assigned to M1 and is visibly flagged for reconfirmation. Handoff stays blocked until M1 reviews current Booqable context and reconfirms the affected preparation.

**Consequences (testable):**
- The flag is visible on the open Bike Task, not only in a separate inbox.
- Reconfirm is an explicit acknowledge on that Bike Task. It persists actor and time, clears the flag, and does not rewrite or invalidate existing Item outcomes.
- If M1 must change an Item because of the new context, they use the ordinary FR-11 save path before or after acknowledging.
- After reconfirmation, ordinary handoff and M2 rules still apply.
- This FR does not reopen work after handoff, after Re-check, or after Work Phase is `Awaiting Return`.

### 4.7 Manager attention and intervention

**Description:** Managers handle exceptions without blocking valid mechanic completion. Realizes UJ-4.

#### FR-16: Raise, show, and resolve attention

An assigned mechanic or an Admin / Manager can raise Needs Attention on a Bike Task. Managers see those Bike Tasks in the Manager Attention List with the reason and current owner. Resolving attention does not block valid mechanic completion, and an open flag does not prevent `Done` when mechanical work is complete.

**Consequences (testable):**
- Raise is allowed from any Actionable Work Phase. The raiser must pick `missing_or_unclear_bike_order_information` or `manager_decision_needed`.
- A manager can also flag a Bike Task with one of those reasons from the Manager Attention List.
- Raising or resolving Needs Attention does not change Task Outcome by itself.

#### FR-17: Reassign or force-close

An Admin / Manager can reassign an active Bike Task or force-close abandoned work. Every intervention records actor, time, reason, and resulting status.

**Consequences (testable):**
- Reassignment preserves confirmed Item outcomes and attribution.
- `Force-closed` is a terminal Task Outcome distinct from `Done` and `Cancelled`.

### 4.8 Return Check

**Description:** A returned rental reuses the same Bike Task, queue, claim, and checklist machinery with the Return Snapshot. Realizes UJ-3.

#### FR-18: Make returned work claimable

When Booqable marks the rental returned, each associated Actionable Bike Task becomes unassigned `Needs Return Check` and is claimable using Available Now, My Work, and the same ownership rules.

**Consequences (testable):**
- `Cancelled`, `Replaced`, and `Force-closed` Bike Tasks are not return-eligible.
- A Bike Task in `Awaiting Return` enters unassigned `Needs Return Check` only when Booqable marks that rental returned.
- If the Bike Task is still in Prep or Re-check when the rental returns, Return Check becomes the only actionable work; unresolved Prep/Re-check history remains visible.

#### FR-19: Complete the Return Checklist and close Done

One mechanic completes the Return Snapshot with the same Item controls as Prep. Completing required Return Items sets Task Outcome to `Done` with actor and timestamp. Return observations belong in task history.

**Consequences (testable):**
- Return Check has no M2 stage.
- Completion does not require per-item modification acknowledgement.

### 4.9 Attributable history and current-order refresh

**Description:** Trust comes from who did what, and from refreshing current Booqable authority rather than trusting a notification payload. Cross-cuts UJ-1 through UJ-4.

#### FR-20: Persist workshop history

The system persists claim, preparation, re-check, return, attention, reassignment, force-close, Task Outcome, actor, time, and checklist results.

**Consequences (testable):**
- Staff can answer who prepared, re-checked, returned, or intervened on a Bike Task, and when.
- This FR does not require an analytics dashboard.

#### FR-21: Refresh current order on signal and on claim

A Booqable update notification identifies which order changed. A mechanic claim refreshes that order before the claim completes. In both cases the system applies current Booqable authority and does not treat the notification payload as current truth.

**Consequences (testable):**
- Duplicate or delayed notifications do not create duplicate Bike Tasks.
- A claim that cannot refresh current order authority does not silently claim on stale context.

#### FR-22: Keep one shared Notes field

Any mechanic assigned to a Bike Task, and any Admin / Manager, can edit one shared Notes field. The latest value overwrites the previous value and is visible on Prep and Return.

**Consequences (testable):**
- Notes are not the Bike Task identity and are not required to hand off or complete.
- There is no Notes revision history.

## 5. Scope

### 5.1 In scope

- Shipped category-specific Prep and Return templates with per-Item M2 configuration
- Bike Tasks created only from manager-assigned exact stock IDs, categorized by source tag
- Simple cancel / replace handling that preserves history
- Available Now, My Work, claim, resume, and first-writer-wins ownership
- M1 Prep, blocked handoff, and independent M2 sign-off with no override
- Visible reconfirmation when current order changes during `In Prep`
- One latest-value Notes field on the Bike Task
- Manager Attention List, including mechanic- or manager-raised attention, reassignment, and force-close
- `Awaiting Return` as the non-claimable wait after Prep until Booqable marks the rental returned
- Return Check on the same Bike Task and checklist machinery
- Attributable history and current-order refresh on webhook signal and claim
- Tablet-practical mechanic UI with server-confirmed saves

### 5.2 Out of scope

This release will not:

- create provisional or quantity-derived Bike Tasks, Waiting for Bike ID work, or multi-quantity identity/incident models;
- implement replacement-chain algebra, overlap guards, correction successors, or automatic reactivation;
- issue JIT freshness proofs, revoke legacy writers, or add retry workers, reconciliation sweeps, or a rollout/activation control plane;
- interpret accessory tags, configure Setup Category mapping, or selectively invalidate individual Items;
- introduce a Work Cycle model, manager reset, or same-mechanic M2 override;
- build Structured Modifications or an individual Return-acknowledgement engine;
- add tenancy, shop scope, pilot cohorts, or a paper-retirement workflow;
- replace Booqable's rental lifecycle, auto-assign mechanics, or work offline;
- generate checklist Items from accessories, maintain Notes revision history, or integrate Bike Fit;
- provide manager analytics, performance dashboards, or franchise-readiness reporting.

Adoption stays an operating practice: run the feature in the current shop, keep paper as a local fallback until the team is comfortable, and capture evidence before any franchise claim. That practice is not a product feature.

## 6. Success Metrics

**Primary**

- **SM-1 — Paperless preparation:** Mechanics can routinely discover, claim, prepare, hand off, and independently re-check a Bike Task on a tablet without a paper checklist. Validates FR-7 through FR-14.
- **SM-2 — Assigned-bike fidelity:** A Bike Task appears only after an exact stock ID assignment, uses the tag-selected template, and does not duplicate on repeated refresh. Validates FR-4, FR-5, FR-6, and FR-21.

**Secondary**

- **SM-3 — Paperless Return Check:** Mechanics can complete Return Check on the tablet using the same task/checklist machinery. Validates FR-18 and FR-19.
- **SM-4 — Traceable work:** Staff can see who claimed, prepared, re-checked, returned, reassigned, or force-closed each Bike Task and when. Validates FR-16, FR-17, and FR-20.

**Counter-metrics**

- **SM-C1 — Preparation speed:** The tablet flow must not materially slow preparation versus paper.
- **SM-C2 — Preparation quality:** Paperless work must not increase missed required checks.
- **SM-C3 — Mechanic focus:** The tablet must not become the job; physical-bike work stays primary.

## 7. Cross-Cutting Non-Functional Requirements

- **NFR-1 Workshop usability:** The Prep and Re-check flow is practical on a workshop tablet without a parallel paper checklist. Frequent actions are tap-friendly.
- **NFR-2 Form factor:** Mechanic flows support phones and tablets; manager flows also support desktop.
- **NFR-3 Confirmed saves:** Every save, claim, handoff, or outcome transition leaves server-confirmed versus unsaved state unambiguous. Failed saves identify the action, retain typed input while the Bike Task stays open, and never present failed work as recorded.
- **NFR-4 Pending feedback:** Route waits and in-flight mutations show obvious pending state and prevent double submit. Exact visuals are left to UX.
- **NFR-5 Audit integrity:** Attribution remains trustworthy after reassignment, cancellation, replacement, force-close, and attention resolution.
- **NFR-6 Authorized access:** Only authenticated staff; mechanic versus Admin / Manager operations follow existing roles and server-side access rules.
- **NFR-7 Online-only:** No offline mode. NFR-3 covers transient failures while the session remains open.

## 8. Integration and Dependencies

- **Booqable owns:** order lifecycle, assigned StockItem identity, `stock_identifier`, Product/ProductGroup/Bundle tags, rental timing, configuration, and `extra_information`.
- **Workshop Tasks owns:** Bike Tasks, snapshots, Item outcomes, assignment, Needs Attention, Notes, Task Outcome, Work Phase, and audit history.
- The manager assigns the physical bike in Booqable. Workshop Tasks does not invent that assignment.
- Update notifications identify the order only. Current context comes from a refetch of current Booqable authority, including on claim.
- Existing admin authentication and staff roles are the access boundary.

`[ASSUMPTION]` Managers continue to assign the exact stock ID in Booqable as the operating practice before workshop work should exist.
`[ASSUMPTION]` Webhooks identify the changed order well enough to refetch it.
`[ASSUMPTION]` Draft, new, and concept orders stay filtered before workshop work is considered.
`[ASSUMPTION]` Workshop devices normally have a usable network connection.

## 9. Open Questions

1. What should UX show when a reserved order has bikes but no assigned stock ID — nothing, or a manager-facing “unassigned in Booqable” hint that still creates no Bike Task?
2. Which Booqable field changes count as “relevant” for FR-15 beyond an obvious bike/configuration/`extra_information` change?
3. If Return Check starts while Prep was incomplete, how much unfinished Prep context does Tomás need on the Return surface versus history only?

None of these block architecture or the next epic rewrite. Question 2 can default to “any current-order change visible on the Bike Task” until UX and implementation name a tighter list.
