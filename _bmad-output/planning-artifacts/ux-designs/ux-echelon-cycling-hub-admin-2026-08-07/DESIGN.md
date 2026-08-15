---
name: Echelon Workshop Tasks
description: 'Workshop-only visual deltas for the existing Subframe admin system: operational hierarchy, glare-resistant state emphasis, and forgiving mechanic controls.'
status: final
updated: 2026-08-07
sources:
  - ../../prds/prd-echelon-cycling-hub-admin-2026-08-07/prd.md
  - ../../prds/prd-echelon-cycling-hub-admin-2026-08-07/addendum.md
  - ../../prds/prd-echelon-cycling-hub-admin-2026-08-07/discovery-source-workshop.md
  - ../../prds/prd-echelon-cycling-hub-admin-2026-08-07/reconcile-workshop-memory.md
  - ../../prds/prd-echelon-cycling-hub-admin-2026-08-07/review-lifecycle-consistency.md
  - ../../prds/prd-echelon-cycling-hub-admin-2026-08-07/review-workshop-usability.md
  - ../../prds/prd-echelon-cycling-hub-admin-2026-08-07/review-rubric.md
  - ../../prds/prd-echelon-cycling-hub-admin-2026-08-07/.memlog.md
  - ../../../project-context.md
  - .memlog.md
  - .working/source-extract-ux.md
colors:
  brand-primary: '#D97706'
  brand-soft: '#FFFBEB'
  brand-muted: '#FEF3C7'
  brand-strong: '#92400E'
  attention-border: '#B45309'
  text-primary: '#0F172A'
  text-secondary: '#64748B'
  text-on-strong: '#FFFFFF'
  surface-base: '#FFFFFF'
  surface-subtle: '#F8FAFC'
  surface-muted: '#F1F5F9'
  border-default: '#E2E8F0'
  border-strong: '#CBD5E1'
  success: '#0D9488'
  success-soft: '#F0FDFA'
  success-strong: '#0F766E'
  success-border: '#99F6E4'
  error: '#DC2626'
  error-soft: '#FEF2F2'
  error-strong: '#991B1B'
  error-border: '#FCA5A5'
  focus-ring: '#0F172A'
  overlay: '#00000099'
typography:
  heading-1:
    fontFamily: Geist
    fontSize: 30px
    fontWeight: '500'
    lineHeight: 36px
    letterSpacing: 0em
  heading-2:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0em
  heading-3:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0em
  body:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-strong:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0em
  caption:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  caption-strong:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0em
  mechanic-control:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0em
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 24px
  '6': 32px
  sticky-bar-min: 64px
components:
  workshop-task-card:
    background: '{colors.surface-base}'
    foreground: '{colors.text-primary}'
    secondary-foreground: '{colors.text-secondary}'
    border: '{colors.border-default}'
    radius: '{rounded.md}'
    padding: '{spacing.3}'
    gap: '{spacing.3}'
    title: '{typography.heading-3}'
    action-background: '{colors.brand-strong}'
    action-foreground: '{colors.text-on-strong}'
    shadow: '0px 1px 2px 0px rgb(0 0 0 / 0.05)'
  attention-strip:
    background: '{colors.brand-soft}'
    foreground: '{colors.brand-strong}'
    border: '{colors.attention-border}'
    border-width: 2px
    radius: '{rounded.md}'
    padding: '{spacing.3}'
    label: '{typography.caption-strong}'
    reason: '{typography.body-strong}'
  configuration-change-notice:
    background: '{colors.error-soft}'
    foreground: '{colors.error-strong}'
    border: '{colors.error}'
    border-width: 2px
    radius: '{rounded.md}'
    padding: '{spacing.3}'
    label: '{typography.caption-strong}'
    detail: '{typography.body-strong}'
  task-context-panel:
    background: '{colors.surface-base}'
    foreground: '{colors.text-primary}'
    border: '{colors.border-default}'
    radius: '{rounded.lg}'
    padding: '{spacing.3}'
    gap: '{spacing.3}'
  checklist-group:
    background: '{colors.surface-subtle}'
    foreground: '{colors.text-primary}'
    border: '{colors.border-default}'
    changed-background: '{colors.error-soft}'
    changed-border: '{colors.error}'
    radius: '{rounded.md}'
    padding: '{spacing.3}'
    gap: '{spacing.2}'
  action-item-tile:
    background: '{colors.surface-base}'
    foreground: '{colors.text-primary}'
    border: '{colors.border-default}'
    selected-background: '{colors.success-soft}'
    selected-foreground: '{colors.success-strong}'
    selected-border: '{colors.success}'
    changed-border: '{colors.error-border}'
    radius: '{rounded.md}'
    padding: '{spacing.3}'
    control-type: '{typography.mechanic-control}'
  value-item-tile:
    background: '{colors.surface-base}'
    foreground: '{colors.text-primary}'
    border: '{colors.border-default}'
    focus-border: '{colors.brand-primary}'
    changed-border: '{colors.error-border}'
    radius: '{rounded.md}'
    padding: '{spacing.3}'
    input-type: '{typography.mechanic-control}'
  item-save-status:
    saved-foreground: '{colors.success-strong}'
    pending-foreground: '{colors.text-secondary}'
    unsaved-foreground: '{colors.brand-strong}'
    error-foreground: '{colors.error-strong}'
    type: '{typography.caption-strong}'
  sticky-lifecycle-bar:
    background: '{colors.surface-base}'
    foreground: '{colors.text-primary}'
    secondary-foreground: '{colors.text-secondary}'
    border: '{colors.border-default}'
    action-background: '{colors.brand-strong}'
    action-foreground: '{colors.text-on-strong}'
    min-height: '{spacing.sticky-bar-min}'
    padding: '{spacing.3}'
    shadow: '0px -6px 18px rgb(15 23 42 / 0.08)'
  lifecycle-confirmation-panel:
    background: '{colors.surface-base}'
    foreground: '{colors.text-primary}'
    border: '{colors.border-default}'
    overlay: '{colors.overlay}'
    radius: '{rounded.md}'
    padding: '{spacing.4}'
    gap: '{spacing.3}'
    primary-background: '{colors.brand-strong}'
    primary-foreground: '{colors.text-on-strong}'
  previous-information-drawer:
    background: '{colors.surface-base}'
    foreground: '{colors.text-primary}'
    secondary-foreground: '{colors.text-secondary}'
    border: '{colors.border-default}'
    overlay: '{colors.overlay}'
    width-min: 320px
    padding: '{spacing.4}'
    gap: '{spacing.3}'
  structured-modification-card:
    background: '{colors.error-soft}'
    foreground: '{colors.error-strong}'
    border: '{colors.error}'
    acknowledged-background: '{colors.success-soft}'
    acknowledged-foreground: '{colors.success-strong}'
    acknowledged-border: '{colors.success}'
    radius: '{rounded.md}'
    padding: '{spacing.3}'
  last-touched-summary:
    background: '{colors.surface-subtle}'
    foreground: '{colors.text-primary}'
    secondary-foreground: '{colors.text-secondary}'
    border: '{colors.border-default}'
    radius: '{rounded.md}'
    padding: '{spacing.3}'
    label: '{typography.caption-strong}'
  found-and-fixed-record:
    background: '{colors.success-soft}'
    foreground: '{colors.success-strong}'
    border: '{colors.success-border}'
    radius: '{rounded.md}'
    padding: '{spacing.3}'
    type: '{typography.body-strong}'
  manager-queue-row:
    background: '{colors.surface-base}'
    foreground: '{colors.text-primary}'
    secondary-foreground: '{colors.text-secondary}'
    border: '{colors.border-default}'
    focus-border: '{colors.brand-primary}'
    focus-ring: '{colors.focus-ring}'
    radius: '{rounded.md}'
    padding: '{spacing.3}'
    min-height: 80px
  attention-resolution-panel:
    background: '{colors.brand-soft}'
    foreground: '{colors.brand-strong}'
    border: '{colors.attention-border}'
    radius: '{rounded.lg}'
    padding: '{spacing.4}'
    gap: '{spacing.3}'
  manager-action-confirmation-panel:
    background: '{colors.surface-base}'
    foreground: '{colors.text-primary}'
    border: '{colors.border-default}'
    destructive-border: '{colors.error}'
    destructive-foreground: '{colors.error-strong}'
    overlay: '{colors.overlay}'
    radius: '{rounded.md}'
    padding: '{spacing.4}'
    gap: '{spacing.3}'
  template-version-row:
    background: '{colors.surface-base}'
    foreground: '{colors.text-primary}'
    secondary-foreground: '{colors.text-secondary}'
    border: '{colors.border-default}'
    active-background: '{colors.success-soft}'
    active-foreground: '{colors.success-strong}'
    radius: '{rounded.md}'
    padding: '{spacing.3}'
  template-editor:
    background: '{colors.surface-base}'
    foreground: '{colors.text-primary}'
    border: '{colors.border-default}'
    radius: '{rounded.lg}'
    padding: '{spacing.4}'
    gap: '{spacing.4}'
  activity-timeline:
    background: '{colors.surface-base}'
    foreground: '{colors.text-primary}'
    secondary-foreground: '{colors.text-secondary}'
    line: '{colors.border-strong}'
    marker: '{colors.brand-primary}'
    gap: '{spacing.4}'
  terminal-task-panel:
    background: '{colors.surface-muted}'
    foreground: '{colors.text-primary}'
    secondary-foreground: '{colors.text-secondary}'
    border: '{colors.border-strong}'
    radius: '{rounded.lg}'
    padding: '{spacing.4}'
---

## Brand & Style

Workshop Tasks is part of the Echelon admin hub, not a separate workshop console. It inherits the existing Subframe-generated shell, Geist typography, amber brand, white/slate surfaces, teal success, red error, 4/8/12px radii, and restrained shadows. This spine defines only the Workshop Tasks delta: stronger operational hierarchy, persistent high-risk state treatment, glare-resistant contrast, and controls forgiving enough for mounted tablets, dirty or greasy hands, and occasional gloves.

The posture is direct and workmanlike. Bike identity, phase, ownership, next action, changed requirements, and terminality must read before decorative detail. Chromatic emphasis always carries a label, border, icon, or structural change; color never bears state alone. There is no feature-specific dark palette because no Workshop Tasks dark theme is established.

Final PRD behavior and later explicit user decisions remain authoritative. This spine is canonical only for visual UX details left open upstream; mockups, wireframes, and generated components defer to it on those details.

## Colors

The palette is the actual light Subframe admin palette from `src/ui/tailwind.config.js`, expressed as hex for downstream consumers.

- `{colors.surface-base}`, `{colors.surface-subtle}`, and `{colors.surface-muted}` create a bright but layered work surface. Avoid low-opacity text and glass effects inside the operational UI; glare resistance depends on solid surfaces.
- `{colors.text-primary}` is the default working text and focus ring. `{colors.text-secondary}` is reserved for supporting facts, never required instructions or unresolved-state copy.
- `{colors.brand-primary}` remains the host brand accent. Workshop primary lifecycle controls use `{colors.brand-strong}` with `{colors.text-on-strong}` for a strong, glare-readable pairing; amber-600 is not used as a normal-text fill.
- `{colors.brand-soft}` with `{colors.brand-strong}` and `{colors.attention-border}` denotes attention context. The words “Needs Attention” and the concrete reason are mandatory.
- `{colors.error-soft}` with `{colors.error-strong}` and `{colors.error}` denotes invalidated work, failed saves, and destructive consequences. It is not a generic urgency color.
- `{colors.success-soft}` with `{colors.success-strong}` and `{colors.success}` denotes server-confirmed outcomes and acknowledged modifications, never optimistic intent.

The intended high-contrast pairs are `{colors.text-primary}` on `{colors.surface-base}`, `{colors.brand-strong}` on `{colors.brand-soft}`, `{colors.error-strong}` on `{colors.error-soft}`, `{colors.success-strong}` on `{colors.success-soft}`, and `{colors.text-on-strong}` on `{colors.brand-strong}`. Formal contrast and accessibility conformance are implementation-validation responsibilities, not certified product promises in this spine.

## Typography

The type system remains Geist and mirrors the current Subframe ramp. `{typography.heading-1}` is for the route title only; `{typography.heading-2}` names major queues or the active Bike Task; `{typography.heading-3}` names cards, checklist groups, and panel sections. Operational copy uses `{typography.body}` or `{typography.body-strong}`. `{typography.caption-strong}` may label phase, state, source, actor, or time but cannot carry an instruction by itself.

Frequent mechanic controls use `{typography.mechanic-control}`. Do not shrink control text to fit longer labels; let labels wrap or widen the control. Uppercase is limited to short state/source labels and must not replace sentence-case reason text.

## Layout & Spacing

The feature extends the inherited 4px rhythm: `{spacing.1}`, `{spacing.2}`, `{spacing.3}`, `{spacing.4}`, `{spacing.5}`, and `{spacing.6}`. Frequent mechanic controls must be large, forgiving, tile-sized surfaces rather than compact generated controls. Their final dimensions must be validated on mounted workshop tablets in landscape and portrait under glove and glare conditions.

Mechanic dashboard landscape uses two strictly equal panels: My Work and Available Now. Neither panel gains visual priority because Egor already has assigned work. Portrait stacks My Work before Available Now while retaining the same card facts and action hierarchy.

Bike Task detail uses full-width notices first, then a split landscape workspace: a narrower `task-context-panel` and a wider checklist. Portrait and phone widths order content as notices, task context, checklist, then the persistent lifecycle control. Checklist groups stay in one continuous scroll, use two columns only when both columns remain readable, and become one column without accordion behavior.

Manager surfaces are scan-first. Needs Attention precedes the separate Waiting for Bike ID queue. Rows align stable facts and use the full row as the target; decision controls appear only after opening detail.

## Elevation & Depth

Inherit Subframe's subtle `sm`, `md`, and overlay shadows. Cards use the 1px/2px soft shadow only when needed to separate white from pale slate; operational priority comes from order, typography, borders, and persistent strips rather than elevation. Drawers and confirmation panels may use the inherited overlay shadow. Do not add floating cards, gradients, blur, or hover lift to signal work state.

## Shapes

Use `{rounded.sm}` for compact nested fields, `{rounded.md}` for cards, controls, rows, and notices, and `{rounded.lg}` for major panels. `{rounded.full}` is limited to compact counts or passive phase/status pills. Attention, invalidation, failed-save, and terminal states must never collapse into pill-only presentation.

## Components

The names below are the canonical Workshop-specific component names. Existing generated primitives remain inherited; these components compose them and apply the visual delta.

The template library/detail split, separate Activity surface, last-touch placement in Bike Task context, and found-and-fixed entry point in Bike Task Detail are non-blocking UX placement assumptions made during autonomous finalization. Their placement may change without altering the upstream product contracts represented by the components.

The Template Library covers e-city, e-road, road, gravel, MTB, and E-MTB. No Workshop category-classification or source-tag approval screen is designed: category is read-only Booqable context, and source conflicts use Integration Incident presentation. Accessory-tag interpretation has no UI before Epic 6.

- `workshop-task-card` — White task summary with bike name, order/client, rental dates, phase, assignee, progress, and one large phase-named action such as Continue Prep or Claim Re-check. Bike, phase, and action have comparable visual weight. Waiting for Bike ID remains visible in the default mechanic queue with no claim action. Uses the `attention-strip` and `configuration-change-notice` when relevant. See [mechanic dashboard mock](mockups/refine-mechanic-dashboard-2026-08-07.html), which illustrates equal queue panels, the balanced card triad, and portrait stacking.
- `attention-strip` — Full-width amber strip with a 2px border, explicit “Needs Attention” label, and short reason. It is loud context, not a compact badge and not a blocking overlay.
- `configuration-change-notice` — Full-width red-tinted notice before working content. Names when and what changed, uses an icon plus text, and remains visually attached to reopened work until affected outcomes are server-confirmed.
- `task-context-panel` — Narrower landscape panel for bike identity, read-only source-derived category, order, customer, delivery address, rental dates, current setup values, accessories, Notes, and current `extra_information`. Current `No` values have the same weight as selected values.
- `checklist-group` — Always-visible group containing current Setup Category context and its Items. A changed group receives a thicker red boundary, “Reopened” text, and prior/current context; it never collapses.
- `action-item-tile` — One Item with two side-by-side, explicit, tile-sized Done and N/A controls. Selected appearance uses success surface, border, label, and icon; changed state adds a red side/boundary cue. Final control sizing is validated with mechanics on mounted workshop tablets, including glove and glare conditions.
- `value-item-tile` — One Item with a large field, optional unit, and local save feedback. It has no N/A control. Typed content remains visually distinct from confirmed content.
- `item-save-status` — In-tile text status for Unsaved, Saving, Saved, or Retry. Success color appears only after server confirmation; Retry remains adjacent to the failed Item.
- `sticky-lifecycle-bar` — Persistent bottom bar with confirmed progress and the current Handoff/Complete action. The primary action uses `{colors.brand-strong}` and stays visible before completion. See [mechanic task-detail mock](mockups/refine-mechanic-task-detail-2026-08-07.html), which illustrates top notices, the context/checklist split, continuous groups, and the sticky bar.
- `lifecycle-confirmation-panel` — Short modal panel naming the resulting phase before Handoff or Complete. Uses one primary and one cancel action; pending state stays inside the panel.
- `previous-information-drawer` — Small secondary drawer for previous `extra_information`. Current authoritative text remains visible behind or beside it; the drawer is not a competing full task view.
- `structured-modification-card` — Persistent Return Check card for one free-form Structured Modification. Unacknowledged cards use red-tinted emphasis and a large Addressed action; acknowledged cards switch to success treatment while retaining description and attribution.
- `last-touched-summary` — Secondary read-only summary inside Bike Task context for the most recent authoritative same-`stock_identifier` workshop touch returned by the server. It names its limited scope and never presents itself as complete cross-rental bike history.
- `found-and-fixed-record` — Compact success-toned record for a mechanic-documented issue already corrected. It shows the factual description and attribution without an attention strip or unresolved-state styling.
- `manager-queue-row` — Entirely clickable, chevron-ended row with bike/order, rental timing, reason/category, requester, and age where relevant. It has no inline decision controls. See [manager dashboard mock](mockups/refine-manager-dashboard-2026-08-07.html), which illustrates Needs Attention priority and the separate Waiting for Bike ID queue.
- `attention-resolution-panel` — First block on Manager Attention Detail. The attention reason and required resolution control precede full Bike Task information; note-required reasons show a clearly labeled text area.
- `manager-action-confirmation-panel` — Confirmation surface for reset, force-close, assignment/reassignment, and other consequence-bearing task controls. Destructive consequences use the error border/text treatment and state exactly what history, assignment, and lifecycle will change.
- `template-version-row` — Library/detail row showing phase, bike category, version, and active/superseded state in text. Active state uses success treatment; superseded remains readable, not disabled-looking.
- `template-editor` — Manager/admin workspace for template metadata and continuously visible Item definitions across all six bike categories. Inputs use Workshop-sized heights; version and status remain visible while editing.
- `activity-timeline` — Read-only chronological list with actor, time, event verb, and affected phase/Item. Markers supplement explicit event labels and never encode event type by color alone.
- `terminal-task-panel` — Dominant read-only panel for Done, Cancelled, Replaced, or Force-closed. Names the outcome, explains why work stopped, removes mutation controls, and provides the Mechanic Dashboard action.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Inherit the Echelon Subframe shell and light palette | Create a separate workshop-console identity |
| Use solid surfaces, strong text, and persistent labeled state cues | Depend on low-opacity text, glare-sensitive overlays, or color alone |
| Use large, forgiving, tile-sized mechanic controls validated on mounted tablets | Reuse compact generated controls for Done, N/A, Claim, Handoff, or Complete |
| Keep My Work and Available Now equally prominent in landscape | Turn the mechanic dashboard into tabs or make one queue subordinate |
| Keep checklist groups continuously visible | Use accordions, horizontal carousels, or hidden-by-default required context |
| Keep changed, failed, and terminal states in context | Rely on a transient toast as the only evidence |
| Use explicit phase and outcome words | Use unlabeled icons, ambiguous checkmarks, or celebratory copy |
| Use restrained motion and visible focus | Use hover-only controls, precision gestures, or motion to carry meaning |
