---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - _bmad-output/planning-artifacts/architecture/architecture-echelon-cycling-hub-admin-2026-08-10/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/prds/prd-echelon-cycling-hub-admin-2026-08-07/prd.md
  - _bmad-output/planning-artifacts/prds/prd-echelon-cycling-hub-admin-2026-08-07/addendum.md
  - _bmad-output/planning-artifacts/research/technical-booqable-selective-warehouse-spike-research-2026-08-10.md
workflowType: 'research'
lastStep: 6
research_type: 'technical'
research_topic: 'Workshop Architecture open activation blockers'
research_goals: 'Resolve the five activation blockers in ARCHITECTURE-SPINE.md with verified evidence, explicit architecture and PRD closure recommendations, safe re-scopes, and named activation gates.'
user_name: 'Den'
date: '2026-08-12'
web_research_enabled: true
source_verification: true
---

# Research Report: Technical

**Date:** 2026-08-12
**Author:** Den
**Research Type:** Technical

---

## Research Overview

This research resolves the five Workshop Tasks activation blockers recorded in the final Architecture Spine: multi-quantity physical-unit identity, FR-3 assignment behavior after source suspension, Booqable classification and lifecycle mapping, authority to interpret absent children, and the technology/security baseline.

The method distinguishes five evidence classes: official guarantees, observed account behavior, executable fixture proof, repository facts, and business decisions. A blocker is closed only by an adopted decision, a verified contract, or an explicit safe re-scope; assumptions are not promoted to architecture facts.

The full outcomes, ready-to-apply amendment text, and activation consequences are consolidated in [Research Synthesis](#research-synthesis).

---

## Technical Research Scope Confirmation

**Research Topic:** Workshop Architecture open activation blockers
**Research Goals:** Resolve the five activation blockers in `ARCHITECTURE-SPINE.md` with verified evidence, explicit architecture and PRD closure recommendations, safe re-scopes, and named activation gates.

**Technical Research Scope:**

- Architecture Analysis - identity, source authority, lifecycle, and activation boundaries
- Implementation Approaches - fixtures, adapters, security containment, and rollout gates
- Technology Stack - Next.js, Node.js, Vercel, Supabase SSR/CLI, and PostgreSQL
- Integration Patterns - Booqable ProductGroups, Plannings, StockItemPlannings, OrderFulfillment, and archive semantics
- Performance Considerations - bounded refresh/reconciliation under the verified runtime envelope

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Existing GET-only account evidence and local-only executable proofs
- No mutations to Booqable, Vercel, remote Supabase projects, architecture/PRD source files, or application code

**Scope Confirmed:** 2026-08-12

---

## Technology Stack Analysis

### Programming Languages

The blocker work does not justify a language change. TypeScript remains the application and contract-generation language, while PostgreSQL/PL/pgSQL remains the authority for atomic workflow decisions, privilege boundaries, and convergence. SQL is not merely storage implementation here: the adopted architecture requires transaction-scoped identity, revision, lifecycle, and event invariants that cannot safely be duplicated in Node.js.

The existing repository uses TypeScript 5.9.3 with strict checking and PostgreSQL 17. This combination is suitable for a transactional modular monolith. The critical language boundary is generated equivalence between the versioned integration envelope's TypeScript validation and PostgreSQL ingestion representation, not introduction of another runtime.

_Confidence: High — repository inventory and adopted architecture._

### Development Frameworks and Libraries

The resolved repository version is Next.js 14.2.35, declared as `^14.2.3`. Next.js now lists 16.x as Active LTS and 15.x as Maintenance LTS; 14.x is unsupported. Production activation therefore requires an upgrade to a tested supported major. The target should be chosen by a dedicated compatibility pass, with 16.x preferred for the longer support runway unless the repository's React/Subframe/editor dependencies force a staged 15.x landing.

The upgrade is not a version-only change. The repository's `next.config.js` uses Next.js 14 experimental keys that changed in later majors, and its ESLint package is intentionally older than the current Next.js dependency. The activation gate must cover build, auth middleware/proxy behavior, server actions, PDF generation, BlockNote, React Email, and existing route fixtures.

`@supabase/ssr` resolves to 0.10.0. Current Supabase documentation states that, from 0.10.0, `setAll` receives cache-prevention headers (`Cache-Control`, `Expires`, and `Pragma`) as a second argument during token refresh and that the Next.js middleware/proxy adapter must copy them to the response. The repository callback accepts only `cookiesToSet`; it therefore drops a documented security contract. The fix gate is to accept and apply the provided headers, then fixture a refresh response and verify `Cache-Control: private, no-store`.

_Sources: [Next.js Support Policy](https://nextjs.org/support-policy); [Supabase SSR advanced guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide); [Supabase — Creating a server-side client](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs&queryGroups=framework)._

_Confidence: High — official current documentation plus repository code._

### Database and Storage Technologies

PostgreSQL remains the correct store and transaction coordinator. PostgreSQL 17 is supported upstream through November 8, 2029. The repository's local Supabase configuration specifies major version 17; Supabase project metadata reports both staging and production on the PostgreSQL 17 engine. Production extension inventory was readable and confirmed installed `pgcrypto`, `uuid-ossp`, `supabase_vault`, `pg_stat_statements`, and `plpgsql`.

Staging was reported healthy on PostgreSQL 17.6.1.127, but three read-only extension queries timed out. That is an environment-proof failure, not evidence that extensions are absent. Activation remains gated on a successful staging query and comparison with the migration-owned extension manifest.

The repository has no database test directory. Because the architecture depends on capability functions and direct-DML revocation, pgTAP and true multi-session tests are required. Privilege fixtures must execute as `anon`, `authenticated`, and `service_role`; merely inspecting policies as an owner cannot prove the effective boundary.

_Sources: [PostgreSQL Versioning Policy](https://www.postgresql.org/support/versioning/); [Supabase Database Extensions](https://supabase.com/docs/guides/database/extensions); Supabase project metadata and extension inventory read on 2026-08-12._

_Confidence: High for PostgreSQL versions and production extensions; medium for staging extensions until the timed-out read succeeds._

### Development Tools and Platforms

The project does not pin the Supabase CLI. Both deployment workflows select `latest`, and the CLI is not a project dev dependency. Supabase's current guidance recommends pinning the CLI in `package.json` so local and CI commands use the same version. The latest stable GitHub release observed during research was 2.113.0 (2026-08-08), while newer 2.114.0 builds were prereleases. The gate is not automatically "use latest": select 2.113.0 or a later stable release, run the complete local reset/migration/test/type-generation workflow, then pin that tested exact version in development and CI.

The testing stack should remain proportional to the architecture. Use pgTAP for transaction, RLS, function, and privilege invariants; use a multi-session database harness for first-writer-wins races; use redacted adapter fixtures for Booqable normalization/comparator branches. A broad UI test framework is not required to close these blockers.

_Sources: [Supabase CLI Getting Started](https://supabase.com/docs/guides/local-development/cli/getting-started); [Supabase CLI v2.113.0](https://github.com/supabase/cli/releases/tag/v2.113.0)._

_Confidence: High._

### Cloud Infrastructure and Deployment

The connected Vercel project reports Next.js, Node.js 24.x, and a ready production deployment using Node.js functions. Vercel's current documentation lists Node.js 24.x as the default supported line and allows explicit selection through `package.json` `engines.node`. The repository has no `engines` field, so the dashboard currently supplies a fact that source control does not enforce. Pinning Node 24.x in the repository and CI closes that drift.

Vercel now documents Fluid Compute as enabled by default with a 300-second default and maximum duration on Hobby. The earlier repository context claiming a universal 10-second Hobby limit is stale and must not be used as an architecture fact. The 84.95-second sequential Booqable scan measured by the prior spike fits the current documented limit, but the integration must still use bounded attempts and durable checkpoints because HTTP duration is not a recovery strategy.

The security containment defects are repository facts:

- the webhook logs the caller-supplied secret verbatim on authentication failure;
- the `/api/sandbox/booqable/sync-orders` GET route creates a service-role client without authentication;
- middleware intentionally skips all API routes, so that sandbox route has no outer auth guard.

These are pre-foundation fixes, not deferred production hardening.

_Sources: [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions); [Vercel function duration](https://vercel.com/docs/functions/configuring-functions/duration); connected Vercel project/deployment metadata read on 2026-08-12._

_Confidence: High._

### Technology Adoption and Baseline Decision

The safe baseline is evolutionary:

1. retain TypeScript, PostgreSQL, Supabase, and Vercel;
2. upgrade Next.js to a supported LTS through an explicit compatibility story;
3. pin Node 24.x and one tested stable Supabase CLI;
4. implement the documented Supabase SSR response-header contract;
5. verify PostgreSQL/extension parity in local, staging, and production;
6. land security containment and privilege fixtures before expanding the integration.

No new broker, microservice, warehouse, cache, or edge runtime is required. The architecture's durable inbox and bounded worker can remain in PostgreSQL plus ordinary Node.js Vercel Functions.

---

## Integration Patterns Analysis

### API Design Pattern

Booqable API v4 is a resource-oriented HTTPS JSON API with UUID identities, filters, sparse fieldsets, relationship linkage, compound `include` documents, pagination, and explicit HTTP errors including 429. The Workshop integration should keep the already-adopted notification-as-signal pattern:

1. authenticate and durably record the notification;
2. identify the source root requiring refresh;
3. fetch current authority through one canonical adapter;
4. validate and normalize the admitted graph;
5. atomically ingest source facts and derive Workshop consequences.

The webhook's form-encoded, v1-shaped payload cannot be source truth. The public API documents the read graph and fulfillment operations but does not publish a complete webhook event/retry contract. Correctness must therefore come from authoritative refetch plus reconciliation, not from assuming complete delivery.

_Sources: [Booqable API v4](https://developers.booqable.com/v4.html); [JSON:API Specification](https://jsonapi.org/format/)._

_Confidence: High._

### Communication Protocols and Data Formats

The external boundary is ordinary HTTPS. No WebSocket, gRPC, AMQP, or broker protocol is needed. Booqable responses use JSON:API-style resource objects; the existing webhook uses form encoding. Internally, the repository-owned integration envelope is a versioned semantic contract rather than a raw transport copy.

JSON:API defines empty to-many linkage as `data: []` and requires full linkage for included compound documents. This proves what the server represented in that response; it does not prove that a removed child caused a particular parent `updated_at` to advance. Transport completeness and source-version authority are separate claims. The adapter must annotate every relationship scope as complete or partial based on the actual request and validated response, while the comparator separately decides whether the source version is authorized to close anything.

_Source: [JSON:API resource linkage and compound documents](https://jsonapi.org/format/#document-resource-object-linkage)._

_Confidence: High._

### Booqable Identity and Multi-Quantity Lines

Official Booqable documentation establishes:

- trackable rental Products have individually identifiable StockItems;
- a Planning has one total `quantity`;
- its StockItemPlannings identify assigned physical StockItems;
- the number of StockItemPlannings may be less than Planning quantity because some units are not yet specified;
- fulfillment can start or stop specific StockItem IDs.

Existing account evidence contains 406 candidate bike Plannings representing 434 expected units. Of those units, 343 had exact physical assignments and 91 remained unknown. Every observed StockItemPlanning had complete order, planning, and StockItem keys, but the spike did not prove that StockItemPlanning identity is stable through remap, removal, and re-add, nor does Booqable expose a source-backed identity for each unspecified unit.

This closes the research question negatively: no verified discriminator exists for ambiguous unassigned units on a multi-quantity line. Array position, generated ordinal, or StockItemPlanning ID must not be promoted to lifetime membership identity.

**Integration decision:** use `single` only for a single-quantity provisional line. For a multi-quantity line, create physical-bike membership/tasks only for exact StockItem assignments and open one deduplicated integration incident for `planning.quantity - exact_assignments`. Additional exact assignments create their own memberships when observed. Never guess or create indistinguishable provisional per-unit tasks.

_Sources: [Booqable API v4 — Product Groups, Plannings, and Order Fulfillments](https://developers.booqable.com/v4.html); existing `catalog-evidence.json` and spike synthesis._

_Confidence: High for the safe re-scope; medium for future StockItemPlanning remap behavior, which remains fixture-gated._

### Classification and Setup Mapping

ProductGroup UUID is a suitable stable classification key. The API documents ProductGroups as the shared configuration parent of Products and exposes tracking/product type. Existing account evidence catalogued 63 ProductGroups and identified 13 analyst-candidate bike groups, while excluding Bike Case, Lock, and Support Van. The evidence artifact intentionally hashes IDs, so it cannot itself populate a production allowlist, and analyst classification is not business approval.

**Classification boundary:** activation requires a business-approved, versioned list of actual ProductGroup UUIDs obtained through a credential-safe local process. Runtime labels are display-only. A newly observed trackable group that is not in the active allowlist opens an incident and creates no Workshop task.

The five Setup Categories—Pedals, Saddle, Wheelset, Power meter, and Computer mount—have no mapping evidence in the prior spike. Public API documentation exposes generic ProductGroup/Order/Line properties and `extra_information`, but it does not establish which account-specific fields carry these categories or whether they are structured. No name-based mapping is acceptable.

**Setup boundary:** selective category invalidation stays disabled until each category has a fixture-backed stable field/default-property/related-resource ID and normalized value contract. If that proof is unavailable, re-scope v1 to the existing broad `review_updated_configuration` requirement for any detected relevant configuration change; do not claim targeted category invalidation.

_Source: [Booqable API v4 — Product Groups and Properties](https://developers.booqable.com/v4.html)._

_Confidence: High for ProductGroup identity and the fail-closed rule; low for account-specific Setup mapping until targeted fixtures exist._

### Pickup, Return, and Fulfillment Mapping

Booqable now documents the lifecycle semantics needed for a stable normalized phase:

- Order status normally progresses `reserved → started → stopped`;
- OrderFulfillment starts/stops Products or specific StockItems;
- Planning `started` is the number of units picked up/delivered;
- Planning `stopped` is the number returned;
- Planning status may become `stopped` before the whole Order stops;
- partial start and partial stop are valid.

This means order status alone is too coarse for per-bike lifecycle. The normalized membership phase must be derived from the exact StockItemPlanning/Planning context: assigned but not started, started but not stopped, or stopped. The existing account includes two started orders, but the prior artifact did not retain the Planning counters/status needed to prove this account's per-bike behavior.

**Lifecycle boundary:** before pickup/return automation activates, add redacted fixtures for exact assigned bike units across reserved, partially started, fully started, partially stopped, fully stopped, canceled, removed, and re-added cases. Until those fixtures pass, normalized phase remains `unknown` and no automatic Return transition occurs.

_Source: [Booqable API v4 — Order lifecycle, Plannings, and Order Fulfillments](https://developers.booqable.com/v4.html)._

_Confidence: High for documented semantics; medium for the account-specific mapping until fixtures are captured._

### Absence and Removal Authority

Booqable explicitly documents two useful tombstones:

- a Planning removed through the Lines resource has `archived = true` and `archived_at`;
- removing specified StockItems through OrderFulfillment returns archived StockItemPlannings in `changed_stock_item_plannings`.

Those statements support explicit removed/archive evidence. They do not guarantee that a later canonical GET retains every archived child, nor that `order.updated_at` advances on every relationship removal. The local proof tested an explicit `archived_at` replacement; it did not prove silent disappearance from a complete relationship.

**Absence decision:** generic absence is permanently non-closing for v1. A membership/source child may close only from a validated explicit archive/tombstone or an independently fixture-proven semantic event returned by the canonical refetch path. Complete `data: []` can record current observation and open/maintain an incident, but it cannot itself terminate history. This safe re-scope resolves the activation blocker without a prohibited mutation experiment in the live Booqable account.

_Sources: [Booqable API v4 — Planning archive and OrderFulfillment changed relationships](https://developers.booqable.com/v4.html); [JSON:API Specification](https://jsonapi.org/format/)._

_Confidence: High._

### System Interoperability

The correct pattern is an anti-corruption layer inside the modular monolith:

- `src/lib/booqable` alone knows API fields and transport shapes;
- a repository-owned versioned envelope carries normalized source semantics;
- one ingestion coordinator owns source writes;
- a Workshop-owned derivation function owns task consequences;
- the database commits both in one transaction;
- read models and capability RPCs expose role-minimized contracts.

An API gateway, service mesh, enterprise bus, separate warehouse, or Saga is counterproductive here. There is one external authority and one local transaction boundary. Distributed transactions would add failure modes without solving a current requirement.

### Event-Driven and Recovery Pattern

The durable inbox is a work queue, not event sourcing. Receipts preserve notification evidence; coalesced refresh intents fetch current authority; attempts record bounded execution; reconciliation repairs missed signals. Current-state tables continue to power the UI, while append-only Workshop events preserve attributable domain history.

Webhook retries are not a correctness guarantee, and public documentation does not establish a retry schedule. The worker must therefore use leases, receipt generations, bounded backoff for 429/5xx, checkpoints, explicit exhausted/quarantined states, and operator successor retry.

### Integration Security

The static webhook secret is acceptable only as a bounded first-release authentication mechanism if it is compared without disclosure, rotated through environment management, and followed by authoritative refetch. The current route logs a rejected caller's supplied value and must be fixed before further integration work.

The service-role key remains restricted to the ingestion coordinator. The unauthenticated sandbox sync route must be removed or replaced by an explicitly authenticated, least-privileged recovery capability before source projection expands. Workshop routes and Server Components must never receive service-role access.

---

## Architectural Patterns and Design

### System Architecture Pattern

The selected transactional modular monolith is confirmed. It matches the system's actual consistency boundary: one Next.js application, one PostgreSQL database, one external rental authority, and multi-record workflow transitions that must commit atomically. Splitting Booqable ingestion and Workshop derivation into separately deployed services would require distributed consistency while providing no independent scaling or ownership benefit.

The architecture uses three complementary patterns:

- **Anti-corruption layer:** Booqable transport and field semantics terminate in `src/lib/booqable`.
- **Transactional application service:** named PostgreSQL functions serialize aggregate mutations and commit current state plus history.
- **Capability boundary:** UI-facing server actions adapt authenticated requests to narrowly privileged RPCs; they do not implement workflow rules.

The modules remain separate even when their writes share a transaction. Integration owns source projection and convergence; Workshop owns task lifecycle and mechanic evidence.

### Design Principles and Best Practices

The dominant principles are fail-closed interpretation, one writer per authoritative field, immutable identity/history, and explicit uncertainty.

For FR-1, "one Bike Task per physical bike" is stronger than "one row per expected quantity." When Booqable has not identified a unit, creating an ordinal identity would fabricate a physical fact. The architecture must prefer a visible integration incident over a guessed task.

For FR-3, architecture and product text currently conflict. The PRD allows retaining assignment when the same mechanic is "still actively working," but v1 has no presence lease. Stage `In Prep` is not proof of current presence: a tablet may be closed, offline, or stale. AD-6's unconditional clear is the only enforceable first-release rule.

**FR-3 decision:** removal or cancellation atomically clears assignment. Valid same-bike reactivation preserves safe task stage/evidence, reconciles current intent, and returns the task unassigned for an ordinary claim. A presence lease is deferred as a new product/infrastructure capability, not inferred from task state.

### Concurrency and Transaction Pattern

PostgreSQL row locks plus transaction-level advisory locks fit the invariants. PostgreSQL documents that transaction-level advisory locks are automatically released at transaction end, making them suitable for checklist activation keys and other logical resources not represented by one existing row. `SELECT ... FOR UPDATE` and the spine's total lock order protect existing aggregate rows.

Revision compare-and-set remains necessary even with locks: locks serialize concurrent server work, while expected revisions identify a stale client intent that should be rejected rather than silently applied after waiting.

The database test floor must include:

- duplicate/idempotent snapshot application;
- equal-version/different-fingerprint quarantine;
- old-component rejection;
- first-writer claim races using separate sessions;
- task/requirement evidence revision conflicts;
- transaction rollback across source projection, derivation, and event insertion.

_Source: [PostgreSQL Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)._

_Confidence: High._

### Scalability and Performance Pattern

Current scale does not require horizontal service decomposition. The measured account scan completed 345 order requests in 84.95 seconds and a catalog/assignment scan in 13.25 seconds. Vercel's current 300-second Hobby ceiling provides execution headroom, but the architecture must optimize for interruption and upstream rate limiting rather than maximum request duration.

The bounded worker should claim a small batch, persist each attempt, respect lease/receipt generations, and stop before the platform limit. PostgreSQL coordinates overlapping Cron invocations; no in-process singleton or global variable is trusted because Fluid Compute can process concurrent invocations in shared instances.

Read performance comes from database views/RPCs and supporting indexes selected by implementation stories. No client-side aggregation, broad Booqable fan-out during page render, or cache-as-authority is introduced.

_Sources: [Vercel Fluid Compute](https://vercel.com/docs/fluid-compute); [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs/quickstart)._

_Confidence: High._

### Integration and Communication Pattern

The versioned envelope is the seam that prevents independent callers choosing incompatible semantics. It separates:

- transport version from semantic schema version;
- resource state (`known`, `unknown`, `removed`) from transport omission;
- complete from partial relationship scope;
- source component versions from worker attempt fencing;
- current source watermark from materialized Workshop derivation watermark.

`order_graph` is the only input that may derive memberships/tasks. Catalog/resource batches can update admitted source facts and create affected-order debt, but they cannot directly mutate Workshop lifecycle. This preserves one causal root for task creation and invalidation.

### Security Architecture Pattern

Supabase documents that views normally execute with creator privileges and that PostgreSQL 15+ `security_invoker` views can respect underlying RLS. It also warns that `SECURITY DEFINER` functions must not live in exposed schemas and must use a fixed secure `search_path`. PostgreSQL additionally grants new functions to `PUBLIC` by default unless privileges are revoked.

The spine's capability model is therefore appropriate, with one refinement for implementation:

1. use `security_invoker` read views where ordinary RLS is sufficient;
2. place internal definer functions in an unexposed schema;
3. set `search_path = ''` and schema-qualify every object;
4. revoke `PUBLIC` execution in the same migration transaction;
5. grant only exposed thin wrappers to API roles;
6. prove denial and allowed behavior as each effective API role.

The existing broad baseline grants do not by themselves prove exposure because RLS may still deny rows, but they enlarge the blast radius of any missing/incorrect policy. Workshop migrations must set locked default privileges for their owner roles rather than inheriting broad defaults.

_Sources: [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security); [Supabase Database Functions](https://supabase.com/docs/guides/database/functions); [PostgreSQL CREATE FUNCTION security](https://www.postgresql.org/docs/current/sql-createfunction.html)._

_Confidence: High._

### Data Architecture Pattern

Normalized current state plus append-only attributable events remains preferable to event sourcing:

- operational screens query current state directly;
- transitions validate one authoritative aggregate under lock;
- historical evidence is immutable and independently inspectable;
- no replay engine is required to recover ordinary state.

Source identity is retained even when source rows are archived. Generic relationship absence cannot delete or terminally close history. Terminal correction uses linked successor entities rather than mutating false historical terminal facts.

The allowlist and Setup mapping are configuration contracts, not code constants:

- allowlist versions contain approved ProductGroup UUIDs and provenance;
- mapping versions contain stable Booqable field/resource identifiers and normalization rules;
- changes run disabled impact analysis and enqueue affected order refreshes;
- labels never become runtime keys.

### Deployment and Operations Architecture

The existing Git-driven two-environment path remains valid. Remote DDL stays CI-only. The safe sequence is:

1. contain secret logging and the service-role sandbox route;
2. upgrade/pin the technology baseline and add local tests;
3. expand source/inbox/incident structures and disabled derivation;
4. switch every existing source writer and recovery caller;
5. revoke legacy DML;
6. build dependent Workshop callers;
7. prove staging in disabled/shadow mode;
8. deploy production disabled, prove privileges/freshness, then pilot explicitly.

Emergency disable must always remain available. Activation is positive evidence, not merely the absence of observed errors.

---

## Implementation Approaches and Technology Adoption

### Technology Adoption Strategy

Use expand → prove → switch → contract rather than a big-bang replacement. The integration foundation and the Next.js upgrade should be independently releasable changes because combining framework migration, privilege redesign, and source ingestion would make failures difficult to isolate.

The Next.js path should follow the official version guides from 14 → 15 → 16, using version-matched codemods but reviewing every mechanical change. Next.js 16 also moves to React 19 and async request APIs, so the upgrade story must verify third-party compatibility and should not be hidden inside Workshop implementation.

_Sources: [Next.js 15 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-15); [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16); [Next.js codemods](https://nextjs.org/docs/app/guides/upgrading/codemods)._

### Development Workflow and Tooling

Pin source-controlled tools before generating migrations or fixtures:

- add exact stable Supabase CLI version as a dev dependency and lock it;
- update CI to use the lockfile-resolved CLI or the same explicit version;
- pin Node 24.x in `package.json` and CI;
- record the selected supported Next.js/React versions after compatibility proof.

Create new migrations through the pinned local CLI. Apply and test them only against the local stack. Staging and production remain GitHub Actions/CI-only.

Vercel Cron should invoke one protected worker route. Vercel documents `CRON_SECRET` as a bearer token automatically added to scheduled requests; the handler must reject missing/mismatched authorization. The header authenticates invocation but does not replace database leases, because overlapping or repeated Cron calls remain possible.

_Sources: [Supabase setup-cli](https://github.com/supabase/setup-cli); [Vercel — Securing Cron jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)._

### Testing and Quality Assurance

Supabase officially supports pgTAP tests under `supabase/tests` through `supabase test db` and documents CI execution. The minimum test package is:

**Adapter fixtures**

- ProductGroup allowlist include/exclude/unmapped;
- single-quantity unknown → exact assignment;
- multi-quantity partial/exact assignment without ordinal identity;
- Planning reserved/partial-start/full-start/partial-stop/full-stop;
- explicit Planning and StockItemPlanning archive;
- absent child with no tombstone remains open and records incident;
- sparse/partial relationship never closes;
- unsupported schema/unknown field fails closed.

**Database tests**

- envelope schema/result vocabulary;
- component version-vector comparator branches;
- source/derivation atomicity and disabled debt;
- membership/task cardinality and incarnation;
- lifecycle transition matrix and unconditional FR-3 unassignment;
- current evidence/revision guards;
- append-only event restrictions;
- role-by-role reads, RPC execution, and forbidden direct DML.

**Multi-session tests**

- concurrent task claims;
- overlapping order ingestion;
- checklist activation versus snapshot selection;
- expired worker lease versus late completion.

_Sources: [Supabase Database Testing](https://supabase.com/docs/guides/database/testing); [Supabase CLI testing and linting](https://supabase.com/docs/guides/local-development/cli/testing-and-linting)._

### Deployment and Operations Practices

Environment proof should produce durable evidence, not screenshots alone:

- exact deployed commit, Node, Next.js, Supabase CLI, PostgreSQL, and extension versions;
- migration history parity;
- role privilege fixture results;
- source scan coverage and gap counts;
- accepted/no-op/quarantined/rejected attempt counts;
- receipt lag and last successful reconciliation;
- blocking incident list scoped to activation cohort;
- two stable complete disabled sweeps before enablement.

Staging extension verification currently remains open because repeated read-only queries timed out. Retry during the environment-proof story and stop activation if the connection or required extension inventory cannot be verified.

### Team Organization and Skills

One engineer can implement the system if decisions remain centralized in versioned contracts and fixtures. Required review skills are:

- PostgreSQL transactions, locking, functions, ownership, and RLS;
- JSON:API relationship normalization and source-version comparison;
- Next.js App Router/server action/auth migration;
- failure-recovery and privilege-test interpretation.

Business input is narrow but mandatory: approve actual bike ProductGroup UUIDs and confirm whether broad Setup revalidation is acceptable when stable category mapping cannot be proven. AI or analyst inference cannot substitute for those approvals.

### Cost and Resource Management

No new paid infrastructure is required for the architecture. PostgreSQL stores a bounded projection and operational state; Vercel Functions perform bounded I/O workers. Retention compacts old successful/failed attempt details while preserving aggregate outcome, first/latest failure, provenance, and audit references.

The principal cost risk is engineering complexity, not storage or compute. Keeping one projection, one ingestion coordinator, and no broker/warehouse minimizes recurring ownership.

### Risk Assessment and Mitigation

**Fabricated unit identity**
: Mitigated by incident-only handling for ambiguous multi-quantity units and exact StockItem-backed enrollment.

**Wrong selective invalidation**
: Mitigated by stable-ID Setup mapping fixtures or broad review re-scope; labels never classify.

**Silent source deletion**
: Mitigated by explicit-tombstone-only closure and preserved history.

**Stale assignment after reactivation**
: Mitigated by unconditional clear and normal reclaim.

**Security privilege escape**
: Mitigated by containment first, non-login owner/capability roles, unexposed definer functions, locked default privileges, and effective-role tests.

**Framework migration regression**
: Mitigated by a separate 14 → 15 → 16 compatibility sequence and route/auth/build fixtures before Workshop activation.

**Worker interruption or duplicate invocation**
: Mitigated by durable receipts/intents, lease generations, bounded attempts, idempotent ingestion, and checkpoints.

## Technical Research Recommendations

### Implementation Roadmap

1. **Product/document closure**
   - amend FR-1 for ambiguous multi-quantity lines;
   - amend FR-3 to unconditional unassignment;
   - approve actual ProductGroup UUID allowlist;
   - choose stable Setup mapping proof or broad-review re-scope.
2. **Security and technology containment**
   - stop webhook secret logging;
   - remove/guard sandbox service-role route;
   - apply Supabase SSR cache headers;
   - upgrade Next.js, pin Node and Supabase CLI;
   - verify database/extension parity.
3. **Integration contract and fixtures**
   - version the envelope, allowlist, mapping, comparator, events, and task-context contracts;
   - capture redacted Booqable lifecycle/archive fixtures;
   - implement source projection, inbox, attempts, checkpoints, incidents, and disabled derivation.
4. **Cutover and privilege contract**
   - route existing writers and recovery through one coordinator;
   - prove compatibility consumers;
   - revoke legacy DML and run API-role tests.
5. **Dependent Workshop implementation**
   - build task schema/RPCs/read models/actions/UI only after identity, lifecycle, and mapping contracts are bound.
6. **Environment proof and activation**
   - local reset/tests;
   - staging disabled/shadow proof;
   - production disabled proof;
   - explicit pilot cohort;
   - general enablement only after stable sweeps and no scoped blocking incidents.

### Technology Stack Recommendations

- Next.js 16.x Active LTS, subject to successful 14 → 15 → 16 compatibility proof; use 15.x Maintenance LTS only as a temporary staged landing.
- Node.js 24.x pinned.
- Existing TypeScript 5.9/PostgreSQL 17/Supabase/Vercel architecture retained.
- Exact tested stable Supabase CLI pinned; 2.113.0 is the current stable candidate found in this research, not an automatic mandate if a later stable version is tested.
- Ordinary Node.js Fluid Compute; no Edge runtime requirement.

### Success Metrics and Gates

- zero guessed multi-unit memberships;
- every expected-but-unidentified unit represented by a deduplicated incident;
- 100% of enrolled bike groups covered by an approved allowlist version;
- 100% of automated targeted invalidations backed by stable-ID fixtures;
- no generic absence closes a child;
- FR-3 reactivation fixtures always return unassigned;
- all comparator branches fixture-covered;
- privilege tests pass for `anon`, `authenticated`, and `service_role`;
- no API role has direct authoritative source/task-event DML;
- two stable complete disabled sweeps before enablement;
- no active scoped blocking security/derivation incident at pilot or general activation.

---

## Research Synthesis

### Executive Summary

The Workshop architecture is technically sound, but “resolving a blocker” has two distinct meanings. This research resolves every open architectural ambiguity with a safe, testable rule. It does not claim production readiness: business approval, account fixtures, security fixes, framework migration, privilege tests, and environment proof still have to be implemented.

Two source-shape questions close through deliberate re-scope. Ambiguous units on a multi-quantity line do not receive fabricated ordinal identities; only exact StockItem-backed units create memberships/tasks, while the shortfall becomes a visible integration incident. Relationship absence never closes a child in v1; only explicit validated archive/tombstone evidence may do so.

FR-3 closes by aligning product behavior to the adopted architecture: cancellation/removal always clears assignment because v1 has no enforceable presence lease. Classification remains stable-ID and business-approved. Planning/OrderFulfillment provides documented per-unit pickup/return semantics, but account fixtures are required before automation. Setup Category selective invalidation requires stable-ID mapping fixtures; otherwise v1 uses broad configuration review. The technology baseline is viable but not yet passed: Next.js 14 is unsupported, Supabase SSR cache headers are dropped, CLI/Node are not source-pinned, privilege tests are absent, a supplied webhook secret is logged, and a service-role sandbox route is unguarded.

### Key Findings

- The transactional modular monolith remains the correct architecture.
- Booqable can identify assigned physical bikes exactly, but cannot identify every unspecified unit of a multi-quantity Planning.
- Public JSON:API/Booqable semantics do not prove parent-version advancement on silent child removal.
- ProductGroup UUID is the correct classification key; the current candidate list is not approved and its evidence IDs are hashed.
- Planning `started`, `stopped`, and status plus StockItem assignment support per-bike lifecycle normalization after account fixtures.
- No prior evidence establishes stable Setup Category fields.
- Vercel is currently configured for Node.js 24 and documents 300-second Hobby Fluid Compute duration.
- PostgreSQL 17 is supported and reported in both Supabase environments; staging extension verification timed out.

### Technical Recommendations

1. Adopt the exact-StockItem/incident-only FR-1 re-scope.
2. Align FR-3 to unconditional unassignment.
3. Approve an actual ProductGroup UUID allowlist and choose stable Setup mapping or broad-review re-scope.
4. Make explicit tombstones the only v1 closure authority.
5. Complete security containment and the supported/pinned technology baseline before integration foundation work.
6. Keep dependent Workshop task decomposition blocked until the documentary decisions and named source fixtures are committed.

## Table of Contents

1. [Research Overview](#research-overview)
2. [Technical Research Scope Confirmation](#technical-research-scope-confirmation)
3. [Technology Stack Analysis](#technology-stack-analysis)
4. [Integration Patterns Analysis](#integration-patterns-analysis)
5. [Architectural Patterns and Design](#architectural-patterns-and-design)
6. [Implementation Approaches and Technology Adoption](#implementation-approaches-and-technology-adoption)
7. [Research Synthesis](#research-synthesis)
8. [Activation Blocker Closure Register](#activation-blocker-closure-register)
9. [Ready-to-Apply Document Amendments](#ready-to-apply-document-amendments)
10. [Verification and Activation Checklist](#verification-and-activation-checklist)
11. [Source Verification and Limitations](#source-verification-and-limitations)
12. [Technical Research Conclusion](#technical-research-conclusion)

## Activation Blocker Closure Register

### 1. Multi-quantity FR-1

**Research classification:** Resolved by safe product/architecture re-scope.

**Decision:** Never manufacture a unit ordinal. A single-quantity line may use the provisional discriminator `single`. A multi-quantity line creates a membership/task only for each exact assigned StockItem. If Planning quantity exceeds exact distinct assignments, create/update one deduplicated integration incident carrying expected, exact, and unknown counts. Later exact assignments may create the missing physical memberships; an unresolved unknown may not.

**Why:** Booqable documents that a Planning can have fewer StockItemPlannings than quantity. Existing evidence confirms this at material scale. No source-backed identity exists for each unspecified unit.

**Remaining activation work:** amend FR-1 and bind fixtures for assignment, partial assignment, remap, removal, replacement, and re-add. No task-creation decomposition proceeds before the amendment.

### 2. FR-3 source alignment

**Research classification:** Resolved by adopted architecture decision; PRD alignment required.

**Decision:** Cancellation or bike removal always clears assignment atomically. Valid reactivation preserves safe progress/evidence, reconciles current intent, and returns unassigned. “Same mechanic still actively working” is removed from v1.

**Why:** No lease, heartbeat, or other enforceable presence proof exists. `In Prep`, a recent save, or an open session is not continuous physical-work presence.

**Remaining activation work:** amend FR-3 and its acceptance fixtures. A presence lease can be reconsidered only as a separately approved feature.

### 3. Classification and lifecycle mapping

**Research classification:** Resolved subject to explicit approval and named account fixtures.

**ProductGroup decision:** use a versioned allowlist of actual ProductGroup UUIDs. Labels are never runtime keys. The 13 analyst-candidate groups and three exclusions are inputs to business review, not approval.

**Lifecycle decision:** normalize each exact bike unit from its Planning/StockItem context. Documented counters support assigned/not-started, started/not-stopped, and stopped. Order status is context, not the sole per-bike phase.

**Setup decision:** targeted category invalidation activates only for fixture-backed stable Booqable identifiers and normalized values. If any category cannot meet that bar, v1 uses broad `review_updated_configuration` for relevant changes rather than label matching.

**Remaining activation work:** approve the UUID allowlist; capture redacted reserved/partial/full start/stop fixtures; capture stable mappings for all five categories or approve broad-review re-scope.

### 4. Absence authority

**Research classification:** Resolved by safe architecture re-scope.

**Decision:** generic absence does not close a line, Planning, StockItemPlanning, membership, or task in v1, even when the transport relationship is complete. Closure requires explicit validated `archived`/`archived_at`, a documented tombstone, or another fixture-proven explicit removed state fetched through the canonical adapter.

**Why:** JSON:API empty linkage proves the current response's represented relationship, not source-version causality. Booqable documents explicit archive behavior but does not guarantee parent `updated_at` advancement for every child removal.

**Remaining activation work:** fixture explicit Planning and StockItemPlanning archive paths. Silent absence must retain/open an incident and may never terminally mutate history.

### 5. Technology and security baseline

**Research classification:** Requirements resolved; implementation/proof outstanding.

**Decisions:**

- migrate to a supported Next.js LTS, preferring 16.x after compatibility proof;
- pin Node.js 24.x;
- pin one tested stable Supabase CLI;
- apply Supabase SSR-provided cache headers during token refresh;
- retain PostgreSQL 17 and verify extension parity;
- redact webhook authentication failures;
- remove or protect the service-role sandbox route;
- prove capabilities with local role fixtures and multi-session tests.

**Remaining activation work:** all listed changes and tests. The current code is not activation-ready.

## Ready-to-Apply Document Amendments

These amendments are recommendations for the owning product/architecture workflow. This research run intentionally does not edit the source PRD or Architecture Spine.

### PRD FR-1 replacement

> When a Booqable order becomes reserved, the system must reconcile independently addressable Bike Tasks for the physical bikes that Booqable identifies on each bike line. A quantity-one bike line may create one provisional Bike Task in Waiting for Bike ID before its StockItem is known. A multi-quantity line creates one Bike Task per exact distinct StockItem assignment; the system must not create indistinguishable provisional per-unit tasks from quantity, array position, title, or a generated ordinal. When planned quantity exceeds exact assignments, the system exposes a deduplicated integration incident with expected, identified, and unknown counts. Later exact assignments create the missing Bike Tasks without recreating existing tasks.
>
> **Additional testable consequences:**
> - repeated reconciliation cannot create duplicate Bike Tasks for an exact StockItem;
> - an unknown multi-unit shortfall is visible but not claimable workshop work;
> - replacement, removal, and re-add preserve incarnation/history rules;
> - no runtime identity depends on line title or ProductGroup label.

### PRD FR-3 replacement consequence

Replace:

> clears prior active assignment unless the same mechanic is still actively working it.

With:

> atomically clears active assignment. If the same order and eligible physical bike returns to an actionable source state, the system preserves the task's safe prior stage and evidence, reconciles current Booqable intent, selectively reopens changed required work, and returns the task unassigned for an ordinary claim. First release does not infer mechanic presence from an open screen, session, stage, or recent save.

### PRD/addendum Setup mapping amendment

> Category-level selective invalidation may activate only for Setup Categories whose Booqable source field or related resource is identified by a stable, account-approved identifier and covered by redacted fixtures for null, unknown, changed, and removed values. Display labels are not mapping keys. If any relevant change cannot be mapped safely, the system creates or advances the built-in broad `review_updated_configuration` requirement instead of guessing a target category. Missing stable mapping blocks targeted invalidation, not all Workshop task execution.

### Architecture AD-5 amendment

Replace the open multi-quantity condition with:

> Single-quantity lines may use `single` while physical identity is unknown. Multi-quantity lines admit memberships only for exact distinct StockItem assignments; the stable source unit discriminator is the physical StockItem external ID, while Planning and StockItemPlanning IDs remain observations. A quantity shortfall creates one deduplicated integration incident and no guessed membership/task. The incident resolves only when exact assignments cover the expected units or the authoritative planned quantity decreases through accepted explicit source evidence.

### Architecture AD-4 absence amendment

> In v1, absence never closes a source child or Workshop membership, including absence from a transport-complete relationship. Closure requires an explicit validated archive/tombstone or another separately fixture-proven explicit removed state. Complete absence may update observation metadata and incidents but cannot perform terminal domain mutation.

### Architecture AD-13 Setup/lifecycle amendment

> Targeted Setup Category invalidation is enabled per mapping version only when every active category uses stable approved Booqable identifiers and fixture-backed normalization. Otherwise relevant changes use the broad built-in configuration-review requirement. Per-bike pickup/return phase uses exact Planning/StockItem context and remains `unknown` until reserved, partial/full start, partial/full stop, cancellation, removal, and re-add fixtures pass for the target account.

### Architecture Open Activation Blockers replacement

> - **FR-1 documentary closure:** adopt exact-StockItem-only membership for multi-quantity lines and incident-only unknown shortfall; amend the PRD before dependent task decomposition.
> - **FR-3 documentary closure:** amend the PRD to unconditional unassignment after cancellation/removal; no v1 presence lease.
> - **Business/configuration approval:** approve an actual ProductGroup UUID allowlist and either stable-ID fixtures for all five Setup Categories or broad-review re-scope.
> - **Account lifecycle proof:** fixture per-bike Planning/StockItem reserved/start/stop/removal/re-add semantics before automated pickup/Return activation.
> - **Technology/security implementation:** complete containment, supported/pinned runtime/tooling, SSR headers, environment parity, privilege tests, disabled shadow proof, and pilot gates.
>
> Generic absence authority is closed by explicit-tombstone-only v1 semantics and is no longer an activation research question.

## Verification and Activation Checklist

### Product and contract

- [ ] FR-1 amendment approved and committed.
- [ ] FR-3 amendment approved and committed.
- [ ] Actual ProductGroup UUID allowlist approved with version/provenance.
- [ ] Stable Setup mapping fixtures approved, or broad-review re-scope approved.
- [ ] Event and task-context catalogues versioned.

### Booqable adapter

- [ ] Single-quantity unknown and exact assignment fixtures pass.
- [ ] Multi-quantity partial/exact assignment fixtures pass without ordinals.
- [ ] Reserved, partial/full started, partial/full stopped fixtures pass.
- [ ] Explicit Planning and StockItemPlanning archive fixtures pass.
- [ ] Silent absence retains state and incident.
- [ ] Partial/sparse responses never close data.
- [ ] Unsupported/equal-conflict/older component branches quarantine or reject correctly.

### Security and database

- [ ] Rejected webhook authentication logs no supplied secret.
- [ ] Sandbox service-role route removed or strongly authenticated and least-privileged.
- [ ] Internal definer functions are unexposed, fixed-path, and selectively executable.
- [ ] Direct source/event DML revoked after caller cutover.
- [ ] `anon`, `authenticated`, and `service_role` fixtures prove allowed and denied paths.
- [ ] Concurrent claim and lease tests use separate database sessions.
- [ ] Local reset, pgTAP, lint, and generated type checks pass with pinned CLI.

### Technology and environments

- [ ] Supported Next.js/React build and route/auth fixtures pass.
- [ ] Node.js 24.x pinned in source and CI.
- [ ] Tested stable Supabase CLI pinned in source and CI.
- [ ] Supabase SSR refresh response applies `private, no-store` cache headers.
- [ ] Local, staging, and production PostgreSQL/extension manifests match.
- [ ] Staging extension query succeeds; prior timeout is resolved/explained.
- [ ] Vercel worker route validates Cron bearer authorization.

### Activation

- [ ] Existing writers and recovery entrypoint use the coordinator.
- [ ] Legacy DML contract completed.
- [ ] Disabled derivation preserves debt and never creates tasks.
- [ ] Two stable complete disabled sweeps recorded.
- [ ] Every enrolled order materialized at the enable boundary.
- [ ] No scoped blocking security/derivation incident.
- [ ] Pilot cohort and rollback/repair procedure approved.
- [ ] General activation and paper retirement remain separate decisions.

## Source Verification and Limitations

### Primary current sources

- [Booqable API v4](https://developers.booqable.com/v4.html)
- [JSON:API Specification v1.1](https://jsonapi.org/format/)
- [Next.js Support Policy](https://nextjs.org/support-policy)
- [Next.js 15 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-15)
- [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Vercel function duration](https://vercel.com/docs/functions/configuring-functions/duration)
- [Vercel Cron security](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [Supabase SSR advanced guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase database functions](https://supabase.com/docs/guides/database/functions)
- [Supabase database testing](https://supabase.com/docs/guides/database/testing)
- [Supabase CLI installation/pinning](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [PostgreSQL versioning policy](https://www.postgresql.org/support/versioning/)
- [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [PostgreSQL function security](https://www.postgresql.org/docs/current/sql-createfunction.html)

### Repository and observed evidence

- final Workshop Architecture Spine and reviewer gates;
- finalized PRD and addendum;
- completed Booqable selective-projection spike;
- `live-evidence.json`, `catalog-evidence.json`, and local projection proof/results;
- package/lock files, Supabase configuration/migrations, workflows, middleware, webhook, and sandbox route;
- connected Vercel project/deployment metadata;
- Supabase project metadata and production extension inventory.

### Limitations

- No Booqable mutation was performed; removal behavior was not experimentally induced.
- Evidence artifacts redact actual ProductGroup UUIDs, so business approval requires a credential-safe local listing.
- Setup Category fields were not captured in the previous spike.
- Planning lifecycle counters/status were documented publicly but not retained in account fixtures.
- Staging extension reads timed out repeatedly.
- No source architecture, PRD, code, migration, workflow, Vercel, Booqable, or remote Supabase state was changed.

## Future Technical Outlook

The recommended v1 rules leave controlled extension points:

- a future presence lease can reintroduce assignment retention only with explicit heartbeats/expiry and product approval;
- stable Setup mappings can replace broad review one category/version at a time;
- Booqable confirmation or stronger tombstone/version contracts can allow narrower automated closure without rewriting history;
- a later ProductGroup reclassification workflow can support new bike models through disabled impact analysis and explicit enrollment.

None requires a new service boundary. The versioned contracts and incident-first uncertainty model allow incremental proof without weakening current safety.

## Technical Research Conclusion

The open Workshop architecture questions are resolvable without inventing upstream guarantees or adding infrastructure. The core decision is to make uncertainty visible rather than turn it into false physical-bike identity or destructive source interpretation.

The architecture can proceed to product-document closure and integration-foundation decomposition once FR-1/FR-3 are amended, the ProductGroup/Setup choices are approved, and lifecycle fixtures are named. Production activation remains blocked until the technology/security changes, privileges, environment proof, disabled sweeps, and pilot gates are actually completed.

**Technical Research Completion Date:** 2026-08-12  
**Research Period:** Current comprehensive analysis  
**Source Verification:** Current official documentation, repository evidence, GET-only account evidence, local executable proof, and read-only platform metadata  
**Technical Confidence:** High for adopted safe re-scopes and platform baseline; medium for account lifecycle mapping; low for Setup Category mapping until fixtures exist

---

_This report is the research authority for resolving the Workshop Architecture Spine's open activation blockers. It recommends amendments and gates; the owning PRD/architecture workflows remain responsible for committing those source-document changes._
