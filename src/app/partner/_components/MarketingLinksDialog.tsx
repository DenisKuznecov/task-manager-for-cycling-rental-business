"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/ui/components/Button";
import { DialogLayout } from "@/ui/layouts/DialogLayout";
import { fetchPartnerMarketingLinks } from "../_lib/marketing-links-action";
import { PartnerMarketingLinks } from "./PartnerMarketingLinks";
import type { PartnerMarketingLink } from "../_lib/loadPartnerOverview";

interface MarketingLinksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  partnerSlug: string;
}

export function MarketingLinksDialog({
  open,
  onOpenChange,
  partnerId,
  partnerSlug,
}: MarketingLinksDialogProps) {
  const [links, setLinks] = useState<PartnerMarketingLink[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!open || fetchedRef.current) return;

    let cancelled = false;
    setLoading(true);

    fetchPartnerMarketingLinks(partnerId).then((result) => {
      if (cancelled) return;
      setLinks(result.links);
      setError(result.error);
      setLoading(false);
      fetchedRef.current = true;
    });

    return () => {
      cancelled = true;
    };
  }, [open, partnerId]);

  return (
    <DialogLayout open={open} onOpenChange={onOpenChange}>
      <div className="flex w-[640px] max-w-full flex-col gap-6 p-6">
        <div className="flex items-center justify-between gap-4">
          <span className="text-heading-3 font-heading-3 text-default-font">
            Your Marketing Links
          </span>
          <Button
            type="button"
            variant="neutral-tertiary"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>

        {loading ? (
          <div className="flex w-full items-center justify-center py-10">
            <span className="text-body font-body text-subtext-color">
              Loading links...
            </span>
          </div>
        ) : (
          <PartnerMarketingLinks
            links={links}
            partnerSlug={partnerSlug}
            error={error}
            showHeader={false}
          />
        )}
      </div>
    </DialogLayout>
  );
}
