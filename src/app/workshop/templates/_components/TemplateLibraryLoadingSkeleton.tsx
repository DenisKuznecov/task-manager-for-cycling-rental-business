import React from "react";
import { SkeletonText } from "@/ui/components/SkeletonText";

export function TemplateLibraryLoadingSkeleton() {
  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-6 bg-default-background py-12">
      <div className="flex flex-col gap-2">
        <SkeletonText size="section-header" className="h-10 w-56" />
        <SkeletonText size="default" className="h-6 w-96 max-w-full" />
      </div>
      <div className="grid w-full grid-cols-3 gap-4 mobile:grid-cols-1">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <SkeletonText size="label" className="h-5 w-24" />
            <SkeletonText size="default" className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="flex w-full flex-col rounded-md border border-solid border-neutral-border">
        <SkeletonText size="default" className="m-4 h-6 w-4/5" />
        <SkeletonText size="default" className="m-4 h-6 w-3/5" />
        <SkeletonText size="default" className="m-4 h-6 w-2/3" />
      </div>
    </div>
  );
}
