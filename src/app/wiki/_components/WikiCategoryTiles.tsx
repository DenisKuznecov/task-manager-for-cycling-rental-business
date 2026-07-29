"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { IconWithBackground } from "@/ui/components/IconWithBackground";
import {
  getUncategorizedIconComponent,
  getWikiCategoryIconComponent,
} from "@/src/lib/wiki/types/icons";
import {
  UNCATEGORIZED_CATEGORY_SLUG,
  type WikiCategory,
} from "@/src/lib/wiki/types/records";

interface WikiCategoryTilesProps {
  categories: WikiCategory[];
  uncategorizedCount: number;
  showUncategorized: boolean;
}

function articleLabel(count: number): string {
  return count === 1 ? "1 article" : `${count} articles`;
}

export function WikiCategoryTiles({
  categories,
  uncategorizedCount,
  showUncategorized,
}: WikiCategoryTilesProps) {
  const router = useRouter();
  const UncategorizedIcon = getUncategorizedIconComponent();

  if (categories.length === 0 && !showUncategorized) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-solid border-neutral-border bg-default-background py-12">
        <span className="text-body-bold font-body-bold text-default-font text-center">
          No categories yet
        </span>
        <span className="text-body font-body text-subtext-color text-center">
          Categories organize wiki documents for the team.
        </span>
      </div>
    );
  }

  return (
    <div className="grid w-full grid-cols-3 gap-4 mobile:grid-cols-1">
      {categories.map((category) => {
        const Icon = getWikiCategoryIconComponent(category.icon);
        const count = category.document_count ?? 0;
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => router.push(`/wiki/category/${category.slug}`)}
            className="flex w-full items-center gap-4 rounded-md border border-solid border-neutral-border bg-default-background px-5 py-4 text-left shadow-sm transition-colors hover:border-brand-200 hover:bg-neutral-50"
          >
            <IconWithBackground
              variant="neutral"
              size="medium"
              square
              icon={<Icon />}
            />
            <div className="flex min-w-0 flex-col items-start gap-0.5">
              <span className="line-clamp-1 text-body-bold font-body-bold text-default-font">
                {category.name}
              </span>
              <span className="text-caption font-caption text-subtext-color">
                {articleLabel(count)}
              </span>
            </div>
          </button>
        );
      })}

      {showUncategorized ? (
        <button
          type="button"
          onClick={() =>
            router.push(`/wiki/category/${UNCATEGORIZED_CATEGORY_SLUG}`)
          }
          className="flex w-full items-center gap-4 rounded-md border border-solid border-neutral-border bg-default-background px-5 py-4 text-left shadow-sm transition-colors hover:border-brand-200 hover:bg-neutral-50"
        >
          <IconWithBackground
            variant="neutral"
            size="medium"
            square
            icon={<UncategorizedIcon />}
          />
          <div className="flex min-w-0 flex-col items-start gap-0.5">
            <span className="line-clamp-1 text-body-bold font-body-bold text-default-font">
              Uncategorized
            </span>
            <span className="text-caption font-caption text-subtext-color">
              {articleLabel(uncategorizedCount)}
            </span>
          </div>
        </button>
      ) : null}
    </div>
  );
}
