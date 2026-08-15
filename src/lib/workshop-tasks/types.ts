import { z } from "zod";
import {
  WORKSHOP_BIKE_CATEGORIES,
  type WorkshopBikeCategory,
} from "../booqable/contracts/workshop-tags";

export {
  WORKSHOP_BIKE_CATEGORIES,
  type WorkshopBikeCategory,
} from "../booqable/contracts/workshop-tags";

export const WORKSHOP_CHECKLIST_PHASES = ["prep", "return"] as const;
export const WORKSHOP_CHECKLIST_STATUSES = [
  "draft",
  "active",
  "superseded",
] as const;
export const WORKSHOP_CHECKLIST_ITEM_TYPES = ["action", "value"] as const;
export const WORKSHOP_SETUP_CATEGORIES = [
  "pedals",
  "saddle",
  "wheelset",
  "power-meter",
  "computer-mount",
] as const;
export const M2_REQUIRES_M1_MESSAGE = "M2 requires M1";
export const LABEL_REQUIRED_MESSAGE = "Label is required";

export type WorkshopChecklistPhase = (typeof WORKSHOP_CHECKLIST_PHASES)[number];
export type WorkshopChecklistStatus =
  (typeof WORKSHOP_CHECKLIST_STATUSES)[number];
export type WorkshopChecklistItemType =
  (typeof WORKSHOP_CHECKLIST_ITEM_TYPES)[number];
export type WorkshopSetupCategory = (typeof WORKSHOP_SETUP_CATEGORIES)[number];
export type WorkshopChecklistPhaseFilter = WorkshopChecklistPhase | "all";
export type WorkshopBikeCategoryFilter = WorkshopBikeCategory | "all";
export type WorkshopChecklistStatusFilter = WorkshopChecklistStatus | "all";

export const WORKSHOP_CHECKLIST_PHASE_LABELS: Record<
  WorkshopChecklistPhase,
  string
> = {
  prep: "Prep",
  return: "Return",
};

export const WORKSHOP_BIKE_CATEGORY_LABELS: Record<
  WorkshopBikeCategory,
  string
> = {
  "e-city": "E-city",
  "e-road": "E-road",
  road: "Road",
  gravel: "Gravel",
  mtb: "MTB",
  "e-mtb": "E-MTB",
};

export const WORKSHOP_CHECKLIST_STATUS_LABELS: Record<
  WorkshopChecklistStatus,
  string
> = {
  draft: "Draft",
  active: "Active",
  superseded: "Superseded",
};

export const WORKSHOP_CHECKLIST_ITEM_TYPE_LABELS: Record<
  WorkshopChecklistItemType,
  string
> = {
  action: "Action",
  value: "Value",
};

export const WORKSHOP_SETUP_CATEGORY_LABELS: Record<
  WorkshopSetupCategory,
  string
> = {
  pedals: "Pedals",
  saddle: "Saddle",
  wheelset: "Wheelset",
  "power-meter": "Power meter",
  "computer-mount": "Computer mount",
};

/**
 * Shared item-field shape so client and server actions reject M2 without M1
 * with the same field-level copy the RPC uses.
 */
const DraftChecklistItemFieldsObjectSchema = z.object({
  label: z.string().trim().min(1, LABEL_REQUIRED_MESSAGE),
  type: z.enum(WORKSHOP_CHECKLIST_ITEM_TYPES),
  required: z.boolean(),
  m1: z.boolean(),
  m2: z.boolean(),
  setupCategory: z.enum(WORKSHOP_SETUP_CATEGORIES).nullable(),
});

function rejectM2WithoutM1(
  value: { m1: boolean; m2: boolean },
  ctx: z.RefinementCtx,
) {
  if (value.m2 && !value.m1) {
    ctx.addIssue({
      code: "custom",
      path: ["m2"],
      message: M2_REQUIRES_M1_MESSAGE,
    });
  }
}

export const DraftChecklistItemFieldsSchema =
  DraftChecklistItemFieldsObjectSchema.superRefine(rejectM2WithoutM1);

export const AddDraftChecklistItemInputSchema =
  DraftChecklistItemFieldsObjectSchema.extend({
    versionId: z.string().uuid(),
    expectedRevision: z.number().int().positive(),
  }).superRefine(rejectM2WithoutM1);

export const UpdateDraftChecklistItemInputSchema =
  DraftChecklistItemFieldsObjectSchema.extend({
    versionId: z.string().uuid(),
    itemId: z.string().uuid(),
    expectedRevision: z.number().int().positive(),
  }).superRefine(rejectM2WithoutM1);

export const RemoveDraftChecklistItemInputSchema = z.object({
  versionId: z.string().uuid(),
  itemId: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
});

export const ReorderDraftChecklistItemsInputSchema = z.object({
  versionId: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
  itemIds: z.array(z.string().uuid()),
});

export type DraftChecklistItemFields = z.infer<
  typeof DraftChecklistItemFieldsSchema
>;
export type AddDraftChecklistItemInput = z.infer<
  typeof AddDraftChecklistItemInputSchema
>;
export type UpdateDraftChecklistItemInput = z.infer<
  typeof UpdateDraftChecklistItemInputSchema
>;
export type RemoveDraftChecklistItemInput = z.infer<
  typeof RemoveDraftChecklistItemInputSchema
>;
export type ReorderDraftChecklistItemsInput = z.infer<
  typeof ReorderDraftChecklistItemsInputSchema
>;

/**
 * Server actions reject unspecified Library filters here so an `all` pairing
 * never reaches the privileged RPC or gets defaulted to a real phase/category.
 */
export const CreateDraftChecklistVersionInputSchema = z.object({
  phase: z.enum(WORKSHOP_CHECKLIST_PHASES),
  bikeCategory: z.enum(WORKSHOP_BIKE_CATEGORIES),
});

export type CreateDraftChecklistVersionInput = z.infer<
  typeof CreateDraftChecklistVersionInputSchema
>;

export interface WorkshopChecklistTemplate {
  id: string;
  phase: WorkshopChecklistPhase;
  bikeCategory: WorkshopBikeCategory;
  versionNumber: number;
  status: WorkshopChecklistStatus;
  createdAt: string;
}

export interface WorkshopChecklistItem {
  id: string;
  label: string;
  position: number;
  type: WorkshopChecklistItemType;
  required: boolean;
  m1: boolean;
  m2: boolean;
  setupCategory: WorkshopSetupCategory | null;
}

export interface WorkshopChecklistActivePointer {
  id: string;
  versionNumber: number;
}

export interface WorkshopChecklistVersion {
  id: string;
  templateId: string;
  phase: WorkshopChecklistPhase;
  bikeCategory: WorkshopBikeCategory;
  versionNumber: number;
  status: WorkshopChecklistStatus;
  createdAt: string;
  createdBy: string | null;
  revision: number;
  items: readonly WorkshopChecklistItem[];
  currentActive: WorkshopChecklistActivePointer | null;
}

export const WORKSHOP_CHECKLIST_ACTIVATION_EVENT_TYPES = [
  "activated",
  "reactivated",
] as const;

export type WorkshopChecklistActivationEventType =
  (typeof WORKSHOP_CHECKLIST_ACTIVATION_EVENT_TYPES)[number];

export const WORKSHOP_CHECKLIST_ACTIVATION_EVENT_LABELS: Record<
  WorkshopChecklistActivationEventType,
  string
> = {
  activated: "Activated",
  reactivated: "Reactivated",
};

/**
 * Template-scoped activation/reactivation history. Actor identity is the stored
 * uuid — detail does not join profiles.
 */
export interface WorkshopChecklistEvent {
  id: string;
  eventType: WorkshopChecklistActivationEventType;
  actorId: string;
  occurredAt: string;
  versionId: string;
  versionNumber: number;
  revision: number;
  supersededVersionId: string | null;
}

/**
 * expectedActiveVersionId is required and null means "no Active". Replacing a
 * different Active than the one shown must be stale, not a silent supersede.
 */
export const ActivateChecklistVersionInputSchema = z.object({
  versionId: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
  expectedActiveVersionId: z.string().uuid().nullable(),
});

export type ActivateChecklistVersionInput = z.infer<
  typeof ActivateChecklistVersionInputSchema
>;

/**
 * A superseded row implies an Active exists, so expectedActiveVersionId is a
 * required uuid. A mismatch is stale, not a silent rebase onto the current Active.
 */
export const ReactivateChecklistVersionInputSchema = z.object({
  versionId: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
  expectedActiveVersionId: z.string().uuid(),
});

export type ReactivateChecklistVersionInput = z.infer<
  typeof ReactivateChecklistVersionInputSchema
>;

export interface WorkshopChecklistTemplateFilters {
  phase: WorkshopChecklistPhaseFilter;
  category: WorkshopBikeCategoryFilter;
  status: WorkshopChecklistStatusFilter;
}

export const DEFAULT_WORKSHOP_CHECKLIST_TEMPLATE_FILTERS: WorkshopChecklistTemplateFilters =
  {
    phase: "all",
    category: "all",
    status: "all",
  };

export function normalizeWorkshopChecklistPhase(
  value: string | undefined,
): WorkshopChecklistPhaseFilter {
  return value &&
    (WORKSHOP_CHECKLIST_PHASES as readonly string[]).includes(value)
    ? (value as WorkshopChecklistPhase)
    : "all";
}

export function normalizeWorkshopBikeCategory(
  value: string | undefined,
): WorkshopBikeCategoryFilter {
  return value &&
    (WORKSHOP_BIKE_CATEGORIES as readonly string[]).includes(value)
    ? (value as WorkshopBikeCategory)
    : "all";
}

export function normalizeWorkshopChecklistStatus(
  value: string | undefined,
): WorkshopChecklistStatusFilter {
  return value &&
    (WORKSHOP_CHECKLIST_STATUSES as readonly string[]).includes(value)
    ? (value as WorkshopChecklistStatus)
    : "all";
}
