# Lifecycle Consistency Revalidation — Workshop Tasks PRD Package

## Gate Verdict

**PASS for the requested PRD package:** `prd.md` and `addendum.md` are internally lifecycle-consistent, faithfully apply all three requested amendments, and preserve unrelated lifecycle requirements. No critical, high, medium, or low defect remains in the PRD package. `ARCHITECTURE-SPINE.md` still contains superseded text, but that is a separate stale-architecture maintenance issue and not a defect in the files the user requested revised.

**PRD package finding count:** 0 critical · 0 high · 0 medium · 0 low

## Scope

Reviewed:

- `prd.md`
- `addendum.md`

Against:

- `technical-workshop-architecture-open-activation-blockers-research-2026-08-12.md`, especially “Ready-to-Apply Document Amendments”
- `ARCHITECTURE-SPINE.md`

This revalidation checks the same lifecycle seams as the first review: quantity-one provisional identity, multi-quantity exact StockItem enrollment and unknown shortfall, replacement/removal/cancellation/reactivation, assignment and evidence preservation, Setup Category invalidation, broad-review fallback, cross-section consistency, and preservation of unrelated requirements.

## A. Defects Remaining in the Requested PRD Package

### Critical

None.

### High

None.

### Medium

None.

### Low

None.

## B. Closure Verification

### 1. FR-1 quantity-one provisional behavior and multi-quantity exact-only behavior — closed

**Citations:** `prd.md` §3 “Bike Task” and “Waiting for Bike ID”; FR-1; FR-2; §6 “Source-of-truth partition”; Addendum “Multi-quantity physical-bike identity” and “Provisional bike identity.”

- The stable opaque StockItem external ID is now explicitly separated from the human-readable `stock_identifier`.
- A quantity-one line may create one provisional `single` task and attaches later identity to that same task.
- Claimability waits for both the exact StockItem assignment and human-readable workshop identifier.
- Multi-quantity lines create tasks only for exact distinct StockItem assignments and prohibit quantity-, position-, title-, StockItemPlanning-position-, or ordinal-derived identity.
- Unknown shortfall remains one deduplicated, non-claimable Integration Incident.
- The incident now has the required safe closure rule: exact assignments cover expected quantity, or accepted explicit source evidence decreases planned quantity.

This faithfully applies the research “PRD FR-1 replacement” and the identity/incident semantics in the ready AD-5 amendment.

### 2. FR-2/FR-3 replacement, suspension, reactivation, and no presence lease — closed

**Citations:** `prd.md` FR-2, FR-3, FR-4, and FR-47; §6 “Dependencies and assumptions”; §10 step 3; Addendum “Booqable synchronization” and “Assignment after source suspension.”

- Replacement by a different StockItem closes the old task as irreversible Replaced and creates a fresh task.
- Explicit validated removal without replacement makes only that bike task read-only; generic absence is non-closing.
- Authoritative cancellation and explicit validated removal atomically clear assignment.
- Valid same-bike reactivation preserves safe stage/evidence, reconciles current intent, selectively reopens changed work, and returns unassigned.
- FR-47 now distinguishes authoritative current cancellation from stale reserved updates and allows later authoritative reactivation under FR-3.
- Open screens, sessions, stages, and recent saves are explicitly rejected as presence proof; v1 has no presence lease.
- Rollout now names cancellation, explicit removal, replacement, same-bike reactivation, preserved stage/evidence, and cleared assignment.

The package therefore has one mutually consistent model: cancellation/removal are reversible source-availability suspensions, Replaced is irreversible, and stale updates cannot reactivate work.

### 3. FR-26 through FR-33 Setup Category invalidation — closed

**Citations:** `prd.md` FR-26 through FR-33; §6 “Dependencies and assumptions”; §8.1 “In Scope”; SM-2; Open Question 1; Addendum “Setup Category mapping.”

- Targeted invalidation activates only under one approved mapping version in which every active Setup Category has a stable account-approved identifier and fixture-backed normalization for null, unknown, changed, and removed values.
- Until all five categories satisfy that gate, all relevant configuration changes use the broad built-in `review_updated_configuration` requirement.
- Even after activation, any relevant change that cannot be mapped safely falls back to broad review.
- Labels are display-only and are not mapping keys.
- The same all-five gate is repeated consistently in FR-26, dependencies, Open Question 1, and addendum rationale.
- Active M1 retention, Re-check return to Prep, reopened completed Prep, renewed independent verification, pickup/Return boundaries, convergent intent, and self-clearing highlights remain intact.

This faithfully applies the research Setup amendment and resolves the prior per-category versus all-active-category ambiguity.

## C. Cross-Document Consistency Within the PRD Package

- **Glossary:** stable StockItem identity, display `stock_identifier`, quantity-one provisional work, multi-quantity exact-only work, and Integration Incident semantics agree with the FRs.
- **Flows:** UJ-2 agrees with targeted-or-broad invalidation and active-M1 retention.
- **Integration assumptions:** canonical refresh, explicit-removal authority, all-five Setup mapping, and broad fallback agree with FR-1/FR-3/FR-26.
- **Scope:** quantity-one Waiting for Bike ID, incident-only ambiguous shortfall, and safely mapped targeted reopening remain in scope without introducing guessed work.
- **Success metrics and rollout:** SM-2 covers the amended FR ranges, and rollout now explicitly exercises the revised suspension/reactivation cases.
- **Open questions:** Setup mapping remains an honest activation dependency; it no longer implies partial category activation.
- **Addendum rationale:** identity separation, exact-only multi-quantity enrollment, incident closure, tombstone-only removal, unconditional unassignment, reversible cancellation, and no v1 presence lease all match the PRD.
- **Unrelated lifecycle requirements:** snapshots, M1/M2 independence, reassignment attribution, Return forcing, attention orthogonality, manager controls, stale-screen rejection, confirmed-save behavior, and audit history remain preserved.

## D. Stale Text in `ARCHITECTURE-SPINE.md` — Not PRD Package Defects

The following are still inconsistent with the revised PRD and the later research recommendations, but they are defects in the unchanged Architecture Spine, which the user explicitly did not ask to edit:

1. **AD-4 stale absence authority:** it still permits some newer complete-scope absence to close a child; the adopted research and revised PRD require generic absence to remain non-closing and explicit validated removal evidence.
2. **AD-5 stale multi-quantity identity:** it still requires a discriminator across assigned and unknown multi-quantity units and describes unknown → known membership; the revised PRD admits only exact StockItem-backed multi-quantity tasks and represents unknown quantity only by incident.
3. **AD-6 stale alignment note:** it still claims FR-3 contains a “same mechanic is still actively working” exception, although the revised FR-3 has removed it.
4. **AD-13 and “Open Activation Blockers” stale status:** Setup mapping is still described as independently unproven without the ready all-active-category fallback amendment, and FR-1/FR-3 are still listed as unresolved documentary choices.

These notices should be handled by the architecture-owning workflow. They do not reopen any finding against `prd.md` or `addendum.md`.

## Final Gate

**Gate verdict: pass—the revised PRD package is internally lifecycle-consistent and faithfully applies the FR-1, FR-3, and Setup-mapping amendments; only separately scoped stale Architecture Spine text remains.**
