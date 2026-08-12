# Booqable Selective-Warehouse Spike — Handoff

## Status

**Complete.** The spike resumed from this handoff and finished on 2026-08-10.

Authoritative final report:

`_bmad-output/planning-artifacts/research/technical-booqable-selective-warehouse-spike-research-2026-08-10.md`

Final decision: **conditional go** for the minimum safe selective multi-entity projection; do not build a broad warehouse platform.

Completed evidence includes GET-only live account scans, historical bike-assignment coverage, measured runtime/rate limiting, a seven-assertion local PostgreSQL recovery proof, refined implementation/support/cash cost, Workshop architecture comparison, and the smallest justified next lifecycle step.

## Resume Authority

Read these first:

- Scope contract: `_bmad-output/brainstorming/brainstorm-booqable-data-mirror-2026-08-10/technical-spike-handover.md`
- Research in progress: `_bmad-output/planning-artifacts/research/technical-booqable-selective-warehouse-spike-research-2026-08-10.md`
- Workshop baseline for later comparison only: `_bmad-output/planning-artifacts/architecture/architecture-echelon-cycling-hub-admin-2026-08-10/ARCHITECTURE-SPINE.md`
- Project rules: `_bmad-output/project-context.md` and `.cursor/rules/*.mdc`

The research report frontmatter currently records `stepsCompleted: [1, 2, 3]`.

## User’s Primary Decision Criterion

The owner is one engineer using AI. The main concern is maintenance creep.

The unacceptable operating mode is:

> Webhook crashes force manual database repair one Booqable item at a time.

The final recommendation must include:

- implementation effort in engineering days/hours;
- ongoing support effort;
- incremental infrastructure cost;
- likely incident modes;
- whether bulk reconciliation removes per-item manual repair;
- explicit assumptions and confidence ranges.

## Important Correction From the User

Do not reduce the solution to an order-only projection.

The user also needs:

- physical-bike history across orders;
- app-owned records of bike changes/modifications;
- customer pages backed by useful local customer data.

The corrected candidate boundary is a **selective multi-entity projection**:

- Customers synchronize as entities for customer-facing/admin pages.
- Physical bikes synchronize by stable Booqable StockItem identity and identifier.
- Product, ProductGroup, Bundle, and BundleItem concepts are admitted only where workshop workflows require them.
- Orders, Lines, Plannings, and StockItemPlannings establish customer/order/bike relationships.
- Historical assignment rows are retained or closed, not destructively overwritten.
- Workshop modifications remain app-owned history linked to the physical bike.

Orders are the primary source for bike-to-order assignments, but they are not the only synchronization entry point.

## Verified Public-Documentation Findings

Booqable API v4 publicly documents this workshop-critical path:

`Order → Line → Planning → StockItemPlanning → StockItem → Barcode`

Key semantics:

- Orders expose `lines`, `plannings`, and `stock_item_plannings`.
- Lines expose stable IDs plus `item_id`, `planning_id`, `parent_line_id`, and `bundle_item_id`.
- Plannings link orders to Products/Bundles and expose StockItemPlannings.
- StockItemPlannings expose `stock_item_id`, `planning_id`, `order_id`, status, and archive fields.
- For trackable rental Products, each StockItem has its own identifier.
- A Planning may have fewer StockItemPlannings than quantity because physical items are not yet assigned. Preserve this as unknown; never infer identity from titles.
- API v4 collections document `page[number]`, `page[size]`, filtering, sorting, aggregate metadata, and HTTP 429.
- No numeric rate limit or dependable `Retry-After` contract was established.
- Public evidence did not establish Booqable webhook retry guarantees or a complete lifecycle-event matrix.

Primary source: https://developers.booqable.com/v4.html

## Current Repository Baseline

Current production flow:

`Booqable order webhook → fetch canonical API v4 order → sequentially upsert customer, order, and lines`

Relevant files:

- `src/app/api/webhooks/booqable/route.ts`
- `src/lib/booqable/sync.ts`
- `src/app/api/sandbox/booqable/sync-orders/route.ts`

Current strengths:

- Webhook body is treated as a signal, not canonical data.
- The latest order is refetched from Booqable.
- Customers, orders, and lines upsert by stable Booqable IDs.
- Webhook and backfill reuse the same synchronizer.
- Duplicate or out-of-order webhook delivery normally converges on current source state.

Current gaps:

- The canonical fetch includes only `customer,coupon,lines`; it does not fetch Planning or physical-bike assignment.
- No local Product, Bundle, physical-bike, or bike-assignment entities exist.
- No durable webhook inbox, attempt record, failed-event list, or manual retry.
- No reconciliation checkpoint or persisted run state.
- Current writes span several Supabase requests and are not atomic.
- The sandbox backfill route has no authentication or explicit non-production guard.
- The webhook logs a supplied invalid query-string secret; do not repeat that pattern.
- No automated test runner or existing sync fixtures exist.

## Live Evidence Available but Not Yet Collected

Ignored `.env.local` contains the Booqable slug/API key and points Supabase at the local stack.

Use credentials only for read-only Booqable requests during the spike:

- never print or persist secret values;
- never create, update, archive, or delete Booqable resources;
- never alter remote webhook subscriptions;
- avoid writing raw customer PII into reports or fixtures;
- redact payload samples and report IDs only where needed as evidence.

The shell does not export these variables automatically; load `.env.local` safely in a local script.

## Remaining Work at Time of Handoff (Completed)

The final report and its linked evidence artifacts complete every item below. This list is retained only as historical handoff context.

1. Query representative current, completed, and archived orders read-only.
2. Verify the nested assignment graph against actual account payloads.
3. Determine whether physical StockItems can be enumerated reliably and how identifiers are exposed.
4. Count exact historical bike-to-order assignments and explicit unknowns.
5. Produce the source-graph report and webhook coverage matrix.
6. Build a local-only proof for:
   - canonical targeted refresh;
   - idempotent atomic projection;
   - checkpointed paginated reconciliation;
   - duplicate, delayed, missed, and out-of-order recovery.
7. Measure request counts and runtime at representative scale.
8. Compare evidence with the Workshop architecture baseline without editing it.
9. Estimate implementation/support/cash cost for both:
   - the minimum safe multi-entity vertical slice;
   - a broader selective warehouse.
10. Finish with go / conditional-go / no-go and the smallest justified next lifecycle step.

## Preliminary Architecture Direction — Not Yet a Decision

The lowest-maintenance viable candidate currently appears to be:

- keep one modular Next.js application;
- keep Booqable translation inside `src/lib/booqable/`;
- use one atomic PostgreSQL ingestion operation per canonical source snapshot;
- preserve existing shared `customers`, `orders`, and `order_items` rather than create a competing order copy;
- add stable physical-bike and historical membership entities;
- persist webhook receipt/processing/failure state in PostgreSQL;
- use the same adapters for webhook refresh and reconciliation;
- run bounded checkpointed reconciliation outside a user-facing Vercel request;
- avoid a broker, microservice, ORM, or full raw-payload mirror.

Do not finalize this direction until live evidence proves the source graph and historical coverage.

## Preliminary Cost Range — Must Be Refined

Current rough estimate:

- Safe multi-entity implementation: **15–25 engineering days** for one AI-assisted engineer.
- Stable support target: **3–8 hours/month**.
- Incremental infrastructure: likely **$0** within current scale and free quotas.
- Optional reliability upgrades:
  - Supabase Pro: currently from **$25/month**.
  - Vercel Pro: currently **$20/month**, but should not be required solely for reconciliation.
- Labor opportunity cost: implementation/support hours multiplied by the owner’s own hourly value.

These are decomposition-based estimates, not measured results. Refine them after the local proof.

## Non-Negotiable Boundaries

- Do not edit the existing Workshop PRD, UX, or architecture artifacts.
- Do not touch staging or production databases.
- Do not create, modify, audit by mutation, or delete remote webhook subscriptions.
- Do not write projected fields back to Booqable.
- Do not infer bike identity or assignments from titles.
- Do not copy the full Booqable schema.
- Do not proceed to epics or implementation after the recommendation.

## Historical Resume Prompt (Superseded)

Do not use this prompt to restart the spike. Use the completed final report named in **Status**.

> Resume and complete the Booqable selective-warehouse technical spike from `_bmad-output/planning-artifacts/research/booqable-selective-warehouse-spike-handoff-2026-08-10.md`.
>
> Treat `_bmad-output/brainstorming/brainstorm-booqable-data-mirror-2026-08-10/technical-spike-handover.md` as the scope and decision contract. Continue from the existing research report instead of restarting brainstorming or generic research.
>
> Execute the remaining read-only Booqable evidence gathering and local-only proofs. Preserve the corrected multi-entity requirement: customer pages, stable physical-bike identity and cross-order history, app-owned bike modifications, and exact order-bike relationships. Keep unknowns explicit and never infer identities from titles.
>
> Do not mutate Booqable, remote webhooks, staging/production databases, or existing Workshop planning artifacts. Finish every required spike output, ownership-cost analysis, baseline comparison, and the evidence-backed decision recommendation.
