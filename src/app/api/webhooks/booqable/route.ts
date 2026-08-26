import { NextResponse } from "next/server";
import { reconcileBooqableOrder } from "@/src/lib/workshop/application/reconcile-order";
import {
  parseBooqableWebhookOrderId,
  webhookDeliveryStatus,
  workshopSyncAllowed,
} from "@/src/lib/workshop/application/sync-env";

export const dynamic = "force-dynamic";

/**
 * Thin webhook: the form-encoded payload is only used to identify the order.
 * Eligibility and assignment state come from a full Booqable snapshot apply.
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const providedSecret = searchParams.get("secret");

    if (!process.env.BOOQABLE_WEBHOOK_SECRET) {
      console.error(
        "[webhooks/booqable] CRITICAL: BOOQABLE_WEBHOOK_SECRET is missing in environment variables.",
      );
      return NextResponse.json(
        { error: "Server Configuration Error" },
        { status: 500 },
      );
    }

    if (providedSecret !== process.env.BOOQABLE_WEBHOOK_SECRET) {
      console.warn("[webhooks/booqable] Unauthorized webhook attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!workshopSyncAllowed()) {
      const outcome = webhookDeliveryStatus({ allowed: false });
      return NextResponse.json(
        { received: true, ignored: true },
        { status: outcome.status },
      );
    }

    const booqableOrderId = parseBooqableWebhookOrderId(await request.text());
    if (!booqableOrderId) {
      const outcome = webhookDeliveryStatus({ allowed: true });
      return NextResponse.json({ received: true }, { status: outcome.status });
    }

    const result = await reconcileBooqableOrder(booqableOrderId, "webhook");
    const outcome = webhookDeliveryStatus({ allowed: true, result });
    if (outcome.status === 500) {
      console.error("[webhooks/booqable] Failure:", result.ok ? undefined : result.error);
      return NextResponse.json(
        { error: "Failed to process webhook", message: result.ok ? undefined : result.error },
        { status: 500 },
      );
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[webhooks/booqable] Failure:", err);
    return NextResponse.json(
      { error: "Failed to process webhook", message },
      { status: 500 },
    );
  }
}
