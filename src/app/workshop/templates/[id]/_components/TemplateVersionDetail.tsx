import React from "react";
import {
  WORKSHOP_BIKE_CATEGORY_LABELS,
  WORKSHOP_CHECKLIST_PHASE_LABELS,
  WORKSHOP_CHECKLIST_STATUS_LABELS,
  type WorkshopChecklistVersion,
} from "@/src/lib/workshop-tasks/types";

interface TemplateVersionDetailProps {
  version: WorkshopChecklistVersion;
}

export function TemplateVersionDetail({ version }: TemplateVersionDetailProps) {
  return (
    <div className="flex w-full flex-col items-start gap-8">
      <div className="flex w-full flex-col items-start gap-2">
        <h1 className="text-heading-1 font-heading-1 text-default-font">
          {WORKSHOP_CHECKLIST_PHASE_LABELS[version.phase]}{" "}
          {WORKSHOP_BIKE_CATEGORY_LABELS[version.bikeCategory]} checklist
        </h1>
        <p className="text-body font-body text-subtext-color">
          Version {version.versionNumber} ·{" "}
          {WORKSHOP_CHECKLIST_STATUS_LABELS[version.status]} · Revision{" "}
          {version.revision}
        </p>
      </div>

      <dl className="grid w-full grid-cols-2 gap-4 mobile:grid-cols-1">
        <div className="flex flex-col gap-1">
          <dt className="text-body-bold font-body-bold text-default-font">
            Phase
          </dt>
          <dd className="text-body font-body text-default-font">
            {WORKSHOP_CHECKLIST_PHASE_LABELS[version.phase]}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-body-bold font-body-bold text-default-font">
            Bike category
          </dt>
          <dd className="text-body font-body text-default-font">
            {WORKSHOP_BIKE_CATEGORY_LABELS[version.bikeCategory]}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-body-bold font-body-bold text-default-font">
            Version
          </dt>
          <dd className="text-body font-body text-default-font">
            {version.versionNumber}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-body-bold font-body-bold text-default-font">
            Status
          </dt>
          <dd className="text-body-bold font-body-bold text-default-font">
            {WORKSHOP_CHECKLIST_STATUS_LABELS[version.status]}
          </dd>
        </div>
      </dl>

      <section className="flex w-full flex-col items-start gap-3">
        <h2 className="text-heading-3 font-heading-3 text-default-font">
          Items
        </h2>
        {version.items.length === 0 ? (
          <div className="flex w-full flex-col items-start gap-1 rounded-md border border-solid border-neutral-border px-6 py-8">
            <p className="text-body font-body text-default-font">
              This version has no items yet.
            </p>
            <p className="text-caption font-caption text-subtext-color">
              A version with no items is a valid checklist definition.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
