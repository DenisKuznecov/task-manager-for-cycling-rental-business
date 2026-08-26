---
title: 'Workshop prep checklists (road + e-city)'
type: 'feature'
created: '2026-08-24'
status: 'done'
baseline_commit: 'ddc9b89f59df7bf1918f2c7da1eb18149b0ec183'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-automating-mechanics-daily-work/launch-checklists.md'
  - '{project-root}/_bmad-output/specs/spec-automating-mechanics-daily-work/checklist-contract.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Road prep still uses the 25-item paper list; `workshop-e-city-bike` is disabled with no catalog, so e-city bikes cannot start preparation.

**Approach:** Replace the active road catalog with the 19-item list below and enable e-city with the 22-item list. Leave storage and the other three tags unchanged. Local-only: new definition versions + mapping update; no historical task rewrite.

Columns: `a` = `action`, `psi` = `tyre_pressure_psi`. `m2` / `na` are yes/no. Every item is `required`. Keys `ROAD-01`…`19` and `ECITY-01`…`22` in listed order.

**Road** (`workshop-road-bike`):
1. Bikefit applied — a, m2 no, na yes
2. Bike cleaned — a, no, no
3. Check frame and components for damage — a, no, no
4. Rewax chain — a, no, na yes
5. Check brake pads wear, pins checked — a, no, no
6. Check rotors wear — a, no, no
7. Adjust brakes — a, m2 yes, no
8. Adjust gears — a, m2 yes, no
9. Tighten pedals and cranks — a, no, no
10. Check front tyre wear, pressure PSI — psi, m2 yes, no
11. Check rear tyre wear, pressure PSI — psi, m2 yes, no
12. Adjust headset preload — a, no, no
13. Check saddle level — a, no, no
14. Bolt check — stem, handlebar, saddle — a, m2 yes, no
15. Bag/pump/comp mount — a, m2 yes, no
16. Charger/lube with a bike — a, m2 yes, na yes
17. Charge + check shifting batteries — a, m2 yes, no
18. Check powermeter battery — a, no, na yes
19. Customer name on a bike — a, no, no

**E-city** (`workshop-e-city-bike`):
1. Check bike, bag cleaned — a, no, no
2. Check frame and components for damage — a, no, no
3. Check front brake performance — a, m2 yes, no
4. Check rear brake performance — a, m2 yes, no
5. Check rear derailleur shifting — a, m2 yes, no
6. Torque check: stem and handlebar — a, m2 yes, no
7. Torque check: seatpost and saddle clamp — a, m2 yes, no
8. Torque check: front and rear thru-axle — a, m2 yes, no
9. Check headset for play — a, m2 yes, no
10. Check front wheel is true — a, no, no
11. Check front tyre for wear, cuts, and cracks — a, m2 yes, no
12. Check rear wheel is true — a, no, no
13. Check rear tyre for wear, cuts, and cracks — a, m2 yes, no
14. Set front tyre pressure PSI — psi, m2 yes, no
15. Set rear tyre pressure PSI — psi, m2 yes, no
16. Check main battery level (>80%) — a, m2 yes, no
17. Check saddle bag contents, pump — a, m2 yes, no
18. Verify charger and lock included — a, m2 yes, no
19. Verify keys matched and included — a, m2 yes, no
20. Customer name tag attached — a, no, no
21. Check saddle level — a, no, no
22. Bikefit applied — a, no, na yes

## Boundaries & Constraints

**Always:**
- Use the labels above (spelling fixed from the paper paste; meaning unchanged).
- `checklist_definitions` / `checklist_definition_items` are append-only. Insert `road_bike_preparation` **version 2** and `e_city_bike_preparation` **version 1**. Point `checklist_tag_mappings` at those ids; enable e-city. Do not UPDATE/DELETE catalog rows. Do not rewrite `20260821120000_workshop_foundation.sql` seeds.
- New migration timestamp after `20260824120000_workshop_reapply_checklist_on_unchanged_snapshot.sql`. Idempotent. Apply locally only.
- Seed assertions and `pg_temp.make_task` copy the **mapped** definition, not hardcoded version 1. PSI/N/A command tests follow the new keys: PSI `ROAD-10`; disallowed N/A `ROAD-02`; allowed N/A+M2 `ROAD-16`.

**Ask First:**
- Changing any label, M2, N/A, or type away from the lists above.
- Enabling or inventing items for `workshop-e-mtb-bike`, `workshop-gravel-bike`, or `workshop-e-road-bike`.

**Never:**
- Workshop UI/RPC/command changes (rows already render from copied items).
- Storage checklist changes. Remote/staging/production DDL.
- Migrating or rewriting existing `bike_task_items` rows.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mapped road seed | Fresh local migrate | Mapping enabled; 19 ROAD items on v2; start prep still works | N/A |
| Mapped e-city seed | Fresh local migrate | Mapping enabled; 22 ECITY items; start prep works when items copied | N/A |
| Remaining tags | e-mtb / gravel / e-road | Still disabled; start prep blocked | `CONFIGURATION_BLOCKED` |
| PSI / N/A guards | `ROAD-10` null/0/− PSI; `ROAD-02` N/A; `ROAD-16` N/A then M2 confirm | Same reject/confirm behavior as today | `INCOMPLETE_CHECKLIST` on bad PSI/N/A |
| Mapping re-enable | Disable e-city, apply, then enable real e-city def on unchanged snapshot | Warning clears; 22 prep items copied | N/A |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260821120000_workshop_foundation.sql` L59–85, L234–331 — append-only catalog; ROAD v1 25 items; e-city mapping `NULL, false`. **Do not rewrite seeds.**
- `supabase/migrations/20260821120000_workshop_foundation.sql` L377–406, L611–654 — copy-on-mint; start prep requires enabled mapping + matching `selected_definition_id` + copied prep items.
- `supabase/migrations/20260824120000_workshop_reapply_checklist_on_unchanged_snapshot.sql` — uncommitted; new catalog migration must sort after this timestamp.
- `_bmad-output/specs/spec-automating-mechanics-daily-work/launch-checklists.md` — contract tables to replace/extend; leave STORAGE; remaining tags still listed as required.
- `supabase/tests/database/workshop_foundation.test.sql` L119–128, L239–489, L539–616, L845–927 — v1/25-item assertions; `make_task` copies ROAD v1; e-city fixture is warning+blocked; PSI=`ROAD-16`, no-N/A=`ROAD-01`, N/A+M2=`ROAD-05`.
- `supabase/tests/database/workshop_source_apply.test.sql` L1318–1412 — toggles e-city mapping onto ROAD v1 and expects 25 copied items.
- `src/app/workshop/_components/WorkshopTask.tsx` / `workshop-ui.ts` — generic over `itemType` / `m2Verifies` / `naAllowed`. **Read-only.**
- `src/workshop-ui.test.mts` L18–36 — dummy `ROAD-01` fixture; leave unless it starts asserting catalog copy.

## Tasks & Acceptance

**Execution:**
- [x] `_bmad-output/specs/spec-automating-mechanics-daily-work/launch-checklists.md` -- Replace the Road table with ROAD-01..19; add an E-city section (`workshop-e-city-bike`, ECITY-01..22) matching the frozen lists; keep STORAGE; keep e-mtb/gravel/e-road under Checklists Still Required -- contract is what seeds and pgTAP must match.
- [x] `supabase/migrations/20260824130000_workshop_prep_checklists.sql` -- Insert ROAD v2 + e-city v1 items; `UPDATE` mappings (road → v2, e-city → new def `enabled=true`). Idempotent `ON CONFLICT DO NOTHING` on catalog inserts. -- append-only catalog; mapping is the active-version pointer.
- [x] `supabase/tests/database/workshop_foundation.test.sql` -- Assert mapped ROAD 19 / ECITY 22 keys, labels, types, m2, na; three tags remain disabled; `make_task` copies the tag’s mapped definition; e-city start prep succeeds; retarget PSI/N/A keys -- current tests pin v1 and disabled e-city.
- [x] `supabase/tests/database/workshop_source_apply.test.sql` -- Mapping-enable fixture must re-enable the real e-city definition and expect 22 items, not ROAD v1/25 -- otherwise apply tests keep copying the retired catalog.

**Acceptance Criteria:**
- Given a fresh local migrate, when reading `checklist_tag_mappings`, then `workshop-road-bike` points at `road_bike_preparation` v2 (19 items) and `workshop-e-city-bike` is enabled on `e_city_bike_preparation` v1 (22 items).
- Given an identified e-city task with copied prep items, when a mechanic starts preparation, then status is `being_prepared`.
- Given e-mtb, gravel, or e-road, when a mechanic starts preparation, then the command returns `CONFIGURATION_BLOCKED`.
- Given the task page, when a road or e-city checklist is shown, then M1/M2/N/A/PSI behavior is unchanged because items still use the existing types and flags.

## Spec Change Log

## Design Notes

Catalog rows cannot be updated (trigger `checklist_definition_items_append_only`). Editing the original foundation `INSERT … ON CONFLICT DO NOTHING` would no-op on an already-migrated local DB. Version the road definition and retarget the mapping.

`pg_temp.make_task(..., p_copy_road)` should resolve `definition_id` from `checklist_tag_mappings` for `p_tag`, not `road_bike_preparation` v1.

Apply the new migration locally (`supabase migration up`). `supabase db reset` is allowed if the local stack is wedged; do not push DDL.

## Verification

**Commands:**
- `npx supabase migration up --local` -- expected: `20260824130000` applied (and `20260824120000` if it was not yet).
- `npm run test:db` -- expected: foundation + source-apply pgTAP pass, including new seed and e-city start-prep assertions.
- `npm run test:workshop-ui` -- expected: still pass (UI is catalog-agnostic).

## Suggested Review Order

**Active catalogs**

- New ROAD v2 and e-city v1 rows; foundation v1 seeds left untouched.
  [`20260824130000_workshop_prep_checklists.sql:5`](../../supabase/migrations/20260824130000_workshop_prep_checklists.sql#L5)

- Mapping retargets road to v2 and enables e-city on its v1 definition.
  [`20260824130000_workshop_prep_checklists.sql:76`](../../supabase/migrations/20260824130000_workshop_prep_checklists.sql#L76)

**Contract tables**

- Road table is now ROAD-01..19; wording and flags match the frozen list.
  [`launch-checklists.md:3`](../specs/spec-automating-mechanics-daily-work/launch-checklists.md#L3)

- E-city section added; STORAGE unchanged; three tags remain required.
  [`launch-checklists.md:35`](../specs/spec-automating-mechanics-daily-work/launch-checklists.md#L35)

**Tests**

- `make_task` copies the tag’s mapped definition, not hardcoded ROAD v1.
  [`workshop_foundation.test.sql:119`](../../supabase/tests/database/workshop_foundation.test.sql#L119)

- Mapped seed pins: 19 road items, 22 e-city, three tags still disabled.
  [`workshop_foundation.test.sql:242`](../../supabase/tests/database/workshop_foundation.test.sql#L242)

- E-city start prep succeeds; e-mtb/gravel/e-road stay `CONFIGURATION_BLOCKED`.
  [`workshop_foundation.test.sql:774`](../../supabase/tests/database/workshop_foundation.test.sql#L774)

- PSI/N/A guards retargeted to ROAD-10 / ROAD-02 / ROAD-16.
  [`workshop_foundation.test.sql:1028`](../../supabase/tests/database/workshop_foundation.test.sql#L1028)

- Mapping re-enable copies the real e-city catalog (22 items), not ROAD v1.
  [`workshop_source_apply.test.sql:1358`](../../supabase/tests/database/workshop_source_apply.test.sql#L1358)
