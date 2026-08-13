"use server";

import { revalidatePath } from "next/cache";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/src/utils/supabase/server";
import { withAuth } from "@/src/utils/auth/with-auth";
import {
  CreateDraftChecklistVersionInputSchema,
  type CreateDraftChecklistVersionInput,
} from "@/src/lib/workshop-tasks/types";
import {
  firstZodErrorMessage,
  workshopUserFacingError,
} from "@/src/lib/workshop-tasks/error-messages";

export type CreateDraftChecklistVersionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * Allocates a blank Draft through the privileged RPC rather than `insert({})`,
 * because authenticated roles have no table DML and the version number plus
 * creation event must commit together.
 */
export const createDraftChecklistVersion = withAuth(
  "createDraftChecklistVersion",
  createDraftChecklistVersionAction,
);

async function createDraftChecklistVersionAction(
  _user: User,
  input: CreateDraftChecklistVersionInput,
): Promise<CreateDraftChecklistVersionResult> {
  const parsed = CreateDraftChecklistVersionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_draft_checklist_version", {
    phase: parsed.data.phase,
    bike_category: parsed.data.bikeCategory,
  });

  if (error) {
    console.error("createDraftChecklistVersion:", error);
    return {
      ok: false,
      error: workshopUserFacingError(
        error.message,
        "Could not create a draft checklist version. Please try again.",
      ),
    };
  }

  const id = typeof data === "string" ? data : null;
  if (!id) {
    console.error("createDraftChecklistVersion: missing version id", data);
    return {
      ok: false,
      error: "Could not create a draft checklist version. Please try again.",
    };
  }

  revalidatePath("/workshop/templates");
  revalidatePath(`/workshop/templates/${id}`);
  return { ok: true, id };
}
