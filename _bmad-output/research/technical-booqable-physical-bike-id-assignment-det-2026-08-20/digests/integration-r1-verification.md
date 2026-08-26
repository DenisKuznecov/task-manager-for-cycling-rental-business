# Integration round 1 — normal-validation spot check

## Claim 1 — Physical assignment relationship path

- Status: verified
- Source: [Booqable API v4 documentation](https://developers.booqable.com/v4.html)
- Publisher: Booqable
- Publication date: n.d.
- Accessed: 2026-08-20
- Semantic check: The order endpoint permits nested relationships `lines → planning → stock_item_plannings → stock_item`. The fulfillment section confirms that stock-item assignments create or remove `StockItemPlannings`.
- Confidence: High.
- Correction: Present the complete dotted include string as a candidate pending a live request; the docs establish the hierarchy but do not provide that full request example.

## Claim 2 — `order.updated` and assignment webhook semantics

- Status: unverified
- Source: [Booqable API v4 documentation](https://developers.booqable.com/v4.html)
- Publisher: Booqable
- Publication date: n.d.
- Accessed: 2026-08-20
- Semantic check: The currently retrieved page did not contain `order.updated` or a webhook section. It also provided no assignment-trigger, retry, duplicate-delivery, ordering, or payload guarantees.
- Confidence: High for the absence of documented guarantees; low for whether `order.updated` remains documented elsewhere.
- Correction: State that `order.updated` was observed during the initial documentation pass but could not be confirmed on a fresh retrieval of the current official page. Keep all assignment-trigger behavior experimental.

## Claim 3 — Stable identity choice

- Status: verified
- Source: [How to track rental stock items individually](https://help.booqable.com/en/articles/1209362-how-to-track-rental-stock-items-individually)
- Publisher: Booqable
- Publication date: Displayed “Updated yesterday”; interpreted as 2026-08-19.
- Accessed: 2026-08-20
- Semantic check: Booqable explicitly describes product identifiers as adjustable, allows users to set their own, and lists the identifier as editable.
- Confidence: High.
- Correction: Describe `stock_items.id` as the safer documented API key, not as formally guaranteed immutable forever. The source proves human-identifier mutability, not an explicit permanence guarantee for the UUID.

## Disconfirming evidence

No disconfirming statement was found in the retrieved official sources.
