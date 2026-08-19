# Final Adversarial Seam Review — Workshop Tasks MVP Spine

**Reviewed:** 2026-08-18  
**Target:** `../ARCHITECTURE-SPINE.md`  
**Inputs:** revised `prd.md`, `addendum.md`, and approved `sprint-change-proposal-2026-08-18.md`  
**Lens:** adversarial seams — independently compliant units that can still produce different observable behavior

## Verdict

**REVISE BEFORE STORY DECOMPOSITION.** The revised spine has closed the earlier material seams: it now names the single internal derivation caller, gives claims exhaustive post-refresh outcomes, atomically preempts Prep/Re-check for Return, uses the current valid category for Return snapshots, generations reconfirmation, fences task revisions, constrains reassignment, keeps attention open through terminal outcomes, and distinguishes service-only ingestion from user capabilities.

The remaining risks are narrower. They cluster at source-graph cardinality and precedence, the moment at which derivation is allowed to commit, M1 identity after reassignment, attention concurrency, and the authorization matrix for task-adjacent mutable fields. None require restoring retired replacement-chain, reconciliation, rollout, or repair scope.

## Findings

1. **The same exact StockItem can return after a simple replacement with no valid creation result.**
   - **Location:** AD-5; PRD FR-6.
   - **Compliant divergence:** One derivation treats `A → B → A` in the same rental as a fresh assigned replacement and tries to create a new task for `A`. Another honors the idempotent key `(rental/order, StockItem A)` and retains the original terminal `Replaced` task, creating no new work. Both obey the ban on automatic reactivation and replacement-chain algebra.
   - **Missing guard:** Specify the disposition when a formerly replaced exact StockItem reappears in the same rental: reject/fail closed with no task, or define a new permitted task identity. The latter would need an explicitly approved identity rule; it cannot be silently inferred from a display identifier or replacement chain.
   - **Consequence:** The bike can either receive duplicate/ambiguous workshop work or no task at all, depending on which compliant unit is implemented.

2. **Exact-StockItem overassignment inside one rental has no fail-closed cardinality rule.**
   - **Location:** AD-5; AD-12; PRD FR-9.
   - **Compliant divergence:** The canonical derivation can deduplicate two source assignments of the same StockItem to one task because the declared key is rental/order plus StockItem. A queue implementation can instead expose two independently actionable bikes because FR-9 says same-order bikes progress independently.
   - **Missing guard:** Require the derivation boundary to reject/quarantine an order graph that assigns one exact StockItem to more than one admitted bike association in the same rental, and to create no ambiguous task until the authoritative source is corrected and successfully reapplied.
   - **Consequence:** One physical bike can be prepared twice under two task records, or two source bikes can silently collapse into one task.

3. **Removing an exact assignment without cancelling the order has no task disposition.**
   - **Location:** AD-5; AD-6; PRD FR-4 and FR-6.
   - **Compliant divergence:** A source unit can leave the existing task actionable because it only sees no new exact StockItem. Another can mark it `Cancelled`, while a third can mark it `Replaced` despite having no replacement assignment. Each preserves the “create no task for unassigned work” rule going forward.
   - **Missing guard:** Define the exact source transition for an active rental whose assigned StockItem becomes absent/unknown: resulting outcome, assignment clearing, history event, and whether a later same-stock assignment may create work. Do not delegate this to a future recovery model.
   - **Consequence:** Mechanics may continue to claim an unassigned bike, or history can misrepresent an unassignment as a rental cancellation or replacement.

4. **Cancellation, replacement, and Return can arrive in one accepted source graph without a precedence rule.**
   - **Location:** AD-5; AD-6; AD-9; PRD FR-6 and FR-18.
   - **Compliant divergence:** A derivation can process `returned` first, release the owner, snapshot Return, and make a task claimable; another can process cancellation/replacement first and make it terminal. A graph with cancellation plus a retained/replaced assignment is not excluded by the spine.
   - **Missing guard:** Publish one source-derivation precedence table for cancellation, exact-assignment replacement/removal, and return eligibility, including the single resulting history sequence and revision. It must state that no Return snapshot is created for a task whose winning outcome is `Cancelled`, `Replaced`, or `Force-closed`.
   - **Consequence:** The same canonical refresh can create a Return task in one implementation and a terminal task in another.

5. **Missing active templates have no defined source-apply or task-state outcome.**
   - **Location:** AD-5; AD-7; AD-16; PRD FR-3 through FR-5.
   - **Compliant divergence:** An ingestion implementation can accept canonical source data but skip task creation when the category lacks an active Prep template. Another can create an empty/unusable task, and a third can roll back the otherwise valid canonical apply. Return has the same ambiguity when no active Return template exists.
   - **Missing guard:** Define template absence as a typed derivation result and its atomicity boundary: whether canonical source application remains accepted while Workshop derivation is withheld, how the condition is surfaced, and the permitted next path after a manager activates a template. Require no empty snapshot or claimable task.
   - **Consequence:** A manager-assigned bike can silently disappear from Workshop, become unworkable, or cause source state to fail to refresh without an interoperable recovery path.

6. **“Accepted `applied` source result” does not state whether a derivation failure rolls back source application.**
   - **Location:** AD-2; AD-5; AD-16.
   - **Compliant divergence:** The canonical coordinator can commit source rows and return `applied` while its internal derivation records/logs an error and creates no task. Another implementation can treat any derivation failure as transaction failure and return a rejected result. Both can claim to call derivation “in the same transaction” unless the result contract binds the outcome.
   - **Missing guard:** State that an `applied` result includes successful required Workshop derivation, or enumerate the limited derivation-blocked result and its atomic source-state semantics. Bind source-refresh logging and claim behavior to that result rather than letting callers infer from task absence.
   - **Consequence:** Webhook and claim paths can report authoritative refresh success while workshop state is incomplete, defeating the claim-side current-authority guarantee.

7. **M1’s durable identity is undefined when Prep is reassigned before handoff.**
   - **Location:** AD-6; AD-7; AD-10; PRD Glossary “M1” and FR-13.
   - **Compliant divergence:** One reassignment RPC permanently records the first Prep claimant as M1. Another records the mechanic who performs the accepted handoff, consistent with the PRD definition. Both retain prior Item attribution and prevent the recorded M1 from Re-check.
   - **Missing guard:** State that M1 is the authenticated actor of the accepted Prep handoff, and define the allowed Prep evidence/confirmation behavior after reassignment so the handoff actor and the M2-exclusion identity are the same immutable value.
   - **Consequence:** A reassigned mechanic may be incorrectly barred from, or incorrectly allowed to, independently Re-check a task, undermining the two-person guarantee.

8. **Open attention records lack a concurrency and idempotency contract.**
   - **Location:** AD-8; AD-9; AD-10; AD-18; PRD FR-16.
   - **Compliant divergence:** A manager can resolve an open record while a mechanic raises the same reason. One implementation overwrites the resolution and leaves one open record; another closes the newly raised concern; another inserts duplicates because it treats each raise as a separate non-blocking record. All retain immutable task history and can show a Manager Attention List.
   - **Missing guard:** Define the open-record identity and expected revision/CAS behavior for raise, context update, and resolve. State the outcome for a raise racing resolution and how the read model represents deduplicated current attention versus historical occurrences.
   - **Consequence:** Managers can believe an active exception was resolved, or see duplicate rows that obscure which intervention is outstanding.

9. **Notes authorization is not bound to the PRD’s assigned-mechanic rule.**
   - **Location:** AD-10; AD-11; AD-18; PRD FR-22.
   - **Compliant divergence:** A capability RPC can allow every authenticated mechanic to edit Notes because AD-11 only requires role authorization. Another allows only the current assignee plus Admin/Manager, as FR-22 requires. Both use RLS reads and a capability RPC.
   - **Missing guard:** Add a per-command authorization matrix: Notes require the current task assignee in an active phase or Admin/Manager; terminal/unassigned task behavior must be stated explicitly. Preserve the separate expected Notes revision from AD-9.
   - **Consequence:** An unrelated mechanic can change rental context on a task they do not own, or valid task owners can be blocked by an over-restrictive implementation.

10. **Attention-raise authorization is equally under-specified.**
    - **Location:** AD-10; AD-11; PRD FR-16.
    - **Compliant divergence:** One RPC lets any authenticated mechanic raise one of the two allowed reasons on any task. Another permits only the assigned mechanic and Admin/Manager, as the PRD specifies. Both validate reason codes and write attributable history.
    - **Missing guard:** Bind the raise capability to an assigned mechanic for the active task or Admin/Manager, list the allowed phase/outcome guard, and define the manager-originated surface without making the Manager Attention List depend on a pre-existing record.
    - **Consequence:** Needs Attention can become an unaudited cross-task signaling channel, or staff can be unable to raise a legitimate exception from the phase where they encounter it.

## Non-finding: external project-context alignment

`_bmad-output/project-context.md` still contains intentionally retained pre-MVP integration and source-identity rules that conflict with the compressed scope. AD-19 and the spine’s Deferred section already identify that alignment work as separately authorized source maintenance. Per the requested boundary, this review does not count that external alignment as a finding against this spine revision.

## Recommended path

Add a compact derivation transition matrix covering assignment removal/reappearance, overassignment, terminal/Return precedence, and template/derivation failures. Then bind M1-on-handoff, attention CAS/idempotency, and the two task-adjacent authorization checks in the existing AD-7/AD-10/AD-11 contracts. Keep the project-context alignment change as a separate, explicitly authorized update.
