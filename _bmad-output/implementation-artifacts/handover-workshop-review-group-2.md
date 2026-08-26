# Handover — Workshop review Group 2 (Booqable ingest)

**Date:** 2026-08-26  
**For:** next session starting `/bmad-code-review` on the workshop-tasks feature  
**Owner:** Denyskuznetsov  
**Do not apply this migration remotely.** Staging/production migrate only via merge CI.

## One-line status

Group 1 (Database) is reviewed. User wants **Group 2 next**. Only one Group 1 patch was applied. Remaining Group 1 items stay listed unless the user asks to drop them.

## Git / branch

| | |
|---|---|
| Branch | `feature/task-manager-for-mechanics-mvp` |
| Base | `staging` (`058c68e`) |
| Mode | Full spec review, **chunked**, implementation only |
| Last known HEAD when this was written | check `git rev-parse --short HEAD` (was `13fef72`, **ahead 1** of origin) |

Uncommitted when this handover was written (include these; do not lose them):

- `supabase/migrations/20260826120000_workshop_sync_retry_counters.sql` (**new**, applied **local** only)
- `supabase/tests/database/workshop_sync.test.sql` (retry counter assertions)
- `_bmad-output/implementation-artifacts/review-workshop-db-group.md`
- spec review-findings edits: `spec-workshop-foundation.md`, `spec-cap-10-workshop-sync.md`, `spec-booqable-source-apply.md`

`package-lock.json`, `_bmad-output` planning docs, and `scripts/booqable-spike/` stay **out of scope**.

## What the user asked for

- Bugs **and** quality / reuse (reuse only when it stays simpler — do not extract layers for their own sake).
- Easy language. Prioritize. Do not dump every theoretical edge.
- User is conservative: **only patch what they agree is worth doing** in this shop.

## Group 1 decisions (do not re-litigate)

Applied:

1. **Sync retry counters** — same-page Resume upserted the result row but left `succeeded`/`failed` stale, so `last_success_at` could lie. Fixed by rebuilding run counters from `booqable_sync_order_results` (now includes `skipped`). Local `npm run test:db` **PASS** (252).

Dismissed by the user (shop reality):

- Tag drift / Bike ID rename on the **same** `stock_items.id` — they do not retag or rename in place. A real bike swap already cancels + remints.
- SQL `*-bundle` filter — parser already strips bundles.
- Weak add-on fingerprint (parent + qty only) — not worth doing.

Still listed, **not** requested. Do **not** implement unless asked:

- Non-array `workshopTags` RAISE
- Orphan `in_progress` run after lease expiry
- `record`/`finish` without run-lease token
- Order lease accepts past `expires_at`
- Empty coupon `{}` clears partner (parser sends `null`)
- `bike_tasks.order_id` index
- `mint_tasks=off` still increments `created`
- Extra pgTAP (skipped counts, mid-page `in_progress`, staff health SELECT, `staff_command`, apply wrong fence)

Write-up: `_bmad-output/implementation-artifacts/review-workshop-db-group.md`

## How to start Group 2

1. Speak English. Greet Denyskuznetsov.
2. Run `/bmad-code-review` (skill `.claude/skills/bmad-code-review`).
3. **Do not** re-ask scope. Already decided:
   - Target: `feature/task-manager-for-mechanics-mvp` vs `staging`
   - Chunk **A**, specs **1** (full)
   - This pass = **Group 2 only**
4. Construct `{diff_output}`:

```bash
git diff staging...HEAD -- \
  src/lib/booqable \
  src/app/api/sandbox/booqable/sync-orders/route.ts \
  src/app/api/webhooks/booqable/route.ts \
  src/booqable-source-apply.test.mts \
  src/workshop-sync.test.mts
```

5. `{review_mode}` = `full`. Load these specs (and their `context` docs if needed):
   - `_bmad-output/implementation-artifacts/spec-booqable-source-apply.md`
   - `_bmad-output/implementation-artifacts/spec-cap-10-workshop-sync.md`
   - `_bmad-output/specs/spec-automating-mechanics-daily-work/booqable-reconciliation.md`
6. Run all four review layers (Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor) on **this diff only**.
7. Do **not** flag missing workshop app/UI — those are Groups 3 and 4.
8. After triage, persist findings (append to `spec-cap-10-workshop-sync.md` / `spec-booqable-source-apply.md` and a Group 2 review file). HALT for patch choices. Prefer the same conservative bar as Group 1.

Suggested Group 2 review file: `_bmad-output/implementation-artifacts/review-workshop-ingest-group.md`

## Group 2 files (~1,676 added / 410 removed)

| File | Role |
|---|---|
| `src/lib/booqable/fetch-source-snapshot.ts` | Full include GET, reserved list page, backoff / `Retry-After` |
| `src/lib/booqable/parse-source-snapshot.ts` | JSON:API → `SourceOrderSnapshotV1` |
| `src/lib/booqable/fixtures/source-order-snapshot-v1.json` | Golden fixture |
| `src/lib/booqable/sync.ts` | **Deleted** — old writer; `git grep syncBooqableOrder src` must stay empty |
| `src/app/api/webhooks/booqable/route.ts` | Id-only body, no secret in logs, await reconcile, preview/staging gate |
| `src/app/api/sandbox/booqable/sync-orders/route.ts` | Auth local reseed; tasks only if `reserved` |
| `src/booqable-source-apply.test.mts` | Parser / fixture / domain import graph |
| `src/workshop-sync.test.mts` | Env gate, webhook id-only, import graph |

**Not in this group** (Group 3): `src/lib/workshop/application/*`, `actions/sync-actions.ts`, `data/sync-health.ts`. If ingest calls those, review the **call site** here and leave the application body for Group 3 unless a bug is only visible at the boundary.

## Facts the last session already verified (useful for ingest)

- Identity key is `stock_items.id`. Display Bike ID is metadata. `{A}→{B}` cancels A and mints B.
- Parser drops tags ending in `-bundle`. SQL resolver does not; user does not want SQL hardening.
- Parser coupon miss → `coupon: null` (SQL preserves partner). `coupon: {}` would clear partner; not the live path.
- Fingerprints run in SQL **before** the apply exception handler. Parser Zod already types `workshopTags` as `string[]`.
- Webhook/staff Sync: no fetch/apply when `VERCEL_ENV=preview` or `VERCEL_GIT_COMMIT_REF=staging`. Sandbox: no writes when `VERCEL_ENV` is set.
- Apply is `service_role` only. Staff Sync goes `withAuth` → application → lease/apply.

## Remaining groups after this

| Group | Scope | Size (approx) |
|---|---|---|
| **3. Workshop app** | `src/lib/workshop/` | ~2,100 added |
| **4. Workshop UI** | `src/app/workshop/`, `src/workshop-ui.test.mts` | ~2,400 added |

Optional leftover after Group 4: Kanban delete, login/nav, Next/ESLint (small).

## Commands

```bash
npm run test:db          # pgTAP — last run PASS after the counter migration
npm run test:source-apply
npm run test:workshop-sync
git grep syncBooqableOrder src   # expected: empty
```

Local CLI may still be `2.105.0`; CI is pinned to `2.115.0`. Ignore that unless it blocks the ingest review.
