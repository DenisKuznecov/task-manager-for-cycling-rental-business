import React from "react";
import { SkeletonText } from "@/ui/components/SkeletonText";

const TABLE_ROW_COUNT = 8;

export function WorkshopLoadingSkeleton() {
  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-8 bg-default-background py-12">
      <div className="flex w-full flex-col items-start gap-2">
        <SkeletonText size="section-header" className="max-w-64" />
        <SkeletonText size="default" className="max-w-96" />
      </div>

      <div className="flex w-full items-center gap-4 border-b border-solid border-neutral-border">
        <SkeletonText size="default" className="h-10 w-20" />
        <SkeletonText size="default" className="h-10 w-24" />
        <SkeletonText size="default" className="h-10 w-28" />
        <SkeletonText size="default" className="h-10 w-16" />
      </div>

      <SkeletonText size="default" className="h-10 max-w-md" />

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
    <div className="container max-w-none flex w-full flex-col items-start gap-8 bg-default-background py-12">
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
