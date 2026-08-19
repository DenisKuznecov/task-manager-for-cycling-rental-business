---
title: "Sprint Change Proposal: Compressed Workshop Tasks Plan"
date: 2026-08-18
status: approved
approved_by: Den
approved_at: 2026-08-18
change_scope: moderate
mode: incremental
source: ../../forge/workshop-tasks-continue-or-restart/forged-idea.md
---

# Sprint Change Proposal: Compressed Workshop Tasks Plan

## 1. Issue Summary

### Trigger

The Workshop Tasks plan was reassessed after the original nine-epic backlog accumulated enterprise-style ingestion, lifecycle, rollout, and multi-shop controls that are not required to operate a three-person workshop.

### Problem statement

The current plan over-specifies autonomous source reconciliation and formal activation infrastructure while under-serving the immediate operational goal: a manager assigns the physical bike in Booqable, mechanics perform a digital Prep checklist with independent second-mechanic sign-off, and the shop accumulates trustworthy task history.

This is a strategic MVP correction, not a rollback of shipped work or a defect in the canonical integration layer.

### Evidence

- Checklist templates (Epic 1) and canonical Booqable work through Story 2.10 are already shipped and useful.
- Mechanics already re-check Booqable manually; the practical cost of stale information is a walk to the rack, not an unbounded safety or financial risk.
- The manager already reconciles bike availability with the customer and assigns the stock ID in Booqable.
- The canonical adapter's nested fetch is the only contracted path that can retrieve the stock-item barcode needed for the feature.
- The original Epics 3–9 contain 34 unstarted stories, including replacement-chain, freshness-proof, rollout, and tenancy-oriented scope unsupported by the immediate operating model.

## 2. Impact Analysis

### Epic impact

- **Epic 1:** Keep as shipped. Mark it `done`.
- **Epic 2:** Keep Stories 2.1–2.10 frozen. Replace Stories 2.11–2.14 with one slim live-wiring story.
- **Epic 3:** Replace four autonomous identity/lifecycle stories with two manager-assigned-bike stories.
- **Epic 4 + Epic 7:** Combine into two manager intervention stories.
- **Epic 5:** Replace ten mechanic-flow stories with four checklist-execution stories.
- **Epic 6:** Replace six source-change stories with one active-preparation reconfirmation story.
- **Epic 8:** Replace five Return Check stories with two stories that reuse the Prep task/checklist mechanics.
- **Epic 9:** Remove. Adoption is an operating practice, not a release-control feature.

### Artifact conflicts

- The PRD currently requires provisional/multi-quantity identity, automatic lifecycle reconciliation, targeted invalidation, individual Return acknowledgement, and formal rollout controls. Those requirements conflict with the approved MVP.
- The Architecture Spine currently prescribes exact membership/replacement chains, JIT freshness proofs, activation epochs, enrollment cohorts, and correction successors. These conflict with manager-assigned source identity and direct use in one workshop.
- The UX artifacts contain corresponding intake, Activity, change-mapping, and rollout surfaces that are not in the compressed release.
- `project-context.md` and the implementation contexts still contain future-cutover constraints that must be replaced with the approved single canonical fetch-and-apply wiring boundary.
- `sprint-status.yaml` still reports Epic 1 as in progress and has an obsolete open Story 2.7 rollback action.

### Technical impact

- The existing canonical layer from Stories 2.4–2.10 remains frozen. No extensions are authorized except the approved live wiring story.
- The existing `sync.ts` remains untouched.
- The live webhook becomes a signal that refetches authoritative order data through the canonical adapter and calls `apply_canonical_order_graph`.
- Claiming a task refetches and applies the current order first. This is a simple current-authority check, not a signed freshness-proof protocol.
- Manager assignment is the source of operational bike identity. No provisional task, quantity expansion, overlap guard, replacement-chain algebra, automatic reactivation, or correction successor is introduced.
- No tenancy, shop scope, rollout epoch, pilot cohort, retry worker, reconciliation sweep, or formal activation gate is introduced.

## 3. Recommended Approach

### Selected path: Direct adjustment with MVP scope reduction

Update the planning artifacts and backlog to preserve shipped work, connect the canonical source layer to live signals, and build only the workflows required to run the current workshop.

### Options considered

- **Direct adjustment:** viable. It preserves completed work and converts the canonical layer into the data feed needed by Workshop Tasks.
- **Rollback:** not viable. Epic 1 and the canonical layer are already shipped value; rolling them back would lose useful groundwork without addressing the scope problem.
- **Original-MVP continuation:** not viable. It continues to invest in rollout, lifecycle, and multi-shop machinery before the current shop has proven the basic workflow.

### Estimate and risk

- **Effort:** Medium. The work is largely a backlog/documentation reorganization followed by a smaller, clearer implementation sequence.
- **Risk:** Medium. The canonical live-wiring story is the main integration boundary and must preserve existing brownfield behavior.
- **Timeline impact:** Reduces planned unstarted feature work from 34 stories in Epics 3–9 to 11 focused stories.

## 4. Detailed Change Proposals

### 4.1 Epics and stories

#### Epic 2 — replace Stories 2.11–2.14

**OLD**

- 2.11 Issue Exact JIT Freshness Proofs
- 2.12 Cut Over Every Booqable Writer
- 2.13 Revoke Legacy Source Writers
- 2.14 Establish the Workshop Rollout Control Plane

**NEW**

- 2.11 Wire Authoritative Source Refresh to the Webhook and Task Claim
  - The webhook identifies the order signal, refetches current Booqable authority through the canonical adapter, and invokes `apply_canonical_order_graph`.
  - A mechanic claim refetches and applies the current order before it claims the task.
  - Preserve `sync.ts`; add no freshness-proof protocol, retry infrastructure, legacy-writer revocation, or rollout control plane.

**Rationale:** A single canonical fetch-and-apply path supplies the live source data that the shop needs without retaining unused enterprise rollout infrastructure.

#### Epic 3 — replace four stories with two

**OLD**

- Exact membership identity, provisional tasks, replacement-chain incarnation, source overlays, automatic lifecycle reconciliation, immutable snapshot contention, and correction successors.

**NEW**

- 3.1 Create Tasks from Manager-Assigned Bikes
  - Create one Bike Task only after a manager has assigned an exact Booqable stock ID.
  - Select the Prep template from the controlled source category tag.
  - Do not create a task for ambiguous or unassigned bikes.
- 3.2 Replace or Cancel Assigned Work Simply
  - When the assigned stock ID changes or the rental is cancelled, flag the existing task as no longer actionable.
  - Create a fresh task only for a newly assigned replacement.
  - Preserve attribution/history without replacement-chain algebra, overlap guards, correction successors, or automated reactivation.

**Rationale:** Managers already resolve physical-bike assignment in Booqable; the system should reflect that decision rather than invent an autonomous inventory-reconciliation model.

#### Epic 4 — redefine as Manager Intervention

**OLD**

- Source-backed intake visibility, correction successors, and local seam proof.

**NEW**

- 4.1 Manager Attention Queue
  - Managers see tasks requiring attention, their reason, and current owner.
  - Resolving attention does not block valid mechanic completion.
- 4.2 Manager Task Intervention
  - Managers reassign active work or force-close abandoned work.
  - Every intervention records actor, time, reason, and resulting status.

**Rationale:** Managers need a direct exception loop, not an intake/correction subsystem.

#### Epic 5 — replace ten stories with four

**OLD**

- Separate stories for dashboard, claim races, context, Action/Value evidence, autosave, Notes, structured modifications, handoff, Re-check, and stale-screen recovery.

**NEW**

- 5.1 Mechanic Work Queue and Claim
  - Show available manager-created tasks and each mechanic's assigned tasks.
  - Enforce one owner through a database uniqueness/conditional-update rule; claim races are not a separate story.
- 5.2 M1 Preparation Checklist
  - M1 records server-confirmed required Prep work and hands off only when it is complete.
- 5.3 M2 Independent Re-check
  - Items marked as requiring a second mechanic show in M2's column.
  - M2 records a separate attestation and signature; M1 cannot self-complete M2 work.
- 5.4 Completion History
  - Persist claim, preparation, re-check, task outcome, actor, time, and checklist results for later performance/history reporting.
  - Do not build an analytics dashboard now.

**Rationale:** The core mechanic outcome is a usable, paperless, dual-signoff checklist rather than a generalized task-state platform.

#### Epic 6 — replace six stories with one

**OLD**

- Attested configuration baselines, accessory-tag mapping, selective invalidation, reopening cycles, rental boundaries, and detailed change-history semantics.

**NEW**

- 6.1 Reconfirm Changed Work During Preparation
  - When canonical refresh detects a relevant current-order change during active M1 Prep, keep the task assigned and visibly flag it for reconfirmation.
  - M1 reviews current Booqable context and reconfirms the affected preparation before handoff.
  - Do not add accessory-tag interpretation, mapping configuration, per-item selective invalidation, signed freshness proofs, automatic reopening after Prep/Re-check completion, or a new Work Cycle model.

**Rationale:** This solves the real stale-information risk without creating a configuration-change engine.

#### Epic 7 — remove

**OLD**

- Separate manager exception/audit epic containing attention, assignment, reset, override, force-close, and Activity stories.

**NEW**

- Its required manager functions move to Epic 4.
- Remove reset, same-mechanic override, standalone Activity, and stale-manager workflows.

#### Epic 8 — replace five stories with two

**OLD**

- Specialized per-bike return derivation, claim/context, checklist execution, modification acknowledgement, and end-to-end seam stories.

**NEW**

- 8.1 Create and Claim Return Work
  - A returned rental makes its associated task available for one mechanic to claim using the existing queue, assignment, and audit mechanisms.
- 8.2 Complete the Return Checklist
  - Reuse Prep checklist mechanics with the category-specific Return template, then close the task as Done with actor and timestamp.
  - Return observations belong in task history; no individual modification-acknowledgement engine is required.

#### Epic 9 — remove

**OLD**

- Environment proof, pilot cohort, general enablement, and paper-retirement approval.

**NEW**

- Document an operating note outside the implementation backlog:
  - Run the feature in the current shop, keep paper as a local fallback until the team is comfortable, and capture evidence before making a franchise claim.
  - Do not build a rollout control plane, cohort feature, tenancy, or paper-retirement workflow.

### 4.2 PRD update

**OLD**

The PRD defines 48 detailed functional requirements and 38 architecture requirements, including autonomous source identity/lifecycle rules, JIT proof, selective invalidation, specialized Return acknowledgements, rollout control, and formal pilot gates.

**NEW**

Retain the vision and roles. Replace the functional scope with these MVP requirements:

1. Managers maintain category-specific Prep and Return templates, with a per-item second-mechanic requirement.
2. A task is created only after a manager assigns an exact Booqable stock ID; the source category tag selects its template.
3. Mechanics can see, claim, and resume assigned work.
4. M1 completes Prep before handoff.
5. M2 independently signs the configured second-mechanic Items.
6. A relevant source change during active Prep requires visible reconfirmation before handoff.
7. Managers resolve attention, reassign, or force-close.
8. Returned bikes use the same task/checklist machinery and produce attributable history.

Explicit non-goals: provisional/multi-quantity identity, replacement chains, automated reactivation, JIT proofs, selective mapping, rollout control, tenancy, formal pilot gates, individual modification acknowledgements, and full analytics.

### 4.3 Architecture update

**OLD**

The Architecture Spine mandates a high-assurance membership/lifecycle system, signed JIT freshness proofs, activation/enrollment control, correction successors, and broad source-change/Return engines.

**NEW**

- Preserve the transactional modular monolith, Booqable adapter boundary, frozen canonical projection, RLS, authenticated actions, atomic database mutations, and attributable history.
- Define one live fetch-and-apply boundary for webhook signals and task claims.
- Define manager-assigned stock-ID tasks with a small actionable/cancelled/replaced/force-closed/done status model.
- Define templates with M1 and M2 Item roles, simple active-Prep reconfirmation, manager intervention, and a reusable Return phase.
- Remove lifecycle-incarnation algebra, JIT proof, activation epoch/cohort, correction-successor, selective mapping, and specialized Return engines.
- Update the stack inventory to match the shipped Next.js 16 / React 19 baseline.

### 4.4 UX update

**OLD**

The UX spines describe separate intake, Activity, previous-information, last-touch, structured-modification acknowledgement, detailed change-mapping, and rollout surfaces.

**NEW**

- Keep the Subframe admin shell, tablet-first mechanic controls, completed template editor, mechanic queue, task detail, M1/M2 signatures, manager attention/intervention, Return Check, and server-confirmed save/error feedback.
- Make the task screen the focused work surface: bike/order context, Prep or Return checklist, M1/M2 signatures, active-preparation reconfirmation notice, and completion controls.
- Defer separate intake, Activity, previous-information, last-touch, structured-modification acknowledgement, detailed mapping, rollout, pilot, and correction screens.
- Do not create UI for tenancy, tag approval, accessory mapping, or paper retirement.

### 4.5 Sprint status and implementation artifacts

**OLD**

- Epic 1 is `in-progress` despite all five stories being done.
- Epic 2 contains backlog Stories 2.11–2.14.
- Epics 3–9 contain the original unstarted story set.
- The completed Story 2.7 forward-revert remains an open action item.

**NEW**

- Mark Epic 1 `done`.
- Keep Epic 2 `in-progress`; retain Stories 2.1–2.10 as done and replace 2.11–2.14 with one backlog wiring story.
- Replace Epics 3, 4, 5, 6, and 8 with the approved slim story sets.
- Remove Epic 7 and Epic 9.
- Mark the Story 2.7 rollback action `done`.
- Do not alter the uncommitted Story 2.10 proof changes.
- Create concise implementation specs only after the rewritten stories are approved and ready for development.

## 5. Implementation Handoff

### Scope classification

**Moderate.** The work needs a backlog/documentation reorganization before implementation, but it does not require a new product strategy or architecture discovery.

### Handoff recipients

- **Product Owner / planning agent:** Apply the approved PRD, epic, UX, architecture, project-context, and sprint-status edits as one internally consistent planning update.
- **Developer agent:** Implement the new Epic 2 wiring story first, preserving the frozen canonical layer and `sync.ts`.
- **Developer agent:** Implement the compressed stories in dependency order: Epic 3 → Epic 5 → Epic 6 → Epic 4 → Epic 8.

### Implementation success criteria

- The canonical fetch-and-apply path is invoked by the webhook and task claim without changing `sync.ts`.
- A manager-assigned stock ID produces one category-template-based task.
- M1/M2 can complete the required two-person checklist on a tablet.
- An active Prep source change visibly requires reconfirmation before handoff.
- Managers can flag, reassign, and force-close work.
- Return Check reuses task/checklist machinery.
- All new migrations remain idempotent and are tested locally only; staging and production schema deployment remains CI-driven.

## 6. Checklist and Approval Status

- [x] Trigger and supporting evidence documented.
- [x] Epic impact assessed.
- [x] PRD, architecture, UX, technical, and sprint-status impacts assessed.
- [x] Direct adjustment and scope reduction selected; rollback rejected.
- [x] Incremental edit proposals approved for Epics 2–9, PRD, architecture, UX, and sprint status.
- [!] Final user approval is required before modifying active planning artifacts.
- [!] After approval, rewrite the active artifacts and synchronize `sprint-status.yaml`.

