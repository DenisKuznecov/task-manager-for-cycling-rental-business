# Epic 2 Context: Secure and Recoverable Canonical Booqable Operations

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Give operators one contained, versioned, recoverable Booqable source pipeline that cannot be bypassed, preserves existing bookings/order/partner consumers, and converges duplicate or out-of-order updates onto the same accepted source state. This foundation must land before Workshop task derivation so later epics consume a single writer and envelope rather than competing projections.

## Stories

- Story 2.1: Contain Existing Integration Security Risks
- Story 2.2: Upgrade to a Supported Application Runtime
- Story 2.3: Pin the Node and Database Toolchain
- Story 2.4: Define Versioned Source Envelopes and Result Semantics
- Story 2.5: Expand the Canonical Booqable Projection
- Story 2.6: Preserve Brownfield Projection Consumers
- Story 2.7: Persist and Recover Authoritative Refresh Work
- Story 2.8: Run Bounded Workers and Reconciliation Sweeps
- Story 2.9: Apply Canonical Source State Atomically
- Story 2.10: Seed and Validate Workshop Source Data
- Story 2.11: Issue Exact JIT Freshness Proofs
- Story 2.12: Cut Over Every Booqable Writer and Recovery Caller
- Story 2.13: Revoke Legacy Source Writers
- Story 2.14: Establish the Workshop Rollout Control Plane

## Requirements & Constraints

- Notifications only identify which order to refetch. Webhook bodies are never source truth; Booqable’s latest retrievable current order state is authoritative. Duplicate or out-of-order delivery must converge; already-accepted semantics are no-ops; stale updates cannot regress accepted state.
- Generic absence is non-closing, even when a relationship is transport-complete. Closure requires a fixture-proven explicit archive, tombstone, or removed state on the canonical refetch path. Absence may record an incident; it must not delete history.
- Classify bikes from exactly one controlled ProductGroup `tag_list` value: `workshop-road-bike`, `workshop-e-road-bike`, `workshop-e-city-bike`, `workshop-gravel-bike`, `workshop-mtb-bike`, or `workshop-e-mtb-bike`. Bundles use the corresponding `workshop-*-bike-bundle` tag and must agree with the contained bike ProductGroup. Persist admitted Product/ProductGroup/Bundle tag lists. Untagged entities create no work; unknown, multiple, conflicting, or bundle-disagreeing Workshop tags fail closed. Labels and titles never classify; tags never replace exact StockItem identity.
- Setup Categories are Pedals, Saddle, Wheelset, Power meter, and Computer mount. Broad configuration review is the initial mode. Accessory tags remain uninterpreted until Epic 6 proves stable source identifiers and complete null/unknown/changed/removed fixtures for every Setup Category.
- Containment: one environment-managed static webhook secret, compared without disclosure; refetch only after successful auth; remove or strongly authenticate the sandbox service-role path; copy SSR cache-prevention headers (`Cache-Control: private, no-store`); preview/branch deploys get no Booqable, service-role, or Cron credentials. Logs must not contain secrets or payload PII.
- Land on a currently supported Next.js LTS. Pin Node 24.x and one stable Supabase CLI in source and CI. Required PostgreSQL extensions live in a migration-owned manifest. Remote DDL is CI-only.
- Task derivation is out of scope. This epic enables later convergence without duplicate or guessed source identity.

## Technical Decisions

- Next.js owns adapters; PostgreSQL owns atomic application. The Booqable module alone fetches, validates (Zod, fail closed), and normalizes API v4. Workshop never parses payloads or calls Booqable. The webhook body is a signal only.
- Evolve existing `customers`, `orders`, and `order_items` additively. Admit only tagged ProductGroups/Products, matching tagged Bundles when required, Plannings, StockItemPlannings, StockItems, immutable membership roots, source-version state, inbox, reconciliation checkpoints, and incidents. Persist complete Product/ProductGroup/Bundle tag lists as source facts. No second Workshop projection and no raw-payload mirror. Referenced rows archive or close; they do not cascade-delete.
- One repository-owned envelope schema (editable source, generated TypeScript/PostgreSQL, CI drift check) before adapter/database stories. Units: `order_graph` (only later derivation input) and `resource_batch` (catalog/inventory). Carry producer/profile/schema version, complete/partial scope, `known | unknown | removed`, source-version map, and fingerprints. Results: `applied | no_op | derivation_disabled | quarantined | rejected_retryable | rejected_terminal`.
- Compare source vectors and semantic fingerprints over merged effective state after carry-forward; omission incidents stay outside the fingerprint. Equal vector and fingerprint is `no_op`; conflicts quarantine with no mutation. Lease/attempt generation fences the transaction but does not decide freshness. Nested-order fetch is mandatory; standalone inventory reads are unverified until contracted.
- The coordinator is the sole canonical-source writer. In disabled rollout, source applies atomically without derivation: observed source advances, debt is retained, and the result is `derivation_disabled`. No direct source or task table patches.
- Persist webhook receipts; correlate them to one leased intent. Intents use claimable/leased/succeeded/exhausted/quarantined/rejected-terminal with compare-and-set leases. Workers refetch authority; they never replay stored payloads. A versioned result and incident catalogue owns retry, backoff, and operator retry; unknown codes fail closed.
- One Cron dispatcher calls a bounded worker with `Authorization: Bearer ${CRON_SECRET}`. Size the budget from the measured deployed duration, not a dated platform maximum. Nightly reconciliation uses durable checkpoints, two complete sweeps, and never deletes on absence.
- JIT success or no-op returns a database-signed freshness proof bound to root, generations, schema, source vector/fingerprint, derivation token or explicit no-derivation marker, rollout epoch, and expiry. Stale attempts reject without mutation.
- An authority manifest classifies each field as Booqable source, app-owned, app-derived, or compatibility alias, with one writer. Local and Booqable customers stay distinct. Partner attribution is app-derived and recomputes in the coordinator transaction. Cut over a versioned caller register, then revoke legacy DML including service-role source writes. Path names are not access control.
- Database-owned rollout epoch: `disabled | shadow | pilot | enabled | emergency_disabled`. Only an admin activation RPC may transition; deploy flags cannot activate. Disabled/shadow still ingest source. Emergency disable blocks derivation, reads, JIT/proof use, and mutations while keeping ingestion and admin repair.
- Prove locally with source-tag/adapter fixtures, pgTAP for envelope/comparator/privileges, and a multi-session overlapping-ingestion harness.

## UX & Interaction Patterns

- Do not add a Workshop classification or tag-approval screen. Bike category is read-only Booqable context; untagged or conflicting source data surfaces through Integration Incident handling. Accessory-tag interpretation has no UI before Epic 6.

## Cross-Story Dependencies

- Epic 1’s active templates must exist before later derivation; membership and Bike Task creation belong to Epic 3.
- Sequence: containment and toolchain → envelopes and source-tag contract → additive projection and brownfield preservation → durable recovery and workers → atomic apply → source-data seeding/validation → JIT proofs → caller cutover → revoke writers → rollout control plane.
- Later Workshop callers must use this coordinator only. Epic 4 exposes source-backed outcomes; it does not add a second writer. Bookings, order detail, partner views, reporting, and local-customer creation must remain compatible through expand → switch → contract.
