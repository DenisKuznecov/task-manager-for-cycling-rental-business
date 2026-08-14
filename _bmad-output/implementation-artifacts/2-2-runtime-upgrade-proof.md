# Story 2.2 Runtime Upgrade Proof

Date: 2026-08-14  
Baseline: `97ac4e3f615f415894e4e8e3f9a0c19105ce1b89`  
Node used for verification: `v22.21.0`

## Landed versions

| Package | Before (lockfile / declared) | After (installed) |
|---|---|---|
| `next` | 14.2.35 / `^14.2.3` | **16.3.1** (Active LTS) |
| `react` / `react-dom` | 18.2.0 / `^18` | **19.2.8** |
| `@types/react` / `@types/react-dom` | `^18` | **19.2.18** / **19.2.4** |
| `eslint` | `^8` | **9.39.5** (exact pin, no caret) |
| `eslint-config-next` | 13.5.4 | **16.3.1** |

No remaining 16 gate. Did not land on 15.x. Did not opt out of Turbopack (`--webpack`). Did not enable React Compiler.

## Official path

1. `npx @next/codemod@canary upgrade 15 --yes --verbose` → Next **15.5.23**, React **19.2.8**, version-matched `eslint-config-next@15.5.23`. The bundled `next-request-geo-ip` prompt hung (unused `geo`/`ip`); that transform was not applied.
2. Manual Next 15 config lift: `experimental.serverComponentsExternalPackages` → `serverExternalPackages`; `outputFileTracingIncludes` moved to top level.
3. `npx @next/codemod@canary next-async-request-api . --force` → 3 files. Partner `[slug]` pages already awaited `Promise` params; those three diffs were reverted as churn. Login `searchParams` was converted to `Promise` and awaited.
4. `npx @next/codemod@canary upgrade 16 --yes --verbose` → Next **16.3.1**. Recommended transforms: `middleware-to-proxy`, `remove-unstable-prefix`, `remove-experimental-ppr`, `cache-components-instant-false`, `remove-partial-prefetch`.
5. Reviewed 16 diffs: `cache-components-instant-false` added `export const instant = false` to 41 routes. Cache Components is not enabled; those opt-outs were reverted. `src/middleware.ts` → `src/proxy.ts` (`export async function proxy`) kept. `src/utils/supabase/middleware.ts` unchanged (Story 2.1 `setAll` header copy intact).
6. `npx @next/codemod@canary next-lint-to-eslint-cli . --force` → `lint` is now `eslint .`. ESLint 10 (pulled by the 16 upgrade) crashed (`getFilename` / `scopeManager.addGlobals`). Pinned **eslint@9.39.5** (exact, no caret), which satisfies `eslint-config-next@16.3.1` (`eslint >= 9`). Flat `eslint.config.mjs` was required by that official `next-lint-to-eslint-cli` migrate — not an extra flatten. `.eslintrc.json` was removed after the official migrate. React Compiler companion rules (`set-state-in-effect`, `refs`, `static-components`, `incompatible-library`) are off; classic hooks rules remain. React Compiler itself is not enabled.
7. Official Next 16 build rewrote `tsconfig.json` `jsx` from `preserve` to `react-jsx` (mandatory automatic runtime). `strict` stayed `true`. `.next/dev/types/**/*.ts` was added to `include`.

## Command results

| Command | Result |
|---|---|
| `npm install` (via official upgrade) | Lockfile resolves on Next 16.3.1 / React 19.2.8 |
| `npx tsc --noEmit` | Exit 0. `strict: true` unchanged |
| `npm run lint` | Exit 0 (`eslint .`). 0 errors, 19 pre-existing `<img>` / alt warnings in login/brand/Subframe surfaces |
| `npm run test:unit` | Exit 0. 9 files / **124 tests** passed, including `tests/booqable-containment/` and `tests/runtime-upgrade/` |
| `npm run build` | Exit 0. Next.js 16.3.1 **Turbopack**. All existing routes compiled, including `/login`, `/auth/callback`, `/bike-fits/[id]`, `/wiki`, `/workshop/templates`, partner routes. Proxy listed as `ƒ Proxy (Middleware)` |

First `next build` after the 16 upgrade failed during "Collecting page data" (`PageNotFoundError` for `/auth/callback` and `/bike-fits/[id]/edit`) against a stale `.next` from 14/15. `rm -rf .next` then `npm run build` succeeded. A first-pass Turbopack warning about `fs.readFileSync` in bike-fit public assets tracing the whole repo was addressed with the official `/*turbopackIgnore: true*/` comment; `outputFileTracingIncludes` for `/bike-fits/[id]` and `serverExternalPackages: ["@react-pdf/renderer"]` remain.

## Compatibility checklist (automated)

- Auth / session: `src/proxy.ts` still calls `updateSession`; Story 2.1 header-copy test green (`private` + `no-store`).
- Server actions / `withAuth`: already `await cookies()` / `await headers()`.
- Login `?next=`: `searchParams` is now `Promise` and awaited before `requireAnonymous`.
- PDF: `@react-pdf/renderer` stays external; bike-fit public assets still traced; Turbopack build includes `/bike-fits/[id]`.
- BlockNote / React Email / Subframe: no source changes; production build compiled their routes.

## Manual checks

- `/login?next=/orders` after sign-in — passed (user-confirmed)
- Wiki BlockNote editor open/save — passed (user-confirmed)
- Bike-fit PDF generate/email produces a document — passed (user-confirmed)
- One partner route and `/workshop/templates` in a browser — passed (user-confirmed)
