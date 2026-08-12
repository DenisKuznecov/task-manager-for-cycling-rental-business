import { createClient } from "@/src/utils/supabase/server";
import type {
  WorkshopChecklistTemplate,
  WorkshopChecklistTemplateFilters,
} from "./types";

type WorkshopChecklistTemplateViewRow = {
  id: string;
  phase: string;
  bike_category: string;
  version_number: number;
  status: string;
  created_at: string;
};

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
      (row) => ({
        id: row.id,
        phase: row.phase as WorkshopChecklistTemplate["phase"],
        bikeCategory: row.bike_category as WorkshopChecklistTemplate["bikeCategory"],
        versionNumber: row.version_number,
        status: row.status as WorkshopChecklistTemplate["status"],
        createdAt: row.created_at,
      }),
    ),
    error: null,
  };
}
