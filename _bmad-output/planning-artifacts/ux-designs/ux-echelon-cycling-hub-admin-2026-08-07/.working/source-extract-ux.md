# UX Discovery — Source Extract (Workshop Tasks)

Extracted 2026-08-07 from confirmed PRD package. No invention. Reviews below note *pre-final* gaps; final PRD/memlog overrides where they conflict.

## Form factor & UI system
- Responsive web inside existing admin hub; workshop phones/tablets + desktop management (PRD §1, NFR-1/2).
- Inherit Subframe (`@/ui/*`), App Router `loading.tsx`, role gating `admin|manager|partner|mechanic` (project-context). Workshop Tasks not built yet.

## Roles
- M1 Prep mechanic · M2 Re-check · Return-check mechanic · Admin/Manager · Booqable (external authority).

## Journeys (verbatim)
- UJ-1 Prepare and verify one bike
- UJ-2 Absorb a Booqable configuration change
- UJ-3 Check a returned bike
- UJ-4 Handle an exception

## Visible lifecycle (FR-4)
`Waiting for Bike ID → Needs Prep → In Prep → Needs Re-check → In Re-check → Preparation Resolved → Needs Return Check → In Return Check → Done`
Skip Re-check when no M2 Items. Read-only terminals: Cancelled, Replaced, Force-closed. Needs Attention orthogonal.

## Surfaces implied by FRs
- Available Now (unassigned claimable Needs Prep / Needs Re-check / Needs Return Check; Waiting for Bike ID visible unclaimable)
- My Work (resume assigned)
- Bike Task detail (checklist, config context, Notes, accessories, Structured Modifications, attention, identity)
- Handoff / completion boundaries (server-confirmed)
- Return Check + per–Structured Modification acknowledgement
- Manager Attention List
- Checklist Template admin (create/activate/supersede)
- Manager assign/reassign/reset/force-close/two-person override
- Audit/history visibility (attribution)

## Explicit UX deferrals (PRD/addendum)
- Previous `extra_information` progressive disclosure (OQ-3)
- Exact NFR-5 pending/loading visual treatment
- Bundle accessories + extra_information visual hierarchy
- Waiting for Bike ID presentation (pilot-sensitive)
- Always-visible Setup Category `No` comfort (pilot)
- Tablet density acceptance thresholds (deferred non-blocker)

## Interaction / feedback contracts UX must express
- Large tap-friendly frequent actions (NFR-1) — user: tile-sized outcomes, not tiny checkboxes
- Strong emphasis on changes/invalidations/lifecycle shifts so mechanics don't miss updates or work a closed/replaced task (user + FR-33, FR-48)
- Changed Items highlighted; resolve clears highlight (FR-33)
- Prior/current Setup Category values during active change (FR-15)
- Action Item Done | N/A; Value Item value entry (no N/A)
- Confirmed vs unsaved; failed save identifies action, retains input (NFR-4)
- Pending feedback; no blank waits; no double-submit (NFR-5)
- Stale open-screen: surface new state, reject stale actions (FR-48)
- Concurrent claim first-writer-wins message (FR-9)
- Physical-bike identity visible once available (FR-2)
- Waiting for Bike ID visible, not claimable (FR-1)
- Replaced/Cancelled/removed copy explaining why no further work (FR-3)
- M2 sees M1 identity; no approve/reject of M1 (FR-22/23)
- Structured Modifications durable; Notes supplementary (FR-34/37/42)
- Needs Attention non-blocking; Manager Attention List (FR-38/43)

## Exclusions constraining UX (first release)
No offline, no auto-assign, no generated accessory items, no Notes revision history, no dashboards/analytics beyond Attention List, no claim-before-ID, no separate revalidation queues.

## Review → final PRD note
Usability/lifecycle reviews flagged missing-ID silence, Notes-as-ack, orphaned attention, weak save contract, stale screens — final PRD/memlog resolved these product-side. UX must still make those resolved contracts *unmistakable* in the UI.
