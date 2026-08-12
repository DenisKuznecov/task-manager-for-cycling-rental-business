# Workshop Tasks PRD Review — Operational Usability and Paperless Tablet Adoption

## Verdict

**Not ready to authorize retirement of paper.** The PRD defines a credible happy path for per-bike preparation, selective independent re-check, changed work, and return checks. Its strongest operational choices are the persistent Bike Task, per-bike progression, first-writer-wins claiming, selective reopening, and explicit M1/M2 attribution.

However, five release-blocking gaps make the digital record unsafe as the workshop's only source of operational truth: some reserved-bike work can be omitted without becoming visible; return-relevant changes are stored in a mutable field that cannot support per-change acknowledgement; Needs Attention has no first-release discovery and ownership path; failed saves and transient connectivity have no usable recovery contract; and paper retirement has no predetermined pass/fail gate.

## End-to-End Mechanic Assessment

- **Discover:** Partial. Unassigned work is discoverable through Available Now, but omitted bikes, already-claimed work, and manager attention work are not guaranteed to be discoverable.
- **Claim:** Mostly defined for the initial claim. Concurrency is clear, but interruption, self-release, end-of-shift recovery, and claim resumption are missing.
- **Prepare:** The checklist model is workable, but physical-bike identity, stale-screen behavior, and tablet information density need stronger outcome requirements.
- **Hand off:** Required-item blocking and state transition are defined. The PRD does not explicitly require a server-confirmed handoff result that makes ownership transfer and safe navigation unmistakable.
- **Re-check:** The independent selective check is conceptually strong. Independence details and changed/reassigned-work context remain ambiguous.
- **Resolve and move on:** The intended journey says the next task is immediately available, but no FR guarantees a clear persisted completion boundary and return to actionable work.
- **Return work:** Not reliable enough for paperless use because one mutable Notes value cannot prove that every rental-specific change was retained and acknowledged.

## Critical Findings

### C1 — A reserved bike can be absent from the digital workflow without any in-product exception

**Evidence:** FR-1 says that if a bike lacks the required identifier, no Bike Task is created and the mechanic must ask a manager to correct Booqable. Section 7 explicitly excludes a missing-identifier status, alert, or remediation flow. SM-2 nevertheless requires no missing Bike Tasks.

**Operational impact:** The bike that most needs intervention is invisible in the workshop queue. Without paper or an independent order check, a mechanic cannot discover that work is missing. This directly prevents the system from becoming the sole operational record.

**Concise fix:** Require a first-release reconciliation exception that exposes every reserved order bike excluded from Bike Task creation, with the reason and responsible role. Remediation may remain in Booqable; the missing work itself must not be silent.

### C2 — Return acknowledgement cannot be trusted because return-relevant changes live in mutable latest-value Notes

**Evidence:** FR-34 defines one shared latest-value Notes field for M1 changes and M2 corrections. FR-42 blocks Return Check until the mechanic confirms that **every** rental-specific change described in Notes was addressed. FR-37 introduces Structured Modifications but does not make them the source for FR-42. FR-46 does not explicitly include Notes edits. The addendum's “Rejected or Deferred Alternatives” explicitly rejects timestamped Notes entries.

**Operational impact:** One mechanic can replace, summarize, or accidentally remove another mechanic's change description. Return staff cannot know whether the current text is a complete set, nor can the system prove which individual changes were acknowledged. Paper would remain the safer memory aid.

**Concise fix:** Make every return-relevant physical change a durable, attributable per-rental record and require acknowledgement per record during Return Check. Keep free-text Notes supplementary, or preserve revisions if Notes remain authoritative.

### C3 — Needs Attention is operationally orphaned and has contradictory completion semantics

**Evidence:** FR-38 says Needs Attention is non-blocking. FR-43 says resolving the flag at the “final post-check stage” transitions the Bike Task to Done, implying it can prevent final completion. Section 8.2 defers a manager Needs Attention filter and status counts until after first release, while FR-43 requires managers to resolve flags.

**Operational impact:** Mechanics can raise an exception and move on, but the PRD does not guarantee that anyone can discover, own, prioritize, or close the exception. It is also unclear whether the bike may become Done while attention remains open. Exceptions can disappear from day-to-day operation or leave tasks apparently stuck.

**Concise fix:** Define the exact lifecycle effect of an open flag at Prep, Re-check, and Return completion; require a first-release discoverable list of unresolved attention items with owner/responsible role and age; and define the terminal state when mechanical work is complete but manager action remains.

### C4 — The save-failure contract is too weak for paperless tablet operation

**Evidence:** NFR-4 only requires failures to be shown clearly. NFR-7 permits online-only operation and explicitly disclaims recovery of unsaved local changes. Section 6 merely assumes usable connectivity. SM-1 and SM-3 expect paperless completion.

**Operational impact:** During a Wi-Fi interruption, a mechanic may have several taps or a typed value whose persistence is uncertain. A generic error does not identify which outcomes were stored, preserve entered information, or provide a safe retry path. Repeating physical checks or remembering unsaved values becomes a paper substitute.

**Concise fix:** Define item/action-level persistence behavior: server-confirmed versus unsaved state must remain unambiguous; a failed save must identify the affected action; typed input must survive a retry while the task remains open; handoff/completion must use only confirmed outcomes; and reopening the task must show the authoritative persisted state. If this recovery is intentionally excluded, paper retirement must require a measured connectivity guarantee and an explicit downtime procedure.

### C5 — The rollout cannot make a defensible decision to retire paper

**Evidence:** SM-1 through SM-C3 use terms such as “routinely,” “materially,” and “cumbersome” without thresholds. Section 9 explicitly sets no numeric launch threshold. Section 10 calls for a “short” baseline and pilot, and Open Question 1 leaves pilot duration and evidence thresholds unresolved.

**Operational impact:** The team can declare success or failure subjectively, especially after observing only happy paths. The rollout does not establish how many bikes, mechanics, categories, devices, changed orders, save failures, returns, or exception cases must succeed before paper is withdrawn.

**Concise fix:** Before the pilot, define a paper-retirement gate with observation duration and sample coverage, required scenario coverage, maximum missed/incorrect work, completion-time tolerance versus baseline, unresolved sync/save incidents, mechanic adoption criteria, and rollback triggers. Open Question 1 should be resolved before—not during—the retirement decision.

## High Findings

### H1 — A mechanic is not guaranteed to find and resume already-claimed work

**Evidence:** FR-6 defines Available Now only as unassigned actionable Bike Tasks. FR-7 permits one claim at a time, and FR-8 defines assignment, but no requirement covers discovery of the current mechanic's In Prep, In Re-check, or In Return Check task after navigation, lock-screen interruption, sign-out, or a new shift.

**Operational impact:** Once a task leaves Available Now, the mechanic may need memory, browser history, or manager help to resume it.

**Concise fix:** Require every mechanic to be able to retrieve their current assigned work and resume at the authoritative unresolved point from any supported workshop device.

### H2 — Claimed work has no normal interruption or release rule

**Evidence:** FR-7 says mechanics claim one Bike Task at a time. FR-8 permits manager reassignment, and FR-5 permits a manager reset. No FR defines mechanic release, pause, end-of-shift transfer, or what happens when a claimed bike cannot be continued.

**Operational impact:** A routine interruption can block the mechanic from moving to another bike or make a manager a required gate, contrary to §2.2's goal that managers not gate normal flow.

**Concise fix:** Define a safe interruption/transfer policy, including who may release or transfer a claim, whether partial confirmed outcomes survive, and how the next mechanic is told what remains.

### H3 — One start-date queue does not define workable priority across Prep, Re-check, and Return

**Evidence:** FR-6 orders all unassigned actionable Bike Tasks by rental start date. FR-20 makes Re-check immediately actionable, and FR-39 makes returned bikes actionable. The lifecycle in FR-4 contains distinct operational phases, but no phase-aware priority rule exists.

**Operational impact:** A returned bike has a past rental start and may dominate preparation work; an urgent Re-check needed to release a bike may be buried among Prep tasks. Mechanics cannot reliably infer what to do next without workshop coordination outside the system.

**Concise fix:** Define the operational priority rules when multiple phases are actionable, including how rental start/return timing and an awaiting handoff affect ordering. Require each queue entry to make its phase and time basis unambiguous; do not prescribe a visual layout.

### H4 — External changes can leave an open tablet acting on stale ownership or lifecycle state

**Evidence:** FR-28 through FR-30 change assignment and stage while work may be active. FR-8 permits reassignment and FR-5 permits reset. NFR-3 covers synchronization convergence, while NFR-4 only says failures are visible. No behavior is defined for a stale task already open on a tablet.

**Operational impact:** M2 may continue checking after a Booqable change returned the task to Prep, or a former assignee may save after reassignment/reset. Audit attribution and physical-work instructions can diverge.

**Concise fix:** Require active tasks to surface ownership/lifecycle invalidation promptly, reject stale saves and transitions, explain the new authoritative state, and preserve unsent input long enough for the mechanic to understand or retry appropriately.

### H5 — Ambiguous Booqable changes reopen work without enough information to perform it

**Evidence:** FR-26 allows an ambiguous relevant change to invalidate a broad “Review updated bike configuration” confirmation. FR-15 requires prior/current values only for linked Setup Categories. FR-33 highlights changed Items, but does not define the context available for the broad confirmation.

**Operational impact:** The mechanic may know that “something changed” but not what must be physically compared. Resolving a generic confirmation can become guesswork, a manager conversation, or a return to Booqable.

**Concise fix:** Require broad-review work to state the known changed source, affected scope, current authoritative configuration, prior accepted configuration when available, and why selective classification failed.

### H6 — Physical-bike identity is an internal association, not an operational verification requirement

**Evidence:** FR-2 requires association with `stock_identifier`, but no FR requires the mechanic to see and verify the physical-bike identity at claim, task execution, handoff, or return.

**Operational impact:** A perfectly completed checklist can be attributed to the wrong bike, particularly when several bikes from one order are prepared in parallel under FR-7.

**Concise fix:** Require the actionable task to identify the physical bike unambiguously and require identity confirmation before recording work against it. The PRD need not prescribe barcode, camera, or layout.

### H7 — Reassignment preserves data but does not guarantee that the receiving mechanic understands it

**Evidence:** FR-8 preserves resolved Item outcomes and attribution. FR-10 changes M1/M2 identity by Work Cycle. FR-46 preserves audit history. No requirement states what current-work context a reassigned mechanic receives.

**Operational impact:** The receiving mechanic may not know which work is current, which outcomes came from a previous assignee, why ownership changed, or which Items were reopened versus merely incomplete. A raw audit history is not a safe working instruction.

**Concise fix:** Require the resumed task to distinguish current unresolved work, confirmed outcomes retained from prior ownership, invalidated outcomes, current-cycle M1/M2 identities, and the reason for any reset or reassignment that changed what must be done.

### H8 — Tablet focus and information-density goals are not testable

**Evidence:** FR-14 keeps every admin-authored Item visible, including `No` categories. FR-15, FR-19, FR-35, FR-37, and FR-38 add current/prior values, extra information, accessory context, modifications, Notes, and attention state. NFR-1 only says tap-friendly and readable; SM-C3 only says mechanics must not find the workflow cumbersome or distracting. Open Question 5 leaves the `No` behavior to the pilot.

**Operational impact:** All required information can be technically present while the mechanic still scrolls, hunts, loses their place, or makes accidental taps. This is a primary tablet-adoption risk and can drive mechanics back to a compact paper checklist.

**Concise fix:** Add outcome-based tablet acceptance criteria: mechanics must identify the next required physical action and current target configuration without searching elsewhere; interruptions must not lose checklist position or confirmed state; non-applicable/context information must not obscure required work; and pilot observation must measure navigation effort, accidental actions, and attention shifts as well as subjective comfort.

## Medium Findings

### M1 — Handoff, completion, and “move on” lack an explicit persisted boundary

**Evidence:** FR-18 blocks incomplete handoff and FR-20 transitions to Re-check. UJ-1 says the next actionable Bike Task is immediately available. NFR-4 forbids presenting failed transitions as successful, but no FR states what the mechanic must know after a successful handoff, Preparation Resolution, or Return completion.

**Operational impact:** Double taps, uncertain completion, or navigating away before confirmation can leave unclear ownership and repeated work.

**Concise fix:** Require each handoff/completion to return a definitive server-confirmed result, make the resulting lifecycle/ownership clear, and provide an immediate path back to actionable work.

### M2 — The boundaries of independent Re-check are ambiguous

**Evidence:** FR-21 requires M2 to independently resolve each applicable Re-check Item. FR-23 rejects approve/reject semantics, while FR-24 intentionally shows M1's target value for Value Items. FR-18 allows optional Prep Items to remain unresolved, but the PRD does not say how an optional M1/M2 Item behaves in Re-check or whether M1 Action outcomes are exposed before M2 attests.

**Operational impact:** Implementations can unintentionally bias M2, pre-satisfy a check from M1's outcome, or disagree on whether optional Items block Preparation Resolution.

**Concise fix:** Define which prior values/outcomes M2 may see, prohibit M1 outcomes from satisfying M2 work, and specify applicability/completion rules for optional M2-enabled Items.

### M3 — Exceptional manager actions preserve who/when but not why

**Evidence:** FR-5 permits reset, FR-44 permits force-close, and FR-45 explicitly says a written two-person override reason is not required. FR-46 records actor and time but does not require rationale.

**Operational impact:** Later staff can see that an exception happened but cannot understand whether it was legitimate, what physical work remained, or whether a recurring workshop constraint exists.

**Concise fix:** Require a concise reason for reset, force-close, and two-person override; require reassignment reason when it changes or abandons active work.

### M4 — Changed-work context may disappear after the mechanic resolves it

**Evidence:** FR-15 retains the prior value only until affected work is resolved. FR-33 clears the changed highlight on resolution. FR-46 does not explicitly list configuration-change/invalidation events, although NFR-5 requires trustworthy history after reopening.

**Operational impact:** A later return mechanic or manager may see an extra Work Cycle without being able to understand what changed, which Items were invalidated, or why repeated work was necessary.

**Concise fix:** Preserve an attributable system history entry for each relevant Booqable change, including prior/current values when known, affected Items, invalidation time, and resulting Work Cycle.

## Low Findings

### L1 — FR-25 points to the wrong override requirement

**Evidence:** FR-25 refers to the per-task override “defined in FR-39,” but FR-39 is Return Check triggering. The override is FR-45.

**Concise fix:** Change the cross-reference to FR-45.

### L2 — Two terms are underspecified

**Evidence:** FR-43 uses “final post-check stage,” which is not in the glossary or FR-4 lifecycle. FR-12 says each Bike Task receives “a Checklist Snapshot,” while FR-11 defines separate Prep and Return templates.

**Operational impact:** Teams may implement different completion semantics or disagree about which Return template version applies to a long-running rental.

**Concise fix:** Replace “final post-check stage” with an explicit lifecycle state and state separately when Prep and Return snapshots are selected.

## Minimum Paper-Retirement Gate

Paper should not be retired until all Critical findings are resolved and a controlled pilot demonstrates, at minimum:

- complete Prep/Re-check and Return journeys across every supported bike category and workshop role;
- successful interruption, reassignment, reset, cancellation, replacement, selective change, ambiguous change, attention, and failed-save scenarios;
- zero digitally invisible reserved bikes and zero false-success saves or transitions;
- every return-relevant modification durably present and individually accountable at Return Check;
- completion time and quality within predetermined tolerance of the paper baseline;
- mechanics can resume current work and identify the next required action without Booqable, paper, or manager memory;
- an agreed observation window with representative mechanics, tablets, and network conditions; and
- explicit rollback criteria if missed work, sync ambiguity, or paper workarounds recur.

## Severity Counts

- Critical: 5
- High: 8
- Medium: 4
- Low: 2
- Total: 19
