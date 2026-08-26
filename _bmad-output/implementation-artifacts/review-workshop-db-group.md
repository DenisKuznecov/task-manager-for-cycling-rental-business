---
title: 'Workshop tasks vs staging — Database group review'
type: 'review'
created: '2026-08-26'
status: 'in-progress'
review_mode: 'full'
base: 'staging'
head: 'feature/task-manager-for-mechanics-mvp'
---

## Intent

Code review of the workshop-tasks database slice (migrations + pgTAP) against staging, using the workshop specs.

## Tasks & Acceptance

- [x] Review Group 1 (Database) vs `staging`
- [ ] Review Group 2 (Booqable ingest) — start from `handover-workshop-review-group-2.md`
- [ ] Review Group 3 (Workshop app)
- [ ] Review Group 4 (Workshop UI)

### Review Findings

- [x] [Review][Patch] Same-page sync retry does not reconcile run counters, so last-success time can be wrong [supabase/migrations/20260826120000_workshop_sync_retry_counters.sql:1]
- [x] [Review][Dismiss] Tag drift after prep starts does not block M1/M2/storage completion — shop does not retag the same stock item or rename Bike ID in place
- [x] [Review][Dismiss] SQL tag resolver does not ignore `*-bundle` tags — live parser already strips bundles; SQL hardening not wanted
- [ ] [Review][Patch] Non-array `workshopTags` raises instead of `INVALID_SNAPSHOT` [supabase/migrations/20260821160000_workshop_source_apply.sql:682]
- [x] [Review][Dismiss] Add-on fingerprint can collide for two extras with the same parent and quantity — not worth doing for this shop
- [ ] [Review][Patch] Starting sync after an expired run lease leaves the previous `in_progress` run orphaned [supabase/migrations/20260822120000_workshop_sync.sql:635]
- [ ] [Review][Patch] `record_sync_result` / `finish_sync_run` do not check the run-lease token or fence [supabase/migrations/20260822120000_workshop_sync.sql:385]
- [ ] [Review][Patch] Order-lease acquire accepts a past or null `expires_at` [supabase/migrations/20260821160000_workshop_source_apply.sql:569]
- [ ] [Review][Patch] Empty coupon object `{}` clears existing partner attribution [supabase/migrations/20260821160000_workshop_source_apply.sql:738]
- [ ] [Review][Patch] `bike_tasks` has no index on `order_id` [supabase/migrations/20260821120000_workshop_foundation.sql:125]
- [ ] [Review][Patch] `mint_tasks=off` still increments the apply `created` count [supabase/migrations/20260821160000_workshop_source_apply.sql:948]
- [ ] [Review][Patch] pgTAP misses skipped counts, mid-page `in_progress` finish, staff `workshop_sync_health` SELECT, `staff_command` event source, and apply wrong-fence [supabase/tests/database/workshop_sync.test.sql:417]
