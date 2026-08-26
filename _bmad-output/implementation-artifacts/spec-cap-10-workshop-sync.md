---
title: 'CAP-10 workshop sync'
type: 'feature'
created: '2026-08-22'
status: 'done'
baseline_commit: '5941b1456db003a1a40ac04e864f74f6321643ce'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-echelon-cycling-hub-admin-2026-08-20/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/specs/spec-automating-mechanics-daily-work/booqable-reconciliation.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-booqable-source-apply.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Workshop queues stay empty in real use. The live `order.updated` webhook and the sandbox backfill still write through old `sync.ts`, so identified bikes never mint tasks and staff cannot recover missed assignments or see whether sync worked.

**Approach:** One reconciler (`reconcileBooqableOrder`) that leases the order, fetches a complete snapshot, applies it, then releases. The existing webhook awaits that for one order id. Staff get authenticated start/resume Sync on `/workshop` (they pick **next 7 days** or **all reserved**; one page per click) plus **Sync this order from Booqable** on `/workshop/[taskId]` (same one-order reconcile, including tombstones). Keep `/api/sandbox/booqable/sync-orders` as an authenticated local reseed (all orders’ commercial rows; tasks only for `reserved`). Production cutover is merging this branch; do not create or edit Booqable webhook subscriptions.

## Boundaries & Constraints

**Always:**
- Fetch include is `customer,coupon,lines,lines.planning,lines.planning.stock_item_plannings,lines.planning.stock_item_plannings.stock_item,lines.item`. Parse with `parseSourceOrderSnapshot`; apply with existing `booqable_apply_source_snapshot_v1`. Paginate list/order documents to exhaustion; any missing page or `INVALID_SNAPSHOT` writes nothing.
- `reconcileBooqableOrder` acquires the order lease (`expires_at` = now + 2 minutes), renews while the request still runs, applies, then releases. Same token/fence on renew/release/apply. List start/resume takes the **run** lease then the order lease; webhook and per-task sync take **only** the order lease. Overlap → `SYNC_IN_PROGRESS`, no write.
- Webhook: use only `data[id]` (do not interpret payload status). Missing id → 200, no write. Bad/missing secret → 401 and **do not log the provided secret**. Await one reconcile; never detach, cron, or queue. Network/5xx/`429`: retry with backoff + jitter; honor `Retry-After` when present. Unrecovered fetch/apply error → 500. `SYNC_IN_PROGRESS` → 200 (next webhook or manual recovers).
- Manual list sync: `withAuth` + `get_user_role()`; `admin`/`manager`/`mechanic` only. Staff **choose a scope** before start: `next_7_days` (reserved, Madrid `[today, today+7)`) or `all_reserved` (reserved, no date window). Both include orders with no local task. One Booqable list page per request (`page[size]=50`). Opaque versioned cursor **includes scope**; resume cannot switch scope. Never walk every page in one request. Skip `canceled`/`stopped`. Full-success time advances only when listing and every eligible order on that run succeeded; partial stays failed/resumable.
- Per-task sync: same roles; large control on `/workshop/[taskId]` (including cancelled tombstone) labelled from current copy like “Sync order from Booqable”. Uses `task.orderId` to resolve `orders.booqable_order_id` server-side (DTO has local `orderId` today, not the Booqable id). Calls the same one-order reconcile as the webhook (**full apply**, not reserved-only). Then `router.refresh()`. Surface `{ ok: false, code, error }` inline. If the bike was removed, this page becomes the tombstone; a replacement bike is a **new** task in the queue.
- Environment: webhook + `/workshop` Sync run on local and production `main`. Do **not** fetch or apply when `VERCEL_ENV=preview` or `VERCEL_GIT_COMMIT_REF=staging`. Staff sync there returns `SOURCE_UNAVAILABLE`; webhook returns 200 without writes.
- Sandbox GET `/api/sandbox/booqable/sync-orders`: logged-in `admin`/`manager` only (`withAuth`/session + `get_user_role()`; mechanic/partner `FORBIDDEN`). **Local only** (`VERCEL_ENV` set → no fetch/apply). Walks the shop (same paging habit as today). Persist customer/order/items for every order; mint workshop tasks **only** when snapshot `sourceStatus` is `reserved`. `started`/`stopped`/`canceled` get commercial rows, no new tasks. Same snapshot fetch as webhook; skip task-mint in the **new** migration (flag or sibling upsert), not by editing `20260821160000`. Delete `sync.ts` once it has no callers.
- New migration only (idempotent, local). Renew/release/record + staff start/resume are the spine names. Staff RPCs: `SECURITY INVOKER` → private definer, grant `authenticated`. Lease/apply/renew/release/record: `service_role` only. Add sync-run tables to `supabase_realtime` idempotently. UI imports `@/src/lib/workshop` public actions/data/domain only. Log `workshop:`, `reconcileBooqableOrder:`, `[webhooks/booqable]`.

**Ask First:**
- Creating, listing, or changing Booqable webhook subscriptions.
- Enabling preview, staging, or production sandbox reseed.
- Pinning `maxDuration`, a debounce delay, or a `429` quota.
- Editing `20260821160000_workshop_source_apply.sql` or leftover apply-review parser patches.
- Any Booqable POST/PATCH/PUT/DELETE. Hosted/staging/production DDL.

**Never:**
- Dual-write through `syncBooqableOrder` / `fetchBooqableOrder` (wrong include). Leave leftover apply-review items on that spec.
- Unauthenticated sandbox. Partner or mechanic sandbox. Sandbox or **list** Sync minting tasks for non-`reserved` orders. List Sync walking `started`/`stopped`/`canceled`. Drag/status edits. Invented checklist rows for disabled tags. Vitest or a `verify:workshop` CI job (still deferred). A post-merge env switch for production.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Webhook identified road | `data[id]` reserved + stock + `workshop-road-bike` | Await apply; HTTP 200; `to_prepare` task | N/A |
| Webhook canceled | Payload may still include stock | Nonterminal tasks `cancelled`; 200 | N/A |
| Missing id / ghost payload | No `data[id]` | 200; no fetch/apply | N/A |
| Bad secret | Wrong `?secret=` | 401; provided secret not logged | Unauthorized |
| Preview/staging | `VERCEL_ENV=preview` or git ref `staging` | 200; no Booqable; no apply | Staff click → `SOURCE_UNAVAILABLE` |
| Order busy | Unexpired order lease | No write | Webhook 200; staff `SYNC_IN_PROGRESS` |
| Bad/partial snapshot | `links.next` or fetch fail | No writes | Webhook 500 after retries |
| Manual page | Authenticated staff; scope `next_7_days` or `all_reserved` | One page of 50; cursor carries scope; counts | Partner → `FORBIDDEN` |
| Resume / overlap | Cursor from partial run / second start | Next page same scope, or rejected | Overlap → `SYNC_IN_PROGRESS`; scope mismatch → restart |
| Full vs partial | All eligible ok vs one fail | Success time advances only on full ok | Partial failed/resumable; tasks unchanged for failed orders |
| Sandbox reseed | Logged-in admin/manager on local; mixed statuses | Orders/customers/items for all; tasks only for `reserved` identified bikes | Anonymous → login; mechanic/partner → `FORBIDDEN`; on Vercel → no writes |
| Sandbox `stopped` | Identified bike, status `stopped` | Commercial rows updated; no new `bike_tasks` | N/A |
| Task-page sync | Mechanic on `/workshop/[taskId]`; order has add-on/date change | Same reconcile as webhook; page refreshes; add-ons/dates match Booqable | Busy → `SYNC_IN_PROGRESS`; preview → `SOURCE_UNAVAILABLE` |
| Task-page sync removed bike | Booqable no longer has this stock | This task `cancelled` (tombstone); no work transferred | N/A |

</frozen-after-approval>

## Code Map

- `src/app/api/webhooks/booqable/route.ts` L14–17 service-role client (reuse); L36 **logs provided secret — stop**; L49–66 payload ghost filter → id-only; L68 replace `syncBooqableOrder`; L71–77 catch → 500.
- `src/lib/booqable/sync.ts` L50–61 wrong include; L100–297 old writer — **delete once unused**. `src/app/api/sandbox/booqable/sync-orders/route.ts` L12–96 unauthenticated GET — **keep URL**; require session + admin/manager; call new fetch/reconcile (tasks only if `reserved`); local-only.
- `src/lib/booqable/parse-source-snapshot.ts` L249 `parseSourceOrderSnapshot` — reuse; no leftover-review edits. Domain envelope: `src/lib/workshop/domain/source-snapshot.ts`; import-graph lock `src/booqable-source-apply.test.mts` L326–335.
- `src/lib/workshop/index.ts` — actions/data/domain only (not application). `actions/task-actions.ts` L1–27 `withAuth` + `workshop:` + `SOURCE_UNAVAILABLE` — copy. `domain/commands.ts` L15–25 already has sync codes. `results.ts` is task-shaped; add `{ ok, runId, state, cursor, counts }`. `data/tasks.ts` L19 page size is the **task table**, not Booqable.
- `src/lib/workshop/application/` **missing** — put reconcile + manual runner here. Webhook/actions may import; `WorkshopQueue.tsx` must not.
- `src/utils/auth/with-auth.ts` L26–46 session only; role = `get_user_role()`. `src/utils/supabase/server.ts` L4–16 cookie anon — **not** for apply.
- `supabase/migrations/20260821160000_workshop_source_apply.sql` L11–21 leases; L556–596 acquire; L992–1023 public acquire/apply `service_role`. **Read-only.** New `supabase/migrations/20260822120000_workshop_sync.sql`: renew/release/record, `workshop_start_manual_sync` / `workshop_resume_manual_sync`, run tables, health read, RLS, realtime. Copy invoker+grant from foundation L1366–1378 / L1516–1525. Reuse `become`/`create_staff` in `workshop_source_apply.test.sql`.
- `src/app/workshop/page.tsx` L7–63 load health next to tasks; `DataLoadError.tsx` L15–26. `WorkshopQueue.tsx` L89–105 already refreshes `bike_tasks`; add health + large `Button` (see `WorkshopTask.tsx` L13). Layout **read-only**. `WorkshopTask.tsx` — add per-order Sync (order button already uses `task.orderId` / `orderNumber`). `[taskId]/page.tsx` passes detail through. Realtime callback-only: `AllOrdersTable.tsx` L53–70. `dtos.ts` L14–15 local `orderId` only; resolve `orders.booqable_order_id` in application (orders already loaded in `workshop_task_detail` SQL L1227).
- `package.json` L14–17 add `test:workshop-sync` (`node --test`). Retire deferred-work.md L27–29 CAP-10 row only.

**New:** `src/lib/booqable/fetch-source-snapshot.ts`; `src/lib/workshop/application/reconcile-order.ts`; `manual-sync.ts`; `actions/sync-actions.ts`; `data/sync-health.ts`; `src/workshop-sync.test.mts`; `supabase/tests/database/workshop_sync.test.sql`.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20260822120000_workshop_sync.sql` -- Run/result tables, renew/release/record, staff start/resume, health read, RLS/grants/realtime -- AD-6/AD-10
- [x] `supabase/tests/database/workshop_sync.test.sql` -- Lease renew/release, overlap, staff vs partner, preview-irrelevant grants -- AD-13
- [x] `src/lib/booqable/fetch-source-snapshot.ts` -- Full include GET + reserved list page + backoff/`Retry-After` -- AD-2/AD-10
- [x] `src/lib/workshop/application/reconcile-order.ts` + `manual-sync.ts` -- Lease 2m, parse, apply, release; scoped one page per start/resume -- AD-1/AD-10
- [x] `src/lib/workshop/actions/sync-actions.ts` + `domain` sync result + `data/sync-health.ts` + public exports -- withAuth staff surface
- [x] `src/app/api/webhooks/booqable/route.ts` -- Id-only, no secret log, await reconcile, env gate -- brownfield
- [x] `src/app/api/sandbox/booqable/sync-orders/route.ts` -- Authenticated local reseed; reserved-only tasks; stop calling `sync.ts` -- catch-up/wipe
- [x] `src/lib/booqable/sync.ts` -- Delete once `git grep syncBooqableOrder src` is empty -- single writer
- [x] `src/app/workshop/page.tsx` + queue health/sync controls -- Scope picker (7 days vs all reserved), last success, in-progress/partial/failed -- AD-11
- [x] `src/app/workshop/_components/WorkshopTask.tsx` -- Large “Sync order from Booqable” (incl. tombstone); inline errors -- mechanic calm-path
- [x] `src/workshop-sync.test.mts` + `package.json` -- Env gate, id-only webhook, import graph (domain/application vs UI) -- AD-1/AD-13
- [x] Apply locally (`supabase migration up` / `db reset`); retire CAP-10 row in `deferred-work.md` -- never remote

**Acceptance Criteria:**
- Given an existing Booqable `order.updated` subscription, when this code runs locally or on production `main`, then the same URL starts minting workshop tasks without any new Booqable subscription.
- Given a Vercel preview or `staging` git ref, when a webhook or Sync click arrives, then no Booqable fetch and no apply occur.
- Given `git grep syncBooqableOrder src`, when this slice is done, then there are no matches.
- Given a mechanic on `/workshop`, when they start Sync, then they choose next 7 days or all reserved; when a full run of that scope succeeds, then the last success time is visible; when a page fails, then that time does not advance and the failure is shown.
- Given a reserved order starting more than 7 days out and no webhook, when staff run Sync **all reserved**, then a task is minted; when they run **next 7 days** only, then that order is not listed.
- Given a mechanic on a task page (including tombstone), when they sync that order from Booqable, then add-ons and assignment match the live snapshot; when the bike was removed, then this task is cancelled and work is not moved to another bike.
- Given a logged-in admin on local `/api/sandbox/booqable/sync-orders` after a DB wipe, when Booqable has reserved and stopped identified bikes, then only the reserved bikes appear as workshop tasks and stopped orders still appear on the orders page.

## Spec Change Log

- 2026-08-22: Implemented CAP-10 workshop sync from this spec (one reconciler, webhook await, staff start/resume, sandbox reseed, deleted `sync.ts`). Local migration applied. Intent contract unchanged.

### Review Findings

- [x] [Review][Patch] Same-page sync retry does not reconcile run counters, so last-success time can be wrong [supabase/migrations/20260826120000_workshop_sync_retry_counters.sql:1]
- [ ] [Review][Patch] Starting sync after an expired run lease leaves the previous `in_progress` run orphaned [supabase/migrations/20260822120000_workshop_sync.sql:635]
- [ ] [Review][Patch] `record_sync_result` / `finish_sync_run` do not check the run-lease token or fence [supabase/migrations/20260822120000_workshop_sync.sql:385]
- [ ] [Review][Patch] pgTAP misses skipped counts, mid-page `in_progress` finish, and staff `workshop_sync_health` SELECT [supabase/tests/database/workshop_sync.test.sql:417]

## Design Notes

Webhook body is form-encoded (`data[id]`). A `canceled` delivery still applies (full apply). Per-task Sync is that same one-order path. `/workshop` list Sync is reserved-only; 7-day is the fast daily path, **all reserved** is recovery for later start dates (still one page per click). Sandbox lists every status for commercial catch-up; `sandboxBackfillAllowed()` is true only when `VERCEL_ENV` is unset (local). Gate for webhook/staff Sync: `workshopSyncAllowed()` is false when `VERCEL_ENV=preview` or `VERCEL_GIT_COMMIT_REF=staging`; true locally and on production `main`.

## Verification

**Commands:**
- `npm run test:db` -- expected: foundation + source-apply + workshop_sync pgTAP PASS
- `npm run test:source-apply` -- expected: still PASS (parser untouched)
- `npm run test:workshop-sync` -- expected: env gate, webhook id-only, no `syncBooqableOrder` callers, import graph PASS
- `git grep syncBooqableOrder src` -- expected: empty

## Suggested Review Order

**Single writer**

- One leased fetch-parse-apply path for webhook, staff, and sandbox.
  [`reconcile-order.ts:102`](../../src/lib/workshop/application/reconcile-order.ts#L102)

- Renew the 2-minute order lease until release, not only before apply.
  [`reconcile-order.ts:51`](../../src/lib/workshop/application/reconcile-order.ts#L51)

- Preview/staging and local-only sandbox gates live next to the writer.
  [`sync-env.ts:4`](../../src/lib/workshop/application/sync-env.ts#L4)

**Fetch contract**

- Complete include path; same-origin pagination; `INVALID_SNAPSHOT` writes nothing.
  [`fetch-source-snapshot.ts:1`](../../src/lib/booqable/fetch-source-snapshot.ts#L1)

- One reserved page of 50 for list Sync; sandbox walks every status.
  [`fetch-source-snapshot.ts:262`](../../src/lib/booqable/fetch-source-snapshot.ts#L262)

**Schema and leases**

- Run/result/health tables plus unique per-order results for same-page retry.
  [`20260822120000_workshop_sync.sql:21`](../../supabase/migrations/20260822120000_workshop_sync.sql#L21)

- Skip task mint for sandbox non-reserved applies without editing the apply migration.
  [`20260822120000_workshop_sync.sql:89`](../../supabase/migrations/20260822120000_workshop_sync.sql#L89)

- Staff start/resume take the run lease; overlap is `SYNC_IN_PROGRESS`.
  [`20260822120000_workshop_sync.sql:606`](../../supabase/migrations/20260822120000_workshop_sync.sql#L606)

**Webhook**

- Id-only body, no secret in logs, busy is 200, other failures 500.
  [`route.ts:15`](../../src/app/api/webhooks/booqable/route.ts#L15)

**Staff Sync**

- One page per click; failed pages keep a same-page resume cursor.
  [`manual-sync.ts:143`](../../src/lib/workshop/application/manual-sync.ts#L143)

- Madrid `[today, today+7)` skip for next-7-days; all-reserved keeps later starts.
  [`commands.ts:59`](../../src/lib/workshop/domain/commands.ts#L59)

- Per-task Sync resolves `orders.booqable_order_id` and uses the same reconcile.
  [`manual-sync.ts:319`](../../src/lib/workshop/application/manual-sync.ts#L319)

- `withAuth` staff surface for start, resume, and per-order Sync.
  [`sync-actions.ts:17`](../../src/lib/workshop/actions/sync-actions.ts#L17)

**UI**

- Queue loads health beside tasks; last success and resume stay visible.
  [`page.tsx:33`](../../src/app/workshop/page.tsx#L33)

- Scope buttons plus last-success time; resume when a cursor exists.
  [`WorkshopQueue.tsx:252`](../../src/app/workshop/_components/WorkshopQueue.tsx#L252)

- Large tombstone-safe Sync on the task page with inline errors.
  [`WorkshopTask.tsx:225`](../../src/app/workshop/_components/WorkshopTask.tsx#L225)

**Sandbox**

- Authenticated local reseed; commercial rows for all; tasks only if reserved.
  [`route.ts:14`](../../src/app/api/sandbox/booqable/sync-orders/route.ts#L14)

**Tests**

- Env gate, id-only webhook, skip/cursor, import graph, no old writer.
  [`workshop-sync.test.mts:1`](../../src/workshop-sync.test.mts#L1)

- Lease overlap, staff vs partner, listing_failed, skip-task-mint, unique upsert.
  [`workshop_sync.test.sql:170`](../../supabase/tests/database/workshop_sync.test.sql#L170)
