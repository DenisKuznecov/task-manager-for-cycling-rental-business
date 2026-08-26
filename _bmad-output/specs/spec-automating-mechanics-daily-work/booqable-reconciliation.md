# Booqable Reconciliation

## Integration Contract

Implement one idempotent reconciliation operation per Booqable order:

1. Fetch the complete authoritative order snapshot, including all physical stock-item assignments, rental dates, and add-ons.
2. Paginate to exhaustion. Do not apply a difference if any page fails.
3. Serialize reconciliation for the order.
4. Compare the previously persisted physical assignment set `P` with current set `C`.
5. Create tasks for `C − P`, cancel tasks for `P − C`, and retain tasks and history for `P ∩ C`.
6. Persist enough canonical assignment state to make later differences deterministic.

A direct replacement `{A} → {B}` cancels A and creates B; no state or history transfers. Enforce uniqueness equivalent to `(booqable_order_id, stock_item_id, task_kind)`.

Use `stock_items.id` as the physical-bike identity key. Treat the human-readable stock identifier as editable display metadata. This choice does not claim that Booqable contractually guarantees UUID permanence.

## Triggers and Recovery

- Keep the existing `order.updated` webhook as a signal that identifies an order, then fetch the full order instead of interpreting assignment details from the event payload.
- Route both `order.updated` and **Sync latest data from Booqable** through the same reconciliation operation.
- Manual sync checks every reserved Booqable order starting within the next seven days, including source orders with no existing task so newly assigned bikes can be discovered. It is not limited by the dashboard's visible task page. Completed and cancelled orders are skipped.
- Prevent simultaneous manual sync runs.
- Show progress where useful, last successful sync time, completion, and clear failure details.
- Do not add periodic polling. It is acceptable in MVP for task creation to wait for `order.updated` or a staff-triggered sync.

Retry transient network failures and HTTP `5xx` or `429` responses with exponential backoff and jitter. Honor `Retry-After`. A failed or partial fetch must preserve the prior canonical assignment state and existing tasks.

## Candidate v4 Read Path

The documented relationship hierarchy is:

```text
order
└── lines
    └── planning
        └── stock_item_plannings
            └── stock_item
```

The candidate request is:

```text
GET /api/4/orders/{order_id}
  ?include=customer,coupon,lines,lines.planning,
           lines.planning.stock_item_plannings,
           lines.planning.stock_item_plannings.stock_item,
           lines.item
```

**Verified 2026-08-21** on live order 344 (HTTP 200), including the combined string with `customer,coupon`. `lines.item` sideloads `products` (workshop `tag_list`) and `bundles`. `lines.item.product_group` did not sideload `product_groups`. Evidence: `_bmad-output/implementation-artifacts/booqable-spike-evidence.md`.

## Controlled Tenant Spike

Use a disposable order with a trackable bike product. Capture webhook headers, body, delivery time, and response attempts, plus API snapshots immediately and after 1, 5, and 30 seconds.

1. Reserve the generic product without a physical bike and confirm the snapshot contains no stock item.
2. Assign bike A in the UI and verify emitted topics, the v4 relationship/include path, resource ID, and read-after-write lag.
3. Remove A and verify `{A} → ∅`.
4. Replace A directly with B and verify final state `{B}` produces cancel A plus create B.
5. Repeat assignment, removal, and replacement through `order_fulfillments/specify`; compare UI and API event behavior.
6. Make an unrelated order edit and determine whether it triggers a broad update followed by no-op reconciliation.
7. Perform rapid `A → B → C` and measure ordering, coalescing, stale payloads, and convergence.
8. Exercise receiver timeout and HTTP `500`, then API `429`; measure retries, duplicates, event identifiers, authentication, and rate-limit behavior.

The spike must produce:

- the exact successful v4 relationship and `include` request;
- event behavior for every tested UI and API mutation;
- webhook retry, duplication, ordering, payload, and authentication behavior;
- measured read-after-write delay and the selected debounce window;
- manual sync request volume, duration, failure behavior, and observed `429` responses;
- verified UI behavior for progress, last successful sync, success, and failure.

Acceptance requires webhook and manual sync to call the same idempotent reconciler and converge after every tested mutation. Missing webhook delivery remains recoverable through manual sync.

### Spike results 2026-08-21

Live order 344. Evidence: `_bmad-output/implementation-artifacts/booqable-spike-evidence.md`. AD-2/AD-10 amended the same day.

Observed: include path above; unidentified = empty `stock_item_plannings`; `stock_items.id` + display `identifier`; workshop tag on `products.tag_list`; new SIP id on same-bike re-add; date change keeps SIP id; bundle add-ons grouped by `parent_line_id`; flat add-ons have null parent (order-level display only); UI reserved/`started`/`stopped`/`canceled`; list `page[size]=50` in 304ms.

Not observed: webhook copies (no second webhook), debounce ms, HTTP `429`/`Retry-After`, same-product `{A}→{B}` or rapid A→B→C, `order_fulfillments/specify`, receiver 500 retries. Missing webhook remains recoverable via manual sync.

## Evidence and Revalidation

Official sources establish generic reservation followed by later physical assignment, nested order/planning relationships, editable human identifiers, employee-scoped access methods, pagination, single-use signed requests, and HTTP `429`. They do not establish assignment-event coverage, delivery guarantees, payload semantics, retry/order behavior, event IDs, receiver authentication, read-after-write lag, or numeric quotas. The official Zapier “Updated Order” trigger does not prove public-webhook behavior.

Recheck v4 relationship/includes, webhook documentation, identity fields, authentication, pagination, and rate-limit guidance by **2026-09-20**. Tenant spike 2026-08-21 replaced the unverified include claim with a live HTTP 200; remaining `not observed` items stay unverified until re-measured.

Primary references:

- [Booqable API v4 documentation](https://developers.booqable.com/v4.html)
- [Booqable API v1 documentation](https://developers.booqable.com/v1.html)
- [Booqable: add products to an order](https://help.booqable.com/en/articles/99552-how-to-add-products-to-an-order)
- [Booqable: track rental stock individually](https://help.booqable.com/en/articles/1209362-how-to-track-rental-stock-items-individually)
- [Booqable Zapier integration](https://help.booqable.com/en/articles/1202508-how-to-connect-booqable-to-other-applications-through-zapier)
- [Secondary order-fulfillment OpenAPI extraction](https://raw.githubusercontent.com/api-evangelist/booqable/refs/heads/main/openapi/booqable-order-fulfillment-api-openapi.yml)
