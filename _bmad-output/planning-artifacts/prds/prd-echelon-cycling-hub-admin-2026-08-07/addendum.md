# Workshop Tasks PRD Addendum

This addendum preserves technical-how, rejected-alternative rationale, and the retired FR map. The capability-focused PRD is the product contract. Where this file and `prd.md` disagree, `prd.md` wins.

## Source Material

- Approved scope correction: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-18.md`
- Canonical PRD-session decisions: `.memlog.md`
- Prior brainstorming: `_bmad-output/brainstorming/brainstorm-per-bike-workshop-tasks-2026-08-05/.memlog.md`
- Architecture contract (not yet rewritten for this MVP): `_bmad-output/planning-artifacts/architecture/architecture-echelon-cycling-hub-admin-2026-08-10/ARCHITECTURE-SPINE.md`

## 2026-08-18 MVP Correction

The 2026-08-07/12 autonomous source-identity, freshness-proof, and rollout plan is rejected for the first operating release.

**Current product rule:** create one Bike Task after an exact manager-assigned stock ID; run Prep + independent M2 + Return on that task; reconfirm only during active M1 Prep; let managers resolve attention, reassign, or force-close.

Shipped work stays: Epic 1 templates and Epic 2 Stories 2.1–2.10.

## Current Landscape Notes

Rental and fleet tools usually separate asset availability from work-order progress and keep blockers orthogonal to completion. Workshop Tasks follows that split: Booqable owns the assigned bike and order lifecycle; the Bike Task owns workshop progress and attribution; Needs Attention is not a Task Outcome.

## Retired FR Map (2026-08-12 → 2026-08-18)

New IDs in `prd.md` are FR-1 through FR-22. Downstream architecture and epics must stop targeting the old IDs.

| Old IDs | Disposition | New home |
|---|---|---|
| FR-11, FR-12, FR-13, FR-16, FR-17, FR-18 | Kept, compressed | FR-1, FR-2, FR-3, FR-11, FR-12 |
| FR-1 provisional / multi-quantity / Integration Incident | Non-goal | FR-4, FR-5 |
| FR-2, FR-3 replacement-chain and auto-reactivation | Non-goal | FR-6 simple cancel/replace |
| FR-4 long lifecycle including Waiting for Bike ID | Replaced | Glossary Task Outcome + Work Phase |
| FR-5 manager reset | Non-goal | — |
| FR-6, FR-7, FR-8, FR-9 | Kept, compressed | FR-7, FR-8, FR-9 |
| FR-10 Work Cycle ownership | Non-goal | M1/M2 on the Bike Task; no cycle model |
| FR-14, FR-15 Setup Category visibility / targeting | Non-goal as targeting | Context may still display on the Bike Task via FR-10 |
| FR-19 built-in confirmation / broad review Item | Non-goal as an engine | FR-15 reconfirmation during `In Prep` |
| FR-20–FR-24 M2 core | Kept, compressed | FR-13, FR-14 |
| FR-25, FR-45 same-mechanic override | Non-goal | Hard M2 ≠ M1 |
| FR-26–FR-33 selective invalidation and reopen-after-complete | Non-goal | FR-15 only |
| FR-34 Notes | Kept, compressed | FR-22 |
| FR-35, FR-36 accessory inference | Non-goal | Do not guess flat-order associations |
| FR-37, FR-41, FR-42 Structured Modifications + acknowledgement | Non-goal | FR-19 history |
| FR-38, FR-43 attention | Kept, compressed | FR-16 (override reason removed) |
| FR-39, FR-40 Return | Kept, compressed | FR-18, FR-19 |
| FR-44 force-close | Kept | FR-17 |
| FR-46 history | Kept | FR-20 |
| FR-47, FR-48 sync / stale screen | Compressed | FR-21, NFR-3 |

## Technical-How (Not Product Features)

- Booqable notifications are signal-only. Current authority is a refetch through the canonical adapter, then `apply_canonical_order_graph`.
- A mechanic claim performs the same current-order refetch before the claim completes.
- `src/lib/booqable/sync.ts` remains the brownfield writer and is not extended by this MVP.
- No application-managed retry queue, worker, reconciliation sweep, or missed-webhook repair API.
- Controlled ProductGroup tags remain `workshop-road-bike`, `workshop-e-road-bike`, `workshop-e-city-bike`, `workshop-gravel-bike`, `workshop-mtb-bike`, and `workshop-e-mtb-bike`. Bundles use the matching `workshop-*-bike-bundle` tag. Tags classify category; they never replace StockItem identity.
- New `booqable_*` tables stay service-role-only. Migrations stay idempotent and are applied locally; staging/production schema changes go through CI.

## Accepted Model Rationale (Current)

- **Manager-assigned identity:** The manager already reconciles the physical bike with the customer in Booqable. Inventing provisional tasks or quantity expansion duplicates that job and creates work the shop cannot perform.
- **Living Bike Task after assignment:** Once a stock ID exists, the same Bike Task carries Prep, Re-check, and Return. There is no manager “release to workshop” gate.
- **Always-visible admin-authored Items:** Admins own checklist language. Generated accessory Items were rejected earlier and stay rejected.
- **Independent M2:** M2 attests configured Items; M1 cannot self-complete them. A same-mechanic override would collapse the quality goal in a three-person shop that can usually find a second pair of hands.
- **Active-Prep reconfirmation only:** The practical stale-information cost is a walk to the rack, except while M1 is mid-checklist. That is the only change window that must block handoff.
- **Attention orthogonal to Done:** Exceptions stay visible without blocking mechanical completion.
- **Return reuses Prep machinery:** A second checklist engine and per-modification acknowledgement do not earn their complexity for this shop.

## Rejected or Deferred Alternatives

Includes earlier rejections that still hold, plus models reversed on 2026-08-18.

- **Autonomous reserved-order task creation, including Waiting for Bike ID:** Reversed. No Bike Task before an exact stock ID.
- **Multi-quantity Integration Incident identity:** Reversed. Unassigned quantity creates no workshop work.
- **Replacement-chain incarnation, overlap guards, correction successors, automatic reactivation:** Reversed. Cancel or replace the task; create a fresh task only for a newly assigned stock ID.
- **JIT freshness proofs, caller cutover / writer revocation, activation epochs, pilot cohorts, tenancy:** Non-goals. Adoption is an operating note.
- **Selective Setup Category mapping and accessory-tag interpretation:** Non-goals.
- **Work Cycle model, manager reset, same-mechanic override, standalone Activity:** Non-goals.
- **Structured Modifications and individual Return acknowledgement:** Reversed. Observations live in task history.
- **Generated accessory checklist Items:** Still rejected.
- **Automatic mechanic assignment:** Still rejected.
- **Offline after session loss:** Still excluded; confirmed-save retry while online remains required.
- **Analytics / mechanic performance dashboards:** Deferred; FR-20 is history, not reporting.
- **Paper-retirement product gate:** Reversed as a feature. Keep paper locally until the team is comfortable.

## Loading and Pending Feedback (Implementation Mapping)

NFR-4 is a product requirement for continuous feedback, not an API prescription. In this Next.js App Router hub that typically means route-level `loading.tsx` plus pending UI on claim, Item save, handoff, and completion. Exact visuals stay with UX.

## UX Topics Left Open

Living UX questions sit in `prd.md` §9. This file does not restate them.
