# Handover — Workshop review Group 4 (Workshop UI)

**Date:** 2026-08-26  
**For:** next session starting `/bmad-code-review` on the workshop-tasks feature  
**Owner:** Denyskuznetsov  
**Do not apply migrations remotely.** Staging/production migrate only via merge CI.

## One-line status

Groups 1–3 are reviewed. User wants **Group 4 next**. No Group 2 or Group 3 patches were applied. Remaining Group 1 items stay listed unless the user asks to drop them.

## Git / branch

| | |
|---|---|
| Branch | `feature/task-manager-for-mechanics-mvp` |
| Base | `staging` (`058c68e`) |
| Mode | Full spec review, **chunked**, implementation only |
| Last known HEAD when this was written | check `git rev-parse --short HEAD` (was `fb73e42`) |

Uncommitted when this handover was written (review docs only; include these):

- `_bmad-output/implementation-artifacts/review-workshop-db-group.md`
- `_bmad-output/implementation-artifacts/review-workshop-ingest-group.md`
- `_bmad-output/implementation-artifacts/review-workshop-app-group.md` (**new**, Group 3 clean)
- `_bmad-output/implementation-artifacts/handover-workshop-review-group-4.md` (this file)

`package-lock.json`, `_bmad-output` planning docs, `scripts/booqable-spike/`, and `.review-group*-diff.patch` stay **out of scope**.

## What the user asked for

- Bugs **and** quality / reuse (reuse only when it stays simpler — do not extract layers for their own sake).
- Easy language. Prioritize. Do not dump every theoretical edge.
- User is conservative: **only patch what they agree is worth doing** in this shop.

## Prior decisions (do not re-litigate)

### Group 1 — applied

1. **Sync retry counters** — same-page Resume upserted the result row but left `succeeded`/`failed` stale. Fixed in `7d43752`.

### Group 1 — dismissed (shop reality)

- Tag drift / Bike ID rename on the **same** `stock_items.id`
- SQL `*-bundle` filter — parser already strips bundles
- Weak add-on fingerprint (parent + qty only)

### Group 1 — still listed, not requested

Do **not** implement unless asked: non-array `workshopTags` RAISE; orphan `in_progress` run; `record`/`finish` without run-lease token; order lease accepts past `expires_at`; empty coupon `{}` clears partner; `bike_tasks.order_id` index; `mint_tasks=off` still increments `created`; extra pgTAP.

Write-up: `_bmad-output/implementation-artifacts/review-workshop-db-group.md`

### Group 2 — user declined all three patches

- Fetch merge / `fetchSourceOrderDocument` never run in tests
- List `hasMore` for a full 50-row page unasserted — **do not re-open**
- `mergeOrderDocuments` drops junk include rows instead of `INVALID_SNAPSHOT`

Write-up: `_bmad-output/implementation-artifacts/review-workshop-ingest-group.md`

### Group 3 — clean review, no patches

Do **not** re-open: lease renew swallow / renew-after-release race; same-page Resume re-fetch; 50-order page / `maxDuration` / `hasMore` cap; client cursor trust; `SOURCE_UNAVAILABLE` catch-all; 8 tile-count queries; parser/mapper/queue-bounds/sandbox-mint test gaps.

**Carry into Group 4 only if the task page grows a customer line:** `workshop_task_detail` never sends `customer_name` (queue view is fine). If you add that line, add `customer_name` to the RPC first (new local migration; do not edit the foundation file in place). If the task page does not show customer, leave it.

Write-up: `_bmad-output/implementation-artifacts/review-workshop-app-group.md`

## How to start Group 4

1. Speak English. Greet Denyskuznetsov.
2. Run `/bmad-code-review` (skill `.claude/skills/bmad-code-review`).
3. **Do not** re-ask scope. Already decided:
   - Target: `feature/task-manager-for-mechanics-mvp` vs `staging`
   - Chunk **A**, specs **1** (full)
   - This pass = **Group 4 only**
4. Construct `{diff_output}`:

```bash
git diff staging...HEAD -- src/app/workshop src/workshop-ui.test.mts
```

5. `{review_mode}` = `full`. Load these specs (and their `context` docs if needed):
   - `_bmad-output/implementation-artifacts/spec-workshop-ui.md`
   - `_bmad-output/implementation-artifacts/spec-workshop-queue.md`
   - `_bmad-output/implementation-artifacts/spec-cap-10-workshop-sync.md` (Sync chrome / in-flight / per-task Sync only)
6. Run all four review layers (Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor) on **this diff only**.
7. Review **JSX and UI contracts**: queue URL state, tiles/tabs, Sync toolbar, in-flight stay-on-page, task page commands, colours, pagination, empty/error states. Do **not** re-review `src/lib/workshop` unless a bug is only visible at the UI boundary.
8. UI must import `@/src/lib/workshop` public actions/data/domain only — not `application`, not `@/src/lib/booqable`.
9. After triage, persist findings (append to the specs above and a Group 4 review file). HALT for patch choices. Prefer the same conservative bar as Groups 1–3.

Suggested Group 4 review file: `_bmad-output/implementation-artifacts/review-workshop-ui-group.md`

## Group 4 files (~2,432 added, 218 removed)

| File | Role |
|---|---|
| `src/app/workshop/page.tsx` | Server queue page: `searchParams`, loaders, error banner |
| `src/app/workshop/[taskId]/page.tsx` | Server task page + tombstone |
| `src/app/workshop/layout.tsx` | Role gate / drawer host (mostly read-only) |
| `src/app/workshop/loading.tsx` | Queue loading shell |
| `src/app/workshop/[taskId]/loading.tsx` | Task loading shell |
| `src/app/workshop/_components/WorkshopQueue.tsx` | Tabs, tiles, table, Sync toolbar, in-flight intercept |
| `src/app/workshop/_components/WorkshopTask.tsx` | Checklist, commands, per-order Sync |
| `src/app/workshop/_components/workshop-ui.ts` | Dates, colours, hrefs, helpers |
| `src/app/workshop/_components/WorkshopLoadingSkeleton.tsx` | Shared skeleton |
| `src/workshop-ui.test.mts` | Queue/UI source + helper tests |

**Not in this group:** `src/lib/workshop` (Group 3, clean), ingest (`src/lib/booqable/`, webhook, sandbox). Optional leftover after this: Kanban delete, login/nav, Next/ESLint (small).

## Facts already verified (useful for UI)

- Default queue is **All**, not Today. Completed is opt-in via its tile. No Cancelled tile.
- Page size **15**. Invalid/out-of-range `page` → `1`. Invalid `filter` → `all`.
- Queue From/Until and task-page From–Until use the same Madrid clock (`Thu 27 Aug · 19:00`).
- Sync chrome is a left-aligned header toolbar, not a right-side island. Buttons `neutral-secondary`. In-flight list Sync must not abort on row click.
- Per-task Sync labelled like “Sync order from Booqable”; works on cancelled tombstones; then `router.refresh()`.
- `STALE_VERSION` refreshes the task page. Other command errors stay inline.
- Public barrel must not export `application`. UI must not import application or `@/src/lib/booqable`.
- `hasMore` 50-row fallback is intentional; user declined adding the test.

## Remaining after this

| Group | Scope | Size (approx) |
|---|---|---|
| Optional leftover | Kanban delete, login/nav, Next/ESLint | small |

## Commands

```bash
npm run test:workshop-ui
npx eslint src/app/workshop src/workshop-ui.test.mts
```

Local CLI may still be `2.105.0`; CI is pinned to `2.115.0`. Ignore that unless it blocks the UI review.
