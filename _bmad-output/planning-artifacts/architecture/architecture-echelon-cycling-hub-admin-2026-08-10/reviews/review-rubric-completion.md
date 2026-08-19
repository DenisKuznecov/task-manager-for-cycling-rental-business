# Final Rubric Gate — Workshop Tasks MVP Architecture Spine

**Reviewed:** 2026-08-18  
**Artifact:** `../ARCHITECTURE-SPINE.md` (updated 2026-08-18)  
**Method:** Final good-spine rubric gate plus targeted reconciliation against `prd.md`, `addendum.md`, the approved sprint-change proposal, retained project context, and the current Booqable integration code.  
**Source-edit policy:** No source artifact was edited during this review.  

## Verdict

**PASS — no critical or high findings.** The revised spine is a safe build substrate for the compressed Workshop Tasks MVP. It closes the prior source-derivation, lifecycle, concurrency, authorization, operational, and traceability seams without restoring the retired autonomous-reconciliation architecture.

## Evidence reviewed

- The revised `ARCHITECTURE-SPINE.md`.
- The final Workshop Tasks PRD, its addendum, and the approved 2026-08-18 sprint-change proposal.
- Retained `_bmad-output/project-context.md`.
- `src/lib/booqable/canonical-adapter.ts`, `ingestion-coordinator.ts`, `ingestion-guard.ts`, the existing webhook route, and the legacy `sync.ts` references.
- Earlier rubric, PRD-reconciliation, adversarial-seam, and technical-reality reports.

## Targeted prior-seam validation

### Source derivation, cardinality, and precedence — closed

AD-5 makes `apply_canonical_order_graph` the sole caller of a service-only internal Workshop derivation function, in the same transaction and only for an accepted `applied` result. It prohibits every other source-triggered create, cancel, replace, or reconfirm path.

The same rule now fixes the creation key to **one Booqable rental/order plus one exact opaque StockItem ID**, treats `stock_identifier` as display-only, and fails closed for ambiguous associations, duplicate StockItem association, missing active templates, and derivation errors. It also states that unassigned, ambiguous, draft, new, and concept orders create no task; cancelled or replaced StockItems do not auto-reactivate.

AD-6 supplies the formerly missing return precedence and atomicity: `Cancelled`, `Replaced`, and `Force-closed` win over Return and receive no Return Snapshot. Otherwise a returned Actionable task clears prior Prep/Re-check ownership, records interrupted work, increments task revision, creates exactly one Return Snapshot, and becomes unassigned `Needs Return Check`; repeated returned refreshes are no-ops.

### Classification and templates — closed

AD-13 preserves the repository-owned six controlled ProductGroup Workshop tags and requires any included bike Bundle to carry the matching `workshop-*-bike-bundle` tag. Tags classify category only; they never substitute for StockItem identity. Unknown, multiple, conflicting, untagged, or bundle-disagreeing classifications fail closed.

AD-7 separates immutable Prep and Return snapshots. Task creation copies the active Prep version; Return entry copies the active Return version for the current valid source category. Category failure at Return cannot silently create an arbitrary or empty template. M2 configuration and attestation are explicitly Prep-only, so Return remains a single-mechanic flow with no M2 or individual modification-acknowledgement engine.

### M1 handoff and M2 independence — closed

AD-7 establishes that M1 is the authenticated actor of the accepted Prep handoff, not merely an initial claimant. A reassigned Prep task can be completed by its new assignee, whose accepted handoff becomes M1 and fixes the M2 exclusion identity. M1 evidence is locked after handoff; M2 verifies separate, confirmed M1 evidence. AD-9 adds role-scoped evidence revisions and server-side lock/re-read at completion, preventing stale or cross-role evidence from satisfying the wrong stage.

### Reconfirmation and claim concurrency — closed

AD-13 assigns relevant-change detection to the source-derivation boundary, advances a monotonic reconfirmation generation and task revision during `In Prep`, retains the M1 owner, and blocks handoff. The acknowledgement is tied to the displayed generation, records actor/time, clears only that obligation, and leaves ordinary Item saves and previously confirmed outcomes intact.

AD-9 now requires a claim-refresh result to distinguish claimed target, target transitioned with authoritative terminal/replacement facts, unavailable/unauthorized target, and refresh failure. It explicitly forbids silent successor claims. Canonical changes affecting actionability, phase, reconfirmation, or Return eligibility advance the same task revision, so stale commands receive authoritative state rather than overwriting source-driven transitions.

### Attention, manager interventions, and Notes — closed

AD-10 makes Needs Attention a non-blocking, revisioned record with the two approved mechanic reasons only. It defines a single open occurrence per `(task, reason)`, a new occurrence for a raise racing resolution, manager-only resolution, and persistence through reassignment, Return, and terminal outcomes until attributable manager resolution. The Manager Attention List reads only current open records.

Reassignment is an authorized, phase-guarded manager RPC: it cannot send a Re-check phase to recorded M1, increments task revision, records one owner change, requires a manager-supplied reason, and makes the new `In Prep` owner satisfy any open reconfirmation obligation. Force-close also requires a manager-supplied reason.

Notes are correctly distinct from history: one mutable latest-value field, protected by an independent expected revision, editable only by the current assigned mechanic in an Actionable phase or an Admin/Manager. The map explicitly covers FR-22, and task context carries Notes for Prep and Return without making it an identity or completion condition.

### Diagram and repository-reality labeling — closed

The diagrams and live-wiring statements are correctly marked as **target state after the approved live-wiring story**. AD-3 and AD-4 state the present reality: the production webhook continues through legacy `sync.ts` until the cutover is implemented and verified. This matches the current webhook code, which imports `syncBooqableOrder`; it does not misrepresent canonical fetch-and-apply as currently live.

AD-14 also avoids the prior unsupported deployment claim. It requires preview ingestion denial at runtime even if previews inherit credentials, and requires the actual Vercel execution model plus a route-level total deadline to be recorded before live canonical wiring. That is consistent with `isBooqableIngestionAllowed()` and with the unresolved deployment-time proof.

### Scope, recovery, and online-only boundaries — closed

AD-4 permits bounded synchronous transport retry and explicit user resubmission of the original claim only; AD-19 prohibits durable queues, workers, sweeps, hidden retry loops, new repair APIs, rollout control, cohorts, tenancy, and paper-retirement automation. The named legacy bulk sandbox backfill remains an explicit exception using `sync.ts`, not a new Workshop repair surface.

AD-12 binds NFR-7 directly: mutations need a live authenticated request and authoritative server confirmation; session-local unsaved input is allowed, while command queueing/replay and cached/offline claimable or completable tasks are prohibited.

## Good-spine rubric result

| Rubric area | Result | Basis |
| --- | --- | --- |
| Real implementation divergence points | Pass | Source derivation, task identity, Return preemption, claims, snapshots, M1/M2 evidence, attention, Notes, and operations each have a single stated rule. |
| Enforceable architecture decisions | Pass | AD-1 through AD-19 contain explicit `Binds`, `Prevents`, and operational rules with caller, transaction, revision, authorization, or prohibition boundaries. |
| PRD and sprint-proposal coverage | Pass | The map and frontmatter bind FR-1..FR-22 and NFR-1..NFR-7; the compressed MVP non-goals remain explicit. |
| Brownfield ratification | Pass | The spine preserves the frozen canonical contracts, brownfield readers, local-customer behavior, `sync.ts` pending cutover, service-only projection access, and CI-only remote migrations. |
| Safe deferral | Pass | Relevant-change fields, unassigned-bike visibility, unfinished-Prep Return presentation, schemas/indexes, and future recovery/configuration/rollout capabilities are bounded without delegating core ownership or security decisions. |
| Operational completeness | Pass | Preview denial, local verification, CI-only remote migration, live-wiring time-budget proof, retry limits, online-only behavior, and the legacy backfill exception are all explicit. |

## External source-maintenance note — not a spine defect

`addendum.md` still says the current FR range ends at FR-21, while the authoritative final PRD, spine frontmatter, and capability map correctly include FR-22 for Notes. This is documentation traceability drift in the addendum, not an Architecture Spine defect.

The retained project context also still contains superseded enterprise Workshop/Booqable scope. Per the review instruction, its explicitly deferred alignment update is **not counted as a spine defect**: AD-19 and the spine Deferred section accurately say that the approved PRD/spine control this MVP and that a separately authorized project-context update is required before implementation.

## Findings

### Critical

None.

### High

None.

### Medium / Low

No spine findings. The external addendum FR-range discrepancy is recorded above for later source maintenance.
