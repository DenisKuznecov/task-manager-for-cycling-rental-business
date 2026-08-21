export const WORKSHOP_STAFF_COMMANDS = [
  "workshop_set_item_outcome",
  "workshop_confirm_m2_item",
  "workshop_start_preparation",
  "workshop_complete_m1",
  "workshop_complete_m2",
  "workshop_mark_picked_up",
  "workshop_mark_returned",
  "workshop_start_storage",
  "workshop_complete_storage",
] as const;

export type WorkshopStaffCommand = (typeof WORKSHOP_STAFF_COMMANDS)[number];

export const WORKSHOP_ERROR_CODES = [
  "STALE_VERSION",
  "INVALID_TRANSITION",
  "INCOMPLETE_CHECKLIST",
  "ADD_ONS_CHANGED",
  "TASK_CANCELLED",
  "FORBIDDEN",
  "PROFILE_NAME_REQUIRED",
  "CONFIGURATION_BLOCKED",
  "SYNC_IN_PROGRESS",
  "SOURCE_UNAVAILABLE",
] as const;

export type WorkshopErrorCode = (typeof WORKSHOP_ERROR_CODES)[number];

const ERROR_CODE_SET = new Set<string>(WORKSHOP_ERROR_CODES);

export function isWorkshopErrorCode(value: unknown): value is WorkshopErrorCode {
  return typeof value === "string" && ERROR_CODE_SET.has(value);
}
