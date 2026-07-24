import { unstable_cache } from "next/cache";
import type { BookingsTimeframe } from "@/src/lib/orders";
import type {
  PartnerDailyTraffic,
  PartnerUtmBreakdown,
  PartnerUtmBreakdownRow,
} from "@/src/app/partner/_components/types";

const DEFAULT_POSTHOG_HOST = "https://eu.i.posthog.com";
const PRODUCTION_HOST = "www.echeloncyclinghub.com";
const BOOK_BIKE_EVENT = "user_clicked_on_partner_book_bike";
const BOOK_TOURS_EVENT = "user_clicked_on_partner_book_tours";

// Traffic counts are near-real-time: our unstable_cache TTL is the single
// source of staleness (max ~45s old), and each upstream call uses
// refresh: "force_blocking" so PostHog recomputes instead of returning its own
// (potentially older) cached query result.
const REVALIDATE_SECONDS = 45;

function dailySeriesQuery(pathname: string, timeframe: BookingsTimeframe): string {
  const escapedPath = pathname.replace(/'/g, "''");
  const timeClause =
    timeframe === "week"
      ? "AND timestamp >= now() - INTERVAL 7 DAY"
      : timeframe === "month"
        ? "AND timestamp >= now() - INTERVAL 30 DAY"
        : "";
  return `SELECT toDate(timestamp) AS day, count() AS views, count(DISTINCT distinct_id) AS visitors
FROM events
WHERE event = '$pageview'
  AND properties.$pathname = '${escapedPath}'
  AND properties.$host = '${PRODUCTION_HOST}'
  ${timeClause}
GROUP BY day
ORDER BY day`;
}

/**
 * Returns six columns per row:
 *   [0] views            – page-view count, current window
 *   [1] visitors         – unique visitors, current window (exact COUNT DISTINCT)
 *   [2] views_change_pct – integer % vs previous equal-length window, or NULL for all-time
 *   [3] visitors_change_pct – same for unique visitors
 *   [4] book_bike_people – distinct users who clicked Book Bike, current window
 *   [5] book_tours_people – distinct users who clicked Book Tours, current window
 *
 * For week/month the outer WHERE restricts the full table scan to 2× the window
 * so PostHog doesn't scan the whole event history.
 *
 * For all-time there is no comparable previous period; pct columns are literal
 * NULL so the trend badge is hidden on the UI.
 */
function combinedTotalsQuery(pathname: string, timeframe: BookingsTimeframe): string {
  const escapedPath = pathname.replace(/'/g, "''");

  if (timeframe === "all-time") {
    // HogQL requires explicit ELSE NULL in CASE WHEN expressions.
    return `SELECT
  countIf(event = '$pageview') AS views,
  count(DISTINCT CASE WHEN event = '$pageview' THEN distinct_id ELSE NULL END) AS visitors,
  NULL AS views_change_pct,
  NULL AS visitors_change_pct,
  count(DISTINCT CASE WHEN event = '${BOOK_BIKE_EVENT}' THEN distinct_id ELSE NULL END) AS book_bike_people,
  count(DISTINCT CASE WHEN event = '${BOOK_TOURS_EVENT}' THEN distinct_id ELSE NULL END) AS book_tours_people
FROM events
WHERE properties.$pathname = '${escapedPath}'
  AND properties.$host = '${PRODUCTION_HOST}'`;
  }

  const days = timeframe === "week" ? 7 : 30;
  const doubleDays = days * 2;
  const curr = `timestamp >= now() - INTERVAL ${days} DAY`;
  // Previous window = equally-sized window immediately before the current one.
  const prev = `timestamp >= now() - INTERVAL ${doubleDays} DAY AND timestamp < now() - INTERVAL ${days} DAY`;

  // toFloat on both operands before subtraction ensures float arithmetic
  // (avoids UInt64 wraparound on negative deltas) and float division.
  // nullIf(..., 0) propagates NULL instead of divide-by-zero when there are no
  // events in the previous window; round() of NULL stays NULL.
  // HogQL requires explicit ELSE NULL in CASE WHEN expressions.
  return `SELECT
  countIf(event = '$pageview' AND ${curr}) AS views,
  count(DISTINCT CASE WHEN event = '$pageview' AND ${curr} THEN distinct_id ELSE NULL END) AS visitors,
  round(
    (toFloat(countIf(event = '$pageview' AND ${curr})) - toFloat(countIf(event = '$pageview' AND ${prev})))
    / nullIf(toFloat(countIf(event = '$pageview' AND ${prev})), 0) * 100
  ) AS views_change_pct,
  round(
    (toFloat(count(DISTINCT CASE WHEN event = '$pageview' AND ${curr} THEN distinct_id ELSE NULL END))
     - toFloat(count(DISTINCT CASE WHEN event = '$pageview' AND ${prev} THEN distinct_id ELSE NULL END)))
    / nullIf(toFloat(count(DISTINCT CASE WHEN event = '$pageview' AND ${prev} THEN distinct_id ELSE NULL END)), 0) * 100
  ) AS visitors_change_pct,
  count(DISTINCT CASE WHEN event = '${BOOK_BIKE_EVENT}' AND ${curr} THEN distinct_id ELSE NULL END) AS book_bike_people,
  count(DISTINCT CASE WHEN event = '${BOOK_TOURS_EVENT}' AND ${curr} THEN distinct_id ELSE NULL END) AS book_tours_people
FROM events
WHERE properties.$pathname = '${escapedPath}'
  AND properties.$host = '${PRODUCTION_HOST}'
  AND timestamp >= now() - INTERVAL ${doubleDays} DAY`;
}

/**
 * Groups the promo page's views by a UTM parameter.
 *
 * lower(trim(...)) merges case/whitespace variants of the same value (this
 * project's links have e.g. both "TikTok" and lowercase values), and
 * nullIf(..., '') folds empty values into NULL, so all non-UTM traffic lands
 * in a single NULL row that the UI renders as "Direct / other".
 */
function utmBreakdownQuery(
  pathname: string,
  timeframe: BookingsTimeframe,
  param: "utm_source" | "utm_medium",
): string {
  const escapedPath = pathname.replace(/'/g, "''");
  const timeClause =
    timeframe === "week"
      ? "AND timestamp >= now() - INTERVAL 7 DAY"
      : timeframe === "month"
        ? "AND timestamp >= now() - INTERVAL 30 DAY"
        : "";
  return `SELECT nullIf(lower(trim(properties.${param})), '') AS label, count() AS views
FROM events
WHERE event = '$pageview'
  AND properties.$pathname = '${escapedPath}'
  AND properties.$host = '${PRODUCTION_HOST}'
  ${timeClause}
GROUP BY label
ORDER BY views DESC`;
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

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

type TrafficResult = {
  dailyTraffic: PartnerDailyTraffic[];
  totalViews: number;
  totalVisitors: number;
  viewsChangePct: number | null;
  visitorsChangePct: number | null;
  bookBikePeople: number;
  bookToursPeople: number;
  utmBreakdown: PartnerUtmBreakdown;
};

/** Rows arrive as [label, views] tuples, already sorted by views descending. */
function parseBreakdownRows(rows: unknown[]): PartnerUtmBreakdownRow[] {
  return rows.map((row) => {
    const cells = Array.isArray(row) ? row : [];
    const rawLabel = cells[0];
    return {
      label:
        typeof rawLabel === "string" && rawLabel.length > 0 ? rawLabel : null,
      views: toNumber(cells[1]),
    };
  });
}

async function fetchTraffic(
  host: string,
  projectId: string,
  apiKey: string,
  pathname: string,
  timeframe: BookingsTimeframe,
): Promise<TrafficResult> {
  const [dailyRows, totalRows, sourceRows, mediumRows] = await Promise.all([
    runHogQLQuery(host, projectId, apiKey, dailySeriesQuery(pathname, timeframe)),
    runHogQLQuery(host, projectId, apiKey, combinedTotalsQuery(pathname, timeframe)),
    runHogQLQuery(
      host,
      projectId,
      apiKey,
      utmBreakdownQuery(pathname, timeframe, "utm_source"),
    ),
    runHogQLQuery(
      host,
      projectId,
      apiKey,
      utmBreakdownQuery(pathname, timeframe, "utm_medium"),
    ),
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

  // Combined totals row columns:
  //   [0] views  [1] visitors  [2] views_change_pct  [3] visitors_change_pct
  //   [4] book_bike_people  [5] book_tours_people
  const totals = Array.isArray(totalRows[0]) ? (totalRows[0] as unknown[]) : [];

  return {
    dailyTraffic,
    totalViews: toNumber(totals[0]),
    totalVisitors: toNumber(totals[1]),
    viewsChangePct: toNullableNumber(totals[2]),
    visitorsChangePct: toNullableNumber(totals[3]),
    bookBikePeople: toNumber(totals[4]),
    bookToursPeople: toNumber(totals[5]),
    utmBreakdown: {
      source: parseBreakdownRows(sourceRows),
      medium: parseBreakdownRows(mediumRows),
    },
  };
}

/**
 * Loads a partner's promo-page traffic (daily series + window totals) from
 * PostHog, aligned to the dashboard's time filter.
 *
 * Only events from the production host (www.echeloncyclinghub.com) are counted.
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
  viewsChangePct: number | null;
  visitorsChangePct: number | null;
  bookBikePeople: number;
  bookToursPeople: number;
  utmBreakdown: PartnerUtmBreakdown;
  error: string | null;
}> {
  const empty = {
    dailyTraffic: [],
    totalViews: 0,
    totalVisitors: 0,
    viewsChangePct: null,
    visitorsChangePct: null,
    bookBikePeople: 0,
    bookToursPeople: 0,
    utmBreakdown: { source: [], medium: [] },
  };

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
    // (one cache entry per (pathname, timeframe); four upstream POSTs on a miss).
    // "v3" in the key busts any stale cache entries from before the UTM
    // breakdown queries were introduced (old entries lack utmBreakdown).
    const getCachedTraffic = unstable_cache(
      () => fetchTraffic(host, projectId, apiKey, pathname, timeframe),
      ["partner-traffic", "v3", pathname, timeframe],
      {
        revalidate: REVALIDATE_SECONDS,
        tags: [`posthog:traffic:${pathname}:${timeframe}`],
      },
    );

    const result = await getCachedTraffic();
    // Spread empty first so any field missing from a partially-stale cached
    // entry falls back to its safe default instead of becoming undefined.
    return { ...empty, ...result, error: null };
  } catch (err) {
    console.error("loadPartnerTraffic:", err);
    return { ...empty, error: "Couldn't load traffic." };
  }
}
