---
title: 'Hide workshop task bundle name'
type: 'bugfix'
created: '2026-09-02'
status: 'done'
baseline_commit: '59a0e927458915bb3e15cd2acab294563f504da6'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** On a bundled bike task, What's included repeats the bike under a parent product titled like `MMR Adrenaline 00 SC45 Ultegra Di2 · Road Bike Rental bundle`. That wrapper is noise; the mechanic already has the bike on the task.

**Approach:** Keep v1 package scoping. Drop ancestor wrapper rows of this bike's order line from the task addons payload. Keep the bike line and the rest of the package. Flat bike-only rows stay visible. The order drawer still shows the full order.

## Boundaries & Constraints

**Always:**
- Omit ancestors in PostgreSQL inside `private.workshop_task_addon_items`. Do not filter `order_items` in Node or `AddonsList`.
- An ancestor is a `walk_up` row that is not a seed (the matched bike line). Hide those ids in the `walk_down` aggregate. Keep the seed and every other package row (siblings, extras, declined `No …` rows).
- Do not detect wrappers by the word `bundle` in the title. `line_type` is `charge` on both wrappers and bikes.
- Keep the addons payload shape (`id`, `title`, `quantity`, `lineType`) and declined-vs-included splitting in `AddonsList` (`/^no\b/i`).
- New local idempotent migration that replaces only `workshop_task_addon_items`. Leave create/retain and `booqable_line_id` writes alone.

**Ask First:**
- Also hide the bike line because the header already names the bike.
- Put this hide into `OrderDetailsDrawer`.
- Change `addon_fingerprint` or the M2 `addon_snapshot`.
- Hosted/staging/production DDL.

**Never:**
- Change `OrderDetailsDrawer` / `useOpenOrderDetails`.
- Filter or rewrite titles in `WorkshopTask.tsx` / `parseAddonTitle`.
- New user-facing RPCs, checklist/lifecycle changes, or Booqable HTTP.
- Guess which flat extra belongs to which bike by size.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Bundled package | Root wrapper + bike + extras | addons omit the wrapper; bike + extras remain | N/A |
| Flat bike | Top-level bike, no parent | addons still that bike row | N/A |
| Shared qty-2 | One bike row, two tasks | both still see that row | N/A |
| Nested extras under bike | Bike is seed and parent of extras | keep the bike row and extras | N/A |
| Section over bundle | Section → bundle → bike + extras | omit section and bundle; keep bike + extras | N/A |
| Legacy title match | Null line id; one title match in a bundle | omit wrapper; keep that package's bike + extras | N/A |
| Partner detail | Partner session | RPC still returns null | Unchanged |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260902140000_workshop_task_addons_scope.sql` L218–337 — `workshop_task_addon_items` aggregates the whole package, including ancestors. **Replace this function** in a new migration; keep seed / walk / loop-guard logic. Exclude `walk_up` ids that are not seeds from the final `jsonb_agg` (L322–336).
- `supabase/migrations/20260902140000_workshop_task_addons_scope.sql` L339–455 — `workshop_task_detail` already calls the helper. **Read-only.**
- `src/lib/booqable/fixtures/source-order-snapshot-v1.json` L61–87 — bundle parent is a `charge` line with `parent_line_id` null; item type `bundles` is not stored on `order_items`.
- `src/app/workshop/_components/WorkshopTask.tsx` L527, L770–867 — `AddonsList` only splits declined. **Do not filter here.**
- `src/app/workshop/_components/workshop-ui.ts` L28–37, L410–422 — header `workshopBikeLabel`; `parseAddonTitle` splits on ` - ` only. **Read-only.**
- `src/lib/workshop/data/tasks.ts` L317–331, L415–421 — maps addons as-is. **No filter here.**
- `src/components/orders/OrderDetailsDrawer.tsx` L110, L152–174 — own tree from `order_items`. **Read-only.**
- `supabase/tests/database/workshop_task_addons.test.sql` L195–206, L347–413 — update bundle/legacy titles; add a section-over-bundle case; keep flat/shared/empty/payload/partner.

**New files:**
- `supabase/migrations/20260902150000_workshop_task_hide_package_ancestors.sql`

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20260902150000_workshop_task_hide_package_ancestors.sql` -- replace `workshop_task_addon_items` so the aggregate skips ancestor ids -- hide wrappers without touching UI
- [x] `supabase/tests/database/workshop_task_addons.test.sql` -- assert bundle/legacy/section wrappers drop out; flat and shared bike rows stay -- lock the I/O matrix

**Acceptance Criteria:**
- Given a bundled bike task, when a mechanic opens it, then What's included / Not included lists the bike and extras and does not list the parent bundle title.
- Given a flat bike-only task, when a mechanic opens it, then the bike row is still listed.
- Given the same bundled order, when they open the order drawer, then the bundle parent is still on the full order.

## Spec Change Log

## Design Notes

`walk_up` already has the wrapper chain. Hide `walk_up` ids that are not seeds. Do not hide the seed even when it has children (bike with nested extras). Do not hide only the top root — a section above the bundle is also an ancestor.

```
seeds = this bike's order row(s)
ancestors = walk_up − seeds
addons = walk_down rows whose line id is not in ancestors
```

Shared local DB may still have Haribo's `20260902120000`. Do not `migration repair` it.

## Verification

**Commands:**
- `npm run test:db` -- addon-scope tests pass with wrappers omitted
- If Haribo foundation counts fail, run `supabase/tests/database/workshop_task_addons.test.sql` via local `psql` -- I/O matrix pass

**Manual checks:**
- Bundled `/workshop` task: no `Road Bike Rental bundle` line; Helmet / Pedals / Saddle remain. Order drawer still lists the bundle parent.

## Suggested Review Order

**Hide ancestor wrappers**

- Exclude `walk_up` ids that are not the bike seed from the addons aggregate
  [`20260902150000_workshop_task_hide_package_ancestors.sql:108`](../../supabase/migrations/20260902150000_workshop_task_hide_package_ancestors.sql#L108)

- Keep payload shape; only the tree walk result is filtered
  [`20260902150000_workshop_task_hide_package_ancestors.sql:117`](../../supabase/migrations/20260902150000_workshop_task_hide_package_ancestors.sql#L117)

**Tests**

- Bundled packages drop the wrapper and keep bike plus extras
  [`workshop_task_addons.test.sql:369`](../../supabase/tests/database/workshop_task_addons.test.sql#L369)

- Section over bundle drops both wrappers; nested extras under the bike stay
  [`workshop_task_addons.test.sql:430`](../../supabase/tests/database/workshop_task_addons.test.sql#L430)

