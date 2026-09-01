---
title: 'Production Booqable customer webhook events'
type: 'chore'
created: '2026-09-01'
status: 'done'
route: 'one-shot'
---

# Production Booqable customer webhook events

## Intent

**Problem:** Local already receives Booqable `customer.created` and `customer.updated`. Production still received only `order.*`, so landed contacts would never arrive after the merge.

**Approach:** After fail-closed was live on `echelon-cycling-hub-admin.vercel.app`, PATCH the existing production `webhook_endpoints` row to add the two customer events and keep every current `order.*`. Do not create a second endpoint or change the URL host.

## Suggested Review Order

**Production subscription**

- PATCH only the existing production endpoint; keep the Vercel host and all `order.*` events
  [`webhook-cutover.md:81`](../specs/spec-booqable-customer-created-sync/webhook-cutover.md#L81)

**Fail-closed handler already on production**

- Form `event` selects land vs order reconcile; unknown events write nothing
  [`route.ts:16`](../../src/app/api/webhooks/booqable/route.ts#L16)

- Only `customer.created` and `customer.updated` may take the land path
  [`sync-env.ts:23`](../../src/lib/workshop/application/sync-env.ts#L23)
