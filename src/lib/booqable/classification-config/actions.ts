"use server";

import { revalidatePath } from "next/cache";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/src/utils/supabase/server";
import { withAuth } from "@/src/utils/auth/with-auth";
import {
  allSetupSlotsProven,
  liveClassificationSource,
  TARGETED_UNPROVEN_MESSAGE,
} from "@/src/lib/booqable/contracts/classification-config";
import {
  ApproveClassificationConfigInputSchema,
  RollbackClassificationConfigInputSchema,
  classificationUserFacingError,
  firstZodErrorMessage,
  type ApproveClassificationConfigInput,
  type ClassificationMutationResult,
  type RollbackClassificationConfigInput,
} from "./types";

const APPROVE_FALLBACK =
  "Could not approve classification mapping configuration. Please try again.";
const ROLLBACK_FALLBACK =
  "Could not roll back classification mapping configuration. Please try again.";

const VERSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RpcFailure = {
  message: string;
  details?: string | null;
};

function revisionFromRpc(data: unknown): number | null {
  return typeof data === "number" && Number.isInteger(data) && data > 0
    ? data
    : null;
}

function parseRpcDetail(details: string | null | undefined): {
  stale?: boolean;
  revision?: number;
  activeVersionId?: string | null;
} {
  if (!details) return {};
  try {
    const parsed = JSON.parse(details) as {
      stale?: unknown;
      revision?: unknown;
      activeVersionId?: unknown;
    };
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
      ...(activeVersionId !== undefined ? { activeVersionId } : {}),
    };
  } catch {
    return {};
  }
}

/**
 * Stale RPC failures must carry the current revision and Active identity so
 * Retry can resubmit without silently rebasing the admin's confirmation.
 */
export function mapClassificationRpcError(
  error: RpcFailure,
  fallback: string,
): Extract<ClassificationMutationResult, { ok: false }> {
  const detail = parseRpcDetail(error.details);
  const stale =
    detail.stale === true ||
    error.message === "Classification mapping configuration is stale";

  return {
    ok: false,
    error: classificationUserFacingError(error.message, fallback),
    ...(stale ? { stale: true } : {}),
    ...(detail.revision !== undefined ? { revision: detail.revision } : {}),
    ...(detail.activeVersionId !== undefined
      ? { activeVersionId: detail.activeVersionId }
      : {}),
  };
}

/**
 * Approve copies the current editable source into a new Active row. Targeted
 * is rejected here so an unproven request never reaches the RPC.
 */
export const approveClassificationConfig = withAuth(
  "approveClassificationConfig",
  approveClassificationConfigAction,
);

async function approveClassificationConfigAction(
  _user: User,
  input: ApproveClassificationConfigInput,
): Promise<ClassificationMutationResult> {
  const parsed = ApproveClassificationConfigInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  const source = liveClassificationSource();
  if (parsed.data.mode === "targeted" && !allSetupSlotsProven(source.setup_slots)) {
    return { ok: false, error: TARGETED_UNPROVEN_MESSAGE };
  }

  const snapshot = {
    ...source,
    mode: parsed.data.mode,
  };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "approve_classification_mapping_config",
    {
      expected_revision: parsed.data.expectedRevision,
      expected_active_version_id: parsed.data.expectedActiveVersionId,
      mode: snapshot.mode,
      allowlist: snapshot.allowlist,
      display_labels: snapshot.display_labels,
      setup_slots: snapshot.setup_slots,
      provenance: snapshot.provenance,
    },
  );

  if (error) {
    console.error("approveClassificationConfig:", error);
    return mapClassificationRpcError(error, APPROVE_FALLBACK);
  }

  const revision = revisionFromRpc(data);
  if (revision == null) {
    console.error("approveClassificationConfig: missing revision", data);
    return { ok: false, error: APPROVE_FALLBACK };
  }

  revalidatePath("/workshop/classification");
  return { ok: true, revision };
}

/**
 * Rollback restores a prior database snapshot. The editable source file is
 * left unchanged so operators can recover without a code edit.
 */
export const rollbackClassificationConfig = withAuth(
  "rollbackClassificationConfig",
  rollbackClassificationConfigAction,
);

async function rollbackClassificationConfigAction(
  _user: User,
  input: RollbackClassificationConfigInput,
): Promise<ClassificationMutationResult> {
  const parsed = RollbackClassificationConfigInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstZodErrorMessage(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "rollback_classification_mapping_config",
    {
      prior_version_id: parsed.data.priorVersionId,
      expected_revision: parsed.data.expectedRevision,
      expected_active_version_id: parsed.data.expectedActiveVersionId,
    },
  );

  if (error) {
    console.error("rollbackClassificationConfig:", error);
    return mapClassificationRpcError(error, ROLLBACK_FALLBACK);
  }

  const revision = revisionFromRpc(data);
  if (revision == null) {
    console.error("rollbackClassificationConfig: missing revision", data);
    return { ok: false, error: ROLLBACK_FALLBACK };
  }

  revalidatePath("/workshop/classification");
  return { ok: true, revision };
}
