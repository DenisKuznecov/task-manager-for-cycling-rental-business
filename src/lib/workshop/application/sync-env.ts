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

/**
 * Customer webhooks may write live Google/Holded/Mailchimp only off localhost.
 * Local still acks (`200`) so ngrok can stay subscribed for debug.
 * Set `CUSTOMER_WEBHOOK_DEST_WRITES=1` to force local dest writes.
 */
export function customerWebhookDestWritesAllowed(
  env: EnvMap = process.env,
): boolean {
  if (!workshopSyncAllowed(env)) return false;
  if (!sandboxBackfillAllowed(env)) return true;
  const override = env.CUSTOMER_WEBHOOK_DEST_WRITES?.trim().toLowerCase();
  return override === "1" || override === "true";
}

export type BooqableWebhookClass = "order" | "customer" | "ignore";

/** Fail-closed: only `order.*` and customer created/updated may write. */
export function classifyBooqableWebhookEvent(rawText: string): BooqableWebhookClass {
  const event = new URLSearchParams(rawText).get("event");
  if (!event || event.trim() === "") return "ignore";
  const trimmed = event.trim();
  if (trimmed.startsWith("order.")) return "order";
  if (trimmed === "customer.created" || trimmed === "customer.updated") {
    return "customer";
  }
  return "ignore";
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

export type WebhookLandStatuses = {
  google: { status: string; error: string | null };
  holded: { status: string; error: string | null };
  mailchimp: { status: string; error: string | null };
};

export type WebhookLandResult =
  | { ok: true; ignored: true }
  | { ok: true; ignored: false; statuses: WebhookLandStatuses }
  | { ok: false; error: string };

export type WebhookDispatchOutcome = {
  status: 200 | 500;
  json: { received: true } | { error: string; message?: string };
  ignoreEvent?: string;
  land?: { customerId: string; result: WebhookLandResult };
};

export async function dispatchBooqableWebhookEvent(
  rawText: string,
  handlers: {
    landCustomer: (customerId: string) => Promise<WebhookLandResult>;
    reconcileOrder: (
      orderId: string,
    ) => Promise<{ ok: boolean; code?: string; error?: string }>;
  },
  env: EnvMap = process.env,
): Promise<WebhookDispatchOutcome> {
  const eventClass = classifyBooqableWebhookEvent(rawText);
  if (eventClass === "ignore") {
    const event = new URLSearchParams(rawText).get("event");
    return {
      status: 200,
      json: { received: true },
      ignoreEvent: event && event.trim() !== "" ? event : "(missing)",
    };
  }

  if (eventClass === "customer") {
    if (!customerWebhookDestWritesAllowed(env)) {
      return {
        status: 200,
        json: { received: true },
        ignoreEvent: "customer dest writes disabled",
      };
    }
    const customerId = parseBooqableWebhookOrderId(rawText);
    if (!customerId) {
      return { status: 200, json: { received: true } };
    }
    const result = await handlers.landCustomer(customerId);
    if (!result.ok) {
      return {
        status: 500,
        json: { error: "Failed to process webhook", message: result.error },
        land: { customerId, result },
      };
    }
    return {
      status: 200,
      json: { received: true },
      land: { customerId, result },
    };
  }

  const orderId = parseBooqableWebhookOrderId(rawText);
  if (!orderId) {
    return { status: 200, json: { received: true } };
  }
  const result = await handlers.reconcileOrder(orderId);
  const outcome = webhookDeliveryStatus({ allowed: true, result });
  if (outcome.status === 500) {
    return {
      status: 500,
      json: {
        error: "Failed to process webhook",
        message: result.ok ? undefined : result.error,
      },
    };
  }
  return { status: 200, json: { received: true } };
}
