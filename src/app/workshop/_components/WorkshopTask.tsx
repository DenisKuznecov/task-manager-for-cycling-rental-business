"use client";

import React, { Suspense, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FeatherAlertTriangle,
  FeatherCheck,
  FeatherWrench,
} from "@subframe/core";
import { Alert } from "@/ui/components/Alert";
import { Badge } from "@/ui/components/Badge";
import { Breadcrumbs } from "@/ui/components/Breadcrumbs";
import { Button } from "@/ui/components/Button";
import { Checkbox } from "@/ui/components/Checkbox";
import { TextField } from "@/ui/components/TextField";
import { useOpenOrderDetails } from "@/src/components/orders/useOpenOrderDetails";
import { useUser } from "@/src/context/UserContext";
import * as workshopActions from "@/src/lib/workshop/actions";
import type {
  ChecklistItemOutcome,
  WorkshopAttestation,
  WorkshopCommandResult,
  WorkshopErrorCode,
  WorkshopSyncResult,
  WorkshopTaskDetail,
  WorkshopTaskItem,
  WorkshopTaskListRow,
} from "@/src/lib/workshop/domain";
import {
  formatMadridDateTime,
  formatWorkshopStart,
  isM1ItemValid,
  m2ItemCaption,
  statusBadgeVariant,
  workshopBikeLabel,
  WORKSHOP_STATUS_LABELS,
} from "./workshop-ui";

type WorkshopNamedAction =
  | "startPreparation"
  | "completeM1"
  | "completeM2"
  | "markPickedUp"
  | "markReturned"
  | "startStorage"
  | "completeStorage"
  | "syncOrder";

interface WorkshopTaskProps {
  detail: WorkshopTaskDetail;
}

function formatSignedAt(iso: string): string {
  return formatMadridDateTime(iso);
}

function orderButtonLabel(task: WorkshopTaskListRow): string {
  return task.orderNumber != null ? `Order #${task.orderNumber}` : "Order";
}

function signerName(attestation: WorkshopAttestation): string {
  return `${attestation.firstName} ${attestation.lastName}`.trim();
}

function sortItems(items: WorkshopTaskItem[]): WorkshopTaskItem[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

function OrderDetailsButton({
  orderId,
  label,
}: {
  orderId: string;
  label: string;
}) {
  const openOrderDetails = useOpenOrderDetails();
  return (
    <Button
      size="large"
      variant="neutral-secondary"
      onClick={() => openOrderDetails(orderId)}
    >
      {label}
    </Button>
  );
}

function OrderDetailsButtonFallback({ label }: { label: string }) {
  return (
    <Button size="large" variant="neutral-secondary" disabled>
      {label}
    </Button>
  );
}

export function WorkshopTask({ detail }: WorkshopTaskProps) {
  const router = useRouter();
  const { profile, isLoading: isProfileLoading } = useUser();
  const [isPending, startTransition] = useTransition();
  const [commandError, setCommandError] = useState<{
    code: WorkshopErrorCode;
    error: string;
  } | null>(null);
  const [psiDrafts, setPsiDrafts] = useState<Record<string, string>>({});
  const [addonsAcknowledged, setAddonsAcknowledged] = useState(false);
  const [samePersonConfirmed, setSamePersonConfirmed] = useState(false);
  const [pendingAction, setPendingAction] = useState<WorkshopNamedAction | null>(
    null,
  );

  const { task, items, addons, addonFingerprint, attestations } = detail;
  const isTombstone = task.status === "cancelled";

  const runCommand = (
    fn: () => Promise<WorkshopCommandResult | WorkshopSyncResult>,
    namedAction?: WorkshopNamedAction,
  ) => {
    if (isPending) return;
    setCommandError(null);
    if (namedAction) setPendingAction(namedAction);
    startTransition(async () => {
      try {
        const result = await fn();
        if (!result.ok) {
          console.error("workshop:", result.code, result.error);
          setCommandError({ code: result.code, error: result.error });
          if (result.code === "STALE_VERSION") {
            router.refresh();
          }
          return;
        }
        setAddonsAcknowledged(false);
        setSamePersonConfirmed(false);
        setPsiDrafts({});
        router.refresh();
      } catch (error) {
        console.error("workshop:", error);
        const message =
          error instanceof Error ? error.message : "Workshop command failed.";
        setCommandError({ code: "SOURCE_UNAVAILABLE", error: message });
      } finally {
        setPendingAction(null);
      }
    });
  };

  const isNamedPending = (action: WorkshopNamedAction) =>
    isPending && pendingAction === action;

  const setOutcome = (
    itemId: string,
    outcome: ChecklistItemOutcome,
    psi: number | null = null,
  ) => {
    runCommand(() =>
      workshopActions.setItemOutcome(
        task.taskId,
        task.version,
        itemId,
        outcome,
        psi,
      ),
    );
  };

  const preparationItems = sortItems(
    items.filter((item) => item.stage === "preparation"),
  );
  const storageItems = sortItems(
    items.filter((item) => item.stage === "storage"),
  );
  const m2Items = preparationItems.filter((item) => item.m2Verifies);
  const m1Attestation = attestations.find((row) => row.stage === "m1");
  const m2Attestation = attestations.find((row) => row.stage === "m2");
  const storageAttestation = attestations.find((row) => row.stage === "storage");
  const isSamePerson =
    !!profile && !!m1Attestation && profile.id === m1Attestation.userId;
  const m1Ready = preparationItems.every(isM1ItemValid);
  const storageReady = storageItems.every(isM1ItemValid);
  const m2Ready = m2Items.every((item) => item.m2Confirmed);
  const canCompleteM2 =
    m2Ready &&
    addonsAcknowledged &&
    addonFingerprint != null &&
    !isProfileLoading &&
    (!isSamePerson || samePersonConfirmed);

  const orderLabel = orderButtonLabel(task);
  const orderButton = (
    <Suspense fallback={<OrderDetailsButtonFallback label={orderLabel} />}>
      <OrderDetailsButton orderId={task.orderId} label={orderLabel} />
    </Suspense>
  );

  const syncButton = (
    <Button
      size="large"
      variant="neutral-secondary"
      disabled={isPending}
      loading={isNamedPending("syncOrder")}
      onClick={() =>
        runCommand(
          () => workshopActions.syncOrderFromBooqable(task.taskId),
          "syncOrder",
        )
      }
    >
      Sync order from Booqable
    </Button>
  );

  return (
    <div className="flex w-full flex-col items-start gap-6">
      <Breadcrumbs>
        <Breadcrumbs.Item onClick={() => router.push("/workshop")}>
          Task Management
        </Breadcrumbs.Item>
        <Breadcrumbs.Divider />
        <Breadcrumbs.Item active={true}>{workshopBikeLabel(task)}</Breadcrumbs.Item>
      </Breadcrumbs>

      <div className="flex w-full flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col items-start gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <FeatherWrench className="text-heading-2 font-heading-2 text-default-font" />
            <span className="text-heading-2 font-heading-2 text-default-font">
              {workshopBikeLabel(task)}
            </span>
            <Badge variant={statusBadgeVariant(task.status)}>
              {WORKSHOP_STATUS_LABELS[task.status]}
            </Badge>
          </div>
          <span className="text-body font-body text-subtext-color">
            Starts {formatWorkshopStart(task.startsAt, task.madridStartDate)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {orderButton}
          {syncButton}
        </div>
      </div>

      {task.hasConfigurationWarning ? (
        <Alert
          variant="warning"
          icon={<FeatherAlertTriangle />}
          title="Configuration warning"
          description="This bike has a missing or unrecognized workshop tag. Start preparation is blocked until the Booqable product tag is corrected."
        />
      ) : null}

      {commandError ? (
        <Alert
          variant="error"
          icon={<FeatherAlertTriangle />}
          title={commandError.code}
          description={commandError.error}
        />
      ) : null}

      {isTombstone ? (
        <Alert
          variant="neutral"
          icon={<FeatherAlertTriangle />}
          title="Abandon this work"
          description="This task was cancelled. No further preparation, pickup, return, or storage actions are available."
        />
      ) : (
        <>
          <AddonsList addons={addons} />
          <AttestationList
            m1={m1Attestation}
            m2={m2Attestation}
            storage={storageAttestation}
          />

          {task.status === "to_prepare" ? (
            <Button
              size="large"
              disabled={isPending || task.hasConfigurationWarning}
              loading={isNamedPending("startPreparation")}
              onClick={() =>
                runCommand(
                  () =>
                    workshopActions.startPreparation(task.taskId, task.version),
                  "startPreparation",
                )
              }
            >
              Start preparation
            </Button>
          ) : null}

          {task.status === "being_prepared" ? (
            <div className="flex w-full flex-col items-start gap-4">
              <ChecklistItems
                items={preparationItems}
                disabled={isPending}
                psiDrafts={psiDrafts}
                onPsiDraftChange={(itemId, value) =>
                  setPsiDrafts((current) => ({ ...current, [itemId]: value }))
                }
                onComplete={(itemId) => setOutcome(itemId, "completed")}
                onNotApplicable={(itemId) =>
                  setOutcome(itemId, "not_applicable")
                }
                onSetPsi={(itemId, psi) =>
                  setOutcome(itemId, "completed", psi)
                }
              />
              <Button
                size="large"
                disabled={isPending || !m1Ready}
                loading={isNamedPending("completeM1")}
                onClick={() =>
                  runCommand(
                    () =>
                      workshopActions.completeM1(task.taskId, task.version),
                    "completeM1",
                  )
                }
              >
                Complete M1
              </Button>
            </div>
          ) : null}

          {task.status === "needs_recheck" ? (
            <div className="flex w-full flex-col items-start gap-4">
              <M2Checklist
                items={m2Items}
                disabled={isPending}
                onConfirm={(itemId) =>
                  runCommand(() =>
                    workshopActions.confirmM2Item(
                      task.taskId,
                      task.version,
                      itemId,
                    ),
                  )
                }
              />
              {addonFingerprint == null ? (
                <Alert
                  variant="warning"
                  icon={<FeatherAlertTriangle />}
                  title="Add-ons cannot be confirmed"
                  description="Add-ons cannot be confirmed until a fingerprint exists."
                />
              ) : (
                <Checkbox
                  label="Preparation matches these add-ons"
                  checked={addonsAcknowledged}
                  disabled={isPending}
                  onCheckedChange={setAddonsAcknowledged}
                />
              )}
              {isSamePerson ? (
                <Checkbox
                  label="I confirm I am completing M2 as the same mechanic who signed M1"
                  checked={samePersonConfirmed}
                  disabled={isPending}
                  onCheckedChange={setSamePersonConfirmed}
                />
              ) : null}
              <Button
                size="large"
                disabled={isPending || !canCompleteM2}
                loading={isNamedPending("completeM2")}
                onClick={() => {
                  if (!canCompleteM2 || addonFingerprint == null) return;
                  runCommand(
                    () =>
                      workshopActions.completeM2(
                        task.taskId,
                        task.version,
                        addonFingerprint,
                        isSamePerson && samePersonConfirmed,
                      ),
                    "completeM2",
                  );
                }}
              >
                Complete M2
              </Button>
            </div>
          ) : null}

          {task.status === "ready_for_pickup" ? (
            <Button
              size="large"
              disabled={isPending}
              loading={isNamedPending("markPickedUp")}
              onClick={() =>
                runCommand(
                  () =>
                    workshopActions.markPickedUp(task.taskId, task.version),
                  "markPickedUp",
                )
              }
            >
              Mark picked up
            </Button>
          ) : null}

          {task.status === "in_rental" ? (
            <Button
              size="large"
              disabled={isPending}
              loading={isNamedPending("markReturned")}
              onClick={() =>
                runCommand(
                  () =>
                    workshopActions.markReturned(task.taskId, task.version),
                  "markReturned",
                )
              }
            >
              Mark returned
            </Button>
          ) : null}

          {task.status === "returned" ? (
            <Button
              size="large"
              disabled={isPending}
              loading={isNamedPending("startStorage")}
              onClick={() =>
                runCommand(
                  () =>
                    workshopActions.startStorage(task.taskId, task.version),
                  "startStorage",
                )
              }
            >
              Start storage
            </Button>
          ) : null}

          {task.status === "prepare_for_storage" ? (
            <div className="flex w-full flex-col items-start gap-4">
              <ChecklistItems
                items={storageItems}
                disabled={isPending}
                psiDrafts={psiDrafts}
                onPsiDraftChange={(itemId, value) =>
                  setPsiDrafts((current) => ({ ...current, [itemId]: value }))
                }
                onComplete={(itemId) => setOutcome(itemId, "completed")}
                onNotApplicable={(itemId) =>
                  setOutcome(itemId, "not_applicable")
                }
                onSetPsi={(itemId, psi) =>
                  setOutcome(itemId, "completed", psi)
                }
              />
              <Button
                size="large"
                disabled={isPending || !storageReady}
                loading={isNamedPending("completeStorage")}
                onClick={() =>
                  runCommand(
                    () =>
                      workshopActions.completeStorage(
                        task.taskId,
                        task.version,
                      ),
                    "completeStorage",
                  )
                }
              >
                Complete storage
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function AddonsList({
  addons,
}: {
  addons: WorkshopTaskDetail["addons"];
}) {
  return (
    <div className="flex w-full flex-col items-start gap-2">
      <span className="text-heading-3 font-heading-3 text-default-font">
        Add-ons
      </span>
      <ul className="flex w-full flex-col items-start gap-1">
        {addons.length === 0 ? (
          <li className="text-body font-body text-subtext-color">None</li>
        ) : (
          addons.map((addon) => (
            <li
              key={addon.id}
              className="text-body font-body text-default-font"
            >
              {addon.title?.trim() || "Add-on"}
              {addon.quantity != null ? ` × ${addon.quantity}` : ""}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function AttestationList({
  m1,
  m2,
  storage,
}: {
  m1?: WorkshopAttestation;
  m2?: WorkshopAttestation;
  storage?: WorkshopAttestation;
}) {
  if (!m1 && !m2 && !storage) return null;
  return (
    <div className="flex w-full flex-col items-start gap-1">
      {m1 ? (
        <span className="text-body font-body text-subtext-color">
          M1 signed by {signerName(m1)} · {formatSignedAt(m1.signedAt)}
        </span>
      ) : null}
      {m2 ? (
        <span className="text-body font-body text-subtext-color">
          M2 signed by {signerName(m2)} · {formatSignedAt(m2.signedAt)}
        </span>
      ) : null}
      {storage ? (
        <span className="text-body font-body text-subtext-color">
          Storage signed by {signerName(storage)} ·{" "}
          {formatSignedAt(storage.signedAt)}
        </span>
      ) : null}
    </div>
  );
}

function ChecklistItems({
  items,
  disabled,
  psiDrafts,
  onPsiDraftChange,
  onComplete,
  onNotApplicable,
  onSetPsi,
}: {
  items: WorkshopTaskItem[];
  disabled: boolean;
  psiDrafts: Record<string, string>;
  onPsiDraftChange: (itemId: string, value: string) => void;
  onComplete: (itemId: string) => void;
  onNotApplicable: (itemId: string) => void;
  onSetPsi: (itemId: string, psi: number) => void;
}) {
  return (
    <div className="flex w-full flex-col items-start gap-2">
      {items.map((item) => {
        const isDone = item.m1Outcome === "completed";
        const isNa = item.m1Outcome === "not_applicable";
        if (item.itemType === "tyre_pressure_psi") {
          const draft =
            psiDrafts[item.itemId] ??
            (item.m1Psi != null ? String(item.m1Psi) : "");
          const parsed = Number(draft);
          const psiValid = Number.isFinite(parsed) && parsed > 0;
          return (
            <div
              key={item.itemId}
              className="flex w-full flex-col items-start gap-2 rounded-md border border-solid border-neutral-border px-4 py-3"
            >
              <div className="flex w-full flex-wrap items-center gap-2">
                {isDone ? (
                  <FeatherCheck className="text-body font-body text-success-700" />
                ) : null}
                <span className="grow text-body-bold font-body-bold text-default-font">
                  {item.label}
                </span>
                {isNa ? <Badge variant="neutral">N/A</Badge> : null}
                {isDone && item.m1Psi != null ? (
                  <Badge variant="info">{item.m1Psi} PSI</Badge>
                ) : null}
              </div>
              <div className="flex w-full flex-wrap items-end gap-2">
                <TextField
                  className="w-32"
                  label="PSI"
                  helpText=""
                  disabled={disabled}
                >
                  <TextField.Input
                    type="number"
                    inputMode="decimal"
                    value={draft}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      onPsiDraftChange(item.itemId, event.target.value)
                    }
                  />
                </TextField>
                <Button
                  size="large"
                  variant="neutral-secondary"
                  disabled={disabled || !psiValid}
                  onClick={() => onSetPsi(item.itemId, parsed)}
                >
                  Set PSI
                </Button>
                {item.naAllowed ? (
                  <Button
                    size="large"
                    variant="neutral-tertiary"
                    disabled={disabled || isNa}
                    onClick={() => onNotApplicable(item.itemId)}
                  >
                    N/A
                  </Button>
                ) : null}
              </div>
            </div>
          );
        }

        return (
          <div
            key={item.itemId}
            className="flex w-full items-center gap-2"
          >
            <button
              type="button"
              disabled={disabled || isDone}
              onClick={() => onComplete(item.itemId)}
              className="flex min-h-12 grow items-center gap-3 rounded-md border border-solid border-neutral-border px-4 py-3 text-left disabled:cursor-default"
            >
              {isDone ? (
                <FeatherCheck className="text-body font-body text-success-700" />
              ) : (
                <span className="h-4 w-4 flex-none rounded-[2px] border-2 border-solid border-neutral-300" />
              )}
              <span className="text-body-bold font-body-bold text-default-font">
                {item.label}
              </span>
              {isNa ? <Badge variant="neutral">N/A</Badge> : null}
            </button>
            {item.naAllowed ? (
              <Button
                size="large"
                variant="neutral-tertiary"
                disabled={disabled || isNa}
                onClick={() => onNotApplicable(item.itemId)}
              >
                N/A
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function M2Checklist({
  items,
  disabled,
  onConfirm,
}: {
  items: WorkshopTaskItem[];
  disabled: boolean;
  onConfirm: (itemId: string) => void;
}) {
  return (
    <div className="flex w-full flex-col items-start gap-2">
      {items.map((item) => {
        const m1Summary = m2ItemCaption(item);
        return (
          <button
            key={item.itemId}
            type="button"
            disabled={disabled || item.m2Confirmed}
            onClick={() => onConfirm(item.itemId)}
            className="flex min-h-12 w-full items-center gap-3 rounded-md border border-solid border-neutral-border px-4 py-3 text-left disabled:cursor-default"
          >
            {item.m2Confirmed ? (
              <FeatherCheck className="text-body font-body text-success-700" />
            ) : (
              <span className="h-4 w-4 flex-none rounded-[2px] border-2 border-solid border-neutral-300" />
            )}
            <div className="flex flex-col items-start">
              <span className="text-body-bold font-body-bold text-default-font">
                {item.label}
              </span>
              <span className="text-caption font-caption text-subtext-color">
                {m1Summary}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
