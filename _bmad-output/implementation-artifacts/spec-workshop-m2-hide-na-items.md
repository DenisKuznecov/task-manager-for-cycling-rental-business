---
title: 'Hide M1 N/A items from M2 re-check'
type: 'bugfix'
created: '2026-08-28'
status: 'done'
baseline_commit: '5f361f3000a4a39365baed2605d03c558848ea0a'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-automating-mechanics-daily-work/checklist-contract.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** M1 can mark some prep items N/A, but M2 still sees those rows during re-check and must confirm them. That contradicts how mechanics use N/A: the item is out of scope, not something to re-verify.

**Approach:** If M1 recorded `not_applicable`, M2 does not see that item and `workshop_complete_m2` does not require confirming it. Catalog flags stay as they are. This overrides the old checklist-contract rule that M2 must confirm N/A.

## Boundaries & Constraints

**Always:**
- Hide a preparation item from M2 when `m2Verifies` is true and `m1Outcome === "not_applicable"`.
- `private.workshop_m2_ready` must treat those rows as not requiring `m2_confirmed`, so Complete M2 can succeed on in-flight `needs_recheck` tasks with no data backfill.
- New local-only idempotent migration after `20260826120000_workshop_sync_retry_counters.sql`. `CREATE OR REPLACE` `private.workshop_m2_ready` only. Do not rewrite `20260821120000_workshop_foundation.sql`.
- Keep M1 N/A, PSI confirm, add-on fingerprint, and same-person M2 behavior unchanged.
- Log command failures with `workshop:`. Apply the migration locally only.

**Ask First:**
- Showing M2 a skipped/N/A summary instead of hiding the row.
- Changing which catalog items have `m2_verifies` or `na_allowed`.
- Rejecting `workshop_confirm_m2_item` on an N/A row (leave the RPC callable; the UI simply never offers it).

**Never:**
- Rewrite checklist definition seeds or remap tags.
- Change storage (no M2). Do not auto-write `m2_confirmed` at M1 complete.
- Apply the migration to staging/production.
- Edit planning artifacts or old workshop specs.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Hide N/A | `needs_recheck`; ROAD-16 is N/A; other M2 items completed | ROAD-16 absent from M2 list; others still shown | N/A |
| Complete without N/A confirm | Visible M2 items confirmed; ROAD-16 N/A and `m2_confirmed` false | `workshop_complete_m2` → `ready_for_pickup` | N/A |
| Incomplete visible M2 | One non-N/A M2 item still unconfirmed | Complete M2 stays blocked | `INCOMPLETE_CHECKLIST` |
| Empty M2 list | Every `m2_verifies` item is N/A | Empty list; Complete M2 allowed once add-ons / same-person rules pass | N/A |
| M1 unchanged | `being_prepared`; item `naAllowed` | N/A control still works; item stays on the M1 list | Disallowed N/A still `INCOMPLETE_CHECKLIST` |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260821120000_workshop_foundation.sql:568-585` -- current `private.workshop_m2_ready`: every `m2_verifies` prep row must be M1-valid and `m2_confirmed`. Replace via a **new** migration, not this file.
- `supabase/migrations/20260821120000_workshop_foundation.sql:858-892` -- `private.workshop_complete_m2` already calls `workshop_m2_ready`; no signature change.
- `supabase/migrations/20260824130000_workshop_prep_checklists.sql:35` -- ROAD-16 is the only current catalog row that is both `m2_verifies` and `na_allowed`. Do not edit.
- `src/app/workshop/_components/WorkshopTask.tsx:205-213,381-395` -- `m2Items = preparationItems.filter(m2Verifies)` and `m2Ready = m2Items.every(m2Confirmed)`. Filter through a shared helper.
- `src/app/workshop/_components/workshop-ui.ts:177-205` -- add `isM2RecheckItem`; keep `isM1ItemValid` / `m2ItemCaption` (PSI + incomplete). N/A caption becomes unused on the M2 list.
- `src/lib/workshop/domain/dtos.ts:32-45` -- `m2Verifies`, `naAllowed`, `m1Outcome`, `m2Confirmed` already on the DTO; no shape change.
- `src/lib/workshop/actions/task-actions.ts:48-104` -- thin `confirmM2Item` / `completeM2` wrappers; do not add actions.
- `src/workshop-ui.test.mts:301-317` -- extend with `isM2RecheckItem` cases; N/A caption assertion may stay.
- `supabase/tests/database/workshop_foundation.test.sql:175-200,1021-1103` -- `fill_m2` confirms every `m2_verifies` row (fine if M1 completed them). Replace the ROAD-16 “M2 can confirm N/A” block: after `fill_m1(..., '{ROAD-16}')` + `complete_m1` + `fill_m2`, `complete_m2` must succeed while ROAD-16 stays `not_applicable` and `m2_confirmed` false.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20260828120000_workshop_m2_skip_na.sql` -- `CREATE OR REPLACE FUNCTION private.workshop_m2_ready` so `m2_verifies` rows with `m1_outcome = not_applicable` do not need `m2_confirmed` -- gate and UI must agree without backfill
- [x] `src/app/workshop/_components/workshop-ui.ts` -- add `isM2RecheckItem` (`m2Verifies && m1Outcome !== "not_applicable"`) -- one predicate for list and Complete M2 enablement
- [x] `src/app/workshop/_components/WorkshopTask.tsx` -- build `m2Items` / `m2Ready` from `isM2RecheckItem` -- M2 must not render N/A rows
- [x] `src/workshop-ui.test.mts` -- cover helper true/false for completed, N/A, and non-M2 items -- lock the matrix
- [x] `supabase/tests/database/workshop_foundation.test.sql` -- rewrite ROAD-16 N/A+M2 assertions as in the Code Map -- prove complete M2 without confirming N/A

**Acceptance Criteria:**
- Given a road task in `needs_recheck` with ROAD-16 N/A, when M2 opens the task, then that row is not rendered and remaining `m2Verifies` items still are.
- Given those remaining items are confirmed and add-ons / same-person rules pass, when M2 completes, then status is `ready_for_pickup` and ROAD-16 is still `not_applicable` with `m2_confirmed` false.
- Given a non-N/A M2 item is still unconfirmed, when Complete M2 is attempted, then the command returns `INCOMPLETE_CHECKLIST`.

## Spec Change Log

## Verification

**Commands:**
- `npm run test:workshop-ui` -- expected: pass, including `isM2RecheckItem`
- `npm run test:db` -- expected: pass, including ROAD-16 N/A complete-without-confirm
- `npx supabase migration up --local` -- expected: new migration applies on local only

**Manual checks (if no CLI):**
- On `/workshop/[taskId]`, mark ROAD-16 N/A as M1, complete M1, open M2: no ROAD-16 row; confirm the rest; Complete M2 succeeds.

## Suggested Review Order

**Completion gate**

- Skip `m2_confirmed` only for valid M1 N/A; no backfill needed
  [`20260828120000_workshop_m2_skip_na.sql:5`](../../supabase/migrations/20260828120000_workshop_m2_skip_na.sql#L5)

**M2 list**

- One predicate: designated and not N/A
  [`workshop-ui.ts:192`](../../src/app/workshop/_components/workshop-ui.ts#L192)

- Filter and Complete M2 enablement share that predicate
  [`WorkshopTask.tsx:206`](../../src/app/workshop/_components/WorkshopTask.tsx#L206)

**Tests**

- Helper covers completed, null, N/A, and non-M2
  [`workshop-ui.test.mts:321`](../../src/workshop-ui.test.mts#L321)

- Mixed list hides ROAD-16; raw `m2Verifies` would still block
  [`workshop-ui.test.mts:357`](../../src/workshop-ui.test.mts#L357)

- `fill_m2` skips N/A so complete-without-confirm is testable
  [`workshop_foundation.test.sql:191`](../../supabase/tests/database/workshop_foundation.test.sql#L191)

- ROAD-16 N/A stays unconfirmed after `ready_for_pickup`
  [`workshop_foundation.test.sql:1097`](../../supabase/tests/database/workshop_foundation.test.sql#L1097)
