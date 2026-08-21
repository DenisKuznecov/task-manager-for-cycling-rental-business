---
title: 'Booqable source apply'
type: 'feature'
created: '2026-08-21'
status: 'done'
baseline_revision: '22d19cbb9a6109bcd0e306181bf6d95210032c34'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-echelon-cycling-hub-admin-2026-08-20/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-workshop-foundation.md'
  - '{project-root}/_bmad-output/implementation-artifacts/booqable-spike-evidence.md'
deferred:
  - summary: >-
      Local Postgres crashes when SET ROLE authenticated calls a function with
      no EXECUTE, so staff-JWT apply is asserted with has_function_privilege
      instead of a live call.
    evidence: |-
      supabase test db closed the server connection at that SET ROLE path.
      has_function_privilege still shows authenticated has no EXECUTE, and no
      bq-authz order row is written.
    location: >-
      supabase/tests/database/workshop_source_apply.test.sql
    severity: low
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Staff commands and `/workshop` exist, but tasks are still fixture-only. Queues stay empty until a complete Booqable snapshot can mint one `rental_turnaround` task per identified bike and cancel work when that assignment disappears.

**Approach:** Freeze `SourceOrderSnapshotV1`, parse JSON:API into it, and land backend-only apply (lease, fingerprints, set-diff). Keep the live webhook on `sync.ts` until CAP-10.

## Boundaries & Constraints

**Always:**
- Include `customer,coupon,lines,lines.planning,lines.planning.stock_item_plannings,lines.planning.stock_item_plannings.stock_item,lines.item`. Identity: `stock_items.id`; display `identifier`; source instance key `stock_item_plannings.id`. Envelope has no local instance UUIDs.
- Identified = SIP present. Unidentified sibling does not skip/hide/cancel identified work. Tag from `products.attributes.tag_list`; ignore `*-bundle`. Zero/unknown/multiple tags: still create the task, set `has_configuration_warning`, copy no prep items. Four unsupplied tags stay disabled. While `to_prepare` and exactly one enabled mapping: replace the prep snapshot to match, bump version, checklist-changed event. After prep starts, freeze items; tag drift is warning-only.
- Active set-diff: `C−P` open instance + `to_prepare`; `P−C` close and cancel once; `P∩C` keep history. Replace = cancel A + create B, no transferred work. Source `canceled` cancels nonterminal tasks even if stock remains; `started`/`stopped` do not. Date-only `starts_at` copies queue fields; no checklist/attestation reset. After `ready_for_pickup`, extras may update display/fingerprint; do not reopen status. `quantity: 0` extras stay rows.
- Postgres SHA-256 `source_fingerprint` / `addon_fingerprint` from sorted jsonb allowlists including `stock_items.id`, SIP id, `starts_at`, `products.tag_list`, `parent_line_id`, `quantity`. Empty add-ons still fingerprint. Bad envelope or `links.next` without those pages: write nothing.
- Upsert existing `customers`/`orders`/`order_items` with `sync.ts` columns. Store SIP id on the instance. Events source `source_apply`. Only apply may set `cancelled`.
- Lease keyed by `booqable_order_id` text. `booqable_acquire_order_lease` + `booqable_apply_source_snapshot_v1` are `service_role` only. Apply checks token/fence/`expires_at`, then locks lease → order → instances → task → items. TTL is an internal lock (caller `expires_at`), not a Booqable number. Unchanged snapshot: no new rows, no version bump.
- Local idempotent migration. Parser does not import Next or write DB. Domain imports no Next/Supabase/Booqable. Do not invent debounce, `Retry-After` contract, `429` quota, or `maxDuration`.

**Ask First:**
- Wiring webhook, sandbox `sync-orders`, or `syncBooqableOrder` to apply.
- Any Booqable write, or a live GET from CI.
- Inventing checklist rows for disabled tags.
- A production lease TTL.

**Never:**
- Webhook rewrite, manual-sync RPCs/UI, run leases, sync-health.
- Transferring work to another bike; deleting cancelled history.
- A second apply writer; hosted DDL; Vitest (`node --test` like `src/workshop-ui.test.mts`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Identified road | One stock + `workshop-road-bike` | Instance, `to_prepare`, ROAD copy, fingerprints | N/A |
| Mixed | Identified + unidentified | Task only for identified | N/A |
| Replay | Same snapshot twice | Same ids; no version bump | N/A |
| Remove | `{A}` then `∅` | A closed; task `cancelled`; history kept | N/A |
| Re-add | New SIP after close | New instance + fresh `to_prepare` | N/A |
| Replace | `{A}` then `{B}` | Cancel A, create B, no copied work | N/A |
| Date-only | Same SIP/stock, new `starts_at` | Queue fields copied; work kept | N/A |
| `canceled` | Status `canceled`, stock still included | Cancel nonterminal; no new task | N/A |
| No/unknown tag | Missing tag or `workshop-gravel-bike` | Task + warning; no prep items | `CONFIGURATION_BLOCKED` on start |
| Tag drift | `being_prepared`, tag changes | Warning; items frozen | N/A |
| After ready | Extra quantity 1→0 | Fingerprint/display update; status stays | N/A |
| Bad envelope | Missing assignments or extra `links.next` | No writes | `INVALID_SNAPSHOT` |
| Bad lease | Wrong/expired token | No writes | `STALE_LEASE` |
| Staff JWT | `authenticated` EXECUTE | No grant | Call fails; no writes |

</frozen-after-approval>

## Code Map

- `src/lib/booqable/sync.ts` L50–97 fetch; L117–128 / L193–224 / L239–255 column parity; L100–297 writer. **Read-only; do not call.**
- `src/app/api/webhooks/booqable/route.ts` L13–79; `src/app/api/sandbox/booqable/sync-orders/route.ts` — **Read-only.**
- `supabase/migrations/20260821120000_workshop_foundation.sql` L43–47 fingerprints; L87–123 instances/tasks; L319–329 road mapping only; L377–407 copy is insert-only (apply must replace); L410–434 `staff_command`; L1483–1548 grants.
- `supabase/migrations/20260821140000_workshop_mechanic_order_select.sql` — next `20260821160000_…`.
- `supabase/tests/database/workshop_foundation.test.sql` L63–133 — do not pre-insert instance/task; reuse `become` / `create_staff`.
- `src/lib/workshop/domain/` + `index.ts` — no Booqable; do not export the parser. `src/workshop-ui.test.mts` — `node:test` pattern.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20260821160000_workshop_source_apply.sql` -- Lease + apply RPC, fingerprints, set-diff, grants -- CAP-1/CAP-9
- [x] `supabase/tests/database/workshop_source_apply.test.sql` -- Every I/O matrix row -- AD-13
- [x] `src/lib/workshop/domain/source-snapshot.ts` -- `SourceOrderSnapshotV1` Zod: `schemaVersion`, `fetchedAt`, `sourceStatus`, order/customer/line fields matching `sync.ts`, `assignments[]` of `{ stockItemId, sipId, displayId, title, workshopTags }` with no local UUIDs -- AD-2
- [x] `src/lib/booqable/parse-source-snapshot.ts` + `fixtures/source-order-snapshot-v1.json` -- JSON:API → envelope; no DB -- AD-1
- [x] `src/booqable-source-apply.test.mts` + `package.json` `test:source-apply` -- Parser, fixture, domain import graph -- AD-13
- [x] Apply locally (`supabase migration up` / `db reset`) -- never remote

**Acceptance Criteria:**
- Given `src/lib/workshop/domain`, when the parser test imports it, then it loads neither Next.js, Supabase, nor Booqable modules.
- Given `git diff src/lib/booqable/sync.ts src/app/api/webhooks/booqable src/app/api/sandbox/booqable`, when inspected, then it is empty.

## Spec Change Log

- 2026-08-21: Implemented backend-only source apply (lease, fingerprints, set-diff), `SourceOrderSnapshotV1` + JSON:API parser, and pgTAP/`node --test` coverage. Webhook and `sync.ts` left on the live writer. No intent or boundary changes.

## Verification

**Commands:**
- `npm run test:db` -- expected: foundation + source-apply pgTAP PASS
- `npm run test:source-apply` -- expected: parser/fixture/import graph PASS
- `git diff src/lib/booqable/sync.ts src/app/api/webhooks/booqable src/app/api/sandbox/booqable` -- expected: empty

## Review Triage Log

### 2026-08-21 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 14: (high 5, medium 8, low 1)
- defer: 1: (high 0, medium 0, low 1)
- reject: 0
- addressed_findings:
  - `[high]` `[patch]` Reject JSON:API `links.next` objects (`href`), not only strings
  - `[high]` `[patch]` Intersect included lines with `order.relationships.lines`; extra included lines must not mint assignments
  - `[high]` `[patch]` Dangling `lines.item` product include is `INVALID_SNAPSHOT`
  - `[high]` `[patch]` Lock lease → order → instances → tasks → items before writes
  - `[high]` `[patch]` pgTAP for `to_prepare` checklist replace, version bump, and `checklist_changed`
  - `[medium]` `[patch]` `relevant` accepts only booleans; string `"false"` is invalid
  - `[medium]` `[patch]` Parser tests for dangling customer/planning/SIP/stock includes and ignored extra lines
  - `[medium]` `[patch]` Node test that SQL snapshot keys exist on the Zod envelope
  - `[medium]` `[patch]` Keep existing `customer_id` / `partner_id` when the snapshot omits them
  - `[medium]` `[patch]` Invalid date/integer casts return `INVALID_SNAPSHOT` instead of raising
  - `[medium]` `[patch]` pgTAP: `started`/`stopped` do not cancel; customer upsert and name/email update
  - `[medium]` `[patch]` Retire CAP-1/CAP-9 from `deferred-work.md`; drop duplicate CAP-10 row
  - `[low]` `[patch]` Restore `GRANT EXECUTE` on `workshop_record_event` to postgres/service_role
  - `[medium]` `[patch]` Staff JWT: keep `has_function_privilege` (live `SET ROLE` crashes local Postgres — deferred)

## Auto Run Result

Status: done

Summary: Backend-only Booqable source apply is in: frozen `SourceOrderSnapshotV1`, JSON:API parser, lease + fingerprint + set-diff RPC (`service_role` only). Live webhook/`sync.ts` were not wired. Review patches tightened parser completeness, lock order, customer preserve, cast errors, and matrix tests.

Files changed:
- `supabase/migrations/20260821160000_workshop_source_apply.sql` — lease, apply RPC, fingerprints, set-diff, grants
- `supabase/tests/database/workshop_source_apply.test.sql` — I/O matrix plus review-patch rows
- `src/lib/workshop/domain/source-snapshot.ts` — Zod `SourceOrderSnapshotV1`
- `src/lib/workshop/domain/index.ts` — export envelope types/schemas, not the parser
- `src/lib/booqable/parse-source-snapshot.ts` — JSON:API → envelope
- `src/lib/booqable/fixtures/source-order-snapshot-v1.json` — golden JSON:API fixture
- `src/booqable-source-apply.test.mts` — parser/fixture/import-graph/`test:source-apply`
- `package.json` — `test:source-apply` script
- `_bmad-output/implementation-artifacts/deferred-work.md` — CAP-1/CAP-9 retired; one CAP-10 row kept
- `_bmad-output/implementation-artifacts/spec-booqable-source-apply.md` — this spec

Review findings breakdown:
- patches applied: 14 (high 5, medium 8, low 1)
- items deferred: 1 (low — live authenticated EXECUTE call crashes local Postgres)
- items rejected: remaining reviewer noise (CI wiring, generated types, lease release, R6 no-order-writes, extra terminal statuses, etc.)

Follow-up review recommendation: true (patched high 5, medium 8, low 1; score `3×8 + 1 = 25`)

Verification:
- `npm run test:db` — PASS (180 tests: foundation + source-apply)
- `npm run test:source-apply` — PASS (12 tests)
- `git diff src/lib/booqable/sync.ts src/app/api/webhooks/booqable src/app/api/sandbox/booqable` — empty

Residual risks:
- Apply is not called from app code; queues stay empty until CAP-10 webhook/manual-sync wiring.
- Staff JWT “call fails” is proven by missing EXECUTE, not by a live `SET ROLE authenticated` invocation (that path crashed local Postgres).
- No production lease TTL, debounce, or `429`/`Retry-After` contract was invented.
