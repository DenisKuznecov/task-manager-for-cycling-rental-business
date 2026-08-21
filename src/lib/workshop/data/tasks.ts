import { createClient } from "@/src/utils/supabase/server";
import {
  isBikeTaskStatus,
  resolveWorkshopQueueFilter,
  type AttestationStage,
  type ChecklistItemOutcome,
  type ChecklistItemStage,
  type ChecklistItemType,
  type WorkshopAddon,
  type WorkshopAttestation,
  type WorkshopQueueFilter,
  type WorkshopTaskDetail,
  type WorkshopTaskEvent,
  type WorkshopTaskItem,
  type WorkshopTaskListQuery,
  type WorkshopTaskListRow,
} from "@/src/lib/workshop/domain";

export const WORKSHOP_PAGE_SIZE = 50;

type TaskListViewRow = {
  task_id: string;
  version: number;
  status: string;
  order_id: string;
  order_number: number | null;
  starts_at: string | null;
  madrid_start_date: string | null;
  bike_source_id: string;
  bike_display_id: string | null;
  bike_title: string | null;
  workshop_tag: string | null;
  has_configuration_warning: boolean;
  items_completed: number | null;
  items_total: number | null;
};

function madridTodayIsoDate(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
}

function addIsoDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

function mapListRow(row: TaskListViewRow): WorkshopTaskListRow | null {
  if (!isBikeTaskStatus(row.status)) return null;
  return {
    taskId: row.task_id,
    version: row.version,
    status: row.status,
    orderId: row.order_id,
    orderNumber: row.order_number,
    startsAt: row.starts_at,
    madridStartDate: row.madrid_start_date,
    bikeSourceId: row.bike_source_id,
    bikeDisplayId: row.bike_display_id,
    bikeTitle: row.bike_title,
    workshopTag: row.workshop_tag,
    hasConfigurationWarning: row.has_configuration_warning,
    itemsCompleted: row.items_completed ?? 0,
    itemsTotal: row.items_total ?? 0,
  };
}

function applyQueueFilter(
  filter: WorkshopQueueFilter,
  madridToday: string,
): { gte?: string; lt?: string; eq?: string } {
  if (filter === "today") return { eq: madridToday };
  if (filter === "tomorrow") return { eq: addIsoDays(madridToday, 1) };
  if (filter === "next_7_days") {
    return { gte: madridToday, lt: addIsoDays(madridToday, 7) };
  }
  return {};
}

/**
 * Paginated work-queue rows from `workshop_tasks_view`.
 * Cancelled tasks are excluded from every filter; Completed stays in `all`.
 */
export async function loadWorkshopTasks(
  query: WorkshopTaskListQuery = {},
): Promise<{ tasks: WorkshopTaskListRow[]; count: number; error: string | null }> {
  const filter = resolveWorkshopQueueFilter(query.filter);
  const parsedPage = Number(query.page);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const from = (page - 1) * WORKSHOP_PAGE_SIZE;
  const to = from + WORKSHOP_PAGE_SIZE - 1;
  const madridToday = madridTodayIsoDate();
  const bounds = applyQueueFilter(filter, madridToday);

  const supabase = await createClient();
  let builder = supabase
    .from("workshop_tasks_view")
    .select("*", { count: "exact" })
    .neq("status", "cancelled");

  if (bounds.eq) builder = builder.eq("madrid_start_date", bounds.eq);
  if (bounds.gte) builder = builder.gte("madrid_start_date", bounds.gte);
  if (bounds.lt) builder = builder.lt("madrid_start_date", bounds.lt);

  const trimmed = query.query?.trim() ?? "";
  const stripped = trimmed.replace(/[,()]/g, "");
  if (stripped) {
    const escaped = stripped
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");
    builder = builder.or(
      `bike_display_id.ilike.%${escaped}%,bike_title.ilike.%${escaped}%,order_number_text.ilike.%${escaped}%`,
    );
  }

  const { data, count, error } = await builder
    .order("starts_at", { ascending: true, nullsFirst: false })
    .order("order_number", { ascending: true, nullsFirst: false })
    .order("bike_display_id", { ascending: true, nullsFirst: false })
    .order("task_id", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("workshop:", error);
    return { tasks: [], count: 0, error: error.message };
  }

  const tasks = ((data as TaskListViewRow[] | null) ?? [])
    .map(mapListRow)
    .filter((row): row is WorkshopTaskListRow => row !== null);

  return { tasks, count: count ?? 0, error: null };
}

function isItemType(value: unknown): value is ChecklistItemType {
  return value === "action" || value === "tyre_pressure_psi";
}

function isItemStage(value: unknown): value is ChecklistItemStage {
  return value === "preparation" || value === "storage";
}

function isOutcome(value: unknown): value is ChecklistItemOutcome {
  return value === "completed" || value === "not_applicable";
}

function isAttestationStage(value: unknown): value is AttestationStage {
  return value === "m1" || value === "m2" || value === "storage";
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function mapDetailPayload(data: unknown): WorkshopTaskDetail | null {
  if (typeof data !== "object" || data === null) return null;
  const root = data as Record<string, unknown>;
  const taskRaw = root.task;
  if (typeof taskRaw !== "object" || taskRaw === null) return null;

  const listRow = mapListRow(taskRaw as TaskListViewRow);
  if (!listRow) return null;

  const items: WorkshopTaskItem[] = Array.isArray(root.items)
    ? root.items.flatMap((entry) => {
        if (typeof entry !== "object" || entry === null) return [];
        const row = entry as Record<string, unknown>;
        const itemId = asString(row.itemId);
        const stage = row.stage;
        const itemType = row.itemType;
        const itemKey = asString(row.itemKey);
        const label = asString(row.label);
        if (
          !itemId ||
          !itemKey ||
          !label ||
          !isItemStage(stage) ||
          !isItemType(itemType)
        ) {
          return [];
        }
        const m1Outcome = row.m1Outcome;
        return [
          {
            itemId,
            stage,
            itemKey,
            sortOrder: asNumber(row.sortOrder) ?? 0,
            label,
            itemType,
            required: asBoolean(row.required),
            m2Verifies: asBoolean(row.m2Verifies),
            naAllowed: asBoolean(row.naAllowed),
            m1Outcome: isOutcome(m1Outcome) ? m1Outcome : null,
            m1Psi: asNumber(row.m1Psi),
            m2Confirmed: asBoolean(row.m2Confirmed),
          },
        ];
      })
    : [];

  const addons: WorkshopAddon[] = Array.isArray(root.addons)
    ? root.addons.flatMap((entry) => {
        if (typeof entry !== "object" || entry === null) return [];
        const row = entry as Record<string, unknown>;
        const id = asString(row.id);
        if (!id) return [];
        return [
          {
            id,
            title: asString(row.title),
            quantity: asNumber(row.quantity),
            lineType: asString(row.lineType),
          },
        ];
      })
    : [];

  const attestations: WorkshopAttestation[] = Array.isArray(root.attestations)
    ? root.attestations.flatMap((entry) => {
        if (typeof entry !== "object" || entry === null) return [];
        const row = entry as Record<string, unknown>;
        const id = asString(row.id);
        const stage = row.stage;
        const userId = asString(row.userId);
        const firstName = asString(row.firstName);
        const lastName = asString(row.lastName);
        const signedAt = asString(row.signedAt);
        if (
          !id ||
          !userId ||
          !firstName ||
          !lastName ||
          !signedAt ||
          !isAttestationStage(stage)
        ) {
          return [];
        }
        return [
          {
            id,
            stage,
            userId,
            firstName,
            lastName,
            signedAt,
            samePersonConfirmed: asBoolean(row.samePersonConfirmed),
            addonFingerprint: asString(row.addonFingerprint),
          },
        ];
      })
    : [];

  const events: WorkshopTaskEvent[] = Array.isArray(root.events)
    ? root.events.flatMap((entry) => {
        if (typeof entry !== "object" || entry === null) return [];
        const row = entry as Record<string, unknown>;
        const id = asString(row.id);
        const eventKind = asString(row.eventKind);
        const resultingVersion = asNumber(row.resultingVersion);
        const source = asString(row.source);
        const occurredAt = asString(row.occurredAt);
        if (!id || !eventKind || resultingVersion === null || !source || !occurredAt) {
          return [];
        }
        const fromStatus = row.fromStatus;
        const toStatus = row.toStatus;
        return [
          {
            id,
            eventKind,
            fromStatus: isBikeTaskStatus(fromStatus) ? fromStatus : null,
            toStatus: isBikeTaskStatus(toStatus) ? toStatus : null,
            resultingVersion,
            source,
            actorId: asString(row.actorId),
            actorFirstName: asString(row.actorFirstName),
            actorLastName: asString(row.actorLastName),
            occurredAt,
          },
        ];
      })
    : [];

  return {
    task: listRow,
    items,
    addons,
    addonFingerprint: asString(root.addonFingerprint),
    sourceFingerprint: asString(root.sourceFingerprint),
    attestations,
    events,
  };
}

/**
 * Single-task DTO. Cancelled tasks are tombstones (`item` set, `error` null),
 * not not-found. True not-found is `item: null, error: null`.
 */
export async function loadWorkshopTaskDetail(
  taskId: string,
): Promise<{ item: WorkshopTaskDetail | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("workshop_task_detail", {
    task_id: taskId,
  });

  if (error) {
    console.error("workshop:", error);
    return { item: null, error: error.message };
  }

  if (data == null) {
    return { item: null, error: null };
  }

  const item = mapDetailPayload(data);
  if (!item) {
    console.error("workshop:", "unexpected workshop_task_detail payload");
    return { item: null, error: "Unexpected workshop task detail payload." };
  }

  return { item, error: null };
}
