import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildWorkshopQueueHref,
  formatMadridDateTime,
  formatWorkshopFromUntil,
  formatWorkshopQueueWhen,
  formatWorkshopStart,
  isM1ItemValid,
  m2ItemCaption,
  PREPARE_FOR_STORAGE_BADGE_CLASS,
  queueStatusSelectValue,
  shouldBlockQueueNavigation,
  shouldRenderWorkshopQueue,
  statusBadgeVariant,
  statusFromQueueSelectValue,
  statusTileClassName,
  workshopBikeId,
  workshopBikeLabel,
  WORKSHOP_QUEUE_STATUS_SELECT_NONE,
} from "./app/workshop/_components/workshop-ui.ts";
import type { WorkshopTaskItem } from "./lib/workshop/domain/dtos.ts";
import {
  resolveWorkshopQueueFilter,
  resolveWorkshopQueueStatus,
} from "./lib/workshop/domain/statuses.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function item(
  overrides: Partial<WorkshopTaskItem> = {},
): WorkshopTaskItem {
  return {
    itemId: "item-1",
    stage: "preparation",
    itemKey: "ROAD-01",
    sortOrder: 1,
    label: "Check",
    itemType: "action",
    required: true,
    m2Verifies: true,
    naAllowed: false,
    m1Outcome: null,
    m1Psi: null,
    m2Confirmed: false,
    ...overrides,
  };
}

test("formatMadridDateTime joins date and time with a comma, not at", () => {
  const text = formatMadridDateTime("2026-08-22T10:20:00.000Z");
  assert.equal(text, "22 Aug 2026, 12:20");
  assert.doesNotMatch(text, /\bat\b/);
  assert.equal(
    formatMadridDateTime("2026-09-03T17:00:00.000Z"),
    "3 Sep 2026, 19:00",
  );
});

test("formatWorkshopStart uses DD-MM-YYYY HH:mm in Madrid", () => {
  assert.equal(
    formatWorkshopStart("2026-08-22T10:20:00.000Z", null),
    "22-08-2026 12:20",
  );
  assert.equal(formatWorkshopStart(null, "2026-08-22"), "2026-08-22");
  assert.equal(formatWorkshopStart("not-a-date", null), "—");
});

test("formatWorkshopFromUntil joins queue From and Until", () => {
  assert.equal(
    formatWorkshopFromUntil(
      "2026-08-22T10:20:00.000Z",
      "2026-08-23T08:00:00.000Z",
      null,
    ),
    "Sat 22 Aug · 12:20 – Sun 23 Aug · 10:00",
  );
  assert.equal(
    formatWorkshopFromUntil(null, null, "2026-08-22"),
    "2026-08-22 – —",
  );
});

test("formatWorkshopQueueWhen uses weekday day month · time in Madrid", () => {
  assert.equal(
    formatWorkshopQueueWhen("2026-08-22T10:20:00.000Z", null),
    "Sat 22 Aug · 12:20",
  );
  assert.equal(
    formatWorkshopQueueWhen("2026-09-03T17:00:00.000Z", null),
    "Thu 3 Sep · 19:00",
  );
  assert.doesNotMatch(
    formatWorkshopQueueWhen("2026-09-03T17:00:00.000Z", null),
    /Sept/,
  );
  assert.equal(formatWorkshopQueueWhen(null, "2026-08-22"), "2026-08-22");
  assert.equal(formatWorkshopQueueWhen("not-a-date", null), "—");
});

test("workshopBikeId is the trail crumb without the title", () => {
  assert.equal(
    workshopBikeId({
      bikeDisplayId: "RF97/L-1",
      bikeSourceId: "src",
    }),
    "RF97/L-1",
  );
  assert.equal(
    workshopBikeId({
      bikeDisplayId: null,
      bikeSourceId: "src-9",
    }),
    "src-9",
  );
});

test("workshopBikeLabel falls back to Unknown bike", () => {
  assert.equal(
    workshopBikeLabel({
      bikeDisplayId: "ECH-1",
      bikeSourceId: "src",
      bikeTitle: "Road",
    }),
    "ECH-1 · Road",
  );
  assert.equal(
    workshopBikeLabel({
      bikeDisplayId: null,
      bikeSourceId: "src-9",
      bikeTitle: null,
    }),
    "src-9",
  );
  assert.equal(
    workshopBikeLabel({
      bikeDisplayId: "  ",
      bikeSourceId: "  ",
      bikeTitle: null,
    }),
    "Unknown bike",
  );
});

test("invalid workshop filter becomes all", () => {
  assert.equal(resolveWorkshopQueueFilter("nope"), "all");
  assert.equal(resolveWorkshopQueueFilter(undefined), "all");
  assert.equal(resolveWorkshopQueueFilter("tomorrow"), "tomorrow");
  assert.equal(resolveWorkshopQueueFilter("today"), "today");
  assert.equal(resolveWorkshopQueueFilter("all"), "all");
});

test("queue status is opt-in; invalid or cancelled becomes active work", () => {
  assert.equal(resolveWorkshopQueueStatus(undefined), null);
  assert.equal(resolveWorkshopQueueStatus("nope"), null);
  assert.equal(resolveWorkshopQueueStatus("cancelled"), null);
  assert.equal(resolveWorkshopQueueStatus("completed"), "completed");
  assert.equal(resolveWorkshopQueueStatus("being_prepared"), "being_prepared");
});

test("workshop queue page size is 15", () => {
  const source = readFileSync(join(root, "src/lib/workshop/data/tasks.ts"), "utf8");
  assert.match(source, /export const WORKSHOP_PAGE_SIZE = 15/);
  assert.match(source, /replace\(\/\^#\/, ""\)/);
});

test("queue href omits filter=all and keeps filter=today", () => {
  assert.equal(
    buildWorkshopQueueHref("/workshop", "", 1, "all", null),
    "/workshop",
  );
  assert.equal(
    buildWorkshopQueueHref("/workshop", "", 1, "today", null),
    "/workshop?filter=today",
  );
  assert.equal(
    buildWorkshopQueueHref("/workshop", "", 1, "all", "being_prepared"),
    "/workshop?status=being_prepared",
  );
  assert.equal(
    buildWorkshopQueueHref("/workshop", "ana", 2, "today", "completed"),
    "/workshop?filter=today&status=completed&query=ana&page=2",
  );
});

test("in-flight sync blocks queue navigation", () => {
  assert.equal(
    shouldBlockQueueNavigation(true, { state: "idle", cursor: null }),
    true,
  );
  assert.equal(
    shouldBlockQueueNavigation(false, { state: "in_progress", cursor: null }),
    true,
  );
  assert.equal(
    shouldBlockQueueNavigation(false, {
      state: "in_progress",
      cursor: "cursor-1",
    }),
    false,
  );
  assert.equal(
    shouldBlockQueueNavigation(false, { state: "failed", cursor: null }),
    false,
  );
});

test("loader error is not treated as an empty success queue", () => {
  assert.equal(shouldRenderWorkshopQueue(null), true);
  assert.equal(shouldRenderWorkshopQueue("relation does not exist"), false);
});

test("isM1ItemValid requires a finite PSI greater than zero", () => {
  assert.equal(
    isM1ItemValid(
      item({
        itemType: "tyre_pressure_psi",
        m1Outcome: "completed",
        m1Psi: 80,
      }),
    ),
    true,
  );
  assert.equal(
    isM1ItemValid(
      item({
        itemType: "tyre_pressure_psi",
        m1Outcome: "completed",
        m1Psi: 0,
      }),
    ),
    false,
  );
  assert.equal(
    isM1ItemValid(
      item({
        itemType: "tyre_pressure_psi",
        m1Outcome: "completed",
        m1Psi: Number.NaN,
      }),
    ),
    false,
  );
  assert.equal(
    isM1ItemValid(
      item({
        itemType: "tyre_pressure_psi",
        m1Outcome: "completed",
        m1Psi: Number.POSITIVE_INFINITY,
      }),
    ),
    false,
  );
  assert.equal(
    isM1ItemValid(
      item({
        itemType: "tyre_pressure_psi",
        m1Outcome: "completed",
        m1Psi: null,
      }),
    ),
    false,
  );
});

test("M2 caption only carries a fact the recheck still needs", () => {
  assert.equal(m2ItemCaption(item({ m1Outcome: null })), "Preparation incomplete");
  assert.equal(m2ItemCaption(item({ m1Outcome: "completed" })), null);
  assert.equal(
    m2ItemCaption(
      item({
        itemType: "tyre_pressure_psi",
        m1Outcome: "completed",
        m1Psi: 80,
      }),
    ),
    "80 PSI",
  );
  assert.equal(
    m2ItemCaption(item({ m1Outcome: "not_applicable" })),
    "Marked not applicable",
  );
});

test("mobile status select is clearable and label-only", () => {
  assert.equal(queueStatusSelectValue(null), WORKSHOP_QUEUE_STATUS_SELECT_NONE);
  assert.equal(queueStatusSelectValue("to_prepare"), "to_prepare");
  assert.equal(statusFromQueueSelectValue(WORKSHOP_QUEUE_STATUS_SELECT_NONE), null);
  assert.equal(statusFromQueueSelectValue("select"), null);
  assert.equal(statusFromQueueSelectValue("being_prepared"), "being_prepared");

  const queue = readFileSync(
    join(root, "src/app/workshop/_components/WorkshopQueue.tsx"),
    "utf8",
  );
  assert.match(queue, /hidden w-full mobile:block/);
  assert.match(queue, /flex-wrap items-stretch gap-2 mobile:hidden/);
  assert.match(queue, /placeholder="Select"/);
  assert.match(queue, /WORKSHOP_QUEUE_STATUS_SELECT_NONE/);
  assert.match(queue, /WORKSHOP_STATUS_LABELS\[tileStatus\]/);
  const selectBlock = queue.slice(
    queue.indexOf("<Select"),
    queue.indexOf("</Select>") + "</Select>".length,
  );
  assert.match(selectBlock, /Select/);
  assert.doesNotMatch(selectBlock, /statusCounts/);
});

test("queue statuses use distinct badge colours", () => {
  assert.equal(statusBadgeVariant("to_prepare"), "warning");
  assert.equal(statusBadgeVariant("being_prepared"), "dark");
  assert.equal(statusBadgeVariant("needs_recheck"), "error");
  assert.equal(statusBadgeVariant("ready_for_pickup"), "info");
  assert.equal(statusBadgeVariant("in_rental"), "success");
  assert.equal(statusBadgeVariant("returned"), "mint");
  assert.equal(statusBadgeVariant("completed"), "neutral");
  assert.equal(statusBadgeVariant("cancelled"), "error");
  assert.equal(statusBadgeVariant("prepare_for_storage"), null);
  assert.match(PREPARE_FOR_STORAGE_BADGE_CLASS, /violet|slate/);
  const tileClasses = [
    statusTileClassName("to_prepare", false, 1),
    statusTileClassName("being_prepared", false, 1),
    statusTileClassName("needs_recheck", false, 1),
    statusTileClassName("ready_for_pickup", false, 1),
    statusTileClassName("in_rental", false, 1),
    statusTileClassName("returned", false, 1),
    statusTileClassName("prepare_for_storage", false, 1),
    statusTileClassName("completed", false, 1),
  ];
  assert.equal(new Set(tileClasses).size, tileClasses.length);
  assert.match(statusTileClassName("to_prepare", false, 0), /text-neutral-400/);
  assert.doesNotMatch(statusTileClassName("to_prepare", false, 0), /bg-brand-50/);
  assert.match(statusTileClassName("to_prepare", false, 3), /bg-brand-50/);
  assert.match(statusTileClassName("being_prepared", true, 2), /ring-offset-2/);
  const activeTile = statusTileClassName("to_prepare", false, 3);
  assert.match(activeTile, /(?:^|\s)border(?:\s|$)/);
  assert.match(activeTile, /border-neutral-200/);
  assert.match(activeTile, /shadow-\[inset_4px_0_0_0_rgb\(217_119_6\)\]/);
  assert.doesNotMatch(activeTile, /border-l-4/);
  assert.doesNotMatch(activeTile, /border-l-brand-/);
  assert.match(
    statusTileClassName("to_prepare", false, 0),
    /shadow-\[inset_4px_0_0_0_rgb\(253_230_138\)\]/,
  );
});

test("workshop page is a server component that reads URL filters", () => {
  const source = readFileSync(join(root, "src/app/workshop/page.tsx"), "utf8");
  assert.doesNotMatch(source, /["']use client["']/);
  assert.match(source, /searchParams: Promise</);
  assert.match(source, /resolveWorkshopQueueFilter/);
  assert.match(source, /loadWorkshopTasks/);
});

test("kanban files are gone", () => {
  const gone = [
    "src/components/KanbanBoard.tsx",
    "src/components/KanbanCard.tsx",
    "src/components/KanbanColumn.tsx",
    "src/components/kanban-types.ts",
  ];
  for (const file of gone) {
    assert.equal(existsSync(join(root, file)), false, file);
  }
});

test("hello-pangea/dnd is not a dependency", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  assert.equal(pkg.dependencies?.["@hello-pangea/dnd"], undefined);
  assert.equal(pkg.devDependencies?.["@hello-pangea/dnd"], undefined);
});

test("queue I/O matrix: empty today, status isolate/clear, completed, page clamp, missing cells, sync intercept", () => {
  const queue = readFileSync(
    join(root, "src/app/workshop/_components/WorkshopQueue.tsx"),
    "utf8",
  );
  const tasks = readFileSync(join(root, "src/lib/workshop/data/tasks.ts"), "utf8");
  const page = readFileSync(join(root, "src/app/workshop/page.tsx"), "utf8");

  assert.equal(resolveWorkshopQueueFilter("today"), "today");
  assert.equal(shouldRenderWorkshopQueue(null), true);
  assert.match(queue, /No tasks found/);
  assert.match(queue, /No bikes need work in this filter/);
  assert.doesNotMatch(page, /notFound\(\)/);

  assert.match(queue, /const nextStatus = selected \? null : tileStatus/);
  assert.match(queue, /buildWorkshopQueueHref/);
  assert.match(tasks, /Pick<WorkshopTaskListQuery, "filter" \| "query">/);

  assert.equal(resolveWorkshopQueueStatus("completed"), "completed");
  assert.match(tasks, /Completed is listed only when `status=completed`/);

  assert.match(tasks, /if \(page > totalPages\) page = 1/);
  assert.match(queue, /TablePagination/);

  assert.equal(formatWorkshopQueueWhen(null, null), "—");
  assert.match(queue, /task\.customerName\?\.trim\(\) \|\| "—"/);
  assert.match(queue, /formatWorkshopQueueWhen\(task\.stopsAt, null\)/);

  assert.match(queue, /if \(syncInFlight\) return/);
  assert.match(queue, /pushQueue/);
  assert.match(queue, /Updating from Booqable… stay on this page until it finishes/);
  assert.match(queue, /Pulls Booqable changes onto this list/);
  assert.match(queue, /syncStatusLabel && !syncInFlight/);
});

test("queue surface: All-first tabs, status tiles, columns, sync help, load error banner", () => {
  const page = readFileSync(join(root, "src/app/workshop/page.tsx"), "utf8");
  const queue = readFileSync(
    join(root, "src/app/workshop/_components/WorkshopQueue.tsx"),
    "utf8",
  );
  const tasks = readFileSync(join(root, "src/lib/workshop/data/tasks.ts"), "utf8");
  assert.match(page, /filter: filterParam/);
  assert.match(page, /status: statusParam/);
  assert.match(page, /query: queryParam/);
  assert.match(page, /page: pageParam/);
  assert.match(page, /DataLoadError/);
  assert.match(page, /loadWorkshopTaskStatusCounts/);
  assert.match(page, /heading=\{heading\}/);
  assert.match(queue, /text-body font-body text-subtext-color/);
  const helpStart = queue.indexOf("Pulls Booqable changes onto this list");
  assert.notEqual(helpStart, -1);
  assert.doesNotMatch(
    queue.slice(helpStart - 120, helpStart),
    /whitespace-nowrap/,
  );
  assert.match(queue, /value: "all".*Today/s);
  assert.match(queue, /buildWorkshopQueueHref/);
  assert.match(queue, /QUEUE_CELL_CLASS = "!h-16"/);
  assert.match(queue, /className=\{QUEUE_CELL_CLASS\}/);
  assert.match(queue, /Bike ID/);
  assert.match(queue, /Bike title/);
  assert.match(queue, /Customer/);
  assert.match(queue, /Until/);
  assert.match(queue, /Warnings/);
  assert.doesNotMatch(queue, /Progress/);
  assert.match(queue, /Updating from Booqable/);
  assert.match(queue, /every reserved order \(slow\)/);
  assert.doesNotMatch(queue, /bg-warning-100/);
  assert.doesNotMatch(queue, /text-warning-800/);
  assert.match(queue, /text-heading-3 font-heading-3 text-default-font/);
  assert.match(queue, /Last full sync:/);
  assert.match(queue, /\/workshop\/\$\{taskId\}/);
  assert.match(tasks, /status=completed|status\)/);
  assert.match(tasks, /neq\("status", "completed"\)/);
  assert.match(tasks, /customer_name\.ilike/);
});

test("task page: not-found vs error vs cancelled tombstone and named actions", () => {
  const page = readFileSync(
    join(root, "src/app/workshop/[taskId]/page.tsx"),
    "utf8",
  );
  const task = readFileSync(
    join(root, "src/app/workshop/_components/WorkshopTask.tsx"),
    "utf8",
  );
  assert.match(page, /notFound\(\)/);
  assert.match(page, /Couldn't load this task/);
  assert.doesNotMatch(page, /fallback=\{null\}/);
  assert.match(task, /Abandon this work/);
  assert.match(task, /startPreparation/);
  assert.match(task, /completeM1/);
  assert.match(task, /completeM2/);
  assert.match(task, /samePersonConfirmed/);
  assert.match(task, /markPickedUp/);
  assert.match(task, /markReturned/);
  assert.match(task, /completeStorage/);
  assert.match(task, /STALE_VERSION/);
  assert.match(task, /CONFIGURATION_BLOCKED|hasConfigurationWarning/);
  assert.match(task, /formatWorkshopFromUntil/);
  assert.doesNotMatch(task, /Starts /);
});

test("task page reuses all-orders drawer via ?order=", () => {
  const layout = readFileSync(join(root, "src/app/workshop/layout.tsx"), "utf8");
  const task = readFileSync(
    join(root, "src/app/workshop/_components/WorkshopTask.tsx"),
    "utf8",
  );
  assert.match(layout, /OrderDetailsDrawerHost/);
  assert.match(layout, /Suspense/);
  assert.match(task, /useOpenOrderDetails/);
  assert.match(task, /openOrderDetails\(orderId\)/);
  assert.match(task, /OrderDetailsButtonFallback/);
});
