# Integration and implementation reality — Round 1 digest

## Executive conclusion

Official documentation shows how to read physical-bike assignments, but does not document that assigning, removing, or replacing a stock item emits any webhook. It also omits webhook retry, ordering, duplicate-delivery, and signing guarantees.

The smallest defensible integration is:

1. Webhook-triggered order snapshot reconciliation, after verifying `order.updated` experimentally.
2. A low-frequency safety poll over active/reserved orders.
3. Set-diff processing keyed by immutable `stock_items.id`.
4. Replacement handled as independent removal of bike A and assignment of bike B—never task transfer.

If delayed detection is acceptable, polling-only is smaller and rests entirely on documented API behavior.

## Findings

### Finding 1 — A general order-update webhook exists; assignment semantics are undocumented

- Claim: Booqable API v4 documents a Webhooks resource and creation using the topic `order.updated`. No official statement was found that specifying, removing, or replacing a trackable stock item emits this topic, nor an exhaustive current list of order webhook topics.
- Source: [Booqable API v4 documentation](https://developers.booqable.com/v4.html)
- Publisher: Booqable
- Publication date: n.d.
- Accessed: 2026-08-20
- Confidence: High that `order.updated` exists; low that assignment changes trigger it.
- Claim class: Documented fact plus documented-silence finding.
- Semantic evidence: The webhook creation example uses `topic: "order.updated"`. No retrieved webhook section defined mutation-to-topic semantics.
- Qualification: A webhook's existence does not prove that this mutation reliably fires it.

### Finding 2 — Booqable exposes broad lifecycle triggers through its official Zapier integration

- Claim: Official support material lists `Reserved Order`, `Started Order`, `Stopped Order`, and `Updated Order` triggers. “Updated Order” responds to changes in order details, but the page does not name physical-stock assignment as a triggering detail.
- Source: [How to connect Booqable to other applications through Zapier](https://help.booqable.com/en/articles/1202508-how-to-connect-booqable-to-other-applications-through-zapier)
- Publisher: Booqable
- Publication date: n.d.
- Accessed: 2026-08-20
- Confidence: High for Zapier trigger availability; low for mapping those triggers to raw webhook topics or assignment behavior.
- Claim class: Official implementation evidence.
- Qualification: This supports broad change notification but does not prove Zapier uses the public Webhooks API, or that assignment-only edits produce `Updated Order`.

### Finding 3 — Assignment, deferred assignment, removal, and replacement are real order operations

- Claim: A trackable product can be reserved generically and assigned a specific stock item later, or a specific item can be selected in advance. When specific items are present, lowering quantity requires removing those stock items.
- Source: [How to add products to an order](https://help.booqable.com/en/articles/99552-how-to-add-products-to-an-order)
- Publisher: Booqable
- Publication date: Displayed “Updated yesterday”; interpreted as 2026-08-19.
- Accessed: 2026-08-20
- Confidence: High.
- Claim class: Current official product behavior.
- Design consequence: “Order contains one bike product” and “physical bike A is assigned” are different states.

### Finding 4 — Physical assignments are represented through planning relationships

- Claim: API v4 exposes nested relationships from an order’s lines through `planning`, then `stock_item_plannings`, then `stock_item`. JSON:API `include` supports dot-separated nested relationships.
- Source: [Booqable API v4 documentation](https://developers.booqable.com/v4.html)
- Publisher: Booqable
- Publication date: n.d.
- Accessed: 2026-08-20
- Confidence: Medium-high.
- Claim class: Documented API structure.
- Relevant names: `lines`, `planning`, `stock_item_plannings`, `stock_item`, and included resource type `stock_items`.
- Candidate retrieval shape:

```text
GET /api/4/orders/{order_id}
  ?include=lines,lines.planning,
           lines.planning.stock_item_plannings,
           lines.planning.stock_item_plannings.stock_item
```

- Qualification: The relationship hierarchy and nested-include mechanism are documented. The exact accepted include string requires verification against a live test order.
- Identifier choice: Use JSON:API `stock_items.id` as the task identity; do not use the human-readable stock identifier.

### Finding 5 — Human-readable stock identifiers are mutable

- Claim: Individually tracked stock has a user-adjustable product identifier, making it useful for display but unsafe as a stable integration key.
- Source: [How to track rental stock items individually](https://help.booqable.com/en/articles/1209362-how-to-track-rental-stock-items-individually)
- Publisher: Booqable
- Publication date: n.d.
- Accessed: 2026-08-20
- Confidence: High.
- Claim class: Official product behavior.
- Design consequence: Persist `stock_items.id` as identity and the human identifier as mutable display metadata.

### Finding 6 — A specific assignment operation exists, but secondary extraction cannot define guarantees

- Claim: Public API extraction derived from Booqable’s docs lists `POST /api/4/order_fulfillments/specify` as assigning specific stock items to trackable order lines.
- Sources: [API Evangelist Booqable repository](https://github.com/api-evangelist/booqable) and [Order Fulfillment OpenAPI](https://raw.githubusercontent.com/api-evangelist/booqable/refs/heads/main/openapi/booqable-order-fulfillment-api-openapi.yml)
- Publisher: API Evangelist
- Publication date: n.d.
- Accessed: 2026-08-20
- Confidence: Medium.
- Claim class: Credible secondary implementation evidence.
- Qualification: The repository says its OpenAPI was authored from public Booqable documentation and that schemas are simplified. It is useful for locating the operation, but not authoritative for webhook side effects.
- Test value: Compare this endpoint with UI assignment because the two mutation paths could emit different events.

### Finding 7 — Legacy v1 independently confirms physical IDs inside order planning data

- Claim: Legacy API v1 documents reserving trackable inventory using the product-group ID plus specific physical item IDs. Its order representation contains `plannings` and nested `stock_item_plannings`.
- Source: [Booqable API v1 documentation](https://developers.booqable.com/v1.html)
- Publisher: Booqable
- Publication date: n.d.
- Accessed: 2026-08-20
- Confidence: High for legacy semantics; low as a reason to build new integration code against v1.
- Claim class: Independent official compatibility evidence.
- Design consequence: This supports the planning/stock-item model, but v4 should be preferred for new work.

### Finding 8 — Operational guarantees are materially incomplete

- Claim: API v4 documents Bearer access tokens, single-use signed requests, JSON:API pagination, and HTTP `429`, but the retrieved docs do not specify numeric rate limits or webhook delivery guarantees.
- Source: [Booqable API v4 documentation](https://developers.booqable.com/v4.html)
- Publisher: Booqable
- Publication date: n.d.
- Accessed: 2026-08-20
- Confidence: High.
- Claim class: Documented constraints and negative finding.
- Exact documented details:
  - `Authorization: Bearer <access-token>`
  - Access methods are scoped to an employee.
  - Single-use request signing supports `ES256`, `RS256`, and `HS256`.
  - Signed-token expiry cannot exceed ten minutes.
  - Pagination uses `page[number]` and `page[size]`.
  - `429 Too Many Requests` means the client must slow down.
- Not found:
  - Numeric request quota or burst limit.
  - Guaranteed `Retry-After`.
  - Webhook timeout and retry schedule.
  - At-most-once or at-least-once delivery.
  - Event IDs or idempotency keys.
  - Ordering guarantees.
  - Webhook signature or secret verification semantics.
  - Payload schema for `order.updated`.
  - Read-after-write consistency or propagation lag.
  - A supported public activity/change-feed API for assignments.

## Provisional recommendation

Build one snapshot reconciler, not event-specific task logic:

1. Receive broad order webhooks and enqueue only the order ID.
2. Debounce briefly, then fetch the current order with physical stock-item relationships included.
3. Serialize reconciliation per order.
4. Store the canonical set of assigned `stock_items.id` values and a snapshot hash.
5. Periodically sweep active/reserved orders to recover missed webhooks.
6. Retry `429`, `5xx`, and transient network failures using exponential backoff with jitter; honor `Retry-After` if returned.
7. Paginate until exhaustion; do not assume one page.
8. Treat webhook payloads as hints, not assignment truth.
9. Until webhook authentication is verified, accept events only through an unguessable HTTPS endpoint and confirm every change with an authenticated API read.

A public activity/event feed was not evidenced, so it should not be selected.

For previous assignment set `P` and current assignment set `C`:

- `C − P`: create one task per newly assigned physical bike.
- `P − C`: invalidate one task per removed physical bike.
- `P ∩ C`: leave existing tasks unchanged.

Replacement `{bike-A} → {bike-B}` is therefore independent invalidation of A and creation of B. Recommended uniqueness key: `(order_id, stock_item_id, task_type)`. Creation and invalidation must both be idempotent.

## Controlled-test matrix

Use a disposable order containing a trackable bike product. Record every webhook request, headers, body, timestamp, response attempt, and API snapshot immediately and after 1, 5, and 30 seconds.

1. Reserve generic trackable product without a physical bike; record emitted topics and verify no `stock_items.id`.
2. Assign bike A through the Booqable UI; check `order.updated`, relationship path, UUID, and relevant `updated_at` fields.
3. Remove bike A through the UI; verify transition `{A} → ∅`.
4. Replace A directly with B; verify webhook count and transition `{A} → {B}`.
5. Repeat assignment, removal, and replacement through `POST /order_fulfillments/specify`; compare with UI behavior.
6. Start and stop an order with A assigned; distinguish assignment from fulfillment-state events.
7. Make an unrelated order edit; confirm broad update notification and no-op reconciliation.
8. Perform rapid `A → B → C`; check ordering, coalescing, stale payloads, and final convergence.
9. Return `500`, timeout, and `429` from the webhook receiver; measure retries and duplicates.
10. Fetch immediately after each mutation; establish read-after-write lag and select a debounce/retry window.

Webhook-triggered reconciliation is proven only if both UI and API assignment paths reliably produce a usable event across repeated runs. Otherwise, scheduled polling is the authoritative detector.

## Leads and gaps

- Verify the exact v4 include string on a live order.
- Determine whether UI and API assignment paths emit the same webhook behavior.
- Measure webhook delivery retries, duplicate behavior, ordering, and read-after-write lag.
- Confirm whether a supported webhook-authentication mechanism exists outside the public documentation retrieved.
- No supported public activity/change-feed API for assignments was found.

## Stop reason

Round 1 reached novelty exhaustion in public sources: official documentation exposes snapshot state but does not specify assignment-trigger or delivery semantics. Remaining load-bearing unknowns require a controlled tenant experiment rather than another web-search round.
