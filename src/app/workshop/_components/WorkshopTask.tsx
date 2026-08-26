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
  formatWorkshopFromUntil,
  isM1ItemValid,
  m2ItemCaption,
  workshopBikeId,
  workshopBikeLabel,
  workshopStatusBadgeProps,
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

function AddonsAcknowledge({
  addonFingerprint,
  checked,
  disabled,
  onCheckedChange,
}: {
  addonFingerprint: string | null;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  if (addonFingerprint == null) {
    return (
      <Alert
        variant="warning"
        icon={<FeatherAlertTriangle />}
        title="Add-ons cannot be confirmed"
        description="Add-ons cannot be confirmed until a fingerprint exists."
      />
    );
  }
  return (
    <Checkbox
      label="Preparation matches these add-ons"
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
    />
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
  const canCompleteM1 =
    m1Ready &&
    addonsAcknowledged &&
    addonFingerprint != null &&
    !isProfileLoading;
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
      Sync order details from Booqable
    </Button>
  );

  return (
    <div className="flex w-full flex-col items-start gap-6">
      <Breadcrumbs>
        <Breadcrumbs.Item onClick={() => router.push("/workshop")}>
          Workshop
        </Breadcrumbs.Item>
        <Breadcrumbs.Divider />
        <Breadcrumbs.Item active={true}>{workshopBikeId(task)}</Breadcrumbs.Item>
      </Breadcrumbs>

      <div className="flex w-full flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col items-start gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <FeatherWrench className="text-heading-2 font-heading-2 text-default-font" />
            <span className="text-heading-2 font-heading-2 text-default-font">
              {workshopBikeLabel(task)}
            </span>
            <Badge {...workshopStatusBadgeProps(task.status)}>
              {WORKSHOP_STATUS_LABELS[task.status]}
            </Badge>
          </div>
          <span className="text-body font-body text-subtext-color">
            {formatWorkshopFromUntil(
              task.startsAt,
              task.stopsAt,
              task.madridStartDate,
            )}
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
              <AddonsAcknowledge
                addonFingerprint={addonFingerprint}
                checked={addonsAcknowledged}
                disabled={isPending}
                onCheckedChange={setAddonsAcknowledged}
              />
              <Button
                size="large"
                disabled={isPending || !canCompleteM1}
                loading={isNamedPending("completeM1")}
                onClick={() => {
                  if (!canCompleteM1) return;
                  runCommand(
                    () =>
                      workshopActions.completeM1(task.taskId, task.version),
                    "completeM1",
                  );
                }}
              >
                Complete Bike Preparation
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
              <AddonsAcknowledge
                addonFingerprint={addonFingerprint}
                checked={addonsAcknowledged}
                disabled={isPending}
                onCheckedChange={setAddonsAcknowledged}
              />
              {isSamePerson ? (
                <Checkbox
                  label="I confirm that bike verification is being completed by the same mechanic who signed bike preparation"
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
                Complete Bike Verification
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
              Mark as Picked Up
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
              Mark as Returned
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
              Start Bike Storage Preparation
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
                Complete Bike Storage Preparation
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function cleanAddonText(value: string): string {
  return value
    .replace(/\|\s*FREE\s*\|/gi, "")
    .replace(/\s*\|\s*/g, " · ")
    .replace(/(?:^[\s,·]+)|(?:[\s,·]+$)/g, "")
    .replace(/\s*,\s*,+/g, ",")
    .replace(/\s{2,}/g, " ");
}

function parseAddonTitle(title: string | null): {
  label: string;
  value: string | null;
} {
  const raw = title?.trim() || "Add-on";
  const separator = raw.indexOf(" - ");
  if (separator === -1) {
    return { label: cleanAddonText(raw) || raw, value: null };
  }
  const label = cleanAddonText(raw.slice(0, separator)) || raw;
  const value = cleanAddonText(raw.slice(separator + 3));
  return { label, value: value || null };
}

function isDeclinedAddonChoice(value: string | null): boolean {
  return value != null && /^no\b/i.test(value);
}

function addonQuantityLabel(quantity: number | null): string {
  return quantity != null && quantity !== 1 ? ` × ${quantity}` : "";
}

function AddonsList({
  addons,
}: {
  addons: WorkshopTaskDetail["addons"];
}) {
  const rows = addons.map((addon) => {
    const { label, value } = parseAddonTitle(addon.title);
    const isSection = addon.lineType === "section";
    return {
      id: addon.id,
      label,
      value,
      isSection,
      declined: !isSection && isDeclinedAddonChoice(value),
      quantityLabel: addonQuantityLabel(addon.quantity),
    };
  });
  const included = rows.filter((row) => !row.declined);
  const declined = rows.filter((row) => row.declined);

  return (
    <div
      className={
        declined.length > 0
          ? "grid w-full grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-10"
          : "flex w-full flex-col items-start gap-2"
      }
    >
      <div className="flex min-w-0 w-full flex-col items-start gap-2">
        <span className="text-heading-3 font-heading-3 text-default-font">
          What's included in the order
        </span>
        {included.length === 0 ? (
          <span className="text-body font-body text-subtext-color">
            {addons.length === 0 ? "None" : "No items to fit"}
          </span>
        ) : (
          <ul className="flex w-full flex-col items-start gap-2">
            {included.map((row) => (
              <li key={row.id} className="w-full">
                {row.isSection ? (
                  <span className="text-body-bold font-body-bold text-subtext-color">
                    {row.label}
                  </span>
                ) : row.value ? (
                  <div className="flex w-full flex-wrap items-baseline gap-x-3 gap-y-0">
                    <span className="text-body font-body text-subtext-color">
                      {row.label}
                    </span>
                    <span className="min-w-0 break-words text-body font-medium text-default-font">
                      {row.value}
                      {row.quantityLabel}
                    </span>
                  </div>
                ) : (
                  <span className="text-body-bold font-body-bold text-default-font">
                    {row.label}
                    {row.quantityLabel}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {declined.length > 0 ? (
        <div className="flex min-w-0 w-full flex-col items-start gap-2 md:border-l md:border-solid md:border-neutral-border md:pl-10">
          <span className="text-heading-3 font-heading-3 text-default-font">
            Not included
          </span>
          <ul className="flex w-full flex-col items-start gap-2">
            {declined.map((row) => (
              <li
                key={row.id}
                className="text-body font-body text-subtext-color"
              >
                {row.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
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
          {`Bike preparation completed by ${signerName(m1)} on ${formatSignedAt(m1.signedAt)}`}
        </span>
      ) : null}
      {m2 ? (
        <span className="text-body font-body text-subtext-color">
          {`Recheck completed by ${signerName(m2)} on ${formatSignedAt(m2.signedAt)}`}
        </span>
      ) : null}
      {storage ? (
        <span className="text-body font-body text-subtext-color">
          {`Storage completed by ${signerName(storage)} on ${formatSignedAt(storage.signedAt)}`}
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
  const firstPsiId = items.find(
    (item) => item.itemType === "tyre_pressure_psi",
  )?.itemId;

  return (
    <div className="grid w-full grid-cols-1 items-stretch gap-2 md:grid-cols-2">
      {items.map((item) => {
        const isDone = item.m1Outcome === "completed";
        const isNa = item.m1Outcome === "not_applicable";
        const hasOutcome = isDone || isNa;
        const doneChrome = isDone
          ? "border-brand-600 bg-brand-50"
          : "border-neutral-border";
        if (item.itemType === "tyre_pressure_psi") {
          const draft =
            psiDrafts[item.itemId] ??
            (item.m1Psi != null ? String(item.m1Psi) : "");
          const parsed = Number(draft);
          const psiValid = Number.isFinite(parsed) && parsed > 0;
          return (
            <div
              key={item.itemId}
              className={`flex h-full min-w-0 w-full flex-col items-start gap-2 rounded-md border border-solid px-4 py-3 ${doneChrome}${
                item.itemId === firstPsiId ? " md:col-start-1" : ""
              }`}
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
              <div className="flex w-full flex-wrap items-center gap-2">
                <TextField
                  className="w-24 [&>div]:h-10"
                  label=""
                  helpText=""
                  disabled={disabled || isNa}
                >
                  <TextField.Input
                    type="number"
                    inputMode="decimal"
                    aria-label="PSI"
                    value={draft}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      onPsiDraftChange(item.itemId, event.target.value)
                    }
                  />
                </TextField>
                <Button
                  size="large"
                  variant="neutral-secondary"
                  disabled={disabled || isNa || !psiValid}
                  onClick={() => onSetPsi(item.itemId, parsed)}
                >
                  Set
                </Button>
                {item.naAllowed ? (
                  <Button
                    size="large"
                    variant="neutral-tertiary"
                    disabled={disabled || hasOutcome}
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
            className={`flex h-full min-h-12 min-w-0 w-full items-stretch overflow-hidden rounded-md border border-solid ${doneChrome}`}
          >
            <button
              type="button"
              disabled={disabled || hasOutcome}
              onClick={() => onComplete(item.itemId)}
              className="flex min-w-0 grow items-center gap-3 px-4 py-3 text-left disabled:cursor-default"
            >
              {isDone ? (
                <FeatherCheck className="text-body font-body text-success-700" />
              ) : (
                <span className="h-4 w-4 flex-none rounded-[2px] border-2 border-solid border-neutral-300" />
              )}
              <span className="text-body-bold font-body-bold text-default-font">
                {item.label}
              </span>
            </button>
            {item.naAllowed ? (
              <button
                type="button"
                disabled={disabled || hasOutcome}
                onClick={() => onNotApplicable(item.itemId)}
                className={
                  isNa
                    ? "flex flex-none items-center border-l border-solid border-neutral-border bg-brand-100 px-4 text-body-bold font-body-bold text-brand-800 disabled:cursor-default"
                    : "flex flex-none items-center border-l border-solid border-neutral-border px-4 text-body-bold font-body-bold text-subtext-color hover:bg-neutral-50 hover:text-default-font disabled:cursor-default"
                }
              >
                N/A
              </button>
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
    <div className="grid w-full grid-cols-1 items-stretch gap-2 md:grid-cols-2">
      {items.map((item) => {
        const m1Summary = m2ItemCaption(item);
        return (
          <button
            key={item.itemId}
            type="button"
            disabled={disabled || item.m2Confirmed}
            onClick={() => onConfirm(item.itemId)}
            className={
              item.m2Confirmed
                ? "flex h-full min-h-12 min-w-0 w-full items-center gap-3 rounded-md border border-solid border-brand-600 bg-brand-50 px-4 py-3 text-left disabled:cursor-default"
                : "flex h-full min-h-12 min-w-0 w-full items-center gap-3 rounded-md border border-solid border-neutral-border px-4 py-3 text-left disabled:cursor-default"
            }
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
              {m1Summary ? (
                <span className="text-caption font-caption text-subtext-color">
                  {m1Summary}
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
