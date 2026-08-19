# PRD Reconciliation Completion Review — Workshop Tasks MVP

**Reviewed:** 2026-08-18  
**Artifact:** `../ARCHITECTURE-SPINE.md`  
**Sources:** approved `../../prds/prd-echelon-cycling-hub-admin-2026-08-07/prd.md`, its `addendum.md`, and `../../../sprint-change-proposal-2026-08-18.md`  
**Scope:** FR-1..FR-22 and NFR-1..NFR-7. This review does not change any source artifact.

## Verdict

**PASS — no critical or high findings.**

The spine reconciles the approved compressed MVP without restoring the rejected autonomous lifecycle, source-recovery, rollout, or multi-shop scope. The most recent corrections close the previously open assignment-removal, manager-intervention-reason, and Notes-editor-authorization seams.

## Requirement reconciliation matrix

| Requirement | Architecture landing | Result |
| --- | --- | --- |
| FR-1 Templates | AD-7; capability map | Covered |
| FR-2 Item types and M1/M2 configuration | AD-7 | Covered |
| FR-3 Immutable Prep/Return snapshots | AD-2, AD-6, AD-7 | Covered |
| FR-4 Exact assigned StockItem task creation | AD-5 | Covered |
| FR-5 Controlled source-tag category selection | AD-13 | Covered |
| FR-6 Simple cancellation/replacement | AD-5, AD-6 | Covered |
| FR-7 Available Now and My Work | AD-12 | Covered |
| FR-8 First-writer-wins claim | AD-9, AD-15 | Covered |
| FR-9 Per-bike independent work | AD-5, AD-9, AD-12 | Covered |
| FR-10 Current rental/task context | AD-3, AD-12, AD-18 | Covered |
| FR-11 Prep outcomes | AD-7, AD-9 | Covered |
| FR-12 Confirmed complete-Prep handoff | AD-6, AD-7, AD-9 | Covered |
| FR-13 Different M2 mechanic | AD-6, AD-7, AD-10 | Covered |
| FR-14 Separate M2 attestation | AD-7, AD-9 | Covered |
| FR-15 Active-Prep reconfirmation only | AD-5, AD-9, AD-13 | Covered |
| FR-16 Needs Attention | AD-8, AD-10, AD-12 | Covered |
| FR-17 Reassignment / force-close | AD-8, AD-10 | Covered |
| FR-18 Return work becomes claimable | AD-6, AD-7, AD-9 | Covered |
| FR-19 One-mechanic Return completion | AD-6, AD-7 | Covered |
| FR-20 Attributable workshop history | AD-8, AD-18 | Covered |
| FR-21 Current-authority refresh on signal and claim | AD-4, AD-15, AD-16 | Covered |
| FR-22 Shared latest-value Notes | AD-9, AD-10, AD-18 | Covered |
| NFR-1–NFR-4 Usability, form factors, confirmed/pending saves | AD-9, AD-12; consistency conventions | Covered |
| NFR-5 Audit integrity | AD-2, AD-8, AD-18 | Covered |
| NFR-6 Authorized access | AD-10, AD-11 | Covered |
| NFR-7 Online-only | AD-12 | Covered |

## Targeted scope-regression checks

### Assignment removal

**Pass.** AD-5 states that cancellation or removal of an exact assignment without a replacement transitions the current task to `Cancelled`. AD-6 requires cancellation and assignment removal to clear assignment atomically. A different exact StockItem transitions the prior task to `Replaced` and creates a fresh task; a formerly `Cancelled` or `Replaced` StockItem cannot silently reactivate. This preserves FR-4 and FR-6 while retaining the proposal's explicit rejection of provisional tasks, replacement chains, automatic reactivation, and correction successors.

### Manager intervention reasons

**Pass.** AD-10 requires both reassignment and force-close to carry a manager-supplied reason in the immutable history event. AD-8 requires the current state and its attributed event to commit together. This satisfies FR-17's requirement to record actor, time, reason, and resulting status without conflating intervention with the separate, non-blocking Needs Attention reason model.

### Notes editor authorization

**Pass.** AD-10 limits Notes edits to the current assigned mechanic in an Actionable phase or an Admin/Manager, and AD-11 requires capability-RPC authorization rather than browser role checks. AD-9 supplies an independent Notes revision, while AD-18 keeps Notes in task-scoped context and immutable observations in history. This preserves FR-22's assignment-scoped shared editing and avoids both unrestricted mechanic access and an invented Notes history feature.

## Approved-MVP boundary checks

- **Manager-assigned identity:** AD-5 permits tasks only for exact assigned StockItems, rejects unassigned/ambiguous/draft/new/concept input, and scopes identity to rental/order plus StockItem.
- **Canonical integration:** AD-3, AD-4, AD-5, AD-15, and AD-16 retain one canonical fetch-and-apply boundary; notifications are signals, claims refresh before mutation, and `sync.ts` remains unchanged.
- **Source changes:** AD-13 allows reconfirmation only during `In Prep`; it does not introduce selective invalidation, reopening, or a Work Cycle.
- **Attention and Return:** AD-10 keeps attention non-blocking and separate from outcomes. AD-6 interrupts active Prep/Re-check atomically for Return, with no Return M2 or individual modification-acknowledgement engine.
- **Operational non-goals:** AD-12, AD-14, and AD-19 preserve online-only usage, local migration verification/CI deployment, runtime preview-ingestion denial, and the absence of queues, sweeps, repair APIs, cohorts, tenancy, or rollout controls.

## Non-blocking documentation note

`addendum.md` line 26 still says the new PRD IDs are FR-1 through FR-21. The controlling `prd.md` defines FR-22, and the spine front matter plus capability map correctly bind and map FR-22. Because the addendum explicitly yields to `prd.md` on disagreement, this does not create scope regression or an architecture gap; it remains a low-priority source-maintenance correction outside this no-source-edit review.

## Findings

### Critical

None.

### High

None.

## Conclusion

`ARCHITECTURE-SPINE.md` is reconciled with the approved PRD, addendum, and sprint proposal for FR-1..FR-22 and NFR-1..NFR-7. The assignment-removal, manager-reason, and Notes authorization decisions are now enforceable MVP rules, not downstream interpretation choices.
