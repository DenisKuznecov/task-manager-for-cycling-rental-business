"use client";

import React, { useMemo } from "react";
import { FeatherArrowUpRight, FeatherArrowDownRight } from "@subframe/core";
import { Badge } from "@/ui/components/Badge";
import { BarChart } from "@/ui/components/BarChart";
import { DataLoadError } from "@/src/components/DataLoadError";
import type {
  PartnerDailyTraffic,
  PartnerTrafficChartPoint,
} from "./types";

interface TrafficStatsProps {
  dailyTraffic: PartnerDailyTraffic[];
  totalViews: number;
  totalVisitors: number;
  viewsChangePct: number | null;
  visitorsChangePct: number | null;
  bookBikePeople: number;
  bookToursPeople: number;
  error?: string | null;
}

function TrendBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;

  if (pct > 0) {
    return (
      <Badge variant="mint" icon={<FeatherArrowUpRight />}>
        {pct}%
      </Badge>
    );
  }
  if (pct < 0) {
    return (
      <Badge variant="error" icon={<FeatherArrowDownRight />}>
        {Math.abs(pct)}%
      </Badge>
    );
  }
  return (
    <Badge variant="neutral">0%</Badge>
  );
}

export function TrafficStats({
  dailyTraffic,
  totalViews,
  totalVisitors,
  viewsChangePct,
  visitorsChangePct,
  bookBikePeople,
  bookToursPeople,
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

  const tiles = [
    {
      label: "Page Views",
      value: error ? "—" : totalViews.toLocaleString("en-IE"),
      badge: error ? null : <TrendBadge pct={viewsChangePct} />,
    },
    {
      label: "Unique Visitors",
      value: error ? "—" : totalVisitors.toLocaleString("en-IE"),
      badge: error ? null : <TrendBadge pct={visitorsChangePct} />,
    },
    {
      label: "Book Bike Clicks",
      value: error ? "—" : bookBikePeople.toLocaleString("en-IE"),
      badge: null,
    },
    {
      label: "Book Tours Clicks",
      value: error ? "—" : bookToursPeople.toLocaleString("en-IE"),
      badge: null,
    },
  ];

  return (
    <div className="flex w-full flex-col items-start gap-6">
      <span className="text-heading-2 font-heading-2 text-default-font">
        Promo Page Traffic
      </span>
      <div className="flex w-full flex-wrap items-start overflow-hidden rounded-md border border-solid border-neutral-border bg-default-background mobile:flex-col mobile:flex-nowrap mobile:items-stretch mobile:gap-0">
        {tiles.map((tile, index) => (
          <React.Fragment key={tile.label}>
            <div className="flex grow shrink-0 basis-0 flex-col items-center justify-center gap-2 px-4 py-4 mobile:grow-0 mobile:basis-auto mobile:px-3 mobile:py-3">
              <span className="text-body-bold font-body-bold text-default-font text-center">
                {tile.label}
              </span>
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap text-heading-1 font-heading-1 text-default-font text-center">
                  {tile.value}
                </span>
                {tile.badge}
              </div>
            </div>
            {index < tiles.length - 1 ? (
              <div className="flex w-px flex-none flex-col items-center gap-2 self-stretch bg-neutral-border mobile:h-px mobile:w-full mobile:flex-none" />
            ) : null}
          </React.Fragment>
        ))}
      </div>
      {error ? (
        <DataLoadError title="Couldn't load traffic" message={error} />
      ) : hasData ? (
        <BarChart
          categories={["Page Views", "Unique Visitors"]}
          data={chartData}
          index="Date"
        />
      ) : (
        <div className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-solid border-neutral-border bg-default-background py-12">
          <span className="text-body-bold font-body-bold text-default-font text-center">
            No traffic data yet
          </span>
          <span className="text-body font-body text-subtext-color text-center">
            Views of your partner page will appear here once visitors arrive.
          </span>
        </div>
      )}
    </div>
  );
}
