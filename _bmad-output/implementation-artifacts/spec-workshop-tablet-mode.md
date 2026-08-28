---
title: 'Workshop Tablet mode toggle'
type: 'feature'
created: '2026-08-28'
status: 'done'
baseline_commit: 'f3f94c751ff64dbf2b83ea35c1f8d7b84d1578d2'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-workshop-ui.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/workshop` hard-codes larger type and taller rows for tablet hands. That helps on the shop floor but breaks the admin design language on a PC. The task page has no matching density control, so list and detail feel inconsistent.

**Approach:** Add a **Tablet mode** switch on the workshop list and the task page. Off (default) uses the same type scale and density as Orders. On restores today’s larger list chrome and applies the same step on the task page. Persist the choice in this browser so a refresh or list↔task navigation keeps it.

## Boundaries & Constraints

**Always:**
- One shared boolean for `/workshop` and `/workshop/[taskId]`. First visit and missing/invalid storage → **off**. Persist in `localStorage` for this browser. Do not use cookies, URL params, `UserContext`, or a profile/DB column.
- Visible control labeled **Tablet mode** on both pages (list heading row, including the load-error heading path; task header). Use `@/ui/components/Switch` the way Wiki does (label + `Switch`).
- **Off (PC):** match Orders / Subframe defaults — table cells `h-12`, header `h-8` caption-bold, cell copy `text-body` / `text-body-bold`, tabs default body-bold, badges default `h-6` caption, subtitle `text-body`, search default input (no heading-3), status tiles `min-h-12` with body-scale labels, buttons `size="medium"`.
- **On (tablet):** keep the current list overrides (`!h-16` cells, heading-3 tabs/search/cells/sync line, `h-7` body badges, `min-h-16` tiles, `size="large"` buttons). On the task page, bump the same step: checklist / M2 rows `min-h-16`, primary row and section copy `heading-3` / `heading-3` instead of `body` / `body-bold`, badges and PSI field like the list, buttons `size="large"`. Page titles stay `heading-1` / `heading-2`.
- Client-only under `src/app/workshop/_components`. `layout.tsx` stays a server component and only mounts a thin client provider around `children`. Do not import tablet helpers from `src/lib/workshop`. First paint may be off until `localStorage` is read. Skeletons stay off-sized.
- Leave the uncommitted sync-confirm deletion (`WorkshopSyncAllConfirmDialog.tsx` and its queue/test edits) untouched.

**Ask First:**
- Persist anywhere other than this browser’s `localStorage`.
- Put the switch in the app topbar or on non-workshop pages.
- Auto-enable from viewport / user-agent instead of the switch.

**Never:**
- New tables, RPCs, migrations, or remote DDL.
- Changes to Orders, DefaultPageLayout, or UserContext.
- Vitest. Editing `src/lib/workshop` except a broken type-only import (should not be needed).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First visit | No storage key | List and task render off (Orders density) | N/A |
| Turn on | Switch on, on `/workshop` | List uses today’s large chrome; value stored | N/A |
| Cross-page | On, then open a task | Task uses tablet density; switch stays on | N/A |
| Turn off | Switch off, on the task page | Task returns to off density; list does too after back | N/A |
| Refresh | Reload while on | Same page stays on after hydrate | N/A |
| Bad storage | Key present but not `on`/`off` | Treat as off | Ignore the bad value |
| Queue load error | `shouldRenderWorkshopQueue` is false | Heading + Tablet mode switch still show | Existing `DataLoadError` |

</frozen-after-approval>

## Code Map

- `src/app/workshop/layout.tsx:41-48` -- mount client `WorkshopTabletModeProvider` around `{children}`. No new auth/data here.
- `src/app/workshop/page.tsx:51-60,71-91` -- heading is also used on the error path; put the switch in this heading.
- `src/app/workshop/_components/WorkshopQueue.tsx:54-59,278-319,342-409,425-512` -- always-on `QUEUE_*` classes, heading-3 sync/select/search/cells, `size="large"`. Gate on the hook. Rewrite `src/workshop-ui.test.mts:743-757` (always-on `!h-16`).
- `src/app/workshop/_components/workshop-ui.ts:338-357` -- `TILE_BASE` `min-h-16`. Add `tabletMode` to `statusTileClassName` (default false). Keep accent asserts at `src/workshop-ui.test.mts:579-600`.
- `src/app/workshop/_components/WorkshopTask.tsx:110-135,420-469,770-816,881-1036` -- header, add-ons, `min-h-12` checklists. Same hook. Off = medium buttons + current type; on = heading-3 copy and `min-h-16` rows.
- `src/app/workshop/_components/WorkshopLoadingSkeleton.tsx:25-33` -- change `h-16` tiles to off height.
- `src/ui/components/Switch.tsx` + `src/app/wiki/_components/WikiEditor.tsx:246-259` -- reuse label + `Switch` (`@/ui/components/Switch`).
- `src/ui/components/Table.tsx:20,48-54` and `src/app/orders/_components/AllOrdersTable.tsx:141-219` -- off reference (cell `h-12`, body/body-bold). **Read-only:** `src/context/UserContext.tsx`, `src/lib/workshop/**`, uncommitted `WorkshopSyncAllConfirmDialog.tsx`.

## Tasks & Acceptance

**Execution:**
- [x] `src/app/workshop/_components/workshop-tablet-mode.ts` -- export storage key, `readWorkshopTabletMode` / `writeWorkshopTabletMode` (`on`/`off`, invalid → false). No React.
- [x] `src/app/workshop/_components/WorkshopTabletModeProvider.tsx` -- client context: default off, hydrate from storage, persist on toggle. Export `useWorkshopTabletMode`. Mount from `layout.tsx`.
- [x] `src/app/workshop/_components/WorkshopTabletModeSwitch.tsx` -- "Tablet mode" label + `Switch`. Use on list heading (`page.tsx`) and task header (`WorkshopTask.tsx`).
- [x] `src/app/workshop/_components/workshop-ui.ts` -- `statusTileClassName(..., tabletMode)` (default false); `TILE_BASE` height follows the flag.
- [x] `src/app/workshop/_components/WorkshopQueue.tsx` -- all list density/type overrides and button sizes follow the hook. Off matches Code Map defaults; on keeps today’s classes.
- [x] `src/app/workshop/_components/WorkshopTask.tsx` -- same hook; off = current task chrome with `size="medium"` buttons; on = tablet step in Code Map.
- [x] `src/app/workshop/_components/WorkshopLoadingSkeleton.tsx` -- off-sized tiles (no `h-16`).
- [x] `src/workshop-ui.test.mts` -- unit-test read/write + invalid key; tile helper off vs on height; source-lock switch on list+task and conditional queue/task classes. Stop asserting always-on `QUEUE_CELL_CLASS = "!h-16"`.

**Acceptance Criteria:**
- Given a first visit with no stored value, when `/workshop` or a task loads, then density matches Orders (off) and the switch is off.
- Given the switch is turned on, when the mechanic opens a task or refreshes, then both pages stay in tablet density.
- Given the switch is turned off on the task page, when they return to the list, then the list is off and the stored value is off.
- Given a corrupt storage value, when the page hydrates, then density is off.
- Given the queue loader fails, when the error heading renders, then Tablet mode is still available.

## Spec Change Log

## Design Notes

Off is the app default; on is a workshop-only density overlay, not a theme.

```ts
const KEY = "workshop.tabletMode"; // values: "on" | "off"
readWorkshopTabletMode(storage): boolean // missing/invalid → false
```

Queue on-class anchors (keep as the on branch): `QUEUE_CELL_CLASS = "!h-16"`, `QUEUE_TAB_CLASS` heading-3, search `[&_input]:text-heading-3`, cells `text-heading-3`.

## Verification

**Commands:**
- `npm run test:workshop-ui` -- expected: PASS (new helper + updated source-locks)
- `npx eslint src/app/workshop src/workshop-ui.test.mts` -- expected: clean on touched files

**Manual checks (if no CLI):**
- `/workshop` first visit is Orders-sized; toggle on → taller rows and larger type; open a task → still large; refresh → still on; toggle off → both pages shrink.

## Suggested Review Order

**Shared persistence**

- One browser boolean; missing or invalid storage reads as off.
  [`workshop-tablet-mode.ts:1`](../../src/app/workshop/_components/workshop-tablet-mode.ts#L1)

- Snapshot stays off if `localStorage` itself throws; write failures are logged.
  [`WorkshopTabletModeProvider.tsx:44`](../../src/app/workshop/_components/WorkshopTabletModeProvider.tsx#L44)

- Toggle writes `on`/`off` and notifies list and task subscribers.
  [`WorkshopTabletModeProvider.tsx:67`](../../src/app/workshop/_components/WorkshopTabletModeProvider.tsx#L67)

- Server layout only wraps children; drawer host stays outside.
  [`layout.tsx:47`](../../src/app/workshop/layout.tsx#L47)

**Switch on both pages**

- Wiki-style caption plus Subframe `Switch`.
  [`WorkshopTabletModeSwitch.tsx:22`](../../src/app/workshop/_components/WorkshopTabletModeSwitch.tsx#L22)

- List heading carries the switch, including the load-error path.
  [`page.tsx:55`](../../src/app/workshop/page.tsx#L55)

- Error branch still renders that same heading.
  [`page.tsx:90`](../../src/app/workshop/page.tsx#L90)

- Task header uses the same control and shared hook.
  [`WorkshopTask.tsx:490`](../../src/app/workshop/_components/WorkshopTask.tsx#L490)

**List and task density**

- Queue chrome and button size follow the hook.
  [`WorkshopQueue.tsx:151`](../../src/app/workshop/_components/WorkshopQueue.tsx#L151)

- Status tiles are `min-h-12` off and `min-h-16` on.
  [`workshop-ui.ts:345`](../../src/app/workshop/_components/workshop-ui.ts#L345)

- Skeleton tiles stay off-sized.
  [`WorkshopLoadingSkeleton.tsx:30`](../../src/app/workshop/_components/WorkshopLoadingSkeleton.tsx#L30)

- Task copy, badges, rows, and buttons take the same step.
  [`WorkshopTask.tsx:94`](../../src/app/workshop/_components/WorkshopTask.tsx#L94)

**Tests**

- Storage helpers, provider wiring, and conditional class locks.
  [`workshop-ui.test.mts:818`](../../src/workshop-ui.test.mts#L818)
