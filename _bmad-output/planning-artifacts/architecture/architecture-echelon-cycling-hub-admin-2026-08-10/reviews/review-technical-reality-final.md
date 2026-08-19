# Final Technical-Reality Review — Architecture Spine

**Reviewed:** 2026-08-18  
**Artifact:** `ARCHITECTURE-SPINE.md` (updated 2026-08-18)  
**Scope:** Current Booqable ingestion, target canonical wiring, preview/runtime controls, execution and retry constraints, and repository framework/tooling inventory.  
**Verdict:** **Pass, with one documentation-boundary clarification recommended before the spine is treated as the sole implementation authority.** No source or spine files were changed by this review.

## Evidence inspected

- Current production webhook: `src/app/api/webhooks/booqable/route.ts`
- Legacy synchronizer: `src/lib/booqable/sync.ts`
- Canonical target components: `src/lib/booqable/canonical-adapter.ts` and `src/lib/booqable/ingestion-coordinator.ts`
- Preview guard and retained sandbox exception: `src/lib/booqable/ingestion-guard.ts` and `src/app/api/sandbox/booqable/sync-orders/route.ts`
- Runtime/toolchain sources: `package.json`, `package-lock.json`, `supabase/config.toml`, and both migration deployment workflows
- Repository context: `_bmad-output/project-context.md`
- Contract evidence: `npm run contracts:check` passed — 5 files / 81 tests.

## Confirmed reality

### Live legacy webhook versus target canonical wiring

AD-4 correctly makes the distinction in normative text:

- The live route currently authenticates the `?secret=` query parameter, parses the form payload only to obtain an order ID and reject `new`/`concept` orders, then calls `syncBooqableOrder`.
- `syncBooqableOrder` fetches `customer,coupon,lines` and writes the brownfield `customers`, `orders`, and `order_items` tables. It is not the canonical-adapter/coordinator path.
- The target boundary is separately present: `fetchCanonicalOrder` uses the contracted nested include; `ingestCanonicalOrderGraph` / `applyCanonicalOrderGraphRpc` own canonical application. Neither is wired into the current webhook.
- A target claim is correctly required to use the same fetch-and-apply boundary rather than treating a notification payload as truth.

### Preview denial and sandbox exception

The spine’s AD-14 and AD-19 representation matches current code:

- Both webhook and sandbox backfill call `isBooqableIngestionAllowed()` before constructing a service-role client. The guard refuses `VERCEL_ENV === "preview"` even when inherited credentials exist.
- Local development remains allowed when `VERCEL_ENV` is unset; production remains allowed.
- The retained sandbox route is a secret-protected, preview-denied `GET` bulk backfill. It refetches each order through `syncBooqableOrder`; it does not directly repair canonical or Workshop rows, and it is not a queue, worker, Cron, sweep, or per-order repair API.

### Retry and execution budgets

The revised spine no longer asserts an unverified Vercel duration, plan feature, Fluid Compute model, or `maxDuration` configuration. AD-14 instead requires the live-wiring story to record the actual execution model and bind one route-level deadline covering fetch, retry/backoff, normalization, and apply. AD-4 prohibits durable retry infrastructure and limits recovery to bounded in-request transport retries plus explicit user resubmission of a claim.

That is technically sound for the architecture stage. It also correctly does **not** claim that the existing legacy route already meets that budget: `sync.ts` has three 429 attempts with 2-second and 4-second sleeps and no request timeout. The future canonical adapter has its own two-attempt, 4-second-per-request behavior, but is not live. The implementation story must set the total deadline and derive individual attempt/backoff allocations from it before replacing the legacy path.

### Framework and tooling inventory

The stack table and accompanying qualification are accurate:

- `package.json` pins Next.js 16.3.1, React 19.2.8, TypeScript 5.9.3, `@supabase/supabase-js` 2.102.1, `@supabase/ssr` 0.10.0, `@subframe/core` 1.154.0, Zod 4.4.3, and Supabase CLI 2.114.0.
- Node is constrained by `engines.node: ^24.0.0`; both migration workflows set Node 24 and Supabase CLI 2.114.0.
- `supabase/config.toml` sets local PostgreSQL major 17.
- Booqable v4 is evidenced by both legacy and canonical API URLs.
- The table avoids claiming remote database/environment parity from repository files. Broader installed tooling (Vitest, ESLint, Tailwind, Subframe-generated UI, etc.) is accurately captured in project context; the spine’s shorter table does not claim to be exhaustive.

## Finding

### 1. Scope wording still overstates the current canonical boundary

**Location:** Design Paradigm; AD-3; Structural Seed and production flow diagram  
**Trigger condition:** Read as a statement of current system reality rather than target Workshop architecture, “the shipped canonical projection … remain[s] the sole Booqable-source boundary” conflicts with the still-live webhook → `sync.ts` brownfield writer. The diagrams also show a present-tense webhook → canonical adapter path without a current/target label.  
**Guard / clarification:** State that the canonical projection is the sole **target Workshop source boundary after the approved wiring story**, while the current production webhook remains the documented legacy brownfield path through `sync.ts`. Label the architecture diagrams as `Target after live-wiring story`, or show the current legacy path beside the target path.  
**Potential consequence:** An implementer or reviewer can falsely conclude that the canonical route is already live, or can treat the legacy writer as outside the supported transition surface.

## Final path

1. Retain AD-4, AD-14, and AD-19 as written: they accurately establish the target boundary, preview denial, legacy exception, and activation-time budget proof.
2. Clarify the remaining present-tense “sole boundary” and diagram wording so the document’s overview matches its detailed rules.
3. In the live-wiring story, record the actual Vercel execution configuration and enforce a route-level deadline whose attempts, backoff, parse, and database-apply work all fit inside it; do not promote any unverified Vercel value into the spine.
