export type AssignmentStockTag = {
  booqable_line_id: string | null;
  bike_display_id: string | null;
  closed_at: string | null;
};

export function stockDisplayIdsByLine(
  instances: AssignmentStockTag[] | null | undefined,
): Map<string, string[]> {
  const tagsByLine = new Map<string, string[]>();
  for (const instance of instances ?? []) {
    if (instance.closed_at) continue;
    const lineId = instance.booqable_line_id?.trim();
    const tag = instance.bike_display_id?.trim();
    if (!lineId || !tag) continue;
    const tags = tagsByLine.get(lineId) ?? [];
    if (!tags.includes(tag)) tags.push(tag);
    tagsByLine.set(lineId, tags);
  }
  return tagsByLine;
}

export function attachStockDisplayIdsToItems<
  T extends { booqable_line_id: string },
>(
  items: T[] | null | undefined,
  instances: AssignmentStockTag[] | null | undefined,
): Array<T & { stock_display_ids: string[] }> {
  const tagsByLine = stockDisplayIdsByLine(instances);
  return (items ?? []).map((item) => ({
    ...item,
    stock_display_ids: tagsByLine.get(item.booqable_line_id?.trim()) ?? [],
  }));
}
