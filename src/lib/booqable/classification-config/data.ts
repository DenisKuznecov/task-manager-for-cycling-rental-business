import { createClient } from "@/src/utils/supabase/server";
import {
  ClassificationSourceSchema,
  liveClassificationSource,
  type ClassificationSource,
  type DisplayOnlyProductGroupLabel,
  type SetupSlot,
} from "@/src/lib/booqable/contracts/classification-config";
import type {
  ClassificationConfigSnapshot,
  ClassificationConfigView,
} from "./types";

type ClassificationVersionRow = {
  id: string;
  revision: number;
  status: string;
  mode: string;
  allowlist: unknown;
  display_labels: unknown;
  setup_slots: unknown;
  provenance: unknown;
  approved_by: string;
  approved_at: string;
  prior_version_id: string | null;
};

function mapSnapshot(
  row: ClassificationVersionRow,
): ClassificationConfigSnapshot | null {
  const parsed = ClassificationSourceSchema.safeParse({
    schema_version: 1,
    mode: row.mode,
    allowlist: row.allowlist,
    display_labels: row.display_labels,
    setup_slots: row.setup_slots,
    provenance: row.provenance,
  });
  if (!parsed.success) {
    return null;
  }
  if (row.status !== "active" && row.status !== "superseded") {
    return null;
  }

  return {
    id: row.id,
    revision: row.revision,
    status: row.status,
    mode: parsed.data.mode,
    allowlist: parsed.data.allowlist,
    displayLabels: parsed.data.display_labels as DisplayOnlyProductGroupLabel[],
    setupSlots: parsed.data.setup_slots as SetupSlot[],
    provenance: parsed.data.provenance,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    priorVersionId: row.prior_version_id,
  };
}

/**
 * Runtime classification reads the Active database snapshot. The editable
 * source is returned alongside it so approve copies the file, not live edits
 * that were never committed.
 */
export async function loadClassificationConfig(): Promise<{
  config: ClassificationConfigView;
  error: string | null;
}> {
  const source = liveClassificationSource();
  const empty: ClassificationConfigView = {
    active: null,
    history: [],
    source,
  };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classification_mapping_config_versions")
    .select(
      "id, revision, status, mode, allowlist, display_labels, setup_slots, provenance, approved_by, approved_at, prior_version_id",
    )
    .order("revision", { ascending: false });

  if (error) {
    console.error("loadClassificationConfig:", error);
    return { config: empty, error: error.message };
  }

  const snapshots: ClassificationConfigSnapshot[] = [];
  for (const row of (data as ClassificationVersionRow[] | null) ?? []) {
    const snapshot = mapSnapshot(row);
    if (!snapshot) {
      console.error("loadClassificationConfig: invalid snapshot", row.id);
      return {
        config: empty,
        error: "Stored classification snapshot is invalid.",
      };
    }
    snapshots.push(snapshot);
  }

  return {
    config: {
      active: snapshots.find((row) => row.status === "active") ?? null,
      history: snapshots.filter((row) => row.status === "superseded"),
      source,
    },
    error: null,
  };
}

export type { ClassificationSource };
