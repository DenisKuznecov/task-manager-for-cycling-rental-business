type EnvMap = Record<string, string | undefined>;

/** False on Vercel preview and the staging git ref; true locally and on production `main`. */
export function workshopSyncAllowed(env: EnvMap = process.env): boolean {
  if (env.VERCEL_ENV === "preview") return false;
  if (env.VERCEL_GIT_COMMIT_REF === "staging") return false;
  return true;
}

/** True only when `VERCEL_ENV` is unset (local). */
export function sandboxBackfillAllowed(env: EnvMap = process.env): boolean {
  return env.VERCEL_ENV == null || env.VERCEL_ENV === "";
}

/** Webhook body is form-encoded; only `data[id]` identifies the order. */
export function parseBooqableWebhookOrderId(rawText: string): string | null {
  const id = new URLSearchParams(rawText).get("data[id]");
  if (!id || id.trim() === "") return null;
  return id.trim();
}

/** Maps env gate + reconcile outcome to the webhook HTTP status. */
export function webhookDeliveryStatus(input: {
  allowed: boolean;
  result?: { ok: boolean; code?: string };
}): { status: 200 | 500; ignored: boolean } {
  if (!input.allowed) return { status: 200, ignored: true };
  if (!input.result) return { status: 200, ignored: false };
  if (!input.result.ok && input.result.code !== "SYNC_IN_PROGRESS") {
    return { status: 500, ignored: false };
  }
  return { status: 200, ignored: false };
}
