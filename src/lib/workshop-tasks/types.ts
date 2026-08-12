export const WORKSHOP_CHECKLIST_PHASES = ["prep", "return"] as const;
export const WORKSHOP_BIKE_CATEGORIES = [
  "e-city",
  "e-road",
  "road",
  "gravel",
  "mtb",
] as const;
export const WORKSHOP_CHECKLIST_STATUSES = [
  "draft",
  "active",
  "superseded",
] as const;

export type WorkshopChecklistPhase = (typeof WORKSHOP_CHECKLIST_PHASES)[number];
export type WorkshopBikeCategory = (typeof WORKSHOP_BIKE_CATEGORIES)[number];
export type WorkshopChecklistStatus =
  (typeof WORKSHOP_CHECKLIST_STATUSES)[number];
export type WorkshopChecklistPhaseFilter = WorkshopChecklistPhase | "all";
export type WorkshopBikeCategoryFilter = WorkshopBikeCategory | "all";
export type WorkshopChecklistStatusFilter = WorkshopChecklistStatus | "all";

export const WORKSHOP_CHECKLIST_STATUS_LABELS: Record<
  WorkshopChecklistStatus,
  string
> = {
  draft: "Draft",
  active: "Active",
  superseded: "Superseded",
};

export interface WorkshopChecklistTemplate {
  id: string;
  phase: WorkshopChecklistPhase;
  bikeCategory: WorkshopBikeCategory;
  versionNumber: number;
  status: WorkshopChecklistStatus;
  createdAt: string;
}

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
