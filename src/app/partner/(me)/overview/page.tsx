import React from "react";
import { createClient } from "@/src/utils/supabase/server";
import { RecentBookings } from "../../_components/RecentBookings";
import { OverviewStats } from "../../_components/OverviewStats";
import { resolveMyPartner } from "../../_lib/resolvePartner";
import type { PartnerOrder } from "../../_components/types";

export default async function PartnerOverviewPage() {
  const { partner } = await resolveMyPartner();
  const partnerId = partner?.id ?? null;

  let recentOrders: PartnerOrder[] = [];
  if (partnerId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("orders")
      .select(
        "id, starts_at, stops_at, amount_in_cents, customers(name, email, phone)",
      )
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(5);
    recentOrders = (data as PartnerOrder[] | null) ?? [];
  }

  return (
    <>
      <OverviewStats />
      <RecentBookings
        orders={recentOrders}
        viewAllHref="/partner/bookings"
      />
    </>
  );
}
