---
title: 'Workshop UI'
type: 'feature'
created: '2026-08-21'
status: 'done'
baseline_revision: '6210851dd8480750f10f95a74793c2bd7ed8f885'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/specs/spec-automating-mechanics-daily-work/checklist-contract.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-echelon-cycling-hub-admin-2026-08-20/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-workshop-foundation.md'
warnings:
  - oversized
deferred:
  - summary: >-
      Repo-wide `npm run lint` still fails on pre-existing bike-fits/wiki
      react-hooks findings from the Next.js 16 upgrade.
    evidence: |-
      Workshop eslint is clean; the upgrade spec deferred those 21 errors.
    location: >-
      src/app/bike-fits, src/app/wiki
    severity: medium
  - summary: >-
      README still lists `@hello-pangea/dnd` after the dependency was removed.
    evidence: |-
      package.json no longer has the package; README was not in this story's
      file list.
    location: >-
      README.md
    severity: low
  - summary: >-
      Drawer wiring tests still grep layout/task source rather than rendering
      OrderDetailsDrawerHost.
    evidence: |-
      pgTAP covers mechanic SELECT; a missing host in the tree would not fail
      those SQL tests.
    location: >-
      src/workshop-ui.test.mts
    severity: low
---

<intent-contract>

## Intent

**Problem:** `/workshop` still shows a mock Kanban. Mechanics cannot find real bike tasks or run the guarded lifecycle, even though staff commands and loaders already exist.

**Approach:** Replace the mock with a URL-filtered task table and a dedicated `/workshop/[taskId]` page that calls the existing `withAuth` actions for preparation, M2, add-ons, pickup, return, and storage. On the task page, a large order button opens the existing parent-order details drawer so mechanics can see rental context without leaving the task.

## Boundaries & Constraints

**Always:**
- Convert `/workshop` to a server page. Read `filter`, `query`, and `page` from async `searchParams`. Pass them to `loadWorkshopTasks`. Invalid `filter` is `today`; invalid `page` is `1` (already in the loader). Cancelled rows never appear in any filter; Completed appears only in `all`.
- One Subframe table (bike id/title, order #, start, status, item progress, config warning). Tabs: Today, Tomorrow, Next 7 Days, All (`today` / `tomorrow` / `next_7_days` / `all`). Row click goes to `/workshop/[taskId]`, not a drawer or modal. Keep `layout.tsx` and `DefaultPageLayout`. Large touch targets (`Button size="large"`, tappable rows).
- Task page: `loadWorkshopTaskDetail`. `error` → error Alert (do not `notFound()`). `item` null, no error → `notFound()`. `status === "cancelled"` → tombstone “abandon this work” (still an `item`, not not-found). Named actions only; pass `task.version` as `expectedVersion`. Show current add-ons on every non-tombstone task. Surface `{ ok: false, code, error }` inline.
- Order context: a large clickable order button on the task page (including tombstone) labelled from `orderNumber` (e.g. `Order #12`). It must reuse `useOpenOrderDetails` + `OrderDetailsDrawerHost` + `OrderDetailsDrawer` exactly as `/orders` does (`?order=<id>`, preserve other params). Mount the host in `src/app/workshop/layout.tsx` inside `Suspense`. This drawer is parent-order context, not task work — do not put the checklist in it.
- Mechanic RLS: local idempotent migration only. Add SELECT-only policies so `mechanic` can read `orders`, `customers`, `partners`, and `order_items` for orders that already have a `bike_tasks` row. Do not grant DML. Do not open `/orders` to mechanics. Admin/manager keep existing full SELECT. Cover mechanic-can / unrelated-order-cannot in pgTAP.
- M1: linear checklist — tap `action` complete; `naAllowed` can mark `not_applicable`; `tyre_pressure_psi` is numeric PSI. M2: only `m2Verifies` items; confirm M1 PSI/N/A, do not re-measure. Same-person M2 requires an explicit confirm before `completeM2`. Explicit add-ons confirm, then pass detail `addonFingerprint`. Storage: the six storage items, then `completeStorage`.
- Realtime: client table subscribes to `public.bike_tasks` like `AllOrdersTable`; callback only `router.refresh()`; remove the channel on unmount. Import UI from `@/src/lib/workshop` public exports only (actions, data, domain types). Log failures with `workshop:`.
- Delete Kanban files and remove `@hello-pangea/dnd` after last use.

**Block If:**
- A screen needs a command, column, or field that existing loaders/actions do not provide (do not add RPCs). The mechanic parent-order SELECT policies above are the only allowed new migration.

**Never:**
- Drag-and-drop or editing status in place. “Add new task”, assignment, or locking.
- Sync-health UI, manual sync, webhook, apply, leases, or Booqable calls.
- New workshop tables/RPCs, `src/lib/workshop/application`, Vitest, duplicating order-details UI, or changing `src/lib/workshop/actions|data` unless a type-only import path is broken.
- Inventing checklist copy for the four disabled tags. Hosted DDL.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Default queue | `/workshop` or `?filter=nope` | Today table; cancelled hidden | Loader `error` → `DataLoadError` |
| Filters + search | `filter` / `query` / `page` in URL | Matching rows; empty copy if none | Not an error |
| Open task | Row click | Navigate to `/workshop/[taskId]` | — |
| Start prep | `to_prepare`, mapped tag | Status `being_prepared` | Warning + `CONFIGURATION_BLOCKED` if unmapped |
| M1 / M2 / storage | Required items valid; named profile | Signed stage; next status; names shown | Incomplete → `INCOMPLETE_CHECKLIST`; missing name → `PROFILE_NAME_REQUIRED` |
| Same-person M2 | M1 signer is current user | Complete blocked until explicit confirm | Without confirm, no `completeM2` call |
| Pickup / return | `ready_for_pickup` / `in_rental` | `in_rental` / `returned` | Illegal edge → `INVALID_TRANSITION` |
| Cancelled by id | Detail `status` cancelled | Tombstone, no actions | Not `notFound()` |
| Missing / failed detail | RPC null / error | `notFound()` / error Alert | Do not crash |
| Stale tablet | `STALE_VERSION` | Stay on page; show error | Refresh to new version |
| View parent order | Click order button on `/workshop/[taskId]` | `?order=<task.orderId>` opens existing `OrderDetailsDrawer` | Loader error → drawer `DataLoadError`; mechanic cannot read an order with no bike task |

</intent-contract>

## Code Map

- `src/app/workshop/layout.tsx` L5–37 — keep the role guard; add `OrderDetailsDrawerHost` like `src/app/orders/layout.tsx` L46–51.
- `src/components/orders/useOpenOrderDetails.ts` L10–19, `OrderDetailsDrawerHost.tsx`, `OrderDetailsDrawer.tsx` L207–257 — reuse; do not fork. Task DTO already has `orderId` / `orderNumber` (`domain/dtos.ts` L14–16).
- `src/lib/orders.ts` L105–138 — `loadOrderDetails` needs mechanic SELECT on `orders` + nested `customers` / `partners` / `order_items`. Today those policies are admin/manager only (`20260608102505_remote_schema.sql` L602–642, `20260610151000_add_order_items_and_payment_fields.sql` L37–40).
- `src/app/workshop/page.tsx` — replace client Kanban shell; follow `src/app/wiki/page.tsx` L11–67 and `src/app/hq/links/page.tsx` L16–86 (async `searchParams`, `DataLoadError`).
- `src/app/workshop/_components/WorkshopLoadingSkeleton.tsx` — Kanban skeleton; retarget to table.
- `src/app/workshop/[taskId]/page.tsx` — create; copy `src/app/bike-fits/[id]/page.tsx` L8–36 (`params` Promise, Alert vs `notFound()`). Cancelled is not that null branch.
- `src/lib/workshop/index.ts` — public API. Loaders: `loadWorkshopTasks`, `loadWorkshopTaskDetail`, `WORKSHOP_PAGE_SIZE` in `data/tasks.ts` L19, L84–134, L314–338. Actions in `actions/task-actions.ts` (nine commands). Types: `domain/dtos.ts`, filters in `domain/statuses.ts` L15–22, L52–56.
- `src/app/orders/_components/AllOrdersTable.tsx` L49–70, L72–90, L139–174 — realtime, debounce search, empty state, `Table` + `TablePagination`.
- `src/app/wiki/_components/WikiCategoryFormDialog.tsx` L63–76 — `if (!result.ok) setFormError(result.error)` then `router.refresh()`.
- `src/components/DataLoadError.tsx`, `src/components/TablePagination.tsx` — reuse. Subframe: `Table`, `Tabs` (h-10), `Button size="large"`, `Checkbox`, `TextField`, `Alert`, `Badge`, `Dialog`.
- `src/utils/supabase/client.ts` — realtime only, same as orders. `useUser()` in `src/context/UserContext.tsx` L19–23, L177 — `profile.id` vs M1 `userId`.
- Delete: `src/components/KanbanBoard.tsx`, `KanbanCard.tsx`, `KanbanColumn.tsx`, `kanban-types.ts`. `package.json` L21 — remove dnd. Last consumers: workshop page + those four files.
- Read-only: `src/lib/workshop/actions`, `data`, `domain`; `src/lib/booqable`; existing workshop RPCs and earlier migrations. The mechanic parent-order SELECT file above is the only new SQL.

## Tasks & Acceptance

**Execution:**
- `src/app/workshop/page.tsx` + `_components/WorkshopQueue.*` — Server queue: tabs, search, table, pagination, realtime, `DataLoadError`.
- `src/app/workshop/[taskId]/page.tsx` + `_components/WorkshopTask.*` — Detail, tombstone, order button (`useOpenOrderDetails(task.orderId)`), linear checklist, named actions, inline command errors.
- `src/app/workshop/layout.tsx` — Keep auth; mount `Suspense` + `OrderDetailsDrawerHost`.
- `supabase/migrations/20260821140000_workshop_mechanic_order_select.sql` + `supabase/tests/database/workshop_foundation.test.sql` — Mechanic SELECT on parent order/customer/partner/items when a `bike_tasks` row exists; deny an order with no task. Apply locally only.
- `src/app/workshop/_components/WorkshopLoadingSkeleton.tsx` — Table skeleton, not Kanban columns.
- `src/components/Kanban*.tsx` + `kanban-types.ts` + `package.json` — Delete mock; uninstall `@hello-pangea/dnd`.
- `src/workshop-ui.test.mts` + `package.json` `test:workshop-ui` — node:test: invalid filter → `today`; no dnd dependency; Kanban files gone; `page.tsx` has no `"use client"`.

**Acceptance Criteria:**
- Given `/workshop`, when it loads, then a task table is shown and no Kanban or `@hello-pangea/dnd` import remains.
- Given `/workshop?filter=tomorrow&query=12&page=2`, when it loads, then the Tomorrow tab is active and the table shows that search’s second page (or empty copy if none).
- Given a list row, when it is activated, then the browser is at `/workshop/{taskId}` with checklist and named actions, not a drawer.
- Given a cancelled task id, when the detail page loads, then abandon-work copy is shown and no mutation control is enabled.
- Given a legal named action with current `version`, when the mechanic submits, then the existing action is called and a success refreshes the page to the new status.
- Given `/workshop/{taskId}`, when the mechanic activates the order button, then `OrderDetailsDrawer` opens for that task’s `orderId` (same host/drawer as `/orders`) and the checklist stays on the page.

### Review Findings

- [x] [Review][Patch] Unify bikeLabel, formatStart, and STATUS_LABELS in workshop-ui.ts (Unknown bike + Madrid date and time) [src/app/workshop/_components/WorkshopTask.tsx:85]
- [x] [Review][Patch] Stop wrapping WorkshopTask in Suspense fallback={null} [src/app/workshop/[taskId]/page.tsx:35]
- [x] [Review][Patch] Log command failures with workshop: prefix [src/app/workshop/_components/WorkshopTask.tsx:122]
- [x] [Review][Dismiss] Include bike_source_id in queue search — not important
- [x] [Review][Dismiss] Disable Complete M2 until profile.id is known — unlikely given layout already loaded the profile
- [x] [Review][Dismiss] Disable M2 confirm until the M1 outcome is valid — unreachable: all current items are required before Complete M1
- [x] [Review][Dismiss] Guard runCommand against double-submit before isPending — not important
- [x] [Review][Dismiss] Add an executing test that completed rows are excluded from date filters — do nothing
- [x] [Review][Dismiss] Add an executing test for task-page error vs not-found vs cancelled — tests only; page already branches correctly
- [x] [Review][Defer] README still lists @hello-pangea/dnd after uninstall [README.md:18] — deferred, pre-existing
- [x] [Review][Defer] Drawer host tests grep source instead of rendering OrderDetailsDrawerHost [src/workshop-ui.test.mts:203] — deferred, pre-existing
- [x] [Review][Defer] Repo-wide npm run lint still fails on bike-fits/wiki react-hooks findings [src/app/bike-fits] — deferred, pre-existing
- [x] [Review][Defer] Workshop layout redirect("/login") has no ?next= [src/app/workshop/layout.tsx:23] — deferred, pre-existing

## Spec Change Log

- 2026-08-21: Human added the brainstormed parent-order drawer on the task page (`OrderDetailsDrawer` + scoped mechanic SELECT). Avoids building a second order UI and keeps checklist work on the page.

## Review Triage Log

### 2026-08-24 — Follow-up review pass
- intent_gap: 0
- bad_spec: 0
- patch: 3 applied (shared bike/start helpers with `DD-MM-YYYY HH:mm`; task page no longer blanks on drawer `useSearchParams`; `workshop:` command-failure logs)
- defer: 4 (unchanged)
- dismiss: 6 (search source id, same-person profile miss, M2-before-M1, double-submit, completed-filter test, error/404/cancelled grep test)

### 2026-08-21 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 12: (high 1, medium 5, low 6)
- defer: 3: (high 0, medium 1, low 2)
- reject: 18
- addressed_findings:
  - `[high]` `[patch]` Queue loader error no longer also shows the empty-success copy
  - `[medium]` `[patch]` Date filters exclude `completed`; it remains in `all`
  - `[medium]` `[patch]` Missing add-on fingerprint shows help instead of a silent disabled Complete M2
  - `[medium]` `[patch]` M2 caption no longer calls incomplete M1 “completed”
  - `[medium]` `[patch]` Named-action `loading` only on the submitted transition
  - `[medium]` `[patch]` Executed helper tests for error-vs-empty queue, PSI, and M2 caption
  - `[low]` `[patch]` Empty add-ons show “None”; finite PSI; try/catch → `SOURCE_UNAVAILABLE`; explicit `returned` badge; search label; unknown-bike fallback

## Auto Run Result

Status: done

Summary: Replaced the mock Kanban with a URL-filtered `/workshop` table and `/workshop/[taskId]` guarded lifecycle. A large order button reuses the all-orders `OrderDetailsDrawer` via `?order=`. Mechanics get SELECT-only access to a parent order that already has a bike task.

Files changed:
- `src/app/workshop/page.tsx` — server queue page
- `src/app/workshop/_components/WorkshopQueue.tsx` — tabs, search, table, realtime
- `src/app/workshop/_components/WorkshopTask.tsx` — checklist, named actions, order button
- `src/app/workshop/_components/workshop-ui.ts` — shared helpers + tests
- `src/app/workshop/[taskId]/page.tsx` — detail, error vs not-found vs tombstone
- `src/app/workshop/layout.tsx` — `DefaultPageLayout` + `OrderDetailsDrawerHost`
- `src/lib/workshop/data/tasks.ts` — exclude completed from non-`all` filters
- `supabase/migrations/20260821140000_workshop_mechanic_order_select.sql` — mechanic parent-order SELECT
- `supabase/tests/database/workshop_foundation.test.sql` — SELECT/deny/no-DML
- `src/workshop-ui.test.mts` + `package.json` — Kanban/dnd gone, filter and UI helpers
- Deleted Kanban components; uninstalled `@hello-pangea/dnd`

Review findings breakdown: 12 patches applied, 3 deferred, 18 rejected.

Follow-up review recommendation: `true` (patched high 1, medium 5, low 6; score `3 × 5 + 6 = 21`).

Verification performed:
- `npm run test:workshop-ui` — 11 tests, PASS
- `npm run test:db` — 87 tests, PASS
- `npx tsc --noEmit` — clean
- `npx eslint src/app/workshop` — clean
- `npm run lint` — still fails on pre-existing upgrade-deferred files (deferred)

Residual risks:
- Task page has no realtime (queue only, as specified)
- Local CLI remains `2.105.0` vs CI pin `2.115.0`
- Four unsupplied preparation tags stay blocked
- Full tablet lifecycle was not walked in the browser


## Design Notes

Show only the action for the current status: `to_prepare` → Start preparation (disabled when `hasConfigurationWarning`); `being_prepared` → item outcomes + Complete M1; `needs_recheck` → M2 confirms + add-ons + Complete M2; `ready_for_pickup` → Mark picked up; `in_rental` → Mark returned; `returned` → Start storage; `prepare_for_storage` → storage items + Complete storage; `completed` → read-only. Call `completeM2` only after add-ons are acknowledged and, when `useUser().profile.id` equals the M1 attestation `userId`, the same-person box is checked.

Copy wiki/orders chrome; architecture defers visual polish. Empty add-ons still render a list (empty fingerprint is valid). Do not show sync health.

## Verification

**Commands:**
- `npm run test:workshop-ui` — expected: pass
- `npm run lint` — expected: exit 0
- `npm run test:db` — expected: PASS, including mechanic parent-order SELECT / unrelated-order deny
- `npx tsc --noEmit` — expected: no new workshop errors

**Manual checks (if no CLI):**
- With a locally inserted `to_prepare` fixture (same shape as pgTAP), walk Start prep → M1 → M2 (same-person confirm) → pickup → return → storage → completed on `/workshop/[taskId]`. Open the order button and confirm the existing drawer shows that parent order.
