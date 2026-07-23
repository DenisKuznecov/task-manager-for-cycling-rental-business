import React from "react";
import { FeatherPlus } from "@subframe/core";
import { Button } from "@/ui/components/Button";
import { createClient } from "@/src/utils/supabase/server";
import { DataLoadError } from "@/src/components/DataLoadError";
import {
  MARKETING_LINKS_PAGE_SIZE,
  loadMarketingLinksPage,
} from "@/src/lib/marketing-links";
import { MarketingLinksTable } from "./_components/MarketingLinksTable";

export type PartnerOption = { id: string; name: string };

export default async function MarketingLinksPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    query?: string;
    assignment?: string;
  }>;
}) {
  const {
    page: pageParam,
    limit: limitParam,
    query: queryParam,
    assignment: assignmentParam,
  } = await searchParams;

  const page = Math.max(1, Number(pageParam) || 1);
  const limit = Math.max(1, Number(limitParam) || MARKETING_LINKS_PAGE_SIZE);
  const query = queryParam ?? "";
  const assignment = assignmentParam ?? "";

  const supabase = await createClient();

  const [linksResult, partnersResult] = await Promise.all([
    loadMarketingLinksPage(page, limit, query, assignment),
    supabase.from("partners").select("id, name").order("name", { ascending: true }),
  ]);

  if (partnersResult.error) {
    console.error("MarketingLinksPage: failed to load partners", partnersResult.error);
  }

  const partners: PartnerOption[] = (partnersResult.data as PartnerOption[] | null) ?? [];
  const totalPages = Math.ceil(linksResult.count / limit);

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
        <a href="/hq/utm-builder">
          <Button variant="brand-primary" icon={<FeatherPlus />}>
            Create Link
          </Button>
        </a>
      </div>

      {linksResult.error ? (
        <DataLoadError
          title="Couldn't load marketing links"
          message={linksResult.error}
        />
      ) : null}

      <MarketingLinksTable
        links={linksResult.links}
        partners={partners}
        currentPage={page}
        totalPages={totalPages}
        query={query}
        assignment={assignment}
      />
    </div>
  );
}
