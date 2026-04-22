import React from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/src/utils/supabase/server";
import { AllBookingsTable } from "../../_components/AllBookingsTable";
import { resolvePartnerBySlug } from "../../_lib/resolvePartner";
import type { PartnerOrder } from "../../_components/types";

export default async function PartnerSlugBookingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const partner = await resolvePartnerBySlug(slug);
  if (!partner) {
    notFound();
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, status, starts_at, stops_at, amount_in_cents, customers(name, email, phone)",
    )
    .eq("partner_id", partner.id)
    .order("created_at", { ascending: false });
  const allOrders: PartnerOrder[] = (data as PartnerOrder[] | null) ?? [];

  return <AllBookingsTable orders={allOrders} />;
}
