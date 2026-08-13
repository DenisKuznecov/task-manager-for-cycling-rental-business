"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/ui/components/Alert";
import { Button } from "@/ui/components/Button";
import { DialogLayout } from "@/ui/layouts/DialogLayout";
import { reactivateChecklistVersion } from "@/src/lib/workshop-tasks/actions/checklist-version-actions";
import type { ChecklistItemMutationResult } from "@/src/lib/workshop-tasks/checklist-item-mutation";
import {
  WORKSHOP_BIKE_CATEGORY_LABELS,
  WORKSHOP_CHECKLIST_PHASE_LABELS,
  type ReactivateChecklistVersionInput,
  type WorkshopChecklistActivePointer,
  type WorkshopChecklistVersion,
} from "@/src/lib/workshop-tasks/types";
import { isActivateRedirectError } from "./ActivateVersionPanel";

export const REACTIVATE_CONSEQUENCE_COPY =
  "Reactivation applies to future Bike Tasks only. Existing Bike Task snapshots, outcomes, and history are not changed.";

const REACTIVATE_THROWN_FALLBACK =
  "Couldn't reactivate this checklist version. Please try again.";

export type ReactivatePanelState = {
  open: boolean;
  pending: boolean;
  error: string | null;
  stale: boolean;
  expectedRevision: number;
  expectedActiveVersionId: string;
  /**
   * Undefined means name the page's currentActive. After stale DETAIL, null
   * means no Active and an object is the server-reported pointer Retry will use.
   */
  reportedActive?: WorkshopChecklistActivePointer | null;
};

export function currentReactivateActiveCopy(
  currentActive: WorkshopChecklistVersion["currentActive"],
): string {
  if (!currentActive) {
    return "There is no Active version for this pairing yet.";
  }
  return `Current Active: version ${currentActive.versionNumber}.`;
}

/**
 * Until stale DETAIL arrives, name the page Active. After DETAIL, name that
 * pointer (or the no-Active sentence) so Retry copy matches the next payload.
 */
export function namedReactivateActive(
  version: WorkshopChecklistVersion,
  reportedActive: WorkshopChecklistActivePointer | null | undefined,
): WorkshopChecklistVersion["currentActive"] {
  return reportedActive === undefined ? version.currentActive : reportedActive;
}

export function reactivateConfirmCopy(
  version: WorkshopChecklistVersion,
  reportedActive?: WorkshopChecklistActivePointer | null,
): {
  phase: string;
  category: string;
  versionLabel: string;
  currentActive: string;
  consequence: string;
} {
  return {
    phase: WORKSHOP_CHECKLIST_PHASE_LABELS[version.phase],
    category: WORKSHOP_BIKE_CATEGORY_LABELS[version.bikeCategory],
    versionLabel: `Version ${version.versionNumber}`,
    currentActive: currentReactivateActiveCopy(
      namedReactivateActive(version, reportedActive),
    ),
    consequence: REACTIVATE_CONSEQUENCE_COPY,
  };
}

export function reactivateSubmitInput(
  versionId: string,
  state: Pick<
    ReactivatePanelState,
    "expectedRevision" | "expectedActiveVersionId"
  >,
): ReactivateChecklistVersionInput {
  return {
    versionId,
    expectedRevision: state.expectedRevision,
    expectedActiveVersionId: state.expectedActiveVersionId,
  };
}

function reportedActiveFromResult(
  result: Extract<ChecklistItemMutationResult, { ok: false }>,
  previous: ReactivatePanelState["reportedActive"],
): ReactivatePanelState["reportedActive"] {
  if (result.stale !== true || result.activeVersionId === undefined) {
    return previous;
  }
  if (result.activeVersionId === null) return previous;
  return {
    id: result.activeVersionId,
    versionNumber:
      typeof result.activeVersionNumber === "number"
        ? result.activeVersionNumber
        : (previous?.versionNumber ?? 0),
  };
}

/**
 * Success keeps the panel pending until reload; stale keeps it open and only
 * advances expected revision/Active from the server DETAIL after Retry review.
 */
export function applyReactivateResult(
  state: ReactivatePanelState,
  result: ChecklistItemMutationResult,
): ReactivatePanelState & { refresh: boolean } {
  if (result.ok) {
    return {
      ...state,
      pending: true,
      error: null,
      stale: false,
      refresh: true,
    };
  }

  return {
    ...state,
    open: true,
    pending: false,
    error: result.error,
    stale: result.stale === true,
    expectedRevision:
      result.stale === true && result.revision != null
        ? result.revision
        : state.expectedRevision,
    expectedActiveVersionId:
      result.stale === true && typeof result.activeVersionId === "string"
        ? result.activeVersionId
        : state.expectedActiveVersionId,
    reportedActive: reportedActiveFromResult(result, state.reportedActive),
    refresh: false,
  };
}

export function applyReactivateThrown(
  state: ReactivatePanelState,
  _error: unknown,
): ReactivatePanelState {
  return {
    ...state,
    pending: false,
    stale: false,
    error: REACTIVATE_THROWN_FALLBACK,
  };
}

export function canSubmitReactivate(
  expectedActiveVersionId: string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    expectedActiveVersionId,
  );
}

/**
 * Marks the in-flight confirm before any await so a second click cannot start
 * another RPC. Returns null when a request is already running or the Active
 * pointer is missing.
 */
export function startReactivateConfirm(
  state: ReactivatePanelState,
): ReactivatePanelState | null {
  if (state.pending || !canSubmitReactivate(state.expectedActiveVersionId)) {
    return null;
  }
  return { ...state, pending: true, error: null };
}

/**
 * Opening from a closed panel may initialize expected pointers from the page
 * version. While open or pending, never overwrite those pointers from props.
 */
export function openReactivatePanel(
  state: ReactivatePanelState,
  version: WorkshopChecklistVersion,
): ReactivatePanelState {
  if (state.open || state.pending) return state;
  return {
    ...state,
    open: true,
    error: null,
    stale: false,
    expectedRevision: version.revision,
    expectedActiveVersionId: version.currentActive?.id ?? "",
    reportedActive: undefined,
  };
}

export async function submitReactivateVersion(
  input: ReactivateChecklistVersionInput,
  isPending: boolean,
  reactivate: (
    input: ReactivateChecklistVersionInput,
  ) => Promise<ChecklistItemMutationResult>,
): Promise<ChecklistItemMutationResult | null> {
  if (isPending) return null;
  return reactivate(input);
}

export async function confirmReactivate(
  stateRef: { current: ReactivatePanelState },
  versionId: string,
  reactivate: (
    input: ReactivateChecklistVersionInput,
  ) => Promise<ChecklistItemMutationResult>,
  onState?: (state: ReactivatePanelState) => void,
): Promise<(ReactivatePanelState & { refresh: boolean }) | "skipped"> {
  const started = startReactivateConfirm(stateRef.current);
  if (!started) return "skipped";
  stateRef.current = started;
  onState?.(started);
  try {
    const result = await reactivate(reactivateSubmitInput(versionId, started));
    const next = applyReactivateResult(started, result);
    stateRef.current = next;
    onState?.(next);
    return next;
  } catch (error) {
    if (isActivateRedirectError(error)) throw error;
    const failed = { ...applyReactivateThrown(started, error), refresh: false };
    stateRef.current = failed;
    onState?.(failed);
    return failed;
  }
}

function initialReactivateState(
  version: WorkshopChecklistVersion,
): ReactivatePanelState {
  return {
    open: false,
    pending: false,
    error: null,
    stale: false,
    expectedRevision: version.revision,
    expectedActiveVersionId: version.currentActive?.id ?? "",
  };
}

export function ReactivateConfirmBody({
  version,
  pending,
  error,
  stale,
  reportedActive,
  canSubmit,
  onConfirm,
  onCancel,
}: {
  version: WorkshopChecklistVersion;
  pending: boolean;
  error: string | null;
  stale: boolean;
  reportedActive?: WorkshopChecklistActivePointer | null;
  canSubmit: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const copy = reactivateConfirmCopy(version, reportedActive);
  const confirmDisabled = pending || !canSubmit;

  return (
    <div className="flex w-[480px] max-w-full flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Reactivate this version?
        </span>
        <span className="text-body font-body text-subtext-color">
          {copy.phase} {copy.category} · {copy.versionLabel}
        </span>
      </div>
      <p className="text-body font-body text-default-font">
        {copy.currentActive}
      </p>
      <p className="text-body font-body text-default-font">{copy.consequence}</p>
      {error ? (
        <Alert
          variant={stale ? "warning" : "error"}
          title={stale ? "This version changed" : "Couldn't reactivate"}
          description={error}
          actions={
            <Button
              variant="neutral-secondary"
              size="small"
              disabled={confirmDisabled}
              onClick={onConfirm}
            >
              Retry
            </Button>
          }
        />
      ) : null}
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="neutral-tertiary"
          disabled={pending}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="brand-primary"
          loading={pending}
          disabled={confirmDisabled}
          onClick={onConfirm}
        >
          Reactivate
        </Button>
      </div>
    </div>
  );
}

export function ReactivateVersionPanel({
  version,
}: {
  version: WorkshopChecklistVersion;
}) {
  const router = useRouter();
  const [state, setState] = useState<ReactivatePanelState>(() =>
    initialReactivateState(version),
  );
  const stateRef = useRef(state);
  if (!stateRef.current.pending || state.pending) {
    stateRef.current = state;
  }

  useEffect(() => {
    const next = initialReactivateState(version);
    stateRef.current = next;
    setState(next);
    // Reset only when the route version changes so an in-flight confirm cannot
    // submit pointers from a previously viewed superseded row.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version.id is the identity
  }, [version.id]);

  async function confirm() {
    const next = await confirmReactivate(
      stateRef,
      version.id,
      reactivateChecklistVersion,
      (nextState) => setState(nextState),
    );
    if (next === "skipped") return;
    if (next.refresh) router.refresh();
  }

  return (
    <div className="flex w-full flex-col items-start gap-3">
      <Button
        type="button"
        variant="brand-primary"
        disabled={state.open || state.pending}
        onClick={() =>
          setState((current) => openReactivatePanel(current, version))
        }
      >
        Reactivate
      </Button>
      <DialogLayout
        open={state.open}
        onOpenChange={(open) => {
          if (state.pending) return;
          setState((current) => ({
            ...current,
            open,
            ...(open ? {} : { error: null, stale: false }),
          }));
        }}
      >
        <ReactivateConfirmBody
          version={version}
          pending={state.pending}
          error={state.error}
          stale={state.stale}
          reportedActive={state.reportedActive}
          canSubmit={canSubmitReactivate(state.expectedActiveVersionId)}
          onConfirm={() => {
            void confirm();
          }}
          onCancel={() => {
            if (state.pending) return;
            setState((current) => ({
              ...current,
              open: false,
              error: null,
              stale: false,
            }));
          }}
        />
      </DialogLayout>
    </div>
  );
}
