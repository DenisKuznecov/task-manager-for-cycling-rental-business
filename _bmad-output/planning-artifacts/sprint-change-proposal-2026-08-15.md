---
title: "Sprint Change Proposal: Remove Webhook Recovery Infrastructure"
date: "2026-08-15"
status: approved
scope: moderate
trigger_story: "2.8"
approved_by: "Den"
---

# Sprint Change Proposal: Remove Webhook Recovery Infrastructure

## 1. Issue Summary

While preparing Story 2.8, Den decided that the first release should not operate an application-managed Booqable webhook recovery system. Automated retries, leases, bounded workers, Cron scheduling, reconciliation sweeps, and missed-signal recovery do not justify their implementation and operational complexity.

Story 2.7 already introduced a durable refresh inbox and recovery APIs on the local feature branch. Story 2.8 remains an unimplemented draft. Neither story has reached staging or production.

The approved operating model is:

- Webhook and just-in-time callers refetch Booqable authority synchronously.
- Successfully processed duplicate, delayed, and out-of-order updates remain idempotent.
- Failed or missed webhooks do not self-heal in v1.
- V1 provides no application-managed replay queue, retry worker, or missed-signal reconciliation.
- Emergency production database intervention remains outside application guarantees.
- Direct mutation of Workshop-owned task, evidence, assignment, lifecycle, or audit tables is not a supported recovery procedure.

## 2. Impact Analysis

### Epic Impact

- Remove Stories 2.7 and 2.8 from the active Epic 2 plan and sprint status.
- Keep Story IDs 2.9 through 2.14 unchanged to avoid reference churn.
- Revise Story 2.12 to remove recovery and reconciliation callers.
- Revise Story 2.13 to remove obsolete recovery-entrypoint language.
- Replace Story 9.1's two-sweep activation proof with one operator-triggered pre-pilot source validation.
- Epics 3 through 8 remain viable after the integration foundation is simplified to synchronous ingestion.

### Story Impact

- **Story 2.7:** Roll back its local implementation and remove its active planning/spec artifacts.
- **Story 2.8:** Cancel before implementation and remove its draft spec.
- **Stories 2.9–2.11:** Continue with atomic canonical application, source validation, and exact JIT freshness, without an inbox attempt generation.
- **Stories 2.12–2.14:** Remove recovery-worker dependencies while preserving caller cutover, writer revocation, and database-owned rollout.
- **Story 9.1:** Replace recurring sweep evidence with one-time rollout validation.

### Artifact Conflicts

- **PRD:** Narrow synchronization assumptions and SM-2 so missed webhook delivery is not represented as self-healing. Add automated webhook retry/reconciliation as a v1 non-goal.
- **Epics:** Remove the missed-signal guarantee, recovery infrastructure requirements, both affected stories, and sweep-based activation gates.
- **Architecture:** Replace inbox/worker/reconciliation topology with synchronous webhook/JIT callers. Remove recovery entities, contracts, and proof gates.
- **Epic 2 context:** Regenerate or edit around synchronous ingestion and the revised story list.
- **Project context:** Remove the Story 2.7 durable-inbox rule.
- **UX:** No change. The UX artifacts do not promise automatic webhook recovery or expose recovery-worker controls.
- **Historical resume handoff:** No change. It is an obsolete historical snapshot rather than active guidance.

### Technical Impact

- Reverse the two Story 2.7 commits as forward Git history.
- Remove the Story 2.7 migration, refresh-work contract, recovery tests, webhook persistence call, and package wiring.
- Remove the untracked Story 2.8 specification.
- Reset only the local Supabase database after removing the migration.
- Do not create or apply a remote compensating migration: Story 2.7 is absent from staging and production.
- Continue to deploy future remote schema changes only through merge-driven CI.

### Risks

- A missed webhook can cause silent absence from Workshop queues.
- A failed synchronous call has no application-managed retry.
- The UI cannot warn about a signal the application never received.
- Manual database intervention can violate source/derivation consistency and remains outside the supported application contract.
- Pilot evidence must not claim recurring or automatic source-coverage assurance.

## 3. Recommended Approach

Use a hybrid of **Potential Rollback** and **MVP Review**:

1. Roll back Story 2.7.
2. Cancel Story 2.8.
3. Simplify the architecture to synchronous authoritative refetch and atomic application.
4. Replace recurring reconciliation proof with one operator-triggered pre-pilot source validation owned by rollout and Story 2.10.
5. Preserve exact JIT freshness for consequence-bearing Workshop commands; this is a correctness boundary, not webhook recovery.

### Assessment

- **Implementation effort:** Medium
- **Rollback risk:** Low, because the commits are isolated and have not reached a remote deployment branch
- **Operational risk:** Medium, because failed or missed updates may remain undiscovered
- **Timeline impact:** Removes Story 2.8 and ongoing recovery-system maintenance; adds planning/architecture cleanup and rollback verification

## 4. Detailed Change Proposals

### PRD

#### Synchronization dependency

**OLD**

> Booqable order-update delivery triggers reconciliation of current order state.

**NEW**

> Booqable order-update delivery triggers synchronous authoritative refetch and application of current order state.

#### Success metric SM-2

**OLD**

> Observed Booqable updates produce no duplicate or missing exact-StockItem Bike Tasks.

**NEW**

> Booqable updates successfully received and processed produce no duplicate or missing exact-StockItem Bike Tasks.

#### V1 non-goal

**NEW**

> The first release does not provide an application-managed retry queue, background webhook worker, or missed-webhook reconciliation sweep.

### Epics and Stories

#### NFR3

**OLD**

> Duplicate, delayed, missed, and out-of-order Booqable signals must converge from the same current source state to the same correct local state without losing or duplicating Bike Tasks.

**NEW**

> Duplicate, delayed, and out-of-order Booqable signals that are successfully processed must converge from the same current source state to the same correct local state without losing or duplicating Bike Tasks. Missed or failed delivery has no automatic recovery guarantee in v1.

#### AR22 and AR23

**OLD**

> Implement a durable integration inbox, refresh intents, attempts, leases, retry budgets, operator successors, reconciliation runs/checkpoints, coverage watermarks, and a Cron-authenticated bounded worker.

**NEW**

> Use one atomic canonical ingestion path for synchronous webhook and JIT callers. Preserve exact JIT freshness proofs and deduplicated integration incidents. Do not introduce a durable replay inbox, application-managed retry worker, Cron dispatcher, reconciliation run, checkpoint, or coverage watermark in v1.

#### Story treatment

- Remove Story 2.7 and Story 2.8 from the canonical epic and sprint status.
- Preserve their rationale in Git history and this approved proposal.
- Do not renumber Stories 2.9 through 2.14.

#### Story 2.12 and Story 2.13

- Remove recovery and reconciliation callers from the cutover register.
- Remove obsolete recovery-entrypoint language from writer revocation.
- Retain synchronous webhook, existing sync/backfill where still required, and future JIT caller cutover to the canonical coordinator.

#### Story 9.1

**OLD**

> Two complete disabled/shadow reconciliation sweeps produce stable manifests and coverage watermarks.

**NEW**

> One operator-triggered pre-pilot source validation proves current source coverage, materialization, derivation stability, and zero catalogue-defined blocking incidents. It is a rollout validation, not a scheduled or durable recovery mechanism.

### Architecture

#### Integration flow

**OLD**

> Webhook → durable inbox → bounded worker → adapter → ingestion, with nightly reconciliation and operator retry feeding the worker.

**NEW**

> Webhook or JIT caller → authoritative adapter refetch → atomic ingestion. A failed call performs no canonical or domain mutation. V1 has no application-managed replay queue or missed-signal detector.

#### AD-15

Replace receipt, intent, lease, retry, successor, Cron, and sweep requirements with a synchronous freshness and failure boundary:

- webhook and JIT callers use the same canonical adapter and ingestion coordinator;
- payload fields remain signals only;
- accepted state remains atomic, idempotent, and non-regressing;
- exact JIT freshness remains mandatory for consequence-bearing commands;
- failed or missed webhook delivery has no automatic v1 recovery path.

#### AD-16

- Remove inbox attempt generation from freshness proofs.
- Retain root identity, JIT demand generation, producer/profile/schema versions, source vector/fingerprint, derivation marker, rollout epoch, and expiry.

#### AD-19 and activation proof

- Remove two-sweep known-order manifests and worker-containment gates.
- Require one pre-pilot source validation and zero blocking incidents.
- Keep emergency disable, rollout epochs/cohorts, caller cutover, writer revocation, and separate pilot/general/paper-retirement approvals.

#### Diagrams and consistency tables

- Remove inbox, worker, retry, reconciliation-run, and checkpoint nodes/entities.
- Remove Cron and bounded-reconciliation deployment steps.
- Replace recovery-operation contract language with synchronous ingestion and JIT freshness language.
- State that emergency database intervention is outside supported guarantees.

### Implementation Rollback

1. Preserve the unrelated `_bmad-output/party-mode/memories/installed/.memlog.md` working-tree modification.
2. Reverse commit `4988674`, then `36cffdc`, without rewriting history.
3. Remove the untracked Story 2.8 spec.
4. Apply the approved PRD, epic, architecture, Epic 2 context, and sprint-status changes.
5. Reset the local Supabase database so removed Story 2.7 objects disappear locally.
6. Verify:
   - `npx tsc --noEmit`
   - `npm run lint`
   - `npm run contracts:check`
   - `npm run test:unit`
   - `npx supabase test db`
   - `npm run db:types`

## 5. Implementation Handoff

### Scope Classification

**Moderate** — backlog and architecture reorganization plus a contained implementation rollback.

### Recipients and Responsibilities

- **Product Owner / Developer**
  - Update the PRD, canonical epics, architecture spine, Epic 2 context, and sprint status.
  - Ensure no active artifact requires inboxes, workers, retries, Cron, reconciliation, or sweep proof.
- **Developer**
  - Perform the forward rollback.
  - Remove the Story 2.8 draft.
  - Reset the local database and execute the complete verification set.
  - Preserve unrelated working-tree changes.

### Success Criteria

- No Story 2.7 or Story 2.8 code, migration, spec, or active backlog entry remains.
- No active planning artifact requires a durable inbox, application retry worker, Cron route, reconciliation sweep, or coverage checkpoint.
- Existing synchronous webhook behavior remains functional.
- Atomic canonical ingestion and exact JIT freshness remain planned.
- Local database reset, TypeScript, lint, contracts, unit tests, pgTAP, and type generation pass.
- No staging or production database is changed directly.
- Unrelated `.memlog.md` work remains untouched.

## Checklist Record

### 1. Understand the Trigger and Context

- [x] 1.1 Triggering story identified: Story 2.8.
- [x] 1.2 Core problem defined: recovery complexity is not desired for v1.
- [x] 1.3 Evidence gathered: Story 2.7 is local-only; Story 2.8 is unimplemented.

### 2. Epic Impact Assessment

- [x] 2.1 Epic 2 remains viable after removing Stories 2.7 and 2.8.
- [x] 2.2 Existing epic scope requires modification.
- [x] 2.3 Remaining epics reviewed.
- [x] 2.4 No new epic is required.
- [x] 2.5 Story numbering remains stable; no resequencing is required.

### 3. Artifact Conflict and Impact Analysis

- [x] 3.1 PRD conflicts identified.
- [x] 3.2 Architecture conflicts identified.
- [N/A] 3.3 UX changes are not required.
- [x] 3.4 Sprint status, project context, Epic 2 context, tests, migration, and specifications identified.

### 4. Path Forward Evaluation

- [x] 4.1 Direct adjustment alone is insufficient.
- [x] 4.2 Story 2.7 rollback is viable and justified.
- [x] 4.3 MVP scope reduction is viable.
- [x] 4.4 Hybrid rollback and MVP review selected.

### 5. Sprint Change Proposal Components

- [x] 5.1 Issue summary complete.
- [x] 5.2 Epic and artifact impacts documented.
- [x] 5.3 Recommended approach and trade-offs documented.
- [x] 5.4 MVP impact and action plan documented.
- [x] 5.5 Product Owner / Developer handoff defined.

### 6. Final Review and Handoff

- [x] 6.1 Applicable checklist items reviewed.
- [x] 6.2 Proposal reviewed for consistency.
- [x] 6.3 Explicit approval received from Den on 2026-08-15.
- [!] 6.4 Sprint status update is assigned to implementation handoff.
- [x] 6.5 Responsibilities, verification, and success criteria confirmed.

## Approved Amendment / Decision Record — 2026-08-17

**Status:** Approved  
**Decision:** During the one-time initial Booqable import/materialization only, do not create Workshop Tasks for a Booqable order whose exact order status is `canceled`, `stopped`, or `archived` when no Workshop Bike Task already exists.

This is a limited initial-materialization boundary. It does not alter the existing live-task lifecycle, including cancellation/reactivation behavior and Return Check, and it does not remove or change an existing Workshop Bike Task.

### Required Validation

- Confirm that initial materialization does not create Workshop Tasks for orders with the exact statuses `canceled`, `stopped`, or `archived` when no Workshop Bike Task exists.
- Confirm that initial materialization remains able to create the applicable Workshop Tasks for orders outside those exact statuses.
- Confirm that orders with an existing Workshop Bike Task retain the existing live-task lifecycle, cancellation/reactivation behavior, and Return Check.

## Approved Amendment / Decision Record — 2026-08-17

**Status:** Approved  
**Decision:** Retain the existing `GET /api/sandbox/booqable/sync-orders` route as a temporary legacy exception to the v1 no-manual-recovery model.

The route remains secret-protected and preview-denied. It refetches Booqable authority and runs the existing sync path; it does not directly edit source or task tables. This exception does not establish a new per-order/manual recovery API, retry queue, worker, Cron job, or reconciliation system, and all other v1 no-recovery boundaries remain in force.

### Future Containment / Retirement

Retire or further contain this temporary legacy exception only through a future explicitly approved change that makes a replacement-or-removal decision. Its retirement is not contingent on a worker; the proposed worker is cancelled.
