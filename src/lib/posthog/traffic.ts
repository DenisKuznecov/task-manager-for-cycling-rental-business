import { unstable_cache } from "next/cache";
import type { BookingsTimeframe } from "@/src/lib/orders";
import type { PartnerDailyTraffic } from "@/src/app/partner/_components/types";

const DEFAULT_POSTHOG_HOST = "https://eu.i.posthog.com";

// Traffic counts are near-real-time: our unstable_cache TTL is the single
// source of staleness (max ~45s old), and each upstream call uses
// refresh: "force_blocking" so PostHog recomputes instead of returning its own
// (potentially older) cached query result.
const REVALIDATE_SECONDS = 45;

/**
 * Maps the dashboard time filter to a HogQL timestamp constraint. "all-time"
 * intentionally returns an empty string so the whole history is counted.
 */
function timeframeClause(timeframe: BookingsTimeframe): string {
  if (timeframe === "week") return "AND timestamp >= now() - INTERVAL 7 DAY";
  if (timeframe === "month") return "AND timestamp >= now() - INTERVAL 30 DAY";
  return "";
}

function dailySeriesQuery(pathname: string, timeframe: BookingsTimeframe): string {
  const escapedPath = pathname.replace(/'/g, "''");
  return `SELECT toDate(timestamp) AS day, count() AS views, count(DISTINCT distinct_id) AS visitors
FROM events
WHERE event = '$pageview'
  AND properties.$pathname = '${escapedPath}'
  ${timeframeClause(timeframe)}
GROUP BY day
ORDER BY day`;
}

function windowTotalsQuery(pathname: string, timeframe: BookingsTimeframe): string {
  const escapedPath = pathname.replace(/'/g, "''");
  // Window-wide unique visitors is NOT the sum of daily uniques, so it needs
  // its own count(DISTINCT ...) over the whole timeframe.
  return `SELECT count() AS views, count(DISTINCT distinct_id) AS visitors
FROM events
WHERE event = '$pageview'
  AND properties.$pathname = '${escapedPath}'
  ${timeframeClause(timeframe)}`;
}

type PostHogQueryResponse = {
  results?: unknown;
  error?: string | null;
  detail?: string;
  query_status?: { error?: boolean; error_message?: string | null };
};

const isDev = process.env.NODE_ENV === "development";

/**
 * Builds the Error thrown on a failed PostHog query. The message stays generic
 * in production but includes the response detail in development so auth, scope,
 * and HogQL syntax problems are debuggable from the thrown error alone.
 */
function hogQLError(status: number, detail: string | null): Error {
  if (isDev && detail) {
    return new Error(`PostHog query failed (${status}): ${detail}`);
  }
  return new Error(`PostHog query failed (${status})`);
}

async function runHogQLQuery(
  host: string,
  projectId: string,
  apiKey: string,
  query: string,
): Promise<unknown[]> {
  const response = await fetch(`${host}/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    // force_blocking bypasses PostHog's own query-result cache so freshness is
    // controlled solely by our unstable_cache TTL below.
    body: JSON.stringify({
      query: { kind: "HogQLQuery", query },
      refresh: "force_blocking",
    }),
  });

  // Read the body as text first so we can log/inspect it even when it isn't
  // valid JSON (e.g. an HTML error page from a proxy).
  const rawBody = await response.text();
  let json: PostHogQueryResponse | null = null;
  try {
    json = JSON.parse(rawBody) as PostHogQueryResponse;
  } catch {
    json = null;
  }

  if (!response.ok) {
    console.error("runHogQLQuery:", {
      status: response.status,
      body: json ?? rawBody.slice(0, 500),
    });
    const detail =
      json?.detail ?? json?.error ?? json?.query_status?.error_message ?? null;
    throw hogQLError(response.status, detail);
  }

  // PostHog can return a 200 with the failure described inside the body.
  const embeddedError =
    json?.error ?? json?.detail ?? json?.query_status?.error_message ?? null;
  if (embeddedError) {
    console.error("runHogQLQuery:", { status: response.status, body: json });
    throw hogQLError(response.status, embeddedError);
  }

  const results = json?.results;
  return Array.isArray(results) ? results : [];
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

type TrafficResult = {
  dailyTraffic: PartnerDailyTraffic[];
  totalViews: number;
  totalVisitors: number;
};

async function fetchTraffic(
  host: string,
  projectId: string,
  apiKey: string,
  pathname: string,
  timeframe: BookingsTimeframe,
): Promise<TrafficResult> {
  const [dailyRows, totalRows] = await Promise.all([
    runHogQLQuery(host, projectId, apiKey, dailySeriesQuery(pathname, timeframe)),
    runHogQLQuery(host, projectId, apiKey, windowTotalsQuery(pathname, timeframe)),
  ]);

  const dailyTraffic: PartnerDailyTraffic[] = dailyRows
    .map((row) => {
      const cells = Array.isArray(row) ? row : [];
      const rawDate = cells[0];
      const date = typeof rawDate === "string" ? rawDate : String(rawDate ?? "");
      return {
        date,
        views: toNumber(cells[1]),
        visitors: toNumber(cells[2]),
      };
    })
    .filter((row) => row.date.length > 0);

  const totalsRow = Array.isArray(totalRows[0]) ? (totalRows[0] as unknown[]) : [];

  return {
    dailyTraffic,
    totalViews: toNumber(totalsRow[0]),
    totalVisitors: toNumber(totalsRow[1]),
  };
}

/**
 * Loads a partner's promo-page traffic (daily series + window totals) from
 * PostHog, aligned to the dashboard's time filter.
 *
 * Never throws: missing config, network failures, and empty states all resolve
 * to an empty result so the rest of the dashboard still renders.
 */
export async function loadPartnerTraffic(
  slug: string | null | undefined,
  timeframe: BookingsTimeframe,
): Promise<{
  dailyTraffic: PartnerDailyTraffic[];
  totalViews: number;
  totalVisitors: number;
  error: string | null;
}> {
  const empty = { dailyTraffic: [], totalViews: 0, totalVisitors: 0 };

  if (!slug) return { ...empty, error: null };

  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? DEFAULT_POSTHOG_HOST;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

  if (!projectId || !apiKey) {
    console.error(
      "loadPartnerTraffic: missing POSTHOG_PROJECT_ID or POSTHOG_PERSONAL_API_KEY",
    );
    return { ...empty, error: "Traffic analytics is not configured." };
  }

  // Promo pages live at https://www.echeloncyclinghub.com/partners{slug} and
  // slugs are stored with a leading slash (e.g. "/hotel-valdemossa").
  const normalizedSlug = slug.startsWith("/") ? slug : `/${slug}`;
  const pathname = `/partners${normalizedSlug}`;

  try {
    // The HogQL endpoint is a POST, which Next's automatic fetch Data Cache
    // (GET-only) won't cache. unstable_cache gives us caching whose key + tag
    // both include the timeframe, so switching filters resolves the right entry
    // (one cache entry per (pathname, timeframe); two upstream POSTs on a miss).
    const getCachedTraffic = unstable_cache(
      () => fetchTraffic(host, projectId, apiKey, pathname, timeframe),
      ["partner-traffic", pathname, timeframe],
      {
        revalidate: REVALIDATE_SECONDS,
        tags: [`posthog:traffic:${pathname}:${timeframe}`],
      },
    );

    const result = await getCachedTraffic();
    return { ...result, error: null };
  } catch (err) {
    console.error("loadPartnerTraffic:", err);
    return { ...empty, error: "Couldn't load traffic." };
  }
}
