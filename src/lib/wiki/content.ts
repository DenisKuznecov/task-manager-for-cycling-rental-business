/**
 * Pure helpers for the wiki content column. Kept free of server/client and
 * BlockNote imports so they can run in either environment.
 *
 * `wiki_documents.content` stores the document as **BlockNote block JSON**
 * (`JSON.stringify(editor.document)`), which is BlockNote's lossless native
 * format.
 */

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parses `content` as a BlockNote block array. Returns `null` when the string
 * is empty, not valid JSON, or not an array of objects.
 */
export function parseWikiBlocks(content: string): UnknownRecord[] | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith("[")) return null;

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsed) && parsed.every(isRecord)) {
      return parsed as UnknownRecord[];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Collects the human-readable text inside any BlockNote node: styled text
 * fragments, link contents, table rows/cells, nested children, and media
 * captions. Deliberately schema-agnostic so unknown/future block types
 * degrade gracefully instead of crashing.
 */
function collectText(node: unknown, out: string[]): void {
  if (typeof node === "string") {
    if (node.trim()) out.push(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) collectText(item, out);
    return;
  }
  if (!isRecord(node)) return;

  if (typeof node.text === "string" && node.text.trim()) {
    out.push(node.text);
  }
  if (isRecord(node.props) && typeof node.props.caption === "string" && node.props.caption.trim()) {
    out.push(node.props.caption);
  }

  collectText(node.content, out);
  collectText(node.rows, out);
  collectText(node.cells, out);
  collectText(node.children, out);
}

/**
 * Readable text of a single BlockNote node (e.g. a heading's inline content).
 * Used by the view to label table-of-contents entries.
 */
export function extractNodeText(node: unknown): string {
  const fragments: string[] = [];
  collectText(node, fragments);
  return fragments.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Plain text of a BlockNote document body. Used for the `content_text` search
 * column and reading-time estimates. Returns `""` when `content` is not valid
 * block JSON.
 */
export function extractWikiPlainText(content: string): string {
  const blocks = parseWikiBlocks(content);
  if (blocks === null) return "";

  const fragments: string[] = [];
  collectText(blocks, fragments);
  return fragments.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Whether the document renders as empty. A fresh BlockNote doc is one empty
 * paragraph block — textually non-empty JSON — so a plain `trim()` check on
 * the raw content is not enough. Blocks without text (images, dividers,
 * tables) still count as content. Unparseable content is treated as empty.
 */
export function isWikiContentEmpty(content: string): boolean {
  const blocks = parseWikiBlocks(content);
  if (blocks === null) return true;

  return blocks.every((block) => {
    if (block.type !== "paragraph" && block.type !== undefined) return false;
    const children = Array.isArray(block.children) ? block.children : [];
    if (children.length > 0) return false;
    const inline: string[] = [];
    collectText(block.content, inline);
    return inline.join("").trim().length === 0;
  });
}

const WORDS_PER_MINUTE = 200;

/**
 * Rough reading-time estimate over the extracted plain text. Always at least
 * 1 minute for non-empty content.
 */
export function estimateWikiReadingTimeMinutes(content: string): number {
  const text = extractWikiPlainText(content);
  if (!text) return 1;

  const words = text.split(" ").filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
