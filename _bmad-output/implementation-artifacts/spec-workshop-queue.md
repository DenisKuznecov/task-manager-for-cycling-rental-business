---
title: 'Workshop queue redesign'
type: 'feature'
created: '2026-08-24'
status: 'done'
baseline_commit: '324ca0a07ce2372969cd79a5dd8aa422d7be0dd0'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-workshop-ui.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-workshop-foundation.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/workshop` defaults to Today (often empty), hides completed except on All, concatenates bike id/title, omits rental end and customer, and shows a Progress count that silently switches prep vs storage items. Status colours collide. Page size 50 hides pagination.

**Approach:** Default to All. Date tabs + a single-select status tile cut the same population. Completed is opt-in via its tile. Split bike columns; add Until and Customer from existing order/customer rows; drop Progress; distinct colours; paginate at 15.

## Boundaries & Constraints

**Always:**
- Server page. Read `filter`, `status`, `query`, `page` from async `searchParams`. Invalid `filter` → `all`. Missing/invalid `status` → active work (exclude `completed` and `cancelled`). Invalid or out-of-range `page` → `1`.
- Date tabs in order: **All**, Today, Tomorrow, Next 7 Days (`all` / `today` / `tomorrow` / `next_7_days`). Omit `filter` from the URL when `all`. Window is rental **start** in Europe/Madrid (`madrid_start_date`).
- Status tiles above tabs, one each: To prepare, Being prepared, Needs recheck, Ready for pickup, In rental, Returned, Prepare for storage, Completed. No Cancelled tile. Counts use the same date+search as the table (not a shop-wide total) and still show every status while a tile is selected. Click a tile → `?status=`; click it again to clear. Date/status/search changes reset `page` to 1. On `mobile` (max 767px) hide the tiles and use a Subframe `Select`: placeholder and clear row both **Select** (no counts); picking Select clears `status` (active work). Same URL rules.
- Default table: all dates, active work only. `cancelled` never in the queue. `completed` only when `status=completed`. Search (bike id, title, order #, customer name) applies inside the date × status cut.
- Columns: **Bike ID**, **Bike title**, **Customer**, **Order #**, **From**, **Until**, **Status**, **Warnings**. Drop **Progress**. Warnings = `hasConfigurationWarning` (Booqable tag/checklist block, not bike setup): **Warning** badge or `—`. Row click → `/workshop/[taskId]`. Queue From/Until = Madrid `Thu 27 Aug · 19:00`. Task page uses the same clock as From–Until (`Thu 27 Aug · 19:00 – Fri 28 Aug · 10:00`). Missing customer or until → `—`. Body cells `h-14` (56px) via `Table.Row` className for touch; keep the Subframe Table. Header stays default `h-8`.
- `WORKSHOP_PAGE_SIZE` = **15**. Reuse `TablePagination` (already hides when `totalPages <= 1`).
- Distinct colours on **badges**: `to_prepare`=`warning`, `being_prepared`=`dark`, `needs_recheck`=`error`, `ready_for_pickup`=`info`, `in_rental`=`success`, `returned`=`mint`, `prepare_for_storage`=custom (not a Badge variant; e.g. violet/slate), `completed`=`neutral`, `cancelled`=`error` (tombstone only). Tiles use a left colour bar (same mapping), not a full fill. Count `0` is muted. Attention statuses (`to_prepare`, `being_prepared`, `needs_recheck`) get a light tint when count > 0. Selected tile: brand ring + `ring-offset-2` (louder than the bar).
- Extend `workshop_tasks_view` + list DTO/loader with `orders.stops_at` and `customers.name`. Split id/title in the UI only. Local idempotent migration. Mechanics already SELECT those parent rows when a `bike_tasks` row exists — do not broaden DML or open `/orders`. Count tiles in Postgres (no JS `reduce` of matching rows).
- Realtime, named actions, parent-order drawer unchanged from `spec-workshop-ui.md`. Task page keeps `workshopBikeLabel`. Log with `workshop:`.
- Sync chrome is a header toolbar, not a right-side island: title + subtitle, then a left-aligned row of secondary buttons with last-sync + help beside them. Do not `justify-between` the title and sync across the page. Copy: “Pulls Booqable changes onto this list. Next 7 days = this week. All reserved = every reserved order (slow).” Page-of-50 / Resume sentence only when Resume is visible. Buttons are `neutral-secondary` (not brand-primary). Not a modal.
- In-flight list sync (`isPending` / health `in_progress` for this run) must not be aborted by opening a task or other client navigation. Today a row click unmounts the queue and can cancel the server action. Keep the mechanic on `/workshop` until the batch finishes, **or** keep the request alive if they open a task (sync owner above the table, e.g. layout). If still page-scoped, intercept row navigation and show: “Updating from Booqable… stay on this page until it finishes.” Sync buttons already disable while pending.

**Ask First:**
- Until or Customer would need a new table or public RPC. Join existing `orders.stops_at` and `customers.name` instead.

**Never:**
- Default Today. Completed on date tabs without `status=completed`. Cancelled tile. Progress column. Multi-select tiles. Date tabs keyed off completion time. Kanban, assignment, locking, duplicating order-details UI. Hosted/staging/production DDL.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Default queue | `/workshop` or `?filter=nope` | All tab; active work; tiles counted on that set | Loader `error` → `DataLoadError` |
| Empty Today | `?filter=today`, work only later this week | Empty table; Today tiles 0; All still has work | Not an error |
| Status isolate | Click Being prepared | `?status=being_prepared`; table filters; tiles still follow the date tab | — |
| Clear status | Click the active tile again | Drop `status`; active work in that date window | — |
| Completed invoke | Click Completed | `?status=completed`; completed rows in the current start-date window | Empty if none in window |
| Search | `query` set | Tiles and table recount/filter together, including customer name | Empty copy if none |
| Pagination | 16+ rows in the current cut | Page size 15; control shown | `page` out of range → `1` |
| Until / customer missing | `stops_at` or name null | `—` in that cell | Not an error |
| Sync help | Two Sync buttons visible | Help beside buttons: Booqable → tasks; all-reserved is slow | — |
| Sync in flight + row click | Sync pending; mechanic taps a row | Must not abort the request; stay with banner, or continue after navigation | Surface `{ ok: false }` inline; never silent |

</frozen-after-approval>

## Code Map

- `src/app/workshop/page.tsx:10-64` -- add `status`; pass counts into `WorkshopQueue`.
- `src/app/workshop/_components/WorkshopQueue.tsx` -- tabs L41-46 Today-first; `buildHref` L116 omits `filter` when `today`; columns L293-341 Bike/Start/Progress/Config; row `push` L307; sync L199-243; `runSync` `useTransition` L65, L152-175 (unmount aborts).
- `src/app/workshop/_components/workshop-ui.ts` -- keep `workshopBikeLabel` L18-27 for `WorkshopTask.tsx:219`; reuse `formatWorkshopStart` L30-52 for Until; `statusBadgeVariant` L107-126 collides. Variants: `src/ui/components/Badge.tsx:12-19`.
- `src/app/workshop/layout.tsx:40-48` -- drawer host; hoist sync here if list→task must not abort.
- `src/lib/workshop/domain/statuses.ts:52-57` -- default `today`. Add `resolveWorkshopQueueStatus`; export `domain/index.ts:7-11`.
- `src/lib/workshop/domain/dtos.ts:10-25,83-87` -- no `stopsAt`/`customerName`/`status`. `mapListRow` also serves detail — new fields nullable.
- `src/lib/workshop/data/tasks.ts` -- size 50 L19; hide completed unless `all` L101-103; search omits customer L117. Tile counts: wiki `head: true` (`src/lib/wiki/data/wiki.ts:230`).
- `supabase/migrations/20260821120000_workshop_foundation.sql:1173-1199` -- view; no until/customer. Do not edit in place. Next file after `20260824130000_workshop_prep_checklists.sql`. Mechanic SELECT: `20260821140000_workshop_mechanic_order_select.sql`; pgTAP `workshop_foundation.test.sql:1327-1349`.
- `src/app/orders/_components/AllOrdersTable.tsx:165` -- customer name as text. Do not use `formatRentalPeriod` (`src/utils/formatters.ts:19`).
- `src/components/TablePagination.tsx:23` -- hides when one page.
- `src/workshop-ui.test.mts:82-87,202-216` -- invalid filter → `today`. Scripts: `test:workshop-ui`, `test:db`.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20260824160000_workshop_queue_view.sql` -- `CREATE OR REPLACE VIEW` adding `stops_at` + `customer_name`; keep progress columns; re-grant SELECT if needed.
- [x] `supabase/tests/database/workshop_queue.test.sql` -- mechanic reads those view fields on a task order; unrelated customer not selectable.
- [x] `src/lib/workshop/domain/statuses.ts` + `dtos.ts` + `domain/index.ts` -- default `all`; `resolveWorkshopQueueStatus`; DTO `stopsAt`/`customerName`; query `status`.
- [x] `src/lib/workshop/data/tasks.ts` -- page size 15; completed only when `status=completed`; customer search; SQL tile counts; clamp out-of-range page to 1.
- [x] `src/app/workshop/page.tsx` -- parse `status`; load tasks + counts.
- [x] `src/app/workshop/_components/workshop-ui.ts` -- one colour per status (custom class for `prepare_for_storage`); keep `workshopBikeLabel`.
- [x] `src/app/workshop/_components/WorkshopQueue.tsx` -- All-first tabs; tiles; columns; URL state; sync help; in-flight sync must not abort on row click (intercept + banner, or hoist in layout).
- [x] `src/workshop-ui.test.mts` -- default `all`; completed opt-in; All-first tabs; page size 15; distinct variants; omit `filter=all`.

**Acceptance Criteria:**
- Given `/workshop`, when it loads, then All is selected, the table shows active tasks across dates, and completed rows are absent.
- Given the Completed tile, when activated, then the table shows completed tasks in the current date window.
- Given a date tab, when selected, then tiles recount to that window and a status tile filters the table inside it.
- Given a list row, when shown, then Bike ID, Bike title, Customer, From, and Until are separate cells and Progress is gone.
- Given more than 15 matching tasks, when the page loads, then pagination is visible.
- Given Sync all reserved in flight, when the mechanic activates a table row, then the sync request is not aborted.

### Review Findings

- [x] [Review][Dismiss] Resume sync is `brand-secondary`, not `neutral-secondary` — user has not seen Resume; keep louder colour
- [x] [Review][Dismiss] Search sits under the tabs, not on the tabs row — under the tabs is fine
- [x] [Review][Dismiss] Queue body cells are `!h-16` (64px), not spec `h-14` (56px) — taller rows are better
- [x] [Review][Dismiss] Search debounce can `router.push` after Sync starts — only if search then Sync within ~300ms; unlikely

## Spec Change Log

- 2026-08-26: Task page start line is From–Until using `formatWorkshopQueueWhen` (same Madrid clock as the list). `workshop_task_detail` includes `orders.stops_at` in the foundation function (folded in; unpublished). Missing until is `—`.
- 2026-08-24: Mobile (max 767px) replaces status tiles with a clearable Select (placeholder/clear = Select; labels only). Tiles stay at 768+. Table may scroll horizontally.
- 2026-08-24: Queue rows `[&>td]:h-14` (56px) for workshop touch screens; header stays `h-8`. Sync toolbar left-aligned under the title, not a right-side island.
- 2026-08-24: Queue chrome pass with Denys (Sally). Title + secondary sync on one row; help beside buttons; tiles as accent bar + mute zeros + louder selected; queue dates `Thu 27 Aug · 19:00`; search on the tabs row.
- 2026-08-24: List column **Config** → **Warnings** (same `hasConfigurationWarning` flag; badge **Warning** / `—`).
- 2026-08-24: Sync chrome — help copy (Booqable updates → task list; all-reserved is slow); in-flight list sync must not be aborted by opening a task.
- 2026-08-24: UX freeze with Denys (Sally). All default; tiles as single-select status filter scoped to the date tab; completed opt-in via Completed tile; cancelled stays hidden; split bike columns; Until + Customer from existing order/customer; drop Progress; distinct colours; page size 15.

## Design Notes

`runSync` is queue-scoped `useTransition`; navigating to `/workshop/[taskId]` unmounts it. Intercept row clicks while pending **or** hoist into `layout.tsx`. Tile counts include Completed in the date+search window even when the table is active-only — count in SQL. Queue splits id/title; `workshopBikeLabel` stays on the task page. Queue From/Until uses `formatWorkshopQueueWhen`; the task page joins those clocks as From–Until.

## Verification

**Commands:**
- `npm run test:workshop-ui` -- pass; default `all`; completed opt-in; page size 15; All-first tabs.
- `npm run test:db` -- new view-column / mechanic RLS tests pass.
- `npx eslint src/app/workshop src/lib/workshop src/workshop-ui.test.mts` -- clean on touched files.

## Suggested Review Order

**Entry point**

- Server page now reads `status` and loads date-scoped tile counts
  [`page.tsx:25`](../../src/app/workshop/page.tsx#L25)

**Queue URL and filters**

- Invalid filter becomes All; cancelled is never a tile
  [`statuses.ts:74`](../../src/lib/workshop/domain/statuses.ts#L74)

- Omit `filter=all`; keep `filter=today` so Today stays selectable
  [`workshop-ui.ts:61`](../../src/app/workshop/_components/workshop-ui.ts#L61)

- All-first tabs; tiles toggle a single `status` and reset page
  [`WorkshopQueue.tsx:48`](../../src/app/workshop/_components/WorkshopQueue.tsx#L48)

**List cut and counts**

- Completed only when `status=completed`; page size 15; clamp page
  [`tasks.ts:142`](../../src/lib/workshop/data/tasks.ts#L142)

- Tile counts in Postgres for the date+search window, including completed
  [`tasks.ts:200`](../../src/lib/workshop/data/tasks.ts#L200)

- Search includes customer name and strips a leading `#` on order #
  [`tasks.ts:90`](../../src/lib/workshop/data/tasks.ts#L90)

**Until and customer**

- View joins existing `orders.stops_at` and `customers.name`
  [`20260824160000_workshop_queue_view.sql:18`](../../supabase/migrations/20260824160000_workshop_queue_view.sql#L18)

- List DTO carries nullable `stopsAt` / `customerName`
  [`dtos.ts:18`](../../src/lib/workshop/domain/dtos.ts#L18)

**Queue surface**

- Split columns; drop Progress; Warnings badge or `—`
  [`WorkshopQueue.tsx:356`](../../src/app/workshop/_components/WorkshopQueue.tsx#L356)

- Distinct badge/tile colours; violet custom for prepare-for-storage
  [`workshop-ui.ts:135`](../../src/app/workshop/_components/workshop-ui.ts#L135)

- Booqable sync help; stay-on-page banner while a run is in flight
  [`WorkshopQueue.tsx:223`](../../src/app/workshop/_components/WorkshopQueue.tsx#L223)

- Block row, tab, tile, search, and pagination while sync is in flight
  [`WorkshopQueue.tsx:133`](../../src/app/workshop/_components/WorkshopQueue.tsx#L133)

**Peripherals**

- Mechanic can read the new view fields; unrelated customer stays hidden
  [`workshop_queue.test.sql:134`](../../supabase/tests/database/workshop_queue.test.sql#L134)

- Default All, completed opt-in, href rules, and sync intercept
  [`workshop-ui.test.mts:87`](../../src/workshop-ui.test.mts#L87)
