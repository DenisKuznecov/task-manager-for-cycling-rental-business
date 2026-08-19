# Technical Reality Review — Workshop Tasks Architecture Spine

**Reviewer:** configured technology/reality pass  
**Reviewed:** 2026-08-18  
**Scope:** `ARCHITECTURE-SPINE.md`, the current repository, PRD/addendum, deployment workflows, and authoritative public documentation. The spine itself was not changed.

## Verdict

**FAIL — do not treat the live Booqable path as adopted.** The named framework and database baseline is current and the canonical contracts/RPC exist and are tested, but the repository has not cut the webhook or any Workshop claim path over to that canonical boundary. The spine therefore records target architecture as shipped live reality in several load-bearing rules.

## Findings

### Critical

#### TR-1 — The declared live canonical fetch-and-apply boundary is not wired

- **Spine locations:** Design Paradigm; AD-3, AD-4, AD-15, AD-16; Structural Seed; operational diagram.
- **Evidence:** `src/app/api/webhooks/booqable/route.ts` imports and calls `syncBooqableOrder` from `src/lib/booqable/sync.ts`, which requests `?include=customer,coupon,lines` and directly upserts legacy `customers`, `orders`, and `order_items`. It never imports `canonical-adapter.ts`, `ingestion-coordinator.ts`, or calls `apply_canonical_order_graph`.
- **Contrary repository contract:** `src/lib/booqable/contracts/brownfield-consumers.ts` explicitly says the live include remains `customer,coupon,lines` **until a later story owns fetch**. `_bmad-output/project-context.md` says not to change `sync.ts`, webhook, or sandbox routes until that cutover story.
- **What is real:** `fetchCanonicalOrder`, `normalizeCanonicalOrderPayload`, the coordinator, and service-role-only `apply_canonical_order_graph(jsonb)` do exist. The canonical RPC migration and its pgTAP proof also exist. They are not an end-to-end production ingestion path.
- **Claim path:** no Bike Task claim implementation or task-state migration exists yet; the current `src/lib/workshop-tasks` and `/workshop` files implement checklist-template library work only. Thus the AD-4/AD-15 “same refetch-and-apply before claim” behavior is future architecture, not current behavior.
- **Required closure:** state this as a pending live-wiring/cutover decision, or implement and test one coordinator-backed entry point used by both webhook and claim before retaining `[ADOPTED]`/“shipped” language. Its acceptance proof must demonstrate that no webhook or consequential claim calls `syncBooqableOrder`.

### High

#### TR-2 — “Preview deployments receive no Booqable or service-role credentials” is not established by repository reality

- **Spine location:** AD-14.
- **Evidence:** `src/lib/booqable/ingestion-guard.ts` denies execution when `VERCEL_ENV === "preview"`, but its own comment says preview/branch URLs **can inherit project secrets**. Both webhook and sandbox routes still reference Booqable and service-role environment variables. Vercel environment-variable assignment is not versioned in this repository, so credential non-delivery cannot be verified here.
- **Required closure:** replace the assertion with the enforceable invariant (“preview execution is denied even if credentials are injected”), and add a deployment-configuration evidence gate if non-delivery is required.

#### TR-3 — The no-manual-repair boundary omits a real, privileged legacy backfill endpoint

- **Spine locations:** AD-4, AD-19, Deferred “Source-identity and recovery platform.”
- **Evidence:** `src/app/api/sandbox/booqable/sync-orders/route.ts` is an authenticated, production-allowed endpoint. It pages every Booqable order and invokes `syncBooqableOrder` with the service-role key; it reports per-order failures. It is a real manual source-backfill/recovery mechanism, although it is not a new per-order task-repair API and is explicitly documented as a temporary legacy exception in `_bmad-output/project-context.md`.
- **Required closure:** preserve the exception explicitly in the spine (“no *new* task/source repair API; the named legacy bulk backfill remains until an approved removal/replacement”) or retire it before claiming there is no manual source repair surface.

### Medium

#### TR-4 — The runtime-timeout assertion needs an explicit, current deployment basis before live canonical retries are bound

- **Spine locations:** AD-14 and the operational diagram; affected by AD-4/AD-15.
- **Evidence:** no `maxDuration` is configured in the route and there is no `vercel.json`. The canonical fetch, when used, permits two attempts with a four-second timeout and a one-second delay; it can consume roughly nine seconds before JSON parsing and database apply. The legacy webhook also returns `500` on failure so Booqable redelivers.
- **Current authoritative source:** Vercel’s current Hobby documentation says Fluid Compute defaults and caps Hobby functions at 300 seconds, but its limits documentation preserves the 10-second default for legacy non-Fluid projects. The repository’s `project-context.md` asserts a 10-second constraint, but contains no deployment metadata proving which Vercel execution model governs this project.
- **Consequence:** “keep well under 10 seconds” is prudent but not a verified current platform fact; the proposed canonical path has no total deadline budget.
- **Required closure:** record the actual Vercel plan/execution model and bind a route-level total timeout/`maxDuration` decision plus a time-budget test for fetch, retry, normalization, and RPC.

#### TR-5 — “No retry” must mean no durable recovery infrastructure, not no retry of any kind

- **Spine locations:** AD-4 and AD-19.
- **Evidence:** `src/lib/booqable/canonical-adapter.ts` performs one bounded retry for failed fetches and HTTP 429; `sync.ts` retries 429 up to three attempts; the webhook intentionally returns `500` so Booqable retries delivery. There is no repository evidence of a queue, worker, cron dispatcher, reconciliation sweep, checkpoint, or new per-order repair API.
- **Consequence:** an absolute no-retry reading would contradict current code and could prevent an allowed bounded request-level retry. The PRD/addendum boundary is accurately narrower: no application-managed retry queue, worker, reconciliation sweep, or missed-webhook repair API.
- **Required closure:** phrase the invariant in those precise terms and state whether bounded synchronous transport retries remain allowed within the route time budget.

#### TR-6 — PostgreSQL 17 is verified as the local contract, not as a proven remote fact

- **Spine location:** Stack.
- **Evidence:** `supabase/config.toml` sets `db.major_version = 17`; current PostgreSQL 17 remains supported. The repository correctly treats staging/production extension and version parity as a CI/environment proof gate, and no checked-in data proves the remote server major.
- **Required closure:** retain “PostgreSQL 17” as the local/required target but avoid reading it as a verified staging/production inventory until the deployment evidence gate has run. Include the exact `supabase@2.114.0` CLI pin when documenting the migration toolchain; it is part of the CI reality but omitted from the stack table.

### Low

#### TR-7 — Version table labels package-lock resolutions as fixed application baselines without saying so

- **Spine location:** Stack.
- **Evidence:** Next.js, React, TypeScript, and the Supabase CLI are exact repository pins. `@supabase/supabase-js`, `@supabase/ssr`, `@subframe/core`, and Zod use caret ranges in `package.json`; the listed values are currently installed/locked resolutions, not immutable manifest constraints.
- **Required closure:** label those values “current lockfile resolutions” or pin them if the architecture requires exact version reproducibility.

## Verified Technology and Integration Inventory

| Claim | Result | Evidence |
| --- | --- | --- |
| Next.js 16.3.1 / React 19.2.8 | Verified in manifest; versions are current supported release lines | `package.json`; [Next.js 16.3](https://nextjs.org/blog/next-16-3); [React 19.2](https://react.dev/blog/2025/10/01/react-19-2) |
| Node.js 24.x | Verified in `engines` and CI; Node 24 is LTS | `package.json`; both deploy workflows; [Node releases](https://nodejs.org/en/about/previous-releases/) |
| TypeScript 5.9.3 | Verified | `package.json` |
| Supabase JS 2.102.1 / SSR 0.10.0 | Installed current lockfile resolutions; SSR package remains the documented cookie-session choice for Next.js | `package.json`; [Supabase SSR client guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client) |
| Supabase CLI 2.114.0 | Verified, but omitted from spine Stack | `package.json`; both deploy workflows |
| PostgreSQL 17 | Verified local target and still supported | `supabase/config.toml`; [PostgreSQL version policy](https://www.postgresql.org/support/versioning/) |
| Booqable API v4 | Verified as current external API used by both legacy and canonical fetchers | `sync.ts`; `canonical-adapter.ts`; [Booqable API v4 documentation](https://developers.booqable.com/) |
| Canonical contracts and coordinator | Exist, migration-backed, service-role-only, and contract-tested; not live-wired | `src/lib/booqable/contracts/`; `ingestion-coordinator.ts`; `20260817000000_apply_canonical_source_state.sql` |
| `sync.ts` preservation | Verified: it remains the live brownfield writer | `sync.ts`; `brownfield-consumers.ts`; webhook route |
| Webhook live wiring | Verified live, but legacy-only | webhook route; `tests/booqable-containment/webhook.test.ts` |
| CI-only remote migrations | Verified for branch-triggered staging/main workflows | `.github/workflows/deploy-staging.yml`; `.github/workflows/deploy-production.yml` |
| Preview execution denial | Verified; credential non-delivery is not | `ingestion-guard.ts`; route tests |

## Checks Run

- `lint_spine.py --workspace …/architecture-echelon-cycling-hub-admin-2026-08-10` — passed with 0 mechanical findings.
- `npm run contracts:check` — passed: 5 files, 81 tests.

## Sources Consulted

- [Next.js 16.3 release](https://nextjs.org/blog/next-16-3)
- [React 19.2 release](https://react.dev/blog/2025/10/01/react-19-2)
- [Node.js release schedule](https://nodejs.org/en/about/previous-releases/)
- [Supabase SSR client guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [PostgreSQL supported-version policy](https://www.postgresql.org/support/versioning/)
- [Booqable API v4 documentation](https://developers.booqable.com/)
- [Vercel function limitations](https://vercel.com/docs/functions/limitations) and [legacy limits](https://vercel.com/docs/limits)
