---
title: 'Booqable tenant spike'
type: 'chore'
created: '2026-08-21'
status: 'done'
baseline_commit: 'bf0b97df80f49a5c35afc69817953b2fc5cc767e'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-automating-mechanics-daily-work/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-automating-mechanics-daily-work/booqable-reconciliation.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-echelon-cycling-hub-admin-2026-08-20/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/research/technical-booqable-physical-bike-id-assignment-det-2026-08-20/research.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Apply and sync cannot start until AD-2 / AD-10 have a live-verified include path, workshop-tag field, terminal-status mapping, debounce, webhook behavior, and sync numbers. Those values must not be guessed.

**Approach:** Capture-only spike. The human creates one throwaway order in the company Booqable shop and does every assign / remove / replace. The agent only GETs snapshots, logs webhooks on localhost, writes evidence, and amends AD-2 / AD-10 from what was observed.

## Boundaries & Constraints

**Always:**
- Human owns every Booqable order change. Agent `GET`s only, using existing `BOOQABLE_COMPANY_SLUG` / `BOOQABLE_API_KEY`.
- The live shop webhook may write this throwaway order into the app database. That is accepted; the human will cancel it later like other test orders. Do not pause or retarget the live webhook. Spike scripts still must not call `syncBooqableOrder`.
- Log webhook method, URL (secret redacted), headers, raw body, time, and our HTTP status when a copy reaches the local logger. After each mutation, snapshot at 0s, 1s, 5s, and 30s.
- Human protocol: reserved with no physical bike → assign A → remove A → replace with B → unrelated edit → rapid A→B→C. Record topic, include path, `stock_items.id`, tags, add-ons, status, lag, retries.
- Evidence is measured or explicit `not observed` plus why. Then a dated AD-2 / AD-10 amendment (and SPEC open question, companion, research). No invented values.
- Gitignore raw captures. Redact customer PII and webhook secrets in committed evidence.

**Ask First:**
- Adding a second Booqable webhook aimed at the local logger (do not change the live webhook URL).
- Any Booqable write, including `order_fulfillments/specify`.
- Flooding the API to force HTTP `429`.
- A second order, or treating a missing local webhook copy as a failed spike (companion: missing webhook is later recoverable via manual sync).

**Never:**
- POST / PATCH / PUT / DELETE to Booqable (orders, stock, or their webhook settings).
- Write `customers` / `orders` / `order_items` / workshop tables, or hit `src/app/api/sandbox/booqable/sync-orders`.
- Edit `src/lib/booqable/sync.ts` or `src/app/api/webhooks/booqable/route.ts`.
- Deploy a capture route, or implement apply, leases, manual sync, or sync-health UI.
- Guess include, tag, status, debounce, `Retry-After`, page, lease, or `maxDuration` values.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Live webhook still on | Spike start | Proceed; throwaway order may appear in the app | Do not pause or retarget |
| Reserved, no bike | Human order number | No `stock_item`; webhook logged or `not observed` | Failed GET → stop; no evidence claim |
| Assign / remove / replace | Human UI mutation | Topic + include + ids + 0/1/5/30s lag | Do not retry by writing Booqable |
| Unrelated edit / rapid A→B→C | Human UI | Webhook yes/no; last GET wins; note coalescing | Do not write |
| Logger 500 / include probe | Local 500; candidate includes | Retry/event id if any; exact working include or `not observed` | 400/404 → next candidate; never invent |

</frozen-after-approval>

## Code Map

- `src/lib/booqable/sync.ts` L50–97 `fetchBooqableOrder` — include `customer,coupon,lines`; Bearer; 429 retry 3× (`2000 * attempt` ms). **Read-only.** L100–297 writes customer/order/lines — **do not call.**
- `src/app/api/webhooks/booqable/route.ts` L13–79 — `?secret=`; form `data[id]` / `data[status]` / `data[number]`; skips `new`/`concept`; then writes. **Read-only.** Mirror auth + form parse on the local logger only.
- `src/app/api/sandbox/booqable/sync-orders/route.ts` L32–37 — list `page[size]=50`. **Do not invoke.** Copy the list query only for a GET-only timing probe.
- `booqable-reconciliation.md` — verified 2026-08-21 include `customer,coupon,lines,lines.planning,lines.planning.stock_item_plannings,lines.planning.stock_item_plannings.stock_item,lines.item`.
- `ARCHITECTURE-SPINE.md` — AD-2 / AD-10 amended 2026-08-21 from evidence.

**New (local only):** `scripts/booqable-spike/fetch-snapshot.mjs` (GET include + timed re-reads); `capture-server.mjs` (localhost POST logger, optional one-shot 500, no Supabase); gitignored `captures/`; `_bmad-output/implementation-artifacts/booqable-spike-evidence.md`.

## Tasks & Acceptance

**Execution:**
- [x] `.gitignore` -- Ignore `scripts/booqable-spike/captures/` -- keep PII out of git
- [x] `scripts/booqable-spike/capture-server.mjs` -- Local POST logger (secret, form body, timestamps, optional 500); no `sync` / `@supabase` -- capture without DB writes
- [x] `scripts/booqable-spike/fetch-snapshot.mjs` -- GET-only include probe + 0/1/5/30s re-read -- verify the relationship path
- [x] `_bmad-output/implementation-artifacts/booqable-spike-evidence.md` -- One row per required measurement (include, tag field, add-ons, completed/cancelled mapping, webhook auth/retry, lag + debounce, list timing, `Retry-After`) -- spike output
- [x] `ARCHITECTURE-SPINE.md` -- Dated AD-2 / AD-10 amendment from evidence only -- unblock later apply/sync
- [x] `booqable-reconciliation.md` + `research.md` + `SPEC.md` -- Replace the open spike question with observed facts or `not observed` -- keep companions aligned

**Acceptance Criteria:**
- Given the live webhook still targeting the app, when the spike starts, then the agent proceeds without pausing it.
- Given a human-supplied order number, when `fetch-snapshot.mjs` runs, then it only `GET`s and records the first include that returns planning/stock items, or `not observed`.
- Given each protocol mutation, when captures exist, then evidence has topic (or none), assignment set, and lag samples, with no Booqable writes from this repo.
- Given evidence, when AD-2 / AD-10 are edited, then every new number or field name appears in the evidence file.
- Given `rg "from .@/src/lib/booqable/sync.|createClient|supabase" scripts/booqable-spike`, when run, then there are no matches.

## Spec Change Log

- 2026-08-21: Human renegotiation — throwaway order may hit the app database via the live webhook; do not pause or retarget it. Local logger is optional extra capture, not a replacement.
- 2026-08-21: Review patches — probe requires planning/stock on HTTP 200; list timing fails on non-OK; combined `customer,coupon,…,lines.item` include verified HTTP 200; AD-2/AD-10 note status-over-stock and `workshop-*-bundle` vs product tags.

## Design Notes

No Next.js capture route — preview/production must not inherit it. The live webhook may upsert the test order; that is accepted. A local logger only sees events if the human adds a second webhook; otherwise webhook bodies may be `not observed`. Skip API `specify` unless the human allows a write; note the skip in evidence.

## Verification

**Commands:**
- `rg "fetch\\(|method:" scripts/booqable-spike/*.mjs` -- expected: GET to `booqable.com` only; POST only on localhost
- `rg "from .@/src/lib/booqable/sync.|@supabase" scripts/booqable-spike` -- expected: no matches

**Manual checks (if no CLI):**
- Evidence covers every Deferred adapter-detail bullet, or says `not observed`.
- AD-2 / AD-10 diffs contain only names/numbers from evidence, with an amendment date.
- `git status` shows no `scripts/booqable-spike/captures/` files.

## Suggested Review Order

**Evidence then architecture**

- Start here: observed include, tags, statuses, and `not observed` rows
  [`booqable-spike-evidence.md:9`](booqable-spike-evidence.md#L9)

- Cancel spelling `canceled`, stock still included, UI path via reserved
  [`booqable-spike-evidence.md:20`](booqable-spike-evidence.md#L20)

- AD-2 fetch contract, SIP instance key, bundle vs flat add-ons
  [`ARCHITECTURE-SPINE.md:83`](../planning-artifacts/architecture/architecture-echelon-cycling-hub-admin-2026-08-20/ARCHITECTURE-SPINE.md#L83)

- AD-10 status map, skip `canceled` even with stock, no invented debounce
  [`ARCHITECTURE-SPINE.md:132`](../planning-artifacts/architecture/architecture-echelon-cycling-hub-admin-2026-08-20/ARCHITECTURE-SPINE.md#L132)

**GET-only capture scripts**

- Probe candidates; first HTTP 200 with planning/stock wins
  [`fetch-snapshot.mjs:19`](../../scripts/booqable-spike/fetch-snapshot.mjs#L19)

- Bearer GET only; never POST to Booqable
  [`fetch-snapshot.mjs:86`](../../scripts/booqable-spike/fetch-snapshot.mjs#L86)

- Skip a 200 that has no plannings or stock items
  [`fetch-snapshot.mjs:246`](../../scripts/booqable-spike/fetch-snapshot.mjs#L246)

**Companions**

- SPEC open spike question replaced with observed facts
  [`SPEC.md:96`](../specs/spec-automating-mechanics-daily-work/SPEC.md#L96)

**Peripherals**

- Ignore raw captures so customer PII stays out of git
  [`.gitignore:53`](../../.gitignore#L53)

