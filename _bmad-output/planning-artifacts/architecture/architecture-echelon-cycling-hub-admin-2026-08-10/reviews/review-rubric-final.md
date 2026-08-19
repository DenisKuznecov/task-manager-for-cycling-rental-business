# Final Architecture Spine Review — Workshop Tasks

**Review date:** 2026-08-18  
**Artifact:** `ARCHITECTURE-SPINE.md` (revised 2026-08-18)  
**Review mode:** BMad good-spine rubric plus targeted MVP seam validation  
**Verdict:** **Pass — no critical, high, medium, or low findings.** The revision closes the first-review seams without reintroducing the retired autonomous-reconciliation scope.

## Evidence examined

- Revised spine and architecture memlog
- Final Workshop Tasks PRD and addendum
- Approved 2026-08-18 sprint-change proposal
- Retained `_bmad-output/project-context.md`
- Brownfield canonical adapter, ingestion coordinator, current webhook, and package manifest
- `lint_spine.py --workspace .../architecture-echelon-cycling-hub-admin-2026-08-10`

Mechanical lint passed with zero findings.

## BMad good-spine checklist

| Check | Result | Evidence |
| --- | --- | --- |
| Fixes the real one-level-down divergence points | Pass | The ADs bind the source boundary, derivation, workflow state, snapshots, transactionality, concurrency, security, reads, and rollout/operations—the decisions that separate stories could otherwise implement incompatibly. |
| Every AD has an enforceable Rule that prevents its stated divergence | Pass | All AD-1 through AD-19 contain `Binds`, `Prevents`, and concrete Rules. The rules name owners, allowed callers, atomicity, result behavior, or explicit prohibitions rather than intent alone. |
| Deferred items are safe | Pass | Each deferred item is either a display/UX/detail choice bounded by an AD, or an explicitly excluded future capability. None delegates source ownership, task identity, lifecycle, authorization, or concurrency to downstream stories. |
| Brownfield reality is ratified, not contradicted | Pass | The spine preserves the existing `sync.ts` webhook path until the approved wiring story; uses the existing canonical adapter/profile and `apply_canonical_order_graph`; protects frozen consumers; and matches the current code's signal-only/refetch pattern. |
| Spec capabilities are covered | Pass | The capability map covers FR-1 through FR-22 and NFR-1 through NFR-7. The updated outcome/phase, M1/M2, Return, attention, refresh, and Notes requirements all land in one or more binding ADs. |
| Stack is pinned and consistent with repository reality | Pass | The stack versions agree with `package.json`/project context; PostgreSQL 17 and Booqable v4 are explicitly bound. |
| Every owned dimension is decided, deferred, or open | Pass | The feature has decisions for presentation, integration, source/task data ownership, mutation/read authority, security, deployment, environment/operational constraints, recovery limits, testing boundary, and UX state. No operational/environmental dimension is silent. |

## Targeted seam validation

### Source derivation ownership — closed

AD-5 now names the missing owner and call chain: only `apply_canonical_order_graph` invokes one service-only internal Workshop derivation function, in the same transaction, for an accepted `applied` source result. It prohibits every other source-triggered create/cancel/replace/reconfirm path. AD-11 separately prohibits client execution of that capability. This is consistent with the coordinator being the source writer and eliminates the prior ambiguity between direct service-role DML and an internal derivation capability.

### Return preemption — closed

AD-6 defines the complete precedence: a returned actionable task clears Prep/Re-check ownership atomically, creates one Return Snapshot from the then-current valid category, records interrupted work, increments the task revision, and becomes unassigned `Needs Return Check`. Repeated returned refreshes are no-ops; terminal/replaced/cancelled tasks are not return-eligible. This matches FR-18 and prevents a downstream story from retaining a Prep/Re-check owner or creating duplicate Return work.

### Online-only behavior — closed

AD-12 makes commands live-request/server-confirmed only. It permits session-local unsaved input but forbids command queueing/replay and forbids cached/offline tasks from appearing claimable or completable. This satisfies NFR-7 while preserving the PRD’s retained-input behavior for an open online session.

### Webhook and claim failure split — closed

AD-4 gives each caller the correct contract: the webhook logs its contextual failure and returns retryable failure, while a claim returns `{ ok: false, error }` without claiming. It also permits only bounded synchronous transport retries and explicit user resubmission inside the verified route budget, while rejecting durable queues, workers, sweeps, hidden retries, and new repair APIs. That preserves the current webhook’s retryable-error behavior and honors FR-21’s “no stale claim” requirement.

### Operational constraints — closed

AD-14 provides a feature-level operational envelope rather than leaving deployment implicit: local idempotent migration proof, CI-only remote application, preview ingestion denial, preservation of existing consumers, and a verified route-level deadline spanning fetch/retry/normalization/apply. The Vercel execution model is deliberately an implementation proof before live wiring, not an invented timeout assertion. AD-19 correctly reserves paper fallback and excludes a rollout control plane, cohorting, tenancy, retry/reconciliation infrastructure, and repair APIs.

### FR-22 shared Notes — covered

FR-22 lands coherently in AD-10, AD-12, and AD-18: one mutable latest-value field; authorized assigned mechanics and Admin/Manager mutation through capability RPCs; its own expected revision; task-scoped visibility in Prep and Return; and no misuse as immutable audit evidence or a completion gate. The capability map explicitly maps FR-22 to these ADs. The addendum’s stale statement that the new PRD IDs end at FR-21 does not alter this result: the final PRD defines FR-22, and the spine correctly binds and maps it.

### Safe deferrals — verified

- The relevant-change predicate is safely deferred because AD-13 assigns ownership to the source-derivation boundary, establishes the conservative default, and requires fixtures; no UI loader may independently decide it.
- Unassigned-bike visibility and unfinished-Prep Return presentation are UX choices that cannot create tasks or alter Return state semantics.
- Identity/recovery platform, selective configuration engines, and broader operating controls are explicitly non-MVP and constrained by AD-19 rather than silently left to stories.
- Schema attributes/indexes remain ordinary implementation detail while the ownership, state, snapshot, transaction, history, concurrency, and security invariants remain non-deferrable.

## Retained project-context dependency

The architecture describes the known stale-project-context dependency accurately. `project-context.md` still contains the superseded enterprise cutover rules—durable retries/reconciliation, activation/cohorts, freshness proofs, membership-incarnation/replacement mechanisms, and older source-change behavior—alongside still-valid frozen canonical-adapter, brownfield-reader, security, and deployment constraints. AD-19 and the Deferred “Project-context alignment” item both do the necessary two things:

1. treat the approved PRD/spine as controlling for this MVP; and
2. require a separately authorized project-context alignment update before Workshop implementation, so implementers are not governed by contradictory persistent instructions.

The spine does not pretend that the stale context has already been updated, and it does not discard the brownfield constraints that remain valid. No spine edit is required for this dependency.

## Findings

`[]`
