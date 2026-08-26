import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  BooqableFetchError,
  fetchSourceOrderDocument,
} from "@/src/lib/booqable/fetch-source-snapshot";
import {
  InvalidSourceSnapshotError,
  parseSourceOrderSnapshot,
} from "@/src/lib/booqable/parse-source-snapshot";
import type { SourceOrderSnapshotV1 } from "@/src/lib/workshop/domain";
import { sandboxBackfillAllowed, workshopSyncAllowed } from "./sync-env";

const ORDER_LEASE_TTL_MS = 2 * 60 * 1000;
const MANUAL_LOCK_KEY = "manual_sync";

export type ReconcileTrigger = "webhook" | "manual" | "sandbox" | "task";

export type ReconcileFailureCode = "SYNC_IN_PROGRESS" | "SOURCE_UNAVAILABLE";

export type ReconcileResult =
  | { ok: true; snapshot: SourceOrderSnapshotV1 }
  | { ok: false; code: ReconcileFailureCode; error: string };

type Lease = { token: string; fence: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, key);
}

export function coerceLeaseFence(value: unknown): number | null {
  const fence =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  return Number.isInteger(fence) ? fence : null;
}

export function startLeaseRenewLoop(
  renew: () => Promise<void>,
  logPrefix: string,
  intervalMs: number = Math.floor(ORDER_LEASE_TTL_MS / 2),
): () => void {
  let stopped = false;
  const timer = setInterval(() => {
    if (stopped) return;
    void renew().catch((error) => {
      console.error(logPrefix, error);
    });
  }, intervalMs);
  timer.unref?.();
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

function leaseFromPayload(data: unknown): Lease | { code: string; error: string } {
  if (!isRecord(data)) {
    return { code: "SOURCE_UNAVAILABLE", error: "Unexpected lease payload." };
  }
  if (data.ok === true) {
    const token = data.token;
    const fence = coerceLeaseFence(data.fence);
    if (typeof token === "string" && fence !== null) {
      return { token, fence };
    }
    return { code: "SOURCE_UNAVAILABLE", error: "Unexpected lease payload." };
  }
  const code = typeof data.code === "string" ? data.code : "SOURCE_UNAVAILABLE";
  const error =
    typeof data.error === "string" && data.error.trim()
      ? data.error
      : "Lease acquisition failed.";
  return { code, error };
}

async function rpcJson(
  supabase: SupabaseClient,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    throw error;
  }
  return data;
}

export async function reconcileBooqableOrder(
  booqableOrderId: string,
  trigger: ReconcileTrigger,
  options: { mintTasks?: boolean; supabase?: SupabaseClient } = {},
): Promise<ReconcileResult> {
  if (trigger === "sandbox") {
    if (!sandboxBackfillAllowed()) {
      return {
        ok: false,
        code: "SOURCE_UNAVAILABLE",
        error: "Sandbox reseed is local-only.",
      };
    }
  } else if (!workshopSyncAllowed()) {
    return {
      ok: false,
      code: "SOURCE_UNAVAILABLE",
      error: "Booqable sync is disabled in this environment.",
    };
  }

  const supabase = options.supabase ?? createServiceRoleClient();
  const owner = `${trigger}:${booqableOrderId}`;
  const expiresAt = new Date(Date.now() + ORDER_LEASE_TTL_MS).toISOString();

  let lease: Lease;
  try {
    const acquired = leaseFromPayload(
      await rpcJson(supabase, "booqable_acquire_order_lease", {
        booqable_order_id: booqableOrderId,
        expires_at: expiresAt,
        owner,
      }),
    );
    if ("token" in acquired) {
      lease = acquired;
    } else if (acquired.code === "SYNC_IN_PROGRESS") {
      return {
        ok: false,
        code: "SYNC_IN_PROGRESS",
        error: acquired.error,
      };
    } else {
      console.error("reconcileBooqableOrder:", acquired.error);
      return {
        ok: false,
        code: "SOURCE_UNAVAILABLE",
        error: acquired.error,
      };
    }
  } catch (error) {
    console.error("reconcileBooqableOrder:", error);
    return {
      ok: false,
      code: "SOURCE_UNAVAILABLE",
      error: error instanceof Error ? error.message : "Failed to acquire order lease.",
    };
  }

  const renewOrderLease = async () => {
    const renewed = leaseFromPayload(
      await rpcJson(supabase, "booqable_renew_order_lease", {
        booqable_order_id: booqableOrderId,
        token: lease.token,
        fence: lease.fence,
        expires_at: new Date(Date.now() + ORDER_LEASE_TTL_MS).toISOString(),
      }),
    );
    if (!("token" in renewed)) {
      throw new Error(renewed.error);
    }
  };

  const release = async () => {
    try {
      await rpcJson(supabase, "booqable_release_order_lease", {
        booqable_order_id: booqableOrderId,
        token: lease.token,
        fence: lease.fence,
      });
    } catch (error) {
      console.error("reconcileBooqableOrder:", error);
    }
  };

  const stopRenew = startLeaseRenewLoop(
    renewOrderLease,
    "reconcileBooqableOrder:",
  );

  try {
    await renewOrderLease();
    const document = await fetchSourceOrderDocument(booqableOrderId);
    const snapshot = parseSourceOrderSnapshot(document);
    const mintTasks =
      trigger === "sandbox"
        ? snapshot.sourceStatus === "reserved"
        : (options.mintTasks ?? true);

    const applyArgs: Record<string, unknown> = {
      booqable_order_id: booqableOrderId,
      token: lease.token,
      fence: lease.fence,
      snapshot,
    };
    if (!mintTasks) {
      applyArgs.mint_tasks = false;
    }

    const applied = await rpcJson(
      supabase,
      "booqable_apply_source_snapshot_v1",
      applyArgs,
    );
    if (!isRecord(applied) || applied.ok !== true) {
      const error =
        isRecord(applied) && typeof applied.error === "string"
          ? applied.error
          : "Source apply failed.";
      console.error("reconcileBooqableOrder:", applied);
      return { ok: false, code: "SOURCE_UNAVAILABLE", error };
    }

    return { ok: true, snapshot };
  } catch (error) {
    if (
      error instanceof InvalidSourceSnapshotError ||
      error instanceof BooqableFetchError
    ) {
      console.error("reconcileBooqableOrder:", error);
      return {
        ok: false,
        code: "SOURCE_UNAVAILABLE",
        error: error.message,
      };
    }
    console.error("reconcileBooqableOrder:", error);
    return {
      ok: false,
      code: "SOURCE_UNAVAILABLE",
      error: error instanceof Error ? error.message : "Reconcile failed.",
    };
  } finally {
    stopRenew();
    await release();
  }
}

export { MANUAL_LOCK_KEY, ORDER_LEASE_TTL_MS };
