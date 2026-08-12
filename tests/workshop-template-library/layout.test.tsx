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

import WorkshopTemplatesLayout from "@/src/app/workshop/templates/layout";

describe("WorkshopTemplatesLayout", () => {
  beforeEach(() => {
    getMyProfile.mockReset();
    redirect.mockClear();
  });

  it.each([
    [{ role: null, error: null }, "/login"],
    [{ role: "mechanic", error: null }, "/unauthorized"],
    [{ role: "partner", error: null }, "/unauthorized"],
  ] as const)("denies %o with a redirect to %s", async (profile, destination) => {
    getMyProfile.mockResolvedValue(profile);

    await expect(
      WorkshopTemplatesLayout({
        children: React.createElement("div", null, "Template library"),
      }),
    ).rejects.toThrow(`redirect:${destination}`);
    expect(redirect).toHaveBeenCalledWith(destination);
  });

  it.each(["admin", "manager"] as const)(
    "renders for %s without redirecting",
    async (role) => {
      getMyProfile.mockResolvedValue({ role, error: null });

      const result = await WorkshopTemplatesLayout({
        children: React.createElement("div", null, "Template library"),
      });

      expect(result).toBeDefined();
      expect(redirect).not.toHaveBeenCalled();
    },
  );
});
