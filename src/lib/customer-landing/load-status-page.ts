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
    .from("customer_sync_list")
    .select(
      "id, name, email, phone, birthday, address_street, address_city, address_region, address_zip, address_country, booqable_customer_id, google_status, google_error, holded_status, holded_error, mailchimp_status, mailchimp_error",
      { count: "exact" },
    );

  const trimmed = query.trim();
  if (trimmed) {
    const escaped = trimmed.replace(/[,()]/g, "");
    if (escaped) {
      queryBuilder = queryBuilder.ilike("name", `%${escaped}%`);
    }
  }

  const { data, error, count } = await queryBuilder
    .order("synced_at", { ascending: false })
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
