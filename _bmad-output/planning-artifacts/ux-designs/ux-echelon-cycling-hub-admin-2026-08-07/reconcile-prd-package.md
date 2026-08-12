# Reconciliation — Workshop Tasks UX Source Package

## Verdict

The distilled `DESIGN.md` and `EXPERIENCE.md` preserve the workshop's load-bearing qualitative intent: bike quality over checklist theater, fast workbench orientation, ordinary Prep/Re-check reuse, strong persistent treatment of stale or changed work, independent verification, durable return changes, and manager intervention without making managers a normal-flow gate.

Later UX memlog decisions and the final PRD correctly override the pre-final reviews and earlier mock directions. No rejected direction has leaked back into the canonical spine contracts.

Reconciliation identified three material follow-up findings: the required read-only same-stock “last touched” lookup, the complete FR-38 signal taxonomy, and promotion of accepted artifacts into the linked `mockups/` and `wireframes/` paths. All three were resolved before the spines were finalized. No material source-package or package-integrity gap remains open.

## Authority Used

1. Final `prd.md` and later PRD `.memlog.md` decisions.
2. Later UX `.memlog.md` decisions and overrides.
3. `DESIGN.md` and `EXPERIENCE.md` as the distilled UX contracts.
4. Accepted working artifacts as visual/flow evidence only.
5. Pre-final reviews and earlier artifact directions as historical evidence, not current authority.

## Spine Baseline

| Spine | Reconciliation result |
|---|---|
| `DESIGN.md` | Represents the accepted Subframe inheritance, operational hierarchy, glare-resistant palette use, 48px mechanic controls, persistent attention/change/terminal treatment, equal dashboard panels, continuous checklist layout, and canonical component vocabulary. |
| `EXPERIENCE.md` | Represents the accepted IA, lifecycle, attention effects, save/concurrency behavior, template governance, state matrix, responsive behavior, accessibility floor, same-stock lookup, FR-38 signal taxonomy, and UJ-1 through UJ-4. |

## Source Coverage Ledger

### EXPERIENCE.md frontmatter sources

| Source | Load-bearing UX decisions represented? | Reconciliation note |
|---|---|---|
| `../../prds/prd-echelon-cycling-hub-admin-2026-08-07/prd.md` | Yes | The final lifecycle, queues, item behavior, selective reopening, Return Check, manager controls, save certainty, responsive use, online-only boundary, FR-37 same-stock lookup, and FR-38 three-way signal taxonomy are represented. The last two were identified during reconciliation and added before finalization. |
| `../../prds/prd-echelon-cycling-hub-admin-2026-08-07/addendum.md` | Yes | Rejected release gate, generated Items, separate revalidation flow, auto-assignment, urgent ping, duplicate M2 value entry, Notes revision history, offline resilience, and separate workshop identity remain excluded. UX-owned open topics were resolved conservatively and visibly. |
| `../../prds/prd-echelon-cycling-hub-admin-2026-08-07/discovery-source-workshop.md` | Yes, against its final converged model | The living Bike Task, quality thesis, independent selective verification, ordinary-flow reopening, always-visible Items, explicit Done/N/A, bike-focused context, durable changes, and adoption-risk intent are represented. Earlier Notes-as-change-ledger and generated/dynamic Item models were correctly superseded by the final PRD. |
| `../../prds/prd-echelon-cycling-hub-admin-2026-08-07/reconcile-workshop-memory.md` | Yes as historical reconciliation | Its five gaps were resolved in the final PRD/memlog and are not current product conflicts. The restored mandatory “last touched” lookup is carried into Bike Task context through `last-touched-summary`. |
| `../../prds/prd-echelon-cycling-hub-admin-2026-08-07/review-lifecycle-consistency.md` | Yes as historical risk input | Final PRD resolutions for authoritative refresh, terminal replacement, return precedence, Work Cycles, attention independent of Done, snapshots, reset/force-close, stale screens, and source-of-truth partition are reflected. The review's pre-final verdict is not authoritative. |
| `../../prds/prd-echelon-cycling-hub-admin-2026-08-07/review-workshop-usability.md` | Yes as historical risk input | My Work resumption, visible physical-bike identity, durable Structured Modifications, first-release manager attention discovery, item-level save/retry, stale-screen rejection, loading/pending feedback, persistent failures, and paperless tablet focus are represented. Deferred self-release and phase-aware priority were correctly not invented. |
| `../../prds/prd-echelon-cycling-hub-admin-2026-08-07/review-rubric.md` | Yes as historical quality input | The spines preserve the quality thesis, explicit scope, human protagonists, loading/save boundaries, return evidence, and downstream terminology. Pre-final implementation-readiness warnings resolved later are not treated as open UX findings. |
| `../../prds/prd-echelon-cycling-hub-admin-2026-08-07/.memlog.md` | Yes | Later decisions authoritatively supply Waiting for Bike ID, durable modifications, attention independent of Done, convergence, forced Return Check, confirmed saves, pending feedback, and final PRD precedence. Reconciliation follow-ups preserve the required same-stock lookup and signal taxonomy. |
| `../../../project-context.md` | Yes | The spines inherit Next.js App Router, Subframe, Geist, responsive web, authenticated staff roles, route-loading conventions, Booqable authority, and the existing admin shell without duplicating implementation rules. |

### UX discovery and continuation sources

| Source | Load-bearing UX decisions represented? | Reconciliation note |
|---|---|---|
| `.memlog.md` | Yes | The complete decision sequence is represented, including all later overrides: no mechanic-wide attention queue, equal dashboard panels, loud attention strips, no queue-row actions, top-first task notices, wider checklist, continuous groups, 48px controls, autonomous concern closure, and spine-only secondary surfaces. |
| `.working/source-extract-ux.md` | Yes | Form factor, roles, journeys, lifecycle, implied surfaces, save/stale contracts, strong change emphasis, and first-release exclusions all map into the spines. Deferred UX topics were resolved without contradicting the final PRD. |
| `.working/resume-handoff-2026-08-07-1631.md` | Yes | The latest accepted dashboard, task-detail, manager-list, attention, environment, template, audit, tone, and concern-scan decisions were carried forward. The older handoff is correctly historical. |

### Accepted and promoted HTML and Excalidraw artifacts

| Artifact | Load-bearing UX decisions represented? | Reconciliation note |
|---|---|---|
| `wireframes/ia-2026-08-07.excalidraw` | Yes | Role-specific dashboards, equal My Work/Available Now, manager-owned attention, Waiting for Bike ID → Booqable, shared Bike Task route, ordinary Prep/Re-check, persistent changes, Return Check modifications, terminal routing, template administration, and Activity / History are represented. The promoted artifact uses the final full-width attention-reason treatment. |
| `wireframes/flow-task-execution-2026-08-07.excalidraw` | Yes | Glare/glove input floor, claim flow, continuous groups, 48px-or-larger Done/N/A controls, per-Item saves, Value debounce/flush, sticky lifecycle action, unresolved-item jump, confirmation, portrait reflow, persistent Booqable changes, retries, and Return modification acknowledgement are represented. |
| `.working/directions-dashboard-1.html` | Yes for selected Direction B | Equal landscape queues and portrait stacking are canonical. Direction A's My Work primacy and Direction C's dense phase-row hierarchy were deliberately rejected. Mock-only browser chrome, greeting, date chip, and “Synced just now” copy were not promoted into contracts. |
| `mockups/refine-mechanic-dashboard-2026-08-07.html` | Yes | Strictly equal panels, balanced bike/phase/action weight, full-width attention reason, card facts, Subframe inheritance, and portrait order are represented. |
| `mockups/refine-mechanic-task-detail-2026-08-07.html` | Yes | Top notices, narrower context/wider checklist split, current and previous `extra_information`, source-labeled accessories, full-weight `No`, continuously visible groups, changed boundaries, local saves, and sticky handoff are represented. |
| `mockups/refine-manager-dashboard-2026-08-07.html` | Yes | Needs Attention first, Waiting for Bike ID separate, nearest-start ordering, whole-row targets, chevrons, detail-owned decisions, and direct Booqable navigation are represented. |

## Qualitative Intent Deliberately Preserved

- **Bike quality, not checklist completion.** The spine foregrounds physical-bike identity, current intent, independent attestation, durable modifications, and authoritative confirmation rather than celebratory completion.
- **The tablet supports physical work.** Large forgiving controls, continuous visible groups, sticky lifecycle action, strong contrast, no hover dependency, no precision gestures, and restrained motion preserve the workbench intent.
- **Changed or dead work must be unmistakable.** Persistent top notices, changed group boundaries, stale-action rejection, and dominant terminal panels preserve the workshop's fear of mechanics continuing against invalid requirements.
- **Operational simplicity.** One Bike Task route and the ordinary Prep/Re-check path absorb reopened work; no separate changed-work pipeline, manager release gate, or auto-assignment was reintroduced.
- **Manager intervention stays exceptional.** Managers own the all-open queue, while mechanics see attention only in task context. Normal work and Done remain available except for the requester's same-mechanic Re-check restriction.
- **Current truth outranks historical context.** Current Booqable context stays visible; previous `extra_information` is secondary and on demand; Activity is evidence rather than a second control surface.
- **Return changes survive mutable Notes.** Separate Structured Modification cards remain visible and individually acknowledged through Return Check.
- **Literal, non-blaming language.** Lifecycle actions name their result; errors name the failed action and recovery; M2 does not approve or reject M1.

## Rejected Directions Deliberately Preserved

- Direction A's resume-first/My Work-dominant dashboard was rejected in favor of strict panel equality.
- Direction C's dense operational row dashboard was rejected in favor of repeated cards with balanced bike/phase/action weight.
- A mechanic-wide Needs Attention section was overridden; managers own the all-open queue.
- Compact attention badges were rejected as the primary treatment; the canonical pattern is a full-width labeled reason strip.
- Accordion checklist groups, hidden required context, horizontal carousels, and whole-tile outcome cycling remain prohibited.
- Manager queue Approve/Decline buttons, inline resolution notes, and mixed Open controls were rejected as clutter; rows now open detail.
- A permanent previous-information comparison pane was rejected; current text remains primary and previous text opens on demand.
- A separate workshop-console identity, dark palette, gradients, blur, hover lift, and decorative elevation were rejected in favor of the host Subframe system.
- Optimistic or queued-offline success, toast-only evidence, and generic completion copy remain rejected.

## Findings Identified and Resolved Before Finalization

1. **Read-only same-stock “last touched” lookup by `stock_identifier`.**
   - Finding: reconciliation found that the required FR-37 lookup had not yet been placed in the UX contract.
   - Resolution: `last-touched-summary` now defines the bounded read-only lookup in Bike Task context, distinguishes no result from load failure, and explicitly rejects a complete cross-rental history interpretation.
   - Final status: resolved before spine finalization.

2. **Complete FR-38 attention/history signal taxonomy.**
   - Finding: reconciliation found that the spine had concentrated on mechanic-raised manager-judgment reasons without explicitly placing the other two FR-38 signal families.
   - Resolution: Lifecycle & Attention Semantics plus `found-and-fixed-record` now distinguish system-raised Needs Attention, mechanic found-and-fixed history, and mechanic-raised Needs Attention without expanding the accepted mechanic reason list.
   - Final status: resolved before spine finalization.

3. **Promotion of accepted visual artifacts.**
   - Finding: reconciliation found that the spines' intended `mockups/` and `wireframes/` links did not yet have promoted files.
   - Resolution: accepted dashboard HTML files were promoted to `mockups/`, accepted IA/task-flow Excalidraw files were promoted to `wireframes/`, and all inline spine references resolve.
   - Final status: resolved before spine finalization.

## Deliberate or Non-load-bearing Drops

- **Notes as the authoritative return-change ledger** was dropped because the final PRD replaced it with durable, attributable Structured Modifications; Notes remain supplementary.
- **“Attention badge” wording in early wireframes** was dropped because later accepted dashboard work requires a loud full-width reason strip.
- **42px controls in the task-detail artifact** were dropped because the later accessibility decision sets a 48px minimum.
- **Dashboard greetings, date chips, browser chrome, sample sync labels, exact sample bike/order content, and decorative radial backgrounds** were not distilled because they are illustrative mock furniture, not accepted UX contracts.
- **Visible Booqable polling/synchronization theater after opening a Waiting for Bike ID row** was deliberately dropped; the row persists until authoritative synchronized data changes it.
- **My Work primacy, dense phase rows, queue-inline manager decisions, and always-visible previous information** were dropped because the user explicitly selected or overrode them.

## Final Coverage and Disposition

No material conflict exists between the accepted qualitative workshop direction, the final source package, the canonical spines, and the promoted artifacts. The same-stock lookup, FR-38 taxonomy, and artifact promotion were reconciliation findings that were closed before finalization.

No parent action is required. No material source-package, functional-coverage, or package-integrity gap remains open.
