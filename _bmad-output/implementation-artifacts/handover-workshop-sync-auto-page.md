# Handover — Auto-page Sync next 7 days (drop Resume)

**Date:** 2026-08-28  
**For:** next session starting `/bmad-build` with this file as the starting intent  
**Do not apply migrations remotely.** Staging/production migrate only via merge CI.

## One-line ask

One **Sync next 7 days** click keeps paging Booqable until the 7-day reserved scan is finished. **Resume sync** goes away. The existing page-wide overlay stays up for the whole walk.

## Prior decisions (do not re-litigate)

- **Sync all reserved** is removed from `/workshop` (button + warning dialog). Do not bring it back.
- Daily prep is 1–3 days before start; **next 7 days + webhooks** is enough. Far-future orders are not a list-sync job.
- Overlay: viewport-centered (`fixed inset-0`), indeterminate bar, `{listed} orders processed` only when `health.state === "in_progress"` and `listed > 0`.
- Per-task **Sync order details from Booqable** stays on `/workshop/[taskId]`.

## Why Resume exists today (the trap)

`startManualSync("next_7_days")` does **not** fetch “this week” as one Booqable query.

1. `fetchReservedOrderListPage(page)` lists **all reserved** orders, `page[size]=50` (`src/lib/booqable/fetch-source-snapshot.ts`).
2. `skipReason` / `isEligibleManualSyncOrder` then keeps only Madrid `[today, today+7)` (`src/lib/workshop/domain/commands.ts`).
3. `processReservedPage` stops after that one page (`src/lib/workshop/application/manual-sync.ts` ~L143–229). If `hasMore` or the page failed, it writes a cursor and the UI shows **Resume sync**.

So a shop with 200 reserved orders and 30 that start this week still needs several Resume clicks. The first click may never see a this-week order that sits on page 2+.

CAP-10 (`spec-cap-10-workshop-sync.md`) said “Never walk every page in one request” because **all reserved** could run for minutes. That constraint is **explicitly lifted for next-7-days only** by this handover.

## Desired behavior

**Given** idle `/workshop`, **when** staff click **Sync next 7 days**, **then**:

- Overlay shows immediately and stays until this click’s walk ends (success, or a failure the staff must see).
- The server walks reserved list pages in order, reconciling in-window orders and skipping the rest, until Booqable has no further reserved page **or** a page/listing failure stops the run.
- No **Resume sync** button, no “more reserved orders remain” / use-Resume help line.
- A second click while the walk is in flight is rejected (`SYNC_IN_PROGRESS` / existing lease), same as today.

**Failure:** overlay clears; existing error / failed Alert. Do not leave a staff-facing Resume path. A later **Sync next 7 days** starts a new walk from page 1 (acceptable; do not invent a hidden resume).

**Paused leftover cursors** from older all-reserved or one-page-7-day runs: ignore in the UI. Starting the new 7-day walk is enough.

## Suggested implementation map (investigate; do not cargo-cult)

- `src/lib/workshop/application/manual-sync.ts` — loop `processReservedPage` (or equivalent) for `next_7_days` start until `!hasMore` or failure. Keep run lease renew for the whole walk.
- `src/lib/workshop/actions/sync-actions.ts` — still `withAuth` + `{ ok, error }`; no signature inventiveness unless required.
- `src/app/workshop/_components/WorkshopQueue.tsx` — drop Resume button, `resumable` help, paused-cursor Alert copy that tells staff to Resume.
- Tests: `src/workshop-ui.test.mts`, `src/workshop-sync.test.mts` (and SQL only if finish/cursor semantics change).

## Risks the next spec must resolve (do not guess in chat)

- **Request duration.** One walk can be many 50-row pages × per-order reconcile. Check Vercel/server-action time limits; if a single HTTP request cannot finish, HALT and ask (streaming, `maxDuration`, or a server-driven continue that the UI does not expose as Resume).
- **Do not** walk `all_reserved` in one request. Backend may still understand that scope for old rows; the list UI must not start it.
- **Do not** change `LIST_PAGE_SIZE`, webhook, or sandbox reseed unless required for the loop.
- Overlay listed count accumulates on the run; keep “no shop-wide percent.”

## How to start the next session

```
/bmad-build
```

Point at `_bmad-output/implementation-artifacts/handover-workshop-sync-auto-page.md` (this file) as the intent. Working tree may also contain the uncommitted removal of **Sync all reserved** — include that in the same story if it is not already committed.

## Out of scope

- Bringing back **Sync all reserved**.
- Determinate progress of all reserved in the shop.
- Auto-walking every reserved order regardless of start date.
- Booqable webhook or per-task sync changes.
