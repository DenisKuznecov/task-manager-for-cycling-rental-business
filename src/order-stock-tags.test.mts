import assert from "node:assert/strict";
import { test } from "node:test";
import { attachStockDisplayIdsToItems } from "./lib/order-stock-tags.ts";

test("drawer qty-2: both stock tags sit on the matching line; parents stay untagged", () => {
  const items = attachStockDisplayIdsToItems(
    [
      { booqable_line_id: "bundle-l", title: "Road bundle L" },
      { booqable_line_id: "bike-l", title: "Aventura L" },
      { booqable_line_id: "helm-l", title: "Helmet L" },
    ],
    [
      {
        booqable_line_id: "bike-l",
        bike_display_id: "ECF/L-1",
        closed_at: null,
      },
      {
        booqable_line_id: "bike-l",
        bike_display_id: "ECF/L-2",
        closed_at: null,
      },
      {
        booqable_line_id: "bike-l",
        bike_display_id: "ECF/OLD",
        closed_at: "2026-08-01T00:00:00Z",
      },
    ],
  );

  assert.deepEqual(
    items.map((item) => item.booqable_line_id),
    ["bundle-l", "bike-l", "helm-l"],
    "parent and sibling lines stay in the order",
  );
  assert.deepEqual(items[0]?.stock_display_ids, []);
  assert.deepEqual(items[1]?.stock_display_ids, ["ECF/L-1", "ECF/L-2"]);
  assert.deepEqual(items[2]?.stock_display_ids, []);
});

test("padded item line id still receives both qty-2 tags", () => {
  const items = attachStockDisplayIdsToItems(
    [{ booqable_line_id: "  bike-l  ", title: "Aventura L" }],
    [
      {
        booqable_line_id: "bike-l",
        bike_display_id: "ECF/L-1",
        closed_at: null,
      },
      {
        booqable_line_id: "bike-l",
        bike_display_id: "ECF/L-2",
        closed_at: null,
      },
    ],
  );

  assert.deepEqual(items[0]?.stock_display_ids, ["ECF/L-1", "ECF/L-2"]);
});
