---
title: Sprint Change Proposal — Workshop Tasks Implementation Readiness
date: 2026-08-12
status: approved-applied-ready
change_scope: major
source:
  - _bmad-output/planning-artifacts/correct-course-handoff-workshop-tasks-2026-08-12.md
  - _bmad-output/planning-artifacts/implementation-readiness-report-2026-08-12.md
---

# Sprint Change Proposal — Workshop Tasks Implementation Readiness

## 1. Issue Summary

The Workshop Tasks planning package is requirements-complete but not safe to enter Phase 4 unchanged.

The 2026-08-12 implementation-readiness assessment found:

- all 48 Functional Requirements have traceable story coverage;
- all eight Non-Functional Requirements are represented;
- PRD, UX, and architecture agree on the principal lifecycle, ownership, synchronization, safety, and responsive-workshop behavior; but
- epic/story decomposition, sequencing, and product-authority clarity prevent a READY result.

The blocking evidence is:

1. Epic 2 is a 20-story program combining security, runtime/toolchain work, source contracts, projection, recovery, rollout control, task derivation, UI, correction, and proof before delivering staff-visible intake.
2. Story 2.4 combines independently evolving source, configuration, event, incident, and task-context contracts.
3. Epic 5 begins dashboard triage before attention creation and refers to manager controls introduced by later stories.
4. Epic 6 combines Return Check implementation with environment proof, pilot activation, general enablement, and paper retirement.
5. Pilot and general enablement are combined despite having different evidence, cohorts, approvals, and rollback decisions.
6. Broad proof stories duplicate obligations that belong in originating stories.
7. UX and architecture rely on an attention reason/note/request model that the PRD does not explicitly authorize.
8. The architecture structural seed omits explicit Checklist Template Library and Activity/History routes.

This is a planning-structure no-go, not a rejection of the product or architecture. No Workshop Tasks code rollback, product-scope reduction, or architecture replacement is recommended.

## 2. Impact Analysis

### Epic Impact

- Epic 1 remains a coherent prerequisite and gains only first-use event-contract clarification and a title correction.
- Current Epic 2 must be replaced by three coherent operational outcomes:
  1. secure and recoverable canonical Booqable operations;
  2. exact per-bike membership and Bike Task creation;
  3. source-backed intake visibility and safe correction.
- Current Epic 3 remains the paperless Prep/Re-check capability, renumbered after the split.
- Current Epic 4 remains the configuration-change capability, renumbered.
- Current Epic 5 remains the manager-exception capability, but its internal story order must be repaired.
- Current Epic 6 must become:
  - one Return Check epic; and
  - one separate adoption epic containing environment proof, pilot, general enablement, and paper retirement.

The resulting order is:

`Epic 1 → Epic 2 → Epic 3 → Epic 4 → Epic 5 → Epic 6 → Epic 7 → Epic 8 → Epic 9`

No existing product epic becomes obsolete. Epic 9 is an operational-adoption/release-gate package, not new product scope.

### Story Impact

- Split current Story 2.4 and place each contract at its earliest consumer.
- Move current Story 5.2 before current Story 5.1.
- Remove future manager controls from initial Attention Detail acceptance criteria; add each control in its own later story.
- Keep current Return Stories 6.1–6.5 as the Return Check capability.
- Move current Story 6.6 and rollout/paper-retirement work into the adoption epic.
- Split current Story 6.7 into separate pilot and general-enablement stories.
- Replace Story 6.6's “Epics 1–6” premise with explicit completed predecessors.
- Narrow broad proof stories and distribute feature-specific proof into originating stories.
- Correct story titles that understate or overstate their user outcome.

### Artifact Conflicts

#### PRD

The MVP remains achievable and no FR needs removal. Acceptance-level additions are required under FR-38, FR-43, and FR-45 so the PRD explicitly owns:

- the first-release attention reason catalogue;
- required creation and resolution notes;
- the mechanic-request → manager Approve/Decline same-mechanic Re-check exception.

#### Architecture

The architecture already adopts the required attention behavior and supports the revised sequencing. No architectural pattern or technology change is required.

The structural seed needs explicit routes for:

- Checklist Template Library; and
- task Activity/History.

#### UX

No UX behavior change is required. Existing attention, responsive, save, retry, stale-state, focus, accessibility, and manager-detail behavior remains aligned. The PRD edits remove the product-authority gap.

#### Other

- `epics.md` requires the major restructuring described below.
- The readiness report remains evidence and is not edited.
- No code, migration, infrastructure, deployment, or CI change is part of this proposal.
- Sprint Planning remains blocked until the revised package receives a READY implementation-readiness result.

### Technical Impact

The proposed planning changes preserve:

- the transactional modular monolith;
- PostgreSQL-owned workflow transactions and revision checks;
- RLS and capability boundaries;
- append-only attributable audit;
- typed stale/conflict results;
- one canonical Booqable projection;
- Booqable authority and notification-triggered refetch;
- exact physical-bike identity and non-closing generic absence;
- broad configuration review as the safe mapping fallback;
- CI-only remote DDL;
- confirmed-save, typed-input retention, loading, retry, responsive, and accessibility requirements.

## 3. Recommended Approach

### Selected Path: Direct Adjustment

Revise the planning artifacts before implementation:

1. make the attention model explicit in the PRD;
2. restructure and resequence `epics.md`;
3. add the two missing architecture route seeds;
4. rerun implementation readiness;
5. begin Sprint Planning only after READY.

### Alternatives Considered

#### Potential Rollback

Not applicable. Workshop Tasks implementation has not begun, so there is no completed feature work to revert.

#### MVP Scope Reduction

Not recommended. The readiness issue is delivery-plan structure, not product feasibility. All FRs and NFRs are covered and architecture/UX are broadly aligned.

### Effort, Risk, and Timeline

- Planning effort: High.
- Product/technical risk after correction: Medium.
- Scope impact: none.
- Architecture impact: low; structural documentation only.
- Timeline impact: Phase 4 is delayed for one planning correction/review cycle and a readiness rerun.
- Change classification: Major.

The classification is Major because multiple epics are restructured and Product Manager/Solution Architect review is required. It does not imply product-scope growth or architectural replacement.

## 4. Detailed Change Proposals

### A. PRD Changes

#### A1. FR-38 — First-Release Attention Reasons

**OLD**

> Needs Attention must not block a mechanic from completing their own work or from transitioning a Bike Task to Done. Open flags remain independently visible in the Manager Attention List until resolved.

**NEW**

Retain the existing text and append:

> First-release mechanic-raised Needs Attention uses exactly these reasons:
>
> - `same_mechanic_recheck_override`;
> - `missing_or_unclear_bike_order_information`; and
> - `manager_decision_needed`.
>
> Missing/unclear information and manager-decision reasons require a short creation explanation. A same-mechanic Re-check override request requires no explanation. The override request does not block another eligible mechanic from claiming Re-check; it preserves the ordinary independence rule for the requesting M1 until a manager explicitly approves the exception.

**Rationale**

UX, architecture AD-10, and stories already depend on these stable distinctions. This gives them explicit product authority without adding FR-49+.

**Impact**

Clarifies FR-38 and FR-46; preserves NFR-4, NFR-6, NFR-7, and non-blocking attention.

#### A2. FR-43 — Reason-Specific Resolution Notes

**OLD**

> An Admin / Manager must be able to discover unresolved Needs Attention flags in the Manager Attention List and resolve them. Resolving a flag clears that flag; it is not required to complete the Bike Task, and an open flag must not prevent Done when mechanical work is complete.

**NEW**

> An Admin / Manager must be able to discover unresolved Needs Attention flags in the Manager Attention List and resolve them. Missing/unclear information and manager-decision reasons require a short manager resolution note. Resolving a flag clears only that flag; it is not required to complete the Bike Task, and an open flag must not prevent Done when mechanical work is complete. Same-mechanic Re-check override requests are resolved through FR-45.

**Rationale**

This makes note requirements product behavior rather than UX-only scope.

**Impact**

Clarifies FR-43 and FR-46; preserves lifecycle orthogonality.

#### A3. FR-45 — Request, Approve, or Decline Same-Mechanic Re-check

**OLD**

> When no second mechanic is available, the system must take no automatic action. An Admin / Manager may explicitly assign Re-check to M1 or themselves for one Bike Task.
>
> The audit history must record who applied the override and when. A written reason is not required in the first release.

**NEW**

> When no second mechanic is available, the system must take no automatic action. M1 may raise a same-mechanic Re-check override request for the current Bike Task and Work Cycle without an explanation. An Admin / Manager must explicitly Approve or Decline that request.
>
> Approval authorizes assignment of that Work Cycle's Re-check to M1 or the approving Admin / Manager for that Bike Task only. It must never authorize another Bike Task or later Work Cycle. Decline resolves the request without changing ordinary two-person eligibility. No written request explanation or manager resolution note is required in the first release.
>
> The audit history must record the requester, decision, deciding Admin / Manager, time, Bike Task, Work Cycle, M1, and resulting assignment when applicable.

**Rationale**

This reconciles PRD authority with the accepted UX and architecture while preserving explicit manager intervention and prohibiting automatic override.

**Impact**

Clarifies FR-45 and FR-46; preserves AD-6, AD-9, AD-10, and per-task/per-cycle scope.

### B. Epic and Story Changes

#### B1. Replace the Six-Epic Structure

**OLD**

- Epic 1: Manager-Defined Workshop Standards
- Epic 2: Trustworthy Per-Bike Work Intake
- Epic 3: Paperless Bike Preparation and Independent Verification
- Epic 4: Correct Work After Rental Configuration Changes
- Epic 5: Manager Exception Control and Trustworthy Audit
- Epic 6: Paperless Return Check and Operational Activation

**NEW**

1. **Manager-Defined Workshop Standards**  
   Managers create and govern active, versioned Prep and Return checklists.
2. **Secure and Recoverable Canonical Booqable Operations**  
   Application operators have one contained, versioned, recoverable source pipeline that preserves brownfield consumers and cannot be bypassed.
3. **Exact Per-Bike Membership and Bike Task Creation**  
   Workshop staff receive correctly identified task records, immutable snapshots, lifecycle initialization, and safe source-lifecycle behavior.
4. **Source-Backed Intake Visibility and Safe Correction**  
   Authorized staff distinguish actionable tasks, Waiting for Bike ID, integration uncertainty, terminal work, and immutable correction successors.
5. **Paperless Bike Preparation and Independent Verification**  
   Mechanics complete Prep and independent Re-check without paper.
6. **Correct Work After Rental Configuration Changes**  
   Mechanics absorb mapped or broad-review changes without losing trustworthy evidence.
7. **Manager Exception Control and Trustworthy Audit**  
   Managers resolve attention and exceptional work while staff inspect attributable history.
8. **Paperless Return Check**  
   Mechanics complete one-bike Return Check and close Done with modification acknowledgement.
9. **Safe Workshop Adoption and Paper Retirement**  
   Owners prove environments, pilot a bounded cohort, approve general enablement, and retire paper through separate evidence-bound decisions.

**Story moves**

- Current 2.1–2.13 → new Epic 2, subject to contract splitting.
- Current 2.14–2.17 → new Epic 3.
- Current 2.18–2.20 → new Epic 4, with proof narrowed/distributed.
- Current Epic 3 → new Epic 5.
- Current Epic 4 → new Epic 6.
- Current Epic 5 → new Epic 7, resequenced.
- Current 6.1–6.5 → new Epic 8.
- Current 6.6–6.8 → new Epic 9, with pilot/general split.

**Traceability**

- Epic 2 provides the canonical FR-47/NFR-3 foundation.
- Epic 3 carries FR-1–FR-4, FR-12, and task-derivation portions of FR-47.
- Epic 4 exposes and repairs the same source-backed outcomes without new FR scope.
- New Epics 5–7 retain the current FR mappings of Epics 3–5.
- Epic 8 retains FR-39–FR-42.
- Epic 9 implements PRD rollout and paper-retirement obligations.

**Rationale**

Each epic now identifies an operational capability and beneficiary. No epic is an unlabeled technical phase.

#### B2. Split Current Story 2.4

**OLD**

> Story 2.4: Define Versioned Integration and Workshop Contracts

It combines source envelopes, producer/profile/schema versions, ingestion results, ProductGroup allowlist, Setup mapping, Workshop events, incidents, task context, generation, and compatibility.

**NEW**

1. **New Epic 2, Story 2.4 — Define Versioned Source Envelopes and Result Semantics**
   - `order_graph` and `resource_batch`;
   - producer/profile/schema versions;
   - complete/partial and known/unknown/removed semantics;
   - identities, vectors, fingerprints, and fixed ingestion results;
   - one editable source and generated/fixture-checked TypeScript/PostgreSQL representations;
   - compatibility matrix and CI drift checks.

2. **New Epic 2, Story 2.5 — Approve Bike Classification and Setup Mapping Configuration**
   - ProductGroup UUID allowlist and provenance;
   - labels remain display-only;
   - broad review is the explicit safe default;
   - targeted mapping activates only after all five categories have stable approved identifiers and complete fixtures;
   - configuration revision, approval, rollback, and drift checks.

3. **Existing Story 1.2 — Create a Draft Checklist Version**
   - add the single repository-owned Workshop event catalogue at the first event producer;
   - define stable type/system-source vocabulary, required references/revisions, payload schema, generated SQL/TypeScript, additive compatibility, and unknown-newer fallback;
   - later stories extend this catalogue rather than creating another.

4. **New Epic 2 durable-refresh story**
   - add the integration incident/result-transition catalogue at first use;
   - define producer, severity, deduplication scope, retryability, activation effect, resolution, acknowledgement, retry-budget consequence, and unknown-code fail-closed behavior.

5. **New Epic 4, Story 4.1 — Inspect Source-Backed Workshop Intake**
   - add the field-minimized task-context contract at first use;
   - define role, fields, nullability, provenance, partner/PII exclusions, generated database/TypeScript forms, additive compatibility, and drift checks.

6. Renumber following stories and update all internal references after approval.

**Rationale**

Each independently evolving contract is owned once and introduced immediately before its earliest consumer.

#### B3. Repair Manager-Exception Sequencing

**OLD order**

1. Triage Manager Attention
2. Record Mechanic Attention
3. Resolve Attention
4. Assign/Reassign
5. Reset
6. Override
7. Force Close
8. Activity/Terminal History

**OLD Story 5.1 text**

> Manager Attention Detail shows approved task context and already-available manager controls.

**NEW order in Epic 7**

1. **7.1 Record Mechanic Attention and Found-and-Fixed Work**
2. **7.2 Triage Manager Attention and Missing Bike Identity**
3. **7.3 Resolve Attention by Reason**
4. **7.4 Assign and Reassign Exceptional Work**
5. **7.5 Reset Stale Work to a New Preparation Cycle**
6. **7.6 Approve a Cycle-Bound Two-Person Override**
7. **7.7 Force-Close Abandoned Work**
8. **7.8 Inspect Workshop Activity**

**NEW Story 7.2 text**

> Manager Attention Detail shows the attention reason and current resolution status first, followed by approved task context and only controls delivered by completed stories. Later stories add their controls incrementally; the detail surface must not render, advertise, or depend on assignment, reset, override, or force-close before those capabilities exist.

Stories 7.3–7.7 each add their own delivered control with permission, pending, stale, failure, confirmation, and authoritative reload behavior.

**Rationale**

Attention records exist before triage, and no story depends on future controls.

#### B4. Separate Return Check from Adoption

**OLD**

> Epic 6: Paperless Return Check and Operational Activation

Current Stories 6.1–6.5 implement Return Check. Stories 6.6–6.8 prove environments, activate, enable, and retire paper.

**NEW**

**Epic 8 — Paperless Return Check**

- 8.1 Trigger Per-Bike Return Check from Authoritative State
- 8.2 Claim Return Work with Same-Rental Context
- 8.3 Complete Return Checklist Items
- 8.4 Acknowledge Modifications and Complete Done
- 8.5 Validate the End-to-End Return Check Journey

**Epic 9 — Safe Workshop Adoption and Paper Retirement**

- 9.1 Prove the Complete Deployed Workshop Environment
- 9.2 Activate a Controlled Workshop Pilot
- 9.3 Enable General Workshop Use
- 9.4 Approve Paper Retirement from Operational Evidence

**OLD Story 6.6 premise**

> Given Epics 1–6 capabilities and migrations have passed the complete local proof package...

**NEW Story 9.1 premise**

> Given Epics 1–7 and every Epic 8 Return Check capability have passed their originating local proof obligations, when staging and production receive migrations through merge-driven CI, then disabled/shadow environment proof may begin.

**OLD Story 6.7**

> Activate Controlled Pilot and General Workshop Use

It combines immutable pilot enrollment and cohort-restricted activation with later boundary-manifest general enablement.

**NEW Story 9.2 — Activate a Controlled Workshop Pilot**

- valid environment-proof manifest;
- immutable approved cohort/epoch;
- exact membership enrollment;
- database-enforced in-cohort derivation/read/JIT/mutation access;
- out-of-cohort denial;
- explicit pilot approval;
- pilot emergency-disable and resume requirements.

**NEW Story 9.3 — Enable General Workshop Use**

- successful pilot evidence;
- newly valid environment proof if bound facts changed;
- complete known-order boundary manifest;
- exactly one enrolled or attributable `legacy_paper_excluded` disposition for every eligible pre-boundary order;
- zero unknown/blocking incidents;
- explicit general-enablement approval;
- paper remains a separate decision.

**Rationale**

Return implementation, environment proof, pilot, general enablement, and paper retirement have different owners, evidence, cohorts, timing, and rollback decisions.

#### B5. Rationalize Cross-Cutting Proof

**OLD**

- Story 2.20 aggregates the entire intake foundation proof.
- Story 3.10 aggregates stale state, failures, responsive devices, accessibility, visual tokens, database concurrency, and privilege proof.
- Story 6.5 aggregates all Return replay, UI, device, accessibility, database, and role proof.
- Story 6.6 repeats complete feature/runtime/security/environment proof.

**NEW**

1. Add feature-specific proof to each originating story's acceptance criteria and Definition of Done:
   - schema/RPC behavior → story introducing that schema/RPC;
   - role/privilege proof → story introducing the capability;
   - concurrency/revision proof → story introducing the contested mutation;
   - responsive/accessibility proof → story introducing the surface/control;
   - adapter fixtures → story introducing the producer/profile branch.

2. Narrow new Epic 4's final intake gate to only cross-epic seams:
   - source envelope → canonical ingestion → membership → task/snapshot → intake read/correction;
   - generated-contract compatibility across those modules;
   - one local reset/migration sequence;
   - no duplicate proof already owned by originating stories.

3. Narrow current Story 3.10, becoming an Epic 5 story, to FR-48's user-observable stale/open-screen recovery across the assembled Prep/Re-check flow. Move control-specific responsive, accessibility, role, and database criteria into Stories 5.1–5.9.

4. Keep Epic 8's final Return validation story only for the assembled end-to-end Return journey across trigger, claim, context, Items, acknowledgements, and Done. Move phase-specific pgTAP, role, concurrency, responsive, and accessibility criteria into Stories 8.1–8.4.

5. Keep Story 9.1 only for genuinely environment-bound evidence:
   - deployed commit/migrations/config/privileges;
   - disabled/shadow enforcement;
   - two stable complete sweeps;
   - blocking incident state;
   - environment-proof manifest and runbooks.

**Rationale**

Defects are proven where they originate. Remaining gates validate seams or deployed-environment facts that cannot be proven inside one feature story.

#### B6. Correct Story Titles and Scope

**OLD**

> Story 1.1: Browse Workshop Checklist Templates

The story also establishes governed schema, read models, privilege boundaries, route loading, responsive behavior, and role proof.

**NEW**

> Story 1.1: Browse Governed Workshop Checklist Templates

Keep the current acceptance criteria because they are necessary to deliver a secure, usable library; the title now reflects the governed capability.

**OLD**

> Story 5.8: Inspect Complete Activity and Terminal History

The story combines Activity with terminal task behavior already introduced by intake, lifecycle, force-close, and Return stories.

**NEW**

> Story 7.8: Inspect Workshop Activity

Keep chronological read-only Activity, stable event fallback, loading/empty/error/permission/responsive/accessibility behavior, and append-only read proof. Move terminal-panel acceptance to each originating terminal story:

- source cancellation/removal/replacement intake;
- force-close;
- Return completion to Done.

**Rationale**

Titles match the user-observable outcome and no story claims unrelated work.

### C. Architecture Change

#### C1. Add Missing Structural-Seed Routes

**OLD**

```text
src/
  app/workshop/
    _components/
    attention/[attentionId]/
      page.tsx
      loading.tsx
    tasks/[taskId]/
      page.tsx
      loading.tsx
    templates/[templateVersionId]/
      page.tsx
      loading.tsx
    loading.tsx
    page.tsx
```

**NEW**

```text
src/
  app/workshop/
    _components/
    attention/[attentionId]/
      page.tsx
      loading.tsx
    tasks/[taskId]/
      page.tsx
      loading.tsx
      activity/
        page.tsx
        loading.tsx
    templates/
      page.tsx
      loading.tsx
      [templateVersionId]/
        page.tsx
        loading.tsx
    loading.tsx
    page.tsx
```

**Rationale**

The architecture already defines both read capabilities. The seed should show the UX-required navigation surfaces explicitly.

**Impact**

Documentation-only alignment with AD-12, AD-18, UX-DR8, and UX-DR9. No architecture or implementation pattern changes.

### D. UX Changes

No UX artifact edit is required. PRD authority is brought into alignment with the existing UX behavior.

## 5. Implementation Handoff

### Scope

**Major**

The proposal restructures multiple epics, changes story sequence and IDs, splits contracts and adoption decisions, and promotes accepted UX behavior into product authority.

### Handoff Recipients

#### Product Manager

- approve the FR-38/43/45 product-authority additions;
- confirm no MVP scope change;
- review new epic outcomes and adoption decision boundaries.

#### Solution Architect

- verify the revised sequence preserves AD-14, AD-16, AD-18, and AD-19 dependencies;
- confirm first-use contract placement remains one-source-of-truth;
- approve the structural-seed route additions.

#### Product Owner / Developer Planning

- apply approved `epics.md` restructuring and mechanical renumbering;
- distribute proof criteria without dropping obligations;
- verify every cross-reference and all 48 FR/eight NFR paths.

#### Developer Agent

- do not begin implementation from this proposal;
- begin story implementation only after approved artifact edits and a READY implementation-readiness rerun.

### Application Order After Approval

1. Edit PRD FR-38, FR-43, and FR-45.
2. Edit the architecture structural seed.
3. Restructure and renumber `epics.md`.
4. Run consistency checks for story IDs, cross-references, FR/NFR coverage, and architecture references.
5. Rerun `/bmad-check-implementation-readiness`.
6. Start Sprint Planning only if the result is READY.

### Success Criteria

- the PRD explicitly owns the attention reason/note/request model;
- every epic has one coherent operational outcome and beneficiary;
- no story depends on a later story;
- former Epic 2 is decomposed into manageable value-oriented units;
- Return Check is separate from operational adoption;
- pilot and general activation are separate decisions;
- proof obligations sit with originating stories or a bounded seam/environment gate;
- all 48 FRs and eight NFRs retain traceable implementation paths;
- architecture and UX remain aligned;
- no code or remote DDL is applied during planning correction;
- the new implementation-readiness assessment returns READY.

## 6. Checklist Record

### Understand the Trigger and Context

- [N/A] 1.1 No implementation story triggered the change; the readiness assessment did.
- [x] 1.2 Core problem defined as delivery-plan decomposition, sequencing, and product-authority clarity.
- [x] 1.3 Evidence recorded from the implementation-readiness report.

### Epic Impact Assessment

- [x] 2.1 Current Epic 2 cannot remain as written.
- [x] 2.2 Required epic changes defined.
- [x] 2.3 All remaining epics reviewed.
- [x] 2.4 No product epic is obsolete; one adoption epic is required.
- [x] 2.5 Dependency order revised.

### Artifact Conflict and Impact Analysis

- [x] 3.1 PRD additions defined; MVP remains achievable.
- [x] 3.2 Architecture seed addition defined; architecture remains valid.
- [x] 3.3 UX reviewed; no behavior change required.
- [x] 3.4 Secondary artifact and readiness-rerun impacts recorded.

### Path Forward Evaluation

- [x] 4.1 Direct Adjustment is viable and recommended.
- [N/A] 4.2 Rollback is not applicable.
- [x] 4.3 MVP review completed; scope reduction is not justified.
- [x] 4.4 Direct Adjustment selected.

### Sprint Change Proposal Components

- [x] 5.1 Issue summary complete.
- [x] 5.2 Epic and artifact impacts complete.
- [x] 5.3 Recommended path and alternatives complete.
- [x] 5.4 MVP impact and action plan complete.
- [x] 5.5 Major-scope handoff defined.

### Final Review and Handoff

- [x] 6.1 Applicable checklist sections reviewed.
- [x] 6.2 Proposal checked for internal consistency.
- [x] 6.3 Explicit final user approval received on 2026-08-12.
- [N/A] 6.4 No sprint-status update before proposal approval; Sprint Planning has not begun.
- [x] 6.5 Major-scope handoff confirmed to Product Manager, Solution Architect, and Product Owner / Developer Planning for artifact application and readiness rerun.

## 7. Approval Gate

This document is a proposal only. It does not authorize edits to the PRD, architecture, UX, or epics.

Required decision:

- **Approve** — apply the proposed planning-artifact edits, then rerun implementation readiness.
- **Revise** — return to the relevant proposal section.
- **Reject** — retain current artifacts and keep Phase 4 blocked.

### Approval Record

- Decision: **Approved**
- Approved by: Den
- Approval date: 2026-08-12
- Authorized scope: planning-artifact changes described in this proposal, consistency validation, and implementation-readiness rerun
- Excluded scope: application code, database migrations, remote DDL, and Sprint Planning before a READY assessment
- Routing: Product Manager and Solution Architect oversight; Product Owner / Developer Planning applies the artifact changes; Developer implementation remains blocked pending READY

### Workflow Execution Log

- Issue addressed: Workshop Tasks planning decomposition, sequencing, proof ownership, adoption boundaries, route seeds, and attention-model product authority
- Change scope: **Major**
- Artifacts modified:
  - PRD FR-38, FR-43, FR-45, UJ-4, and FR-25 cross-reference
  - Architecture Structural Seed
  - `epics.md` epic/story structure, contracts, sequencing, proof placement, titles, and traceability
  - implementation-readiness report
- Routed to: Product Manager, Solution Architect, Product Owner / Developer Planning
- Readiness rerun: **READY**
- Next route: Sprint Planning; application implementation remains story-driven and subject to all local proof and activation gates
