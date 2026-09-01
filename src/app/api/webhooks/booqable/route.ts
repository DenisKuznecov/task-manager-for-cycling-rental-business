import { NextResponse } from "next/server";
import { landBooqableCustomer } from "@/src/lib/customer-landing/land-customer";
import { tagReviewRequestForOrder } from "@/src/lib/customer-landing/tag-review-request";
import { reconcileBooqableOrder } from "@/src/lib/workshop/application/reconcile-order";
import {
  dispatchBooqableWebhookEvent,
  webhookDeliveryStatus,
  workshopSyncAllowed,
} from "@/src/lib/workshop/application/sync-env";

export const dynamic = "force-dynamic";

/**
 * Thin webhook: form `event` selects the path. `data[id]` is only a signal.
 * Order and customer passports come from a Booqable GET, not the delivery body.
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

    const dispatched = await dispatchBooqableWebhookEvent(await request.text(), {
      landCustomer: landBooqableCustomer,
      reconcileOrder: (orderId) => reconcileBooqableOrder(orderId, "webhook"),
      tagReviewRequest: tagReviewRequestForOrder,
    });

    if (dispatched.ignoreEvent) {
      console.warn("[webhooks/booqable] ignored event", dispatched.ignoreEvent);
    }

    if (
      dispatched.land &&
      dispatched.land.result.ok &&
      !dispatched.land.result.ignored
    ) {
      const { google, holded, mailchimp } = dispatched.land.result.statuses;
      console.info("[webhooks/booqable]", dispatched.land.customerId, {
        google: google.status,
        holded: holded.status,
        mailchimp: mailchimp.status,
        googleError: google.status === "red" ? google.error : undefined,
        holdedError: holded.status === "red" ? holded.error : undefined,
        mailchimpError: mailchimp.status === "red" ? mailchimp.error : undefined,
      });
    }

    if (dispatched.status === 500) {
      const message =
        dispatched.land && !dispatched.land.result.ok
          ? dispatched.land.result.error
          : "message" in dispatched.json
            ? dispatched.json.message
            : undefined;
      console.error("[webhooks/booqable] Failure:", message);
    }

    return NextResponse.json(dispatched.json, { status: dispatched.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[webhooks/booqable] Failure:", err);
    return NextResponse.json(
      { error: "Failed to process webhook", message },
      { status: 500 },
    );
  }
}
