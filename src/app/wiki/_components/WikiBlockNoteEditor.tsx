"use client";

import "@blocknote/mantine/style.css";

import React, { useEffect, useMemo, useState } from "react";
import type { PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { FeatherAlertTriangle } from "@subframe/core";
import { uploadWikiMedia } from "@/src/utils/wiki-media-upload";
import { parseWikiBlocks } from "@/src/lib/wiki/content";

interface WikiBlockNoteEditorProps {
  /**
   * Initial document body (BlockNote block JSON, or Markdown for documents
   * predating the BlockNote editor). Read ONCE on mount — the parent owns the
   * value afterwards via `onChange`, so we never push it back into the editor
   * (that would reset the cursor on every autosave round-trip).
   */
  initialContent: string;
  /** Receives the serialized block JSON on every document change. */
  onChange: (content: string) => void;
  /** Owning document id — used to group uploaded media in storage. */
  documentId: string;
  editable?: boolean;
}

/**
 * Default-exported so `WikiEditor` can load it with `next/dynamic`
 * (`ssr: false`) — BlockNote is a client-only component.
 */
export default function WikiBlockNoteEditor({
  initialContent,
  onChange,
  documentId,
  editable = true,
}: WikiBlockNoteEditorProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);

  // `null` means the stored body is legacy Markdown (converted in the effect
  // below); an empty array means a brand-new document (BlockNote requires
  // `undefined`, not `[]`, for "start blank").
  const initialBlocks = useMemo(
    () => parseWikiBlocks(initialContent) as unknown as PartialBlock[] | null,
    [initialContent],
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
    uploadFile: async (file: File) => {
      setUploadError(null);
      try {
        return await uploadWikiMedia(file, documentId);
      } catch (error) {
        console.error("WikiBlockNoteEditor upload:", error);
        setUploadError(
          `Couldn't upload file: ${
            error instanceof Error ? error.message : "Upload failed."
          }`,
        );
        throw error;
      }
    },
  });

  // Legacy Markdown documents are converted to blocks on first open. The
  // conversion fires `onChange`, so the next autosave persists the document
  // in block JSON — a deliberate, one-time format upgrade.
  useEffect(() => {
    if (initialBlocks !== null || initialContent.trim() === "") return;

    let cancelled = false;
    void (async () => {
      const blocks = await Promise.resolve(
        editor.tryParseMarkdownToBlocks(initialContent),
      );
      if (!cancelled && blocks.length > 0) {
        editor.replaceBlocks(editor.document, blocks);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editor, initialBlocks, initialContent]);

  return (
    <div className="wiki-blocknote-editor flex w-full flex-col">
      {uploadError ? (
        <div className="flex items-center gap-1 border-b border-solid border-neutral-border bg-error-50 px-3 py-1.5 text-caption font-caption text-error-700">
          <FeatherAlertTriangle className="h-3 w-3 flex-none" />
          {uploadError}
        </div>
      ) : null}
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme="light"
        className="w-full py-4"
        onChange={() => {
          onChange(JSON.stringify(editor.document));
        }}
      />
    </div>
  );
}
