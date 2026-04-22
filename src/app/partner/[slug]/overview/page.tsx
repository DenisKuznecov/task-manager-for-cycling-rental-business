import React from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/src/utils/supabase/server";
import { RecentBookings } from "../../_components/RecentBookings";
import { OverviewStats } from "../../_components/OverviewStats";
import { resolvePartnerBySlug } from "../../_lib/resolvePartner";
import type { PartnerOrder } from "../../_components/types";

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

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, starts_at, stops_at, amount_in_cents, customers(name, email, phone)",
    )
    .eq("partner_id", partner.id)
    .order("created_at", { ascending: false })
    .limit(5);
  const recentOrders: PartnerOrder[] = (data as PartnerOrder[] | null) ?? [];

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
