---
title: 'Workshop task table loading feedback'
type: 'feature'
created: '2026-09-04'
status: 'done'
baseline_commit: 'c185deb38398740ce7cdf2fa25376270fabe4c4b'
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-workshop-ui.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Workshop task table gives no feedback while task data reloads after a status-tile selection, a debounced search, or a Today/Tomorrow/Next 7 days/All filter change. It can look stuck despite an active navigation and server data reload.

**Approach:** Show a table-local skeleton throughout a queue-navigation refresh. Keep the Workshop page chrome and controls visible, and retain the existing Booqable-sync overlay exclusively for an actual manual sync.

## Boundaries & Constraints

**Always:** Cover every URL-driven queue refresh initiated by status selection, search, date filter, and pagination through the shared queue-navigation function. Render the loading feedback in the task-table region only, using a skeleton shaped like the actual table. Preserve the current URL as the source of filters, search, and page. Keep the existing initial route `loading.tsx` fallback and the Booqable sync loading behavior working independently. Use accessible loading semantics in the table region.

**Ask First:** If a solution requires changing the server loader/API contract, adding a new data fetch, or changing the Booqable sync workflow, halt for direction.

**Never:** Do not replace the entire page with a spinner for queue refreshes, hide the filter/search controls, add client-side task filtering or aggregation, or show sync-specific copy/overlay for normal queue navigation.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Status selection | User activates a task-status tile or mobile status option | The table becomes a table-shaped skeleton until the URL-driven data refresh completes | Existing loader errors still render the page error state |
| Search or date filter | User completes a debounced search or selects Today, Tomorrow, Next 7 Days, or All | The same local skeleton displays while new queue results load; page chrome stays interactive | An empty successful result remains its existing empty state |
| Manual sync | User starts Booqable sync | Existing sync overlay and navigation-blocking behavior remains distinct from table-navigation loading | Existing sync failure/status handling remains unchanged |

</frozen-after-approval>

## Code Map

- `src/app/workshop/page.tsx:11-98` — server URL resolver and concurrent task/count/health loaders; its output contract remains unchanged.
- `src/app/workshop/_components/WorkshopQueue.tsx:140-270, 338-409, 428-541` — owns URL-navigation entry point, search/status/date controls, table region, and independent Booqable sync transition; split queue navigation pending state from sync pending state here.
- `src/app/workshop/_components/WorkshopLoadingSkeleton.tsx:6-70` — existing initial-route skeleton with an embedded table mock; extract or reuse its table portion for local refreshes rather than inventing a second visual language.
- `src/app/workshop/loading.tsx:1-6` — retain the route-level fallback for first navigation/loading boundaries.
- `src/app/workshop/_components/workshop-ui.ts` — inspect for an appropriate shared Workshop UI export if table skeleton extraction needs a small presentation helper.
- `src/workshop-ui.test.mts:641-647, 670-703, 757-802, 917-956` — source-structure coverage for the Workshop queue and loading states; extend for separate queue transition and skeleton conditional.
- `ui/layouts/useAppNavigation.ts:19-37` — existing project pattern for wrapping `router.push` in `startTransition`.

## Tasks & Acceptance

**Execution:**

- [x] `src/app/workshop/_components/WorkshopLoadingSkeleton.tsx` — expose a reusable, accessible task-table skeleton matching the current table columns while preserving the route-level page skeleton.
- [x] `src/app/workshop/_components/WorkshopQueue.tsx` — add a queue-navigation transition that wraps the common URL push; render the table skeleton only while that transition is pending, and keep the Booqable sync transition/overlay separate.
- [x] `src/workshop-ui.test.mts` — cover the independent navigation transition, shared table skeleton, and guarantee that the sync overlay still has its own condition.

**Acceptance Criteria:**

- Given a loaded Workshop queue, when a desktop status tile or mobile status selector changes the queue URL, then the task-table area shows a skeleton until the refreshed route resolves.
- Given a loaded Workshop queue, when a debounced search or any date filter changes the queue URL, then the task-table area shows the same skeleton while its new results load.
- Given a queue-navigation refresh, when it is pending, then the headings, filters, search control, and non-table page chrome remain visible and no Booqable-sync overlay/copy appears.
- Given a manual Booqable sync, when it is pending, then its existing blocking overlay remains in use and is not replaced by the queue-navigation skeleton.

## Spec Change Log

## Design Notes

Use a skeleton instead of a top-of-page spinner: users changed only the result set, so preserving controls and the table’s spatial footprint is clearer and less visually jarring. A separate transition state avoids coupling normal route navigation to the operational Booqable-sync status.

## Verification

**Commands:**

- `npm run test:workshop-ui` -- expected: all existing and added queue-loading assertions pass.
- `npx eslint src/app/workshop/_components/WorkshopQueue.tsx src/app/workshop/_components/WorkshopLoadingSkeleton.tsx src/workshop-ui.test.mts` -- expected: no lint errors.
- `npx tsc --noEmit` -- expected: no type errors.

**Manual checks (if no CLI):**

- Throttle the Workshop route, then exercise status tiles, mobile status control, search, each date filter, and pagination; confirm only the table skeleton is shown and each refreshed result/error/empty state resolves normally.
- Start Booqable sync and confirm its existing overlay still appears rather than the queue navigation skeleton.

## Suggested Review Order

**Queue transition boundaries**

- Split route-navigation feedback from the operational Booqable sync state.
  [`WorkshopQueue.tsx:155`](../../src/app/workshop/_components/WorkshopQueue.tsx#L155)

- Replace only changing results while retaining controls and the sync overlay.
  [`WorkshopQueue.tsx:221`](../../src/app/workshop/_components/WorkshopQueue.tsx#L221)

- Render the local skeleton for status, search, date, and pagination navigations.
  [`WorkshopQueue.tsx:431`](../../src/app/workshop/_components/WorkshopQueue.tsx#L431)

**Shared loading presentation**

- Reuse one accessible fifteen-row skeleton matching the eight queue columns.
  [`WorkshopLoadingSkeleton.tsx:4`](../../src/app/workshop/_components/WorkshopLoadingSkeleton.tsx#L4)

**Verification**

- Assert every queue entry point delegates through the pending navigation path.
  [`workshop-ui.test.mts:804`](../../src/workshop-ui.test.mts#L804)
