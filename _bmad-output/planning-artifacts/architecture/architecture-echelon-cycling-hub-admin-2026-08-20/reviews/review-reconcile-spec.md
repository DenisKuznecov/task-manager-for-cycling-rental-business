# Reconcile — Architecture Spine vs Spec Package

## Verdict

**partial**

The spine inherits CAP-1 through CAP-10, lists every companion as binding, and lands most load-bearing mechanics as `AD`s: transactional apply of one snapshot, assignment-instance identity, frozen checklist copies, command-owned transitions, partner exclusion, add-on fingerprinting after readiness, Madrid queues, leases without a second queue, and no periodic polling. What the `AD` structure quietly dropped are the spec’s **success criteria, tone, and “do not treat as X” constraints** — especially missing-tag behavior that still creates a visible task, the mixed-bike convergence demo, staff-visible sync health, M2-confirms-M1 semantics, and a seed comment that reintroduces detached webhook work. Those gaps can produce a build that obeys every Rule and still fails the spec’s success signal.

This review does not invent ordered items for the four unsupplied preparation tags, and it does not treat unverified Booqable v4 include/auth/webhook/quota facts as settled. Those remain Deferred / tenant-spike work, as the spec already states.

## Evidence reviewed

- `_bmad-output/planning-artifacts/architecture/architecture-echelon-cycling-hub-admin-2026-08-20/ARCHITECTURE-SPINE.md`
- `_bmad-output/specs/spec-automating-mechanics-daily-work/SPEC.md`
- `_bmad-output/specs/spec-automating-mechanics-daily-work/workflow-state-machine.md`
- `_bmad-output/specs/spec-automating-mechanics-daily-work/checklist-contract.md`
- `_bmad-output/specs/spec-automating-mechanics-daily-work/launch-checklists.md`
- `_bmad-output/specs/spec-automating-mechanics-daily-work/booqable-reconciliation.md`

Unverified Booqable tenant-spike measurements and the four missing catalogs were not filled in.

## Coverage map (quiet requirements)

| Spec quiet requirement | Landed in spine? | Where / gap |
| --- | --- | --- |
| Tone: touch-first, unassigned, transferable paper replacement | Partial | AD-5 (no assign/lock), AD-11 (large targets, linear page). No “any mechanic continues existing work” UI/command tone; no tablet operating context as an acceptance bar. |
| SPEC Constraints block | Mostly | Identity, no transfer, atomic attestations, Madrid dates, complete-snapshot, no polling, post-readiness add-ons, Cancelled history. Several “do not” clauses are implicit rather than Rules. |
| Success signal (mixed bikes + full tablet lifecycle) | Dropped | AD-13 tests adapter/apply, seed/commands, webhook/manual/lease/health. No mixed identified/unidentified/removed/replaced convergence demo; no tablet lifecycle gate. |
| CAP-1: task even if sibling unidentified or tag missing; no dupes on unchanged snapshots | Partial | AD-2/AD-3 cover identity and idempotent apply. Unidentified siblings and missing tags are not named as non-blockers / non-invalidation. |
| CAP-2: start-date queue moves; tablet, large targets, minimal actions | Partial | AD-9 `starts_at` + Madrid; AD-11 touch targets. Start-date change must not reset checklist work is unstated. Stand-mounted tablet is not a bound success check. |
| CAP-3 / missing-tag: visible task, config warning, cannot start prep, not hidden/cancelled | Dropped / conflict-prone | AD-4 “zero or multiple tags is a configuration error” + snapshot remove. Create-still-visible is only implied by AD-3. |
| CAP-4/5/8 attestations, N/A, no M2 on storage | Landed | AD-4 seed keys, AD-5 edges, AD-7 attestations. |
| CAP-5: M2 confirms M1 PSI/N/A rather than replacing | Quiet drop | Seed DTO fields exist; no Rule that M2 must confirm recorded PSI/N/A and must not request a second measurement. |
| CAP-6 add-ons visible throughout; confirm before readiness; late display-only after ready | Landed | AD-8. Explicit “mechanic confirms matches preparation” is implemented as fingerprint match on `workshop_complete_m2`, not as a named confirmation step. |
| CAP-7 partner cannot pickup/return | Landed (stronger) | AD-5 partner may do none; AD-6 staff-only SELECT. |
| CAP-9 invalidation: cancel on remove/order cancel; replacement = cancel+fresh; open task abandon copy | Partial | AD-3/AD-5/AD-11 tombstone. Order-cancellation as a source event is folded into “exact source terminal statuses” (tenant spike) instead of the companion’s skip-completed-and-cancelled rule. |
| CAP-10 same reconciler, overlap prevention, last success visible, incomplete fetch leaves tasks, surface failure | Partial | AD-10 stores health and forbids detach/cron/queue. Staff-visible last-success / progress / failure UI is not in AD-11. |
| Uniqueness ≡ order + stock item + task kind | Reconciled, not dropped | AD-3 uses assignment **instance** + kind, with at most one **active** instance per order/stock pair. Preserves spec uniqueness for live work; allows re-addition. Residual: “equivalent uniqueness” for the active triple is not restated. |
| Complete snapshot; no apply on partial pages | Landed in AD-2/AD-10; contradicted in seed | Sequence diagram and AD-2 match the companion. `route.ts` comment says “signal only; starts shared sync runner.” |
| No periodic polling | Landed | AD-10, AD-12, Outside MVP. Realtime is `router.refresh()` only. |
| Launch ROAD + STORAGE seeds; four catalogs blocked | Landed | AD-4 seed exact `ROAD-01`–`ROAD-25` and `STORAGE-01`–`STORAGE-06`; Deferred/Build Readiness keep the other four blocked. No invented items. |
| Companions are binding | Landed as citation, not as AD text | Frontmatter `companions:` and constraint “detailed … companions are binding.” Several companion sentences never became Rules. |

## Findings

### 1. Missing-tag behavior can be implemented as “no task” or “cancelled” while still matching AD-4

- **Spec:** CAP-1 success, CAP-3 success, Constraints (“A recognized workshop tag is not required to create a task … absence is a Booqable product-configuration error that blocks preparation”), checklist-contract (“An identified bike always receives a visible task. A missing or unrecognized workshop tag … does not invalidate or hide the task. Block **Start preparation** until … synchronization selects the checklist.”).
- **Spine:** AD-3 creates one `rental_turnaround` task per assignment instance. AD-4: “Zero or multiple recognized workshop tags is a configuration error.” While `to_prepare`, sync may “attach, replace, or **remove** the task-local preparation snapshot.” `CONFIGURATION_BLOCKED` is a failure code. The list DTO includes “mapped tag/config warning.”
- **Quiet drop:** Create-the-task and warn is never a Rule. “Configuration error” plus “remove the snapshot” plus `CONFIGURATION_BLOCKED` lets a unit skip insert, hide the row, or cancel the assignment. The spec’s split is: **identity creates work; mapping only enables Start preparation.** Mid-work tag drift (frozen snapshot, warn, block stage completion, no auto-resolve) did land in AD-4 and Outside MVP.
- **Do not invent:** mappings or item lists for `workshop-e-city-bike`, `workshop-e-mtb-bike`, `workshop-gravel-bike`, `workshop-e-road-bike`. Spine already keeps those disabled until supplied.

### 2. The spec success signal is not a spine gate

- **Spec Success signal:** For a reserved order containing identified, unidentified, removed, and replaced bikes, converge to exactly one valid task per **current** physical bike and preserve cancelled history without transferring work. Then demonstrate the full guarded lifecycle from `To Prepare` through signed M1, signed M2, pickup, return, signed storage, and `Completed` **on a tablet**.
- **CAP-1 success:** identified bikes still get a task when another bike on the order is unidentified.
- **Spine:** AD-13 requires adapter → apply, seed → commands → detail, and webhook/manual → lease → apply → health. No mixed-assignment fixture. No unidentified-sibling non-blocker. No tablet lifecycle demonstration.
- **Quiet drop:** Tone and success are how the spec says “done.” Units can ship mutually consistent ADs and still fail that demo (e.g. withhold tasks until every line is identified; transfer history on replace; desktop-only dense UI).

### 3. Sync health is persisted, not specified as staff-visible recovery UX

- **Spec CAP-10 success:** last successful sync time is **visible**; incomplete Booqable response leaves existing tasks unchanged **while surfacing the failure**.
- **Companion:** show progress where useful, last successful sync time, completion, and clear failure details; overlapping manual runs prevented; webhook and manual share one reconciler; no polling; wait for `order.updated` or staff sync is acceptable.
- **Spine:** AD-10 stores last attempt, counts, failures, cursor, per-order results; advances a full-success timestamp only when listing and every eligible order succeed; partial runs stay failed/resumable; same `reconcileBooqableOrder`; no cron/polling/detached promise/queue. AD-11 is the Kanban → table/task-page contract and does not require a health surface. CAP-10 maps only to AD-2 and AD-10.
- **Quiet drop:** Visibility and failure surfacing are product success, not storage. Two units can both store run rows and still disagree on whether `/workshop` shows last full-horizon success, last per-order apply, last attempt, or nothing until an admin opens logs.

### 4. Complete-snapshot / no-detach is an AD, then undone in the seed route comment

- **Spec / companion:** `order.updated` is a **signal** to fetch; paginate to exhaustion; do not apply a difference if any page fails; reconciliation changes no existing task unless the complete snapshot loads; no periodic polling; no detached background worker implied.
- **Spine AD-2 / AD-10 / sequence diagram:** emit `SourceOrderSnapshotV1` only after every required page validates; failed/partial/drift writes nothing; webhook **awaits** one bounded order reconciliation before responding; never detaches.
- **Spine seed:** `src/app/api/webhooks/booqable/route.ts  # signal only; starts shared sync runner`.
- **Quiet contradiction:** “Starts” reads as fire-and-forget, which is the polling/queue-shaped failure the spec forbade. Implementers following the tree over AD-10 can acknowledge the webhook and apply later (or never), violating complete-snapshot and CAP-10 overlap/health.

### 5. Several “do not” constraints never became Rules

These are small individually and load-bearing together:

**Invalidation vs date vs add-ons**

- Companion: a start-date change updates queue timing in `Europe/Madrid` **without resetting checklist work**. Add-on changes update display; before readiness the user confirms the current set; after readiness the state is not reopened (AD-8 landed the after-readiness half).
- Spine never says a date-only snapshot must not cancel, recreate, or clear items. A unit that treats any source fingerprint change as assignment invalidation still satisfies AD-2 “replace current source rows” and AD-3 set-diff if it also rebuilds instances.

**Order cancel / skip completed and cancelled source orders**

- Companion: “Completed and cancelled orders are skipped.” Invalidation: order cancelled or physical bike removed/replaced.
- AD-10: “exact source terminal statuses come from the tenant spike.” That correctly refuses to invent enum values. It also dropped the already-decided **rule** (skip completed/cancelled source orders; cancel local work on order cancellation). The spike should only map which Booqable statuses mean those words.

**Uniqueness wording**

- Spec: uniqueness equivalent to Booqable order ID, stock item ID, and task kind; unchanged snapshots produce no duplicates.
- AD-3’s instance key is the right fix for remove-then-re-add and does not violate the spec if **at most one nonterminal task exists per (order, stock item, kind)**. That active-triple clause is not restated next to the instance unique key, so a uniqueness index on the spec triple alone would still look “on spec” and break re-addition.

**Add-on confirmation as mechanic action**

- CAP-6 / checklist-contract: explicit confirmation that preparation matches current add-ons before `Ready for Pickup`; current add-ons remain visible throughout.
- AD-8: visibility + M2 locks source, compares expected fingerprint, stores snapshot, `ADD_ONS_CHANGED`. Fingerprint match can be the confirmation, but the spec’s success language is a mechanic action, not only a compare-and-swap. Empty-list fingerprint did land.

**M2 confirms M1 rather than replacing it**

- CAP-5 success and checklist-contract: M2 confirms recorded PSI or N/A; does not request a second measurement; shows only designated items.
- Spine: `workshop_confirm_m2_item`, seed columns for M1 outcome/PSI and M2 confirmation. No Rule preventing a second PSI entry or overwriting M1 values. That is a dropped success criterion, not a missing catalog.

**Partner exclusion**

- CAP-7: any non-partner staff may record pickup/return; partner-role users cannot.
- AD-5/AD-6 land this and extend it to all workshop read/write/sync. Not a drop; note the spine is stricter than CAP-7’s wording (partner cannot even read). Aligns with “partner access” in AD-6 Prevents.

**Tablet / touch tone**

- CAP-2 success and M1 interaction: stand-mounted tablet, large tappable rows, minimal actions, linear checklist.
- AD-11: large touch targets, minimal taps, dedicated page not drawer/modal, linear checklist. Visual styling is Deferred with touch targets held fixed.
- Remaining drop: tablet as the **success environment** (success signal) and “minimal actions” as fewer named stage actions, not only large hit areas. Unassigned/transferable “continue another mechanic’s work” is only implied by no locks.

**No polling**

- Landed in AD-10, AD-12, Outside MVP, and the companion’s “acceptable to wait for webhook or manual sync.” Finding 4 is the residual: the seed comment is the polling-shaped hole.

## What the spine did keep (so this is partial, not fail)

- Paradigm ports vs PostgreSQL as the only workflow mutator (AD-1/AD-5/AD-6).
- Complete-snapshot apply, fingerprints, empty add-on fingerprint, no write on partial fetch (AD-2) — if the seed comment is treated as a defect, not a second rule.
- Physical identity = raw `stock_items.id`; display labels are not keys; history does not transfer; re-addition creates a new instance (AD-3).
- Versioned definition copy, ROAD/STORAGE seed keys, freeze after preparation starts, four catalogs blocked not invented (AD-4, Deferred, launch-checklists).
- Exact lifecycle edges; `completed`/`cancelled` immutable; no assignment/lock; roles from `auth.uid()`; partner excluded (AD-5).
- Attestation snapshots, `PROFILE_NAME_REQUIRED`, history immutability, no checkbox author (AD-7).
- Add-ons after `ready_for_pickup` never reopen status (AD-8).
- Queue filters, cancelled hidden, Completed in All, Madrid, URL state, `/workshop/[taskId]` (AD-9/AD-11).
- Tombstone + abandon-work copy for cancelled-by-id (AD-11; CAP-9 open-task success).
- Shared reconciler, leases/fences, manual page/resume, horizon includes orders with no task, no cron/queue/polling (AD-10).
- Non-goals mirrored in Outside MVP (assignment, scanning, admin templates, auto pickup/return, polling, auto-resolve mid-work tag change).

## Required guards (no invented spike/catalog facts)

1. State as a Rule: an identified assignment **always** inserts/retains a visible non-cancelled task; zero/unrecognized/multiple tags set a configuration warning and block **Start preparation** only; they are not invalidation and must not hide the row. After start, keep AD-4 freeze + warning. Keep the four unsupplied tags disabled.
2. Promote the SPEC success signal to AD-13 (or Build Readiness): one mixed-order fixture (identified + unidentified + removed + replaced) plus the guarded tablet lifecycle. Unidentified lines must not block identified tasks.
3. Bind CAP-10 visibility: workshop recovery UI shows last **full-horizon** success time, in-progress/partial/failed state, and the failure that left tasks unchanged. Storage in AD-10 is not enough.
4. Delete or rewrite the webhook seed comment so it cannot mean detach; keep AD-10 await-and-apply.
5. Add the leftover “do not” Rules: date-only updates must not reset or cancel work; skip completed/cancelled **source orders** (enum mapping still spike-owned); active uniqueness remains one nonterminal `(order, stock item, kind)`; M2 confirms M1 PSI/N/A and does not re-measure; add-on confirmation is required before readiness (fingerprint may be the mechanism).

## Out of scope for this lens

- Whether Vitest vs pgTAP is the right runner (good-spine / technology-reality).
- Lease fencing implementation details already covered in other reviews, except where they change complete-snapshot or no-polling.
- Inventing ROAD-equivalent items for the four blocked tags.
- Asserting a live Booqable include path, debounce, or status enum beyond what the companion already requires the spike to measure.
