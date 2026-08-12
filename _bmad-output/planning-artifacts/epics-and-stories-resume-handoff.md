# Workshop Tasks Epics & Stories — Resume Handoff

## Status

The `bmad-create-epics-and-stories` workflow is paused during **Step 3: Generate Epics and Stories** at the user's request.

The canonical working document is:

- `_bmad-output/planning-artifacts/epics.md`

Its frontmatter correctly remains:

```yaml
stepsCompleted: [1, 2]
```

Do not mark Step 3 complete until every epic has stories, final coverage checks pass, and the user selects the Step 3 `[C] Continue` menu option.

## Confirmed Inputs and Decisions

- Requirements extraction is approved:
  - 48 FRs
  - 8 NFRs
  - 38 architecture requirements
  - 32 UX design requirements
- The approved epic structure contains 6 epics.
- Every FR is mapped exactly once in the FR Coverage Map.
- The user approved the Epic 1 five-story breakdown.
- Stories 1.1 and 1.2 were explicitly approved individually.
- After Story 1.2, the user granted standing approval to proceed autonomously:
  - continue through remaining stories and epics;
  - self-review scope, ordering, and acceptance criteria;
  - interrupt only for a material product ambiguity or a mandatory workflow menu.

## Completed Story Sections

### Epic 1 — Complete

Five stories are appended to `epics.md`:

1. Story 1.1 — Browse Workshop Checklist Templates
2. Story 1.2 — Create a Draft Checklist Version
3. Story 1.3 — Configure Draft Checklist Items
4. Story 1.4 — Activate an Immutable Template Version
5. Story 1.5 — Reactivate and Review Template History

Epic 1 covers FR11, FR13, and FR14, including relevant security, error, responsive, accessibility, concurrency, and database-proof requirements.

### Epic 2 — Complete Draft

Thirteen stories are appended to `epics.md`:

1. Story 2.1 — Contain Existing Integration Security Risks
2. Story 2.2 — Pin a Supported Application and Database Toolchain
3. Story 2.3 — Define Versioned Integration and Workshop Contracts
4. Story 2.4 — Expand the Canonical Booqable Projection
5. Story 2.5 — Persist and Recover Authoritative Refresh Work
6. Story 2.6 — Apply Canonical Source State Atomically
7. Story 2.7 — Cut Over Every Booqable Writer and Recovery Caller
8. Story 2.8 — Control Workshop Rollout and Enrollment in the Database
9. Story 2.9 — Derive Exact Per-Bike Memberships and Bike Tasks
10. Story 2.10 — Reconcile Cancellation, Removal, Replacement, and Reactivation
11. Story 2.11 — Snapshot the Active Checklist for Each Task Phase
12. Story 2.12 — Inspect Source-Backed Workshop Intake
13. Story 2.13 — Prove and Activate Pilot-Safe Work Intake

Epic 2 covers FR1–FR4, FR12, and FR47 plus the prerequisite integration, security, runtime, rollout, recovery, privilege, and environment-proof architecture.

The last persisted line is the final acceptance criterion of Story 2.13. No patch is pending.

## Exact Resume Point

Resume Step 3 with:

> **Epic 3: Paperless Bike Preparation and Independent Verification**

Goal:

> Mechanics can discover, claim, prepare, hand off, independently re-check, record rental context and physical changes, and recover safely from save or ownership conflicts without a paper checklist.

FR coverage:

- FR6–FR10
- FR15–FR25
- FR34–FR37
- FR48

Relevant UX requirements include the Mechanic Dashboard, Bike Task Detail, task cards, context panel, checklist groups, Action/Value Item controls, save status, sticky lifecycle bar, confirmation panel, previous-information drawer, Structured Modifications, last-touch summary, all state patterns, tablet/phone responsiveness, and accessibility validation.

## Recommended Remaining Story Decomposition

This outline is advisory but follows the approved sequencing and single-agent sizing rule.

### Epic 3

1. Mechanic Dashboard with My Work and Available Now
2. Atomic claim, assignment, and reassignment
3. Phase-aware Bike Task Detail and source context
4. Immediate Action Item outcomes
5. Value Item autosave and confirmed evidence
6. Shared Notes and bike-focused accessory/`extra_information` context
7. Structured Modifications and bounded same-stock last touch
8. Prep completion, Work Cycle ownership, and handoff
9. Independent M2 Re-check and value verification
10. Stale open-screen recovery, responsive behavior, and accessibility proof

### Epic 4

1. Establish physically attested configuration baselines and mapping mode
2. Refresh source context silently before first claim
3. Invalidate relevant work during active M1 Prep
4. Reopen Re-check or Preparation Resolved work into a new cycle
5. Enforce pickup/Return boundaries and persistent self-clearing change UX/history

### Epic 5

1. Manager attention and Waiting for Bike ID dashboard
2. Mechanic attention and found-and-fixed records
3. Resolve reason-specific attention safely
4. Assign and reassign exceptional work
5. Reset stale work
6. Approve the cycle-bound two-person override
7. Force-close abandoned work and expose complete Activity/History

### Epic 6

1. Trigger per-bike Return Check and immutable Return snapshots
2. Claim Return work and show same-rental context
3. Complete Return checklist Items
4. Acknowledge Structured Modifications and complete Done
5. Terminal, stale, idempotent, responsive, and accessibility proof

## Workflow Rules to Preserve

1. Activate the attached skill normally, then load only `step-03-create-stories.md`; do not load Step 4 early.
2. Read the current `epics.md` before editing.
3. Process Epic 3, then 4, then 5, then 6 sequentially.
4. Use the exact story template:
   - `### Story N.M: Title`
   - As a / I want / So that
   - `**Acceptance Criteria:**`
   - Given / When / Then / And
5. Every story must be completable using only prior stories, never a future story.
6. Create database entities only in the story that first needs them.
7. Include expected failures, authorization, stale/concurrency, confirmed-save, loading/error, and relevant accessibility/responsive acceptance criteria.
8. Cover every UX-DR with at least one story; do not defer UX to an unspecified polish phase.
9. Preserve the architecture's local-only migration rule; staging and production DDL remain CI-only.
10. Do not commit unless the user explicitly requests it.

## Final Step 3 Checks

After Epic 6:

1. Verify all 6 epic sections exist in sequence.
2. Verify Story numbering is continuous within each epic.
3. Verify FR1–FR48 are covered by story acceptance criteria.
4. Build/check an explicit UX-DR1–UX-DR32 story coverage list before declaring Step 3 complete.
5. Ensure no template placeholders remain.
6. Check exact Markdown structure and frontmatter.
7. Present the mandatory menu:

   `**Select an Option:** [A] Advanced Elicitation [P] Party Mode [C] Continue`

8. Only after the user selects `C`, save final Step 3 content, update frontmatter to `stepsCompleted: [1, 2, 3]`, and read `step-04-final-validation.md` fully.

## Workspace Safety

The repository already contains many unrelated untracked/modified planning artifacts. Do not clean, reset, stage, or commit them. This session intentionally changed only:

- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/epics-and-stories-resume-handoff.md`
