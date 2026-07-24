import React from "react";
import { SkeletonText } from "@/ui/components/SkeletonText";

export function HqLoadingSkeleton() {
  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-8 bg-default-background py-12">
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-1 font-heading-1 text-default-font">
          Headquarters
        </span>
        <span className="text-body font-body text-subtext-color">
          Internal operations and system configurations.
        </span>
      </div>

      <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-start gap-4 rounded-md border border-solid border-neutral-border bg-default-background p-6"
          >
            <SkeletonText size="default" className="h-10 w-10 rounded-md" />
            <div className="flex w-full flex-col items-start gap-1">
              <SkeletonText size="default" className="max-w-36" />
              <SkeletonText size="default" className="max-w-full" />
              <SkeletonText size="default" className="max-w-48" />
            </div>
            <SkeletonText size="default" className="h-8 max-w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
