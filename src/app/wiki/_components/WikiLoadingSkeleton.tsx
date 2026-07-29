import React from "react";
import { SkeletonText } from "@/ui/components/SkeletonText";

const TILE_COUNT = 6;

export function WikiLoadingSkeleton() {
  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-8 bg-default-background py-12">
      <div className="flex w-full flex-col items-start gap-4">
        <div className="flex w-full flex-col items-start gap-2">
          <span className="text-heading-1 font-heading-1 text-default-font">
            Wiki
          </span>
          <span className="text-body font-body text-subtext-color">
            Company processes, guidelines, and documentation for the team.
          </span>
        </div>
        <SkeletonText size="default" className="h-9 w-full max-w-xl" />
      </div>

      <div className="grid w-full grid-cols-3 gap-4 mobile:grid-cols-1">
        {Array.from({ length: TILE_COUNT }).map((_, index) => (
          <div
            key={index}
            className="flex w-full items-center gap-4 rounded-md border border-solid border-neutral-border bg-default-background px-5 py-4"
          >
            <SkeletonText size="default" className="h-8 w-8 flex-none" />
            <div className="flex grow shrink-0 basis-0 flex-col items-start gap-2">
              <SkeletonText size="default" className="max-w-40" />
              <SkeletonText size="default" className="max-w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
