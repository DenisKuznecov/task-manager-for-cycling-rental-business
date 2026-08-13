import React from "react";
import { notFound } from "next/navigation";
import {
  loadWorkshopChecklistEvents,
  loadWorkshopChecklistVersion,
} from "@/src/lib/workshop-tasks";
import { DataLoadError } from "@/src/components/DataLoadError";
import { workshopUserFacingError } from "@/src/lib/workshop-tasks/error-messages";
import { RetryLoadButton } from "../_components/RetryLoadButton";
import { TemplateVersionDetail } from "./_components/TemplateVersionDetail";

export default async function TemplateVersionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { version, error } = await loadWorkshopChecklistVersion(id);

  if (error) {
    return (
      <div className="container max-w-none flex w-full flex-col items-start gap-6 bg-default-background py-12">
        <DataLoadError
          title="Couldn't load this checklist version"
          message={workshopUserFacingError(
            error,
            "We couldn't load this checklist version. Please try again.",
          )}
        />
        <RetryLoadButton />
      </div>
    );
  }

  if (!version) {
    notFound();
  }

  const { events, error: eventsError } = await loadWorkshopChecklistEvents(
    version.templateId,
  );

  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-6 bg-default-background py-12">
      <TemplateVersionDetail
        version={version}
        events={events}
        eventsError={
          eventsError
            ? workshopUserFacingError(
                eventsError,
                "We couldn't load activation history. Please try again.",
              )
            : null
        }
      />
    </div>
  );
}
