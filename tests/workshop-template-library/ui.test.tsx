import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { loadWorkshopChecklistTemplates } = vi.hoisted(() => ({
  loadWorkshopChecklistTemplates: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/templates",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/src/lib/workshop-tasks", () => ({
  loadWorkshopChecklistTemplates,
  normalizeWorkshopChecklistPhase: (value: string | undefined) =>
    value === "prep" || value === "return" ? value : "all",
  normalizeWorkshopBikeCategory: (value: string | undefined) =>
    value === "road" ? value : "all",
  normalizeWorkshopChecklistStatus: (value: string | undefined) =>
    value === "active" ? value : "all",
}));

import WorkshopTemplateLibraryPage from "@/src/app/workshop/templates/page";
import {
  applyTemplateLibraryFilter,
  buildTemplateLibraryHref,
  TemplateLibrary,
} from "@/src/app/workshop/templates/_components/TemplateLibrary";

describe("TemplateLibrary", () => {
  it("keeps prior selections in rapid successive filter replacements", () => {
    const phaseSelected = applyTemplateLibraryFilter(
      { phase: "all", category: "all", status: "all" },
      "phase",
      "prep",
    );
    const categorySelected = applyTemplateLibraryFilter(
      phaseSelected,
      "category",
      "road",
    );

    expect(
      buildTemplateLibraryHref("/workshop/templates", categorySelected),
    ).toBe("/workshop/templates?phase=prep&category=road");
  });

  it("renders a filtered successful-empty state without an error state", () => {
    const markup = renderToStaticMarkup(
      React.createElement(TemplateLibrary, {
        templates: [],
        filters: { phase: "prep", category: "road", status: "active" },
        hasError: false,
      }),
    );

    expect(markup).toContain("No checklist versions found");
    expect(markup).toContain("No versions match: Prep, Road, Active.");
    expect(markup).not.toContain("Retry");
  });

  it("renders PostgreSQL-derived row labels textually", () => {
    const markup = renderToStaticMarkup(
      React.createElement(TemplateLibrary, {
        templates: [
          {
            id: "version-1",
            phase: "return",
            bikeCategory: "e-city",
            versionNumber: 3,
            status: "superseded",
            createdAt: "2026-08-12T00:00:00.000Z",
          },
        ],
        filters: { phase: "all", category: "all", status: "all" },
        hasError: false,
      }),
    );

    expect(markup).toContain("Return");
    expect(markup).toContain("E-city");
    expect(markup).toContain(">3<");
    expect(markup).toContain("Superseded");
  });
});

describe("WorkshopTemplateLibraryPage", () => {
  beforeEach(() => {
    loadWorkshopChecklistTemplates.mockReset();
  });

  it("normalizes invalid URL filters before calling the loader", async () => {
    loadWorkshopChecklistTemplates.mockResolvedValue({
      templates: [],
      error: null,
    });

    const page = await WorkshopTemplateLibraryPage({
      searchParams: Promise.resolve({
        phase: "unsupported",
        category: "commuter",
        status: "published",
      }),
    });

    renderToStaticMarkup(page);

    expect(loadWorkshopChecklistTemplates).toHaveBeenCalledWith({
      phase: "all",
      category: "all",
      status: "all",
    });
  });

  it("renders a retryable error rather than the successful-empty state", async () => {
    loadWorkshopChecklistTemplates.mockResolvedValue({
      templates: [],
      error: "database unavailable",
    });

    const page = await WorkshopTemplateLibraryPage({
      searchParams: Promise.resolve({
        phase: "prep",
        category: "road",
        status: "active",
      }),
    });
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("Couldn&#x27;t load checklist templates");
    expect(markup).toContain("database unavailable");
    expect(markup).toContain("Retry");
    expect(markup).not.toContain("No checklist versions found");
    expect(markup).toContain(
      "/workshop/templates?phase=prep&amp;category=road&amp;status=active",
    );
  });
});
