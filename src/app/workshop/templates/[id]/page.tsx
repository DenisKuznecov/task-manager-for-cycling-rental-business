import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadWorkshopChecklistVersion } from "@/src/lib/workshop-tasks";
import { DataLoadError } from "@/src/components/DataLoadError";
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
          message={error}
        />
        <Link
          href={`/workshop/templates/${id}`}
          className="text-body-bold font-body-bold text-brand-700 underline focus:outline-none focus:ring-2 focus:ring-brand-600"
        >
          Retry
        </Link>
      </div>
    );
  }

  if (!version) {
    notFound();
  }

  return (
    <div className="container max-w-none flex w-full flex-col items-start gap-6 bg-default-background py-12">
      <TemplateVersionDetail version={version} />
    </div>
  );
}
