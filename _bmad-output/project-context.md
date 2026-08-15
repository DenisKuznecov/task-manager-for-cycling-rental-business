---
project_name: 'echelon-cycling-hub-admin'
user_name: 'Den'
date: '2026-08-05'
sections_completed:
  ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
rule_count: 29
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

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
- **Booqable** — external rental management platform; source of truth for orders/inventory, integrated via webhook (`src/app/api/webhooks/booqable`) and sync logic (`src/lib/booqable/sync.ts`). Versioned source envelopes and the six-value apply-result vocabulary live in `src/lib/booqable/contracts/` (Zod source, fixture-checked PostgreSQL enums). The source-first bike tag vocabulary lives in `workshop-tags.ts`: ProductGroups use one of six exact `workshop-*-bike` tags, Bundles use the corresponding `workshop-*-bike-bundle` tag, and admitted Product/ProductGroup/Bundle tag lists remain read-only source facts. There is no local ProductGroup allowlist or Workshop classification screen. Broad `review_updated_configuration` is the initial configuration-change mode; accessory-tag interpretation belongs to Epic 6.
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
- **Booqable source envelopes** are owned by `src/lib/booqable/contracts/`. Units are only `order_graph` and `resource_batch`. Results are exactly `applied | no_op | derivation_disabled | quarantined | rejected_retryable | rejected_terminal` — unknown newer codes fail closed. Resource slots are identity + presence + source version + fingerprint inputs, not Booqable attribute schemas. Do not change `sync.ts`, the webhook, or sandbox routes to apply this contract until a later cutover story. `npm run contracts:check` must stay green; do not add a codegen package or wire `db:types` into an app consumer.
- **Canonical Booqable projection** is owned by `src/lib/booqable/contracts/canonical-projection.ts` plus `supabase/migrations/20260815000000_expand_canonical_booqable_projection.sql`. Admitted resources are tagged ProductGroups/Products and agreeing Bundles/BundleItems, plus StockItems, Plannings, StockItemPlannings, and immutable order-bike memberships. Persist complete `tag_list` values as source facts; never replace them with a category. Membership identity is exactly `(order_external_id, line_external_id, source_unit_discriminator, replacement_chain_incarnation)` with one immutable UUID and an immutable predecessor link. Quantity-one may use discriminator `single`; multi-quantity requires distinct StockItem IDs; Planning IDs and array positions are never identity. The migration-owned `booqable_field_authority_manifest` assigns each `(entity_origin, field)` one authority, writer, backfill rule, and disposition. Local and Booqable customers stay separate. New `booqable_*` base tables are service-role-only. Do not change `sync.ts`, webhook/sandbox routes, or brownfield readers in this story.
- **Brownfield projection consumers** are soft-locked by `src/lib/booqable/contracts/brownfield-consumers.ts`. Named bookings/order/partner/customer/bike-fit selects, `BROWNFIELD_READER_VIEWS`, and `get_partner_daily_stats` (`stat_date`, `daily_orders`, `daily_cents`) stay frozen. Live sync include stays exactly `customer,coupon,lines`. New source columns and `booqable_*` tables must not appear in those consumer files. Local-customer insert stays `booqable_customer_id: null` plus `name, email, phone, birthday, sex`. Soft lock only — no grant or RLS changes. Fetch includes wait for the first canonical-fetch story; do not add a fetch-profile contract here. See `_bmad-output/implementation-artifacts/deferred-work.md`.
- **Canonical fetch include (deferred from Story 2.6):** The first story that implements canonical/Workshop Booqable fetching — not today's `sync.ts` `include=customer,coupon,lines` — must contract and fixture-prove the nested-order include `customer,coupon,lines.planning.stock_item_plannings.stock_item.barcode` before adding any standalone StockItem or StockItemPlanning collection. Standalone inventory is an unverified optimization and must not become the only path. See `_bmad-output/implementation-artifacts/deferred-work.md`.
- **Workshop source tags** are owned by `src/lib/booqable/contracts/workshop-tags.ts`. ProductGroup tags are exactly `workshop-road-bike`, `workshop-e-road-bike`, `workshop-e-city-bike`, `workshop-gravel-bike`, `workshop-mtb-bike`, and `workshop-e-mtb-bike`; Bundle tags are the corresponding `workshop-*-bike-bundle` values. Exactly one ProductGroup bike tag classifies category, Bundle tags must agree with the contained bike ProductGroup, and tags never replace exact StockItem identity. Untagged entities create no Workshop work. Unknown, multiple, conflicting, or bundle-disagreeing Workshop tags fail closed with an Integration Incident. Persist admitted Product/ProductGroup/Bundle tags. Accessory tags are uninterpreted until Epic 6; broad `review_updated_configuration` remains the initial change mode. Never reintroduce a local classification-approval UI or ProductGroup UUID allowlist.
- **Durable Booqable refresh inbox** is owned by `src/lib/booqable/contracts/refresh-work.ts` plus `supabase/migrations/20260815140000_persist_authoritative_refresh_work.sql`. Accepted webhooks persist a PII-free receipt (provider event ID, or HMAC-SHA256 of the authenticated body) and coalesce it onto one claimable/leased intent before `syncBooqableOrder`. Completion must fence the exact receipt generation returned by claim; a newer coalesced receipt requeues without consuming budget. Catalogue rows own the 3-attempt 30s/120s retry, exhausted state, incident dedupe, and operator-successor policy; expired-lease reclaim consumes that same timeout budget. Append-only errors discard free-form caller text. All operational mutations are service-role RPCs only — no application-role table DML. Do not treat receipt fields as Booqable truth, add the Story 2.8 worker, or remove `syncBooqableOrder` until a later cutover.
- **The Booqable webhook is intentionally "thin"** (`src/app/api/webhooks/booqable/route.ts`): the payload is only used to identify *which* order changed and filter out "ghost" orders (`status: new/concept`) — the actual order/customer/item data is always re-fetched fresh via `syncBooqableOrder`, so duplicate or out-of-order deliveries safely converge. Don't "optimize" by trusting payload fields as current truth. Auth is a static `?secret=` query param against `BOOQABLE_WEBHOOK_SECRET` — not HMAC signature verification. Persist the durable receipt after auth/ghost filtering and before the legacy fetch; persistence failure is 500 without fetch.
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

Last Updated: 2026-08-15
