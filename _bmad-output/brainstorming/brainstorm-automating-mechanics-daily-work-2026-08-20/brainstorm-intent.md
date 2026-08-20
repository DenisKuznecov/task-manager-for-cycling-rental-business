# MVP Intent

Replace one paper checklist per physical bike with one touch-friendly digital task. The task must guide M1 preparation and M2 re-check, prevent incomplete stage advancement, record explicit authenticated attestations, and continue through post-rental storage completion. This is checklist execution and accountability, not workforce management: work remains transferable and unassigned.

## Intended Workflow

1. When `order.updated` is received or staff run **Sync latest data from Booqable**, fetch the current order data and create one independent task for each bike with a specific physical bike ID. Create tasks for currently identified bikes even if other bikes on the order remain unidentified.
2. Select a locally owned preparation checklist using the bike product's Booqable workshop type tag. Booqable provides only the tag, not checklist content.
3. A mechanic opens the bike task from a dashboard filtered by Today, Tomorrow, or Next 7 days and presses **Start preparation**: `To Prepare` → `Being Prepared`. This does not assign or lock the task.
4. Any mechanic may continue the M1 checklist. Required items must be complete before **Complete preparation and send to re-check** atomically records the current authenticated user and time as the M1 signer and advances the task to `Needs Re-check`.
5. M2 verifies only designated items. **Complete re-check and mark ready** records the current authenticated user and time and advances the task to `Ready for Pickup`. If the M2 signer is also the recorded M1 signer, require an explicit same-mechanic confirmation and visibly retain that fact; no manager approval is required.
6. Current order add-ons remain visible throughout the task. Before readiness, the mechanic must confirm that preparation still matches them.
7. Any authenticated staff member except a partner-role user may manually perform `Ready for Pickup` → `In Rental` with **Mark as picked up**, and `In Rental` → `Returned` with **Mark as returned**.
8. A mechanic presses **Start storage preparation**: `Returned` → `Prepare for Storage`, completes one shared post-rental checklist, then uses **Mark task completed**. One authenticated mechanic signs this stage; no M2 re-check follows. The terminal state is `Completed`.

## MVP Scope

- Per-physical-bike tasks derived from reserved, specifically identified Booqable bikes.
- Touch-first, linear checklist UI for stand-mounted tablets, with large tappable rows and minimal actions.
- Preconfigured local preparation checklists selected by bike-type tags.
- Two checklist item interactions only:
  - tap-to-complete action items;
  - tyre-pressure entry as a numeric PSI value.
- For M2-enabled tyre-pressure items, M1 records the PSI value and M2 confirms that value rather than entering another measurement.
- Required-item gates, explicit stage actions, immutable authenticated-user attribution, displayed mechanic first and last name, and timestamps.
- Separate M1 preparation and M2 re-check statuses.
- Manual pickup, return, storage-start, and storage-completion transitions.
- One shared Prepare for Storage checklist for all bike types, covering damage inspection, cleaning, removal or swapping of rental-installed parts, and return to storage.
- Essential Booqable synchronization:
  - the existing `order.updated` webhook and the manual **Sync latest data from Booqable** action both fetch authoritative order data and run the same task reconciliation;
  - rental date changes update task timing and dashboard urgency;
  - current bikes and add-ons stay synchronized;
  - order cancellation or bike removal moves affected tasks to terminal `Cancelled`, hidden from normal work queues;
  - a changed bike ID cancels the old task and creates a fresh `To Prepare` task for the replacement, carrying no checklist work forward;
  - an actively viewed invalidated task shows a clear abandon-work state.

## Critical Rules and Discoveries

- Work history belongs to one physical bike task and never transfers to a different bike.
- A stage signature means final responsibility for the completed checklist, not authorship of every checkbox.
- The automation boundary follows source certainty: Booqable supplies bike identity, dates, add-ons, and invalidation; staff explicitly confirm physical preparation, pickup, return, and storage completion.
- Checklist definitions belong entirely to this application; runtime inheritance between bike-type checklists is unnecessary for MVP.

## Explicit Non-Goals and Deferred Items

- Task assignment, reassignment, or locking.
- Per-checkbox authorship.
- Staff-profile dropdown signatures; attribution must come from the authenticated user.
- Admin checklist-template editor.
- Generalized form-builder behavior, arbitrary value types, or free-text checklist values.
- QR codes, scanning, or another physical/digital handoff mechanism.
- Manager approval for same-mechanic M1/M2 completion.
- Automatic pickup or return transitions from Booqable status or dates.
- Automatic periodic polling for physical-bike assignment changes.
- Automatic reopening after late add-on changes.
- Hard deletion of invalidated task history.
- Type-specific post-rental/storage checklists.

## Accepted Limitation

Add-on changes after a task reaches `Ready for Pickup` update the displayed add-ons but do not change status or reopen preparation. Reopening requires reliable relevant-diff detection and reviewed-state tracking and is deferred until real frequency and impact are known.

## Resolved Booqable Synchronization Decision

- Keep the existing `order.updated` webhook as a signal and continue fetching the complete order instead of parsing its payload.
- Add a staff-triggered **Sync latest data from Booqable** action that reconciles relevant upcoming reserved orders. This replaces automatic periodic polling for MVP.
- Task creation may wait until `order.updated` occurs or staff run the manual sync. The UI must show the last successful sync time and surface sync failures clearly.

## Remaining Input

- Before implementation, define the launch checklists: collect each bike type/tag, ordered item labels, action versus tyre-pressure type, required status, and whether M2 verifies each item. Start from the shared base list and capture explicit differences per bike type.
