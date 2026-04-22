import React from "react";
import { createClient } from "@/src/utils/supabase/server";
import { AllBookingsTable } from "../../_components/AllBookingsTable";
import { resolveMyPartner } from "../../_lib/resolvePartner";
import type { PartnerOrder } from "../../_components/types";

export default async function PartnerBookingsPage() {
  const { partner } = await resolveMyPartner();
  const partnerId = partner?.id ?? null;

  let allOrders: PartnerOrder[] = [];
  if (partnerId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("orders")
      .select(
        "id, status, starts_at, stops_at, amount_in_cents, customers(name, email, phone)",
      )
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false });
    allOrders = (data as PartnerOrder[] | null) ?? [];
  }

  return <AllBookingsTable orders={allOrders} />;
}
