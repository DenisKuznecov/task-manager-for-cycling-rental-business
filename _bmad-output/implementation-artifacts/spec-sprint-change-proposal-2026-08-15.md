---
title: 'Remove local webhook recovery infrastructure'
type: 'chore'
created: '2026-08-17'
status: 'draft'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/project-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-15.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The local-only Story 2.7 implementation introduced durable webhook-refresh recovery infrastructure that the approved v1 operating model rejects. Story 2.8 was never implemented and its untracked draft specification is obsolete.

**Approach:** Reverse the two isolated Story 2.7 commits as forward, uncommitted Git history; delete only the two obsolete Story specifications; then reset the local Supabase stack and prove the synchronous-ingestion baseline with the approved verification suite. The planning reconciliation already committed in `c5b10c8cbbb463145d3d4cb1dd07701cb1da6378` is an input and must remain unchanged.

## Boundaries & Constraints

**Always:** Revert `49886742938914bcc9cc3c01ff8bad9b5a9fa8e3` before `36cffdc`; preserve `_bmad-output/party-mode/memories/installed/.memlog.md` byte-for-byte; retain the committed planning reconciliation and all Stories 2.9–2.14; use only the local Supabase database; run the complete approved verification suite after the removed migration is absent.

**Ask First:** Halt before resolving any conflict that cannot preserve the current `.memlog.md` and `c5b10c8` planning content, or before any operation requiring a remote/database-destructive action outside the explicitly authorized local reset.

**Never:** Commit or push the rollback; rewrite history; alter remotes or staging/production databases; create a compensating migration; delete/modify unrelated working-tree files; retain a replay inbox, retry worker, Cron dispatcher, reconciliation sweep, recovery API, checkpoint, or coverage watermark.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Forward rollback | Commits `4988674` and `36cffdc` are local ancestors beneath `c5b10c8` | Their Story 2.7 code, migration, tests, package wiring, and tracked spec are removed in the working tree without a new commit | Halt if a revert conflict would overwrite protected or reconciled content |
| Legacy protected edit | `.memlog.md` is locally modified and was also touched by Story 2.7 | Its exact pre-rollback bytes remain present | Restore its current version; halt if exact preservation cannot be demonstrated |
| Obsolete draft | Story 2.8 spec is untracked | Only `spec-2-8-run-bounded-workers-and-reconciliation-sweeps.md` is removed | Do not remove other untracked files |
| Local schema rollback | Removed Story 2.7 migration previously ran locally | Local reset rebuilds without Story 2.7 objects | Report local-stack/startup failure without using a remote alternative |

</frozen-after-approval>

## Code Map

- `49886742938914bcc9cc3c01ff8bad9b5a9fa8e3` -- newest Story 2.7 commit; removes its completion/recovery hardening before the base implementation is reverted.
- `36cffdc` -- base Story 2.7 commit; introduced the durable refresh-work module, migration, tests, webhook persistence, contract wiring, tracked Story 2.7 spec, and an unrelated `.memlog.md` touch.
- `src/app/api/webhooks/booqable/route.ts` -- restore the existing secret-authenticated, ghost-filtered synchronous `syncBooqableOrder` path; no persistence RPC or delivery-identity HMAC remains.
- `src/lib/booqable/contracts/refresh-work.ts` and `src/lib/booqable/contracts/index.ts` -- remove recovery contract and its barrel export.
- `supabase/migrations/20260815140000_persist_authoritative_refresh_work.sql` -- remove before the local database reset; no remote compensating DDL.
- `tests/booqable-contracts/refresh-work.test.ts`, `tests/booqable-containment/webhook.test.ts`, and `supabase/tests/database/booqable-integration/004_refresh_work.pgtap.sql` -- remove focused recovery coverage and restore webhook assertions to synchronous behavior.
- `package.json` -- remove the deleted refresh-work contract test from `contracts:check`.
- `_bmad-output/implementation-artifacts/epic-2-context.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml`, and `_bmad-output/project-context.md` -- likely forward-revert conflict surfaces; retain the committed `c5b10c8` planning reconciliation, including its v1 no-recovery model and removed 2.7/2.8 status entries.
- `src/app/api/sandbox/booqable/sync-orders/route.ts` -- retained legacy exception: secret-protected and preview-denied, refetching through the synchronous sync path; do not change it in this rollback.
- `_bmad-output/implementation-artifacts/spec-2-7-persist-and-recover-authoritative-refresh-work.md` and `_bmad-output/implementation-artifacts/spec-2-8-run-bounded-workers-and-reconciliation-sweeps.md` -- the only obsolete active Story 2.7/2.8 specs to delete.
- `_bmad-output/party-mode/memories/installed/.memlog.md` -- explicit read-only protected local change; never stage, delete, or alter.
- `c5b10c8cbbb463145d3d4cb1dd07701cb1da6378` -- committed planning reconciliation; preserve its PRD, epics, architecture, Epic 2 context, sprint-status, proposal, and project-context results.

## Tasks & Acceptance

**Execution:**
- [ ] Working tree / Git history -- use forward `git revert --no-commit` operations for `4988674` followed by `36cffdc`, resolving only rollback conflicts while retaining the protected `.memlog.md` and `c5b10c8` planning state -- removes local-only Story 2.7 without history rewrite or a new commit.
- [ ] `src/app/api/webhooks/booqable/route.ts`, `src/lib/booqable/contracts/refresh-work.ts`, `src/lib/booqable/contracts/index.ts`, `package.json`, focused test files, and `supabase/migrations/20260815140000_persist_authoritative_refresh_work.sql` -- accept the two inverses as the contained code/schema rollback -- returns v1 to synchronous authoritative refetch without application-managed recovery infrastructure.
- [ ] `_bmad-output/implementation-artifacts/spec-2-7-persist-and-recover-authoritative-refresh-work.md` and `_bmad-output/implementation-artifacts/spec-2-8-run-bounded-workers-and-reconciliation-sweeps.md` -- remove exactly these obsolete Story 2.7/2.8 active specs -- aligns active implementation artifacts with the approved proposal.
- [ ] Local Supabase stack -- run a local-only database reset after migration removal -- makes the local schema match the retained migration history.
- [ ] Verification commands -- execute the six approved checks and capture their outcomes -- proves typing, linting, contracts, unit coverage, database tests, and local type generation remain healthy.

**Acceptance Criteria:**
- Given the current feature branch contains `c5b10c8` and the two Story 2.7 commits, when the rollback completes, then `4988674` and `36cffdc` are reversed as uncommitted forward history and no new commit exists.
- Given the rollback conflict path touches the protected memory log, when it is resolved, then `_bmad-output/party-mode/memories/installed/.memlog.md` exactly matches its pre-rollback working-tree content.
- Given Story 2.7 and 2.8 are cancelled, when active implementation artifacts are inspected, then only their two identified specs are absent and later Story numbering/planning remains intact.
- Given the Story 2.7 migration is absent, when the local Supabase reset finishes, then no remote database or compensating migration was used.
- Given the restored synchronous baseline, when the approved verification suite runs, then all six commands pass or each failure is reported as a blocker with its unmodified output.

## Design Notes

The reverse order matters because `4988674` narrows and hardens infrastructure first introduced by `36cffdc`. Applying their inverses newest-first restores the exact pre-Story-2.7 baseline while keeping subsequent, committed planning content on top. This is a local working-tree rollback, deliberately left uncommitted for the user to review.

## Verification

**Commands:**
- `npx supabase db reset` -- expected: local database rebuilds without the removed Story 2.7 migration.
- `npx tsc --noEmit` -- expected: TypeScript exits successfully.
- `npm run lint` -- expected: ESLint exits successfully.
- `npm run contracts:check` -- expected: retained contract checks exit successfully without refresh-work coverage.
- `npm run test:unit` -- expected: Vitest suite exits successfully.
- `npx supabase test db` -- expected: pgTAP database suite exits successfully.
- `npm run db:types` -- expected: local generated type command exits successfully.
