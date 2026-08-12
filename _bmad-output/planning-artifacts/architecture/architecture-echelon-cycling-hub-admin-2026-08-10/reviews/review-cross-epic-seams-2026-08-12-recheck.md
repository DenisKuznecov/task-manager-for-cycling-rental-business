# Cross-Epic Seam Recheck — Workshop Tasks Architecture Spine

## Verdict

**PASS — no remaining critical or high cross-epic seam findings.**

The updated spine now prevents independently built adapter, ingestion, Workshop, rollout, and operational epics from choosing incompatible high-impact contracts in the four rechecked areas. The fixes are architecture-level gates and invariants rather than implementation suggestions, so affected epics cannot lawfully bypass them while claiming conformance.

**Remaining finding count:** 0 critical · 0 high

## Critical Findings

None.

## High Findings

None.

## Recheck of Prior High Findings

### 1. JIT proof handoff — closed

AD-15 gives each consequential command a monotonic `jit_demand_generation` and requires the authorizing fetch to begin after that demand. Lease, receipt, and demand generations fence the complete source-plus-derivation transaction.

AD-16 now defines one database-issued, versioned `freshness_proof` carrying order/root identity, attempt and demand generation, producer/profile/schema, source vector/fingerprint, materialized derivation token, rollout/enrollment epoch, and expiry. The mutation RPC locks current order/task state, requires an exact-current proof plus the displayed workflow revision, and returns typed stale state instead of silently rebasing. This closes the adapter → ingestion → Workshop action time-of-check/time-of-use seam.

### 2. Pilot database predicate — closed

AD-19 establishes one environment-scoped database rollout epoch with explicit `disabled`, `shadow`, `pilot`, `enabled`, and `emergency_disabled` states. The same predicate is mandatory in derivation, read models, task-context capabilities, and every mutation; UI guards are only a reflection of database authority.

The pilot cohort is immutable and attributable per epoch, replacement and correction successors inherit enrollment, out-of-cohort access is denied and fixture-tested, and only the admin activation RPC can transition or resume rollout state. This prevents route, read, action, and derivation epics from implementing different pilot boundaries.

### 3. Rollback and runbook separation — closed

AD-19 separates activation disable, worker/producer containment, application-version rollback, and operational return-to-paper into distinct approved runbooks. It binds accepted producer/schema windows, switch ordering, paper-work reconciliation or quarantine, evidence retention, and resume authority.

`emergency_disabled` has a database-defined effect across derivation, enrollment, reads, context capabilities, JIT, and mutations while preserving source ingestion and admin repair. The environment-proof manifest binds release, migration, contract, privilege, configuration, epoch/cohort, test, incident, exception, and approval state and is invalidated by changes. This closes the prior ambiguity between feature disable, deploy rollback, source repair, and paper fallback.

### 4. Paper-retirement evidence — closed

AD-19 makes paper retirement a separate approval after pilot and general activation, requires its own approved evidence contract, and imposes automatic no-go conditions for missing or duplicate tasks and uncertain save/handoff state. The deployment diagram now models paper retirement as a separate stage.

Because retirement cannot proceed until the evidence contract is approved and bound to the durable environment/cohort proof, rollout epics may not invent independent thresholds or treat general activation as permission to remove paper.

## Final Gate

No remaining critical or high seam was found that lets two conforming epics disagree about JIT authorization, pilot scope, rollback authority, fallback reconciliation, or paper-retirement permission. Any still-open implementation detail is contained behind a required versioned contract, manifest, fixture package, or approval gate before the affected rollout transition.
