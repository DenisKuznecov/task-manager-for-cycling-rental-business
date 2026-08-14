import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  authorizeSandboxBearer,
  isBooqableIngestionAllowed,
} from "@/src/lib/booqable/ingestion-guard";

const SYNC_SECRET = "sync-secret";

function requestWithAuth(authorization?: string): Request {
  const headers = new Headers();
  if (authorization !== undefined) {
    headers.set("Authorization", authorization);
  }
  return new Request("http://localhost/api/sandbox/booqable/sync-orders", {
    headers,
  });
}

describe("isBooqableIngestionAllowed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows localhost when VERCEL_ENV is unset", () => {
    vi.stubEnv("VERCEL_ENV", undefined);
    expect(isBooqableIngestionAllowed()).toBe(true);
  });

  it("allows production and staging", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(isBooqableIngestionAllowed()).toBe(true);
  });

  it("fails closed on Vercel preview even if secrets are present", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("BOOQABLE_SYNC_SECRET", SYNC_SECRET);
    vi.stubEnv("BOOQABLE_WEBHOOK_SECRET", "webhook-secret");
    expect(isBooqableIngestionAllowed()).toBe(false);
  });
});

describe("authorizeSandboxBearer", () => {
  beforeEach(() => {
    vi.stubEnv("BOOQABLE_SYNC_SECRET", SYNC_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts a matching Bearer token", () => {
    expect(
      authorizeSandboxBearer(requestWithAuth(`Bearer ${SYNC_SECRET}`)),
    ).toBe(true);
  });

  it("rejects a missing Authorization header", () => {
    expect(authorizeSandboxBearer(requestWithAuth())).toBe(false);
  });

  it("rejects a wrong Bearer token without treating the path as a grant", () => {
    expect(authorizeSandboxBearer(requestWithAuth("Bearer wrong-token"))).toBe(
      false,
    );
  });

  it("rejects the webhook secret used as a Bearer token", () => {
    vi.stubEnv("BOOQABLE_WEBHOOK_SECRET", "webhook-secret");
    expect(
      authorizeSandboxBearer(requestWithAuth("Bearer webhook-secret")),
    ).toBe(false);
  });

  it("rejects when BOOQABLE_SYNC_SECRET is unset", () => {
    vi.stubEnv("BOOQABLE_SYNC_SECRET", undefined);
    expect(
      authorizeSandboxBearer(requestWithAuth(`Bearer ${SYNC_SECRET}`)),
    ).toBe(false);
  });
});
