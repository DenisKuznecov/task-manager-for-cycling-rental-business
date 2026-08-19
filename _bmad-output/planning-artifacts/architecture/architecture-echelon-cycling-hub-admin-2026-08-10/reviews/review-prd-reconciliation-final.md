# Final PRD Reconciliation Review — Workshop Tasks MVP

**Reviewed:** `ARCHITECTURE-SPINE.md` (updated 2026-08-18) against `prd.md`, `addendum.md`, and the approved `sprint-change-proposal-2026-08-18.md`  
**Scope:** product requirements FR-1..FR-22 and NFR-1..NFR-7; no changes made to the Architecture Spine.  
**Verdict:** **REVISE — two narrow, testable authorization/audit constraints remain; all previously material architecture conflicts are reconciled.**

The revised spine now expresses the approved compressed MVP rather than the retired autonomous lifecycle platform. It preserves the frozen canonical Booqable boundary and defines exact manager-assigned, rental-scoped tasks; category classification including Bundles; active-Prep-only reconfirmation; non-blocking attention; one-mechanic Return; current-authority refresh; task-scoped source access; online-only behavior; and the required device support.

## Final reconciliation matrix

| Requirement | Spine landing | Result |
| --- | --- | --- |
| FR-1 Templates | AD-7 immutable Prep/Return versions; capability map | Landed |
| FR-2 Item type, required/M1/M2 configuration | AD-7’s Action/Value, M2-only-on-Prep, and M2-implies-M1 rules | Landed |
| FR-3 Snapshots | AD-2, AD-6, AD-7 | Landed |
| FR-4 Exact assigned StockItem only | AD-5 | Landed |
| FR-5 Controlled source category tags | AD-13 | Landed |
| FR-6 Simple cancel/replace | AD-5, AD-6 | Landed |
| FR-7 Available Now / My Work | AD-12 | Landed |
| FR-8 One-owner conditional claim | AD-9, AD-15 | Landed |
| FR-9 Per-bike independent work | AD-5’s rental-plus-exact-StockItem key and per-task state model | Landed |
| FR-10 Rental context | AD-3, AD-12, AD-18 | Landed |
| FR-11 Prep outcomes | AD-7, AD-9 | Landed |
| FR-12 Confirmed complete-Prep handoff | AD-6, AD-7, AD-9 | Landed |
| FR-13 Different M2 | AD-6, AD-7 | Landed |
| FR-14 Separate M2 attestation | AD-7, AD-9 | Landed |
| FR-15 Active-Prep reconfirmation | AD-8, AD-9, AD-13, AD-18 | Landed |
| FR-16 Needs Attention | AD-8, AD-10, AD-12 | Landed |
| FR-17 Reassign / force-close | AD-8, AD-10 | **Narrow gap: intervention reason** |
| FR-18 Returned work / Return transition | AD-6, AD-7 | Landed |
| FR-19 Return completion | AD-6, AD-7 | Landed |
| FR-20 Attributable history | AD-8, AD-18 | Landed |
| FR-21 Signal and claim refresh | AD-4, AD-15, AD-16 | Landed |
| FR-22 Shared Notes | AD-9, AD-10, AD-18; capability map | **Narrow gap: editor authorization** |
| NFR-1–NFR-4 Usability, form factors, confirmed/pending saves | AD-9, AD-12; consistency conventions | Landed |
| NFR-5 Audit integrity | AD-2, AD-8, AD-18 | Landed |
| NFR-6 Authorized access | AD-11, consistency conventions | Landed, subject to FR-22 editor rule below |
| NFR-7 Online-only | AD-12 | Landed |

## Previously blocking focal areas — reconciled

- **Bundle classification:** AD-13 now states that the exact ProductGroup tag selects category and that a matching `workshop-*-bike-bundle` tag must agree when the source graph includes a bike Bundle. It retains the rule that tags classify only and never replace StockItem identity.
- **Rental-scoped identity:** AD-5 idempotently keys a task by **one Booqable rental/order plus one exact opaque StockItem ID**, with `stock_identifier` limited to display/confirmation. This prevents cross-rental deduplication while retaining the no-provisional/no-quantity-derived boundary.
- **Notes model:** AD-10, AD-18, and the capability map now make Notes one mutable latest-value field, give it an independent expected revision, keep observations in immutable history, and expose it in the shared task-context vocabulary.
- **Return scope:** AD-6 and AD-7 expressly make Return a one-mechanic phase with no M2 stage and no individual modification-acknowledgement engine. A returned actionable task interrupts unfinished Prep/Re-check atomically, creates the current-category Return Snapshot, and becomes unassigned `Needs Return Check`.
- **Reconfirmation lifecycle:** AD-13 now specifies a monotonic generation and task revision, M1 acknowledgement with actor/time, clearing only that obligation, preservation of Item outcomes, ordinary Item saves before/after acknowledgement, and no reopening after handoff/Re-check/completed Prep.
- **Source-table access:** AD-3 confines `booqable_*` projection tables to service role; AD-11 permits Workshop users only purpose-built, task-scoped reads and prohibits unrelated customer/order/contact/demographic exposure.
- **Online-only behavior:** AD-12 expressly forbids cached/offline claimable/completable tasks and command queue/replay, while allowing unsaved input only in the open session.
- **Form factors:** AD-12 requires frequent mechanic actions to be tap-friendly on phones and tablets and manager templates/interventions to support desktop.

## Remaining findings

### F1 — FR-17 does not require a reassignment or force-close reason

**Sources:** `prd.md` FR-17 (“Every intervention records actor, time, reason, and resulting status”); `ARCHITECTURE-SPINE.md` AD-8 and AD-10.  
**Gap:** AD-8 mandates an attributed event for reassignment and force-close, and AD-10 defines a phase-guarded reassignment RPC, but neither requires an intervention reason as RPC input/current data/history payload. AD-10’s reason requirement belongs to Needs Attention, which is separate and may not exist for a manager intervention.  
**Risk:** A compliant implementation can record actor, time, owner/status but omit why the manager reassigned or force-closed work, failing FR-17’s audit contract.  
**Required reconciliation:** Require a manager-supplied reason for every reassignment and force-close and persist it in the same immutable history event as the resulting state.

### F2 — FR-22 does not define which users may edit Notes

**Sources:** `prd.md` FR-22; `ARCHITECTURE-SPINE.md` AD-9, AD-10, AD-11, AD-18.  
**Gap:** The spine defines Notes’ mutability, revision behavior, and task context, while AD-11 broadly delegates authorization to RLS/capability RPCs. It does not preserve FR-22’s editor rule: any mechanic **assigned to that Bike Task** and any Admin / Manager may edit; unassigned mechanics may not.  
**Risk:** Stories can reasonably implement either all authenticated mechanics or only managers as Note editors, despite the PRD’s deliberate assignment-scoped collaboration rule.  
**Required reconciliation:** State the Notes write capability explicitly: authorize the current assigned mechanic and Admin / Manager; reject other mechanics; preserve the existing latest-value/no-history semantics.

## Disposition

Do not restore any retired enterprise mechanism. The only required spine follow-up is to add F1’s intervention-reason invariant and F2’s Notes-editor authorization invariant. Once those two constraints are added, the spine will fully reconcile with the approved PRD, addendum, and sprint-change proposal for FR-1..FR-22 and NFR-1..NFR-7.
