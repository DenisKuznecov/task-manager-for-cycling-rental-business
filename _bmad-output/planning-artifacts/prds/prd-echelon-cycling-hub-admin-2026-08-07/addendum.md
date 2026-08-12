# Workshop Tasks PRD Addendum

This addendum preserves technical-discovery assumptions, decision rationale, and alternatives that would distract from the capability-focused PRD.

## Source Material

- Primary source: `_bmad-output/brainstorming/brainstorm-per-bike-workshop-tasks-2026-08-05/.memlog.md`
- Full source extract: `discovery-source-workshop.md`
- Canonical PRD-session decisions: `.memlog.md`
- Architecture contract: `_bmad-output/planning-artifacts/architecture/architecture-echelon-cycling-hub-admin-2026-08-10/ARCHITECTURE-SPINE.md`
- Activation-blocker research and ready amendments: `_bmad-output/planning-artifacts/research/technical-workshop-architecture-open-activation-blockers-research-2026-08-12.md`

## Integration Assumptions Requiring Technical Discovery

### Booqable synchronization

- Booqable order-update notifications only identify which order changed; current order, bike, line-item, and customer data must be refreshed and treated as authoritative.
- Draft/new/concept orders are believed to be filtered before workshop work becomes actionable.
- Duplicate and out-of-order updates must converge safely under the product reconciliation rule in FR-47.
- Selective reopening depends on comparing the last accepted workshop configuration with refreshed current Booqable data.
- Picked-up/active rental must be distinguishable from reserved and returned; the exact Booqable field/status remains a discovery item.
- Generic absence from a Booqable response is non-closing in v1, including absence from a transport-complete relationship. Bike removal requires a validated explicit archive/tombstone or another separately fixture-proven explicit removed state returned through the canonical refresh path; absence may update observation metadata or an Integration Incident but must not suspend or terminate workshop history.

### Setup Category mapping

The accepted first-release Setup Categories are:

1. Pedals
2. Saddle
3. Wheelset
4. Power meter
5. Computer mount

Category-level selective invalidation may activate for a mapping version only when every active Setup Category has a Booqable source field or related resource identified by a stable, account-approved identifier and covered by redacted fixtures for null, unknown, changed, and removed values. Display labels are not mapping keys.

Until that complete mapping version is approved, or if any relevant change cannot be mapped safely, the system creates or advances the built-in broad `review_updated_configuration` requirement instead of guessing a target category. Missing stable mapping blocks targeted invalidation, not all Workshop Task execution.

### Multi-quantity physical-bike identity

A quantity-one bike line may use one provisional `single` discriminator and create a Bike Task in Waiting for Bike ID until its StockItem is known. Once assigned, Booqable's opaque StockItem external ID is the stable physical identity; the human-readable `stock_identifier` remains display and workshop-confirmation data. Multi-quantity lines have a stricter boundary:

- create a Bike Task only for each exact distinct StockItem assignment;
- never manufacture per-unit identity from planned quantity, array position, title, StockItemPlanning position, or a generated ordinal;
- when planned quantity exceeds exact assignments, create or update one deduplicated Integration Incident containing expected, identified, and unknown counts;
- create missing Bike Tasks only when later exact StockItem assignments appear, without recreating existing tasks; and
- resolve the Integration Incident only when exact assignments cover expected quantity or authoritative explicit source evidence decreases planned quantity.

This is a deliberate fail-closed re-scope. Booqable can report fewer StockItem assignments than planned quantity and does not expose a verified source-backed identity for each unspecified unit.

### Bundled and flat orders

- Bundled orders are expected to expose a stable parent relationship between accessories and a bike.
- Flat orders do not provide a reliable automatic association. Managers therefore describe per-bike accessories in that bike's `extra_information`.
- The system must not infer flat-order associations.
- If bundled parent linkage is unstable, bike-specific accessory display must be re-scoped.

### Provisional bike identity

Reserved quantity-one lines commonly arrive before an exact StockItem assignment or before a manager enters the human-readable `stock_identifier` in Booqable. The first-release product rule is:

- create the Bike Task immediately;
- keep it visible as Waiting for Bike ID;
- keep it unclaimable until both the exact StockItem assignment and human-readable identifier arrive;
- attach the stable StockItem external ID and display `stock_identifier` to the same task when Booqable provides them.

This overrides an earlier brainstorming exclusion that omitted missing-identifier work from the product. Pilot may later prefer claim-before-ID.

### Task stage representation

The user-visible lifecycle is defined in the PRD. Whether the implementation stores stage explicitly, derives it from unresolved required work, or combines both remains an architecture decision. An earlier proposal to always derive the stage from the earliest unresolved Item was explicitly retracted and must not be treated as a product decision.

### Assignment after source suspension

An authoritative current cancellation or explicit validated bike removal always clears active assignment atomically. Valid same-bike reactivation preserves the task's safe prior stage and evidence, reconciles current Booqable intent, and returns the task unassigned for an ordinary claim. Cancellation is a reversible source-availability suspension while authoritative; it is not the irreversible Replaced outcome.

The first release has no presence lease, heartbeat, or other enforceable proof that a mechanic is continuously working. An open screen, session, `In Prep` stage, or recent save must not retain assignment after cancellation or removal. A future presence lease would be a separately approved product and infrastructure capability.

## Accepted Model Rationale

### Living Bike Task

A reserved order creates workshop work immediately. The same Bike Task absorbs relevant Booqable changes while preserving completed history. This avoids a manager-controlled "release to workshop" gate for which no real operational readiness moment exists.

### Always-visible admin-authored Items

Admins own checklist language. Items may link to a bounded Setup Category for grouping, current-value context, and selective invalidation, but links do not control runtime visibility.

This replaced generated accessory checklist Items because generated wording and mappings could not reliably represent real workshop work.

Template activation intentionally does not require linked-Item coverage for every Setup Category. Administrators own coverage quality. A blocking coverage rule was rejected because incomplete configuration should remain visible as an administrative responsibility rather than becoming a new system gate.

### Normal flow for reopened work

Changed work reuses Needs Prep and applicable Re-check on the same Bike Task. There is no separate revalidation task, status, queue, or manager ping. This preserves one mental model for mechanics and one attributable history for the bike within the rental.

### Independent selective verification

M2 makes a fresh attestation on configured Items rather than approving M1's response. This supports the quality goal: a second mechanic checks selected aspects independently and can correct the bike after speaking directly with M1.

### Physical-state authority

Booqable owns rental intent and membership. Workshop Tasks owns derived workshop state and attribution. Mechanics remain the authority on the physical bike's actual condition. Checklist outcomes are attributable attestations; they are not independent sensor evidence of bike condition.

### Durable return changes

Return-relevant physical changes are recorded as Structured Modifications. Shared Notes remain supplementary free text. This avoids relying on a mutable latest-value Notes field as the complete return-change ledger while still rejecting a full Notes revision system.

### Attention independent of Done

Needs Attention must not block mechanical completion. Open flags remain visible in a first-release Manager Attention List. This keeps the mechanic flow unblocked while preventing orphaned exceptions.

## Rejected or Deferred Alternatives

- **Generated accessory checklist Items:** Retired in favor of always-visible admin-authored Items linked to Setup Categories.
- **Explicit release-to-workshop gate:** Rejected because there is no distinct operational readiness moment after reservation.
- **Separate changed/revalidation workflow:** Rejected; reopened work uses the normal flow.
- **Automatic mechanic assignment:** Rejected because the system cannot know real workshop workload and availability.
- **Manager urgent ping:** Removed; start-date queue priority remains the normal coordination mechanism.
- **Admin completion without checking:** Rejected because it would undermine independent verification and audit trust.
- **Separate Prep and Re-check templates:** Superseded by per-Item M1/M2 applicability within one Prep template.
- **Single overloaded checked outcome:** Superseded by explicit Done and N/A.
- **M2 second-value entry:** Superseded by M2 pass attestation against M1's target value.
- **Timestamped Notes entries / Notes revision history:** Rejected; durable physical changes use Structured Modifications instead.
- **Silent omission of bikes without stock_identifier:** Overridden; provisional Waiting for Bike ID tasks are required.
- **Claim before bike ID:** Deferred as a possible post-pilot change; first release keeps provisional tasks unclaimable.
- **Provisional tasks for ambiguous multi-quantity units:** Rejected because no source-backed per-unit identity exists; unknown quantity is represented by a deduplicated Integration Incident.
- **Retain assignment when the same mechanic appears active after cancellation/removal:** Rejected for v1 because task state and open sessions are not enforceable presence proof.
- **Label-based Setup Category targeting:** Rejected; targeted invalidation requires stable approved identifiers and fixture-backed normalization, otherwise broad configuration review applies.
- **Attention blocking Done:** Rejected; attention remains orthogonal to completion.
- **Resuming a Replaced task after re-add:** Rejected; Replaced is terminal and re-add creates a new task.
- **Full cross-rental bike identity and usage history:** Deferred as a separate future product capability.
- **Offline resilience after session loss:** Excluded from the first release; confirmed-save retry while online remains required.
- **Bike Fit cross-reference:** Parked for a later product decision.

## Loading and Pending Feedback (Implementation Mapping)

NFR-5 is a product requirement for continuous feedback during navigation and mutations, not an API prescription. In this Next.js App Router admin hub, that typically maps to route-level page loaders (e.g. `loading.tsx`) plus pending UI around server-action mutations used for claim, Item save, handoff, and completion. Exact skeleton/spinner/disabled-control patterns remain UX and implementation choices; the acceptance bar stays in the PRD: no blank unexplained waits, obvious in-flight actions, and no double submission while pending.

## Deferred Non-Blockers

These review findings were intentionally not expanded into first-release requirements. Owner: product/PM. Revisit after pilot or during UX design.

| Topic | Revisit when |
|---|---|
| Phase-aware queue priority beyond rental start date | Mechanics report Prep/Re-check/Return collisions in Available Now |
| Mechanic self-release / end-of-shift transfer | Claimed work regularly blocks the next bike without a manager |
| Written reasons for reset, force-close, override, and reassignment | Audit consumers need rationale beyond actor/time |
| Exact tablet density acceptance thresholds | UX prototypes exist and pilot observation begins |
| Optional M2-enabled Item completion edge cases | Checklist authoring reveals optional Re-check Items in practice |

## UX Topics Intentionally Left Open

- Previous `extra_information` must be available on demand after a change, but the exact progressive-disclosure pattern is not prescribed.
- Setup Categories with an initial value of `No` will remain visible and support N/A in the first release. This is a trial behavior to evaluate with mechanics.
- Bundle-linked accessories and `extra_information` must appear together with clear source labels, but final visual hierarchy belongs to UX.
- Waiting for Bike ID presentation and eventual claimability remain pilot-sensitive.

## Current Landscape Notes

Current rental, workshop, and fleet products commonly separate asset availability from work-order progress, use reusable per-asset procedures, expose blocker reasons separately from lifecycle stages, and retain attributable service history. Relevant comparables reviewed during discovery include:

- [Bike.rent Manager](https://bikerentalmanager.com/maintenance-repair/)
- [Valet](https://explorevalet.com/bike-fleet-maintenance)
- [Booqable downtime](https://help.booqable.com/en/articles/12505664-how-to-schedule-downtime-for-your-products)
- [Hubtiger](https://hubtiger.com/bike-shop-management-for-busy-mechanics/)
- [Fleetio work orders](https://help.fleetio.com/maintenance/work-order-overview)

The strongest recurring warning is not to conflate asset availability, workshop progress, attention/blocker state, and completion. The PRD therefore keeps Needs Attention orthogonal to the Bike Task lifecycle and leaves the Booqable order lifecycle authoritative.
