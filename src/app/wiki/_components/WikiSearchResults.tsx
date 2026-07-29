"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FeatherFileText } from "@subframe/core";
import { Badge } from "@/ui/components/Badge";
import { TablePagination } from "@/src/components/TablePagination";
import type { WikiDocument, WikiStatus } from "@/src/lib/wiki/types/records";

interface WikiSearchResultsProps {
  documents: WikiDocument[];
  currentPage: number;
  totalPages: number;
  canManage: boolean;
  onPageChange: (page: number) => void;
}

function statusBadge(status: WikiStatus) {
  return status === "published" ? (
    <Badge variant="success">Published</Badge>
  ) : (
    <Badge variant="neutral">Draft</Badge>
  );
}

export function WikiSearchResults({
  documents,
  currentPage,
  totalPages,
  canManage,
  onPageChange,
}: WikiSearchResultsProps) {
  const router = useRouter();

  if (documents.length === 0) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-solid border-neutral-border bg-default-background py-12">
        <FeatherFileText className="text-heading-2 font-heading-2 text-neutral-400" />
        <span className="text-body-bold font-body-bold text-default-font text-center">
          No articles found
        </span>
        <span className="text-body font-body text-subtext-color text-center">
          Try a different search term.
        </span>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-start gap-3">
      {documents.map((doc) => (
        <button
          key={doc.id}
          type="button"
          onClick={() => router.push(`/wiki/${doc.slug}`)}
          className="flex w-full flex-col items-start gap-2 rounded-md border border-solid border-neutral-border bg-default-background px-5 py-4 text-left shadow-sm transition-colors hover:border-brand-200 hover:bg-neutral-50"
        >
          <div className="flex w-full flex-wrap items-center gap-2">
            <span className="grow shrink-0 basis-0 text-body-bold font-body-bold text-default-font">
              {doc.title}
            </span>
            {canManage ? statusBadge(doc.status) : null}
          </div>
          <span className="text-caption font-caption text-subtext-color">
            {doc.category_name ?? "Uncategorized"}
          </span>
        </button>
      ))}

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}
