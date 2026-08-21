import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  isM1ItemValid,
  m2ItemCaption,
  shouldRenderWorkshopQueue,
  statusBadgeVariant,
} from "./app/workshop/_components/workshop-ui.ts";
import type { WorkshopTaskItem } from "./lib/workshop/domain/dtos.ts";
import { resolveWorkshopQueueFilter } from "./lib/workshop/domain/statuses.ts";

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

test("invalid workshop filter becomes today", () => {
  assert.equal(resolveWorkshopQueueFilter("nope"), "today");
  assert.equal(resolveWorkshopQueueFilter(undefined), "today");
  assert.equal(resolveWorkshopQueueFilter("tomorrow"), "tomorrow");
  assert.equal(resolveWorkshopQueueFilter("all"), "all");
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

test("M2 caption does not say completed when M1 outcome is missing", () => {
  assert.equal(m2ItemCaption(item({ m1Outcome: null })), "M1 is incomplete");
  assert.equal(
    m2ItemCaption(item({ m1Outcome: "completed" })),
    "M1 completed",
  );
  assert.equal(
    m2ItemCaption(
      item({
        itemType: "tyre_pressure_psi",
        m1Outcome: "completed",
        m1Psi: 80,
      }),
    ),
    "M1 recorded 80 PSI",
  );
  assert.equal(
    m2ItemCaption(item({ m1Outcome: "not_applicable" })),
    "M1 marked not applicable",
  );
});

test("returned status has an explicit badge variant", () => {
  assert.equal(statusBadgeVariant("returned"), "neutral");
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

test("queue surface: filters, search, row opens task page, load error banner", () => {
  const page = readFileSync(join(root, "src/app/workshop/page.tsx"), "utf8");
  const queue = readFileSync(
    join(root, "src/app/workshop/_components/WorkshopQueue.tsx"),
    "utf8",
  );
  assert.match(page, /filter: filterParam/);
  assert.match(page, /query: queryParam/);
  assert.match(page, /page: pageParam/);
  assert.match(page, /DataLoadError/);
  assert.match(queue, /today/);
  assert.match(queue, /tomorrow/);
  assert.match(queue, /next_7_days/);
  assert.match(queue, /\/workshop\/\$\{task\.taskId\}/);
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
  assert.match(task, /openOrderDetails\(task\.orderId\)/);
});
