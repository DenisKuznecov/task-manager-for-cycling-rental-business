import React from "react";
import { SkeletonText } from "@/ui/components/SkeletonText";

const TABLE_ROW_COUNT = 8;

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

      <div className="flex w-full flex-col items-start gap-4 rounded-md border border-solid border-neutral-border bg-default-background p-4">
        <div className="flex w-full items-center gap-3 border-b border-solid border-neutral-border pb-3">
          <SkeletonText size="default" className="max-w-28" />
          <SkeletonText size="default" className="max-w-20" />
          <SkeletonText size="default" className="max-w-24" />
          <SkeletonText size="default" className="max-w-24" />
          <SkeletonText size="default" className="max-w-20" />
          <SkeletonText size="default" className="max-w-16" />
        </div>
        {Array.from({ length: TABLE_ROW_COUNT }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex w-full items-center gap-3 border-t border-solid border-neutral-border pt-3 first:border-t-0 first:pt-0"
          >
            <SkeletonText size="default" className="max-w-40" />
            <SkeletonText size="default" className="max-w-16" />
            <SkeletonText size="default" className="max-w-24" />
            <SkeletonText size="default" className="max-w-28" />
            <SkeletonText size="default" className="max-w-16" />
            <SkeletonText size="default" className="max-w-16" />
          </div>
        ))}
      </div>
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
