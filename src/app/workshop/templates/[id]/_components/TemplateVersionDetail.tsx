import React from "react";
import {
  WORKSHOP_BIKE_CATEGORY_LABELS,
  WORKSHOP_CHECKLIST_ACTIVATION_EVENT_LABELS,
  WORKSHOP_CHECKLIST_ITEM_TYPE_LABELS,
  WORKSHOP_CHECKLIST_PHASE_LABELS,
  WORKSHOP_CHECKLIST_STATUS_LABELS,
  WORKSHOP_SETUP_CATEGORY_LABELS,
  type WorkshopChecklistEvent,
  type WorkshopChecklistItem,
  type WorkshopChecklistVersion,
} from "@/src/lib/workshop-tasks/types";
import { DataLoadError } from "@/src/components/DataLoadError";
import { RetryLoadButton } from "../../_components/RetryLoadButton";
import { DraftChecklistItemsEditor } from "./DraftChecklistItemsEditor";
import { ActivateVersionPanel } from "./ActivateVersionPanel";
import { ReactivateVersionPanel } from "./ReactivateVersionPanel";

interface TemplateVersionDetailProps {
  version: WorkshopChecklistVersion;
  events: readonly WorkshopChecklistEvent[];
  eventsError: string | null;
}

export function ChecklistItemsReadOnly({
  items,
}: {
  items: readonly WorkshopChecklistItem[];
}) {
  return (
    <ol className="flex w-full flex-col items-start gap-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex w-full flex-col items-start gap-1 rounded-md border border-solid border-neutral-border px-4 py-3"
        >
          <p className="text-body-bold font-body-bold text-default-font">
            {item.label}
          </p>
          <p className="text-caption font-caption text-subtext-color">
            {WORKSHOP_CHECKLIST_ITEM_TYPE_LABELS[item.type]}
            {item.required ? " · Required" : ""}
            {item.m1 ? " · M1" : ""}
            {item.m2 ? " · M2" : ""}
            {item.setupCategory
              ? ` · ${WORKSHOP_SETUP_CATEGORY_LABELS[item.setupCategory]}`
              : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function formatChecklistTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function activationHistoryCopy(event: WorkshopChecklistEvent): {
  time: string;
  actor: string;
  typeLabel: string;
  versionLabel: string;
} {
  return {
    time: formatChecklistTimestamp(event.occurredAt),
    actor: event.actorId,
    typeLabel:
      WORKSHOP_CHECKLIST_ACTIVATION_EVENT_LABELS[event.eventType] ??
      event.eventType,
    versionLabel: `Version ${event.versionNumber}`,
  };
}

export function TemplateVersionDetail({
  version,
  events,
  eventsError,
}: TemplateVersionDetailProps) {
  const isDraft = version.status === "draft";
  const isSuperseded = version.status === "superseded";

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
        <div className="flex flex-col gap-1">
          <dt className="text-body-bold font-body-bold text-default-font">
            Created by
          </dt>
          <dd className="text-body font-body text-default-font">
            {version.createdBy ?? "—"}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-body-bold font-body-bold text-default-font">
            Created at
          </dt>
          <dd className="text-body font-body text-default-font">
            {formatChecklistTimestamp(version.createdAt)}
          </dd>
        </div>
      </dl>

      {isDraft ? <ActivateVersionPanel version={version} /> : null}
      {isSuperseded ? <ReactivateVersionPanel version={version} /> : null}

      <section className="flex w-full flex-col items-start gap-3">
        <h2 className="text-heading-3 font-heading-3 text-default-font">
          Activation history
        </h2>
        {eventsError ? (
          <div className="flex w-full flex-col items-start gap-2">
            <DataLoadError
              title="Couldn't load activation history"
              message={eventsError}
            />
            <RetryLoadButton />
          </div>
        ) : events.length === 0 ? (
          <p className="text-body font-body text-subtext-color">
            No activation or reactivation events yet.
          </p>
        ) : (
          <ol className="flex w-full flex-col items-start gap-3">
            {events.map((event) => {
              const copy = activationHistoryCopy(event);
              return (
                <li
                  key={event.id}
                  className="flex w-full flex-col items-start gap-1 rounded-md border border-solid border-neutral-border px-4 py-3"
                >
                  <p className="text-body-bold font-body-bold text-default-font">
                    {copy.typeLabel} · {copy.versionLabel}
                  </p>
                  <p className="text-caption font-caption text-subtext-color">
                    {copy.time} · {copy.actor}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="flex w-full flex-col items-start gap-3">
        <h2 className="text-heading-3 font-heading-3 text-default-font">
          Items
        </h2>
        {isDraft ? (
          <DraftChecklistItemsEditor version={version} />
        ) : version.items.length === 0 ? (
          <div className="flex w-full flex-col items-start gap-1 rounded-md border border-solid border-neutral-border px-6 py-8">
            <p className="text-body font-body text-default-font">
              This version has no items yet.
            </p>
            <p className="text-caption font-caption text-subtext-color">
              A version with no items is a valid checklist definition.
            </p>
          </div>
        ) : (
          <ChecklistItemsReadOnly items={version.items} />
        )}
      </section>
    </div>
  );
}

