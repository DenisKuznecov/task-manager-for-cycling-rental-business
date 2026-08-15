import { z } from "zod";
import {
  BOOQABLE_SOURCE_TABLES,
  BROWNFIELD_READER_VIEWS,
  SHARED_PROJECTION_SOURCE_COLUMNS,
} from "./canonical-projection";

/**
 * Soft lock of today's brownfield projection consumers. Later stories
 * fail closed if these files start reading Workshop source columns or
 * `booqable_*` tables. This is not a fetch-profile contract — live
 * include stays `customer,coupon,lines` until a later story owns fetch.
 */
export const BROWNFIELD_CONSUMERS_CONTRACT_VERSION = 1;

export const LIVE_BOOQABLE_ORDER_INCLUDE = "customer,coupon,lines";

export const LiveBooqableOrderIncludeSchema = z.literal(
  LIVE_BOOQABLE_ORDER_INCLUDE,
);

export const BROWNFIELD_CONSUMER_FILES = {
  sync: "src/lib/booqable/sync.ts",
  webhook: "src/app/api/webhooks/booqable/route.ts",
  sandbox: "src/app/api/sandbox/booqable/sync-orders/route.ts",
  orders: "src/lib/orders.ts",
  partnerOverview: "src/app/partner/_lib/loadPartnerOverview.ts",
  partnerCustomers: "src/app/partner/_lib/loadPartnerCustomers.ts",
  downloadReport: "src/app/api/partners/download-report/route.ts",
  customers: "src/lib/customers.ts",
  bikeFits: "src/lib/bike-fit/data/bike-fits.ts",
} as const;

export const BROWNFIELD_REMOTE_SCHEMA =
  "supabase/migrations/20260608102505_remote_schema.sql";

export const ORDER_DETAIL_SELECT = [
  "id",
  "order_number",
  "status",
  "payment_status",
  "fulfillment_type",
  "starts_at",
  "stops_at",
  "created_at",
  "amount_in_cents",
  "discount_type",
  "discount_percentage",
  "coupon_discount_in_cents",
  "deposit_in_cents",
  "tax_in_cents",
  "grand_total_with_tax_in_cents",
  "to_be_paid_in_cents",
  "item_count",
  "delivery_address",
  "billing_address",
  "partner_promo",
  "customers ( name, email, phone, birthday )",
  "partners ( name, slug )",
  "order_items ( id, booqable_line_id, booqable_item_id, parent_booqable_line_id, title, quantity, line_type, charge_label, extra_information, price_each_in_cents, price_in_cents, position, relevant )",
] as const;

export const PARTNER_RECENT_ORDERS_SELECT = [
  "id",
  "status",
  "starts_at",
  "stops_at",
  "amount_in_cents",
  "customers(name, email, phone)",
] as const;

export const PARTNER_REPORT_BOOKINGS_SELECT = [
  "id",
  "order_number",
  "status",
  "created_at",
  "amount_in_cents",
  "customer_name",
  "customer_email",
] as const;

export const CUSTOMER_OPTION_SELECT = ["id", "name", "email", "phone"] as const;

export const LOCAL_CUSTOMER_INSERT_COLUMNS = [
  "booqable_customer_id",
  "name",
  "email",
  "phone",
  "birthday",
  "sex",
] as const;

export const LocalCustomerInsertSchema = z
  .object({
    booqable_customer_id: z.null(),
    name: z.string().trim().min(1),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    birthday: z.string().nullable(),
    sex: z.enum(["male", "female"]).nullable(),
  })
  .strict();

export const BIKE_FIT_DETAIL_SELECT = [
  "id",
  "fit_number",
  "fit_label",
  "customer_id",
  "date_of_fit",
  "bike_type",
  "status",
  "assessment_payload",
  "new_bike_fit_payload",
  "report_storage_path",
  "report_generated_at",
  "customers ( name, email, phone, sex )",
] as const;

export const PARTNER_DAILY_STATS_RPC = "get_partner_daily_stats";

export const PARTNER_DAILY_STATS_COLUMNS = [
  "stat_date",
  "daily_orders",
  "daily_cents",
] as const;

export const BROWNFIELD_STAR_SELECT_VIEWS = [
  "bookings_view",
  "partner_customers_view",
  "bike_fits_view",
] as const;

export {
  BOOQABLE_SOURCE_TABLES,
  BROWNFIELD_READER_VIEWS,
  SHARED_PROJECTION_SOURCE_COLUMNS,
};

/**
 * Collapse select/insert text so a later edit that only changes wrapping
 * does not hide a real column-list change.
 */
export function normalizeProjectionList(value: string): string {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/ ,/g, ",")
    .replace(/, /g, ",")
    .replace(/\( /g, "(")
    .replace(/ \)/g, ")")
    .trim();
}

export function projectionListFromColumns(
  columns: readonly string[],
): string {
  return normalizeProjectionList(columns.join(","));
}

function hasIdentifier(source: string, name: string): boolean {
  return new RegExp(`\\b${name}\\b`).test(source);
}

/**
 * Soft lock only: the check reads source text. It does not change grants,
 * RLS, or the live readers.
 */
export function findBrownfieldConsumerLeaks(source: string): string[] {
  const leaks: string[] = [];
  for (const column of SHARED_PROJECTION_SOURCE_COLUMNS) {
    if (hasIdentifier(source, column)) {
      leaks.push(column);
    }
  }
  for (const table of BOOQABLE_SOURCE_TABLES) {
    if (hasIdentifier(source, table)) {
      leaks.push(table);
    }
  }
  return leaks;
}

export function assertNoBrownfieldConsumerLeaks(
  source: string,
): { ok: true } | { ok: false; error: string } {
  const leaks = findBrownfieldConsumerLeaks(source);
  if (leaks.length > 0) {
    return {
      ok: false,
      error: `brownfield consumer source leaked ${leaks.join(", ")}`,
    };
  }
  return { ok: true };
}
