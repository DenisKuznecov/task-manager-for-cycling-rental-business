---
title: 'Pin the Node and Database Toolchain'
type: 'chore'
created: '2026-08-14'
status: 'done'
baseline_revision: 'e9711c4a7dd6a04a7f3cbb1325c174b7b22f7705'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/project-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
warnings: []
deferred:
  - summary: >-
      supabase/config.toml still uses the deprecated [inbucket] section, which warns on local reset.
    evidence: |-
      npx supabase db reset prints: config section [inbucket] is deprecated. Please use [local_smtp] instead. The warning pre-dates this story; config.toml was left unchanged.
    location: >-
      supabase/config.toml
    severity: low
---

<intent-contract>

## Intent

**Problem:** Node and the Supabase CLI are still environment-selected. `engines.node` allows 20/22, `@types/node` is 20, CI installs an unbounded `latest` CLI, and required PostgreSQL extensions have no migration-owned contract. Local and CI proof cannot share one supported baseline.

**Approach:** Pin Node 24.x and its type surface in package metadata and workflows. Add one locally tested stable Supabase CLI as an exact lockfile pin and replace CI `latest`. Own the required extension list in an idempotent migration. Record local reset, tests, generated types, and version-check results. Do not change remote databases.

## Boundaries & Constraints

**Always:** Pin `engines.node` to 24.x only and advance `@types/node` to 24.x. Select one current stable (non-beta) Supabase CLI, prove it locally with reset, `supabase test db` (must still discover nested `supabase/tests/database/workshop-tasks/`), and `supabase gen types typescript`, then pin that exact version in `package.json`, the lockfile, and both deploy workflows. Required extensions are the production-known set: `plpgsql`, `pgcrypto`, `uuid-ossp`, `supabase_vault`, `pg_stat_statements` (schemas from the existing dump). `plpgsql` is built-in — assert presence, do not invent a create. Local PostgreSQL stays major 17. Staging/production comparison is an environment-proof gate; keep the prior staging extension-query timeout as unresolved environment proof. Record versions and command results in a proof file. Keep `strict: true` and the existing Vitest runner. Preserve Stories 2.1 and 2.2.

**Block If:** No stable CLI can complete local reset + `supabase test db` + type generation. The chosen CLI silently skips the existing nested pgTAP tree. The manifest would add an extension that is not in the production-known set.

**Never:** Apply DDL or query-fix staging/production (including the timed-out staging extension read). Leave `version: latest` in CI. Leave `engines.node` allowing Node 20 or 22. Treat the Homebrew global CLI (currently 2.105.0) as the pin. Add envelopes, workers, cron, Booqable writers, or a Next upgrade. Weaken TypeScript strictness, skip hooks, or add a second test runner. Add `next build` to the deploy workflows (already deferred from Story 2.2).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Unpinned CI CLI | `supabase/setup-cli` `version: latest` | Both workflows use the same exact CLI version as `package.json` / lockfile | Fail the version-check if `latest` remains |
| Loose Node engines | `^20.0.0 \|\| ^22.0.0 \|\| >=24.0.0` and `@types/node` 20.19.33 | `engines.node` is 24.x only; `@types/node` is 24.x; workflows set up Node 24 | N/A |
| Local reset with pinned CLI | `supabase db reset` or `migration up` on local PG 17 | Every required extension is present idempotently | Record failure; do not touch remote |
| Nested pgTAP discovery | Existing `supabase/tests/database/workshop-tasks/*.pgtap.sql` | Pinned CLI runs those tests | Block If they are skipped |
| Type generation | `supabase gen types typescript` | Command succeeds; result recorded | Record failure; do not invent app consumers |
| Staging/prod parity | No remote access in this story | Proof names parity as an environment-proof gate | Do not query-fix the staging timeout |

</intent-contract>

## Code Map

- `package.json:5-6` -- `engines.node` is `^20.0.0 || ^22.0.0 || >=24.0.0`. Line 46: `@types/node` `20.19.33`. No `supabase` dependency. Scripts have no type-generation command.
- `package-lock.json` -- lockfile must carry the exact CLI and `@types/node` 24 pin.
- `.github/workflows/deploy-staging.yml:20-23` and `deploy-production.yml:21-24` -- `supabase/setup-cli@v2` with `version: latest`. Neither job sets up Node.
- `supabase/config.toml:43` -- `major_version = 17`. Do not change.
- `supabase/migrations/20260608102505_remote_schema.sql:20-41` -- dump creates `pg_stat_statements`, `pgcrypto`, `supabase_vault`, `uuid-ossp`. It is inventory, not the contract. Latest workshop migration is `20260813160000_*.sql`.
- `supabase/tests/database/workshop-tasks/*.pgtap.sql` -- existing nested pgTAP; pinned CLI must still discover it.
- `tests/runtime-upgrade/next-16-invariants.test.ts` -- file-reading Vitest pattern to copy for toolchain pins. Do not weaken 2.2 assertions.
- `_bmad-output/implementation-artifacts/2-2-runtime-upgrade-proof.md` -- proof-file shape to copy.
- `_bmad-output/implementation-artifacts/deferred-work.md:6-7` -- Story 2.2 deferred the Node 20/22 engines hole to this story.
- Local Homebrew CLI at `/opt/homebrew/bin/supabase` is 2.105.0 — not the pin. As of 2026-08-14, latest stable GitHub release is 2.114.0; 2.115.x is beta.

## Tasks & Acceptance

**Execution:**
- `package.json` + `package-lock.json` -- set `engines.node` to 24.x only; pin `@types/node` 24.x; add exact stable `supabase` CLI as a devDependency after local proof; add a `db:types` script that runs `supabase gen types typescript` -- repository owns the toolchain
- `.github/workflows/deploy-staging.yml` and `deploy-production.yml` -- replace `version: latest` with that exact CLI version; add Node 24 setup -- CI matches source
- `supabase/migrations/20260814120000_required_extension_manifest.sql` -- idempotent required-extension contract (name + schema; no version pins unless the app depends on one) -- dump is not the manifest
- `supabase/tests/database/toolchain/001_required_extensions.pgtap.sql` -- assert every required extension is present on local PG 17 -- local proof of the manifest
- `tests/toolchain/pin-invariants.test.ts` -- assert engines 24.x only, lockfile CLI equals workflow CLI, workflows are not `latest`, `@types/node` is 24.x -- CI-equivalent version checks
- `_bmad-output/implementation-artifacts/2-3-toolchain-pin-proof.md` and `_bmad-output/project-context.md` -- record pinned versions, local reset/migration/extension/`test db`/types/lint/typecheck results, and that staging/prod parity remains an environment-proof gate -- AC requires an explicit record

**Acceptance Criteria:**
- Given Node and Supabase CLI versions were previously environment-selected, when source and CI configuration are updated, then Node 24.x and one locally tested stable Supabase CLI version are pinned consistently in package metadata, lockfile, and workflows, and CI no longer installs an unbounded `latest` CLI.
- Given the database requires PostgreSQL extensions, when the migration-owned extension manifest is defined, then local PostgreSQL 17 contains every required extension idempotently, and staging/production parity remains an environment-proof gate rather than a manual DDL action.
- Given the pinned toolchain runs locally, when local database reset, migration, extension checks, generated types, and CI-equivalent tool-version checks execute, then results are recorded without weakening TypeScript strictness or bypassing hooks/checks, and remote databases are not modified.

## Spec Change Log

## Review Triage Log

### 2026-08-14 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 3: (high 0, medium 0, low 3)
- defer: 1: (high 0, medium 0, low 1)
- reject: 16
- addressed_findings:
  - `[low]` `[patch]` Marked the Story 2.2 engines-hole deferred item resolved by Story 2.3 in `deferred-work.md`
  - `[low]` `[patch]` Updated the proof unit-test count from 130 to 131
  - `[low]` `[patch]` Required `--local` on the `db:types` invariant so typegen cannot silently target a remote

## Design Notes

Prefer current stable 2.114.0 after local proof; fall back to 2.113.0 if 2.114.0 fails reset/`test db`/types. Do not pin a beta. The npm `supabase` package is the repo pin; Homebrew stays irrelevant. Manifest compares names and expected schemas (`extensions` / `vault`; `plpgsql` in `pg_catalog`). Do not write generated types into an app consumer in this story.

## Verification

**Commands:**
- `npm install` -- lockfile contains the exact CLI and `@types/node` 24.x
- `npx tsc --noEmit` -- no new errors; `strict` unchanged
- `npm run lint` -- succeeds
- `npm run test:unit` -- existing Vitest plus toolchain invariants stay green
- `npx supabase db reset` -- local PG 17 applies the manifest; extensions present
- `npx supabase test db` -- toolchain pgTAP and existing workshop-tasks pgTAP run
- `npm run db:types` -- type generation succeeds

## Auto Run Result

Status: done

**Summary:** Node 24.x and Supabase CLI 2.114.0 are pinned in package metadata, the lockfile, and both deploy workflows. A migration-owned extension manifest makes the required local PostgreSQL 17 extensions idempotent. Local reset, nested pgTAP, type generation, lint, and typecheck were recorded. Remote databases were not modified. Staging/production extension parity remains an environment-proof gate.

**Files changed:**
- `package.json` / `package-lock.json` — `engines.node` `^24.0.0` only; `@types/node@24.13.3`; exact `supabase@2.114.0`; `db:types` script
- `.github/workflows/deploy-staging.yml` / `deploy-production.yml` — Node 24 setup; CLI `2.114.0` instead of `latest`
- `supabase/migrations/20260814120000_required_extension_manifest.sql` — idempotent required-extension contract
- `supabase/tests/database/toolchain/001_required_extensions.pgtap.sql` — local PG 17 + five extensions
- `tests/toolchain/pin-invariants.test.ts` — CI-equivalent pin checks, including `--local` typegen
- `2-3-toolchain-pin-proof.md` / `project-context.md` / `deferred-work.md` — proof, agent context, closed 2.2 engines hole

**Review findings:** 3 low patches applied; 1 low item deferred (`[inbucket]` deprecation); 16 rejected.

**Follow-up review recommendation:** false (patched: high 0, medium 0, low 3; score `3 × 0 + 1 × 3 = 3`, threshold 5).

**Verification:**
- `npm install` — lockfile has `@types/node@24.13.3` and `supabase@2.114.0` (local Node 22 prints `EBADENGINE`)
- `npx tsc --noEmit` — exit 0, `strict: true` unchanged
- `npm run lint` — exit 0, 19 pre-existing `<img>` warnings
- `npm run test:unit` — 10 files / 131 tests pass
- `npx supabase db reset` — exit 0 on local PG 17.6 (implementer); parent re-proved via `test db` on that stack
- `npx supabase test db` — 6 files / 188 tests PASS, including nested `workshop-tasks/`
- `npm run db:types` — exit 0, stdout only

**Residual risks:** Local developer Node is still 22.21.0; use Node 24 to match the pin. Homebrew `supabase` 2.105.0 may still be on `PATH` — use `npx supabase`. Staging/production extension parity is not closed.
