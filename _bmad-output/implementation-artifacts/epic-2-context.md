# Epic 2 Context: Current-order refresh on signal and claim

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

The shop works from current Booqable authority, not from a notification body or stale local source. Stories 2.1–2.10 already shipped a frozen canonical projection; the remaining work wires webhook signals and mechanic claims through one fetch-and-apply path so later Bike Task work never treats a payload as truth and never claims on stale context.

## Stories

- Story 2.1: Contain existing integration security risks
- Story 2.2: Upgrade to a supported application runtime
- Story 2.3: Pin the node and database toolchain
- Story 2.4: Define versioned source envelopes and result semantics
- Story 2.5: Expand the canonical Booqable projection
- Story 2.6: Preserve brownfield projection consumers
- Story 2.9: Apply canonical source state atomically
- Story 2.10: Seed and validate workshop source data
- Story 2.11: Wire authoritative source refresh to the webhook and task claim

## Requirements & Constraints

- A Booqable notification identifies which order changed. It is never current-order truth. Webhook handling and mechanic claim both refetch current authority and apply it before any Workshop mutation.
- Draft, new, and concept orders stay filtered; they create no workshop work.
- Duplicate, delayed, or out-of-order signals must apply idempotently and must not create a second Bike Task for the same rental plus StockItem.
- A failed fetch, normalize, or apply must not write a partial Workshop task mutation. The webhook logs with a contextual prefix and returns a retryable failure. A claim that cannot refresh returns a failed result and does not claim. A source transition during refresh is returned explicitly and is never silently rebased or redirected.
- Preview ingestion stays denied even if preview deployments inherit credentials.
- Before activating live wiring, record the actual Vercel execution model and bind a total route deadline. Fetch, bounded retry, normalize, and apply must fail fast inside that deadline.
- This release does not issue freshness proofs, cut over or revoke legacy writers, or add a retry worker, queue, sweep, new repair API, or rollout/activation control plane. Adoption is an operating practice, not a product feature.
- Existing bookings, order, customer, partner, and reporting consumers stay compatible. Task derivation from assigned stock IDs belongs to later epics; this epic only supplies the live source feed they will consume.

## Technical Decisions

- Next.js owns presentation and authenticated adapters; PostgreSQL owns atomic apply and durable attribution. Only the Booqable module fetches, validates, normalizes, and applies. Workshop code consumes local task/context contracts and never parses webhook or API shapes.
- After live wiring, the shipped canonical projection and `apply_canonical_order_graph` are the sole Workshop source boundary. Until that story is verified, the production webhook's documented legacy path remains `sync.ts`.
- Webhook and claim share one fetch-and-apply path: identify the order, refetch through the canonical adapter, apply. Bounded synchronous transport retries and an explicit user resubmission of the original claim are allowed inside the route budget. No durable queue, worker, sweep, hidden retry loop, or new repair API.
- The live-wiring story invokes the frozen contracts, tag vocabulary, nested fetch profile, and apply result contract. It does not extend `sync.ts`, change canonical source schemas, add code generation, or introduce a new adapter protocol.
- `sync.ts` and named brownfield readers remain unchanged. The sandbox `sync-orders` route stays a documented exception that refetches through `sync.ts` and never directly repairs source or task rows.
- Canonical apply is the one service-only exception to staff `withAuth` mutations: it invokes internal task derivation in the same transaction. `booqable_*` tables stay service-role-only.
- Workshop is online-only. Migrations are idempotent, proven locally, and reach staging/production only through CI.
- Bike category admission remains the controlled ProductGroup tag set (`workshop-*-bike`, with matching bundle tags). Tags classify category; they never replace exact StockItem identity.

## UX & Interaction Patterns

- Claims show pending in place, block double submit, and report success only from the confirmed server result. A failed refresh surfaces as a failed claim, not as ownership.
- First-writer-wins: a losing claimant sees the current owner and returns to a refreshed queue; no optimistic ownership remains.
- If the refresh reports that the displayed task transitioned, became unavailable, or is unauthorized, the UI must show that explicit result rather than claiming or silently switching to another task.

## Cross-Story Dependencies

- Stories 2.1–2.6, 2.9, and 2.10 are frozen and done. Do not rebuild them. Old Stories 2.11–2.14 (freshness proofs, writer cutover, writer revocation, rollout control plane) are retired.
- Story 2.11 is the remaining live-wiring story and must land before Epic 3 task creation and Epic 5 mechanic claim flows.
- Epic 3 and later consume the applied canonical graph; they do not add a second source writer or parse webhook payloads.
- Delivery order: Epic 1 (done) → Epic 2 → Epic 3 → Epic 5 → Epic 4 → Epic 8.
