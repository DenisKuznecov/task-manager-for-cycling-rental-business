---
title: 'Workshop tasks vs staging — Booqable ingest group review'
type: 'review'
created: '2026-08-26'
status: 'in-progress'
review_mode: 'full'
base: 'staging'
head: 'feature/task-manager-for-mechanics-mvp'
---

## Intent

Code review of Group 2 (Booqable ingest: fetch, parse, webhook, sandbox reseed, related tests) against `staging`, using the CAP-10 and source-apply specs. Same conservative bar as Group 1.

## Tasks & Acceptance

- [x] Review Group 2 (Booqable ingest) vs `staging`
- [x] Apply agreed ingest patches (if any) — user declined; none applied
- [x] Review Group 3 (Workshop app) — write-up `review-workshop-app-group.md`
- [x] Review Group 4 (Workshop UI) — write-up `review-workshop-ui-group.md`

### Review Findings

- [x] [Review][Dismiss] Fetch merge and `fetchSourceOrderDocument` never run in tests, so a one-page fetch that strips `links` still parses — user declined this pass
- [x] [Review][Dismiss] List `hasMore` for a full 50-row page with no `links.next` is unasserted — user declined this pass
- [x] [Review][Dismiss] `mergeOrderDocuments` silently drops include rows that are not `{type,id}` instead of `INVALID_SNAPSHOT` — user declined this pass

## Group 1 leftovers (not re-opened)

Parser fail-open (`relationshipRefs`, non-array `included`, non-object `links`, skip line with no `planning`, `Number()` coerce) stays on `spec-booqable-source-apply.md`. CAP-10 said leave those leftover parser patches.

## Dismissed this pass (shop / spec / already listed)

Timeouts, `Retry-After` caps, `maxDuration`, page caps, timing-safe secret compare, slug host checks, webhook POST / sandbox GET invocation tests, empty list ids, merge keeping only first `data` (single-order GET), commercial address/birthday drop, and sandbox JSON shape (`success: true` with `failures[]`). Spec forbids inventing `maxDuration` / a `429` quota. Missing-id webhook is already 200 with no write.

## Notes for Group 3

Staff list Sync also reads `hasMore`. User declined the ingest `hasMore` test patch — do not re-open it. Do not treat missing `/workshop` Sync UI as an ingest gap.
