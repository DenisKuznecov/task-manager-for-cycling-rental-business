import React from "react";
import {
  loadWorkshopChecklistTemplates,
  normalizeWorkshopBikeCategory,
  normalizeWorkshopChecklistPhase,
  normalizeWorkshopChecklistStatus,
} from "@/src/lib/workshop-tasks";
import { DataLoadError } from "@/src/components/DataLoadError";
import { RetryLoadButton } from "./_components/RetryLoadButton";
import { TemplateLibrary } from "./_components/TemplateLibrary";

export default async function WorkshopTemplateLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{
    phase?: string;
    category?: string;
    status?: string;
  }>;
}) {
  const search = await searchParams;
  const filters = {
    phase: normalizeWorkshopChecklistPhase(search.phase),
    category: normalizeWorkshopBikeCategory(search.category),
    status: normalizeWorkshopChecklistStatus(search.status),
  };
  const { templates, error } = await loadWorkshopChecklistTemplates(filters);

  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-6 bg-default-background py-12">
      <div className="flex w-full flex-col items-start gap-2">
        <h1 className="text-heading-1 font-heading-1 text-default-font">
          Template Library
        </h1>
        <p className="text-body font-body text-subtext-color">
          Review the governed Prep and Return checklist standards for each bike category.
        </p>
      </div>

      {error ? (
        <div className="flex w-full flex-col items-start gap-2">
          <DataLoadError
            title="Couldn't load checklist templates"
            message={error}
          />
          <RetryLoadButton />
        </div>
      ) : null}

      <TemplateLibrary templates={templates} filters={filters} hasError={Boolean(error)} />
    </div>
  );
}
