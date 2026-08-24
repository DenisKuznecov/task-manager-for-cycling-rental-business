import type {
  BikeTaskStatus,
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
): "warning" | "neutral" | "error" | "info" | "success" {
  switch (status) {
    case "completed":
    case "in_rental":
      return "success";
    case "ready_for_pickup":
      return "info";
    case "cancelled":
      return "error";
    case "returned":
      return "neutral";
    case "to_prepare":
    case "being_prepared":
    case "needs_recheck":
    case "prepare_for_storage":
      return "warning";
  }
}
