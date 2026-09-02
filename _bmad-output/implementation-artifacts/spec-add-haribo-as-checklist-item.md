---
title: 'Add Haribo pouch checklist item'
type: 'feature'
created: '2026-09-02'
status: 'done'
baseline_commit: '1b0a964c21eb3d1b894fb042fc12e8f23f4b3f99'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-automating-mechanics-daily-work/launch-checklists.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Prep checklists do not include attaching a Haribo pouch. Gravel and e-road tags still have no catalog, so those bikes cannot start preparation.

**Approach:** Add last item **Attach a haribo pouch to the bike** (`action`, required, M1-only, N/A allowed) to Road and E-city via new definition versions. Create **independent snapshot copies** of that new Road catalog for gravel and e-road (own definition keys/ids) so later Road edits do not apply to them. Leave storage and e-mtb unchanged. Local-only; no historical `bike_task_items` rewrite.

## Boundaries & Constraints

**Always:**
- Label exactly `Attach a haribo pouch to the bike`. Keys `ROAD-20` / `ECITY-23`, sort_order last. `required=true`, `m2_verifies=false`, `na_allowed=true`, `item_type=action`.
- Append-only catalogs: insert `road_bike_preparation` **v3** (prior 19 rows + `ROAD-20`) and `e_city_bike_preparation` **v2** (prior 22 + `ECITY-23`). Insert `gravel_bike_preparation` **v1** and `e_road_bike_preparation` **v1** as row-for-row copies of Road v3 (same `item_key` / `sort_order` / `label` / type / flags). `UPDATE` mappings only. Do not UPDATE/DELETE catalog rows. Do not rewrite `20260821120000_workshop_foundation.sql` or `20260824130000_workshop_prep_checklists.sql`.
- Map `workshop-road-bike` → Road v3, `workshop-e-city-bike` → e-city v2, `workshop-gravel-bike` → gravel v1, `workshop-e-road-bike` → e-road v1; all `enabled=true`. Each of those four mappings must have a **distinct** `definition_id`. Leave `workshop-e-mtb-bike` disabled / `definition_id` null. Do not change `prepare_for_storage`.
- New migration timestamp after `20260901140000`. Idempotent. Apply locally only (`supabase migration up` / `db reset`).
- Seed assertions and `pg_temp.make_task` keep resolving the **mapped** definition. PSI/N/A command keys stay `ROAD-10` / `ROAD-02` / `ROAD-16`.
- Source-apply tests that used gravel as the “no catalog” wipe target must retarget `workshop-e-mtb-bike`. In-progress road→gravel drift still warns (different `definition_id`). A later Road v4 must not change gravel/e-road item rows.

**Ask First:**
- Changing the label, M2, N/A, type, or position.
- Sharing one `definition_id` across road/gravel/e-road.
- Enabling or inventing an e-mtb catalog. Changing storage items. Renaming copied keys off `ROAD-01`…`20`.

**Never:**
- Workshop UI/RPC/command changes (rows already render from copied items).
- Rewriting in-progress `bike_task_items`. Remote/staging/production DDL.
- Pointing gravel or e-road at `road_bike_preparation`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fresh migrate | Local `migration up` | Road → v3 (20, last=`ROAD-20`); e-city → v2 (23, last=`ECITY-23`); gravel + e-road → own v1 copies (20 matching Road v3); four distinct definition ids; e-mtb disabled; storage still 6 | N/A |
| New gravel/e-road task | Identified assignment + apply | 20 copied ROAD items; start prep → `being_prepared` | N/A |
| New e-city task | Identified + apply | 23 ECITY items; start prep works | N/A |
| e-mtb / storage | `workshop-e-mtb-bike` or storage stage | e-mtb: no prep items, start blocked; storage catalog unchanged (no Haribo) | `CONFIGURATION_BLOCKED` on e-mtb start |
| In-progress task | `being_prepared` on older definition | Existing items stay; no catalog-row rewrite | N/A |
| Haribo N/A | M1 marks `ROAD-20` / `ECITY-23` N/A | M1 valid; item is not an M2 row | N/A |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260824130000_workshop_prep_checklists.sql` — copy this insert+remap pattern (repeat VALUES for gravel/e-road v1). **Read-only.**
- `supabase/migrations/20260821120000_workshop_foundation.sql` L59–85, L234–241 — append-only catalog + triggers. L377–406 `workshop_copy_definition_items`. L611–654 start prep needs enabled mapping + matching `selected_definition_id` + copied items. **Do not rewrite seeds.**
- `supabase/migrations/20260821160000_workshop_source_apply.sql` L252–296 `booqable_resolve_workshop_tag` (enabled+definition ⇒ no warning); L480–548 `to_prepare` replace vs wipe; in-progress drift warns when `definition_id` differs (road↔gravel will warn).
- `_bmad-output/specs/spec-automating-mechanics-daily-work/launch-checklists.md` — contract tables tests pin to. Add `ROAD-20` / `ECITY-23`; add Gravel + E-road as snapshot copies of Road (own tags/keys `gravel_bike_preparation` / `e_road_bike_preparation`); leave STORAGE; **Checklists Still Required** = e-mtb only.
- `supabase/tests/database/workshop_foundation.test.sql` L242–666 seed pins (19/22, v2/v1, three disabled tags); L716–724 gravel/e-road fixtures are warning+no-copy; L780–793 assert gravel/e-road `CONFIGURATION_BLOCKED`; L852 `>= 19` detail length (still valid). L119–128 `make_task` already copies the tag’s mapped def.
- `supabase/tests/database/workshop_source_apply.test.sql` L268–278 / L913–923 expect 19 ROAD copies; L1510–1520 e-city re-enable expects 22; L821–906 road→gravel wipe (retarget to e-mtb — gravel now replaces, not clears); L1084–1135 gravel warning-only (invert mint/start); L1139–1208 in-progress drift to gravel can stay (still warns).
- `src/app/workshop/_components/WorkshopTask.tsx` — generic over copied flags. **Read-only.**

## Tasks & Acceptance

**Execution:**
- [x] `_bmad-output/specs/spec-automating-mechanics-daily-work/launch-checklists.md` -- Append `ROAD-20` / `ECITY-23` with the frozen flags; document gravel + e-road as independent snapshot copies of Road; keep STORAGE; leave only e-mtb under still-required -- pgTAP matches this file.
- [x] `supabase/migrations/20260902120000_workshop_haribo_checklist_item.sql` -- Insert Road v3, e-city v2, gravel v1, e-road v1 (last two = copy of Road v3 rows); remap each tag to its own definition (`enabled=true`). `ON CONFLICT DO NOTHING` on catalog inserts. -- append-only; mapping is the active pointer.
- [x] `supabase/tests/database/workshop_foundation.test.sql` -- Pin mapped Road 20 / e-city 23 / gravel 20 / e-road 20; versions 3 / 2 / 1 / 1; distinct definition ids; only e-mtb disabled; gravel + e-road fixtures copy items and start prep succeeds -- current pins and blocked-tag asserts will fail.
- [x] `supabase/tests/database/workshop_source_apply.test.sql` -- Expect 20 ROAD / 23 e-city copies; gravel mint copies 20 items and start prep works; use e-mtb for to_prepare wipe -- gravel is no longer an empty catalog.

**Acceptance Criteria:**
- Given a fresh local migrate, when reading `checklist_tag_mappings`, then road → `road_bike_preparation` v3, e-city → `e_city_bike_preparation` v2, gravel → `gravel_bike_preparation` v1, e-road → `e_road_bike_preparation` v1, all enabled, all distinct ids, each of the three 20-item catalogs ending with label `Attach a haribo pouch to the bike`.
- Given an identified gravel or e-road task with copied prep items, when a mechanic starts preparation, then status is `being_prepared`.
- Given e-mtb, when a mechanic starts preparation, then the command returns `CONFIGURATION_BLOCKED`.
- Given `prepare_for_storage` v1, when reading its items, then the six storage rows are unchanged and none is the Haribo label.
- Given M1 on `ROAD-20` or `ECITY-23`, when the mechanic selects N/A, then M1 may complete and M2 does not require that item.

## Spec Change Log

## Design Notes

Gravel and e-road are snapshot copies, not a shared pointer. A future Road v4 leaves `gravel_bike_preparation` v1 and `e_road_bike_preparation` v1 untouched.

Source-apply wipe/warn keys off `definition_id` inequality. road→gravel on `to_prepare` **replaces** items (20→20, new def); it does not clear them. Use still-disabled `workshop-e-mtb-bike` for wipe-to-zero tests. In-progress road→gravel still sets a configuration warning.

`to_prepare` tasks pick up new versions on the next apply (replace when `selected_definition_id` differs). Do not backfill `being_prepared` rows.

Apply the new migration locally. `supabase db reset` is allowed if the local stack is wedged; do not push DDL.

## Verification

**Commands:**
- `npx supabase migration up --local` -- expected: `20260902120000` applied.
- `npm run test:db` -- expected: foundation + source-apply pgTAP pass, including Haribo seed pins, gravel/e-road start-prep, distinct definition ids, and e-mtb still blocked.

## Suggested Review Order

**Catalog versions**

- New Road v3 last row: Haribo, M1-only, N/A allowed
  [`20260902120000_workshop_haribo_checklist_item.sql:48`](../../supabase/migrations/20260902120000_workshop_haribo_checklist_item.sql#L48)

- Same flags on e-city v2 as `ECITY-23`
  [`20260902120000_workshop_haribo_checklist_item.sql:82`](../../supabase/migrations/20260902120000_workshop_haribo_checklist_item.sql#L82)

- Gravel v1 is a VALUES copy of Road v3, own definition
  [`20260902120000_workshop_haribo_checklist_item.sql:115`](../../supabase/migrations/20260902120000_workshop_haribo_checklist_item.sql#L115)

**Mappings**

- Road/e-city pointers move; gravel and e-road enable on their copies
  [`20260902120000_workshop_haribo_checklist_item.sql:149`](../../supabase/migrations/20260902120000_workshop_haribo_checklist_item.sql#L149)

**Contract**

- Launch tables gain `ROAD-20` / `ECITY-23`; gravel/e-road documented as snapshots
  [`launch-checklists.md:30`](../specs/spec-automating-mechanics-daily-work/launch-checklists.md#L30)

**Tests**

- Gravel/e-road flags locked to Road v3 via EXCEPT, not the live Road mapping
  [`workshop_foundation.test.sql:694`](../../supabase/tests/database/workshop_foundation.test.sql#L694)

- Distinct definition ids; only e-mtb stays disabled
  [`workshop_foundation.test.sql:847`](../../supabase/tests/database/workshop_foundation.test.sql#L847)

- Gravel start prep succeeds once items are copied
  [`workshop_foundation.test.sql:1005`](../../supabase/tests/database/workshop_foundation.test.sql#L1005)

- Haribo N/A is valid and skipped by M2
  [`workshop_foundation.test.sql:1300`](../../supabase/tests/database/workshop_foundation.test.sql#L1300)

- `to_prepare` road→gravel replaces onto gravel v1, does not wipe
  [`workshop_source_apply.test.sql:937`](../../supabase/tests/database/workshop_source_apply.test.sql#L937)

- In-progress drift freezes original item ids and road `selected_definition_id`
  [`workshop_source_apply.test.sql:1262`](../../supabase/tests/database/workshop_source_apply.test.sql#L1262)

