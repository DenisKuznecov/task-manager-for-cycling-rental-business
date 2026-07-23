"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FeatherPlus } from "@subframe/core";
import { Button } from "@/ui/components/Button";

export default function MarketingLinksPage() {
  const router = useRouter();

  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-8 bg-default-background py-12">
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
        <Button
          variant="brand-primary"
          icon={<FeatherPlus />}
          onClick={() => router.push("/hq/utm-builder")}
        >
          Create Link
        </Button>
      </div>

      {/* Placeholder — link directory coming soon */}
      <div className="flex w-full flex-col items-center gap-3 rounded-md border border-dashed border-neutral-border bg-neutral-50 py-16">
        <span className="text-heading-3 font-heading-3 text-neutral-400">
          Link directory coming soon
        </span>
        <span className="text-body font-body text-neutral-400">
          Links you create will appear here.
        </span>
      </div>
    </div>
  );
}
