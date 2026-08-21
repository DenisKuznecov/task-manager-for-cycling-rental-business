# Booqable tenant spike evidence

Captured 2026-08-21 against the live company shop. Agent `GET`s only. Raw files in gitignored `scripts/booqable-spike/captures/`. Customer PII redacted.

**Order:** number `344`, id `e96d8bcf-703c-4606-a5fc-38467d524332`, status `reserved`, window `2026-12-10T10:00:00Z`–`2026-12-12T17:00:00Z`.

**Stock include (first HTTP 200 with planning):** `lines,lines.planning,lines.planning.stock_item_plannings,lines.planning.stock_item_plannings.stock_item`

**Adapter include (HTTP 200 after cancel, combined):** `customer,coupon,lines,lines.planning,lines.planning.stock_item_plannings,lines.planning.stock_item_plannings.stock_item,lines.item` — sideloads `customers`, lines, products, plannings, SIP, stock_items (`coupon` absent on this order).

| Measurement | Observed | Notes |
|-------------|----------|-------|
| Include path | Stock path HTTP 200 in 254ms. Combined adapter include HTTP 200 in 205ms. | First stock candidate accepted. Combined `customer,coupon,…,lines.item` later verified on the canceled order. `lines.item.product_group` did not sideload `product_groups`. |
| Reserved, no physical bike | No `stock_items`; every `plannings.relationships.stock_item_plannings.data` is `[]` | 12 lines / 12 plannings. Bike product line present plus bundle parent and add-on lines. Stable at 0/1/5/30s. |
| Workshop-tag field | `products.attributes.tag_list` | Bike product `7244c65d-0302-47c6-b97f-ce14cf7e5fb8` has `workshop-road-bike` (also `2025`, `2026`, `focus`, `road`, `ultegra di2`). `orders.tag_list` is `[]`. `product_groups` not sideloaded. |
| Add-ons (bundle order, observed) | Bike and add-ons are **siblings under the bundle line**, not children of the bike | Bundle line `0e223a6d-…` has `parent_line_id` null; `lines.item` type `bundles`; bundle `tag_list` includes `workshop-road-bike-bundle`. Bike + every add-on line has `parent_line_id` = that bundle id. Helmet/Protect+/options tagged `rental`; bottle `boutique`; shoes `addon`+`rental`. `line_type` is `charge`. |
| Add-ons (flat / no bundle) | Observed on order 344 after human rebuilt the lines | 3 root lines, all `parent_line_id` null. No `bundles` in `included`. Bike: Focus ATLAS, `workshop-gravel-bike`, stock `GF/L-1` (`7a79eae8-b6bf-41b2-98b3-8f13c2484f91`). Helmet and pedals are sibling products (`rental` tags only). No parentage links those add-ons to the bike. |
| Add-on display (human decision) | Do **not** invent bike↔add-on linkage | Flat extras stay **order-level** and remain visible on order/task details so a mechanic can see them. Bundle children may still group by `parent_line_id` when present. |
| Physical identity | `stock_items.id` = `6f66ff22-a1ec-46c7-be73-c40a9be0664c`; display `identifier` = `RF89RIVXL-2` | Same stock UUID after remove+reselect. New SIP each time: first `c644fb3d-7a66-4420-b2f9-fc84d18da0fe`, reselect `8cbdc9a7-ebdb-45ae-9453-866e74b2d358`. Same `planning_id` `de7e12cf-5283-49d7-91d6-bb64482a7b35`. |
| Completed/cancelled mapping | UI reserved → `reserved`. Picked up → `started`. Returned → `stopped`. Cancel → `canceled` | Cancel from `stopped` was **not possible** in the UI; human reverted to `reserved` then cancelled. GET after cancel: `status`/`statuses`/`plannings`/`stock_item_plannings` all `canceled`. Stock `GF/L-1` still in `included`. `archived` not observed. Existing webhook skip list is `new`/`concept`; live `draft` not observed. |
| Webhook topic / body | not observed | No second webhook to local logger. Live app webhook not paused. Local capture-server received 0 POSTs. |
| Webhook auth | not observed on a live delivery | Logger mirrors `?secret=`. No live copy hit localhost. |
| Webhook retry / event id | not observed | `--fail-once` not exercised yet. |
| Assign lag | `{A}` already present on first GET after human report | SIP `created_at` `2026-08-21T13:24:47.854Z`. First GET `13:25:16.853Z` (~29s later, human delay). Samples 0/1/5/30s all `{A}`. Cannot claim sub-second API lag from mutation instant. `Retry-After` absent. |
| Remove lag | `{A} → ∅` already on first GET after human report | 0s (219ms), 1s (268ms), 5s (208ms), 30s (585ms): no `stock_items`, no `stock_item_plannings`. Same shape as reserved-no-bike. Lines/plannings still 12. |
| Replace `{A} → {B}` (different `stock_items.id`) | not observed | This product only has one physical item (`RF89RIVXL-2`). Reselect after empty is `∅ → {A}` with a **new SIP id**, not a different-id replace. Rapid A→B→C also not observed for the same reason. |
| Unrelated edit | Date + add-on change did **not** change assignment set `{A}` | `starts_at` `2026-12-10` → `2026-12-09`. Same SIP id `8cbdc9a7-ebdb-45ae-9453-866e74b2d358` (updated_at changed; not a new instance). Computer mount line `3d30211e-…` kept, `quantity` 1→0 (not deleted). Recalc price not separately visible. Webhook copies: none. |
| Rapid A→B→C | not observed | Product has only one stock item. Second order not authorized. |
| Debounce | not observed | No local webhook copies to measure coalescing. GET after human report always already showed current assignment. No numeric window claimed. |
| List timing (`page[size]=50`) | HTTP 200 in 304ms; 50 rows | `GET /api/4/orders?page[size]=50&page[number]=1&fields[orders]=id,status,number`. `Retry-After` absent. One page only. |
| `Retry-After` | not observed | No HTTP 429 on any spike GET; header `null`. Flooding to force 429 not authorized. |
| `order_fulfillments/specify` | skipped | Human-owned writes only; API specify not authorized. |

## Protocol log

### 1. Reserved, no bike — 2026-08-21T13:22:40Z

GET snapshots at 0s (278ms), 1s (245ms), 5s (277ms), 30s (287ms). Assignment set `∅` at every sample. `Retry-After` absent.

### 2. Assign A (`RF89RIVXL-2`) — 2026-08-21T13:25:16Z

Human assigned stock identifier `RF89RIVXL-2` on the Focus IZALCO line. GET at 0s (256ms), 1s (259ms), 5s (225ms), 30s (697ms) all returned assignment set `{6f66ff22-a1ec-46c7-be73-c40a9be0664c}`. Path: `order → lines → planning → stock_item_plannings → stock_item`. Tag path with `lines.item` returned `workshop-road-bike` on the product. Local webhook copies: none.

### 3. Remove A — 2026-08-21T13:27:30Z

Human unassigned `RF89RIVXL-2`. GET at 0/1/5/30s all returned assignment set `∅`. SIP and `stock_items` gone from `included`; bike product line remains. Local webhook copies: none.

### 4. Reselect same id after empty — 2026-08-21T13:33:29Z

Human could not pick a different stock item (only `RF89RIVXL-2` exists for this product). Reselect restored `{6f66ff22-a1ec-46c7-be73-c40a9be0664c}` at 0/1/5/30s. New SIP `8cbdc9a7-ebdb-45ae-9453-866e74b2d358` (`created_at` `2026-08-21T13:32:32.836Z`); first SIP `c644fb3d-…` did not return. Different-id replace `{A}→{B}` not observed. Local webhook copies: none.

### 5. Date change + remove computer mount — 2026-08-21T13:41:26Z

Human moved start date (order `updated_at` `13:40:20Z`) and set computer mount quantity to 0. GET at 0/1/5/30s: assignment still `{6f66ff22-…}` / SIP `8cbdc9a7-…`; `starts_at` `2026-12-09T10:00:00Z`; mount line still present with `quantity: 0`. Local webhook copies: none. Capture-server process ended ~13:40:30Z with 0 POSTs total.

### 6. List timing — 2026-08-21T13:42:08Z

GET list `page[size]=50` HTTP 200, 304ms, 50 rows, `Retry-After` absent.

### 7. Bundle vs flat add-on grouping — human note, 2026-08-21

Order 344 is a **bundle** booking. Observed: add-ons are not nested under the bike line; bike and add-ons are children of one bundle parent (`parent_line_id` = bundle line `0e223a6d-…`). Grouping add-ons to that bike is possible only because they share that parent.

Human: orders can also be created **without a bundle**, as separate bike + add-on products. Those lines sit at the same level, so add-on→bike assignment cannot be inferred from parentage.

### 8. Flat structure (bundle removed) — 2026-08-21T13:54:25Z

Human deleted the bundle and added three separate products. GET at 0/1/5/30s: 3 lines, 3 plannings, 0 bundles. Every `parent_line_id` is `null`. Assignment set is `{7a79eae8-b6bf-41b2-98b3-8f13c2484f91}` identifier `GF/L-1` (Focus ATLAS, `workshop-gravel-bike`); previous Izalco/`RF89RIVXL-2` lines are gone. Helmet and pedals have no parent linking them to the bike. New SIP `20f60722-7736-4020-9289-a60b5fc1e95e`. This is a product-line replacement, not a same-product `{A}→{B}` stock swap. Human decision: do not invent linkage; keep these add-ons visible as order-level details.

### 9. UI “picked up” — 2026-08-21T13:57:35Z

GET 0/1/5s: API `status` = `started` (not a “picked_up” string). All 3 plannings and the SIP are `started`. Stock `GF/L-1` still assigned.

GET 30s: API `status` = `stopped`, `entirely_stopped` true, SIP `stopped: true`. Order `updated_at` jumped to `13:57:41Z` (~1s after the 5s sample), so this is a **second mutation** during the window, not pickup itself becoming `stopped`. Human later confirmed that mutation was UI “returned”.

### 10. UI “returned” — 2026-08-21T13:59:01Z

GET 0/1/5/30s all `status` = `stopped`. Stock `GF/L-1` still assigned. `canceled` still not observed.

### 11. Cancel via reserved — 2026-08-21T14:01:08Z

Human could not cancel from returned (`stopped`); reverted to `reserved`, then cancelled. GET 0/1/5/30s: API `canceled` (one L). SIP and plannings `canceled`. Stock `GF/L-1` still present.
