"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import cn from "classnames";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { TableKit } from "@tiptap/extension-table";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Markdown } from "tiptap-markdown";
import {
  FeatherAlertTriangle,
  FeatherArrowDownToLine,
  FeatherArrowRightToLine,
  FeatherBold,
  FeatherCheckSquare,
  FeatherCode,
  FeatherColumns,
  FeatherHeading1,
  FeatherHeading2,
  FeatherHeading3,
  FeatherImage,
  FeatherItalic,
  FeatherLink,
  FeatherList,
  FeatherListOrdered,
  FeatherLoader,
  FeatherMinus,
  FeatherQuote,
  FeatherRedo,
  FeatherRows,
  FeatherStrikethrough,
  FeatherTable,
  FeatherTrash2,
  FeatherUndo,
} from "@subframe/core";
import { uploadWikiImage } from "@/src/utils/wiki-image-upload";

interface WikiMarkdownEditorProps {
  /**
   * Initial Markdown body. Read ONCE on mount — the parent owns the value
   * afterwards via `onChange`, so we never push it back into the editor
   * (that would reset the cursor on every autosave round-trip).
   */
  initialMarkdown: string;
  onChange: (markdown: string) => void;
  /** Owning document id — used to group uploaded images in storage. */
  documentId: string;
  editable?: boolean;
}

// tiptap-markdown registers `editor.storage.markdown` at runtime but does not
// augment TipTap's `Storage` type, so we read it through a narrow cast.
function readMarkdown(editor: Editor): string {
  const storage = editor.storage as unknown as {
    markdown?: { getMarkdown: () => string };
  };
  return storage.markdown?.getMarkdown() ?? "";
}

// Applied to the contenteditable element. `prose` (via @tailwindcss/typography)
// renders the WYSIWYG headings/lists/quotes; the rest pins it to our tokens.
const EDITOR_CONTENT_CLASS = cn(
  "prose prose-sm max-w-none min-h-[24rem] focus:outline-none",
  "text-default-font",
  "prose-headings:text-default-font prose-headings:font-heading-3",
  "prose-p:text-default-font prose-li:text-default-font",
  "prose-strong:text-default-font prose-code:text-default-font",
  "prose-a:text-brand-700 prose-a:no-underline hover:prose-a:underline",
  "prose-blockquote:border-l-brand-600 prose-blockquote:text-subtext-color",
  "prose-img:rounded-md",
);

function pickImageFiles(fileList: FileList | null | undefined): File[] {
  return Array.from(fileList ?? []).filter((file) =>
    file.type.startsWith("image/"),
  );
}

export function WikiMarkdownEditor({
  initialMarkdown,
  onChange,
  documentId,
  editable = true,
}: WikiMarkdownEditorProps) {
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Paste/drop handlers are registered once at editor creation, so they reach
  // the live editor instance through a ref instead of a stale closure.
  const editorRef = useRef<Editor | null>(null);

  /**
   * Compresses + uploads images to the `wiki-images` bucket, then inserts them
   * at `insertPos` (or the current selection). Uploads that fail are reported
   * inline; successful ones are still inserted.
   */
  const uploadAndInsertImages = useCallback(
    async (files: File[], insertPos?: number) => {
      if (files.length === 0) return;
      setUploadError(null);
      setUploadingCount((count) => count + files.length);

      const nodes: Array<{
        type: "image";
        attrs: { src: string; alt: string };
      }> = [];
      let firstError: string | null = null;

      for (const file of files) {
        try {
          const url = await uploadWikiImage(file, documentId);
          nodes.push({
            type: "image",
            attrs: { src: url, alt: file.name.replace(/\.[^.]+$/, "") },
          });
        } catch (error) {
          console.error("WikiMarkdownEditor image upload:", error);
          firstError =
            error instanceof Error ? error.message : "Image upload failed.";
        } finally {
          setUploadingCount((count) => count - 1);
        }
      }

      if (firstError) {
        setUploadError(`Couldn't upload image: ${firstError}`);
      }

      const editor = editorRef.current;
      if (!editor || nodes.length === 0) return;

      if (insertPos !== undefined) {
        editor.chain().focus().insertContentAt(insertPos, nodes).run();
      } else {
        editor.chain().focus().insertContent(nodes).run();
      }
    },
    [documentId],
  );

  const editor = useEditor({
    // Required for Next.js SSR: defer view creation to the client so the
    // server-rendered HTML and the first client render match.
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      // `withHeaderRow` inserts keep tables GFM-serializable (tiptap-markdown
      // falls back to raw HTML — which `html: false` drops — without one).
      TableKit.configure({
        table: { resizable: false },
      }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: "Start writing your document…",
      }),
      // `html: false` keeps the stored body as clean Markdown (no raw HTML),
      // which matches how the read-only view renders it.
      Markdown.configure({
        html: false,
        transformPastedText: true,
        linkify: true,
      }),
    ],
    content: initialMarkdown,
    editorProps: {
      attributes: {
        class: EDITOR_CONTENT_CLASS,
      },
      handlePaste: (_view, event) => {
        const images = pickImageFiles(event.clipboardData?.files);
        if (images.length === 0) return false;
        event.preventDefault();
        void uploadAndInsertImages(images);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const images = pickImageFiles(event.dataTransfer?.files);
        if (images.length === 0) return false;
        event.preventDefault();
        const dropPos = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        })?.pos;
        void uploadAndInsertImages(images, dropPos);
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(readMarkdown(editor));
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  return (
    <div className="flex w-full flex-col">
      <WikiEditorToolbar
        editor={editor}
        isUploadingImage={uploadingCount > 0}
        onUploadImages={uploadAndInsertImages}
      />
      {uploadError ? (
        <div className="flex items-center gap-1 border-b border-solid border-neutral-border bg-error-50 px-3 py-1.5 text-caption font-caption text-error-700">
          <FeatherAlertTriangle className="h-3 w-3 flex-none" />
          {uploadError}
        </div>
      ) : null}
      <div className="w-full px-4 py-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

interface ToolbarState {
  isBold: boolean;
  isItalic: boolean;
  isStrike: boolean;
  isCode: boolean;
  isH1: boolean;
  isH2: boolean;
  isH3: boolean;
  isBulletList: boolean;
  isOrderedList: boolean;
  isTaskList: boolean;
  isBlockquote: boolean;
  isLink: boolean;
  isInTable: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

function WikiEditorToolbar({
  editor,
  isUploadingImage,
  onUploadImages,
}: {
  editor: Editor | null;
  isUploadingImage: boolean;
  onUploadImages: (files: File[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const state = useEditorState<ToolbarState | null>({
    editor,
    selector: ({ editor }) => {
      if (!editor) return null;
      return {
        isBold: editor.isActive("bold"),
        isItalic: editor.isActive("italic"),
        isStrike: editor.isActive("strike"),
        isCode: editor.isActive("code"),
        isH1: editor.isActive("heading", { level: 1 }),
        isH2: editor.isActive("heading", { level: 2 }),
        isH3: editor.isActive("heading", { level: 3 }),
        isBulletList: editor.isActive("bulletList"),
        isOrderedList: editor.isActive("orderedList"),
        isTaskList: editor.isActive("taskList"),
        isBlockquote: editor.isActive("blockquote"),
        isLink: editor.isActive("link"),
        isInTable: editor.isActive("table"),
        canUndo: editor.can().undo(),
        canRedo: editor.can().redo(),
      };
    },
  });

  const ready = Boolean(editor) && state !== null;

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previousUrl ?? "https://");
    if (url === null) return; // cancelled
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    // Reset so choosing the same file again re-triggers the change event.
    event.target.value = "";
    if (files.length > 0) onUploadImages(files);
  };

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-t-md border-b border-solid border-neutral-border bg-default-background px-2 py-1.5">
      <ToolbarButton
        icon={<FeatherUndo />}
        label="Undo"
        disabled={!ready || !state?.canUndo}
        onClick={() => editor?.chain().focus().undo().run()}
      />
      <ToolbarButton
        icon={<FeatherRedo />}
        label="Redo"
        disabled={!ready || !state?.canRedo}
        onClick={() => editor?.chain().focus().redo().run()}
      />

      <ToolbarDivider />

      <ToolbarButton
        icon={<FeatherHeading1 />}
        label="Heading 1"
        disabled={!ready}
        active={state?.isH1}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <ToolbarButton
        icon={<FeatherHeading2 />}
        label="Heading 2"
        disabled={!ready}
        active={state?.isH2}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <ToolbarButton
        icon={<FeatherHeading3 />}
        label="Heading 3"
        disabled={!ready}
        active={state?.isH3}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
      />

      <ToolbarDivider />

      <ToolbarButton
        icon={<FeatherBold />}
        label="Bold"
        disabled={!ready}
        active={state?.isBold}
        onClick={() => editor?.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        icon={<FeatherItalic />}
        label="Italic"
        disabled={!ready}
        active={state?.isItalic}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        icon={<FeatherStrikethrough />}
        label="Strikethrough"
        disabled={!ready}
        active={state?.isStrike}
        onClick={() => editor?.chain().focus().toggleStrike().run()}
      />
      <ToolbarButton
        icon={<FeatherCode />}
        label="Inline code"
        disabled={!ready}
        active={state?.isCode}
        onClick={() => editor?.chain().focus().toggleCode().run()}
      />

      <ToolbarDivider />

      <ToolbarButton
        icon={<FeatherList />}
        label="Bullet list"
        disabled={!ready}
        active={state?.isBulletList}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        icon={<FeatherListOrdered />}
        label="Numbered list"
        disabled={!ready}
        active={state?.isOrderedList}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        icon={<FeatherCheckSquare />}
        label="Task list"
        disabled={!ready}
        active={state?.isTaskList}
        onClick={() => editor?.chain().focus().toggleTaskList().run()}
      />
      <ToolbarButton
        icon={<FeatherQuote />}
        label="Quote"
        disabled={!ready}
        active={state?.isBlockquote}
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
      />

      <ToolbarDivider />

      <ToolbarButton
        icon={<FeatherLink />}
        label="Link"
        disabled={!ready}
        active={state?.isLink}
        onClick={setLink}
      />
      <ToolbarButton
        icon={isUploadingImage ? <FeatherLoader className="animate-spin" /> : <FeatherImage />}
        label="Insert image"
        disabled={!ready || isUploadingImage}
        onClick={() => fileInputRef.current?.click()}
      />
      <ToolbarButton
        icon={<FeatherTable />}
        label="Insert table"
        disabled={!ready || state?.isInTable}
        onClick={() =>
          editor
            ?.chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      />
      <ToolbarButton
        icon={<FeatherMinus />}
        label="Divider"
        disabled={!ready}
        onClick={() => editor?.chain().focus().setHorizontalRule().run()}
      />

      {state?.isInTable ? (
        <>
          <ToolbarDivider />
          <ToolbarButton
            icon={<FeatherArrowDownToLine />}
            label="Add row below"
            disabled={!ready}
            onClick={() => editor?.chain().focus().addRowAfter().run()}
          />
          <ToolbarButton
            icon={<FeatherArrowRightToLine />}
            label="Add column right"
            disabled={!ready}
            onClick={() => editor?.chain().focus().addColumnAfter().run()}
          />
          <ToolbarButton
            icon={<FeatherRows />}
            label="Delete row"
            disabled={!ready}
            onClick={() => editor?.chain().focus().deleteRow().run()}
          />
          <ToolbarButton
            icon={<FeatherColumns />}
            label="Delete column"
            disabled={!ready}
            onClick={() => editor?.chain().focus().deleteColumn().run()}
          />
          <ToolbarButton
            icon={<FeatherTrash2 />}
            label="Delete table"
            disabled={!ready}
            onClick={() => editor?.chain().focus().deleteTable().run()}
          />
        </>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />
    </div>
  );
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ToolbarButton({
  icon,
  label,
  active = false,
  disabled = false,
  onClick,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Prevent the editor from losing its selection when the button is pressed.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-body text-subtext-color transition-colors",
        "hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
        { "bg-brand-50 text-brand-700 hover:bg-brand-100": active },
      )}
    >
      {icon}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px flex-none bg-neutral-200" />;
}
