# Technical-Reality Completion Review — Workshop Tasks MVP Spine

**Reviewed:** 2026-08-18  
**Artifact:** `ARCHITECTURE-SPINE.md`  
**Scope:** Current legacy versus target canonical Booqable wiring, preview denial, retained sandbox exception, retry and execution-budget boundaries, and stack inventory.  
**Verdict:** **PASS.** No critical or high findings. The spine accurately describes the current legacy route separately from the target canonical path and gates the target's activation on measurable deployment evidence.

## Verified conclusions

### Current legacy versus target canonical wiring

The distinction is unambiguous in both normative prose and diagrams:

- The Design Paradigm flowchart and production topology are explicitly labeled as the target **after the approved live-wiring story**.
- AD-3 states that the existing production webhook continues through `sync.ts` until that story is implemented; AD-4 repeats the same cutover condition.
- The live webhook imports and invokes `syncBooqableOrder`, whose `customer,coupon,lines` fetch and brownfield writes remain the current production reality.
- The target canonical adapter, coordinator, and `apply_canonical_order_graph` RPC exist, but repository search confirms that they are not called by the current webhook or a Workshop claim path. No claim implementation currently exists.

This prevents the prior ambiguity between a shipped canonical substrate and a live canonical ingress path.

### Preview denial and the sandbox exception

AD-14 and AD-19 accurately reflect the enforceable runtime boundary:

- Both the webhook and sandbox route call `isBooqableIngestionAllowed()` before creating a service-role client.
- The guard rejects `VERCEL_ENV === "preview"` even when preview deployments inherit secrets; the spine does not make an unverifiable claim that previews receive no credentials.
- The retained sandbox endpoint is explicitly documented as a temporary legacy bulk backfill exception. It requires `Authorization: Bearer` with `BOOQABLE_SYNC_SECRET`, refetches each order through `syncBooqableOrder`, and does not directly repair canonical or Workshop rows.
- The exception is correctly excluded from the prohibited new per-order repair API, queue, worker, sweep, hidden retry loop, or reconciliation system.

### Retry policy and execution budget

The policy is technically accurate and bounded:

- AD-4 permits bounded synchronous transport retries and explicit resubmission of the original claim, while prohibiting durable retry/recovery infrastructure.
- The canonical adapter currently has at most two fetch attempts, a four-second per-attempt timeout, and a one-second backoff. It is target-only, not live.
- The legacy synchronizer retains its separate three-attempt 429 retry behavior and has no request timeout; the spine does not represent that as satisfying the proposed target budget.
- AD-14 correctly makes a verified execution model and route-level total deadline a live-wiring acceptance gate covering fetch, retry, normalization, and apply. No checked-in `maxDuration`, `vercel.json`, or deployment metadata establishes a current route budget, so the spine appropriately does not assert one.

### Stack inventory

The Stack table is accurate as qualified:

- Exact manifest pins: Next.js 16.3.1, React 19.2.8, TypeScript 5.9.3, and Supabase CLI 2.114.0.
- Current manifest/lockfile resolutions: `@supabase/supabase-js` 2.102.1, `@supabase/ssr` 0.10.0, `@subframe/core` 1.154.0, and Zod 4.4.3.
- Node is constrained to `^24.0.0`; both database deployment workflows use Node 24 and Supabase CLI 2.114.0.
- `supabase/config.toml` declares PostgreSQL 17 as the local required target. The spine correctly leaves remote parity as CI/deployment proof rather than claiming it as established inventory.
- Booqable API v4 is evidenced by both the legacy and canonical API clients.

## Evidence inspected

- `src/app/api/webhooks/booqable/route.ts`
- `src/lib/booqable/sync.ts`
- `src/lib/booqable/canonical-adapter.ts`
- `src/lib/booqable/ingestion-coordinator.ts`
- `src/lib/booqable/ingestion-guard.ts`
- `src/app/api/sandbox/booqable/sync-orders/route.ts`
- `supabase/migrations/20260817000000_apply_canonical_source_state.sql`
- `tests/booqable-contracts/brownfield-consumers.test.ts`
- `tests/booqable-containment/ingestion-guard.test.ts`
- `package.json`, `package-lock.json`, `supabase/config.toml`
- `.github/workflows/deploy-staging.yml`, `.github/workflows/deploy-production.yml`
- `_bmad-output/project-context.md`

## Validation

- `npm run contracts:check` — passed: 5 test files, 81 tests.
- Repository search found no `vercel.json` or route-level `maxDuration`; this supports treating the execution budget as a pre-live-wiring gate, not current established deployment fact.

## Findings

None at critical or high severity.
