# Reconciliation: Per-Bike Workshop Tasks Brainstorm

## Inputs

- Original input: `_bmad-output/brainstorming/brainstorm-per-bike-workshop-tasks-2026-08-05/.memlog.md`
- Draft PRD: `prd.md`
- Addendum: `addendum.md`
- Review mode: source extraction against the PRD and addendum; retired intermediate models were treated as superseded, not as missing requirements.

## Verdict

The PRD and addendum are substantially faithful to the workshop's final converged model. They preserve the product's core purpose, scope boundary, living-task workflow, final checklist model, independent verification contract, selective reopening behavior, return flow, qualitative usability intent, and principal rejected alternatives.

Five material source decisions or contracts are weaker than, or not explicit in, the current documents:

1. The agreed read-only same-bike “last touched” lookup is optional in FR-37 rather than committed.
2. Reassignment does not explicitly preserve already-recorded Item progress, although attribution and reassignment history are required.
3. The accepted rule that template activation must not be blocked by missing Setup Category coverage is absent.
4. The workshop's source-of-truth boundary—Booqable/system for rental intent and history, mechanics for the physical bike's completed state—is only implicit.
5. Final-stage Needs Attention resolution is weakened from a deterministic completion rule to “may complete.”

An internal cross-reference defect also needs correction if the source documents are edited later: UJ-4 refers to the two-person override as FR-39, but the override is FR-45; FR-39 is Return Check triggering.

## Final-decision coverage

### Product purpose and scope

**Accurately represented.**

- The workshop's narrow purpose was to digitize the mechanics' paper workflow, not replace Booqable's order lifecycle (workshop lines 14-18). PRD §§1, 6, and 7 preserve Booqable as lifecycle authority and explicitly exclude full lifecycle replacement.
- The core quality mechanism is an independent second-mechanic check on a configured subset, not a duplicate full checklist (lines 11-12, 30, 120). PRD §§1, 4.3, and 4.4 preserve selective, independently attributed M2 verification.
- The final synthesis—one rental-scoped living Bike Task carrying setup intent, checks, changes, attribution, and restoration through return (lines 354-356)—is reflected in the Vision, Bike Task glossary, UJ-1 through UJ-3, and FR-1 through FR-42.
- Full cross-rental bike identity, usage frequency, and analytics remain deferred (lines 20-22, 322-323, 353). PRD §7 and addendum “Rejected or Deferred Alternatives” represent this accurately.

### Qualitative intent and tone

**Accurately represented, with one implicit contract noted under material gaps.**

- “Bike quality, not checklist completion” is stated directly in PRD §1 and accurately captures the workshop's central intent.
- Avoiding a cumbersome tablet workflow that distracts mechanics (lines 49-50, 234-238) is carried into JTBD, NFR-1, the counter-metrics, rollout observation, and the requirement to keep Booqable context inside the Bike Task.
- Clear, bike-focused instructions are preserved through current Setup Category context, visible prior-to-current changes, the broad ambiguous-change fallback, accessory context, and the UX requirement to highlight changed work.
- The workshop's preference for operational simplicity—ordinary queue, ordinary Prep/Re-check flow, no separate changed-work pipeline, no manager gate, and no automatic assignment—is consistently preserved.
- The workshop's exact epistemic boundary at lines 255-256 is not stated directly: the system records current Booqable intent, change history, and attribution, while mechanics attest to the physical bike's state. The documents imply it but do not preserve it as an explicit product contract.

## Workflow reconciliation

### Initial preparation and handoff

**Accurately represented.**

- Reserved orders create one independently actionable Bike Task per physical bike (lines 223-230; FR-1, FR-2, FR-7).
- Available Now contains unassigned actionable work ordered by rental start date, earliest first (lines 54-56; FR-6).
- Mechanics claim one Bike Task at a time; bikes from one order can proceed in parallel and each enters Re-check independently (lines 229-230; FR-7).
- Claiming and explicit assignment/reassignment are supported; automatic assignment is rejected (lines 115-116; FR-8 and addendum).
- Concurrent claims are first-writer-wins and losing claimants receive a clear result (lines 61-62; FR-9).
- M1 handoff is blocked until required Prep Items are resolved, while optional Items may remain unresolved (line 121; FR-18).
- M1's responsibility ends at handoff, subject to later selectively reopened work being a new Work Cycle rather than continuation of permanent ownership (line 52 and final ownership decisions; FR-10).

### Independent Re-check

**Accurately represented.**

- M2 independently resolves configured Items rather than approving or rejecting M1 (lines 300-304, 318-319; FR-20 through FR-23).
- M2 sees M1's identity for direct communication (line 123; FR-22).
- M2 may correct the bike after clarifying a discrepancy and finish verification without a reject/return workflow (lines 300-304; FR-23).
- A correction note is mandatory when M2 corrected something and is recorded in shared task Notes rather than against an individual Item (lines 305-319; FR-23 and FR-34).
- For Value Items, M1 records the target and M2 verifies the bike against it without entering a duplicate value or recording whether adjustment was needed (lines 96, 102-104; FR-24).
- M2 must differ from M1 unless a manager explicitly overrides the rule; no automatic exception occurs when no second mechanic is available, and the override records actor and time without requiring a written reason (lines 67-70; FR-25 and FR-45).

### Checklist definition and execution

**Accurately represented except for the missing no-coverage-safeguard boundary.**

- The final model is always-visible, admin-authored checklist Items with optional links to five bounded Setup Categories for grouping, Booqable context, and selective invalidation (lines 292-298, 347-353; FR-11 through FR-19).
- Separate category-specific Prep and Return templates are preserved (lines 332-341; FR-11).
- Templates are versioned and snapshotted; later edits affect future tasks only, and historical versions can be reactivated (lines 71-72, 91-93; FR-11 and FR-12).
- Prep Items support required/optional, M1/M2 applicability, Action or Value response, and optional Setup Category link (lines 287-297; FR-13).
- Action Items use explicit Done/N/A; Value Items require values and have no N/A, with optional Value Items allowed to remain blank (lines 290-297; FR-16 and FR-17).
- Current Setup Category values and relevant prior-to-current change context are shown with linked Items (lines 283-284; FR-15).
- The built-in `extra_information` confirmation applies to bundled and flat orders, requires M1/M2, and is invalidated when the text changes (lines 285 and earlier final-compatible decisions; FR-19).
- Workshop line 286 explicitly says template activation must not require Setup Category coverage and that missing coverage does not need a blocking safeguard. Neither PRD nor addendum preserves this accepted administration boundary.

### Booqable-driven updates and selective reopening

**Accurately represented.**

- Before first claim, Booqable changes refresh current details without revalidation alerts; claiming starts active work (lines 183-185; FR-27).
- The three-outcome contract is preserved: exact linked-category invalidation for recognized relevant changes, broad physical-configuration review for relevant ambiguous changes, and silent refresh for irrelevant changes (lines 250-258; FR-26).
- During M1, the task remains assigned, the change is surfaced, affected Items reset, and required work blocks handoff until resolved (lines 221, 242-243; FR-28 and FR-33).
- During M2, any workshop-relevant configuration change returns the same task unassigned to Needs Prep in the normal queue (line 222; FR-29).
- After Preparation Resolved but while reserved, the existing task returns unassigned to Needs Prep with only affected work reopened (lines 202-218; FR-30).
- Reopened work uses the ordinary Work Cycle, with M2 required only when invalidated Items are M2-enabled; unaffected history remains valid (lines 288, 297; FR-20, FR-30, FR-31).
- Changes after pickup do not reopen completed preparation (line 182; FR-32).
- Changed work is highlighted and self-clears when resolved, with no separate acknowledge action (lines 242-243; FR-33).
- The exact implementation of stage storage versus derivation remains architectural, and the retracted derived-stage decision is correctly quarantined in the addendum (lines 197-202; addendum “Task stage representation”).

### Cancellation, reactivation, and replacement

**Accurately represented.**

- Cancellation or bike removal makes the task read-only and preserves history; reactivation of the same order and `stock_identifier` resumes prior progress (lines 73-81; FR-2 and FR-3).
- A different `stock_identifier` closes the old task as Replaced and creates a fresh task, preserving separate physical-bike histories (line 169; FR-2).
- Managers can reset stale work without erasing prior audit history (line 81; FR-5).
- The exact workshop cancellation message is not preserved, but the required behavior and tone are represented. This is a minor UX-copy omission, not a missing workflow requirement.

### Notes, modifications, accessories, and attention

**Mostly represented; two material weakenings remain.**

- One shared latest-value Notes field is preserved, with no revision system and no automatic carry-forward into later rentals (lines 312-323; FR-34 and non-goals).
- Same-rental Notes carry into Return Check so rental-specific changes can be restored (lines 324-329; FR-34, FR-41, FR-42).
- Bundle-linked accessories and `extra_information` are shown with clear source labels; flat-order associations are never guessed (lines 95-101; FR-35 and FR-36).
- Missing flat-order accessory information can raise non-blocking Needs Attention while still allowing handoff (lines 105-113; FR-36).
- Structured Modifications are required by FR-37, consistent with the early “must survive” capability and later convergence. However, the agreed read-only “last touched” lookup for the same `stock_identifier` was explicitly “now” at workshop line 22, while FR-37 says the system **may** expose it. That changes a committed first-release capability into an optional one.
- System mismatch, found-and-fixed history, and manager-judgment attention are distinguished; Needs Attention does not block the mechanic's own work (lines 38-41; FR-38).
- Workshop line 41 says resolving the final-stage flag “simply marks the task done.” FR-43 says resolving the final outstanding concern “may complete” the task, which leaves deterministic behavior unspecified.

### Return Check

**Accurately represented.**

- Booqable's returned state automatically exposes a category-specific Return Checklist (lines 339-343; FR-39).
- Return is completed by one mechanic with no M2 stage (line 341; FR-40).
- Preparation/Re-check Notes remain visible, and completion requires confirming every rental-specific change in Notes was addressed (lines 324-329; FR-41 and FR-42).
- The earlier generic one-item return proposal and combined Prep/Return template were correctly superseded by separate category-specific Return templates; neither should be flagged as missing.

### Manager controls, audit, and reporting

**Substantially represented, with reassignment retention implicit rather than explicit.**

- Managers can assign/reassign work, resolve attention, reset stale work, apply a two-person override, and force-close genuinely abandoned work (FR-5, FR-8, FR-43 through FR-45).
- Force-close remains distinct from ordinary attention resolution (line 41; FR-44).
- Actor/time audit coverage is broad and includes claims, assignments, reassignments, Item outcomes, handoffs, attention changes, overrides, resets, cancellation, replacement, and force-close (FR-46).
- Workshop line 46 resolved the reassignment question by accepting existing per-Item attribution plus a logged handoff, with no extra review nudge. FR-46 covers attribution and reassignment events, but no FR explicitly says existing completed Item outcomes remain in force after reassignment. NFR-5 strongly implies preservation; a functional statement would remove ambiguity.
- Date summaries, status tiles, mechanic performance views, and changed-work filtering were converged as follow-up capabilities rather than first-release Musts (lines 43, 353). PRD §§7 and 8.2 preserve that priority accurately.
- The noisy count of 263 is correctly absent and was not treated as a success or scale signal (line 45).

## Scope-boundary reconciliation

### Correctly in scope

- Booqable-driven per-bike living tasks
- Rental-start-date queue and one-bike claiming
- Explicit manager assignment/reassignment and first-writer-wins claiming
- Separate versioned category Prep and Return templates
- Always-visible Action/Value Items with optional Setup Category links
- Independent selective M2 verification and explicit override history
- Category-level selective reopening and broad ambiguous-change fallback
- Same-rental shared Notes, Return restoration acknowledgement, accessories, and Structured Modifications
- Non-blocking attention, manager resolution, reset, and force-close
- Cancellation/reactivation/replacement history
- Tablet/phone mechanic use and desktop manager use

### Correctly deferred or excluded

- Replacing Booqable's full order lifecycle
- Complete cross-rental physical-bike history, usage frequency, and analytics
- Offline support and retained unsaved changes
- Automatic mechanic assignment
- Generated runtime accessory checklist Items
- Notes revision history
- Bike Fit integration
- Separate changed/revalidation tasks, statuses, queues, or manager pings
- Flat-order accessory inference
- Explicit manager release/readiness gate
- First-release manager dashboards, mechanic performance views, and broader analytics

### Boundary omissions worth preserving later

- Missing bike identification is an uncommon human-error case handled by the mechanic asking the manager to correct Booqable; the workshop explicitly rejected a system status, manager alert, or remediation workflow (lines 227-228). FR-1 and the rejected release gate are compatible with this decision, but the explicit non-goal is absent.
- Admins are responsible for Setup Category checklist coverage; activation is not blocked for incomplete coverage (line 286). This is material because an implementation could otherwise add a well-intentioned but rejected validation gate.

## Rejected and superseded alternatives

The documents correctly avoid treating the following retired models as missing requirements:

- Full order-lifecycle ownership instead of Booqable authority
- Separate M1 and M2 checklist templates
- A paper-like single sheet rather than digitally separated stage views
- Accessory content remaining permanently outside checklist invalidation
- Generated accessory checklist Items
- One reusable admin rule per discovered Booqable accessory group
- A separate accessory-adjustment task
- Automatic mechanic assignment
- A manager release-to-workshop gate
- A separately named Changed/Revalidation task type, status, queue, or manager ping
- Permanently assigning reopened work to the original mechanic
- Admin completion of revalidation without physically checking
- Always deriving task stage from Item state as a product rule
- A shared overloaded checkmark meaning both Done and not applicable
- Hiding initial-`No` category Items or removing them after selected-to-No verification
- Mandatory M2 on reopened work when no invalidated Item is M2-enabled
- M2 approving/rejecting M1 or entering a duplicate target value
- Item-level or append-only timestamped correction notes
- Notes revision history
- Automatically showing previous-rental Notes
- A generic single-item Return Check
- A combined Prep/Return template

The addendum preserves rationale for most architecturally tempting alternatives: generated Items, release gate, separate revalidation flow, auto-assignment, urgent ping, admin completion without checking, duplicate values, Notes history, full cross-rental history, offline behavior, and Bike Fit. The rationale for not enforcing Setup Category coverage and for keeping missing bike-ID remediation outside the feature is not preserved.

## Success-signal reconciliation

**Accurately represented.**

- The workshop did not establish reliable numeric targets. The PRD correctly avoids inventing launch thresholds.
- Paperless discover/claim/prepare/handoff/re-check/next-task operation is captured by SM-1.
- Correct convergence under Booqable changes, without duplicates, missing tasks, or unnecessary disruption, is captured by SM-2.
- Same-rental Notes use and paperless Return Check are captured by SM-3.
- Attribution for preparation, verification, corrections, assignment, overrides, and manager resolution is captured by SM-4.
- The primary adoption-failure concern—digital work slowing or distracting mechanics—is preserved through counter-metrics for speed, quality, and mechanic focus.
- The rollout's parallel paper baseline and observed pilot are appropriate evidence mechanisms for the workshop's qualitative success criteria.
- The discarded test-environment count of 263 is correctly not used.

## Unresolved-question reconciliation

### Still open and represented

- Whether Booqable can reliably expose and distinguish the five Setup Categories needed for selective invalidation: PRD Open Question 2 and Integration assumptions.
- Whether bundled parent linkage is stable across supported order forms: Open Question 3 and Integration assumptions.
- Exact UX for previous-versus-current `extra_information`: Open Question 4 and addendum UX topics.
- Whether always-visible initial-`No` sections remain comfortable in real use: Open Question 5, FR-14's trial status, rollout step 6, and addendum UX topics.
- Pilot duration and evidence threshold for retiring paper: Open Question 1. This was not decided by the workshop and is appropriately open.

### Resolved or superseded and correctly not open

- Reserved-to-workshop actionability: resolved by immediate living-task availability; the explicit release gate was rejected.
- Whether attention blocks a mechanic's own task: resolved as non-blocking.
- Whether a separate revalidation flow is needed: rejected in favor of ordinary Prep/Re-check.
- Whether reopened work returns to the original mechanic: resolved as unassigned ordinary queue, except active M1 keeps current assignment.
- Whether M2 approves M1: resolved as an independent fresh attestation.
- Whether Action Items need explicit N/A: resolved yes.
- Whether Value Items offer N/A: resolved no.
- Whether Return uses the Prep checklist or one generic acknowledgement: resolved as a separate category-specific Return template plus Notes acknowledgement.
- Whether task stage must be derived from Item state: explicitly unconfirmed/retracted and correctly left to architecture.
- Whether managers need a dedicated changed-task queue and urgent ping: resolved no; changed-work filtering remains a later reporting capability.

## Material gaps and recommended reconciliation targets

### G1 — Same-bike “last touched” lookup is downgraded

- **Source:** Workshop line 22 commits to a structured modifications field and read-only “last touched” lookup by `stock_identifier` now.
- **Current text:** FR-37 requires Structured Modifications but says the lookup “may” be exposed.
- **Impact:** Architecture and scope planning can legitimately omit a capability the workshop placed in the current feature.
- **Reconciliation target:** Decide whether the workshop decision remains authoritative. If yes, make the lookup required while retaining the boundary that it is not complete cross-rental history.

### G2 — Reassignment progress preservation is implicit

- **Source:** Workshop lines 44 and 46 resolve keep-versus-drop in favor of per-Item attribution plus a logged handoff event, with no extra review nudge.
- **Current text:** FR-8 allows reassignment and FR-46 audits it, but neither states that completed Item outcomes remain valid after reassignment.
- **Impact:** UX or implementation could clear progress on reassignment without plainly violating an FR.
- **Reconciliation target:** State that reassignment preserves resolved Item outcomes and attribution unless a separate explicit reset or invalidation rule applies.

### G3 — Rejected template-coverage gate is absent

- **Source:** Workshop line 286 says template activation must not require Setup Category coverage; administrators own coverage quality and missing coverage does not need a blocking safeguard.
- **Current text:** No PRD or addendum statement preserves this.
- **Impact:** A reasonable implementation could add a rejected activation blocker, changing the admin workflow and scope.
- **Reconciliation target:** Preserve this as a deliberate first-release administration boundary, preferably with rationale in the addendum.

### G4 — Physical-state source-of-truth contract is only implicit

- **Source:** Workshop lines 255-256 distinguish the system as source of Booqable intent, change history, and attribution from mechanics as source of truth for the physical bike's completed state.
- **Current text:** The Vision and verification FRs imply this but never state it.
- **Impact:** Product language or future technical design may overclaim that synchronized/checklist data itself proves physical condition.
- **Reconciliation target:** Preserve the explicit division of responsibility as qualitative intent or accepted-model rationale.

### G5 — Final attention resolution is non-deterministic

- **Source:** Workshop line 41 says manager resolution at the final post-check stage clears the flag and simply marks the task done; force-close remains distinct.
- **Current text:** FR-43 says resolution “may complete” the Bike Task.
- **Impact:** Completion behavior remains open to implementation interpretation despite a recorded final decision.
- **Reconciliation target:** Define the exact preconditions and deterministic completion transition when the resolved flag is the only outstanding concern.

## Non-material document defects and omissions

- UJ-4 incorrectly points to FR-39 for the two-person override; the correct requirement is FR-45.
- The exact cancellation copy from workshop line 73 is absent, though read-only cancellation behavior is correct.
- The explicit missing-bike-ID manual-remediation boundary is absent but compatible with the current PRD.
- The distinction between shared Notes and Structured Modifications could be clearer. Both are retained, but the user-facing job of each is not fully separated.
- Manager follow-up reporting is represented at capability level; the workshop's concrete Tomorrow/Upcoming/Needs Attention filters and status tiles are not individually preserved.

## Final assessment

No retired model was incorrectly counted as a missing requirement. The PRD/addendum pair is ready for downstream review from a workshop-memory fidelity perspective once the five material gaps are explicitly accepted, deferred, or reconciled. The strongest parts are the accurate preservation of the living Bike Task model, Booqable authority, always-visible category-linked checklist, selective normal-flow reopening, independent M2 verification, same-rental Notes through Return Check, and usability-focused success signals.
