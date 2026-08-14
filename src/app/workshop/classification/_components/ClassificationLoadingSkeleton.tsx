import React from "react";
import { SkeletonText } from "@/ui/components/SkeletonText";

export function ClassificationLoadingSkeleton() {
  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-6 bg-default-background py-12">
      <div className="flex flex-col gap-2">
        <SkeletonText size="section-header" className="h-10 w-72" />
        <SkeletonText size="default" className="h-6 w-96 max-w-full" />
      </div>
      <div className="flex w-full flex-col gap-3 rounded-md border border-solid border-neutral-border p-4">
        <SkeletonText size="label" className="h-5 w-40" />
        <SkeletonText size="default" className="h-6 w-4/5" />
        <SkeletonText size="default" className="h-6 w-3/5" />
      </div>
    </div>
  );
}
