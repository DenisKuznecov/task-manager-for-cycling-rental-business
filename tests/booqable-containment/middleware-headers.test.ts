import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createServerClient } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient }));

const SSR_REFRESH_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
};

describe("updateSession SSR refresh headers", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    createServerClient.mockReset();
    createServerClient.mockImplementation(
      (
        _url: string,
        _key: string,
        options: {
          cookies: {
            setAll: (
              cookies: Array<{
                name: string;
                value: string;
                options: Record<string, unknown>;
              }>,
              headers: Record<string, string>,
            ) => void;
          };
        },
      ) => {
        options.cookies.setAll(
          [{ name: "sb-access-token", value: "refreshed", options: {} }],
          SSR_REFRESH_HEADERS,
        );
        return {
          auth: {
            getUser: async () => ({ data: { user: { id: "user-1" } } }),
          },
        };
      },
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("copies Cache-Control, Expires, and Pragma onto the middleware response", async () => {
    const { updateSession } = await import("@/src/utils/supabase/middleware");
    const request = new NextRequest("http://localhost/orders");

    const response = await updateSession(request);
    const cacheControl = response.headers.get("Cache-Control") ?? "";

    expect(cacheControl).toContain("private");
    expect(cacheControl).toContain("no-store");
    expect(response.headers.get("Expires")).toBe("0");
    expect(response.headers.get("Pragma")).toBe("no-cache");
  });
});
