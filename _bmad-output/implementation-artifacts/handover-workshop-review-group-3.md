# Handover — Workshop review Group 3 (Workshop app)

**Date:** 2026-08-26  
**For:** next session starting `/bmad-code-review` on the workshop-tasks feature  
**Owner:** Denyskuznetsov  
**Do not apply migrations remotely.** Staging/production migrate only via merge CI.

## One-line status

Groups 1 and 2 are reviewed. User wants **Group 3 next**. No Group 2 patches were applied. Remaining Group 1 items stay listed unless the user asks to drop them.

## Git / branch

| | |
|---|---|
| Branch | `feature/task-manager-for-mechanics-mvp` |
| Base | `staging` (`058c68e`) |
| Mode | Full spec review, **chunked**, implementation only |
| Last known HEAD when this was written | check `git rev-parse --short HEAD` (was `7d43752`, in sync with origin) |

Uncommitted when this handover was written (review docs only; include these):

- `_bmad-output/implementation-artifacts/review-workshop-db-group.md`
- `_bmad-output/implementation-artifacts/review-workshop-ingest-group.md` (**new**)
- `_bmad-output/implementation-artifacts/spec-cap-10-workshop-sync.md` (Group 2 findings marked dismissed)
- `_bmad-output/implementation-artifacts/handover-workshop-review-group-3.md` (this file)

`package-lock.json`, `_bmad-output` planning docs, and `scripts/booqable-spike/` stay **out of scope**.

## What the user asked for

- Bugs **and** quality / reuse (reuse only when it stays simpler — do not extract layers for their own sake).
- Easy language. Prioritize. Do not dump every theoretical edge.
- User is conservative: **only patch what they agree is worth doing** in this shop.

## Prior decisions (do not re-litigate)

### Group 1 — applied

1. **Sync retry counters** — same-page Resume upserted the result row but left `succeeded`/`failed` stale. Fixed in `7d43752`. Local `npm run test:db` **PASS** (252) after that migration.

### Group 1 — dismissed (shop reality)

- Tag drift / Bike ID rename on the **same** `stock_items.id`
- SQL `*-bundle` filter — parser already strips bundles
- Weak add-on fingerprint (parent + qty only)

### Group 1 — still listed, not requested

Do **not** implement unless asked: non-array `workshopTags` RAISE; orphan `in_progress` run; `record`/`finish` without run-lease token; order lease accepts past `expires_at`; empty coupon `{}` clears partner; `bike_tasks.order_id` index; `mint_tasks=off` still increments `created`; extra pgTAP.

Write-up: `_bmad-output/implementation-artifacts/review-workshop-db-group.md`

### Group 2 — user declined all three patches

- Fetch merge / `fetchSourceOrderDocument` never run in tests
- List `hasMore` for a full 50-row page unasserted — **do not re-open in Group 3** even though `manual-sync.ts` also reads `hasMore`
- `mergeOrderDocuments` drops junk include rows instead of `INVALID_SNAPSHOT`

Parser leftovers stay on `spec-booqable-source-apply.md`. CAP-10 said leave those leftover parser patches.

Write-up: `_bmad-output/implementation-artifacts/review-workshop-ingest-group.md`

## How to start Group 3

1. Speak English. Greet Denyskuznetsov.
2. Run `/bmad-code-review` (skill `.claude/skills/bmad-code-review`).
3. **Do not** re-ask scope. Already decided:
   - Target: `feature/task-manager-for-mechanics-mvp` vs `staging`
   - Chunk **A**, specs **1** (full)
   - This pass = **Group 3 only**
4. Construct `{diff_output}`:

```bash
git diff staging...HEAD -- src/lib/workshop
```

5. `{review_mode}` = `full`. Load these specs (and their `context` docs if needed):
   - `_bmad-output/implementation-artifacts/spec-workshop-foundation.md`
   - `_bmad-output/implementation-artifacts/spec-cap-10-workshop-sync.md`
   - `_bmad-output/implementation-artifacts/spec-workshop-queue.md`
6. Run all four review layers (Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor) on **this diff only**.
7. Do **not** flag missing `/workshop` pages or `WorkshopTask` / `WorkshopQueue` chrome — those are Group 4. Review action/data **contracts** here; leave JSX for Group 4 unless a bug is only visible at the boundary.
8. After triage, persist findings (append to the specs above and a Group 3 review file). HALT for patch choices. Prefer the same conservative bar as Groups 1–2.

Suggested Group 3 review file: `_bmad-output/implementation-artifacts/review-workshop-app-group.md`

## Group 3 files (~2,095 added)

| File | Role |
|---|---|
| `src/lib/workshop/domain/commands.ts` | Sync codes, cursor, list-scope eligibility |
| `src/lib/workshop/domain/dtos.ts` | Queue/detail DTOs (`orderId` is local) |
| `src/lib/workshop/domain/results.ts` | Command / sync result shapes |
| `src/lib/workshop/domain/source-snapshot.ts` | `SourceOrderSnapshotV1` Zod |
| `src/lib/workshop/domain/statuses.ts` | Task status machine |
| `src/lib/workshop/domain/index.ts` | Domain public barrel |
| `src/lib/workshop/application/reconcile-order.ts` | Lease → fetch → parse → apply → release |
| `src/lib/workshop/application/manual-sync.ts` | Start/resume list Sync; per-task Sync |
| `src/lib/workshop/application/sync-env.ts` | Preview/staging + sandbox gates; webhook id + status map |
| `src/lib/workshop/actions/task-actions.ts` | `withAuth` mechanic commands |
| `src/lib/workshop/actions/sync-actions.ts` | `withAuth` staff Sync |
| `src/lib/workshop/data/tasks.ts` | Queue/detail loaders |
| `src/lib/workshop/data/sync-health.ts` | Last-success / resume health |
| `src/lib/workshop/index.ts` | Public actions/data/domain only (no application) |

**Not in this group** (Group 4): `src/app/workshop/`, `src/workshop-ui.test.mts`. Group 2 ingest (`src/lib/booqable/`, webhook, sandbox route) is already reviewed.

## Facts already verified (useful for app)

- Identity key is `stock_items.id`. Display Bike ID is metadata. `{A}→{B}` cancels A and mints B.
- Webhook/staff Sync: no fetch/apply when `VERCEL_ENV=preview` or `VERCEL_GIT_COMMIT_REF=staging`. Sandbox: no writes when `VERCEL_ENV` is set.
- Apply is `service_role` only. Staff Sync goes `withAuth` → application → lease/apply.
- DTO has local `orderId`; resolve `orders.booqable_order_id` in application for per-task Sync.
- Public barrel must not export `application`. UI must not import application or `@/src/lib/booqable`.
- `hasMore` 50-row fallback is intentional; user declined adding the test.

## Remaining after this

| Group | Scope | Size (approx) |
|---|---|---|
| **4. Workshop UI** | `src/app/workshop/`, `src/workshop-ui.test.mts` | ~2,400 added |

Optional leftover after Group 4: Kanban delete, login/nav, Next/ESLint (small).

## Commands

```bash
npm run test:db
npm run test:source-apply
npm run test:workshop-sync
git grep syncBooqableOrder src   # expected: empty
```

Local CLI may still be `2.105.0`; CI is pinned to `2.115.0`. Ignore that unless it blocks the app review.
