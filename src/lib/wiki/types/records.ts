/**
 * Wiki status mirrors the `public.wiki_status` Postgres enum.
 */
export const WIKI_STATUSES = ["draft", "published"] as const;

export type WikiStatus = (typeof WIKI_STATUSES)[number];

export const WIKI_STATUS_LABELS: Record<WikiStatus, string> = {
  draft: "Draft",
  published: "Published",
};

export function isWikiStatus(value: string): value is WikiStatus {
  return (WIKI_STATUSES as readonly string[]).includes(value);
}

/** Status filter value for the directory; "all" means no status constraint. */
export type WikiStatusFilter = WikiStatus | "all";

/**
 * Allowlisted `@subframe/core` Feather export names stored in
 * `wiki_categories.icon`. Keep in sync with `WIKI_CATEGORY_ICON_MAP`.
 */
export const WIKI_CATEGORY_ICONS = [
  "FeatherBarChart",
  "FeatherBike",
  "FeatherBook",
  "FeatherBookOpen",
  "FeatherBox",
  "FeatherCalendar",
  "FeatherCheckCircle",
  "FeatherClipboard",
  "FeatherCog",
  "FeatherCreditCard",
  "FeatherDollarSign",
  "FeatherFileText",
  "FeatherFolder",
  "FeatherFolderOpen",
  "FeatherGlobe",
  "FeatherHelpCircle",
  "FeatherImage",
  "FeatherLifeBuoy",
  "FeatherLink",
  "FeatherList",
  "FeatherMail",
  "FeatherPackage",
  "FeatherPrinter",
  "FeatherSettings",
  "FeatherShield",
  "FeatherSmartphone",
  "FeatherTag",
  "FeatherTool",
  "FeatherUsers",
  "FeatherWrench",
] as const;

export type WikiCategoryIcon = (typeof WIKI_CATEGORY_ICONS)[number];

export const DEFAULT_WIKI_CATEGORY_ICON: WikiCategoryIcon = "FeatherFileText";

/** Fixed icon for the synthetic Uncategorized tile (not stored in DB). */
export const UNCATEGORIZED_CATEGORY_ICON: WikiCategoryIcon = "FeatherFolderOpen";

/** Reserved slug for the synthetic Uncategorized category route. */
export const UNCATEGORIZED_CATEGORY_SLUG = "uncategorized";

export function toWikiCategoryIcon(
  value: string | null | undefined,
): WikiCategoryIcon {
  return value && (WIKI_CATEGORY_ICONS as readonly string[]).includes(value)
    ? (value as WikiCategoryIcon)
    : DEFAULT_WIKI_CATEGORY_ICON;
}

export interface WikiCategory {
  id: string;
  name: string;
  slug: string;
  icon: WikiCategoryIcon;
  created_at: string;
  document_count?: number;
}

/** Shape of a row from `public.wiki_documents_view` after mapping. */
export interface WikiDocument {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: WikiStatus;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
