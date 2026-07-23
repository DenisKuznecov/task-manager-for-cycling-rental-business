import React from "react";
import { SkeletonText } from "@/ui/components/SkeletonText";

const FIELD_COUNT = 7;

export function UtmBuilderLoadingSkeleton() {
  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-8 bg-default-background py-12">
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-1 font-heading-1 text-default-font">
          UTM Builder
        </span>
        <span className="text-body font-body text-subtext-color">
          Generate trackable UTM links for partners to promote services and
          track commissions.
        </span>
      </div>

      <div className="w-full max-w-2xl mx-auto">
        <div className="flex w-full flex-col items-start gap-6 rounded-md border border-solid border-neutral-border bg-default-background p-6">
          {/* Assignment toggle placeholder */}
          <div className="flex w-full flex-col items-start gap-2">
            <SkeletonText size="default" className="max-w-20" />
            <SkeletonText size="default" className="h-9 w-56" />
          </div>

          {/* Form fields */}
          {Array.from({ length: FIELD_COUNT }).map((_, i) => (
            <div key={i} className="flex w-full flex-col items-start gap-2">
              <SkeletonText size="default" className="max-w-32" />
              <SkeletonText size="default" className="h-9 w-full" />
            </div>
          ))}

          {/* Submit button */}
          <SkeletonText size="default" className="h-9 w-36" />
        </div>
      </div>
    </div>
  );
}
