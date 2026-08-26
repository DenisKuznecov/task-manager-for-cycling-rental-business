# Deferred Work

- source_spec: none
  summary: Implement the mechanics workshop substrate and CAP-1 through CAP-10 (task reconciliation, queues, checklists, M1/M2, add-ons, pickup/return, storage, invalidation, and sync) after the Next.js 16 upgrade gate is green.
  evidence: The canonical workshop spec is ten independently testable capabilities plus architecture AD-1–AD-13; this build run is limited to AD-12 / Build Readiness item 1 (Next.js 16.3.1 upgrade of the existing app).

- source_spec: `_bmad-output/implementation-artifacts/spec-upgrade-nextjs-16.md`
  summary: Clear the 21 `react-hooks` errors (and 22 warnings) that `eslint-config-next@16.3.1` now reports via eslint-plugin-react-hooks v7.
  evidence: `npm run lint` exits non-zero on pre-existing setState-in-effect / refs / static-components patterns; the upgrade AC allows listing them rather than rewriting those components in this run.

- source_spec: `_bmad-output/implementation-artifacts/spec-upgrade-nextjs-16.md`
  summary: Smoke-test unauthenticated HTML → `/login?next=...`, API/`next-action` skip, and cookie refresh through live `proxy` after the middleware rename.
  evidence: Gate tests regex-scan `proxy.ts` / `updateSession` source and do not issue an HTTP request; Ask First called for a halt if auth regresses.

- source_spec: `_bmad-output/implementation-artifacts/spec-upgrade-nextjs-16.md`
  summary: Guard `requireAnonymous` `fallbackNext` so it only accepts same-origin relative paths.
  evidence: `fallbackNext.trim()` is used as a redirect target with no `startsWith("/")` check; that open-redirect shape predates the upgrade.

- source_spec: none
  summary: Replace the mock Kanban with workshop work queues and a dedicated `/workshop/[taskId]` page for the guarded lifecycle (M1, M2, add-ons, pickup/return, storage).
  evidence: Split from the mechanics daily-work intent so this run can land schema, RLS, commands, and seeds without UI cut-over.

- source_spec: none
  summary: Run the controlled Booqable tenant spike and amend AD-2 / AD-10 with the verified include path, workshop-tag field, terminal statuses, debounce, webhook behavior, and sync numbers.
  evidence: Split from the mechanics daily-work intent because live-tenant measurement is research, not foundation schema work, and apply/sync must not invent those values.

## Deferred from: code review of spec-booqable-source-apply.md (2026-08-22)

- Live `SET ROLE authenticated` call of apply/acquire still not executed; local Postgres closed the connection on that path, so staff-JWT denial remains `has_function_privilege` plus an empty `bq-authz` count.
- Parser envelope is not round-tripped into `booqable_apply_source_snapshot_v1` in CI; `verify:workshop` / adapter→apply remains an AD-13 seam (prior review also rejected adding CI wiring in this slice).
- Bike `identifier` / title changes do not update workshop display fields when source and add-on fingerprints are otherwise unchanged; accepted for now (rename in Booqable need not refresh the task row).

## Deferred from: code review of spec-workshop-ui.md (2026-08-24)

- README still lists `@hello-pangea/dnd` for the mechanic kanban board after the package and Kanban files were removed; README was outside this story’s file list.
- Drawer wiring tests still grep layout/task source for `OrderDetailsDrawerHost` / `useOpenOrderDetails` and never render the host, so a missing host in the tree would not fail `test:workshop-ui`.
- Repo-wide `npm run lint` still fails on pre-existing bike-fits/wiki `react-hooks` findings from the Next.js 16 upgrade; workshop eslint is clean.
- Workshop layout `redirect("/login")` has no `?next=`, matching the other role layouts; session expiry on a task page does not resume at that task.
