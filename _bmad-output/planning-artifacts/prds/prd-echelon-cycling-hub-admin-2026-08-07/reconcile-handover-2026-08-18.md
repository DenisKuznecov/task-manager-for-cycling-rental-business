# Reconcile: HANDOVER → PRD

- **Input:** `architecture-echelon-cycling-hub-admin-2026-08-10/HANDOVER.md` (2026-08-18)
- **Updated:** `prd.md` (updated 2026-08-18)
- **Updated:** `addendum.md`
- **Result:** no material gaps

## Scope of this check

HANDOVER is a planning/implementation handoff. Only its **PRD alignment prerequisites** were in scope for this extract:

1. Add user-approved `Awaiting Return` to the Work Phase glossary and as the FR-12 (and after-M2) consequence.
2. `Awaiting Return` is a non-claimable Actionable phase after Prep resolves and before Booqable marks the rental returned.
3. It is not in Available Now or My Work.
4. Only a returned authoritative rental enters unassigned `Needs Return Check`.
5. `prd.md` is authoritative; the active contract includes FR-22 Notes; the addendum FR range should be FR-1..FR-22.

Architecture/implementation rules in HANDOVER are **not** PRD gaps if absent from `prd.md`: `withAuth`, named RPCs, Vercel route deadlines, `sync.ts` preservation, `apply_canonical_order_graph`, live-wiring epic order, local-only migrations, proof-before-seam, or `project-context.md` / AD-19 alignment.

## Intended alignment vs documents

| # | Intended PRD rule | Home | Status |
|---|---|---|---|
| 1 | `Awaiting Return` in Work Phase glossary | `prd.md` §3 Work Phase list includes `Awaiting Return`; dedicated glossary term defines it | present |
| 2 | FR-12 consequence when Prep resolves with no Re-check | FR-12: after valid handoff, `Needs Re-check` if Re-check Items exist; otherwise `Awaiting Return` and unassigned | present |
| 3 | After-M2 consequence | FR-14: after required Re-check, `Awaiting Return` and unassigned | present |
| 4 | Non-claimable Actionable after Prep, before Booqable returned | Glossary `Awaiting Return`; FR-8 claimable phases are only `Needs Prep`, `Needs Re-check`, `Needs Return Check` | present |
| 5 | Not in Available Now or My Work | Glossary; UJ-1; FR-7 Available Now is those three claimable phases only; FR-7 My Work names `Awaiting Return` as excluded | present |
| 6 | Only a returned authoritative rental enters unassigned `Needs Return Check` | Glossary; FR-18 trigger is Booqable marking returned; FR-18 consequence: `Awaiting Return` enters unassigned `Needs Return Check` only then | present |
| 7 | `prd.md` authoritative | Addendum: where this file and `prd.md` disagree, `prd.md` wins | present |
| 8 | Active contract includes FR-22 Notes | `prd.md` FR-22; glossary Notes; addendum retired map FR-34 → FR-22 | present |
| 9 | Addendum FR range FR-1..FR-22 | Addendum: “New IDs in `prd.md` are FR-1 through FR-22.” No leftover FR-1..FR-21 current-range claim | present |

Supporting mentions (not required extra FRs): UJ-1 / UJ-3, FR-15 does not reopen after `Awaiting Return`, §5.1 in-scope line for the non-claimable wait.

## Explicitly not gaps

These HANDOVER items belong in architecture / implementation / `project-context.md`. Their absence from `prd.md` is correct:

- Live-wiring through the canonical adapter and `apply_canonical_order_graph`
- Preserve `sync.ts` and brownfield readers; no second projection or source writer
- `withAuth` adapters over named database RPCs; service-only canonical apply
- Record Vercel execution model and enforce a total route deadline before live-wiring
- Epic implementation order (2.11 → 3 → 5 → 6 → 4 → 8)
- Required proof seams (`contracts:check`, pgTAP, concurrency, source transitions)
- Align `project-context.md` with AD-19 (prerequisite 2)

`prd.md` also did not ingest those rules (no `withAuth`, RPCs, Vercel, or `sync.ts`). Addendum Technical-How may keep adapter/`sync.ts` notes; that is not a product-contract miss.

## Gaps

None. The intended PRD alignment is already in `prd.md` and the addendum FR range/authority statements.
