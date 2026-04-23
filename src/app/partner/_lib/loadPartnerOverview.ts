import { createClient } from "@/src/utils/supabase/server";
import type { PartnerBookingRow, PartnerOrder } from "../_components/types";

const RECENT_ORDERS_LIMIT = 5;
export const ORDERS_PAGE_SIZE = 10;

export async function loadRecentOrders(
  partnerId: string | null | undefined,
): Promise<PartnerOrder[]> {
  if (!partnerId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, status, starts_at, stops_at, amount_in_cents, customers(name, email, phone)",
    )
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false })
    .limit(RECENT_ORDERS_LIMIT);

  return (data as PartnerOrder[] | null) ?? [];
}

export async function loadPartnerOrdersPage(
  partnerId: string | null | undefined,
  page: number,
  query: string = "",
): Promise<{ orders: PartnerBookingRow[]; count: number }> {
  if (!partnerId) return { orders: [], count: 0 };

  const from = (page - 1) * ORDERS_PAGE_SIZE;
  const to = from + ORDERS_PAGE_SIZE - 1;

  const supabase = await createClient();
  let request = supabase
    .from("partner_bookings_view")
    .select("*", { count: "exact" })
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });

  const trimmed = query.trim();
  if (trimmed) {
    const escaped = trimmed.replace(/[,()]/g, "");
    request = request.or(
      `order_number_text.ilike.%${escaped}%,customer_name.ilike.%${escaped}%,customer_email.ilike.%${escaped}%`,
    );
  }

  const { data, count } = await request.range(from, to);

  return {
    orders: (data as PartnerBookingRow[] | null) ?? [],
    count: count ?? 0,
  };
}
