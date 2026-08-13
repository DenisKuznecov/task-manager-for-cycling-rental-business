import { createClient } from "@/src/utils/supabase/server";
import {
  WORKSHOP_CHECKLIST_ACTIVATION_EVENT_TYPES,
  type WorkshopChecklistActivePointer,
  type WorkshopChecklistEvent,
  type WorkshopChecklistItem,
  type WorkshopChecklistTemplate,
  type WorkshopChecklistTemplateFilters,
  type WorkshopChecklistVersion,
} from "./types";

type WorkshopChecklistTemplateViewRow = {
  id: string;
  phase: string;
  bike_category: string;
  version_number: number;
  status: string;
  created_at: string;
};

type WorkshopChecklistTemplateRelation = {
  phase: string;
  bike_category: string;
};

type WorkshopChecklistItemRow = {
  id: string;
  label: string;
  position: number;
  item_type: string;
  required: boolean;
  m1: boolean;
  m2: boolean;
  setup_category: string | null;
};

type WorkshopChecklistVersionRow = {
  id: string;
  template_id: string;
  version_number: number;
  status: string;
  created_at: string;
  created_by: string | null;
  revision: number;
  workshop_checklist_templates: WorkshopChecklistTemplateRelation | WorkshopChecklistTemplateRelation[] | null;
  workshop_checklist_items: WorkshopChecklistItemRow[] | WorkshopChecklistItemRow | null;
};

const VERSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapTemplateRow(
  row: WorkshopChecklistTemplateViewRow,
): WorkshopChecklistTemplate {
  return {
    id: row.id,
    phase: row.phase as WorkshopChecklistTemplate["phase"],
    bikeCategory: row.bike_category as WorkshopChecklistTemplate["bikeCategory"],
    versionNumber: row.version_number,
    status: row.status as WorkshopChecklistTemplate["status"],
    createdAt: row.created_at,
  };
}

/**
 * Loads the library through its RLS-enforcing read model, leaving filtering and
 * ordering in PostgreSQL so shared URLs always reproduce the same result.
 */
export async function loadWorkshopChecklistTemplates(
  filters: WorkshopChecklistTemplateFilters,
): Promise<{ templates: WorkshopChecklistTemplate[]; error: string | null }> {
  const supabase = await createClient();
  let query = supabase
    .from("workshop_checklist_template_library_view")
    .select("id, phase, bike_category, version_number, status, created_at");

  if (filters.phase !== "all") query = query.eq("phase", filters.phase);
  if (filters.category !== "all") {
    query = query.eq("bike_category", filters.category);
  }
  if (filters.status !== "all") query = query.eq("status", filters.status);

  const { data, error } = await query
    .order("phase", { ascending: true })
    .order("bike_category", { ascending: true })
    .order("version_number", { ascending: false });

  if (error) {
    console.error("loadWorkshopChecklistTemplates:", error);
    return { templates: [], error: error.message };
  }

  return {
    templates: ((data as WorkshopChecklistTemplateViewRow[] | null) ?? []).map(
      mapTemplateRow,
    ),
    error: null,
  };
}

function mapItemRow(row: WorkshopChecklistItemRow): WorkshopChecklistItem {
  return {
    id: row.id,
    label: row.label,
    position: row.position,
    type: row.item_type as WorkshopChecklistItem["type"],
    required: row.required,
    m1: row.m1,
    m2: row.m2,
    setupCategory: row.setup_category as WorkshopChecklistItem["setupCategory"],
  };
}

/**
 * Nested item relations arrive as an array, a single object, or null. Only a
 * missing/empty relation is an empty definition — a lone object is one item.
 */
function nestedChecklistItemRows(
  value: WorkshopChecklistItemRow[] | WorkshopChecklistItemRow | null | undefined,
): WorkshopChecklistItemRow[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function mapActivePointerRow(
  row: { id: string; version_number: number } | null,
): WorkshopChecklistActivePointer | null {
  if (!row) return null;
  return { id: row.id, versionNumber: row.version_number };
}

/**
 * Distinguishes a missing version (`version: null`, no error → `notFound()`)
 * from a failed query (`error` set → retryable banner). Malformed ids are
 * treated as unknown rather than as a database failure. Current Active is a
 * sibling row for the same template, not a client-side scan of the library.
 */
export async function loadWorkshopChecklistVersion(
  id: string,
): Promise<{ version: WorkshopChecklistVersion | null; error: string | null }> {
  if (!VERSION_ID_PATTERN.test(id)) {
    return { version: null, error: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workshop_checklist_versions")
    .select(
      `
      id,
      template_id,
      version_number,
      status,
      created_at,
      created_by,
      revision,
      workshop_checklist_templates (
        phase,
        bike_category
      ),
      workshop_checklist_items (
        id,
        label,
        position,
        item_type,
        required,
        m1,
        m2,
        setup_category
      )
    `,
    )
    .eq("id", id)
    .order("position", {
      referencedTable: "workshop_checklist_items",
      ascending: true,
    })
    .maybeSingle();

  if (error) {
    console.error("loadWorkshopChecklistVersion:", error);
    return { version: null, error: error.message };
  }

  if (!data) return { version: null, error: null };

  const row = data as unknown as WorkshopChecklistVersionRow;
  const template = row.workshop_checklist_templates;

  if (!template || Array.isArray(template) || !row.template_id) {
    const relationError = "Checklist version is missing its template pairing.";
    console.error("loadWorkshopChecklistVersion:", relationError);
    return { version: null, error: relationError };
  }

  const { data: activeRow, error: activeError } = await supabase
    .from("workshop_checklist_versions")
    .select("id, version_number")
    .eq("template_id", row.template_id)
    .eq("status", "active")
    .maybeSingle();

  if (activeError) {
    console.error("loadWorkshopChecklistVersion:", activeError);
    return { version: null, error: activeError.message };
  }

  const items = nestedChecklistItemRows(row.workshop_checklist_items).map(
    mapItemRow,
  );

  return {
    version: {
      id: row.id,
      templateId: row.template_id,
      phase: template.phase as WorkshopChecklistVersion["phase"],
      bikeCategory:
        template.bike_category as WorkshopChecklistVersion["bikeCategory"],
      versionNumber: row.version_number,
      status: row.status as WorkshopChecklistVersion["status"],
      createdAt: row.created_at,
      createdBy: row.created_by,
      revision: row.revision,
      items,
      currentActive: mapActivePointerRow(
        activeRow as { id: string; version_number: number } | null,
      ),
    },
    error: null,
  };
}

type WorkshopChecklistEventRow = {
  id: string;
  event_type: string;
  actor_id: string;
  occurred_at: string;
  version_id: string;
  version_number: number;
  revision: number;
  superseded_version_id: string | null;
};

function mapEventRow(row: WorkshopChecklistEventRow): WorkshopChecklistEvent {
  return {
    id: row.id,
    eventType: row.event_type as WorkshopChecklistEvent["eventType"],
    actorId: row.actor_id,
    occurredAt: row.occurred_at,
    versionId: row.version_id,
    versionNumber: row.version_number,
    revision: row.revision,
    supersededVersionId: row.superseded_version_id,
  };
}

/**
 * Template-scoped `activated`/`reactivated` rows via the existing
 * (template_id, occurred_at) index. Item events are excluded. A failed load
 * returns an empty list so the version detail can still render.
 */
export async function loadWorkshopChecklistEvents(
  templateId: string,
): Promise<{ events: WorkshopChecklistEvent[]; error: string | null }> {
  if (!VERSION_ID_PATTERN.test(templateId)) {
    return { events: [], error: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workshop_checklist_events")
    .select(
      "id, event_type, actor_id, occurred_at, version_id, version_number, revision, superseded_version_id",
    )
    .eq("template_id", templateId)
    .in("event_type", [...WORKSHOP_CHECKLIST_ACTIVATION_EVENT_TYPES])
    .order("occurred_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error("loadWorkshopChecklistEvents:", error);
    return {
      events: [],
      error: error.message || "Failed to load activation history",
    };
  }

  return {
    events: ((data as WorkshopChecklistEventRow[] | null) ?? []).map(mapEventRow),
    error: null,
  };
}

