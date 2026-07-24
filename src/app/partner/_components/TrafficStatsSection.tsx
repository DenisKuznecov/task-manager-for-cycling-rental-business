import React from "react";
import { TrafficStats } from "./TrafficStats";
import {
  loadPartnerTraffic,
  type BookingsTimeframe,
} from "../_lib/loadPartnerOverview";

interface TrafficStatsSectionProps {
  slug: string | null | undefined;
  timeframe: BookingsTimeframe;
}

/**
 * Streams promo-page traffic independently of the sales data. Wrapped in a
 * <Suspense> boundary by the overview pages so a slow PostHog query never gates
 * the rest of the dashboard.
 */
export async function TrafficStatsSection({
  slug,
  timeframe,
}: TrafficStatsSectionProps) {
  const traffic = await loadPartnerTraffic(slug, timeframe);

  return (
    <TrafficStats
      dailyTraffic={traffic.dailyTraffic}
      totalViews={traffic.totalViews}
      totalVisitors={traffic.totalVisitors}
      viewsChangePct={traffic.viewsChangePct}
      visitorsChangePct={traffic.visitorsChangePct}
      bookBikePeople={traffic.bookBikePeople}
      bookToursPeople={traffic.bookToursPeople}
      utmBreakdown={traffic.utmBreakdown}
      error={traffic.error}
    />
  );
}
