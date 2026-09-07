# Brainstorm Intent: Workshop Task Printing

## Product intent

Create a two-stage printing workflow that projects digitally verified workshop-task state onto paper attached to the bike:

- After M1 completes every required preparation checklist item, M1 can print a re-check tag. Attached to the bike, it means the bike is ready for M2.
- M2 removes and discards that tag when starting work. No app action tracks the paper itself.
- After M2 completes every required re-check item, M2 can print a customer-facing verified checklist. Attached to the bike until handover, it means the bike is ready for the customer.

The app remains the source of truth. Checklist gating keeps every printed claim truthful; paper provides immediate shared visibility in the workshop and a professional customer handover artifact.

## First-release requirements

All identified requirements are **Musts** for the first release:

1. The M1 re-check print action is disabled until every M1 checklist item is complete. Once enabled, it remains available throughout the rest of the task for reprinting.
2. Printing the re-check tag is a one-tap action with no additional mechanic-facing steps.
3. The re-check tag uses a prominent large `1` as its sole distinguishing marker and also shows the order number, bike name, and stock ID.
4. The final-sheet print action is disabled until every M2 re-check item is complete. Once enabled, it remains available for reprinting.
5. Printing the final sheet is also a one-tap action with no additional mechanic-facing steps.
6. The final sheet is designed for monochrome thermal printing and prioritizes a clear, deliberately structured full checklist. Each item shows its M1 preparation check mark and, where re-checking applies, its separate M2 re-check mark.
7. The final sheet ends with `Bike prepared by [M1 name]` and `Bike re-checked by [M2 name]`, and includes the preparation timestamp.
8. A logo may be included only if it renders well; the checklist remains the primary professional-looking content.
9. A failed print attempt shows an error in the app but never blocks the mechanic from advancing the task after the required checklist is complete.
10. Either paper can be reprinted when a copy is lost or damaged, or when a previous print attempt failed.
11. The app does not track whether a paper has been attached, removed, or discarded; those remain informal physical actions in the workshop.

## Experience outcome

- Workshop staff can understand the bike's next step from the paper attached to it: re-check pending after M1, customer pickup ready after M2.
- The final sheet should make the customer feel that the preparation was exceptionally thorough and professionally executed.
- The value depends on the complete chain—verified checklist state, gated printing, physical visibility, resilient reprinting, and customer-facing presentation—not on an isolated print action.

## Focused research item

Determine the feasible connection and printing approach for the existing Epson TM-m30II, with a preference for network/IP printing from the app device without requiring a manual Bluetooth connection. The brainstorming session did not establish the technical method, so this remains a focused feasibility research item rather than a settled implementation decision.
