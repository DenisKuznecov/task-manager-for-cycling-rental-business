# Story 2.3 Toolchain Pin Proof

Date: 2026-08-14  
Baseline: `e9711c4a7dd6a04a7f3cbb1325c174b7b22f7705`  
Node used for verification: `v22.21.0` (local runtime; repository pin is Node 24.x)

## Landed versions

| Pin | Before | After |
|---|---|---|
| `engines.node` | `^20.0.0 \|\| ^22.0.0 \|\| >=24.0.0` | **`^24.0.0`** (24.x only) |
| `@types/node` | `20.19.33` | **`24.13.3`** (lockfile matches) |
| Supabase CLI (npm `supabase`) | none | **`2.114.0`** exact (lockfile `node_modules/supabase` = 2.114.0) |
| `supabase/setup-cli` (staging + production) | `version: latest` | **`version: 2.114.0`** |
| Workflow Node setup | none | **`actions/setup-node@v4` `node-version: 24`** |
| Local PostgreSQL | major 17 (`config.toml` unchanged) | **17.6** after reset |

Homebrew `/opt/homebrew/bin/supabase` is **2.105.0** and is not the pin. `npx supabase --version` reports **2.114.0**. 2.115.x remains beta and was not used.

`strict: true` is unchanged. Vitest remains the only JS test runner. Deploy workflows still run only `supabase db push` — `next build` was not added.

## Required extension manifest

Migration `supabase/migrations/20260814120000_required_extension_manifest.sql` is the contract (name + expected schema; no version pins). `plpgsql` is asserted present in `pg_catalog` and is not created.

Local inventory after reset (`npx supabase db query --local`):

| Extension | Schema |
|---|---|
| `plpgsql` | `pg_catalog` |
| `pgcrypto` | `extensions` |
| `uuid-ossp` | `extensions` |
| `pg_stat_statements` | `extensions` |
| `supabase_vault` | `vault` |

Staging/production extension parity remains an **environment-proof gate**. The prior staging extension-query timeout is still unresolved environment proof. This story did not query or apply DDL to staging or production.

## Command results

| Command | Result |
|---|---|
| `npm install` | Lockfile resolves `@types/node@24.13.3` and `supabase@2.114.0`. `EBADENGINE` warning: local Node is `v22.21.0`, engines require `^24.0.0`. Install succeeded (engine-strict is off). |
| `npx supabase --version` | **2.114.0** |
| `npx supabase db reset` | Exit 0. Applied `20260814120000_required_extension_manifest.sql` on local PG 17. Non-blocking warning: `config section [inbucket] is deprecated. Please use [local_smtp] instead.` `config.toml` was not changed. |
| `npx supabase test db` | Exit 0. **Files=6, Tests=188, Result: PASS**. Discovered nested trees: `supabase/tests/database/toolchain/001_required_extensions.pgtap.sql` and all five `supabase/tests/database/workshop-tasks/*.pgtap.sql`. None skipped. |
| `npm run db:types` | Exit 0. `supabase gen types typescript --local` wrote TypeScript to stdout only (not committed; no app consumer). |
| `npx tsc --noEmit` | Exit 0. `strict: true` unchanged. |
| `npm run lint` | Exit 0 (`eslint .`). 0 errors, 19 pre-existing `<img>` / alt warnings. |
| `npm run test:unit` | Exit 0. 10 files / **131 tests** passed, including `tests/booqable-containment/`, `tests/runtime-upgrade/` (Story 2.2 invariants intact), and `tests/toolchain/pin-invariants.test.ts`. |

## Environment-proof gate (not closed here)

- Staging/production PostgreSQL + extension comparison is deferred to the environment-proof story.
- Do not treat this local inventory as remote parity.
- Do not retry or “fix” the timed-out staging extension read from this story.
