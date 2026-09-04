"use server";

import type { User } from "@supabase/supabase-js";
import { createClient } from "@/src/utils/supabase/server";
import { withAuth } from "@/src/utils/auth/with-auth";
import { isoDateToDdMmYyyy } from "@/src/utils/date-format";
import type {
  CustomerAddressPart,
  CustomerBikeFitSummary,
  CustomerDetails,
  CustomerDirectoryRow,
  CustomerOption,
  CustomerOrderSummary,
  CustomerPartnerSummary,
  CreateCustomerInput,
  CreateCustomerResult,
  DestinationStatus,
  SearchCustomersResult,
} from "./customers-types";

export type {
  CustomerDetails,
  CustomerDirectoryRow,
  DestinationStatus,
} from "./customers-types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+()\d][\d\s()+\-./]{6,}\d$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const createCustomer = withAuth("createCustomer", createCustomerAction);

async function createCustomerAction(
  _user: User,
  input: CreateCustomerInput,
): Promise<CreateCustomerResult> {
  const name = input.name?.trim();
  if (!name) {
    return { ok: false, error: "Name is required." };
  }

  const email = input.email?.trim() ? input.email.trim() : null;
  if (email && !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Email is not a valid email address." };
  }

  const phone = input.phone?.trim() ? input.phone.trim() : null;
  if (phone && !PHONE_PATTERN.test(phone)) {
    return { ok: false, error: "Phone number format is invalid." };
  }

  const birthday = input.birthday?.trim() ? input.birthday.trim() : null;
  if (birthday && !ISO_DATE_PATTERN.test(birthday)) {
    return { ok: false, error: "Birthday must be in YYYY-MM-DD format." };
  }

  const sex = input.sex;
  if (sex !== null && sex !== "male" && sex !== "female") {
    return { ok: false, error: "Sex must be male, female, or unspecified." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      booqable_customer_id: null,
      name,
      email,
      phone,
      birthday,
      sex,
    })
    .select("id, name, email, phone")
    .single();

  if (error) {
    console.error("createCustomer:", error);
    return {
      ok: false,
      error: "Could not create customer. Please try again.",
    };
  }

  return {
    ok: true,
    customer: {
      id: data.id as string,
      name: (data.name as string | null)?.trim() || name,
      email: data.email as string | null,
      phone: data.phone as string | null,
    },
  };
}

const SEARCH_LIMIT = 20;
export const CUSTOMERS_DIRECTORY_PAGE_SIZE = 10;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CustomerDirectoryDbRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  address_street: string | null;
  address_city: string | null;
  address_region: string | null;
  address_zip: string | null;
  address_country: string | null;
  google_status: string | null;
  google_error: string | null;
  holded_status: string | null;
  holded_error: string | null;
  mailchimp_status: string | null;
  mailchimp_error: string | null;
};

function displayValue(value: string | null | undefined, fallback = "—"): string {
  return value?.trim() || fallback;
}

function destinationStatus(
  status: string | null,
  error: string | null,
): DestinationStatus {
  if (status === "green") return { status: "green", error: null };
  if (status === "red") return { status: "red", error };
  return { status: null, error: null };
}

function toDirectoryRow(row: CustomerDirectoryDbRow): CustomerDirectoryRow {
  return {
    id: row.id,
    name: displayValue(row.name, "Unknown"),
    email: displayValue(row.email),
    phone: displayValue(row.phone),
    birthday: row.birthday ? isoDateToDdMmYyyy(row.birthday) : "—",
  };
}

function escapedContactTerm(query: string): string {
  return query.trim().replace(/[\\%_(),]/g, "\\$&").trim();
}

export async function loadCustomerDirectoryPage(
  page: number,
  query = "",
): Promise<{
  customers: CustomerDirectoryRow[];
  count: number;
  error: string | null;
}> {
  const from = (page - 1) * CUSTOMERS_DIRECTORY_PAGE_SIZE;
  const to = from + CUSTOMERS_DIRECTORY_PAGE_SIZE - 1;
  const supabase = await createClient();
  let queryBuilder = supabase
    .from("customer_directory")
    .select("id, name, email, phone, birthday", { count: "exact" });
  const escaped = escapedContactTerm(query);
  if (escaped) {
    queryBuilder = queryBuilder.or(
      `name.ilike.%${escaped}%,email.ilike.%${escaped}%,phone.ilike.%${escaped}%`,
    );
  }
  const { data, count, error } = await queryBuilder
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);
  if (error) {
    console.error("loadCustomerDirectoryPage:", error);
    return { customers: [], count: 0, error: error.message };
  }
  return {
    customers: ((data as CustomerDirectoryDbRow[] | null) ?? []).map(
      toDirectoryRow,
    ),
    count: count ?? 0,
    error: null,
  };
}

export async function loadCustomerDetails(
  customerId: string,
): Promise<{ customer: CustomerDetails | null; error: string | null }> {
  if (!UUID_RE.test(customerId)) return { customer: null, error: null };
  const supabase = await createClient();
  const { data: customerData, error: customerError } = await supabase
    .from("customer_directory")
    .select(
      "id, name, email, phone, birthday, address_street, address_city, address_region, address_zip, address_country, google_status, google_error, holded_status, holded_error, mailchimp_status, mailchimp_error",
    )
    .eq("id", customerId)
    .maybeSingle();
  if (customerError) {
    console.error("loadCustomerDetails:", customerError);
    return { customer: null, error: customerError.message };
  }
  if (!customerData) return { customer: null, error: null };

  const [ordersResult, bikeFitsResult, partnersResult] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, status, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    supabase
      .from("bike_fits")
      .select("id, fit_number, fit_label, date_of_fit")
      .eq("customer_id", customerId)
      .order("date_of_fit", { ascending: false })
      .order("fit_number", { ascending: false }),
    supabase
      .from("customer_partner_history")
      .select("partner_id, partner_name")
      .eq("customer_id", customerId)
      .order("partner_name", { ascending: true }),
  ]);
  const relatedError = ordersResult.error ?? bikeFitsResult.error ?? partnersResult.error;
  if (relatedError) {
    console.error("loadCustomerDetails:", relatedError);
    return { customer: null, error: relatedError.message };
  }

  const row = customerData as CustomerDirectoryDbRow;
  const addressFields: Array<[string, string | null]> = [
    ["Street", row.address_street],
    ["City", row.address_city],
    ["Region", row.address_region],
    ["Postal code", row.address_zip],
    ["Country", row.address_country],
  ];
  const address: CustomerAddressPart[] = addressFields.map(([label, value]) => ({
    label,
    value: displayValue(value),
  }));
  const orders = (ordersResult.data as CustomerOrderSummary[] | null) ?? [];
  const bikeFits = (
    (bikeFitsResult.data as Array<
      Omit<CustomerBikeFitSummary, "fit_label"> & { fit_label: string | null }
    > | null) ?? []
  ).map((fit) => ({
    ...fit,
    fit_label: displayValue(fit.fit_label, "Baseline Fit"),
  }));
  const partners = (
    (partnersResult.data as Array<{
      partner_id: string;
      partner_name: string | null;
    }> | null) ?? []
  ).map((partner) => ({
    id: partner.partner_id,
    name: displayValue(partner.partner_name, "Unknown"),
  })) as CustomerPartnerSummary[];
  return {
    customer: {
      id: row.id,
      name: displayValue(row.name, "Unknown"),
      email: displayValue(row.email),
      phone: displayValue(row.phone),
      birthday: row.birthday?.trim() || null,
      address,
      google: destinationStatus(row.google_status, row.google_error),
      holded: destinationStatus(row.holded_status, row.holded_error),
      mailchimp: destinationStatus(row.mailchimp_status, row.mailchimp_error),
      orders,
      bikeFits,
      partners,
    },
    error: null,
  };
}

export const searchCustomers = withAuth(
  "searchCustomers",
  searchCustomersAction,
);

async function searchCustomersAction(
  _user: User,
  query: string,
): Promise<SearchCustomersResult> {
  const supabase = await createClient();
  const trimmed = query.trim();

  let dbQuery = supabase
    .from("customers")
    .select("id, name, email, phone")
    .order("name", { ascending: true })
    .limit(SEARCH_LIMIT);

  if (trimmed) {
    const escaped = trimmed.replace(/[,()]/g, "");
    dbQuery = dbQuery.or(`name.ilike.%${escaped}%,email.ilike.%${escaped}%`);
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error("searchCustomers:", error);
    return { customers: [], error: error.message };
  }

  const customers: CustomerOption[] = (data ?? []).map((row) => ({
    id: row.id as string,
    name: (row.name as string | null)?.trim() || "Unknown",
    email: row.email as string | null,
    phone: row.phone as string | null,
  }));

  return { customers, error: null };
}
