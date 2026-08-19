# PRD Quality Review — Workshop Tasks

## Overall verdict
The 2026-08-18 compression holds up. The PRD now has a single operating thesis, named trade-offs, and an MVP boundary a three-person shop can actually run. Decision-readiness, substance, coherence, scope honesty, and shape are the strengths. What is at risk is not the product thesis but a handful of behaviors story-writing will otherwise invent: what “reconfirm” is as an action, how Needs Attention gets raised, whether Notes is a capability, and the unstated claim-phase transitions.

## Decision-readiness — strong
A decision-maker can act. The revision “replaces the prior 48-requirement autonomous-reconciliation plan with a compressed MVP for one three-person workshop” (§0) and states the operating rule in one sentence: create work only after an exact assigned stock ID; run Prep, independent M2, and Return on that Bike Task; reconfirm only during active M1 Prep; let managers resolve exceptions without gating ordinary completion (Vision §1; addendum “Current product rule”).

Trade-offs are named as give-ups, not balances. §5 lists the rejected machinery in product language — “provisional or quantity-derived Bike Tasks,” “replacement-chain algebra,” “JIT freshness proofs,” “same-mechanic M2 override,” “Structured Modifications.” The addendum’s Accepted Model Rationale says what each rejection protects (do not duplicate the manager’s Booqable job; do not collapse M2 quality in a shop that can usually find a second pair of hands; stale information costs a walk to the rack except while M1 is mid-checklist). Open Questions are actually open, and none are disguised answers: Q2 even offers an explicit default rather than pretending the list is known.

No `[NOTE FOR PM]` callouts appear. That is not a defect here — the three Open Questions and the addendum’s UX Topics Left Open already sit on the remaining tensions.

## Substance over theater — strong
Almost nothing is furniture. The Vision sentence “The product’s outcome is bike quality, not checklist completion” is not a slogan: it produces hard M2 ≠ M1 with “no override” (FR-13), attestation rather than proof (Vision §1), and Needs Attention that “is not a Task Outcome” (Glossary). Those four human roles plus Booqable as a system actor each change behavior; none exist to look thorough.

There is no innovation theater. The product “digitizes the mechanics’ paper workflow” inside “the existing admin hub.” NFRs are workshop-specific (tablet, confirmed saves, online-only) rather than scalable/secure/reliable boilerplate. NFR-1’s “practical” / “tap-friendly” are adjectives, but they point at a real shop constraint already owned by SM-C1–SM-C3 and NFR-3, not copied from a template.

## Strategic coherence — strong
The thesis is one arc: Booqable assigns the physical bike; Workshop Tasks makes preparation, independent re-check, and return visible and attributable; the digital record is an attestation, not a proof. Features follow that order — templates (shipped), create-from-assignment, queue/claim, M1 handoff, M2, In-Prep reconfirm only, manager exceptions, Return reuse, history/refresh — rather than a leftover backlog with headings.

Success Metrics test the thesis, not activity. SM-1 and SM-3 ask whether paper can leave the rack; SM-2 asks whether work exists only for an assigned bike; SM-4 asks whether staff can answer who did what. Counter-metrics SM-C1–SM-C3 (speed, quality, mechanic focus) are the right watches for a quality-not-completion product. They are qualitative (“must not materially slow,” “must not increase missed required checks”); for one shop that is an operating observation, not a missing launch gate. §6.2 correctly keeps paper retirement as “an operating practice… not a product feature,” so the old go/no-go hole is closed.

MVP kind is problem-solving for the current workshop. Scope logic matches: shipped Epic 1 stays; autonomous reconciliation and franchise controls go.

## Done-ness clarity — adequate
The load-bearing FRs are testable. FR-4/FR-5/FR-6 give create/no-create/cancel/replace invariants with concrete consequences (“A reserved order with no assigned StockItem creates no Bike Task”; untagged or conflicting Workshop tags create none; `Cancelled` / `Replaced` do not auto-reopen). FR-12/FR-13/FR-14 pin handoff and M2: server-confirmed required outcomes, “There is no same-mechanic override,” M2 attests a Value Item and “does not enter a second value.” FR-18/FR-19 make Return claimable only for Actionable tasks, skip M2, and close `Done` without per-item acknowledgement. NFR-3 and NFR-7 give save-failure and online-only bounds that most internal-tool PRDs skip.

The gaps are clustered, not pervasive. Four behaviors still lack a consequence an engineer could fail a story against.

### Findings
- **medium** “Reconfirm” is a flag plus a verb, not an action (§4.6, FR-15; §5; addendum Retired FR Map) — FR-15 blocks handoff until M1 “reviews current Booqable context and reconfirms the affected preparation,” and the flag must be “visible on the open Bike Task.” §5 forbids “selectively invalidate individual Items,” and the addendum retired “built-in confirmation / broad review Item” as an engine. Those exclusions rule out the dangerous readings but do not say what the successful one is: an explicit acknowledge control, a requirement to re-save affected Items, or review-only with handoff re-enabled. Open Question 2 names which fields are “relevant,” not what reconfirm does. *Fix:* Add one consequence that names the reconfirm action, what it persists, and that it does not rewrite or invalidate Item outcomes.

- **medium** Needs Attention has reasons but no raise capability (§4.7, FR-16) — FR-16 specifies manager visibility and two “Mechanic-raised reasons” (`missing_or_unclear_bike_order_information`, `manager_decision_needed`) and says raising “does not change Task Outcome by itself.” No FR gives a mechanic (or anyone) the action that sets the flag. UJ-4 starts from a task that “sits assigned,” not from a mechanic raising attention. *Fix:* Add a testable raise/clear action (who, from which phases, required reason) or drop “Mechanic-raised” and say only managers create attention rows.

- **medium** FR-9 has no testable consequences (§4.3, FR-9) — The body says each Bike Task “is claimed and progressed on its own” and bikes on the same order “may be prepared in parallel.” That is the only FR without a Consequences block. Parallelism is implied by FR-8’s per-task claim, but an engineer cannot fail a story against “independently actionable” without a stated anti-case (claiming `RD-14` must not lock a sibling bike; order-level completion must not be required). *Fix:* Add two consequences: same-order bikes remain separately claimable; progressing one Bike Task never changes another Bike Task’s Work Phase or Task Outcome.

- **medium** Claim transitions are specified for Prep only (§4.3, FR-8; Glossary Work Phase) — FR-8’s only phase consequence is “Claiming a Bike Task in `Needs Prep` moves Work Phase to `In Prep`.” Available Now also includes `Needs Re-check` and `Needs Return Check` (FR-7, FR-13, FR-18). The Glossary lists `In Re-check` and `In Return Check`, but nothing states that those claims produce those phases, or that first-writer-wins applies there the same way. *Fix:* Extend FR-8 consequences to all three claimable phases, or point each later FR at the same first-writer-wins + phase-move rule.

## Scope honesty — strong
Omissions do real work. §5 is a specific kill-list, not a gesture, and §6.2 says “Everything in §5.” The 2026-08-18 de-scope is explicit in §0 and the addendum Retired FR Map, so downstream cannot silently keep old FR-1 provisional identity or FR-26–FR-33 invalidation. Four `[ASSUMPTION]` tags in §9 round-trip to §11. Open-item density (3 questions, 4 assumptions, 0 `[NOTE FOR PM]`) is right for internal stakes; the PRD says none of the questions “block architecture or the next epic rewrite.”

One owned concept is still easy to infer into existence.

### Findings
- **medium** Notes is owned and defined, but not required (§3 Glossary; §5; §9) — Glossary defines Notes as “One shared, latest-value free-text field.” §9 says Workshop Tasks owns Notes. §5 only excludes “maintain Notes revision history.” No FR creates, edits, or shows Notes. FR-10 shows Booqable `extra_information`, which is a different field. Story writers will either invent a Notes editor or treat the term as dead. *Fix:* Give Notes a single FR (who edits, where it displays, latest-value overwrite) or move it to Non-Goals and remove it from §9 ownership.

## Downstream usability — adequate
This PRD is chain-top: §0 says it is for “product, UX, architecture, and implementation planning.” That bar is mostly met. Glossary terms are used as IDs in FRs (Bike Task, Prep Snapshot, Task Outcome, Work Phase, Available Now). FR-1–FR-21, UJ-1–UJ-4, SM-1–SM-4, SM-C1–SM-C3, and NFR-1–NFR-7 are contiguous and unique. The addendum Retired FR Map tells architecture and epics to stop targeting the old 48 IDs. UJ-1–UJ-3 carry named protagonists (Marc, Inés, Tomás) and the moments that matter.

Pulled out alone, FR-9 is weak (see Done-ness) and Notes has no source FR. Those are the extraction risks, not ID chaos.

### Findings
- **low** UJ-4 has no named protagonist (§2.3, UJ-4) — “A manager clears a stuck bike” is the only journey without a person carrying role context inline. The other three journeys name mechanics. *Fix:* Name the manager (as Marc/Inés/Tomás are named) and keep the intervention, audit, and “ordinary completion does not wait” beats.

## Shape fit — strong
The shape matches the product. This is an internal single-shop tool; the PRD is a capability spec with operational success metrics, not a consumer journey catalog. Four short UJs are load-bearing (they are what the feature groups “realize”) without becoming overhead. Brownfield references are specific and accurate to the approved correction: Epic 1 “is shipped,” live wiring is “a fetch-and-apply of current order authority,” “`sync.ts` stays untouched” (addendum). The previous 48-FR plan was the over-formalized shape; this revision is the fit.

## Mechanical notes
- Assumptions Index round-trips: four inline `[ASSUMPTION]` tags in §9, four index lines in §11. No orphans.
- ID continuity is clean after the rewrite (FR-1–FR-21 with no gaps). Old IDs are retired in the addendum, not left dangling in `prd.md`.
- Glossary drift is light: UJ-4 says “attention queue” for what the Glossary and FR-16 call Manager Attention List / Needs Attention; FR-5 says “ProductGroup Workshop bike tag” / “source category tag” for the same controlled tag set.
- Addendum mentions bundle tags (`workshop-*-bike-bundle`); `prd.md` FR-5 lists only the six ProductGroup bike tags. That is correctly parked as technical-how unless category selection from a bundle line is a product rule.
- No `[NOTE FOR PM]` or `[NON-GOAL for MVP]` inline tags; Non-Goals live as a section, which is enough.
- UJ-1–UJ-3 protagonists are named; UJ-4 is not (finding above).
