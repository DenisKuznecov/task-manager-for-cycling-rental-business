import type { ZodError } from "zod";

/**
 * Keeps detailed database failures available during local development while
 * preventing infrastructure details from reaching production UI.
 */
export function workshopUserFacingError(
  message: string,
  fallback: string,
): string {
  return process.env.NODE_ENV === "production" ? fallback : message;
}

export function firstZodErrorMessage(
  error: ZodError,
  fallback = "Invalid checklist data.",
): string {
  return error.issues[0]?.message ?? fallback;
}

