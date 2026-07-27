"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { FeatherClock, FeatherEdit2 } from "@subframe/core";
import { Badge } from "@/ui/components/Badge";
import { Breadcrumbs } from "@/ui/components/Breadcrumbs";
import { Button } from "@/ui/components/Button";
import {
  estimateWikiReadingTimeMinutes,
  isWikiContentEmpty,
} from "@/src/lib/wiki/content";
import type { WikiDocument } from "@/src/lib/wiki/types/records";

// BlockNote only renders client-side; skip SSR for the article body.
const WikiArticleBody = dynamic(() => import("./WikiArticleBody"), {
  ssr: false,
  loading: () => (
    <p className="text-body font-body text-subtext-color">Loading document…</p>
  ),
});

interface WikiDocumentViewProps {
  document: WikiDocument;
  canManage: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Separator() {
  return (
    <span className="text-caption font-caption text-subtext-color">·</span>
  );
}

export function WikiDocumentView({
  document: doc,
  canManage,
}: WikiDocumentViewProps) {
  const router = useRouter();

  const readingTime = useMemo(
    () => estimateWikiReadingTimeMinutes(doc.content),
    [doc.content],
  );
  const hasContent = useMemo(
    () => !isWikiContentEmpty(doc.content),
    [doc.content],
  );

  return (
    <div className="flex w-full flex-col items-start gap-6">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <Breadcrumbs>
          <Breadcrumbs.Item onClick={() => router.push("/wiki")}>
            Wiki
          </Breadcrumbs.Item>
          {doc.category_name && doc.category_slug ? (
            <>
              <Breadcrumbs.Divider />
              <Breadcrumbs.Item
                onClick={() =>
                  router.push(`/wiki?category=${doc.category_slug}`)
                }
              >
                {doc.category_name}
              </Breadcrumbs.Item>
            </>
          ) : null}
          <Breadcrumbs.Divider />
          <Breadcrumbs.Item active={true}>{doc.title}</Breadcrumbs.Item>
        </Breadcrumbs>

        {canManage ? (
          <Button
            variant="neutral-secondary"
            icon={<FeatherEdit2 />}
            onClick={() => router.push(`/wiki/edit/${doc.id}`)}
          >
            Edit
          </Button>
        ) : null}
      </div>

      <div className="flex w-full flex-col items-start gap-3">
        {doc.category_name || (canManage && doc.status === "draft") ? (
          <div className="flex flex-wrap items-center gap-2">
            {doc.category_name ? (
              <Badge variant={doc.category_color ?? "neutral"}>
                {doc.category_name}
              </Badge>
            ) : null}
            {canManage && doc.status === "draft" ? (
              <Badge variant="neutral">Draft</Badge>
            ) : null}
          </div>
        ) : null}

        <span className="text-heading-1 font-heading-1 text-default-font">
          {doc.title}
        </span>

        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1 text-caption font-caption text-subtext-color">
            <FeatherClock className="h-3 w-3" />
            {readingTime} min read
          </span>
          <Separator />
          <span className="text-caption font-caption text-subtext-color">
            Updated {formatDate(doc.updated_at)}
          </span>
        </div>
      </div>

      <div className="flex h-px w-full flex-none bg-neutral-border" />

      {hasContent ? (
        <WikiArticleBody content={doc.content} />
      ) : (
        <p className="text-body font-body text-subtext-color">
          This document is empty.
        </p>
      )}
    </div>
  );
}
