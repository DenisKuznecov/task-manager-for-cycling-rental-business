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

export function workshopBikeId(task: {
  bikeDisplayId: string | null;
  bikeSourceId: string;
}): string {
  return task.bikeDisplayId?.trim() || task.bikeSourceId?.trim() || "Unknown bike";
}

export function workshopBikeLabel(task: {
  bikeDisplayId: string | null;
  bikeSourceId: string;
  bikeTitle: string | null;
}): string {
  const id = workshopBikeId(task);
  if (id === "Unknown bike") return id;
  const title = task.bikeTitle?.trim();
  return title ? `${id} · ${title}` : id;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Numeric Madrid wall clock — ICU must not pick `Sept` vs `Sep` or `at` vs `,`. */
function madridClockParts(date: Date): {
  weekday: (typeof WEEKDAYS)[number];
  day: string;
  dayPadded: string;
  month: string;
  monthName: (typeof MONTHS)[number];
  year: string;
  hour: string;
  minute: string;
} | null {
  if (Number.isNaN(date.getTime())) return null;
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
  const year = Number(value("year"));
  const month = Number(value("month"));
  const day = Number(value("day"));
  if (!year || !month || !day) return null;
  return {
    weekday: WEEKDAYS[new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()],
    day: String(day),
    dayPadded: value("day"),
    month: value("month"),
    monthName: MONTHS[month - 1],
    year: value("year"),
    hour: value("hour"),
    minute: value("minute"),
  };
}

/** Start time as `DD-MM-YYYY HH:mm` in Europe/Madrid. Task page only. */
export function formatWorkshopStart(
  startsAt: string | null,
  madridStartDate: string | null,
): string {
  if (startsAt) {
    const clock = madridClockParts(new Date(startsAt));
    if (clock) {
      return `${clock.dayPadded}-${clock.month}-${clock.year} ${clock.hour}:${clock.minute}`;
    }
  }
  return madridStartDate ?? "—";
}

/** Queue From/Until: `Thu 27 Aug · 19:00` in Europe/Madrid. */
export function formatWorkshopQueueWhen(
  startsAt: string | null,
  madridStartDate: string | null,
): string {
  if (startsAt) {
    const clock = madridClockParts(new Date(startsAt));
    if (clock) {
      return `${clock.weekday} ${clock.day} ${clock.monthName} · ${clock.hour}:${clock.minute}`;
    }
  }
  return madridStartDate ?? "—";
}

/** Task page From–Until using the same Madrid clock as the queue. */
export function formatWorkshopFromUntil(
  startsAt: string | null,
  stopsAt: string | null,
  madridStartDate: string | null,
): string {
  return `${formatWorkshopQueueWhen(startsAt, madridStartDate)} – ${formatWorkshopQueueWhen(stopsAt, null)}`;
}

export function shouldRenderWorkshopQueue(error: string | null): boolean {
  return error === null;
}

/** Radix Select forbids an empty value; this row clears the mobile status filter. */
export const WORKSHOP_QUEUE_STATUS_SELECT_NONE = "__none__";

export function queueStatusSelectValue(
  status: WorkshopQueueStatus | null,
): string {
  return status ?? WORKSHOP_QUEUE_STATUS_SELECT_NONE;
}

export function statusFromQueueSelectValue(
  value: string,
): WorkshopQueueStatus | null {
  if (value === WORKSHOP_QUEUE_STATUS_SELECT_NONE) return null;
  if (value === "cancelled" || !(value in WORKSHOP_STATUS_LABELS)) return null;
  return value as WorkshopQueueStatus;
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
>): string | null {
  if (item.m1Outcome === "not_applicable") {
    return "Marked not applicable";
  }
  if (item.itemType === "tyre_pressure_psi" && item.m1Psi != null) {
    return `${item.m1Psi} PSI`;
  }
  if (item.m1Outcome !== "completed") {
    return "Preparation incomplete";
  }
  return null;
}

/** SSR-safe Madrid clock: ICU must not pick `at` vs `,` or `Sept` vs `Sep`. */
export function formatMadridDateTime(iso: string): string {
  const clock = madridClockParts(new Date(iso));
  if (!clock) return iso;
  return `${clock.day} ${clock.monthName} ${clock.year}, ${clock.hour}:${clock.minute}`;
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

const ATTENTION_TILES = new Set<WorkshopQueueStatus>([
  "to_prepare",
  "being_prepared",
  "needs_recheck",
]);

const TILE_ACCENTS: Record<
  WorkshopQueueStatus,
  { bar: string; barMuted: string; tint: string }
> = {
  to_prepare: {
    bar: "shadow-[inset_4px_0_0_0_rgb(217_119_6)]",
    barMuted: "shadow-[inset_4px_0_0_0_rgb(253_230_138)]",
    tint: "bg-brand-50 text-brand-800",
  },
  being_prepared: {
    bar: "shadow-[inset_4px_0_0_0_rgb(146_64_14)]",
    barMuted: "shadow-[inset_4px_0_0_0_rgb(252_211_77)]",
    tint: "bg-neutral-50 text-brand-900",
  },
  needs_recheck: {
    bar: "shadow-[inset_4px_0_0_0_rgb(220_38_38)]",
    barMuted: "shadow-[inset_4px_0_0_0_rgb(254_202_202)]",
    tint: "bg-error-50 text-error-800",
  },
  ready_for_pickup: {
    bar: "shadow-[inset_4px_0_0_0_rgb(45_212_191)]",
    barMuted: "shadow-[inset_4px_0_0_0_rgb(153_246_228)]",
    tint: "bg-success-50 text-success-800",
  },
  in_rental: {
    bar: "shadow-[inset_4px_0_0_0_rgb(15_118_110)]",
    barMuted: "shadow-[inset_4px_0_0_0_rgb(153_246_228)]",
    tint: "bg-success-50 text-success-800",
  },
  returned: {
    bar: "shadow-[inset_4px_0_0_0_rgb(94_234_212)]",
    barMuted: "shadow-[inset_4px_0_0_0_rgb(204_251_241)]",
    tint: "bg-success-50 text-success-700",
  },
  prepare_for_storage: {
    bar: "shadow-[inset_4px_0_0_0_rgb(124_58_237)]",
    barMuted: "shadow-[inset_4px_0_0_0_rgb(221_214_254)]",
    tint: "bg-violet-50 text-violet-800",
  },
  completed: {
    bar: "shadow-[inset_4px_0_0_0_rgb(148_163_184)]",
    barMuted: "shadow-[inset_4px_0_0_0_rgb(226_232_240)]",
    tint: "bg-neutral-50 text-neutral-700",
  },
};

const TILE_BASE =
  "flex min-h-16 min-w-28 grow basis-0 flex-col items-start justify-center gap-1 rounded-md border border-solid border-neutral-200 px-3 py-2 text-left";

export function statusTileClassName(
  status: WorkshopQueueStatus,
  selected: boolean,
  count: number,
): string {
  const accent = TILE_ACCENTS[status];
  if (selected) {
    return `${TILE_BASE} ${accent.bar} bg-brand-50 text-default-font ring-2 ring-brand-600 ring-offset-2`;
  }
  if (count <= 0) {
    return `${TILE_BASE} ${accent.barMuted} bg-default-background text-neutral-400`;
  }
  if (ATTENTION_TILES.has(status)) {
    return `${TILE_BASE} ${accent.bar} ${accent.tint}`;
  }
  return `${TILE_BASE} ${accent.bar} bg-default-background text-default-font`;
}

/** Booqable titles mix `|` option slots and commas; drop empty slots. */
export function cleanAddonText(value: string): string {
  return value
    .split(/\s*[|·]\s*/)
    .map((segment) =>
      segment
        .split(",")
        .map((part) => part.trim().replace(/\s{2,}/g, " "))
        .filter((part) => part.length > 0 && !/^free$/i.test(part))
        .join(", "),
    )
    .filter(Boolean)
    .join(" · ");
}

export function parseAddonTitle(title: string | null): {
  label: string;
  value: string | null;
} {
  const raw = title?.trim() || "Add-on";
  const separator = raw.indexOf(" - ");
  if (separator === -1) {
    return { label: cleanAddonText(raw) || raw, value: null };
  }
  const label = cleanAddonText(raw.slice(0, separator)) || raw;
  const value = cleanAddonText(raw.slice(separator + 3));
  return { label, value: value || null };
}
