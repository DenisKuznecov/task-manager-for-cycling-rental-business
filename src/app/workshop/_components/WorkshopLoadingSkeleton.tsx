import React from "react";
import { SkeletonText } from "@/ui/components/SkeletonText";

const TABLE_ROW_COUNT = 15;
const TASK_TABLE_COLUMNS = [
  "Bike ID",
  "Bike title",
  "Customer",
  "Order #",
  "From",
  "Until",
  "Status",
  "Warnings",
] as const;

/** The queue's eight-column footprint, shared by route and refresh loading states. */
export function WorkshopTaskTableSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex w-full flex-col items-start gap-4 rounded-md border border-solid border-neutral-border bg-default-background p-4"
    >
      <span className="sr-only">Loading workshop tasks</span>
      <div aria-hidden className="flex w-full min-w-max items-center gap-3 border-b border-solid border-neutral-border pb-3">
        {TASK_TABLE_COLUMNS.map((column) => (
          <SkeletonText
            key={column}
            size="default"
            className="min-w-20 flex-1"
          />
        ))}
      </div>
      {Array.from({ length: TABLE_ROW_COUNT }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          aria-hidden
          className="flex w-full min-w-max items-center gap-3 border-t border-solid border-neutral-border pt-3 first:border-t-0 first:pt-0"
        >
          {TASK_TABLE_COLUMNS.map((column) => (
            <SkeletonText
              key={column}
              size="default"
              className="min-w-20 flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function WorkshopLoadingSkeleton() {
  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-6 bg-default-background pt-4 pb-12">
      <div className="flex w-full flex-col items-start gap-3">
        <div className="flex flex-col items-start gap-2">
          <SkeletonText size="section-header" className="max-w-64" />
          <SkeletonText size="default" className="max-w-96" />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <SkeletonText size="default" className="h-10 w-40" />
          <SkeletonText size="default" className="h-10 w-36" />
          <SkeletonText size="default" className="max-w-md" />
        </div>
      </div>

      <SkeletonText
        size="default"
        className="hidden h-8 w-full mobile:block"
      />
      <div className="flex w-full flex-wrap items-stretch gap-2 mobile:hidden">
        {Array.from({ length: 8 }).map((_, index) => (
          <SkeletonText
            key={index}
            size="default"
            className="h-12 min-w-28 grow basis-0"
          />
        ))}
      </div>

      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <SkeletonText size="default" className="h-10 w-16" />
          <SkeletonText size="default" className="h-10 w-20" />
          <SkeletonText size="default" className="h-10 w-24" />
          <SkeletonText size="default" className="h-10 w-28" />
        </div>
        <SkeletonText size="default" className="h-8 max-w-md grow" />
      </div>

      <WorkshopTaskTableSkeleton />
    </div>
  );
}

export function WorkshopTaskLoadingSkeleton() {
  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-8 bg-default-background pt-4 pb-12">
      <SkeletonText size="default" className="max-w-64" />
      <div className="flex w-full items-center justify-between gap-4">
        <SkeletonText size="section-header" className="max-w-80" />
        <SkeletonText size="default" className="h-10 w-32" />
      </div>
      <SkeletonText size="default" className="max-w-48" />
      {Array.from({ length: 6 }).map((_, index) => (
        <SkeletonText key={index} size="default" className="h-12 w-full" />
      ))}
    </div>
  );
}
