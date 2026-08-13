import React from "react";
import { SkeletonText } from "@/ui/components/SkeletonText";

export function TemplateVersionDetailLoadingSkeleton() {
  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-8 bg-default-background py-12">
      <div className="flex w-full flex-col gap-2">
        <SkeletonText size="section-header" className="h-10 w-72 max-w-full" />
        <SkeletonText size="default" className="h-6 w-64 max-w-full" />
      </div>
      <div className="grid w-full grid-cols-2 gap-4 mobile:grid-cols-1">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <SkeletonText size="label" className="h-5 w-24" />
            <SkeletonText size="default" className="h-6 w-32" />
          </div>
        ))}
      </div>
      <div className="flex w-full flex-col gap-3">
        <SkeletonText size="section-header" className="h-8 w-24" />
        <div className="flex w-full flex-col rounded-md border border-solid border-neutral-border px-6 py-8">
          <SkeletonText size="default" className="h-6 w-56 max-w-full" />
        </div>
      </div>
    </div>
  );
}
