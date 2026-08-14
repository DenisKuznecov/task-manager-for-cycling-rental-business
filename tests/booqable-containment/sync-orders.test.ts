import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, syncBooqableOrder } = vi.hoisted(() => ({
  createClient: vi.fn(),
  syncBooqableOrder: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("@/src/lib/booqable/sync", () => ({ syncBooqableOrder }));

const SYNC_SECRET = "sync-secret";
const WEBHOOK_SECRET = "webhook-secret";
const API_KEY = "booqable-api-key";
const SERVICE_ROLE_KEY = "service-role-key";
const SUPABASE_URL = "http://localhost:54321";
const COMPANY_SLUG = "echelon";

function loggedText(spy: ReturnType<typeof vi.spyOn>): string {
  return spy.mock.calls
    .flat()
    .map((value: unknown) =>
      typeof value === "string" ? value : JSON.stringify(value),
    )
    .join(" ");
}

function expectNoSecrets(text: string) {
  expect(text).not.toContain("wrong-token");
  expect(text).not.toContain(SYNC_SECRET);
  expect(text).not.toContain(WEBHOOK_SECRET);
  expect(text).not.toContain(API_KEY);
  expect(text).not.toContain(SERVICE_ROLE_KEY);
}

function sandboxRequest(authorization?: string): Request {
  const headers = new Headers();
  if (authorization !== undefined) {
    headers.set("Authorization", authorization);
  }
  return new Request("http://localhost/api/sandbox/booqable/sync-orders", {
    headers,
  });
}

describe("GET /api/sandbox/booqable/sync-orders", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("VERCEL_ENV", undefined);
    vi.stubEnv("BOOQABLE_SYNC_SECRET", SYNC_SECRET);
    vi.stubEnv("BOOQABLE_WEBHOOK_SECRET", WEBHOOK_SECRET);
    vi.stubEnv("BOOQABLE_API_KEY", API_KEY);
    vi.stubEnv("BOOQABLE_COMPANY_SLUG", COMPANY_SLUG);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", SERVICE_ROLE_KEY);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
    createClient.mockReset();
    createClient.mockReturnValue({ mocked: true });
    syncBooqableOrder.mockReset();
    syncBooqableOrder.mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { id: "ghost-1", attributes: { status: "new", number: 1 } },
            { id: "ord-1", attributes: { status: "reserved", number: 42 } },
          ],
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rejects a missing Bearer token without constructing a client or listing", async () => {
    const { GET } = await import(
      "@/src/app/api/sandbox/booqable/sync-orders/route"
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const response = await GET(sandboxRequest());

    expect(response.status).toBe(401);
    expect(createClient).not.toHaveBeenCalled();
    expect(syncBooqableOrder).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expectNoSecrets(loggedText(warnSpy));
  });

  it("rejects a wrong Bearer token without constructing a client or listing", async () => {
    const { GET } = await import(
      "@/src/app/api/sandbox/booqable/sync-orders/route"
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const response = await GET(sandboxRequest("Bearer wrong-token"));

    expect(response.status).toBe(401);
    expect(createClient).not.toHaveBeenCalled();
    expect(syncBooqableOrder).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expectNoSecrets(loggedText(warnSpy));
  });

  it("runs the existing backfill after a matching Bearer token off-preview", async () => {
    const { GET } = await import(
      "@/src/app/api/sandbox/booqable/sync-orders/route"
    );

    const response = await GET(sandboxRequest(`Bearer ${SYNC_SECRET}`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      totalProcessed: 1,
      failures: [],
    });
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith(SUPABASE_URL, SERVICE_ROLE_KEY);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(syncBooqableOrder).toHaveBeenCalledTimes(1);
    expect(syncBooqableOrder).toHaveBeenCalledWith({ mocked: true }, "ord-1");
  });

  it("keeps per-order failure collection when one sync fails", async () => {
    const { GET } = await import(
      "@/src/app/api/sandbox/booqable/sync-orders/route"
    );
    syncBooqableOrder.mockRejectedValue(new Error("order failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(sandboxRequest(`Bearer ${SYNC_SECRET}`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      totalProcessed: 0,
      failures: [{ id: "ord-1", error: "order failed" }],
    });
  });

  it("does not activate ingestion on Vercel preview even with a matching token", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const { GET } = await import(
      "@/src/app/api/sandbox/booqable/sync-orders/route"
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const response = await GET(sandboxRequest(`Bearer ${SYNC_SECRET}`));

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(createClient).not.toHaveBeenCalled();
    expect(syncBooqableOrder).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expectNoSecrets(loggedText(warnSpy));
  });
});
