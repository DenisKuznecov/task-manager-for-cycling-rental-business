import { createClient } from "@/src/utils/supabase/server";
import {
  toLandingListRow,
  type CustomerLandingDbRow,
  type CustomerLandingListRow,
} from "./status-rows";

export { toLandingListRow } from "./status-rows";
export type {
  CustomerLandingDbRow,
  CustomerLandingListRow,
  DestCell,
  DestCellStatus,
} from "./status-rows";

export const CUSTOMERS_LANDING_PAGE_SIZE = 10;

export async function loadCustomersLandingPage(
  page: number,
  query: string = "",
): Promise<{
  customers: CustomerLandingListRow[];
  count: number;
  error: string | null;
}> {
  const from = (page - 1) * CUSTOMERS_LANDING_PAGE_SIZE;
  const to = from + CUSTOMERS_LANDING_PAGE_SIZE - 1;
  const supabase = await createClient();
  let queryBuilder = supabase
    .from("customers")
    .select(
      "id, name, booqable_customer_id, landing_google_status, landing_google_error, landing_holded_status, landing_holded_error, landing_mailchimp_status, landing_mailchimp_error",
      { count: "exact" },
    )
    .not("landing_at", "is", null);

  const trimmed = query.trim();
  if (trimmed) {
    const escaped = trimmed.replace(/[,()]/g, "");
    if (escaped) {
      queryBuilder = queryBuilder.ilike("name", `%${escaped}%`);
    }
  }

  const { data, error, count } = await queryBuilder
    .order("landing_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("loadCustomersLandingPage:", error);
    return { customers: [], count: 0, error: error.message };
  }

  return {
    customers: ((data as CustomerLandingDbRow[] | null) ?? []).map(
      toLandingListRow,
    ),
    count: count ?? 0,
    error: null,
  };
}
