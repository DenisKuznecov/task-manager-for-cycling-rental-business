---
title: 'Workshop sync auto-page next 7 days'
type: 'feature'
created: '2026-08-28'
status: 'done'
baseline_commit: 'ddc14ac343b793173da1a55ecd8509514c824a79'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/handover-workshop-sync-auto-page.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** **Sync next 7 days** processes one Booqable reserved list page (50 shop-wide reserved rows) per click. In-window orders on later pages stay unseen unless staff click **Resume sync**.

**Approach:** One **Sync next 7 days** click walks reserved list pages until Booqable has no further page or a listing/order failure stops the run. The existing overlay stays up for that walk. **Resume sync** and resume-help copy go away. A later click starts a new walk from page 1.

## Boundaries & Constraints

**Always:**
- Auto-page only on `runManualSyncStart` with scope `next_7_days`. Keep `all_reserved` one page per request if the action is called; `/workshop` must not start it.
- Hold the run lease and `startLeaseRenewLoop` for the whole walk. Do not finish or release between successful pages.
- Same per-order path: `skipReason` / `isEligibleManualSyncOrder` (Madrid `[today, today+7)`), `reconcileBooqableOrder(id, "manual")`, `booqable_record_sync_result`.
- Call `booqable_finish_sync_run` once at the end of this click. On success, `cursor` is null. On failure, overlay clears; keep the failed/error Alert. Do not persist a hasMore success cursor for next-7-days.
- Overlay unchanged: `shouldBlockQueueNavigation`, `WorkshopQueueSyncOverlay` (`fixed inset-0`), indeterminate bar, `{listed} orders processed` only via `workshopSyncOverlayListed` (`in_progress` and `listed > 0`).
- Second click while the lease is held → existing `SYNC_IN_PROGRESS`. Leftover paused cursors: ignore in the UI. `workshop_start_manual_sync` already inserts a new run when the lease is free.
- `withAuth` + existing `WorkshopSyncResult`. UI imports `@/src/lib/workshop` public actions/data/domain only.
- If one server-action request cannot finish the walk, HALT. Do not invent `maxDuration`, streaming, or a hidden continue.

**Ask First:**
- Pinning `maxDuration`, streaming, or a server-driven continue the UI does not show as Resume.
- Walking `all_reserved` in one request.
- Changing `LIST_PAGE_SIZE`, webhook, sandbox reseed, or migrations/RPCs.

**Never:**
- Re-add **Sync all reserved** or its dialog. Determinate shop-wide percent. Auto-reconcile every reserved order (eligibility stays next-7-days). Edit webhook or per-task **Sync order from Booqable**. Vitest / `verify:workshop` CI. Remote DDL.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Multi-page week | Idle `/workshop`; in-window order on reserved page 2+; click **Sync next 7 days** | Overlay immediately; walk pages until `!hasMore`; overlay clears; no Resume | N/A |
| Overlap | Walk in flight; second **Sync next 7 days** | No second walk | `SYNC_IN_PROGRESS` / existing lease |
| Mid-walk failure | List fetch or eligible reconcile fails | Overlay off; existing failed/error Alert; no Resume; next click starts page 1 | Surface `{ ok: false, code, error }` |
| Leftover cursor | Old paused/failed cursor; idle | No Resume; no “more reserved orders remain” / “Use Resume” copy; list usable; **Sync next 7 days** starts a new run | N/A |
| Backend all-reserved | `startManualSync("all_reserved")` (not from UI) | Still one list page, then finish/cursor as today | Unchanged |

</frozen-after-approval>

## Code Map

- `src/lib/workshop/application/manual-sync.ts` L143–229 `processReservedPage` — one page, then `booqable_finish_sync_run` + `booqable_release_run_lease`. **Do not loop this function as-is** (lease drops between pages). L153–159 renew is per page; lift it across the walk. L232–261 `continueManualSync` / L263–284 `runManualSyncStart` — start always page 1. L286–317 `runManualSyncResume` — keep for unused leftover/backend; Queue must not call it.
- `src/lib/workshop/actions/sync-actions.ts` L17–37 — keep `startManualSync` / `resumeManualSync` signatures; loop in application, not a new action.
- `src/lib/workshop/application/reconcile-order.ts` L13–14 `ORDER_LEASE_TTL_MS` 2 min; L51–67 `startLeaseRenewLoop` (~1 min). L16–22 `SYNC_IN_PROGRESS`.
- `src/lib/workshop/domain/commands.ts` L59–70 / L115–125 — eligibility + skip; read-only.
- `src/lib/booqable/fetch-source-snapshot.ts` L4 `LIST_PAGE_SIZE = 50`; L262–266 `fetchReservedOrderListPage`; L238–243 `hasMore`. Read-only.
- `src/app/api/sandbox/booqable/sync-orders/route.ts` L51–68 — `while (hasMorePages)` shape only; **do not** change sandbox or drop the run lease.
- `supabase/migrations/20260822120000_workshop_sync.sql` L445–508 finish (cursor null → succeeded; listing/failed → failed); L606–659 start (new run if lease free — leftover cursor does not block); L662–741 resume. Prefer no SQL change.
- `src/app/workshop/_components/WorkshopQueue.tsx` L77–107 overlay (keep); L146–147 `"resume"` pending; L218–233 `resumable` / “Sync paused — more reserved orders remain”; L280–320 **Resume sync** + “Each click fetches 50… Use Resume…” — **remove**. L325–340 failed/error Alerts stay. L154 `shouldBlockQueueNavigation`.
- `src/app/workshop/_components/workshop-ui.ts` L171–185 — overlay gate + listed helper; read-only unless a leftover-cursor copy helper is unavoidable.
- `src/lib/workshop/data/sync-health.ts` L10–18 — `cursor` / `counts.listed`; read-only.
- `src/app/workshop/_components/WorkshopTask.tsx` — per-task Sync; read-only.
- `src/workshop-ui.test.mts` L226–245 leftover `in_progress`+cursor still does **not** block nav; L248–269 listed helper; L669–716 **must drop** Resume / `resumeManualSync` locks.
- `src/workshop-sync.test.mts` L291–298 Queue still requires `resumeManualSync`; L332–338 page size 50 stays. Lock next-7-days start walking until `!hasMore` or failure.
- No `maxDuration` / `vercel.json` in repo. Spike list page 304ms (`booqable-spike-evidence.md`). Do not invent a timeout.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/workshop/application/manual-sync.ts` -- Walk reserved pages on next-7-days start until `!hasMore` or failure; one lease/renew/finish for the click -- staff-visible change is “one click finishes the week”
- [x] `src/app/workshop/_components/WorkshopQueue.tsx` -- Remove Resume, resume pending, and resume-help / “more reserved orders remain” copy; keep overlay and failed Alerts -- no staff-facing resume path
- [x] `src/workshop-ui.test.mts` -- Lock no Resume / no resume-help; keep overlay, listed count, leftover cursor not blocking nav -- I/O matrix without a browser runner
- [x] `src/workshop-sync.test.mts` -- Lock next-7-days start multi-page walk; Queue no longer calls resume; keep `LIST_PAGE_SIZE = 50` -- prevent one-page-then-cursor regress

**Acceptance Criteria:**
- Given idle `/workshop` and an in-window reserved order on list page 2 or later, when staff click **Sync next 7 days**, then that order is reconciled before the overlay clears and **Resume sync** is not shown.
- Given a leftover paused cursor and an idle list, when the page renders, then there is no Resume control and no copy telling staff to Resume or that more reserved orders remain.
- Given a mid-walk listing or reconcile failure, when the action returns, then the overlay is gone, the existing failed/error Alert is shown, and the next **Sync next 7 days** starts from page 1.

## Spec Change Log

## Verification

**Commands:**
- `npm run test:workshop-sync` -- pass; next-7-days start walks pages; Queue does not call `resumeManualSync`
- `npm run test:workshop-ui` -- pass; no Resume / resume-help; overlay and listed-count locks remain

## Suggested Review Order

**Walk**

- Next-7-days start holds the lease and walks pages; other scopes stay one page.
  [`manual-sync.ts:405`](../../src/lib/workshop/application/manual-sync.ts#L405)

- One renew loop for the click; stop on listing or eligible-reconcile failure.
  [`manual-sync.ts:283`](../../src/lib/workshop/application/manual-sync.ts#L283)

- Shared per-order skip/reconcile/record used by the walk and one-page resume.
  [`manual-sync.ts:149`](../../src/lib/workshop/application/manual-sync.ts#L149)

- Finish and release once; success cursor is null so Resume is not needed.
  [`manual-sync.ts:199`](../../src/lib/workshop/application/manual-sync.ts#L199)

**Queue**

- Only **Sync next 7 days**; leftover cursors have no staff Resume path.
  [`WorkshopQueue.tsx:300`](../../src/app/workshop/_components/WorkshopQueue.tsx#L300)

- Refresh after success or failure so the overlay and Alerts match the run.
  [`WorkshopQueue.tsx:243`](../../src/app/workshop/_components/WorkshopQueue.tsx#L243)

**Tests**

- Lock the walk call and forbid a silent one-page start.
  [`workshop-sync.test.mts:302`](../../src/workshop-sync.test.mts#L302)

- Lock no Resume / resume-help; keep overlay and listed-count source locks.
  [`workshop-ui.test.mts:677`](../../src/workshop-ui.test.mts#L677)
