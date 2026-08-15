---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-echelon-cycling-hub-admin-2026-08-07/prd.md
  - _bmad-output/planning-artifacts/prds/prd-echelon-cycling-hub-admin-2026-08-07/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-echelon-cycling-hub-admin-2026-08-10/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-echelon-cycling-hub-admin-2026-08-07/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-echelon-cycling-hub-admin-2026-08-07/EXPERIENCE.md
  - _bmad-output/planning-artifacts/research/technical-booqable-selective-warehouse-spike-research-2026-08-10.md
  - _bmad-output/planning-artifacts/research/technical-workshop-architecture-open-activation-blockers-research-2026-08-12.md
---

# echelon-cycling-hub-admin - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for echelon-cycling-hub-admin, decomposing the requirements from the PRD, UX Design, Architecture, and supporting technical research into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: When an order becomes reserved, reconcile independently addressable Bike Tasks from exact physical-bike identities. A quantity-one line may create one provisional, non-claimable Waiting for Bike ID task; a multi-quantity line creates tasks only for exact distinct StockItem assignments. Represent any unidentified quantity as one deduplicated Integration Incident and never fabricate unit identity from quantity, position, title, or ordinals.

FR2: Preserve physical-bike identity using Booqable's opaque StockItem external ID while displaying `stock_identifier` for human confirmation. Replacement closes the old task as terminal Replaced and creates a new task; explicit removal makes the task read-only; re-add follows the defined incarnation rules without moving history between bikes.

FR3: On authoritative cancellation or explicit validated bike removal, make affected tasks read-only, preserve history, and atomically clear assignment. On valid same-bike reactivation, preserve safe stage and evidence, reconcile current intent, selectively reopen changed work, and return the task unassigned; never infer mechanic presence from an open screen, session, stage, or recent save.

FR4: Expose the lifecycle `Waiting for Bike ID → Needs Prep → In Prep → Needs Re-check → In Re-check → Preparation Resolved → Needs Return Check → In Return Check → Done`, skipping Re-check when no M2-enabled work applies. Keep Cancelled, Replaced, and Force-closed as read-only outcomes and Needs Attention orthogonal to lifecycle.

FR5: Allow an Admin or Manager to reset stale work to unassigned Needs Prep while preserving pre-reset history and invalidating unresolved current-cycle work.

FR6: Provide a default mechanic dashboard with My Work and Available Now. Order unassigned claimable Needs Prep, Needs Re-check, and Needs Return Check tasks by earliest rental start, show Waiting for Bike ID as visible but non-claimable, and let mechanics resume assigned work at the authoritative unresolved point.

FR7: Use one Bike Task as the claimable unit so bikes from the same order can progress independently and in parallel, including entering Re-check as soon as each bike's own Prep is complete.

FR8: Support mechanic self-claim and explicit Admin/Manager assignment or reassignment without automatic assignment. Preserve resolved outcomes and attribution unless reset or source invalidation applies, and show the receiving mechanic retained, invalidated, and unresolved work plus current ownership.

FR9: Resolve concurrent claims first-writer-wins: exactly one valid claimant succeeds and later claimants receive the authoritative assignee state.

FR10: Scope M1 and M2 to the current Work Cycle. A new cycle begins when Prep becomes actionable initially or through qualifying reopening; the mechanic who performs accepted handoff is M1, and M2 must differ unless the per-task manager override is recorded.

FR11: Let Admins/Managers create, activate, supersede, and reactivate separate Prep and Return Checklist Template versions for e-city, e-road, road, gravel, MTB, and E-MTB. Do not block activation because a Setup Category lacks a linked Item.

FR12: Copy an immutable Prep Snapshot into each task at creation and an immutable Return Snapshot when Return Check begins, using the then-active category/phase version. Later template changes affect only future snapshots.

FR13: Let Admins/Managers define each Item's Action or Value type, required status, M1 applicability, M2 applicability, and optional Setup Category link. Enforce M2-enabled implies M1-enabled, including built-in Items.

FR14: Keep every admin-authored Item visible regardless of Booqable selection. Use Setup Category links only for grouping, context, and invalidation; show `No` values and permit N/A for non-applicable Action Items in v1.

FR15: Display the current Booqable Setup Category value for linked Item groups and, during unresolved changed work, identify the prior value.

FR16: Resolve Action Items explicitly as Done or N/A, with either satisfying completion while remaining distinguishable in history.

FR17: Require a value for required Value Items, permit optional Value Items to remain blank, and never offer N/A for Value Items.

FR18: Prevent M1 handoff while any required Prep Item is unresolved. Use only server-confirmed outcomes, allow optional Items to remain unresolved, and leave lifecycle and ownership unambiguous after transition.

FR19: Inject immutable built-in required confirmation Items for Booqable `extra_information` (M1 and M2) and ambiguous relevant configuration changes. Show current and previous `extra_information` on demand; for broad configuration review, identify known source, scope, current/prior intent, and why selective classification failed.

FR20: When M1 completes required Prep, immediately enter Needs Re-check if any M2-enabled Item applies to the current Work Cycle; otherwise resolve Preparation directly.

FR21: Require M2 to resolve applicable Re-check Action Items independently as Done or N/A and freshly attest Value Item verification; M1 outcomes cannot satisfy M2 work.

FR22: Show the current Work Cycle's M1 identity to M2.

FR23: Let M2 record corrections without approve/reject semantics. Durable return-relevant corrections become Structured Modifications; supplementary explanation may use Notes.

FR24: For M2-enabled Value Items, show M1's target value and let M2 attest verification passed without entering a duplicate value or adjustment flag.

FR25: Enforce that M2 differs from current-cycle M1 unless an Admin/Manager approves the explicit, auditable per-task and per-Work-Cycle override request defined in FR45.

FR26: Classify Booqable changes as relevant or irrelevant and use broad `review_updated_configuration` as the initial relevant-change mode. Epic 6 may introduce safely mapped targeted invalidation only under a complete stable Setup Category mapping version. Compare against last physically attested intent and converge repeated unresolved changes to latest intent without duplicate cycles or resets.

FR27: Before first claim, refresh changed Booqable details silently without persistent change alerts.

FR28: If relevant change arrives during active M1 Prep, retain M1 assignment, identify the change, invalidate affected work, and block handoff until affected required outcomes are confirmed again.

FR29: If relevant change arrives during Needs Re-check or In Re-check, return the same task to unassigned Needs Prep and the ordinary queue.

FR30: If relevant change arrives after Preparation Resolved but before pickup, return the same task to unassigned Needs Prep with only affected work reopened.

FR31: In every reopened Work Cycle, repeat M2 verification for invalidated M2-enabled Items and preserve independence from the reopened cycle's M1 unless overridden.

FR32: Do not reopen completed Prep after pickup. During Needs Return Check or In Return Check, configuration refresh may update context but must not restart Prep, Re-check, or Return work.

FR33: Visibly highlight changed Items until their affected outcomes are server-confirmed, then clear emphasis without separate acknowledgement. Record attributable prior/current values, affected Items, and Work Cycle effect for every accepted relevant change.

FR34: Provide one shared latest-value Notes field per Bike Task, carry it into same-rental Return Check, do not carry it into later rentals, and do not treat it as the sole durable record of return-relevant changes.

FR35: Present bundle-linked accessories and manager-authored `extra_information` together in a bike-focused context with clear source labels.

FR36: Never infer flat-order accessory-to-bike associations. Rely on per-bike manager-authored `extra_information`; if absent, allow Needs Attention while still permitting mechanic handoff.

FR37: Let mechanics create durable, attributable Structured Modifications that Notes edits cannot overwrite, and provide a read-only latest same-`stock_identifier` touch lookup explicitly bounded as not complete cross-rental history.

FR38: Distinguish system-raised Needs Attention, mechanic-recorded found-and-fixed history, and mechanic-raised Needs Attention. First-release mechanic reasons are exactly `same_mechanic_recheck_override`, `missing_or_unclear_bike_order_information`, and `manager_decision_needed`; the latter two require a short creation explanation while the override request requires none. Keep attention non-blocking for mechanical completion and Done while unresolved flags remain visible to managers.

FR39: When an order is authoritatively returned, put each currently associated eligible task into Needs Return Check with an immutable Return Snapshot. Force unfinished Prep/Re-check tasks into return work, clear assignment, preserve unfinished history, exclude Cancelled/Replaced tasks, and make repeated/stale reconciliation idempotent and non-regressive.

FR40: Use one return-check mechanic with no M2 stage.

FR41: Show the return-check mechanic same-rental Notes, Structured Modifications, and unfinished Prep/Re-check context.

FR42: Prevent Return Check completion until every open same-rental Structured Modification is individually acknowledged; Notes cannot substitute for acknowledgement.

FR43: Let Admins/Managers discover and resolve unresolved Needs Attention flags. Missing/unclear information and manager-decision reasons require a short resolution note; same-mechanic override requests resolve through FR45. Resolution clears only the selected flag, and open attention must not prevent task completion or Done.

FR44: Provide a distinct Admin/Manager force-close action for abandoned work, yielding a read-only terminal Force-closed outcome distinct from Done, Cancelled, and attention resolution.

FR45: When no second mechanic is available, take no automatic action. Let M1 raise a same-mechanic Re-check override request for the current Bike Task and Work Cycle without explanation, and require an Admin/Manager to Approve or Decline it. Approval may assign that cycle's Re-check to M1 or the approving Admin/Manager for that task only; Decline preserves ordinary eligibility. Record requester, decision, deciding actor, time, task, Work Cycle, M1, and resulting assignment without requiring a written manager note in v1.

FR46: Preserve actor/system source and time for claims, assignments, reassignments, Item outcomes, handoffs, verification, Structured Modifications, attention, overrides, resets, cancellation, replacement, invalidations, lifecycle changes, and force-close.

FR47: Treat update notifications only as triggers to refetch current Booqable authority. Make duplicate and out-of-order deliveries converge idempotently, prevent stale lifecycle/configuration regression, and respect authoritative precedence from reserved through active/picked-up to returned, with current cancellation suspending Prep.

FR48: Reject stale open-screen saves and transitions after ownership or lifecycle changes, surface the new authoritative state, and preserve typed input long enough for explanation or valid retry.

### NonFunctional Requirements

NFR1: The complete Prep/Re-check flow must be practical without paper on a mounted workshop tablet; frequent actions must be readable and tap-friendly, and the next physical action and current target configuration must be available without opening Booqable.

NFR2: Mechanic workflows must support phones and landscape/portrait tablets; manager workflows must also support desktop.

NFR3: Duplicate, delayed, missed, and out-of-order Booqable signals must converge from the same current source state to the same correct local state without losing or duplicating Bike Tasks.

NFR4: Every save, claim, handoff, and lifecycle transition must distinguish unsaved, pending, failed, and server-confirmed state. Failures must identify the action, retain open-screen input for retry, never appear successful, and exclude unconfirmed outcomes from transitions.

NFR5: Route and page transitions must never present a blank unexplained wait. Every in-flight mutation must provide obvious pending feedback, remain distinct from confirmation, and prevent duplicate submission.

NFR6: Attribution and historical outcomes must remain trustworthy after reassignment, reopening, reset, cancellation, replacement, and manager intervention.

NFR7: Only authenticated staff may access Workshop Tasks. Mechanic and Admin/Manager operations must be enforced through existing server-side role boundaries and RLS; partners must have no Workshop access.

NFR8: V1 is online-only and need not recover unsaved data after browser/session loss, but transient failures while the task remains open must meet the confirmed-save and retry contract.

### Additional Requirements

- AR1: Treat this as a brownfield feature, not a starter-template project. Replace the existing generic `src/app/workshop/page.tsx`/Kanban surface while retaining compatible App Router guards, layouts, Subframe shell, and loading conventions.
- AR2: Keep a transactional modular monolith: Next.js owns presentation/authenticated adapters, PostgreSQL owns atomic workflow decisions, and no new microservice, broker, ORM, raw-payload warehouse, cache authority, or edge runtime is introduced.
- AR3: Keep Booqable translation, API validation, and normalization solely in `src/lib/booqable`; `src/lib/workshop-tasks` and `/workshop` must consume only local normalized contracts, views, and RPCs.
- AR4: Evolve the existing shared customer/order/order-item projection additively instead of creating a parallel Workshop copy. Preserve existing bookings, orders, customer, partner-attribution, and reporting consumers through expand–prove–switch–contract cutover.
- AR5: Define one repository-owned, versioned integration envelope with generated/fixture-checked TypeScript and PostgreSQL representations, drift detection, compatibility rules, `order_graph` and `resource_batch` shapes, known/unknown/removed semantics, completeness, source vectors, fingerprints, and fixed result vocabulary.
- AR6: Use one ingestion coordinator as sole writer of canonical source and membership state, invoking Workshop-owned derivation in the same PostgreSQL transaction. Notifications are signals only; raw webhook fields never become source truth.
- AR7: Apply source snapshots idempotently and atomically. Equal accepted semantic state is a no-op; stale, conflicting, incomparable, unauthorized additions, and unsupported shapes fail closed or quarantine without domain mutation.
- AR8: Generic absence is permanently non-closing in v1, even for transport-complete relationships. Only validated explicit archive/tombstone or separately fixture-proven removed evidence may close source children, memberships, or tasks.
- AR9: Preserve immutable local membership identity and replacement-chain incarnations. Quantity-one provisional identity may use `single`; multi-quantity membership requires exact StockItem identity. Enforce interval-overlap safety across rentals and retain referenced source/history with restrictive deletes.
- AR10: Store explicit task lifecycle, source-availability overlay, terminal outcome, Work Cycles, assignment, and monotonically increasing workflow revision. Only transition RPCs may change workflow state.
- AR11: Put every multi-record domain mutation in a named PostgreSQL RPC that validates expected revision, authorization, stage, assignment, cycle, source state, evidence, and completion gates, then commits current state and history together or rolls back.
- AR12: Freeze activated checklist versions, serialize activation and snapshot selection with a shared advisory-lock key, inject immutable built-in Item definitions, retain superseded evidence generations, and prevent deletion of referenced versions.
- AR13: Keep normalized current state plus append-only attributable events. Allocate immutable per-task sequence under task lock and deterministic global ordering; revoke direct event insert/update/delete/truncate from application roles including service role.
- AR14: Separate task workflow revision from Item evidence, Notes, attention, modification, and acknowledgement revisions. Permit disjoint Item saves to commute, use compare-and-set for same-evidence edits, and return stable typed stale/conflict results.
- AR15: Keep lifecycle, Notes, Structured Modifications, acknowledgements, found-and-fixed records, attention, and integration incidents as orthogonal records with defined reason/incident catalogues and deduplication scopes.
- AR16: Use RLS-protected/security-invoker read models and narrowly owned capability RPCs for writes. Keep internal `SECURITY DEFINER` functions in an unexposed schema with `search_path = ''`, schema-qualified objects, revoked `PUBLIC` privileges, locked default privileges, and minimum execution grants.
- AR17: Exclude `partner` from Workshop reads/actions. Expose task context through a field-minimized capability containing only approved bike, order, customer-display, address, rental, setup, accessory, Notes, and `extra_information` fields—never customer email, phone, birthday, sex, or unrelated source rows.
- AR18: Serve queues, progress, attention, Activity, last-touch, and incident status from PostgreSQL views/read RPCs; perform sorting, pagination, filtering, eligibility, aggregation, and cross-table lookups in PostgreSQL, with URL search parameters for list state.
- AR19: All server actions must use `withAuth`, map expected failures to `{ ok: false, error }`/typed result codes, log unexpected failures with context, explicitly revalidate affected paths, and never use service-role access in Workshop routes or user-facing loaders.
- AR20: All loaders must return data plus `error`; distinguish successful empty/not-found from load failure and surface in-context errors instead of rendering empty success.
- AR21: Consequential transitions must perform a just-in-time canonical refresh, require an exact current database-signed freshness proof plus displayed workflow revision, then re-read local pending evidence under lock. Ordinary Item/Notes/attention/modification saves remain local-only.
- AR22: Implement a durable integration inbox, coalesced refresh intents, attempt/receipt/JIT generations, leases, bounded backoff/retry budgets, exhausted/quarantined states, operator successor retry, reconciliation runs/checkpoints, freshness/coverage watermarks, and deduplicated integration incidents.
- AR23: Protect one bounded Node.js worker route with `Authorization: Bearer ${CRON_SECRET}`. Vercel Cron starts low-latency intents and nightly sweep work; worker batches must stop within a measured deployment budget and remain recoverable after interruption or overlap.
- AR24: Classify bike category from exactly one controlled ProductGroup `tag_list` value: `workshop-road-bike`, `workshop-e-road-bike`, `workshop-e-city-bike`, `workshop-gravel-bike`, `workshop-mtb-bike`, or `workshop-e-mtb-bike`. Require corresponding `workshop-*-bike-bundle` agreement, persist admitted Product/ProductGroup/Bundle tags, exclude untagged entities, and fail closed with an incident for unknown, multiple, conflicting, or bundle-disagreeing Workshop tags. Labels are display-only and tag values never replace exact StockItem identity.
- AR25: Use broad `review_updated_configuration` as the initial relevant-change mode and keep accessory tags uninterpreted until Epic 6. Targeted Setup Category invalidation remains disabled until all five active Setup Categories have stable source identifiers and fixture-backed null/unknown/changed/removed normalization.
- AR26: Derive per-bike reserved/started/stopped phase only from exact Planning/StockItem context after target-account fixtures cover reserved, partial/full start, partial/full stop, cancellation, removal, and re-add. Keep phase unknown and disable automatic Return where proof is incomplete.
- AR27: Preserve shared brownfield authority/provenance through a migration-owned field manifest. Keep local and Booqable customers distinct, do not auto-merge PII, retain existing partner scoping, and defer automated archived-customer anonymization until policy approval.
- AR28: Version the Workshop event catalogue and task-context contract with generated/fixture-checked producer and consumer representations, stable unknown-event fallback, additive compatibility, and explicit deprecation rules.
- AR29: Implement one database-owned rollout/enrollment control plane with `disabled | shadow | pilot | enabled | emergency_disabled`, attributable transitions, immutable pilot cohorts/epochs, exact boundary disposition, database-enforced access/derivation predicates, and emergency stop that retains source ingestion and repair.
- AR30: Disabled derivation must preserve source observation and derivation debt without exposing routes/actions or creating tasks. Shadow mode may materialize proof only; pilot mode derives only explicitly enrolled membership; replacement/correction successors inherit enrollment.
- AR31: Correct false irreversible derivation through an admin-only immutable correction-successor capability; never edit the false terminal row or permit branching successors. Integration, API, service-role, mechanic, or manager roles cannot execute it.
- AR32: Before foundation expansion, stop logging supplied webhook secrets, remove or strongly authenticate and least-privilege the service-role sandbox sync route, apply Supabase SSR refresh cache-prevention headers, and verify no preview/branch deployment receives Booqable, service-role, or Cron credentials.
- AR33: Upgrade Next.js from unsupported 14 through a tested supported-LTS compatibility path, verify React/Subframe/editor/PDF/email/auth/routes, pin Node 24.x and one locally tested stable Supabase CLI in source and CI, and verify PostgreSQL 17 plus required extension parity.
- AR34: Add redacted adapter fixtures, pgTAP database tests, and a true multi-session harness covering the complete AD-14 proof floor: identity/cardinality/incarnation, lifecycle/archive/absence, comparators, atomic rollback, revisions, privileges, append-only events, concurrent claims/ingestion, activation-vs-snapshot, and expired-lease completion.
- AR35: Use only local Supabase migration application/testing during development. Remote DDL is CI-only after merge. Require local reset/tests/lint/types, staging disabled/shadow proof, production disabled proof, two stable sweeps, privilege/freshness evidence, runbooks, explicit pilot approval, separate general activation, and a separate paper-retirement evidence gate.
- AR36: Keep app structure consistent with the architecture seed: route-local components under `src/app/workshop/_components`, loaders/actions/types under `src/lib/workshop-tasks`, Booqable adapters/contracts/schemas/workers under `src/lib/booqable`, and idempotent SQL/RLS/views/RPCs/tests under `supabase`.
- AR37: Use UUID local keys, opaque text external IDs, plural `snake_case` database names with `workshop_`/`booqable_` prefixes, UTC `timestamptz`, explicit source versus ingestion times, stable queue tie-breakers, and restrictive cardinality/uniqueness constraints.
- AR38: Preserve activation and repair evidence in a durable environment-proof manifest binding commit, migrations, contract versions, privileges, config, rollout epoch/cohort, boundary manifest, test results, incidents, exceptions, and approvers; invalidate proof whenever a bound fact changes.

### UX Design Requirements

UX-DR1: Inherit the existing Echelon Subframe admin shell, Geist typography, light palette, 4px spacing rhythm, 4/8/12px radii, restrained shadows, route loading conventions, and staff-role navigation. Do not create a separate workshop-console identity or dark theme.

UX-DR2: Implement the specified Workshop semantic tokens: amber brand/attention, white/slate surfaces, teal confirmed success, red failure/invalidation/destructive state, dark visible focus, and solid glare-resistant surfaces. Validate contrast in implementation and never encode state by color alone.

UX-DR3: Make bike identity, phase, ownership, next action, changed requirements, and terminality visually precede decorative/supporting detail. Keep required instructions in primary/strong body text, permit labels to wrap, and use short literal non-celebratory copy.

UX-DR4: Build Mechanic Dashboard with My Work and Available Now as simultaneously visible, strictly equal landscape panels; stack My Work first in portrait. Resolve each queue's empty/error state independently and show Waiting for Bike ID visibly without claim controls.

UX-DR5: Build Bike Task Detail as one phase-aware route. Put full-width notices first, then narrower context beside wider checklist in landscape; order notices, context, checklist, and sticky lifecycle controls in portrait/phone. Keep checklist groups in continuous scroll, never accordions.

UX-DR6: Build Manager Dashboard as scan-first: Needs Attention first, ordered by nearest rental start, then a separate Waiting for Bike ID section. Use whole-row navigation with no inline decision controls; Waiting for Bike ID opens the corresponding Booqable order.

UX-DR7: Build Manager Attention Detail with attention reason and resolution controls first, followed by full task context and other manager controls. Render already-resolved concerns read-only with resolver and time rather than as empty forms.

UX-DR8: Build Checklist Template Library plus Checklist Template Detail/Editor for phase/category versions, active/superseded status, create/edit/activate/supersede/reactivate flows, future-snapshot consequence confirmations, and explicit empty/error/stale states.

UX-DR9: Build a separate read-only Activity/History surface with chronological actor/system, time, verb, phase/Item context, stable unknown-event fallback, terminal events, and no mutation controls or color-only event taxonomy.

UX-DR10: Implement `workshop-task-card` showing bike, order/client, rental dates, phase, assignee, progress, attention/change context, and one large phase-named Claim/Continue action with in-card pending and concurrent-loss refresh behavior.

UX-DR11: Implement `attention-strip` as a persistent full-width amber, bordered block with explicit “Needs Attention” and concrete reason; it must be loud context but non-blocking and never a badge-only or overlay-only signal.

UX-DR12: Implement `configuration-change-notice` as persistent full-width red-tinted in-context feedback naming source, prior/current values when known, affected scope, time, and work effect. It is not dismissible or toast-only and clears only after affected server-confirmed outcomes.

UX-DR13: Implement `task-context-panel` with physical bike identity first, then approved order/customer/address/date fields, current setup including visible `No`, source-labelled accessories, Notes, current `extra_information`, and the bounded last-touch context. Booqable-owned values are read-only.

UX-DR14: Implement `checklist-group` as an always-expanded Setup-linked group with current context. Reopened groups use a thicker red boundary, explicit “Reopened” text, prior/current values, and emphasis that clears only after affected Items are confirmed.

UX-DR15: Implement `action-item-tile` with separate adjacent, tile-sized Done and N/A controls, explicit selected label/icon/border, immediate one-tap save, local pending lockout, changed-state cue, and no whole-tile state cycling.

UX-DR16: Implement `value-item-tile` with a large field, optional unit, no N/A, immediate Unsaved state, approximately two-second idle autosave, and flush on blur, Enter, route-leave intent, Handoff, or Complete. Keep typed and confirmed values visually distinct.

UX-DR17: Implement `item-save-status` inside each Item with Unsaved, Saving, Saved, and Retry. Show success only after server confirmation; keep action-specific failure and retry local and retain typed input while the task remains open.

UX-DR18: Implement `sticky-lifecycle-bar` persistently at the viewport bottom with confirmed progress and phase-specific Handoff/Complete action. Keep action visible before completion; if requirements are unresolved, scroll to and emphasize the first unresolved required Item without hiding the action.

UX-DR19: Implement `lifecycle-confirmation-panel` as a one-level overlay naming the resulting phase with primary/cancel controls, in-panel pending/error, duplicate-submit prevention, focus containment/return validation, and persistence until the authoritative route reflects success.

UX-DR20: Implement `previous-information-drawer` as a small secondary one-level drawer showing prior `extra_information` and time/context while current authority remains visible. Include loading/error/retry, no edit mode, and validated dismissal/focus return.

UX-DR21: Implement `structured-modification-card` as one durable free-form physical change with attribution. In Return Check, keep every card visible, emphasize unacknowledged cards in red with a large Addressed action, and retain acknowledged cards in success styling.

UX-DR22: Implement `last-touched-summary` as a secondary read-only latest authoritative same-`stock_identifier` touch. State that it is not complete bike history and render successful no-result distinctly from load failure.

UX-DR23: Implement `found-and-fixed-record` as an attributable, server-confirmed factual correction created from Bike Task Detail and visible in Activity, with success treatment but no Needs Attention state or manager queue entry.

UX-DR24: Implement `manager-queue-row` as one accessible whole-row target with bike/order, rental timing, reason/category, requester, age where relevant, and chevron. Prohibit nested inline actions and validate keyboard/assistive operation.

UX-DR25: Implement `attention-resolution-panel` with Approve/Decline and no note/extra confirmation for same-mechanic override requests; require and retain a short resolution note for missing/unclear information and manager-decision reasons.

UX-DR26: Implement `manager-action-confirmation-panel` for reset, force-close, assignment/reassignment, template activation/supersession/reactivation, and other consequential actions. State exact lifecycle/assignment/history effects, distinguish destructive consequences, prevent repeat submit, and never apply optimistic success.

UX-DR27: Implement `template-version-row` and `template-editor` with visible phase/category/version/status, readable superseded evidence, explicit Reactivate, continuously visible Item definitions, M2-implies-M1 validation, and no blocking Setup Category coverage gate.

UX-DR28: Implement `activity-timeline` and `terminal-task-panel`. Terminal task detail must replace mutation controls for Done, Cancelled, Replaced, and Force-closed, explain why work stopped, preserve context/history access, and offer return to Mechanic Dashboard rather than linking directly to a replacement.

UX-DR29: Implement complete cold-load, empty, pending, error/retry, stale/concurrency, terminal, and permission states for Mechanic Dashboard, Bike Task Detail, Manager Dashboard, Attention Detail, Template Library/Editor, Activity, and overlays. Never turn failure into empty success or use a toast as the only critical feedback.

UX-DR30: Use large, forgiving, tile-sized tap/click controls suitable for mounted tablets, dirty/greasy hands, occasional gloves, and glare. Prohibit hover-only controls, precision gestures, swipe-only actions, drag-to-complete, long press, and motion-dependent meaning; validate final control size/separation on workshop devices.

UX-DR31: Validate accessibility with host-app primitives: programmatic/contextual names, logical traversal and activation, visible focus not obscured by the sticky bar, overlay containment/return, route focus, unresolved-item focus/announcement, save/phase/stale/error/terminal announcements, screen-reader reading order, reduced motion, and non-color-only high-risk states.

UX-DR32: Support wide desktop/landscape tablet, portrait/constrained tablet, and phone layouts with the same mechanic workflow. Adapt equal panels to stacking, context/checklist split to single column, manager row facts to stacking, and controls to full width while preserving labels, reasons, sticky actions, and text enlargement.

### FR Coverage Map

FR1: Epic 3 - Reconcile exact per-bike work and unknown-unit incidents.
FR2: Epic 3 - Preserve physical-bike identity and replacement incarnations.
FR3: Epic 3 - Suspend, unassign, and safely reactivate source-backed work.
FR4: Epic 3 - Establish the authoritative Bike Task lifecycle.
FR5: Epic 7 - Reset stale work without losing history.
FR6: Epic 5 - Provide Available Now and My Work.
FR7: Epic 5 - Keep each bike independently actionable.
FR8: Epic 5 - Support self-claim and explicit assignment/reassignment.
FR9: Epic 5 - Resolve concurrent claims first-writer-wins.
FR10: Epic 5 - Preserve per-Work-Cycle M1/M2 ownership.
FR11: Epic 1 - Govern category-specific Prep and Return templates.
FR12: Epic 3 - Snapshot active templates at each task phase.
FR13: Epic 1 - Configure Item type, requirement, role applicability, and Setup link.
FR14: Epic 1 - Keep authored Items visible and `No` values actionable.
FR15: Epic 5 - Show current and prior Setup Category context.
FR16: Epic 5 - Record explicit Done/N/A Action outcomes.
FR17: Epic 5 - Require values without offering N/A.
FR18: Epic 5 - Block handoff until required Prep is confirmed.
FR19: Epic 5 - Include built-in `extra_information` and broad-review confirmations.
FR20: Epic 5 - Start Re-check per bike when applicable.
FR21: Epic 5 - Require fresh independent M2 resolution.
FR22: Epic 5 - Show current-cycle M1 identity to M2.
FR23: Epic 5 - Record M2 corrections without approve/reject semantics.
FR24: Epic 5 - Verify target values without duplicate entry.
FR25: Epic 5 - Enforce two-person verification unless overridden.
FR26: Epic 6 - Classify relevant, broad-review, and irrelevant changes.
FR27: Epic 6 - Refresh silently before first claim.
FR28: Epic 6 - Keep active M1 work assigned through relevant changes.
FR29: Epic 6 - Return Re-check work to unassigned Prep after change.
FR30: Epic 6 - Reopen completed preparation safely before pickup.
FR31: Epic 6 - Repeat independent verification for reopened M2 work.
FR32: Epic 6 - Bound reopening by pickup and Return progress.
FR33: Epic 6 - Highlight and self-clear changed work with history.
FR34: Epic 5 - Maintain same-rental shared Notes.
FR35: Epic 5 - Show bike-focused accessories and `extra_information`.
FR36: Epic 5 - Avoid guessing flat-order associations.
FR37: Epic 5 - Record Structured Modifications and bounded last-touch context.
FR38: Epic 7 - Distinguish attention from found-and-fixed history.
FR39: Epic 8 - Trigger idempotent per-bike Return Check.
FR40: Epic 8 - Use one return-check mechanic.
FR41: Epic 8 - Carry same-rental context into Return Check.
FR42: Epic 8 - Require per-modification return acknowledgement.
FR43: Epic 7 - Discover and resolve Needs Attention.
FR44: Epic 7 - Force-close genuinely abandoned work.
FR45: Epic 7 - Request and explicitly approve or decline same-mechanic Re-check.
FR46: Epic 7 - Expose trustworthy attributable history.
FR47: Epic 2 - Reconcile only from current Booqable authority.
FR48: Epic 5 - Reject stale open-screen actions and preserve typed input.

## Epic List

### Epic 1: Manager-Defined Workshop Standards
Managers can create and govern active, versioned Prep and Return checklists for every supported bike category, establishing stable workshop language before operational work begins.

**FRs covered:** FR11, FR13, FR14

**Implementation notes:** Deliver the independently usable Checklist Template Library and Detail/Editor, immutable activation rules, M2-implies-M1 validation, non-blocking Setup Category coverage, full manager UX states, and the underlying capability/RLS/event foundations required by this domain.

### Epic 2: Secure and Recoverable Canonical Booqable Operations
Application operators have one contained, versioned, recoverable source pipeline that preserves brownfield consumers and cannot be bypassed.

**FRs covered:** FR47; NFR3 foundation

**Implementation notes:** Use active templates from Epic 1. Deliver security/runtime containment, source envelopes and the source-tag contract, canonical projection including Product/ProductGroup/Bundle tag lists, atomic source application, durable recovery, source-data seeding/validation, privileges, and rollout controls before task derivation begins.

### Epic 3: Exact Per-Bike Membership and Bike Task Creation
Workshop staff receive correctly identified task records, immutable snapshots, lifecycle initialization, and safe source-lifecycle behavior.

**FRs covered:** FR1, FR2, FR3, FR4, FR12; task-derivation portions of FR47

**Implementation notes:** Build on Epics 1–2. Derive exact membership, initialize stable Bike Tasks and Work Cycles, bind immutable phase snapshots, and reconcile cancellation, removal, replacement, and reactivation.

### Epic 4: Source-Backed Intake Visibility and Safe Correction
Authorized staff distinguish actionable tasks, Waiting for Bike ID, integration uncertainty, terminal work, and immutable correction successors.

**FRs covered:** No new FR scope; exposes and repairs the source-backed outcomes of Epics 2–3

**Implementation notes:** Build on Epics 1–3. Deliver field-minimized intake reads, safe correction successors, and a bounded cross-epic seam proof.

### Epic 5: Paperless Bike Preparation and Independent Verification
Mechanics can discover, claim, prepare, hand off, independently re-check, record rental context and physical changes, and recover safely from save or ownership conflicts without a paper checklist.

**FRs covered:** FR6, FR7, FR8, FR9, FR10, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR25, FR34, FR35, FR36, FR37, FR48

**Implementation notes:** Build the complete UJ-1 mechanic journey on tasks and snapshots from Epics 1–4, including PostgreSQL read models/RPCs, revision guards, confirmed-save behavior, task context, Prep/Re-check execution, Structured Modifications, responsive tablet/phone UX, and accessibility validation.

### Epic 6: Correct Work After Rental Configuration Changes
Mechanics can absorb Booqable changes through targeted or broad reopening while preserving unaffected evidence, ownership rules, independent verification, and clear changed-work feedback.

**FRs covered:** FR26, FR27, FR28, FR29, FR30, FR31, FR32, FR33

**Implementation notes:** Extend Epic 5 with source-generation comparison, broad review as the initial mode, optional fixture-proven accessory-tag/source mapping for targeted invalidation, convergent invalidation, Work Cycle rules, persistent change notices, previous/current context, and server-confirmed self-clearing emphasis.

### Epic 7: Manager Exception Control and Trustworthy Audit
Managers can resolve attention, assign or reset exceptional work, force-close abandoned work, approve two-person overrides, and inspect durable attribution without blocking ordinary mechanic completion.

**FRs covered:** FR5, FR38, FR43, FR44, FR45, FR46

**Implementation notes:** Deliver the Manager Dashboard and Attention Detail, reason-specific resolution, assignment/reassignment, reset, force-close, cycle-bound override, found-and-fixed distinction, Activity, stale-manager conflict handling, and consequence confirmations.

### Epic 8: Paperless Return Check
Mechanics can complete category-specific Return work and close Bike Tasks as Done.

**FRs covered:** FR39, FR40, FR41, FR42

**Implementation notes:** Build UJ-3 on Epics 1–7. Include authoritative per-bike return forcing, immutable Return snapshots, unfinished Prep/Re-check context, acknowledgement gates, terminal read-only UX, idempotency, and responsive confirmed-save behavior.

### Epic 9: Safe Workshop Adoption and Paper Retirement
Owners prove environments, pilot a bounded cohort, approve general enablement, and retire paper through separate evidence-bound decisions.

**FRs covered:** No new product FR scope; implements the PRD rollout and paper-retirement obligations

**Implementation notes:** Depends on completed Epics 1–8. Environment proof, pilot, general enablement, and paper retirement remain separate approval gates.

## Epic 1: Manager-Defined Workshop Standards

Managers can create and govern active, versioned Prep and Return checklists for every supported bike category, establishing stable workshop language before operational work begins.

### Story 1.1: Browse Governed Workshop Checklist Templates

As an Admin or Manager,
I want to browse Workshop checklist versions by phase and bike category,
So that I can understand which workshop standards exist and which version is currently active.

**Acceptance Criteria:**

**Given** the feature is added to the existing brownfield application
**When** the local migration is applied
**Then** it creates only the checklist template/version structures needed for browsing, using UUID keys, supported Prep/Return phases, supported bike categories, version identity, and draft/active/superseded status
**And** the migration is idempotent, uses restrictive deletion, locked privileges, and introduces no checklist Item or Bike Task structures.

**Given** an authenticated Admin or Manager opens the Checklist Template Library
**When** template versions exist
**Then** the server-loaded page groups or filters them by phase and bike category and identifies version and active, draft, or superseded status in text
**And** sorting, filtering, and status determination come from a PostgreSQL read model or RPC rather than client-side aggregation.

**Given** an Admin or Manager selects phase, category, or status filters
**When** the filter changes
**Then** the selection is represented in URL search parameters and the Server Component reloads authoritative results
**And** a copied or refreshed URL preserves the same library view.

**Given** no template versions match the current filters
**When** the library loads successfully
**Then** it shows a specific empty state explaining that no templates exist for that phase/category
**And** it does not present the result as a loading or failure state.

**Given** the template loader fails
**When** the library renders
**Then** it returns safe empty data plus a non-null error, logs the failure with a contextual prefix, and renders an in-context error with Retry
**And** it never renders a zero-result success state for the failed load.

**Given** the route or filter transition is pending
**When** the user is waiting for results
**Then** `loading.tsx` or equivalent route feedback preserves the library's phase/category/version orientation
**And** no blank unexplained wait is shown.

**Given** an authenticated Mechanic or Partner attempts to open the Template Library directly
**When** authorization is evaluated
**Then** server-side RLS/read capability denies Workshop template access and the UI returns an authorized Workshop surface or stable denied state
**And** client-side role hiding is not the security boundary.

**Given** the user's session is missing or expired
**When** the route is requested
**Then** the existing authentication boundary redirects to login with the intended destination
**And** the condition is not displayed as an empty library or ordinary data error.

**Given** the library is used on desktop, tablet, or a constrained viewport
**When** rows and filters render
**Then** phase, category, version, and textual status remain readable, focus-visible, keyboard reachable, and non-color-dependent
**And** superseded versions remain readable rather than appearing disabled or erroneous.

**Given** database privilege tests run locally as `anon`, `authenticated`, and `service_role`
**When** direct table access and the approved read path are exercised
**Then** only the intended authenticated Admin/Manager read path succeeds
**And** partner access, unauthorized reads, direct writes, and unintended `PUBLIC` privileges are denied.

### Story 1.2: Create a Draft Checklist Version

As an Admin or Manager,
I want to create a draft checklist version for a selected phase and bike category,
So that I can define a new workshop standard without changing active work.

**Acceptance Criteria:**

**Given** an authenticated Admin or Manager is viewing a phase/category section in the Template Library
**When** they choose Create Draft
**Then** the system creates one blank draft version for that selected Prep/Return phase and supported bike category and redirects directly to `/workshop/templates/[templateVersionId]`
**And** it does not introduce a separate `/new` route or require checklist Items to exist.

**Given** a draft is created
**When** the server assigns its identity
**Then** it receives a UUID, server-assigned version number unique within its phase/category, draft status, creator, and creation time
**And** version allocation and the creation event commit atomically.

**Given** two managers create drafts concurrently for the same phase/category
**When** both valid requests are processed
**Then** each receives a distinct monotonically ordered version number without collision
**And** neither request overwrites, reuses, or silently merges the other draft.

**Given** the create action is invoked
**When** authorization and input are evaluated
**Then** a `withAuth` server action validates the authenticated Admin/Manager and passes a supported phase/category to a narrowly privileged transactional RPC
**And** client role checks, direct table inserts, and service-role access are not used as the authorization boundary.

**Given** an authenticated Mechanic, Partner, or unauthorized API role attempts to create a draft
**When** the mutation reaches the database capability boundary
**Then** creation is denied without inserting a version or event
**And** the denial is returned as a stable expected error rather than an unhandled exception.

**Given** the user's session is missing or expired
**When** Create Draft is invoked
**Then** `withAuth` redirects to login with the intended Template Library destination
**And** session expiry is not returned as `{ ok: false, error }`.

**Given** an invalid phase, unsupported bike category, or malformed request is submitted
**When** validation runs
**Then** the action returns `{ ok: false, error }` with specific safe copy and logs unexpected failures with a contextual prefix
**And** no partial draft, version allocation, or history event is committed.

**Given** Create Draft is in flight
**When** the manager waits for the server
**Then** the control remains in place with explicit pending text, prevents repeat submission, and does not appear confirmed
**And** success is shown only by navigation to the authoritative draft editor.

**Given** draft creation fails
**When** the action returns an error
**Then** the manager remains in the same phase/category library context with an in-context retryable error
**And** the UI does not redirect, show a phantom version, or claim the action will sync later.

**Given** creation succeeds
**When** the transaction commits
**Then** the Template Library and new detail route are explicitly revalidated and the editor loads the persisted draft metadata
**And** the append-only event records authenticated actor, time, phase, category, version, and resulting revision.

**Given** the newly created draft editor loads with no Items
**When** the read succeeds
**Then** it shows phase, category, version, Draft status, and a valid empty definition state
**And** it does not treat the absence of Items as a load failure or imply that the draft is active.

**Given** local database tests exercise draft creation
**When** they cover valid, invalid, concurrent, unauthorized, and rolled-back requests
**Then** version uniqueness, atomic event creation, effective-role permissions, and absence of partial rows are proven
**And** no checklist Item entities are required by this story.

**Given** the first Workshop event producer is introduced
**When** the repository-owned event catalogue is defined
**Then** it versions stable event types, system-source vocabulary, required references and revisions, and payload schemas from one editable source
**And** generated SQL/TypeScript representations, additive compatibility rules, and an unknown-newer fallback are fixture-checked before later stories extend the catalogue.

### Story 1.3: Configure Draft Checklist Items

As an Admin or Manager,
I want to configure and order Items in a draft checklist,
So that the template accurately describes the work mechanics must perform.

**Acceptance Criteria:**

**Given** an Admin or Manager opens a draft template
**When** the editor loads
**Then** it shows phase, category, version, Draft status, and all Item definitions in stable order
**And** it provides accessible Add Item, edit, reorder, and remove controls without hiding Items in accordions.

**Given** the draft has no Items
**When** the editor loads successfully
**Then** it shows a valid empty-definition state with Add Item
**And** a loader failure remains a distinct in-context error with Retry.

**Given** a manager adds or edits an Item
**When** they save it
**Then** they can define label, stable order, Action or Value type, required status, M1 applicability, M2 applicability, and an optional supported Setup Category link
**And** the Item entity and append-only change event are created or updated atomically.

**Given** M2 applicability is selected while M1 applicability is not selected
**When** the manager attempts to save
**Then** both client guidance and the transactional server capability reject the invalid combination with specific field-level copy
**And** no Item revision or event is committed.

**Given** an Item is linked to a Setup Category whose current source value may later be `No`
**When** the definition is saved
**Then** the link is retained only as grouping, context, and invalidation metadata
**And** the editor does not treat the link as a visibility rule or require every Setup Category to be covered.

**Given** the manager reorders Items
**When** the ordered update is submitted
**Then** the full affected order is validated and committed transactionally with a new draft revision
**And** duplicate positions, missing referenced Items, and stale draft revisions are rejected without partial reordering.

**Given** another manager changes the draft after the page was loaded
**When** the first manager saves an edit or reorder with an old revision
**Then** the mutation returns a stable stale result and current authoritative revision/status
**And** entered values remain visible long enough to review and retry without a silent merge.

**Given** the manager removes an Item from a draft
**When** the confirmation is accepted
**Then** only that draft definition is removed and the change is attributed
**And** referenced active/superseded versions or future task snapshots cannot be altered by the operation.

**Given** an active or superseded version is opened
**When** the user views its Item definitions
**Then** the definitions are read-only and remain fully readable
**And** direct writes are denied even if a stale client renders edit controls.

**Given** an Item mutation is pending or fails
**When** the editor renders feedback
**Then** only the affected control is locked, repeat submission is prevented, and entered data remains available with an in-context Retry
**And** Saved is shown only after the authoritative draft revision is returned.

**Given** local tests exercise Item configuration
**When** valid, invalid, stale, unauthorized, reorder, remove, and rollback cases run
**Then** draft-only editability, M2-implies-M1, stable ordering, atomic events, and role permissions are proven
**And** no Setup Category coverage gate is introduced.

### Story 1.4: Activate an Immutable Template Version

As an Admin or Manager,
I want to activate a reviewed draft checklist,
So that future Bike Tasks use one stable workshop standard for that phase and bike category.

**Acceptance Criteria:**

**Given** a draft template is structurally valid
**When** an Admin or Manager chooses Activate
**Then** a confirmation panel names its phase, category, version, and future-snapshot-only consequence
**And** it states that existing task snapshots and progress will not change.

**Given** the manager confirms activation
**When** the transactional activation capability runs
**Then** it acquires the phase/category advisory lock, re-reads the draft and current active pointer, activates the selected version, and supersedes any prior active version atomically
**And** exactly one active version remains for that phase/category.

**Given** the draft contains no Setup Category link for one or more active categories
**When** activation validation runs
**Then** missing coverage does not block activation
**And** any coverage context is presented as non-blocking administrative information.

**Given** any Item violates structural rules, including M2 without M1 or an invalid type/applicability combination
**When** activation is attempted
**Then** activation is rejected with specific actionable errors
**And** active pointers, version statuses, and events remain unchanged.

**Given** activation succeeds
**When** the transaction commits
**Then** the activated version and its Item definitions become immutable and referenced versions cannot be deleted
**And** the event records actor, time, phase, category, activated version, superseded version if any, and resulting revisions.

**Given** another manager activates a version after the page was loaded
**When** the user confirms with stale version/status information
**Then** the RPC rejects the stale request and returns the current authoritative active version
**And** the UI requires explicit review before a retry rather than silently rebasing.

**Given** activation is pending, succeeds, or fails
**When** the confirmation panel updates
**Then** it prevents duplicate submission, keeps failure in context, and shows success only after the library/detail reloads authoritative status
**And** all affected template paths are explicitly revalidated.

**Given** unauthorized roles or direct DML attempt activation
**When** privileges are evaluated
**Then** only the authenticated Admin/Manager activation capability can mutate status
**And** direct status updates, event insertion, and capability execution by `anon`, Mechanic, Partner, or service role are denied.

**Given** local database and multi-session tests run
**When** they cover initial activation, replacement of an active version, invalid structure, stale requests, concurrent activation, and rollback
**Then** uniqueness, immutability, atomicity, advisory-lock behavior, event attribution, and effective-role permissions are proven without requiring Bike Task snapshot structures.

### Story 1.5: Reactivate and Review Template History

As an Admin or Manager,
I want to review superseded checklist versions and reactivate a suitable version,
So that I can restore a prior standard without rewriting workshop history.

**Acceptance Criteria:**

**Given** active, draft, and superseded versions exist
**When** an Admin or Manager opens the library or version detail
**Then** phase, category, version, status, creator, activation history, and Item definitions are server-loaded and readable
**And** superseded versions are neither deleted nor styled as failed or disabled content.

**Given** a superseded version is open
**When** the manager selects Reactivate
**Then** a confirmation panel identifies the selected and currently active versions and explains that only future snapshots change
**And** existing task snapshots, outcomes, and history remain untouched.

**Given** reactivation is confirmed
**When** the transactional capability executes
**Then** it uses the same phase/category advisory lock as activation and snapshot selection, reactivates the selected immutable version, and supersedes the current active version atomically
**And** exactly one active pointer remains.

**Given** the selected version is no longer superseded, the active version changed, or the supplied revision is stale
**When** reactivation runs
**Then** it returns a stable stale/status conflict with the current authoritative versions
**And** no statuses, active pointer, or events change.

**Given** a draft, currently active version, unsupported phase/category version, or missing version is submitted to Reactivate
**When** validation runs
**Then** the operation is rejected with safe specific copy
**And** the manager must use the valid action for the version's current status.

**Given** reactivation succeeds
**When** the transaction commits
**Then** the event records actor, time, phase, category, reactivated version, superseded version, and resulting revisions
**And** the library and both detail routes are explicitly revalidated.

**Given** reactivation fails or is pending
**When** the confirmation panel renders
**Then** entered intent remains clear, repeat submission is blocked, and failure offers Retry after authoritative refresh
**And** no optimistic active status is shown.

**Given** any role other than authenticated Admin/Manager attempts reactivation or mutation of immutable definitions
**When** server and database authorization run
**Then** access is denied without mutation
**And** read/write privileges remain consistent with the Template Library boundary.

**Given** local tests cover reactivation
**When** success, concurrent activation, stale status, unauthorized access, immutable-definition writes, and rollback cases run
**Then** active uniqueness, historical preservation, event attribution, and future-snapshot-only behavior are proven.

## Epic 2: Secure and Recoverable Canonical Booqable Operations

Application operators have one contained, versioned, recoverable source pipeline that preserves brownfield consumers and cannot be bypassed.

### Story 2.1: Contain Existing Integration Security Risks

As the application owner,
I want the existing Booqable and authentication entry points contained,
So that expanding Workshop integration does not amplify known credential or session risks.

**Acceptance Criteria:**

**Given** an invalid webhook secret is supplied
**When** the Booqable webhook rejects the request
**Then** logs record a contextual authentication failure without the supplied secret, API key, payload PII, or other credentials
**And** the route still refetches authority only after successful authentication.

**Given** the deployed sandbox Booqable sync route exists
**When** this story is completed
**Then** the unauthenticated service-role path is removed or replaced by an explicitly authenticated, least-privileged recovery capability
**And** path naming or skipped API middleware is never treated as access control.

**Given** Supabase SSR refresh supplies cache-prevention headers
**When** middleware refreshes a session
**Then** it copies the provided `Cache-Control`, `Expires`, and `Pragma` headers to the response
**And** a fixture proves `Cache-Control: private, no-store`.

**Given** a preview or branch deployment is built
**When** environment variables are resolved
**Then** Booqable, service-role, and Cron credentials are absent and ingestion/derivation cannot activate
**And** production and staging secrets remain environment-managed and rotatable.

**Given** repository checks exercise webhook rejection, sandbox access, and SSR refresh
**When** they run locally
**Then** secret redaction, denied unauthorized recovery, authoritative refetch, and private no-store caching are proven
**And** existing valid webhook behavior remains compatible.

### Story 2.2: Upgrade to a Supported Application Runtime

As the application owner,
I want the brownfield application upgraded through a supported compatibility path,
So that Workshop is not built on an unsupported framework runtime.

**Acceptance Criteria:**

**Given** the application currently runs Next.js 14
**When** the compatibility migration is completed
**Then** it lands on a currently supported Next.js LTS through reviewed official upgrade steps
**And** auth, middleware/proxy behavior, server actions, PDF generation, BlockNote, React Email, Subframe UI, and existing routes pass the compatibility checklist.

**Given** a dependency blocks the preferred supported major
**When** compatibility evidence is reviewed
**Then** the repository records the supported staged landing and remaining upgrade gate explicitly
**And** it does not silently retain an unsupported production baseline.

**Given** the runtime upgrade is complete
**When** install, build, lint, type checking, auth routes, and major existing feature smoke checks execute
**Then** results are recorded without weakening TypeScript strictness or bypassing hooks/checks
**And** unrelated UI, editor, PDF, email, and authentication behavior remains compatible.

### Story 2.3: Pin the Node and Database Toolchain

As the application owner,
I want reproducible Node, Supabase CLI, and PostgreSQL tooling,
So that local and CI proof runs use the same supported baseline.

**Acceptance Criteria:**

**Given** Node and Supabase CLI versions were previously environment-selected
**When** source and CI configuration are updated
**Then** Node 24.x and one locally tested stable Supabase CLI version are pinned consistently in package metadata, lockfile, and workflows
**And** CI no longer installs an unbounded `latest` CLI.

**Given** the database requires PostgreSQL extensions
**When** the migration-owned extension manifest is defined
**Then** local PostgreSQL 17 contains every required extension idempotently
**And** staging/production parity remains an environment-proof gate rather than a manual DDL action.

**Given** the pinned toolchain runs locally
**When** local database reset, migration, extension checks, generated types, and CI-equivalent tool-version checks execute
**Then** results are recorded without weakening TypeScript strictness or bypassing hooks/checks
**And** remote databases are not modified.

### Story 2.4: Define Versioned Source Envelopes and Result Semantics

As a Workshop operator,
I want every source producer and consumer to share versioned envelope and result semantics,
So that source uncertainty cannot become inconsistent canonical state.

**Acceptance Criteria:**

**Given** Booqable data enters the application
**When** the repository contract package is generated
**Then** it defines versioned `order_graph` and `resource_batch` envelopes, producer/profile/schema versions, complete/partial scopes, known/unknown/removed values, canonical identity, source vectors, fingerprints, and fixed result vocabulary
**And** TypeScript validation and PostgreSQL representations are generated or fixture-checked from one editable source.

**Given** contract source or generated output changes
**When** CI runs the drift and compatibility checks
**Then** missing regeneration, incompatible vocabulary, or unversioned breaking change fails the check
**And** additive/deprecation rules remain explicit.

### Story 2.5: Expand the Canonical Booqable Projection

As a Workshop operator,
I want the minimum source-backed bike and rental graph stored locally,
So that Workshop work uses exact identities without creating a second order system.

**Acceptance Criteria:**

**Given** the shared projection already contains customers, orders, and order items
**When** the expand migration runs
**Then** it additively admits only tagged ProductGroups/Products, matching tagged Bundles/BundleItems, Plannings, StockItemPlannings, physical StockItems, immutable order-bike membership roots, source-version state, and provenance
**And** existing bookings, order, customer, partner, and reporting readers remain compatible.

**Given** Product, ProductGroup, and Bundle source resources are admitted
**When** their canonical projection is applied
**Then** each resource's complete `tag_list` is persisted as one-way read-only Booqable source data
**And** tag values do not replace opaque resource IDs, exact StockItem identity, or the source envelope's version/fingerprint authority.

**Given** a projected field is introduced
**When** authority is declared
**Then** the migration-owned manifest classifies it as Booqable source, app-owned, app-derived, or temporary compatibility alias with one writer and disposition
**And** local and Booqable customers are not auto-merged and archived PII behavior remains bounded.

**Given** source identities and relationships are stored
**When** rows are inserted or archived
**Then** opaque external IDs, UTC source/ingestion times, restrictive foreign keys, provenance, and open/closed state are preserved
**And** referenced source/history rows cannot cascade-delete.

### Story 2.6: Preserve Brownfield Projection Consumers

As the application owner,
I want existing Booqable consumers preserved through projection expansion,
So that Workshop source fields can be introduced without regressing shipped features.

**Acceptance Criteria:**

**Given** a standalone inventory collection is unavailable or changes
**When** canonical fetching runs
**Then** the documented nested-order include path remains a fixture-proven fallback
**And** no Workshop behavior depends solely on an undocumented optimization.

**Given** existing consumer fixtures run before and after expansion
**When** they compare bookings, order detail, partner views, customer flows, stats/reporting, and local-customer creation
**Then** existing behavior remains unchanged
**And** new Workshop fields remain read-only outside the ingestion authority.

### Story 2.7: Persist and Recover Authoritative Refresh Work

As a Workshop operator,
I want webhook and reconciliation work durably tracked and retryable,
So that missed or failed signals do not require manual source-table repair.

**Acceptance Criteria:**

**Given** an authenticated webhook signal arrives
**When** it is accepted
**Then** a minimal receipt is inserted idempotently before external fetch work and correlated to one pending refresh intent
**And** raw payload PII is not retained as replay truth.

**Given** duplicate receipts or repeated repair requests target the same source root
**When** intents are correlated
**Then** receipt generation advances monotonically while work coalesces safely
**And** no receipt is mistaken for current Booqable state.

**Given** a bounded worker claims due work
**When** it obtains a lease
**Then** claimable/leased/succeeded/exhausted/quarantined/rejected-terminal state, lease expiry/generation, attempt count, and redacted last error update through compare-and-set
**And** an expired or superseded worker cannot complete domain mutation.

**Given** refresh results or integration incidents cross producer and operator boundaries
**When** their repository-owned transition catalogue is defined
**Then** each code versions producer, severity, deduplication scope, retryability, activation effect, resolution, acknowledgement, and retry-budget consequence
**And** free-form codes are prohibited and an unknown newer code fails closed without unsafe activation or silent disappearance.

### Story 2.8: Run Bounded Workers and Reconciliation Sweeps

As a Workshop operator,
I want due refresh work processed in bounded recoverable batches,
So that transient failures and missed signals converge without exceeding deployment limits.

**Acceptance Criteria:**

**Given** the protected worker route is invoked
**When** `Authorization: Bearer ${CRON_SECRET}` is missing or invalid
**Then** it rejects without claiming work or disclosing the secret
**And** valid Cron invocation still relies on database leases for overlap safety.

**Given** 429, transient 5xx, timeout, terminal validation, or quarantine occurs
**When** the result catalogue is applied
**Then** bounded backoff, retry-budget consumption, successor behavior, incident creation, and operator retry authorization follow the versioned transition rule
**And** exhausted work remains visible rather than silently disappearing.

**Given** nightly reconciliation is interrupted or repeated
**When** it resumes from durable checkpoints
**Then** stable sort/cursor/tie-breaker, overlap/restart rules, and two-sweep completion prevent replay damage
**And** generic absence never deletes projected state.

### Story 2.9: Apply Canonical Source State Atomically

As a Workshop operator,
I want each refreshed Booqable graph applied atomically and idempotently,
So that partial, stale, or conflicting source data cannot corrupt Workshop intake.

**Acceptance Criteria:**

**Given** a validated versioned `order_graph` arrives
**When** the ingestion coordinator applies it
**Then** it is the sole writer of canonical source projection and invokes only domain derivations already registered at that point in the implementation sequence within the same PostgreSQL transaction
**And** this story completes atomic source application without requiring the later Workshop membership/task derivation, while any invoked source or event failure rolls back all changes.

**Given** the canonical merged effective state matches the accepted vector and semantic fingerprint
**When** ingestion repeats
**Then** it returns `no_op` without duplicate rows, Work Cycles, revisions, or events
**And** duplicate/out-of-order signals converge to the same state.

**Given** equal versions have different fingerprints, a present component is older/incomparable, an addition lacks authority, or schema is unsupported
**When** comparison runs
**Then** the graph is quarantined or rejected according to contract with no domain mutation
**And** a catalogue-defined incident records safe redacted context.

**Given** a child is omitted from a complete or partial response without explicit accepted removal evidence
**When** the effective state is merged
**Then** the last accepted child is carried forward and absence observation/incident is recorded outside the semantic fingerprint
**And** no source row, membership, or Bike Task closes.

**Given** explicit fixture-proven archive/tombstone evidence arrives
**When** its producer profile and source authority validate
**Then** only the documented resource/domain consequence may close
**And** independent child versions do not assume a parent timestamp advanced.

### Story 2.10: Seed and Validate Workshop Source Data

As a Workshop operator,
I want the Booqable source tagged and validated before task derivation activates,
So that Workshop creates work only from the controlled six-category contract.

**Acceptance Criteria:**

**Given** the six supported bike categories are prepared in Booqable
**When** source-data seeding and validation run
**Then** ProductGroups use exactly one of `workshop-road-bike`, `workshop-e-road-bike`, `workshop-e-city-bike`, `workshop-gravel-bike`, `workshop-mtb-bike`, or `workshop-e-mtb-bike`
**And** the corresponding Bundle uses the matching `workshop-*-bike-bundle` tag.

**Given** Products inherit ProductGroup tags and Bundles contain bike ProductGroups
**When** canonical fixtures and seeded data are inspected
**Then** Product, ProductGroup, and Bundle tag lists are all persisted as source facts
**And** each Bundle tag agrees with exactly one contained bike ProductGroup category.

**Given** a source entity is untagged
**When** Workshop admission is evaluated
**Then** no Workshop membership or task derives
**And** ordinary non-Workshop tags remain persisted without being treated as category.

**Given** a source entity carries an unknown, multiple, or conflicting Workshop tag, or a Bundle disagrees with its contained bike ProductGroup
**When** validation or later admission runs
**Then** the source graph fails closed with a catalogue-defined deduplicated Integration Incident and no Workshop membership/task
**And** labels, titles, array position, quantity, or local Admin configuration cannot override the result.

**Given** accessory tags exist or are introduced
**When** Epic 2 validation completes
**Then** they are retained as uninterpreted source facts and do not target checklist Items
**And** accessory interpretation remains deferred to Epic 6 while broad `review_updated_configuration` stays the initial relevant-change mode.

**Given** local contract, adapter, and database fixtures run
**When** all six ProductGroup tags, all six Bundle tags, Product inheritance, bundle agreement, untagged exclusion, and fail-closed branches are exercised
**Then** TypeScript and PostgreSQL representations agree and repeat validation is idempotent
**And** no remote database is modified.

### Story 2.11: Issue Exact JIT Freshness Proofs

As a Workshop operator,
I want consequence-bearing actions bound to exact current source proof,
So that stale or superseded refresh attempts cannot authorize domain transitions.

**Acceptance Criteria:**

**Given** a consequence-bearing caller requests current authority
**When** a JIT attempt succeeds or no-ops
**Then** the database returns a versioned freshness proof bound to root, attempt/JIT generation, producer/profile/schema, source vector/fingerprint, current registered derivation token or explicit no-domain-derivation marker, and expiry
**And** stale or superseded attempts return retryable rejection without mutation.

**Given** adapter and pgTAP fixtures run
**When** every comparator, omission, archive, rollback, no-op, and generation-fence branch executes
**Then** result vocabulary, atomicity, idempotency, and source precedence are proven.

### Story 2.12: Cut Over Every Booqable Writer and Recovery Caller

As the application owner,
I want all existing Booqable paths to use one canonical coordinator,
So that no competing writer can bypass convergence and recovery rules.

**Acceptance Criteria:**

**Given** webhook, existing sync, backfill/recovery, reconciliation, and future JIT callers are registered
**When** cutover occurs
**Then** each caller fetches through the canonical adapter and submits only versioned envelopes to the coordinator
**And** no caller performs direct multi-request projection writes.

**Given** a caller is switched
**When** compatibility fixtures run
**Then** existing customer/order/line and partner-derived behavior remains correct
**And** partner attribution recomputation, including clear/reassign, occurs transactionally from accepted source facts.

### Story 2.13: Revoke Legacy Source Writers

As the application owner,
I want legacy direct-write paths removed after caller cutover,
So that canonical convergence cannot be bypassed by application or recovery code.

**Acceptance Criteria:**

**Given** every registered caller has passed shadow comparison
**When** the contract migration runs
**Then** legacy direct DML grants and obsolete recovery entry points are revoked or removed
**And** API roles including service role cannot write authoritative source or event tables directly.

**Given** an unregistered or legacy caller attempts a write after contract
**When** database privileges are enforced
**Then** it fails without partial mutation
**And** operator guidance points to canonical retry/reconciliation rather than manual row edits.

**Given** local role fixtures execute as `anon`, authenticated staff roles, Partner, and service role
**When** approved and forbidden paths are exercised
**Then** only narrow coordinator/capability execution succeeds
**And** API-role membership or `SET ROLE` into owner/capability roles is impossible.

### Story 2.14: Establish the Workshop Rollout Control Plane

As an Admin,
I want Workshop rollout state controlled centrally in the database,
So that deployment configuration cannot independently expose incomplete work.

**Acceptance Criteria:**

**Given** Workshop is newly deployed
**When** the rollout control plane is initialized
**Then** the environment-scoped epoch starts `disabled` with attributable state/revision
**And** direct state writes are revoked while the existing JIT proof capability binds newly issued proof to that epoch.

**Given** state changes among disabled, shadow, pilot, enabled, or emergency-disabled
**When** an Admin uses the activation capability
**Then** allowed transitions, expected revision, prerequisites, actor, time, and resulting epoch are validated transactionally
**And** pilot/enabled transitions fail closed until their required proof and enrollment inputs exist.

**Given** rollout is disabled or shadow
**When** canonical source state is accepted
**Then** source observation and materialization debt continue while the rollout predicate denies actionable domain exposure
**And** shadow output is proof-only and cannot be claimed or mutated.

**Given** emergency disable is invoked
**When** the transaction commits
**Then** rollout-gated JIT/proof use and domain exposure stop atomically while source ingestion and admin repair remain available
**And** epoch history and existing evidence/incidents are retained.

## Epic 3: Exact Per-Bike Membership and Bike Task Creation

Workshop staff receive correctly identified task records, immutable snapshots, lifecycle initialization, and safe source-lifecycle behavior.

### Story 3.1: Derive Exact Per-Bike Membership Identity

As a Workshop staff member,
I want one immutable membership for each source-identified physical bike,
So that quantity and ordering can never fabricate or transfer bike identity.

**Acceptance Criteria:**

**Given** Workshop membership derivation is registered with the canonical coordinator
**When** an accepted source graph is applied
**Then** derivation executes inside the same PostgreSQL transaction after canonical source state and before final events/result
**And** any membership, incident, or event failure rolls back the complete source application.

**Given** a reserved quantity-one bike line lacks an exact StockItem or human `stock_identifier`
**When** its accepted `order_graph` derives Workshop state
**Then** one provisional membership with discriminator `single` is retained
**And** repeated reconciliation updates the same membership without inventing a StockItem.

**Given** exact StockItem assignment and human identifier later arrive for that quantity-one line
**When** derivation runs
**Then** the same membership is promoted with opaque physical identity and display identifier
**And** history, local UUID, and incarnation are preserved.

**Given** a multi-quantity line has exact distinct StockItem assignments
**When** derivation runs
**Then** it creates one membership per exact StockItem-backed unit
**And** quantity, array position, title, Planning position, or generated ordinal is never identity.

**Given** planned quantity exceeds exact assignments
**When** derivation runs repeatedly
**Then** one deduplicated `identity_shortfall` incident records expected, identified, and unknown counts and no guessed task is created
**And** later exact assignments create only missing memberships.

**Given** exact assignments exceed accepted quantity, identities conflict, or rental intervals overlap/are unknown across orders
**When** derivation validates cardinality
**Then** every affected graph quarantines under StockItem-keyed locking with one blocking incident
**And** terminal task state does not waive an unresolved source rental overlap.

**Given** an accepted source graph contains a bike ProductGroup
**When** membership admission evaluates its persisted `tag_list`
**Then** exactly one controlled ProductGroup bike tag determines the six-category checklist key while exact StockItem identity determines the physical membership
**And** display labels, titles, quantity, or local configuration cannot override either decision.

**Given** a ProductGroup is untagged
**When** admission runs
**Then** no Workshop membership or task derives
**And** the source resource remains available as an ordinary persisted Booqable fact.

**Given** a ProductGroup or Bundle has an unknown, multiple, conflicting, or disagreeing Workshop tag
**When** admission runs
**Then** a catalogue-defined deduplicated Integration Incident is created and no membership derives
**And** retry after corrected authoritative source data converges without fabricating prior work.

### Story 3.2: Initialize Bike Tasks, Work Cycles, and Prep Snapshots

As a Workshop staff member,
I want each validated bike membership initialized as one stable Bike Task,
So that actionable work starts with the correct lifecycle and immutable standard.

**Acceptance Criteria:**

**Given** Workshop task derivation is registered after membership derivation
**When** the canonical coordinator applies accepted source state
**Then** at most one lifetime Bike Task is materialized for each membership/incarnation in the same transaction
**And** any task, Work Cycle, snapshot, built-in Item, incident, or event failure rolls back the complete source application.

**Given** a provisional quantity-one membership exists
**When** task derivation runs
**Then** one task enters Waiting for Bike ID without assignment or actionable Work Cycle
**And** repeated reconciliation updates that task without making it claimable.

**Given** an exact membership is newly actionable
**When** its ordinary lifecycle initializes
**Then** it stores explicit stage, source-availability overlay, terminal outcome, workflow revision, current cycle relation, and unassigned ownership
**And** it starts Needs Prep with exactly one initial Work Cycle.

**Given** a provisional membership/task later gains exact StockItem and display identity
**When** task derivation promotes it
**Then** the same task, local UUID, history, and incarnation are retained
**And** the initial Work Cycle is created exactly once as Prep becomes actionable.

**Given** a task is first materialized
**When** its Prep standard is selected
**Then** the same transaction acquires the phase/category advisory lock and copies the complete then-active Prep version into an immutable task snapshot
**And** missing active Prep version blocks task materialization with a catalogue-defined incident rather than creating incomplete work.

**Given** a Prep snapshot is assembled
**When** version Items are copied
**Then** repository-owned immutable built-in required confirmation Items for `extra_information` and ambiguous relevant configuration review are injected from the versioned Item catalogue
**And** their M1/M2 applicability obeys M2-implies-M1, cannot be edited by template authors, and is fixture-checked in TypeScript and PostgreSQL.

### Story 3.3: Reconcile Cancellation, Removal, Replacement, and Reactivation

As a Workshop staff member,
I want source lifecycle changes reflected without losing trustworthy history,
So that I never continue work on the wrong or unavailable bike.

**Acceptance Criteria:**

**Given** authoritative current order cancellation arrives
**When** ingestion derives task effects
**Then** each affected task receives the cancelled source overlay, becomes read-only, and atomically clears assignment while preserving safe stage/evidence/history
**And** stale reserved updates cannot regress the cancellation.

**Given** fixture-authorized explicit bike removal arrives without replacement
**When** derivation runs
**Then** only that membership/task receives the temporarily-removed overlay and clears assignment
**And** generic absence cannot produce this effect.

**Given** the same order/line/StockItem validly reappears after cancellation/removal
**When** authoritative reactivation is accepted
**Then** the existing non-Replaced task clears the overlay, reconciles current intent, preserves safe stage/evidence, and returns unassigned
**And** no open screen, stage, session, or recent save retains assignment.

**Given** bike A is replaced by bike B
**When** the replacement graph is accepted
**Then** A's membership/task closes as terminal Replaced and one linked successor membership/task is created for B in the same transaction
**And** A can never reactivate.

**Given** bike A is later re-added after Replaced
**When** accepted source identity returns
**Then** a new linked incarnation/task is created rather than reopening the Replaced task
**And** replacement-chain uniqueness prevents branching or duplicate successors.

**Given** the same identity reappears after Done or Force-closed without a fixture-proven new-rental identity
**When** derivation runs
**Then** it creates an incident only and no new work
**And** false irreversible derivation is corrected only through the separate admin correction-successor capability.

**Given** lifecycle fixtures run
**When** cancellation, removal, same-bike reactivation, replacement, re-add, stale updates, and rollback are exercised
**Then** overlays, terminality, unconditional unassignment, incarnation, and event history are proven.

**Given** a task becomes Cancelled or Replaced
**When** its detail route renders
**Then** a terminal panel replaces mutation controls, explains the source-backed outcome, preserves approved context and Activity access, and offers return to the Mechanic Dashboard
**And** Replaced does not directly navigate to its successor.

### Story 3.4: Complete Immutable Phase Snapshot Selection

As a Workshop staff member,
I want every later task phase bound to a stable checklist version with proven contention safety,
So that phase transitions and manager activation cannot rewrite work or evidence.

**Acceptance Criteria:**

**Given** Story 3.2 has already created a task with its immutable Prep Snapshot
**When** the task and snapshot are read
**Then** the selected version, copied authored Items, injected built-in Items, and snapshot identity are immutable
**And** direct DML cannot alter or delete referenced definitions or evidence.

**Given** a Bike Task later becomes Return-eligible
**When** Return snapshot selection is requested
**Then** the same locking and immutability rules select the then-active Return version
**And** Return snapshot creation is idempotent per task/Return generation.

**Given** a template is activated concurrently with snapshot selection
**When** both transactions complete
**Then** the task references exactly one complete old or new version
**And** no metadata/Item mixture or duplicate snapshot is possible.

**Given** a template is later edited, superseded, or reactivated
**When** existing tasks are read
**Then** their snapshots and prior progress remain unchanged
**And** only future phase snapshots use the newly active version.

**Given** snapshot selection or downstream derivation fails
**When** the transaction rolls back
**Then** no partial task/snapshot/event remains
**And** retry through current authority can complete idempotently.

## Epic 4: Source-Backed Intake Visibility and Safe Correction

Authorized staff distinguish actionable tasks, Waiting for Bike ID, integration uncertainty, terminal work, and immutable correction successors.

### Story 4.1: Inspect Source-Backed Workshop Intake

As an authorized Workshop staff member,
I want to see exact tasks, Waiting for Bike ID work, and integration uncertainty,
So that I can distinguish real workshop work from source problems before claiming begins.

**Acceptance Criteria:**

**Given** authorized staff open `/workshop`
**When** intake data loads
**Then** a server read model shows exact Bike Tasks with human `stock_identifier`, phase, rental timing, and source availability, plus a distinct Waiting for Bike ID section
**And** unknown multi-unit shortfalls appear only as Integration Incidents, never task cards.

**Given** task context crosses the Workshop read boundary
**When** the repository-owned task-context contract is defined
**Then** it versions role-specific fields, nullability, provenance, and required references while excluding Partner-only data and customer PII beyond the approved display need
**And** generated database/TypeScript forms, additive compatibility, unknown-newer fallback, and drift checks are fixture-proven from one editable source.

**Given** a task is Waiting for Bike ID
**When** it renders
**Then** it is visibly non-claimable with literal explanatory copy and no claim action
**And** managers receive a source correction link while mechanics see no synchronization theatre.

**Given** a task is Cancelled, Replaced, or otherwise read-only
**When** its detail route opens
**Then** a terminal/read-only panel explains why work stopped, removes mutation controls, and preserves approved context/history access
**And** Replaced does not link directly into its successor.

**Given** intake is empty or a loader fails
**When** the page renders
**Then** successful empty, Waiting-only, incident-only, and failed states remain distinct with in-context Retry for failure
**And** safe empty data never disguises an error.

**Given** staff use desktop, tablet, phone, keyboard, or assistive technology
**When** intake and terminal states render
**Then** bike identity, phase, source state, and next valid action remain readable, focus-visible, and non-color-only
**And** route loading preserves orientation without a blank wait.

**Given** Partner or unauthorized staff request Workshop intake/context
**When** RLS and field-minimized capabilities evaluate access
**Then** Workshop state and customer PII beyond the approved task-context contract are denied
**And** user-facing loaders never use service role.

### Story 4.2: Correct False Irreversible Derivation

As an Admin,
I want false irreversible derivation corrected through one immutable successor,
So that repair never rewrites or branches trustworthy history.

**Acceptance Criteria:**

**Given** a false irreversible derivation is identified
**When** an authorized Admin invokes correction
**Then** an internal correction capability locks the false predecessor and creates at most one immutable successor edge
**And** mechanics, managers, service role, API roles, and integration coordinator cannot execute it or branch from the original.

**Given** the same valid correction request is replayed
**When** its idempotency key and predecessor are evaluated
**Then** the capability returns the already-created successor and original attributable result without creating another row, task, edge, or event
**And** replay remains safe after timeout or lost client response.

**Given** two Admin correction requests race for the same predecessor
**When** both transactions contend on the predecessor lock and uniqueness constraint
**Then** exactly one successor is created and the concurrent loser receives the existing successor as a stable typed result
**And** no branching or partial correction event can commit.

**Given** a later false irreversible derivation is discovered after correction
**When** another correction is authorized
**Then** the request must target the current immutable successor rather than the historical predecessor
**And** the chain remains linear, attributable, and protected from cycles.

**Given** correction input, authorization, expected revision, predecessor status, or successor relationship is invalid
**When** the capability evaluates the request
**Then** it returns a stable expected error with current predecessor/successor state and performs no mutation
**And** unexpected failures are context-logged while actor, time, reason code, idempotency key, and accepted result are recorded atomically on success.

### Story 4.3: Prove Local Intake Safety

As the application owner,
I want the assembled source-to-intake seams proven locally,
So that cross-module contract or transaction gaps cannot reach remote environments.

**Acceptance Criteria:**

**Given** local proof runs
**When** reset, pgTAP, lint, generated types, adapter fixtures, role fixtures, and true multi-session scenarios execute
**Then** source envelope to canonical ingestion, exact membership, task/snapshot creation, intake read, and correction-successor seams pass as one sequence
**And** generated-contract compatibility and one local reset/migration sequence pass without duplicating proof already owned by originating stories or applying remote DDL manually.

## Epic 5: Paperless Bike Preparation and Independent Verification

Mechanics can discover, claim, prepare, hand off, independently re-check, record rental context and physical changes, and recover safely from save or ownership conflicts without a paper checklist.

### Story 5.1: Work from the Mechanic Dashboard

As a Mechanic,
I want to see my assigned work beside work available to claim,
So that I can resume or start the right bike without using a paper queue.

**Acceptance Criteria:**

**Given** Workshop is enabled for the authenticated Mechanic
**When** `/workshop` loads
**Then** PostgreSQL read models return My Work and Available Now as separate server-loaded queues
**And** sorting, eligibility, progress, and pagination are calculated in PostgreSQL with stable rental-start and task-identity tie-breakers.

**Given** claimable tasks exist
**When** Available Now renders
**Then** unassigned Needs Prep, Needs Re-check, and Needs Return Check tasks are ordered by earliest rental start
**And** each task card shows bike, order/client display context, rental dates, phase, assignee, progress, attention/change context, and one large phase-named action.

**Given** an unassigned task is claimable by the authenticated Mechanic
**When** its phase-named Claim action is selected
**Then** a `withAuth` action calls a narrowly privileged task-locking RPC with task identity, expected workflow revision, and current phase
**And** valid assignment, lifecycle update, actor/time event, and resulting revision commit atomically before the card navigates to authoritative task detail.

**Given** the Mechanic has assigned tasks
**When** My Work renders
**Then** each task links to its authoritative unresolved point
**And** bikes from one order remain independently visible and actionable.

**Given** Waiting for Bike ID tasks exist
**When** the dashboard renders
**Then** they remain visible with literal non-claimable explanation and no claim control
**And** guessed identity, quantity-based cards, or synchronization theatre is never shown.

**Given** one queue is empty or fails to load
**When** the other queue succeeds
**Then** each panel presents its own empty or in-context error/Retry state
**And** a failed queue is never rendered as successful empty data.

**Given** the dashboard is used in landscape, portrait, or phone layout
**When** its panels adapt
**Then** My Work and Available Now are strictly equal side-by-side panels in landscape and stack with My Work first on constrained widths
**And** controls remain large, focus-visible, non-color-dependent, and free of hover-, swipe-, precision-, or motion-only operation.

**Given** Workshop dashboard and detail routes render inside the brownfield application
**When** visual integration is inspected
**Then** they inherit the existing Echelon Subframe admin shell, staff-role navigation, Geist typography, light palette, 4px spacing rhythm, 4/8/12px radii, restrained shadows, and route-loading conventions
**And** no separate workshop-console identity or dark theme is introduced.

**Given** a Partner, unauthenticated user, or non-enrolled staff member requests the dashboard
**When** route, RLS, and rollout boundaries evaluate access
**Then** Workshop data is denied or the existing login boundary redirects with the intended destination
**And** no service-role or client-side role check bypasses the database boundary.

**Given** mounted landscape/portrait tablets, phones, keyboard, and assistive technology exercise the dashboard
**When** queue, loading, empty, error, denied, and navigation states render
**Then** identity, next action, labels, reading order, visible focus, announcements, text enlargement, and reduced motion pass
**And** controls remain full-sized, glare-resistant, and usable without hover, drag, swipe, long press, precision gestures, motion-only operation, or color-only meaning.

### Story 5.2: Resolve Claim Races and Explicit Assignment

As a Workshop staff member,
I want concurrent claims and manager-directed ownership changes resolved atomically,
So that the initial claim capability remains trustworthy under contention and reassignment.

**Acceptance Criteria:**

**Given** an unassigned claimable task is shown to a Mechanic
**When** they select its phase-named Claim action
**Then** the existing claim capability revalidates task identity, expected workflow revision, current phase, and authenticated actor
**And** it records prior ownership, phase, and resulting revision atomically without introducing a second claim path.

**Given** two Mechanics claim the same task concurrently
**When** both requests reach the task lock
**Then** first-writer-wins and exactly one assignment succeeds
**And** the losing card refreshes to show the authoritative assignee with a specific concurrent-loss message.

**Given** an Admin or Manager assigns or reassigns active work
**When** the consequential confirmation is accepted
**Then** the capability validates role, expected revision, target Mechanic, source availability, rollout, and phase before committing
**And** resolved outcomes and attribution remain intact while the recipient sees retained, invalidated, and unresolved work.

**Given** assignment is pending, confirmed, or fails
**When** feedback renders
**Then** the initiating control remains in place, prevents duplicate submission, and never presents pending as success
**And** expected failure returns a typed result, preserves context, and refreshes the authoritative card.

**Given** the task is stale, terminal, non-claimable, source-suspended, or already assigned
**When** claim or assignment is attempted
**Then** the RPC performs no mutation and returns the current phase, owner, and workflow revision
**And** no partial assignment or event is committed.

**Given** direct table DML or an unauthorized role attempts to alter ownership
**When** privileges are evaluated
**Then** the operation is denied, including for Partner and service-role API access
**And** local role and multi-session tests prove single-winner claims, reassignment, rollback, and event attribution.

### Story 5.3: View Phase-Aware Bike Task Context

As a Mechanic,
I want one task detail page showing current bike, rental, and checklist context,
So that I can perform the next physical action without opening Booqable.

**Acceptance Criteria:**

**Given** an assigned authorized Mechanic opens `/workshop/tasks/[taskId]`
**When** the field-minimized task-context capability loads
**Then** one phase-aware route shows full-width notices first, physical bike identity first in context, and the applicable immutable snapshot checklist
**And** it exposes only approved order/customer display, address, rental, setup, accessory, Notes, and `extra_information` fields.

**Given** source-backed setup values are available
**When** linked checklist groups render
**Then** current values including explicit `No` are shown with Booqable ownership labels
**And** groups remain always expanded in stable continuous-scroll order.

**Given** bundle-linked accessories and manager-authored `extra_information` exist
**When** context renders
**Then** both appear together with clear source labels and no inferred flat-order accessory-to-bike association
**And** absence of per-bike association may support attention without blocking handoff.

**Given** required built-in confirmation Items are present in the snapshot
**When** the checklist loads
**Then** `extra_information` and broad configuration-review confirmations identify their source, scope, current intent, and why selective classification was unavailable
**And** authored Items remain visible regardless of Booqable selection.

**Given** task context is not found, denied, terminal, loading, or failed
**When** the route resolves
**Then** each state is distinct; terminal tasks use the read-only terminal panel and loader failure shows in-context Retry
**And** not-found is used only for a successful null result.

**Given** viewport width changes
**When** detail layout adapts
**Then** context sits beside a wider checklist in landscape and notices, context, checklist, then sticky lifecycle controls form the portrait/phone reading order
**And** route loading preserves bike identity and phase orientation.

**Given** task detail, checklist, drawer, stale, error, and terminal states are validated with keyboard and assistive technology
**When** staff traverse and operate the surface
**Then** programmatic names, logical reading order, visible unobscured focus, route focus, overlay containment/return, announcements, and text enlargement pass
**And** documented semantic tokens meet contrast targets with text, icon, or structure accompanying color.

### Story 5.4: Record Immediate Action Item Outcomes

As a Mechanic,
I want to mark each Action Item Done or N/A with one tap,
So that checklist progress reflects confirmed work without paper.

**Acceptance Criteria:**

**Given** a snapshot Action Item applies to the current phase
**When** it renders
**Then** separate adjacent tile-sized Done and N/A controls show literal labels plus selected icon/border state
**And** the whole tile does not cycle state and color is never the sole indicator.

**Given** the Mechanic selects Done or N/A
**When** the save runs
**Then** one Item-evidence capability validates assignment, phase, cycle, snapshot Item, evidence revision, and applicability before atomically storing outcome and attribution
**And** either outcome satisfies completion while remaining distinguishable in history.

**Given** an Action Item is required, optional, changed, or built-in
**When** completion is calculated
**Then** confirmed Done or N/A satisfies that Action Item according to its immutable definition
**And** unconfirmed pending UI state never contributes to a handoff gate.

**Given** an Item save is pending or fails
**When** local status renders
**Then** only that Item locks, duplicate submission is prevented, and Unsaved/Saving/Saved/Retry identifies the exact action
**And** Saved appears only after the server returns the accepted evidence revision.

**Given** two disjoint Items save concurrently
**When** their revisions are valid
**Then** both commute without a task-wide lost update
**And** concurrent edits to the same evidence use compare-and-set and return authoritative outcome on conflict.

**Given** role, assignment, phase, cycle, or source state changed
**When** an old-screen Action save arrives
**Then** it is rejected without evidence/event mutation and returns the authoritative task state
**And** the page explains why the selection was not saved.

### Story 5.5: Autosave Value Item Evidence

As a Mechanic,
I want Value Item entries saved quickly and visibly,
So that measurements are trustworthy without slowing physical work.

**Acceptance Criteria:**

**Given** a Value Item applies to the current phase
**When** it renders
**Then** it provides a large value field with optional unit and no N/A control
**And** required and optional status are stated programmatically and visually.

**Given** the Mechanic types a value
**When** the field becomes dirty
**Then** local status immediately becomes Unsaved and an approximately two-second idle period triggers autosave
**And** blur, Enter, route-leave intent, Handoff, or Complete flushes pending input before the related action proceeds.

**Given** a Value Item save reaches the server
**When** validation succeeds
**Then** the evidence capability applies the same assignment, cycle, phase, snapshot, and compare-and-set guards as Action evidence
**And** confirmed value, actor, time, and evidence revision commit atomically.

**Given** a required Value Item is blank
**When** handoff eligibility is evaluated
**Then** it remains unresolved
**And** an optional blank Value Item may remain unresolved without blocking completion.

**Given** autosave fails or conflicts
**When** the Item remains open
**Then** typed input is retained, confirmed and typed values remain visually distinct, and local Retry identifies the failure
**And** the failed value does not satisfy lifecycle gates.

**Given** route-leave flush cannot confirm before navigation
**When** the user attempts to leave
**Then** the UI warns or retains the current route until the outcome is explicit
**And** it never claims offline/background synchronization.

### Story 5.6: Share Notes and Rental-Specific Information

As a Mechanic,
I want shared task Notes and previous rental instructions available in context,
So that mechanics can coordinate without turning Notes into hidden workflow state.

**Acceptance Criteria:**

**Given** an active Bike Task is open
**When** the shared Notes field loads
**Then** it shows the latest same-rental value and an independent Notes revision
**And** it is not treated as Item evidence, attention resolution, or a Structured Modification.

**Given** an assigned authorized Mechanic edits Notes
**When** the save is confirmed
**Then** a compare-and-set capability stores latest value, actor, time, and revision without advancing task workflow revision
**And** stale same-field edits return current Notes while retaining typed input for review.

**Given** Notes save is pending or fails
**When** feedback renders
**Then** Unsaved/Saving/Saved/Retry remains local to Notes, prevents duplicate submission, and never displays false confirmation
**And** lifecycle actions use only the confirmed Notes value where context is needed.

**Given** current and prior `extra_information` exist
**When** the Mechanic opens Previous Information
**Then** a one-level read-only drawer shows prior value, source time, and rental/context boundary while current authority remains visible
**And** loading/error/Retry, dismissal, focus containment, and focus return are validated.

**Given** a later rental is created for the same physical bike
**When** its task context loads
**Then** prior-rental Notes do not become the new task's shared Notes
**And** bounded last-touch history remains a separate explicitly labelled capability.

### Story 5.7: Record Structured Modifications and Last Touch

As a Mechanic,
I want durable physical changes recorded separately from Notes,
So that return-relevant facts and recent bike context cannot be overwritten.

**Acceptance Criteria:**

**Given** an assigned Mechanic records a physical change
**When** they save a Structured Modification
**Then** a dedicated capability appends one immutable free-form record with task, rental, stock identity, Work Cycle, actor, and time
**And** Notes edits cannot update, delete, or replace it.

**Given** the current phase is M2 Re-check
**When** M2 records a correction
**Then** durable return-relevant correction is saved as a Structured Modification without approve/reject semantics
**And** supplementary explanation may be stored separately in Notes.

**Given** modification creation is pending, fails, or receives stale task state
**When** feedback renders
**Then** entered text remains available, repeat submission is prevented, and confirmation appears only after the immutable record reloads
**And** invalid assignment, terminal state, or wrong rental creates no record.

**Given** task context requests last touch for the same `stock_identifier`
**When** the database read capability runs
**Then** it returns only the latest authoritative qualifying touch with stable ordering and approved fields
**And** the UI explicitly states that this is not complete bike history.

**Given** no prior touch exists or the lookup fails
**When** the last-touched summary renders
**Then** successful no-result and load failure are visually and semantically distinct
**And** failure provides Retry without hiding current task work.

**Given** activity or privilege fixtures inspect modifications
**When** direct DML and approved capabilities are exercised
**Then** append-only attribution and restrictive access are proven
**And** Partner, unauthorized staff, and service-role API writes are denied.

### Story 5.8: Complete Preparation and Hand Off the Bike

As the preparing Mechanic,
I want to hand off only server-confirmed complete work,
So that the bike enters the correct next phase with unambiguous M1 ownership.

**Acceptance Criteria:**

**Given** an assigned task is in Needs Prep or In Prep
**When** accepted work begins
**Then** the transition capability validates and resumes the current actionable Work Cycle created with task intake and records lifecycle/ownership attribution
**And** the Mechanic who performs the accepted Prep handoff becomes that cycle's M1.

**Given** the sticky lifecycle bar renders during Prep
**When** required Items remain unresolved
**Then** the Handoff action stays visible and selecting it scrolls to, focuses, and announces the first unresolved required Item
**And** optional unresolved Items do not block.

**Given** dirty Value Items exist
**When** Handoff is requested
**Then** pending fields flush and the confirmation panel cannot submit until their outcomes are explicit
**And** only server-confirmed Item evidence is used by the database completion gate.

**Given** the Mechanic confirms Handoff
**When** the consequence-bearing transition executes
**Then** it performs a just-in-time canonical refresh, validates an exact current freshness proof, workflow revision, source state, assignment, cycle, and completion under lock
**And** evidence and lifecycle/event writes commit atomically or all roll back.

**Given** any M2-enabled snapshot Item applies
**When** Prep handoff succeeds
**Then** the task immediately becomes unassigned Needs Re-check for that bike
**And** another bike on the order remains independent.

**Given** no M2-enabled Item applies
**When** Prep handoff succeeds
**Then** the task becomes Preparation Resolved
**And** no empty Re-check stage or artificial M2 work is created.

**Given** the lifecycle confirmation panel is open
**When** submit is pending, fails, or succeeds
**Then** focus is contained, duplicate submission is prevented, errors remain in-panel, and the panel persists until the route reflects authoritative phase
**And** focus return and resulting-phase announcement are validated.

**Given** local database and true multi-session tests race Prep evidence, source refresh, handoff, and rollback
**When** transactions complete
**Then** only server-confirmed evidence advances the atomic transition and append-only attribution remains complete
**And** direct privilege attempts fail while migrations remain local and remote DDL remains CI-only.

### Story 5.9: Perform Independent M2 Re-check

As a second Mechanic,
I want to verify Preparation independently,
So that required work is re-checked without reusing M1 evidence.

**Acceptance Criteria:**

**Given** an unassigned task is Needs Re-check
**When** a Mechanic other than current-cycle M1 claims it
**Then** the claim succeeds and the task enters In Re-check with that Mechanic assigned
**And** current-cycle M1 identity is visibly shown in context.

**Given** current-cycle M1 attempts to claim Re-check without an active per-task override
**When** authorization evaluates
**Then** the claim is rejected with a specific two-person rule result and authoritative ownership state
**And** no automatic fallback or hidden assignment occurs.

**Given** an M2-enabled Action Item is shown
**When** M2 resolves it
**Then** M2 must independently choose Done or N/A and fresh M2 evidence is stored
**And** M1's outcome cannot satisfy M2 completion.

**Given** an M2-enabled Value Item has an M1 target value
**When** M2 reviews it
**Then** the target is read-only and M2 records a fresh verification-passed attestation
**And** no duplicate value entry or adjustment flag is requested.

**Given** M2 finds a physical correction
**When** they record it
**Then** it uses the Structured Modification capability and may add supplementary Notes
**And** Re-check remains a factual correction/verification flow without approve/reject semantics.

**Given** every required M2 outcome is server-confirmed
**When** M2 confirms Complete
**Then** JIT refresh, freshness proof, expected revision, assignment, cycle, independence, and completion gates are revalidated atomically
**And** the task becomes Preparation Resolved and clears assignment.

**Given** required M2 work is unresolved or a save/transition fails
**When** Complete is attempted
**Then** the task remains In Re-check with explicit unresolved or retry feedback
**And** unconfirmed outcomes never advance lifecycle.

**Given** local database and true multi-session tests race Re-check claims, evidence, independence, completion, reset, and source change
**When** transactions complete
**Then** M2 independence, revision separation, atomic completion, rollback, and least privilege are proven
**And** keyboard, focus, announcement, responsive, and non-color status checks pass for the Re-check controls introduced here.

### Story 5.10: Recover Safely Across Stale Screens and Failures

As a Workshop staff member,
I want mechanic work to remain clear during stale conflicts and failures,
So that an open screen never hides authoritative state or loses recoverable typed input.

**Acceptance Criteria:**

**Given** ownership, phase, source state, cycle, or workflow revision changes after a task page loads
**When** an old-screen save or transition is submitted
**Then** the capability rejects it without mutation and returns the new authoritative state plus stable reason
**And** typed Value, Notes, or modification input remains long enough for explanation or valid retry.

**Given** Item evidence, Notes, modifications, claims, handoffs, or completion are pending or fail
**When** the UI reports status
**Then** each action distinguishes Unsaved, pending, failed, Retry, and server-confirmed state in context
**And** critical feedback is never toast-only, optimistic, or presented as empty success.

## Epic 6: Correct Work After Rental Configuration Changes

Mechanics can absorb Booqable changes through targeted or broad reopening while preserving unaffected evidence, ownership rules, independent verification, and clear changed-work feedback.

### Story 6.1: Establish Physically Attested Configuration Baselines

As a Workshop operator,
I want configuration changes compared with immutable physically attested intent,
So that fetched but unverified values never become the reopening baseline.

**Acceptance Criteria:**

**Given** a Work Cycle reaches a physically attested Prep or Re-check boundary
**When** the transition commits
**Then** it stores an immutable baseline of accepted source intent, source vector/fingerprint, applicable Setup values, evidence generation, cycle, and time
**And** later comparisons never use merely the most recently fetched unverified value as the baseline.

**Given** a task has no physically attested baseline yet
**When** source intent refreshes before first accepted work
**Then** current context may advance without creating an attested baseline or historical invalidation
**And** the first qualifying accepted boundary records exactly one baseline under task/cycle lock.

**Given** a direct write or stale transition attempts to replace a baseline
**When** database privileges and revisions evaluate
**Then** the mutation is denied without altering attested intent
**And** local fixtures prove immutability, rollback, and deterministic baseline selection.

### Story 6.2: Interpret Accessory Tags for Safe Change Targeting

As a Workshop operator,
I want accessory and configuration source facts interpreted only from complete evidence,
So that broad review remains safe until targeted invalidation is trustworthy.

**Acceptance Criteria:**

**Given** Epic 2 has persisted Product, ProductGroup, and Bundle tag lists without interpreting accessory tags
**When** configuration-change handling first activates
**Then** relevant changes advance broad `review_updated_configuration`
**And** no Admin classification screen, local ProductGroup allowlist, label match, or partial accessory-tag map may target Items.

**Given** every active Setup Category has a stable source field, relation, or accessory-tag identifier and complete fixtures
**When** a versioned targeted-mapping contract is proposed
**Then** null, unknown, changed, removed, cross-bike association, and selective Item-impact behavior are validated before targeted mode can activate
**And** contract provenance, version, time, source vocabulary, and resulting mode revision are recorded.

**Given** mapping proof is incomplete, stale, conflicting, or invalidated
**When** configuration comparison runs
**Then** targeted mode is unavailable and relevant changes advance broad `review_updated_configuration`
**And** source tags remain persisted without guessing selective Item impact.

**Given** current source intent is compared with the attested baseline
**When** change classification runs
**Then** the result is exactly safely mapped relevant, relevant but unsafe to map, or irrelevant using versioned catalogue codes
**And** prior/current values, known source, affected scope, and mapping version are retained for attributable history.

**Given** repeated notifications describe the same or newer unresolved intent
**When** comparison repeats
**Then** one unresolved change generation converges to latest accepted intent without duplicate Work Cycles or repeated resets
**And** stale source vectors cannot regress the pending target.

**Given** mapping activation or comparison is attempted through direct DML or an unauthorized role
**When** privileges evaluate
**Then** the write is denied and no baseline or mapping state changes
**And** local fixtures prove source-tag interpretation, broad fallback, convergence, rollback, and version invalidation.

### Story 6.3: Refresh Source Context Silently Before First Claim

As a Mechanic,
I want unstarted work refreshed before I claim it,
So that I begin from current rental intent without unnecessary change warnings.

**Acceptance Criteria:**

**Given** an exact task has never been claimed in its initial Prep cycle
**When** a Mechanic requests Claim
**Then** the consequential action performs a JIT canonical Booqable refresh and requires an exact current freshness proof before assignment
**And** current setup, accessories, `extra_information`, source phase, and context are reconciled atomically with claim eligibility.

**Given** relevant details changed before first claim
**When** refresh succeeds
**Then** the task snapshot remains immutable while current context and initial pending work reflect latest intent
**And** no persistent configuration-change notice, reopened label, or historical invalidation event is created.

**Given** the refreshed source makes the task cancelled, replaced, removed, ineligible, or no longer in Prep
**When** Claim validation resumes
**Then** assignment is rejected and the authoritative lifecycle/source state is returned
**And** no stale dashboard card can retain ownership.

**Given** refresh times out, is quarantined, or cannot produce a valid freshness proof
**When** Claim is attempted
**Then** Claim fails with specific retryable or blocking context while the task remains unassigned
**And** the UI does not claim that background synchronization will finish the action.

**Given** duplicate or out-of-order signals arrive around Claim
**When** ingestion and JIT contend
**Then** generation fences and task/source locks produce one current accepted source state
**And** claim either commits against that state or rolls back without partial mutation.

### Story 6.4: Reconfirm Changed Work During Active Preparation

As the preparing Mechanic,
I want relevant rental changes applied to my active checklist,
So that I can reconfirm affected work without losing ownership or unaffected evidence.

**Acceptance Criteria:**

**Given** a relevant safely mapped change arrives during active M1 Prep
**When** derivation compares it with the attested baseline
**Then** the same Work Cycle and M1 assignment are retained while only affected current-generation Item evidence is superseded
**And** unaffected confirmed evidence remains valid.

**Given** a relevant unsafe-to-map change arrives during active M1 Prep
**When** broad invalidation applies
**Then** built-in `review_updated_configuration` and every required scope defined by the broad rule reopen without changing ownership
**And** the reason records why selective classification failed.

**Given** changed work appears on Bike Task Detail
**When** the task loads
**Then** a persistent full-width red-tinted notice names source, prior/current values when known, affected scope, time, and Work Cycle effect
**And** reopened checklist groups use a thicker boundary, literal Reopened text, and prior/current context without relying on color alone.

**Given** M1 attempts Handoff with affected required outcomes unresolved or merely pending
**When** the database completion gate runs
**Then** Handoff is rejected and identifies the first unresolved affected Item
**And** retained unaffected evidence does not mask invalidated required work.

**Given** M1 reconfirms affected Items
**When** each save is server-confirmed against the current change/evidence generation
**Then** that Item's changed emphasis clears without a separate acknowledgement action
**And** the full notice clears only after every affected required outcome is confirmed.

**Given** another newer relevant change arrives before confirmation finishes
**When** reconciliation runs
**Then** pending intent converges to the latest values and supersedes only evidence affected by the new generation
**And** no duplicate cycle, assignment change, or misleading Saved state occurs.

### Story 6.5: Reopen Re-check or Resolved Preparation Safely

As a Workshop staff member,
I want relevant pre-pickup changes to reopen the same Bike Task correctly,
So that verification repeats without discarding trustworthy unaffected history.

**Acceptance Criteria:**

**Given** a relevant change arrives in Needs Re-check or In Re-check
**When** derivation commits
**Then** the same task returns to unassigned Needs Prep in a new Work Cycle and any Re-check assignment clears
**And** prior-cycle M1/M2 evidence and attribution remain historical.

**Given** a relevant change arrives after Preparation Resolved but before pickup
**When** derivation commits
**Then** the same task becomes unassigned Needs Prep in a new Work Cycle
**And** only affected Item work reopens under targeted mode or broad review under fallback mode.

**Given** a reopened cycle contains M2-enabled affected Items
**When** its M1 Prep handoff completes
**Then** the task enters Needs Re-check and fresh M2 verification is required for the reopened generation
**And** M2 independence is evaluated against the reopened cycle's M1.

**Given** prior outcomes are unaffected
**When** the reopened checklist renders
**Then** they remain readable as retained confirmed evidence and are not copied into fresh M2 outcomes
**And** current unresolved, retained, and invalidated states are explicit.

**Given** reopened derivation is repeated or races with a stale mechanic save
**When** locks and revisions are evaluated
**Then** at most one new Work Cycle is created for the accepted change generation and the stale save is rejected
**And** no prior evidence/event is rewritten.

**Given** the reopen transaction fails
**When** source, task, cycle, evidence, assignment, and event changes roll back
**Then** the original authoritative state remains intact
**And** retrying from current source converges idempotently.

### Story 6.6: Enforce Rental Boundaries and Preserve Change History

As a Workshop staff member,
I want configuration reopening bounded by physical rental phase,
So that late changes provide context without restarting completed or return work.

**Acceptance Criteria:**

**Given** exact source phase proves pickup has occurred
**When** a relevant configuration change arrives after Preparation Resolved
**Then** completed Prep does not reopen and no new Prep/Re-check Work Cycle is created
**And** the accepted change remains attributable context for later Return work.

**Given** a task is Needs Return Check or In Return Check
**When** configuration refresh changes setup context
**Then** current context may update without restarting Prep, Re-check, or Return evidence
**And** Return assignment and lifecycle remain non-regressive.

**Given** exact per-bike pickup/Return phase is unknown or fixture proof is incomplete
**When** a reopen boundary decision is required
**Then** automatic reopen/Return effects fail closed with a catalogue-defined incident
**And** quantity-, order-level-, or guessed phase is not used.

**Given** changed Items remain unresolved
**When** dashboard or detail renders
**Then** persistent change context remains visible and the task card summarizes the active change
**And** emphasis clears only from server-confirmed affected outcomes, never dismissal or local selection.

**Given** configuration acceptance and self-clear events are written
**When** the task's current change-context read model loads
**Then** it returns chronological source, actor/system, prior/current values, affected Items, classification/mapping version, cycle effect, and self-clear facts needed by notices and reopened groups
**And** unknown newer event types retain stable fallback metadata without breaking current task detail.

**Given** responsive and accessibility validation runs
**When** notices, reopened groups, previous information, sticky controls, and change context are exercised on desktop, tablet, and phone
**Then** labels, reasons, values, focus, announcements, reading order, and text enlargement remain usable
**And** red styling is always paired with text, structure, and programmatic context.

**Given** local fixtures cover pre-claim, active Prep, Re-check, Preparation Resolved, pickup, and Return boundaries
**When** targeted, broad, irrelevant, repeated, stale, and rollback scenarios run
**Then** FR26–FR33 behavior, cycle creation, selective preservation, independence, idempotency, and non-regression are proven
**And** remote migrations remain CI-only.

## Epic 7: Manager Exception Control and Trustworthy Audit

Managers can resolve attention, assign or reset exceptional work, force-close abandoned work, approve two-person overrides, and inspect durable attribution without blocking ordinary mechanic completion.

### Story 7.1: Record Mechanic Attention and Found-and-Fixed Work

As a Mechanic,
I want to distinguish unresolved concerns from corrections I already completed,
So that managers see only work that still needs a decision.

**Acceptance Criteria:**

**Given** an assigned active task is open
**When** the Mechanic raises Needs Attention
**Then** a capability creates one attributable unresolved flag using a catalogue-defined reason and deduplication scope
**And** the full-width amber attention strip states “Needs Attention” and the concrete reason.

**Given** a system rule detects missing bike-specific accessory information or another catalogue condition
**When** it raises attention
**Then** system source and evidence are recorded distinctly from mechanic-raised attention
**And** the flag remains orthogonal to lifecycle and Item completion.

**Given** the Mechanic identifies and fixes a factual issue without requiring a manager decision
**When** they save Found and Fixed
**Then** an immutable attributable record is server-confirmed and immediately readable in task context
**And** it creates no Needs Attention state or manager queue entry.

**Given** open attention exists
**When** Prep, Re-check, Return, or Done completion gates run
**Then** attention remains visible but non-blocking
**And** unresolved attention does not substitute for Item evidence or modification acknowledgement.

**Given** creation is pending, fails, duplicates an open deduplication scope, or receives stale task state
**When** feedback renders
**Then** entered reason/context remains available, no false success appears, and authoritative existing state is returned
**And** no duplicate unresolved flag or found-and-fixed event is committed.

**Given** attention and found-and-fixed records are read later
**When** task context renders
**Then** reason, source, actor/system, time, status, and resolution where applicable remain distinguishable
**And** neither is inferred from free-form Notes.

**Given** M1 raises a same-mechanic Re-check override request for the current Bike Task and Work Cycle
**When** the attention capability validates the request
**Then** one attributable unresolved `same_mechanic_recheck_override` flag is created without requiring a written explanation
**And** it appears in the Manager Attention List pending an explicit Approve or Decline while ordinary two-person eligibility remains enforced.

### Story 7.2: Triage Manager Attention and Missing Bike Identity

As an Admin or Manager,
I want a scan-first view of exceptional Workshop work,
So that I can address the most time-sensitive issues without interrupting ordinary completion.

**Acceptance Criteria:**

**Given** an authenticated Admin or Manager opens the Manager Dashboard
**When** its server read models load
**Then** unresolved Needs Attention appears first ordered by nearest rental start with stable tie-breakers
**And** Waiting for Bike ID appears in a separate section rather than as an attention flag.

**Given** an attention row renders
**When** the manager scans it
**Then** one accessible whole-row target shows bike/order, rental timing, reason/category, requester, age where relevant, and chevron
**And** it contains no nested inline decision controls.

**Given** a Waiting for Bike ID row is selected
**When** navigation occurs
**Then** it opens the corresponding authoritative Booqable order for source correction
**And** it does not offer local identity fabrication or Claim.

**Given** a Needs Attention row is selected
**When** detail loads
**Then** attention reason and current resolution status appear first, followed by approved task context and only controls delivered by completed stories
**And** later stories add controls incrementally; the surface must not render, advertise, or depend on assignment, reset, override, or force-close before those capabilities exist, while other unresolved flags remain independently visible.

**Given** a dashboard section is empty or fails
**When** the other section succeeds
**Then** each section presents independent empty or in-context error/Retry state
**And** failure never appears as zero exceptional work.

**Given** Manager Dashboard is used on desktop, tablet, phone, keyboard, or assistive technology
**When** rows adapt
**Then** facts stack without losing reason, timing, requester, target size, focus, or whole-row semantics
**And** loading and permission states preserve orientation.

**Given** a Mechanic, Partner, or unauthorized user requests manager reads
**When** role/RLS boundaries evaluate
**Then** manager-only attention data and controls are denied
**And** client navigation hiding is not the authorization boundary.

### Story 7.3: Resolve Attention by Reason

As an Admin or Manager,
I want resolution controls matched to the attention reason,
So that clearing a flag records the decision without changing unrelated task work.

**Acceptance Criteria:**

**Given** an unresolved attention flag is opened
**When** Manager Attention Detail loads
**Then** the reason catalogue selects the permitted generic resolution action and required inputs for missing/unclear information and manager-decision reasons
**And** task lifecycle, ownership, Item evidence, Notes, and other flags remain separate.

**Given** the reason is missing/unclear information or a manager decision
**When** the manager resolves it
**Then** a short resolution note is required, retained on validation failure, and stored with resolver/time
**And** blank or whitespace-only notes are rejected without mutation.

**Given** a permitted resolution is submitted
**When** the transactional capability validates role, flag revision, task identity, reason, and current status
**Then** only that flag resolves and an attributable resolution event commits atomically
**And** lifecycle and open attention siblings are unchanged.

**Given** another manager already resolved or changed the flag
**When** a stale submission arrives
**Then** no mutation occurs and current resolver, time, status, and revision are returned
**And** the page renders the concern read-only rather than as an empty form.

**Given** resolution is pending or fails
**When** feedback renders
**Then** the panel prevents duplicate submission, retains required input, and shows success only after authoritative reload
**And** expected errors remain in context rather than toast-only.

### Story 7.4: Assign and Reassign Exceptional Work

As an Admin or Manager,
I want to assign exceptional Bike Tasks explicitly,
So that ownership changes are deliberate and the receiving mechanic knows what remains.

**Acceptance Criteria:**

**Given** a manager opens an eligible task
**When** Assign or Reassign is selected
**Then** a confirmation panel names current phase, current owner, target Mechanic, and exact ownership/history effects
**And** it does not imply that prior confirmed outcomes will be deleted.

**Given** the manager confirms
**When** the assignment RPC runs
**Then** it validates manager role, rollout, source availability, phase, expected workflow revision, and eligible target staff
**And** owner, workflow revision, and attributable assignment/reassignment event commit atomically.

**Given** reassignment succeeds
**When** the receiving Mechanic loads the task
**Then** retained confirmed, invalidated, unresolved, attention, and current ownership states are explicit
**And** assignment does not make the recipient M1 or M2 until the applicable accepted lifecycle action defines that role.

**Given** target staff is ineligible, assignment changed, or the task became terminal/suspended
**When** the stale request executes
**Then** no ownership change occurs and current authoritative state is returned
**And** the manager must review before retrying.

**Given** confirmation is pending or fails
**When** the panel updates
**Then** repeat submit is blocked, failure remains in-panel, and no optimistic owner appears
**And** affected manager/mechanic routes are explicitly revalidated only after success.

### Story 7.5: Reset Stale Work to a New Preparation Cycle

As an Admin or Manager,
I want to reset genuinely stale active work,
So that another mechanic can restart safely without erasing what happened.

**Acceptance Criteria:**

**Given** an eligible non-terminal task has stale or abandoned active work
**When** Reset is selected
**Then** a destructive-styled confirmation panel states that assignment will clear, a new Needs Prep cycle will begin, and unresolved current-cycle work will be invalidated
**And** it states that pre-reset outcomes and attribution remain in history.

**Given** the manager confirms Reset
**When** the transactional RPC runs
**Then** it validates Admin/Manager role, allowed lifecycle/source state, expected workflow revision, current cycle, and current assignment under lock
**And** it closes the old cycle boundary, creates one new cycle, clears assignment, sets Needs Prep, and records the reset event atomically.

**Given** old-cycle required or M2 evidence exists
**When** Reset commits
**Then** unresolved/current-generation work cannot satisfy the new cycle
**And** historical evidence remains immutable and readable.

**Given** the task is Done, Cancelled, Replaced, Force-closed, already reset, or changed since confirmation
**When** Reset executes
**Then** the operation is rejected with authoritative lifecycle/cycle/revision
**And** no duplicate cycle or partial invalidation is created.

**Given** Reset is pending, fails, or succeeds
**When** feedback renders
**Then** duplicate submission is prevented, failure remains in the panel, and success waits for authoritative Needs Prep reload
**And** manager and mechanic queues are explicitly revalidated.

**Given** local multi-session tests race reset with saves, claim, handoff, source invalidation, and another reset
**When** transactions complete
**Then** exactly one valid outcome wins and history/assignment/cycle remain internally consistent
**And** direct DML cannot emulate reset.

### Story 7.6: Approve a Cycle-Bound Two-Person Override

As an Admin or Manager,
I want to authorize M1 to perform one task's Re-check when no second mechanic is available,
So that work can proceed through an explicit and auditable exception.

**Acceptance Criteria:**

**Given** a current Work Cycle requires Re-check and no second mechanic is available
**When** a manager reviews the override request
**Then** the panel identifies task, cycle, M1, current phase, and the one-task scope
**And** it offers Approve or Decline without requiring a written reason in v1.

**Given** Approve is selected
**When** the override capability runs
**Then** it validates Admin/Manager role, expected task/cycle/flag revisions, current M1, Re-check requirement, and non-terminal source state
**And** it records authorizer, time, request source, task, cycle, M1, and resulting revision in the append-only event stream and permits assignment of that cycle's Re-check to M1 or the authorizing manager.

**Given** the approved override exists
**When** an otherwise M1-equals-M2 claim or assignment runs
**Then** only that exact task and Work Cycle may bypass the independence rule
**And** the override cannot authorize future cycles, replacement tasks, or unrelated bikes.

**Given** Decline is selected
**When** resolution commits
**Then** the request resolves as declined without assignment or override
**And** ordinary two-person eligibility remains enforced.

**Given** phase, M1, cycle, task, or request changed before decision
**When** the manager submits
**Then** no override or resolution mutation occurs and current state is returned
**And** an old approval cannot be replayed after reopening/reset.

**Given** the override decision commits
**When** the capability returns
**Then** its typed result includes authoritative decision, cycle scope, eligible assignee state, and revision for immediate in-context confirmation
**And** the exception is represented in text rather than only by a badge or color.

### Story 7.7: Force-Close Abandoned Work

As an Admin or Manager,
I want a distinct force-close action for genuinely abandoned work,
So that it ends explicitly without being mistaken for successful completion.

**Acceptance Criteria:**

**Given** an eligible abandoned non-terminal task is open
**When** Force Close is selected
**Then** a destructive confirmation panel explains that the task will become terminal Force-closed, assignment will clear, and no completion success is implied
**And** preserved context/history and return-to-dashboard behavior are stated.

**Given** Force Close is confirmed
**When** the transactional capability validates manager role, source state, expected workflow revision, current cycle, and assignment
**Then** it sets terminal Force-closed, clears assignment, closes active ownership, and appends the event atomically
**And** Done, Cancelled, Replaced, attention resolution, and Reset remain distinct outcomes/actions.

**Given** the task changed, became terminal, or is not force-close eligible
**When** the request executes
**Then** it returns authoritative state without mutation
**And** the confirmation panel requires review rather than automatic retry.

**Given** Force Close is pending, fails, or succeeds
**When** confirmation feedback renders
**Then** duplicate submission is prevented, error remains in-panel, and no optimistic terminal state is shown
**And** affected queues/detail routes are explicitly revalidated only after authoritative success.

**Given** a task is authoritatively Force-closed
**When** detail renders
**Then** a terminal panel replaces mutation controls, explains that work ended without successful completion, preserves approved context and Activity access, and offers return to the Mechanic Dashboard
**And** Done, Cancelled, and Replaced remain distinct terminal explanations.

### Story 7.8: Inspect Workshop Activity

As an authorized Workshop staff member,
I want a read-only chronological Activity surface,
So that lifecycle, evidence, exceptions, and terminal outcomes remain trustworthy.

**Acceptance Criteria:**

**Given** any authorized Workshop user opens Activity/History
**When** the read model loads
**Then** chronological events include actor/system, time, verb, lifecycle, cycle, ownership, Item, Notes-related event metadata, modifications, Found and Fixed, attention, override, reset, invalidation, cancellation, replacement, and force-close context
**And** deterministic task sequence/global ordering and stable unknown-event fallback are used.

**Given** a Found-and-Fixed record appears in Activity
**When** its event renders
**Then** it receives confirmed-success treatment with factual correction, actor, and time while remaining distinguishable from Needs Attention
**And** it creates no unresolved badge, manager-queue implication, or color-only meaning.

**Given** Activity is empty, loading, failed, or contains a newer unknown event
**When** the surface renders
**Then** each state is explicit, failure offers Retry, and unknown events remain readable without mutation controls
**And** no event category relies only on color.

**Given** local role, append-only, and concurrency tests run
**When** force-close races saves/transitions and event tables are attacked directly
**Then** one atomic outcome wins, events cannot be inserted/updated/deleted/truncated by application roles including service role, and attribution remains complete
**And** responsive, keyboard, focus, announcement, and screen-reader checks pass for manager confirmation, terminal, and Activity surfaces.

## Epic 8: Paperless Return Check

Mechanics can complete category-specific Return work and close Bike Tasks as Done.

### Story 8.1: Trigger Per-Bike Return Check from Authoritative State

As a Workshop staff member,
I want each returned physical bike moved into Return Check exactly once,
So that unfinished Preparation cannot hide required return work.

**Acceptance Criteria:**

**Given** exact Planning/StockItem evidence proves an eligible associated bike has been authoritatively returned
**When** canonical derivation runs
**Then** the same Bike Task enters unassigned Needs Return Check and receives one immutable then-active category-specific Return Snapshot
**And** snapshot selection uses the shared phase/category advisory lock and is idempotent per Return generation.

**Given** the task is still in Needs Prep, In Prep, Needs Re-check, In Re-check, or Preparation Resolved
**When** Return becomes authoritative
**Then** unfinished Prep/Re-check history is preserved, active assignment clears, and Return work becomes authoritative
**And** no unfinished Item is falsely marked complete.

**Given** the task is Cancelled or Replaced
**When** Return reconciliation runs
**Then** it remains excluded from Return Check
**And** terminal source outcome and history do not regress.

**Given** the task is already Needs Return Check, In Return Check, Done, or Force-closed
**When** duplicate, delayed, or stale returned signals arrive
**Then** lifecycle is idempotent and non-regressive with no duplicate snapshot, cycle, assignment clear, or event
**And** the latest accepted source state remains authoritative.

**Given** exact per-bike Return phase is unknown or required Return template is missing
**When** derivation evaluates eligibility
**Then** automatic Return work fails closed with a catalogue-defined incident and no partial snapshot/transition
**And** quantity or flat order status is not used to invent physical-bike Return.

**Given** source, task, snapshot, assignment, and event writes cannot all commit
**When** the transaction fails
**Then** every change rolls back
**And** authoritative retry converges to one valid Return state.

**Given** local adapter, pgTAP, and role fixtures exercise Return triggering
**When** exact identity, forced unfinished work, terminal exclusion, snapshot contention, rollback, and direct privilege attempts run
**Then** per-bike Return derivation, phase forcing, snapshot idempotency, and least privilege are proven
**And** remote DDL remains merge-driven CI only.

### Story 8.2: Claim Return Work with Same-Rental Context

As a Return-check Mechanic,
I want to claim one returned bike and see its same-rental history,
So that I can inspect what happened without opening Booqable or paper records.

**Acceptance Criteria:**

**Given** an unassigned Needs Return Check task appears in Available Now
**When** an eligible Mechanic selects Claim Return Check
**Then** the ordinary atomic claim capability validates freshness, phase, expected revision, source state, and rollout before assigning that Mechanic
**And** the task enters In Return Check with one return-check owner and no M2 stage.

**Given** Return Task Detail loads
**When** context is read
**Then** it shows physical bike identity, approved current rental/source context, immutable Return Snapshot, and unfinished Prep/Re-check context
**And** same-rental Notes and every same-rental Structured Modification are visible.

**Given** prior-rental Notes or modifications exist for the same stock identity
**When** Return context loads
**Then** they are excluded from same-rental completion context
**And** any bounded last-touch summary remains separately labelled as not complete history.

**Given** concurrent Mechanics claim the same Return task
**When** requests contend
**Then** exactly one claimant succeeds and the loser sees authoritative assignee/phase
**And** no automatic or order-wide assignment occurs.

**Given** context is loading, empty in an optional section, failed, stale, denied, or terminal
**When** the route renders
**Then** each state is distinct with in-context Retry for failure and no empty-success substitution
**And** terminal tasks replace mutation controls with the read-only terminal panel.

**Given** Return claim and context are tested on landscape/portrait tablets, phones, keyboard, and assistive technology
**When** claim, detail, unfinished-work, stale, error, and terminal states are exercised
**Then** identity, context, actions, reading order, visible focus, announcements, text enlargement, and reduced motion remain usable without precision gestures or color-only meaning
**And** true multi-session claim races prove exactly one authoritative owner.

### Story 8.3: Complete Return Checklist Items

As the Return-check Mechanic,
I want to complete the immutable Return checklist,
So that the bike's return condition is recorded with confirmed evidence.

**Acceptance Criteria:**

**Given** an In Return Check task is assigned to the Mechanic
**When** Return Action and Value Items render
**Then** they use the established Action Done/N/A, Value autosave, per-Item status, always-expanded group, and required/optional semantics
**And** no M2 applicability, target verification, or second-mechanic stage is introduced.

**Given** the Mechanic records Return Item evidence
**When** saves reach the database
**Then** phase, assignment, Return generation, snapshot Item, evidence revision, and source state are validated
**And** confirmed evidence and attribution commit independently without task-wide lost updates.

**Given** required Return Items remain blank, unresolved, pending, failed, or stale
**When** Complete is selected
**Then** the sticky lifecycle bar scrolls to, focuses, and announces the first unresolved required Item
**And** optional unresolved Items do not block.

**Given** a Value field is dirty
**When** Complete or route-leave intent occurs
**Then** autosave flushes and confirmed/typed state remains distinct
**And** completion cannot use unconfirmed input.

**Given** ownership, lifecycle, Return generation, or source state changes after load
**When** stale evidence is submitted
**Then** it is rejected without mutation and authoritative state is returned
**And** typed input remains available long enough for explanation or valid retry.

**Given** Return checklist controls are used on mounted tablets, phones, keyboard, or assistive technology
**When** Action and Value Items, dirty fields, pending saves, failures, and Retry render
**Then** controls remain large, separated, glare-resistant, focus-visible, correctly named, and usable without hover, swipe, drag, long press, precision gestures, or motion-dependent meaning
**And** action-local feedback distinguishes unsaved, pending, failed, retrying, and server-confirmed state without relying on a toast.

### Story 8.4: Acknowledge Modifications and Complete Done

As the Return-check Mechanic,
I want to acknowledge each same-rental physical modification,
So that Done confirms every durable change was individually addressed.

**Acceptance Criteria:**

**Given** same-rental Structured Modifications exist
**When** Return Task Detail renders
**Then** every modification card remains visible with text, attribution, and time
**And** unacknowledged cards use literal red-emphasized state and a large Addressed action while acknowledged cards remain visibly confirmed.

**Given** the assigned Return Mechanic selects Addressed
**When** the acknowledgement capability runs
**Then** task, rental, modification, Return generation, assignment, and acknowledgement revision are validated
**And** one immutable attributable acknowledgement commits without editing the modification.

**Given** Notes mention a modification or a general confirmation exists
**When** completion eligibility is calculated
**Then** neither substitutes for individual acknowledgement
**And** every open same-rental Structured Modification must have its own confirmed current-Return acknowledgement.

**Given** acknowledgement is pending, fails, conflicts, or is stale
**When** card feedback renders
**Then** only that card locks, repeat submission is prevented, and Retry retains context
**And** failed/local state cannot satisfy Done.

**Given** all required Return Items and modification acknowledgements are server-confirmed
**When** the Mechanic confirms Complete
**Then** the transition performs JIT refresh and validates freshness proof, workflow revision, source state, assignment, Return generation, evidence, and acknowledgements under lock
**And** task becomes terminal Done, assignment clears, and lifecycle/event writes commit atomically.

**Given** completion fails or the task changed
**When** the confirmation panel updates
**Then** it remains open with specific in-panel error and authoritative state, prevents duplicate submit, and shows no optimistic Done
**And** successful completion persists until the route reloads the terminal panel.

**Given** a task becomes authoritatively Done
**When** detail renders
**Then** a terminal panel replaces mutation controls, explains successful Return completion, preserves approved context and Activity access, and offers return to the Mechanic Dashboard
**And** Done remains distinct from Cancelled, Replaced, and Force-closed.

**Given** acknowledgement and Done controls are tested with keyboard, assistive technology, pgTAP, role, and true multi-session fixtures
**When** pending, stale, conflicting, rollback, privilege, confirmation, and terminal paths execute
**Then** programmatic names, focus containment/return, announcements, non-color status, acknowledgement gates, atomic completion, and least privilege pass
**And** action-local feedback retains context and never presents pending as success.

### Story 8.5: Validate the End-to-End Return Check Journey

As a Workshop staff member,
I want the assembled Return Check journey validated end to end,
So that trigger, claim, context, checklist, acknowledgement, and Done work together safely.

**Acceptance Criteria:**

**Given** returned reconciliation, claim, Item saves, acknowledgement, and Done are replayed or delivered out of order
**When** database guards execute
**Then** snapshots, acknowledgements, events, lifecycle, and assignment remain idempotent and non-regressive
**And** stale actions return typed authoritative state without partial mutation.

**Given** the complete Return journey is exercised from authoritative returned state through Done
**When** trigger, claim, same-rental context, Return Items, Structured Modification acknowledgements, and completion execute in sequence
**Then** FR39–FR42 remain traceable across Stories 8.1–8.4 and the assembled journey preserves confirmed evidence and attribution
**And** this seam gate does not duplicate phase-specific role, concurrency, responsive, accessibility, or database proof owned by those originating stories.

## Epic 9: Safe Workshop Adoption and Paper Retirement

Owners prove environments, pilot a bounded cohort, approve general enablement, and retire paper through separate evidence-bound decisions.

### Story 9.1: Prove the Complete Deployed Workshop Environment

As an Admin,
I want disabled and shadow environment proof captured after every Workshop capability exists,
So that pilot approval is bound to the exact complete implementation and current source state.

**Acceptance Criteria:**

**Given** Epics 1–7 and every Epic 8 Return Check capability have passed their originating local proof obligations
**When** staging and production receive migrations through merge-driven CI and disabled/shadow environment proof begins
**Then** each environment remains disabled until deployed commit, migrations, contract/tool/runtime/database/extension versions, privileges, configuration, SSR `private, no-store`, and all route/action denials are captured
**And** no agent or operator applies remote DDL manually.

**Given** production enters shadow through the database rollout capability
**When** environment-bound verification runs against the deployed commit
**Then** migration/configuration/privilege parity, disabled/shadow enforcement, route/action denial, extension/runtime compatibility, and blocking incident state are captured
**And** feature behavior already proven by originating stories is treated as a signed prerequisite rather than duplicated in this environment gate.

**Given** two complete disabled/shadow reconciliation sweeps finish
**When** their manifests are compared
**Then** accepted source, materialization debt, task derivation, current enrolled candidates, and coverage watermarks are stable with zero catalogue-defined blocking incidents
**And** missing/duplicate tasks, uncertain source coverage, unproved lifecycle fixtures, or unresolved save/transition ambiguity is an automatic no-go.

**Given** rollback and repair readiness is reviewed
**When** the environment-proof manifest is signed
**Then** it names emergency disable, canonical refetch/reconciliation, incident handling, correction-successor use, evidence retention, resume authority, and accountable approvers
**And** every bound commit, migration, contract, privilege, configuration, epoch/cohort, test result, incident, exception, or approval invalidates the manifest when changed.

### Story 9.2: Activate a Controlled Workshop Pilot

As an Admin,
I want Workshop activated for one immutable enrolled pilot cohort,
So that complete digital Prep, Re-check, exception, and Return workflows are proven under database-enforced scope before general use.

**Acceptance Criteria:**

**Given** the approved pilot cohort and rollout epoch are prepared from a valid environment-proof manifest
**When** exact membership identities are enrolled
**Then** enrollment is immutable and attributable for that epoch, and replacement/correction successors inherit disposition according to the versioned rule
**And** no order label, quantity, deployment flag, or ambiguous identity can enroll work.

**Given** pilot activation is requested
**When** proof, cohort, seeded six-category source-tag validation, broad initial change mode, caller cutover, DML revocation, incident state, and rollback/repair runbooks are approved
**Then** the database transitions only the approved cohort to pilot
**And** derivation, reads, context, JIT, and user mutations admit only enrolled memberships while out-of-cohort access is denied by role fixtures.

**Given** the pilot transition is pending, stale, denied, or fails
**When** the activation capability returns
**Then** the exact proof/cohort/rollout revision conflict is shown without partial enrollment or route exposure
**And** success is confirmed only after authoritative pilot state and current enrolled tasks reload.

**Given** emergency-disable or a catalogue-defined rollback trigger occurs during pilot
**When** the Admin invokes the transition
**Then** Workshop reads/actions and new derivation stop atomically while source ingestion, evidence, incidents, and repair remain available
**And** resumption requires a newly valid proof manifest and explicit authority.

### Story 9.3: Enable General Workshop Use

As an Admin,
I want general Workshop use enabled only after successful pilot evidence and complete boundary accounting,
So that every eligible order has an explicit digital or legacy-paper disposition before broad activation.

**Acceptance Criteria:**

**Given** general enablement is requested after successful pilot operation
**When** the boundary manifest is evaluated
**Then** every eligible pre-boundary order has exactly one enrolled or attributable `legacy_paper_excluded` disposition and no unknown blocking incident
**And** any unaccounted eligible order blocks enablement while paper retirement remains a separate approval.

**Given** a fact bound by the prior environment-proof manifest changed during pilot
**When** general enablement is requested
**Then** a newly valid environment-proof manifest is required before approval
**And** stale proof cannot authorize broad route, derivation, JIT, read, or mutation exposure.

**Given** successful pilot evidence, current proof, the complete known-order boundary manifest, and zero unknown or blocking incidents are present
**When** an Admin explicitly approves general enablement against the expected rollout revision
**Then** the database transitions Workshop to enabled with actor, time, proof, boundary, and resulting epoch recorded atomically
**And** paper remains available until the separate paper-retirement decision succeeds.

**Given** general enablement is pending, denied, stale, or fails
**When** the capability returns
**Then** no partial exposure or boundary mutation occurs and the exact missing or conflicting evidence is shown
**And** success appears only after authoritative enabled state reloads.

### Story 9.4: Approve Paper Retirement from Operational Evidence

As the Workshop owner,
I want paper retired only from explicit operational evidence,
So that the digital workflow becomes the sole checklist without weakening preparation or Return safety.

**Acceptance Criteria:**

**Given** Workshop is generally enabled while paper remains available
**When** the controlled observation window runs
**Then** it covers at least one full peak preparation cycle plus Return Checks across the usual bike categories
**And** it includes complete Prep/Re-check, Waiting for Bike ID promotion, ambiguous multi-quantity incidents, mapped and broad configuration changes, cancellation, removal, replacement, same-bike reactivation, save retries, manager exceptions, and Return flows.

**Given** the observation window completes
**When** evidence is assembled
**Then** direct mechanic feedback records comfort, speed, clarity, focus, and ability to work without paper
**And** observer evidence compares preparation speed, missed required checks, unresolved configuration mismatches, avoidable Re-check discrepancies, and unpredictable Booqable synchronization against the paper baseline.

**Given** a missing or duplicate Bike Task occurs, or a save/handoff failure leaves a Mechanic unsure what was recorded
**When** the rollback trigger is confirmed
**Then** paper retirement is blocked or reversed and emergency-disable/repair authority is invoked according to the approved runbook
**And** the incident, affected cohort/time window, evidence, decision actor, and recovery result remain durable.

**Given** mechanics report comfortable paperless work, observers find no material slowdown or quality regression, Booqable convergence remains predictable, and no rollback trigger occurred
**When** the Workshop owner reviews the signed evidence package
**Then** paper retirement may be approved separately from pilot and general activation with actor, time, cohort/window, metric evidence, exceptions, and rollback authority recorded
**And** no deployment flag or elapsed time can imply approval.

**Given** evidence is incomplete, contradictory, stale, or outside the approved peak-cycle/category scope
**When** retirement is requested
**Then** the gate fails closed with the missing evidence identified
**And** Workshop may remain enabled alongside paper until a new valid observation package is approved.
