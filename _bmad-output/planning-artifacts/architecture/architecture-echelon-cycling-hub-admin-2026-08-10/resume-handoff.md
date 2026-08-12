# Workshop Tasks Architecture — Resume Handoff

## Status

The feature-level architecture run is paused on the **Fast path** after:

1. source and brownfield discovery;
2. collaborative selection of the main architecture direction;
3. a first complete draft of `ARCHITECTURE-SPINE.md`;
4. PRD/UX/brownfield reconciliation;
5. a mechanical lint pass with zero findings; and
6. four reviewer-gate reports.

The spine is still `status: draft`. Do not finalize it before reviewer findings are triaged and the remaining load-bearing brownfield integration decision is resolved.

## Resume Authority

Resume from `.memlog.md`; it is the append-only decision record. Read its final override entries before interpreting earlier lines.

Allowed architecture inputs:

- `_bmad-output/brainstorming/brainstorm-per-bike-workshop-tasks-2026-08-05/.memlog.md`
- finalized Workshop Tasks PRD package
- finalized Workshop Tasks UX package
- current code and `_bmad-output/project-context.md`
- decisions made directly in this architecture conversation

Explicitly excluded:

- `_bmad-output/brainstorming/brainstorm-booqable-data-mirror-2026-08-10/`

That separate unfinished brainstorm was mistakenly pulled in during broad discovery. The architecture memlog now explicitly overrides every decision derived only from it, and the spine no longer cites it. Do not reintroduce its selective-warehouse, nightly reconciliation, webhook operations UI, just-in-time refresh, or subscription-manifest decisions.

The finalized PRD and its memlog override earlier candidate models in the original per-bike brainstorm where they differ.

## User Preferences

- Explain architecture in simple, non-specialist language.
- Continue autonomously on the Fast path.
- Ask only when a missing choice materially changes the product or makes implementation unsafe.
- The architecture spine is the only intended final deliverable; this handoff exists only to resume the run.

## Decisions Confirmed Directly With the User

1. Use a **transactional modular monolith**: Next.js presents the feature; PostgreSQL functions act as the workflow traffic controller.
2. Save one refreshed Booqable order as an all-or-nothing database transaction across separate entity tables.
3. Keep the Booqable integration module separate from Workshop Tasks; Workshop code does not parse Booqable payloads.
4. Store Bike Task stage explicitly and let database functions validate transitions.
5. Keep current-state tables plus append-only attributable history; do not use full event sourcing.
6. Use explicit revisions to reject stale open-screen actions and atomic first-writer-wins claims.
7. Use immutable activated checklist versions; drafts are editable and future edits create new versions.
8. Represent every Prep/reopening round as an explicit Work Cycle with its own M1/M2 identities.
9. Testing compromise: critical database tests ship during implementation; broader TypeScript/UI tests may follow. Paper cannot be retired before the critical tests and pilot gate pass.

## Current Files

- Draft spine: `ARCHITECTURE-SPINE.md`
- Working memory: `.memlog.md`
- Reviewer reports:
  - `reviews/review-rubric.md`
  - `reviews/review-technology-reality.md`
  - `reviews/review-cross-epic-seams.md`
  - `reviews/review-data-integrity.md`

The review reports were written before the reviewer agents were interrupted. They are complete enough to triage, but their recommendations are advisory and sometimes over-prescriptive. Apply the architecture-spine test: bind only non-obvious choices that independent epics could make incompatibly.

## Remaining Load-Bearing Decision

The draft does not yet decide how its atomic Booqable ingestion contract relates to the existing shared sync:

- `src/lib/booqable/sync.ts` currently writes shared `customers`, `orders`, and `order_items` sequentially.
- Orders, bookings, and partner attribution already depend on those shared tables.
- Workshop architecture requires atomic order/item/task reconciliation.

This cannot safely remain open. The recommended direction to present in plain language is:

> Evolve the existing shared order sync into one atomic ingestion RPC while preserving the current `orders`/`order_items` consumers. Do not create a second parallel order projection or a second writer.

Ask the user to confirm this direction before binding it. Explain that it keeps one local copy of each order and avoids the current app and Workshop Tasks disagreeing.

## Reviewer Findings to Triage

Highest-value findings:

1. Bind the existing-sync replacement/cutover and single-writer rule.
2. Add finalized checklist semantics to AD-7: Action Item Done/N/A, Value Item value/no N/A, M2 implies M1, M2 fresh attestation, always-visible Items, category links do not control visibility.
3. Bind Work Cycle M1 after reassignment: preserve each outcome actor; the mechanic who performs accepted handoff is M1 for independence.
4. Bind Item saves to both expected task revision and exact requirement/source generation so a delayed save cannot satisfy newly invalidated work.
5. Tighten privilege rules for `SECURITY DEFINER` functions and append-only events.
6. Define the minimum lifecycle overlay/transition matrix for cancellation, temporary removal, reactivation, replacement, force-close, and forced Return.
7. Remove or weaken unsupported external claims:
   - keep “Booqable API v4,” remove “beta” unless proven;
   - do not claim Booqable retries failed webhooks as a guarantee;
   - do not bind a 10-second Vercel limit unless the actual project setting is verified.
8. Split test claims: pgTAP covers state/RLS/idempotency; a true concurrent-claim race needs a multi-session test.
9. Name the existing `/workshop` mock/Kanban as replaced by the server-loaded Workshop Tasks surfaces.
10. Define a minimal staged activation and non-destructive rollback procedure without importing mechanisms from the excluded brainstorm.

Do not blindly expand the spine into a full schema specification. Several cross-epic review findings request detailed relation schemas, event catalogues, and read-model schemas. Add only the smallest canonical contract needed to stop incompatible epic choices; leave ordinary columns and indexes to implementation stories.

## Next Steps

1. Resume `bmad-architecture` in **Update/Fast path** from this workspace.
2. Confirm the shared-sync evolution decision with the user.
3. Apply clear reviewer fixes and record each architecture decision through `memlog.py`.
4. Re-run `lint_spine.py`.
5. Re-run the reviewer gate against the corrected source boundary.
6. Resolve only blockers unsafe for epic creation; defer the rest with explicit revisit conditions.
7. Set spine frontmatter to `status: final`, update the date, and append `spine finalized` to the memlog.
8. Recommend `bmad-spec` first, then epics/stories.
