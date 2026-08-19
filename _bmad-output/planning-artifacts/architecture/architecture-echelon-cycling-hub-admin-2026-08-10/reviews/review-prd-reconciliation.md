# PRD Reconciliation Review — Workshop Tasks MVP

**Reviewed:** `ARCHITECTURE-SPINE.md` (updated 2026-08-18) against `prd.md`, `addendum.md`, and `sprint-change-proposal-2026-08-18.md`  
**Verdict:** **REVISE BEFORE STORY DECOMPOSITION**

The spine substantially lands the approved compressed-MVP architecture: one canonical fetch-and-apply boundary; manager-assigned exact StockItem tasks; simple cancel/replace; atomic, attributable workflow changes; independent M2 with no override; active-Prep-only reconfirmation; non-blocking attention; Return on the same task; and no enterprise recovery or rollout control plane.

However, it conflicts with the preserved source tag contract for bundles, omits a durable rental-scoped task identity rule, and does not fully bind FR-22. It also leaves several explicit product constraints too implicit for safe implementation. These are architecture contract corrections, not a request to restore the retired autonomous-lifecycle plan.

## Material capabilities and constraints that landed

- **Single canonical source boundary and preservation:** AD-1, AD-3, AD-4, AD-16, and AD-17 preserve the frozen canonical adapter, signal-only webhooks, refetch-and-apply behavior, unchanged `sync.ts`, and brownfield readers. They match the sprint proposal's live-wiring boundary.
- **Simple source identity, cancellation, and replacement:** AD-5 and AD-6 adopt exact manager-assigned StockItem creation, cancellation to `Cancelled`, replacement to `Replaced`, fresh-task creation for the replacement, retained history, and no provisional identity, replacement-chain algebra, automatic reactivation, overlap guard, or correction successor.
- **Claim refresh:** AD-4 and AD-15 require the claim-side canonical refetch and apply, reject a failed refresh without claiming, and exclude freshness proofs and retry infrastructure.
- **M1/M2 model:** AD-6 and AD-7 preserve the small outcome/phase vocabulary, separate M2 attestation, and the explicit bans on a Work Cycle, manager reset, and same-mechanic M2 override.
- **Attention, Notes, and history:** AD-8 through AD-10 make history immutable and attributable, make attention non-blocking with the two MVP reasons, preserve reassignment/force-close attribution, and define one mutable latest-value Notes field with observations in history.
- **Active-Prep reconfirmation:** AD-13 correctly confines source-change reconfirmation to `In Prep`, retains M1 ownership, blocks handoff, and forbids reopening after handoff, Re-check, or completed preparation.
- **Return and scope reduction:** AD-6, AD-7, AD-14, and AD-19 correctly reuse the task/checklist model for Return, preserve unfinished Prep/Re-check as context, and exclude rollout controls, pilot cohorts, tenancy, source repair, retry/reconciliation infrastructure, paper-retirement automation, and enterprise recovery features.

## Critical

### C1 — Bundle classification contract is narrowed contrary to the addendum

**Sources:** `addendum.md` §Technical-How; `ARCHITECTURE-SPINE.md` AD-13  
**Mismatch:** The addendum preserves matching `workshop-*-bike-bundle` tags for Booqable Bundles. AD-13 instead states that *exactly one ProductGroup* tag from only the six non-bundle tags selects a category. It gives no permitted bundle-tag path.

**Risk:** A canonically valid assigned bike delivered through a tagged bundle can be rejected as untagged/unknown and never create a Workshop task. This is a direct source-contract regression, not a future accessory-inference feature.

**Required reconciliation:** State the canonical classification input and allowed controlled tag vocabulary precisely, including matching bundle tags where the shipped canonical contract exposes a Bundle. Keep the constraint that tags classify category only and never replace exact StockItem identity.

## High

### H1 — The task identity rule is not explicitly rental-scoped

**Sources:** `prd.md` Glossary “Bike Task”; FR-4 and FR-6; `ARCHITECTURE-SPINE.md` AD-5 and AD-18  
**Mismatch:** The PRD defines a Bike Task as one physical bike **within one rental order**. AD-5 says an exact assigned StockItem creates “at most one Bike Task for that assigned work,” while AD-18 only names a stock identifier in task context. Neither defines the durable source identity/key as rental/order plus opaque StockItem identity.

**Risk:** An implementation can incorrectly deduplicate all historical assignments of the same StockItem, preventing a later rental from receiving a fresh task, or attach cancellation/replacement handling to the wrong rental.

**Required reconciliation:** Make the idempotent creation identity explicit: a task represents one exact assigned StockItem in one Booqable rental/order; the external StockItem ID is opaque identity within that scope, while `stock_identifier` is display/confirmation only. Preserve the existing “no provisional/multi-quantity identity” boundary.

### H2 — FR-22 is absent from the spine’s declared contract and capability map

**Sources:** `prd.md` FR-22 and §5.1; `addendum.md` retired-FR map; `ARCHITECTURE-SPINE.md` front matter, Capability → Architecture Map  
**Mismatch:** The PRD contains FR-1 through FR-22, but the spine front matter binds only `FR-1..FR-21`; its map stops at “Task history and current refresh — FR-20..FR-21.” AD-9, AD-10, AD-11, and AD-12 refer to FR-22, so the spine is internally inconsistent. The addendum’s claim that the new range ends at FR-21 is itself stale and propagates the problem.

**Risk:** Notes can be omitted from story coverage, acceptance traceability, or release verification despite being in scope.

**Required reconciliation:** Correct the source addendum’s range, front-matter binding, and capability map to include a distinct FR-22 Notes row. Retain its product limits: assigned mechanics and Admin/Manager edit one shared latest value, visible in Prep and Return; it is neither identity nor a completion prerequisite; it has no revision history.

### H3 — Return Check lacks explicit “no M2” and no-modification-acknowledgement constraints

**Sources:** `prd.md` FR-19 and its consequences; `addendum.md` §Accepted Model Rationale and §Rejected Alternatives; `ARCHITECTURE-SPINE.md` AD-6 and AD-7  
**Mismatch:** AD-6 makes Return Check the only actionable work after a return and AD-7 snapshots a Return template, but neither expressly rules out M2 for Return nor rules out a per-item modification/acknowledgement engine. AD-7’s general M2 rule can be read as applying to both Prep and Return template families.

**Risk:** Stories can add a Return M2 stage or the retired structured-modification/individual-acknowledgement model, delaying `Done` and expanding the MVP.

**Required reconciliation:** State that M2 configuration and attestation apply only to the Prep Snapshot; Return has one mechanic, no M2 stage, and no individual modification acknowledgement. Completing required Return Items transitions the task to `Done` with actor and timestamp; observations are history events.

## Medium

### M1 — Active-Prep reconfirmation does not define the complete flag lifecycle

**Sources:** `prd.md` FR-15; `ARCHITECTURE-SPINE.md` AD-8, AD-13, and AD-18  
**Mismatch:** The spine requires an acknowledgement and history event, but does not explicitly require the acknowledgement to persist actor and time, clear the current reconfirmation flag, leave existing Item outcomes untouched, and allow ordinary Item saves before or after it. These are FR-15’s testable semantics.

**Risk:** Different stories can treat reconfirmation as a passive notice, a permanently open flag, or an invalidating change engine—the last of which is explicitly out of scope.

**Required reconciliation:** Add the exact FR-15 lifecycle: relevant applied change during `In Prep` sets the visible flag; M1’s explicit acknowledgement records actor/time and clears it without rewriting or invalidating Item outcomes; any needed Item change uses the normal save path; handoff remains blocked only until acknowledgement.

### M2 — The `booqable_*` service-role-only constraint is not preserved explicitly

**Sources:** `addendum.md` §Technical-How; `ARCHITECTURE-SPINE.md` AD-3, AD-11, AD-16  
**Mismatch:** The addendum says new `booqable_*` tables remain service-role-only. AD-11 protects Workshop reads/writes generally and limits service-role credentials to backend ingestion, but does not state that source-projection tables are inaccessible to authenticated Workshop roles and are exposed only through purpose-built task context/read contracts.

**Risk:** A future RLS policy or feature query can expose source-projection tables directly, widening the frozen source contract and creating a competing reader surface.

**Required reconciliation:** Add the explicit table-access boundary: `booqable_*` projection tables are service-role-only; Workshop users receive only RLS-protected Workshop views/read RPCs with task-scoped context.

### M3 — Online-only scope is bound but not architecturally constrained

**Sources:** `prd.md` NFR-7 and §5.2; `addendum.md` §Rejected Alternatives; `ARCHITECTURE-SPINE.md` front matter, AD-12, AD-19  
**Mismatch:** The spine binds NFR-7 but never states that Workshop Tasks is online-only and must not add offline persistence, deferred command replay, or background synchronization. AD-12 allows pending UI and authoritative refresh, which is compatible with the requirement but does not exclude an offline queue.

**Risk:** A client implementation can introduce offline mutation storage/replay under the guise of resilience, conflicting with server-confirmed saves and the approved MVP boundary.

**Required reconciliation:** State that the feature is online-only: retain typed input while an open session retries a visible failed save, but do not persist offline work, queue commands, or replay mutations after connectivity/session loss.

### M4 — Form-factor obligations are only partially stated

**Sources:** `prd.md` NFR-1 and NFR-2; `ARCHITECTURE-SPINE.md` AD-12 and Structural Seed  
**Mismatch:** The spine’s structural seed calls mechanic surfaces “tablet-first” and manager surfaces exist, but does not carry the required phone support for mechanic flows or desktop support for manager flows. “Responsive confirmed-save UX” maps NFR-1..NFR-4 without making those target form factors a decision constraint.

**Risk:** Story acceptance can optimize only the tablet task screen and leave phone mechanics or desktop manager intervention unsupported.

**Required reconciliation:** Add the explicit responsive contract: frequent mechanic actions are tap-friendly on phones and tablets; manager Attention/intervention and template operations support desktop.

## Non-findings for the requested focal areas

- **No Work Cycle / M2 override:** explicitly landed in AD-6.
- **Simple cancel/replace, no autonomous lifecycle machinery:** explicitly landed in AD-5, AD-6, and AD-19, subject to H1’s identity precision.
- **Claim refresh behavior:** explicitly landed in AD-4 and AD-15, including visible failure and no stale claim.
- **Attention, Notes, and history:** the core non-blocking/mutable/immutable split is correctly landed, subject to H2’s FR-22 traceability and M2’s source-table access precision.
- **Frozen canonical source contract and brownfield preservation:** strongly landed in AD-1, AD-3, AD-4, AD-16, and AD-17, subject to C1 and M2.

## Reconciliation disposition

Correct C1, H1, H2, and H3 before deriving implementation stories. M1 through M4 should be incorporated in the same spine revision so testable product constraints do not become optional implementation interpretation. No finding requires restoring the pre-2026-08-18 source-identity, freshness-proof, rollout, or recovery architecture.
