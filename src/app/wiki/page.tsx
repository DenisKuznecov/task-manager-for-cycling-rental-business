import React from "react";
import { DataLoadError } from "@/src/components/DataLoadError";
import {
  WIKI_PAGE_SIZE,
  getWikiCategoriesWithCounts,
  getWikiDocuments,
} from "@/src/lib/wiki/data/wiki";
import { getMyProfile } from "@/src/lib/profile";
import { WikiHome } from "./_components/WikiHome";

export default async function WikiPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    query?: string;
  }>;
}) {
  const { page: pageParam, query: queryParam } = await searchParams;

  const page = Math.max(1, Number(pageParam) || 1);
  const query = queryParam ?? "";
  const trimmedQuery = query.trim();

  const { role } = await getMyProfile();
  const canManage = role === "admin" || role === "manager";

  const [categoriesResult, searchResult] = await Promise.all([
    getWikiCategoriesWithCounts(),
    trimmedQuery
      ? getWikiDocuments({ query: trimmedQuery, status: "all" }, page)
      : Promise.resolve({ documents: [], count: 0, error: null }),
  ]);

  const {
    categories,
    uncategorizedCount,
    error: categoriesError,
  } = categoriesResult;
  const {
    documents: searchDocuments,
    count,
    error: searchError,
  } = searchResult;
  const searchTotalPages = Math.max(1, Math.ceil(count / WIKI_PAGE_SIZE));

  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-8 bg-default-background py-12">
      {categoriesError ? (
        <DataLoadError
          title="Couldn't load categories"
          message={categoriesError}
        />
      ) : null}

      <WikiHome
        categories={categories}
        uncategorizedCount={uncategorizedCount}
        canManage={canManage}
        query={query}
        searchDocuments={searchDocuments}
        searchPage={page}
        searchTotalPages={searchTotalPages}
        searchError={searchError}
      />
    </div>
  );
}
