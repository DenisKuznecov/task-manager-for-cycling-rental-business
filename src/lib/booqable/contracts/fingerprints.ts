import { createHash } from "node:crypto";
import {
  CANONICAL_FINGERPRINT_FIELD_BINDINGS,
  type CanonicalFingerprintResourceType,
  type FingerprintInputs,
} from "./source-envelope";

export {
  CANONICAL_FINGERPRINT_FIELD_BINDINGS,
} from "./source-envelope";
export type { CanonicalFingerprintResourceType } from "./source-envelope";

export const CANONICAL_FINGERPRINT_HASH_VERSION = 1;

/**
 * Only contracted fields enter the hash. Accessory tags stay opaque
 * source facts so Epic 6 can interpret them later without rewriting
 * history.
 */
export function pickFingerprintInputs(
  resourceType: CanonicalFingerprintResourceType,
  values: Record<string, unknown>,
): NonNullable<FingerprintInputs> {
  const fields = CANONICAL_FINGERPRINT_FIELD_BINDINGS[resourceType];
  const inputs: NonNullable<FingerprintInputs> = {};
  for (const field of fields) {
    inputs[field] = asFingerprintScalar(values[field]);
  }
  return inputs;
}

/**
 * Hash merged effective state, not the raw fetch. Omissions stay out of
 * this digest so a carried-forward child cannot look like a conflict.
 */
export function hashFingerprintInputs(
  inputs: NonNullable<FingerprintInputs> | readonly NonNullable<FingerprintInputs>[],
): string {
  const payload = Array.isArray(inputs)
    ? inputs.map((entry) => canonicalize(entry))
    : canonicalize(inputs);
  return createHash("sha256")
    .update(JSON.stringify(payload), "utf8")
    .digest("hex");
}

export function fingerprintResource(
  resourceType: CanonicalFingerprintResourceType,
  values: Record<string, unknown>,
): { fingerprint_inputs: NonNullable<FingerprintInputs>; source_fingerprint: string } {
  const fingerprint_inputs = pickFingerprintInputs(resourceType, values);
  return {
    fingerprint_inputs,
    source_fingerprint: hashFingerprintInputs(fingerprint_inputs),
  };
}

function asFingerprintScalar(
  value: unknown,
): NonNullable<FingerprintInputs>[string] {
  if (value === undefined) {
    return null;
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).sort().join("\0");
  }
  return String(value);
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry));
  }
  const record = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    sorted[key] = canonicalize(record[key]);
  }
  return sorted;
}
