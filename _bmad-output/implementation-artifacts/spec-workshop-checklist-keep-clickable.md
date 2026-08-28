---
title: 'Keep workshop checklist items clickable'
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

**Problem:** Tapping one checklist item sets a page-wide pending flag that greys out every other row for the full save (1–2s on production). Mechanics cannot click through a list; each tap waits.

**Approach:** Checklist rows stay independently tappable. Each tap looks accepted immediately and still persists. Stage-changing buttons stay single-flight and version-guarded. While item saves are still going out, Complete M1 / M2 / Storage show a small Saving… cue so the wait is visible without locking the list.

## Boundaries & Constraints

**Always:**
- M1 action / N/A / PSI Set, M2 confirm, and storage rows stay enabled while another *item* save is in flight. Only a row that already has its outcome (or the PSI Set that just fired) may look spent.
- A tap must look accepted immediately. If the command fails, revert that row, `console.error` with `workshop:`, and show the existing command-error Alert.
- `setItemOutcome` / `confirmM2Item` still send `expectedVersion`. Each success bumps `bike_tasks.version`, so the next item command must use the version from the last successful result — not the stale `detail.task.version` from first paint. Do not fire overlapping item RPCs with the same version.
- Named stage actions (start/complete M1/M2/storage, pickup, return, sync) stay single-flight. They wait until in-flight item saves finish, then use the latest version.
- While any item save is in flight, show a small Saving… label or icon next to Complete Bike Preparation, Complete Bike Verification, and Complete Bike Storage Preparation. Hide it when the item queue is empty. Do not overlay or disable the checklist for this cue. A failed item save uses the existing error Alert, not Saving….
- Item-level success must not clear `addonsAcknowledged`, `samePersonConfirmed`, or `psiDrafts`.
- Keep existing `withAuth` actions and RPCs. Log failures with `workshop:`.

**Ask First:**
- Changing `workshop_set_item_outcome` / `workshop_confirm_m2_item` version semantics or dropping `expectedVersion`.
- Letting Complete M1/M2/storage fire while an item save is still in flight (that is a self-inflicted `STALE_VERSION`).
- Changing done-row chrome or touch-target sizes.

**Never:**
- New RPCs, migrations, or remote DDL.
- Editing `src/lib/workshop/actions` or foundation SQL unless a type-only import path is broken.
- Changing the queue page, sync, or Booqable paths.
- Removing `STALE_VERSION` handling on real conflicts (other tab / sync).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Rapid M1 taps | Two undone action items; tap A then immediately B | Both persist; B never disabled by A's save | N/A |
| PSI during save | Action save in flight; Set PSI on another row | PSI persists | N/A |
| Rapid M2 | Two unconfirmed M2 rows tapped quickly | Both `m2Confirmed` | N/A |
| Add-ons survive | Add-ons checked; then tap more items | Checkbox stays checked | N/A |
| Item command fails | RPC `{ ok: false }` | That row reverts; siblings stay usable | Alert + `workshop:` log |
| Own-version race | Complete M1 clicked while an item save is in flight | Stage action waits, then uses latest version | Must not self-`STALE_VERSION` |
| Saving cue | One or more item saves in flight | Saving… visible by the stage Complete button; list stays tappable | N/A |
| Saving done | Item queue empty | Saving… hidden | N/A |
| Real stale | Other tab bumped version | Existing banner + `router.refresh()` | `STALE_VERSION` |

</frozen-after-approval>

## Code Map

- `src/app/workshop/_components/WorkshopTask.tsx:133-178,341-396,485-518` -- one `useTransition` `isPending`; `runCommand` returns when `isPending`; `ChecklistItems` / `M2Checklist` get `disabled={isPending}`; every success clears add-ons / same-person / PSI drafts then `router.refresh()`. Split item vs named-stage paths. Complete M1 (364–378), M2 (411–430), Storage (502–518) are where Saving… sits.
- `src/app/workshop/_components/WorkshopTask.tsx:652-833` -- rows already disable on `hasOutcome` / `m2Confirmed`. Stop passing page-level `isPending` into these lists. Keep large tap targets.
- `src/app/workshop/_components/workshop-ui.ts` -- add a small helper that returns the next `expectedVersion` from `WorkshopCommandResult` (success → `result.version`, failure → last good). Unit-test it. Do not put queue UI predicates here that belong on the queue page.
- `src/lib/workshop/actions/task-actions.ts:29-61` -- keep `setItemOutcome` / `confirmM2Item` signatures; they already return `{ ok, version }`.
- `src/lib/workshop/domain/results.ts:9-24` -- success payload already has `version`.
- `supabase/migrations/20260821120000_workshop_foundation.sql:534-536,667-743,747-793` -- **read-only.** `workshop_begin_command` rejects mismatched `expectedVersion`; item/M2-confirm call `workshop_bump_task`. Overlapping same-version calls fail `STALE_VERSION`.
- `src/workshop-ui.test.mts:509-536` -- source-lock the task page. Add helper tests; assert lists are not wired to page-level `isPending`.
- `src/workshop-sync.test.mts:284-389` -- greps WorkshopTask for Sync / tombstone / error Alert. Do not break those.

## Tasks & Acceptance

**Execution:**
- [x] `src/app/workshop/_components/workshop-ui.ts` -- export `nextWorkshopTaskVersion(current, result)` (success → payload version, else `current`) -- item commands must chain versions without waiting for a refresh
- [x] `src/app/workshop/_components/WorkshopTask.tsx` -- item taps no longer share the page `isPending` lock; persist via chained version; optimistic row; item success does not reset add-ons / same-person / PSI; named stage actions wait for the item queue then use latest version; show Saving… on the three Complete buttons only while item saves are in flight -- this is the lock the mechanic feels
- [x] `src/workshop-ui.test.mts` -- unit-test version chaining (two successes; failure keeps last good) and source-lock that `ChecklistItems` / `M2Checklist` are not passed `disabled={isPending}` -- lock the matrix

**Acceptance Criteria:**
- Given a `being_prepared` task with several undone action items, when the mechanic taps item A and immediately taps item B, then both persist and B was not greyed or unclickable while A saved.
- Given add-ons are acknowledged, when further items are tapped, then the add-ons checkbox stays checked.
- Given two unconfirmed M2 rows, when both are tapped quickly, then both confirm.
- Given an item command returns `{ ok: false }`, when the save finishes, then that row reverts, the error Alert shows, and other undone rows stay tappable.
- Given Complete M1 is pressed while an item save is in flight, when both finish, then M1 uses the latest version and does not fail with a self-inflicted `STALE_VERSION`.
- Given an item save is in flight, when the mechanic looks at Complete M1 / M2 / Storage, then a small Saving… cue is visible next to that button and the checklist is still tappable; when the queue is empty, the cue is gone.

## Spec Change Log

## Design Notes

`isPending` stays true for the whole `startTransition` + `router.refresh()` round trip. Removing `disabled={isPending}` but keeping `if (isPending) return` still drops taps. Firing two item RPCs with the same `task.version` fails the second with `STALE_VERSION`. Serialize item commands (or otherwise feed each the last success version) and do not bind list `disabled` to the page transition.

Prefer refreshing after the item queue drains so a mid-list refresh does not fight optimistic rows.

Saving… belongs only on the stage Complete controls. Do not grey the list or reuse page-level `isPending` for that cue.

## Verification

**Commands:**
- `npm run test:workshop-ui` -- expected: pass, including version-helper cases and the not-`disabled={isPending}` source lock

**Manual checks (if no CLI):**
- On `/workshop/[taskId]` in `being_prepared`, throttle the network and tap several undone rows in a row: none grey out; Saving… appears by Complete Bike Preparation; all stay checked after saves settle and Saving… hides. Repeat on M2 and storage.

## Suggested Review Order

**Item queue and version chain**

- Optimistic tap, then serial save with the last success version
  [`WorkshopTask.tsx:259`](../../../src/app/workshop/_components/WorkshopTask.tsx#L259)

- Success payload version, otherwise keep the last good one
  [`workshop-ui.ts:179`](../../../src/app/workshop/_components/workshop-ui.ts#L179)

- Stage actions wait for the item queue, then use the latest version
  [`WorkshopTask.tsx:317`](../../../src/app/workshop/_components/WorkshopTask.tsx#L317)

**Keep the list clickable**

- Rows lock only for named stage actions, never for background item saves
  [`workshop-ui.ts:187`](../../../src/app/workshop/_components/workshop-ui.ts#L187)

- M1 / M2 / storage lists use that gate instead of page-wide item pending
  [`WorkshopTask.tsx:531`](../../../src/app/workshop/_components/WorkshopTask.tsx#L531)

- Saving… sits on Complete; the button waits until the queue drains
  [`WorkshopTask.tsx:550`](../../../src/app/workshop/_components/WorkshopTask.tsx#L550)

**Safety after review**

- Remount on task change so a leftover queue cannot follow the next bike
  [`page.tsx:35`](../../../src/app/workshop/[taskId]/page.tsx#L35)

- After a real stale conflict, block new taps until refresh lands
  [`WorkshopTask.tsx:264`](../../../src/app/workshop/_components/WorkshopTask.tsx#L264)

**Tests**

- Matrix source-lock plus version chaining and the named-action-only lock
  [`workshop-ui.test.mts:305`](../../../src/workshop-ui.test.mts#L305)
