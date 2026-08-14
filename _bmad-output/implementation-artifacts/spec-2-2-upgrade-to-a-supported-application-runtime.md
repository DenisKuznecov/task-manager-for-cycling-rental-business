---
title: 'Upgrade to a Supported Application Runtime'
type: 'feature'
created: '2026-08-14'
status: 'done'
review_loop_iteration: 0
baseline_commit: '97ac4e3f615f415894e4e8e3f9a0c19105ce1b89'
context:
  - '{project-root}/_bmad-output/project-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app is on Next.js 14.2.35 (EOL). Workshop must not be built on an unsupported runtime.

**Approach:** Follow the official 14→15→16 guides and reviewed `@next/codemod` diffs. Prefer Active LTS 16.x (as of 2026-08-14). If a listed dependency blocks 16 after 15 works, land on 15.x and record the remaining 16 gate. Do not stay on 14.

## Boundaries & Constraints

**Always:** Official Next 15 then 16 guides; review every codemod diff. Prefer 16.x; 15.x only as a named staged landing. Keep `strict: true`; do not skip hooks, lint, or typecheck. Preserve Story 2.1 (preview fail-closed, auth-before-service-role, `setAll` copies `Cache-Control`/`Expires`/`Pragma`). Keep `@react-pdf/renderer` external and bike-fit `outputFileTracingIncludes` (both leave `experimental`). Version-match `eslint-config-next`; on 16 replace removed `next lint` with the ESLint CLI. Await `cookies()`, `headers()`, `params`, `searchParams`. On 16 rename only `src/middleware.ts` → `src/proxy.ts` (`export function proxy`); keep `src/utils/supabase/middleware.ts`. Record versions and command results in `_bmad-output/implementation-artifacts/2-2-runtime-upgrade-proof.md`. Auth, middleware/proxy, server actions, PDF, BlockNote, React Email, Subframe, and existing routes stay compatible.

**Ask First:** Landing on 15.x because a named dependency blocks 16. Opting out of Turbopack (`--webpack`) if PDF/native deps fail. Enabling React Compiler, or flattening ESLint beyond version-matching.

**Never:** Remain on Next 14. Pin Node 24.x, Supabase CLI, or a PostgreSQL extension manifest (Story 2.3). Add envelopes, workers, cron, or remote DDL. Change webhook/sandbox auth or ghost-order behavior. Weaken TypeScript strictness, skip hooks, or add a new test runner.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Official path succeeds | Next 14.2.35 + React 18 | Lockfile on supported LTS (prefer 16.x); proof file records versions | N/A |
| Dependency blocks 16 | Named dep fails 16 after 15 works | Land 15.x; proof file names blocker + remaining 16 gate | Do not stay on 14 |
| Login `next` param | `/login?next=/orders` | Awaited `searchParams`; `requireAnonymous` still gets the path | N/A |
| PDF report | Bike-fit report server action | yoga/wasm stays external; public assets still traced | Fail → Ask First before `--webpack` |
| Session refresh | `@supabase/ssr` `setAll` headers | Convention entry copies `private` / `no-store` | Existing Vitest stays green |
| Codemod churn | `@next/codemod` rewrites | Keep only required diffs | Revert unrelated files |

</frozen-after-approval>

## Code Map

- `package.json:35-37,48-51` -- `next ^14.2.3`, React 18, `eslint-config-next@13.5.4`. Lockfile next 14.2.35 / react 18.2.0. `lint` is `next lint` (removed in 16).
- `next.config.js:12-21` -- lift to top-level `serverExternalPackages: ["@react-pdf/renderer"]` and `outputFileTracingIncludes` for `/bike-fits/[id]`.
- Official path -- [15 guide](https://nextjs.org/docs/app/guides/upgrading/version-15), [16 guide](https://nextjs.org/docs/app/guides/upgrading/version-16); `npx @next/codemod@canary upgrade` then `next-async-request-api` if sync request APIs remain.
- `src/middleware.ts:1-12` -- 16: `src/proxy.ts` / `export function proxy`. Not access control.
- `src/utils/supabase/middleware.ts:15-36` -- `updateSession` + Story 2.1 header copy. Keep this filename.
- `src/utils/supabase/server.ts` / `src/utils/auth/with-auth.ts` -- already `await cookies()` / `await headers()`.
- `src/app/login/page.tsx:7-12` -- only sync `searchParams?: { next?: string }`. Other pages already `Promise` + `await`.
- `src/lib/bike-fit/report/render.tsx` -- `renderToBuffer` in a Node action; needs the external-package config.
- `src/app/wiki/_components/WikiBlockNoteEditor.tsx` -- BlockNote + Mantine, `ssr: false`. Add `transpilePackages` only if the build fails.
- `emails/` + `src/lib/contact.ts` / `src/lib/bike-fit/actions/report-actions.ts` -- React Email + Resend in Node actions.
- `src/ui/` -- Subframe `"use client"` via `@/ui/*`.
- `.eslintrc.json` -- `extends: next/core-web-vitals`. 16: ESLint CLI; do not flatten unless asked.
- `tests/booqable-containment/middleware-headers.test.ts` -- copied `Cache-Control` contains `private` and `no-store`.

## Tasks & Acceptance

**Execution:**
- [x] `package.json` + lockfile -- official 14→15 then 15→16 (`@next/codemod` + reviewed `next`/`react`/`react-dom`/`@types/*`/`eslint-config-next`); prefer 16.x -- leave unsupported 14
- [x] `next.config.js` -- lift `serverExternalPackages` and `outputFileTracingIncludes` out of `experimental` -- PDF and bike-fit assets survive the 15 rename
- [x] `src/app/login/page.tsx` -- type `searchParams` as `Promise` and await before `requireAnonymous` -- 16 removes sync access
- [x] `src/middleware.ts` → `src/proxy.ts` (16 only) -- rename convention file and export; keep calling `updateSession` -- official network-boundary rename
- [x] `src/utils/supabase/middleware.ts` -- keep Story 2.1 `setAll` header copy through any `NextResponse` churn -- session stays `private, no-store`
- [x] `.eslintrc.json` + `package.json` `lint` -- version-match `eslint-config-next`; on 16 replace `next lint` with ESLint CLI -- 16 removes `next lint`
- [x] `_bmad-output/implementation-artifacts/2-2-runtime-upgrade-proof.md` and `_bmad-output/project-context.md` -- record landed next/react versions, command results, and any 15-only remaining 16 gate -- AC requires an explicit record
- [x] `tests/booqable-containment/` -- keep header-copy and containment tests green -- must not regress Story 2.1

**Acceptance Criteria:**
- Given the app currently runs Next.js 14, when the compatibility migration completes, then it lands on a currently supported Next.js LTS through reviewed official upgrade steps, and auth, middleware/proxy, server actions, PDF generation, BlockNote, React Email, Subframe UI, and existing routes pass the compatibility checklist.
- Given a dependency blocks the preferred supported major, when compatibility evidence is reviewed, then the repository records the supported staged landing and remaining upgrade gate explicitly, and it does not silently retain an unsupported production baseline.
- Given the runtime upgrade is complete, when install, build, lint, type checking, auth routes, and major existing feature smoke checks execute, then results are recorded without weakening TypeScript strictness or bypassing hooks/checks, and unrelated UI, editor, PDF, email, and authentication behavior remains compatible.

## Spec Change Log

- 2026-08-14: Official Next 16 `next-lint-to-eslint-cli` required flat `eslint.config.mjs`; `.eslintrc.json` was removed. React Compiler companion hooks rules were left off because the compiler is off; classic hooks rules remain. Known-bad state avoided: asking the human mid-upgrade or keeping `next lint`.

## Design Notes

As of 2026-08-14, 16.x is Active LTS (16.3.x) and 15.x is Maintenance LTS (EOL ~2026-10-21). Next 16 defaults to Turbopack and React 19.2 — prove BlockNote, Subframe, `@react-pdf/renderer`, and React Email, then Ask First before `--webpack` or a 15 landing. Only `src/middleware.ts` is the Next convention file. Codemods may add `AGENTS.md` or flatten ESLint — keep those only if required to build/lint. Story 2.3 still pins Node/CLI.

## Verification

**Commands:**
- `npm install` -- lockfile resolves on the landed Next/React majors
- `npx tsc --noEmit` -- no new errors; `strict` unchanged
- `npm run lint` -- succeeds (ESLint CLI if on 16)
- `npm run test:unit` -- existing Vitest, including `tests/booqable-containment/`, stays green
- `npm run build` -- succeeds with PDF externals and bike-fit traced assets

**Manual checks (if no CLI):**
- `/login?next=/orders` returns to `/orders` after sign-in
- Wiki BlockNote editor opens and saves
- Bike-fit PDF generate/email still produces a document
- One partner route and `/workshop/templates` still render

## Suggested Review Order

**Runtime landing**

- Official 14→15→16 path landed on Active LTS, not 14 or 15
  [`package.json:35`](../../package.json#L35)

- Proof records versions, command results, and no remaining 16 gate
  [`2-2-runtime-upgrade-proof.md:7`](./2-2-runtime-upgrade-proof.md#L7)

**Network boundary**

- Next 16 convention file; still only calls `updateSession`
  [`proxy.ts:4`](../../src/proxy.ts#L4)

- Story 2.1 `setAll` still copies `private` / `no-store` headers
  [`middleware.ts:24`](../../src/utils/supabase/middleware.ts#L24)

**Async request APIs**

- Login `searchParams` is a Promise and is awaited before `requireAnonymous`
  [`page.tsx:8`](../../src/app/login/page.tsx#L8)

**PDF / Turbopack**

- yoga/wasm stays external; bike-fit public assets still traced
  [`next.config.js:15`](../../next.config.js#L15)

- Official `turbopackIgnore` so Turbopack does not trace the whole repo
  [`public-assets.ts:71`](../../src/lib/bike-fit/report/public-assets.ts#L71)

**Lint**

- `next lint` replaced by ESLint CLI; config-next version-matched
  [`package.json:13`](../../package.json#L13)

- Flat config required by official migrate; compiler companion rules off
  [`eslint.config.mjs:4`](../../eslint.config.mjs#L4)

**Verification**

- Invariants cover lockfile majors, live `proxy`, and PDF data URLs
  [`next-16-invariants.test.ts:54`](../../tests/runtime-upgrade/next-16-invariants.test.ts#L54)
