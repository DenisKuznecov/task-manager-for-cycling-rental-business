import type {
  BikeTaskStatus,
  WorkshopQueueFilter,
  WorkshopQueueStatus,
  WorkshopTaskItem,
} from "@/src/lib/workshop/domain";

export const WORKSHOP_STATUS_LABELS: Record<BikeTaskStatus, string> = {
  to_prepare: "To prepare",
  being_prepared: "Being prepared",
  needs_recheck: "Needs recheck",
  ready_for_pickup: "Ready for pickup",
  in_rental: "In rental",
  returned: "Returned",
  prepare_for_storage: "Prepare for storage",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function workshopBikeLabel(task: {
  bikeDisplayId: string | null;
  bikeSourceId: string;
  bikeTitle: string | null;
}): string {
  const id = task.bikeDisplayId?.trim() || task.bikeSourceId?.trim() || "";
  if (!id) return "Unknown bike";
  const title = task.bikeTitle?.trim();
  return title ? `${id} · ${title}` : id;
}

/** Start time as `DD-MM-YYYY HH:mm` in Europe/Madrid. */
export function formatWorkshopStart(
  startsAt: string | null,
  madridStartDate: string | null,
): string {
  if (startsAt) {
    const date = new Date(startsAt);
    if (!Number.isNaN(date.getTime())) {
      const parts = new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: "Europe/Madrid",
      }).formatToParts(date);
      const value = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((part) => part.type === type)?.value ?? "";
      return `${value("day")}-${value("month")}-${value("year")} ${value("hour")}:${value("minute")}`;
    }
  }
  return madridStartDate ?? "—";
}

export function shouldRenderWorkshopQueue(error: string | null): boolean {
  return error === null;
}

/** Queue URL: omit `filter` when All, omit `status` when active work, omit `page` when 1. */
export function buildWorkshopQueueHref(
  pathname: string,
  nextQuery: string,
  nextPage: number,
  nextFilter: WorkshopQueueFilter,
  nextStatus: WorkshopQueueStatus | null,
): string {
  const params = new URLSearchParams();
  if (nextFilter !== "all") params.set("filter", nextFilter);
  if (nextStatus) params.set("status", nextStatus);
  const trimmed = nextQuery.trim();
  if (trimmed) params.set("query", trimmed);
  if (nextPage !== 1) params.set("page", String(nextPage));
  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

/** Block list→task (and other queue URL changes) while this run is in flight. */
export function shouldBlockQueueNavigation(
  isPending: boolean,
  health: { state: string | null; cursor: string | null },
): boolean {
  return isPending || (health.state === "in_progress" && !health.cursor);
}

export function isM1ItemValid(item: WorkshopTaskItem): boolean {
  if (!item.required) return true;
  if (item.m1Outcome === "not_applicable") return item.naAllowed;
  if (item.itemType === "tyre_pressure_psi") {
    return (
      item.m1Outcome === "completed" &&
      item.m1Psi != null &&
      Number.isFinite(item.m1Psi) &&
      item.m1Psi > 0
    );
  }
  return item.m1Outcome === "completed";
}

export function m2ItemCaption(item: Pick<
  WorkshopTaskItem,
  "m1Outcome" | "itemType" | "m1Psi"
>): string {
  if (item.m1Outcome === "not_applicable") {
    return "M1 marked not applicable";
  }
  if (item.m1Outcome === "completed") {
    if (item.itemType === "tyre_pressure_psi" && item.m1Psi != null) {
      return `M1 recorded ${item.m1Psi} PSI`;
    }
    return "M1 completed";
  }
  return "M1 is incomplete";
}

/** SSR-safe Madrid clock: ICU must not pick `at` vs `,` between date and time. */
export function formatMadridDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const datePart = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Madrid",
  });
  const timePart = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/Madrid",
  });
  return `${datePart}, ${timePart}`;
}

export function statusBadgeVariant(
  status: BikeTaskStatus,
): "warning" | "neutral" | "error" | "info" | "success" | "dark" | "mint" | null {
  switch (status) {
    case "to_prepare":
      return "warning";
    case "being_prepared":
      return "dark";
    case "needs_recheck":
      return "error";
    case "ready_for_pickup":
      return "info";
    case "in_rental":
      return "success";
    case "returned":
      return "mint";
    case "prepare_for_storage":
      return null;
    case "completed":
      return "neutral";
    case "cancelled":
      return "error";
  }
}

/** Custom (not a Badge variant) colour for prepare-for-storage. */
export const PREPARE_FOR_STORAGE_BADGE_CLASS =
  "!border-violet-300 !bg-violet-100 [&_span]:!text-violet-800";

export const PREPARE_FOR_STORAGE_TILE_CLASS =
  "border-violet-300 bg-violet-100 text-violet-800";

export function workshopStatusBadgeProps(status: BikeTaskStatus): {
  variant: "warning" | "neutral" | "error" | "info" | "success" | "dark" | "mint";
  className?: string;
} {
  const variant = statusBadgeVariant(status);
  if (variant == null) {
    return { variant: "neutral", className: PREPARE_FOR_STORAGE_BADGE_CLASS };
  }
  return { variant };
}

export function statusTileClassName(
  status: WorkshopQueueStatus,
  selected: boolean,
): string {
  const palette: Record<WorkshopQueueStatus, string> = {
    to_prepare: "border-brand-100 bg-brand-100 text-brand-800",
    being_prepared: "border-brand-800 bg-brand-800 text-brand-200",
    needs_recheck: "border-error-100 bg-error-100 text-error-800",
    ready_for_pickup: "border-success-100 bg-success-100 text-success-800",
    in_rental: "border-success-700 bg-success-700 text-success-100",
    returned: "border-success-50 bg-success-50 text-success-700",
    prepare_for_storage: PREPARE_FOR_STORAGE_TILE_CLASS,
    completed: "border-neutral-100 bg-neutral-200 text-neutral-700",
  };
  const selectedClass = selected ? "ring-2 ring-brand-600 ring-offset-1" : "";
  return `flex min-h-16 min-w-28 grow basis-0 flex-col items-start justify-center gap-1 rounded-md border border-solid px-3 py-2 text-left ${palette[status]} ${selectedClass}`;
}
