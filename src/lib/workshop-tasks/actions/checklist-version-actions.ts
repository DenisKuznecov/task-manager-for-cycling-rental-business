"use server";

import { revalidatePath } from "next/cache";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/src/utils/supabase/server";
import { withAuth } from "@/src/utils/auth/with-auth";
import {
  ActivateChecklistVersionInputSchema,
  CreateDraftChecklistVersionInputSchema,
  type ActivateChecklistVersionInput,
  type CreateDraftChecklistVersionInput,
} from "@/src/lib/workshop-tasks/types";
import {
  firstZodErrorMessage,
  workshopUserFacingError,
} from "@/src/lib/workshop-tasks/error-messages";
import {
  mapChecklistItemRpcError,
  type ChecklistItemMutationResult,
} from "@/src/lib/workshop-tasks/checklist-item-mutation";

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

export type ActivateChecklistVersionResult = ChecklistItemMutationResult;

const ACTIVATE_FALLBACK =
  "Could not activate this checklist version. Please try again.";

function revisionFromRpc(data: unknown): number | null {
  return typeof data === "number" && Number.isInteger(data) && data > 0
    ? data
    : null;
}

/**
 * Activates a Draft through the privileged RPC so the Active pointer, optional
 * supersede, revision bumps, and attributed event commit together. The
 * superseded detail is revalidated from expectedActiveVersionId because success
 * means that is the version that was superseded.
 */
export const activateChecklistVersion = withAuth(
  "activateChecklistVersion",
  activateChecklistVersionAction,
);

async function activateChecklistVersionAction(
  _user: User,
  input: ActivateChecklistVersionInput,
): Promise<ActivateChecklistVersionResult> {
  const parsed = ActivateChecklistVersionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("activate_checklist_version", {
    version_id: parsed.data.versionId,
    expected_revision: parsed.data.expectedRevision,
    expected_active_version_id: parsed.data.expectedActiveVersionId,
  });

  if (error) {
    console.error("activateChecklistVersion:", error);
    return mapChecklistItemRpcError(error, ACTIVATE_FALLBACK);
  }

  const revision = revisionFromRpc(data);
  if (revision == null) {
    console.error("activateChecklistVersion: missing revision", data);
    return { ok: false, error: ACTIVATE_FALLBACK };
  }

  revalidatePath("/workshop/templates");
  revalidatePath(`/workshop/templates/${parsed.data.versionId}`);
  if (parsed.data.expectedActiveVersionId) {
    revalidatePath(
      `/workshop/templates/${parsed.data.expectedActiveVersionId}`,
    );
  }
  return { ok: true, revision };
}
