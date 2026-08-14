import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMyProfile, redirect } = vi.hoisted(() => ({
  getMyProfile: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
}));

vi.mock("@/src/lib/profile", () => ({ getMyProfile }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/ui/layouts/DefaultPageLayout", () => ({
  DefaultPageLayout: ({ children }: { children: React.ReactNode }) => children,
}));

import WorkshopClassificationLayout from "@/src/app/workshop/classification/layout";

describe("WorkshopClassificationLayout", () => {
  beforeEach(() => {
    getMyProfile.mockReset();
    redirect.mockClear();
  });

  it.each([
    [{ role: null, error: null }, "/login"],
    [{ role: "manager", error: null }, "/unauthorized"],
    [{ role: "mechanic", error: null }, "/unauthorized"],
    [{ role: "partner", error: null }, "/unauthorized"],
  ] as const)("denies %o with a redirect to %s", async (profile, destination) => {
    getMyProfile.mockResolvedValue(profile);

    await expect(
      WorkshopClassificationLayout({
        children: React.createElement("div", null, "Classification"),
      }),
    ).rejects.toThrow(`redirect:${destination}`);
    expect(redirect).toHaveBeenCalledWith(destination);
  });

  it("renders for admin without redirecting", async () => {
    getMyProfile.mockResolvedValue({ role: "admin", error: null });

    const result = await WorkshopClassificationLayout({
      children: React.createElement("div", null, "Classification"),
    });

    expect(result).toBeDefined();
    expect(redirect).not.toHaveBeenCalled();
  });
});
