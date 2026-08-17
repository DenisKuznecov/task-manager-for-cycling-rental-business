# Epic 2 Context: Secure Canonical Booqable Operations

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Give application operators one contained, versioned canonical Booqable ingestion path that preserves existing consumers, atomically converges successfully processed duplicate, delayed, or out-of-order updates, and cannot be bypassed by legacy callers. Webhook and just-in-time (JIT) callers synchronously refetch Booqable authority; v1 does not recover failed or missed signals automatically. This epic establishes the trusted integration foundation on which later Workshop membership and task derivation depend.

## Stories

- Story 2.1: Contain Existing Integration Security Risks
- Story 2.2: Upgrade to a Supported Application Runtime
- Story 2.3: Pin the Node and Database Toolchain
- Story 2.4: Define Versioned Source Envelopes and Result Semantics
- Story 2.5: Expand the Canonical Booqable Projection
- Story 2.6: Preserve Brownfield Projection Consumers
- Story 2.9: Apply Canonical Source State Atomically
- Story 2.10: Seed and Validate Workshop Source Data
- Story 2.11: Issue Exact JIT Freshness Proofs
- Story 2.12: Cut Over Every Booqable Writer
- Story 2.13: Revoke Legacy Source Writers
- Story 2.14: Establish the Workshop Rollout Control Plane

## Requirements & Constraints

- Webhook notifications identify work to synchronously refetch; their payload is never replay truth. Booqable’s latest validated current state is authoritative. Successfully processed duplicate, delayed, and out-of-order signals must converge, accepted semantic state must no-op, and stale state must not regress the projection. A failed or missed webhook has no automatic v1 recovery guarantee.
- Generic absence never closes source state, memberships, or future tasks. Closure requires explicit, fixture-proven archive, tombstone, or removed evidence from the canonical refresh path; omission may create an incident but must preserve accepted history.
- Bike category admission uses exactly one controlled ProductGroup tag: `workshop-road-bike`, `workshop-e-road-bike`, `workshop-e-city-bike`, `workshop-gravel-bike`, `workshop-mtb-bike`, or `workshop-e-mtb-bike`. Bundles use and must agree with the corresponding `workshop-*-bike-bundle` tag. Persist complete admitted Product, ProductGroup, and Bundle tag lists as read-only source facts.
- Untagged entities create no Workshop work. Unknown, multiple, conflicting, or bundle-disagreeing Workshop tags fail closed with a deduplicated Integration Incident. Labels and titles never classify, and tags never replace exact StockItem identity.
- Broad `review_updated_configuration` remains the initial configuration-change mode. Accessory tags are retained but uninterpreted until Epic 6 proves complete stable mappings; this epic must not introduce a second classification authority or approval workflow.
- Authentication containment must prevent secret or payload-PII disclosure, refetch only after webhook authentication, remove or least-privilege the sandbox service-role path, propagate private no-store session-refresh headers, and keep Booqable and service-role credentials out of preview/branch deployments.
- Move the application onto a supported Next.js compatibility baseline; pin Node 24.x and one locally proven Supabase CLI consistently in source and CI. Own required PostgreSQL extensions through an idempotent migration manifest. Database changes are proven locally and deployed remotely only through CI.
- Preserve shipped bookings, order, customer, partner, and reporting behavior throughout projection expansion and writer cutover. Task derivation remains outside this epic.
- Before pilot activation, one operator-triggered pre-pilot validation performs the approved one-time initial Booqable import/materialization. During that initial materialization only, skip an authoritative order whose status is exactly `canceled`, `stopped`, or `archived` only when no Workshop task already exists. Existing Workshop tasks continue under the normal live lifecycle and Return Check rules; this rule adds no other status interpretation.

## Technical Decisions

- Keep a transactional modular monolith: Next.js owns authenticated adapters, while PostgreSQL atomically applies canonical state. Only the Booqable integration boundary fetches, validates, and normalizes API v4; Workshop code consumes local contracts and never parses Booqable responses.
- Expand the shared projection additively rather than creating a Workshop copy or raw-payload mirror. Admit only the contracted bike/rental graph, immutable membership roots, source-version state, and incidents. Retain referenced history with restrictive deletes.
- One repository-owned contract package defines `order_graph` and `resource_batch` envelopes, producer/profile/schema versions, complete or partial scopes, `known | unknown | removed` values, source vectors, semantic fingerprints, and the fixed results `applied | no_op | derivation_disabled | quarantined | rejected_retryable | rejected_terminal`. TypeScript and PostgreSQL representations must remain drift-checked.
- Merge accepted carried-forward state before comparing vectors and fingerprints. Equal vector plus equal fingerprint is `no_op`; conflicting, older, incomparable, or unauthoritative state quarantines without mutation. Source vectors and exact JIT proofs establish freshness.
- The coordinator is the sole canonical-source writer. It applies each accepted graph atomically and preserves derivation debt when rollout disables domain work. No webhook, service-role caller, or operator may directly patch authoritative source tables.
- Webhook and JIT callers share the canonical adapter and ingestion coordinator. They synchronously refetch authority, submit versioned envelopes, and record deduplicated Integration Incidents on failure without canonical or domain mutation. Do not introduce a durable inbox, receipts, intents, attempts, leases, retries, worker, Cron dispatcher, reconciliation sweep/checkpoint/watermark, or new manual recovery API. The existing secret-protected, preview-denied `GET /api/sandbox/booqable/sync-orders` is a temporary legacy exception: it refetches Booqable authority through the existing sync path and does not directly edit source or task tables. It is not a new per-order/manual recovery API, retry queue, worker, Cron job, or reconciliation system; retire or further contain it only through a future explicitly approved replacement-or-removal decision.
- Consequence-bearing callers require a current database-issued JIT freshness proof from that exact call, bound to root identity, JIT demand generation, contract versions, source vector/fingerprint, derivation marker, rollout epoch, and expiry. A superseded or stale proof rejects without mutation; ordinary Item, Notes, attention, modification, and template saves remain local-only.
- A migration-owned field-authority manifest gives every projected field one origin, writer, backfill rule, and disposition. Local and Booqable customers remain separate; partner attribution is recomputed from accepted source facts within the coordinator transaction.
- Cut over every registered caller before revoking legacy DML. API roles, including service role, retain no direct authoritative-source write path after contraction.
- Rollout is database-owned and attributable: `disabled | shadow | pilot | enabled | emergency_disabled`. Deployment flags cannot activate it. Disabled and shadow continue source observation; shadow permits only pre-pilot validation/proof data, and emergency disable stops JIT, derivation, reads, context capabilities, enrollment, and mutations while retaining webhook-triggered authoritative refetch and incident recording.
- Local proof must cover source tags, envelopes, comparator and omission branches, transaction rollback, privileges, overlapping ingestion, exact JIT freshness, and incidents before staged disabled/shadow proof, the one-time pre-pilot validation, and explicit pilot approval.

## UX & Interaction Patterns

- Do not add a Workshop classification or tag-approval screen. Bike category is read-only Booqable context; untagged or conflicting source data surfaces through Integration Incident handling. Accessory-tag interpretation has no UI before Epic 6.

## Cross-Story Dependencies

- Sequence work as containment and toolchain → versioned contracts → additive projection and brownfield proof → atomic synchronous application → source-data validation → JIT proofs → caller cutover → legacy-write revocation → rollout control.
- Epic 3 owns exact membership and Bike Task derivation and may depend only on this coordinator’s accepted contracts. Epic 6 owns accessory-tag interpretation and targeted configuration mapping.
- Existing bookings, order detail, customer, partner, reporting, and local-customer consumers must remain compatible through expand, switch, and contract.
