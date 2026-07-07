import React from "react";
import { RecentBookings } from "../../_components/RecentBookings";
import { OverviewStats } from "../../_components/OverviewStats";
import { TrafficStats } from "../../_components/TrafficStats";
import { DataLoadError } from "@/src/components/DataLoadError";
import { resolveMyPartner } from "../../_lib/resolvePartner";
import {
  computeDateThreshold,
  loadPartnerDailyStats,
  loadPartnerTraffic,
  loadRecentOrders,
  normalizeCommissionRate,
  resolveTimeframe,
} from "../../_lib/loadPartnerOverview";

export default async function PartnerOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ timeframe?: string }>;
}) {
  const { timeframe: timeframeParam } = await searchParams;
  const timeframe = resolveTimeframe(timeframeParam);
  const startDate = computeDateThreshold(timeframe);

  const { partner } = await resolveMyPartner();
  const [
    { orders: recentOrders, error: recentOrdersError },
    { stats: dailyStats, error: dailyStatsError },
    traffic,
  ] = await Promise.all([
    loadRecentOrders(partner?.id),
    loadPartnerDailyStats(partner?.id, startDate),
    loadPartnerTraffic(partner?.slug, timeframe),
  ]);

  // Traffic comes from an external best-effort source (PostHog); its failures
  // are surfaced inside TrafficStats only, never in the main sales banner.
  const loadError = dailyStatsError ?? recentOrdersError;

  let commissionRate = 0;

  if (partner?.id) {
    commissionRate = normalizeCommissionRate(partner.commission_rate);
  }

  return (
    <>
      {loadError ? (
        <DataLoadError
          title="Couldn't load partner overview"
          message={loadError}
        />
      ) : null}
      <OverviewStats
        dailyStats={dailyStats}
        commissionRate={commissionRate}
        timeframe={timeframe}
        partnerId={partner?.id ?? ""}
      />
      <TrafficStats
        dailyTraffic={traffic.dailyTraffic}
        totalViews={traffic.totalViews}
        totalVisitors={traffic.totalVisitors}
        error={traffic.error}
      />
      <RecentBookings orders={recentOrders} viewAllHref="/partner/bookings" />
    </>
  );
}
