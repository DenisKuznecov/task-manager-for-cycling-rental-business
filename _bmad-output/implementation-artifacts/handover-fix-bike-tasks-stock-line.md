# Handover — Bike-task included items (stock→line, bundle vs flat)

**Date:** 2026-09-03  
**For:** a new Agent chat in **this worktree**, not the Haribo checkout  
**Supersedes:** `_bmad-output/implementation-artifacts/handover-fix-bike-tasks-duplicated-info.md`  
**Do not apply migrations remotely.** Staging/production migrate only via merge CI.

## Where to continue

| | |
|---|---|
| Worktree | `/Users/denyskuznetsov/.cursor/worktrees/echelon-cycling-hub-admin/fix-bike-tasks-duplicated-info` |
| Branch | `feature/fix-bike-tasks-duplicated-info` |
| HEAD | `77c317d` — `fix: hide bundle wrappers on workshop bike tasks` |
| Dirty | `workshop_task_addons.test.sql` modified; `20260902160000_workshop_task_unique_title_seed.sql` untracked |
| Remote | **not pushed** |
| Other checkout | `/Users/denyskuznetsov/Documents/echelon-cycling-hub-admin/echelon-cycling-hub-admin` on `feature/add-haribo-as-checklist-item` — leave it alone |

Do **not** open a new chat in the Documents checkout. That folder is the Haribo feature.

## Paste this to start the next chat

```
Continue from _bmad-output/implementation-artifacts/handover-fix-bike-tasks-stock-line.md
Worktree: /Users/denyskuznetsov/.cursor/worktrees/echelon-cycling-hub-admin/fix-bike-tasks-duplicated-info
Branch: feature/fix-bike-tasks-duplicated-info @ 77c317d

Implement the agreed product rules: stock→line only, bundle vs flat display, drawer stock id, squash the three undeployed migrations.
```

## Agreed product rules (Denys, 2026-09-03)

These replace the v1 title-fallback story. Do not re-litigate them.

### 1. Only link: physical bike → order line

A workshop task is a physical bike (`RF/M-1`). Booqable already assigns that stock item to one order line. Persist that pair (`booqable_assignment_instances.booqable_line_id` from `assignment.booqableLineId`) and use **only** that line to decide What’s included.

- Tasks are not created without a stock identifier, so we always have a stock id. The line id comes from the same assignment.
- **Delete title fallback.** Matching `order_items.title` to `bike_tasks.bike_title` caused #358 duplicates (two S bikes, same name, both packages) and #327 blanks (same name, unique-only fallback returned nothing).
- If the stored line id is missing, show empty (or a clear “not linked” state). Never guess from the name.

**Known hole:** Sync is supposed to write the line id on retain/create. After Denys synced #327, all three instances still had `booqable_line_id` null. Next session must prove `booqable_sync_retained_task` actually receives `booqableLineId` from the running app’s snapshot and writes it. If the Next process is the Haribo checkout, the parser will not emit the field.

### 2. Bundle vs flat — two different task views

Detect from the **linked bike line**, not from the word “bundle”.

**Bundle** — the bike line has a parent (`parent_booqable_line_id`), or walking parents finds a wrapper.

- Show the **bike title** and the **add-ons in that package** (siblings under the same parent, including declined `No …` rows).
- **Hide the bundle/parent title.** Mechanic already has the bike on the task.
- Other bundles on the same order stay off this task.

**Flat** — the bike line has no parent. Add-ons are not nested under the bike.

- Show that bike’s **title**.
- Show that line’s **`extra_information`** as simple text. This is the Booqable “Included: -Charger Di2 / -Frame pump / …” field. Screenshot case: SRAM line on #327, stock tag `RF89RIVL-1`.
- Do **not** list other top-level extras (helmets, delivery, another bike’s pedals) on the task. Those stay on the **order drawer** as order context. There is no reliable way to assign flat extras to a bike.

`order_items.extra_information` is already synced (confirmed on #327 SRAM). The task addons payload today is only `{ id, title, quantity, lineType }` — it does **not** include `extraInformation`. `AddonsList` does not render it.

### 3. Order drawer: show stock id next to the bike title

`OrderDetailsDrawer` / `ItemRow` shows title + price + `extra_information`. It does **not** show the stock identifier (`RF89RIVL-1`).

Stock id lives on `booqable_assignment_instances.bike_display_id` (and `booqable_stock_item_id`), linked by `booqable_line_id`. `loadOrderDetails` only selects `order_items`. Join assignments (or a small view) so each bike line can show its stock tag(s). A qty-2 line can have two stock ids — show both.

Drawer still lists the **full order**. Do not hide bundle parents there.

### 4. Squash the three undeployed migrations

Yes — merge them. They exist only because each loop assumed the previous file might already be on staging. **None of these versions are on staging/production.**

| File | What it did |
|---|---|
| `20260902140000_workshop_task_addons_scope.sql` | Column + create/retain write + first scoped `workshop_task_addon_items` (whole package, **including** title fallback) |
| `20260902150000_workshop_task_hide_package_ancestors.sql` | Same function; hide ancestor wrappers |
| `20260902160000_workshop_task_unique_title_seed.sql` | Same function; title fallback only if exactly one match |

**Do this locally (not remotely):**

1. Keep **one** file: `20260902140000_workshop_task_addons_scope.sql`.
2. Put the **final** intended function in that file: stock→line only, no title CTEs; bundle = package minus ancestors; flat = bike line + `extraInformation`.
3. Delete `20260902150000_…` and `20260902160000_…`.
4. Local `schema_migrations` currently has `20260902120000` (Haribo — **do not repair/delete**), plus `140000`, `150000`, `160000`. After the squash, delete **only** the `150000` and `160000` rows so history matches this repo. Then `CREATE OR REPLACE` from the folded `140000` is enough (column already exists).
5. Rewrite `workshop_task_addons.test.sql` to the new I/O (no title-merge cases; bundle vs flat + extra info; linked line id required).

Do not invent a fourth timestamp unless you also remove the three old files.

## What is on the branch today (incomplete vs the rules above)

**Done (v1 + follow-ups):**

- Parser emits `booqableLineId` (`parse-source-snapshot.ts`, Zod in `source-snapshot.ts`).
- Create/retain write `booqable_line_id` when the key is present.
- Task addons scoped in SQL; ancestors hidden; title fallback unique-only (still present — **remove it**).
- Bundle hide verified on live #358 after a **manual** line-id backfill (not via Sync).
- Addon pgTAP last run: **18/18** on the unique-title file (`supabase test db --local supabase/tests/database/workshop_task_addons.test.sql`).

**Not done:**

- Remove title fallback.
- Flat path: return and render `extra_information`; do not attach sibling extras.
- Drawer stock id.
- Migration squash.
- Prove Sync writes line ids ( #327 still null after a UI sync).
- Browser pass of /workshop after the new rules.

**Local data notes:** #358’s three instances were hand-updated with Booqable line ids so the S bikes split. Other colliding orders (194, 269, 282, 284, 302, 327) were **not** backfilled. After stock→line-only, those tasks stay empty until Sync (or a backfill) writes the id.

## How to detect bundle vs flat (implementation hint)

```
seed = instance.booqable_line_id  -- required, no title search
if seed has a parent (walk_up finds ancestors):
  addons = package tree minus ancestor wrapper rows
  include extraInformation if useful; UI today uses title split
else:
  addons = [the seed row] with extraInformation
  do not walk siblings
```

Do not filter `order_items` in Node/`AddonsList` except declined-vs-included (`/^no\b/i`) and rendering extra text.

## Files that matter

- `supabase/migrations/20260902140000_workshop_task_addons_scope.sql` — **fold the final SQL here**, then delete 150000/160000
- `src/lib/booqable/parse-source-snapshot.ts` — `booqableLineId: line.id` on each assignment
- `src/lib/workshop/domain/source-snapshot.ts` — Zod requires `booqableLineId`
- `src/lib/workshop/data/tasks.ts` — maps addons; will need `extraInformation`
- `src/app/workshop/_components/WorkshopTask.tsx` — `AddonsList`; render extra text on flat
- `src/lib/orders.ts` + `src/components/orders/OrderDetailsDrawer.tsx` — drawer stock id
- `supabase/tests/database/workshop_task_addons.test.sql`

## Local database caveats (shared stack)

This worktree and the Haribo checkout share one local Supabase.

- Haribo’s `20260902120000` is in the DB and **not** in this repo. Do **not** `migration repair` it.
- `supabase migration up` from this worktree may complain about that missing file. Ignore; do not repair.
- `npm run test:db` can fail Haribo foundation counts (20 ROAD items vs 19). Run the addon test file directly.
- Never apply DDL to staging/production by hand.

## Out of scope unless asked

- Push / PR
- Changing M2 `addon_fingerprint` / snapshot (still whole-order; see `deferred-work.md`)
- Size-matching loose flat extras to a bike
- Hosted DDL
- Any work on `feature/add-haribo-as-checklist-item`
- Two bikes inside **one** bundle: current walk still shows the other bike. Ask before hiding it.
