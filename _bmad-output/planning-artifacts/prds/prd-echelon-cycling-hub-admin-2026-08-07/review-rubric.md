# PRD Quality Review — Workshop Tasks

## Overall verdict
This is a coherent, substantive PRD with a specific quality thesis, explicit scope boundaries, and decision rationale that should transfer well into UX and architecture. It is not yet implementation-ready: release-defining integration branches, return-change evidence, manager exception transitions, and pilot exit criteria are underspecified, so teams could build internally consistent but materially different products from the same requirements.

## Decision-readiness — adequate
The PRD states consequential decisions directly: Booqable remains authoritative, work starts at reservation, checklist Items stay visible, changed work reuses the normal cycle, and M2 attests independently. The addendum strengthens those decisions by naming rejected alternatives and what was given up.

The remaining risk is concentrated rather than pervasive. Two unresolved Booqable capabilities determine whether central first-release behaviors are feasible, yet the document does not identify the decision path if discovery disproves them.

### Findings
- **high** Feasibility dependencies have no decision gates (§6; §11, Questions 2–3; addendum §Integration Assumptions Requiring Technical Discovery) — The PRD depends on Setup Categories being “distinguished reliably enough” and bundled parent linkage being stable, then says these questions “do not block architecture.” They may not block all architecture, but they do block committing to selective invalidation and bike-specific accessory context as specified. *Fix:* Define discovery acceptance evidence, owner and deadline for each dependency, plus the fallback scope or explicit no-go decision if either assumption fails.

## Substance over theater — strong
The content is earned by the workshop domain rather than filled from a template. The vision’s assertion that “The product’s outcome is bike quality, not checklist completion” drives independent Re-check, attributable outcomes, visible Booqable changes, and paper-retirement caution. Each human role changes product behavior, the NFRs are mostly domain-facing, and the addendum explains why plausible alternatives were rejected rather than claiming generic innovation.

## Strategic coherence — adequate
The product has a clear thesis: replace paper without weakening physical-bike quality or obscuring responsibility. The feature set follows that thesis, and the primary metrics plus speed, quality, and focus counter-metrics test the intended outcome rather than mere usage.

The strategy loses decisiveness at rollout. It explicitly defers the evidence standard that determines whether its main outcome has been achieved.

### Findings
- **high** Paper-retirement success is not decidable (§9, SM-1 and SM-C1–SM-C3; §10; §11, Question 1) — Terms such as “routinely,” “must not materially slow,” and “must not experience … as cumbersome” have no measurement method or pass boundary, while the PRD says “No arbitrary numeric launch threshold is set” and leaves the retirement threshold open. That prevents a consistent go/no-go decision and invites post-hoc interpretation. *Fix:* Define the pilot window and sample, paper baseline measures, observable defect and completion measures, mechanic-feedback instrument, and explicit retirement/extension criteria; use evidence-based ranges if exact targets require baseline data.

## Done-ness clarity — thin
Many FRs are crisp behavioral invariants, especially identity, concurrency, ownership, and selective reopening state changes. However, several requirements at the center of synchronization, return quality, templates, and manager intervention lack enough consequences to distinguish correct from incorrect implementations. The NFR section also relies on adjectives where UX and QA need bounds.

### Findings
- **high** Update classification has no testable boundary (§4.5, FR-26 and FR-32) — “recognized relevant change,” “relevant but ambiguous change,” “non-workshop-relevant change,” and “after customer pickup” determine whether work silently refreshes or reopens, but no source fields, status mapping, precedence, or examples define those classes. *Fix:* Add a decision table mapping supported Booqable changes and lifecycle statuses to refresh, targeted invalidation, broad review, or no action, including multi-change and out-of-order cases.
- **high** Return acknowledgement exceeds the retained evidence (§4.6, FR-34 and FR-37; §4.7, FR-42; §7) — FR-34 stores “one shared Notes field containing its latest value,” Notes revision history is a non-goal, yet FR-42 requires confirmation that “every rental-specific change described in Notes has been addressed.” Edits can erase or merge changes, and FR-42 does not say whether Structured Modifications are acknowledgement units. *Fix:* Define a persistent set of return-relevant change records and per-record acknowledgement semantics, or narrow FR-42 explicitly to one acknowledgement of the final Notes value and state how Structured Modifications participate.
- **medium** Return template version is ambiguous (§4.3, FR-11–FR-12; §4.7, FR-39) — Prep and Return templates are separate, but each Bike Task receives “a Checklist Snapshot at creation” while the Return Checklist becomes actionable much later. The PRD does not say whether both templates are snapshotted at reservation or the Return template is selected at return. *Fix:* Specify the snapshot count and selection time for each phase, including behavior when category or active template changes before return.
- **medium** Manager interventions lack transition semantics (§4.1, FR-5; §4.8, FR-43–FR-44) — “reset stale workshop work,” “final post-check stage,” and “genuinely stuck or abandoned” do not define eligibility, target lifecycle state, assignment handling, which Item outcomes survive, or whether force-close means Done or a distinct terminal outcome. *Fix:* Add a manager-action transition matrix covering preconditions, resulting state, data preserved/invalidated, audit event, and user-visible label.
- **medium** Product NFRs are not bounded (§5, NFR-1, NFR-2, NFR-4, and NFR-5) — “practical,” “tap-friendly,” “readable,” failures shown “clearly,” and history remaining “trustworthy” cannot serve as acceptance criteria. *Fix:* Add minimum supported viewport/input conditions, save/transition feedback behavior and timing, synchronization freshness or recovery expectations, and explicit audit invariants.

## Scope honesty — adequate
The PRD is candid about non-goals, trial behaviors, deferred reporting, online-only operation, and known Booqable uncertainty. The four tagged assumptions round-trip into the Assumptions Index, and the addendum preserves rejected and deferred alternatives.

The assumption inventory is nevertheless incomplete across the two documents, which weakens its usefulness as a discovery checklist.

### Findings
- **medium** Addendum assumptions are outside the Assumptions Index (§12; addendum §Booqable synchronization) — The addendum says draft/new/concept orders are “believed to be filtered” and that selective reopening depends on a “prior accepted workshop configuration,” but neither is tagged or indexed. These assumptions shape FR-1 and FR-26–FR-33 just as directly as the four indexed assumptions. *Fix:* Tag and index every release-shaping technical assumption from both documents, with the affected FRs and validation status.

## Downstream usability — adequate
The glossary is domain-specific, FR/UJ/SM IDs are stable and contiguous, feature descriptions map to user journeys, and most requirements make sense when extracted. This gives UX, architecture, and story creation a strong source structure, though one broken reference and two traceability gaps should be corrected before automated sharding.

### Findings
- **medium** Two-person override cross-reference resolves to the wrong behavior (§4.4, FR-25) — FR-25 says the override is “defined in FR-39,” but FR-39 triggers Return Check; the override is FR-45. A source-extraction workflow can therefore attach the wrong requirement. *Fix:* Change the FR-25 reference to FR-45 and re-run cross-reference validation.
- **medium** FR-34 through FR-38 lack explicit success-metric traceability (§4.6; §9) — These requirements cover Notes, accessory context, flat-order ambiguity, Structured Modifications, and attention distinctions, but no SM “Validates” range includes FR-34–FR-38. *Fix:* Extend the appropriate SM mappings or add a focused observable outcome for rental context and exception handling.
- **low** UJ-2 has no operational protagonist (§2.3, UJ-2) — It begins with “A workshop-relevant update” and makes “Workshop Tasks” the actor, so it does not carry the affected M1, M2, or queue user’s context when extracted as a journey. *Fix:* Name the mechanic or manager who encounters the update and describe the observable interruption, recovery, and completion path.

## Shape fit — strong
The capability-spec shape fits a brownfield internal tool with several workshop roles and meaningful tablet UX. Four compact operational flows provide enough human context without manufacturing persona-heavy journeys, while stable FRs support the stated UX → architecture → implementation chain. Keeping technical representation choices and rejected models in the addendum also preserves the correct boundary between product behavior and architecture.

## Mechanical notes
FR-1 through FR-46, UJ-1 through UJ-4, SM-1 through SM-4, and SM-C1 through SM-C3 are contiguous and unique. The four inline `[ASSUMPTION]` tags in §6 all round-trip to §12, but the untagged addendum assumptions noted above do not. Terminology is largely consistent; “final post-check stage” in FR-43 is not a defined lifecycle or Glossary term. The material cross-reference defect is FR-25 → FR-39, which should resolve to FR-45.
