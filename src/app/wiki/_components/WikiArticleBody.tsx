"use client";

import "@blocknote/mantine/style.css";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import cn from "classnames";
import type { Block, PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { FeatherList } from "@subframe/core";
import { APP_SCROLL_CONTAINER_SELECTOR } from "@/src/utils/scroll-main";
import { extractNodeText, parseWikiBlocks } from "@/src/lib/wiki/content";

interface WikiArticleBodyProps {
  /** Document body as BlockNote block JSON. */
  content: string;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

/**
 * Walks the document (including nested children, e.g. under toggle headings)
 * and returns the h2/h3 entries for the "On this page" navigation. Block ids
 * double as scroll anchors: BlockNote renders each block wrapped in an
 * element carrying `data-id`.
 */
function buildToc(blocks: Block[]): TocItem[] {
  const items: TocItem[] = [];

  const walk = (nodes: Block[]) => {
    for (const block of nodes) {
      if (block.type === "heading") {
        const level = Number(
          (block.props as Record<string, unknown>).level ?? 1,
        );
        const text = extractNodeText(block.content);
        if ((level === 2 || level === 3) && text) {
          items.push({ id: block.id, text, level });
        }
      }
      if (Array.isArray(block.children) && block.children.length > 0) {
        walk(block.children as Block[]);
      }
    }
  };

  walk(blocks);
  return items;
}

/**
 * Read-only article renderer. Uses the same BlockNote engine as the editor
 * (`editable: false`), so documents look pixel-identical in both modes.
 * Default-exported for `next/dynamic` (`ssr: false`) — BlockNote is
 * client-only.
 */
export default function WikiArticleBody({ content }: WikiArticleBodyProps) {
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const initialBlocks = useMemo(
    () => parseWikiBlocks(content) as unknown as PartialBlock[] | null,
    [content],
  );

  const editor = useCreateBlockNote({
    initialContent:
      initialBlocks && initialBlocks.length > 0 ? initialBlocks : undefined,
    tables: {
      headers: true,
      cellBackgroundColor: true,
      cellTextColor: true,
      splitCells: true,
    },
  });

  useEffect(() => {
    setToc(buildToc(editor.document as Block[]));
  }, [editor]);

  const scrollToBlock = useCallback((id: string) => {
    document
      .querySelector(`[data-id="${id}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Highlight the section currently in view. Observes within the app's scroll
  // container (the page does not scroll on `window`).
  useEffect(() => {
    if (toc.length === 0) return;
    const root = document.querySelector<HTMLElement>(
      APP_SCROLL_CONTAINER_SELECTOR,
    );

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        const topMost = visible.reduce((closest, entry) =>
          entry.boundingClientRect.top < closest.boundingClientRect.top
            ? entry
            : closest,
        );
        const id = topMost.target.getAttribute("data-id");
        if (id) setActiveId(id);
      },
      { root: root ?? null, rootMargin: "0px 0px -70% 0px", threshold: 0 },
    );

    toc.forEach((item) => {
      const element = document.querySelector(`[data-id="${item.id}"]`);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [toc]);

  return (
    <div className="flex w-full items-start gap-10 mobile:flex-col mobile:gap-6">
      <div className="wiki-blocknote-view grow shrink-0 basis-0 w-full max-w-3xl">
        <BlockNoteView editor={editor} editable={false} theme="light" />
      </div>

      {toc.length > 0 ? (
        <nav className="sticky top-0 flex w-56 flex-none flex-col gap-2 mobile:hidden">
          <span className="inline-flex items-center gap-1 text-caption-bold font-caption-bold text-default-font">
            <FeatherList className="h-3 w-3" />
            On this page
          </span>
          {toc.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToBlock(item.id)}
              className={cn(
                "text-left text-caption font-caption text-subtext-color transition-colors hover:text-default-font",
                { "pl-3": item.level === 3 },
                {
                  "text-brand-700 font-caption-bold": activeId === item.id,
                },
              )}
            >
              {item.text}
            </button>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
