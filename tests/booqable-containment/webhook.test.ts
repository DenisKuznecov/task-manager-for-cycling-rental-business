import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, syncBooqableOrder } = vi.hoisted(() => ({
  createClient: vi.fn(),
  syncBooqableOrder: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("@/src/lib/booqable/sync", () => ({ syncBooqableOrder }));

const WEBHOOK_SECRET = "webhook-secret";
const API_KEY = "booqable-api-key";
const SERVICE_ROLE_KEY = "service-role-key";
const SUPABASE_URL = "http://localhost:54321";
const LIVE_BODY =
  "data[status]=reserved&data[number]=42&data[id]=bq-order-1&data[email]=rider@example.com";

function loggedText(spy: ReturnType<typeof vi.spyOn>): string {
  return spy.mock.calls
    .flat()
    .map((value: unknown) =>
      typeof value === "string" ? value : JSON.stringify(value),
    )
    .join(" ");
}

function expectNoSecretsOrPii(text: string) {
  expect(text).not.toContain("wrong-secret");
  expect(text).not.toContain(WEBHOOK_SECRET);
  expect(text).not.toContain(API_KEY);
  expect(text).not.toContain(SERVICE_ROLE_KEY);
  expect(text).not.toContain("rider@example.com");
  expect(text).not.toContain(LIVE_BODY);
}

describe("POST /api/webhooks/booqable", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("VERCEL_ENV", undefined);
    vi.stubEnv("BOOQABLE_WEBHOOK_SECRET", WEBHOOK_SECRET);
    vi.stubEnv("BOOQABLE_API_KEY", API_KEY);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", SERVICE_ROLE_KEY);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
    createClient.mockReset();
    createClient.mockReturnValue({ mocked: true });
    syncBooqableOrder.mockReset();
    syncBooqableOrder.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("rejects an invalid secret without reading the body or constructing a client", async () => {
    const { POST } = await import("@/src/app/api/webhooks/booqable/route");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const request = new Request(
      `http://localhost/api/webhooks/booqable?secret=wrong-secret`,
      { method: "POST", body: LIVE_BODY },
    );

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(request.bodyUsed).toBe(false);
    expect(createClient).not.toHaveBeenCalled();
    expect(syncBooqableOrder).not.toHaveBeenCalled();
    expectNoSecretsOrPii(loggedText(warnSpy));
  });

  it("rejects a missing secret without reading the body or constructing a client", async () => {
    const { POST } = await import("@/src/app/api/webhooks/booqable/route");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const request = new Request("http://localhost/api/webhooks/booqable", {
      method: "POST",
      body: LIVE_BODY,
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(request.bodyUsed).toBe(false);
    expect(createClient).not.toHaveBeenCalled();
    expect(syncBooqableOrder).not.toHaveBeenCalled();
    expectNoSecretsOrPii(loggedText(warnSpy));
  });

  it("refetches authority after a valid secret on a non-ghost order", async () => {
    const { POST } = await import("@/src/app/api/webhooks/booqable/route");
    const request = new Request(
      `http://localhost/api/webhooks/booqable?secret=${WEBHOOK_SECRET}`,
      { method: "POST", body: LIVE_BODY },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith(SUPABASE_URL, SERVICE_ROLE_KEY);
    expect(syncBooqableOrder).toHaveBeenCalledTimes(1);
    expect(syncBooqableOrder).toHaveBeenCalledWith(
      { mocked: true },
      "bq-order-1",
    );
  });

  it("keeps ghost-order 200 without calling syncBooqableOrder", async () => {
    const { POST } = await import("@/src/app/api/webhooks/booqable/route");
    const request = new Request(
      `http://localhost/api/webhooks/booqable?secret=${WEBHOOK_SECRET}`,
      {
        method: "POST",
        body: "data[status]=new&data[number]=1&data[id]=ghost-1",
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, ignored: true });
    expect(createClient).not.toHaveBeenCalled();
    expect(syncBooqableOrder).not.toHaveBeenCalled();
  });

  it("keeps the 500 retry path when syncBooqableOrder throws", async () => {
    const { POST } = await import("@/src/app/api/webhooks/booqable/route");
    syncBooqableOrder.mockRejectedValue(new Error("upstream failed"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const request = new Request(
      `http://localhost/api/webhooks/booqable?secret=${WEBHOOK_SECRET}`,
      { method: "POST", body: LIVE_BODY },
    );

    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to process webhook",
      message: "upstream failed",
    });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("does not activate ingestion on Vercel preview even with a valid secret", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const { POST } = await import("@/src/app/api/webhooks/booqable/route");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const request = new Request(
      `http://localhost/api/webhooks/booqable?secret=${WEBHOOK_SECRET}`,
      { method: "POST", body: LIVE_BODY },
    );

    const response = await POST(request);

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(request.bodyUsed).toBe(false);
    expect(createClient).not.toHaveBeenCalled();
    expect(syncBooqableOrder).not.toHaveBeenCalled();
    expectNoSecretsOrPii(loggedText(warnSpy));
  });
});
