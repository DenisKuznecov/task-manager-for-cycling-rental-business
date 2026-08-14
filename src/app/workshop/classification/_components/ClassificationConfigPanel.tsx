"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/ui/components/Alert";
import { Button } from "@/ui/components/Button";
import { DialogLayout } from "@/ui/layouts/DialogLayout";
import {
  approveClassificationConfig,
  rollbackClassificationConfig,
} from "@/src/lib/booqable/classification-config";
import type {
  ClassificationConfigSnapshot,
  ClassificationMutationResult,
} from "@/src/lib/booqable/classification-config";
import {
  allSetupSlotsProven,
  CLASSIFICATION_DEFAULT_MODE,
  type ClassificationSource,
} from "@/src/lib/booqable/contracts/classification-config";
import { WORKSHOP_SETUP_CATEGORY_LABELS } from "@/src/lib/workshop-tasks/types";

export const APPROVE_CONSEQUENCE_COPY =
  "Approval records this source snapshot as the Active classification contract. Runtime classification reads that snapshot, not live file edits. Existing bikes and tasks are not created from labels.";

export const ROLLBACK_CONSEQUENCE_COPY =
  "Rollback restores a prior approved snapshot as Active. The editable source file is not changed.";

export const THROWN_FALLBACK =
  "Couldn't update classification mapping configuration. Please try again.";

export const ROLLBACK_RETRY_UNAVAILABLE_MESSAGE =
  "Retry cannot proceed because there is no Active configuration to compare against.";

/**
 * `withAuth` redirects via Next's `NEXT_REDIRECT` throw. Catching that in the
 * panel would show a save error instead of sending the user to login.
 */
export function isClassificationRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export type ClassificationDialog = "approve" | "rollback" | null;

export type ClassificationPanelState = {
  dialog: ClassificationDialog;
  rollbackTargetId: string | null;
  pending: boolean;
  error: string | null;
  stale: boolean;
  expectedRevision: number;
  expectedActiveVersionId: string | null;
};

export function initialClassificationPanelState(
  active: ClassificationConfigSnapshot | null,
): ClassificationPanelState {
  return {
    dialog: null,
    rollbackTargetId: null,
    pending: false,
    error: null,
    stale: false,
    expectedRevision: active?.revision ?? 0,
    expectedActiveVersionId: active?.id ?? null,
  };
}

export function approveConfirmCopy(active: ClassificationConfigSnapshot | null): {
  title: string;
  currentActive: string;
  consequence: string;
} {
  return {
    title: active
      ? "Supersede the Active configuration?"
      : "Approve this configuration?",
    currentActive: active
      ? `Current Active: revision ${active.revision}.`
      : "There is no Active configuration yet.",
    consequence: APPROVE_CONSEQUENCE_COPY,
  };
}

export function rollbackConfirmCopy(
  target: ClassificationConfigSnapshot | undefined,
): {
  title: string;
  currentActive: string;
  consequence: string;
} {
  return {
    title: target
      ? `Roll back to revision ${target.revision}?`
      : "Roll back this configuration?",
    currentActive: target
      ? `Restore revision ${target.revision} as Active.`
      : "Select a prior version to restore.",
    consequence: ROLLBACK_CONSEQUENCE_COPY,
  };
}

export function startClassificationConfirm(
  state: ClassificationPanelState,
): ClassificationPanelState | null {
  if (state.pending) return null;
  return { ...state, pending: true, error: null };
}

/**
 * Stale rollback DETAIL can clear the Active pointer. Retry must surface that
 * instead of silently no-oping when expectedActiveVersionId is null.
 */
export function classificationRollbackSubmitReady(
  priorVersionId: string | null,
  expectedActiveVersionId: string | null,
):
  | { ok: true; priorVersionId: string; expectedActiveVersionId: string }
  | { ok: false; error: string } {
  if (!priorVersionId || !expectedActiveVersionId) {
    return { ok: false, error: ROLLBACK_RETRY_UNAVAILABLE_MESSAGE };
  }
  return { ok: true, priorVersionId, expectedActiveVersionId };
}

export function applyClassificationResult(
  state: ClassificationPanelState,
  result: ClassificationMutationResult,
): ClassificationPanelState & { refresh: boolean } {
  if (result.ok) {
    return {
      ...state,
      pending: false,
      dialog: null,
      rollbackTargetId: null,
      error: null,
      stale: false,
      expectedRevision: result.revision,
      refresh: true,
    };
  }

  return {
    ...state,
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
    refresh: false,
  };
}

function allowlistKeyCount(source: ClassificationSource): number {
  return Object.keys(source.allowlist).length;
}

function ClassificationConfirmBody({
  title,
  currentActive,
  consequence,
  pending,
  error,
  stale,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  currentActive: string;
  consequence: string;
  pending: boolean;
  error: string | null;
  stale: boolean;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex w-[480px] max-w-full flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <span className="text-heading-3 font-heading-3 text-default-font">
          {title}
        </span>
        <span className="text-body font-body text-subtext-color">
          {currentActive}
        </span>
      </div>
      <p className="text-body font-body text-default-font">{consequence}</p>
      {error ? (
        <Alert
          variant={stale ? "warning" : "error"}
          title={stale ? "This configuration changed" : "Couldn't save"}
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
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}

export function ClassificationConfigPanel({
  source,
  active,
  history,
}: {
  source: ClassificationSource;
  active: ClassificationConfigSnapshot | null;
  history: ClassificationConfigSnapshot[];
}) {
  const router = useRouter();
  const [state, setState] = useState<ClassificationPanelState>(() =>
    initialClassificationPanelState(active),
  );
  const stateRef = useRef(state);
  if (!stateRef.current.pending || state.pending) {
    stateRef.current = state;
  }

  const targetedReady = allSetupSlotsProven(source.setup_slots);
  const rollbackTarget = history.find(
    (version) => version.id === state.rollbackTargetId,
  );

  async function runMutation(
    mutate: () => Promise<ClassificationMutationResult>,
  ) {
    const started = startClassificationConfirm(stateRef.current);
    if (!started) return;
    stateRef.current = started;
    setState(started);
    try {
      const result = await mutate();
      const next = applyClassificationResult(started, result);
      stateRef.current = next;
      setState(next);
      if (next.refresh) router.refresh();
    } catch (error) {
      if (isClassificationRedirectError(error)) throw error;
      console.error("classification: mutation failed", error);
      const failed = {
        ...started,
        pending: false,
        stale: false,
        error: THROWN_FALLBACK,
      };
      stateRef.current = failed;
      setState(failed);
    }
  }

  function closeDialog() {
    if (state.pending) return;
    setState((current) => ({
      ...current,
      dialog: null,
      rollbackTargetId: null,
      error: null,
      stale: false,
    }));
  }

  return (
    <div className="flex w-full flex-col items-start gap-6">
      <section className="flex w-full flex-col gap-3 rounded-md border border-solid border-neutral-border p-4">
        <h2 className="text-heading-3 font-heading-3 text-default-font">
          Current source
        </h2>
        <p className="text-body font-body text-default-font">
          Mode: {source.mode}. Broad review_updated_configuration is the only
          selectable mode until every Setup Category is fixture-proven.
        </p>
        <p className="text-body font-body text-default-font">
          ProductGroup allowlist: {allowlistKeyCount(source)} UUID
          {allowlistKeyCount(source) === 1 ? "" : "s"}. Empty allowlist fails
          closed — labels cannot classify bikes.
        </p>
        <div className="flex flex-col gap-1">
          <span className="text-body-bold font-body-bold text-default-font">
            Display-only labels
          </span>
          {source.display_labels.length === 0 ? (
            <p className="text-body font-body text-subtext-color">
              No analyst-candidate names are stored. Names shown here can never
              become allowlist keys.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {source.display_labels.map((label) => (
                <li
                  key={`${label.kind}:${label.name}`}
                  className="text-body font-body text-default-font"
                >
                  {label.name} ({label.kind}
                  {label.note ? ` — ${label.note}` : ""})
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-body-bold font-body-bold text-default-font">
            Setup Category mappings
          </span>
          <ul className="flex flex-col gap-1">
            {source.setup_slots.map((slot) => (
              <li
                key={slot.category}
                className="text-body font-body text-default-font"
              >
                {WORKSHOP_SETUP_CATEGORY_LABELS[slot.category]}:{" "}
                {slot.identifier ?? "unproven identifier"}; fixtures{" "}
                {slot.fixtures.null &&
                slot.fixtures.unknown &&
                slot.fixtures.changed &&
                slot.fixtures.removed
                  ? "complete"
                  : "incomplete (null / unknown / changed / removed)"}
              </li>
            ))}
          </ul>
          {!targetedReady ? (
            <p className="text-body font-body text-subtext-color">
              Targeted mode cannot activate until all five categories have
              stable approved identifiers and complete fixtures.
            </p>
          ) : null}
        </div>
      </section>

      <section className="flex w-full flex-col gap-3 rounded-md border border-solid border-neutral-border p-4">
        <h2 className="text-heading-3 font-heading-3 text-default-font">
          Active snapshot
        </h2>
        {active ? (
          <div className="flex flex-col gap-1">
            <p className="text-body font-body text-default-font">
              Revision {active.revision} · {active.mode}
            </p>
            <p className="text-body font-body text-subtext-color">
              Approved by {active.approvedBy} at {active.approvedAt}
              {active.priorVersionId
                ? ` · prior version ${active.priorVersionId}`
                : " · no prior version"}
            </p>
          </div>
        ) : (
          <p className="text-body font-body text-subtext-color">
            No Active configuration. Approve the current source to create
            revision 1.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="brand-primary"
            disabled={state.dialog != null || state.pending}
            onClick={() =>
              setState((current) => ({
                ...current,
                dialog: "approve",
                rollbackTargetId: null,
                error: null,
                stale: false,
                expectedRevision: active?.revision ?? 0,
                expectedActiveVersionId: active?.id ?? null,
              }))
            }
          >
            {active ? "Supersede" : "Approve"}
          </Button>
        </div>
      </section>

      {history.length > 0 ? (
        <section className="flex w-full flex-col gap-3 rounded-md border border-solid border-neutral-border p-4">
          <h2 className="text-heading-3 font-heading-3 text-default-font">
            Prior versions
          </h2>
          <ul className="flex w-full flex-col gap-3">
            {history.map((version) => (
              <li
                key={version.id}
                className="flex w-full flex-wrap items-center justify-between gap-2"
              >
                <span className="text-body font-body text-default-font">
                  Revision {version.revision} · {version.mode} ·{" "}
                  {version.approvedAt}
                </span>
                <Button
                  type="button"
                  variant="neutral-secondary"
                  disabled={
                    !active || state.dialog != null || state.pending
                  }
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      dialog: "rollback",
                      rollbackTargetId: version.id,
                      error: null,
                      stale: false,
                      expectedRevision: active?.revision ?? 0,
                      expectedActiveVersionId: active?.id ?? null,
                    }))
                  }
                >
                  Roll back
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <DialogLayout
        open={state.dialog != null}
        onOpenChange={(open) => {
          if (state.pending) return;
          if (!open) closeDialog();
        }}
      >
        {state.dialog === "approve" ? (
          <ClassificationConfirmBody
            {...approveConfirmCopy(active)}
            pending={state.pending}
            error={state.error}
            stale={state.stale}
            confirmLabel={active ? "Supersede" : "Approve"}
            onConfirm={() => {
              void runMutation(() =>
                approveClassificationConfig({
                  expectedRevision: stateRef.current.expectedRevision,
                  expectedActiveVersionId:
                    stateRef.current.expectedActiveVersionId,
                  mode: CLASSIFICATION_DEFAULT_MODE,
                }),
              );
            }}
            onCancel={closeDialog}
          />
        ) : null}
        {state.dialog === "rollback" ? (
          <ClassificationConfirmBody
            {...rollbackConfirmCopy(rollbackTarget)}
            pending={state.pending}
            error={state.error}
            stale={state.stale}
            confirmLabel="Roll back"
            onConfirm={() => {
              const ready = classificationRollbackSubmitReady(
                stateRef.current.rollbackTargetId,
                stateRef.current.expectedActiveVersionId,
              );
              if (!ready.ok) {
                const failed = {
                  ...stateRef.current,
                  pending: false,
                  error: ready.error,
                };
                stateRef.current = failed;
                setState(failed);
                return;
              }
              void runMutation(() =>
                rollbackClassificationConfig({
                  priorVersionId: ready.priorVersionId,
                  expectedRevision: stateRef.current.expectedRevision,
                  expectedActiveVersionId: ready.expectedActiveVersionId,
                }),
              );
            }}
            onCancel={closeDialog}
          />
        ) : null}
      </DialogLayout>
    </div>
  );
}
