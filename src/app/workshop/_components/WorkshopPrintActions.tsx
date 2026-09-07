"use client";

import { useRef, useState } from "react";
import { FeatherAlertTriangle } from "@subframe/core";
import { Alert } from "@/ui/components/Alert";
import { Button } from "@/ui/components/Button";
import {
  buildM1PrintDocument,
  buildM2PrintDocument,
} from "@/src/lib/workshop/printing/documents";
import {
  createPrintAttemptGuard,
  sendPrintAttempt,
  type PrintAttempt,
} from "@/src/lib/workshop/printing/epos";
import {
  canPrintStage,
  hasPersistedPrintSignature,
} from "@/src/lib/workshop/printing/gates";
import type { WorkshopPrinterConfig } from "@/src/lib/workshop/printing/config";
import type {
  WorkshopTaskDetail,
} from "@/src/lib/workshop/domain";
import { formatMadridDateTime } from "./workshop-ui";

type PrintKind = "m1" | "m2";

export function WorkshopPrintActions({
  detail,
  printerConfig,
}: {
  detail: WorkshopTaskDetail;
  printerConfig: WorkshopPrinterConfig;
}) {
  const [pending, setPending] = useState<PrintKind | null>(null);
  const [attempt, setAttempt] = useState<PrintAttempt | null>(null);
  const guard = useRef(createPrintAttemptGuard());
  const m1 = detail.attestations.find((attestation) => attestation.stage === "m1");
  const m2 = detail.attestations.find((attestation) => attestation.stage === "m2");
  const m1Ready = canPrintStage(detail.task.status, "m1", m1, m2);
  const m2Ready = canPrintStage(detail.task.status, "m2", m1, m2);
  const m1Signed = hasPersistedPrintSignature(m1);
  const m2Signed = hasPersistedPrintSignature(m2);
  const enabled = printerConfig.ok && pending === null;

  if (detail.task.status === "cancelled") return null;

  async function print(kind: PrintKind) {
    if (!printerConfig.ok || !guard.current.claim()) return;
    const document =
      kind === "m1"
        ? m1Signed
          ? buildM1PrintDocument({
              task: detail.task,
              m1,
              m1SignedAt: formatMadridDateTime(m1.signedAt),
            })
          : null
        : m1Signed && m2Signed
          ? buildM2PrintDocument({
              task: detail.task,
              items: detail.items,
              m1,
              m2,
              m1SignedAt: formatMadridDateTime(m1.signedAt),
            })
          : null;
    if (!document) {
      guard.current.release();
      return;
    }
    try {
      setAttempt(null);
      setPending(kind);
      setAttempt(await sendPrintAttempt(printerConfig.target, document));
    } finally {
      setPending(null);
      guard.current.release();
    }
  }

  return (
    <div className="flex w-full flex-col items-start gap-3" aria-live="polite">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="neutral-secondary"
          disabled={!enabled || !m1Ready}
          loading={pending === "m1"}
          onClick={() => {
            void print("m1");
          }}
        >
          Print M1 re-check tag
        </Button>
        <Button
          variant="neutral-secondary"
          disabled={!enabled || !m2Ready}
          loading={pending === "m2"}
          onClick={() => {
            void print("m2");
          }}
        >
          Print M2 customer sheet
        </Button>
      </div>

      {!printerConfig.ok ? (
        <Alert
          variant="error"
          icon={<FeatherAlertTriangle />}
          title="Printing unavailable"
          description={printerConfig.error}
        />
      ) : null}
      {attempt ? (
        <Alert
          variant={
            attempt.outcome === "acknowledged"
              ? "success"
              : attempt.outcome === "failed"
                ? "error"
                : "warning"
          }
          icon={attempt.outcome === "acknowledged" ? undefined : <FeatherAlertTriangle />}
          title={
            attempt.outcome === "acknowledged"
              ? "Sent to printer"
              : attempt.outcome === "failed"
                ? "Printer reported failure"
                : "Delivery unknown"
          }
          description={attempt.message}
        />
      ) : null}
    </div>
  );
}
