import { createClient } from "@/src/utils/supabase/server";

export const MARKETING_LINKS_PAGE_SIZE = 10;

export interface MarketingLinkRow {
  id: string;
  title: string;
  short_url: string;
  long_url: string;
  short_io_id: string | null;
  partner_id: string | null;
  created_by: string | null;
  created_at: string;
  partner: { name: string } | null;
}

export async function loadMarketingLinksPage(
  page: number,
  limit: number = MARKETING_LINKS_PAGE_SIZE,
  query: string = "",
  assignment: string = "",
): Promise<{ links: MarketingLinkRow[]; count: number; error: string | null }> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const supabase = await createClient();
  let queryBuilder = supabase
    .from("marketing_links")
    .select("*, partner:partners(name)", { count: "exact" });

  const trimmed = query.trim();
  if (trimmed) {
    const escaped = trimmed.replace(/[,()]/g, "");
    queryBuilder = queryBuilder.or(
      `title.ilike.%${escaped}%,short_url.ilike.%${escaped}%,long_url.ilike.%${escaped}%`,
    );
  }

  if (assignment === "internal") {
    queryBuilder = queryBuilder.is("partner_id", null);
  } else if (assignment && isUUID(assignment)) {
    queryBuilder = queryBuilder.eq("partner_id", assignment);
  }

  const { data, count, error } = await queryBuilder
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("loadMarketingLinksPage:", error);
    return { links: [], count: 0, error: error.message };
  }

  return {
    links: (data as MarketingLinkRow[] | null) ?? [],
    count: count ?? 0,
    error: null,
  };
}

function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
