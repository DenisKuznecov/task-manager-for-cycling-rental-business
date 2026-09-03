---
title: 'Bike-task stock-to-line included items'
type: 'bugfix'
created: '2026-09-03'
status: 'done'
baseline_commit: '77c317ddbe12487f639aaac12faeafa85ba90ccc'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Title-matching two same-name bikes merged packages (#358) or showed nothing (#327). Flat tasks hide Booqable's Included text. The order drawer never shows which stock tag sits on which line.

**Approach:** Link each task only to that bike's assignment line. Bundle = that package minus wrappers. Flat = that line plus `extra_information`. The drawer shows stock id(s) on the matching line. Fold the three undeployed addon migrations into one.

## Boundaries & Constraints

**Always:**
- Seed is `booqable_assignment_instances.booqable_line_id` only. Missing or unknown line → empty addons (`None`). No title CTEs.
- Detect bundle vs flat from the linked line's parent walk, not the word "bundle".
- Bundle: package minus ancestor wrappers; keep the bike and siblings, including declined `No …` rows. Other bundles stay off this task.
- Bundled qty≥2: one line, several stock ids → one task per stock. Each task shows that bundle's add-ons as its own.
- Flat: only the seed row. Do not attach sibling extras (helmets, delivery, another bike). Those stay on the order drawer.
- Addon jsonb is `{ id, title, quantity, lineType, extraInformation }`. Scope in PostgreSQL. `AddonsList` only splits declined (`/^no\b/i`) and renders extra text.
- Fold the final function into `20260902140000_workshop_task_addons_scope.sql`. Delete `20260902150000_*` and `20260902160000_*`. Drop only those two local `schema_migrations` rows. Do not merge staging or repair `20260902120000` in this run (Haribo is already on staging/main; update this worktree from staging later).
- Keep create/retain writes of `booqableLineId`. Retain must not wipe a stored id when the key is missing.
- Drawer lists the full order; do not hide bundle parents. Show `bike_display_id` tag(s) on the matching line (qty-2 → both).
- Prove this worktree's Next apply writes line ids. Local DDL only.

**Ask First:**
- Size-match loose flat extras to a bike.
- Change `addon_fingerprint` / M2 snapshot.
- Hosted/staging/production DDL, or merge/rebase this worktree onto staging in this run.
- Push / PR.

**Never:**
- Title fallback or guessing a line from `bike_title`.
- Filter `order_items` in Node except declined split / extra-text render.
- New user-facing RPCs, checklist/lifecycle changes, or Booqable HTTP.
- A fourth migration timestamp unless the three old files are gone.
- Apply migrations remotely.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Two bundles | Linked line ids | Each task: bike + extras; no wrapper; no other bundle | N/A |
| Flat + extras | Linked; bike has `extra_information` | Bike title + that text; no helmet/delivery/other bike | N/A |
| Flat, no extra | Linked; extra null | Bike title only | N/A |
| Shared qty-2 | Two tasks, one bike line, two stock ids | Each sees that line's addons as its own (bundle: bike + extras) | N/A |
| Unlinked | Line id null or not on the order | `addons: []` / None | N/A |
| Same title, two packages | One linked, one null | Linked sees own package; null is empty | N/A |
| Section over bundle | Linked bike under section→bundle | Omit section + bundle; keep bike + extras | N/A |
| Partner detail | Partner session | RPC still null | Unchanged |
| Drawer qty-2 | Two instances on one line | Both stock tags on that line; parents stay | N/A |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260902140000_workshop_task_addons_scope.sql` L218–337 — fold final `workshop_task_addon_items` here: drop title `seeds` (L241–251); add `extraInformation`; bundle = walk minus ancestors (see `20260902150000` L108–133); flat = seed only.
- Same file L1–5, L24–37, L114–121 — column + create/retain writes. **Keep** retain `COALESCE`. L339–455 `workshop_task_detail` is **read-only** (stays in this file).
- `supabase/migrations/20260902150000_workshop_task_hide_package_ancestors.sql` and `20260902160000_workshop_task_unique_title_seed.sql` — **delete** after fold.
- `supabase/tests/database/workshop_task_addons.test.sql` — rewrite I/O (no title-merge). Dirty unique-title rows are leftovers. Keep persist (L321–372) and partner-null (L479–483).
- `src/lib/booqable/parse-source-snapshot.ts` L232–239 — already `booqableLineId: line.id`. **Prove, don't rewrite** unless this app still stores null.
- `src/lib/workshop/domain/source-snapshot.ts` L8–15 — Zod requires the key. **Read-only.**
- `supabase/migrations/20260821160000_workshop_source_apply.sql` L843–857, L917–929 — `extraInformation` already upserted; apply always calls retain. **Read-only** unless prove finds a drop.
- `src/lib/workshop/domain/dtos.ts` L47–52 + `src/lib/workshop/data/tasks.ts` L317–331 — add/map `extraInformation`. **No filter.**
- `src/app/workshop/_components/WorkshopTask.tsx` L762–867 — `AddonsList`: render extra text; keep declined split. `workshop-ui.ts` L410–422 `parseAddonTitle` **read-only**.
- `src/lib/orders.ts` — `loadOrderDetails` loads assignment tags with the order. Keep `{ order, error }`.
- `src/lib/order-stock-tags.ts` — attach `stock_display_ids` to the matching line (qty-2 → both; closed/unlinked skipped).
- `src/components/orders/OrderDetailsDrawer.tsx` L94–198 — show stock tag(s) on the matching line; do not hide parents.
- `src/order-stock-tags.test.mts` — drawer qty-2: both tags on the bike line; parents stay.
- `src/booqable-source-apply.test.mts` L82, L280 — keep `booqableLineId` asserts green.
- Shared local DB may still have `20260902120000` without that file in this worktree. Do not repair or merge staging here. Run the addon test file directly, not `npm run test:db`.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20260902140000_workshop_task_addons_scope.sql` -- replace `workshop_task_addon_items` with stock→line, bundle-vs-flat, `extraInformation`; delete `20260902150000_*` and `20260902160000_*`; drop only those two local `schema_migrations` rows -- one undeployed history
- [x] `supabase/tests/database/workshop_task_addons.test.sql` -- lock the I/O matrix (no title fallback; bundled qty-2 both see the package) -- prove bundle vs flat vs shared vs empty-if-unlinked
- [x] `src/lib/workshop/domain/dtos.ts` + `src/lib/workshop/data/tasks.ts` -- pass `extraInformation` through -- UI can render Included text
- [x] `src/app/workshop/_components/WorkshopTask.tsx` -- show extra text on addon rows -- flat Included is visible
- [x] `src/lib/orders.ts` + `src/components/orders/OrderDetailsDrawer.tsx` -- show stock tag(s) on the matching line -- drawer identifies which physical bike
- [x] Prove this worktree's Sync/apply writes `booqable_line_id` (re-sync #327 from this app, not Haribo). If the snapshot has `booqableLineId` and the column stays null, fix retain/create in the folded 140000 -- the write must work once title fallback is gone

**Acceptance Criteria:**
- Given two same-title bundled bikes with stored line ids, when a mechanic opens each task, then What's included lists only that bike's package (bike + extras, no wrapper, no other package).
- Given one bundled bike line with quantity ≥ 2 and two stock ids, when a mechanic opens either task, then What's included lists that bundle's add-ons as that task's own.
- Given a flat bike line with `extra_information`, when they open that task, then What's included shows the bike title and that text and does not list sibling extras.
- Given a task whose line id is missing or unknown, when they open it, then What's included is empty / None.
- Given an order with assigned stock, when they open the order drawer, then each bike line shows its stock tag(s) and bundle parents remain.
- Given Sync from this worktree's Next, when apply retain/create runs, then assignment instances store `booqable_line_id`.

## Spec Change Log

## Design Notes

```
seed = instance.booqable_line_id
if walk_up finds a parent:
  addons = package minus ancestor wrappers
else:
  addons = [seed] with extraInformation  -- no siblings
```

Qty≥2 shares one seed line across stock tasks. Squash locally: keep `140000`, delete `150000`/`160000` files and those two `schema_migrations` rows. Do not merge staging in this run. Re-prove #327 line-id writes from this worktree's Next.

## Verification

**Commands:**
- `supabase test db --local supabase/tests/database/workshop_task_addons.test.sql` -- I/O matrix pass (not `npm run test:db`)
- `npm run test:source-apply` -- `booqableLineId` still on parsed assignments
- `node --test src/order-stock-tags.test.mts` -- drawer qty-2 tags on the matching line

**Manual checks:**
- Local `schema_migrations` keeps `20260902120000` and `20260902140000`; `150000`/`160000` gone.
- `/workshop` #358: each S/M task is its package only; no bundle title. Drawer shows wrappers + stock tags.
- `/workshop` #327 SRAM / `RF89RIVL-1`: bike title + Included text; no helmets/delivery. After Sync from this app, `booqable_line_id` is set.

## Suggested Review Order

**Stock→line seed**

- Start here: addons come only from the stored assignment line.
  [`20260902140000_workshop_task_addons_scope.sql:225`](../../supabase/migrations/20260902140000_workshop_task_addons_scope.sql#L225)

- Missing or unknown line yields `[]`; no title CTE.
  [`20260902140000_workshop_task_addons_scope.sql:229`](../../supabase/migrations/20260902140000_workshop_task_addons_scope.sql#L229)

**Bundle vs flat**

- Ancestors are the walk minus the seed; wrappers drop, siblings stay.
  [`20260902140000_workshop_task_addons_scope.sql:264`](../../supabase/migrations/20260902140000_workshop_task_addons_scope.sql#L264)

- No parent walk → seed row only, no sibling extras.
  [`20260902140000_workshop_task_addons_scope.sql:336`](../../supabase/migrations/20260902140000_workshop_task_addons_scope.sql#L336)

**Included text**

- Payload now carries `extraInformation` on every scoped row.
  [`20260902140000_workshop_task_addons_scope.sql:351`](../../supabase/migrations/20260902140000_workshop_task_addons_scope.sql#L351)

- Mapper passes the field through; no Node filter.
  [`tasks.ts:329`](../../src/lib/workshop/data/tasks.ts#L329)

- AddonsList still splits `/^no\b/i` and renders extra text.
  [`WorkshopTask.tsx:780`](../../src/app/workshop/_components/WorkshopTask.tsx#L780)

**Drawer stock tags**

- Load open assignment tags with the order; keep `{ order, error }`.
  [`orders.ts:130`](../../src/lib/orders.ts#L130)

- Qty-2 shares one line; both tags attach; closed instances skip.
  [`order-stock-tags.ts:23`](../../src/lib/order-stock-tags.ts#L23)

- Badges on the matching line; bundle parents still list.
  [`OrderDetailsDrawer.tsx:105`](../../src/components/orders/OrderDetailsDrawer.tsx#L105)

**Create/retain write**

- Retain still `COALESCE`s so a missing key does not wipe the id.
  [`20260902140000_workshop_task_addons_scope.sql:118`](../../supabase/migrations/20260902140000_workshop_task_addons_scope.sql#L118)

**Tests**

- I/O matrix: two bundles, flat, qty-2, unlinked, same title.
  [`workshop_task_addons.test.sql:392`](../../supabase/tests/database/workshop_task_addons.test.sql#L392)

- Create persists the line id; retain without the key keeps it.
  [`workshop_task_addons.test.sql:336`](../../supabase/tests/database/workshop_task_addons.test.sql#L336)

- Drawer qty-2: both tags on the bike line; parents stay.
  [`order-stock-tags.test.mts:5`](../../src/order-stock-tags.test.mts#L5)

### Review Findings

- [ ] [Review][Patch] Stale v1 handover still describes title fallback and an unchanged drawer [`_bmad-output/implementation-artifacts/handover-fix-bike-tasks-duplicated-info.md:13`]
- [ ] [Review][Patch] Parent/child walks join raw line ids after `linked` already trims [`supabase/migrations/20260902140000_workshop_task_addons_scope.sql:259`]
- [ ] [Review][Patch] AddonsList `extraInformation` is only grep-locked [`src/workshop-ui.test.mts:857`]
- [x] [Review][Defer] Folded CREATE OR REPLACE copies of create/retain/detail can overwrite later staging/Haribo bodies [`supabase/migrations/20260902140000_workshop_task_addons_scope.sql:6`] — deferred, pre-existing
- [x] [Review][Defer] Drawer stock tags are tested at the helper, not through loadOrderDetails/ItemRow [`src/order-stock-tags.test.mts:5`] — deferred, pre-existing
