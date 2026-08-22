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

- source_spec: none
  summary: Implement webhook and leased manual sync plus workshop sync-health UI (CAP-10).
  evidence: Split from the mechanics daily-work intent because live sync is gated on spike numbers, staging/preview isolation, and the apply command existing first.

## Deferred from: code review of spec-booqable-source-apply.md (2026-08-22)

- Live `SET ROLE authenticated` call of apply/acquire still not executed; local Postgres closed the connection on that path, so staff-JWT denial remains `has_function_privilege` plus an empty `bq-authz` count.
- Parser envelope is not round-tripped into `booqable_apply_source_snapshot_v1` in CI; `verify:workshop` / adapter→apply remains an AD-13 CAP-10 seam (prior review also rejected adding CI wiring in this slice).
- `booqable_release_order_lease` / renew are not in this commit; apply never consumes the lease, so a real acquire→apply→acquire loop waits until `expires_at` (CAP-10).
- Bike `identifier` / title changes do not update workshop display fields when source and add-on fingerprints are otherwise unchanged; accepted for now (rename in Booqable need not refresh the task row).
