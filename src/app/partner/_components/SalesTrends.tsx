"use client";

import React from "react";
import { AreaChart } from "@/ui/components/AreaChart";
import type { PartnerDailyChartPoint } from "./types";

interface SalesTrendsProps {
  data: PartnerDailyChartPoint[];
}

export function SalesTrends({ data }: SalesTrendsProps) {
  return (
    <div className="flex w-full flex-col items-start gap-6">
      <div className="flex w-full items-center gap-2">
        <span className="grow shrink-0 basis-0 text-heading-3 font-heading-3 text-default-font">
          Sales Trends
        </span>
      </div>
      {data.length > 0 ? (
        <AreaChart categories={["Orders"]} data={data} index="Date" />
      ) : (
        <div className="flex h-80 w-full items-center justify-center rounded-md border border-dashed border-neutral-border">
          <span className="text-body font-body text-subtext-color">
            No orders in the selected period
          </span>
        </div>
      )}
    </div>
  );
}
