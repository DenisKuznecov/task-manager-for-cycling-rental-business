import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  loadWorkshopChecklistTemplates,
  loadWorkshopChecklistVersion,
  notFound,
} = vi.hoisted(() => ({
  loadWorkshopChecklistTemplates: vi.fn(),
  loadWorkshopChecklistVersion: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/templates",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  notFound,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => React.createElement("a", { href, className }, children),
}));

vi.mock("@/src/lib/workshop-tasks/actions/checklist-version-actions", () => ({
  createDraftChecklistVersion: vi.fn(),
}));

vi.mock("@/src/lib/workshop-tasks", () => ({
  loadWorkshopChecklistTemplates,
  loadWorkshopChecklistVersion,
  normalizeWorkshopChecklistPhase: (value: string | undefined) =>
    value === "prep" || value === "return" ? value : "all",
  normalizeWorkshopBikeCategory: (value: string | undefined) =>
    value === "road" ? value : "all",
  normalizeWorkshopChecklistStatus: (value: string | undefined) =>
    value === "active" ? value : "all",
}));

import WorkshopTemplateLibraryPage from "@/src/app/workshop/templates/page";
import TemplateVersionDetailPage from "@/src/app/workshop/templates/[id]/page";
import {
  applyTemplateLibraryFilter,
  buildTemplateLibraryHref,
  createDraftSelectionHint,
  submitCreateDraft,
  TemplateLibrary,
  templateVersionHref,
} from "@/src/app/workshop/templates/_components/TemplateLibrary";

function createDraftButtonOpenTag(markup: string): string {
  const match = markup.match(/<button\b[^>]*>[\s\S]*?Create Draft/);
  if (!match) {
    throw new Error("Create Draft button not found");
  }
  const openTag = match[0].match(/<button\b[^>]*>/);
  if (!openTag) {
    throw new Error("Create Draft button open tag not found");
  }
  return openTag[0];
}

function hasDisabledHtmlAttribute(openTag: string): boolean {
  const withoutClass = openTag.replace(/\sclass="[^"]*"/g, "");
  return /(?:^|\s)disabled(?:="")?(?=[\s>/])/.test(withoutClass);
}

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

  it("disables Create Draft and names the missing selection", () => {
    const incompleteMarkup = renderToStaticMarkup(
      React.createElement(TemplateLibrary, {
        templates: [],
        filters: { phase: "all", category: "all", status: "all" },
        hasError: false,
      }),
    );
    const specificMarkup = renderToStaticMarkup(
      React.createElement(TemplateLibrary, {
        templates: [],
        filters: { phase: "prep", category: "road", status: "all" },
        hasError: false,
      }),
    );

    expect(
      hasDisabledHtmlAttribute(createDraftButtonOpenTag(incompleteMarkup)),
    ).toBe(true);
    expect(
      hasDisabledHtmlAttribute(createDraftButtonOpenTag(specificMarkup)),
    ).toBe(false);
    expect(incompleteMarkup).toContain(
      "Select a phase and bike category to create a draft.",
    );
    expect(createDraftSelectionHint({ phase: "all", category: "road" })).toBe(
      "Select a phase to create a draft.",
    );
    expect(createDraftSelectionHint({ phase: "prep", category: "all" })).toBe(
      "Select a bike category to create a draft.",
    );
  });

  it("redirects to the new draft detail after a successful create", async () => {
    const create = vi.fn().mockResolvedValue({ ok: true, id: "draft-id" });

    await expect(
      submitCreateDraft({ phase: "prep", category: "road" }, false, create),
    ).resolves.toEqual({ href: "/workshop/templates/draft-id" });
    expect(create).toHaveBeenCalledWith({
      phase: "prep",
      bikeCategory: "road",
    });
  });

  it("surfaces a retryable create failure without claiming success", async () => {
    const create = vi.fn().mockResolvedValue({
      ok: false,
      error: "Not authorized to create a checklist draft",
    });

    await expect(
      submitCreateDraft({ phase: "prep", category: "road" }, false, create),
    ).resolves.toEqual({
      error: "Not authorized to create a checklist draft",
    });
    expect(create).toHaveBeenCalledWith({
      phase: "prep",
      bikeCategory: "road",
    });
  });

  it("does not call create when the Library pairing is incomplete", async () => {
    const create = vi.fn();

    await expect(
      submitCreateDraft({ phase: "all", category: "road" }, false, create),
    ).resolves.toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it("links each library row to its detail route", () => {
    const markup = renderToStaticMarkup(
      React.createElement(TemplateLibrary, {
        templates: [
          {
            id: "version-1",
            phase: "prep",
            bikeCategory: "road",
            versionNumber: 2,
            status: "draft",
            createdAt: "2026-08-13T00:00:00.000Z",
          },
        ],
        filters: { phase: "prep", category: "road", status: "all" },
        hasError: false,
      }),
    );

    expect(templateVersionHref("version-1")).toBe("/workshop/templates/version-1");
    expect(markup).toContain('href="/workshop/templates/version-1"');
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

describe("TemplateVersionDetailPage", () => {
  beforeEach(() => {
    loadWorkshopChecklistVersion.mockReset();
    notFound.mockClear();
  });

  it("renders a retryable banner when the detail query fails", async () => {
    loadWorkshopChecklistVersion.mockResolvedValue({
      version: null,
      error: "database unavailable",
    });

    const page = await TemplateVersionDetailPage({
      params: Promise.resolve({ id: "11111111-1111-1111-1111-111111111111" }),
    });
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("Couldn&#x27;t load this checklist version");
    expect(markup).toContain("database unavailable");
    expect(markup).toContain("Retry");
    expect(notFound).not.toHaveBeenCalled();
  });

  it("returns notFound when the version is missing without an error", async () => {
    loadWorkshopChecklistVersion.mockResolvedValue({
      version: null,
      error: null,
    });

    await expect(
      TemplateVersionDetailPage({
        params: Promise.resolve({ id: "11111111-1111-1111-1111-111111111111" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("renders metadata and a successful empty items definition", async () => {
    loadWorkshopChecklistVersion.mockResolvedValue({
      version: {
        id: "11111111-1111-1111-1111-111111111111",
        phase: "prep",
        bikeCategory: "road",
        versionNumber: 2,
        status: "draft",
        createdAt: "2026-08-13T00:00:00.000Z",
        createdBy: "user-1",
        revision: 1,
        items: [],
      },
      error: null,
    });

    const page = await TemplateVersionDetailPage({
      params: Promise.resolve({ id: "11111111-1111-1111-1111-111111111111" }),
    });
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("Prep");
    expect(markup).toContain("Road");
    expect(markup).toContain("Version 2");
    expect(markup).toContain("Draft");
    expect(markup).toContain("This version has no items yet.");
    expect(markup).not.toContain("Couldn&#x27;t load");
    expect(notFound).not.toHaveBeenCalled();
  });
});
