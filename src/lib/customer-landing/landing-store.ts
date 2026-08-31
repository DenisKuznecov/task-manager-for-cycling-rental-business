import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "../workshop/application/reconcile-order.ts";
import { presentString } from "./dest-error.ts";
import type {
  CustomerPassport,
  DestIds,
  LandingStatuses,
  LandingStore,
} from "./types.ts";

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export function createSupabaseLandingStore(
  supabase: SupabaseClient = createServiceRoleClient(),
): LandingStore {
  return {
    async upsertIdentity(passport: CustomerPassport): Promise<{ storedIds: DestIds }> {
      const row: Record<string, string> = {
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

      const { data, error } = await supabase
        .from("customers")
        .upsert(row, { onConflict: "booqable_customer_id" })
        .select(
          "landing_google_id, landing_holded_id, landing_mailchimp_id",
        )
        .single();

      if (error) {
        console.error("[customer-landing] upsertIdentity:", error);
        throw new Error(error.message);
      }

      return {
        storedIds: {
          google: asText(data?.landing_google_id),
          holded: asText(data?.landing_holded_id),
          mailchimp: asText(data?.landing_mailchimp_id),
        },
      };
    },

    async saveStatuses(
      booqableCustomerId: string,
      statuses: LandingStatuses,
    ): Promise<void> {
      const { error } = await supabase
        .from("customers")
        .update({
          landing_google_id: statuses.google.id,
          landing_google_status: statuses.google.status,
          landing_google_error: statuses.google.error,
          landing_holded_id: statuses.holded.id,
          landing_holded_status: statuses.holded.status,
          landing_holded_error: statuses.holded.error,
          landing_mailchimp_id: statuses.mailchimp.id,
          landing_mailchimp_status: statuses.mailchimp.status,
          landing_mailchimp_error: statuses.mailchimp.error,
        })
        .eq("booqable_customer_id", booqableCustomerId);

      if (error) {
        console.error("[customer-landing] saveStatuses:", error);
        throw new Error(error.message);
      }
    },
  };
}
