---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - _bmad-output/brainstorming/brainstorm-booqable-data-mirror-2026-08-10/technical-spike-handover.md
workflowType: 'research'
lastStep: 6
research_type: 'technical'
research_topic: 'Booqable selective-warehouse technical spike'
research_goals: 'Verify the workshop-critical source graph and synchronization feasibility; estimate implementation and support cost for one AI-assisted engineer; expose maintenance-creep risks; and reach an evidence-backed go, conditional-go, or no-go decision.'
user_name: 'Den'
date: '2026-08-10'
web_research_enabled: true
source_verification: true
status: 'complete'
---

# Booqable Selective Warehouse: Evidence, Recovery, and Commitment Decision

**Date:** 2026-08-10
**Author:** Den
**Research Type:** technical

---

## Research Overview

This time-boxed spike evaluated whether a bounded, one-way local projection of workshop-critical Booqable data is technically reliable and economically maintainable for a single AI-assisted engineer. It treated the technical spike handover as the scope and decision contract and combined current official documentation, repository inspection, GET-only account evidence, measured API behavior, and an executable local PostgreSQL recovery proof.

The evidence supports a **conditional go** for the minimum safe multi-entity projection—not a broad warehouse platform. Exact physical-bike identity and completed-rental history are viable, representative reconciliation fits the current operating envelope, and durable retry plus bulk reconciliation can replace per-item database repair. The conditions are explicit stable-ID bike classification, a fallback for undocumented standalone inventory endpoints, atomic ingestion, durable failed-event state, checkpointed reconciliation, and just-in-time refresh for consequential workshop actions.

The complete decision, ownership economics, implementation boundary, and smallest justified next step are summarized in **Research Synthesis** at the end of this document. Detailed evidence and source analysis remain in the sequential research sections below.

---

<!-- Content will be appended sequentially through research workflow steps -->

## Technical Research Scope Confirmation

**Research Topic:** Booqable selective-warehouse technical spike
**Research Goals:** Verify the workshop-critical source graph and synchronization feasibility; estimate implementation and support cost for one AI-assisted engineer; expose maintenance-creep risks; and reach an evidence-backed go, conditional-go, or no-go decision.

**Technical Research Scope:**

- Architecture Analysis - selective projection boundaries, authority, freshness, repair, and failure handling
- Implementation Approaches - canonical fetch-after-event, idempotent writes, checkpointed reconciliation, and local proofs
- Technology Stack - the existing Next.js, Supabase/PostgreSQL, Vercel, and Booqable constraints
- Integration Patterns - Booqable APIs, identifiers, relationships, lifecycle behavior, pagination, and webhooks
- Performance Considerations - runtime, rate limits, reconciliation cost, and operational fit
- Ownership Economics - implementation effort, infrastructure cost, support burden, and maintenance-creep risk for one AI-assisted engineer

**Research Methodology:**

- Current web data with rigorous source verification
- Repository and local-runtime evidence
- Multi-source validation for critical technical claims
- Confidence levels and explicit unknowns where evidence is unavailable
- No remote database, webhook-subscription, or source-of-truth mutations

**Scope Confirmed:** 2026-08-10

## Technology Stack Analysis

### Programming Languages

The implementation surface is TypeScript 5.9 on Node.js through Next.js 14 route handlers and server-side modules, with SQL/PostgreSQL 17 for durable projections, constraints, reconciliation state, and server-side data operations. No second application language is justified for the spike: a local TypeScript CLI can reuse the existing Booqable client and projection logic, while SQL is the appropriate place for identity constraints and database-side reporting.

The existing Booqable integration uses unvalidated `Record<string, any>` JSON:API resources. That keeps the current path small, but it is unsuitable as the contract boundary for a larger projection because undocumented shape changes can pass compilation and fail only at runtime. The spike should capture observed payloads and validate only the admitted resource subset.

_Confidence: High for the repository stack; medium for the exact Booqable payload contract until live evidence is collected._

### Development Frameworks and Libraries

Next.js 14.2.3 and `@supabase/supabase-js` 2.102.1 already provide all primitives needed for targeted HTTP fetches and PostgreSQL writes. The current implementation has the correct thin-webhook foundation: a webhook supplies an order ID, `fetchBooqableOrder` fetches canonical Booqable API v4 state, and `syncBooqableOrder` upserts customer, order, and line projections.

The spike does not justify adding an ORM, queue library, or synchronization framework. Each extra abstraction would increase dependency and support cost before Booqable's required graph and lifecycle semantics are proven. Zod 4.4.3 is already available for narrow runtime validation if a prototype needs executable payload contracts.

_Repository evidence: `package.json`; `src/lib/booqable/sync.ts`; `src/app/api/webhooks/booqable/route.ts`._

### Database and Storage Technologies

Supabase PostgreSQL is the appropriate store because the required projection is small, relational, and identity-heavy. Current scale—approximately 350 orders, 250 customers, 63 product definitions, and 13 bundles—is orders of magnitude below the Supabase Free plan's current 500 MB database-size allowance. Storage is therefore not the leading feasibility risk; source completeness, relationship fidelity, retry behavior, and operational ownership are.

The Free plan currently includes unlimited API requests, 500 MB database size, 5 GB egress, and Nano shared compute with 500 MB RAM. Projects can pause after one week of inactivity. Exceeding 500 MB puts a project into read-only mode. A selective projection at the stated scale should remain far below the storage ceiling, but a paused environment can silently interrupt webhook ingestion and must not be mistaken for synchronization design failure.

_Sources: [Supabase pricing](https://supabase.com/pricing); [Supabase database-size behavior](https://supabase.com/docs/guides/platform/database-size)._

### Development Tools and Platforms

The repository has the Supabase CLI local stack configured with PostgreSQL 17, migrations, and seed support. This is sufficient for local schema and reconciliation proofs without touching staging or production. The current project has no automated test runner; introducing one is not required merely to execute the spike. Deterministic fixture-driven scripts and local database assertions can prove the synchronization invariants, while any proposal for permanent automated tests must be separately costed.

The existing sandbox backfill route is evidence that list pagination and reuse of the canonical order synchronizer have already been attempted. It is not yet a durable reconciliation mechanism: it has no checkpoint, no persisted run state, no retry queue, no archive discovery, and no bounded continuation after process termination.

_Repository evidence: `supabase/config.toml`; `src/app/api/sandbox/booqable/sync-orders/route.ts`._

### Cloud Infrastructure and Deployment

Booqable API v4 is the upstream platform. Its public documentation uses JSON:API, supports collection pagination, and returns HTTP 429 for rate limiting. The current code uses `page[size]` and `page[number]` for v4 order lists and retries individual order fetches up to three times on 429 responses.

Vercel's current documentation states that Hobby functions using Fluid Compute have a 300-second default and maximum duration. It also documents a legacy case: projects deployed before April 23, 2025 without Fluid Compute can have a 10-second default and 60-second maximum. This repository has no `vercel.json`, so the deployed project's actual compute mode and configured duration remain unverified. Regardless of whether the effective ceiling is 10, 60, or 300 seconds, a full repair job should not rely on one uncheckpointed HTTP request.

_Sources: [Booqable API v4](https://developers.booqable.com/v4.html); [Vercel function duration](https://vercel.com/docs/functions/configuring-functions/duration); [Vercel limits and legacy behavior](https://vercel.com/docs/limits)._

### Technology Adoption and Fit

The lowest-maintenance direction is evolutionary:

1. Retain canonical fetch-after-signal.
2. Extract the admitted projection logic into reusable, typed resource synchronizers.
3. Add database-enforced source IDs and idempotency.
4. Run bounded, checkpointed reconciliation outside a user-facing request.
5. Admit new Booqable resource types only when the workshop workflow requires them.

The principal technology risk is not obsolescence of TypeScript, Next.js, or PostgreSQL. It is coupling to Booqable's observed-but-not-yet-verified API resource graph. The spike must therefore treat Booqable endpoint and payload verification as the gate before schema expansion.

_Overall confidence: High that the existing stack is sufficient; medium that the current hosting configuration is suitable for long-running reconciliation; low-to-medium on Booqable graph completeness until direct verification._

## Integration Patterns Analysis

### API Design and Verified Source Graph

Booqable API v4 is a JSON:API-style HTTP interface with UUID resource IDs, relationship linkage, sparse fieldsets, nested `include` paths, filters, and page-number pagination. The public documentation establishes a substantially stronger workshop-critical graph than the current integration consumes:

- `orders` relate to `customer`, `lines`, `plannings`, and `stock_item_plannings`.
- `lines` carry stable UUIDs and relate to the booked `item`, `planning`, `bundle_item`, `parent_line`, and nested child lines. `item_id`, `planning_id`, `parent_line_id`, and `bundle_item_id` are explicit fields.
- `plannings` relate an order to a Product or Bundle and expose `stock_item_plannings`. Bundle plannings have nested product plannings.
- `stock_item_plannings` link a physical `stock_item_id` to `planning_id` and `order_id`, with archive and status fields.
- For trackable rental products, every stock item has its own identifier. Barcodes can also belong to `stock_items`.
- `product_groups` own Products; Product is the plannable item. Bundles own BundleItems that point to Products.

The documented order include graph supports `lines.planning.stock_item_plannings.stock_item.barcode`. This is the most promising canonical read for exact bike assignment. The current code fetches only `customer,coupon,lines`; therefore it currently preserves line and item IDs but does not fetch planning or physical stock-item assignment.

The graph also exposes an important truthful-null state: a Planning's `stock_item_plannings` count may be less than its quantity because physical items have not yet been specified. Missing physical identity must therefore remain “unassigned/unknown,” never inferred from a line title.

_Sources: [Booqable API v4—Orders, Lines, Plannings, Products, Product Groups, Bundles](https://developers.booqable.com/v4.html); [JSON:API compound documents](https://jsonapi.org/format/)._

_Confidence: High for documented resource semantics; medium until the project's account payloads are sampled; no historical coverage percentage can be claimed without read-only live data._

### Communication Protocol and Data Format

The target pattern remains synchronous HTTPS for bounded canonical reads, with JSON:API compound documents as the transfer format. JSON:API guarantees type-and-ID linkage within compound documents and prevents duplicate representations of the same type/ID pair in one response. Those guarantees make an adapter keyed by `(source_type, source_id)` practical.

Webhook payloads should remain signals, not source state. This is especially important because the repository's webhook is form-encoded and appears to use v1-shaped field names while canonical reads use API v4. Booqable's v4 documentation itself notes field-name differences between v4 resources and v1 APIs/webhooks. Persisting webhook payload fields directly would couple the database to an older transport shape.

_Sources: [JSON:API 1.1](https://jsonapi.org/format/); [Booqable API v4](https://developers.booqable.com/v4.html)._

### Pagination, Rate Limiting, and Reconciliation

API v4 collection endpoints consistently document `page[number]`, `page[size]`, filters, sorting, and aggregate metadata. HTTP 429 is documented, but the public page does not establish a numeric account rate limit or a `Retry-After` contract. The importer must therefore use bounded exponential backoff with jitter, cap attempts per page/entity, persist a checkpoint after each committed page, and resume without replay damage.

A reconciliation run is not a “full Booqable database sync.” It should enumerate only admitted resources and can be further narrowed:

- Orders: all relevant current orders, plus a deliberate historical scan for the coverage report.
- Catalog: ProductGroups, Products, Bundles, and BundleItems required by workshop classification.
- Physical identity: only trackable bike Products and their StockItems/identifiers.
- Assignments: order Plannings and StockItemPlannings needed to connect bikes to orders.

At the stated scale, the cost driver is the number of per-order canonical detail requests, not database volume. The current route performs one list request per 50 orders plus one detail request per non-ghost order, but it has no persisted checkpoint and treats a failed list page as a successful HTTP response with partial results.

_Source: [Booqable API v4 pagination and response codes](https://developers.booqable.com/v4.html)._

### Event-Driven Integration and Webhook Coverage

The repository's existing pattern correctly converges duplicate or out-of-order order notifications by refetching current state. However:

- Processing occurs inline before the webhook returns.
- There is no durable event receipt before external I/O.
- Failed events exist only in logs.
- The handler assumes Booqable retries HTTP 500, but no authoritative public retry schedule or guarantee was found.
- The public v4 API documentation does not provide a verifiable webhook event matrix.
- Physical StockItem and StockItemPlanning lifecycle events remain undocumented in the public evidence reviewed.

Consequently, webhook completeness cannot be the correctness boundary. A low-maintenance design needs PostgreSQL to act as a small durable inbox:

1. Authenticate and validate the signal.
2. Insert an event identity/status record idempotently.
3. Return promptly.
4. Process the entity through the canonical fetch adapter.
5. Record succeeded/failed state and attempts.
6. Let selective reconciliation repair missed or unsupported event paths.

This is not event sourcing: Booqable remains authoritative, and the event body is not replayed as business truth.

_Confidence: High on the repository gap; low on Booqable delivery guarantees and non-order event coverage because authoritative public documentation was not found._

### System Interoperability and Failure Repair

No API gateway, service mesh, broker, or separate microservice is justified at this scale. Supabase/PostgreSQL can hold projection rows, event state, run checkpoints, and gap reports. A manually dispatched or scheduled worker can claim bounded work and call the same resource adapters used by targeted refresh.

The operational invariant should be:

> For any admitted Booqable resource ID, processing the same current canonical representation any number of times produces the same local projection; reconciliation can discover and correct any state that a webhook path missed.

This invariant directly avoids the unacceptable maintenance mode identified by the owner: manually repairing each item after webhook crashes.

### Integration Security

Booqable API keys inherit the permissions of the user that created them. A read-only or least-privileged integration identity should be used where Booqable permits it. The app's API key must remain server-side.

The current webhook uses a static query-string secret. It also logs the supplied secret on unauthorized attempts, which can leak credentials into logs and should be corrected if this integration proceeds. No public evidence of Booqable HMAC signatures was found, so signature verification must remain an explicit unknown rather than an assumed capability.

The Supabase service-role key is appropriate only inside the trusted webhook/worker boundary, never in user-facing loaders. Projection tables still need explicit ownership and write-path constraints so that the webhook, backfill, and manual retry do not become competing writers.

_Source: [Booqable API-key permissions](https://help.booqable.com/en/articles/4325485-how-to-create-an-api-key)._

### Integration Evidence Gaps

The following required claims are not yet proven:

- Actual account payloads and observed IDs for the nested order → planning → stock-item assignment graph.
- Exact reconstruction coverage across current, completed, and archived orders.
- Whether archived orders can be listed and fetched with all assignment relationships intact.
- Authoritative webhook event coverage and retry behavior.
- Whether the account exposes a practical read path for enumerating all physical StockItems independently of ProductGroup v1 payloads or nested v4 includes.

The shell does not export Booqable credentials globally, but the repository's ignored `.env.local` contains the Booqable slug and API key used by the existing local integration. Live read-only sampling can therefore proceed through a local script that loads this environment without exposing secret values. Public documentation supports the graph hypothesis, but account-specific sampling remains required before a go recommendation.

### Additional Repository Risks

The current sandbox backfill route has no authentication or explicit non-production environment guard. Its path name alone does not prevent deployment or invocation, and it uses the service-role key. The spike must not call it remotely; local proofs should use a CLI or direct library entry point instead.

The current order/customer/line synchronizer is idempotent by Booqable ID and reuses one write path for webhook and backfill, which is a strong starting point. However, writes occur in several independent Supabase requests rather than one transaction. A failure after the order upsert but before line cleanup can leave a temporarily mixed projection until a later successful sync repairs it.

## Architectural Patterns and Design

### System Architecture Patterns

**Evidence:** The current application already contains the required integration and persistence boundaries: Next.js performs bounded external HTTP work, `src/lib/booqable` owns canonical source fetching and translation, and Supabase PostgreSQL stores the shared customer, order, and line projection. Current volume is small, and no measured independent scaling, deployment, or fault-isolation requirement was found that would require a separate synchronization service.

**Inference:** A modular-monolith implementation can satisfy the spike if the Booqable adapter remains isolated and PostgreSQL owns atomic projection changes, inbox state, and reconciliation checkpoints.

**Recommendation:** Evolve the existing application rather than introducing a microservice, broker, ORM, or permanent raw-payload mirror. This is an ownership-cost recommendation, not a claim that those technologies are inherently unsuitable.

Microsoft's Anti-Corruption Layer pattern supports using an adapter or facade when two systems do not share the same semantics, specifically to prevent an external system's model from constraining the application's domain model.

_Source: [Microsoft — Anti-Corruption Layer pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer)_

### Design Principles and Best Practices

The projection boundary should use app-owned names and invariants while preserving opaque Booqable resource IDs and exact relationships. Booqable payloads should be validated at the adapter boundary and translated into a deliberately admitted contract. Workshop code should depend only on that normalized contract and local read models.

Each resource must earn admission through a demonstrated workflow dependency. This keeps customer pages, physical-bike history, order-bike membership, and workshop configuration possible without copying the full upstream schema.

### Scalability and Performance Patterns

The architecture should optimize for recoverability rather than raw throughput. At the stated scale, database capacity is not the material risk; request count, pagination, upstream throttling, and interrupted runs are. Reconciliation should therefore process bounded pages, persist a checkpoint after each committed page, and resume safely.

Retries should be limited to transient failures, use exponential backoff with jitter, and operate only over idempotent writes. AWS reliability guidance explicitly couples retry-with-backoff to idempotency and bounded retry counts.

_Sources: [AWS — Retry with backoff pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html); [AWS — Control and limit retry calls](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_limit_retries.html)_

### Integration and Communication Patterns

Webhook bodies remain change signals rather than business truth. The safe sequence is:

1. authenticate and validate the signal;
2. durably record event identity and status;
3. acknowledge receipt promptly;
4. fetch the current canonical Booqable representation;
5. validate and atomically apply the normalized snapshot;
6. record success or a retryable failure;
7. let reconciliation discover anything the webhook path missed.

The same adapters and ingestion operation should serve webhook refresh, reconciliation, and operator retry. Durable receipt before asynchronous processing, idempotent duplicate handling, failed-message visibility, and processing-success monitoring are established asynchronous integration practices.

_Source: [AWS — Asynchronous integration patterns](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-integrating-microservices/asynchronous.html)_

### Security Architecture Patterns

The Booqable API key and Supabase service-role key remain confined to trusted server-side integration paths. Webhook secrets must never be logged. Raw payloads containing customer PII should not be retained merely for replay; operational records should store the minimum source identity, status, attempt count, and redacted error context needed for repair.

Projection writes should be available only through narrowly scoped ingestion operations. User-facing loaders and actions must continue through authenticated/RLS-protected paths and must not gain service-role access.

### Data Architecture Patterns

The data model should distinguish:

- read-only Booqable-owned projections;
- app-owned workshop tasks and bike modifications;
- stable links such as order-to-physical-bike membership;
- operational state such as webhook attempts and reconciliation checkpoints.

One normalized canonical snapshot should be applied in one PostgreSQL transaction so customer/order/line/bike/assignment state cannot be partially mixed. A transaction-scoped advisory lock is available if workers need application-defined coordination; PostgreSQL releases such locks automatically at transaction end.

_Sources: [Supabase — Database Functions](https://supabase.com/docs/guides/database/functions); [PostgreSQL 17 — Advisory locks](https://www.postgresql.org/docs/17/explicit-locking.html)_

### Deployment and Operations Architecture

Supabase Cron can schedule SQL, database functions, or bounded HTTP invocations and records job status. Vercel Hobby Cron currently supports once-daily schedules with per-hour timing precision, and current Fluid Compute documentation lists a 300-second Hobby function limit. The deployed project's actual compute configuration remains unverified.

These capabilities make nightly triggering plausible, but they do not make one long uncheckpointed request safe. The durable unit of progress must remain in PostgreSQL so a timed-out or overlapping invocation can resume. A transaction-level lock or persisted run lease should prevent concurrent workers from processing the same run or source entity.

_Sources: [Supabase — Cron](https://supabase.com/docs/guides/cron); [Vercel — Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs); [Vercel — Function duration](https://vercel.com/docs/functions/configuring-functions/duration)_

### Architectural Conclusion

**Finding:** The existing stack contains the primitives needed for a recoverable selective projection, and the current scale does not demonstrate a need for additional infrastructure.

**Unproven dependency:** Architecture viability still depends on live evidence that Booqable exposes the required physical-bike identities, historical assignments, lifecycle fields, and sufficiently current canonical reads.

**Provisional recommendation:** If live evidence validates that graph, implement the smallest safe multi-entity projection inside the existing modular application with atomic PostgreSQL ingestion, a durable inbox, and checkpointed reconciliation. If the graph is incomplete or cannot be reconciled without inference, narrow or reject the projection regardless of the architectural fit.

## Implementation Approaches and Technology Adoption

### Live Account Evidence

The spike performed GET-only requests against the configured Booqable account. It persisted no raw payloads or customer PII; opaque source IDs were retained only as SHA-256 prefixes in evidence files.

Observed account inventory:

- 327 orders: 24 reserved, 7 draft, 177 stopped, 116 canceled, 2 started, and 1 archived.
- 63 ProductGroups, 214 Products, 118 StockItems, 2,876 Plannings, 360 StockItemPlannings, 13 Bundles, and 114 BundleItems.
- All 118 observed StockItems had human identifiers.
- All 360 StockItemPlannings had complete order, planning, and StockItem keys; all resolved to a known StockItem with an identifier.
- The account accepted standalone GET collection requests for `stock_items` and `stock_item_plannings`.

The last point is observed behavior, not a documented contract. The official v4 reference does not provide standalone resource sections for StockItems or StockItemPlannings. Production should therefore either obtain written Booqable confirmation or retain a documented nested-order-include fallback.

_Evidence: `booqable-selective-warehouse-spike-2026-08-10/live-evidence.json`; `booqable-selective-warehouse-spike-2026-08-10/catalog-evidence.json`; [Booqable API v4](https://developers.booqable.com/v4.html)._

### Historical Bike-Assignment Coverage

For measurement only, the spike formed a candidate bike ProductGroup set from observed trackable rental groups and explicitly excluded the known non-bike trackable groups Bike Case, Lock, and Support Van. Production must replace this analyst classification with an explicit business-approved allowlist keyed by stable ProductGroup ID. Product labels must never infer a physical assignment.

Across this candidate set:

- 86 candidate physical bikes were observed, all with identifiers.
- 406 bike Planning rows across 277 orders represented 434 expected bike units.
- 343 units had exact StockItemPlanning assignments; 91 remained explicitly unknown.
- Overall exact historical coverage was 79.0%.
- Stopped orders: 252/252 exact, 100%.
- Started orders: 2/2 exact, 100%.
- Reserved orders: 39/40 exact, 97.5%.
- Canceled orders: 44/123 exact, 35.8%.
- Draft orders: 6/17 exact, 35.3%.

The completed-rental result is the most important history finding: exact cross-order bike history can be reconstructed for every observed stopped-order bike unit without title inference. The low canceled/draft coverage is expected operationally because physical bikes may never have been assigned. Those associations must remain unknown.

_Evidence: `booqable-selective-warehouse-spike-2026-08-10/catalog-evidence.json`._

### Runtime and Rate-Limit Observations

The complete order-detail scan made 345 requests in 84.95 seconds. Median response time was 223 ms, p95 was 334 ms, and maximum was 872 ms. Three HTTP 429 responses occurred and all recovered through bounded backoff. The catalog, order, and planning graph scan made 87 requests in 13.25 seconds.

**Finding:** Representative read volume fits comfortably within the currently documented 300-second Vercel Hobby function duration, even when executed sequentially.

**Constraint:** Network reads are not the whole production job; validation and database writes add time. A durable checkpoint remains required because timeout, deployment interruption, overlapping schedules, and future growth can still terminate a run.

### Local Atomicity and Recovery Proof

A local-only PostgreSQL proof created isolated spike tables and one atomic snapshot function. It passed seven executable assertions:

1. processing an identical canonical snapshot twice created no duplicate assignment;
2. bike replacement retained the old assignment as archived and added the new assignment;
3. an older delayed snapshot could not regress newer order or assignment state;
4. a failed multi-row snapshot rolled back its preceding order update;
5. duplicate webhook receipt produced one durable event, and a failed event succeeded on retry without source-table repair;
6. checkpointed reconciliation resumed after replaying a page without duplicate processing;
7. reconciliation repaired a source change whose webhook was missed.

This proves the database operating model, not the final production schema. The proof uses synthetic data and PostgreSQL timestamps/fingerprints; production still needs narrow Zod contracts, real ingestion migrations, RLS/privilege tests, and Booqable-specific lifecycle fixtures.

_Evidence: `booqable-selective-warehouse-spike-2026-08-10/local-projection-proof.sql`; `booqable-selective-warehouse-spike-2026-08-10/local-proof-results.json`._

### Technology Adoption Strategy

Use an expand-switch-contract migration:

1. add backward-compatible projection, inbox, checkpoint, and ingestion structures;
2. introduce typed Booqable adapters and an atomic ingestion RPC while existing order consumers continue reading shared tables;
3. run local fixtures and a bounded shadow reconciliation;
4. switch webhook/backfill/retry callers to the canonical ingestion path;
5. verify counts, gaps, and failed-event visibility;
6. only then remove direct multi-request writes and the unauthenticated sandbox backfill route.

Do not begin with the broader warehouse. The minimum safe vertical slice already supports the committed product needs: useful local customers, orders and lines, deterministic bike ProductGroup classification, Plannings, StockItemPlannings, physical bikes, order-bike history, and app-owned modifications.

### Development Workflows and Tooling

Keep TypeScript adapters in `src/lib/booqable`, SQL migrations/functions in `supabase/migrations`, and operator-facing authenticated actions behind `withAuth`. Use one reusable canonical fetch and normalization path for webhook processing, just-in-time refresh, reconciliation, and manual retry.

The current backfill route should not become the production repair mechanism. It has no authentication guard or durable checkpoint and treats a failed list page as partial completion. Replace it with bounded worker invocations over persisted run state.

GitHub Actions supports both `workflow_dispatch` and scheduled workflows. It is suitable for a repository-owned manual reconciliation command, but hosted scheduling is also possible through Supabase Cron or Vercel daily Cron. The durable database checkpoint makes the trigger replaceable.

_Source: [GitHub — Manually run a workflow](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow); [Supabase — Cron](https://supabase.com/docs/guides/cron); [Vercel — Cron usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)._

### Testing and Quality Assurance

The permanent implementation should introduce narrowly scoped database tests because the critical invariants live in PostgreSQL. Supabase officially supports pgTAP through `supabase test db`, including functions, constraints, data integrity, and RLS tests, and documents running those tests in CI.

Required fixture scenarios are duplicate snapshots, identical-version conflicts, delayed older snapshots, replacement/archive, missing StockItem identity, partial upstream responses, 429 retry, interrupted pages, replayed pages, failed-event retry, and permission boundaries. Application-level adapter fixtures should contain redacted, minimal admitted fields rather than raw customer payloads.

_Source: [Supabase — Testing overview](https://supabase.com/docs/guides/local-development/testing/overview)._

### Deployment and Operations Practices

The correctness boundary is layered:

- webhooks provide low-latency change signals where available;
- just-in-time canonical order refresh protects consequential workshop transitions;
- nightly checkpointed reconciliation repairs missed, unsupported, or failed event paths;
- a durable failed-event list and bounded retry command eliminate per-item manual SQL repair.

Booqable publicly confirms some webhook capability, including bundle and bundle-item webhooks, but publishes no authoritative event catalogue, payload contract, acknowledgement rule, ordering guarantee, or retry schedule. Webhook completeness cannot be an activation condition unless Booqable supplies additional written evidence.

_Sources: [Booqable API v4](https://developers.booqable.com/v4.html); [Booqable bundle webhook release note](https://booqable.com/whats-new/september_03_2025/)._

### Team Organization and Skills

One AI-assisted engineer can own this within the existing stack, but the work crosses four failure-sensitive areas: Booqable contract validation, PostgreSQL transactional design, RLS/capability security, and operational recovery. The owner does not need a separate data-engineering or platform team if scope remains bounded and repair is automated.

The implementation should be reviewed in vertical slices rather than as one large warehouse change. Each slice must include migration, adapter, fixtures, reconciliation behavior, and operator failure handling before another resource type is admitted.

### Cost Optimization and Resource Management

Refined implementation estimate for one AI-assisted engineer:

- minimum safe multi-entity projection: 16–24 engineering days;
- broader selective warehouse and richer operations tooling: 23–36 engineering days;
- normal ongoing support target: 3–6 hours/month;
- incident-heavy month: 8–16 hours, primarily when an upstream contract changes or credentials/hosting fail.

These are decomposition-based ranges, not measured delivery times. Highest uncertainty lies in production privilege design, rollout against existing shared tables, and undocumented Booqable behavior.

Incremental infrastructure can remain $0 at current scale. Supabase Pro starts at $25/month and is the most relevant optional reliability upgrade because Free projects can pause after inactivity and Pro includes backups and longer log retention. Vercel Pro is $20/user/month, but the projection does not require it for runtime; separate commercial-plan suitability should be evaluated for the application as a whole.

_Sources: [Supabase pricing](https://supabase.com/pricing); [Vercel pricing](https://vercel.com/pricing)._

### Risk Assessment and Mitigation

Primary residual risks:

- **Undocumented standalone StockItem endpoints:** obtain Booqable confirmation or retain nested-order reads and test both paths.
- **Undocumented webhook contract:** never rely on webhook completeness; reconcile and expose failures.
- **ProductGroup classification drift:** store an explicit stable-ID allowlist and report newly observed unmapped trackable groups.
- **Equal-version changed content:** quarantine the conflict and refetch rather than silently overwrite.
- **Partial writes:** use one database transaction per admitted snapshot.
- **Customer archival/PII:** retain historical identity links while defining anonymization separately before customer archive automation.
- **Free-tier pause:** surface last-success timestamps and consider Supabase Pro when operational reliance begins.
- **Operator overload:** retry by event/run/entity through the canonical path; prohibit manual source-table repair as the normal runbook.

## Technical Research Recommendations

### Implementation Roadmap

1. Approve the conditional-go constraints and explicit bike ProductGroup allowlist.
2. Correct the current webhook secret logging and disable or authenticate the sandbox backfill route before expanding integration responsibility.
3. Implement typed admitted-resource schemas and canonical nested order fetching.
4. Add idempotent projection tables, historical assignments, inbox/run state, and one atomic ingestion operation.
5. Add pgTAP and adapter fixtures for the proven recovery cases.
6. Run a local and then CI-deployed shadow reconciliation through the normal merge pipeline; do not mutate remote databases manually.
7. Add minimal failed-event/retry and freshness visibility.
8. Compare the implemented contract with the Workshop architecture and formally correct only the affected integration assumptions.

### Technology Stack Recommendations

Retain Next.js, TypeScript, Zod, Supabase/PostgreSQL, and the current Booqable API v4 integration. Add no broker, microservice, ORM, or full raw-payload store at this scale. These are recommendations derived from the measured operating envelope, not independent research findings.

### Skill Development Requirements

The owner should be comfortable reviewing PostgreSQL transactions/functions, RLS privileges, JSON:API relationship mapping, and failure-recovery reports. AI can accelerate implementation and fixture generation but cannot substitute for approving the bike ProductGroup classification or interpreting ambiguous workshop source data.

### Success Metrics and Decision Thresholds

No fabricated numeric acceptance threshold is introduced. Activation should require:

- every admitted source row has a stable external identity;
- current bike assignments use exact StockItemPlanning relationships only;
- unknown assignments remain explicit;
- every production write path converges through the canonical ingestion operation;
- interrupted reconciliation resumes without replay damage;
- failed events are visible and retryable without manual table edits;
- just-in-time refresh protects consequential workshop actions;
- newly observed unmapped trackable groups fail closed.

Measured coverage must continue to be reported by order status rather than hidden behind one percentage.

## Research Synthesis

### Executive Summary

The selective warehouse makes sense for this product because the required outcome is larger than making one Workshop screen easier to query. The application needs stable customer records, exact physical-bike identity, bike-to-order history, source-change detection, and app-owned bike modifications. Booqable exposes the necessary current graph, and the configured account contains enough exact historical relationships to make that model useful without guessing from item titles.

The spike scanned all 327 listed orders and the admitted catalog/assignment graph using GET-only requests. All 360 observed StockItemPlanning rows had complete order, planning, and StockItem keys, and every referenced StockItem had an identifier. The analyst-classified bike set contained 86 physical bikes. Exact assignment coverage was 343 of 434 expected bike units overall, with 100% coverage for stopped orders, 100% for started orders, and 97.5% for reserved orders. Unknowns were concentrated in canceled and draft orders where physical assignment often never occurred; they can remain explicitly unknown.

The complete order-detail scan took 84.95 seconds over 345 requests. Three rate limits recovered automatically. A local PostgreSQL prototype passed all seven assertions for duplicate delivery, delayed older state, replacement history, atomic rollback, durable retry, checkpoint resume, and reconciliation after a missed webhook. The unacceptable operating mode—repairing individual database rows after webhook crashes—is therefore avoidable: normal recovery becomes event retry or bounded reconciliation through the canonical ingestion path.

**Decision:** Commit to the **minimum safe selective multi-entity projection** as an integration foundation. Do not commit to a full Booqable mirror or a generalized warehouse platform.

**Decision classification:** **Conditional go.** The data graph and operating model are viable; the remaining conditions constrain implementation and activation rather than requiring another exploratory spike.

### Key Findings

- Booqable documents and live payloads support the exact `Order → Line → Planning → StockItemPlanning → StockItem` relationship needed for physical-bike history.
- Booqable's help documentation confirms that individually tracked stock items receive unique identifiers intended to distinguish exact rented units and support history/utilization.
- Completed-rental bike history reconstructed at 100% in the observed account without title inference.
- The current application already has shared customer/order/line identity bridges and the correct canonical-fetch-after-signal foundation.
- The current write path is not atomic, has no durable failed-event state, and has no checkpointed repair run.
- Representative reconciliation fits current scale and hosting limits, but checkpointing remains mandatory.
- Webhooks exist, but Booqable publishes no authoritative complete event catalogue, delivery guarantee, acknowledgement contract, or retry schedule.
- Standalone StockItem and StockItemPlanning collections worked in the live account but lack standalone sections in the official v4 reference.
- PostgreSQL can provide atomic ingestion, idempotency, historical retention, event state, and reconciliation checkpoints without another service.

### Technical Recommendations

1. Evolve the existing shared projection; do not create a competing Workshop order copy.
2. Keep Booqable translation and validation inside `src/lib/booqable`.
3. Apply each admitted canonical snapshot through one transactional PostgreSQL operation.
4. Persist webhook receipt, attempts, failures, and retry outcomes.
5. Reconcile nightly with durable checkpoints and use just-in-time order refresh before consequential Workshop transitions.
6. Store an explicit, business-approved allowlist of bike ProductGroup IDs and fail closed for new unmapped trackable groups.
7. Retain documented nested order includes as the fallback if standalone inventory collections change or disappear.
8. Preserve exact historical assignments and explicit unknowns; never infer identity from titles.

### Table of Contents

1. Research significance and methodology
2. Verified technical landscape and source graph
3. Architecture decision
4. Implementation approach
5. Integration and interoperability
6. Performance and scalability
7. Security and data governance
8. Strategic commitment decision
9. Roadmap, cost, and risk
10. Future evolution
11. Source verification and limitations
12. Evidence artifacts and references

### 1. Research Significance and Methodology

Workshop Tasks must react to the identity and changing configuration of a physical bike, not merely display an order line. Cross-order bike history and local customer pages extend the need beyond a one-off order fetch. The spike therefore tested source identity, relationship fidelity, history coverage, repair behavior, runtime, and ownership economics as one decision.

Methods:

- official Booqable API/help documentation and release notes;
- current Supabase, Vercel, PostgreSQL, GitHub Actions, Microsoft, AWS, and JSON:API documentation;
- repository schema and integration inspection;
- GET-only live Booqable account sampling and full scans;
- redacted aggregate evidence with no stored customer PII or raw payloads;
- synthetic local PostgreSQL failure/recovery proof;
- comparison with the finished Workshop architecture baseline.

_Primary sources: [Booqable API v4](https://developers.booqable.com/v4.html); [Booqable individual stock tracking](https://help.booqable.com/en/articles/1209362-how-to-track-rental-stock-items-individually); [JSON:API](https://jsonapi.org/format/)._

### 2. Verified Technical Landscape and Source Graph

The live account verified stable IDs and current relationship fields for Customers, Orders, Lines, ProductGroups, Products, Bundles, BundleItems, Plannings, StockItemPlannings, StockItems, and Barcodes. Every admitted resource shape exposed `updated_at`; archive fields were observed on the relevant catalog, planning, assignment, customer, and physical-stock resources.

The exact assignment path is strong enough for current operations and useful history. A Planning can legitimately have fewer physical assignments than quantity, so missing identity is a source fact—not an error to repair through inference. Canceled and draft gaps therefore remain explicit.

The 13 candidate bike ProductGroups used for measurement are not yet a production classification. Production must store approved stable ProductGroup IDs. Names may help a human configure that list once, but no runtime identity or assignment may depend on labels.

### 3. Architecture Decision

The appropriate architecture is an evolutionary transactional modular monolith with an anti-corruption layer:

- Next.js performs bounded authenticated/server-side orchestration and external reads.
- `src/lib/booqable` validates and translates the admitted upstream contract.
- PostgreSQL atomically applies source-owned projections and records operational state.
- Workshop code consumes local contracts and never parses Booqable payloads.
- Booqable remains authoritative for projected customer/order/inventory fields.
- Workshop modifications and task state remain app-owned.

No measured throughput, deployment-independence, or fault-isolation requirement justifies a microservice, broker, ORM, or raw-payload lake. Avoiding those components is a recommendation derived from the measured scale and ownership criterion.

_Source: [Microsoft — Anti-Corruption Layer](https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer)._

### 4. Implementation Approach

Adopt expand-switch-contract:

1. add backward-compatible physical-bike, historical membership, event-inbox, run-checkpoint, and ingestion structures;
2. add minimal Zod contracts for observed fields and documented nested relationships;
3. introduce one idempotent atomic ingestion operation;
4. add pgTAP and adapter fixtures covering the seven proven recovery scenarios plus privilege boundaries;
5. shadow-run bounded reconciliation and report gaps;
6. switch webhook, just-in-time refresh, backfill, and retry callers to the same canonical path;
7. verify operational health before removing direct multi-request writes.

The current unauthenticated sandbox backfill route must not become an operator endpoint. It should be disabled/guarded and replaced by persisted bounded runs.

_Source: [Supabase database testing](https://supabase.com/docs/guides/local-development/testing/overview)._

### 5. Integration and Interoperability

Webhook payloads remain signals. Correctness comes from canonical refetch, validation, atomic idempotent application, and reconciliation. This tolerates duplicate, delayed, missed, unsupported, or out-of-order events.

The canonical inventory strategy has two read paths:

- preferred account capability: standalone collection reads for efficient inventory/assignment reconciliation;
- documented fallback: nested order includes for exact assignment retrieval.

Booqable confirmation of standalone inventory endpoints would raise confidence, but it is not an implementation blocker if the nested fallback and measured reconciliation remain operational.

_Sources: [Booqable API v4](https://developers.booqable.com/v4.html); [Microsoft — Idempotent functions](https://learn.microsoft.com/en-us/azure/azure-functions/functions-idempotent)._

### 6. Performance and Scalability

Measured read-only scans:

- order details: 345 requests, 84.95 seconds, p50 223 ms, p95 334 ms;
- catalog/order/planning graph: 87 requests, 13.25 seconds;
- three observed 429 responses, all recovered through bounded backoff.

At current scale, database storage is negligible compared with API completeness and operational recovery. Daily reconciliation can remain within the current documented Vercel Hobby duration, but future growth and write latency make persistent page/keyset checkpoints non-negotiable. Overlap control should use a persisted lease or transaction-level advisory lock.

_Sources: [Vercel function duration](https://vercel.com/docs/functions/configuring-functions/duration); [PostgreSQL advisory locks](https://www.postgresql.org/docs/17/explicit-locking.html)._

### 7. Security and Data Governance

Required controls:

- never expose Booqable or service-role credentials to users;
- stop logging supplied webhook secrets;
- restrict projection writes to narrowly granted ingestion capabilities;
- retain only minimum event identity/error context, not permanent raw customer payloads;
- preserve partner-scoped reads on shared orders/customers;
- retain historical assignment identity through archival rather than destructive deletion;
- define customer PII anonymization separately before automating archived-customer retention.

No remote database, Booqable resource, or webhook subscription was changed during the spike.

### 8. Strategic Commitment Decision

**Commit:** minimum safe shared projection for Customers, Orders, Lines, business-approved bike ProductGroups/Products, Plannings, StockItemPlannings, physical bikes, historical order-bike membership, operational event/run state, and links to app-owned modifications.

**Do not commit:** full API-schema mirroring, generic data warehouse infrastructure, bidirectional writes, complete coupon synchronization, non-bike physical history, broker/microservice infrastructure, or rich operations analytics.

Why this is worth committing:

- Workshop Tasks otherwise retains fragile mapping and change-detection complexity.
- Exact bike history and useful customer pages are explicit product needs, not speculative convenience.
- The required graph exists and historical completed-order coverage is complete in observed data.
- The recovery model directly addresses the owner's maintenance-creep criterion.

Why the decision remains conditional:

- ProductGroup classification needs business approval.
- standalone inventory endpoints are observed but undocumented;
- webhook delivery semantics are undocumented;
- customer archival/PII behavior remains a bounded policy decision;
- production implementation and privilege tests have not yet been built.

### 9. Roadmap, Cost, and Risk

Estimated ownership for one AI-assisted engineer:

- minimum safe projection: **16–24 engineering days**;
- broader warehouse/operations expansion: **23–36 engineering days**;
- normal support: **3–6 hours/month**;
- upstream-change or credential/hosting incident month: **8–16 hours**.

Normal webhook failure should require no manual row repair. Staff retry a failed event or reconciliation run. If Booqable changes a payload contract, the engineer fixes one adapter/validator and bulk-replays affected entities. Manual intervention remains appropriate only for semantic ambiguity such as a newly observed unmapped ProductGroup—not for routine database correction.

Incremental infrastructure can remain **$0** at current scale. Supabase Pro starts at **$25/month** and is the most relevant reliability upgrade because it prevents inactivity pausing and adds backups/log retention. Vercel Pro is **$20/user/month**, but this projection does not require it for measured runtime.

Smallest justified next lifecycle step:

1. create an architecture evidence addendum/correct-course recording the verified graph, coverage, fallback, and simplified operating contract;
2. create a dedicated Booqable integration-foundation epic before dependent Workshop implementation;
3. do not run another full PRD/UX lifecycle for the projection itself;
4. use the normal migration-by-CI path for staging/production after local implementation and review.

_Sources: [Supabase pricing](https://supabase.com/pricing); [Vercel pricing](https://vercel.com/pricing)._

### 10. Future Evolution

Broaden the projection only when a workflow earns another entity or field. Candidate future increments include richer customer history, bike utilization analytics, maintenance/modification reporting, and better synchronization health views. None requires changing the one-way authority boundary.

The architecture should be revisited if scale or requirements introduce a measured need for independent deployment, materially higher event volume, sub-nightly unsupported-resource freshness, or multi-source reconciliation. Those conditions do not exist today.

### 11. Source Verification and Limitations

Confidence:

- **High:** current repository gaps, live account IDs/relationships, stopped-order history coverage, measured runtime, local PostgreSQL invariants, current platform prices/limits.
- **Medium:** production implementation effort and normal support burden; these are decomposed estimates.
- **Medium:** using standalone StockItem/StockItemPlanning collections long term; observed but not formally documented.
- **Low:** complete Booqable webhook topics, retries, ordering, and acknowledgement behavior; no authoritative public contract was found.

Limitations:

- no remote production/staging proof was permitted or performed;
- no webhook subscription was created, changed, or audited through mutation;
- historical classification used an analyst candidate ProductGroup set pending business approval;
- local recovery used synthetic projection data rather than production migrations;
- cost ranges are estimates, not elapsed implementation measurements.

### 12. Evidence Artifacts and References

Spike artifacts:

- `booqable-selective-warehouse-spike-2026-08-10/collect-live-evidence.mjs`
- `booqable-selective-warehouse-spike-2026-08-10/live-evidence.json`
- `booqable-selective-warehouse-spike-2026-08-10/collect-catalog-evidence.mjs`
- `booqable-selective-warehouse-spike-2026-08-10/catalog-evidence.json`
- `booqable-selective-warehouse-spike-2026-08-10/local-projection-proof.sql`
- `booqable-selective-warehouse-spike-2026-08-10/local-proof-results.json`

Primary references:

- [Booqable API v4](https://developers.booqable.com/v4.html)
- [Booqable individual stock tracking](https://help.booqable.com/en/articles/1209362-how-to-track-rental-stock-items-individually)
- [JSON:API specification](https://jsonapi.org/format/)
- [Supabase database functions](https://supabase.com/docs/guides/database/functions)
- [Supabase Cron](https://supabase.com/docs/guides/cron)
- [Supabase testing](https://supabase.com/docs/guides/local-development/testing/overview)
- [Vercel Cron](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [Vercel function duration](https://vercel.com/docs/functions/configuring-functions/duration)
- [PostgreSQL explicit/advisory locking](https://www.postgresql.org/docs/17/explicit-locking.html)
- [AWS retry with backoff](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html)
- [Microsoft Anti-Corruption Layer](https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer)

## Technical Research Conclusion

The project should commit to the bounded selective projection because it is supported by live source evidence, solves explicit Workshop/customer/bike-history needs, and has a demonstrated bulk-recovery model. Commitment must remain limited to the minimum shared foundation and must include its reliability controls from the start.

This is not approval for a broad warehouse program. It is approval to implement one recoverable anti-corruption layer over a proven multi-entity graph, then let Workshop Tasks and future bike/customer workflows consume stable local identities and relationships.

**Technical research completion date:** 2026-08-10  
**Decision:** Conditional go  
**Overall confidence:** High on feasibility; medium on implementation ownership range; low on undocumented webhook guarantees.
