---
title: 'Technical research: Booqable physical bike ID assignment detection'
type: 'technical'
topic: 'Booqable physical bike ID assignment detection'
decision: 'Choose the smallest reliable integration mechanism for detecting physical bike assignment, removal, and replacement on reserved Booqable orders.'
source: 'native-run'
status: complete
preset: 'standard'
validation: 'normal'
created: '2026-08-20'
updated: '2026-08-20'
claims_verified: 2
claims_unverified: 2
claims_overturned: 0
---

# Technical research: Booqable physical bike ID assignment detection

**Decision this research serves:** Choose the smallest reliable integration mechanism for detecting physical bike assignment, removal, and replacement on reserved Booqable orders.

## Executive summary

Build a **snapshot reconciler**, not an event-payload processor. The current implementation already uses `order.updated` as a signal, then fetches the complete order instead of interpreting the webhook payload. Keep that flow. Add a staff-triggered **Sync latest data from Booqable** action that re-fetches relevant upcoming reserved orders, compares their current `stock_items.id` values with stored state, and creates or cancels bike tasks from the difference. Skip completed and cancelled orders.

Three findings drive this decision:

1. The current v4 API exposes physical assignments through order-line planning relationships, although the complete `include` parameter value needs live verification [1].
2. The retrieved official sources do not establish event coverage or webhook delivery guarantees for assignment, removal, or replacement. Fresh verification did not reproduce the initial pass's `order.updated` finding on the retrieved v4 page [2]. The official Zapier integration confirms only a broader “Updated Order” trigger [3].
3. Human-readable stock identifiers are editable, making the API resource ID the safer identity key without assuming Booqable formally guarantees UUID immutability [5].

**MVP decision:** use `order.updated` plus an explicit manual sync. Do not add automatic periodic polling. Task creation may wait until the webhook fires or staff run the sync action, which is an accepted operational dependency for MVP.

## Recommended architecture

Confidence: **medium-high** for snapshot reconciliation; **low** for any assignment webhook as the sole trigger.

1. **Reconcile and persist.** Implement one idempotent `reconcileOrder(orderId)` operation. Fetch the current physical assignments, serialize reconciliation per order, and persist the canonical assignment set or snapshot hash.
2. **Apply set-diff task semantics.** For previous set `P` and current set `C`, create tasks for `C − P`, cancel tasks for `P − C`, and retain tasks for `P ∩ C`. Treat replacement `{A} → {B}` as cancelling A and creating B; never transfer A's history. Use a uniqueness constraint equivalent to `(booqable_order_id, stock_item_id, task_kind)`.
3. **Trigger and recover.** Keep the existing `order.updated` handler: use the event only to identify the order, then fetch its authoritative state through the API. Add **Sync latest data from Booqable** for staff to reconcile relevant upcoming reserved orders on demand. Exclude completed and cancelled orders, prevent simultaneous sync runs, show the last successful sync time, and use the same reconciliation operation for both paths.
4. **Handle API failure.** Paginate until exhaustion. Retry requests after transient network failures and HTTP `5xx` or `429` responses, using exponential backoff and jitter. Honor `Retry-After` when present.

This design preserves the product rule that work history belongs to one physical bike.

## Controlled tenant spike

Use a disposable order containing a trackable bike product. Capture each webhook request, including its headers, body, delivery timestamp, and response attempts. Capture the API snapshot immediately and after 1, 5, and 30 seconds.

1. Reserve the generic product without selecting a bike; confirm that the snapshot has no physical stock item.
2. Assign bike A in the UI; record emitted topics and verify the v4 relationship path, complete `include` parameter value, resource ID, and read-after-write lag.
3. Remove A; verify snapshot transition `{A} → ∅`.
4. Replace A directly with B; verify the final state `{B}` and reconcile it as removing A and adding B.
5. Repeat assignment, removal, and replacement through `order_fulfillments/specify`; compare UI and API event behavior.
6. Make an unrelated order edit; confirm whether it triggers a broad update and produces a no-op reconciliation.
7. Perform rapid `A → B → C`; measure ordering, coalescing, stale payloads, and convergence.
8. Cause a timeout and return HTTP `500` responses from a test receiver; measure retries, duplicates, event identifiers, and authentication behavior. Trigger an API `429` response separately.

Required outputs:

- exact successful v4 relationship and `include` request;
- event behavior for every UI and API mutation;
- webhook retry, duplication, ordering, payload, and authentication behavior;
- measured read-after-write delay and chosen debounce window;
- manual sync request volume, duration, failure behavior, and any `429` responses;
- clear UI behavior for progress, last successful sync time, success, and failure.

**Acceptance rule:** both `order.updated` and the manual sync must call the same idempotent reconciler and converge on the correct physical-bike assignment after every tested mutation. A missing webhook is acceptable because staff can recover explicitly through manual sync.

## Integration evidence

### Snapshot reconciliation is feasible

Booqable distinguishes reserving a generic trackable product from selecting its specific physical stock item later, and it supports removing selected items [4]. The retrieved v4 documentation supports nested JSON:API relationships and documents this hierarchy [1]:

```text
order
└── lines
    └── planning
        └── stock_item_plannings
            └── stock_item
```

A candidate request is:

```text
GET /api/4/orders/{order_id}
  ?include=lines,lines.planning,
           lines.planning.stock_item_plannings,
           lines.planning.stock_item_plannings.stock_item
```

The complete dotted `include` parameter value has **not yet been verified** against a live order. Legacy v1 documentation independently confirms the planning and stock-item-planning model, but it should not guide new v4 request compatibility [7].

Booqable also makes the human-readable stock identifier adjustable [5]. Store `stock_items.id` as the safer physical-bike identity key and the human-readable stock identifier as mutable display metadata. This evidence does not prove a contractual permanence guarantee for the resource UUID.

### Events cannot yet be authoritative

An initial pass recorded `order.updated`, but fresh verification did not locate that topic on the retrieved v4 page [2]. The retrieved official sources do not define whether UI or API assignment, removal, or replacement emits an event. The official Zapier article lists an “Updated Order” trigger, but does not connect physical-stock assignment to that trigger or establish a mapping to public webhooks [3].

A secondary OpenAPI extraction identifies `POST /api/4/order_fulfillments/specify`, which is useful for testing API-driven assignment but is not authoritative for webhook side effects [6].

The retrieved v4 page documents Bearer authentication, employee-scoped access methods, JSON:API pagination, single-use signed requests, and HTTP `429` [8]. It does not specify numeric quotas, assignment-event payloads, webhook retry or ordering behavior, event IDs, receiver authentication, read-after-write lag, or an assignment change feed. Confidence in this documentation-silence finding is **medium**. These unknowns rule out an event-only design until measured.

## Sources and maintenance

### Source appendix

| Ref | Claim or finding supported | Publisher | Publication date | Accessed | Confidence |
|---|---|---|---|---|---|
| [1] | v4 order/planning/stock-item relationship hierarchy and nested includes | [Booqable API v4 documentation](https://developers.booqable.com/v4.html) | n.d. | 2026-08-20 | High for hierarchy; complete include string unverified |
| [2] | An initial pass recorded `order.updated`, but fresh verification did not find it on the retrieved v4 page; retrieved official sources do not establish an assignment-trigger contract | [Booqable API v4 documentation](https://developers.booqable.com/v4.html) | n.d. | 2026-08-20 | Low for topic availability; medium for documentation silence |
| [3] | Official Zapier integration lists Updated, Reserved, Started, and Stopped Order triggers | [Booqable help](https://help.booqable.com/en/articles/1202508-how-to-connect-booqable-to-other-applications-through-zapier) | n.d. | 2026-08-20 | High for trigger names; low for raw-webhook mapping |
| [4] | Trackable products can be reserved generically and assigned specific physical items later | [Booqable help](https://help.booqable.com/en/articles/99552-how-to-add-products-to-an-order) | 2026-08-19 | 2026-08-20 | High |
| [5] | Human stock/product identifiers are adjustable | [Booqable help](https://help.booqable.com/en/articles/1209362-how-to-track-rental-stock-items-individually) | n.d.; page showed “Updated yesterday” | 2026-08-20 | High |
| [6] | Secondary extraction identifies `POST /api/4/order_fulfillments/specify` | [API Evangelist OpenAPI extraction](https://raw.githubusercontent.com/api-evangelist/booqable/refs/heads/main/openapi/booqable-order-fulfillment-api-openapi.yml) | n.d. | 2026-08-20 | Medium |
| [7] | Legacy API independently confirms planning and stock-item-planning assignment semantics | [Booqable API v1 documentation](https://developers.booqable.com/v1.html) | n.d. | 2026-08-20 | High for legacy semantics |
| [8] | Retrieved v4 page documents authentication, pagination, request signing, and HTTP `429`, but does not state delivery details | [Booqable API v4 documentation](https://developers.booqable.com/v4.html) | n.d. | 2026-08-20 | High for documented features; medium for documentation silence |

### Source maintenance

The technical pack's one-month compatibility window was applied using the live-document access date where publishers provide no publication date.

- Re-check the v4 relationship path and accepted includes by **2026-09-20**.
- Re-check public webhook topic and delivery documentation by **2026-09-20**.
- Re-check stock-item identity fields and identifier editability by **2026-09-20**.
- Re-check authentication, pagination, and rate-limit guidance by **2026-09-20**.

No tracked claim is stale as of 2026-08-20. Earliest re-check: **2026-09-20**. A completed tenant test should trigger an immediate refresh because it can replace the principal unverified claim with observed evidence.
