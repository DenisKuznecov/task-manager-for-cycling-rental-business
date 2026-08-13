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
      activeVersionId?: string | null;
      activeVersionNumber?: number;
    };

type RpcFailure = {
  message: string;
  details?: string | null;
};

const VERSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseRpcDetail(details: string | null | undefined): {
  stale?: boolean;
  revision?: number;
  status?: WorkshopChecklistStatus;
  activeVersionId?: string | null;
  activeVersionNumber?: number;
} {
  if (!details) return {};
  try {
    const parsed = JSON.parse(details) as {
      stale?: unknown;
      revision?: unknown;
      status?: unknown;
      activeVersionId?: unknown;
      activeVersionNumber?: unknown;
    };
    const status =
      typeof parsed.status === "string" &&
      (WORKSHOP_CHECKLIST_STATUSES as readonly string[]).includes(parsed.status)
        ? (parsed.status as WorkshopChecklistStatus)
        : undefined;
    const activeVersionId =
      parsed.activeVersionId === null
        ? null
        : typeof parsed.activeVersionId === "string" &&
            VERSION_ID_PATTERN.test(parsed.activeVersionId)
          ? parsed.activeVersionId
          : undefined;
    return {
      stale: parsed.stale === true,
      revision:
        typeof parsed.revision === "number" ? parsed.revision : undefined,
      status,
      ...(activeVersionId !== undefined ? { activeVersionId } : {}),
      ...(typeof parsed.activeVersionNumber === "number"
        ? { activeVersionNumber: parsed.activeVersionNumber }
        : {}),
    };
  } catch {
    return {};
  }
}

/**
 * Stale RPC failures must carry the current revision/status/Active identity so
 * Retry can resubmit without silently rebasing the user's confirmation.
 */
export function mapChecklistItemRpcError(
  error: RpcFailure,
  fallback = ITEM_MUTATION_FALLBACK,
): Extract<ChecklistItemMutationResult, { ok: false }> {
  const detail = parseRpcDetail(error.details);
  const stale =
    detail.stale === true || error.message === "Checklist version is stale";

  return {
    ok: false,
    error: workshopUserFacingError(error.message, fallback),
    ...(stale ? { stale: true } : {}),
    ...(detail.revision !== undefined ? { revision: detail.revision } : {}),
    ...(detail.status !== undefined ? { status: detail.status } : {}),
    ...(detail.activeVersionId !== undefined
      ? { activeVersionId: detail.activeVersionId }
      : {}),
    ...(detail.activeVersionNumber !== undefined
      ? { activeVersionNumber: detail.activeVersionNumber }
      : {}),
  };
}
