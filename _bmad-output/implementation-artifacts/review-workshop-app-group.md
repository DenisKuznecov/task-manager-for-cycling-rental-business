---
title: 'Workshop tasks vs staging — Workshop app group review'
type: 'review'
created: '2026-08-26'
status: 'in-progress'
review_mode: 'full'
base: 'staging'
head: 'feature/task-manager-for-mechanics-mvp'
---

## Intent

Code review of Group 3 (`src/lib/workshop` actions, application, data, domain) against `staging`, using the foundation, CAP-10, and queue specs. Same conservative bar as Groups 1–2. UI chrome is Group 4.

## Tasks & Acceptance

- [x] Review Group 3 (Workshop app) vs `staging`
- [x] Apply agreed app patches (if any) — none; clean review
- [x] Review Group 4 (Workshop UI) — write-up `review-workshop-ui-group.md`

### Review Findings

No patch, decision, or defer items. Layers: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor. Auditor: no spec violations.

## Dismissed this pass (shop / spec / already listed)

- **Customer name on task detail** — `workshop_task_detail` never sends `customer_name`, so the shared list mapper leaves it blank. Queue reads the view (name is there). Task page does not show customer. Revisit in Group 4 only if that page grows a customer line.
- **Lease renew swallow / renew-after-release race** — a failed renew is logged and work continues; apply still fails closed when the lease is gone. Rare race can revive a lease for ~2 minutes. Not a silent write. Not worth a patch here.
- **Same-page Resume re-fetches successes** — apply is idempotent; retry counters already fixed in `7d43752`.
- **50-order page / `maxDuration` / `hasMore` cap** — do not re-open. Group 2 declined; spec says ask first before pinning `maxDuration`.
- **Client cursor page trust, empty tokens, `SOURCE_UNAVAILABLE` catch-all, 8 tile-count queries, page clamp to 1** — spec or shop-trusted staff. Page → 1 is required. Tile `head: true` is the wiki pattern the queue spec pointed at.
- **Parser / mapper / queue-bounds / sandbox mint tests** — same class as Group 2 declined test patches. Code paths match the specs.
- **Group 1 leftovers** — orphan `in_progress` run, lease token on record/finish, etc. Stay listed there.

## Notes for Group 4

Review `/workshop` pages and `WorkshopTask` / `WorkshopQueue` chrome. Do not treat missing UI as an app-layer gap — it was in scope here as contracts only. If the task page should show customer, add `customer_name` to `workshop_task_detail` first (new local migration; do not edit the foundation file in place).
