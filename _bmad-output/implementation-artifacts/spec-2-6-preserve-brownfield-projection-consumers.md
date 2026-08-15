---
title: 'Preserve Brownfield Projection Consumers'
type: 'feature'
created: '2026-08-15'
status: 'done'
review_loop_iteration: 0
baseline_revision: 'cad9c230720ac1c20f8a4318ac7d59d033ca1927'
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/project-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 2.5 added Workshop fields and tables, but shipped bookings, order, partner, customer, and reporting readers are not fixture-locked. Later work could start reading or writing those fields and regress what is already live.

**Approach:** Freeze today’s consumer column lists, view and RPC signatures, and local-customer creation. Soft-lock only: tests fail if brownfield consumer source mentions new fields. Do not change readers, writers, or grants. Do not name a future fetch include — that waits for the story that actually fetches.

## Boundaries & Constraints

**Always:** Lock named consumer selects, `BROWNFIELD_READER_VIEWS`, and `get_partner_daily_stats` (`stat_date`, `daily_orders`, `daily_cents`). Live sync include stays exactly `customer,coupon,lines`. New source columns and `booqable_*` tables stay unmentioned in brownfield consumer source. Local-customer insert stays `booqable_customer_id: null` plus `name, email, phone, birthday, sex`. Soft lock only — no grant or RLS changes. Preserve Stories 2.1–2.5. Local-only Vitest + pgTAP. Zod v4 (`error.issues`).

**Ask First:** Grants or RLS on shared `customers` / `orders` / `order_items` would change; readers would switch to a filtered-current `order_items` contract; or this story would name a nested-order or standalone-inventory fetch path.

**Never:** Change `sync.ts`, webhook/sandbox routes, or brownfield loaders/actions. Implement fetch, apply, workers, incidents, or Workshop task derivation. Add a fetch-profile contract, standalone inventory adapter, classification UI, caller register, or `order_items_current` view. Apply remote DDL. Add a second test runner or codegen package. Wire `db:types` into an app consumer.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Live brownfield include | `sync.ts` fetch URL | Still `include=customer,coupon,lines` | Drift check fails if changed |
| Unchanged consumers | Bookings, order detail, partner views, customer search/create, stats/report | Named selects and view/RPC signatures match the contract | Drift check fails |
| New field leak | Consumer source mentions `entity_origin`, `source_lifecycle`, or a `booqable_*` table | Check fails | Fail closed |
| Local customer create | Insert with legacy columns only | Remains valid and distinct from Booqable identity | Origin CHECK still rejects auto-merge |

</frozen-after-approval>

## Code Map

- `src/lib/booqable/contracts/canonical-projection.ts:97-169` -- reuse `SHARED_PROJECTION_SOURCE_COLUMNS`, `BOOQABLE_SOURCE_TABLES`, `BROWNFIELD_READER_VIEWS`.
- `src/lib/booqable/sync.ts:50-61,100-297` -- live `include=customer,coupon,lines`; writes shared tables only. Read-only.
- `src/app/api/webhooks/booqable/route.ts:74` and `src/app/api/sandbox/booqable/sync-orders/route.ts:108` -- still call `syncBooqableOrder`. Read-only.
- Brownfield readers (read-only; lock their current selects): `src/lib/orders.ts:105-185`; `src/app/partner/_lib/loadPartnerOverview.ts:30-81`; `src/app/partner/_lib/loadPartnerCustomers.ts:6-44`; `src/app/api/partners/download-report/route.ts:99-104`; `src/lib/customers.ts:19-59,83-121`; `src/lib/bike-fit/data/bike-fits.ts:91-175`.
- `supabase/migrations/20260608102505_remote_schema.sql:100-114,357-394` -- RPC/view DDL to fixture-check. Read-only.
- `supabase/tests/database/booqable-integration/002_canonical_projection.pgtap.sql:251-356` -- privileges and view signatures already locked; do not redo them.
- `tests/booqable-contracts/canonical-projection.test.ts:483-486` -- file-read drift pattern to reuse.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/booqable/contracts/brownfield-consumers.ts` -- freeze live include and consumer select/write/RPC column lists -- one editable contract
- [x] `src/lib/booqable/contracts/index.ts` -- export the new contract
- [x] `tests/booqable-contracts/brownfield-consumers.test.ts` -- cover the matrix; file-read drift-check `sync.ts` and each consumer against the contract
- [x] `supabase/tests/database/booqable-integration/003_brownfield_consumers.pgtap.sql` -- prove view/RPC signatures omit new source columns and local-customer insert without those columns succeeds
- [x] `package.json` -- include the new Vitest file in `contracts:check`
- [x] `_bmad-output/project-context.md` -- record the soft consumer lock and that fetch includes wait for a later story

**Acceptance Criteria:**
- Given existing consumer fixtures run after the 2.5 expansion, when they compare bookings, order detail, partner views, customer flows, stats/reporting, and local-customer creation, then existing column contracts remain unchanged.
- Given new Workshop fields and `booqable_*` tables, when brownfield consumer source is checked, then those names do not appear there. Database grants are unchanged.

## Spec Change Log

- 2026-08-15: Nested-order fetch include removed from this story by Den. Parked in `_bmad-output/implementation-artifacts/deferred-work.md` for the first canonical-fetch story. Do not list `stock_items` first.

## Design Notes

The first story that implements canonical Booqable fetch owns the nested-order include `customer,coupon,lines.planning.stock_item_plannings.stock_item.barcode`. Standalone StockItem collections stay unverified until that contract exists. This story only freezes consumers.

## Verification

**Commands:**
- `npx tsc --noEmit` -- strict TypeScript passes.
- `npm run lint` -- lint passes with no new warnings.
- `npm run contracts:check` -- envelope, source-tag, projection, and brownfield-consumer checks pass.
- `npm run test:unit` -- all existing and new unit tests pass.
- `npx supabase test db` -- pgTAP trees pass, including `003_brownfield_consumers`.
- `npm run db:types` -- local type generation succeeds without adding an app consumer.

## Review Triage Log

### 2026-08-15 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 31
- addressed_findings:
  - none

## Auto Run Result

Status: done

Summary of implemented change: Soft-locked today’s bookings, order, partner, customer, bike-fit, and reporting consumers. Live sync still uses `include=customer,coupon,lines`. Readers, writers, and grants were not changed. Nested-order fetch stays parked for the first canonical-fetch story.

Files changed:
- [brownfield-consumers.ts](../../src/lib/booqable/contracts/brownfield-consumers.ts) — one editable contract for live include, named selects, view/RPC columns, and local-customer insert
- [index.ts](../../src/lib/booqable/contracts/index.ts) — export the new contract
- [brownfield-consumers.test.ts](../../tests/booqable-contracts/brownfield-consumers.test.ts) — I/O matrix plus file-read drift checks
- [003_brownfield_consumers.pgtap.sql](../../supabase/tests/database/booqable-integration/003_brownfield_consumers.pgtap.sql) — live views/RPC omit new source columns; legacy local insert and origin CHECK
- [package.json](../../package.json) — include the new Vitest file in `contracts:check`
- [project-context.md](../project-context.md) — record the soft consumer lock and that fetch includes wait
- [deferred-work.md](deferred-work.md) — parked nested-order include for the first canonical-fetch story
- [epic-2-context.md](epic-2-context.md) — same parked include note
- [sprint-status.yaml](sprint-status.yaml) — story 2.6 marked done
- [spec-2-6-preserve-brownfield-projection-consumers.md](spec-2-6-preserve-brownfield-projection-consumers.md) — this spec

Review findings breakdown:
- patches applied: 0
- items deferred: 0
- items rejected: 31 (asked to expand the lock to writers, new files, UI types, grants, full view signatures already in 002, or AST-level parsers; those sit outside the approved source-text soft lock)

Follow-up review recommendation: false. Patched counts: high 0, medium 0, low 0. Score: `3 × 0 + 1 × 0 = 0`.

Verification performed:
- `npx tsc --noEmit` — pass
- `npm run lint` — pass (0 errors; 19 pre-existing warnings, no new ones)
- `npm run contracts:check` — 56 tests pass, including brownfield-consumers
- `npm run test:unit` — 187 tests pass
- `npx supabase test db` — 10 files / 251 tests pass, including `003_brownfield_consumers`
- `npm run db:types` — succeeded; stdout only; no app consumer added

Residual risks:
- Soft lock only: a later story can still change consumers if it also updates this contract.
- Star-select readers pick up new view columns only if a later migration changes the view; Story 2.5’s `002` already locks those signatures.
- Nested-order fetch include remains deferred. Live sync stays `include=customer,coupon,lines`.
