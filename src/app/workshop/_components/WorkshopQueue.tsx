"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FeatherSearch } from "@subframe/core";
import { Badge } from "@/ui/components/Badge";
import { Table } from "@/ui/components/Table";
import { Tabs } from "@/ui/components/Tabs";
import { TextField } from "@/ui/components/TextField";
import { TablePagination } from "@/src/components/TablePagination";
import type {
  BikeTaskStatus,
  WorkshopQueueFilter,
  WorkshopTaskListRow,
} from "@/src/lib/workshop/domain";
import { createClient } from "@/src/utils/supabase/client";
import { statusBadgeVariant } from "./workshop-ui";

interface WorkshopQueueProps {
  tasks: WorkshopTaskListRow[];
  currentPage: number;
  totalPages: number;
  query: string;
  filter: WorkshopQueueFilter;
}

const SEARCH_DEBOUNCE_MS = 300;

const FILTER_TABS: { value: WorkshopQueueFilter; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "next_7_days", label: "Next 7 Days" },
  { value: "all", label: "All" },
];

const STATUS_LABELS: Record<BikeTaskStatus, string> = {
  to_prepare: "To prepare",
  being_prepared: "Being prepared",
  needs_recheck: "Needs recheck",
  ready_for_pickup: "Ready for pickup",
  in_rental: "In rental",
  returned: "Returned",
  prepare_for_storage: "Prepare for storage",
  completed: "Completed",
  cancelled: "Cancelled",
};

function formatStart(
  startsAt: string | null,
  madridStartDate: string | null,
): string {
  if (startsAt) {
    const date = new Date(startsAt);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Europe/Madrid",
      });
    }
  }
  return madridStartDate ?? "—";
}

function bikeLabel(task: WorkshopTaskListRow): string {
  const id = task.bikeDisplayId?.trim() || task.bikeSourceId?.trim() || "";
  if (!id) return "Unknown bike";
  const title = task.bikeTitle?.trim();
  return title ? `${id} · ${title}` : id;
}

export function WorkshopQueue({
  tasks,
  currentPage,
  totalPages,
  query,
  filter,
}: WorkshopQueueProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(query);
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setSearch(query);
  }

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const buildHref = (
    nextQuery: string,
    nextPage: number,
    nextFilter: WorkshopQueueFilter,
  ) => {
    const params = new URLSearchParams();
    if (nextFilter !== "today") params.set("filter", nextFilter);
    const trimmed = nextQuery.trim();
    if (trimmed) params.set("query", trimmed);
    if (nextPage !== 1) params.set("page", String(nextPage));
    const queryString = params.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  };

  useEffect(() => {
    if (search === query) return;

    const handle = setTimeout(() => {
      router.push(buildHref(search, 1, filter));
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, query, filter, pathname, router]);

  return (
    <div className="flex w-full flex-col items-start gap-6">
      <Tabs>
        {FILTER_TABS.map((tab) => (
          <Tabs.Item
            key={tab.value}
            active={filter === tab.value}
            onClick={() => {
              if (tab.value === filter) return;
              router.push(buildHref(query, 1, tab.value));
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
          placeholder="Search by bike, title, or order #"
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
                <Table.HeaderCell>Bike</Table.HeaderCell>
                <Table.HeaderCell>Order #</Table.HeaderCell>
                <Table.HeaderCell>Start</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Progress</Table.HeaderCell>
                <Table.HeaderCell>Config</Table.HeaderCell>
              </Table.HeaderRow>
            }
          >
            {tasks.map((task) => (
              <Table.Row
                key={task.taskId}
                clickable={true}
                className="cursor-pointer"
                onClick={() => router.push(`/workshop/${task.taskId}`)}
              >
                <Table.Cell>
                  <span className="text-body-bold font-body-bold text-default-font">
                    {bikeLabel(task)}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span className="whitespace-nowrap text-body-bold font-body-bold text-default-font">
                    {task.orderNumber != null ? `#${task.orderNumber}` : "—"}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <span className="whitespace-nowrap text-body font-body text-neutral-500">
                    {formatStart(task.startsAt, task.madridStartDate)}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <Badge variant={statusBadgeVariant(task.status)}>
                    {STATUS_LABELS[task.status]}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <span className="whitespace-nowrap text-body font-body text-neutral-500">
                    {task.itemsCompleted}/{task.itemsTotal}
                  </span>
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
        onPageChange={(page) => router.push(buildHref(query, page, filter))}
      />
    </div>
  );
}
