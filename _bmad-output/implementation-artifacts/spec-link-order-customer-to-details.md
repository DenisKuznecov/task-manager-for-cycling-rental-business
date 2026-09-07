---
title: 'Link order customers to details'
type: 'feature'
created: '2026-09-04'
status: 'done'
route: 'one-shot'
---

# Link order customers to details

## Intent

**Problem:** Staff viewing an order could see customer details but had no direct route to the richer customer drawer.

**Approach:** Include the related customer ID in order details and link authorized staff to `/customers?customer=<id>`. Mechanics may use the directory and drawer; partner users remain excluded.

## Suggested Review Order

**Order-to-customer navigation**

- The role check preserves partner isolation while enabling mechanics.
  [`OrderDetailsDrawer.tsx:224`](../../src/components/orders/OrderDetailsDrawer.tsx#L224)

- The customer name opens the existing URL-driven drawer accessibly.
  [`OrderDetailsDrawer.tsx:281`](../../src/components/orders/OrderDetailsDrawer.tsx#L281)

- The loader selects the stable ID required by the customer route.
  [`orders.ts:89`](../../src/lib/orders.ts#L89)

**Customer access boundary**

- Mechanics can reach the customer directory; partners retain their dedicated redirect.
  [`layout.tsx:7`](../../src/app/customers/layout.tsx#L7)

- The Customers navigation entry matches the permitted staff roles.
  [`nav-config.ts:17`](../../src/ui/layouts/nav-config.ts#L17)

**Coverage**

- Focused source contracts lock the URL, role set, and keyboard focus state.
  [`customers-landing-status.test.mts:90`](../../src/customers-landing-status.test.mts#L90)
