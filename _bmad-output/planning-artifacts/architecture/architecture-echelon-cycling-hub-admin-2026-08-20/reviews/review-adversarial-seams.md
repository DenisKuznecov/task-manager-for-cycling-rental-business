# Adversarial Seam Review — Architecture Spine

## Verdict

**NOT IMPLEMENTATION-SAFE.** The spine is strong at assigning invariants, but it does not bind the contracts between the units that must implement them. The pairs below can each be completed into a system that obeys every AD and the named companion contracts; however, the two units in each pair cannot interoperate without an additional decision. Every such pair is therefore a specification hole, not merely an implementation preference.

## Method

For each seam, two plausible units were designed independently one level below the architecture decisions. A pair qualifies only when neither side contradicts an AD, both preserve the stated invariant in their own design, and integration still fails or changes observable behavior. The required remedy is a shared contract, not a recommendation to choose either member of the pair.

## Findings

### Normalized source snapshot has no canonical envelope

- **Location:** AD-1, AD-2; Structural Seed — Source synchronization
- **Trigger condition:** The Booqable adapter and source-apply port are implemented from the prose without sharing a concrete snapshot schema.
- **Compliant unit A:** The adapter emits one nested `NormalizedOrderSnapshot` containing order fields, lines, each line's stock assignments, add-ons, and a fingerprint. It validates all pages before constructing the value.
- **Compliant unit B:** The database port accepts a flat `SourceSnapshot` containing an order record plus independent `assignments[]` and `addOns[]` collections, also validated and fingerprinted before apply.
- **Why the pair is incompatible:** Both represent one complete normalized source revision, but field paths, cardinality, nullability, duplicate handling, and assignment-to-line linkage differ. Neither AD chooses one shape or defines a translation owner.
- **Guard snippet:** Publish `SourceOrderSnapshotV1` in the domain layer as a concrete TypeScript/Zod and SQL-facing contract, including required fields, null rules, collection semantics, and a saved end-to-end fixture consumed by adapter and database contract tests.
- **Potential consequence:** The adapter can pass its own tests and the source-apply function can pass its own tests while production reconciliation rejects valid snapshots or silently loses assignment/add-on relationships.

### Booqable ID text has two valid prefixed grammars

- **Location:** Consistency Conventions — IDs; AD-3
- **Trigger condition:** Independent units implement “text with a `booqable_` prefix” without exact examples for each resource.
- **Compliant unit A:** The adapter emits `booqable_order_<upstream-id>` and `booqable_stock_item_<upstream-id>` so resource kind is encoded in the value.
- **Compliant unit B:** The persistence port expects `booqable_<upstream-id>` and relies on the destination column to provide resource kind.
- **Why the pair is incompatible:** Every value is text and begins with `booqable_`, but the same upstream identity produces different keys, so set differences and uniqueness checks no longer agree.
- **Guard snippet:** Define one exact ID grammar with examples for order and stock-item IDs, state which boundary applies the prefix, and require round-trip tests proving that normalization is idempotent.
- **Potential consequence:** Replays create duplicate local identities, retained assignments appear removed and re-added, or the unique task key fails to match its source assignment.

### Fingerprint production and verification have no owner

- **Location:** AD-2; Consistency Conventions — Concurrency
- **Trigger condition:** The adapter computes the normalized fingerprint while PostgreSQL independently verifies or recomputes it.
- **Compliant unit A:** The adapter sorts normalized collections, serializes canonical JSON, calculates SHA-256, and sends the digest to source apply.
- **Compliant unit B:** The source-apply function treats the payload as authoritative normalized data and recomputes a digest from PostgreSQL `jsonb` serialization before storing it.
- **Why the pair is incompatible:** Both calculate a fingerprint from normalized source fields, but key ordering, array ordering, numeric formatting, omitted nulls, and digest encoding can differ. The spine does not say whether PostgreSQL must trust, verify, or produce the fingerprint.
- **Guard snippet:** Assign canonicalization and digest production to one boundary; specify the exact field set, ordering, serialization, algorithm, and encoding, and provide golden payload/digest vectors for TypeScript and PostgreSQL.
- **Potential consequence:** Identical snapshots are repeatedly treated as changes, valid applies fail verification, or distinct source revisions collapse to one digest.

### Current source projection has two incompatible ownership models

- **Location:** AD-1, AD-2, AD-8; Core data ownership
- **Trigger condition:** Schema and read-model work proceed independently from source-apply work.
- **Compliant unit A:** Source apply owns replace-in-place `orders`, `order_items`, and assignment rows; missing rows are deleted inside the snapshot transaction, and read models query those current tables directly.
- **Compliant unit B:** Source apply owns immutable projection revisions with `valid_from`/`valid_to`; a `current_*` view exposes the latest revision and preserves source history.
- **Why the pair is incompatible:** Both atomically expose exactly one current source revision and keep task history separate, but their table names, row lifecycle, keys, and read paths are mutually exclusive. The ownership diagram names entities, not their write/read contract.
- **Guard snippet:** Declare the source projection tables and views, row lifecycle for disappeared records, writer ownership, stable keys, and the only supported read surface.
- **Potential consequence:** A reconciler can write a valid projection that the task detail and queue views cannot read, or a read model can surface stale add-ons that its writer considers superseded.

### Checklist version selection is undefined

- **Location:** AD-4; Checklist Contract — Preparation Definitions
- **Trigger condition:** Multiple immutable versions of a checklist exist after a migration.
- **Compliant unit A:** Definitions use `(catalog_code, integer_version)` and task creation selects `max(version)` for the mapped tag.
- **Compliant unit B:** Every immutable definition has a UUID and an explicit tag-to-active-definition mapping updated by migrations; task creation follows the mapping.
- **Why the pair is incompatible:** Both are immutable and versioned, but the task-creation command written for one schema cannot select from the other. They can also select different definitions when an older definition is intentionally reactivated.
- **Guard snippet:** Specify definition identity, version type, uniqueness, activation mechanism, and the exact SQL selection rule used by task creation.
- **Potential consequence:** New tasks attach the wrong checklist revision or task creation fails immediately after the second checklist migration.

### Checklist snapshot row shape is not bound

- **Location:** AD-4, AD-7; Core data ownership
- **Trigger condition:** Migration authors and task-command authors independently interpret “copy into task item rows.”
- **Compliant unit A:** One `bike_task_items` table stores both phases using a `stage` discriminator, copied labels/rules/order, outcome columns, and optional definition provenance.
- **Compliant unit B:** Preparation and storage snapshots live in separate tables with stage-specific columns; copied rows deliberately have no foreign key to live definitions.
- **Why the pair is incompatible:** Both preserve immutable task-local work and never read live definitions, but commands, uniqueness constraints, and read DTOs built for one row model cannot operate on the other.
- **Guard snippet:** Publish the task-item snapshot schema, mandatory copied fields, phase representation, provenance policy, unique key, and outcome columns; make every command consume that schema.
- **Potential consequence:** Storage completion reads no items, M2 cannot find its designated rows, or later definition edits leak into tasks through an unintended join.

### Late checklist attachment has no concurrency contract

- **Location:** AD-4, AD-5, AD-7; Consistency Conventions — Concurrency
- **Trigger condition:** A successful source sync attaches preparation items while a mechanic has an open `to_prepare` task.
- **Compliant unit A:** Source apply inserts the missing snapshot without changing `bike_tasks.version` or appending an event because status and history are unchanged.
- **Compliant unit B:** Task actions treat `version` as the revision of every task-visible mutation and assume checklist attachment increments it and appends `preparation_checklist_attached`.
- **Why the pair is incompatible:** The ADs permit late attachment and require expected-version checks, but do not say whether attachment participates in task versioning/history. Both policies preserve the named invariants in isolation.
- **Guard snippet:** Define an increment matrix for `bike_tasks.version`, whether late attachment appends an event, and the exact stale-client behavior when attachment races with **Start preparation**.
- **Potential consequence:** A stale tablet starts from an item set it never displayed, or a harmless sync invalidates an otherwise valid action with an unexplained stale-version error.

### Multiple recognized workshop tags have no selection rule

- **Location:** AD-4; Checklist Contract — Preparation Definitions
- **Trigger condition:** A Booqable product contains two recognized workshop-type tags.
- **Compliant unit A:** The adapter normalizes tags and deterministically selects the first recognized tag in lexical order.
- **Compliant unit B:** The application treats multiple recognized tags as an unmapped configuration and attaches no preparation checklist until corrected.
- **Why the pair is incompatible:** Both keep one checklist per task, never invent content, and block unsafe work, but they disagree on whether a checklist is mapped and therefore on whether preparation can start.
- **Guard snippet:** State the cardinality invariant for workshop tags and define exact behavior for zero, one, and multiple recognized tags, including the warning/error code.
- **Potential consequence:** The same bike is actionable in one build and blocked in another, or a later sync attaches a different checklist to the same `to_prepare` task.

### Add-on normalization has no canonical business identity

- **Location:** AD-2, AD-8; Checklist Contract — Add-ons
- **Trigger condition:** An order has duplicate lines, quantity changes, renamed labels, or the same add-on SKU on multiple lines.
- **Compliant unit A:** Add-ons are a sorted set of source line IDs with product ID, quantity, and display label; the fingerprint preserves each line.
- **Compliant unit B:** Add-ons are grouped by product/variant ID and fingerprinted as aggregate quantities, excluding mutable labels.
- **Why the pair is incompatible:** Both show and sign the current normalized add-ons, but they disagree on equality. A line split is a change to A and a no-op to B; a label-only edit may have the opposite treatment.
- **Guard snippet:** Define add-on classification, stable identity, grouping, quantity semantics, included display fields, duplicate behavior, and ordering before defining the digest.
- **Potential consequence:** M2 sees false refresh-and-confirm failures or, worse, confirms a revision that another unit considers materially different.

### Empty add-on state has no fingerprint representation

- **Location:** AD-8; Consistency Conventions — Action results and Concurrency
- **Trigger condition:** A task has no current add-ons.
- **Compliant unit A:** The empty normalized array has a real digest, and M2 must send that non-null digest.
- **Compliant unit B:** “No add-ons” is represented by `NULL`; M2 sends no fingerprint and the command compares null-safe equality.
- **Why the pair is incompatible:** Both verify the current empty revision, but the action DTO and SQL guard disagree on whether a fingerprint is required.
- **Guard snippet:** Define the canonical empty add-on payload and digest, make `expectedAddOnFingerprint` required or nullable explicitly, and add no-add-on golden tests.
- **Potential consequence:** Every no-add-on bike is blocked at M2, or an omitted fingerprint accidentally bypasses the revision check.

### Attestation storage explicitly permits two incompatible contracts

- **Location:** AD-8, AD-7
- **Trigger condition:** M2 command, audit history, and task-detail read model are developed independently.
- **Compliant unit A:** The attestation stores only the verified add-on fingerprint; historical display resolves the snapshot from immutable source projection revisions.
- **Compliant unit B:** The attestation stores only copied add-on JSON; historical display renders the copy and does not retain a digest.
- **Why the pair is incompatible:** AD-8 explicitly allows “snapshot or fingerprint.” A history reader designed for copied JSON cannot display A; an audit verifier designed for a digest cannot verify B.
- **Guard snippet:** Choose one representation or require both; define snapshot schema, digest linkage, retention guarantees, and the historical read contract.
- **Potential consequence:** Completed M2 attestations cannot be rendered or independently proven to match the revision the command accepted.

### “Same operation” does not identify the sync application boundary

- **Location:** AD-1, AD-10; Booqable Reconciliation — Triggers and Recovery
- **Trigger condition:** Manual-sync application flow and webhook route are built by different teams.
- **Compliant unit A:** The shared operation is `reconcileOrder(orderId, trigger)`, which acquires an order lease, fetches, and applies; the manual runner separately owns scan pagination and run progress.
- **Compliant unit B:** The shared operation is `runBooqableSync(syncRunId, trigger, optionalOrderId)`, which owns run records, page progress, and per-order reconciliation; a webhook creates a one-order run.
- **Why the pair is incompatible:** Both route manual and webhook work through one reconciler and one source writer, but their required inputs, transaction ownership, progress ownership, and return values do not meet.
- **Guard snippet:** Publish the application use-case signatures and explicitly assign ownership of run creation, scan pagination, order-lease acquisition, fetch, apply, and progress recording.
- **Potential consequence:** The webhook cannot invoke the runner without fabricating manual-run state, or manual sync bypasses the operation that webhook uses despite both implementations claiming compliance.

### Completed/cancelled skip semantics are ambiguous

- **Location:** AD-10; Booqable Reconciliation — Triggers and Recovery
- **Trigger condition:** Manual sync encounters a reserved order whose remote status and local task statuses differ.
- **Compliant unit A:** The scanner skips Booqable orders whose source status is completed or cancelled.
- **Compliant unit B:** The scanner fetches candidate source orders but skips any local order whose existing turnaround tasks are all `completed` or `cancelled`.
- **Why the pair is incompatible:** Both can reasonably implement “completed and cancelled orders are skipped,” but one uses source order lifecycle and the other local workflow lifecycle.
- **Guard snippet:** Name the exact status field and enum being filtered, state whether the rule is evaluated before or after fetch, and define behavior for a new assignment added to an order with terminal local tasks.
- **Potential consequence:** Manual recovery misses a newly assigned physical bike or repeatedly fetches remote orders the architecture intended to exclude.

### Resumable pagination has no durable cursor contract

- **Location:** AD-10; Structural Seed — Source synchronization
- **Trigger condition:** The Booqable client and sync-run persistence are implemented independently.
- **Compliant unit A:** The adapter exposes and persists Booqable's opaque `next` URL/token and resumes by replaying it.
- **Compliant unit B:** The run table stores numeric page, page size, and last order ID; the adapter reconstructs the next request.
- **Why the pair is incompatible:** Both provide resumable pages and can satisfy measured limits, but their cursor value, validity window, ordering assumptions, and restart API differ.
- **Guard snippet:** Define a versioned `SyncCursor` payload, who serializes it, whether it is opaque, its expiry/restart behavior, and the ordering guarantee required across resumes.
- **Potential consequence:** A resumed manual run restarts from page one, skips orders, duplicates work, or cannot decode persisted progress after an adapter change.

### Webhook completion semantics are unstated

- **Location:** AD-10, AD-12; Minimal source seed — webhook route
- **Trigger condition:** The webhook adapter and shared runner disagree on whether reconciliation completes within the request lifetime.
- **Compliant unit A:** The route authenticates the webhook, awaits the shared per-order operation, and returns success only after apply.
- **Compliant unit B:** The route authenticates, persists a deduplicated signal/run, starts resumable processing, and returns success before all pages are applied; no external queue service is introduced.
- **Why the pair is incompatible:** Both use the shared operation on Vercel without cron/polling/queue service, but one returns an apply result and the other returns an acceptance/run result. Retry and duplicate semantics differ.
- **Guard snippet:** Define webhook acknowledgement timing, permitted durable handoff mechanism on Vercel, timeout budget, duplicate key, retry response policy, and the route result contract.
- **Potential consequence:** Vercel terminates unawaited work, Booqable retries already-applied updates, or the route times out while the runner assumes it was durably accepted.

### Per-order lease tokens have no wire contract

- **Location:** AD-10; Consistency Conventions — Concurrency
- **Trigger condition:** Lease RPCs and the TypeScript runner are authored independently.
- **Compliant unit A:** `acquire_order_lease` returns an opaque UUID token plus `expiresAt`; source apply accepts that UUID.
- **Compliant unit B:** Lease acquisition returns a monotonically increasing fencing number scoped by order; source apply accepts `(orderId, fence)`.
- **Why the pair is incompatible:** Both serialize order work and carry a valid token through apply, but token type, scope, comparison, and acquisition result are incompatible.
- **Guard snippet:** Specify acquire/renew/release/apply SQL signatures, opaque token type, order/run binding, fencing semantics, and stable result/error codes.
- **Potential consequence:** Every apply is rejected as an invalid lease, or a runner coerces a token in a way that defeats stale-owner protection.

### Lease expiry and renewal have no handoff protocol

- **Location:** AD-10; Deferred — Sync numbers
- **Trigger condition:** A complete paginated fetch lasts longer than the measured lease duration.
- **Compliant unit A:** The runner periodically renews the same token and requires source apply to accept a renewed expiry.
- **Compliant unit B:** The database never renews; the runner must abandon the snapshot, acquire a new token/fence, and refetch from the beginning.
- **Why the pair is incompatible:** Either design can ensure that only a valid current lease applies a snapshot, but the runner for A will call an RPC B does not expose, while the runner for B discards work A expects to preserve.
- **Guard snippet:** Define lease duration ownership, renewal cadence/API, expiry clock, behavior on renewal loss, whether a fetched snapshot survives reacquisition, and cleanup/release idempotency.
- **Potential consequence:** Long orders fail forever, stale snapshots apply after lease turnover, or two runs each believe the other owns recovery.

### Task command surface can be generic or transition-specific

- **Location:** AD-5, AD-6; Capability → Architecture Map
- **Trigger condition:** Supabase migration and infrastructure adapter are implemented from “named transitions” and “narrow RPC entry points.”
- **Compliant unit A:** One narrow `command_task(task_id, expected_version, command_name, payload)` RPC dispatches a closed command enum and enforces every guard in PostgreSQL.
- **Compliant unit B:** Separate RPCs implement `start_preparation`, `complete_m1`, `complete_m2`, `mark_picked_up`, `mark_returned`, `start_storage`, and `complete_storage`.
- **Why the pair is incompatible:** Both keep all mutation and guards in PostgreSQL and expose only explicit commands, but the adapter's RPC names, argument payloads, generated types, and result decoding do not match.
- **Guard snippet:** List every public RPC name, argument order/type, authorization context, success payload, failure codes, and granted role.
- **Potential consequence:** The application compiles against mocked ports but cannot call the migration's actual RPCs, or it falls back to an overbroad compatibility wrapper.

### Task version increment semantics are missing

- **Location:** AD-5, AD-7; Consistency Conventions — Concurrency
- **Trigger condition:** Checklist-item commands and transition commands are interleaved from two tablets.
- **Compliant unit A:** Every successful item outcome, M2 verification, late checklist attachment, and transition increments `bike_tasks.version`.
- **Compliant unit B:** Item outcomes use row-level conflict checks, while `bike_tasks.version` increments only when status/attestation changes.
- **Why the pair is incompatible:** Both check an expected task version and prevent stale guarded transitions in their complete designs, but a client written for A refreshes after every tap while B returns an unchanged version; a client written for B sends versions A has already invalidated.
- **Guard snippet:** Define exactly which commands increment task version, whether increments occur once per transaction, the version returned on success, and how item-level concurrency participates.
- **Potential consequence:** Valid checklist taps are rejected, stale M2 completion is accepted, or users enter a refresh loop on a stand-mounted tablet.

### Checklist outcomes and M2 confirmations have no persistence shape

- **Location:** AD-7; Checklist Contract — M1 Interaction and M2 Interaction
- **Trigger condition:** Database command authors and task-detail DTO authors independently model the allowed outcomes.
- **Compliant unit A:** Each snapshot row has `m1_outcome`, `m1_psi`, and `m2_confirmed_at`; action and N/A are enum values, and PSI is a constrained numeric column.
- **Compliant unit B:** Each row has one stage-neutral `outcome jsonb` containing action/N/A/PSI plus a boolean M2 confirmation, with no author stored.
- **Why the pair is incompatible:** Both store only permitted outcomes, prohibit replacement PSI, and track no checkbox author, but command predicates and read serialization for one cannot consume the other.
- **Guard snippet:** Define the SQL columns/types/check constraints and domain DTO for action, N/A, PSI, and M2 confirmation, including unset values and precision/range.
- **Potential consequence:** M2 cannot prove it confirmed M1's PSI, required-item guards disagree with the UI, or invalid mixed outcomes become representable.

### Transition events lack a required payload contract

- **Location:** AD-5, AD-7; Core data ownership
- **Trigger condition:** Transition commands append events while an audit/read-model unit consumes them.
- **Compliant unit A:** Each event stores command name, `from_status`, `to_status`, actor snapshot, task version, and timestamp.
- **Compliant unit B:** Each event stores only event kind, actor ID, and timestamp; status history is inferred from the ordered event-kind sequence and current task.
- **Why the pair is incompatible:** Both append a task event for every transition and preserve immutable attestations, but A's history reader requires columns B never writes, while B's inference can misread A's source-invalidation event taxonomy.
- **Guard snippet:** Publish the event enum, mandatory payload/actor snapshot, version semantics, ordering key, and source-invalidation event shape.
- **Potential consequence:** Audit history cannot reconstruct responsibility or state, and cancellation may appear as a normal workflow action.

### Failure `code` is optional where callers need stable branching

- **Location:** AD-5, AD-8; Consistency Conventions — Action results
- **Trigger condition:** UI behavior depends on distinguishing stale version, add-on mismatch, invalid transition, authorization, and source invalidation.
- **Compliant unit A:** Actions return `{ ok: false, error }` for every expected failure and omit the optional code.
- **Compliant unit B:** UI and application logic branch on codes such as `STALE_VERSION`, `ADD_ON_MISMATCH`, and `TASK_CANCELLED`, using `error` only for display.
- **Why the pair is incompatible:** Both obey the documented discriminated result because `code` is optional, but B cannot reliably choose refresh, abandon-work, or ordinary inline-error behavior from A's result.
- **Guard snippet:** Make `code` required for expected failures, define a closed code enum and per-command mapping from SQL outcomes, and reserve `error` for user-facing detail.
- **Potential consequence:** The UI parses message text, shows the wrong recovery action, or treats a cancelled task as a retryable validation failure.

### Success payload is unconstrained

- **Location:** Consistency Conventions — Action results; AD-5
- **Trigger condition:** A successful checklist or transition command changes task version and possibly status.
- **Compliant unit A:** The action returns only `{ ok: true }` and relies on `router.refresh()` for authoritative state.
- **Compliant unit B:** The caller requires `{ ok: true, taskId, version, status }` to update its command token and decide whether to close the task panel before refresh.
- **Why the pair is incompatible:** The ellipsis in the convention permits both. Realtime being refresh-only does not specify the direct action response.
- **Guard snippet:** Define a result type per command, including whether new version/status are returned, and require the caller to use either the payload or refresh consistently.
- **Potential consequence:** The next tap uses a stale expected version, a successful action appears to fail, or the UI closes on an assumed transition that the server did not return.

### Queue buckets can be cumulative or disjoint

- **Location:** AD-9, AD-11
- **Trigger condition:** The read view and navigation UI independently interpret “Today, Tomorrow, and Next 7 days.”
- **Compliant unit A:** `next_7_days` is cumulative and includes today and tomorrow, using `[Madrid today, Madrid today + 7 days)`.
- **Compliant unit B:** `next_7_days` is the disjoint remainder after Today and Tomorrow, using days 2 through 7.
- **Why the pair is incompatible:** Both calculate all three requested queues in PostgreSQL from `starts_at` in `Europe/Madrid`, but counts, tabs, pagination, and row duplication differ.
- **Guard snippet:** Define exact inclusive/exclusive Madrid boundaries and whether queue membership is cumulative or mutually exclusive, with DST and midnight fixtures.
- **Potential consequence:** Bikes appear in multiple tables, disappear from the seven-day view, or dashboard totals disagree with manual-sync coverage.

### Queue read-model row grain and pagination are undefined

- **Location:** AD-9; Structural Seed — Core data ownership; Consistency Conventions — Read results
- **Trigger condition:** The PostgreSQL view and server loader are implemented independently.
- **Compliant unit A:** The view returns exactly one row per task with pre-aggregated add-ons/checklist counts; the loader returns `{ tasks, total, error }` and uses offset pages.
- **Compliant unit B:** The view returns one row per task-item/add-on join and the loader groups rows into tasks, returning `{ rows, nextCursor, error }`.
- **Why the pair is incompatible:** Both perform search, sort, filtering, and pagination in PostgreSQL and return data plus an error, but row multiplication changes page boundaries and the loader/result shapes do not match.
- **Guard snippet:** Publish the read DTO, one-row-per-what invariant, supported search/sort keys, stable tie-breaker, pagination mode, count semantics, and failure fallback.
- **Potential consequence:** Pages contain fewer tasks than requested, tasks repeat across pages, or the server fetches and groups large arrays contrary to the database-driven design.

### Sync-health “last successful” time has two valid meanings

- **Location:** AD-10; Capability → Architecture Map — CAP-10
- **Trigger condition:** A manual run partially succeeds before one order fails.
- **Compliant unit A:** Sync health reports the completion time of the latest fully successful manual run; partial runs do not advance it.
- **Compliant unit B:** Sync health reports the maximum successful per-order apply time, even when the containing run later fails.
- **Why the pair is incompatible:** Both persist progress, success times, completion, and clear failures, but the same persisted run produces different freshness claims and UI fields.
- **Guard snippet:** Define sync-health semantics for run-level and order-level success, partial failure, webhook applies, in-progress runs, and timezone/display formatting; publish the read DTO.
- **Potential consequence:** Staff are told data is current after an incomplete scan or are told it is stale despite recent successful reconciliations.

### Task-detail read model has no authoritative shape

- **Location:** AD-4, AD-7, AD-8, AD-9; Consistency Conventions — Realtime and Read results
- **Trigger condition:** The task page combines current source data, immutable task snapshots, attestations, and current workflow state.
- **Compliant unit A:** A single `security_invoker` detail view returns nested JSON for task, items, current add-ons, attestations, events, and current fingerprints.
- **Compliant unit B:** Separate RLS loaders fetch a one-row task view, task-item rows, current add-on rows, and history rows and assemble a typed DTO server-side.
- **Why the pair is incompatible:** Both keep PostgreSQL authoritative, use RLS reads, avoid client aggregation, and surface loader errors, but the page and loaders cannot share query names, error granularity, or consistency assumptions.
- **Guard snippet:** Choose the supported read ports and define the task-detail DTO, query consistency boundary, missing-task/error distinction, and whether partial sub-read failure is representable.
- **Potential consequence:** The page combines different database revisions, renders current add-ons beside stale fingerprints, or shows “not found” when one subordinate read failed.

## Closing Requirement

AD-13 should require seam contract tests in addition to boundary tests. At minimum, one golden complete source snapshot must pass adapter → application → source-apply; one checklist definition must pass migration → attachment → M1/M2/storage commands → detail read; and one manual plus one webhook trigger must pass route → shared operation → lease → apply → progress/read models. Without those executable seams, all owning-boundary test suites can be green while the implementation remains non-integrable.
