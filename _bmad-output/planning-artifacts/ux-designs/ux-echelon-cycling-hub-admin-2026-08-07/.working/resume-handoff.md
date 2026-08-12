# Workshop Tasks UX — Resume Handoff

Resume `/bmad-ux` in **Create / Coaching** mode.

Canonical workspace:
`_bmad-output/planning-artifacts/ux-designs/ux-echelon-cycling-hub-admin-2026-08-07/`

The append-only `.memlog.md` is authoritative. Earlier entries about a mechanic-wide
Needs Attention section and “Phase 2 / Ready” terminology were superseded later in
the log.

## Current stage

- Discovery and core interaction design are in progress.
- IA and task-execution flow wireframes were accepted.
- Visual identity inherits the existing Subframe admin hub.
- Dashboard information hierarchy direction **B** was selected: balanced My Work
  and Available Now sections in landscape, stacked responsively in portrait.
- `DESIGN.md` and `EXPERIENCE.md` remain draft frontmatter stubs; do not treat them
  as distilled yet.

## Product and working context

- Internal daily operations; errors can affect bike readiness and rentals.
- Responsive web feature inside the existing admin hub.
- Workshop mechanics use a stand-mounted tablet in portrait or landscape; phone is
  supported, manager/admin work also supports desktop.
- Confirmed workshop conditions: dirty/greasy hands, gloves, and screen glare.
- Use oversized forgiving tap targets, high non-color-only contrast, no hover
  dependency, and no precision gestures.
- Use PRD terminology: Prep → Re-check → Preparation Resolved.

## Main journeys and protagonists

- **Egor, mechanic:** opens Workshop Tasks, claims a Bike Task, completes Prep,
  hands off to Re-check, then takes the next task. He can also claim Re-check and
  Return Check work.
- Climax beats: successful Prep handoff; Re-check completion into Preparation
  Resolved; Return Check completion into Done.
- **Dima, manager:** prioritizes manager work, diagnoses why intervention is needed,
  corrects Booqable data or resolves/approves a request.
- Critical failure to prevent: a temporary physical change such as a replacement
  seat tube is not recorded and therefore is not reversed after rental.

## Dashboard contract

### Mechanic

- Simultaneously visible **My Work** and **Available Now** sections.
- No all-workshop Needs Attention queue.
- Attention appears as prominent context/badging on relevant task cards/details.
- Task summary shows bike name, order number, client name, rental dates, current
  phase, assignee, and attention label when relevant.

### Manager/admin

- **Waiting for Bike ID** is separate from Needs Attention. Dima must open Booqable,
  add the ID, and wait for synchronization; the task then becomes claimable.
- The all-open **Needs Attention** queue is prominent.

## Needs Attention contract

First-release mechanic-raised reasons:

1. Same-mechanic Re-check override request
2. Missing or unclear bike/order information
3. General “Manager decision needed”

Behavior:

- Override request needs no written explanation.
- Missing/unclear information and Manager decision needed require a short request
  explanation and a short manager resolution note.
- Override approval/decline needs no note because the outcome communicates it.
- Same-mechanic Re-check remains unavailable to the requester until Dima explicitly
  approves the per-task override; another eligible mechanic may still claim it.
- Other attention reasons leave the Bike Task workable but visibly flagged.
- Keep the lightweight request/resolution mechanism and manager approvals; do not
  reduce first release to happy-path-only verbal exception handling.

## Task execution contract

- Checklist groups stay in one continuous scroll, never accordion-hidden.
- Use two columns where tablet width supports it; responsive narrow layouts stack.
- Action Items use separate large **Done** and **N/A** tap targets.
- Outcomes save immediately and visibly transition Saving → Saved or Retry.
- Value Items auto-save after roughly two idle seconds; show Unsaved while waiting.
  Blur/Enter/leave/handoff flushes the save. Failures retain typed values.
- Sticky bottom bar keeps progress and Handoff/Complete visible.
- If required work remains, tapping Handoff/Complete jumps to and emphasizes the
  first unresolved required Item.
- When complete, Handoff/Complete opens a short confirmation panel naming the
  resulting phase; pending and server-confirmed outcomes remain unmistakable.

## Changes, terminal states, and Return Check

- Booqable changes use persistent—not transient—emphasis. When Egor next looks at
  the tablet, he sees what changed and which Items need fresh outcomes. Emphasis
  remains until affected work is resolved.
- A Replaced open task becomes unmistakably read-only and routes Egor to the main
  queue, not directly to the replacement task.
- Structured Modifications are separate records with free-form descriptions, actor,
  and time—not one combined text blob.
- During Return Check, each modification remains prominently visible alongside the
  checklist and is acknowledged individually before completion.

## Visual foundation

Inherit the current Subframe system:

- Brand amber (`#D97706`), white/slate surfaces, Geist typography
- Teal success, red error, 4/8/12px radii, subtle shadows
- Existing compact patterns may be enlarged/strengthened for workshop conditions
- Do not invent a separate “workshop console” identity

Selected hierarchy: **Direction B — balanced landscape sections** from
`.working/directions-dashboard-1.html`.

## Accepted and supporting artifacts

- `.working/source-extract-ux.md` — confirmed PRD/package source extract
- `.working/ia-2026-08-07.excalidraw` — accepted IA
- `.working/flow-task-execution-2026-08-07.excalidraw` — accepted tablet flow
- `.working/directions-dashboard-1.html` — hierarchy options; Direction B selected

## Recommended next steps

1. Refine visual hierarchy from Direction B and render a representative dashboard /
   task-detail key screen within the inherited Subframe identity.
2. Finish remaining open UX topics:
   - previous `extra_information` progressive disclosure;
   - always-visible Setup Category value `No`;
   - manager dashboard and attention-detail hierarchy;
   - template-admin and audit/history behavior;
   - voice/tone and success/error/terminal microcopy;
   - accessibility floor, motion, i18n, dark mode, and notification expectations.
3. Recheck IA surface closure against all four PRD journeys.
4. When Discovery is complete, run the BMad UX Finalize sequence: distill both
   spines, reconcile inputs, offer reviewer lenses, triage assumptions/open items,
   render/promote key-screen mocks, confirm mock coverage, polish, and set final
   status.
