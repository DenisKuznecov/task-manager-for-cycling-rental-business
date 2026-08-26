---
title: 'Upgrade Next.js 16.3.1'
type: 'chore'
created: '2026-08-21'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'fc79d26d4dd17822db1eb2fddc17846f68ff12ec'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app is on unsupported Next.js `14.2.35` / React `18.2.0`. Architecture AD-12 and Build Readiness item 1 require Next.js `16.3.1` with React / React DOM `19.2.8` before any workshop feature work.

**Approach:** Upgrade the existing App Router app in place so `build` and `lint` pass, including the AD-12 cutovers (`proxy`, async `searchParams`, ESLint CLI). Do not start workshop features.

## Boundaries & Constraints

**Always:**
- Pin `next@16.3.1`, `react@19.2.8`, `react-dom@19.2.8`, `@types/react` 19, `@types/react-dom` 19, `eslint-config-next@16.3.1`, ESLint `>=9`.
- Pin Node `>=20.9` via `package.json` `engines` (Vercel is already 24.x; do not change Vercel Node).
- Replace `"lint": "next lint"` and `.eslintrc.json` + `eslint-config-next@13.5.4` with ESLint CLI and flat config from `eslint-config-next@16.3.1`.
- Cut over `src/middleware.ts` `middleware` → `src/proxy.ts` `proxy`. Keep the same matcher and session logic.
- Make remaining page `params` / `searchParams` async Promises, including `src/app/login/page.tsx`.
- Keep Vercel + local PostgreSQL 17. Preserve default-deny auth redirect behavior.
- Move Next 15+ config keys: `experimental.serverComponentsExternalPackages` → `serverExternalPackages`; `experimental.outputFileTracingIncludes` → top-level `outputFileTracingIncludes`. Keep the `@react-pdf/renderer` externalization and bike-fit public-asset tracing.

**Ask First:**
- A dependency other than the pinned Next/React/ESLint set needs a major bump to compile or run.
- `next build` requires `--webpack` (or other bundler opt-out) because Turbopack cannot honor the bike-fit tracing / `@react-pdf/renderer` setup.
- Auth redirect, login `?next=`, or cookie session refresh regress after the `proxy` cutover.

**Never:**
- Workshop tables, `/workshop/[taskId]`, checklists, RLS, Booqable sync/webhooks, or inventing preparation catalogs / tenant-spike answers.
- Second backend, queue, scheduler, or hosted Postgres major claims.
- Applying migrations to staging or production; no feature SQL in this run.
- Enabling staging Booqable writes or preview sync.
- Renaming `src/utils/supabase/middleware.ts` (helper only; not the Next convention file).
- Pinning Supabase CLI or changing GitHub migration workflows (those are later AD-12 feature-migration work).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Login next param | `LoginPage` receives `searchParams: Promise<{ next?: string }>` | Await the promise; pass `next` into `requireAnonymous` | Missing `next` still calls `requireAnonymous(null)` |
| Unauthenticated HTML | Request to a non-public, non-API, non-server-action path with no session | `proxy` redirects to `/login?next=...` via `updateSession` | API and `next-action` POSTs are not redirected to HTML login |
| Lint script | `npm run lint` | ESLint CLI runs; `next lint` is gone | Build does not lint (Next 16); lint is a separate script |

</frozen-after-approval>

## Code Map

- `package.json` L10, L31–33, L42–47 — `lint: next lint`; `next ^14.2.3`; `react/^18`; `eslint ^8`; `eslint-config-next 13.5.4`; no `engines`
- `package-lock.json` `node_modules/next` — resolved `14.2.35`; `eslint-config-next` resolved `13.5.4`
- `.eslintrc.json` — legacy `extends: next/core-web-vitals`; replace with ESLint 9 flat config
- `next.config.js` L11–21 — `experimental.serverComponentsExternalPackages` and nested `outputFileTracingIncludes` for `/bike-fits/[id]`
- `src/lib/bike-fit/report/public-assets.ts` L8–10 — documents why tracing includes must survive
- `src/middleware.ts` L4–12 — `export async function middleware`; matcher excluding static assets; replace file + export name
- `src/utils/supabase/middleware.ts` L5–69 — `updateSession`; default-deny + API/server-action exceptions; keep imported by `proxy.ts`
- `src/app/login/page.tsx` L5–12 — **only remaining sync** `searchParams?: { next?: string }`; must become `Promise` and `await`
- Other App Router `page`/`layout` files already use `Promise` + `await` (wiki, partner, orders, hq/links, bike-fits). Route handlers use `URL`/`NextRequest.searchParams` — leave those.
- Already async: `src/utils/supabase/server.ts` (`await cookies()`), `src/utils/auth/with-auth.ts` (`await headers()`)
- Pattern to copy for login: `src/app/wiki/page.tsx` L11–19

## Tasks & Acceptance

**Execution:**
- [x] `package.json` / `package-lock.json` -- Install and lock `next@16.3.1`, `react@19.2.8`, `react-dom@19.2.8`, `@types/react@19`, `@types/react-dom@19`, `eslint@>=9`, `eslint-config-next@16.3.1`; add `engines.node: >=20.9.0`; set `lint` to the ESLint CLI -- AD-12 version gate
- [x] `.eslintrc.json` → `eslint.config.mjs` (or the file the official `next-lint-to-eslint-cli` codemod writes) -- Flat config using `eslint-config-next@16.3.1`; delete legacy eslintrc -- Next 16 removed `next lint`
- [x] `next.config.js` -- Lift `serverExternalPackages` and `outputFileTracingIncludes` out of the Next 14 experimental shape; keep PDF externalization and bike-fit asset tracing -- required Next 15+ config move
- [x] `src/middleware.ts` → `src/proxy.ts` -- Rename file; export `proxy` instead of `middleware`; keep matcher and `updateSession` call -- AD-12 network-boundary cutover
- [x] `src/app/login/page.tsx` -- Type `searchParams` as `Promise<{ next?: string }>`, `await` it, then call `requireAnonymous` -- last sync page props
- [x] Scan remaining `src/app/**/{page,layout}.tsx` -- Confirm every `params`/`searchParams` prop is a Promise and awaited; fix any leftover sync types -- prevent Next 16 typegen/build failure

**Acceptance Criteria:**
- Given a clean install of the locked versions, when `npm run build` runs, then it succeeds on Next `16.3.1` without workshop schema or feature changes.
- Given the upgraded scripts, when `npm run lint` runs, then it invokes ESLint CLI (not `next lint`) with `eslint-config-next@16.3.1` and exits 0 or only pre-existing non-upgrade issues that are listed in the handoff.
- Given `src/app/login/page.tsx`, when the page loads with `?next=/orders`, then `searchParams` is awaited and `requireAnonymous` still receives that path.
- Given an unauthenticated browser request to a non-public page, when `src/proxy.ts` runs, then `updateSession` still redirects to `/login` and still skips `/api/*` and `next-action` POSTs.
- Given `package.json`, when inspected, then `engines.node` is `>=20.9.0` and React `18.2.0` is not the feature runtime.

## Spec Change Log

- 2026-08-21: Added official `/*turbopackIgnore: true*/` on `fs.readFileSync` in `src/lib/bike-fit/report/public-assets.ts` so default Turbopack `next build` does not trace the whole repo; `outputFileTracingIncludes` remains the include list. No `--webpack`.

## Verification

**Commands:**
- `node -v` -- expected: Node `>=20.9`
- `npm run lint` -- expected: ESLint CLI runs (`eslint .`); `package.json` `lint` script does not contain `next lint`. Exit 0 is blocked by 21 pre-existing `react-hooks` errors from eslint-plugin-react-hooks v7 (set-state-in-effect / refs / static-components) plus 22 warnings; not introduced by upgrade logic.
- `npm run test:upgrade-gate` -- expected: 4 passed (lint script, login searchParams Promise, unauthenticated HTML `?next=`, API/`next-action` skip)
- `npm run build` -- expected: production build succeeds on Next.js 16.3.1 (Turbopack)
- `npx next --version` (or lockfile `node_modules/next`) -- expected: `16.3.1`

**Manual checks (if no CLI):**
- Confirm `src/proxy.ts` exists and `src/middleware.ts` is gone; helper `src/utils/supabase/middleware.ts` remains.
- Confirm login types use `Promise` and `await searchParams`.
- Confirm no new workshop/Booqable/schema files landed in this run.

## Suggested Review Order

**Pinned stack**

- Exact Next/React pins required by AD-12; React 18 is no longer the runtime.
  [`package.json:35`](../../package.json#L35)

- Node floor matches Next 16 engines; Vercel is already 24.x.
  [`package.json:5`](../../package.json#L5)

**Network boundary**

- `middleware` cut over to `proxy`; same matcher and `updateSession` call.
  [`proxy.ts:4`](../../src/proxy.ts#L4)

**Async request APIs**

- Last sync page props; await `searchParams` then pass `next` through.
  [`page.tsx:8`](../../src/app/login/page.tsx#L8)

**Build tracing**

- Next 15+ keys; PDF externalization and bike-fit public assets kept.
  [`next.config.js:14`](../../next.config.js#L14)

- Stops Turbopack from tracing the whole repo; NFT still lists the six images.
  [`public-assets.ts:71`](../../src/lib/bike-fit/report/public-assets.ts#L71)

**Lint CLI**

- Replaces removed `next lint` with ESLint 9 flat config from `eslint-config-next@16.3.1`.
  [`eslint.config.mjs:1`](../../eslint.config.mjs#L1)

- Lint script is ESLint CLI; upgrade-gate tests are runnable via npm.
  [`package.json:13`](../../package.json#L13)

