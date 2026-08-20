# Brainstorming Intent: Automating Mechanics' Daily Work

## Intent

Replace one paper checklist per physical bike with one touch-friendly digital task that guides M1 preparation, M2 re-check, and post-rental storage preparation. The MVP digitizes checklist execution and final accountability—not workforce management—so work remains transferable and unassigned.

## MVP Workflow

1. Create an independent task for each specifically identified bike on a reserved Booqable order, without waiting for every bike in the order to receive an ID.
2. Select a preconfigured local preparation checklist using the product's Booqable workshop bike-type tag. Booqable supplies the tag, not checklist content.
3. Show tasks through Today, Tomorrow, and Next 7 days dashboard filters. Opening a task exposes its exact checklist and a reusable parent-order details view.
4. `To Prepare` → `Being Prepared` occurs through **Start preparation** and does not assign or lock the task.
5. Any mechanic may continue M1 work. **Complete preparation and send to re-check** is gated by required outcomes and atomically records the authenticated mechanic and time as the M1 signer.
6. In `Needs Re-check`, M2 verifies designated items. **Complete re-check and mark ready** records the authenticated M2 signer and advances to `Ready for Pickup`. If M1 and M2 are the same person, require an explicit final confirmation and visibly record the exception.
7. Non-partner authenticated staff manually advance `Ready for Pickup` → `In Rental` and `In Rental` → `Returned`.
8. A mechanic starts `Prepare for Storage`, completes one shared checklist for damage inspection, cleaning, rental-part removal or swapping, and storage return, then signs **Mark task completed**. No M2 stage follows; the terminal state is `Completed`.

## Checklist Contract

- Touch-first, linear presentation with large tappable rows and minimal actions.
- Locally defined launch templates; no admin template editor in MVP.
- Supported item types are action items and numeric tyre-pressure entry in PSI.
- Required items block stage completion until they have a valid outcome.
- Configured action items may allow the explicit outcome `Not applicable`; leaving the item incomplete never satisfies it.
- If an M2-designated item is `Not applicable`, M2 must confirm that outcome.
- Initial road items allowing `Not applicable`: front derailleur shifting, main battery, shifters battery, power-meter battery, charger/lube, and bikefit applied.
- `Not applicable` is a constrained outcome only on explicitly configured action items, not a general value type or free-text field.
- For M2-enabled tyre pressure, M1 records PSI and M2 confirms that value rather than entering a second measurement.

## Source Synchronization Rules

- Booqable supplies bike identity, dates, add-ons, and invalidation; people explicitly confirm physical work and lifecycle transitions.
- Preserve the existing `order.updated` webhook as a signal, then fetch the complete authoritative order rather than parsing assignment details from the webhook payload.
- Add a staff-triggered **Sync latest data from Booqable** action for relevant upcoming reserved orders. Webhook and manual sync use the same reconciliation path; manual sync is the recovery path and replaces periodic polling in MVP.
- Task creation may wait for `order.updated` or manual sync. Show the last successful sync time and surface synchronization failures clearly.
- Date changes update task timing. Current add-ons remain visible, and the mechanic confirms alignment with them before readiness.
- Cancellation or bike removal moves the task to terminal `Cancelled`, hidden from normal queues; an open invalidated task shows a clear abandon-work state.
- A changed bike ID represents a different physical bike: cancel the old task and create a fresh `To Prepare` task with no carried-over checklist work.
- Add-on changes after `Ready for Pickup` update displayed data but do not reopen or change task status.

## Critical Boundary

- A stage signature records final responsibility for the completed checklist, not authorship of each item.
- Work history belongs to one physical-bike task and never transfers to another bike.
- Deferred: task assignment/reassignment, per-item authorship, profile-dropdown signatures, generalized form building, arbitrary value types, free text, QR/scanning, manager approval for same-mechanic re-check, periodic polling, automatic late-add-on reopening, automatic pickup/return, hard deletion, and type-specific storage checklists.

## Required Pre-Implementation Inputs

- Define launch checklists from a shared base plus explicit bike-type differences: Booqable tag, ordered labels, action versus tyre-pressure type, required status, `Not applicable` allowance, and M2-verification designation.
- Run a focused Booqable API spike to verify relationship paths and webhook delivery behavior for the resolved `order.updated` plus manual-sync design.
