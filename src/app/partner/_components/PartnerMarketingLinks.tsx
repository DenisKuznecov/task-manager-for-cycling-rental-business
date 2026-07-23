import React from "react";
import { Badge } from "@/ui/components/Badge";
import { CopyToClipboardButton } from "@/ui/components/CopyToClipboardButton";
import { DataLoadError } from "@/src/components/DataLoadError";
import { parseUtmParams } from "@/src/utils/utm";
import type { PartnerMarketingLink } from "../_lib/loadPartnerOverview";

interface PartnerMarketingLinksProps {
  links: PartnerMarketingLink[];
  partnerSlug: string | null;
  error: string | null;
  showHeader?: boolean;
}

export function PartnerMarketingLinks({
  links,
  partnerSlug,
  error,
  showHeader = true,
}: PartnerMarketingLinksProps) {
  const defaultUrl = partnerSlug
    ? `https://www.echeloncyclinghub.com/partners${partnerSlug}`
    : null;

  const showDefaultFallback = links.length === 0 && defaultUrl !== null;
  const showEmptyState = links.length === 0 && defaultUrl === null;

  return (
    <div className="flex w-full flex-col items-start gap-6">
      {showHeader ? (
        <div className="flex w-full items-center gap-2">
          <span className="grow shrink-0 basis-0 text-heading-3 font-heading-3 text-default-font">
            Your Marketing Links
          </span>
        </div>
      ) : null}

      {error ? (
        <DataLoadError
          title="Couldn't load marketing links"
          message={error}
        />
      ) : showEmptyState ? (
        <div className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-solid border-neutral-border bg-default-background py-12">
          <span className="text-body-bold font-body-bold text-default-font text-center">
            No marketing links yet
          </span>
          <span className="text-body font-body text-subtext-color text-center">
            Your marketing links will appear here once they are set up.
          </span>
        </div>
      ) : showDefaultFallback ? (
        <div className="flex w-full flex-col items-start gap-4">
          <LinkCard
            title="Your Partner Link"
            shortUrl={defaultUrl!}
            longUrl={null}
          />
          <p className="text-body font-body text-subtext-color">
            This default link doesn&apos;t support detailed traffic tracking. If
            you&apos;d like to track where your clients come from (Instagram,
            Facebook, your website, etc.), reach out to us and we&apos;ll
            prepare tailored marketing links for you.
          </p>
        </div>
      ) : (
        <div className="grid w-full grid-cols-2 gap-4 mobile:grid-cols-1">
          {links.map((link) => (
            <LinkCard
              key={link.id}
              title={link.title}
              shortUrl={link.short_url}
              longUrl={link.long_url}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface LinkCardProps {
  title: string;
  shortUrl: string;
  longUrl: string | null;
}

function LinkCard({ title, shortUrl, longUrl }: LinkCardProps) {
  const utmParams = longUrl ? parseUtmParams(longUrl) : [];

  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-solid border-neutral-border bg-default-background p-4">
      <span className="text-body-bold font-body-bold text-default-font">
        {title}
      </span>
      <div className="flex w-full items-center gap-1">
        <span className="grow shrink-0 basis-0 truncate text-body font-body text-default-font">
          {shortUrl}
        </span>
        <CopyToClipboardButton
          clipboardText={shortUrl}
          tooltipText="Copy link"
        />
      </div>
      {utmParams.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {utmParams.map(({ key, value }) => (
            <Badge key={key} variant="neutral">
              {key}: {value}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
