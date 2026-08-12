# Technology-Reality Review Update — Architecture Spine

**Target:** `ARCHITECTURE-SPINE.md`  
**Reviewed:** 2026-08-12  
**Authority allowed by this review:** repository evidence and `technical-workshop-architecture-open-activation-blockers-research-2026-08-12.md`  
**Verdict:** **CONDITIONAL PASS — no critical/high stale technology claim, but several medium claims need narrower wording or an executable proof gate.**

## Executive assessment

The important baseline statements are grounded:

- Next.js resolves to 14.2.35 and the 2026-08-12 research classifies 14.x as unsupported, 16.x as Active LTS, and 15.x as Maintenance LTS.
- React 18.2.0, TypeScript 5.9.3, `@supabase/ssr` 0.10.0, `@supabase/supabase-js` 2.102.1, Subframe 1.154.0, and Zod 4.4.3 match `package-lock.json`.
- PostgreSQL 17 is selected in `supabase/config.toml`; the research reports PostgreSQL 17 in staging and production.
- The repository proves Booqable API v4 use, notification-as-signal refetch, form-encoded webhook parsing, an unguarded service-role backfill route, and disclosure of the rejected webhook secret.
- The research grounds the Supabase SSR header defect, the unpinned Supabase CLI, Vercel's observed Node 24 setting, the current Vercel duration documentation, and the safe Booqable re-scopes.

The spine also correctly treats most unimplemented behavior as architecture plus activation proof rather than as current capability. The remaining problems are mainly evidence classification and over-broad scope. None invalidates the selected modular-monolith architecture, but they should be resolved before implementation stories treat the affected statements as settled facts.

## Findings

### 1. [MEDIUM] The Stack preamble misclassifies Node 24 as repository inventory

The spine says, “Versions are repository inventory,” then lists “Node.js 24.x deployment target; source/CI pin required.” The repository has no `engines.node`, no Node setup step in either migration workflow, and no other source pin. Node 24 is grounded only as connected Vercel metadata and a research recommendation.

This is not an unsupported target, but it is an incorrect evidence label. Separate the table into locked repository inventory, observed environment inventory, and selected target. Otherwise later reviewers may mistake the current Vercel dashboard setting for a reproducible source-controlled runtime.

**Evidence:** `package.json`; `.github/workflows/deploy-staging.yml`; `.github/workflows/deploy-production.yml`; research lines 106–110.

### 2. [MEDIUM] The “documented 300-second Fluid Compute envelope” is too invariant

The research qualifies 300 seconds as the current Fluid Compute default and the Hobby maximum. The spine turns that into “the documented 300-second Fluid Compute envelope” without binding the Vercel plan, deployed function configuration, or a source-controlled `maxDuration`. No repository file establishes a 300-second function duration.

Treat 300 seconds as a dated platform observation, not a permanent worker budget. Activation proof should read the effective deployment limit and select a materially smaller bounded-attempt budget. Database leases and checkpoints correctly remain authoritative.

**Evidence:** research lines 106–120 and 305–315; no `maxDuration` or `vercel.json` duration setting in the repository.

### 3. [MEDIUM] PostgreSQL “extension parity” is not an executable contract

The repository migration creates `pg_stat_statements`, `pgcrypto`, `supabase_vault`, and `uuid-ossp`; the research reports those plus `plpgsql` in production. Staging extension queries timed out. The spine requires “required extension/migration parity” but never names the required extension manifest, schemas, or comparison rule.

“Parity” can incorrectly imply equality across all Supabase-managed extensions and versions. Bind a migration-owned required manifest—at minimum name and expected schema, with version constraints only where the app depends on them—and compare that manifest in local, staging, and production. Keep the existing staging timeout as a blocking unresolved proof.

**Evidence:** `supabase/migrations/20260608102505_remote_schema.sql`; research lines 84–94, 443–456.

### 4. [MEDIUM] The proposed pgTAP directory layout is not grounded

The structural seed commits tests under `supabase/tests/database/booqable-integration/` and `supabase/tests/database/workshop-tasks/`. The research establishes official support for tests under `supabase/tests` and execution through `supabase test db`; it does not establish recursive discovery through those nested directories.

Before stories adopt the seed, verify recursive discovery with the exact pinned CLI or use the CLI's documented layout. A test tree that looks correct but is silently skipped would defeat AD-14's proof gate.

**Evidence:** spine structural seed lines 265–268; research lines 408–441.

### 5. [MEDIUM] The standalone inventory collection statement lacks an allowed source

AD-13 says to “prefer observed standalone inventory collections,” and Deferred calls such reads “an observed optimization.” The repository has no standalone inventory adapter. The 2026-08-12 research does not document the endpoint, observed response, or evidence artifact for this claim.

This may come from the earlier selective-warehouse spike, but that is outside the two evidence authorities requested for this review. Under the present criterion, the statement is unsupported. Keep the nested-order path as the required implementation and classify standalone inventory as an unverified optimization until its observation is imported into the research or fixture set.

**Evidence:** no matching repository implementation; no standalone-inventory finding in the 2026-08-12 research.

### 6. [MEDIUM] Archive/tombstone authority is broader than the verified Booqable resource semantics

The verified upstream statements are resource-specific: removed Plannings expose `archived`/`archived_at`, and OrderFulfillment can return archived StockItemPlannings in `changed_stock_item_plannings`. AD-3/AD-4 use broader language for “non-customer archive-capable entities” and any “source child.”

The safe non-closing-absence rule is sound. Closure authority should nevertheless be registered per resource type and operation. A generic `archived`-looking field must not become authority for Products, ProductGroups, Bundles, BundleItems, Lines, or StockItems without a documented or fixture-proven contract for that exact resource and canonical refetch path.

**Evidence:** research lines 220–233 and 633–641.

### 7. [MEDIUM] “Minimum proven Workshop graph” overstates Bundles/BundleItems support

AD-3 calls the admitted graph “minimum proven” and includes Bundles/BundleItems where required. The repository projects only customers, orders, and lines/order items. The 2026-08-12 research does not establish a target-account Bundle/BundleItem fixture, stable bundle-parent relationship contract, or source-version behavior.

The graph is a reasonable candidate schema, but “proven” is too strong for bundle resources. Make bundle admission conditional on a named fixture and contract, or remove “proven” from the graph description.

**Evidence:** `src/lib/booqable/sync.ts`; `supabase/migrations/20260610151000_add_order_items_and_payment_fields.sql`; no bundle proof in the 2026-08-12 research.

### 8. [MEDIUM] Node 24 compatibility proof omits the repository's Node 20 type surface

The selected Node 24 target is grounded by the research, but the repository pins `@types/node` 20.19.33. AD-14 requires Node 24 pinning and broad build/runtime checks without explicitly deciding whether the type package advances to Node 24 or remains intentionally constrained.

Add the Node type surface to the compatibility gate. Otherwise source can claim Node 24 while compile-time APIs continue to model Node 20.

**Evidence:** `package.json` line 42; research lines 106–110 and 393–400.

### 9. [MEDIUM] Hosted Supabase capability-role feasibility remains proof, not fact

AD-11 commits non-login owners and separate non-login `BYPASSRLS` capability roles. The research judges the capability model appropriate and correctly requires effective-role tests, but neither repository migrations nor the research provide an executed target-project proof that the CI migration identity can create, alter, own, and grant exactly those roles under hosted Supabase restrictions.

Keep the model, but make role creation/ownership migration success itself an explicit local-and-staging foundation gate—not merely a later query-permission test. Production must still be migrated only through CI.

**Evidence:** no capability-role migration in the repository; research lines 329–346 and 443–456.

### 10. [LOW] Next.js support status is sound but should remain date-bound

The unsupported 14.x / Active-LTS 16.x / Maintenance-LTS 15.x statement is grounded in the same-day research. The architecture correctly requires a supported line at activation, so no stale claim exists now. However, “prefer 16.x” is a 2026-08-12 recommendation, not a timeless target.

The upgrade story should re-read the support policy at execution and choose a supported major then, while preserving the required 14 → 15 → 16 compatibility work if 16 remains the selected target.

**Evidence:** research lines 72–82 and 383–391.

### 11. [LOW] Booqable least-privilege identity is appropriately conditional but not yet actionable

AD-14 says to use a least-privileged Booqable identity “where supported.” Neither the repository nor the research establishes available Booqable credential scopes for this account. The conditional wording avoids a false guarantee, but it is not yet a testable gate.

Record the credential type and available scopes during environment proof; if Booqable offers no narrower scope, document that exception and contain the credential operationally.

**Evidence:** repository uses one bearer API key; research discusses least privilege but contains no account scope inventory.

## Technology statement audit

### Next.js and React

**Grounded.** Lockfile inventory confirms Next.js 14.2.35 and React/ReactDOM 18.2.0. `next.config.js` contains the two experimental Next.js 14 keys identified by research. The unsupported-current-line warning and tested supported-major gate are appropriately strong. “Prefer 16.x” is a recommendation subject to compatibility proof, not a claim that the current app already supports it.

### Node.js 24

**Grounded as observed environment metadata and selected target; not grounded as repository inventory.** The spine correctly says a source/CI pin is still required. The missing `engines.node`, CI setup, and Node 20 type package must remain visible implementation work.

### Supabase SSR

**Grounded.** Lockfile inventory confirms `@supabase/ssr` 0.10.0. The middleware's `setAll(cookiesToSet)` callback does not accept or propagate the documented second-argument headers. Requiring a refresh fixture that proves `Cache-Control: private, no-store` accurately carries the research conclusion into an activation gate.

### Supabase CLI and database tests

**Mostly grounded.** Both workflows request `version: latest`, and there is no CLI dev dependency, so exact stable pinning is required. `supabase test db`, lint, reset, and generated-type checks are grounded by the research. The only unsupported commitment is recursive discovery of the proposed nested pgTAP directories.

### PostgreSQL and extensions

**Grounded with an unresolved environment gate.** Local config specifies PostgreSQL 17; research reports PostgreSQL 17 remotely. Repository and production extension names align for the four explicitly created extensions, while staging remains unverified. The word “parity” needs a bounded manifest to avoid comparison against irrelevant managed extensions.

### Vercel Cron and Fluid Compute

**Supported design, with one over-strong duration phrase.** A Cron bearer header using `CRON_SECRET` and a lease-fenced Node worker are grounded in current Vercel documentation cited by research. One nightly schedule is an architecture choice, not a current repository feature. The exact 300-second value is dated configuration context and must not become the worker's correctness boundary.

### Booqable API and semantics

**Core decisions grounded.** Repository code proves API v4 JSON:API reads and authoritative order refetch. Research grounds exact StockItem-backed identity, ambiguous multi-quantity shortfall handling, ProductGroup UUID classification, per-bike lifecycle fixture gates, explicit Planning/StockItemPlanning archives, and permanently non-closing generic absence.

**Narrowing required.** Standalone inventory collection observation is absent from the allowed evidence, bundle resources are not yet “proven,” and archive authority must remain resource-specific. Setup mapping is correctly left unproven and fail-closed.

### Security and deployment

**Grounded.** Repository code confirms supplied-secret logging, API-route middleware exclusion, and the unauthenticated service-role sandbox route. CI-only remote DDL matches the repository workflows and workspace migration policy. The proposed capability model is technically plausible and research-backed, but hosted role creation/ownership needs executable environment proof.

## Disposition

No critical/high technology-reality defect was found. The spine is suitable to remain the architecture authority if all medium findings are treated as pre-decomposition or activation-gate clarifications. In particular, implementation should not rely on the 300-second duration as a constant, nested pgTAP discovery, standalone inventory collections, generic cross-resource archive semantics, or bundle support until those claims receive the named proof.
