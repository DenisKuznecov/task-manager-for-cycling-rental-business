"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FeatherPlus, FeatherSearch, FeatherX } from "@subframe/core";
import { Button } from "@/ui/components/Button";
import { TextField } from "@/ui/components/TextField";
import { createWikiDocument } from "@/src/lib/wiki/actions/wiki-actions";
import type { WikiCategory, WikiDocument } from "@/src/lib/wiki/types/records";
import { WikiCategoryFormDialog } from "./WikiCategoryFormDialog";
import { WikiCategoryTiles } from "./WikiCategoryTiles";
import { WikiSearchResults } from "./WikiSearchResults";

interface WikiHomeProps {
  categories: WikiCategory[];
  uncategorizedCount: number;
  canManage: boolean;
  query: string;
  searchDocuments: WikiDocument[];
  searchPage: number;
  searchTotalPages: number;
  searchError: string | null;
}

const SEARCH_DEBOUNCE_MS = 300;

export function WikiHome({
  categories,
  uncategorizedCount,
  canManage,
  query,
  searchDocuments,
  searchPage,
  searchTotalPages,
  searchError,
}: WikiHomeProps) {
  const router = useRouter();
  const [search, setSearch] = useState(query);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, startCreating] = useTransition();

  useEffect(() => {
    setSearch(query);
  }, [query]);

  useEffect(() => {
    if (search === query) return;

    const handle = setTimeout(() => {
      const trimmed = search.trim();
      if (!trimmed) {
        router.push("/wiki");
        return;
      }
      const params = new URLSearchParams();
      params.set("query", trimmed);
      router.push(`/wiki?${params.toString()}`);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [search, query, router]);

  const handleCreateDocument = () => {
    if (isCreating) return;
    setCreateError(null);
    startCreating(async () => {
      const result = await createWikiDocument();
      if (!result.ok) {
        setCreateError(result.error);
        return;
      }
      router.push(`/wiki/edit/${result.id}`);
    });
  };

  const showSearchResults = Boolean(query.trim());
  const showUncategorized = canManage || uncategorizedCount > 0;

  return (
    <div className="flex w-full flex-col items-start gap-8">
      <div className="flex w-full flex-col items-start gap-4">
        <div className="flex w-full flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col items-start gap-2">
            <span className="text-heading-1 font-heading-1 text-default-font">
              Wiki
            </span>
            <span className="text-body font-body text-subtext-color">
              Company processes, guidelines, and documentation for the team.
            </span>
          </div>
          {canManage ? (
            <div className="flex flex-col items-end gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="neutral-secondary"
                  icon={<FeatherPlus />}
                  onClick={() => setCreateCategoryOpen(true)}
                >
                  New category
                </Button>
                <Button
                  variant="brand-primary"
                  icon={<FeatherPlus />}
                  loading={isCreating}
                  disabled={isCreating}
                  onClick={handleCreateDocument}
                >
                  New document
                </Button>
              </div>
              {createError ? (
                <span className="text-caption font-caption text-error-700">
                  {createError}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <TextField className="w-full max-w-xl" label="" helpText="">
          <TextField.Input
            placeholder="Search for articles…"
            value={search}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setSearch(event.target.value)
            }
          />
        </TextField>
        {query.trim() ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-caption font-caption text-brand-700 hover:underline"
            onClick={() => {
              setSearch("");
              router.push("/wiki");
            }}
          >
            <FeatherX className="h-3.5 w-3.5" />
            Clear search
          </button>
        ) : null}
      </div>

      {searchError ? (
        <span className="text-body font-body text-error-700">{searchError}</span>
      ) : null}

      {showSearchResults ? (
        <div className="flex w-full flex-col items-start gap-4">
          <div className="flex items-center gap-2">
            <FeatherSearch className="h-4 w-4 text-subtext-color" />
            <span className="text-heading-3 font-heading-3 text-default-font">
              Results for &ldquo;{query.trim()}&rdquo;
            </span>
          </div>
          <WikiSearchResults
            documents={searchDocuments}
            currentPage={searchPage}
            totalPages={searchTotalPages}
            canManage={canManage}
            onPageChange={(page) => {
              const params = new URLSearchParams();
              params.set("query", query.trim());
              if (page !== 1) params.set("page", String(page));
              router.push(`/wiki?${params.toString()}`);
            }}
          />
        </div>
      ) : (
        <WikiCategoryTiles
          categories={categories}
          uncategorizedCount={uncategorizedCount}
          showUncategorized={showUncategorized}
        />
      )}

      {canManage ? (
        <WikiCategoryFormDialog
          open={createCategoryOpen}
          onOpenChange={setCreateCategoryOpen}
        />
      ) : null}
    </div>
  );
}
