import React from "react";
import { RecentBookings } from "../../_components/RecentBookings";
import { OverviewStats } from "../../_components/OverviewStats";
import { resolveMyPartner } from "../../_lib/resolvePartner";
import { loadRecentOrders } from "../../_lib/loadPartnerOverview";

export default async function PartnerOverviewPage() {
  const { partner } = await resolveMyPartner();
  const recentOrders = await loadRecentOrders(partner?.id);

  return (
    <>
      <OverviewStats />
      <RecentBookings orders={recentOrders} viewAllHref="/partner/bookings" />
    </>
  );
}
