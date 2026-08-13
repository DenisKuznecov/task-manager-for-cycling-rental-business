"use client";

import React, { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FeatherPlus } from "@subframe/core";
import { Button } from "@/ui/components/Button";
import { createDraftChecklistVersion } from "@/src/lib/workshop-tasks/actions/checklist-version-actions";
import {
  WORKSHOP_BIKE_CATEGORIES,
  WORKSHOP_BIKE_CATEGORY_LABELS,
  WORKSHOP_CHECKLIST_PHASES,
  WORKSHOP_CHECKLIST_PHASE_LABELS,
  WORKSHOP_CHECKLIST_STATUSES,
  WORKSHOP_CHECKLIST_STATUS_LABELS,
  type WorkshopBikeCategory,
  type WorkshopChecklistPhase,
  type WorkshopChecklistTemplate,
  type WorkshopChecklistTemplateFilters,
} from "@/src/lib/workshop-tasks/types";

interface TemplateLibraryProps {
  templates: WorkshopChecklistTemplate[];
  filters: WorkshopChecklistTemplateFilters;
  hasError: boolean;
}

export function applyTemplateLibraryFilter<
  Key extends keyof WorkshopChecklistTemplateFilters,
>(
  filters: WorkshopChecklistTemplateFilters,
  key: Key,
  value: WorkshopChecklistTemplateFilters[Key],
): WorkshopChecklistTemplateFilters {
  return { ...filters, [key]: value } as WorkshopChecklistTemplateFilters;
}

export function buildTemplateLibraryHref(
  pathname: string,
  filters: WorkshopChecklistTemplateFilters,
): string {
  const params = new URLSearchParams();

  if (filters.phase !== "all") params.set("phase", filters.phase);
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.status !== "all") params.set("status", filters.status);

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function templateVersionHref(id: string): string {
  return `/workshop/templates/${id}`;
}

export function createDraftSelectionHint(
  filters: Pick<WorkshopChecklistTemplateFilters, "phase" | "category">,
): string | null {
  const missingPhase = filters.phase === "all";
  const missingCategory = filters.category === "all";

  if (missingPhase && missingCategory) {
    return "Select a phase and bike category to create a draft.";
  }
  if (missingPhase) return "Select a phase to create a draft.";
  if (missingCategory) return "Select a bike category to create a draft.";
  return null;
}

export function navigationForCreateDraftResult(
  result: { ok: true; id: string } | { ok: false; error: string },
): { href: string } | { error: string } {
  if (!result.ok) return { error: result.error };
  return { href: templateVersionHref(result.id) };
}

export type CreateDraftFn = (input: {
  phase: WorkshopChecklistPhase;
  bikeCategory: WorkshopBikeCategory;
}) => Promise<{ ok: true; id: string } | { ok: false; error: string }>;

/**
 * Shared by the Library button and tests so create wiring can be proven without
 * a click-renderer. Incomplete or in-flight submits never call the RPC.
 */
export async function submitCreateDraft(
  filters: Pick<WorkshopChecklistTemplateFilters, "phase" | "category">,
  isPending: boolean,
  create: CreateDraftFn,
): Promise<{ href: string } | { error: string } | null> {
  if (isPending || createDraftSelectionHint(filters) !== null) {
    return null;
  }

  const result = await create({
    phase: filters.phase as WorkshopChecklistPhase,
    bikeCategory: filters.category as WorkshopBikeCategory,
  });
  return navigationForCreateDraftResult(result);
}

/**
 * Keeps the button's action and navigation behavior together so callers do not
 * accidentally create a draft without taking the user to its persisted detail.
 */
export async function createDraftAndNavigate(
  filters: Pick<WorkshopChecklistTemplateFilters, "phase" | "category">,
  isPending: boolean,
  create: CreateDraftFn,
  navigate: (href: string) => void,
  showError: (error: string) => void,
): Promise<void> {
  const next = await submitCreateDraft(filters, isPending, create);
  if (next == null) return;
  if ("error" in next) {
    showError(next.error);
    return;
  }
  navigate(next.href);
}

export function CreateDraftControls({
  filters,
  isPending,
  error,
  onCreate,
}: {
  filters: Pick<WorkshopChecklistTemplateFilters, "phase" | "category">;
  isPending: boolean;
  error: string | null;
  onCreate: () => void;
}) {
  const hint = createDraftSelectionHint(filters);
  const submittable = hint === null;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="brand-primary"
        icon={<FeatherPlus />}
        loading={isPending}
        disabled={!submittable || isPending}
        onClick={onCreate}
      >
        Create Draft
      </Button>
      {hint ? (
        <span className="text-caption font-caption text-subtext-color">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="text-caption font-caption text-error-700">{error}</span>
      ) : null}
    </div>
  );
}

export function TemplateLibrary({
  templates,
  filters,
  hasError,
}: TemplateLibraryProps) {
  const pathname = usePathname();
  const router = useRouter();
  const currentFilters = useRef(filters);
  currentFilters.current = filters;
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, startCreating] = useTransition();

  function updateFilter(
    key: keyof WorkshopChecklistTemplateFilters,
    value: string,
  ) {
    const next = applyTemplateLibraryFilter(
      currentFilters.current,
      key,
      value as WorkshopChecklistTemplateFilters[typeof key],
    );
    currentFilters.current = next;
    setCreateError(null);
    router.replace(buildTemplateLibraryHref(pathname, next));
  }

  function handleCreateDraft() {
    if (isCreating) return;
    setCreateError(null);
    startCreating(async () => {
      await createDraftAndNavigate(
        currentFilters.current,
        false,
        createDraftChecklistVersion,
        (href) => router.push(href),
        setCreateError,
      );
    });
  }

  const filterDescription = [
    filters.phase !== "all"
      ? WORKSHOP_CHECKLIST_PHASE_LABELS[filters.phase]
      : null,
    filters.category !== "all"
      ? WORKSHOP_BIKE_CATEGORY_LABELS[filters.category]
      : null,
    filters.status !== "all"
      ? WORKSHOP_CHECKLIST_STATUS_LABELS[filters.status]
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex w-full flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 flex-1 grid-cols-3 gap-4 mobile:grid-cols-1">
          <label className="flex flex-col gap-2 text-body-bold font-body-bold text-default-font">
            Phase
            <select
              className="h-10 rounded-md border border-solid border-neutral-border bg-default-background px-3 text-body font-body text-default-font focus:outline-none focus:ring-2 focus:ring-brand-600"
              value={filters.phase}
              onChange={(event) => updateFilter("phase", event.target.value)}
            >
              <option value="all">All phases</option>
              {WORKSHOP_CHECKLIST_PHASES.map((phase) => (
                <option key={phase} value={phase}>
                  {WORKSHOP_CHECKLIST_PHASE_LABELS[phase]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-body-bold font-body-bold text-default-font">
            Bike category
            <select
              className="h-10 rounded-md border border-solid border-neutral-border bg-default-background px-3 text-body font-body text-default-font focus:outline-none focus:ring-2 focus:ring-brand-600"
              value={filters.category}
              onChange={(event) => updateFilter("category", event.target.value)}
            >
              <option value="all">All categories</option>
              {WORKSHOP_BIKE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {WORKSHOP_BIKE_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-body-bold font-body-bold text-default-font">
            Status
            <select
              className="h-10 rounded-md border border-solid border-neutral-border bg-default-background px-3 text-body font-body text-default-font focus:outline-none focus:ring-2 focus:ring-brand-600"
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value)}
            >
              <option value="all">All statuses</option>
              {WORKSHOP_CHECKLIST_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {WORKSHOP_CHECKLIST_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <CreateDraftControls
          filters={filters}
          isPending={isCreating}
          error={createError}
          onCreate={handleCreateDraft}
        />
      </div>

      {!hasError && templates.length === 0 ? (
        <div className="flex w-full flex-col items-center gap-2 rounded-md border border-solid border-neutral-border px-6 py-12 text-center">
          <h2 className="text-heading-3 font-heading-3 text-default-font">
            No checklist versions found
          </h2>
          <p className="text-body font-body text-subtext-color">
            {filterDescription
              ? `No versions match: ${filterDescription}.`
              : "Checklist versions will appear here once they are available."}
          </p>
        </div>
      ) : null}

      {templates.length > 0 ? (
        <div className="w-full overflow-x-auto rounded-md border border-solid border-neutral-border">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead className="bg-neutral-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-body-bold font-body-bold text-default-font">
                  Phase
                </th>
                <th scope="col" className="px-4 py-3 text-body-bold font-body-bold text-default-font">
                  Bike category
                </th>
                <th scope="col" className="px-4 py-3 text-body-bold font-body-bold text-default-font">
                  Version
                </th>
                <th scope="col" className="px-4 py-3 text-body-bold font-body-bold text-default-font">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id} className="border-t border-solid border-neutral-border">
                  <td className="px-4 py-3 text-body font-body text-default-font">
                    {WORKSHOP_CHECKLIST_PHASE_LABELS[template.phase]}
                  </td>
                  <td className="px-4 py-3 text-body font-body text-default-font">
                    {WORKSHOP_BIKE_CATEGORY_LABELS[template.bikeCategory]}
                  </td>
                  <td className="px-4 py-3 text-body font-body text-default-font">
                    <Link
                      href={templateVersionHref(template.id)}
                      className="text-brand-700 underline focus:outline-none focus:ring-2 focus:ring-brand-600"
                    >
                      {template.versionNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-body-bold font-body-bold text-default-font">
                    {WORKSHOP_CHECKLIST_STATUS_LABELS[template.status]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
