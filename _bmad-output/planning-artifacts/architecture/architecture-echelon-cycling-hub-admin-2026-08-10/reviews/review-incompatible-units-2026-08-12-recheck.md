# Critical/High Incompatible-Units Recheck — Architecture Spine

## Verdict

**FAIL — no critical pair remains, but three high-severity architecture-level incompatible-unit pairs remain.**

The parent update closes the prior critical/high findings around JIT demand fencing, browser-revision handoff, emergency-disable enforcement, membership ownership, removal mapping, pilot isolation, activation authority, incident classification, Setup fallback, per-bike Return mapping, and lease-fenced mutation. Those fixed pairs are not repeated below.

## Recheck Boundary

- Target: `../ARCHITECTURE-SPINE.md`, updated 2026-08-12.
- Scope: only critical/high incompatibilities between independently decomposed units.
- Pair test: both units must obey every applicable AD literally while producing incompatible domain behavior.
- Excluded: medium findings, ordinary schema/index/DTO choices, and behavior already forced by a named authoritative registry/catalogue/profile.

## Remaining Critical/High Findings

### HIGH — General activation has no canonical pre-boundary enrollment universe

**Unit A — enablement coordinator.** After the two stable sweeps, it explicitly enrolls every eligible order observed before the sweep boundary, then enables post-boundary auto-enrollment. It treats the completed sweep set as the population that must exist when paper and Workshop overlap.

**Unit B — enablement coordinator.** It retains the pilot cohort as the only explicitly enrolled pre-boundary population and, once `enabled`, auto-enrolls only newly observed post-boundary orders. Older eligible orders outside the pilot remain unenrolled unless an operator later selects them.

Both obey AD-19: pilot is cohort-limited, enabled mode permits post-boundary auto-enrollment, every enrolled order must be current, and paper retirement remains a later approval. The current AD-14/AD-19 text does not require all eligible pre-boundary orders to enroll at general activation, preserve the earlier completed-boundary ID manifest, or define what timestamp/sequence makes an order “post-boundary.”

**Incompatibility.** The same general-activation approval can produce a complete Workshop population in Unit A and a pilot-plus-new-orders population in Unit B. Missing pre-boundary tasks are then invisible to the “every enrolled order current” gate because those orders were never enrolled.

**Required closure.** Restore a durable completed-boundary manifest and bind: eligibility predicate/version, exact boundary authority, required disposition for every eligible pre-boundary order, post-boundary source-created proof, and the no-go rule for unaccounted eligible orders before general activation.

### HIGH — The “source-proven new rental identity” exception has no identity contract

**Unit A — lifecycle normalizer.** For a same-stock reappearance after Done or Force-closed, it treats a fixture-proven new non-overlapping rental occurrence—new source lifecycle occurrence plus newer authoritative dates/versions—as a new rental identity and opens the next linked incarnation under the existing order/line/stock tuple.

**Unit B — membership derivation.** It treats Planning and StockItemPlanning facts strictly as assignment observations under AD-5. With the same order, line, and StockItem IDs, it cannot prove a new rental identity, so it always opens an incident and creates no successor unless a new order/line identity appears.

Both preserve terminal history, never reopen the old task, and use no ordinal identity. AD-5 explicitly allows a “source-proven new rental identity” but does not name its canonical source discriminator, required authority token, relationship to `replacement_chain_incarnation`, or fixture branch.

**Incompatibility.** Unit A creates legitimate repeat-rental work that Unit B permanently suppresses. If Unit A's inferred occurrence is wrong, it duplicates work after a terminal task; if Unit B is too strict, a real new rental has no task.

**Required closure.** Define a versioned new-rental-identity registry/profile with exact source fields, authority/version comparison, temporal rules, incarnation operation, terminal predecessors allowed, and mandatory positive/negative/replay fixtures. Until proven, explicitly remove the exception and require incident-only handling.

### HIGH — Physical StockItem exclusivity has no graph or temporal scope

**Unit A — membership constraint/RPC.** Interprets “one StockItem fulfilling multiple admitted memberships anywhere in the rental graph” as a global current-membership invariant. It quarantines a second admitted membership for the same StockItem even when it belongs to another order or a later non-overlapping rental.

**Unit B — order-graph derivation.** Enforces exclusivity only inside one incoming `order_graph` root, or only across memberships whose rental intervals overlap. It admits the same physical bike into sequential orders and cannot detect a conflicting membership in another independently reconciled root unless intervals overlap.

Both use the exact physical StockItem external ID and quarantine conflicts rather than guess. The spine does not define whether “rental graph” means one order root, one rollout cohort, all current memberships, or time-overlapping memberships; nor does it bind which rental dates/phases establish non-overlap.

**Incompatibility.** Unit A can quarantine ordinary sequential reuse of a rental bike, while Unit B can admit a double-booked bike if conflicting order roots are reconciled independently or use different interval assumptions. Their database constraints, lock sets, reconciliation outcomes, and incident scopes cannot compose.

**Required closure.** Define the exclusivity scope and overlap predicate, including authoritative interval fields, boundary inclusivity, unknown-date behavior, terminal/removed memberships, cross-order locking, and fixtures for sequential versus overlapping rentals.

## Gate Conclusion

The new spine is materially stronger and the previously reported critical/high seams are closed. It still does not pass the incompatible-units gate because general activation can omit an unbounded pre-boundary population, and physical-bike identity remains ambiguous for repeat rentals and cross-order exclusivity. These are architecture-level identity/activation decisions, not implementation details.
