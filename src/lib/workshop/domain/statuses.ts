export const BIKE_TASK_STATUSES = [
  "to_prepare",
  "being_prepared",
  "needs_recheck",
  "ready_for_pickup",
  "in_rental",
  "returned",
  "prepare_for_storage",
  "completed",
  "cancelled",
] as const;

export type BikeTaskStatus = (typeof BIKE_TASK_STATUSES)[number];

export const WORKSHOP_QUEUE_FILTERS = [
  "all",
  "today",
  "tomorrow",
  "next_7_days",
] as const;

export type WorkshopQueueFilter = (typeof WORKSHOP_QUEUE_FILTERS)[number];

/** Status tiles on the queue. Cancelled is never a tile. */
export const WORKSHOP_QUEUE_STATUSES = [
  "to_prepare",
  "being_prepared",
  "needs_recheck",
  "ready_for_pickup",
  "in_rental",
  "returned",
  "prepare_for_storage",
  "completed",
] as const;

export type WorkshopQueueStatus = (typeof WORKSHOP_QUEUE_STATUSES)[number];

export const CHECKLIST_ITEM_TYPES = ["action", "tyre_pressure_psi"] as const;
export type ChecklistItemType = (typeof CHECKLIST_ITEM_TYPES)[number];

export const CHECKLIST_ITEM_STAGES = ["preparation", "storage"] as const;
export type ChecklistItemStage = (typeof CHECKLIST_ITEM_STAGES)[number];

export const CHECKLIST_ITEM_OUTCOMES = ["completed", "not_applicable"] as const;
export type ChecklistItemOutcome = (typeof CHECKLIST_ITEM_OUTCOMES)[number];

export const ATTESTATION_STAGES = ["m1", "m2", "storage"] as const;
export type AttestationStage = (typeof ATTESTATION_STAGES)[number];

export const TASK_KIND_RENTAL_TURNAROUND = "rental_turnaround" as const;
export type BikeTaskKind = typeof TASK_KIND_RENTAL_TURNAROUND;

const STATUS_SET = new Set<string>(BIKE_TASK_STATUSES);
const FILTER_SET = new Set<string>(WORKSHOP_QUEUE_FILTERS);
const QUEUE_STATUS_SET = new Set<string>(WORKSHOP_QUEUE_STATUSES);

export function isBikeTaskStatus(value: unknown): value is BikeTaskStatus {
  return typeof value === "string" && STATUS_SET.has(value);
}

export function isWorkshopQueueFilter(
  value: unknown,
): value is WorkshopQueueFilter {
  return typeof value === "string" && FILTER_SET.has(value);
}

export function isWorkshopQueueStatus(
  value: unknown,
): value is WorkshopQueueStatus {
  return typeof value === "string" && QUEUE_STATUS_SET.has(value);
}

/** Invalid list-filter values become `all`. */
export function resolveWorkshopQueueFilter(
  value: string | null | undefined,
): WorkshopQueueFilter {
  return isWorkshopQueueFilter(value) ? value : "all";
}

/**
 * Missing/invalid `status` means active work (exclude completed and cancelled).
 * `cancelled` is not a tile and never matches.
 */
export function resolveWorkshopQueueStatus(
  value: string | null | undefined,
): WorkshopQueueStatus | null {
  return isWorkshopQueueStatus(value) ? value : null;
}
