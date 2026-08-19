---
title: Workshop Tasks MVP implementation handover
prepared: 2026-08-18
status: ready-with-prerequisites
audience: planning and implementation
source_spine: ARCHITECTURE-SPINE.md
---

# Workshop Tasks MVP — Implementation Handover

## Authoritative inputs

- `ARCHITECTURE-SPINE.md` — final feature-level build substrate; AD-1 through AD-19 are binding.
- `../../prds/prd-echelon-cycling-hub-admin-2026-08-07/prd.md` — product contract for FR-1 through FR-22 and NFR-1 through NFR-7.
- `../../sprint-change-proposal-2026-08-18.md` — approved delivery sequence and compressed-MVP boundary.
- `../../../project-context.md` — repository constraints and current brownfield facts, subject to the scope-alignment prerequisite below.

## Delivery status

The architecture is final and its reviewer gate passed. The build is ready to decompose after two documentation prerequisites:

1. Add user-approved `Awaiting Return` to the PRD Work Phase glossary and FR-12 consequence. It is a non-claimable Actionable phase after Prep resolves and before Booqable marks the rental returned.
2. Align the retained pre-MVP Workshop/Booqable future-cutover rules in `project-context.md` with AD-19. Preserve the frozen canonical projection, brownfield-reader, security, and deployment constraints; remove the requirement to import its retired identity, activation, correction, and recovery scope into this MVP.

`prd.md` is authoritative over its addendum. The addendum's FR-1..FR-21 range is stale; the active contract includes FR-22 Notes.

## Current reality versus target

| Area | Current repository reality | Target delivery state |
| --- | --- | --- |
| Webhook | Signal-only route refetches through `src/lib/booqable/sync.ts` | Approved live-wiring story refetches through the canonical adapter and applies `apply_canonical_order_graph` |
| Canonical layer | Canonical contracts, nested adapter, coordinator, and database apply function exist but are not live-wired | Sole Workshop source boundary after wiring |
| Task claim | No Bike Task claim flow is implemented | Refetch-and-apply first, then conditionally claim the displayed task |
| Shared readers | Existing `sync.ts` consumers remain live and frozen | Preserved; Workshop reads task-scoped context rather than widening shared readers |

The live-wiring story must preserve `sync.ts`, existing brownfield consumers, and the source-envelope contract. It must not add a second projection, source writer, durable retry/recovery system, or workflow logic in Next.js.

## Recommended implementation order

1. **Source-doc alignment** — complete the two prerequisites above.
2. **Epic 2.11: live wiring** — use one canonical fetch-and-apply path for webhook signals and task claims. Before activating it, record the actual Vercel execution model and enforce a total route deadline.
3. **Epic 3: manager-assigned Bike Tasks** — derive only from exact StockItems, selected source tags, immutable Prep snapshots, and the AD-5/AD-6 transition matrix.
4. **Epic 5: mechanic workflow** — queues, mechanic-only conditional claims, M1 Prep, independent M2, confirmed saves, and history.
5. **Epic 6: active-Prep reconfirmation** — generation-bound acknowledgement only while `In Prep`.
6. **Epic 4: manager intervention** — attention, reassignment, and force-close through capability RPCs.
7. **Epic 8: Return Check** — reusable checklist mechanics, one mechanic, no M2, then `Done`.

## Non-negotiable build rules

- All staff mutations are `withAuth` adapters over named database RPCs. Canonical source apply is the one service-only exception and invokes the internal task derivation in the same transaction.
- Task identity is one Booqable rental/order plus one exact opaque StockItem ID. Never infer from titles, quantity, an array position, or `stock_identifier`.
- `Awaiting Return` is not in Available Now or My Work. Only a returned authoritative rental enters unassigned `Needs Return Check`.
- M1 is the accepted Prep-handoff actor. M1 cannot claim Re-check; M2 must be a different mechanic.
- User commands require the owner/phase predicate in AD-11. Use task and evidence revisions; never accept stale work silently.
- Webhook payloads identify an order only. Booqable authority is refetched; failed claims do not claim, and failed webhooks log then return retryable failure.
- Workshop is online-only. Do not add offline storage, command replay, a worker, a queue, a sweep, a new repair API, or a rollout control plane.
- Apply migrations locally only; CI is the staging/production migration path.

## Required proof before activating each seam

- Canonical/contracts: `npm run contracts:check`.
- Database changes: idempotent migration, local verification, and pgTAP coverage for the affected transaction, authorization, revision, and history path.
- Live wiring: prove webhook and claim use the canonical path, while `sync.ts` and brownfield readers remain unchanged.
- Concurrency: prove first-writer-wins claims and M1 cannot claim Re-check.
- Source transitions: prove cancellation/removal/replacement/Return precedence, invalid-tag handling, and `Force-closed`/`Done` preservation.
- UI: prove server-confirmed pending/error behavior on phone/tablet mechanic flows and desktop manager flows.

## Explicit non-goals

Do not reintroduce provisional or multi-quantity task identity, replacement chains, automatic reactivation, signed freshness proofs, selective Item invalidation, Work Cycles, same-mechanic M2 override, Structured Modifications, individual Return acknowledgements, tenancy, cohorts, paper-retirement automation, or analytics dashboards.
