# Forged: Workshop Tasks — continue, pivoted

2026-08-18. Verdict on the 9-epic Workshop Tasks plan: **not killed, not restarted — continued on a compressed path.**

## Locked decisions

- Epic 1 (checklist templates) and stories 2.1–2.3 (security containment, Next 16/Node 24, toolchain pins): keep as shipped.
- Canonical layer 2.4–2.9: keep **frozen**. No extensions; every `deferred-work.md` item stays deferred unless something breaks in live use.
- **Kill** 2.13 (revoke legacy writers) and 2.14 (rollout control plane).
- 2.10 (seed/validate source data) continues — already in progress in another agent window; coordinate before touching Epic 2 files.
- 2.11 + 2.12 collapse into **one slim wiring story**: webhook calls the canonical fetch-and-apply (`apply_canonical_order_graph`); order authority is refetched when a mechanic claims a task. Old `sync.ts` untouched. No freshness proofs.
- Epics 3–9 (34 stories) compress to ~13:
  - Epic 3 → 2 stories: bike tasks born from manager-assigned stock IDs, category tag picks the checklist template; reassignment/cancellation = flag old task, create new (no replacement-chain algebra).
  - Epic 5 → 4–5 stories: mechanic dashboard, claim, checklist, complete/hand-off, **M2 re-check stays** (paper has real two-column second-mechanic items + dual signatures; templates need a per-item "requires second mechanic" flag). Claim races (5.2) → a unique constraint, not a story.
  - Epic 6 → 1 story: reconfirm changed work mid-prep. Accessory-tag interpretation stays deferred.
  - Epics 4 + 7 → 2 manager stories: attention flags, reassign, force-close.
  - Epic 8 → 2 return-check stories reusing prep machinery.
  - Epic 9 → zero stories; adoption = the three of them using it.
- Franchise/multi-shop: **direction only, nothing signed.** No tenancy features. Shop-scope column on new tables explicitly **rejected by Den** (retrofit cost consciously accepted). Franchise pitch strategy: run own shop on it first, sell with evidence.

## The facts that decided it

- Mechanics re-check Booqable manually today; staleness costs a walk to the rack, never money or safety. Goal is to remove that re-check → solved by webhook refetch + refetch-on-claim, not by proofs.
- Bike identity is **human-assigned**: manager verifies shortage (1–2 allowed per product), aligns swaps with the client, assigns the stock ID in Booqable. The manager already is the reconciliation engine.
- The canonical layer was wired to nothing live; its nested fetch is the only path that sees stock-item barcodes, so one wiring story converts sunk cost into the data feed the feature needs.
- The 2,471-line epics file contains zero franchise/multi-shop/tenant provisions despite that being the stated strategic driver — the plan's complexity came from the planning process, not the goals.
- Real goals: automate manager→mechanic task flow, digital dual-signoff checklists, accumulate performance/history data.

## Rejected

- Kill the whole feature (goals are real; Epic 1 + infra are shipped value).
- Delete and restart (nothing wrong with the shipped parts).
- Continue the plan as written (over-built for a 3-person shop, under-built for the franchise ambition).
- Shop-scope tenancy column now.

## Loose ends (not resolved in this session)

- `sprint-status.yaml` still carries the **unexecuted** forward-revert action item for Story 2.7 (webhook recovery removal, proposal 2026-08-15). Execute or formally drop it.
- `epics.md` and `sprint-status.yaml` must be rewritten to this compressed plan (bmad-correct-course / bmad-create-epics-and-stories, with this file as input).
- Surviving deferred item worth carrying: interaction-level draft-editor mutation test from Epic 1 review.
