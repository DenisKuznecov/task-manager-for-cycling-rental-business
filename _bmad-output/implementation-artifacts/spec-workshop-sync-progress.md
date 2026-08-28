---
title: 'Workshop list sync loader and all-reserved warning'
type: 'feature'
created: '2026-08-28'
status: 'done'
baseline_commit: '6907be945a61fe22b3f73d7ee33e406ae971a171'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/workshop` Sync only shows button spinners plus an inline Alert, so the list still looks idle, and **Sync all reserved** starts a long Booqable page with no warning.

**Approach:** Block the list with a page-wide overlay (loader + activity bar) while a manual sync is in flight. **Sync all reserved** confirms first that the run can take several minutes; **Sync next 7 days** and **Resume sync** start immediately.

## Boundaries & Constraints

**Always:**
- Overlay whenever `shouldBlockQueueNavigation(isPending, health)` is true. Same gate already blocks queue URL changes and row clicks.
- Overlay the Workshop queue root (heading, controls, filters, table): dim + `pointer-events-none`, centered card with `Loader`, title **Updating from Booqable**, body **Stay on this page until it finishes.** If `health.counts.listed > 0`, also **{listed} orders processed**.
- Progress line is an **indeterminate** brand bar (copy `NavigationProgressBar`), not a percent. `WorkshopSyncHealth` has no shop-wide total.
- **Sync all reserved** opens `DialogLayout` first. Title **Sync all reserved orders?**, body **This can take several minutes. Stay on this page until it finishes.** **Cancel** / overlay / Escape: close, no sync. **Start sync**: close, then existing `startManualSync("all_reserved")`.
- Next-7-days and Resume skip the dialog. Resume uses the same overlay while in flight.
- Remove the inline in-flight Alert titled "Updating from Booqable". Keep paused / failed / action-error Alerts when `!syncInFlight`.
- Reuse `DialogLayout`, `Button`, `Loader`. Workshop public actions/data/domain only. `{ ok: false, code, error }` stays on the existing error Alert.

**Ask First:**
- A Booqable reserved-order total (or new RPC/column) for a determinate percent.
- More than one list page per click, or changing `LIST_PAGE_SIZE`.
- A warning modal on Resume or per-task order sync.

**Never:**
- Fake a shop-wide percent. Edit leases, `manual-sync.ts` paging, RPCs, or migrations. Overlay `/workshop/[taskId]`. Add `verify:workshop` CI.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Next 7 days | Idle, click **Sync next 7 days** | Overlay now; no dialog; existing start | Fail → overlay off; existing error Alert |
| All reserved warn | Idle, click **Sync all reserved** | Dialog only; no overlay; no action | N/A |
| Cancel warn | Dialog open, Cancel / overlay / Escape | Dialog closes; no sync | N/A |
| Confirm warn | Dialog open, **Start sync** | Dialog closes; overlay + `startManualSync("all_reserved")` | Fail → overlay off; existing error Alert |
| Resume | Cursor set, click **Resume sync** | Overlay; no dialog | Same as start fail |
| Paused run | `in_progress` + cursor, not pending | No overlay; existing paused Alert + Resume | N/A |
| Re-entry mid-run | `in_progress` and no cursor | Overlay from the health gate | N/A |

</frozen-after-approval>

## Code Map

- `src/app/workshop/_components/WorkshopQueue.tsx` L119–227 `syncInFlight` / `runSync`; L249–261 all-reserved `onClick` must open dialog, not `runSync`; L311–318 in-flight Alert **replace** (keep that copy on the overlay). L121–151 realtime already refreshes runs/health — `listed` can update under the overlay. Do not import application/.
- `src/app/workshop/_components/workshop-ui.ts` L171–176 `shouldBlockQueueNavigation` — read-only unless a tiny helper sits beside it.
- `src/app/workshop/page.tsx` L51–82 heading is inside `WorkshopQueue` — overlay the queue root.
- `src/ui/layouts/DialogLayout.tsx` + `src/app/wiki/_components/WikiDeleteDialog.tsx` L26–65 — confirm pattern. New workshop sibling OK; no second dialog primitive.
- `src/ui/layouts/NavigationPendingOverlay.tsx` L11–23 bar, L31–58 dim + `Loader` + `aria-busy`. Copy into workshop; do not wire the app topbar. Skip `@/ui/components/Progress`.
- `src/lib/workshop/data/sync-health.ts` L10–26 counts only, no total. `src/lib/workshop/application/manual-sync.ts` L143–229 and `src/lib/workshop/actions/sync-actions.ts` L17–37 — **reuse / read-only**.
- `src/workshop-ui.test.mts` L225–245 keep; L637–641 and L674–676 **must change** (today forbids `Progress` and requires the inline Alert).

## Tasks & Acceptance

**Execution:**
- [x] `src/app/workshop/_components/WorkshopSyncAllConfirmDialog.tsx` -- DialogLayout confirm, workshop copy only -- keep dialog markup out of Queue
- [x] `src/app/workshop/_components/WorkshopQueue.tsx` -- dialog state; overlay while `syncInFlight`; drop in-flight Alert -- staff-visible change
- [x] `src/workshop-ui.test.mts` -- lock dialog/overlay copy, all-reserved not calling `runSync` directly, in-flight Alert gone -- I/O matrix without a browser runner

**Acceptance Criteria:**
- Given idle queue, when staff click **Sync next 7 days**, then the overlay appears immediately and the list is not clickable until the action ends.
- Given idle queue, when staff click **Sync all reserved**, then the warning dialog appears and no sync starts until **Start sync**.
- Given the warning dialog is open, when staff Cancel or dismiss it, then no `startManualSync` runs.
- Given sync in flight and `health.counts.listed > 0`, when the overlay is shown, then it shows that count and an indeterminate bar (not a percent).
- Given a paused run (`cursor` set, not pending), when the page renders, then the overlay is hidden and Resume has no warning dialog.

## Spec Change Log

## Design Notes

`booqable_record_sync_result` increments `listed` per order and the queue already refreshes on `booqable_sync_runs`. That supports a live count, not fill-to-100%: resume accumulates `listed` and the shop total is unknown. Do not map `listed / 50` to `Progress value`.

## Verification

**Commands:**
- `npm run test:workshop-ui` -- expected: pass after assertion updates

**Manual checks (if no CLI):**
- `/workshop`: next-7-days overlay; all-reserved Cancel then Confirm; Resume overlay; no navigation until overlay clears; failed sync shows the error Alert, not a stuck overlay.

## Suggested Review Order

**Page overlay**

- Same in-flight gate as row/URL blocking now dims the whole list.
  [`WorkshopQueue.tsx:156`](../../src/app/workshop/_components/WorkshopQueue.tsx#L156)

- Centered card, live listed count, indeterminate brand bar — no shop-wide percent.
  [`WorkshopQueue.tsx:78`](../../src/app/workshop/_components/WorkshopQueue.tsx#L78)

- Hide stale listed from a prior succeeded or paused run.
  [`workshop-ui.ts:179`](../../src/app/workshop/_components/workshop-ui.ts#L179)

- `inert` plus `pointer-events-none` so keyboard cannot fire queue actions mid-sync.
  [`WorkshopQueue.tsx:274`](../../src/app/workshop/_components/WorkshopQueue.tsx#L274)

- Overlay mounts only while `syncInFlight`.
  [`WorkshopQueue.tsx:549`](../../src/app/workshop/_components/WorkshopQueue.tsx#L549)

**All-reserved warning**

- Button opens the dialog; it does not start the long sync.
  [`WorkshopQueue.tsx:307`](../../src/app/workshop/_components/WorkshopQueue.tsx#L307)

- Cancel dismisses; Start sync latches so a double-click cannot fire twice.
  [`WorkshopSyncAllConfirmDialog.tsx:13`](../../src/app/workshop/_components/WorkshopSyncAllConfirmDialog.tsx#L13)

- Confirm runs the existing `all_reserved` action after the dialog closes.
  [`WorkshopQueue.tsx:552`](../../src/app/workshop/_components/WorkshopQueue.tsx#L552)

**Tests**

- Helper cases lock overlay listed vs leftover health.
  [`workshop-ui.test.mts:248`](../../src/workshop-ui.test.mts#L248)

- Source matrix locks copy, wiring, and the in-flight Alert removal.
  [`workshop-ui.test.mts:669`](../../src/workshop-ui.test.mts#L669)
