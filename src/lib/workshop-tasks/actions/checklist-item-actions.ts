"use server";

import { revalidatePath } from "next/cache";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/src/utils/supabase/server";
import { withAuth } from "@/src/utils/auth/with-auth";
import {
  AddDraftChecklistItemInputSchema,
  RemoveDraftChecklistItemInputSchema,
  ReorderDraftChecklistItemsInputSchema,
  UpdateDraftChecklistItemInputSchema,
  type AddDraftChecklistItemInput,
  type RemoveDraftChecklistItemInput,
  type ReorderDraftChecklistItemsInput,
  type UpdateDraftChecklistItemInput,
} from "@/src/lib/workshop-tasks/types";
import { firstZodErrorMessage } from "@/src/lib/workshop-tasks/error-messages";
import {
  mapChecklistItemRpcError,
  type ChecklistItemMutationResult,
} from "@/src/lib/workshop-tasks/checklist-item-mutation";

const ITEM_MUTATION_FALLBACK =
  "Could not save checklist items. Please try again.";

function revalidateChecklistRoutes(versionId: string) {
  revalidatePath("/workshop/templates");
  revalidatePath(`/workshop/templates/${versionId}`);
}

function revisionFromRpc(data: unknown): number | null {
  return typeof data === "number" && Number.isInteger(data) && data > 0
    ? data
    : null;
}

export const addDraftChecklistItem = withAuth(
  "addDraftChecklistItem",
  addDraftChecklistItemAction,
);

async function addDraftChecklistItemAction(
  _user: User,
  input: AddDraftChecklistItemInput,
): Promise<ChecklistItemMutationResult> {
  const parsed = AddDraftChecklistItemInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_draft_checklist_item", {
    version_id: parsed.data.versionId,
    expected_revision: parsed.data.expectedRevision,
    label: parsed.data.label,
    item_type: parsed.data.type,
    required: parsed.data.required,
    m1: parsed.data.m1,
    m2: parsed.data.m2,
    setup_category: parsed.data.setupCategory,
  });

  if (error) {
    console.error("addDraftChecklistItem:", error);
    return mapChecklistItemRpcError(error);
  }

  const revision = revisionFromRpc(data);
  if (revision == null) {
    console.error("addDraftChecklistItem: missing revision", data);
    return { ok: false, error: ITEM_MUTATION_FALLBACK };
  }

  revalidateChecklistRoutes(parsed.data.versionId);
  return { ok: true, revision };
}

export const updateDraftChecklistItem = withAuth(
  "updateDraftChecklistItem",
  updateDraftChecklistItemAction,
);

async function updateDraftChecklistItemAction(
  _user: User,
  input: UpdateDraftChecklistItemInput,
): Promise<ChecklistItemMutationResult> {
  const parsed = UpdateDraftChecklistItemInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_draft_checklist_item", {
    version_id: parsed.data.versionId,
    item_id: parsed.data.itemId,
    expected_revision: parsed.data.expectedRevision,
    label: parsed.data.label,
    item_type: parsed.data.type,
    required: parsed.data.required,
    m1: parsed.data.m1,
    m2: parsed.data.m2,
    setup_category: parsed.data.setupCategory,
  });

  if (error) {
    console.error("updateDraftChecklistItem:", error);
    return mapChecklistItemRpcError(error);
  }

  const revision = revisionFromRpc(data);
  if (revision == null) {
    console.error("updateDraftChecklistItem: missing revision", data);
    return { ok: false, error: ITEM_MUTATION_FALLBACK };
  }

  revalidateChecklistRoutes(parsed.data.versionId);
  return { ok: true, revision };
}

export const removeDraftChecklistItem = withAuth(
  "removeDraftChecklistItem",
  removeDraftChecklistItemAction,
);

async function removeDraftChecklistItemAction(
  _user: User,
  input: RemoveDraftChecklistItemInput,
): Promise<ChecklistItemMutationResult> {
  const parsed = RemoveDraftChecklistItemInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("remove_draft_checklist_item", {
    item_id: parsed.data.itemId,
    expected_revision: parsed.data.expectedRevision,
  });

  if (error) {
    console.error("removeDraftChecklistItem:", error);
    return mapChecklistItemRpcError(error);
  }

  const revision = revisionFromRpc(data);
  if (revision == null) {
    console.error("removeDraftChecklistItem: missing revision", data);
    return { ok: false, error: ITEM_MUTATION_FALLBACK };
  }

  revalidateChecklistRoutes(parsed.data.versionId);
  return { ok: true, revision };
}

export const reorderDraftChecklistItems = withAuth(
  "reorderDraftChecklistItems",
  reorderDraftChecklistItemsAction,
);

async function reorderDraftChecklistItemsAction(
  _user: User,
  input: ReorderDraftChecklistItemsInput,
): Promise<ChecklistItemMutationResult> {
  const parsed = ReorderDraftChecklistItemsInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reorder_draft_checklist_items", {
    version_id: parsed.data.versionId,
    expected_revision: parsed.data.expectedRevision,
    item_ids: parsed.data.itemIds,
  });

  if (error) {
    console.error("reorderDraftChecklistItems:", error);
    return mapChecklistItemRpcError(error);
  }

  const revision = revisionFromRpc(data);
  if (revision == null) {
    console.error("reorderDraftChecklistItems: missing revision", data);
    return { ok: false, error: ITEM_MUTATION_FALLBACK };
  }

  revalidateChecklistRoutes(parsed.data.versionId);
  return { ok: true, revision };
}
