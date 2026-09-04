import React from "react";
import { SkeletonText } from "@/ui/components/SkeletonText";

const SECTION_COUNT = 5;
const ROW_COUNT = 3;

export function CustomerDetailsDrawerSkeleton() {
  return (
    <>
      {Array.from({ length: SECTION_COUNT }).map((_, sectionIndex) => (
        <div
          key={sectionIndex}
          className="mb-4 w-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
        >
          <SkeletonText size="label" className="mb-3 max-w-28" />
          <div className="flex w-full flex-col gap-3">
            {Array.from({ length: ROW_COUNT }).map((__, rowIndex) => (
              <div
                key={rowIndex}
                className="flex w-full items-center justify-between gap-4"
              >
                <SkeletonText size="default" className="max-w-24" />
                <SkeletonText size="default" className="max-w-36" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
