import { createClient } from "@/src/utils/supabase/server";
import type {
  WorkshopChecklistTemplate,
  WorkshopChecklistTemplateFilters,
  WorkshopChecklistVersion,
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

type WorkshopChecklistVersionRow = {
  id: string;
  version_number: number;
  status: string;
  created_at: string;
  created_by: string | null;
  revision: number;
  workshop_checklist_templates: WorkshopChecklistTemplateRelation | WorkshopChecklistTemplateRelation[] | null;
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

/**
 * Distinguishes a missing version (`version: null`, no error → `notFound()`)
 * from a failed query (`error` set → retryable banner). Malformed ids are
 * treated as unknown rather than as a database failure.
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
      version_number,
      status,
      created_at,
      created_by,
      revision,
      workshop_checklist_templates (
        phase,
        bike_category
      )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("loadWorkshopChecklistVersion:", error);
    return { version: null, error: error.message };
  }

  if (!data) return { version: null, error: null };

  const row = data as unknown as WorkshopChecklistVersionRow;
  const template = row.workshop_checklist_templates;

  if (!template || Array.isArray(template)) {
    const relationError = "Checklist version is missing its template pairing.";
    console.error("loadWorkshopChecklistVersion:", relationError);
    return { version: null, error: relationError };
  }

  return {
    version: {
      id: row.id,
      phase: template.phase as WorkshopChecklistVersion["phase"],
      bikeCategory:
        template.bike_category as WorkshopChecklistVersion["bikeCategory"],
      versionNumber: row.version_number,
      status: row.status as WorkshopChecklistVersion["status"],
      createdAt: row.created_at,
      createdBy: row.created_by,
      revision: row.revision,
      items: [],
    },
    error: null,
  };
}

