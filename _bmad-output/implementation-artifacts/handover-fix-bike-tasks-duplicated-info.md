# Handover — Bike-task included items (v1 shipped, not pushed)

**Date:** 2026-09-02  
**For:** a new Agent chat in **this worktree**, not the Haribo checkout  
**Do not apply migrations remotely.** Staging/production migrate only via merge CI.

## Where to continue

| | |
|---|---|
| Worktree | `/Users/denyskuznetsov/.cursor/worktrees/echelon-cycling-hub-admin/fix-bike-tasks-duplicated-info` |
| Branch | `feature/fix-bike-tasks-duplicated-info` |
| HEAD | `59a0e92` — `fix: show only this bike's package on workshop task add-ons` |
| Remote | **not pushed** |
| Spec | `_bmad-output/implementation-artifacts/spec-fix-bike-tasks-duplicated-info.md` (`status: done`) |
| Other checkout | `/Users/denyskuznetsov/Documents/echelon-cycling-hub-admin/echelon-cycling-hub-admin` on `feature/add-haribo-as-checklist-item` — leave it alone |

Do **not** open a new chat in the Documents checkout. That folder is the Haribo feature.

## Paste this to start the next chat

```
Continue from _bmad-output/implementation-artifacts/handover-fix-bike-tasks-duplicated-info.md
Worktree: /Users/denyskuznetsov/.cursor/worktrees/echelon-cycling-hub-admin/fix-bike-tasks-duplicated-info
Branch: feature/fix-bike-tasks-duplicated-info @ 59a0e92

v1 is committed, not pushed. I want to [try it in the browser / adjust flat orders / push a PR].
```

Replace the last line with what you actually want. Optional: `/bmad-build` and point at the spec if you want another BMAD loop.

## What v1 does (product)

A mechanic opening one bike task used to see **every row on the parent order**.

Now the task list is scoped to **this bike’s package**:

- **Bundled order** — extras sit under a parent row. The task shows that whole package (bike, extras, “No …” declined rows). Other packages stay off the task.
- **Flat order** — bikes and extras sit side by side with no parent. v1 only hides the **other bikes**. Loose helmets and delivery stay on the **order drawer**.
- **Two tasks, one qty-2 bike row** — both see that shared row, not the other sizes.

The order drawer is unchanged (full order). Do not change it unless Denys asks.

## What the next person should do first

1. Confirm you are in the worktree above (`git branch --show-current` → `feature/fix-bike-tasks-duplicated-info`).
2. **Try it like a mechanic** on `/workshop`:
   - Open a bundled multi-bike order (screenshot case: three IZALCO bundles). Each task should show one package.
   - Open a flat multi-bike order (screenshot case: several Aventura sizes + helmets). Each task should show that bike only; helmets/delivery only in the order drawer.
3. Decide with Denys whether flat orders are good enough or need a v2.

Do not invent size-matching for loose helmets unless he asks.

## Parked — try on real orders, then decide

These are **not** bugs in v1. They are the next conversation:

- Loose same-level extras (flat helmets, delivery) on the task vs drawer-only.
- Two bikes inside **one** package: v1 shows the whole package, including the other bike.
- If Booqable later replaces the bike’s order-row id, we fall back to matching the bike name. Same name on two bikes can still overlap until the next sync writes the new id.
- M2 still confirms the **whole order**. Changing another bike’s extras can still trip `ADD_ONS_CHANGED` on this task. See `deferred-work.md`.

## How the code remembers “this bike”

A workshop task is a physical bike (`ECF/M-1`). The **order row** for that bike is a separate Booqable line.

v1 stores that order-row id on `booqable_assignment_instances.booqable_line_id` when a snapshot is applied (`booqableLineId` on the assignment). Then `private.workshop_task_addon_items` walks `order_items.parent_booqable_line_id` to the package root and returns that tree.

If the stored id is missing, it matches `order_items.title` to `bike_tasks.bike_title`. Existing live tasks get the stored id on the **next Booqable sync**. Until then they use the name fallback.

## Files that matter

- `supabase/migrations/20260902140000_workshop_task_addons_scope.sql` — column, apply write, scoped RPC
- `src/lib/booqable/parse-source-snapshot.ts` — emit `booqableLineId`
- `src/lib/workshop/domain/source-snapshot.ts` — Zod field
- `src/app/workshop/_components/WorkshopTask.tsx` — **do not filter here**; UI only splits declined vs included
- `supabase/tests/database/workshop_task_addons.test.sql` — bundle / flat / shared qty / fallback / persist / partner-null

## Local database caveats (shared stack)

This worktree and the Haribo checkout share one local Supabase.

- Haribo already applied version `20260902120000` (`workshop_haribo_checklist_item.sql`) in the Documents checkout.
- This story’s file is `20260902140000_workshop_task_addons_scope.sql` so the timestamps do not collide.
- The scoped SQL **is applied** on local (column `booqable_line_id` exists). `supabase migration up` from this worktree may still complain that `20260902120000` is in the DB but not in **this** repo. Do **not** `migration repair` that version — it belongs to Haribo.
- `npm run test:db` from this worktree can fail **Haribo-related foundation assertions** (20 ROAD items vs 19) because the shared DB has the Haribo seed. That is not a regression from this branch. Re-run the addon file directly if needed; last run was **15/15 pass**.
- `npm run test:source-apply` — 13/13 pass at commit.

Never apply this migration to staging/production by hand.

## Verification already done

- `npm run test:source-apply` — pass
- Addon pgTAP (direct psql) — 15/15 pass
- Browser check of `/workshop` — **not done** in the previous session. Do that next.

## Out of scope unless asked

- Push / PR (offer only; Denys did not ask yet)
- Changing the order drawer
- Changing M2 `addon_fingerprint` / snapshot
- Size-matching loose accessories
- Hosted DDL
- Any work on `feature/add-haribo-as-checklist-item`
