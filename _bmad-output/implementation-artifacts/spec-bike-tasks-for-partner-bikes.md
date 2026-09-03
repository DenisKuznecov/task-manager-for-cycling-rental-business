---
title: 'Bike tasks for partner bikes'
type: 'feature'
created: '2026-09-03'
status: 'done'
baseline_commit: '278141c358db8ab8ce2927b09e5278e5709f9612'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-automating-mechanics-daily-work/launch-checklists.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Partner bikes in Booqable have no stock numbers, so sync never mints a workshop task. Mechanics cannot prep those rentals.

**Approach:** Treat product tag `workshop-partner-bike` (alone) as enough to mint one task per line quantity, with a short partner checklist. Persist display id `Partner Bike` and the Booqable line title as the bike name. Skip the stock-id requirement only for that tag.

## Boundaries & Constraints

**Always:**
- Tag is the only `workshop-*` tag on the product. Map it to a new append-only catalog `partner_bike_preparation` **v1** (keys `PARTNER-01`…`06`, all `required`, all `na_allowed`). Types/flags:
  1. Check saddle bag, charger — action, M2
  2. Tyre pressure front — `tyre_pressure_psi`, M2
  3. Tyre pressure back — `tyre_pressure_psi`, M2
  4. Attach haribo pouch — action, M1-only
  5. Bolt check stem, saddle, handlebar — action, M2
  6. Check computer mount — action, M2
- Mint in `parseAssignments` only: if the product’s workshop tags are exactly `["workshop-partner-bike"]` and the line has **zero** stock-item plannings (missing planning counts as zero), emit **one assignment per unit**. Quantity: integer `≥ 1` → that many; `null` → 1; `≤ 0` → none. If any SIP exists, keep the existing stock path (no extra synthetics). Do not `continue` on a missing planning before this check.
- Synthetic identity (stable under qty change): `stockItemId` = `partner:{lineId}:{n}`, `sipId` = `partner-sip:{lineId}:{n}`, `n` = 1…qty. `displayId` = `Partner Bike`. `title` = line title. `booqableLineId` = line id. `workshopTags` = `["workshop-partner-bike"]`. Qty 2→1 cancels `:2` and retains `:1`.
- Do not change Zod assignment shape, apply C−P, or `booqable_stock_item_id` NOT NULL. Unidentified non-partner empty-SIP lines stay omitted. Storage catalog and e-mtb stay unchanged. Insert mapping `workshop-partner-bike` enabled on the new def. New migration after `20260902140000`. Local DDL only. `make_task` keeps resolving the mapped definition.

**Ask First:**
- Changing any label, M2, N/A, type, or synthetic id format.
- Emitting partner synthetics when SIPs exist, or minting from qty when another `workshop-*` tag is also present.

**Never:**
- Nullable stock ids, rewriting uniqueness off `stock_item_id`, or rewriting old catalog/apply seed migrations.
- Workshop UI/RPC/command changes (queue and task already show `bikeDisplayId` / `bikeTitle`).
- Remote/staging/production DDL. Enabling e-mtb. Historical `bike_task_items` rewrite.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Partner qty 1 | Line, empty SIPs, only `workshop-partner-bike` | 1 assignment/task; display `Partner Bike`; title = line title; 6 copied items; start prep → `being_prepared` | N/A |
| Partner qty 2 | Same, quantity 2 | Tasks `…:1` and `…:2`; each has the partner catalog | N/A |
| Qty 2→1 | Re-apply quantity 1 | Retain `:1`; cancel `:2` | N/A |
| Empty SIP, other tag | Gravel/unidentified, no stock | Still omitted from assignments | N/A |
| Owned stock bike | Existing SIP assignment | Unchanged stock id / display / catalog | N/A |
| Partner PSI N/A | M1 marks `PARTNER-02`/`03` N/A | M1 valid; M2 hides those rows | N/A |
| e-mtb | Disabled mapping | Start still blocked | `CONFIGURATION_BLOCKED` |

</frozen-after-approval>

## Code Map

- `src/lib/booqable/parse-source-snapshot.ts` L118–127, L193–243 — `workshopTagsFromProduct` already filters `workshop-*` minus `*-bundle`. Today a missing `planning` `continue`s at L201 and empty SIPs emit nothing. Resolve product tags first; partner+zero SIPs emit synthetics; do not change the stock SIP loop.
- `src/lib/workshop/domain/source-snapshot.ts` L8–15 — keep `stockItemId` / `sipId` / `booqableLineId` required; synthetics satisfy them.
- `supabase/migrations/20260821160000_workshop_source_apply.sql` L233–246, L252–295, L888–945 — apply already rejects empty ids, diffs on `stockItemId`, resolves a single tag. **Read-only.**
- `supabase/migrations/20260902140000_workshop_task_addons_scope.sql` L24–38 — create writes `displayId` / `title` / `booqableLineId`. **Read-only.**
- `supabase/migrations/20260902120000_workshop_haribo_checklist_item.sql` — copy insert+remap; **do not rewrite**. New file `20260903120000_workshop_partner_bike_checklist.sql`.
- `supabase/migrations/20260821120000_workshop_foundation.sql` L87–123, L360–375 — NOT NULL stock id + unique open instance; PSI N/A already valid when `na_allowed`. **Do not rewrite seeds.**
- `_bmad-output/specs/spec-automating-mechanics-daily-work/launch-checklists.md` — add Partner table; leave STORAGE; e-mtb still required.
- `src/app/workshop/_components/workshop-ui.ts` L21–36, `WorkshopQueue.tsx` L84–86 / L484–490, `WorkshopTask.tsx` L462 / L470 — show `bikeDisplayId` then title. **Read-only.**
- `src/booqable-source-apply.test.mts` L96–138 — empty-SIP gravel stays omitted; add partner qty 1 / qty 2 / qty drop cases.
- `supabase/tests/database/workshop_foundation.test.sql` L860–903 — four enabled mappings / only e-mtb disabled will fail; pin partner 6 items and start-prep.
- `supabase/tests/database/workshop_source_apply.test.sql` — add partner assignment fixture (qty 2→1 cancel) using the same `stockItemId` keys the parser emits.

## Tasks & Acceptance

**Execution:**
- [x] `_bmad-output/specs/spec-automating-mechanics-daily-work/launch-checklists.md` -- Add Partner (`workshop-partner-bike`, `PARTNER-01`…`06`) matching the frozen list -- pgTAP pins this file
- [x] `supabase/migrations/20260903120000_workshop_partner_bike_checklist.sql` -- Insert `partner_bike_preparation` v1 + mapping `workshop-partner-bike` enabled -- append-only catalog
- [x] `src/lib/booqable/parse-source-snapshot.ts` -- Emit one synthetic assignment per partner unit when SIPs are empty -- apply stays stock-id based
- [x] `src/booqable-source-apply.test.mts` -- Cover partner qty 1, qty 2, qty 2→1 keys, and non-partner empty SIP still omitted -- lock parser contract
- [x] `supabase/tests/database/workshop_foundation.test.sql` -- Pin partner 6 items/flags; five distinct enabled defs; e-mtb still only disabled; start prep succeeds -- current “four enabled” pin breaks
- [x] `supabase/tests/database/workshop_source_apply.test.sql` -- Partner qty-2 snapshot mints two tasks; qty-1 retain/cancel; owned SIP path unchanged -- prove apply accepts synthetics

**Acceptance Criteria:**
- Given a reserved partner-tagged line with no stock plannings and quantity 2, when the snapshot is parsed and applied, then two `to_prepare` tasks exist with display id `Partner Bike`, titles from the line, tag `workshop-partner-bike`, and six copied items.
- Given that order’s quantity becomes 1, when apply runs again, then `partner:{lineId}:1` is retained and `partner:{lineId}:2` is cancelled.
- Given an empty-SIP line tagged `workshop-gravel-bike` (or any non-partner tag), when parsed, then it still produces no assignment.
- Given a fresh local migrate, when reading mappings, then `workshop-partner-bike` is enabled on `partner_bike_preparation` v1 and `workshop-e-mtb-bike` stays disabled.

## Spec Change Log

## Verification

**Commands:**
- `npx supabase migration up --local` -- expected: `20260903120000` applied
- `npm run test:source-apply` -- expected: pass, including partner emit and unidentified omit
- `npm run test:db` -- expected: foundation + source-apply pgTAP pass, including partner pins and qty 2→1
- `npm run test:workshop-ui` -- expected: still pass (UI unchanged)

## Suggested Review Order

**Parser minting**

- Tags first, then empty/missing SIPs emit one synthetic per quantity
  [`parse-source-snapshot.ts:236`](../../src/lib/booqable/parse-source-snapshot.ts#L236)

- Partner-only tag; extra `workshop-*` tags mint nothing
  [`parse-source-snapshot.ts:131`](../../src/lib/booqable/parse-source-snapshot.ts#L131)

- Null quantity is one unit; zero or less is none
  [`parse-source-snapshot.ts:135`](../../src/lib/booqable/parse-source-snapshot.ts#L135)

**Catalog**

- Six-item partner checklist, all required, all N/A, Haribo M1-only
  [`20260903120000_workshop_partner_bike_checklist.sql:11`](../../supabase/migrations/20260903120000_workshop_partner_bike_checklist.sql#L11)

- Enable `workshop-partner-bike` on `partner_bike_preparation` v1
  [`20260903120000_workshop_partner_bike_checklist.sql:25`](../../supabase/migrations/20260903120000_workshop_partner_bike_checklist.sql#L25)

- Contract table plus N/A/M2 copy that matches runtime
  [`launch-checklists.md:84`](../specs/spec-automating-mechanics-daily-work/launch-checklists.md#L84)

**Tests**

- Parser qty, missing planning, extra tag, and SIP-still-stock
  [`booqable-source-apply.test.mts:161`](../../src/booqable-source-apply.test.mts#L161)

- Seed pins, start prep, and PSI N/A through M2
  [`workshop_foundation.test.sql:856`](../../supabase/tests/database/workshop_foundation.test.sql#L856)

- Apply qty-2 mint and qty 2→1 retain/cancel
  [`workshop_source_apply.test.sql:1672`](../../supabase/tests/database/workshop_source_apply.test.sql#L1672)
