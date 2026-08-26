# Adversarial Review — Architecture Spine

## Verdict

**NOT IMPLEMENTATION-SAFE.** The adopted ADs pin many invariants, RPC names, queue windows, and result codes. They still do not pin the shared *shapes*, *single owners*, and *single mutation paths* that two independent build units would need. Each pair below can be implemented so that both units obey every written AD, yet the two units cannot integrate. Every pair is therefore an AD hole: close it with a new AD or a tightened rule, not by picking a preferred epic after coding starts.

## Method

For each finding, two units (epic- or story-sized) were designed one level below the spine. A pair qualifies only when:

1. Neither unit contradicts a written AD or consistency convention.
2. Each unit preserves the AD’s stated *prevents* clause inside its own design.
3. Joining the two units fails on a shared-data shape, dual ownership of one entity, or two legal mutation paths for the same state.

Closed holes from earlier spine drafts (instance identity vs cancelled uniqueness, required failure `code`, empty add-on fingerprint, cumulative Next 7 Days, listed staff RPCs, webhook-awaits-apply, UUID+fence leases, `SourceOrderSnapshotV1` *named*, checklist attachment incrementing version) are not re-filed unless a remaining ambiguity still splits builders.

## Findings

### Snapshot envelope topology is named, not specified

- **Hole type:** clashing shared-data shapes
- **Location:** AD-2; Shared contracts — `SourceOrderSnapshotV1`
- **Trigger condition:** The Booqable adapter story and the `booqable_apply_source_snapshot_v1` story are built from the envelope’s bullet list.
- **Compliant unit A — “Nested snapshot”:** `SourceOrderSnapshotV1` is `{ schemaVersion, fetchedAt, order, customer, lines: [{ ...line, assignments: [...], addOn?: ... }] }`. One complete validated fetch; assignments live under the line that owns the stock item.
- **Compliant unit B — “Flat collections”:** The same envelope is `{ schemaVersion, fetchedAt, order, customer, coupon, partner, items: [], addOns: [], assignmentInstances: [], sourceStatus }`. Assignments are a sibling array keyed by raw `stock_items.id`.
- **Why both obey every AD:** AD-2 requires one envelope after every page validates, listing those contents. It does not require a field tree, nullability, or whether an assignment is nested under a line.
- **Why they cannot integrate:** Apply’s SQL `jsonb` paths, uniqueness of assignments, and “ordered assignment instances” cardinality disagree. Adapter fixtures are valid for A and rejected or silently mis-joined by B.
- **AD to add/tighten:** Publish `SourceOrderSnapshotV1` as a versioned Zod/SQL contract (required fields, types, null rules, collection order, duplicate policy) plus one golden fixture both adapter and apply tests must consume.

### Add-on normalization has two legal owners

- **Hole type:** two owners of one entity
- **Location:** AD-2 (“normalized add-ons” on the envelope); AD-8 (“PostgreSQL owns add-on normalization”)
- **Trigger condition:** Adapter authors treat the envelope as already-normalized; command authors treat envelope add-ons as raw input.
- **Compliant unit A — “Adapter normalizes”:** After paging, the adapter classifies lines, emits canonical `addOns[]`, and apply fingerprints that JSON with the allowlist. Matches AD-2’s envelope contents.
- **Compliant unit B — “PostgreSQL normalizes”:** The adapter copies raw order items; apply classifies add-ons inside the transaction and fingerprints the projection. Matches AD-8 and “PostgreSQL computes … fingerprints … in the apply transaction.”
- **Why both obey every AD:** Each AD assigns the job to a different layer; neither AD forbids the other layer from also doing it.
- **Why they cannot integrate:** M2 `expectedAddOnFingerprint` is computed from a different document than display JSON. `ADD_ONS_CHANGED` fires on every apply, or two encodings of the same order never match.
- **AD to add/tighten:** Name one owner. If the adapter classifies, apply must fingerprint that payload without reclassifying. If PostgreSQL classifies, the envelope must carry raw lines only and AD-2 must drop “normalized add-ons” as adapter output.

### Add-on business identity is still an allowlist-shaped vacuum

- **Hole type:** clashing shared-data shapes
- **Location:** AD-2; AD-8; Deferred — tenant spike field allowlists
- **Trigger condition:** Two stories implement “exact current projection” before the spike amends the allowlist (Build Readiness is not an AD, so a unit may still proceed).
- **Compliant unit A — “Line identity”:** Each add-on is a source line: `{ booqableLineId, productId, qty, label }`, sorted by line id. Splitting one SKU across two lines changes the fingerprint.
- **Compliant unit B — “SKU identity”:** Add-ons group by product/variant; fingerprint is `{ productId, qty }` sorted by product id. Labels are display-only and omitted from the digest.
- **Why both obey every AD:** Both produce a non-null empty fingerprint, sort before hashing, and store JSON + fingerprint on M2. Allowlists are explicitly unfinished.
- **Why they cannot integrate:** A line split is a revision for A and a no-op for B; a rename is the reverse. M2 and the detail DTO disagree on equality.
- **AD to add/tighten:** Do not leave identity to the spike as an unspoken schema. Amend AD-8 with stable add-on identity, grouping, quantity, included display fields, and duplicate rules; the spike may only fill field names/paths.

### Assignment-instance rows have two creators

- **Hole type:** two owners of one entity
- **Location:** AD-2 snapshot “ordered assignment instances”; AD-3 occurrence identity; AD-10 apply set-diff
- **Trigger condition:** The adapter story emits instance records; the apply story also creates them from stock-item presence.
- **Compliant unit A — “Envelope mints instances”:** For each currently assigned `stock_items.id`, the adapter looks up the active local instance (via a read port) or allocates a UUID, and puts `{ instanceId, booqableStockItemId, display, tags }` on the snapshot. Apply upserts those UUIDs.
- **Compliant unit B — “Apply mints instances”:** The snapshot carries only raw stock-item IDs plus display/tags. PostgreSQL compares to active instances, closes missing ones, and `gen_random_uuid()`s new instances on absent-to-present.
- **Why both obey every AD:** AD-3 requires immutable instances and at most one active pair; it does not say which process allocates the UUID. AD-2 requires assignment instances *on the envelope*, which A treats as identified rows and B treats as “instance-shaped current assignments.”
- **Why they cannot integrate:** A’s UUIDs are unknown to B’s uniqueness constraints; B ignores A’s IDs and duplicates instances. Tasks unique on assignment instance + kind attach to the wrong occurrence.
- **AD to add/tighten:** State that apply is the only writer of `booqable_assignment_instances`, that the envelope carries current raw stock-item assignments *without* local instance IDs, and that instance UUIDs never originate in TypeScript.

### `bike_tasks` has two birthplaces

- **Hole type:** two owners of one entity
- **Location:** AD-1 (only PostgreSQL commands change workflow state); AD-3 (MVP creates one `rental_turnaround` per instance); AD-10 apply “updates … tasks”; Public command surface (no create-task RPC)
- **Trigger condition:** Task-table/UI work assumes tasks exist; source-apply work assumes it only writes source rows.
- **Compliant unit A — “Apply creates tasks”:** Inside `booqable_apply_source_snapshot_v1`, a new active instance inserts `bike_tasks` (`to_prepare`, version 1) and copies the checklist when the mapping is unique. No staff RPC creates tasks.
- **Compliant unit B — “Post-apply task command”:** Apply writes source + instances only. Application then calls a private helper (still PostgreSQL, still `SECURITY DEFINER`) to create missing tasks so “commands own every mutation” and apply stays a source writer.
- **Why both obey every AD:** A matches the sequence diagram. B matches AD-5’s “commands own every mutation” and the listed staff/backend split (apply is source, not a workflow command). AD-3 only says MVP *creates* a task, not which RPC.
- **Why they cannot integrate:** A webhook that only calls apply never grows tasks in B. A UI built on A sees tasks that B’s apply never inserts. Duplicate create-on-read races if both ship.
- **AD to add/tighten:** Bind task insertion (and first checklist copy) to `booqable_apply_source_snapshot_v1` exclusively. Forbid a second create path, including triggers that run outside that transaction’s lock order.

### Storage work can be a second task or a later stage

- **Hole type:** two owners of one entity; clashing shared-data shapes
- **Location:** AD-3 uniqueness on assignment instance **plus task kind**; AD-4 `STORAGE-01`–`STORAGE-06`; AD-5 linear statuses including `prepare_for_storage`; CAP-8
- **Trigger condition:** A checklist-seed story and a task-creation story read “task kind” and “shared storage definition” independently.
- **Compliant unit A — “One task, two stages”:** Kind is always `rental_turnaround`. Storage items live on the same `bike_tasks` row (`stage = storage`) after `returned`. Uniqueness is effectively one task per instance.
- **Compliant unit B — “Two kinds”:** Uniqueness is `(assignment_instance_id, task_kind)`. Apply creates `rental_turnaround` at assignment and `storage` at return (or at first storage command). Each has its own version, events, and queue row.
- **Why both obey every AD:** AD-3 *creates* one `rental_turnaround` (minimum, not “only kind”). AD-5’s machine is one status tape; B can still walk statuses on the turnaround task while a sibling storage task holds STORAGE items. AD-9 is one-row-per-task, which B satisfies with two rows.
- **Why they cannot integrate:** Queue counts, `/workshop/[taskId]`, attestation-per-task, and “unique on instance + kind” mean different grains. Completing storage on A’s row leaves B’s storage task `to_prepare`.
- **AD to add/tighten:** Mandate exactly one `bike_tasks` row per assignment instance for MVP; `task_kind` is a constant `rental_turnaround`; storage is `stage` on `bike_task_items` plus status `prepare_for_storage`. If a second kind is ever allowed, that is a new AD.

### Definition provenance: FK on the task vs copy-only items

- **Hole type:** clashing shared-data shapes
- **Location:** Core data ownership `CHECKLIST_DEFINITIONS ||--o{ BIKE_TASKS : selected_for`; AD-4 “existing tasks never read live definition rows”
- **Trigger condition:** Migration authors follow the ER diagram; command authors follow AD-4.
- **Compliant unit A — “Task points at definition”:** `bike_tasks.checklist_definition_id` FK plus integer version. Detail joins definitions for labels when item snapshots are incomplete. Mapping still selects the active version at copy time.
- **Compliant unit B — “Items are the only copy”:** No FK from task to definitions. Provenance columns on `bike_task_items` are denormalized; dropping a definition row cannot change work because history FKs never cascade-delete from *items* that do not reference definitions.
- **Why both obey every AD:** The ER names `selected_for`. AD-4 forbids *reading* live rows for work, which A can claim as “FK is audit-only.” B never reads live rows because it cannot.
- **Why they cannot integrate:** `workshop_task_detail` and seed migrations disagree. A’s commands join definitions; B’s DTO has no `definitionId`. Frozen-checklist vs tag-drift warnings resolve through different tables.
- **AD to add/tighten:** Either require `bike_tasks` to store `definition_key` + `definition_version` as frozen scalars with **no** live FK, or require an FK that commands are forbidden to join—and put that prohibition in `test:architecture` and pgTAP.

### `orders.status` has two schemas on one table

- **Hole type:** two owners of one entity; clashing shared-data shapes
- **Location:** AD-2 replace-in-place current source rows + source status; Brownfield cut-over (one writer, fixture parity); existing `public.orders.status` (`order_status`); ER `ORDERS`
- **Trigger condition:** Workshop apply lands on the brownfield `orders` table while bookings/partner views keep using `status`.
- **Compliant unit A — “Reuse `orders.status`”:** Apply writes Booqable source status into `orders.status`, extending the enum. One current row, fixture parity on other columns.
- **Compliant unit B — “Parallel source column”:** Apply writes `booqable_source_status` (text, opaque). `orders.status` remains the existing commercial/fulfillment enum so `bookings_view` does not change meaning.
- **Why both obey every AD:** Replace-in-place and one writer are satisfied. AD-2 requires source status on the snapshot, not a column name. Fixture parity can mean “keep columns” (A mutates enum values) or “keep semantics” (B adds a column).
- **Why they cannot integrate:** Bookings filters and workshop eligibility (AD-10 terminal statuses) read different columns. A’s enum extension breaks B’s views; B’s apply never updates the field A’s queue join uses.
- **AD to add/tighten:** Name the physical tables/columns for source vs existing commercial status. Bind workshop eligibility to one column; forbid overloading `order_status` unless an explicit mapping table is adopted.

### Current order projection: mutate `public.orders` vs new source tables

- **Hole type:** two owners of one entity
- **Location:** ER `ORDERS` / `ORDER_ITEMS`; AD-2 replace-in-place; brownfield `src/lib/booqable/sync.ts` replacement
- **Trigger condition:** A schema epic creates workshop-prefixed tables “so RLS grants stay narrow”; the cut-over epic replaces the existing writer in place.
- **Compliant unit A — “Same tables”:** `booqable_apply_source_snapshot_v1` updates `public.orders` / `order_items` and adds assignment/task tables. One writer as required.
- **Compliant unit B — “Workshop source schema”:** Apply writes `workshop_source_orders` (and items/add-ons) replace-in-place. Existing `orders` remain for the rest of the admin app; a later job or the same transaction copies commercial fields for fixture parity.
- **Why both obey every AD:** Both atomically expose one *current workshop* revision and keep task history separate. “Do not add a second writer” can mean second *workshop* writer (B still has one apply) while the old sync.ts is deleted.
- **Why they cannot integrate:** Detail DTO and fingerprints read different relations. Dual current rows for one Booqable order. CAP-6 add-ons on B’s table never appear on A’s M2 lock target (“order source row”).
- **AD to add/tighten:** Declare the canonical source tables by name. State that existing `public.orders` / `order_items` **are** those tables (or are not). If a copy exists, name the single writer and the lock row AD-8 uses.

### Per-order sync results have two writers

- **Hole type:** two owners of one entity; conflicting state-mutation paths
- **Location:** Backend RPCs `booqable_apply_source_snapshot_v1` and `booqable_record_sync_result`; sequence diagram apply return vs runner progress
- **Trigger condition:** Apply story persists `{ created, retained, cancelled, fingerprint }` as the order result; runner story calls `booqable_record_sync_result` after apply.
- **Compliant unit A — “Apply records”:** Result rows are written in the apply transaction (same lease/fence). Runner only renews/releases.
- **Compliant unit B — “Runner records”:** Apply returns values to TypeScript; `booqable_record_sync_result` writes `booqable_sync_order_results`. Matches a dedicated RPC on the list.
- **Why both obey every AD:** AD-10 requires stored per-order results and lease-checked apply. It does not say which RPC inserts the result row.
- **Why they cannot integrate:** Double inserts, missing webhook results (webhook may never call record), or health counts that ignore apply-internal writes.
- **AD to add/tighten:** One writer. Either apply persists results when `runId` is present, or apply is side-effect free for run stats and the runner *must* call record (including webhook) inside the same success path.

### Sync health freshness has two source-of-truth rows

- **Hole type:** two owners of one entity
- **Location:** AD-10 full-success timestamp vs last attempt/counts; `reconcileBooqableOrder(..., runId?)`; webhook awaits one order with optional run
- **Trigger condition:** Manual-sync UI reads `booqable_sync_runs`; ops/debug reads latest webhook apply time.
- **Compliant unit A — “Run is health”:** `last_full_success_at` moves only when a manual listing finishes every eligible order. Webhooks pass `runId = null` and do not affect the banner.
- **Compliant unit B — “Latest apply is health”:** Any successful apply (webhook or manual) updates a global `workshop_sync_health` row so staff see current Booqable data after a webhook.
- **Why both obey every AD:** AD-10 says the full-success timestamp advances only on complete listing **and** to store last attempt and per-order results. Both can be stored; which one the loader reads is unspecified.
- **Why they cannot integrate:** The same database shows “healthy” and “failed/resumable” depending on the page. CAP-10 recovery actions target the wrong object.
- **AD to add/tighten:** Define the health DTO: which timestamps, whether webhooks contribute, partial-run rules, and the single table/view the workshop page reads.

### Cancellation is both a command and a sync side effect

- **Hole type:** conflicting state-mutation paths
- **Location:** AD-5 (cancellation increments version; source invalidation may cancel any nonterminal; each *command* returns id/version/status); Public staff RPCs (no cancel); AD-3 removal cancels once via apply
- **Trigger condition:** A commands epic implements cancellation as a first-class command; a sync epic cancels only inside apply.
- **Compliant unit A — “Apply-only cancel”:** No staff RPC. Removal/unmapped source closes the instance and sets `cancelled` in apply, incrementing version once. Staff surface never sends cancel.
- **Compliant unit B — “Cancel command exists”:** Because AD-5 lists cancellation next to item changes and transitions as versioned commands, B adds `workshop_cancel_task` (or overloads apply’s invalidation as a callable command) for tests, admin recovery, and tombstone transitions.
- **Why both obey every AD:** A matches the RPC list and AD-3. B matches AD-5’s command-shaped cancellation and expected-version concurrency. Terminal immutability holds in both.
- **Why they cannot integrate:** Two cancel writers ignore each other’s locks/events. B’s clients send a code A’s API never exposes. Duplicate cancel events vs `TASK_CANCELLED` on an already-cancelled row.
- **AD to add/tighten:** State that **only** `booqable_apply_source_snapshot_v1` may enter `cancelled`. Staff have no cancel RPC. “Cancellation” in AD-5 means that apply path, not a thirteenth staff command.

### Add-on sync after `ready_for_pickup` vs assignment invalidation

- **Hole type:** conflicting state-mutation paths
- **Location:** AD-8 “after `ready_for_pickup` they never reopen work or change status”; AD-5 invalidation to `cancelled` from any nonterminal; AD-3 removal cancels
- **Trigger condition:** An add-on/display story and an assignment-removal story both handle a snapshot apply for a task already `ready_for_pickup` / `in_rental`.
- **Compliant unit A — “Status freeze after M2”:** After `ready_for_pickup`, apply updates display/fingerprints only. Removal does not cancel; the bike stays pick-up-ready. AD-8 is the more specific rule; AD-5’s invalidation is read as pre-ready.
- **Compliant unit B — “Cancel still wins”:** AD-8 forbids *reopening* (no return to `to_prepare`) but cancellation is not reopening. Removal still cancels `ready_for_pickup` and `in_rental`. Display-only applies to add-on edits, not assignment set-diff.
- **Why both obey every AD:** Each unit satisfies every AD by scoping AD-8 to add-ons vs all source changes. The spine never states that scope.
- **Why they cannot integrate:** The same removed stock item yields a live pickup task in A and a tombstone in B. Queue filters and CAP-9 diverge.
- **AD to add/tighten:** Split the apply mutation table by status × change type (add-on vs assignment vs tag vs order dates). Explicitly allow or forbid `cancelled` after `ready_for_pickup`.

### Item outcomes vs named transitions both think they exit the stage

- **Hole type:** conflicting state-mutation paths
- **Location:** AD-5 separate item RPCs and `workshop_complete_m1` / `_m2` / `_storage`; AD-4 frozen snapshot after preparation starts
- **Trigger condition:** Checklist-UI story auto-advances when the last required item is set; transition-button story requires the named RPC.
- **Compliant unit A — “Items never change status”:** `workshop_set_item_outcome` / `workshop_confirm_m2_item` only persist outcomes and increment version. Status changes only via named transition RPCs, which check completeness.
- **Compliant unit B — “Last item completes the stage”:** Setting the last required M1 item, in the same command transaction, moves `being_prepared → needs_recheck` and writes the M1 attestation so signature and status cannot split (AD-5/AD-7). Named `complete_m1` becomes an alias or is unused by the UI.
- **Why both obey every AD:** Both use the command surface, increment version once per successful command, and keep attestations immutable. AD-5 lists both item and complete RPCs without saying the complete RPC is mandatory and exclusive.
- **Why they cannot integrate:** A’s UI shows Complete while B already left the status. Double attestation insert. `INCOMPLETE_CHECKLIST` vs implicit pass.
- **AD to add/tighten:** Item RPCs must not change `bike_tasks.status` or write attestations. Named complete/start RPCs are the only status and attestation writers. pgTAP: item-only call leaves status unchanged.

### Allowed item-mutation statuses are unspecified

- **Hole type:** conflicting state-mutation paths
- **Location:** AD-4 replace snapshot while `to_prepare`; AD-5 item commands; AD-8 M2
- **Trigger condition:** One story allows ticking items in `to_prepare`; another rejects them until `workshop_start_preparation`.
- **Compliant unit A — “Work starts at first tick”:** Outcomes are legal in `to_prepare`. `start_preparation` is optional bookkeeping or is implied by the first `set_item_outcome`.
- **Compliant unit B — “Gate on start”:** Item RPCs return `INVALID_TRANSITION` unless status is `being_prepared` (M1), `needs_recheck` (M2), or `prepare_for_storage` (storage).
- **Why both obey every AD:** No AD lists legal (status, command) pairs beyond the happy path edges.
- **Why they cannot integrate:** Sync may replace the `to_prepare` snapshot (AD-4) while A has already stored outcomes that B never allowed; uniqueness `(task, stage, item key)` then fights replace-vs-keep.
- **AD to add/tighten:** Publish the command × status matrix, including whether `to_prepare` items may exist before start.

### Staff commands and sync do not share one lock protocol

- **Hole type:** conflicting state-mutation paths
- **Location:** AD-8 M2 locks order source row before task; Consistency Conventions lock order `run lease → order/source → assignment instances → task → items/history`; staff RPCs have no run lease
- **Trigger condition:** M2/complete stories lock what AD-8 names; other commands lock only `bike_tasks`.
- **Compliant unit A — “Every mutation follows global order”:** Staff commands (no run lease) still `SELECT … FOR UPDATE` source row, then instances, then task. Prevents deadlock with apply.
- **Compliant unit B — “Only M2 locks the order”:** Other commands lock the task row (expected version). Apply uses the full chain. Literal AD-8.
- **Why both obey every AD:** Global lock order is written under sync. AD-8 special-cases M2. Other commands are silent.
- **Why they cannot integrate:** B deadlocks with apply (apply holds order, waits task; `complete_m1` holds task, never takes order—or the reverse if someone adds an order lock later). A’s extra locks change `STALE_VERSION` vs wait behavior vs B’s tests.
- **AD to add/tighten:** One lock protocol for **all** writers of task or source rows, including staff RPCs. State that staff skip the run lease but must still lock source → instances → task in that order (or explicitly document a proven deadlock-free subset).

### Checklist item identity is UUID in RPCs and key in uniqueness

- **Hole type:** clashing shared-data shapes
- **Location:** Shared contracts unique key `task + stage + item key`; Public command surface “item ID”
- **Trigger condition:** UI posts the snapshot’s stable key; SQL functions take `item_id uuid`.
- **Compliant unit A — “Item ID is UUID PK”:** Commands take `item_id uuid`. The loader must return that UUID. Keys are unique but not the wire id.
- **Compliant unit B — “Item ID is the stable key”:** Commands take `item_key text` (e.g. `ROAD-01`). No UUID needed on the wire. Uniqueness is the identity.
- **Why both obey every AD:** The spine uses both phrases.
- **Why they cannot integrate:** Generated types and `workshop_set_item_outcome` arguments disagree. Client of A cannot call B.
- **AD to add/tighten:** One wire identifier. Prefer UUID PK plus stable `item_key` column; RPCs take UUID; DTO includes both.

### Event rows have no closed payload

- **Hole type:** clashing shared-data shapes
- **Location:** AD-7 event fields; AD-5 increment/version; “source fingerprint when relevant”
- **Trigger condition:** Apply writes cancellation events; staff transitions write others; detail DTO reads them.
- **Compliant unit A — “Rich events”:** Columns: `kind`, `from_status`, `to_status`, `resulting_version`, `source`, `actor_id`, name snapshots, `at`, `source_fingerprint`, `addon_fingerprint`.
- **Compliant unit B — “Kind + time”:** `kind` + `actor_id` + `at`. Status reconstructed from current row + order of kinds. Fingerprints live only on attestations.
- **Why both obey every AD:** AD-7 lists those fields as what events *store*, which B can treat as a menu. “When relevant” lets B omit fingerprints always.
- **Why they cannot integrate:** `workshop_task_detail` cannot render A’s columns from B’s table. Invalidation vs M1 complete collide if kinds are not a closed enum.
- **AD to add/tighten:** Closed `event_kind` enum, NOT NULL columns, and which fingerprint column is set for which kind.

### `workshop_task_detail` DTO is “one consistent DTO” without fields

- **Hole type:** clashing shared-data shapes
- **Location:** Shared contracts `workshop_task_detail(task_id)`; AD-11 dedicated page
- **Trigger condition:** Loader story and SQL function story invent JSON independently.
- **Compliant unit A — “Nested json”:** Function returns a single `jsonb` document.
- **Compliant unit B — “Composite record”:** Function returns typed columns / several `SETOF` types; the loader assembles a TS DTO.
- **Why both obey every AD:** Both are one RLS-respecting database function returning one consistent DTO-shaped result, with tombstone vs not-found.
- **Why they cannot integrate:** TypeScript types, error wrapping, and tests cannot share fixtures.
- **AD to add/tighten:** Freeze the SQL return type and the TypeScript DTO (field names for task, items, add-ons, fingerprints, attestations, events, config warning, tombstone flag).

### Tag mapping errors: fail the snapshot vs create a blocked task

- **Hole type:** conflicting state-mutation paths
- **Location:** AD-2 failed fetch writes nothing; AD-4 zero/multiple tags is a configuration error; AD-5 `CONFIGURATION_BLOCKED`; AD-9 mapped tag/config warning on the row
- **Trigger condition:** An order has zero or two recognized workshop tags.
- **Compliant unit A — “Treat as invalid snapshot”:** Adapter/apply refuses the order (no source write), like drift. Retry until Booqable is fixed.
- **Compliant unit B — “Write task, block start”:** Apply writes order + instance + `to_prepare` task with config warning; start/complete return `CONFIGURATION_BLOCKED`. Matches list DTO’s warning and late attachment after correction (AD-4).
- **Why both obey every AD:** Configuration error is not defined as fetch failure. AD-4’s late attach implies the task already exists (B). Writing nothing also prevents wrong checklists (A).
- **Why they cannot integrate:** Manual sync counts, mechanic visibility, and “attach while `to_prepare`” only work for B. A never creates the row AD-4 mutates.
- **AD to add/tighten:** Zero/multiple tags **must** still apply source + instance + task, mark configuration blocked, and skip checklist copy until exactly one mapping exists. Do not use AD-2’s write-nothing path for tag cardinality.

### `ROAD-01`–`ROAD-25` can be definitions or items

- **Hole type:** clashing shared-data shapes
- **Location:** AD-4 seed exact `ROAD-01`–`ROAD-25` and `STORAGE-01`–`STORAGE-06`; `definition_key` + integer version; item stable key
- **Trigger condition:** Seed migration uses those strings as `definition_key`; item copy uses them as `item_key`.
- **Compliant unit A — “Catalog keys vs item keys”:** `definition_key = workshop-road-bike` (or similar); items `ROAD-01`… Copy uses both.
- **Compliant unit B — “The contract codes are the definition”:** Each `ROAD-nn` is a one-item definition version; the task snapshots 25 definitions.
- **Why both obey every AD:** AD-4 says seed those contracts and use `definition_key`. It does not say those tokens are item keys.
- **Why they cannot integrate:** Tag mapping, uniqueness, and M2-required flags attach at different grains.
- **AD to add/tighten:** `definition_key` values for MVP (including disabled e-bike catalogs). Item keys are `ROAD-01`… / `STORAGE-01`…. One definition version contains the ordered item set.

### Domain layer may encode the state machine that PostgreSQL also encodes

- **Hole type:** conflicting state-mutation paths
- **Location:** AD-1 domain owns names/commands/result types; application owns use-case flow; PostgreSQL owns atomic workflow rules; AD-5 commands
- **Trigger condition:** A domain story ships transition guards in TypeScript; a SQL story ships the same guards in RPCs.
- **Compliant unit A — “TS is the spec, SQL is persistence”:** Application refuses illegal transitions before RPC. SQL trusts the caller after `auth.uid()`/role checks.
- **Compliant unit B — “SQL is the spec, TS is a client”:** Domain types are enums only. Illegal transitions always come from PostgreSQL codes.
- **Why both obey every AD:** Domain may own “commands” as types. PostgreSQL must own atomic rules. Dual enforcement looks like defense in depth.
- **Why they cannot integrate:** Guards drift (especially invalidation). Tests pass in Vitest and fail in pgTAP or the reverse. AD-13’s two layers both green, product wrong.
- **AD to add/tighten:** PostgreSQL is the only legal-transition authority. TypeScript may mirror types for UX enablement but must not be a second writer of rules; architecture tests fail if application duplicates transition predicates that SQL does not enforce.

## Closing requirement

Do not split epics until new or tightened ADs exist for:

1. **One snapshot schema** (tree, types, who mints assignment-instance IDs, who normalizes add-ons, add-on identity).
2. **One physical source model** (`public.orders` vs parallel tables; commercial `status` vs source status).
3. **One owner per mutating entity** (instances, `bike_tasks` insert, cancel, sync-result rows, sync-health).
4. **One apply mutation table** (status × change type, especially after `ready_for_pickup`).
5. **One command matrix** (command × legal status; items vs complete RPCs; lock order for staff vs sync).
6. **One read DTO** (`workshop_task_detail`, events, item wire id, definition identity).

AD-13’s seam tests (adapter → apply, seed → commands → detail, webhook/manual → lease → apply → health) will stay green-and-wrong until those contracts are single, not merely “covered at their owning boundary.”
