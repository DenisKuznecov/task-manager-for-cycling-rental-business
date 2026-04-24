"use client";

import React from "react";
import { Select } from "@/ui/components/Select";
import { SalesTrends } from "./SalesTrends";

export function OverviewStats() {
  const [timeframe, setTimeframe] = React.useState("month");

  return (
    <>
      <div className="flex w-full justify-start">
        <Select
          className="w-40 flex-none"
          value={timeframe}
          onValueChange={setTimeframe}
        >
          <Select.Item value="all-time">All Time</Select.Item>
          <Select.Item value="month">Past month</Select.Item>
          <Select.Item value="week">Past week</Select.Item>
        </Select>
      </div>
      <div className="flex w-full flex-wrap items-start rounded-md border border-solid border-neutral-border bg-default-background mobile:flex-col mobile:flex-nowrap mobile:gap-0">
        <div className="flex grow shrink-0 basis-0 flex-col items-center justify-center gap-2 px-4 py-4">
          <span className="text-body-bold font-body-bold text-default-font text-center">
            Total Order Value
          </span>
          <span className="whitespace-nowrap text-heading-1 font-heading-1 text-default-font text-center">
            €24,892
          </span>
        </div>
        <div className="flex w-px flex-none flex-col items-center gap-2 self-stretch bg-neutral-border mobile:h-px mobile:w-full mobile:flex-none" />
        <div className="flex grow shrink-0 basis-0 flex-col items-center justify-center gap-2 px-4 py-4">
          <span className="text-body-bold font-body-bold text-default-font text-center">
            Orders
          </span>
          <span className="whitespace-nowrap text-heading-1 font-heading-1 text-default-font text-center">
            842
          </span>
        </div>
        <div className="flex w-px flex-none flex-col items-center gap-2 self-stretch bg-neutral-border mobile:h-px mobile:w-full mobile:flex-none" />
        <div className="flex grow shrink-0 basis-0 flex-col items-center justify-center gap-2 px-4 py-4">
          <span className="text-body-bold font-body-bold text-default-font text-center">
            Your Commission (10%)
          </span>
          <span className="whitespace-nowrap text-heading-1 font-heading-1 text-default-font text-center">
            €800
          </span>
        </div>
        <div className="flex w-px flex-none flex-col items-center gap-2 self-stretch bg-neutral-border" />
      </div>
      <SalesTrends />
      <div className="flex h-px w-full flex-none flex-col items-center gap-2 bg-neutral-border" />
    </>
  );
}
