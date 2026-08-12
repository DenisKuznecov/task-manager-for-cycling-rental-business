# Per-Bike Workshop Tasks — PRD Source Digest

**Source:** `_bmad-output/brainstorming/brainstorm-per-bike-workshop-tasks-2026-08-05/.memlog.md` (357 entries, session status: complete, last updated 2026-08-07T12:01). Three verbatim phrasings drawn from sibling `brainstorm.html` are marked **[HTML]**. All others are from the log.

**Notation:** `[D]` = explicitly logged decision · `[I]` = explicitly logged insight or direction · `[INF]` = inference from the material

This is a source extraction only. No new product ideas have been added.

---

## 1. Product Vision and Problem

**[I]** Original intention was narrowly to digitize and automate the mechanics' paper workflow, not to replace Booqable's order-lifecycle tracking.

**[I]** Booqable already tracks the full order lifecycle end-to-end (received → prepared → picked up → returned). It works, just suboptimally.

**[I]** Paper pain points: no progress visibility outside the workshop; no historical record of who did the first check vs. the re-check (needed for mechanic performance tracking); attention flags on paper have no log of whether or when they were actually addressed.

**[HTML][I]** "The pain lives at the workbench: invisible progress, missing attribution, paper attention flags, and no reliable record of what changed on the bike."

**[D]** Focus scope on mechanics-workflow automation — the real pain. Full order-lifecycle ownership stays a possible later direction.

**[D]** Build the thin Booqable-to-workshop translation-layer foundation now (order enters mechanics-relevant state → generate/update bike tasks) as cheap future-proofing, without expanding current scope.

**[I]** Core job: guarantee bike quality via independent re-check. M2 validates only *some* checklist items (not all), by design, so a single mechanic's blind spots get caught by someone checking different things.

**[I]** Current process is paper: M1 does the work on a bike, then hands off to M2 who validates a defined subset of checklist items.

**[HTML][I]** North-star: "The job is not 'complete a checklist.' It is to guarantee bike quality through an independent, selective re-check while preserving what happened to this bike during this rental."

**[HTML][I]** Unifying rule: "Whenever rental intent changes the physical bike, keep the difference actionable until a mechanic confirms the bike matches the required state."

**[I]** The two ideas that make the feature worth building: (1) treating each bike task as living workshop work within Booqable's lifecycle; (2) carrying rental-specific Notes into return checking so temporary bike changes can be reversed.

**[I]** Bigger future vision: track physical bikes (by Booqable stock_identifier) across their whole lifecycle — usage frequency, cumulative modifications/parts history. If a mechanic swaps a part during prep, a future mechanic on a later rental should be able to see it. Explicitly deferred as a separate future feature.

---

## 2. Users and Stakeholders

**[I]** Roles identified through role-playing and failure analysis:

**Mechanic 1 (M1):** Claims a bike task; works through the prep checklist; records modifications in shared Notes; hands off once all required items are done.

**Mechanic 2 (M2):** Independently verifies M1's work on applicable items. Makes own fresh attestation — does not approve or reject M1's response. May correct the bike after speaking with M1; must record any correction in Notes.

**Return-check mechanic:** One mechanic who completes the simpler return checklist after Booqable marks the order returned. Also acknowledges preparation Notes.

**Admin / Manager:** Creates and versions checklist templates; assigns or reassigns tasks; may override the two-person re-check rule.

**[I]** Primary adoption failure risk: the digital workflow becomes cumbersome and distracts mechanics from working on the bike.

---

## 3. Workflows and Journeys

### 3a. Task creation and queue entry

**[D]** A Booqable reserved order immediately makes per-bike tasks enter the ordinary mechanic queue.

**[D]** Before first claim, Booqable updates refresh task details silently — no alerts.

**[D]** Persistent change alerts begin once M1 has claimed the task (i.e., the task is in progress).

**[D]** Queue ordering: bikes prioritized by order rental start date, earliest first.

**[D]** Even for large multi-bike orders (~15 bikes), mechanics claim one bike task at a time. Each bike is an independent unit of work; multiple bikes from the same order can be prepared in parallel by different mechanics.

**[D]** Each bike enters the M2 verification queue immediately after its own M1 preparation finishes. It does not wait for other bikes in the same order.

**[I]** Mechanics usually prepare bikes one day before rental start; exceptionally large orders may start ~3 days early.

### 3b. M1 preparation flow

**[D]** M1 handover is blocked until every required preparation checklist item is completed. Optional items may remain unchecked.

**[D]** Preparation remains owned by one M1. Simultaneous multi-mechanic editing of the same bike checklist adds no value.

**[I]** Mechanic's ideal flow: tap through checklist, add brief side notes for replaced items, check ordered accessories, install correct pedals/computer mount, then hand off.

**[I]** Ordered accessories must be visible inside the bike task so the mechanic can configure the bike without looking elsewhere.

### 3c. M2 verification flow

**[D]** M2 independently resolves each applicable action item as Done or N/A and updates shared task Notes only when they corrected something.

**[D]** M2 should see M1's identity. Attribution does not bias the check and enables faster communication.

**[D]** M2 does not approve or reject M1's response. When M2 finds a discrepancy, they go to M1 directly, clarify the problem, may correct the bike themselves, and finish independent verification.

**[D]** When M2 corrects an issue before completing verification, they must record what they corrected. Corrections go in the shared task-level Notes, not against individual checklist items.

**[D]** For PSI and similar value checks: record only that M2's final verification passed. Do not record whether an adjustment was needed. (M1 enters the target value; M2 physically checks, adjusts if needed, then attests the bike matches the target.)

### 3d. Return-check flow

**[D]** A Booqable order being marked returned automatically makes each bike's return checklist available in the mechanic queue.

**[D]** The separate return checklist is completed by one mechanic. No M2 re-check stage.

**[D]** Within the same rental, the return-check mechanic sees preparation and M2 Notes so they can identify rental-specific bike changes and restore them.

**[D]** Return completion also requires acknowledging that every rental-specific change described in preparation Notes has been addressed.

**[D]** Return checklists are category-specific (e.g., rack-bag checks for e-city bikes but not road bikes).

**[D]** Separate category-specific prep and return checklist templates. Not a single combined template with applicability phase flags.

### 3e. Booqable configuration changes during work

**[D]** Three-outcome Booqable update contract — all handled within the same task, queue, and M1-to-M2 flow:

| Signal type | Outcome |
|---|---|
| Recognized, relevant change (e.g., pedal type changes) | Exact category-linked checks reset; task returns to unassigned normal Prep queue |
| Relevant but ambiguous (cannot identify specific accessory) | Broad "Review updated bike configuration" M1/M2 confirmation reopens; same task, same queue |
| Non-workshop-relevant change (e.g., scheduling) | Data refreshes silently; no alert |

**[D]** If a Booqable configuration change arrives *during M2 work*: send the existing task back to Prep, clear its assignment; returns to the normal unassigned queue.

**[D]** If a Booqable configuration change arrives *while M1 is actively working*: keep the task assigned to M1; clearly communicate the exact change in the work screen so they address the newly reset item before handoff.

**[D]** A relevant configuration change during M1 invalidates affected required checks and blocks handover until M1 completes them again.

**[D]** Mid-work changed checklist requirements should be visibly highlighted. Completing the affected item automatically clears its highlight. No separate acknowledge-update action.

**[D]** Dynamic Booqable configuration changes may reopen completed workshop work only while the order remains *reserved*. Changes after customer pickup do not reopen the task.

### 3f. Booqable lifecycle state handling

**[D]** State rules:

| Booqable state | Workshop task behavior |
|---|---|
| Reserved | Task exists, active in queue |
| Cancelled or bike removed | Task locked read-only; history preserved; message: "This order was cancelled in Booqable. No further work is needed on this bike." |
| Order un-cancelled back to reserved | Task reopens; resumes from last state |
| Same stock_identifier, same order | Resumes prior checklist progress |
| New stock_identifier (replacement bike) | Closes old task as "replaced"; fresh task for new bike; separate physical-bike histories |
| Manager override to reset stale work | Available |

**[D]** Every applicable work cycle — including selective work reopened by a Booqable change — must preserve the M1 → independent M2 verification flow. If the original M2 performs newly reopened prep work, a different mechanic must verify it.

**[D]** A previously completed task reopened by a Booqable change returns unassigned to the normal queue. Do not reserve it for the original M1.

### 3g. Assignment and ownership

**[D]** Mechanic self-claiming and explicit manager assignment. No system-driven automatic assignment.

**[D]** Concurrent task claims use first-writer-wins. Only the first mechanic successfully claims. The losing claimant is told the task already has an assignee.

**[D]** If no second mechanic is available, the system takes no automatic action.

**[D]** Managers can explicitly override the two-person rule for one task by assigning the re-check to Mechanic 1 or to themselves. Recording who made the override and when is sufficient; no written reason required.

**[D]** Per-item attribution plus a logged handoff event is sufficient for reassignment. No extra "review before continuing" nudge needed.

**[INF]** M1/M2 are roles for the *current work cycle*, not permanent task-level identities. A former M2 performing reopened prep work becomes M1 for that cycle; a different mechanic must verify it. (This is an implication of items 219–220 rather than a stated explicit decision.)

### 3h. Attention flags

**[I]** Three distinct signal types:
1. System-triggered `needs_attention` (order/sync lifecycle mismatch)
2. Mechanic "found and fixed" historical log entry (no action needed; just a record)
3. Mechanic-triggered "needs manager judgment call" flag (possible customer liability; used at return)

**[D]** A flag must never block the mechanic's own task. Blocking, if it belongs anywhere, belongs at the order level, which is explicitly out of scope.

**[D]** Manager "resolve" action clears the flag and, when raised at the last stage (post-check), simply marks the task done. No separate "resolve and continue" concept. Force-close is a distinct action for genuinely stuck or abandoned tasks.

**[D]** The manager urgent-mark/ping mechanism was removed entirely.

---

## 4. Agreed Capabilities

### 4a. Checklist architecture (final accepted model)

**[D]** Lock the always-visible admin-authored checklist linked to five Booqable setup categories for context and selective reset. Generated accessory checklist items are retired.

Design:
- Admin authors all checklist items for a given bike category and template version.
- Each item may optionally be linked to one of the five bounded Booqable setup categories. The link controls: grouping in the UI, display of a Booqable-value category header, and selective reset when that category's Booqable value changes.
- **All admin-defined checklist items are always visible** regardless of current Booqable selections. Category links control grouping, context, and invalidation — not runtime visibility.
- Category headers show current Booqable selection and, on a change, the previous-to-current change (e.g., "Pedals — Look; changed from Shimano SPD-SL").
- On a selected-to-No transition: the header explains removal context; linked checks reset for M1 (and M2 where configured).
- `extra_information` from Booqable is a built-in required M1/M2 confirmation item — not admin-authored — present in both bundled and flat orders. Changes to it reset that item through the normal selective flow.

**[D]** Five bounded Booqable setup categories (log item 264, confirmed by HTML): Pedals, Saddle, Wheelset, Power meter, Computer mount. The set must remain extensible.

**[D]** Admin items retain independent per-item M1/M2 applicability. Administrators are responsible for enabling M2 where independent verification is needed.

**[D]** Do not require category coverage when activating a checklist template. Ensuring relevant setup categories have linked checks is the administrator's responsibility; missing coverage does not need a blocking system safeguard.

**[D]** Adopt graduated instruction clarity: recognized structured accessories get concrete action wording (e.g., "Install Look pedals"); ambiguous or free-form Booqable data is shown verbatim for physical-bike confirmation, without pretending the system understood more than it did.

**[D]** Definition of completion for Booqable-derived items: checking an item attests that the mechanic compared the physical bike with the currently displayed Booqable requirement, performed necessary work, and confirms they now match. M2 independently makes the same attestation.

### 4b. Item response types

**[D]** Type-specific responses:
- **Action items**: resolve as Done or N/A. N/A counts as resolving the item while honestly recording it did not apply.
- **Value items**: require a value (e.g., tyre pressure PSI). No N/A option. Required values block handoff; optional values may remain blank.

**[D]** For M1/M2 on value items: M1 records the target value. M2 verifies the bike matches M1's target (adjusting physically if needed), then attests verification passed. Do not record whether M2 needed to make an adjustment.

### 4c. Template versioning

**[D]** Checklist templates are snapshotted when each bike task is created. Template edits apply only to future tasks, preserving completed checks and a trustworthy audit trail.

**[I]** Admin checklist management needs versioning: process changes create a new active checklist version while prior versions remain in history and can be made active again.

**[D]** Prep checklist templates are category-specific for e-city, e-road, road, gravel, and MTB bikes. Return templates are also category-specific.

### 4d. Shared Notes field

**[D]** One shared task-level notes field for recording changes to the bike. Latest contents only; no notes revision system.

**[D]** Shared Notes follow this rental into return checking (return-check mechanic sees prep and M2 Notes). Notes do not automatically carry to a subsequent rental.

**[D]** Do not automatically show a previous rental task's shared Notes when the same physical bike appears in a later rental.

### 4e. Flat vs. bundled order accessory handling

**[I]** Booqable bundled orders link each accessory to its bike through `parent_id`, enabling automatic per-bike accessory display. Flat orders place bikes and accessories at the same level; per-bike association cannot be inferred reliably.

**[D]** For flat orders, a manager manually outlines each bike's accessories in that bike's `extra_information` field.

**[D]** If a flat order lacks manager-authored accessory information, the mechanic contacts the manager and flags the bike task as `needs_attention`.

**[D]** A mechanic may hand off a task even while missing flat-order accessory information remains flagged as needs-attention.

**[D]** Render bundle-linked accessories and manager-authored `extra_information` in one bike-focused panel with clear source labels. Never guess flat-order accessory associations.

### 4f. Structured modifications field

**[D]** Structured modifications field on the task + read-only "last touched" lookup by `stock_identifier` now. Full bike-identity/usage-analytics entity deferred as a separate future feature.

### 4g. Queue and discoverability

**[I]** A major repeated-use failure is being unable to quickly find the next available task. Provide a default "Available now" queue that hides assigned or non-actionable work and lets a mechanic claim the next task in one tap.

**[D]** The available-task queue prioritizes bikes by order start date, earliest first.

**[D]** Order-change warnings (from Booqable data changes) are informational and must not block a mechanic from finishing or handing off their task.

### 4h. Manager at-a-glance view (Should tier — not first release)

**[I]** Manager wants: quick date-scope filters (tomorrow/upcoming) showing counts, filter by needs-attention, and status-breakdown tiles (today/upcoming/needs-attention counts).

---

## 5. Constraints and Integrations

**[D]** Booqable remains the order-lifecycle authority. Workshop tasks translate rental intent into physical work; they do not own the lifecycle.

**[I]** Booqable order-updated webhooks drive both initial ingestion and subsequent synchronization.

**[I]** Draft/new Booqable orders are currently believed to be filtered out. Mechanics must not start bike work before the order reaches `reserved` status.

**[I]** Bundled Booqable accessories are not removed as lines; they are deselected by changing the accessory value to `No`. A selected-to-No transition must generate a removal requirement so physical configuration converges with Booqable.

**[I]** Booqable accessory identifiers may exist but their stability and suitability for checklist-rule mapping must be verified during technical discovery. Carried as explicit implementation assumption.

**[I]** Main feasibility risk: reliably turning Booqable bike/accessory data and later changes into precise dynamic checklist items. Defer implementation details to technical discovery; preserve the desired workflow.

**[D]** Offline mode and retained unsaved changes are explicitly out of scope for this release.

**[D]** Full lifecycle ownership (replacing Booqable end-to-end) is explicitly out of scope.

**[D]** Cross-rental physical-bike history and usage analytics are deferred as a separate future feature.

**[I]** An existing bike-fit report feature exists in the codebase. Potential cross-reference to checklist items was noted and parked.

---

## 6. Success Signals

**[I]** Historical record of who did the first check vs. the re-check, usable for mechanic performance tracking.

**[I]** Attention flags have an audit trail of whether/when they were addressed (replaces paper attention marks with no log).

**[I]** Rental-specific changes to the bike are recorded in Notes and available to the return-check mechanic for restoration.

**[I — Should tier]** Manager at-a-glance counts and date-scope filters.

**[I — Should tier]** Performance views using M1/M2 attribution.

**[I — Should tier]** Changed-work visibility through normal task filtering.

**[I — Should tier]** Broader workshop analytics after trusted usage data exists.

---

## 7. Rejected and Retired Alternatives with Rationale

All items below are explicitly recorded as rejected, retired, simplified away, or deferred in the session.

### Generated accessory checklist items (runtime items derived from Booqable accessory data)
Status: Retired model.
Rationale: Replaced by always-visible admin-authored items linked to bounded setup categories. Admin owns work language.

### Explicit "Release to workshop" gate
Status: Rejected.
Rationale: No real operational moment when a reserved order becomes distinctly "workshop-ready." Tasks are living work that absorbs updates.

### Changed / Revalidation as a separate pipeline, task type, or status
Status: Removed.
Rationale: Changed work returns to ordinary Prep and Re-check queues on the same task. No Changed status or parallel workflow.

### Manager urgent-mark / ping mechanism targeting specific mechanics
Status: Removed.
Rationale: Reopened work follows the normal start-date-prioritized queue. The ping added complexity without clear gain.

### Automatic mechanic assignment
Status: Rejected.
Rationale: System cannot know real-world mechanic workload or availability.

### Accessory dependency bundles (mapping accessory changes to related stable admin checklist items)
Status: Rejected.
Rationale: Too impractical to reliably predefine relationships between Booqable accessory changes and manually authored checklist items. Stakeholders considered and rejected this.

### Admin complete-without-check override for revalidation
Status: Rejected.
Rationale: Would undermine the independent-quality guarantee and make the verification audit trail untrustworthy. Reassignment is allowed; checking remains required.

### Separate accessory adjustment task type
Status: Rejected.
Rationale: Would expand the task model unnecessarily. The existing bike task absorbs reopened setup work.

### Separate M1 and M2 checklist templates
Status: Superseded.
Rationale: Unified per-category template with per-item M1/M2 applicability flags is simpler and prevents prep and re-check lists from drifting.

### Overloaded single checked state ("performed where applicable, or reviewed/not applicable")
Status: Superseded.
Rationale: Replaced by explicit Done and N/A outcomes, removing false-audit assertions.

### Initial No selections hiding category-linked items; sections disappearing after M2 verification
Status: Superseded.
Rationale: Always-visible model supersedes both rules. Category links control grouping and selective reset, not runtime visibility.

### Notes as separate timestamped attributed entries per mechanic
Status: Superseded.
Rationale: One shared field, latest contents only. No revision system.

### PSI/value items requiring M2 to independently enter or confirm a second PSI value
Status: Superseded.
Rationale: M2 records only that verification passed. No second value entry required; adjustment is physical, not logged.

### Derived stage model (stage = earliest stage with an invalidated-or-incomplete required item)
Status: Logged as decision then explicitly retracted by user as unconfirmed.
Rationale: User explicitly retracted at session resumption. Replaced by selective reopening behavior rules.

### Full bike identity history (cross-rental usage frequency, cumulative parts and modifications)
Status: Deferred.
Rationale: Separate future feature. Not the mechanics-workflow problem.

### Full order-lifecycle ownership (replacing Booqable)
Status: Explicitly excluded.
Rationale: Booqable already works end-to-end for lifecycle. The pain is at the workbench, not in order tracking.

### Offline resilience / retained unsaved changes
Status: Explicitly excluded.
Rationale: Moved out of scope. Network error notification is informational only.

### Bikefit cross-reference on checklist items
Status: Parked.
Rationale: Potential connection to existing bikefit data. Intentionally not needed now.

### Per-accessory admin rule configuration (admin discovers Booqable accessory groups and configures checklist rules per group)
Status: Retired.
Rationale: Depends on a persistent Booqable accessory catalog that does not exist and would add unnecessary synchronization complexity. Replaced by the bounded five-category model.

---

## 8. Assumptions and Open Questions

### Explicit implementation assumptions (carry to technical discovery)

**[I]** Booqable accessory identifiers may exist but their stability and suitability for driving selective reset per category must be verified. Treat as explicit assumption; do not resolve during requirements.

**[I]** Main feasibility risk: reliably identifying which specific Booqable category changed and mapping it to the correct admin-linked checklist items. The desired workflow is specified; implementation details are deferred.

**[I]** Booqable webhooks drive ingestion and synchronization. Draft/new orders are believed to be filtered out but this must be confirmed.

**[I]** The five setup categories (Pedals, Saddle, Wheelset, Power meter, Computer mount) must be verifiable in Booqable's data model as reliably distinguishable groups.

**[I]** The bundled order `parent_id` linkage for per-bike accessory identification is assumed to be stable enough to use for the accessories panel.

### Open questions not fully resolved in the session

**Task stage representation**
The "derived stage" proposal (stage = earliest stage with an invalidated-or-incomplete required item) was logged as a decision, then explicitly retracted by the user as unconfirmed. The convergence specified selective-reopening behavior rules but did not re-state a formal rule about how the stage field itself is tracked vs. derived. This remains technically underspecified.

**`extra_information` diff presentation**
Showing previous-versus-current `extra_information` during revalidation was decided to be desirable when low-friction UX is achievable; exact diff presentation is deferred to UX design.

**[INF] Category header when a setup category has always had a No value**
The always-visible rule implies items should be shown with the No-value header and be resolvable as N/A, but no explicit decision was recorded for the initial-No case. (Selected-to-No transitions are explicitly specified; initial-No is not.)

**[INF] Accessories panel vs. `extra_information` built-in item for bundled orders**
Both apply to bundled orders (accessories panel shows bundle-linked accessories; `extra_information` item requires M1/M2 confirmation). How they are displayed together is not fully specified.

**Per-stage mechanic ownership model**
A doubt was raised about whether per-stage mechanic assignment is the right ownership model. The convergence effectively resolved it by making M1/M2 roles per work cycle rather than fixed task identities, but this resolution was implicit in behavioral rules rather than a stated explicit decision answering the original doubt.

---

## 9. Conflicting and Superseded Decisions

Listed chronologically. Authoritative version indicated for each.

### Two separate M1 and M2 checklist templates → unified template → always-visible category-linked model
Earlier: Prep checklist for M1, separate check checklist for M2 (mirroring paper).
Middle: Unified versioned checklist per bike category with per-item recheck flags, shared M1 target values, separate M1/M2 attribution (log item 120).
Final/Authoritative: Always-visible admin-authored checklist with optional links to five setup categories; per-item M1/M2 applicability admin-configured (MoSCoW convergence, item 347).

### Accessories separate from checklist completion → stakeholder correction: dynamic runtime checklists required
Earlier: Accessories remain separate from checklist completion; accessory-only changes require no M2 re-check (items up to 97).
Superseded at: Items 135–136 by explicit stakeholder correction.
Authoritative: Stakeholder correction — runtime bike checklists must be dynamic; current Booqable configuration determines applicable work beyond the category template.

### Generated runtime accessory checklist items → always-visible admin checklist with category links
Earlier: Checklist = versioned admin template + runtime accessory-derived checks + `extra_information` confirmation; bundled orders get one item per structured accessory (items 142–165).
Superseded at: MoSCoW convergence (item 347).
Authoritative: Always-visible admin-authored model. Generated accessory items are retired.

### Explicit "Release to workshop" readiness gate → living-task model with no readiness gate
Earlier: Reserved creates a pending-setup task; manager Release action makes it claimable after bike identity, accessory information, and shortage resolution are confirmed (item 133).
Superseded at: Item 223.
Authoritative: Reserved task immediately in queue; no readiness gate.

### Derived-stage rule for stage tracking → retracted as unconfirmed
Earlier logged as decision: Stage is derived as earliest stage with an invalidated-or-incomplete required item; not a separately-tracked field (item 197).
Retracted at: Item 201. User explicitly stated they had not committed to this proposal.
Authoritative: Not committed. Selective reopening behavior rules (items 202–220) replace the earlier proposal without re-stating a formal stage derivation rule.

### Changed/Revalidation as a distinct parallel pipeline → normal workflow reuse
Earlier: A "revalidation" concept with separate task type, status flags, and manager queue (items 187–188, 208).
Superseded at: Items 207–217.
Authoritative: Reuse normal workflow; same task, normal Needs Prep queue, affected work only; no Changed status or separate pipeline.

### Manager urgent-flag/ping mechanism → removed
Earlier: Manager's urgent-flag action targets the affected mechanic, bumps changed item to top of their list (items 193–194).
Superseded at: Item 215.
Authoritative: No special ping mechanism.

### Initial No selections hide category-linked items; selected-to-No sections disappear after M2 verification
Earlier: Items 282–283.
Superseded at: Items 292, 294.
Authoritative: All admin-defined items always visible; category links control grouping and invalidation, not visibility.

### Provisional overloaded checked state → explicit Done and N/A
Earlier: Single checked state means "performed where applicable, otherwise reviewed/not applicable" (item 281).
Superseded at: Items 293–294.
Authoritative: Explicit Done and N/A outcomes.

### PSI: M2 independently enters or confirms a second PSI value
Earlier: M2 independently enters or confirms a PSI value (item 89).
Superseded at: Items 103–104.
Authoritative: M2 records verification passed only; no second value entry; whether adjustment was needed is not logged.

### If a dynamic accessory changes during M2, rewind to M1 and return to the same M2 for verification
Earlier: Item 167.
Superseded at: Items 218, 222.
Authoritative: Any workshop-relevant Booqable change arriving during M2 sends the task back to Prep unassigned; any mechanic — including the former M2 — may claim as new M1 for the affected work.

### Accessory-only reopening does not repeat M2 re-check stage
Earlier: Item 97.
Superseded at: Stakeholder correction (items 135–136) and final category-linked model.
Authoritative: Per-item M1/M2 applicability governs every cycle including reopened work. If a changed category resets only M1-applicable items, the task completes after M1; M2 occurs only when at least one reset item is configured for M2.

### Five setup categories: "tubeless setup and computer mount" vs. "pedals, saddle, wheelset, power meter, computer mount"
Earlier list (item 164, from generated-items phase): pedals, tubeless setup, saddle, computer mount.
Later list (item 264, from always-visible category-link phase, confirmed by HTML): pedals, saddle, wheelset, power meter, computer mount.
Authoritative: Pedals, Saddle, Wheelset, Power meter, Computer mount — from the accepted model.

---

## MoSCoW Boundary (Recorded Decision)

### MUST — First Release
- Booqable-driven per-bike task queues, ordered by rental start date
- Versioned, category-specific Prep and Return checklist templates
- Always-visible admin-authored Prep items with optional links to five setup categories
- M1 preparation plus independently attributed M2 verification where configured
- Action responses as Done/N/A; value responses as required or optional values
- Automatic selective reopening when linked Booqable setup category changes after work
- Shared task Notes for rental-specific bike changes and M2 corrections
- Return checklist triggered by Booqable `returned` status, with Notes acknowledgement
- Attention and audit history; cancellation/removal preserved read-only

### SHOULD — Follow-up
- Manager at-a-glance counts and date-scope filters
- Performance views using M1/M2 attribution
- Changed-work visibility through normal task filtering
- Broader workshop analytics after trusted usage data exists

### WON'T — This Release
- Replace Booqable's full order lifecycle
- Cross-rental bike history or usage analytics
- Offline mode and retained unsaved changes
- Automatic mechanic assignment
- Generated accessory checklist items
- Shared Notes revision history
- Bikefit cross-reference
- Separate revalidation tasks, statuses, or manager ping flows
