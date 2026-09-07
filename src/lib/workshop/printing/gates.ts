import type { BikeTaskStatus, WorkshopAttestation } from "../domain/index.ts";

export type PrintStage = "m1" | "m2";

export function hasPersistedPrintSignature(
  attestation: WorkshopAttestation | undefined,
): attestation is WorkshopAttestation {
  return Boolean(
    attestation &&
      `${attestation.firstName} ${attestation.lastName}`.trim() &&
      !Number.isNaN(Date.parse(attestation.signedAt)),
  );
}

/** Cancellation retires paper actions; all other task states preserve reprints. */
export function canPrintStage(
  status: BikeTaskStatus,
  stage: PrintStage,
  m1: WorkshopAttestation | undefined,
  m2: WorkshopAttestation | undefined,
): boolean {
  if (status === "cancelled") return false;
  if (!hasPersistedPrintSignature(m1)) return false;
  return stage === "m1" || hasPersistedPrintSignature(m2);
}
