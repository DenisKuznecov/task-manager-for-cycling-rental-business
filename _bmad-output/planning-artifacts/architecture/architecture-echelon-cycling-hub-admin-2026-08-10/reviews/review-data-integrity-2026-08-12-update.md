# PostgreSQL / Data-Integrity Review — Updated Architecture Spine

## Verdict

**CHANGES REQUIRED — four High-severity architecture gaps still permit incompatible or unsafe database stories.**

The updated spine is materially stronger on explicit-removal authority, vector conflict quarantine, atomic derivation, capability ownership, disabled-mode debt, and mandatory proof. It is not yet decomposition-safe, however, because its structural cardinalities contradict provisional identity, its comparator does not define how accepted components survive later non-authoritative omission, multi-quantity overassignment has no fail-closed rule, and correction successors are neither concurrency-unique nor assigned to an exact execution principal.

This review reports only feature-architecture gaps that can change schema, transaction, authority, or test contracts. Ordinary field and index choices are excluded.

## Findings

### H1 — The ERD makes provisional membership impossible

AD-5 permits a quantity-one membership with discriminator `single` before an exact StockItem arrives. The ERD instead uses:

- `STOCK_ITEM_PLANNINGS ||--o| ORDER_BIKE_MEMBERSHIPS`
- `PHYSICAL_BIKES ||--o{ ORDER_BIKE_MEMBERSHIPS`

In crow's-foot notation, those relationships require every membership to reference exactly one StockItemPlanning and exactly one physical bike. A schema story can therefore follow the ERD and create non-null foreign keys, while an ingestion story follows AD-5 and inserts a provisional membership with neither reference.

The spine must bind membership-side nullability and promotion semantics explicitly: source Planning/StockItemPlanning and physical-bike references are nullable observations until exact assignment, promotion updates those observations without changing membership identity, and any history requirements for remaps must be stated.

### H2 — Multi-quantity cardinality is defined only for shortfall, not overassignment or duplicate physical fulfillment

AD-5 defines `planned quantity > exact assignments`, but does not define either:

1. `exact distinct StockItems > accepted planned quantity`; or
2. one physical StockItem appearing as exact fulfillment for multiple admitted memberships in the same rental/order graph, including parent/bundle-line duplication.

Both inputs can satisfy the current “exact distinct StockItem assignments” wording and create too many Bike Tasks or two simultaneous tasks for one bike. The partial unique constraint on `(order, line, unit)` does not protect across lines and does not cap the line count.

The architecture must choose the transaction-level behavior and scope of exclusivity. The safe default is no new membership/task derivation for the conflicting set, a durable blocking identity incident containing the conflicting source references, and a locked re-evaluation after authoritative refetch. The mandatory fixtures must include over-count and cross-line duplicate-assignment cases.

### H3 — Non-closing absence is not composable with the union-vector comparator

AD-4 says:

- compare the union of accepted and incoming components;
- quarantine unresolved incomparability with no mutation; and
- generic absence is non-closing but may update observation metadata/incidents.

It does not define the comparison value for an accepted component that is simply absent from a later incoming graph and has no explicit tombstone. That missing component is either incomparable, which quarantines the whole graph and prevents unrelated newer facts from converging, or it is carried forward, which allows partial acceptance. Both implementations satisfy parts of the current prose but have materially different convergence behavior.

The hole also affects an already accepted tombstone that is no longer returned by later refetches: if the removed component remains in accepted history but disappears from the incoming source-version map, every later graph can become incomparable.

The envelope/comparator contract must choose one rule. For example, it may require every admitted accepted component to be emitted as `known`, `unknown`, or `removed` with a comparison token, or it may define an explicit carry-forward merge in which omission preserves accepted state/version and cannot authorize closure. It must also state whether independent newer components may apply while the omission opens/updates an incident.

### H4 — Correction successors lack an enforceable one-successor concurrency and authority contract

AD-14 requires “one linked correction-successor membership/task as authoritative current,” but neither AD-5 nor the Cardinality convention defines:

- a unique predecessor/correction-epoch key;
- an idempotency key and replay result;
- the row that concurrent corrections lock;
- how a losing correction observes the existing successor; or
- a constraint ensuring only one successor is authoritative.

Two concurrent correction calls can therefore both create a valid-looking successor while each follows the prose. The general lock order does not resolve this unless the correction command is required to lock the false terminal predecessor and enforce a unique successor edge.

Bind an immutable correction edge, its uniqueness scope, idempotency semantics, predecessor lock, and current-authority constraint. Add a true multi-session test in which two callers correct the same false terminal membership and exactly one successor/event chain wins.

### H5 — The terminal-bypass correction capability has no exact execution principal

AD-11 gives detailed ownership rules, but AD-14 only calls correction “narrowly owned.” It does not say whether execution belongs to an admin-facing RPC, an internal integration role, the integration coordinator, or a separate operator capability. Those choices are not interchangeable: this capability bypasses ordinary terminal finality and can make a new task authoritative.

The spine must name the caller roles, internal owner role, exposed/internal function boundary, actor attribution, and denied principals—at minimum `anon`, ordinary authenticated mechanic/manager, `service_role`, and integration coordinator. Until then, independent privilege and recovery stories can produce incompatible grants, and the required effective-role fixture has no normative expected matrix.

### M1 — The multi-quantity incident resolution rule conflicts with the global identity-incident rule

AD-5 says the shortfall incident resolves only when exact assignments cover expected quantity or accepted source evidence lowers planned quantity. The Integration operations convention says mapping/identity incidents require approved configuration, successful refetch, and attributable operator acknowledgement.

The spine does not classify the AD-5 incident as retryable source, source-gap, mapping, or identity. One story can auto-resolve on source convergence; another can require acknowledgement and leave the activation gate blocked. Define the incident class, deduplication key, occurrence/update behavior, severity, and exact resolution transition.

### M2 — Failure atomicity does not identify the durable incident/attempt boundary

AD-2/AD-4 require source, derivation, and events to roll back together. Other rules require failed/quarantined work to leave durable attempts and incidents. For expected validation results this can be implemented without throwing, but an unexpected PostgreSQL error in the derivation path aborts the transaction unless it is caught behind a subtransaction boundary or recorded by a separately fenced outer call.

The architecture must state which operational rows commit outside the rolled-back domain unit and how they remain tied to the same attempt/lease generation. Otherwise one ingestion story will catch and persist a failed attempt/incident after domain rollback, while another will allow the abort to erase all failure evidence.

### M3 — Disabled-mode “watermarks” are not defined as comparable derivation tokens

The spine separates `observed_source_watermark` from `materialized_derivation_watermark`, which is correct, but does not define their scope or contents. A scalar source timestamp or attempt number cannot represent AD-4's partial-order source vector plus schema version, fingerprint, allowlist version, partner-map revision, and other derivation debt.

Bind the materialization token per order to the complete accepted derivation input (or define an equivalent generation allocated transactionally after coalescing all debt). State the equality/currentness predicate used by enablement and JIT. Without it, stories can disagree on whether a source `no_op` that consumes newer local debt makes derivation current.

### M4 — Replacement incarnation semantics are ambiguous when the unit discriminator changes

The natural identity includes `(order, line, source_unit_discriminator, incarnation)`, yet AD-5 says a different StockItem “increments incarnation.” Once the StockItem changes, the discriminator changes too, so there is no stated incarnation sequence to increment: per-unit incarnation would normally restart, while per-line incarnation requires a different uniqueness namespace.

Define whether incarnation is scoped to `(order, line, unit)` or to a replacement chain, and require an immutable predecessor/replacement edge if the latter is intended. Otherwise membership, event, and correction stories can encode incompatible successor identities.

### M5 — The mandatory concurrency floor is too broad to prove the named integrity invariants

AD-14 requires a true multi-session harness for “overlapping ingestion,” but leaves the critical races above to single-session pgTAP/fixtures. At minimum the multi-session matrix must name expected outcomes for:

- same-line replacement versus refresh;
- explicit tombstone versus a concurrent non-closing omission;
- derivation-debt arrival while an `order_graph` consumes debt;
- incident deduplication/resolution versus a new failing observation; and
- concurrent correction of one false terminal predecessor.

“Overlapping ingestion” alone lets each story choose a trivial same-payload race and still claim compliance, while the unsafe cardinality, comparator, debt, incident, and successor races remain unproved.

## Required architecture closure

Before affected stories decompose, the spine should:

1. reconcile ERD nullability with provisional identity;
2. define fail-closed overassignment and duplicate-bike cardinalities;
3. specify omission/tombstone carry-forward in the comparator;
4. bind correction-successor uniqueness, locking, idempotency, and exact roles;
5. normalize incident classification/resolution and durable failure recording;
6. define derivation watermark/debt currentness; and
7. enumerate the corresponding multi-session outcomes.
