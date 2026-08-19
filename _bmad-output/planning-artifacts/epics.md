---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-echelon-cycling-hub-admin-2026-08-07/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-echelon-cycling-hub-admin-2026-08-10/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-echelon-cycling-hub-admin-2026-08-10/HANDOVER.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-08-18.md
  - _bmad-output/planning-artifacts/ux-designs/ux-echelon-cycling-hub-admin-2026-08-07/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-echelon-cycling-hub-admin-2026-08-07/EXPERIENCE.md
  - _bmad-output/project-context.md
---

# echelon-cycling-hub-admin - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for echelon-cycling-hub-admin, decomposing the compressed Workshop Tasks MVP from the PRD (FR-1..FR-22, NFR-1..NFR-7), UX Design, Architecture (AD-1..AD-19), handover, and AD-19-aligned project context into implementable stories.

PRD `prd.md` is authoritative over its addendum. Architecture and the 2026-08-18 handover supersede UX surfaces that reintroduce retired scope (Waiting for Bike ID, Structured Modifications, same-mechanic M2 override, manager reset, Integration Incident platform, Work Cycles, `Preparation Resolved` as a Work Phase).

## Requirements Inventory

### Functional Requirements

FR-1: An Admin/Manager can create, activate, supersede, and reactivate separate Prep and Return Checklist Templates for e-city, e-road, road, gravel, MTB, and E-MTB. Activating a new version must not rewrite snapshots already copied onto Bike Tasks. (Shipped — Epic 1; retain as coverage, do not rebuild.)

FR-2: For each admin-authored Item, an Admin/Manager can define Action vs Value, required vs optional, whether M1 performs it, and whether M2 independently verifies it. M2-enabled requires M1-enabled. Required Action Items accept Done or N/A; required Value Items require a value and do not offer N/A. (Shipped with templates — Epic 1.)

FR-3: Each Bike Task receives an immutable Prep Snapshot at creation and an immutable Return Snapshot when Return Check becomes actionable, using the then-active Return template for the bike's current valid category. Later template edits must not change in-progress or historical Item outcomes.

FR-4: Create a Bike Task only when a manager has assigned an exact Booqable StockItem to the rental. Draft, new, concept, unassigned, ambiguous, and quantity-only bike lines create no Bike Task. Repeated refresh of the same assigned StockItem must not create a second Bike Task.

FR-5: Select the Bike Task category, and therefore its Prep Snapshot, from exactly one controlled ProductGroup Workshop tag: `workshop-road-bike`, `workshop-e-road-bike`, `workshop-e-city-bike`, `workshop-gravel-bike`, `workshop-mtb-bike`, or `workshop-e-mtb-bike`. Untagged, unknown, multiple, or conflicting Workshop tags create no Bike Task.

FR-6: On rental cancellation, set Task Outcome to `Cancelled`, preserve history, and clear assignment. On a changed exact stock ID, set the prior Bike Task to `Replaced` and create a fresh Bike Task only for the newly assigned StockItem. History stays on the original Bike Task. The same physical bike returning later must not automatically reopen a `Cancelled` or `Replaced` Bike Task.

FR-7: Mechanics can see unassigned claimable Bike Tasks in Available Now and their assigned Bike Tasks in My Work. Available Now includes only `Needs Prep`, `Needs Re-check`, and `Needs Return Check`. My Work includes only the mechanic's currently assigned Bike Tasks and lets the assignee resume at the current unresolved Item. `Awaiting Return` is in neither queue.

FR-8: A mechanic can claim an available Bike Task. Concurrent claims are first-writer-wins. The system does not auto-assign. Claiming `Needs Prep` → `In Prep`; `Needs Re-check` → `In Re-check`; `Needs Return Check` → `In Return Check`. Later claimants see the current owner.

FR-9: Each Bike Task is claimed and progressed independently. Claiming or completing one Bike Task never changes a sibling Bike Task's Work Phase, Task Outcome, or owner. Two bikes on the same order can be `In Prep` at the same time for different mechanics.

FR-10: The Bike Task shows human-readable `stock_identifier`, current category, and current Booqable rental context needed to prepare that bike, including manager-authored `extra_information` when present. Context comes from the last successful current-order refresh, never from a webhook payload. M1 can confirm the physical bike without using Booqable as the primary work surface.

FR-11: M1 records server-confirmed outcomes for required Prep Items: Action Items as Done or N/A, Value Items as a value. Optional Items may remain unresolved. Done and N/A remain distinguishable in history.

FR-12: M1 cannot hand off while any required Prep Item is unresolved. Handoff uses only server-confirmed outcomes. After a valid handoff, Work Phase is `Needs Re-check` if any Re-check Item exists; otherwise Work Phase is `Awaiting Return` and the Bike Task is unassigned. Failed saves never appear as recorded handoff.

FR-13: After handoff, Re-check Items appear for M2. M2 must be a different authenticated mechanic from that Bike Task's recorded M1. M1 cannot claim or complete Re-check Items on a Bike Task they handed off. There is no same-mechanic override.

FR-14: M2 independently resolves applicable Re-check Action Items as Done or N/A and attests applicable Value Items against M1's confirmed value without entering a second value. M1 outcomes do not satisfy M2 work. M2 can see who M1 was. After required Re-check work is complete, Work Phase is `Awaiting Return` and the Bike Task is unassigned.

FR-15: If a current-order refresh detects a relevant change while Work Phase is `In Prep`, the Bike Task stays assigned to M1 and is visibly flagged for reconfirmation. Handoff stays blocked until M1 reviews current Booqable context and explicitly acknowledges the displayed generation. Acknowledgement persists actor and time, clears only that obligation, and does not rewrite or invalidate existing Item outcomes. Item changes use the ordinary FR-11 save path. This FR does not reopen work after handoff, after Re-check, or after `Awaiting Return`.

FR-16: An assigned mechanic in an Actionable phase, or an Admin/Manager, can raise Needs Attention. The raiser must pick `missing_or_unclear_bike_order_information` or `manager_decision_needed`. Managers see open records in the Manager Attention List with reason and current owner. Raising or resolving attention does not change Task Outcome by itself and does not block valid mechanic completion or `Done`.

FR-17: An Admin/Manager can reassign an active Bike Task or force-close abandoned work. Every intervention records actor, time, reason, and resulting status. Reassignment preserves confirmed Item outcomes and attribution. `Force-closed` is a terminal Task Outcome distinct from `Done` and `Cancelled`.

FR-18: When Booqable marks the rental returned, each associated Actionable Bike Task becomes unassigned `Needs Return Check` and is claimable with the same ownership rules. `Cancelled`, `Replaced`, and `Force-closed` Bike Tasks are not return-eligible. A Bike Task in `Awaiting Return` enters `Needs Return Check` only when that rental is returned. If the Bike Task is still in Prep or Re-check when the rental returns, Return Check becomes the only actionable work; unresolved Prep/Re-check history remains visible.

FR-19: One mechanic completes the Return Snapshot with the same Item controls as Prep. Completing required Return Items sets Task Outcome to `Done` with actor and timestamp. Return Check has no M2 stage and no per-item modification acknowledgement. Return observations belong in task history.

FR-20: Persist claim, preparation, re-check, return, attention, reassignment, force-close, Task Outcome, actor, time, and checklist results so staff can answer who prepared, re-checked, returned, or intervened, and when. No analytics dashboard is required.

FR-21: A Booqable update notification identifies which order changed. A mechanic claim refreshes that order before the claim completes. Both paths apply current Booqable authority and do not treat the notification payload as current truth. Duplicate or delayed notifications must not create duplicate Bike Tasks. A claim that cannot refresh current order authority must not silently claim on stale context.

FR-22: Any mechanic assigned to a Bike Task, and any Admin/Manager, can edit one shared Notes field. The latest value overwrites the previous value and is visible on Prep and Return. Notes are not Bike Task identity, are not required to hand off or complete, and have no revision history.

### NonFunctional Requirements

NFR-1: The Prep and Re-check flow is practical on a workshop tablet without a parallel paper checklist. Frequent actions are tap-friendly.

NFR-2: Mechanic flows support phones and tablets; manager flows also support desktop.

NFR-3: Every save, claim, handoff, or outcome transition leaves server-confirmed versus unsaved state unambiguous. Failed saves identify the action, retain typed input while the Bike Task stays open, and never present failed work as recorded.

NFR-4: Route waits and in-flight mutations show obvious pending state and prevent double submit.

NFR-5: Attribution remains trustworthy after reassignment, cancellation, replacement, force-close, and attention resolution.

NFR-6: Only authenticated staff. Mechanic versus Admin/Manager operations follow existing roles and server-side access rules. Partners receive no Workshop state.

NFR-7: No offline mode. Transient failures while the session remains open are covered by NFR-3. Client storage may hold unsaved input only for the open session and must not queue or replay commands.

### Additional Requirements

Brownfield / no starter template:

- This is a brownfield feature inside the existing Next.js 16 / Supabase / Subframe admin hub. There is no greenfield starter-template story.
- Epic 1 (templates) and Epic 2 Stories 2.1–2.10 (canonical Booqable projection) are shipped and frozen. Do not rebuild them.
- Recommended delivery order from the handover: live wiring → manager-assigned Bike Tasks → mechanic workflow → active-Prep reconfirmation → manager intervention → Return Check.

Live wiring and Booqable boundary (AD-1, AD-3, AD-4, AD-14..AD-17, FR-21):

- One canonical fetch-and-apply path for webhook signals and task claims: identify the order, refetch through `src/lib/booqable/canonical-adapter.ts`, apply `apply_canonical_order_graph`.
- Preserve `sync.ts`, existing brownfield consumers, and the source-envelope contract. Do not add a second projection, source writer, durable retry/recovery system, or workflow logic in Next.js.
- Until the live-wiring story is implemented and verified, the production webhook's documented legacy path remains `sync.ts`.
- Failed webhook: log with contextual prefix and return retryable failure. Failed claim: `{ ok: false, error }` and no claim. Bounded synchronous transport retries and explicit user resubmission of the original claim are allowed inside the route budget.
- Before activating live wiring, record the actual Vercel execution model and bind a route-level total deadline for fetch, bounded retry, normalization, and apply. Preview ingestion stays denied at runtime.
- `npm run contracts:check` must stay green. Do not extend envelope semantics, add codegen, or wire `db:types` into an app consumer.
- Sandbox `GET /api/sandbox/booqable/sync-orders` remains a documented exception: refetch through `sync.ts` only; never directly repair source/task rows.

Task identity and derivation (AD-5, AD-13):

- Task identity is one Booqable rental/order plus one exact opaque StockItem ID. Never infer from titles, quantity, array position, Planning ID, or `stock_identifier`.
- `apply_canonical_order_graph` invokes one service-only internal Workshop derivation function in the same transaction for an accepted `applied` result. Missing active template, ambiguous association, duplicate StockItem association, or derivation error returns a typed failure and rolls back both canonical and task mutation.
- Order cancellation wins over assignment changes and suppresses successor creation. Removal without replacement → `Cancelled`. Different assigned StockItem → prior `Replaced` plus a fresh task. A formerly Cancelled or Replaced StockItem reappearing in the same rental creates no new task.
- Source cancellation, removal, or replacement never overwrites `Force-closed` or `Done`. After Force-close, an uncancelled different exact assignment may create its own fresh task; a post-Done source discrepancy only records the source fact.
- One StockItem associated with more than one admitted bike in a rental fails closed with no task mutation. A fresh replacement task has no copied attention and is discovered only through normal queue reads; no successor ID or traversal link.
- Bundle `workshop-*-bike-bundle` tags must agree with the ProductGroup bike tag. Tags classify category only. Invalid tags on an existing task: cancellation or exact-assignment-removal still wins; every other source apply returns a typed failure, leaves last accepted context/snapshot unchanged, and writes one deduplicated system history event.

Lifecycle and concurrency (AD-6, AD-7, AD-9, AD-15):

- Task Outcome: `Actionable`, `Cancelled`, `Replaced`, `Force-closed`, `Done`. Actionable Work Phase: `Needs Prep`, `In Prep`, `Needs Re-check`, `In Re-check`, `Awaiting Return`, `Needs Return Check`, `In Return Check`.
- Successful Prep resolution (handoff with no M2 Items, or M2 completion) clears assignment, advances revision, records history, and enters non-claimable `Awaiting Return`. Manager detail may expose phase, attention, and force-close only.
- A task first created from an already-returned rental snapshots both active Prep and Return templates and begins unassigned `Needs Return Check`.
- In one source apply, `Cancelled` / `Replaced` / `Force-closed` take precedence over Return. Otherwise a returned Actionable task atomically clears any Prep/Re-check owner, creates one Return Snapshot for the current valid category, records interrupted phase/owner, and becomes unassigned `Needs Return Check`. Repeated returned refreshes are no-ops.
- M1 is the authenticated actor of the accepted Prep handoff. Reassigned Prep work may be completed by its new assignee, whose accepted handoff fixes M1 and the M2 exclusion identity.
- Claims: refetch-and-apply first, then lock/re-read and conditionally claim the displayed task. A `Needs Re-check` claim requires the actor differ from recorded M1. Return exactly one of: claimed target; target transitioned; target unavailable/unauthorized; refresh failed. Never silently claim or redirect.
- User commands require the owner/phase predicate. Use task and evidence revisions; never accept stale work silently. Notes use their own expected revision plus current owner/phase authorization.

Mutations, reads, and security (AD-2, AD-8, AD-11, AD-12, AD-18):

- All staff mutations are `withAuth` adapters over named database RPCs. Canonical source apply is the one service-only exception.
- Workshop users read RLS-protected views/read RPCs. Partners receive no Workshop state. Task context exposes only task-scoped operational fields, never contact/demographic PII.
- Available Now, My Work, Manager Attention, task detail, confirmed progress, and history come from database views/read RPCs. Loaders return data plus `error`. Queue filters, search, and pagination use URL parameters.
- One repository-owned task-context shape: stock identifier, category, rental timing, configuration, `extra_information`, current reconfirmation generation, Notes, and current task state. History event types are stable `snake_case`.
- Workshop-owned database objects use `workshop_`. Routes live in `src/app/workshop`; feature code in `src/lib/workshop-tasks`; Booqable translation in `src/lib/booqable`.
- Apply migrations locally only; CI is the staging/production path. Idempotent DDL; drop-then-create RLS policies.

Attention and Notes (AD-10):

- One open Needs Attention record per `(task, reason)`. Reason is immutable. Only the two PRD mechanic reasons are in scope. An open record remains open through reassignment, Return, and terminal outcomes until an attributable manager resolution.
- Reassignment cannot assign a Re-check phase to recorded M1. In `In Prep`, the new owner must satisfy any open reconfirmation obligation. Force-close is permitted in any Actionable phase including `Awaiting Return` and requires a manager-supplied reason.

Proof gates (handover):

- Canonical/contracts: `npm run contracts:check`.
- Database changes: idempotent migration, local verification, and pgTAP for the affected transaction, authorization, revision, and history path.
- Live wiring: prove webhook and claim use the canonical path while `sync.ts` and brownfield readers remain unchanged.
- Concurrency: prove first-writer-wins claims and that M1 cannot claim Re-check.
- Source transitions: prove cancellation/removal/replacement/Return precedence, invalid-tag handling, and `Force-closed`/`Done` preservation.
- UI: prove server-confirmed pending/error behavior on phone/tablet mechanic flows and desktop manager flows.

Explicit non-goals (PRD 5.2, AD-19, handover):

- Do not reintroduce provisional or multi-quantity task identity, Waiting for Bike ID, replacement-chain traversal, automatic reactivation, signed freshness proofs, selective Item invalidation, Work Cycles, same-mechanic M2 override, Structured Modifications, individual Return acknowledgements, tenancy, cohorts, paper-retirement automation, analytics dashboards, accessory-tag interpretation, Setup Category mapping, manager reset, Notes revision history, Bike Fit integration, retry workers, reconciliation sweeps, new repair APIs, or a rollout control plane.

### UX Design Requirements

In-scope visual and interaction work. Final PRD/AD behavior wins where the 2026-08-07 UX spines still describe retired product scope.

UX-DR1: Inherit the existing Subframe admin shell, Geist typography, amber brand, white/slate surfaces, teal success, and red error. Do not create a separate workshop-console identity, dark industrial theme, gradients, blur, or hover-lift state signaling.

UX-DR2: Implement the Workshop token delta from `DESIGN.md`: glare-resistant solid surfaces; `{colors.brand-strong}` + `{colors.text-on-strong}` for primary lifecycle controls; `{colors.brand-soft}` / `{colors.attention-border}` for attention; `{colors.error-*}` only for failed saves, destructive consequences, and the FR-15 reconfirmation notice; `{colors.success-*}` only after server confirmation. Color never bears state alone — always pair with label, border, icon, or structure.

UX-DR3: Use `{typography.heading-1}` for the route title only, `{typography.heading-2}` for major queues or the active Bike Task, `{typography.heading-3}` for cards/groups/panels, `{typography.mechanic-control}` (16px/500) for frequent mechanic controls. Do not shrink control text to fit; labels may wrap. Uppercase is limited to short state/source labels.

UX-DR4: Frequent mechanic controls are large, forgiving, tile-sized surfaces validated for mounted tablets in landscape and portrait under glove and glare. Do not reuse compact generated controls for Done, N/A, Claim, Handoff, or Complete. No hover-only controls, precision gestures, swipe-only actions, drag-to-complete, whole-tile state cycling, or long-press commands.

UX-DR5: Mechanic Dashboard landscape uses two strictly equal panels: My Work and Available Now. Portrait and phone stack My Work before Available Now with the same card facts. Do not use tabs or make one queue visually subordinate.

UX-DR6: Implement `workshop-task-card`: bike identity (`stock_identifier`), order/client, rental dates, Work Phase, assignee, confirmed progress, and one large phase-named action (Claim Prep, Continue Prep, Claim Re-check, Claim Return Check). Bike, phase, and action have comparable visual weight. Compose `attention-strip` when Needs Attention is open and `configuration-change-notice` when FR-15 reconfirmation is outstanding. No Waiting for Bike ID card and no claim action on `Awaiting Return`.

UX-DR7: Implement `attention-strip`: full-width amber strip, 2px border, explicit “Needs Attention” label, and the short reason. Loud context, not a badge and not a blocking overlay. Visible on the working Bike Task; the all-open queue is manager-only.

UX-DR8: Implement `configuration-change-notice` for FR-15 only: full-width, first in Bike Task reading order, names that current order context changed and that handoff is blocked until explicit reconfirmation. Not dismissible and not toast-only. Do not treat it as selective Item invalidation or as a reopen-to-Needs-Prep engine after handoff/Re-check/`Awaiting Return`.

UX-DR9: Implement `task-context-panel` with one repository-owned context shape: `stock_identifier`, read-only source category, rental timing, configuration, current `extra_information`, Notes, current reconfirmation generation, and current task state. Booqable-owned values are read-only. `No` / unselected setup values remain fully visible. Do not expose contact/demographic PII.

UX-DR10: Implement `checklist-group` as always-visible groups in one continuous scroll. Two columns only when both remain readable; otherwise one column. No accordions, carousels, or hidden-by-default required context.

UX-DR11: Implement `action-item-tile`: two side-by-side tile-sized Done and N/A controls. One tap begins immediate save; pending prevents a second submission. Selected appearance uses success surface, border, label, and icon. M2 outcomes are fresh attestations and are not pre-satisfied by M1.

UX-DR12: Implement `value-item-tile`: large field, optional unit, local save feedback, no N/A. Becomes Unsaved on change; auto-saves after roughly two seconds idle; blur, Enter, route-leave intent, Handoff, or Complete flushes immediately. M2 attests M1's value and does not enter a second value. Typed content stays visually distinct from confirmed content.

UX-DR13: Implement `item-save-status` in every checklist Item: Unsaved, Saving, Saved, or Retry. Saved appears only after server confirmation. Error copy names the Item/action; Retry stays adjacent to the failed Item. Failed Value Item saves retain the typed value while the Bike Task stays open. Reopening the route shows authoritative persisted data.

UX-DR14: Implement `sticky-lifecycle-bar`: persistent bottom bar with confirmed-only progress and the current Handoff/Complete action using `{colors.brand-strong}`. Activating Handoff/Complete before requirements are complete scrolls to and emphasizes the first unresolved required Item instead of hiding the action. Focus must remain visible above the sticky bar.

UX-DR15: Implement `lifecycle-confirmation-panel`: short modal that names the resulting Work Phase (`Needs Re-check`, `Awaiting Return`, or `Done`) before Handoff or Complete. One primary and one cancel action; confirm becomes pending and non-repeatable; success is shown only from the server-confirmed result.

UX-DR16: Implement `previous-information-drawer` as a one-level secondary drawer for previous `extra_information`. Current authoritative text remains visible; the drawer is not a competing task view.

UX-DR17: Implement `manager-queue-row` for the Manager Attention List: entire row is the target, chevron-ended, showing bike/order, rental timing, reason, requester, and age. Sorted by nearest rental start. No inline decision controls. Opens Manager Attention Detail. Do not add a Waiting for Bike ID manager queue.

UX-DR18: Implement `attention-resolution-panel` as the first block on Manager Attention Detail. Reason and required resolution control precede full Bike Task information. The two MVP reasons require a short resolution note; failed save retains the note. Do not implement Approve/Decline for a same-mechanic Re-check override.

UX-DR19: Implement `manager-action-confirmation-panel` for reassignment, force-close, and template activate/supersede/reactivate. State the exact assignment, history, and lifecycle consequence before submission. Destructive actions use error border/text and are never optimistic. Do not implement manager reset.

UX-DR20: Keep shipped template library/editor visuals aligned with `template-version-row` and `template-editor`: phase, category, version, and active/superseded state remain visible; activation confirmation states that only future snapshots change; M2-enabled requires M1-enabled; no Setup Category coverage gate; no category-classification or source-tag approval screen.

UX-DR21: Implement `activity-timeline` as a read-only chronological list with actor/system, time, event verb, and affected phase/Item. Markers never encode event type by color alone. Cover claims, assignment/reassignment, Item outcomes, handoff, reconfirmation, attention raise/resolve, cancellation, replacement, Return transition, force-close, and Done. No action buttons.

UX-DR22: Implement `terminal-task-panel` for `Done`, `Cancelled`, `Replaced`, and `Force-closed`: names the outcome, explains why work stopped, removes mutation controls, preserves read-only context/history, and offers return to Mechanic Dashboard. A `Replaced` panel does not send the mechanic into a successor task.

UX-DR23: Bike Task Detail uses one route whose work area changes by authoritative phase (Prep, Re-check, Return Check). Reading order is notices, identity/current context, checklist, then progress/lifecycle action, including when landscape splits context and checklist.

UX-DR24: Empty is distinct from failed on every list surface. Mechanic Dashboard empty copy is “No assigned work” / “No work available now.” Load failures use in-context error plus Retry and never render as an empty queue. Cold route transitions provide orientation-preserving loading feedback.

UX-DR25: Claims show pending in place on the card. A losing claimant sees the current assignee and a refreshed queue; no optimistic ownership remains. If ownership or lifecycle changes on an open screen, reject stale saves/transitions, preserve typed input long enough to explain the authoritative state, then offer retry/reload.

UX-DR26: Microcopy is operational, short, literal, and non-celebratory. Use phase-named actions (“Claim Prep”, “Handoff to Re-check”, “Complete Return Check”). Failed-save copy names the action and that input is still there. Terminal copy names the outcome and next action. Do not use “Continue”, “Submit”, “All done!”, or “Changes will sync later.”

UX-DR27: Responsive behavior: landscape tablet / wide desktop keeps equal mechanic queues and a narrower context column beside a wider checklist; portrait tablet stacks My Work then Available Now and orders notices → context → checklist; phone is single-column with full-width actions. Manager flows prioritize desktop/tablet density while remaining usable at supported narrower widths.

UX-DR28: Accessibility floor: high-contrast glare-readable non-color-only state; visible `{colors.focus-ring}`; host-app accessible primitives for keyboard and AT; adjacent Done/N/A separation for gloves; no timer-dismissed critical feedback; honor reduced-motion. Formal WCAG measurement is implementation validation, not a certified product promise in the UX spine.

UX-DR29: Overlay stacking is one level only (`lifecycle-confirmation-panel`, `manager-action-confirmation-panel`, `previous-information-drawer`). Toasts are supplemental; Booqable-change, attention, read/mutation failure, stale ownership, and terminal states remain in context.

#### Superseded UX — do not implement

These appear in the 2026-08-07 UX spines and are retired by the 2026-08-18 PRD, AD-19, and handover. Listed so stories do not reimport them.

- Waiting for Bike ID as a visible non-claimable mechanic queue item or a separate manager work category that opens Booqable.
- `Preparation Resolved` as a Work Phase; use `Awaiting Return`.
- Work Cycle model; reopen-to-Needs-Prep after handoff, Re-check, or completed preparation; selective Item invalidation / “Reopened” group engine.
- `structured-modification-card` and individual Return Addressed acknowledgements.
- `found-and-fixed-record` as a third attention family.
- Same-mechanic Re-check override request / Approve / Decline.
- Manager reset.
- Integration Incident platform or a source-tag approval screen.
- Accessory-tag interpretation UI, Setup Category mapping, or a coverage gate on template activation.
- `last-touched-summary` same-`stock_identifier` cross-rental lookup (UX-only placement assumption; not in the PRD context contract).

### FR Coverage Map

FR-1: Epic 1 — Maintain Prep and Return templates (shipped)
FR-2: Epic 1 — Configure Item type and second-mechanic requirement (shipped)
FR-3: Epic 3 — Prep Snapshot at task creation; Epic 8 completes Return Snapshot
FR-4: Epic 3 — Create a Bike Task only after an exact stock ID
FR-5: Epic 3 — Select the template from the source category tag
FR-6: Epic 3 — Replace or cancel assigned work simply
FR-7: Epic 5 — Show Available Now and My Work
FR-8: Epic 5 — Claim with one owner
FR-9: Epic 5 — Keep bikes independently actionable
FR-10: Epic 5 — Show current rental context on the Bike Task
FR-11: Epic 5 — Record required Prep work
FR-12: Epic 5 — Hand off only when required Prep is complete
FR-13: Epic 5 — Route Re-check Items to a different mechanic
FR-14: Epic 5 — Record a separate M2 attestation
FR-15: Epic 5 — Flag relevant current-order change during In Prep
FR-16: Epic 4 — Raise, show, and resolve attention
FR-17: Epic 4 — Reassign or force-close
FR-18: Epic 8 — Make returned work claimable
FR-19: Epic 8 — Complete the Return Checklist and close Done
FR-20: Epic 5 — Persist workshop history; Epics 4 and 8 add their events
FR-21: Epic 2 — Refresh current order on signal and on claim
FR-22: Epic 5 — Keep one shared Notes field

## Epic List

### Epic 1: Category-specific checklist standards
Managers maintain versioned Prep and Return templates per bike category, including Item type and M2 configuration. Already shipped; later epics snapshot these templates.
**FRs covered:** FR-1, FR-2
**Status:** done

### Epic 2: Current-order refresh on signal and claim
The shop works from current Booqable authority. A notification identifies an order only; webhook and claim refetch through the canonical adapter and apply `apply_canonical_order_graph`.
**FRs covered:** FR-21

### Epic 3: Tasks from manager-assigned bikes
When a manager assigns an exact stock ID in Booqable, one Bike Task exists with the tag-selected Prep Snapshot. Cancel and replace stay simple; history stays on the original task.
**FRs covered:** FR-3 (Prep Snapshot), FR-4, FR-5, FR-6

### Epic 5: Prepare, verify, and reconfirm a bike
Mechanics find work, claim one bike, complete required Prep, hand off to a different M2, and reach `Awaiting Return`. If Booqable changes during `In Prep`, the assignee reconfirms current context without losing existing Item outcomes. Notes, confirmed saves, and attributable history live on that Bike Task.
**FRs covered:** FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-13, FR-14, FR-15, FR-20, FR-22

### Epic 4: Clear exceptions without blocking ordinary work
Managers see Needs Attention, reassign stuck work, or force-close abandoned Bike Tasks. Ordinary mechanic completion does not wait on that resolution.
**FRs covered:** FR-16, FR-17

### Epic 8: Return Check on the same bike
When Booqable marks the rental returned, a mechanic claims the same Bike Task, works the Return Snapshot, and closes `Done`.
**FRs covered:** FR-3 (Return Snapshot), FR-18, FR-19

**Delivery order:** Epic 1 (done) → Epic 2 → Epic 3 → Epic 5 → Epic 4 → Epic 8. No Epic 6, 7, or 9.

## Epic 1: Category-specific checklist standards

Managers maintain versioned Prep and Return templates per bike category, including Item type and M2 configuration. Already shipped; later epics snapshot these templates.

**FRs covered:** FR-1, FR-2
**Status:** done

### Story 1.1: Browse governed Workshop checklist templates

As an Admin / Manager,
I want to browse Prep and Return checklist versions by bike category,
So that I can see which template is active before workshop work uses it.

**Acceptance Criteria:**

**Given** I am an authenticated Admin or Manager
**When** I open the Checklist Template Library
**Then** I see versions for Prep and Return across e-city, e-road, road, gravel, MTB, and E-MTB
**And** active versus superseded state is visible in text
**And** mechanics and partners cannot access the library

### Story 1.2: Create a draft checklist version

As an Admin / Manager,
I want to create a draft checklist version,
So that I can edit a future standard without changing live Bike Task snapshots.

**Acceptance Criteria:**

**Given** I am on the Template Library
**When** I create a new version for a phase and category
**Then** the new version is a Draft
**And** any already-active version is unchanged

### Story 1.3: Configure draft checklist items

As an Admin / Manager,
I want to define each Item's type, required flag, M1, and M2 settings,
So that Bike Tasks later snapshot a complete checklist.

**Acceptance Criteria:**

**Given** I am editing a Draft
**When** I add or update Items
**Then** I can set Action or Value, required or optional, M1, and M2
**And** M2-enabled requires M1-enabled
**And** required Action Items accept Done or N/A; required Value Items require a value and do not offer N/A
**And** missing Setup Category coverage does not block save

### Story 1.4: Activate an immutable template version

As an Admin / Manager,
I want to activate a Draft as the current standard,
So that only future Bike Task snapshots use it.

**Acceptance Criteria:**

**Given** a structurally valid Draft
**When** I confirm Activate
**Then** that version becomes Active and any prior Active for that pairing becomes Superseded atomically
**And** existing Bike Task snapshots are not rewritten
**And** stale concurrent activate is rejected without creating two Actives

### Story 1.5: Reactivate and review template history

As an Admin / Manager,
I want to reactivate a superseded version and review version history,
So that I can restore a known standard without losing the audit trail.

**Acceptance Criteria:**

**Given** a Superseded version
**When** I confirm Reactivate
**Then** it becomes the Active version and the previous Active is Superseded
**And** version history remains readable
**And** only future snapshots change

## Epic 2: Current-order refresh on signal and claim

The shop works from current Booqable authority. A notification identifies an order only; webhook and claim refetch through the canonical adapter and apply `apply_canonical_order_graph`.

**FRs covered:** FR-21

Stories 2.1–2.6, 2.9, and 2.10 are frozen and done. Old 2.11–2.14 are retired. Headings below keep shipped work in sprint tracking.

### Story 2.1: Contain existing integration security risks

Shipped — frozen. Do not rebuild.

### Story 2.2: Upgrade to a supported application runtime

Shipped — frozen. Do not rebuild.

### Story 2.3: Pin the node and database toolchain

Shipped — frozen. Do not rebuild.

### Story 2.4: Define versioned source envelopes and result semantics

Shipped — frozen. Do not rebuild.

### Story 2.5: Expand the canonical Booqable projection

Shipped — frozen. Do not rebuild.

### Story 2.6: Preserve brownfield projection consumers

Shipped — frozen. Do not rebuild.

### Story 2.9: Apply canonical source state atomically

Shipped — frozen. Do not rebuild.

### Story 2.10: Seed and validate workshop source data

Shipped — frozen. Do not rebuild.

### Story 2.11: Wire authoritative source refresh to the webhook and task claim

As the workshop,
I want webhook signals and task claims to refetch current Booqable authority through the canonical adapter and apply it,
So that Bike Tasks never treat a notification body as truth and never claim on stale local source.

**Acceptance Criteria:**

**Given** a valid Booqable webhook for an existing order
**When** the route handles the signal
**Then** it uses the payload only to identify the order and filter `new`/`concept` ghosts
**And** it refetches through `canonical-adapter.ts` and invokes `apply_canonical_order_graph`
**And** it does not call `syncBooqableOrder` / `sync.ts`

**Given** a duplicate, delayed, or out-of-order signal for the same order
**When** it is processed successfully
**Then** apply is idempotent
**And** no second Bike Task is created for the same rental plus StockItem

**Given** fetch, normalize, or apply fails
**When** the webhook finishes
**Then** it logs with a contextual prefix and returns a retryable failure
**And** it does not write a partial Workshop task mutation

**Given** a mechanic claim request for a displayed Bike Task
**When** the claim starts
**Then** it runs the same fetch-and-apply path before any claim mutation
**And** a failed refresh returns `{ ok: false, error }` and does not claim
**And** a source transition during refresh is returned explicitly and is not silently rebased

**Given** the live-wiring change
**When** `npm run contracts:check` and brownfield consumer tests run
**Then** they stay green
**And** `sync.ts`, named brownfield readers, and the sandbox `sync-orders` route still use `sync.ts`
**And** no freshness-proof protocol, retry worker, queue, sweep, new repair API, or rollout control plane is added

**Given** production activation
**When** the route budget is enforced
**Then** the actual Vercel execution model is recorded
**And** fetch, bounded retry, normalize, and apply fail fast inside that total deadline
**And** preview ingestion stays denied

## Epic 3: Tasks from manager-assigned bikes

When a manager assigns an exact stock ID in Booqable, one Bike Task exists with the tag-selected Prep Snapshot. Cancel and replace stay simple; history stays on the original task.

**FRs covered:** FR-3 (Prep Snapshot), FR-4, FR-5, FR-6

### Story 3.1: Create tasks from manager-assigned bikes

As a manager who assigned a physical bike in Booqable,
I want Workshop Tasks to create one Bike Task for that exact stock ID,
So that mechanics can later claim real assigned work and never see guessed bikes.

**Acceptance Criteria:**

**Given** a reserved rental with one exact assigned StockItem and exactly one valid ProductGroup Workshop tag
**When** `apply_canonical_order_graph` accepts `applied`
**Then** one Bike Task is created, keyed by that rental plus the opaque StockItem ID
**And** it copies the active Prep Snapshot for that category
**And** a creation history event records system source, rental, StockItem, category/template, and resulting phase
**And** Work Phase is `Needs Prep`, or `Needs Return Check` if the rental is already returned (both Prep and Return snapshots)

**Given** draft, new, concept, unassigned, ambiguous, or quantity-only bike lines
**When** the same apply runs
**Then** no Bike Task is created

**Given** untagged, unknown, multiple, or conflicting Workshop tags, or a disagreeing bundle tag
**When** apply runs
**Then** no Bike Task is created
**And** the apply returns a typed failure and rolls back canonical plus task mutation

**Given** a missing active template, ambiguous association, or the same StockItem on more than one admitted bike
**When** derivation runs
**Then** both source and task writes roll back
**And** no empty or claimable task remains

**Given** a repeated refresh of the same assigned StockItem
**When** apply succeeds again
**Then** no second Bike Task is created

### Story 3.2: Replace or cancel assigned work simply

As the workshop,
I want cancellation and a changed stock ID to close the old Bike Task and create a fresh one only for a new exact assignment,
So that history stays on the original bike and we never invent replacement-chain algebra.

**Acceptance Criteria:**

**Given** an Actionable Bike Task
**When** Booqable cancels the rental
**Then** Task Outcome is `Cancelled`, assignment is cleared, and history is preserved
**And** no successor task is created

**Given** an Actionable Bike Task
**When** the exact assigned StockItem is removed with no replacement
**Then** Task Outcome is `Cancelled`, assignment is cleared, and history is preserved

**Given** an Actionable Bike Task
**When** a different exact StockItem is assigned
**Then** the prior task is `Replaced` and keeps its history
**And** a fresh Bike Task is created for the new StockItem with a new Prep Snapshot and no copied attention
**And** no command returns a successor ID or traversal link

**Given** a `Cancelled` or `Replaced` StockItem that reappears on the same rental
**When** apply runs
**Then** no new Bike Task is created for that StockItem

**Given** a `Force-closed` or `Done` Bike Task
**When** source cancellation, removal, or replacement arrives
**Then** that outcome is not overwritten
**And** after Force-close, a different uncancelled exact assignment may create its own fresh task
**And** a post-Done source discrepancy only records the source fact

**Given** this story
**When** it is implemented
**Then** there is no provisional identity, replacement-chain traversal, automatic reactivation, overlap guard, or correction successor

## Epic 5: Prepare, verify, and reconfirm a bike

Mechanics find work, claim one bike, complete required Prep, hand off to a different M2, and reach `Awaiting Return`. If Booqable changes during `In Prep`, the assignee reconfirms current context without losing existing Item outcomes. Notes, confirmed saves, and attributable history live on that Bike Task.

**FRs covered:** FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-13, FR-14, FR-15, FR-20, FR-22

### Story 5.1: Mechanic work queue and claim

As a mechanic,
I want Available Now and My Work, and to claim one Bike Task,
So that I can pick up a real assigned bike without fighting another mechanic for it.

**Acceptance Criteria:**

**Given** unassigned `Needs Prep`, `Needs Re-check`, and `Needs Return Check` tasks
**When** I open Mechanic Dashboard
**Then** they appear in Available Now
**And** `Awaiting Return`, `Cancelled`, `Replaced`, `Force-closed`, and `Done` do not
**And** landscape shows My Work and Available Now as equal panels; portrait/phone stacks My Work first

**Given** Bike Tasks assigned to me
**When** I open My Work
**Then** I see only my current assignments
**And** I can resume at the current unresolved Item
**And** `Awaiting Return` is not in My Work

**Given** two bikes on the same order
**When** I claim one
**Then** the sibling's phase, outcome, and owner are unchanged
**And** another mechanic can hold the sibling `In Prep` at the same time

**Given** an available Bike Task and a live session
**When** I tap a phase-named Claim (Claim Prep / Claim Re-check / Claim Return Check)
**Then** Story 2.11's fetch-and-apply runs first
**And** a successful claim is first-writer-wins and moves phase to `In Prep` / `In Re-check` / `In Return Check`
**And** the losing claimant sees the current owner and a refreshed queue with no optimistic ownership
**And** M1 cannot claim `Needs Re-check` on a task they handed off

**Given** a load or claim failure
**When** the dashboard or card finishes
**Then** empty copy is distinct from Retry error
**And** failed claim is never shown as claimed
**And** a terminal/replaced result after refresh uses `terminal-task-panel` and does not claim

### Story 5.2: Context, Notes, M1 Prep, and handoff

As M1 at the bike,
I want current rental context, Notes, and a confirmed Prep checklist,
So that I can finish required work and hand off without a paper list or treating unsaved taps as done.

**Acceptance Criteria:**

**Given** I own a Bike Task in `In Prep`
**When** I open Bike Task Detail
**Then** `task-context-panel` shows `stock_identifier`, source category, rental timing, configuration, current `extra_information`, Notes, and current task state
**And** context comes from the last successful refresh, not a webhook body
**And** Booqable-owned values are read-only; `No` / unselected setup values stay visible
**And** contact/demographic PII is not shown
**And** reading order is notices, context, checklist, then the sticky lifecycle bar

**Given** I am the assigned mechanic, or an Admin/Manager
**When** I save Notes
**Then** the latest value overwrites the previous value and is visible on Prep
**And** Notes are not required to hand off
**And** a stale Notes revision is rejected with the authoritative value
**And** there is no Notes revision history

**Given** a required Action Item
**When** I tap Done or N/A
**Then** save starts immediately and pending blocks a second submit
**And** Saved appears only after the server confirms
**And** Done and N/A stay distinguishable in history

**Given** a required Value Item
**When** I change the value
**Then** the tile shows Unsaved, auto-saves after about two seconds idle, and flushes on blur, Enter, route-leave, or Handoff
**And** there is no N/A control
**And** a failed save keeps the typed value while the task stays open and offers Retry

**Given** optional Items
**When** I hand off
**Then** they may remain unresolved

**Given** any required Prep Item still unsaved, pending, or failed
**When** I activate Handoff
**Then** the first unresolved required Item scrolls into view
**And** no handoff is recorded

**Given** every required Prep Item is server-confirmed
**When** I confirm Handoff in `lifecycle-confirmation-panel`
**Then** the panel names `Needs Re-check` if any Re-check Item exists, otherwise `Awaiting Return`
**And** assignment is cleared, revision advances, and history is written
**And** a failed save never appears as handoff

**Given** `previous extra_information` exists
**When** I open `previous-information-drawer`
**Then** current authoritative text remains visible
**And** the drawer does not replace it

### Story 5.3: Independent M2 re-check

As M2,
I want to claim Re-check and attest configured Items myself,
So that M1's work is independently verified and I cannot sign my own Prep.

**Acceptance Criteria:**

**Given** a Bike Task in `Needs Re-check` after a valid handoff
**When** a mechanic other than recorded M1 claims it
**Then** Work Phase becomes `In Re-check`
**And** M2 can see who M1 was
**And** Re-check Items are shown as fresh attestations, not pre-filled from M1

**Given** I am recorded M1
**When** I try to claim or complete Re-check on that Bike Task
**Then** the command returns unavailable/unauthorized
**And** owner and phase do not change
**And** there is no same-mechanic override

**Given** I own `In Re-check`
**When** I resolve a Re-check Action Item
**Then** I record Done or N/A as my own outcome
**And** M1's Action outcome does not satisfy the M2 Item

**Given** an M2-enabled Value Item
**When** I attest it
**Then** I verify M1's confirmed value and do not enter a second value
**And** a passing attestation is server-confirmed separately from M1's evidence

**Given** any required Re-check Item is unresolved
**When** I activate Complete
**Then** the first unresolved required Item scrolls into view
**And** phase does not change

**Given** every required Re-check Item is server-confirmed
**When** I confirm Complete
**Then** `lifecycle-confirmation-panel` names `Awaiting Return`
**And** assignment is cleared, revision advances, history is written
**And** the Bike Task is in neither Available Now nor My Work

**Given** M1 already handed off
**When** I am M2
**Then** I cannot edit M1 Prep evidence

### Story 5.4: Reconfirm current order during In Prep

As M1 still preparing a bike,
I want a visible flag when current Booqable context changes,
So that I reconfirm against the latest order before handoff and do not lose work I already saved.

**Acceptance Criteria:**

**Given** I own a Bike Task in `In Prep`
**When** a successful apply detects a relevant change visible in task context
**Then** derivation advances a monotonic reconfirmation generation and task revision
**And** I remain the assignee
**And** `configuration-change-notice` is first in reading order and is not dismissible or toast-only
**And** existing Item outcomes are not rewritten or selectively invalidated

**Given** an open reconfirmation generation
**When** I try to hand off
**Then** handoff is blocked until I explicitly acknowledge that displayed generation

**Given** I acknowledge the displayed generation
**When** the save succeeds
**Then** actor and time are recorded
**And** only that obligation clears
**And** Item outcomes stay as they were
**And** if I must change an Item, I use the ordinary Story 5.2 save path before or after acknowledge

**Given** Work Phase is `Needs Re-check`, `In Re-check`, or `Awaiting Return`
**When** a later current-order change applies
**Then** this story does not reopen Prep or invalidate Items
**And** no new reconfirmation obligation is created

**Given** an invalid tag change on an existing task that is not a cancellation or exact-assignment removal
**When** apply runs
**Then** it returns a typed failure
**And** last accepted context/snapshot is unchanged
**And** the first failure writes one deduplicated system history event

### Story 5.5: Show attributable task history

As authorized staff,
I want a chronological history of who did what on a Bike Task,
So that I can answer who prepared, re-checked, or changed it, and when, without an analytics dashboard.

**Acceptance Criteria:**

**Given** I can access the Bike Task
**When** I open `activity-timeline`
**Then** I see a read-only chronological list with actor or system source, time, event verb, and affected phase/Item when it changed
**And** markers never encode event type by color alone
**And** entries include creation, claim, Item outcomes, handoff, M2 attestation, reconfirmation, and later attention/intervention/Return/Done events when those exist
**And** unknown additive event types render with a compatible fallback

**Given** a successful load with no events
**When** the timeline renders
**Then** it says no activity is recorded yet
**And** that copy is distinct from a load failure with Retry

**Given** this story
**When** it is implemented
**Then** history cannot be edited or deleted on normal application paths
**And** no performance or analytics dashboard is built

## Epic 4: Clear exceptions without blocking ordinary work

Managers see Needs Attention, reassign stuck work, or force-close abandoned Bike Tasks. Ordinary mechanic completion does not wait on that resolution.

**FRs covered:** FR-16, FR-17

### Story 4.1: Manager attention queue

As a mechanic or manager,
I want to raise Needs Attention and have managers resolve it from a dedicated list,
So that exceptions are visible without blocking valid checklist completion.

**Acceptance Criteria:**

**Given** I am the assigned mechanic in an Actionable phase, or an Admin/Manager
**When** I raise Needs Attention
**Then** I must pick `missing_or_unclear_bike_order_information` or `manager_decision_needed`
**And** one open record exists per `(task, reason)`
**And** the reason is immutable
**And** Task Outcome does not change

**Given** open attention records
**When** a manager opens the Manager Attention List
**Then** `manager-queue-row` items show bike/order, rental timing, reason, requester, and age
**And** rows are ordered by nearest rental start
**And** the entire row opens Manager Attention Detail
**And** mechanics do not see this all-open queue
**And** there is no Waiting for Bike ID queue

**Given** Manager Attention Detail
**When** it loads
**Then** `attention-resolution-panel` is first
**And** the two MVP reasons require a short resolution note
**And** a failed save retains the note
**And** only Admin/Manager may resolve

**Given** an open attention record
**When** a mechanic completes valid work through `Done`
**Then** completion is not blocked
**And** the open record remains until an attributable manager resolution
**And** assignment-clearing transitions set current-owner context to null without creating another occurrence

**Given** the working Bike Task
**When** attention is open
**Then** `attention-strip` shows “Needs Attention” plus the short reason
**And** it is not a blocking overlay

### Story 4.2: Reassign or force-close a Bike Task

As an Admin / Manager,
I want to reassign active work or force-close abandoned work,
So that a stuck bike does not depend on the original mechanic, and the intervention is attributable.

**Acceptance Criteria:**

**Given** an Actionable Bike Task
**When** I confirm reassignment in `manager-action-confirmation-panel`
**Then** the panel states the assignment, history, and lifecycle consequence before submit
**And** confirmed Item outcomes and attribution are preserved
**And** I cannot assign a Re-check phase to recorded M1
**And** in `In Prep` the new owner must satisfy any open reconfirmation obligation
**And** task revision advances and one history event records the owner change and my reason

**Given** an Actionable Bike Task including `Awaiting Return`
**When** I confirm force-close with a manager-supplied reason
**Then** Task Outcome is `Force-closed`, assignment is cleared, and history is written
**And** `Force-closed` is distinct from `Done` and `Cancelled`
**And** the action is never optimistic

**Given** manager task detail before Return Check exists
**When** the Bike Task is `Awaiting Return`
**Then** I can see phase, attention, and force-close
**And** the task is still absent from Available Now and My Work

**Given** this story
**When** it is implemented
**Then** there is no manager reset and no same-mechanic M2 override

## Epic 8: Return Check on the same bike

When Booqable marks the rental returned, a mechanic claims the same Bike Task, works the Return Snapshot, and closes `Done`.

**FRs covered:** FR-3 (Return Snapshot), FR-18, FR-19

### Story 8.1: Make returned work claimable

As a mechanic,
I want a returned rental to become unassigned Needs Return Check on the same Bike Task,
So that I can claim return work with the existing queue and ownership rules.

**Acceptance Criteria:**

**Given** an Actionable Bike Task in `Awaiting Return`
**When** Booqable marks that rental returned and apply succeeds
**Then** Work Phase becomes unassigned `Needs Return Check`
**And** one Return Snapshot is copied from the then-active Return template for the current valid category
**And** the Bike Task appears in Available Now and is claimable with Story 5.1 rules

**Given** a Bike Task still in Prep or Re-check
**When** the rental is marked returned
**Then** Return Check becomes the only actionable work
**And** any Prep/Re-check owner is cleared
**And** an interrupted Return-transition history event records prior phase/owner
**And** unresolved Prep/Re-check history remains visible as interrupted, never as Return evidence

**Given** `Cancelled`, `Replaced`, or `Force-closed`
**When** a return signal arrives
**Then** the task is not return-eligible
**And** those outcomes take precedence over Return and create no Return Snapshot

**Given** unknown, conflicting, or changed-invalid category tags
**When** Return would be created
**Then** apply fails closed with no arbitrary Return Snapshot

**Given** a repeated returned refresh
**When** apply runs again
**Then** it is a no-op

**Given** I claim `Needs Return Check`
**When** the claim succeeds
**Then** Work Phase is `In Return Check`
**And** Story 2.11 refresh-before-claim still applies

### Story 8.2: Complete the Return Checklist and close Done

As the return-check mechanic,
I want the same confirmed checklist controls on the Return Snapshot,
So that I can reverse temporary setup and close the Bike Task as Done without an M2 stage.

**Acceptance Criteria:**

**Given** I own `In Return Check`
**When** I open Bike Task Detail
**Then** I work Return Items with the same Action/Value tiles, save status, Notes, and sticky bar as Prep
**And** there is no M2 stage and no per-item modification acknowledgement
**And** unfinished Prep/Re-check history is visible as context
**And** Return observations are written to task history, not Notes

**Given** any required Return Item is unresolved
**When** I activate Complete Return Check
**Then** the first unresolved required Item scrolls into view
**And** Task Outcome does not change

**Given** every required Return Item is server-confirmed
**When** I confirm Complete
**Then** `lifecycle-confirmation-panel` names `Done`
**And** Task Outcome is `Done` with actor and timestamp
**And** assignment is cleared and history is written
**And** `terminal-task-panel` removes mutation controls and offers Mechanic Dashboard

**Given** open Needs Attention
**When** I complete Return Check
**Then** `Done` is not blocked
**And** the attention record remains until a manager resolves it
