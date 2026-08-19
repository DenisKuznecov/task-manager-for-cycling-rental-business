# Reconcile: Sprint Change Proposal → PRD

- **Input:** `sprint-change-proposal-2026-08-18.md` (approved 2026-08-18)
- **Updated:** `prd.md` (updated 2026-08-18)
- **Skimmed:** `addendum.md`
- **Result:** no material gaps

## Checks

### 1. Eight MVP requirements (§4.2) as FRs

| # | Proposal requirement | PRD home |
|---|---|---|
| 1 | Category-specific Prep/Return templates + per-item second-mechanic | FR-1, FR-2, FR-3 |
| 2 | Task only after exact stock ID; tag selects template | FR-4, FR-5 |
| 3 | See, claim, resume assigned work | FR-7, FR-8 |
| 4 | M1 completes Prep before handoff | FR-11, FR-12 |
| 5 | M2 independently signs configured Items | FR-13, FR-14 |
| 6 | Relevant source change during active Prep → visible reconfirm | FR-15 |
| 7 | Managers resolve attention, reassign, force-close | FR-16, FR-17 |
| 8 | Return reuses task/checklist machinery + attributable history | FR-18, FR-19, FR-20 |

FR-6 (simple cancel/replace), FR-9 (independent bikes), FR-10 (rental context), and FR-21 (refresh on signal/claim) are consistent extras from proposal §4.1 / §4.3, not missing §4.2 items.

### 2. Listed non-goals in PRD §5

All ten proposal non-goals are present: provisional/multi-quantity identity, replacement chains, automated reactivation, JIT proofs, selective mapping, rollout control, tenancy, formal pilot gates, individual modification acknowledgements, full analytics.

§5 also correctly adds proposal §4.1/§4.4 exclusions (Work Cycle, manager reset, same-mechanic override, Structured Modifications, paper-retirement, shop scope).

### 3. Vision and roles retained

§1 keeps bike-quality outcome, Booqable as assignment/order authority, and mechanic attestation. §2.1 keeps M1, M2, Return-check Mechanic, Admin / Manager, and Booqable.

### 4. No leftover enterprise product requirements in `prd.md`

`provisional`, `JIT`, `rollout`, `Work Cycle`, `Structured Modification`, `pilot`, `tenancy`, `freshness`, `Waiting for Bike ID`, `correction successor`, and `replacement-chain` appear only as §5 exclusions (plus historical framing in §0). None are FRs.

### 5. Qualitative language

Operating practice from proposal Epic 9 is in §6.2 (paper fallback, current-shop run, no franchise claim as a feature). “Walk to the rack” / stale-info cost is not in `prd.md`; it is preserved as accepted-model rationale in `addendum.md`, which is the correct home for why-not-product-how. Not a product-contract gap.
