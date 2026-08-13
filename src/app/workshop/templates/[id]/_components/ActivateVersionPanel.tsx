"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/ui/components/Alert";
import { Button } from "@/ui/components/Button";
import { DialogLayout } from "@/ui/layouts/DialogLayout";
import { activateChecklistVersion } from "@/src/lib/workshop-tasks/actions/checklist-version-actions";
import type { ChecklistItemMutationResult } from "@/src/lib/workshop-tasks/checklist-item-mutation";
import {
  WORKSHOP_BIKE_CATEGORY_LABELS,
  WORKSHOP_CHECKLIST_PHASE_LABELS,
  WORKSHOP_SETUP_CATEGORIES,
  WORKSHOP_SETUP_CATEGORY_LABELS,
  type ActivateChecklistVersionInput,
  type WorkshopChecklistActivePointer,
  type WorkshopChecklistItem,
  type WorkshopChecklistVersion,
  type WorkshopSetupCategory,
} from "@/src/lib/workshop-tasks/types";

export const ACTIVATE_CONSEQUENCE_COPY =
  "Activation applies to future Bike Tasks only. Existing Bike Task snapshots, outcomes, and history are not changed.";

const ACTIVATE_THROWN_FALLBACK =
  "Couldn't activate this checklist version. Please try again.";

export type ActivatePanelState = {
  open: boolean;
  pending: boolean;
  error: string | null;
  stale: boolean;
  expectedRevision: number;
  expectedActiveVersionId: string | null;
  /**
   * Undefined means name the page's currentActive. After stale DETAIL, null
   * means no Active and an object is the server-reported pointer Retry will use.
   */
  reportedActive?: WorkshopChecklistActivePointer | null;
};

/**
 * Coverage is display-only: unused Setup Categories never gate activation.
 */
export function missingSetupCategories(
  items: readonly Pick<WorkshopChecklistItem, "setupCategory">[],
): WorkshopSetupCategory[] {
  const used = new Set(
    items
      .map((item) => item.setupCategory)
      .filter((value): value is WorkshopSetupCategory => value != null),
  );
  return WORKSHOP_SETUP_CATEGORIES.filter((category) => !used.has(category));
}

export function activateCoverageCopy(
  missing: readonly WorkshopSetupCategory[],
): string | null {
  if (missing.length === 0) return null;
  const names = missing
    .map((category) => WORKSHOP_SETUP_CATEGORY_LABELS[category])
    .join(", ");
  return `Some setup categories are not linked: ${names}. Missing coverage does not block activation.`;
}

export function currentActiveCopy(
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
export function namedActivateActive(
  version: WorkshopChecklistVersion,
  reportedActive: WorkshopChecklistActivePointer | null | undefined,
): WorkshopChecklistVersion["currentActive"] {
  return reportedActive === undefined ? version.currentActive : reportedActive;
}

export function activateConfirmCopy(
  version: WorkshopChecklistVersion,
  reportedActive?: WorkshopChecklistActivePointer | null,
): {
  phase: string;
  category: string;
  versionLabel: string;
  currentActive: string;
  consequence: string;
  coverage: string | null;
} {
  return {
    phase: WORKSHOP_CHECKLIST_PHASE_LABELS[version.phase],
    category: WORKSHOP_BIKE_CATEGORY_LABELS[version.bikeCategory],
    versionLabel: `Version ${version.versionNumber}`,
    currentActive: currentActiveCopy(
      namedActivateActive(version, reportedActive),
    ),
    consequence: ACTIVATE_CONSEQUENCE_COPY,
    coverage: activateCoverageCopy(missingSetupCategories(version.items)),
  };
}

export function activateSubmitInput(
  versionId: string,
  state: Pick<
    ActivatePanelState,
    "expectedRevision" | "expectedActiveVersionId"
  >,
): ActivateChecklistVersionInput {
  return {
    versionId,
    expectedRevision: state.expectedRevision,
    expectedActiveVersionId: state.expectedActiveVersionId,
  };
}

function reportedActiveFromResult(
  result: Extract<ChecklistItemMutationResult, { ok: false }>,
  previous: ActivatePanelState["reportedActive"],
): ActivatePanelState["reportedActive"] {
  if (result.stale !== true || result.activeVersionId === undefined) {
    return previous;
  }
  if (result.activeVersionId === null) return null;
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
export function applyActivateResult(
  state: ActivatePanelState,
  result: ChecklistItemMutationResult,
): ActivatePanelState & { refresh: boolean } {
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
      result.stale === true && result.activeVersionId !== undefined
        ? result.activeVersionId
        : state.expectedActiveVersionId,
    reportedActive: reportedActiveFromResult(result, state.reportedActive),
    refresh: false,
  };
}

export function applyActivateThrown(
  state: ActivatePanelState,
  error: unknown,
): ActivatePanelState {
  return {
    ...state,
    pending: false,
    stale: false,
    error:
      error instanceof Error && error.message
        ? error.message
        : ACTIVATE_THROWN_FALLBACK,
  };
}

/**
 * Marks the in-flight confirm before any await so a second click cannot start
 * another RPC. Returns null when a request is already running.
 */
export function startActivateConfirm(
  state: ActivatePanelState,
): ActivatePanelState | null {
  if (state.pending) return null;
  return { ...state, pending: true, error: null };
}

/**
 * Opening from a closed panel may initialize expected pointers from the page
 * version. While open or pending, never overwrite those pointers from props.
 */
export function openActivatePanel(
  state: ActivatePanelState,
  version: WorkshopChecklistVersion,
): ActivatePanelState {
  if (state.open || state.pending) return state;
  return {
    ...state,
    open: true,
    error: null,
    stale: false,
    expectedRevision: version.revision,
    expectedActiveVersionId: version.currentActive?.id ?? null,
    reportedActive: undefined,
  };
}

export async function submitActivateVersion(
  input: ActivateChecklistVersionInput,
  isPending: boolean,
  activate: (
    input: ActivateChecklistVersionInput,
  ) => Promise<ChecklistItemMutationResult>,
): Promise<ChecklistItemMutationResult | null> {
  if (isPending) return null;
  return activate(input);
}

export async function confirmActivate(
  stateRef: { current: ActivatePanelState },
  versionId: string,
  activate: (
    input: ActivateChecklistVersionInput,
  ) => Promise<ChecklistItemMutationResult>,
  onState?: (state: ActivatePanelState) => void,
): Promise<(ActivatePanelState & { refresh: boolean }) | "skipped"> {
  const started = startActivateConfirm(stateRef.current);
  if (!started) return "skipped";
  stateRef.current = started;
  onState?.(started);
  try {
    const result = await activate(activateSubmitInput(versionId, started));
    const next = applyActivateResult(started, result);
    stateRef.current = next;
    onState?.(next);
    return next;
  } catch (error) {
    const failed = { ...applyActivateThrown(started, error), refresh: false };
    stateRef.current = failed;
    onState?.(failed);
    return failed;
  }
}

function initialActivateState(
  version: WorkshopChecklistVersion,
): ActivatePanelState {
  return {
    open: false,
    pending: false,
    error: null,
    stale: false,
    expectedRevision: version.revision,
    expectedActiveVersionId: version.currentActive?.id ?? null,
  };
}

export function ActivateConfirmBody({
  version,
  pending,
  error,
  stale,
  reportedActive,
  onConfirm,
  onCancel,
}: {
  version: WorkshopChecklistVersion;
  pending: boolean;
  error: string | null;
  stale: boolean;
  reportedActive?: WorkshopChecklistActivePointer | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const copy = activateConfirmCopy(version, reportedActive);

  return (
    <div className="flex w-[480px] max-w-full flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Activate this version?
        </span>
        <span className="text-body font-body text-subtext-color">
          {copy.phase} {copy.category} · {copy.versionLabel}
        </span>
      </div>
      <p className="text-body font-body text-default-font">
        {copy.currentActive}
      </p>
      <p className="text-body font-body text-default-font">{copy.consequence}</p>
      {copy.coverage ? (
        <Alert
          variant="warning"
          title="Setup category coverage is incomplete"
          description={copy.coverage}
        />
      ) : null}
      {error ? (
        <Alert
          variant={stale ? "warning" : "error"}
          title={stale ? "This version changed" : "Couldn't activate"}
          description={error}
          actions={
            <Button
              variant="neutral-secondary"
              size="small"
              disabled={pending}
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
          disabled={pending}
          onClick={onConfirm}
        >
          Activate
        </Button>
      </div>
    </div>
  );
}

export function ActivateVersionPanel({
  version,
}: {
  version: WorkshopChecklistVersion;
}) {
  const router = useRouter();
  const [state, setState] = useState<ActivatePanelState>(() =>
    initialActivateState(version),
  );
  const stateRef = useRef(state);
  if (!stateRef.current.pending || state.pending) {
    stateRef.current = state;
  }

  async function confirm() {
    const next = await confirmActivate(
      stateRef,
      version.id,
      activateChecklistVersion,
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
          setState((current) => openActivatePanel(current, version))
        }
      >
        Activate
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
        <ActivateConfirmBody
          version={version}
          pending={state.pending}
          error={state.error}
          stale={state.stale}
          reportedActive={state.reportedActive}
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
