import React from "react";
import { Badge } from "@/ui/components/Badge";
import type { PartnerOrder, PartnerOrderStatus } from "./types";

const ORDER_STATUS_VARIANTS: readonly PartnerOrderStatus[] = [
  "draft",
  "new",
  "canceled",
  "reserved",
  "started",
  "stopped",
  "archived",
];

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function OrderStatusBadge({ status }: { status: PartnerOrder["status"] }) {
  if (!status || !ORDER_STATUS_VARIANTS.includes(status)) {
    return <span className="text-body font-body text-neutral-500">—</span>;
  }
  return <Badge variant={status}>{capitalize(status)}</Badge>;
}
