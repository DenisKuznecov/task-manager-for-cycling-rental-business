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
): Promise<{
  customers: CustomerLandingListRow[];
  count: number;
  error: string | null;
}> {
  const from = (page - 1) * CUSTOMERS_LANDING_PAGE_SIZE;
  const to = from + CUSTOMERS_LANDING_PAGE_SIZE - 1;
  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("customers")
    .select(
      "id, name, booqable_customer_id, landing_google_status, landing_google_error, landing_holded_status, landing_holded_error, landing_mailchimp_status, landing_mailchimp_error",
      { count: "exact" },
    )
    .order("name", { ascending: true })
    .order("id", { ascending: true })
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
