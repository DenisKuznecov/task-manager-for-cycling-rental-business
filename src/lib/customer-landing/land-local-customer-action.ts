"use server";

import { revalidatePath } from "next/cache";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/src/utils/supabase/server";
import { withAuth } from "@/src/utils/auth/with-auth";
import { workshopSyncAllowed } from "@/src/lib/workshop/application/sync-env";
import {
  createSupabaseLandingStore,
  loadLocalCustomerRow,
} from "./landing-store";
import { landLocalCustomer } from "./land-customer";

export type LandLocalCustomerResult = { ok: true } | { ok: false; error: string };

export const landLocalCustomerAction = withAuth(
  "landLocalCustomer",
  landLocalCustomerActionImpl,
);

async function landLocalCustomerActionImpl(
  _user: User,
  customerId: string,
): Promise<LandLocalCustomerResult> {
  if (!workshopSyncAllowed()) {
    return { ok: true };
  }

  const supabase = await createClient();
  const { data: role, error: roleError } = await supabase.rpc("get_user_role");
  if (roleError) {
    console.error("landLocalCustomer:", roleError);
    return { ok: false, error: roleError.message };
  }
  if (role !== "admin" && role !== "manager") {
    console.error("landLocalCustomer:", "rejected — role not admin or manager", role);
    return { ok: false, error: "Admin or manager role required." };
  }

  const result = await landLocalCustomer(customerId, {
    store: createSupabaseLandingStore(supabase),
    loadRow: (id) => loadLocalCustomerRow(supabase, id),
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/customers");
  return { ok: true };
}
