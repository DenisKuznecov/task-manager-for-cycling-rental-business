import React from "react";
import { notFound } from "next/navigation";
import { DataLoadError } from "@/src/components/DataLoadError";
import {
  WIKI_PAGE_SIZE,
  getWikiCategoryBySlug,
  getWikiDocuments,
  type WikiStatusFilter,
} from "@/src/lib/wiki/data/wiki";
import { getMyProfile } from "@/src/lib/profile";
import { UNCATEGORIZED_CATEGORY_SLUG } from "@/src/lib/wiki/types/records";
import { WikiCategoryPageClient } from "./_components/WikiCategoryPageClient";

function resolveStatusFilter(value: string | undefined): WikiStatusFilter {
  return value === "draft" || value === "published" ? value : "all";
}

export default async function WikiCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    page?: string;
    query?: string;
    status?: string;
  }>;
}) {
  const { slug } = await params;
  const {
    page: pageParam,
    query: queryParam,
    status: statusParam,
  } = await searchParams;

  const page = Math.max(1, Number(pageParam) || 1);
  const query = queryParam ?? "";
  const status = resolveStatusFilter(statusParam);

  const { role } = await getMyProfile();
  const canManage = role === "admin" || role === "manager";
  const effectiveStatus: WikiStatusFilter = canManage ? status : "all";

  const isUncategorized = slug === UNCATEGORIZED_CATEGORY_SLUG;

  const [categoryResult, documentsResult] = await Promise.all([
    isUncategorized
      ? Promise.resolve({ category: null, error: null })
      : getWikiCategoryBySlug(slug),
    getWikiDocuments(
      {
        query,
        categorySlug: slug,
        status: effectiveStatus,
      },
      page,
    ),
  ]);

  if (!isUncategorized) {
    if (categoryResult.error) {
      return (
        <div className="container max-w-none flex w-full flex-col items-start gap-8 bg-default-background py-12">
          <DataLoadError
            title="Couldn't load category"
            message={categoryResult.error}
          />
        </div>
      );
    }
    if (!categoryResult.category) {
      notFound();
    }
  }

  const { documents, count, error: documentsError } = documentsResult;
  const totalPages = Math.max(1, Math.ceil(count / WIKI_PAGE_SIZE));
  const categoryName = isUncategorized
    ? "Uncategorized"
    : (categoryResult.category?.name ?? "Category");

  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-8 bg-default-background py-12">
      {documentsError ? (
        <DataLoadError
          title="Couldn't load documents"
          message={documentsError}
        />
      ) : null}

      <WikiCategoryPageClient
        categoryName={categoryName}
        editableCategory={categoryResult.category}
        documents={documents}
        currentPage={page}
        totalPages={totalPages}
        query={query}
        status={status}
        canManage={canManage}
      />
    </div>
  );
}
