---
title: 'Fix bike-task included items'
type: 'bugfix'
created: '2026-09-02'
status: 'done'
baseline_commit: '1b0a964c21eb3d1b894fb042fc12e8f23f4b3f99'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Opening a bike task shows every row from the parent order in What's included / Not included. A mechanic preparing one bike also sees every other bike and every extra.

**Approach:** v1 shows the rows in this bike's package. Bundles already nest extras under a parent, so that package is the parent tree. Flat orders put extras next to bikes with no parent, so v1 only hides the other bikes; loose extras stay on the order drawer. We will tune flat orders after seeing this on real data.

## Boundaries & Constraints

**Always:**
- Filter in PostgreSQL inside `private.workshop_task_detail`. Do not filter `order_items` in Node or the client.
- A package is the bike's order row plus ancestors and descendants via `parent_booqable_line_id`.
- Remember which order row is this bike: persist `booqable_line_id` on `booqable_assignment_instances` from the source assignment (`booqableLineId`). Create and retain both write it. Treat blank as missing.
- If that row id is missing, fall back to `order_items.title = bike_tasks.bike_title` on the same order. Several matches → those packages only, never the rest of the order.
- Keep the addons payload shape (`id`, `title`, `quantity`, `lineType`) and all other detail fields.
- Leave declined-vs-included splitting in `AddonsList` (`/^no\b/i`).
- Local idempotent migration only. Cover bundle + flat in pgTAP.

**Ask First:**
- Put loose same-level extras (flat helmets, delivery) onto every bike task.
- Change `addon_fingerprint` or the M2 `addon_snapshot` from whole-order to per-task.
- Hosted/staging/production DDL.

**Never:**
- Change `OrderDetailsDrawer` / `useOpenOrderDetails` (full order stays there).
- New user-facing RPCs, checklist/lifecycle changes, or Booqable HTTP from this story.
- JS/ORM aggregation of the order's items. Vitest. Guess which flat extra belongs to which bike by size.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Two bundles | Two parent packages; each has a bike + extras | Each task's `addons` is only its package | N/A |
| Flat bikes | Two top-level bikes + sibling helmets + delivery | Each task's `addons` is only its bike row | N/A |
| Shared qty-2 line | One bike row `quantity=2`, two tasks, same row id | Both tasks see that row (and its package) | N/A |
| No items | Order has zero `order_items` | `addons: []`; UI shows "None" | N/A |
| Legacy null row id | Row id null; exactly one title match | Same package as if linked | N/A |
| Partner detail | Partner session | RPC still returns null | Unchanged |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260821120000_workshop_foundation.sql` L1276–1288 — **bug:** `addons` is every `order_items` row on the order. Replace this query in a new migration; keep the rest of the jsonb payload.
- `supabase/migrations/20260821120000_workshop_foundation.sql` L918–932 — `complete_m2` still snapshots all order items. **Read-only.**
- `supabase/migrations/20260610151000_add_order_items_and_payment_fields.sql` L5–22 — `booqable_line_id`, `parent_booqable_line_id`, `title`, `quantity`, `line_type`, `position`.
- `supabase/migrations/20260821120000_workshop_foundation.sql` L87–99, L101–110 — instances / tasks have stock id but **no order-row id**. Add `booqable_line_id` on the instance.
- `supabase/migrations/20260821160000_workshop_source_apply.sql` L347–377 (now `booqable_create_instance_task_inner`) and L433–456 (retain) — write `p_assignment->>'booqableLineId'`. Retain must not wipe an existing id when the key is missing.
- `src/lib/workshop/domain/source-snapshot.ts` L8–14 — add `booqableLineId` to `SourceAssignmentV1Schema`.
- `src/lib/booqable/parse-source-snapshot.ts` L193–242 — set `booqableLineId: line.id` on each assignment.
- `src/lib/workshop/data/tasks.ts` L317–331, L415–421 — maps addons as-is. **No filter here.**
- `src/app/workshop/_components/WorkshopTask.tsx` L527, L770–867 — `AddonsList` only splits declined.
- `src/app/workshop/_components/workshop-ui.ts` L410–422 — `parseAddonTitle`; reuse.
- `src/booqable-source-apply.test.mts` L79–84, L280 — assert `booqableLineId` (`line-bike` on the fixture).
- `supabase/tests/database/workshop_foundation.test.sql` L847–859, L1212 — detail exists / partner-null; keep passing.
- `supabase/tests/database/workshop_queue.test.sql` L154–159 — `stops_at` still present after replace.

**New files:**
- `supabase/migrations/20260902140000_workshop_task_addons_scope.sql`
- `supabase/tests/database/workshop_task_addons.test.sql`

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/workshop/domain/source-snapshot.ts` + `src/lib/booqable/parse-source-snapshot.ts` -- emit `booqableLineId` on each assignment -- remember which order row is this bike
- [x] `src/booqable-source-apply.test.mts` -- assert line id on parsed assignments -- keep apply contract honest
- [x] `supabase/migrations/20260902140000_workshop_task_addons_scope.sql` -- persist row id; scope detail addons to the package -- fix the leak in one RPC
- [x] `supabase/tests/database/workshop_task_addons.test.sql` -- pgTAP the I/O matrix -- prove bundle vs flat vs fallback

**Acceptance Criteria:**
- Given a multi-bike order, when a mechanic opens one task, then What's included / Not included lists only that task's package.
- Given the same order, when they open the order drawer, then the full order is unchanged.
- Given two tasks that share one qty-2 bike row, when either opens, then they see that shared row's package and not the other sizes.

## Spec Change Log

## Design Notes

**v1 rule:** walk `parent_booqable_line_id` to the package root, then take that whole tree. Works when extras are nested (bundles). On flat orders, extras have no parent, so they stay off the task.

```
task.instance.booqable_line_id = the bike's order row
root = walk parents to null
addons = rows whose root is that root
```

**Parked — try on real orders, then decide:**
- If Booqable replaces the bike row, fall back to the name match instead of showing None.
- Two bikes inside one package: hide the other bike, keep shared extras.
- Walk must stop on loops / missing parents (do this in v1 SQL anyway so the query cannot hang).
- Do not invent size-matching for loose helmets.

## Verification

**Commands:**
- `npm run test:source-apply` -- parse assignments include `booqableLineId`; existing snapshot cases still pass
- `npm run test:db` -- new addon-scope tests pass; foundation/queue detail assertions still pass

## Suggested Review Order

**Package scoping**

- Walk the parent tree in SQL so the task page never filters the order in JS
  [`20260902140000_workshop_task_addons_scope.sql:218`](../../supabase/migrations/20260902140000_workshop_task_addons_scope.sql#L218)

- Detail payload still uses the same addons shape; only the source query changed
  [`20260902140000_workshop_task_addons_scope.sql:414`](../../supabase/migrations/20260902140000_workshop_task_addons_scope.sql#L414)

**Remember which order row is this bike**

- New syncs store the Booqable line id on the assignment
  [`20260902140000_workshop_task_addons_scope.sql:37`](../../supabase/migrations/20260902140000_workshop_task_addons_scope.sql#L37)

- Re-sync without that key must not wipe a stored id
  [`20260902140000_workshop_task_addons_scope.sql:118`](../../supabase/migrations/20260902140000_workshop_task_addons_scope.sql#L118)

- Parser emits the line id from the bike's order row
  [`parse-source-snapshot.ts:235`](../../src/lib/booqable/parse-source-snapshot.ts#L235)

**Tests**

- Bundle vs flat vs shared-qty vs title fallback
  [`workshop_task_addons.test.sql:350`](../../supabase/tests/database/workshop_task_addons.test.sql#L350)

- Create/retain actually persist the line id
  [`workshop_task_addons.test.sql:312`](../../supabase/tests/database/workshop_task_addons.test.sql#L312)
