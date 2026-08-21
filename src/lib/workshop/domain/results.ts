import { isBikeTaskStatus, type BikeTaskStatus } from "./statuses";
import {
  isWorkshopErrorCode,
  type WorkshopErrorCode,
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
