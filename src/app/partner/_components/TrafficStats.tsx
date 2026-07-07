"use client";

import React, { useMemo } from "react";
import { AreaChart } from "@/ui/components/AreaChart";
import { DataLoadError } from "@/src/components/DataLoadError";
import type {
  PartnerDailyTraffic,
  PartnerTrafficChartPoint,
} from "./types";

interface TrafficStatsProps {
  dailyTraffic: PartnerDailyTraffic[];
  totalViews: number;
  totalVisitors: number;
  error?: string | null;
}

export function TrafficStats({
  dailyTraffic,
  totalViews,
  totalVisitors,
  error,
}: TrafficStatsProps) {
  const chartData = useMemo<PartnerTrafficChartPoint[]>(
    () =>
      dailyTraffic.map((day) => ({
        Date: day.date,
        "Page Views": day.views,
        "Unique Visitors": day.visitors,
      })),
    [dailyTraffic],
  );

  const hasData = chartData.length > 0;

  return (
    <div className="flex w-full flex-col items-start gap-6">
      <span className="text-heading-2 font-heading-2 text-default-font">
        Promo Page Traffic
      </span>
      <div className="flex w-full flex-wrap items-start overflow-hidden rounded-md border border-solid border-neutral-border bg-default-background mobile:flex-col mobile:flex-nowrap mobile:items-stretch mobile:gap-0">
        <div className="flex grow shrink-0 basis-0 flex-col items-center justify-center gap-2 px-4 py-4 mobile:grow-0 mobile:basis-auto mobile:px-3 mobile:py-3">
          <span className="text-body-bold font-body-bold text-default-font text-center">
            Page Views
          </span>
          <span className="whitespace-nowrap text-heading-1 font-heading-1 text-default-font text-center">
            {error ? "—" : totalViews.toLocaleString("en-IE")}
          </span>
        </div>
        <div className="flex w-px flex-none flex-col items-center gap-2 self-stretch bg-neutral-border mobile:h-px mobile:w-full mobile:flex-none" />
        <div className="flex grow shrink-0 basis-0 flex-col items-center justify-center gap-2 px-4 py-4 mobile:grow-0 mobile:basis-auto mobile:px-3 mobile:py-3">
          <span className="text-body-bold font-body-bold text-default-font text-center">
            Unique Visitors
          </span>
          <span className="whitespace-nowrap text-heading-1 font-heading-1 text-default-font text-center">
            {error ? "—" : totalVisitors.toLocaleString("en-IE")}
          </span>
        </div>
      </div>
      {error ? (
        <DataLoadError title="Couldn't load traffic" message={error} />
      ) : hasData ? (
        <AreaChart
          categories={["Page Views", "Unique Visitors"]}
          data={chartData}
          index="Date"
        />
      ) : (
        <span className="text-body font-body text-subtext-color">
          No page-view data for this period yet.
        </span>
      )}
    </div>
  );
}
