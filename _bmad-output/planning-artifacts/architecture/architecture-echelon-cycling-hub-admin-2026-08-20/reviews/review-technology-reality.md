# Technology Reality Review — Architecture Spine

**Artifact reviewed:** `ARCHITECTURE-SPINE.md` (updated 2026-08-20)  
**Review date:** 2026-08-20  
**Verdict:** **CONDITIONAL FAIL — the upgrade target and most brownfield pins are real, but several committed stack/tooling claims were not current-docs-checked and would mislead implementation.**

Next.js `16.3.1` and Vitest `4.1.11` exist and are the current stable npm latest as of this review. PostgreSQL 17, Vercel Node `24.x`, and the lockfile brownfield versions match the repo. The spine still treats React `18.2.0` as the post-upgrade stack, tells implementers to keep “matching Next lint tooling” after a major that **removed** `next lint`, and pins Supabase CLI `2.105.0` while CI still installs `latest` and npm latest is `2.115.0`. Booqable `Retry-After` remains undocumented. Those are not brownfield transcriptions; they are unverified or stale committed decisions.

## Review method and evidence

Every committed version, provider, and platform rule in the spine was checked against at least one of:

- `package.json` / `package-lock.json`
- `supabase/config.toml`, migrations, `.github/workflows/*`, `src/middleware.ts`, webhook route, workshop routes
- live npm registry metadata for `next@16.3.1`, `vitest@latest`, `supabase@latest`, `@supabase/supabase-js@latest`, `@supabase/ssr@latest`, `typescript@latest`, `zod@latest`, `@subframe/core@latest`
- official Next.js support policy and version-16 upgrade guide
- official Booqable API v4 page
- PostgreSQL 17 docs (`digest` / `sha256`, `security_invoker` views, time zones)
- read-only Supabase and Vercel project metadata

“Verified” means the claim is supported for this repository as of 2026-08-20. It does not mean a brownfield pin is the newest release. “Unverified” means the spine asserts provider behavior or a pin that current docs/registry do not confirm.

This supersedes the earlier review written against the pre-upgrade spine that still treated Next.js 14 as the runtime choice.

## Findings

### TR-01 — Next.js `16.3.1` is a real, current Active LTS target; the app is still on unsupported `14.2.35`

**Claim:** Upgrade from unsupported `14.2.35` to `16.3.1` before feature work (Build Readiness, AD-12, Stack).

**Evidence:**

- Lockfile root `next` is `14.2.35`. `package.json` declares `^14.2.3`.
- Official [Next.js support policy](https://nextjs.org/support-policy) (fetched 2026-08-20): 16.x Active LTS, 15.x Maintenance LTS, 14.x unsupported.
- npm `next@16.3.1` exists (`engines.node: >=20.9.0`). GitHub tag `v16.3.1` published 2026-08-13. Registry `latest` is `16.3.1`.
- [endoflife.date/nextjs](https://endoflife.date/nextjs) lists 16.3.1 (13 Aug 2026) as the current 16.x patch.

**Result:** **Verified target; brownfield blocker is accurately named.**

**Required correction:** None for the version number. Treat the upgrade as a real gate, not as already done.

### TR-02 — “Matching Next lint tooling” is false for Next.js 16

**Claim:** Pin “matching Next lint tooling” with the 16.3.1 upgrade (AD-12).

**Evidence:**

- Official [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16): `next lint` is **removed**; `next build` no longer lints; migrate with `next-lint-to-eslint-cli` and run ESLint/Biome directly. Match `eslint-config-next` to the Next major.
- Official [ESLint config docs](https://nextjs.org/docs/app/api-reference/config/eslint) (version 16.3.1): same removal.
- Repo today: `"lint": "next lint"`, `.eslintrc.json` extends `next/core-web-vitals`, `eslint-config-next` is **`13.5.4`** while Next is already `14.2.35`. ESLint 8 is in `package.json`.
- `eslint-config-next@16.3.1` exists on npm.

**Result:** **Incorrect committed tooling claim.** Training-shaped leftover, not current-docs-checked.

**Why it matters:** An implementer who “matches Next lint tooling” will keep a deleted command and a two-majors-stale config package. The upgrade gate will fail on `npm run lint` unless the script and ESLint stack are rewritten.

**Required correction:** Replace AD-12 lint wording with: install `eslint-config-next@16.3.1`, migrate to ESLint CLI / flat config, drop `next lint`. Record the existing `13.5.4` mismatch as brownfield debt to clear in the same upgrade.

### TR-03 — Stack table mixes a Next 16 target with an un-upgraded React 18.2.0 pin

**Claim:** Stack is Next `16.3.1` and React / React DOM `18.2.0`.

**Evidence:**

- Lockfile: `react` and `react-dom` are exactly `18.2.0`. Accurate brownfield.
- npm `next@16.3.1` `peerDependencies` still allow `^18.2.0 || ^19.0.0`.
- Official upgrade guide section **“React 19.2”**: App Router in Next.js 16 uses the React Canary channel that includes React 19.2 features. The documented App Router platform is not “stay on 18.2.0.”
- `@types/react` is `^18`. Subframe core peers allow React 16–19, so Subframe does not force 18.

**Result:** **Brownfield pin verified; post-upgrade React version unverified / likely wrong.**

**Why it matters:** Shipping Next 16 while pinning React 18.2.0 is a compatibility experiment, not a researched stack. Peer-dep allowance is not the same as App Router support. The spine presents 18.2.0 as the chosen stack, not as “current lockfile until the upgrade PR chooses React.”

**Required correction:** Split the stack table into **current lockfile** vs **post-upgrade target**. For the Next 16 row, name a current React 19.x (web-check the npm latest at upgrade time) or explicitly record “remain on 18.2.0” as a risk-accepted exception with a reason.

### TR-04 — Supabase CLI `2.105.0` exists but is neither current nor applied

**Claim:** Pin Supabase CLI `2.105.0` in CI before feature migrations (AD-12, Stack).

**Evidence:**

- GitHub release [v2.105.0](https://github.com/supabase/cli/releases/tag/v2.105.0) exists (2026-06-04). The number is not invented.
- npm `supabase@latest` on 2026-08-20 is **`2.115.0`** (published 2026-08-18). GitHub also has `v2.114.0` (2026-08-12) and `v2.115.0`.
- Both deploy workflows still use `supabase/setup-cli@v2` with `version: latest`. There is no `supabase` package in `package.json`.
- Official CLI docs still recommend pinning the npm package version in the project. `supabase test db` exists; `--local` is a real flag and is the default (`true`).

**Result:** **Version existed ~11 weeks ago; pin is stale relative to current stable and is not in the repo.**

**Why it matters:** CI `latest` can drift from whatever a developer installs as 2.105.0. Pinning June’s CLI also misses later `test db` work (including shadow-db flags discussed after 2.105.0). A reproducibility pin should be a **current** verified release, then applied in both workflows.

**Required correction:** Re-pin against today’s stable (`2.115.0` unless a dated incompatibility is found), set `version: 2.115.0` (or the chosen pin) in both GitHub Actions files, and optionally add `supabase` as a devDependency. Do not leave `2.105.0` as if it were today’s CLI.

### TR-05 — Booqable v4 is real; `Retry-After` and webhook semantics are still not in official docs

**Claim:** Booqable API v4; retry network/`5xx`/`429` with exponential backoff, jitter, and `Retry-After` (AD-10). Webhook is signal-only; eligibility from fetched snapshot.

**Evidence:**

- Current official [Booqable API v4](https://developers.booqable.com/v4.html) is live. Status table documents HTTP `429`. `stock_items` appear as resource owners and in `order_fulfillments` `book_stock_items` / `specify_stock_items`. Pagination and includes are documented.
- Full-text search of that v4 page found **no** `Retry-After` (or `retry-after`) string.
- Official v4 page does not establish `order.updated`, webhook authentication, duplicate/order guarantees, or read-after-write delay. The spine already defers those to the tenant spike — except it still **commits** `Retry-After` in AD-10.

**Result:** **API generation verified; Retry-After is asserted without evidence.**

**Required correction:** Keep retry of `429`/`5xx`/network. Treat `Retry-After` as “honor if present; otherwise exponential backoff,” and leave header behavior in the deferred spike list. Do not present it as a documented Booqable contract.

### TR-06 — Next.js 16 upgrade surface that AD-12 does not name

**Claim:** Upgrade Next.js and keep the current platform (Vercel + Supabase PostgreSQL 17).

**Evidence (official upgrade guide + this repo):**

- Node `>=20.9.0` — matches AD-12. Vercel project `echelon-cycling-hub-admin` reports **Node.js `24.x`**. Vitest `4.1.11` engines allow `^20 || ^22 || >=24`, so 24.x fits.
- `middleware.ts` still exports `middleware`. Next 16 deprecates the filename/export in favor of `proxy.ts` / `proxy()` (Edge runtime stays on `middleware` if required). This app’s middleware is Node-style session refresh via `@supabase/ssr`.
- Async Request APIs: several pages already `await searchParams` as a `Promise`; `src/app/login/page.tsx` still types `searchParams?: { next?: string }` and reads it synchronously — that breaks on Next 16.
- Turbopack is the Next 16 default bundler; webpack opt-out is `--webpack`. Not mentioned.
- `after()` is stable in Next 15.1+ and is the documented continuation API. AD-10 correctly **does not** detach webhook work; current `route.ts` already `await syncBooqableOrder(...)`. That older “signal-only runner” wording is gone from AD-10 and now only appears in the structural seed comment on `route.ts` (“signal only; starts shared sync runner”), which contradicts AD-10’s “webhook awaits one bounded order.”

**Result:** **Platform keep-Vercel/Supabase is verified. Upgrade work is under-specified. Seed comment conflicts with AD-10.**

**Required correction:** Add an upgrade checklist: `middleware` → `proxy` (or document keeping middleware for a stated reason), async `params`/`searchParams` including login, ESLint CLI, React version, smoke build. Fix the seed `route.ts` comment to match AD-10 (await one order, then respond).

### TR-07 — Other brownfield pins: accurate lockfile, not “current library”

| Pin | Lockfile / config | npm latest 2026-08-20 | Status |
| --- | --- | --- | --- |
| TypeScript `5.9.3` | Exact lockfile | **`7.0.2`** | Brownfield verified; not current. Next 16 minimum is 5.1.0, so 5.9.3 still satisfies the framework. Unstated whether the upgrade stays on 5.9 or moves. |
| `@supabase/supabase-js` `2.102.1` | Exact | **`2.112.3`** (`engines.node: >=22`) | Brownfield verified. Latest dropped Node 20 in 2.110.0; Vercel is 24.x so an SDK bump is feasible but not required. |
| `@supabase/ssr` `0.10.0` | Exact; peers `supabase-js ^2.100.1` | **`0.12.4`** (peers `^2.111.0`) | Internally consistent with 2.102.1. Latest SSR cannot be taken without also bumping supabase-js. |
| `@subframe/core` `1.154.0` | Exact | **`1.155.0`** (2026-06-02) | One minor behind; package still exists and peers React 19. |
| Zod `4.4.3` | Exact | **`4.4.3`** (canaries only beyond) | Current stable. |
| Vitest `4.1.11` | **Not in repo** (new) | **`4.1.11`** (`latest`; v5 is rc/beta) | Verified current stable. Official Vitest support: patches on 5.0, important fixes on 4.1. |
| PostgreSQL 17 | `config.toml` `major_version = 17`; hosted prod `17.6.1.104`, staging `17.6.1.155` | Engine 17 GA | Verified. |
| Booqable v4 | Research + live docs | Live | Verified generation. |

**Result:** Brownfield transcription is honest. The stack table should label which rows are **lockfile** vs **chosen new** vs **latest**.

### TR-08 — Database/platform features used by ADs (spot-checked)

| Decision | Check | Status |
| --- | --- | --- |
| AD-1 restricted-import `test:architecture` | ESLint `no-restricted-imports` and `eslint-plugin-boundaries` exist. No library named in the spine. No such script in `package.json`. | **Feasible; tool unspecified.** |
| AD-6 `security_invoker` views, private schema off Data API, SECURITY DEFINER `search_path` | PostgreSQL 15+ `security_invoker`; repo already uses invoker views. `config.toml` `api.schemas = ["public", "graphql_public"]`. Cloud `auto_expose_new_tables` default was scheduled to flip **false on 2026-05-30**; local file still leaves it unset. | **Feasible and mostly specified.** Local vs cloud grant default may already differ. |
| AD-2 SHA-256 on `jsonb` | PostgreSQL 17 `sha256()` and `pgcrypto.digest(..., 'sha256')`. Extension `pgcrypto` already created in baseline migration. | **Verified.** |
| AD-9 `Europe/Madrid` | PostgreSQL IANA zones; `SET TIME ZONE 'Europe/Madrid'` is valid. | **Verified.** |
| AD-9 / AD-11 `/workshop`, URL filters, Subframe, `DefaultPageLayout` | `src/app/workshop/` exists (page, layout, loading). `@hello-pangea/dnd` `18.0.1` is used by Kanban files. | **Brownfield matches cut-over plan.** |
| AD-13 `supabase test db --local` + pgTAP | Official CLI: `supabase test db` runs pgTAP from `supabase/tests`. `--local` exists (default true). | **Verified command.** |
| Realtime Postgres Changes + `router.refresh()` | Existing order UI already uses this. Publication currently includes only `customers` and `orders`. Spine now requires idempotent ADD TABLE for workshop tables. | **Pattern verified; workshop publication still future work (correctly specified).** |
| AD-10 webhook awaits one order | Current `src/app/api/webhooks/booqable/route.ts` awaits `syncBooqableOrder`. | **Matches AD-10; contradicts seed “starts shared sync runner.”** |
| `withAuth` | `src/utils/auth/with-auth.ts` exists and is used. | **Verified convention.** |
| Migrations via branch CI | `deploy-staging.yml` on `staging`, `deploy-production.yml` on `main`, both `supabase db push`. | **Verified; CLI unpinned (TR-04).** |
| No second backend/queue | Compatible with bounded webhook + client-resumed manual pages. `after()` exists but is not required if work stays in-request. | **Feasible as written in AD-10.** |

## Technology claim ledger

| Claim | Reality check | Status |
| --- | --- | --- |
| Next.js `16.3.1` target | npm latest; GitHub 2026-08-13; Active LTS 16.x | **Verified current** |
| Next.js `14.2.35` brownfield | Exact lockfile; unsupported major | **Verified; unsupported** |
| React `18.2.0` as stack next to Next 16 | Exact lockfile; Next 16 App Router docs = React 19.2 | **Brownfield verified; target unverified** |
| TypeScript `5.9.3` | Exact lockfile; npm latest is 7.0.2 | **Brownfield verified; not current** |
| `@supabase/supabase-js` `2.102.1` | Exact lockfile; latest 2.112.3 | **Brownfield verified** |
| `@supabase/ssr` `0.10.0` | Exact lockfile; latest 0.12.4 needs js ^2.111 | **Brownfield verified** |
| Supabase CLI `2.105.0` | Real June 2026 release; npm latest **2.115.0**; CI `latest` | **Stale pin, not applied** |
| PostgreSQL 17 | config.toml + both hosted projects | **Verified** |
| Subframe Core `1.154.0` | Exact lockfile; latest 1.155.0 | **Brownfield verified** |
| Zod `4.4.3` | Exact lockfile = npm latest stable | **Verified current** |
| Vitest `4.1.11` | npm `latest` 4.1.11; not in lockfile yet | **Verified current (new dep)** |
| Node `>=20.9` / Vercel 24.x | next@16.3.1 engines; Vercel `nodeVersion: 24.x` | **Verified** |
| “Matching Next lint tooling” | `next lint` removed in 16 | **False** |
| Booqable API v4 | Live official docs | **Verified** |
| HTTP 429 | Documented on v4 status table | **Verified** |
| `Retry-After` | Not in official v4 page | **Unverified** |
| Webhook event/auth/order | Deferred to spike; still not in docs | **Unverified (correctly deferred except Retry-After)** |
| `stock_items` identity | Resource exists; permanence not guaranteed | **Partially verified** |
| `security_invoker` views | PG 15+; used in repo | **Verified** |
| SHA-256 in PostgreSQL | `sha256` / `pgcrypto.digest` | **Verified** |
| `Europe/Madrid` | IANA TZ in PostgreSQL | **Verified** |
| `supabase test db --local` | Official CLI flag | **Verified** |
| pgTAP | Official Supabase testing docs | **Verified** |
| Realtime postgres_changes | Docs + existing app pattern | **Verified feature** |
| Vercel Next.js project | `framework: nextjs`, ready deployment | **Verified** |
| Staging/prod migration CI | Two workflows, two project refs | **Verified flow; unpinned CLI** |
| Hexagonal ports / Vitest architecture tests | Feasible with ESLint boundaries; tool unnamed | **Feasible, underspecified** |

## Confirmed architecture choices

These technology-dependent choices survived a current-docs check:

- Next.js 16.3.1 is the correct supported major to upgrade to as of 2026-08-20.
- Vitest 4.1.11 is the current stable test runner; v5 is not stable.
- PostgreSQL 17 can own SHA-256 fingerprints, invoker views, Madrid calendar math, leases, RLS, and pgTAP.
- Vercel Node 24.x satisfies Next 16 and Vitest 4 engines.
- Keeping Vercel + one PostgreSQL, with in-request webhook apply and client-resumed manual pages, does not require a queue.
- Booqable v4 is the live API generation; snapshot reconciliation remains the safe design while webhooks stay unverified.
- Brownfield lockfile rows (except the Next 16 / Vitest / CLI **targets**) match `package-lock.json`.

## Required disposition before treating the spine as implementation-ready

1. Rewrite AD-12 lint/tooling to ESLint CLI + `eslint-config-next@16.3.1`; do not mention `next lint`.
2. Split lockfile vs post-upgrade versions; pick a Next 16-compatible React (document 19.x or a dated 18.2 exception).
3. Re-verify and apply a current Supabase CLI pin in both GitHub workflows (today: `2.115.0`, not `2.105.0`).
4. Downgrade `Retry-After` from committed Booqable behavior to “honor if present.”
5. Name Next 16 breaking work: `middleware`/`proxy`, async `searchParams` (including login), and the seed comment vs AD-10 webhook lifecycle.

## Official sources consulted

- [Next.js Support Policy](https://nextjs.org/support-policy) (fetched 2026-08-20)
- [Upgrading to Next.js 16](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js ESLint](https://nextjs.org/docs/app/api-reference/config/eslint)
- npm registry: `next@16.3.1`, `vitest@4.1.11`, `supabase@2.115.0`, `@supabase/supabase-js@2.112.3`, `@supabase/ssr@0.12.4`, `typescript@7.0.2`, `zod@4.4.3`, `@subframe/core@1.155.0`, `eslint-config-next@16.3.1`
- [GitHub next v16.3.1](https://github.com/vercel/next.js/releases/tag/v16.3.1)
- [GitHub supabase/cli v2.105.0](https://github.com/supabase/cli/releases/tag/v2.105.0) and npm `supabase@latest` = 2.115.0
- [Vitest releases / support](https://main.vitest.dev/releases.html)
- [Booqable API v4](https://developers.booqable.com/v4.html)
- [PostgreSQL 17 pgcrypto](https://www.postgresql.org/docs/17/pgcrypto.html)
- [Supabase CLI testing](https://supabase.com/docs/guides/database/testing)
- [Supabase Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Vercel `after()` / Functions](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package)
- Connected Vercel project `echelon-cycling-hub-admin` (`nodeVersion: 24.x`)
- Connected Supabase projects: production `17.6.1.104`, staging `17.6.1.155`
