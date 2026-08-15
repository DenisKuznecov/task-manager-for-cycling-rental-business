---
title: 'Persist and Recover Authoritative Refresh Work'
type: 'feature'
created: '2026-08-15'
status: 'done'
review_loop_iteration: 0
baseline_revision: 'fd46aca8c24dac19128e3dcef97ebe3b3d0f8c3b'
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/project-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Accepted Booqable webhooks currently depend on one synchronous fetch and leave no durable evidence or recoverable work when delivery, fetching, or processing fails. Operators must never repair canonical source rows by hand after missed, duplicate, interrupted, or stale work.

**Approach:** Persist a PII-free receipt before external I/O, atomically coalesce receipts into refresh intents, and expose service-role-only compare-and-set lease APIs with append-only attempts and visible terminal states. Define a versioned transition catalogue now; keep the legacy synchronous sync running until later cutover.

## Boundaries & Constraints

**Always:** Authenticate and ghost-filter before persistence; persist before `syncBooqableOrder`. Store only source/provider IDs, timestamps, generations, contract versions, and delivery identity: provider event ID when present, otherwise HMAC-SHA256 of the authenticated body without retaining it. Coalesce many receipts into one pending/leased intent while advancing `receipt_generation`. Fence claims, heartbeats, completion, and reclaim by lease generation/expiry; attempts are append-only and errors redacted. Allow three total attempts, with retryable 429/5xx/timeout failures consuming one and delaying claimability by 30 then 120 seconds. Keep exhausted work visible; operator retry creates a fresh-budget successor linked to its predecessor. Catalogue all six apply results plus `upstream_rate_limited`, `upstream_server_error`, `upstream_timeout`, `terminal_validation_failed`, `source_conflict_quarantined`, `lease_superseded`, and `unknown_transition_code` in a protected table fixture-checked against TypeScript.

**Ask First:** Change the retry count/delays, receipt identity policy, catalogue codes, or operator-successor budget; grant direct operational-table DML to application roles; or change existing webhook acknowledgement/ghost behavior.

**Never:** Store raw webhook payloads or customer/order-detail PII. Treat receipt fields as Booqable truth. Fetch new canonical graph shapes, change the frozen `customer,coupon,lines` include, mutate canonical source/domain rows, derive Workshop tasks, add the Story 2.8 Cron worker/reconciliation sweep, add JIT proofs, modify brownfield readers, apply remote DDL, or remove `syncBooqableOrder`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Accepted signal | Authenticated non-ghost order | Persist receipt/correlation before legacy fetch | On failure: log and return 500 without fetch |
| Duplicate/repeated signal | Same/new delivery for pending root | Deduplicate receipt; coalesce intent; advance generation only for new receipt | Atomic CAS |
| Concurrent claim | Two claimants | One lease generation wins | Loser gets typed retryable rejection |
| Stale completion | Expired/superseded lease | No terminal/domain mutation | Record redacted `rejected_retryable` attempt |
| Retryable failure | Budget remains/is consumed | Delay claimability or remain visibly exhausted | No hot loop or deletion |
| Unknown code | Unregistered result/incident | No transition | Fail closed; deduplicate incident |

</frozen-after-approval>

## Code Map

- `src/app/api/webhooks/booqable/route.ts:14-84` -- preserve auth, ghost filtering, service-role creation, and legacy refetch; insert durable receipt RPC before line 74.
- `tests/booqable-containment/webhook.test.ts:14-180` -- extend existing auth, ghost, and PII-log fixtures.
- `src/lib/booqable/contracts/source-envelope.ts:15-68`, `check.ts:189-204`, `canonical-projection.ts:16-18` -- reuse fixed vocabulary, strict Zod, SQL drift, and migration-pointer patterns.
- `src/lib/booqable/contracts/brownfield-consumers.ts:168-194` -- read-only soft lock; operational names must not introduce projection-field leaks.
- `supabase/migrations/20260815000000_expand_canonical_booqable_projection.sql`, `supabase/tests/database/booqable-integration/002_canonical_projection.pgtap.sql` -- read-only DDL, privilege, and pgTAP patterns.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/booqable/contracts/refresh-work.ts`, `src/lib/booqable/contracts/index.ts` -- define and export versioned states, catalogue, retry policy, strict schemas, and migration pointer.
- [x] `supabase/migrations/20260815140000_persist_authoritative_refresh_work.sql` -- idempotently create receipts, intents, receipt-intent correlations, attempts, transition catalogue, and incidents; seed v1 rules; add indexes/constraints and service-role-only SECURITY DEFINER record/claim/heartbeat/complete/reclaim/operator-successor RPCs with CAS fencing.
- [x] `src/app/api/webhooks/booqable/route.ts` -- record accepted work before external fetch while preserving current response, ghost, and legacy-sync behavior.
- [x] `tests/booqable-contracts/refresh-work.test.ts`, `tests/booqable-containment/webhook.test.ts` -- prove contract/migration parity, unknown-code failure, auth/ghost gates, PII-free input, persistence ordering, and fail-loud errors.
- [x] `supabase/tests/database/booqable-integration/004_refresh_work.pgtap.sql` -- prove coalescing, monotonic generations, append-only attempts, CAS races/expiry, retries/exhaustion/successors, catalogue FKs, deduplicated incidents, and effective-role privileges.
- [x] `package.json` -- add the new Vitest contract file to `contracts:check`.
- [x] `_bmad-output/project-context.md` -- record the durable inbox contract and unchanged legacy cutover boundary.

**Acceptance Criteria:**
- Given any registered or unknown completion outcome, when transition is requested, then the catalogue alone controls state, budget, backoff, incident, and successor behavior; unknown codes fail closed.
- Given direct operational-table access, when any application role attempts it, then it fails; only minimum service-role RPC capabilities succeed.

## Spec Change Log

## Review Triage Log

### 2026-08-15 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 7: (high 0, medium 5, low 2)
- defer: 0
- reject: 21
- addressed_findings:
  - `[medium]` `[patch]` Provider event ID now comes only from explicit `event_id` / `webhook_id` keys (plain and `data[...]`); added a webhook test for `data[event_id]`.
  - `[medium]` `[patch]` Operator successor unique-violation on an already-open root now returns typed `rejected_retryable`; pgTAP covers a second successor.
  - `[medium]` `[patch]` Record fails closed when an existing delivery identity belongs to a different source root; pgTAP covers the mismatch.
  - `[medium]` `[patch]` pgTAP now asserts claim is refused while `claimable_after` is still in the future.
  - `[medium]` `[patch]` pgTAP now exercises heartbeat CAS success and stale-generation `lease_superseded`.
  - `[low]` `[patch]` pgTAP now records a new delivery after `succeeded` and asserts a distinct claimable intent.
  - `[low]` `[patch]` Stale-complete pgTAP now asserts email redaction in stored attempt/intent error text.

## Auto Run Result

Status: done

Summary: Accepted Booqable webhooks persist a PII-free receipt and coalesce it onto one claimable/leased intent before the unchanged legacy fetch. Service-role-only CAS RPCs, a 13-code catalogue, a 3-attempt 30s/120s retry budget, and visible terminal states are in place. Review patches tightened event-id extraction, successor/mismatch races, and pgTAP coverage.

Files changed:
- `../../src/lib/booqable/contracts/refresh-work.ts` — versioned states, catalogue, retry policy, schemas, and migration pointer
- `../../src/lib/booqable/contracts/index.ts` — export the refresh-work contract
- `../../supabase/migrations/20260815140000_persist_authoritative_refresh_work.sql` — operational tables, catalogue seed, and service-role CAS RPCs
- `../../src/app/api/webhooks/booqable/route.ts` — persist accepted work before `syncBooqableOrder`
- `../../tests/booqable-contracts/refresh-work.test.ts` — catalogue completeness, unknown-code fail-closed, migration parity
- `../../tests/booqable-containment/webhook.test.ts` — persist-before-fetch, fail-loud persist, provider-event-id path
- `../../supabase/tests/database/booqable-integration/004_refresh_work.pgtap.sql` — coalesce, CAS, retry, successor, privileges, review patches
- `../../package.json` — include the new contract file in `contracts:check`
- `../project-context.md` — record the durable inbox contract and legacy cutover boundary
- `spec-2-7-persist-and-recover-authoritative-refresh-work.md` — this spec

Review findings breakdown:
- patches applied: 7 (medium 5, low 2)
- items deferred: 0
- items rejected: 21

Follow-up review recommendation: true (patched high 0, medium 5, low 2; score `3 × 5 + 1 × 2 = 17`)

Verification performed:
- `npx tsc --noEmit` — pass
- `npm run lint` — pass (19 existing `<img>` warnings only; none new)
- `npm run contracts:check` — 5 files, 62 tests pass
- `npm run test:unit` — 15 files, 195 tests pass
- `npx supabase test db` — 11 files, 303 tests pass (local DB already reset onto the patched migration)
- `npm run db:types` — succeeded (stdout only; no app consumer)

Residual risks:
- Legacy `syncBooqableOrder` still writes canonical rows; cutover is a later story.
- No Story 2.8 worker yet, so claim/heartbeat/complete/reclaim are callable APIs without a scheduler.
- Unknown-code completions leave the lease held until a registered complete, expiry, or reclaim.
- Delivery HMAC is keyed with `BOOQABLE_WEBHOOK_SECRET`; rotating that secret changes future HMAC identities only.

## Verification

**Commands:**
- `npx tsc --noEmit` and `npm run lint` -- strict checks pass without new warnings.
- `npm run contracts:check` and `npm run test:unit` -- all contract/webhook tests pass.
- `npx supabase db reset && npx supabase test db` -- idempotent local migration and all pgTAP suites pass.
- `npm run db:types` -- generation succeeds without an app consumer.
