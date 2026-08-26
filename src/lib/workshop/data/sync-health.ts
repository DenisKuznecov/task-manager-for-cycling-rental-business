import { createClient } from "@/src/utils/supabase/server";
import {
  isManualSyncScope,
  isWorkshopSyncRunState,
  type ManualSyncScope,
  type WorkshopSyncCounts,
  type WorkshopSyncRunState,
} from "@/src/lib/workshop/domain";

export type WorkshopSyncHealth = {
  lastSuccessAt: string | null;
  runId: string | null;
  scope: ManualSyncScope | null;
  state: WorkshopSyncRunState | null;
  cursor: string | null;
  counts: WorkshopSyncCounts;
  lastError: string | null;
  lastAttemptAt: string | null;
};

const EMPTY_COUNTS: WorkshopSyncCounts = {
  listed: 0,
  succeeded: 0,
  failed: 0,
  skipped: 0,
};

type HealthRow = {
  last_success_at: string | null;
  run_id: string | null;
  scope: string | null;
  state: string | null;
  cursor: string | null;
  listed: number | null;
  succeeded: number | null;
  failed: number | null;
  skipped: number | null;
  last_error: string | null;
  last_attempt_at: string | null;
};

function asCount(value: number | null): number {
  return value ?? 0;
}

/**
 * Latest manual-sync health row for `/workshop`.
 * `error` is set on a failed read; empty health is not treated as "no results".
 */
export async function loadWorkshopSyncHealth(): Promise<{
  health: WorkshopSyncHealth;
  error: string | null;
}> {
  const empty: WorkshopSyncHealth = {
    lastSuccessAt: null,
    runId: null,
    scope: null,
    state: null,
    cursor: null,
    counts: EMPTY_COUNTS,
    lastError: null,
    lastAttemptAt: null,
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workshop_sync_health")
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("workshop:", error);
    return { health: empty, error: error.message };
  }

  if (!data) {
    return { health: empty, error: null };
  }

  const row = data as HealthRow;
  return {
    health: {
      lastSuccessAt: row.last_success_at,
      runId: row.run_id,
      scope: isManualSyncScope(row.scope) ? row.scope : null,
      state: isWorkshopSyncRunState(row.state) ? row.state : null,
      cursor: row.cursor,
      counts: {
        listed: asCount(row.listed),
        succeeded: asCount(row.succeeded),
        failed: asCount(row.failed),
        skipped: asCount(row.skipped),
      },
      lastError: row.last_error,
      lastAttemptAt: row.last_attempt_at,
    },
    error: null,
  };
}
