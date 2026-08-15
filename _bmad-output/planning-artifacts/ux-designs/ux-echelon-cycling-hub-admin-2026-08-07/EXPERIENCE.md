---
status: final
updated: 2026-08-07
product: Workshop Tasks
sources:
  - ../../prds/prd-echelon-cycling-hub-admin-2026-08-07/prd.md
  - ../../prds/prd-echelon-cycling-hub-admin-2026-08-07/addendum.md
  - ../../prds/prd-echelon-cycling-hub-admin-2026-08-07/discovery-source-workshop.md
  - ../../prds/prd-echelon-cycling-hub-admin-2026-08-07/reconcile-workshop-memory.md
  - ../../prds/prd-echelon-cycling-hub-admin-2026-08-07/review-lifecycle-consistency.md
  - ../../prds/prd-echelon-cycling-hub-admin-2026-08-07/review-workshop-usability.md
  - ../../prds/prd-echelon-cycling-hub-admin-2026-08-07/review-rubric.md
  - ../../prds/prd-echelon-cycling-hub-admin-2026-08-07/.memlog.md
  - ../../../project-context.md
  - .memlog.md
  - .working/source-extract-ux.md
---

# Workshop Tasks — Experience Spine

## Foundation

Workshop Tasks is a multi-surface responsive web feature inside the existing Echelon admin hub. Mechanics work primarily on stand-mounted tablets in landscape or portrait and may use phones; managers/admins use tablets and desktop. The feature inherits the existing Next.js App Router shell, authenticated staff roles, Subframe-generated UI, Geist typography, route loading conventions, and light host theme. `DESIGN.md` is the visual identity reference; this spine owns information architecture, behavior, state, interaction, accessibility, and journeys.

Bike quality is the operational outcome. The screen must keep Egor oriented to the physical bike, authoritative current configuration, unresolved work, confirmed saves, and the next lifecycle boundary without requiring a parallel paper checklist or a return to Booqable for normal execution.

Reference artifacts:

- [Mechanic dashboard mock](mockups/refine-mechanic-dashboard-2026-08-07.html) — equal My Work and Available Now panels, balanced bike/phase/action hierarchy, loud in-context attention, and portrait stacking.
- [Mechanic task-detail mock](mockups/refine-mechanic-task-detail-2026-08-07.html) — top notices, narrower order/bike context beside a wider checklist, current/previous `extra_information`, always-visible `No` setup values, and the sticky lifecycle bar.
- [Manager dashboard mock](mockups/refine-manager-dashboard-2026-08-07.html) — scan-first Needs Attention rows, separate Waiting for Bike ID work, and one clickable-row pattern.
- [Information architecture wireframe](wireframes/ia-2026-08-07.excalidraw) — role-specific surfaces and primary transitions among queues, Bike Task work, attention resolution, templates, and history.
- [Task execution wireframe](wireframes/flow-task-execution-2026-08-07.excalidraw) — Egor's claim, save, handoff, Return Check, responsive, change, retry, and unresolved-item behavior.

Final PRD behavior and later explicit user decisions remain authoritative. These spines are canonical only for UX details left open upstream; mockups, wireframes, and generated components defer to the spines on those UX details.

## Information Architecture

| Surface | Primary role | Reached from | Purpose |
|---|---|---|---|
| Mechanic Dashboard | Mechanic | Workshop Tasks navigation / return from a Bike Task | Resume My Work, claim Available Now, and see Waiting for Bike ID in the default queue as visible and non-claimable without exposing the manager intervention queue. |
| Bike Task Detail | Mechanic; manager/admin for context and controls | `workshop-task-card`, assignment link, attention detail | Execute Prep, Re-check, or Return Check against one physical bike; show current rental context, changes, Notes, Structured Modifications, same-stock last-touch context, ownership, and lifecycle controls. |
| Manager Dashboard | Manager/admin | Workshop Tasks navigation | Scan Needs Attention first, ordered by nearest rental start, then Waiting for Bike ID as a separate category. |
| Manager Attention Detail | Manager/admin | `manager-queue-row` in Needs Attention | Put attention reason and resolution controls first; show full Bike Task information and supporting manager controls below. |
| Checklist Template Library | Manager/admin | Workshop Tasks management navigation | Find versions by phase and bike category; distinguish active and superseded versions; create a version. |
| Checklist Template Detail / Editor | Manager/admin | `template-version-row` / create | Review or edit template metadata and Items; activate, supersede, or reactivate with future-snapshot consequences stated before confirmation. |
| Activity / History | Authorized staff with task access | Bike Task Detail / management navigation | Read chronological attribution for claims, assignment, Item outcomes, handoffs, modifications, attention, overrides, resets, lifecycle changes, and invalidations. |

Navigation and ownership rules:

- Mechanic Dashboard landscape keeps My Work and Available Now simultaneously visible and strictly equal. Portrait stacks My Work first. Waiting for Bike ID remains visibly unclaimable; managers own correction in Booqable.
- Mechanics see attention only on the Bike Task they are working with. The all-open queue belongs to managers/admins.
- Manager Dashboard places Needs Attention above Waiting for Bike ID. A Needs Attention row opens Manager Attention Detail; a Waiting for Bike ID row opens the corresponding Booqable order.
- Bike Task Detail uses one route and changes its work area by authoritative phase: Prep, Re-check, or Return Check. It does not create a separate changed-work route or queue.
- Under the non-blocking placement assumption below, Activity / History is read-only and separate from current-work context. Bike Task Detail shows only attribution needed to act now.
- Overlays do not become additional navigation levels: `lifecycle-confirmation-panel`, `manager-action-confirmation-panel`, and `previous-information-drawer` each stack one level over the current surface.

Non-blocking UX placement assumptions made during autonomous finalization:

- Checklist Template governance is split between a library and a detail/editor surface.
- Full chronological Activity is a separate read-only surface rather than part of the current-work layout.
- The bounded same-`stock_identifier` last-touch lookup appears as secondary Bike Task context.
- The mechanic creates a found-and-fixed record from Bike Task Detail, with the confirmed record also visible in Activity.

These placements may move during implementation without changing the upstream product contracts they expose.

## Lifecycle & Attention Semantics

The visible lifecycle is:

`Waiting for Bike ID → Needs Prep → In Prep → Needs Re-check → In Re-check → Preparation Resolved → Needs Return Check → In Return Check → Done`

Skip Needs Re-check and In Re-check when the current Work Cycle has no M2-enabled Items. Cancelled, Replaced, and Force-closed are read-only outcomes. Needs Attention is orthogonal: open attention does not prevent mechanical completion or Done.

Operational rules:

- Before first claim, refreshed Booqable data replaces displayed context without a persistent change alert.
- A relevant change during active Prep keeps the Bike Task assigned to M1, highlights only affected work, and blocks Handoff until required affected outcomes are confirmed again.
- A relevant change during Needs Re-check or In Re-check returns the same Bike Task to Needs Prep unassigned. A relevant pre-pickup change after Preparation Resolved also returns the same Bike Task to Needs Prep unassigned. Reopened work uses the ordinary Prep/Re-check path.
- Changes after pickup do not reopen completed preparation. During Return Check, changes may refresh context but do not automatically restart Prep, Re-check, or Return Check.
- Replaced is terminal for that Bike Task. `terminal-task-panel` does not send Egor into the replacement task; it explains the change and routes to the Mechanic Dashboard.
- If Booqable reports that an order has been returned while Prep/Re-check is unresolved, Return Check becomes the only actionable work. The unfinished history remains visible as context.

The UI keeps three signal families distinct:

- **System-raised Needs Attention** — source-labeled order or synchronization mismatch. It appears in the Manager Dashboard and relevant Bike Task context without pretending a mechanic raised it. Resolution follows the authoritative server condition or available manager control; the UI does not invent a mechanic explanation.
- **Found and fixed** — an attributable factual record created by a mechanic after correcting an issue. It writes to Activity / History, opens no concern, and never enters the Manager Dashboard.
- **Mechanic-raised Needs Attention** — an open concern requiring manager judgment. The first-release reasons are:

| Reason | Mechanic input | Work effect | Manager resolution |
|---|---|---|---|
| Same-mechanic Re-check override request | No explanation | Blocks only the requesting mechanic from claiming that Re-check; another eligible mechanic may claim it. | Approve or Decline in Manager Attention Detail; no resolution note and no extra confirmation. |
| Missing or unclear bike/order information | Short explanation required | Bike Task remains workable and visibly flagged. | Short resolution note required; mechanic sees the note on return. |
| Manager decision needed | Short explanation required | Bike Task remains workable and visibly flagged. | Short resolution note required; mechanic sees the note on return. |

Waiting for Bike ID is not Needs Attention. It is a visible, non-claimable lifecycle state and a distinct manager work category. Opening its `manager-queue-row` goes directly to Booqable. The row remains until synchronized current data supplies the identifier; do not show a polling or synchronization theater state.

## Save & Concurrency Behavior

- `action-item-tile` saves each Done or N/A outcome immediately. The tile shows `item-save-status` as Saving, then Saved only after server confirmation, or Retry on failure.
- `value-item-tile` becomes Unsaved as soon as its value changes. It auto-saves after roughly two seconds without typing. Blur, Enter, route-leave intent, Handoff, or Complete flushes immediately.
- A failed Value Item save retains the typed value in the open task. Retry is Item-specific. Reopening the route shows authoritative persisted data; the first release does not promise recovery after the session is lost.
- `sticky-lifecycle-bar` progress counts server-confirmed outcomes only. Handoff and Complete never use unsaved or pending values.
- Handoff/Complete stays visible before requirements are complete. Activating Handoff or Complete scrolls to and emphasizes the first unresolved required Item instead of hiding the action or returning a generic failure. Focus behavior is validated during implementation with the host-app primitives.
- Once requirements are confirmed, `lifecycle-confirmation-panel` names the resulting phase before submission. The panel's confirmation action becomes pending and non-repeatable; success remains visible until the route reflects the server-confirmed phase.
- Claims are first-writer-wins. A losing claimant sees that the Bike Task already has an assignee and returns to the refreshed queue; no optimistic ownership remains.
- If ownership or lifecycle changes on an open screen, stale saves and transitions are rejected. The UI preserves current typed input long enough to explain the authoritative state, then offers the valid retry/reload path. Replaced, cancelled, reset, reassigned, or return-forced work cannot continue under stale controls.
- The feature is online-only. Network read or mutation failures remain in context with Retry; typed input remains available while the Bike Task stays open. Failed work is never presented as queued, saved, or otherwise confirmed, and no connectivity detection, offline reading, persistent network-status UI, or session-loss recovery is promised.

## Template Governance & Audit

Under the non-blocking placement assumption above, manager/admin template governance uses a Checklist Template Library plus Checklist Template Detail / Editor. Phase (Prep or Return), bike category, version, and active/superseded status stay visible. Activation, supersession, and reactivation use `manager-action-confirmation-panel` and explicitly state that only future Bike Task snapshots change. Existing task progress and snapshots do not change.

Template activation does not require every Setup Category to have a linked Item. The interface may show coverage context but must not create a blocking coverage gate. M2-enabled configuration requires M1-enabled configuration. Separate Prep and Return versions exist for e-city, e-road, road, gravel, MTB, and E-MTB.

Workshop does not provide a second category-classification or tag-approval screen. Bike category is read-only Booqable source context derived from the controlled ProductGroup tag vocabulary. Untagged or conflicting source data appears through Integration Incident handling, not through an Admin configuration workflow. Accessory-tag interpretation is deferred to Epic 6.

`activity-timeline` is chronological and read-only. Every entry names actor/system, time, action, and affected phase/Item where applicable. It covers claims, assignment/reassignment, outcomes, handoffs, Structured Modifications, attention requests/resolutions, overrides, resets, cancellation, replacement, force-close, lifecycle changes, and configuration invalidations. It is evidence, not a second control surface.

## Voice and Tone

Microcopy is operational, short, literal, and non-celebratory. Brand voice and visual posture live in `DESIGN.md`.

| Do | Don't |
|---|---|
| “Claim Prep”, “Handoff to Re-check”, “Complete Preparation”, “Complete Return Check” | “Continue”, “Submit”, or “All done!” when the resulting phase is known |
| “Could not save tyre pressure. Your value is still here. Retry.” | “Something went wrong.” |
| “This Bike Task was replaced. Work here has stopped. Return to Workshop Tasks.” | “Task unavailable.” |
| “Re-check is assigned to another mechanic.” | “Conflict error.” |
| “Could not save this workshop change. Your input is still here. Retry.” | “Changes will sync later.” |
| Name prior/current values and affected Items | “Configuration updated” without actionable context |
| Use sentence case and concrete verbs | Exclamation marks, celebration, blame, or approve/reject language about M1 work |

## Component Patterns

Behavioral rules below mirror the canonical names in `DESIGN.md.Components`.

| Component | Use | Behavioral rules |
|---|---|---|
| `workshop-task-card` | Mechanic Dashboard | Always shows bike name, order number, client, rental dates, phase, and assignee. Continue and Claim actions always name the phase, such as Continue Prep or Claim Re-check. Claim enters pending in place; a concurrent loss refreshes the card. Waiting for Bike ID has no claim control. |
| `attention-strip` | Mechanic Dashboard; Bike Task Detail | Shows “Needs Attention” plus the short reason. It persists while open, never substitutes for the manager queue, and does not block unrelated mechanic actions. |
| `configuration-change-notice` | Bike Task Detail | Names changed source, prior/current values when known, affected scope, and resulting work effect. Persists until every affected Item is server-confirmed; not dismissible and not toast-only. |
| `task-context-panel` | Bike Task Detail | Shows physical-bike identity first, then read-only source-derived bike category, order/customer/dates/address, setup, accessories, Notes, and current `extra_information` with source labels. Booqable-owned values are read-only. `No` setup values remain fully visible. |
| `checklist-group` | Bike Task Detail | Groups stay expanded in one continuous scroll. Setup-linked groups show the current and prior values when the linked Setup Category has changed. Group emphasis clears only when its affected Items are confirmed. |
| `action-item-tile` | Prep, Re-check, Return Check | Exposes separate Done and N/A controls. One tap begins immediate save; pending prevents a second submission. M2 outcomes are fresh attestations and are not pre-satisfied by M1. |
| `value-item-tile` | Prep and Return Check; M2 verification context | M1 enters the target value; required values block Handoff until confirmed. M2 verifies the target and records a passing result without entering a duplicate value. No N/A control. |
| `item-save-status` | Every checklist Item | Shows Unsaved, Saving, Saved, or Retry in context. Saved is server-confirmed. Error copy names the Item/action and Retry remains local. Assistive announcement behavior is validated during implementation. |
| `sticky-lifecycle-bar` | Bike Task Detail | Remains visible while checklist content scrolls. Shows confirmed progress and Handoff/Complete. Activating Handoff or Complete before requirements are complete scrolls to and emphasizes the first unresolved required Item; focus handling is implementation-validated. |
| `lifecycle-confirmation-panel` | Handoff/Complete | Names the resulting phase before submission. Confirm becomes pending, blocks double-submit, and remains until server result. Overlay dismissal and focus return are implementation-validation requirements. |
| `previous-information-drawer` | Bike Task Detail | Opens from current `extra_information`; shows prior text and time/context only. It never replaces or obscures the authority of current text. Dismissal and focus return are implementation-validation requirements. |
| `structured-modification-card` | Prep/Re-check creation context; persistent Return Check list | One durable free-form physical change per record. Return Check shows every record throughout the task and requires individual Addressed confirmation before completion. |
| `last-touched-summary` | Bike Task Detail context | Performs the required read-only lookup for the same `stock_identifier` and shows only the latest authoritative server-returned touch. It explicitly says it is not complete bike history; no result is distinct from load failure, and the component never infers a prior event. |
| `found-and-fixed-record` | Bike Task Detail; Activity / History | Under the non-blocking placement assumption, a mechanic enters a short factual description from Bike Task Detail and the confirmed record appears in Activity. Save is attributable and server-confirmed. The record creates no Needs Attention state, manager action, or queue row. |
| `manager-queue-row` | Manager Dashboard | Entire row uses one host-app accessible interactive primitive with a chevron. Needs Attention opens Manager Attention Detail; Waiting for Bike ID opens Booqable. No inline Approve, Decline, note field, or separate Open button. Keyboard and assistive-technology behavior is implementation-validated. |
| `attention-resolution-panel` | Manager Attention Detail | Appears first. Override requests expose Approve/Decline without note or extra confirmation. Other reasons require a resolution note; failed save retains the note. |
| `manager-action-confirmation-panel` | Manager task controls; template governance | States the exact consequence before reset, force-close, assignment/reassignment, activation, supersession, or reactivation. While the action is pending, repeat submission is disabled. Success updates the authoritative surface; destructive actions are never optimistic. |
| `template-version-row` | Checklist Template Library / Detail | Shows phase, bike category, version, and active/superseded text. Entire row opens detail. Reactivation is an explicit action, not row selection. |
| `template-editor` | Checklist Template Detail / Editor | Keeps phase/category/version/status visible while editing Items. Enforces the rule that M2 implies M1; does not block activation for missing Setup Category coverage. Confirmed save and error retention follow the global save contract. |
| `activity-timeline` | Activity / History | Read-only chronological events; each exposes actor, time, verb, and affected entity. No action buttons or color-only event taxonomy. |
| `terminal-task-panel` | Bike Task Detail | Replaces editable work for Done, Cancelled, Replaced, or Force-closed. Explains why work stopped, preserves read-only context/history access, and offers the Mechanic Dashboard action. |

## State Patterns

Global state contract:

- Cold route transitions provide clear, orientation-preserving loading feedback so there is no blank or unexplained wait. Shape-matched skeletons are preferred where the host route can support them, not mandatory.
- Empty is distinct from failed. Empty copy names what is absent and the valid next action; load failures use an in-context error with Retry.
- Pending mutating controls remain in place, label the action in progress, disable repeat submission, and do not look confirmed.
- Toasts are supplemental. Booqable changes, attention, read/mutation failures, stale ownership/lifecycle, and terminal states remain in context.
- Permission follows existing authenticated staff-role boundaries. Missing/expired sessions redirect through the host auth boundary; authenticated wrong-role access shows a stable denied state or returns to an authorized Workshop Tasks surface.

IA surface coverage:

| Surface | Cold-load | Empty | Saving / pending | Error / retry | Stale / concurrency | Terminal | Permission |
|---|---|---|---|---|---|---|---|
| Mechanic Dashboard | Clear loading feedback preserves the two-queue orientation. | My Work and Available Now resolve independently; say “No assigned work” or “No work available now.” Waiting for Bike ID remains visibly non-claimable if present. | Claim action stays in its card, names the phase, and disables repeat. | In-context load or network error distinguishes failure from no tasks and offers Retry. | Losing claim reports current assignee and refreshes the card; cards whose phase/owner changed update without preserving stale action. | Terminal work has no active control in the queues; a deep link resolves in Bike Task Detail. | Mechanic content only; manager queue and controls are absent. Wrong-role direct access is denied/redirected by the host boundary. |
| Bike Task Detail | Clear loading feedback follows notice, context, checklist, and lifecycle reading order. | No normal empty checklist: missing snapshot/required task data is an error. Optional Notes/modifications may say none; `last-touched-summary` says no prior touch only after a successful lookup. | Item, attention, modification, found-and-fixed, and lifecycle actions expose local pending; only the affected control locks unless lifecycle authority changed. | Item or network failure retains typed input while the task remains open and offers local Retry. Last-touch lookup failure remains distinct from no prior result. Page/read or transition failure stays in context without false phase change or queued-success implication. | Reject stale save/transition, explain new owner/phase, preserve typed input long enough to recover; refresh into current work or `terminal-task-panel`. | Done, Cancelled, Replaced, and Force-closed use `terminal-task-panel`; no mutation controls. | Mechanics can act only in eligible assigned/claimable phases; manager-only controls are hidden and server-authorized. |
| Manager Dashboard | Clear loading feedback preserves Needs Attention before Waiting for Bike ID. | Each queue states its own empty result; one empty queue does not hide the other. | No inline decisions. Row navigation has route-pending feedback only. | Queue load or network error remains in place with Retry and does not render zero counts as success. | Rows may disappear or update after another actor resolves/corrects them; opening a stale row opens the authoritative detail or the corresponding Booqable order. | No terminal controls on the dashboard; resolved attention leaves the open queue. | Manager/admin only. Mechanics do not see the all-open queue. |
| Manager Attention Detail | Clear loading feedback preserves reason/resolution before task context. | If the concern was already resolved, show who resolved it and when rather than an empty form. | Approve, Decline, or Resolve stays pending in `attention-resolution-panel`; note input locks only for submission and is retained. | Error names the failed resolution, retains note text while the surface remains open, and offers Retry. | If another manager resolves first, reject the stale action and render the server-confirmed resolution read-only. | Resolved concern is read-only; a terminal Bike Task remains terminal even if attention history is viewed. | Manager/admin only; task context remains subject to existing staff access. |
| Checklist Template Library | Clear loading feedback preserves stable library sections and version-row orientation. | “No templates for this phase/category” with one authorized Create action; never imply a load failure. | Create/activate route action shows local pending and prevents duplicate version creation. | Load/create or network failure stays in context with Retry and never implies queued work. | Refresh status if another manager activates/supersedes a version; never show two versions as current after authoritative reload. | Superseded versions remain visible and readable; they are not deleted or styled as errors. | Manager/admin only. |
| Checklist Template Detail / Editor | Clear loading feedback preserves metadata, status, Item rows, and action-area orientation. | A new version may have no Items and offers Add Item; an existing missing definition is an error, not empty. | Field/version actions show confirmed versus pending state; governance actions use `manager-action-confirmation-panel`. | Retain entered fields/Items after a failed save while the page remains open; name the action and offer Retry without implying queued success. | If the server rejects a stale version/status mutation, preserve current entries, show authoritative status, and require explicit retry after review; no silent merge. | Superseded status remains read-only evidence where editing is not valid; Reactivate is explicit and confirmed. | Manager/admin only. |
| Activity / History | Clear loading feedback preserves chronological orientation. | “No activity recorded yet” only after a successful load. | Read-only; no mutation pending state. | Load or network failure uses in-context Retry and never substitutes an empty timeline. | Refresh may prepend/append authoritative events; existing entries do not mutate into a different event. | Terminal lifecycle events remain ordinary labeled history entries and link back to read-only task context. | Available only to staff authorized for the related task/management scope. |

Supporting overlays inherit the parent surface state. `lifecycle-confirmation-panel` and `manager-action-confirmation-panel` show pending/error in place; overlay focus handling and return are validated during implementation. `previous-information-drawer` has clear loading feedback—preferably shape-matched—an explicit unavailable/error state with Retry, and no edit mode.

## Interaction Primitives

- Tap/click is primary. Frequent mechanic actions use large, forgiving, tile-sized controls validated on mounted workshop tablets with gloves and glare; they never require hover.
- Host-app accessible primitives provide the baseline for keyboard and assistive-technology access. Implementation validation must cover logical traversal, control activation, overlay dismissal, focus containment/return, and route-level focus behavior rather than treating exact commands as finalized by this spine.
- No precision gestures, swipe-only actions, drag-to-complete, whole-tile state cycling, or long-press commands.
- Checklist outcome controls are explicit; the tile itself does not cycle Done/N/A.
- Activating Handoff or Complete before requirements are complete scrolls to and emphasizes the first unresolved required Item. Focus movement and assistive announcement behavior are implementation-validation requirements.
- Drawers and panels stack one level only and preserve the underlying route. Focus containment/return and backdrop behavior during pending mutations are implementation-validation requirements.
- Manager queue rows are whole-row targets; nested inline action zones are prohibited.
- Critical state never depends on motion. Optional transitions follow host-app and platform reduced-motion conventions; state still changes through text, border, icon, and layout.

## Accessibility Floor

- The source-backed accessibility intent is high-contrast, glare-readable, non-color-only operation across supported responsive layouts. Formal WCAG conformance and contrast measurements are implementation validation, not a certified product promise in this spine.
- Frequent mechanic controls are large, forgiving, and tile-sized. Adjacent Done/N/A controls retain enough separation to reduce accidental activation with gloves; final sizing and spacing are validated on mounted workshop tablets.
- Host-app accessible primitives are required. Programmatic names and contextual naming for Item- and phase-specific controls are implementation-validation requirements rather than finalized name strings.
- The announcement strategy for save state, attention resolution, phase changes, stale rejection, failed network work, and terminal changes is defined and tested during implementation; this spine does not prescribe exact live-region behavior.
- State is never color-only. Labels, icons, borders, and structural placement remain present in high-risk states.
- Focus is visibly styled with `{colors.focus-ring}` and follows the logical reading order without being obscured by the sticky bar. Exact focus movement after unresolved-item jumps, overlays, and route changes is validated during implementation.
- Landscape/portrait tablet and phone layouts keep lifecycle controls visible at supported widths. Critical labels and state reasons may wrap and do not become icon-only; text-enlargement behavior is validated during implementation.
- Logical Bike Task reading order is notices, identity/current context, checklist, then progress/lifecycle action even when landscape presentation is visually split. Screen-reader verification is an implementation-validation requirement.
- Critical feedback is not auto-advanced, flashed, or dismissed on a timer. Optional motion follows host-app and platform reduced-motion conventions.

## Responsive & Platform

The host admin shell owns navigation breakpoints. Workshop content adapts by available width and orientation:

| Surface condition | Behavior |
|---|---|
| Wide desktop / landscape tablet with adequate content width | Mechanic Dashboard uses two equal queue panels. Bike Task Detail uses a narrower context column and wider checklist column; checklist groups may use two columns. Manager queues use aligned scan rows. |
| Portrait tablet / constrained width | Mechanic Dashboard stacks My Work before Available Now. Bike Task Detail orders notices, context, then checklist. Checklist groups remain continuous and may use one column. Sticky lifecycle controls remain visible and use the available width. |
| Phone / narrow viewport | Single-column flow, host mobile navigation, full-width task actions, one-column checklist groups, and stacked manager row facts. Critical labels may wrap, and no required action depends on hover reveal. |

Landscape and portrait tablet layouts, plus phone layouts, support the same core mechanic workflow. Manager/admin workflows prioritize desktop and tablet density while retaining lifecycle controls and state clarity at supported narrower widths.

No Workshop Tasks-specific dark theme or locale is introduced in v1. The feature inherits host-app theming and locale behavior. Layouts allow longer translated copy and wrapped labels without making critical controls icon-only.

## Inspiration & Anti-patterns

- **Inherited — Echelon's Subframe admin hub:** Workshop Tasks keeps the host shell, typography, palette, generated primitives, and staff-role model. Workshop deltas are limited to larger controls, stronger state hierarchy, and tablet workbench behavior.
- **Selected — dashboard Direction B:** equal My Work and Available Now panels keep assigned and claimable work simultaneously scannable. Direction A's My Work primacy and Direction C's dense operational rows are rejected.
- **Rejected — separate workshop-console identity:** no dark industrial theme, decorative workshop styling, gradients, blur, or custom shell.
- **Rejected — hidden or precision-dependent execution:** no accordion checklist groups, whole-tile outcome cycling, swipe-only actions, hover-only controls, or transient-only critical feedback.
- **Rejected — queue-level manager decisions:** Approve, Decline, resolution notes, and consequence-bearing actions belong in detail; the Manager Dashboard remains scan-first.
- **Rejected — optimistic certainty:** no hidden retry queue, unconfirmed Saved state, toast-only Booqable change, or celebratory completion language.

## Mock Coverage

Mocked: Mechanic Dashboard, Bike Task Detail, and Manager Dashboard. Wireframed: role/surface IA and Egor's task-execution/high-risk-state flow.

Spine-only: Manager Attention Detail, Checklist Template Library/Detail, Activity/History, same-stock last-touch and found-and-fixed treatments, confirmation panels/drawers, and terminal and error variants. These surfaces are intentionally specified through the component, state, and flow contracts above rather than additional visual artifacts.

## Key Flows

### UJ-1 — Prepare and verify one bike

**Protagonist:** Egor, mechanic, working beside a bike stand with a mounted tablet.

1. Egor opens Mechanic Dashboard and scans the equal panels: My Work and Available Now.
2. He chooses a Needs Prep `workshop-task-card`, verifies bike identity, and taps Claim Prep. The card shows pending until ownership is server-confirmed.
3. Bike Task Detail opens with current bike/order context before the continuously visible Prep checklist; `last-touched-summary` provides the bounded same-stock lookup without implying full history.
4. Egor resolves `action-item-tile` controls as Done or N/A and enters required `value-item-tile` values. Every Item shows local Unsaved/Saving/Saved/Retry state.
5. When he makes a rental-specific physical change, he creates a separate `structured-modification-card`; if he finds and immediately corrects an issue that needs no manager action, he records a distinct `found-and-fixed-record`. Notes remain supplementary.
6. Egor taps Handoff to Re-check. If required work is unresolved, the first unresolved Item scrolls into view and receives emphasis. When all required outcomes are confirmed, `lifecycle-confirmation-panel` names Needs Re-check.
7. Egor confirms. The server-confirmed result clears Prep ownership and returns him to the queue; the Bike Task becomes claimable for an eligible second mechanic.
8. The eligible second mechanic claims Re-check, sees current-cycle M1 identity, performs a fresh independent verification, and records any durable correction as a Structured Modification.
9. **Climax:** Re-check completion is server-confirmed as Preparation Resolved, and the next actionable Bike Task is immediately available without paper or manager mediation.

Failure path: a concurrent Claim loss names the current assignee and refreshes the queue. An Item save failure retains the value/outcome locally for Retry and excludes it from Handoff. If no M2-enabled Item applies, the confirmed Prep completion skips Re-check and names Preparation Resolved.

### UJ-2 — Absorb a Booqable configuration change

**Protagonist:** Egor, mechanic, returning his attention to the mounted tablet while preparing an assigned bike.

1. Egor has an In Prep Bike Task open or resumes it from My Work.
2. A workshop-relevant Booqable refresh changes current rental intent. When Egor next looks at the tablet, `configuration-change-notice` is first in reading order and names the source, prior/current values, affected Items, and work effect.
3. The Bike Task remains assigned to Egor. Only affected `checklist-group` and Item outcomes are reopened; unrelated confirmed work remains intact.
4. Current `extra_information` remains visible in `task-context-panel`; Egor opens `previous-information-drawer` only if comparison is needed.
5. Egor physically adjusts the bike and resolves the highlighted Items. Their emphasis clears only after each save is server-confirmed.
6. Egor uses the ordinary Handoff path; confirmed affected work repeats Re-check only where M2 is configured.
7. **Climax:** the persistent change emphasis is gone because the bike has a new, server-confirmed physical attestation against the latest Booqable intent, and the task proceeds through the normal lifecycle.

Failure path: if the change made the open screen stale—such as arriving during Re-check—the stale save is rejected, typed input is preserved long enough to explain the change, and the task returns to Needs Prep unassigned. A transient toast alone is never the change signal.

### UJ-3 — Check a returned bike

**Protagonist:** Egor, mechanic, receiving a returned bike at the workshop stand.

1. Egor sees the Needs Return Check Bike Task in Available Now, verifies the physical bike, and claims it.
2. Bike Task Detail opens in Return Check with unfinished Prep/Re-check history as context when applicable.
3. The Return checklist and every same-rental `structured-modification-card` remain visible throughout the task.
4. Egor performs category-specific Return Items and addresses each physical change, marking each Structured Modification Addressed individually.
5. `sticky-lifecycle-bar` reports checklist and modification confirmation separately. Complete Return Check remains visible.
6. If any required Item or modification is unresolved, activating Complete Return Check scrolls to and emphasizes the first unresolved unit. Once all are confirmed, `lifecycle-confirmation-panel` names Done.
7. **Climax:** Egor confirms and sees the server-confirmed Done outcome; the task becomes read-only and the Mechanic Dashboard is the next action.

Failure path: a failed modification acknowledgement or checklist save remains attached to that unit, retains input, and prevents Complete from using it. Open Needs Attention does not prevent Done and remains in the Manager Dashboard until resolved.

### UJ-4 — Handle an exception

**Protagonist:** Dima, manager, opening Workshop Tasks to intervene without becoming a gate in normal work.

1. Dima opens Manager Dashboard. Needs Attention appears first, sorted by nearest rental start; Waiting for Bike ID follows separately.
2. He scans consistent `manager-queue-row` summaries, distinguishing source-labeled system mismatches from mechanic-raised judgment requests, and opens the most urgent Needs Attention row. Found-and-fixed records do not appear here.
3. Manager Attention Detail places `attention-resolution-panel` before full Bike Task context.
4. For a same-mechanic Re-check request, Dima chooses Approve or Decline with no note or extra confirmation. For “Missing or unclear bike/order information” or “Manager decision needed,” he enters the required short resolution note and resolves.
5. The action remains pending in place. On server confirmation, the concern becomes read-only history, the queue updates, and the mechanic sees the outcome/note when returning to the task.
6. For Waiting for Bike ID, Dima opens the row directly in Booqable, adds the identifier there, and returns to Workshop Tasks; the row remains until synchronized current data makes the Bike Task claimable.
7. When the exception instead requires assignment/reassignment, reset, or force-close, Dima uses `manager-action-confirmation-panel`, which states the exact lifecycle, assignment, and history consequence before submission.
8. **Climax:** Dima's server-confirmed intervention is visible in the task and `activity-timeline`, while ordinary mechanical work remains available or the exceptional task is unmistakably terminal.

Failure path: if another manager resolved the concern first, Dima's stale action is rejected and the confirmed resolution is shown read-only. A failed note or network mutation retains Dima's text while the surface remains open, offers Retry, and never claims the action will sync later.
