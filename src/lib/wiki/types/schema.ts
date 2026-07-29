import { z } from "zod";
import {
  SAFE_TEXT_VALIDATION_MESSAGE,
  validateSafeText,
} from "@/src/utils/validation";
import {
  UNCATEGORIZED_CATEGORY_SLUG,
  WIKI_CATEGORY_ICONS,
  WIKI_STATUSES,
} from "@/src/lib/wiki/types/records";
import { wikiSlugify } from "@/src/lib/wiki/slug";

const MAX_TITLE_LENGTH = 200;
const MAX_CATEGORY_NAME_LENGTH = 80;
// BlockNote block JSON includes ids + props per block, so the ceiling is
// higher than a plain-text body of similar length would need.
const MAX_CONTENT_LENGTH = 400_000;

/**
 * Payload validated server-side by `updateWikiDocument`. Title/category/status
 * are edited from the metadata sidebar; `content` is BlockNote block JSON.
 */
export const UpdateWikiDocPayloadSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(MAX_TITLE_LENGTH, `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`)
    .refine((value) => validateSafeText(value) === true, {
      message: SAFE_TEXT_VALIDATION_MESSAGE,
    }),
  // Document body: BlockNote block JSON. We intentionally do NOT run the
  // strict safe-text regex on this field: body text routinely contains
  // `<`/`>` (code samples, comparisons), and XSS is prevented at render time
  // because BlockNote renders block/inline nodes as React elements — raw HTML
  // strings are never injected into the DOM.
  content: z
    .string()
    .max(
      MAX_CONTENT_LENGTH,
      `Content must be ${MAX_CONTENT_LENGTH} characters or fewer.`,
    ),
  category_id: z.string().uuid("Invalid category.").nullable(),
  status: z.enum(WIKI_STATUSES),
});

export type UpdateWikiDocPayload = z.infer<typeof UpdateWikiDocPayloadSchema>;

const CategoryNameSchema = z
  .string()
  .trim()
  .min(1, "Category name is required.")
  .max(
    MAX_CATEGORY_NAME_LENGTH,
    `Name must be ${MAX_CATEGORY_NAME_LENGTH} characters or fewer.`,
  )
  .refine((value) => validateSafeText(value) === true, {
    message: SAFE_TEXT_VALIDATION_MESSAGE,
  })
  .refine(
    (value) => wikiSlugify(value) !== UNCATEGORIZED_CATEGORY_SLUG,
    {
      message: `"Uncategorized" is reserved. Choose a different name.`,
    },
  );

export const UpsertWikiCategoryPayloadSchema = z.object({
  name: CategoryNameSchema,
  icon: z.enum(WIKI_CATEGORY_ICONS),
});

export type UpsertWikiCategoryPayload = z.infer<
  typeof UpsertWikiCategoryPayloadSchema
>;

export const DeleteWikiCategoryModeSchema = z.enum([
  "delete_documents",
  "unassign",
]);

export type DeleteWikiCategoryMode = z.infer<
  typeof DeleteWikiCategoryModeSchema
>;
