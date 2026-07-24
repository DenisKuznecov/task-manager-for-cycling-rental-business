import React from "react";
import { SkeletonText } from "@/ui/components/SkeletonText";
import { MarketingLinksBreadcrumbs } from "./MarketingLinksBreadcrumbs";

const TABLE_ROW_COUNT = 8;

export function MarketingLinksLoadingSkeleton() {
  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-8 bg-default-background py-12">
      <MarketingLinksBreadcrumbs />
      <div className="flex w-full items-center justify-between">
        <div className="flex flex-col items-start gap-2">
          <span className="text-heading-1 font-heading-1 text-default-font">
            Marketing Links
          </span>
          <span className="text-body font-body text-subtext-color">
            All short links generated for internal campaigns and partner
            promotions.
          </span>
        </div>
        {/* Create Link button placeholder */}
        <SkeletonText size="default" className="h-9 w-32" />
      </div>

      <div className="flex w-full flex-col items-start gap-6">
        {/* Toolbar: search + filter */}
        <div className="flex w-full items-center gap-2 mobile:flex-col mobile:items-stretch mobile:gap-3">
          <span className="grow shrink-0 basis-0 text-heading-3 font-heading-3 text-default-font mobile:grow-0 mobile:basis-auto">
            All Links
          </span>
          <div className="flex items-center gap-2 mobile:w-full">
            <SkeletonText
              size="default"
              className="h-9 mobile:grow mobile:shrink mobile:basis-0 max-w-64"
            />
            <SkeletonText size="default" className="h-9 w-40 flex-none" />
          </div>
        </div>

        {/* Table */}
        <div className="flex w-full flex-col items-start gap-6 overflow-hidden overflow-x-auto mobile:overflow-auto mobile:max-w-full">
          <div className="flex w-full flex-col items-start gap-4 rounded-md border border-solid border-neutral-border bg-default-background p-4">
            {/* Header row */}
            <div className="flex w-full items-center gap-3 border-b border-solid border-neutral-border pb-3">
              <SkeletonText size="default" className="max-w-28" />
              <SkeletonText size="default" className="max-w-24" />
              <SkeletonText size="default" className="max-w-20" />
              <SkeletonText size="default" className="max-w-24" />
              <SkeletonText size="default" className="max-w-16 ml-auto" />
            </div>

            {/* Data rows */}
            {Array.from({ length: TABLE_ROW_COUNT }).map((_, rowIndex) => (
              <div
                key={rowIndex}
                className="flex w-full items-center gap-3 border-t border-solid border-neutral-border pt-3 first:border-t-0 first:pt-0"
              >
                <SkeletonText size="default" className="max-w-40" />
                <SkeletonText size="default" className="max-w-32" />
                <SkeletonText size="default" className="max-w-28" />
                <SkeletonText size="default" className="max-w-20" />
                <div className="ml-auto flex items-center gap-2">
                  <SkeletonText size="default" className="h-7 w-7" />
                  <SkeletonText size="default" className="h-7 w-7" />
                  <SkeletonText size="default" className="h-7 w-7" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        <div className="flex w-full items-center justify-between gap-4">
          <SkeletonText size="default" className="max-w-32" />
          <div className="flex items-center gap-2">
            <SkeletonText size="default" className="h-8 w-8" />
            <SkeletonText size="default" className="h-8 w-8" />
            <SkeletonText size="default" className="h-8 w-8" />
          </div>
        </div>
      </div>
    </div>
  );
}
