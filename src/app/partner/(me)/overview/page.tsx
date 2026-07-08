import React, { Suspense } from "react";
import { RecentBookings } from "../../_components/RecentBookings";
import { OverviewStats } from "../../_components/OverviewStats";
import { TrafficStatsSection } from "../../_components/TrafficStatsSection";
import { TrafficStatsSkeleton } from "../../_components/TrafficStatsSkeleton";
import { DataLoadError } from "@/src/components/DataLoadError";
import { resolveMyPartner } from "../../_lib/resolvePartner";
import {
  computeDateThreshold,
  loadPartnerDailyStats,
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
  ] = await Promise.all([
    loadRecentOrders(partner?.id),
    loadPartnerDailyStats(partner?.id, startDate),
  ]);

  // Traffic comes from an external best-effort source (PostHog); its failures
  // are surfaced inside TrafficStats only, never in the main sales banner. It
  // also streams independently so a slow PostHog query never gates the rest.
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
      <Suspense
        key={`traffic-${partner?.slug ?? ""}-${timeframe}`}
        fallback={<TrafficStatsSkeleton />}
      >
        <TrafficStatsSection slug={partner?.slug} timeframe={timeframe} />
      </Suspense>
      <RecentBookings orders={recentOrders} viewAllHref="/partner/bookings" />
    </>
  );
}
