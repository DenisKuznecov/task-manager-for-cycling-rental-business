---
title: 'Mailchimp review-request tag on order.stopped'
type: 'feature'
created: '2026-09-01'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: 'ccd096ee5d1321c2d3242893852d602fa5072200'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A paid Zapier Zap tags the Mailchimp subscriber with `review-request` when a Booqable order is stopped. This app already receives `order.stopped` and upserts Mailchimp members, but never applies that tag.

**Approach:** On `order.stopped`, GET the order for the customer email, find-or-create Mailchimp tag `review-request`, find the subscriber (do not create), and add the tag. Tagging is a sibling of today's order webhook work — it does not depend on workshop apply. Tag failure never changes webhook HTTP status. Logs only. Zapier cutover is out of scope.

## Boundaries & Constraints

**Always:**
- Same listener `/api/webhooks/booqable`. Only `event=order.stopped` tags. Other `order.*` keep today's order handling.
- Webhook form is signal-only (`event` + `data[id]`). Tagger receives the order id and GETs the order through `src/lib/booqable`. Email is that order's customer email. Do not read email from the form. Do not use workshop apply output as the email source.
- Find-or-create tag `review-request` on `MAILCHIMP_AUDIENCE_ID`. Find member by email hash. Do not create or upsert a subscriber.
- Missing email, missing subscriber, or already-tagged → log and continue. Already-tagged is success (do not remove/re-add).
- Tag/Mailchimp/env/Booqable-GET failure → `console.error` with `[review-request/mailchimp]`. Tagging never changes webhook HTTP status (order-path `200`/`500` stays whatever today's order handling already returns).
- Dest writes use `customerWebhookDestWritesAllowed()` (preview/staging never; localhost only with `CUSTOMER_WEBHOOK_DEST_WRITES`). Reuse `MAILCHIMP_API_KEY`, `MAILCHIMP_AUDIENCE_ID`, `mailchimpSubscriberHash`, `mailchimpDataCenter`, existing Basic auth.
- Inject the tagger from the route like landing. Do not fold tagging into `reconcileBooqableOrder` or any workshop apply path.
- Only `src/lib/booqable` calls Booqable. Mailchimp stays server-only.

**Ask First:**
- Creating a subscriber when missing.
- Returning `500` because tagging failed.
- Any `/customers` (or other) status for this tag.
- Remove-then-re-add to re-trigger journeys.
- PATCH/DELETE Booqable webhook endpoints or turning off the Zapier Zap.
- Changing the tag name or audience.

**Never:**
- Change `writeMailchimpMember` or landing upsert behavior.
- Fail, skip, or rewrite workshop reconcile because tagging failed or dest writes are off.
- Depend on workshop apply succeeding (or returning a snapshot) before tagging.
- UI, persistence, migrations, in-app retry, or backfill of past stopped orders.
- Create a subscriber. Invent an email. Read email from the webhook body.
- Commit secrets or ship them to the browser. Apply migrations remotely.
- New Booqable subscription or a second webhook URL.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path | `order.stopped`, dest writes on, order customer has email, member exists | Tag `review-request` on that member | N/A |
| Other order event | `order.reserved` or any non-stopped `order.*` | Today's order handling only; no tagger call | N/A |
| No email | Order has no customer or email is blank | No Mailchimp write | `console.error` prefix |
| Subscriber missing | GET member 404 | No create; no tag | `console.error` prefix |
| Already tagged | Member already has `review-request` | Success; do not remove/re-add | N/A |
| Tag/API/env/GET fail | Mailchimp 5xx, missing env, Booqable GET fail, or tagger throw | Today's order HTTP unchanged | `console.error` prefix |
| Dest writes off | Local default, preview, or staging | Today's order handling; tagger not called | N/A |
| Order handling fails | `order.stopped` but today's order path would `500` | Tagger still runs if dest writes on; HTTP still `500` | existing order path |

</frozen-after-approval>

## Code Map

- `src/lib/workshop/application/sync-env.ts:29-41` -- classify returns `"order"` for every `order.*` (`workshop-sync.test.mts:133-136`). Dispatch (`:81-144`) must read the raw `event` string; only `order.stopped` tags. Workshop lives in this file because the shared webhook already does; tagging is an injected sibling, not apply.
- `src/lib/workshop/application/sync-env.ts:128-143` -- today's order branch calls `reconcileOrder` and maps HTTP from `ok`/`code`. Keep that. If `event` is `order.stopped` and `customerWebhookDestWritesAllowed(env)`, also call an injected tagger with the order id (`try/catch`). Do not wait on reconcile `ok`. Do not pass a snapshot.
- `src/lib/workshop/application/sync-env.ts:20-27` -- dest-write gate. Do not use `workshopSyncAllowed()` for Mailchimp.
- `src/lib/workshop/application/reconcile-order.ts` -- read-only. Do not add tagging here.
- `src/lib/booqable/fetch-source-snapshot.ts:162-186` -- existing order GET (include already has customer). Tagger uses this (or the same adapter) for email only.
- `src/lib/booqable/parse-source-snapshot.ts:137-148` -- customer `attributes.email`. Read that field; do not run apply. Do not treat the workshop snapshot type as a required dependency.
- `src/app/api/webhooks/booqable/route.ts:44-47` -- inject the tagger beside landing / reconcile. Secret, `workshopSyncAllowed`, and HTTP mapping stay unchanged.
- `src/lib/customer-landing/mailchimp.ts:10-18,85-107,165-239` -- reuse hash, DC, `memberUrl`, Basic `anystring:${apiKey}`. Add find-or-create-tag + GET-member + add-tag. Do not alter `writeMailchimpMember` / `putMember`.
- `src/lib/customer-landing/land-customer.ts:38-39` -- landing still upserts members; tagging must not go through it.
- `src/workshop-sync.test.mts:128-250` -- extend dispatch: stopped + dest on → tagger(orderId); reserved → not; dest off / tagger throw / reconcile fail → matrix.
- `src/customer-landing.test.mts:15-20,331+` -- Mailchimp fetch fixtures for tag/member/tag-add; keep upsert assertions.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/customer-landing/mailchimp.ts` -- find-or-create `review-request`, GET member by hash, add tag; leave `writeMailchimpMember` unchanged -- Mailchimp half of the Zap
- [x] `src/lib/customer-landing/` -- order-id tagger: Booqable GET → email → Mailchimp tag APIs -- no workshop apply
- [x] `src/lib/workshop/application/sync-env.ts` -- on `order.stopped` + dest writes, call injected tagger with order id (sibling of reconcile); swallow tag failures -- tagging does not own HTTP
- [x] `src/app/api/webhooks/booqable/route.ts` -- inject the tagger -- same adapter seam as landing
- [x] `src/workshop-sync.test.mts` + `src/customer-landing.test.mts` -- lock the I/O matrix -- stopped-only, find-only subscriber, independent of apply

**Acceptance Criteria:**
- Given `order.stopped` and dest writes allowed, when the order customer's email matches an existing Mailchimp member, then that member has tag `review-request`.
- Given any non-stopped `order.*`, when dispatch runs, then the tagger is not called.
- Given tagging fails or the subscriber/email is missing, when the order path would have returned `200`, then it still returns `200` and no subscriber is created.
- Given dest writes are not allowed, when `order.stopped` is dispatched, then today's order handling still runs and Mailchimp is not called.
- Given today's order path fails, when `order.stopped` is dispatched and dest writes are on, then the tagger is still called and HTTP stays `500`.

## Spec Change Log

## Design Notes

Workshop reconcile already runs on every `order.*` because that is the existing shared webhook — it is not part of this product. Tagging must not wait for apply or reuse apply's snapshot. The tagger GETs the order itself (`fetchSourceOrderDocument` already sideloads customer email). That is a second Booqable GET on `order.stopped` and is the cost of keeping the features independent. Classify cannot tell stopped from reserved — dispatch must read `event`. Mailchimp member-tags accept a name (`status: active`); GET member 404 means skip, not create. Local dest writes stay behind `CUSTOMER_WEBHOOK_DEST_WRITES`.

## Verification

**Commands:**
- `npm run test:workshop-sync` -- expected: pass, including new dispatch cases
- `npm run test:customer-landing` -- expected: pass, including new tag cases; existing upsert tests unchanged

## Suggested Review Order

**Dispatch seam**

- Only `order.stopped` plus dest writes starts the sibling tagger
  [`sync-env.ts:134`](../../src/lib/workshop/application/sync-env.ts#L134)

- Tag failures are swallowed; HTTP still comes from reconcile
  [`sync-env.ts:136`](../../src/lib/workshop/application/sync-env.ts#L136)

- Route injects the tagger next to landing and reconcile
  [`route.ts:48`](../../src/app/api/webhooks/booqable/route.ts#L48)

**Order-id tagger**

- Second Booqable GET; email from included customer only
  [`tag-review-request.ts:43`](../../src/lib/customer-landing/tag-review-request.ts#L43)

**Mailchimp tag APIs**

- Find-or-create `review-request`, GET member, add tag; never upsert
  [`mailchimp.ts:425`](../../src/lib/customer-landing/mailchimp.ts#L425)

- Already-tagged logs and returns; no remove/re-add
  [`mailchimp.ts:444`](../../src/lib/customer-landing/mailchimp.ts#L444)

**Tests**

- Stopped-only, dest-off, throw still reconciles, await delayed tagger
  [`workshop-sync.test.mts:252`](../../src/workshop-sync.test.mts#L252)

- Find-only subscriber, no email invent, no landing upsert
  [`customer-landing.test.mts:878`](../../src/customer-landing.test.mts#L878)
