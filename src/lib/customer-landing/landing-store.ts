import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { presentString } from "./dest-error.ts";
import type {
  CustomerPassport,
  DestIds,
  LandingStatuses,
  LandingStore,
} from "./types.ts";

function syncStatusPatch(
  statuses: LandingStatuses,
): Record<string, string | null> {
  return {
    google_id: statuses.google.id,
    google_status: statuses.google.status,
    google_error: statuses.google.error,
    holded_id: statuses.holded.id,
    holded_status: statuses.holded.status,
    holded_error: statuses.holded.error,
    mailchimp_id: statuses.mailchimp.id,
    mailchimp_status: statuses.mailchimp.status,
    mailchimp_error: statuses.mailchimp.error,
    synced_at: new Date().toISOString(),
  };
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, key);
}

export function identityUpsertRow(
  passport: CustomerPassport,
): Record<string, string | null> {
  const row: Record<string, string | null> = {
    booqable_customer_id: passport.booqableCustomerId,
  };
  const name = presentString(passport.name);
  const email = presentString(passport.email);
  const phone = presentString(passport.phone);
  const birthday = presentString(passport.birthday);
  if (name) row.name = name;
  if (email) row.email = email;
  if (phone) row.phone = phone;
  if (birthday) row.birthday = birthday;
  if (passport.address) {
    row.address_street = presentString(passport.address.street) ?? null;
    row.address_city = presentString(passport.address.city) ?? null;
    row.address_region = presentString(passport.address.region) ?? null;
    row.address_zip = presentString(passport.address.zip) ?? null;
    row.address_country = presentString(passport.address.country) ?? null;
  }
  return row;
}

export function createSupabaseLandingStore(
  supabase: SupabaseClient = createServiceRoleClient(),
): LandingStore {
  return {
    async upsertIdentity(passport: CustomerPassport): Promise<{ storedIds: DestIds }> {
      const row = identityUpsertRow(passport);

      const { data, error } = await supabase
        .from("customers")
        .upsert(row, { onConflict: "booqable_customer_id" })
        .select("id")
        .single();

      if (error) {
        console.error("[customer-landing] upsertIdentity:", error);
        throw new Error(error.message);
      }

      const { data: sync, error: syncError } = await supabase
        .from("customer_sync")
        .select("google_id, holded_id, mailchimp_id")
        .eq("customer_id", data.id)
        .maybeSingle();

      if (syncError) {
        console.error("[customer-landing] upsertIdentity sync:", syncError);
        throw new Error(syncError.message);
      }

      return {
        storedIds: {
          google: asText(sync?.google_id),
          holded: asText(sync?.holded_id),
          mailchimp: asText(sync?.mailchimp_id),
        },
      };
    },

    async saveStatuses(
      booqableCustomerId: string,
      statuses: LandingStatuses,
    ): Promise<void> {
      const { data: customer, error: findError } = await supabase
        .from("customers")
        .select("id")
        .eq("booqable_customer_id", booqableCustomerId)
        .maybeSingle();

      if (findError) {
        console.error("[customer-landing] saveStatuses find:", findError);
        throw new Error(findError.message);
      }
      if (!customer) {
        throw new Error("Customer row was not found.");
      }

      const { error } = await supabase.from("customer_sync").upsert(
        {
          customer_id: customer.id,
          ...syncStatusPatch(statuses),
        },
        { onConflict: "customer_id" },
      );

      if (error) {
        console.error("[customer-landing] saveStatuses:", error);
        throw new Error(error.message);
      }
    },
  };
}
