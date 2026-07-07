import React from "react";
import { notFound } from "next/navigation";
import { RecentBookings } from "../../_components/RecentBookings";
import { OverviewStats } from "../../_components/OverviewStats";
import { TrafficStats } from "../../_components/TrafficStats";
import { DataLoadError } from "@/src/components/DataLoadError";
import { resolvePartnerBySlug } from "../../_lib/resolvePartner";
import {
  computeDateThreshold,
  loadPartnerDailyStats,
  loadPartnerTraffic,
  loadRecentOrders,
  normalizeCommissionRate,
  resolveTimeframe,
} from "../../_lib/loadPartnerOverview";

export default async function PartnerSlugOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ timeframe?: string }>;
}) {
  const [{ slug }, { timeframe: timeframeParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  const timeframe = resolveTimeframe(timeframeParam);
  const startDate = computeDateThreshold(timeframe);

  // Layout already guards role and existence, but re-resolve to get the id.
  // resolvePartnerBySlug is wrapped in React.cache() so this is a no-op fetch.
  const partner = await resolvePartnerBySlug(slug);
  if (!partner) {
    notFound();
  }

  const commissionRate = normalizeCommissionRate(partner.commission_rate);
  const [
    { orders: recentOrders, error: recentOrdersError },
    { stats: dailyStats, error: dailyStatsError },
    traffic,
  ] = await Promise.all([
    loadRecentOrders(partner.id),
    loadPartnerDailyStats(partner.id, startDate),
    loadPartnerTraffic(partner.slug, timeframe),
  ]);

  // Traffic comes from an external best-effort source (PostHog); its failures
  // are surfaced inside TrafficStats only, never in the main sales banner.
  const loadError = dailyStatsError ?? recentOrdersError;

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
        partnerId={partner.id}
      />
      <TrafficStats
        dailyTraffic={traffic.dailyTraffic}
        totalViews={traffic.totalViews}
        totalVisitors={traffic.totalVisitors}
        error={traffic.error}
      />
      <RecentBookings
        orders={recentOrders}
        viewAllHref={`/partner/${slug}/bookings`}
      />
    </>
  );
}
