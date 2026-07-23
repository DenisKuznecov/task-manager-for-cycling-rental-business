import { createClient } from "@/src/utils/supabase/server";
import {
  loadOrdersPage,
  ORDERS_PAGE_SIZE,
} from "@/src/lib/orders";
import type {
  PartnerBookingRow,
  PartnerDailyStat,
  PartnerOrder,
} from "../_components/types";

export interface PartnerMarketingLink {
  id: string;
  title: string;
  short_url: string;
  long_url: string;
}

export {
  ORDERS_PAGE_SIZE,
  resolveTimeframe,
  computeDateThreshold,
} from "@/src/lib/orders";
export type { BookingsTimeframe } from "@/src/lib/orders";
export { loadPartnerTraffic } from "@/src/lib/posthog/traffic";
export type { PartnerDailyTraffic } from "../_components/types";

const RECENT_ORDERS_LIMIT = 5;

export async function loadRecentOrders(
  partnerId: string | null | undefined,
): Promise<{ orders: PartnerOrder[]; error: string | null }> {
  if (!partnerId) return { orders: [], error: null };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, status, starts_at, stops_at, amount_in_cents, customers(name, email, phone)",
    )
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false })
    .limit(RECENT_ORDERS_LIMIT);

  if (error) {
    console.error("loadRecentOrders:", error);
    return { orders: [], error: error.message };
  }

  return { orders: (data as unknown as PartnerOrder[] | null) ?? [], error: null };
}

export async function loadPartnerOrdersPage(
  partnerId: string | null | undefined,
  page: number,
  query: string = "",
  dateThreshold: string | null = null,
): Promise<{ orders: PartnerBookingRow[]; count: number; error: string | null }> {
  if (!partnerId) return { orders: [], count: 0, error: null };
  return loadOrdersPage(partnerId, page, query, dateThreshold);
}

export async function loadPartnerDailyStats(
  partnerId: string | null | undefined,
  startDate: string | null,
): Promise<{ stats: PartnerDailyStat[]; error: string | null }> {
  if (!partnerId) return { stats: [], error: null };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_partner_daily_stats", {
    p_partner_id: partnerId,
    p_start_date: startDate,
  });

  if (error) {
    console.error("loadPartnerDailyStats:", error);
    return { stats: [], error: error.message };
  }

  return { stats: (data as PartnerDailyStat[] | null) ?? [], error: null };
}

export async function loadPartnerMarketingLinks(
  partnerId: string | null | undefined,
): Promise<{ links: PartnerMarketingLink[]; error: string | null }> {
  if (!partnerId) return { links: [], error: null };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketing_links")
    .select("id, title, short_url, long_url")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("loadPartnerMarketingLinks:", error);
    return { links: [], error: error.message };
  }

  return { links: (data as PartnerMarketingLink[] | null) ?? [], error: null };
}

export function normalizeCommissionRate(
  value: number | string | null | undefined,
): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return parsed <= 1 ? parsed * 100 : parsed;
}
