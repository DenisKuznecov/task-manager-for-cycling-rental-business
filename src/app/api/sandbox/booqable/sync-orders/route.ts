import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/src/utils/supabase/server";
import { fetchAllOrdersListPage } from "@/src/lib/booqable/fetch-source-snapshot";
import { reconcileBooqableOrder } from "@/src/lib/workshop/application/reconcile-order";
import { sandboxBackfillAllowed } from "@/src/lib/workshop/application/sync-env";

export const dynamic = "force-dynamic";

/**
 * Authenticated local reseed: walks every Booqable order page, persists
 * commercial rows for all statuses, and mints workshop tasks only for reserved.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/api/sandbox/booqable/sync-orders");
  }

  const { data: role, error: roleError } = await supabase.rpc("get_user_role");
  if (roleError) {
    console.error("workshop: get_user_role:", roleError);
    return NextResponse.json({ error: roleError.message }, { status: 500 });
  }
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json(
      { ok: false, code: "FORBIDDEN", error: "Admin or manager role required." },
      { status: 403 },
    );
  }

  if (!sandboxBackfillAllowed()) {
    return NextResponse.json({
      ok: false,
      code: "SOURCE_UNAVAILABLE",
      error: "Sandbox reseed is local-only.",
    });
  }

  try {
    let page = 1;
    let hasMorePages = true;
    let totalProcessed = 0;
    const failures: Array<{ id: string; error: string }> = [];

    while (hasMorePages) {
      const list = await fetchAllOrdersListPage(page);
      if (list.orders.length === 0) {
        break;
      }

      for (const order of list.orders) {
        const result = await reconcileBooqableOrder(order.id, "sandbox");
        if (!result.ok) {
          console.error("workshop: failed order", order.id, result.error);
          failures.push({ id: order.id, error: result.error });
          continue;
        }
        totalProcessed++;
      }

      hasMorePages = list.hasMore;
      page += 1;
    }

    return NextResponse.json({ success: true, totalProcessed, failures });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("workshop: fatal error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
