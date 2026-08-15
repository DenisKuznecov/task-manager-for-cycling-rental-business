import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  REFRESH_WORK_CONTRACT_VERSION,
  resolveRefreshDeliveryIdentity,
} from "@/src/lib/booqable/contracts";
import { isBooqableIngestionAllowed } from "@/src/lib/booqable/ingestion-guard";
import { syncBooqableOrder } from "@/src/lib/booqable/sync";

export const dynamic = "force-dynamic";

/**
 * Thin webhook: the form-encoded payload is only used to identify the order
 * and filter out ghost orders. The actual data (customer, order, items) is
 * fetched from the Booqable API by syncBooqableOrder, so out-of-order or
 * duplicate webhook deliveries always converge on the current state.
 */
export async function POST(request: Request) {
  try {
    if (!isBooqableIngestionAllowed()) {
      console.warn(
        "[webhooks/booqable] Refusing ingestion on Vercel preview",
      );
      return NextResponse.json({ error: "Unavailable" }, { status: 403 });
    }

    // --- 1. SECURITY CHECK: VERIFY THE WEBHOOK SECRET ---
    const { searchParams } = new URL(request.url);
    const providedSecret = searchParams.get("secret");

    const webhookSecret = process.env.BOOQABLE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error(
        "[webhooks/booqable] CRITICAL: BOOQABLE_WEBHOOK_SECRET is missing in environment variables.",
      );
      return NextResponse.json(
        { error: "Server Configuration Error" },
        { status: 500 },
      );
    }

    if (providedSecret !== webhookSecret) {
      console.warn("[webhooks/booqable] Unauthorized webhook attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // ----------------------------------------------------

    const rawText = await request.text();
    const urlParams = new URLSearchParams(rawText);
    const data = Object.fromEntries(urlParams.entries()) as Record<
      string,
      string
    >;

    // --- THE GHOST ORDER BOUNCER ---
    const orderStatus = data["data[status]"] || null;
    const orderNumber = data["data[number]"] || null;

    if (orderStatus === "new" || orderStatus === "concept" || !orderNumber) {
      console.log(
        `[webhooks/booqable] Ignoring ghost order. Status: ${orderStatus}, Number: ${orderNumber}`,
      );
      // Return 200 OK so Booqable knows we received it and doesn't retry
      return NextResponse.json({ received: true, ignored: true }, { status: 200 });
    }
    // -------------------------------

    const booqableOrderId = data["data[id]"] || null;
    if (!booqableOrderId) {
      console.warn("[webhooks/booqable] Missing data[id] - skipping sync");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const providerEventId =
      data["event_id"] ||
      data["webhook_id"] ||
      data["data[event_id]"] ||
      data["data[webhook_id]"] ||
      null;
    const delivery = resolveRefreshDeliveryIdentity({
      providerEventId,
      bodyHmacSha256: createHmac(
        "sha256",
        webhookSecret,
      )
        .update(rawText)
        .digest("hex"),
    });

    const { data: recorded, error: recordError } = await supabase.rpc(
      "record_booqable_refresh_work",
      {
        p_provider: "booqable",
        p_source_kind: "order",
        p_source_external_id: booqableOrderId,
        p_delivery_identity: delivery.delivery_identity,
        p_delivery_identity_kind: delivery.delivery_identity_kind,
        p_contract_version: REFRESH_WORK_CONTRACT_VERSION,
      },
    );

    if (recordError || recorded?.ok !== true) {
      console.error(
        "[webhooks/booqable] record_booqable_refresh_work:",
        recordError ?? recorded,
      );
      return NextResponse.json(
        {
          error: "Failed to process webhook",
          message: "Failed to persist refresh work",
        },
        { status: 500 },
      );
    }

    await syncBooqableOrder(supabase, booqableOrderId);

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[webhooks/booqable] Failure:", err);
    // 500 so Booqable retries the delivery
    return NextResponse.json(
      { error: "Failed to process webhook", message },
      { status: 500 },
    );
  }
}
