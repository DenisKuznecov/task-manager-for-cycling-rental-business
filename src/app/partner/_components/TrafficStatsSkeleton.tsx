import React from "react";
import { SkeletonText } from "@/ui/components/SkeletonText";

/**
 * Suspense fallback for {@link TrafficStatsSection}. Mirrors the real section
 * layout (title, two KPI cards, chart area) so the page doesn't shift when the
 * PostHog data resolves.
 */
export function TrafficStatsSkeleton() {
  return (
    <div className="flex w-full flex-col items-start gap-6">
      <SkeletonText size="section-header" className="max-w-48" />
      <div className="flex w-full flex-wrap items-start overflow-hidden rounded-md border border-solid border-neutral-border bg-default-background mobile:flex-col mobile:flex-nowrap mobile:items-stretch mobile:gap-0">
        {Array.from({ length: 2 }).map((_, index) => (
          <React.Fragment key={index}>
            <div className="flex grow shrink-0 basis-0 flex-col items-center justify-center gap-2 px-4 py-4 mobile:grow-0 mobile:basis-auto mobile:px-3 mobile:py-3">
              <SkeletonText size="label" className="w-28" />
              <SkeletonText size="header" className="w-24" />
            </div>
            {index < 1 ? (
              <div className="flex w-px flex-none self-stretch bg-neutral-border mobile:h-px mobile:w-full mobile:flex-none" />
            ) : null}
          </React.Fragment>
        ))}
      </div>
      <SkeletonText size="default" className="h-80 w-full" />
    </div>
  );
}
