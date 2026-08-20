# Review — Architecture Spine: Automating Mechanics' Daily Bike Work

**Lens:** good-spine rubric walker (feature altitude, brownfield, spec-driven)
**Target:** `ARCHITECTURE-SPINE.md` (status: draft, 2026-08-20)
**Verdict:** **REVISE**

The spine is a real feature-to-epic contract for most workflow, RLS, checklist, queue, and sync-health rules. It still fails the rubric because independent units can obey every AD and still ship incompatible Next/React/lint upgrades, webhook execution, and auth helpers. Those are not spike details; they are undecided or self-contradictory seams this altitude owns.

## Evidence reviewed

- `ARCHITECTURE-SPINE.md`
- Spec `SPEC.md` (CAP-1..CAP-10) and companions: `workflow-state-machine.md`, `checklist-contract.md`, `launch-checklists.md`, `booqable-reconciliation.md`
- Brownfield: `package.json` / `package-lock.json`, `supabase/config.toml`, `.github/workflows/deploy-staging.yml`, `deploy-production.yml`
- Brownfield workshop: `src/app/workshop/layout.tsx`, `page.tsx`, Kanban + `@hello-pangea/dnd`
- Brownfield Booqable: `src/lib/booqable/sync.ts`, `src/app/api/webhooks/booqable/route.ts`, `src/app/api/sandbox/booqable/sync-orders/route.ts`
- Brownfield auth: `src/utils/auth/with-auth.ts` (`withAuth`), `public.get_user_role()`, `user_role` enum `admin|manager|partner|mechanic`
- Live version checks on 2026-08-20: Next.js 16.3.1 (released 2026-08-13), Vitest 4.1.11, Booqable API v4, Supabase CLI latest stable 2.115.0 (2026-08-18)

## Rubric result

| Rubric check | Result | Basis |
| --- | --- | --- |
| Fixes real feature-to-epic divergence points; misses none | Partial | Lifecycle, assignment instances, snapshots, commands, queues, leases, health timestamps, and Kanban replacement are fixed. Upgrade pairing, webhook await vs start, and auth-helper names are still open seams. |
| Every AD Rule is enforceable and prevents its stated divergence | Fail | AD-10 is contradicted by the source seed. AD-12 pins an unsupported Next+React pair and does not pin lint/ESLint. AD-1 names `test:architecture` but not the checker. |
| Nothing under Deferred could let two units diverge | Pass with gates | Spike/catalog/sync-number/staging-policy items require dated AD amendments or Build Readiness before dependent work. Visual styling is bounded. Preview/PR deployments are silent (ops dimension, not Deferred). |
| Named technology is verified-current | Fail | Next 16.3.1 and Vitest 4.1.11 are current. React 18.2.0 is the lockfile today but is not a valid peer for Next 16. Supabase CLI `2.105.0` is real and older than current `2.115.0`. Hosted Postgres 17 is asserted, not evidenced. |
| Ratifies rather than contradicts brownfield | Fail | Layout, Subframe, `withAuth` result shape, RLS, branch CI, and Kanban deletion are ratified. The spine names `withAuth` and does not bind `get_user_role()`. Webhook seed “starts” the runner; production webhook already awaits. |
| Covers spec CAP-1..CAP-10 | Pass | Every capability is mapped; companions’ states, ROAD/STORAGE seeds, invalidation, and shared reconciler are represented. |
| Every feature-owned dimension decided, deferred, or open | Partial | Deployment topology for local/staging/production is decided. Preview deployments, Node exact pin, and Next 16 lint/compiler cut-over are not. |

## Findings

### 1. AD-12 binds Next 16.3.1 to React 18.2.0, which independent upgrade units cannot both implement

- **Location:** Stack; AD-12
- **Trigger condition:** One epic upgrades Next before workshop work; another keeps the lockfile React line.
- **Evidence:** Stack lists Next.js `16.3.1` and React/React DOM `18.2.0`. Lockfile has `next@14.2.35` (peer `react@^18.2.0`) and `react@18.2.0`. Next.js 16.x requires React 19. `eslint-config-next` in the repo is `13.5.4` with `lint: next lint`; Next 16 removes `next lint` and expects ESLint 9 + matching `eslint-config-next`. AD-12 only says “matching Next lint tooling.”
- **Required guard:** Treat the upgrade as one closed set: Next `16.3.1`, React/React DOM 19.x (current compatible release), `@types/react` 19, `eslint-config-next@16.3.1`, ESLint `>=9`, and drop `next lint`. Keep React 18 only if the Next target is dropped.
- **Potential consequence:** Two units produce an uninstallable tree, or one ships React 19 while another writes React 18 workshop UI.
- **Disposition:** autofix in spine (pin the compatible set)

### 2. Webhook execution is both “await bounded reconcile” and “start the runner”

- **Location:** AD-10; Minimal source seed (`route.ts`); brownfield `src/app/api/webhooks/booqable/route.ts`
- **Trigger condition:** Webhook and sync epics are built from AD-10 vs the seed comment.
- **Evidence:** AD-10: “Webhook awaits one bounded order reconciliation before responding; it never detaches work.” Seed: “signal only; starts shared sync runner.” Current code already `await syncBooqableOrder(...)`. Detached start would violate AD-10 and AD-12 (no queue). Await without a numeric `maxDuration` is gated on the spike, but start-vs-await is not.
- **Required guard:** Delete “starts.” State: the route authenticates, then awaits `reconcileBooqableOrder` on this request, then responds; timeout/retry numbers remain spike-amended.
- **Potential consequence:** One unit acknowledges and dies; another blocks the invocation. Both can claim AD-10.
- **Disposition:** autofix (align seed + sequence to AD-10)

### 3. Auth helpers are invented instead of the ones the repo already uses

- **Location:** AD-5; AD-6; Consistency Conventions
- **Trigger condition:** Staff-action and RLS epics wrap commands independently.
- **Evidence:** Every existing mutation uses `withAuth` from `@/src/utils/auth/with-auth`. Role is `public.get_user_role()` over enum `admin|manager|partner|mechanic`. Workshop layout already allows `admin|manager|mechanic`. The spine says `withAuth` and “profile role” / `auth.uid()` without naming the function or module.
- **Required guard:** Ratify `withAuth` and `get_user_role()`. Forbid a second wrapper or a new role helper for this feature.
- **Potential consequence:** Duplicate session semantics, or RPCs that do not match layout/RLS.
- **Disposition:** autofix

### 4. Preview/PR deployments are an unnamed environment

- **Location:** AD-12; Runtime and environments
- **Trigger condition:** Vercel preview deployments get workshop/webhook env vars.
- **Evidence:** The matrix is local / staging / production only. AD-12 forbids cross-environment DB/webhook use but never says whether previews exist, share staging, or are disabled. That is a feature-altitude ops call.
- **Required guard:** Decide: disable Booqable webhooks and service-role on previews, or give previews their own Supabase + disabled writes. Name the rule next to the three-env diagram.
- **Potential consequence:** A preview webhook or `SERVICE_ROLE` points at staging or production while still “matching AD-12.”
- **Disposition:** discuss / then decide in AD-12

### 5. Named CLI pin is not current; hosted Postgres 17 is unproven

- **Location:** Stack; AD-12; AD-13
- **Trigger condition:** CI and local CLI are set from the Stack table vs `version: latest` in existing workflows.
- **Evidence:** Spine pins Supabase CLI `2.105.0` (released 2026-06-04). Current stable on 2026-08-20 is `2.115.0`, which changes `test db` empty-fail and schema-diff defaults. Local `major_version = 17` is true; staging/production majors are not in-repo.
- **Required guard:** Pin current CLI `2.115.0` (or explicitly “known-good 2.105.0, not latest” with a reason). Record hosted major versions or say “local 17; hosted majors to confirm.”
- **Potential consequence:** `test:db` and migration diffs disagree across machines; “Postgres 17” is assumed on hosts that are not.
- **Disposition:** autofix pin; confirm hosted majors

## Additional findings (do not block the top list)

| Location | Trigger | Guard | Consequence |
| --- | --- | --- | --- |
| AD-1 | Different boundary linters | Name the tool (e.g. dependency-cruiser or ESLint `no-restricted-imports`) and the `test:architecture` command | Green architecture tests that allow different graphs |
| AD-10 lock order | Webhook path has no run lease | State webhook starts at order/source lock; run lease is manual-only | Deadlock or skipped serialization |
| AD-13 vs `package.json` | No test scripts today | Keep scripts + PR job as written; add them in the upgrade epic, not per feature epic | Units add Vitest vs Playwright vs nothing |
| Seed `index.ts` vs AD-1 | UI imports `actions/` deeply vs barrel | Allow `actions/` and `data/` as listed public surfaces | Import-graph fights |

## Capability coverage (CAP-1..CAP-10)

| Capability | Coverage | Residual |
| --- | --- | --- |
| CAP-1 reconciliation | AD-2, AD-3, AD-10 | Exact include/allowlist gated on spike (valid) |
| CAP-2 queues | AD-9, AD-11 | All extra filter is compatible with spec |
| CAP-3 checklist selection | AD-3, AD-4 | Four catalogs blocked, not invented |
| CAP-4 M1 | AD-5, AD-7 | — |
| CAP-5 M2 | AD-5, AD-7, AD-8 | — |
| CAP-6 add-ons | AD-2, AD-8 | — |
| CAP-7 pickup/return | AD-5, AD-6 | Partner excluded; staff roles named |
| CAP-8 storage | AD-4, AD-5, AD-7 | STORAGE-01..06 seeded |
| CAP-9 invalidation | AD-2, AD-3, AD-7, AD-10 | Re-add uses new assignment instance |
| CAP-10 manual recovery | AD-2, AD-10 | Numbers gated; health semantics decided |

Companions: named states and invalidation edges match; ROAD/STORAGE item contracts are bound; reconciliation complete-snapshot + shared function + no polling match.

## Structural-dimension disposition

| Dimension | Spine | Review |
| --- | --- | --- |
| Paradigm / module graph | Decided | Enforceable once the checker is named |
| Domain lifecycle | Decided | Companion-aligned |
| Data ownership | Decided | Assignment instance identity is consistent |
| Mutation/API | Decided | Command list + closed codes |
| Reads/queues | Decided | Madrid half-open ranges named |
| AuthZ | Decided | Role sets named; helper names missing |
| Concurrency | Decided | Version + lease fence; webhook lock start unclear |
| External integration | Deferred with amendment gate | Correct |
| UI/routing | Decided | Table, `/workshop/[taskId]`, no drawer |
| Errors/logging | Decided | Matches repo `{ ok, error }` plus `code` |
| Testing | Decided | Vitest 4.1.11 + pgTAP + scripts + PR job |
| Migrations | Decided | Local apply, CI to hosted, idempotent DDL |
| Runtime/platform | Decided | Vercel + PG, no second backend |
| Environments | Partial | Three envs yes; previews no |
| Upgrade/toolchain | Incomplete | Next/React/lint set inconsistent |
| Out of MVP | Decided | Polling, queues, assignment, scanning, admin UI |

## Named-technology verification (2026-08-20)

| Name | Spine | Evidence |
| --- | --- | --- |
| Next.js | 16.3.1 target; 14.2.35 blocker | 16.3.1 is current stable (2026-08-13). Lockfile `14.2.35` matches the blocker. |
| React | 18.2.0 | Lockfile `18.2.0`. **Not a valid Next 16 peer.** |
| TypeScript | 5.9.3 | Lockfile `5.9.3` |
| supabase-js / ssr | 2.102.1 / 0.10.0 | Lockfile matches |
| Subframe Core | 1.154.0 | Lockfile `1.154.0` |
| Zod | 4.4.3 | Lockfile `4.4.3` |
| Vitest | 4.1.11 | Current 4.1 line (4.1.11); v5 not required |
| Supabase CLI | 2.105.0 | Exists; **not** current (`2.115.0`) |
| PostgreSQL | 17 | Local `config.toml` only |
| Booqable | v4 | Current public API; tenant fields correctly unverified |
| `@hello-pangea/dnd` | remove after last use | Repo dependency and Kanban imports match |

## Deferred (gate check)

- Tenant spike → must amend AD-2/AD-10 before adapter/sync build: **safe**
- Four catalogs stay disabled: **safe**
- Sync numeric limits → dated AD-10 amendment before sync implementation: **safe**
- Visual styling only: **safe** (DTO/filters/navigation fixed)
- Environment wiring before hosted sync: **safe for staging Booqable policy**; **unsafe** if preview is left unnamed

## Acceptance conditions

Pass this rubric when the spine:

1. Pins one installable Next 16.3.1 + React 19 + ESLint 9 + `eslint-config-next@16.3.1` set (or abandons Next 16).
2. Makes the webhook seed and sequence **await** `reconcileBooqableOrder` with no detach.
3. Names `withAuth` and `get_user_role()` as the only staff session/role path.
4. States the preview/PR deployment rule beside local/staging/production.
5. Pins a current (or explicitly frozen) Supabase CLI and does not claim unverified hosted Postgres majors.
