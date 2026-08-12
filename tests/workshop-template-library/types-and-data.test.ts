import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  normalizeWorkshopBikeCategory,
  normalizeWorkshopChecklistPhase,
  normalizeWorkshopChecklistStatus,
} from "@/src/lib/workshop-tasks/types";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/src/utils/supabase/server", () => ({ createClient }));

describe("workshop template URL filters", () => {
  it("keeps every supported URL filter value", () => {
    expect(normalizeWorkshopChecklistPhase("prep")).toBe("prep");
    expect(normalizeWorkshopBikeCategory("e-road")).toBe("e-road");
    expect(normalizeWorkshopChecklistStatus("superseded")).toBe("superseded");
  });

  it("normalizes unsupported and omitted URL filters to all", () => {
    expect(normalizeWorkshopChecklistPhase("dispatch")).toBe("all");
    expect(normalizeWorkshopBikeCategory(undefined)).toBe("all");
    expect(normalizeWorkshopChecklistStatus("published")).toBe("all");
  });
});

describe("loadWorkshopChecklistTemplates", () => {
  beforeEach(() => {
    createClient.mockReset();
  });

  it("applies valid filters and orders rows in PostgreSQL", async () => {
    const { loadWorkshopChecklistTemplates } = await import(
      "@/src/lib/workshop-tasks/data"
    );
    const finalResult = {
      data: [
        {
          id: "version-1",
          phase: "prep",
          bike_category: "road",
          version_number: 2,
          status: "active",
          created_at: "2026-08-12T00:00:00.000Z",
        },
      ],
      error: null,
    };
    const query = {
      eq: vi.fn(),
      order: vi.fn(),
    };

    query.eq.mockReturnValue(query);
    query.order
      .mockReturnValueOnce(query)
      .mockReturnValueOnce(query)
      .mockResolvedValueOnce(finalResult);
    createClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(query),
      }),
    });

    await expect(
      loadWorkshopChecklistTemplates({
        phase: "prep",
        category: "road",
        status: "active",
      }),
    ).resolves.toEqual({
      templates: [
        {
          id: "version-1",
          phase: "prep",
          bikeCategory: "road",
          versionNumber: 2,
          status: "active",
          createdAt: "2026-08-12T00:00:00.000Z",
        },
      ],
      error: null,
    });

    expect(query.eq).toHaveBeenCalledWith("phase", "prep");
    expect(query.eq).toHaveBeenCalledWith("bike_category", "road");
    expect(query.eq).toHaveBeenCalledWith("status", "active");
    expect(query.order).toHaveBeenNthCalledWith(1, "phase", {
      ascending: true,
    });
    expect(query.order).toHaveBeenNthCalledWith(2, "bike_category", {
      ascending: true,
    });
    expect(query.order).toHaveBeenNthCalledWith(3, "version_number", {
      ascending: false,
    });
  });

  it("returns an empty fallback and logs a contextual query failure", async () => {
    const { loadWorkshopChecklistTemplates } = await import(
      "@/src/lib/workshop-tasks/data"
    );
    const query = {
      order: vi.fn(),
    };
    const error = { message: "database unavailable" };

    query.order
      .mockReturnValueOnce(query)
      .mockReturnValueOnce(query)
      .mockResolvedValueOnce({ data: null, error });
    createClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(query),
      }),
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      loadWorkshopChecklistTemplates({
        phase: "all",
        category: "all",
        status: "all",
      }),
    ).resolves.toEqual({ templates: [], error: "database unavailable" });

    expect(errorSpy).toHaveBeenCalledWith(
      "loadWorkshopChecklistTemplates:",
      error,
    );
    errorSpy.mockRestore();
  });
});
