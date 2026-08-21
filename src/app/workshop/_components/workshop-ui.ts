import type { BikeTaskStatus, WorkshopTaskItem } from "@/src/lib/workshop/domain";

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
