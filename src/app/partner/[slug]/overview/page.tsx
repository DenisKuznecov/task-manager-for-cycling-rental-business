import React from "react";
import { notFound } from "next/navigation";
import { RecentBookings } from "../../_components/RecentBookings";
import { OverviewStats } from "../../_components/OverviewStats";
import { resolvePartnerBySlug } from "../../_lib/resolvePartner";
import { loadRecentOrders } from "../../_lib/loadPartnerOverview";

export default async function PartnerSlugOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Layout already guards role and existence, but re-resolve to get the id.
  // resolvePartnerBySlug is wrapped in React.cache() so this is a no-op fetch.
  const partner = await resolvePartnerBySlug(slug);
  if (!partner) {
    notFound();
  }

  const recentOrders = await loadRecentOrders(partner.id);

  return (
    <>
      <OverviewStats />
      <RecentBookings
        orders={recentOrders}
        viewAllHref={`/partner/${slug}/bookings`}
      />
    </>
  );
}
