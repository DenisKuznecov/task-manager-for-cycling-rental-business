import {
  WORKSHOP_CHECKLIST_STATUSES,
  type WorkshopChecklistStatus,
} from "@/src/lib/workshop-tasks/types";
import { workshopUserFacingError } from "@/src/lib/workshop-tasks/error-messages";

const ITEM_MUTATION_FALLBACK =
  "Could not save checklist items. Please try again.";

export type ChecklistItemMutationResult =
  | { ok: true; revision: number }
  | {
      ok: false;
      error: string;
      stale?: boolean;
      revision?: number;
      status?: WorkshopChecklistStatus;
    };

type RpcFailure = {
  message: string;
  details?: string | null;
};

function parseRpcDetail(details: string | null | undefined): {
  stale?: boolean;
  revision?: number;
  status?: WorkshopChecklistStatus;
} {
  if (!details) return {};
  try {
    const parsed = JSON.parse(details) as {
      stale?: unknown;
      revision?: unknown;
      status?: unknown;
    };
    const status =
      typeof parsed.status === "string" &&
      (WORKSHOP_CHECKLIST_STATUSES as readonly string[]).includes(parsed.status)
        ? (parsed.status as WorkshopChecklistStatus)
        : undefined;
    return {
      stale: parsed.stale === true,
      revision:
        typeof parsed.revision === "number" ? parsed.revision : undefined,
      status,
    };
  } catch {
    return {};
  }
}

/**
 * Stale RPC failures must carry the current revision/status so Retry can
 * resubmit without silently merging the user's still-open field values.
 */
export function mapChecklistItemRpcError(
  error: RpcFailure,
): Extract<ChecklistItemMutationResult, { ok: false }> {
  const detail = parseRpcDetail(error.details);
  const stale =
    detail.stale === true || error.message === "Checklist version is stale";

  return {
    ok: false,
    error: workshopUserFacingError(error.message, ITEM_MUTATION_FALLBACK),
    ...(stale ? { stale: true } : {}),
    ...(detail.revision !== undefined ? { revision: detail.revision } : {}),
    ...(detail.status !== undefined ? { status: detail.status } : {}),
  };
}
