import { isBikeTaskStatus, type BikeTaskStatus } from "./statuses";
import {
  isWorkshopErrorCode,
  isWorkshopSyncRunState,
  type WorkshopErrorCode,
  type WorkshopSyncRunState,
} from "./commands";

export type WorkshopCommandSuccess = {
  ok: true;
  taskId: string;
  version: number;
  status: BikeTaskStatus;
};

export type WorkshopCommandFailure = {
  ok: false;
  code: WorkshopErrorCode;
  error: string;
};

export type WorkshopCommandResult =
  | WorkshopCommandSuccess
  | WorkshopCommandFailure;

export type WorkshopSyncCounts = {
  listed: number;
  succeeded: number;
  failed: number;
  skipped: number;
};

export type WorkshopSyncSuccess = {
  ok: true;
  runId: string;
  state: WorkshopSyncRunState;
  cursor: string | null;
  counts: WorkshopSyncCounts;
};

export type WorkshopSyncResult = WorkshopSyncSuccess | WorkshopCommandFailure;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Parse a staff-command JSON payload. Unexpected shapes become
 * `SOURCE_UNAVAILABLE` so the closed `code` union stays intact.
 */
export function parseWorkshopCommandResult(
  data: unknown,
): WorkshopCommandResult {
  if (!isRecord(data)) {
    return {
      ok: false,
      code: "SOURCE_UNAVAILABLE",
      error: "Unexpected workshop command result.",
    };
  }

  if (data.ok === true) {
    const taskId = data.taskId;
    const version = data.version;
    const status = data.status;
    if (
      typeof taskId === "string" &&
      typeof version === "number" &&
      isBikeTaskStatus(status)
    ) {
      return { ok: true, taskId, version, status };
    }
    return {
      ok: false,
      code: "SOURCE_UNAVAILABLE",
      error: "Unexpected workshop command result.",
    };
  }

  if (data.ok === false) {
    const code = isWorkshopErrorCode(data.code) ? data.code : "SOURCE_UNAVAILABLE";
    const error =
      typeof data.error === "string" && data.error.trim()
        ? data.error
        : "Workshop command failed.";
    return { ok: false, code, error };
  }

  return {
    ok: false,
    code: "SOURCE_UNAVAILABLE",
    error: "Unexpected workshop command result.",
  };
}

function asCount(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function parseCounts(value: unknown): WorkshopSyncCounts | null {
  if (!isRecord(value)) return null;
  const listed = asCount(value.listed);
  const succeeded = asCount(value.succeeded);
  const failed = asCount(value.failed);
  const skipped = asCount(value.skipped);
  if (
    listed === null ||
    succeeded === null ||
    failed === null ||
    skipped === null
  ) {
    return null;
  }
  return { listed, succeeded, failed, skipped };
}

/**
 * Parse a manual-sync JSON payload. Unexpected shapes become
 * `SOURCE_UNAVAILABLE` so the closed `code` union stays intact.
 */
export function parseWorkshopSyncResult(data: unknown): WorkshopSyncResult {
  if (!isRecord(data)) {
    return {
      ok: false,
      code: "SOURCE_UNAVAILABLE",
      error: "Unexpected workshop sync result.",
    };
  }

  if (data.ok === true) {
    const runId = data.runId;
    const state = data.state;
    const cursor = data.cursor;
    const counts = parseCounts(data.counts);
    if (
      typeof runId === "string" &&
      isWorkshopSyncRunState(state) &&
      (cursor === null || typeof cursor === "string") &&
      counts
    ) {
      return { ok: true, runId, state, cursor, counts };
    }
    return {
      ok: false,
      code: "SOURCE_UNAVAILABLE",
      error: "Unexpected workshop sync result.",
    };
  }

  if (data.ok === false) {
    const code = isWorkshopErrorCode(data.code) ? data.code : "SOURCE_UNAVAILABLE";
    const error =
      typeof data.error === "string" && data.error.trim()
        ? data.error
        : "Workshop sync failed.";
    return { ok: false, code, error };
  }

  return {
    ok: false,
    code: "SOURCE_UNAVAILABLE",
    error: "Unexpected workshop sync result.",
  };
}
