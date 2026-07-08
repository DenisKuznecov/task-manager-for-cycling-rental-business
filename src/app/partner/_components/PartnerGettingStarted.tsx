"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { DialogLayout } from "@/ui/layouts/DialogLayout";
import {
  FeatherCalendar,
  FeatherCheck,
  FeatherClipboard,
  FeatherDollarSign,
  FeatherArrowUpRight,
  FeatherUser,
  FeatherX,
} from "@subframe/core";
import * as SubframeCore from "@subframe/core";
import { acknowledgeOnboarding } from "../_lib/onboarding-actions";

interface PartnerGettingStartedProps {
  partnerName: string;
  partnerSlug: string | null;
  promoCode: string | null;
}

const FEATURES = [
  {
    icon: FeatherDollarSign,
    title: "Sales & Commission",
    description:
      "Track total order value, booking count, and your earned commission over any period.",
  },
  {
    icon: FeatherArrowUpRight,
    title: "Page Traffic",
    description:
      "See how many cyclists visit your partner page and click through to book.",
  },
  {
    icon: FeatherCalendar,
    title: "Bookings",
    description:
      "Browse every booking made through your partner link with full order details.",
  },
  {
    icon: FeatherUser,
    title: "Customers",
    description:
      "View all customers who have booked through your referral over time.",
  },
];

export function PartnerGettingStarted({
  partnerName,
  partnerSlug,
  promoCode,
}: PartnerGettingStartedProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [isDismissing, setIsDismissing] = useState(false);
  const [dismissError, setDismissError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const partnerUrl = partnerSlug
    ? `https://www.echeloncyclinghub.com/partners${partnerSlug}`
    : null;

  const handleCopy = async () => {
    if (!partnerUrl) return;
    try {
      await navigator.clipboard.writeText(partnerUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[PartnerGettingStarted] copy failed", err);
    }
  };

  const handleDismiss = async () => {
    setIsDismissing(true);
    setDismissError(null);
    const result = await acknowledgeOnboarding();
    if (!result.ok) {
      setDismissError(result.error);
      setIsDismissing(false);
      return;
    }
    router.refresh();
  };

  return (
    <DialogLayout open={open} onOpenChange={setOpen}>
      <div className="flex w-[680px] max-w-[calc(100vw-2rem)] flex-col gap-6 p-6 mobile:gap-4 mobile:p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-heading-3 font-heading-3 text-default-font">
              Welcome, {partnerName}!
            </span>
            <span className="text-body font-body text-default-font">
              We&apos;re very glad our partnership has started. Here&apos;s
              where you&apos;ll track your bookings and commission as data comes
              in.
            </span>
          </div>
          {/* X closes without writing to DB */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="flex flex-none cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-1 text-subtext-color hover:bg-neutral-100 transition-colors"
          >
            <FeatherX className="text-body font-body" />
          </button>
        </div>

        <div className="h-px w-full flex-none bg-neutral-border" />

        {/* Feature blurbs — 2-column on desktop, 1-column on mobile */}
        <div className="grid w-full grid-cols-2 gap-x-8 gap-y-4 mobile:grid-cols-1">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <SubframeCore.IconWrapper className="text-body font-body text-brand-primary">
                  <Icon />
                </SubframeCore.IconWrapper>
                <span className="text-body-bold font-body-bold text-default-font">
                  {title}
                </span>
              </div>
              <span className="text-body font-body text-subtext-color">
                {description}
              </span>
            </div>
          ))}
        </div>

        {/* Partner link + promo code — shown only when partner is linked */}
        {(partnerUrl || promoCode) && (
          <>
            <div className="h-px w-full flex-none bg-neutral-border" />

            <div className="flex w-full flex-col items-start gap-3">
              <span className="text-body-bold font-body-bold text-default-font">
                Share these to start seeing data here
              </span>

              <div className="flex w-full flex-wrap items-end gap-3 mobile:flex-col mobile:items-stretch">
                {/* Partner URL display with copy */}
                {partnerUrl && (
                  <SubframeCore.Popover.Root open={copied}>
                    <SubframeCore.Popover.Trigger asChild>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md border border-solid border-neutral-border bg-neutral-50 px-3 py-2 text-left transition-colors hover:bg-neutral-100 mobile:w-full mobile:flex-none"
                      >
                        <span className="min-w-0 flex-1 truncate text-body font-body text-default-font mobile:text-[13px]">
                          {partnerUrl}
                        </span>
                        <span className="flex flex-none items-center gap-1 whitespace-nowrap text-body font-body text-brand-primary">
                          {copied ? (
                            <FeatherCheck className="text-[14px] text-mint-700" />
                          ) : (
                            <FeatherClipboard className="text-[14px]" />
                          )}
                          <span className="text-body font-body">
                            {copied ? "Copied!" : "Copy link"}
                          </span>
                        </span>
                      </button>
                    </SubframeCore.Popover.Trigger>
                    <SubframeCore.Popover.Portal>
                      <SubframeCore.Popover.Content
                        side="top"
                        align="center"
                        sideOffset={4}
                        asChild
                      >
                        <div className="flex flex-col items-start gap-1 rounded-md border border-solid border-neutral-border bg-default-background px-2 py-2 shadow-lg">
                          <span className="text-body font-body text-default-font">
                            Copied!
                          </span>
                        </div>
                      </SubframeCore.Popover.Content>
                    </SubframeCore.Popover.Portal>
                  </SubframeCore.Popover.Root>
                )}

                {/* Promo code pill */}
                {promoCode && (
                  <div className="flex flex-none items-center gap-2 rounded-md border border-solid border-neutral-border bg-neutral-50 px-3 py-2 mobile:w-full">
                    <span className="text-body font-body text-subtext-color">
                      Promo code:
                    </span>
                    <span className="text-body-bold font-body-bold text-default-font">
                      {promoCode}
                    </span>
                  </div>
                )}
              </div>

              {promoCode && (
                <span className="text-body font-body text-subtext-color">
                  Your promo code is automatically applied to all orders placed
                  through your partner link — no action needed on your end.
                </span>
              )}
            </div>
          </>
        )}

        <div className="h-px w-full flex-none bg-neutral-border" />

        {/* Footer: hint + dismiss */}
        <div className="flex w-full items-center justify-between gap-3 mobile:flex-col mobile:items-start">
          {dismissError ? (
            <span className="text-body font-body text-error-700" role="alert">
              {dismissError}
            </span>
          ) : (
            <span className="text-body font-body text-subtext-color">
              You can always find your partner link in the header above.
            </span>
          )}
          <Button
            className="flex-none mobile:w-full"
            variant="brand-primary"
            loading={isDismissing}
            disabled={isDismissing}
            onClick={handleDismiss}
          >
            {isDismissing ? "Saving..." : "Got it"}
          </Button>
        </div>
      </div>
    </DialogLayout>
  );
}
