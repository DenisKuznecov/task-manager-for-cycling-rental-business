"use client";

import React, { useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  WORKSHOP_BIKE_CATEGORIES,
  WORKSHOP_CHECKLIST_PHASES,
  WORKSHOP_CHECKLIST_STATUSES,
  WORKSHOP_CHECKLIST_STATUS_LABELS,
  type WorkshopChecklistTemplate,
  type WorkshopChecklistTemplateFilters,
} from "@/src/lib/workshop-tasks/types";

interface TemplateLibraryProps {
  templates: WorkshopChecklistTemplate[];
  filters: WorkshopChecklistTemplateFilters;
  hasError: boolean;
}

const PHASE_LABELS = { prep: "Prep", return: "Return" } as const;
const CATEGORY_LABELS = {
  "e-city": "E-city",
  "e-road": "E-road",
  road: "Road",
  gravel: "Gravel",
  mtb: "MTB",
} as const;

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

export function TemplateLibrary({
  templates,
  filters,
  hasError,
}: TemplateLibraryProps) {
  const pathname = usePathname();
  const router = useRouter();
  const currentFilters = useRef(filters);
  currentFilters.current = filters;

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
    router.replace(buildTemplateLibraryHref(pathname, next));
  }

  const filterDescription = [
    filters.phase !== "all" ? PHASE_LABELS[filters.phase] : null,
    filters.category !== "all" ? CATEGORY_LABELS[filters.category] : null,
    filters.status !== "all"
      ? WORKSHOP_CHECKLIST_STATUS_LABELS[filters.status]
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="grid w-full grid-cols-3 gap-4 mobile:grid-cols-1">
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
                {PHASE_LABELS[phase]}
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
                {CATEGORY_LABELS[category]}
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
                    {PHASE_LABELS[template.phase]}
                  </td>
                  <td className="px-4 py-3 text-body font-body text-default-font">
                    {CATEGORY_LABELS[template.bikeCategory]}
                  </td>
                  <td className="px-4 py-3 text-body font-body text-default-font">
                    {template.versionNumber}
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
