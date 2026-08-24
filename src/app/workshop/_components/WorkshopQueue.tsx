"use client";

import React, { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FeatherAlertTriangle, FeatherSearch } from "@subframe/core";
import { Alert } from "@/ui/components/Alert";
import { Badge } from "@/ui/components/Badge";
import { Button } from "@/ui/components/Button";
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
  formatWorkshopStart,
  shouldBlockQueueNavigation,
  statusTileClassName,
  workshopStatusBadgeProps,
  WORKSHOP_STATUS_LABELS,
} from "./workshop-ui";

interface WorkshopQueueProps {
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

export function WorkshopQueue({
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
    <div className="flex w-full flex-col items-start gap-6">
      <div className="flex w-full flex-col items-start gap-3">
        <span className="text-body font-body text-subtext-color">
          Last full sync: {formatSyncTime(health.lastSuccessAt)}
        </span>
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
        <div className="flex w-full flex-wrap items-center gap-2">
          <Button
            size="large"
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
        <span className="text-caption font-caption text-subtext-color">
          Use these when something changed in Booqable and you need that change
          on the task list. Next 7 days syncs reserved rentals starting this
          week. All reserved syncs every reserved order (this can take a while).
          Each click fetches one page of 50; use Resume sync if more remain.
        </span>
      </div>

      <div className="flex w-full flex-wrap items-stretch gap-2">
        {WORKSHOP_QUEUE_STATUSES.map((tileStatus) => {
          const selected = status === tileStatus;
          return (
            <button
              key={tileStatus}
              type="button"
              aria-pressed={selected}
              className={statusTileClassName(tileStatus, selected)}
              onClick={() => {
                const nextStatus = selected ? null : tileStatus;
                pushQueue(query, 1, filter, nextStatus);
              }}
            >
              <span className="text-heading-3 font-heading-3">
                {statusCounts[tileStatus]}
              </span>
              <span className="text-caption font-caption">
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
        className="w-full max-w-md"
        variant="filled"
        label="Search"
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
            <span className="text-body-bold font-body-bold text-default-font text-center">
              No tasks found
            </span>
            <span className="text-body font-body text-subtext-color text-center">
              {query.trim()
                ? "Try adjusting your search."
                : "No bikes need work in this filter."}
            </span>
          </div>
        ) : (
          <Table
            header={
              <Table.HeaderRow>
                <Table.HeaderCell>Bike ID</Table.HeaderCell>
                <Table.HeaderCell>Bike title</Table.HeaderCell>
                <Table.HeaderCell>Customer</Table.HeaderCell>
                <Table.HeaderCell>Order #</Table.HeaderCell>
                <Table.HeaderCell>From</Table.HeaderCell>
                <Table.HeaderCell>Until</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Warnings</Table.HeaderCell>
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
                <Table.Cell>
                  <span className="text-body-bold font-body-bold text-default-font">
                    {bikeIdCell(task)}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span className="text-body font-body text-default-font">
                    {task.bikeTitle?.trim() || "—"}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span className="whitespace-nowrap text-body-bold font-body-bold text-default-font">
                    {task.customerName?.trim() || "—"}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span className="whitespace-nowrap text-body-bold font-body-bold text-default-font">
                    {task.orderNumber != null ? `#${task.orderNumber}` : "—"}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span className="whitespace-nowrap text-body font-body text-neutral-500">
                    {formatWorkshopStart(task.startsAt, task.madridStartDate)}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span className="whitespace-nowrap text-body font-body text-neutral-500">
                    {formatWorkshopStart(task.stopsAt, null)}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <Badge {...workshopStatusBadgeProps(task.status)}>
                    {WORKSHOP_STATUS_LABELS[task.status]}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  {task.hasConfigurationWarning ? (
                    <Badge variant="warning">Warning</Badge>
                  ) : (
                    <span className="text-body font-body text-neutral-500">
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
