---
title: 'Workshop tasks vs staging — Workshop UI group review'
type: 'review'
created: '2026-08-26'
status: 'done'
review_mode: 'full'
base: 'staging'
head: 'feature/task-manager-for-mechanics-mvp'
---

## Intent

Code review of Group 4 (`src/app/workshop` pages/components and `src/workshop-ui.test.mts`) against `staging`, using the UI, queue, and CAP-10 specs. Same conservative bar as Groups 1–3. App/ingest/SQL layers are out of scope.

## Tasks & Acceptance

- [x] Review Group 4 (Workshop UI) vs `staging`
- [x] Apply agreed UI patches (if any) — warning copy only

### Review Findings

- [x] [Review][Dismiss] Resume sync is `brand-secondary`, not `neutral-secondary` — user has not seen Resume; keep louder colour
- [x] [Review][Dismiss] Search sits under the tabs, not on the tabs row — under the tabs is fine
- [x] [Review][Dismiss] Queue body cells are `!h-16` (64px), not spec `h-14` (56px) — taller rows are better
- [x] [Review][Dismiss] Search debounce can `router.push` after Sync starts — only if search then Sync within ~300ms; unlikely
- [x] [Review][Dismiss] Successful item save clears add-on ack, same-person confirm, and PSI drafts — only if those boxes are checked, then another item is ticked; normal tick-first flow never hits it
- [x] [Review][Patch] Configuration warning always says Start preparation is blocked [src/app/workshop/_components/WorkshopTask.tsx:285]

## Dismissed this pass (shop / spec / already listed)

- **Customer name on the task page** — handover: only if that page grows a customer line. It does not. Queue already shows the name. Adding it needs `customer_name` on `workshop_task_detail` first (new local migration).
- **Sidebar / Back / breadcrumb still leave the page during Sync** — spec allowed page-scoped intercept **or** hoist to layout. Rows, tabs, tiles, and pagination already no-op. Hoisting is a bigger change; staff see the stay-on-page banner.
- **Tiles/tabs look enabled during Sync** — clicks already no-op via `pushQueue`. Mobile status Select is disabled.
- **`shouldBlockQueueNavigation` ignores `pendingScope`** — `isPending` is true for the whole `startTransition`, which is what the helper already uses.
- **Same-person M2 if `profile` is null** — layout already loaded the profile. If the client profile miss fires, SQL still rejects same-person M2 without the flag (`FORBIDDEN`). Prior UI review dismissed this.
- **Queue rows are click-only (no `href` / keyboard)** — spec is row click → task. Shop is tablets.
- **Breadcrumb drops queue filters** — goes to `/workshop` (All). Normal list-root crumb.
- **`health.counts` not shown** — spec does not require listed/succeeded/failed on the chrome.
- **Raw codes as alert titles / Complete not pre-disabled for missing name** — server still returns the error. Shop-trusted staff.
- **Tombstone title “Abandon this work”** — exact spec copy.
- **Task page has no realtime** — spec realtime is the queue table only.
- **Checklist cannot be undone / PSI comma / PSI cap / empty checklist `[].every`** — not specified; empty lists are a data bug, not this UI.
- **Grep-only tests / helper-only error and sync guards** — same class Groups 2–3 declined.
- **Counts-loader failure hides the queue** — correct fail-loud. Health-loader failure still shows the table plus a banner.
- **Import graph** — UI uses `@/src/lib/workshop` public actions/data/domain only. No `application`, no `@/src/lib/booqable`.
- **Group 1 leftovers / Group 2–3 dismissed items** — stay listed there. Do not re-open.
- **Resume colour / search under tabs / 64px rows** — user: keep as built.
- **Search-then-Sync debounce** — user: very unlikely.
- **Add-on / same-person boxes clearing** — user: tick-first flow never hits it. Only if you check those boxes, then tick another checklist item.

## Notes

Layers: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor. Auditor: four chrome/constraint misses (three are the decisions above; one is the search-vs-sync patch).
