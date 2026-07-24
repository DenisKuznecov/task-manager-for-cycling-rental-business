const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export function parseUtmParams(url: string): Array<{ key: string; value: string }> {
  try {
    const parsed = new URL(url);
    return UTM_KEYS.filter((k) => parsed.searchParams.has(k)).map((k) => ({
      key: k,
      value: parsed.searchParams.get(k)!,
    }));
  } catch {
    return [];
  }
}
