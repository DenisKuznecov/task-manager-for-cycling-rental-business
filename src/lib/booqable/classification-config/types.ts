import { z } from "zod";
import type { ZodError } from "zod";
import {
  CLASSIFICATION_MODES,
  type ClassificationMode,
  type ClassificationSource,
  type DisplayOnlyProductGroupLabel,
  type SetupSlot,
} from "@/src/lib/booqable/contracts/classification-config";

export const ApproveClassificationConfigInputSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  expectedActiveVersionId: z.string().uuid().nullable(),
  mode: z.enum(CLASSIFICATION_MODES),
});

export const RollbackClassificationConfigInputSchema = z.object({
  priorVersionId: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
  expectedActiveVersionId: z.string().uuid(),
});

export type ApproveClassificationConfigInput = z.infer<
  typeof ApproveClassificationConfigInputSchema
>;
export type RollbackClassificationConfigInput = z.infer<
  typeof RollbackClassificationConfigInputSchema
>;

export type ClassificationConfigSnapshot = {
  id: string;
  revision: number;
  status: "active" | "superseded";
  mode: ClassificationMode;
  allowlist: ClassificationSource["allowlist"];
  displayLabels: DisplayOnlyProductGroupLabel[];
  setupSlots: SetupSlot[];
  provenance: ClassificationSource["provenance"];
  approvedBy: string;
  approvedAt: string;
  priorVersionId: string | null;
};

/**
 * Loader always returns the editable source so the page can render a fail-closed
 * preview even when no Active snapshot exists yet.
 */
export type ClassificationConfigView = {
  active: ClassificationConfigSnapshot | null;
  history: ClassificationConfigSnapshot[];
  source: ClassificationSource;
};

export type ClassificationMutationResult =
  | { ok: true; revision: number }
  | {
      ok: false;
      error: string;
      stale?: boolean;
      revision?: number;
      activeVersionId?: string | null;
    };

export function firstZodErrorMessage(
  error: ZodError,
  fallback = "Invalid classification configuration.",
): string {
  return error.issues[0]?.message ?? fallback;
}

/**
 * Keeps detailed database failures available during local development while
 * preventing infrastructure details from reaching production UI.
 */
export function classificationUserFacingError(
  message: string,
  fallback: string,
): string {
  return process.env.NODE_ENV === "production" ? fallback : message;
}
