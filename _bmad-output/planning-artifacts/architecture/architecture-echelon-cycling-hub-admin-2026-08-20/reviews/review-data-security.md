# Data Integrity and Supabase Security Review

**Artifact reviewed:** `ARCHITECTURE-SPINE.md`  
**Review date:** 2026-08-20  
**Lens:** Supabase/PostgreSQL authorization, integrity, concurrency, recovery, and migration safety

## Verdict

**REVISE — not implementation-ready for the transactional core.**

The spine has the right high-level direction: database-owned commands, user-session writes, RLS-backed reads, immutable terminal states, complete-snapshot application, optimistic task versions, per-order serialization, and local-only migration testing. Those choices materially reduce risk.

However, several critical guarantees remain prose-only or internally inconsistent. In particular, the document does not yet define an executable least-privilege RPC/grant topology; the proposed assignment uniqueness cannot recover when the same physical bike disappears and later reappears on the same order; and the lease, source fingerprint, task version, and add-on confirmation locks are not tied together by a concrete fencing and lock-order protocol. These gaps can produce privilege escalation, stuck synchronization, stale snapshot application, duplicate or missing audit records, or a current assignment with no actionable task.

## Finding summary

| ID | Severity | Finding |
| --- | --- | --- |
| DS-01 | Critical | The command/RPC, RLS, grants, and service-role model is underspecified and partly contradictory. |
| DS-02 | Critical | Terminal cancellation plus uniqueness on `(order_id, stock_item_id, task_kind)` prevents a fresh task when the same bike is later reassigned. |
| DS-03 | High | Leases are not yet a complete fencing and crash-recovery protocol, and cross-command lock ordering is absent. |
| DS-04 | High | Snapshot/add-on fingerprints and replay semantics are not canonical enough to prove consistency or idempotency. |
| DS-05 | High | “Immutable” history and checklist definitions are not protected by database-enforced append-only rules. |
| DS-06 | High | Manual-sync privilege and privileged-runner isolation are not explicitly bounded. |
| DS-07 | Medium | Cancelled/open-task behavior needs a consistent read and command contract. |
| DS-08 | Medium | Migration safety needs an explicit deployment contract, not only environment routing. |

## Detailed findings

### DS-01 — Critical: define an executable least-privilege database API

AD-6 correctly requires RLS reads, revoked authenticated DML, narrow commands, private privileged helpers, and no service credential in user code. It does not specify how these pieces can all be true over Supabase PostgREST:

- If authenticated DML is revoked and the command must write across several tables, a normal `SECURITY INVOKER` RPC cannot perform those writes.
- A privileged `SECURITY DEFINER` RPC in `public` would be callable through the exposed Data API. Current Supabase guidance says security-definer functions must pin `search_path`, must be schema-qualified, and should not be placed in an exposed schema.
- A private security-definer function cannot be called directly through PostgREST unless its schema is exposed. A public invoker wrapper can call it only if the caller has the required schema/function privileges, which must then be explicitly bounded.
- Postgres functions receive `EXECUTE` for `PUBLIC` by default unless existing and default privileges are revoked. Merely saying that RPCs are “narrow” does not make them narrow.

The architecture must choose and document one realizable topology before implementation. Preferred options are:

1. call private command functions through a direct server-side Postgres connection using a dedicated login role that has only `EXECUTE` on the intended commands; or
2. retain Data API RPCs but explicitly document the accepted exposed-definer exception and harden each entry point with a constrained no-login owner, `SECURITY DEFINER SET search_path = ''`, fully qualified names, an in-function `auth.uid()` and current database role check, parameter validation, and exact `EXECUTE` grants.

Do not let an exposed function owned by `postgres` become an unrestricted privilege bridge. Do not trust a caller-supplied user ID or role. If JWT claims are used, authorization may use `app_metadata`, never user-editable `user_metadata`; a database lookup of the current profile role is preferable for immediate revocation.

The migration-level grant contract should enumerate every object, not only “public task tables”:

- RLS on all exposed task, task-item, assignment, order-projection, add-on, event, attestation, and sync-health tables or views.
- `SELECT` only for the exact staff roles that need each read model.
- no `anon` access;
- no direct `INSERT`, `UPDATE`, or `DELETE` for `authenticated` on command-owned tables;
- explicit `EXECUTE` only on approved entry points;
- no `USAGE` or `CREATE` on private schemas for `anon` or `authenticated`;
- revoked default table, sequence, and function privileges so future objects are closed by default;
- `security_invoker = true` on every exposed view.

Supabase explicitly treats grants and RLS as separate layers; policies do not retract broad grants. Add local tests for both layers, including `anon`, partner, mechanic, manager, admin, and service/backend roles.

### DS-02 — Critical: model assignment incarnations, not only source identity

AD-3 makes `(booqable_order_id, stock_items.id, task_kind)` globally unique while AD-5 and AD-7 make `cancelled` terminal and immutable. This fails for a valid sequence such as:

1. bike A is assigned and task A is created;
2. A disappears, so task A is terminally cancelled;
3. the same physical stock item A is later assigned again to the same order.

The old task cannot be reopened without violating terminal/history immutability, while the unique key prevents a fresh task. Replaying the current snapshot then converges to an assignment with either no actionable task or illegally reused history.

Introduce an assignment incarnation as a first-class identity, for example:

- immutable `assignment_instance_id`;
- source identity `(order_id, stock_item_id)`;
- active/inactive interval or generation;
- one task per assignment instance;
- a partial unique constraint allowing at most one active assignment instance for `(order_id, stock_item_id)`;
- a unique task constraint on `(assignment_instance_id, task_kind)`.

Repeated application of the same source snapshot must retain the active incarnation. A transition from present to absent closes it and cancels its open task once. A later absent-to-present transition creates a new incarnation and a fresh task. This preserves old cancelled history while restoring current work.

The source-apply transaction must also define what happens if an invalidation races with a staff command: it must lock the affected task, re-check terminal/version state, increment the task version on cancellation, append exactly one source-invalidation event, and make every stale open client fail closed.

### DS-03 — High: turn leases into fencing tokens and define one lock order

AD-10 mentions stored leases, tokens, expiry-sensitive apply, order locks, resumable pages, and failure release. That is insufficient for process death and stale-worker safety unless acquisition and apply form a fencing protocol.

Required lease semantics:

- acquire atomically using database time, only when no owner exists or `expires_at <= now()`;
- issue a unique token plus a monotonically increasing fencing generation;
- store `acquired_at`, `heartbeat_at`, `expires_at`, owner/run ID, attempt, and last error;
- allow renewal only by the current token/generation;
- during apply, lock the lease/order row and verify token, generation, owner, and non-expiry in the same transaction before any projection or task write;
- release only with the matching token;
- recover abandoned run and order leases by expiry without manual database repair;
- make a retry after an unknown commit result safe.

The architecture must define how a resumable manual run is resumed after a Vercel invocation dies. With no durable queue, cron, or polling, this is necessarily an explicit staff “resume/retry” operation or another authenticated invocation; lease expiry alone does not restart work.

One global lock order is also required. A safe candidate is:

`sync lease/run → order/source revision → assignment rows → task rows → task items/history`

All source-apply and workflow commands that touch more than one aggregate must follow the same order. In particular:

- M2 must lock the order/add-on revision before checking the expected add-on fingerprint and before writing its attestation.
- Source apply must lock that same revision before changing add-ons, then affected tasks.
- Source cancellation must increment `bike_tasks.version`.

Checking a fingerprint “inside a transaction” under the default isolation level is not enough: without a shared row lock, another transaction can update the source revision after the check but before the attestation commits. Add concurrency tests for apply-vs-M2, apply-vs-transition, lease expiry/reacquisition, two manual runs, webhook-vs-manual, and retry after client timeout.

### DS-04 — High: specify canonical fingerprints and replay keys

AD-2 and AD-8 depend on normalized source and add-on fingerprints, but “normalized source fields” is not a reproducible contract. The design needs a versioned canonicalization specification:

- a documented allowlist of every source field that can affect order projection, timing, eligibility, assignment identity, tags/checklist mapping, add-ons, or invalidation;
- deterministic array ordering by stable source identity;
- explicit treatment of missing vs `null` vs empty values, number/string forms, Unicode, timestamps, time zones, and duplicate resources;
- exclusion of volatile fields that do not change behavior;
- a named digest algorithm, preferably SHA-256;
- a domain and schema-version prefix so later canonicalization changes cannot silently compare equal;
- separate full-source and add-on fingerprints where their concurrency scopes differ.

Fetching every page successfully proves completeness of each response, not that all pages represent one Booqable revision. Before set-diff, use a source revision/ETag if Booqable provides one. If it does not, define and validate a stable sentinel re-read or bounded double-read strategy. Any detected drift must discard the candidate snapshot without updating source state. The tenant spike is correctly marked as an implementation blocker; its result must be promoted into the final architecture rather than left as adapter detail.

Replay/idempotency needs database keys, not only tests:

- a duplicate webhook or repeated manual snapshot with the same canonical fingerprint is a no-op;
- no-op replay must not create task events, attestations, assignment incarnations, or duplicate sync-order results;
- event rows should be uniquely tied to the task/resulting version or source invalidation identity;
- sync-order results should be unique per run/order/attempt or use an explicitly defined upsert;
- retries after an unknown RPC response must return the already-committed result;
- changed non-behavioral source fields must not churn task versions;
- changed behavior-affecting fields must never be hidden by over-aggressive normalization.

### DS-05 — High: enforce append-only history and immutable definitions in PostgreSQL

AD-4 and AD-7 call checklist definitions, task events, and attestations immutable, but no enforcement mechanism is named. RLS and revoked authenticated DML do not protect against a service/backend credential, a future definer function, or an accidentally broad migration.

Enforce the invariant at the table boundary:

- reject `UPDATE` and `DELETE` on checklist definitions/items, task events, and task attestations with dedicated triggers;
- permit only narrowly owned insert functions for event and attestation tables;
- ensure source-apply functions have no mutation path to attestations or checklist outcomes;
- avoid cascading deletes from profiles, orders, assignments, or tasks into history;
- store signer UUID plus immutable display-name snapshot and timestamp; the profile foreign key should not be required to preserve the record;
- constrain one attestation per required task stage unless the domain explicitly permits retries;
- bind transition events to task version and constrain duplicate resulting versions;
- ensure `completed` and `cancelled` tasks cannot be updated except for explicitly enumerated source-display fields, if any.

For stronger audit evidence, record source (`staff_command`, `source_invalidation`, migration/backfill), actor when applicable, prior and resulting status/version, command/request idempotency key, and the relevant source fingerprint. The audit log should be sufficient to explain a task without reconstructing overwritten current rows.

### DS-06 — High: bound manual sync and backend credential authority

“Staff can manually sync” and “the service role calls only the source-apply command” are application intentions, not database controls.

First, explicitly decide who may start, resume, or cancel a manual run. Least privilege suggests admin/manager by default; if mechanics require it operationally, state that decision and test it. The initiating authenticated user must be authorized before privileged work starts, and the run should retain initiator UUID/name, trigger type, start/end times, and outcome. The privileged runner must never accept an arbitrary database function/table or tenant scope from the browser.

Second, Supabase's service/secret role bypasses all RLS and has broad project data access. Grants cannot make possession of that key equivalent to “may call only source apply.” Current Supabase guidance also prefers backend secret keys over the legacy JWT `service_role` key, whose deprecation is planned by the end of 2026.

For actual database isolation, use a dedicated direct-connection role with only the required function execution privilege and a constrained function owner. If the application retains a Supabase secret/service key, document the residual full-database blast radius and compensate by:

- a separate backend key per integration component where supported;
- a server-only module and environment variable with no re-export to client code;
- no client-supplied arbitrary order payload—fetch and validate authoritative Booqable data server-side;
- strict order-ID/input limits;
- sanitized logs that never print credentials or webhook secrets;
- rotation and incident procedure;
- tests/build checks ensuring the key never enters browser bundles or user-facing server components.

### DS-07 — Medium: make cancelled/open tasks observable but non-actionable

The document correctly says an invalidated open task shows an abandon-work message and all commands re-check state/version. The read contract must support that behavior:

- queue views exclude cancelled tasks;
- direct task-by-ID reads still return a cancelled tombstone/status and enough immutable context for an already-open page;
- every item mutation and transition rejects terminal tasks in the database, not only the UI;
- a cancellation increments version and is visible through refresh/realtime;
- replacement links, if shown, are informational and never copy state;
- source-display updates allowed after `ready_for_pickup` cannot mutate workflow history or bypass terminal immutability.

Otherwise, filtering cancelled rows from every read can turn an open task into an ambiguous “not found,” while leaving a stale UI unaware that work must stop.

### DS-08 — Medium: add an explicit safe-migration contract

AD-12 correctly confines development application to local Supabase and routes hosted migrations through GitHub Actions. Add the following implementation requirements:

- migrations must be idempotent and safe on a fresh or partially applied local database;
- policies use `DROP POLICY IF EXISTS` followed by `CREATE POLICY`;
- triggers are dropped/recreated explicitly; indexes and tables use guarded creation where valid;
- grants, default-privilege revocations, RLS enablement, views, functions, and function `EXECUTE` grants ship together so no deployment window exposes an object;
- old function overloads/signatures are explicitly removed—`CREATE OR REPLACE` does not remove obsolete overloads and cannot safely change every return shape;
- checklist seed rows use stable keys and validate that existing content exactly matches the migration contract instead of silently accepting conflicting rows;
- large validation/backfill work is separated from short lock-taking DDL, with lock and statement timeouts;
- new constraints are backfilled and validated safely before the application depends on them;
- app/database rollout is backward-compatible across the deployment interval;
- local `db reset`, migration-up from the previous schema, RLS/grant tests, concurrency tests, and Supabase security advisor checks are required before merge.

No migration or DDL should be applied manually to staging or production; hosted migration history must remain owned by the existing CI branch flows.

## Required architecture amendments before build

1. Add a concrete schema/object/grant matrix and choose the RPC execution topology.
2. Replace assignment identity with assignment incarnations plus one-active-instance constraints.
3. Add a fencing-token lease state machine, crash-resume behavior, and a global lock order.
4. Define canonical source and add-on fingerprints, source drift detection, and replay keys.
5. Specify database-enforced append-only triggers/constraints and non-cascading history foreign keys.
6. Name manual-sync roles and record the authenticated initiator independently of the privileged runner.
7. Add a migration and verification checklist covering default privileges, RLS, function execution, seeds, and concurrent tests.

## Minimum acceptance tests

- `anon` and partner can neither read workshop data nor execute workshop commands.
- Each staff role can execute only its named transitions; direct table DML is denied.
- Every exposed view obeys underlying RLS, and every unapproved function is non-executable.
- An exposed command with `auth.uid() IS NULL` fails closed.
- A removed then later re-added identical stock item creates a new task incarnation without changing old cancelled history.
- Duplicate webhook/manual snapshots produce no duplicate tasks, events, attestations, or assignment instances.
- A stale worker whose lease expired cannot apply after a newer worker acquires and commits.
- Process death during page fetch or after commit can be retried/resumed without manual database repair.
- Concurrent M2 and add-on sync cannot commit an attestation for a stale add-on revision.
- Concurrent invalidation and staff mutation produce one serial outcome; the loser receives a stale/terminal error.
- `UPDATE`/`DELETE` against definitions, events, and attestations fails even through unintended privileged code paths.
- Fresh local reset and upgrade-from-previous-schema both produce the same grants, policies, functions, seeds, and constraints.

## References

- [Supabase: Securing your API](https://supabase.com/docs/guides/database/hardening-data-api)
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase: Database Functions](https://supabase.com/docs/guides/database/functions)
- [Supabase: Understanding API keys](https://supabase.com/docs/guides/api/api-keys)
- [PostgreSQL: Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [PostgreSQL: Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- Repository rules: `core-architecture.mdc`, `error-handling.mdc`, and `supabase-migrations.mdc`
