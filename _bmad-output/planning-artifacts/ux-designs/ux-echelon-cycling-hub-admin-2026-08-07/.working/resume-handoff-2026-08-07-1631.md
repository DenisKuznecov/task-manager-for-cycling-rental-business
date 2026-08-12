# Workshop Tasks UX — Continuation Handoff

Resume `/bmad-ux` in **Create mode**. The user initially chose Coaching, then asked
whether the agent could finish autonomously, but paused before headless Finalize to
move into another agent window.

Canonical workspace:
`_bmad-output/planning-artifacts/ux-designs/ux-echelon-cycling-hub-admin-2026-08-07/`

The append-only `.memlog.md` is authoritative. Read it fully on resume. This file
summarizes the current edge only.

## Current stage

- Discovery is nearly complete.
- Accepted IA and task-execution flow wireframes remain valid.
- Visual identity inherits the existing Subframe admin hub.
- Mechanic dashboard, mechanic task detail, and manager dashboard were refined
  collaboratively and provisionally accepted ("more or less fine/about right").
- `DESIGN.md` and `EXPERIENCE.md` are still draft frontmatter stubs.
- Finalize has **not** started. No reviewer gate was run.

## Product and environment

- Internal daily workshop operations; missed/stale work can affect bike readiness.
- Responsive web inside the existing admin hub.
- Mechanics use stand-mounted tablets in landscape or portrait, with dirty/greasy
  hands, occasional gloves, and glare.
- Manager/admin work supports tablet and desktop.
- Use oversized forgiving targets, strong non-color-only states, no hover dependency,
  and no precision gestures.
- Lifecycle terminology: **Prep → Re-check → Preparation Resolved**.

## Mechanic dashboard baseline

Artifact:
`.working/refine-mechanic-dashboard-2026-08-07.html`

Decisions:

- Direction B retained: **My Work** and **Available Now** are strictly equal panels
  in landscape, even when Egor has assigned work.
- Portrait stacks My Work before Available Now.
- Bike name, phase, and primary action receive similar visual weight on each card.
- Attention uses a loud full-width strip with the reason, not a compact badge.
- Task summary includes bike, order, client, rental dates, phase, assignee, and
  attention when relevant.
- User provisionally accepted the refinement; minor Finalize polish is allowed.

## Mechanic task-detail baseline

Artifact:
`.working/refine-mechanic-task-detail-2026-08-07.html`

Decisions:

- Changes and notifications span the top before working content.
- Landscape is split:
  - narrower order/bike information side;
  - wider checklist side.
- Information side contains order, bike, customer, delivery address, rental dates,
  setup values, accessories, and current `extra_information`.
- Portrait/narrow layout places changes first, then order/bike information, then
  checklist.
- Current `extra_information` remains visible. Previous text is useful but secondary
  and opens in a small overlay/drawer.
- Setup Categories whose value is `No` have the same visual prominence as selected
  values; linked Items remain visible and relevant Action Items may resolve N/A.
- Checklist groups remain continuously visible (no accordions), with two columns
  where width supports them.
- Sticky progress/lifecycle bar remains visible.
- User accepted this as "about right."

Existing task-execution decisions still apply:

- Action Items have separate large Done and N/A targets.
- Outcomes save immediately with Saving → Saved or item-specific Retry.
- Value Items auto-save after about two idle seconds; blur/Enter/leave/handoff flush.
- Failed saves retain typed values.
- Handoff/Complete remains visible before completion; activating it jumps to the
  first unresolved required Item.
- Completed work opens a short confirmation panel naming the resulting phase.
- Persistent Booqable changes remain emphasized until affected work is resolved.
- Replaced tasks become unmistakably read-only and return Egor to the queue.
- Return Check keeps each Structured Modification visible and individually
  acknowledged.

## Manager dashboard baseline

Artifact:
`.working/refine-manager-dashboard-2026-08-07.html`

Priority and sorting:

1. Needs Attention
2. Waiting for Bike ID (separate queue)

- Needs Attention is ordered by nearest rental start first.
- The first manager mock was rejected as cluttered because it mixed Approve,
  Decline, Resolve, inline notes, View details, and Booqable buttons in one list.
- Latest accepted direction is scan-first:
  - every row is entirely clickable;
  - one consistent row anatomy with chevron;
  - no inline action buttons or note fields.
- Needs Attention rows open the task/attention detail.
- Waiting for Bike ID rows open the corresponding Booqable order.
- Do not show a visible synchronization/polling state after opening Booqable; the row
  remains until synchronized data changes it.
- User said the simplified manager list is "more or less ok."

Manager attention-detail behavior:

- On opening an attention row, show the attention reason and resolution controls
  first at the top; full Bike Task information follows.
- Re-check override detail supports Approve/Decline and no written note.
- Missing/unclear information and Manager decision needed require a short resolution
  note.
- Prior decisions to expose inline queue actions were superseded by the simplified
  list decision. Actions now live only inside detail.

## Needs Attention contract

First-release mechanic-raised reasons:

1. Same-mechanic Re-check override request
2. Missing or unclear bike/order information
3. Manager decision needed

Behavior:

- Override request needs no mechanic explanation and no manager note.
- Missing/unclear information and Manager decision needed require a short mechanic
  explanation and a short manager resolution note.
- Same-mechanic Re-check remains unavailable to the requester until approval;
  another eligible mechanic may claim it.
- Other attention reasons remain non-blocking but prominently visible.
- Managers own the all-open attention queue; mechanics only see attention in context.

## Visual foundation

Inherit the current Subframe admin system:

- Brand amber `#D97706`
- White/slate surfaces
- Geist typography
- Teal success, red error
- 4/8/12px radii
- Subtle shadows

Extend only for workshop-sized controls, stronger hierarchy, glare resistance, and
high-risk state emphasis. Do not create a separate workshop-console identity.

## Accepted/supporting artifacts

- `.working/source-extract-ux.md` — confirmed PRD package extract
- `.working/ia-2026-08-07.excalidraw` — accepted IA
- `.working/flow-task-execution-2026-08-07.excalidraw` — accepted task flow
- `.working/directions-dashboard-1.html` — hierarchy directions; B selected
- `.working/refine-mechanic-dashboard-2026-08-07.html` — provisional dashboard
- `.working/refine-mechanic-task-detail-2026-08-07.html` — provisional task detail
- `.working/refine-manager-dashboard-2026-08-07.html` — simplified manager list

The older `.working/resume-handoff.md` is historical and predates these refinements.

## Remaining Discovery decisions

Complete autonomously if the user confirms headless completion:

1. **Checklist-template admin**
   - Separate versioned Prep and Return templates for e-city, e-road, road, gravel,
     and MTB.
   - Must support create, activate, supersede, and reactivate.
   - Existing tasks use immutable snapshots; template changes affect future
     snapshots only.
   - Choose a low-risk IA assumption and mark it `[ASSUMPTION]` if not confirmed.
2. **Audit/history**
   - Read-only attribution for claims, assignments, outcomes, handoffs,
     modifications, attention, overrides, resets, lifecycle changes, and
     invalidations.
   - Keep current-work context distinct from full history.
3. **Voice and tone**
   - Operational, short, literal, non-celebratory.
   - Explicit phase/result language and concrete recovery text.
4. **Concern scan**
   - Accessibility floor, motion, i18n, dark mode, offline, notifications.
   - Known inputs: WCAG-minded high contrast/touch; no offline support in v1;
     persistent in-context change emphasis rather than reliance on transient
     notifications.
5. **IA closure**
   - Verify every surface supports UJ-1 through UJ-4.

## Finalize still required

Follow the BMad UX Finalize sequence:

1. Distill `.memlog.md`, sources, and working artifacts into complete `DESIGN.md`
   and `EXPERIENCE.md`.
2. Run proactive rubric Pass 1 coverage checks while drafting.
3. Reconcile source inputs and surface anything dropped.
4. Reviewer Gate:
   - interactive: offer validation lenses;
   - headless: do not ask; only run reviewers if the headless instructions/caller
     require them.
5. Triage assumptions/open questions.
6. Confirm mock coverage across all IA surfaces.
7. Promote lasting artifacts:
   - mechanic dashboard → `mockups/`
   - mechanic task detail → `mockups/`
   - manager dashboard → `mockups/`
   - accepted IA/task-flow Excalidraw → `wireframes/`
8. Link promoted artifacts inline in both spines and state once that spines win on
   conflict.
9. Apply structural and prose polish.
10. Set both spines to `status: final`, update date, and append the finalization event
    to `.memlog.md`.

Common next steps after UX: `bmad-architecture`,
`bmad-create-epics-and-stories`, then `bmad-dev-story`.
