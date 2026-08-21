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
  summary: Implement complete-snapshot source apply, assignment instances, one task per identified bike, and invalidation (CAP-1, CAP-9).
  evidence: Split from the mechanics daily-work intent because apply depends on a frozen SourceOrderSnapshotV1 contract after the tenant spike.

- source_spec: none
  summary: Implement webhook and leased manual sync plus workshop sync-health UI (CAP-10).
  evidence: Split from the mechanics daily-work intent because live sync is gated on spike numbers, staging/preview isolation, and the apply command existing first.
