---
title: Correct Course Handoff — Workshop Tasks
date: 2026-08-12
status: ready-for-new-chat
source_report: _bmad-output/planning-artifacts/implementation-readiness-report-2026-08-12.md
---

# Correct Course Handoff — Workshop Tasks

## Purpose

Run the BMad Correct Course workflow in a fresh chat to resolve the Workshop Tasks implementation-readiness findings before Phase 4.

No Correct Course analysis or proposal has been completed yet. The previous chat only activated the workflow and established the readiness report as the trigger.

## Recommended New-Chat Prompt

```text
/bmad-correct-course

Run Correct Course for the Workshop Tasks feature using:
_bmad-output/planning-artifacts/correct-course-handoff-workshop-tasks-2026-08-12.md

Use incremental review mode. Treat the implementation-readiness report as the change trigger. Do not start implementation or sprint planning. Produce proposed artifact edits and a Sprint Change Proposal, then wait for my explicit approval before applying the proposal.
```

## Change Trigger

The implementation-readiness assessment concluded **NOT READY** despite complete requirements coverage:

- 48/48 Functional Requirements are covered.
- All eight NFRs are represented.
- PRD, UX, and architecture are broadly aligned.
- The blocking problems are epic/story decomposition, sequencing, and product-authority clarity.

Authoritative assessment:

`_bmad-output/planning-artifacts/implementation-readiness-report-2026-08-12.md`

## Artifacts to Load

Load these completely:

1. PRD:
   - `_bmad-output/planning-artifacts/prds/prd-echelon-cycling-hub-admin-2026-08-07/prd.md`
   - `_bmad-output/planning-artifacts/prds/prd-echelon-cycling-hub-admin-2026-08-07/addendum.md`
2. Architecture:
   - `_bmad-output/planning-artifacts/architecture/architecture-echelon-cycling-hub-admin-2026-08-10/ARCHITECTURE-SPINE.md`
3. UX:
   - `_bmad-output/planning-artifacts/ux-designs/ux-echelon-cycling-hub-admin-2026-08-07/DESIGN.md`
   - `_bmad-output/planning-artifacts/ux-designs/ux-echelon-cycling-hub-admin-2026-08-07/EXPERIENCE.md`
4. Epics and stories:
   - `_bmad-output/planning-artifacts/epics.md`
5. Readiness evidence:
   - `_bmad-output/planning-artifacts/implementation-readiness-report-2026-08-12.md`

Treat review chains, memory files, and resume handoffs as supporting evidence rather than authoritative sources unless a conflict requires investigation.

## Required Correct Course Outcomes

### 1. Establish Product Authority for the Attention Model

Propose exact PRD changes that explicitly accept, revise, or reject:

- the mechanic attention reason catalogue;
- required creation and resolution notes for missing/unclear information and manager-decision reasons;
- the mechanic-request → manager Approve/Decline flow for same-mechanic Re-check exceptions.

Preserve the existing principles that Needs Attention is non-blocking and FR-45 overrides are explicit, per-task/per-cycle, attributable, and never automatic.

Prefer adding acceptance-level subrequirements under FR-38, FR-43, and FR-45 unless new stable FR IDs are demonstrably necessary.

### 2. Re-decompose Epic 2

Epic 2 currently contains 20 stories spanning:

- security and session containment;
- framework/toolchain upgrades;
- source contracts and mappings;
- canonical projection and caller cutover;
- workers, reconciliation, and freshness;
- rollout control;
- per-bike membership/task derivation;
- intake UI, repair, and proof.

Propose smaller, coherent operator/staff outcomes while preserving dependency order and all FR/architecture traceability.

At minimum evaluate separation into:

1. secure canonical Booqable operations;
2. exact per-bike membership and Bike Task intake;
3. source-backed intake visibility, correction, and proof.

Do not turn the replacement structure into unlabeled technical milestones. Each epic must state the operational capability and beneficiary.

### 3. Split Story 2.4

Separate the oversized contract work currently combining:

- `order_graph` and `resource_batch`;
- producer/profile/schema versions and result vocabulary;
- ProductGroup allowlist and Setup mapping;
- Workshop event and incident catalogues;
- task-context contracts;
- generation and compatibility checks.

Place each contract with the earliest story that consumes it while keeping one repository-owned source of truth and drift checking.

### 4. Repair Epic 5 Sequencing

Story 5.1 currently assumes:

- attention records whose creation is introduced by Story 5.2; and
- “already-available manager controls” implemented later in Stories 5.4–5.7.

Propose a sequence where:

1. attention creation/domain records exist before dashboard triage;
2. Manager Attention Detail initially exposes only capabilities already delivered;
3. assignment, reset, override, and force-close controls are added by their own later stories.

No story may depend on future stories.

### 5. Separate Return Check from Operational Adoption

Keep Return Check implementation cohesive and separate:

- Stories 6.1–6.5 form the Return Check capability.
- Environment proof, pilot activation, general enablement, and paper retirement belong in a separate operational-adoption epic or release-gate package.

Split pilot activation from general enablement because they have different evidence, approvals, cohorts, and rollback decisions.

Replace Story 6.6’s ambiguous “Epics 1–6 capabilities” premise with explicit predecessors: completed Epics 1–5 plus Return Check through Story 6.5.

### 6. Rationalize Cross-Cutting Proof Stories

Review Stories 2.20, 3.10, 6.5, and 6.6.

- Move feature-specific pgTAP, role, concurrency, responsive, and accessibility proof into each originating story’s Definition of Done or acceptance criteria.
- Retain a separate gate only for evidence that is genuinely cross-story or environment-bound.
- Avoid late QA stories that merely rediscover defects from earlier work.

### 7. Correct Secondary Documentation Gaps

Propose architecture structural-seed entries for:

- Checklist Template Library; and
- Activity/History.

Review story titles whose scope is broader than their stated user outcome, especially Stories 1.1 and 5.8.

## Non-Negotiable Constraints

- Preserve all 48 FRs and eight NFRs unless the user explicitly approves a product-scope change.
- Preserve the architecture’s transactional modular-monolith boundaries.
- Booqable remains source of truth for rental intent; notifications only trigger authoritative refetch.
- Never fabricate physical-bike identity for ambiguous multi-quantity units.
- Generic source absence remains non-closing.
- Keep broad configuration review as the safe fallback until complete targeted mapping is approved.
- Preserve PostgreSQL-owned workflow transactions, revision checks, RLS/capability boundaries, append-only audit, and typed stale/conflict results.
- Partners remain excluded from Workshop Tasks.
- Preserve confirmed-save, typed-input retention, loading, retry, accessibility, and responsive workshop requirements.
- Remote database DDL remains CI-only; Correct Course must not implement code or migrations.
- Do not start Sprint Planning until a rerun of implementation readiness returns READY.

## Workflow Instructions

1. Use **Incremental** review mode unless the user chooses otherwise.
2. Complete the Correct Course checklist interactively.
3. For every proposed edit, show:
   - artifact and section;
   - old text;
   - proposed new text;
   - rationale;
   - FR/NFR/architecture impact.
4. Do not modify authoritative PRD, architecture, UX, or epics during proposal drafting.
5. Produce:
   - a Sprint Change Proposal;
   - explicit before/after artifact edits;
   - scope classification and handoff.
6. Wait for explicit approval before applying the proposal.
7. After approved edits are applied, rerun `/bmad-check-implementation-readiness`.

## Expected Change Classification

**Major** — this requires Product Manager and Solution Architect review because it restructures multiple epics, changes story sequencing, and promotes UX-derived behavior into product authority. It does not currently require product-scope reduction or code rollback.

## Success Criteria

Correct Course is successful when:

- the attention model has explicit PRD authority;
- every epic has one coherent operational outcome;
- no story depends on a later story;
- Epic 2 is decomposed into manageable value-oriented units;
- Return Check is separate from rollout/adoption;
- pilot and general activation are separate decisions;
- proof obligations sit with originating stories or a clearly bounded gate;
- all 48 FRs and eight NFRs retain traceable implementation paths;
- architecture and UX remain aligned with the revised plan;
- a new implementation-readiness run returns READY.
