"use client";

import React, { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FeatherAlertTriangle, FeatherSearch } from "@subframe/core";
import { Alert } from "@/ui/components/Alert";
import { Badge } from "@/ui/components/Badge";
import { Button } from "@/ui/components/Button";
import { Select } from "@/ui/components/Select";
import { Table } from "@/ui/components/Table";
import { Tabs } from "@/ui/components/Tabs";
import { TextField } from "@/ui/components/TextField";
import { TablePagination } from "@/src/components/TablePagination";
import * as workshopActions from "@/src/lib/workshop/actions";
import type { WorkshopSyncHealth } from "@/src/lib/workshop/data";
import {
  WORKSHOP_QUEUE_STATUSES,
  type ManualSyncScope,
  type WorkshopErrorCode,
  type WorkshopQueueFilter,
  type WorkshopQueueStatus,
  type WorkshopQueueStatusCounts,
  type WorkshopTaskListRow,
} from "@/src/lib/workshop/domain";
import { createClient } from "@/src/utils/supabase/client";
import {
  buildWorkshopQueueHref,
  formatMadridDateTime,
  formatWorkshopQueueWhen,
  queueStatusSelectValue,
  shouldBlockQueueNavigation,
  statusFromQueueSelectValue,
  statusTileClassName,
  workshopStatusBadgeProps,
  WORKSHOP_QUEUE_STATUS_SELECT_NONE,
  WORKSHOP_STATUS_LABELS,
} from "./workshop-ui";

interface WorkshopQueueProps {
  heading: React.ReactNode;
  tasks: WorkshopTaskListRow[];
  currentPage: number;
  totalPages: number;
  query: string;
  filter: WorkshopQueueFilter;
  status: WorkshopQueueStatus | null;
  statusCounts: WorkshopQueueStatusCounts;
  health: WorkshopSyncHealth;
}

const SEARCH_DEBOUNCE_MS = 300;
/** Overrides Subframe Cell `h-12` (48px) for workshop touch screens. */
const QUEUE_CELL_CLASS = "!h-16";
const QUEUE_HEADER_CELL_CLASS =
  "[&_span]:!text-body-bold [&_span]:!font-body-bold";
const QUEUE_BADGE_CLASS = "h-7 [&_span]:!text-body [&_span]:!font-body";
const QUEUE_TAB_CLASS = "[&_span]:!text-heading-3 [&_span]:!font-heading-3";

const FILTER_TABS: { value: WorkshopQueueFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "next_7_days", label: "Next 7 Days" },
];

function formatSyncTime(iso: string | null): string {
  if (!iso) return "Never";
  return formatMadridDateTime(iso);
}

function bikeIdCell(task: WorkshopTaskListRow): string {
  return task.bikeDisplayId?.trim() || task.bikeSourceId?.trim() || "Unknown bike";
}

function QueueStatusBadge({
  status,
}: {
  status: WorkshopTaskListRow["status"];
}) {
  const props = workshopStatusBadgeProps(status);
  return (
    <Badge
      {...props}
      className={[QUEUE_BADGE_CLASS, props.className].filter(Boolean).join(" ")}
    >
      {WORKSHOP_STATUS_LABELS[status]}
    </Badge>
  );
}

export function WorkshopQueue({
  heading,
  tasks,
  currentPage,
  totalPages,
  query,
  filter,
  status,
  statusCounts,
  health,
}: WorkshopQueueProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(query);
  const [prevQuery, setPrevQuery] = useState(query);
  const [isPending, startTransition] = useTransition();
  const [syncError, setSyncError] = useState<{
    code: WorkshopErrorCode;
    error: string;
  } | null>(null);
  const [pendingScope, setPendingScope] = useState<ManualSyncScope | "resume" | null>(
    null,
  );
  if (query !== prevQuery) {
    setPrevQuery(query);
    setSearch(query);
  }

  const syncInFlight = shouldBlockQueueNavigation(isPending, health);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("workshop-tasks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bike_tasks" },
        () => {
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "booqable_sync_runs" },
        () => {
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "booqable_sync_health" },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const buildHref = (
    nextQuery: string,
    nextPage: number,
    nextFilter: WorkshopQueueFilter,
    nextStatus: WorkshopQueueStatus | null,
  ) =>
    buildWorkshopQueueHref(pathname, nextQuery, nextPage, nextFilter, nextStatus);

  const pushQueue = (
    nextQuery: string,
    nextPage: number,
    nextFilter: WorkshopQueueFilter,
    nextStatus: WorkshopQueueStatus | null,
  ) => {
    if (syncInFlight) return;
    router.push(buildHref(nextQuery, nextPage, nextFilter, nextStatus));
  };

  useEffect(() => {
    if (search === query) return;

    const handle = setTimeout(() => {
      pushQueue(search, 1, filter, status);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, query, filter, status, pathname, router]);

  const resumable = Boolean(health.cursor);
  const syncStatusLabel = (() => {
    if (health.state === "in_progress" && !health.cursor) return "Sync in progress";
    if (health.state === "in_progress" && health.cursor) {
      return "Sync paused — more reserved orders remain";
    }
    if (health.state === "failed" && health.cursor) {
      return health.lastError
        ? `Partial sync failed: ${health.lastError}`
        : "Partial sync failed";
    }
    if (health.state === "failed") {
      return health.lastError ? `Sync failed: ${health.lastError}` : "Sync failed";
    }
    return null;
  })();

  const runSync = (
    fn: () => Promise<{ ok: true } | { ok: false; code: WorkshopErrorCode; error: string }>,
    pending: ManualSyncScope | "resume",
  ) => {
    if (isPending) return;
    setSyncError(null);
    setPendingScope(pending);
    startTransition(async () => {
      try {
        const result = await fn();
        if (!result.ok) {
          setSyncError({ code: result.code, error: result.error });
          return;
        }
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Workshop sync failed.";
        setSyncError({ code: "SOURCE_UNAVAILABLE", error: message });
      } finally {
        setPendingScope(null);
      }
    });
  };

  const openTask = (taskId: string) => {
    if (syncInFlight) return;
    router.push(`/workshop/${taskId}`);
  };

  return (
    <div className="flex w-full min-w-0 flex-col items-start gap-5">
      <div className="flex w-full flex-col items-start gap-3">
        {heading}
        <div className="mt-3 mb-4 flex w-full min-w-0 flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button
              size="large"
              variant="neutral-secondary"
              disabled={isPending}
              loading={pendingScope === "next_7_days"}
              onClick={() =>
                runSync(
                  () => workshopActions.startManualSync("next_7_days"),
                  "next_7_days",
                )
              }
            >
              Sync next 7 days
            </Button>
            <Button
              size="large"
              variant="neutral-secondary"
              disabled={isPending}
              loading={pendingScope === "all_reserved"}
              onClick={() =>
                runSync(
                  () => workshopActions.startManualSync("all_reserved"),
                  "all_reserved",
                )
              }
            >
              Sync all reserved
            </Button>
            {resumable && health.cursor ? (
              <Button
                size="large"
                variant="brand-secondary"
                disabled={isPending}
                loading={pendingScope === "resume"}
                onClick={() =>
                  runSync(
                    () => workshopActions.resumeManualSync(health.cursor as string),
                    "resume",
                  )
                }
              >
                Resume sync
              </Button>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-heading-3 font-heading-3 text-default-font">
              Last full sync: {formatSyncTime(health.lastSuccessAt)}
            </span>
            <span className="text-body font-body text-subtext-color">
              Pulls Booqable changes onto this list. Next 7 days = this week.
              All reserved = every reserved order (slow).
              {resumable
                ? " Each click fetches 50 orders. Use Resume sync if more remain."
                : null}
            </span>
          </div>
        </div>
      </div>

      {syncStatusLabel && !syncInFlight ? (
        <Alert
          variant={health.state === "failed" ? "error" : "warning"}
          icon={<FeatherAlertTriangle />}
          title={health.state === "failed" ? "Sync did not finish" : "Sync in progress"}
          description={syncStatusLabel}
        />
      ) : null}
      {syncError ? (
        <Alert
          variant="error"
          icon={<FeatherAlertTriangle />}
          title={syncError.code}
          description={syncError.error}
        />
      ) : null}
      {syncInFlight ? (
        <Alert
          variant="warning"
          icon={<FeatherAlertTriangle />}
          title="Updating from Booqable"
          description="Updating from Booqable… stay on this page until it finishes."
        />
      ) : null}

      <div className="hidden w-full mobile:block">
        <Select
          className="w-full [&_span]:text-heading-3 [&_span]:font-heading-3"
          placeholder="Select"
          disabled={syncInFlight}
          value={queueStatusSelectValue(status)}
          onValueChange={(value) => {
            pushQueue(query, 1, filter, statusFromQueueSelectValue(value));
          }}
        >
          <Select.Item value={WORKSHOP_QUEUE_STATUS_SELECT_NONE}>
            Select
          </Select.Item>
          {WORKSHOP_QUEUE_STATUSES.map((tileStatus) => (
            <Select.Item key={tileStatus} value={tileStatus}>
              {WORKSHOP_STATUS_LABELS[tileStatus]}
            </Select.Item>
          ))}
        </Select>
      </div>

      <div className="flex w-full flex-wrap items-stretch gap-2 mobile:hidden">
        {WORKSHOP_QUEUE_STATUSES.map((tileStatus) => {
          const selected = status === tileStatus;
          return (
            <button
              key={tileStatus}
              type="button"
              aria-pressed={selected}
              className={statusTileClassName(
                tileStatus,
                selected,
                statusCounts[tileStatus],
              )}
              onClick={() => {
                const nextStatus = selected ? null : tileStatus;
                pushQueue(query, 1, filter, nextStatus);
              }}
            >
              <span className="text-heading-2 font-heading-2">
                {statusCounts[tileStatus]}
              </span>
              <span className="text-body font-body">
                {WORKSHOP_STATUS_LABELS[tileStatus]}
              </span>
            </button>
          );
        })}
      </div>

      <Tabs>
        {FILTER_TABS.map((tab) => (
          <Tabs.Item
            key={tab.value}
            className={QUEUE_TAB_CLASS}
            active={filter === tab.value}
            onClick={() => {
              if (tab.value === filter) return;
              pushQueue(query, 1, tab.value, status);
            }}
          >
            {tab.label}
          </Tabs.Item>
        ))}
      </Tabs>

      <TextField
        className="w-full max-w-md [&>div]:h-10 [&_input]:text-heading-3 [&_input]:font-heading-3"
        label=""
        helpText=""
        icon={<FeatherSearch />}
      >
        <TextField.Input
          placeholder="Search by bike, title, order #, or customer"
          value={search}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setSearch(event.target.value)
          }
        />
      </TextField>

      <div className="flex w-full flex-col items-start gap-6 overflow-hidden overflow-x-auto mobile:overflow-auto mobile:max-w-full">
        {tasks.length === 0 ? (
          <div className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-solid border-neutral-border bg-default-background py-12">
            <span className="text-heading-3 font-heading-3 text-default-font text-center">
              No tasks found
            </span>
            <span className="text-heading-3 font-heading-3 text-subtext-color text-center">
              {query.trim()
                ? "Try adjusting your search."
                : "No bikes need work in this filter."}
            </span>
          </div>
        ) : (
          <Table
            header={
              <Table.HeaderRow>
                <Table.HeaderCell className={QUEUE_HEADER_CELL_CLASS}>
                  Bike ID
                </Table.HeaderCell>
                <Table.HeaderCell className={QUEUE_HEADER_CELL_CLASS}>
                  Bike title
                </Table.HeaderCell>
                <Table.HeaderCell className={QUEUE_HEADER_CELL_CLASS}>
                  Customer
                </Table.HeaderCell>
                <Table.HeaderCell className={QUEUE_HEADER_CELL_CLASS}>
                  Order #
                </Table.HeaderCell>
                <Table.HeaderCell className={QUEUE_HEADER_CELL_CLASS}>
                  From
                </Table.HeaderCell>
                <Table.HeaderCell className={QUEUE_HEADER_CELL_CLASS}>
                  Until
                </Table.HeaderCell>
                <Table.HeaderCell className={QUEUE_HEADER_CELL_CLASS}>
                  Status
                </Table.HeaderCell>
                <Table.HeaderCell className={QUEUE_HEADER_CELL_CLASS}>
                  Warnings
                </Table.HeaderCell>
              </Table.HeaderRow>
            }
          >
            {tasks.map((task) => (
              <Table.Row
                key={task.taskId}
                clickable={true}
                className="cursor-pointer"
                onClick={() => openTask(task.taskId)}
              >
                <Table.Cell className={QUEUE_CELL_CLASS}>
                  <span className="text-heading-3 font-heading-3 text-default-font">
                    {bikeIdCell(task)}
                  </span>
                </Table.Cell>
                <Table.Cell className={QUEUE_CELL_CLASS}>
                  <span className="text-heading-3 font-heading-3 text-default-font">
                    {task.bikeTitle?.trim() || "—"}
                  </span>
                </Table.Cell>
                <Table.Cell className={QUEUE_CELL_CLASS}>
                  <span className="whitespace-nowrap text-heading-3 font-heading-3 text-default-font">
                    {task.customerName?.trim() || "—"}
                  </span>
                </Table.Cell>
                <Table.Cell className={QUEUE_CELL_CLASS}>
                  <span className="whitespace-nowrap text-heading-3 font-heading-3 text-default-font">
                    {task.orderNumber != null ? `#${task.orderNumber}` : "—"}
                  </span>
                </Table.Cell>
                <Table.Cell className={QUEUE_CELL_CLASS}>
                  <span className="whitespace-nowrap text-heading-3 font-heading-3 text-neutral-500">
                    {formatWorkshopQueueWhen(task.startsAt, task.madridStartDate)}
                  </span>
                </Table.Cell>
                <Table.Cell className={QUEUE_CELL_CLASS}>
                  <span className="whitespace-nowrap text-heading-3 font-heading-3 text-neutral-500">
                    {formatWorkshopQueueWhen(task.stopsAt, null)}
                  </span>
                </Table.Cell>
                <Table.Cell className={QUEUE_CELL_CLASS}>
                  <QueueStatusBadge status={task.status} />
                </Table.Cell>
                <Table.Cell className={QUEUE_CELL_CLASS}>
                  {task.hasConfigurationWarning ? (
                    <Badge variant="warning" className={QUEUE_BADGE_CLASS}>
                      Warning
                    </Badge>
                  ) : (
                    <span className="text-heading-3 font-heading-3 text-neutral-500">
                      —
                    </span>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table>
        )}
      </div>
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(nextPage) =>
          pushQueue(query, nextPage, filter, status)
        }
      />
    </div>
  );
}
