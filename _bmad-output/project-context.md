---
project_name: 'echelon-cycling-hub-admin'
user_name: 'Den'
date: '2026-08-05'
updated: '2026-08-18'
sections_completed:
  ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
rule_count: 30
optimized_for_llm: true
aligned_to: 'AD-19 / Workshop Tasks MVP handover 2026-08-18'
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss. Workshop/Booqable rules are aligned to AD-19: keep the frozen canonical projection, brownfield readers, security, and deploy path; do not import retired identity, activation, correction, or recovery scope into this MVP._

---

## Technology Stack & Versions

- **Next.js 16.3.1** (App Router, Turbopack default) + **React 19.2.8** + **TypeScript 5.9.3** (`strict: true`)
- **Node.js 24.x** — `engines.node` is `^24.0.0` only (no 20/22). `@types/node@24.13.3`. Both deploy workflows set up Node 24.
- **Supabase** — `@supabase/supabase-js@2.102.1`, `@supabase/ssr@0.10.0` (Postgres, Auth, RLS). CLI is an exact repo pin: **`supabase@2.114.0`** in `package.json` / lockfile and both deploy workflows (`supabase/setup-cli` `version: 2.114.0`, never `latest`). Use `npx supabase`; the Homebrew global CLI is not the pin. `npm run db:types` runs `supabase gen types typescript --local` (stdout only unless a later story owns an app consumer).
- Local PostgreSQL stays **major 17** (`supabase/config.toml`). Required extensions are owned by `supabase/migrations/20260814120000_required_extension_manifest.sql`: `plpgsql` in `pg_catalog` (assert presence, do not CREATE), `pgcrypto` / `uuid-ossp` / `pg_stat_statements` in `extensions`, `supabase_vault` in `vault`. Staging/production extension parity is an environment-proof gate — do not query-fix remotes.
- **Subframe** — `@subframe/core@1.154.0`, generated components live in `src/ui` (import alias `@/ui/*`), synced via the Subframe CLI (`.subframe/sync.json`)
- **Tailwind CSS 3** + `@tailwindcss/typography` for prose content (wiki)
- **Zod 4.4.3** — request/payload validation. ⚠️ v4, not v3: e.g. `error.issues` (not `.errors`); don't assume v3-era APIs from training data.
- **React Hook Form 7.76.1** + `@hookform/resolvers@5.4.0`
- **BlockNote** (`@blocknote/core|mantine|react@0.52.1`) + **Mantine 8.3.18** — rich text editor, used for the Wiki feature only
- **`@react-pdf/renderer@4.5.1`** — PDF generation (bike-fit reports)
- **React Email 6.1.5** (`@react-email/components`, `@react-email/tailwind`) + **Resend 6.12.4** — transactional email (see `emails/`)
- **`@hello-pangea/dnd@18.0.1`** — drag-and-drop (workshop mechanic kanban)
- **Booqable** — external rental management platform; source of truth for orders/inventory. Production webhook (`src/app/api/webhooks/booqable`) still refetches through `src/lib/booqable/sync.ts` until the approved live-wiring story switches webhook and task-claim refresh to the canonical adapter. Versioned source envelopes and the six-value apply-result vocabulary live in `src/lib/booqable/contracts/` (Zod source, fixture-checked PostgreSQL enums). The source-first bike tag vocabulary lives in `workshop-tags.ts`: ProductGroups use one of six exact `workshop-*-bike` tags, Bundles use the corresponding `workshop-*-bike-bundle` tag, and admitted Product/ProductGroup/Bundle tag lists remain read-only source facts. There is no local ProductGroup allowlist or Workshop classification screen. Accessory tags stay uninterpreted in this MVP.
- **ESLint 9.39.5** with `eslint-config-next@16.3.1` and the ESLint CLI (`eslint .`). Flat `eslint.config.mjs` extends `next/core-web-vitals`. React Compiler is off; compiler companion hooks rules are off so brownfield UI is not rewritten. Do not reintroduce `next lint` (removed in Next 16).
- Hosted on **Vercel** (Hobby/free tier — see Critical Rules for the 10s function timeout constraint)
- **Vitest 4.1.10** — `npm run test:unit` (`vitest run`). Coverage lives in `tests/booqable-containment/`, `tests/booqable-contracts/`, `tests/runtime-upgrade/`, and `tests/toolchain/`. Do not add a second test runner.

## Critical Implementation Rules

### Language-Specific Rules (TypeScript)

- `strict: true` is enforced — no bare `as any` / `@ts-ignore` to silence errors; if a type genuinely can't be narrowed, leave a comment explaining why.
- Two import aliases, don't cross them: `@/src/*` for app code (`lib`, `utils`, `components`, `context`), `@/ui/*` for Subframe-generated components/layouts (physically in `src/ui`, but aliased without the `src` segment).
- **Zod is v4, not v3** — `error.issues` (not `.errors`), and reuse the existing `firstZodErrorMessage(error)` helper pattern (see `src/lib/wiki/actions/wiki-actions.ts`) instead of re-deriving the first message inline.
- Server action files start with `"use server"`; client components with `"use client"`.
- `.cursor/rules/error-handling.mdc` already governs the full `withAuth` + `{ok, error}` discriminated-result convention in detail — condensed pointer here since this file may be read by tools that don't load `.cursor/rules/`.

### Framework-Specific Rules (Next.js / React / Supabase)

- Route-local components live in a `_components/` folder inside each route segment (underscore prefix keeps Next.js from treating them as routes). Every route also has a `loading.tsx` for its Suspense fallback.
- Pages are async Server Components that call a loader directly (e.g. `src/app/orders/page.tsx` awaits `loadOrdersPage`); interactive pieces are separate `"use client"` components that receive data as props.
- **Feature module organization** — business logic lives in `src/lib/<feature>/`, split into subfolders by concern: `data/` (loaders), `actions/` (server actions), `types/` (Zod schemas + TS types), plus feature-specific ones (`fields/`, `payload/`, `storage/`, `report/`). Each subfolder and the feature root re-export through an `index.ts` barrel. Reference implementations: `src/lib/bike-fit/`, `src/lib/wiki/`.
- **Supabase client selection** — three different clients for three contexts: `src/utils/supabase/server.ts` (Server Components & Server Actions, cookie-based), `src/utils/supabase/client.ts` (Client Components), `src/utils/supabase/middleware.ts` (session refresh only, wired into `src/proxy.ts`). The Next convention file is `src/proxy.ts` (`export async function proxy`); keep the `src/utils/supabase/middleware.ts` filename.
- **Existing Views** (concrete inventory — check before writing a new cross-table query): `bookings_view`, `wiki_documents_view`, `mechanic_performance_stats`.
- **Role model:** `admin | manager | partner | mechanic` (`UserContext.tsx`, `useUser()` / `useHasRole()`). This is UI-layer gating only — RLS + `withAuth` are the real security boundary; never trust the client-side role check alone for anything sensitive.
- **"One-click creation" pattern:** create actions insert a blank/default row and return its id; the caller redirects straight to `/edit/[id]` — no separate `/new` route or form (see `createWikiDocument`).
- Mutations always call `revalidatePath(...)` explicitly for every affected route (layout + specific dynamic paths) rather than relying on `router.refresh()`.

### Testing Rules

- Unit tests use **Vitest** (`npm run test:unit`). Existing coverage is in `tests/booqable-containment/`, `tests/booqable-contracts/`, `tests/runtime-upgrade/`, and `tests/toolchain/`. `npm run contracts:check` is the named envelope, source-tag, projection, and brownfield-consumer drift surface (also run by `.github/workflows/contracts-drift.yml` on pull_request). Database proof is pgTAP under nested `supabase/tests/database/` (`workshop-tasks/`, `toolchain/`, `booqable-integration/`); the pinned CLI must still discover those trees via `supabase test db`. Don't add Jest/Playwright or a second runner unprompted.

### Code Quality & Style Rules

- `eslint.config.mjs` extends `next/core-web-vitals`. Custom overrides are limited to pinning the React version for ESLint and turning off React Compiler companion rules. There's no Prettier config in the repo, so there's no enforced auto-format contract beyond ESLint's own rules.
- **Naming conventions:** Components `PascalCase.tsx`; generic reusable hooks in `src/hooks/` are kebab-case (`use-debounced-value.ts`); one-off hooks colocated with the feature that owns them are camelCase matching their sibling file (`useOpenOrderDetails.ts` next to `OrderDetailsDrawer.tsx`); lib/data/action files are kebab-case (`marketing-links-actions.ts`, `customers-types.ts`).
- Exported functions in `src/lib/` and `src/utils/` consistently carry a short JSDoc block explaining *why* — the tradeoff, the non-obvious invariant, the edge case — never a restatement of *what* the code does. Keep new code to the same standard.

### Development Workflow Rules

- **Branch naming:** `feature/<kebab-case-description>`, `fix/`, `bugfix/`, `chore/`, `perf/` — descriptive slugs, no ticket-number prefixes.
- **Commit messages:** plain descriptive sentences (imperative or past tense) — not Conventional Commits style (no `feat:`/`fix:` prefixes).
- **Deploy pipeline:** pushing to `staging` runs `.github/workflows/deploy-staging.yml` (`supabase db push` to the staging project); pushing to `main` runs `.github/workflows/deploy-production.yml` (same, against production). Both set up Node 24 and pin Supabase CLI **2.114.0**. This is the concrete mechanism behind the "migrations are applied by CI only" rule in `.cursor/rules/supabase-migrations.mdc`.

### Critical Don't-Miss Rules

- **`docs/*.md` PRDs describe plans, not necessarily reality** — concrete example: `docs/wiki-feature-prd.md` specifies a Markdown editor (`react-markdown`), but the shipped implementation uses **BlockNote** block JSON instead (confirmed by commit history). `docs/Workshop Tasks PRD.md`'s `bike_tasks`/`checklists` schema has no matching migrations — it hasn't been built yet either. Always verify a PRD's claims against actual migrations/code before trusting it.
- Never fetch large row sets to `.reduce()`/aggregate in JS — push it into a Postgres View or RPC.
- **Never apply a migration directly to the staging/production Supabase project** (not via MCP, CLI, or dashboard) — even if a user asks to "make it live now." The only path to remote is merging to `staging`/`main`, which CI deploys automatically. (Full detail in `.cursor/rules/supabase-migrations.mdc`.)
- `SUPABASE_SERVICE_ROLE_KEY` is used in exactly two places today (Booqable webhook, one sandbox route) — never add a third user-facing usage; it bypasses RLS entirely.
- The `partner` role is scoped to only their own data via RLS — any new partner-facing query must filter by `partner_id`; partners must stay locked out of Wiki, fleet management, and live bookings.
- **Booqable source envelopes** are owned by `src/lib/booqable/contracts/`. Units are only `order_graph` and `resource_batch`. Results are exactly `applied | no_op | derivation_disabled | quarantined | rejected_retryable | rejected_terminal` — unknown newer codes fail closed. Resource slots are identity + presence + source version + fingerprint inputs, not Booqable attribute schemas. The approved live-wiring story invokes this contract through the canonical adapter; it does not extend `sync.ts`, change envelope semantics, add a codegen package, or wire `db:types` into an app consumer. `npm run contracts:check` must stay green.
- **Canonical Booqable projection** is owned by `src/lib/booqable/contracts/canonical-projection.ts` plus `supabase/migrations/20260815000000_expand_canonical_booqable_projection.sql`. Admitted resources are tagged ProductGroups/Products and agreeing Bundles/BundleItems, plus StockItems, Plannings, StockItemPlannings, and immutable order-bike memberships. Persist complete `tag_list` values as source facts; never replace them with a category. The shipped membership key and predecessor link stay frozen in the projection — do not change that schema, and do not import it as Workshop task identity. A Bike Task is keyed by one Booqable rental/order plus one exact opaque StockItem ID; `stock_identifier` is display/confirmation only. Planning IDs, titles, quantity, and array positions are never identity. Do not add provisional or multi-quantity task identity, replacement-chain traversal, automatic reactivation, signed freshness proofs, or correction successors. The migration-owned `booqable_field_authority_manifest` assigns each `(entity_origin, field)` one authority, writer, backfill rule, and disposition. Local and Booqable customers stay separate. New `booqable_*` base tables are service-role-only. Preserve `sync.ts` and brownfield readers; the MVP adds no second projection or source writer.
- **Brownfield projection consumers** are soft-locked by `src/lib/booqable/contracts/brownfield-consumers.ts`. Named bookings/order/partner/customer/bike-fit selects, `BROWNFIELD_READER_VIEWS`, and `get_partner_daily_stats` (`stat_date`, `daily_orders`, `daily_cents`) stay frozen. Live `sync.ts` include stays exactly `customer,coupon,lines`. New source columns and `booqable_*` tables must not appear in those consumer files. Local-customer insert stays `booqable_customer_id: null` plus `name, email, phone, birthday, sex`. Soft lock only — no grant or RLS changes. Workshop reads its own task/context models and does not widen shared-reader contracts. See `_bmad-output/implementation-artifacts/deferred-work.md` for leftover brownfield follow-ups that are not this MVP.
- **Canonical fetch include:** `src/lib/booqable/canonical-adapter.ts` already owns the nested-order include `customer,coupon,lines.planning.stock_item_plannings.stock_item.barcode`. Do not add a second fetch-profile contract. Live `sync.ts` keeps `customer,coupon,lines` for brownfield consumers. Standalone StockItem collections stay unverified and must not become the only path. The database coordinator `apply_canonical_order_graph` is the sole canonical-source writer and, on an accepted `applied` result, invokes internal Workshop task derivation in the same transaction. The approved live-wiring story points webhook and claim refresh at this adapter; it does not change `sync.ts`. The sandbox route stays on `sync.ts`.
- **Workshop source tags** are owned by `src/lib/booqable/contracts/workshop-tags.ts`. ProductGroup tags are exactly `workshop-road-bike`, `workshop-e-road-bike`, `workshop-e-city-bike`, `workshop-gravel-bike`, `workshop-mtb-bike`, and `workshop-e-mtb-bike`; Bundle tags are the corresponding `workshop-*-bike-bundle` values. Exactly one ProductGroup bike tag classifies category; Bundle tags must agree with the contained bike ProductGroup; tags never replace exact StockItem identity. Untagged, unknown, multiple, or conflicting tags create no task. If they arise for an existing task, a cancellation or exact-assignment-removal transition still wins without category validation; every other source apply returns a typed failure, leaves the last accepted task context/snapshot unchanged, and makes no queue/lifecycle mutation. Persist admitted Product/ProductGroup/Bundle tags. Accessory tags stay uninterpreted; do not add a source-change engine or selective Item invalidation. Never reintroduce a local classification-approval UI, ProductGroup UUID allowlist, or Integration Incident platform.
- **Booqable refresh model (v1)** — an authenticated webhook and any consequential JIT caller (including a task claim) must re-fetch Booqable authority and apply it atomically. The payload is signal-only: never use its fields as current truth. Successfully processed duplicate, delayed, or out-of-order updates must be idempotent. Failed or missed signals have no application-managed retry queue, worker, reconciliation sweep, new manual recovery API, or direct source/task-table repair. Bounded synchronous transport retries and an explicit user resubmission of the original claim are allowed inside the route budget. The existing secret-protected, preview-denied `GET /api/sandbox/booqable/sync-orders` is a temporary legacy exception: it refetches through `sync.ts` and must never directly edit source or task tables. Retire or replace it only through an explicitly approved decision.
- **The Booqable webhook is intentionally "thin"** (`src/app/api/webhooks/booqable/route.ts`): use the payload only to identify which order changed and filter out "ghost" orders (`status: new/concept`). Current production still refetches via `syncBooqableOrder`. The approved live-wiring story switches webhook and claim refresh to the canonical adapter and `apply_canonical_order_graph`; a failed webhook logs with its contextual prefix and returns a retryable failure, and a failed claim returns `{ ok: false, error }` with no claim. Auth remains a static `?secret=` query parameter against `BOOQABLE_WEBHOOK_SECRET`, not HMAC signature verification. Before activating live wiring, record the actual Vercel execution model and bind a route-level total deadline.
- **MVP rollout and recovery (AD-19)** — no activation control plane, pilot cohort, tenancy model, retry worker, reconciliation sweep, new manual source/task repair API, or paper-retirement workflow. Paper remains a local operating fallback, not a feature. Those capabilities need a new architecture decision, not an implicit extension.
- Vercel Hobby tier caps serverless functions at a **10-second execution limit** — any new webhook logic must stay well under that.
- Supabase free tier **pauses the project after 1 week of inactivity**, which breaks webhook ingestion silently — relevant when debugging "orders not syncing" in non-prod.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code.
- Follow all rules exactly as documented; when in doubt, prefer the more restrictive option.
- Cross-check `.cursor/rules/*.mdc` for the full detail behind any rule marked as a condensed pointer here.
- Update this file if a new pattern emerges that future agents would otherwise have to rediscover.

**For Humans:**

- Keep this file lean and focused on agent needs — don't let it grow into general documentation.
- Update when the technology stack changes or a new feature module ships (e.g. the Workshop bike-task system once it's actually built).
- Review periodically and remove rules that become obvious over time.

Last Updated: 2026-08-18
