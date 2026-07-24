"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FeatherBarChart3, FeatherMegaphone } from "@subframe/core";
import { Badge } from "@/ui/components/Badge";
import { IconWithBackground } from "@/ui/components/IconWithBackground";
import { LinkButton } from "@/ui/components/LinkButton";

export default function HeadquartersPage() {
  const router = useRouter();

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
        {/* Marketing Links */}
        <div className="flex flex-col items-start gap-4 rounded-md border border-solid border-neutral-border bg-default-background p-6">
          <IconWithBackground
            size="large"
            variant="brand"
            icon={<FeatherMegaphone />}
          />
          <div className="flex w-full flex-col items-start gap-1">
            <span className="text-heading-3 font-heading-3 text-default-font">
              Marketing Links
            </span>
            <span className="text-body font-body text-subtext-color">
              Generate and manage trackable UTM short links for partners to
              promote services and track commissions.
            </span>
          </div>
          <LinkButton
            variant="brand"
            onClick={() => router.push("/hq/links")}
          >
            Open Link Manager
          </LinkButton>
        </div>

        {/* Analytics — Coming Soon */}
        <div className="flex flex-col items-start gap-4 rounded-md border border-dashed border-neutral-border bg-default-background p-6">
          <div className="flex w-full items-center justify-between">
            <IconWithBackground
              size="large"
              variant="neutral"
              icon={<FeatherBarChart3 />}
            />
            <Badge variant="neutral">Coming Soon</Badge>
          </div>
          <div className="flex w-full flex-col items-start gap-1">
            <span className="text-heading-3 font-heading-3 text-neutral-400">
              Analytics
            </span>
            <span className="text-body font-body text-neutral-400">
              Global website traffic, conversion rates, and partner performance
              metrics.
            </span>
          </div>
          <LinkButton variant="neutral" disabled>
            View Analytics
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
