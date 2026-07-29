"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Breadcrumbs } from "@/ui/components/Breadcrumbs";
import { WikiDirectory } from "../../../_components/WikiDirectory";
import type {
  WikiCategory,
  WikiDocument,
  WikiStatusFilter,
} from "@/src/lib/wiki/types/records";

interface WikiCategoryPageClientProps {
  categoryName: string;
  editableCategory: WikiCategory | null;
  documents: WikiDocument[];
  currentPage: number;
  totalPages: number;
  query: string;
  status: WikiStatusFilter;
  canManage: boolean;
}

export function WikiCategoryPageClient({
  categoryName,
  editableCategory,
  documents,
  currentPage,
  totalPages,
  query,
  status,
  canManage,
}: WikiCategoryPageClientProps) {
  const router = useRouter();

  return (
    <div className="flex w-full flex-col items-start gap-6">
      <Breadcrumbs>
        <Breadcrumbs.Item onClick={() => router.push("/wiki")}>
          Wiki
        </Breadcrumbs.Item>
        <Breadcrumbs.Divider />
        <Breadcrumbs.Item active={true}>{categoryName}</Breadcrumbs.Item>
      </Breadcrumbs>

      <WikiDirectory
        documents={documents}
        categoryName={categoryName}
        editableCategory={editableCategory}
        currentPage={currentPage}
        totalPages={totalPages}
        query={query}
        status={status}
        canManage={canManage}
      />
    </div>
  );
}
