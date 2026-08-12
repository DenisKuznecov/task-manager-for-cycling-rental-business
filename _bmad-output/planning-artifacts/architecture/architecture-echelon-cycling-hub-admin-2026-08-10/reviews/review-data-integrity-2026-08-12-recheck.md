# PostgreSQL / Data-Integrity Recheck — Updated Architecture Spine

## Verdict

**CHANGES REQUIRED — no Critical finding remains, but three High-severity comparator/correction gaps still permit incompatible database implementations.**

The prior High findings on provisional membership nullability, multi-quantity overassignment/duplicate fulfillment, omission carry-forward, and correction-role authorization are substantially fixed. The recheck found two residual comparator holes introduced or left open by the carry-forward rule and one remaining ambiguity in correction-successor uniqueness.

Only architecture-level Critical/High issues are reported below.

## Remaining Critical / High Findings

### H1 — New-component admission no longer requires newer relationship authority

AD-4 compares the union of accepted and incoming components and defines behavior for equal, older, incomparable, and omitted accepted components. It no longer states the prior rule that an addition requires newer root/relationship authority, nor does it state that an independently versioned new child may authorize its own admission.

A component that exists only in the incoming graph has no accepted component version against which “newer” can be evaluated. One ingestion story can admit it solely because its child token is present; another can require a newer parent/relationship token; a third can quarantine it as incomparable. Those implementations produce different memberships/tasks from the same refetch, and the first can admit a stale or phantom relationship from an inconsistent fetch.

The comparator must bind one addition-authority rule per relationship/resource profile: either fixture-proven newer relationship authority, or an explicitly approved independently versioned child-creation token. Unauthoritative additions must not mutate source membership or Workshop derivation and must produce the catalogue-defined incident/result.

### H2 — Fingerprint comparison is undefined after omission carry-forward

AD-4 now correctly says omitted accepted components carry forward while independent newer components may apply. It also says equal vector plus different fingerprint is quarantined. The spine does not say whether fingerprinting occurs:

1. over the raw incoming graph before carry-forward;
2. over the merged effective graph after accepted omissions are restored; or
3. per component/relationship scope.

For an equal-version refetch that omits an accepted component without a tombstone, the raw incoming fingerprint necessarily differs from the accepted complete-graph fingerprint if that component is included. Option 1 therefore quarantines the graph, contradicting the stated carry-forward behavior; option 2 can produce a no-op plus incident; option 3 may allow unrelated newer components to apply. All remain plausible under AD-4/AD-13/AD-16.

The repository-owned comparator contract must define the exact fingerprint evaluation phase and domain. The safe contract is to compare canonical merged effective state for carried components while separately recording omission observations/incidents, with fixture branches for equal-vector omission, omission plus an independent newer component, and later omission of a previously accepted tombstone.

### H3 — Correction uniqueness is scoped to request metadata instead of unambiguously to the predecessor

AD-14 says the correction RPC locks the false predecessor and creates “at most one immutable successor edge per correction epoch/idempotency key,” while concurrent losers return the existing successor. That wording does not establish one enforceable successor for the predecessor:

- a uniqueness constraint on `(predecessor, correction_epoch, idempotency_key)` permits multiple successors when two legitimate requests use different keys;
- a later correction epoch can create another successor from the same false predecessor; and
- the Cardinality convention still does not name the correction edge/current-authority constraint.

The locking sentence implies a stronger rule, but schema and RPC stories can implement the weaker compound-key interpretation literally.

Bind one immutable successor edge per false predecessor, independent of request idempotency metadata. The idempotency key should deduplicate request replay, not scope successor cardinality. A later correction must target the current successor, not branch again from the original predecessor. Require a database uniqueness/current-authority constraint and a multi-session fixture using different idempotency keys.

## Verified Closure of Prior High Findings

- **Provisional identity/cardinality:** closed. AD-5 makes assignment references nullable observations, preserves remap history, and the ERD now models optional physical-bike identity plus separate assignment observations.
- **Multi-quantity overassignment and duplicate physical fulfillment:** closed. AD-5 quarantines over-count and graph-wide duplicate fulfillment, creates one blocking identity incident, and derives no conflicting memberships/tasks.
- **Generic-absence state authority:** closed apart from H2's fingerprint ordering. AD-4 explicitly carries accepted state/version forward, forbids closure/regression, opens or refreshes an incident, and permits independent newer components to converge.
- **Correction execution privilege:** closed. AD-14 specifies an admin-only exposed RPC, a separate internal capability, predecessor locking, and explicit denial to `anon`, mechanics, managers, `service_role`, and the integration coordinator.

## Gate

Do not decompose comparator admission/fingerprint stories or correction-successor schema/RPC stories until H1–H3 are bound. No other Critical/High PostgreSQL or data-integrity architecture gap was found in this recheck.
