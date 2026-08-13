import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  loadWorkshopChecklistTemplates,
  loadWorkshopChecklistVersion,
  loadWorkshopChecklistEvents,
  notFound,
} = vi.hoisted(() => ({
  loadWorkshopChecklistTemplates: vi.fn(),
  loadWorkshopChecklistVersion: vi.fn(),
  loadWorkshopChecklistEvents: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/templates",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
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
  activateChecklistVersion: vi.fn(),
  reactivateChecklistVersion: vi.fn(),
}));

vi.mock("@/src/lib/workshop-tasks/actions/checklist-item-actions", () => ({
  addDraftChecklistItem: vi.fn(),
  updateDraftChecklistItem: vi.fn(),
  removeDraftChecklistItem: vi.fn(),
  reorderDraftChecklistItems: vi.fn(),
}));

vi.mock("@/src/lib/workshop-tasks", () => ({
  loadWorkshopChecklistTemplates,
  loadWorkshopChecklistVersion,
  loadWorkshopChecklistEvents,
  normalizeWorkshopChecklistPhase: (value: string | undefined) =>
    value === "prep" || value === "return" ? value : "all",
  normalizeWorkshopBikeCategory: (value: string | undefined) =>
    value === "road" ? value : "all",
  normalizeWorkshopChecklistStatus: (value: string | undefined) =>
    value === "active" ? value : "all",
}));

import {
  applyChecklistItemMutationResult,
  buildReorderInput,
  moveItemIds,
  submitDraftItemFields,
  syncDraftEditorFromVersion,
} from "@/src/app/workshop/templates/[id]/_components/DraftChecklistItemsEditor";
import {
  ActivateConfirmBody,
  applyActivateResult,
  activateConfirmCopy,
  activateSubmitInput,
  confirmActivate,
  isActivateRedirectError,
  missingSetupCategories,
  openActivatePanel,
  startActivateConfirm,
  submitActivateVersion,
} from "@/src/app/workshop/templates/[id]/_components/ActivateVersionPanel";
import {
  ReactivateConfirmBody,
  applyReactivateResult,
  applyReactivateThrown,
  canSubmitReactivate,
  confirmReactivate,
  openReactivatePanel,
  reactivateConfirmCopy,
  reactivateSubmitInput,
  startReactivateConfirm,
  submitReactivateVersion,
} from "@/src/app/workshop/templates/[id]/_components/ReactivateVersionPanel";
import { refreshCurrentLoad } from "@/src/app/workshop/templates/_components/RetryLoadButton";
import { M2_REQUIRES_M1_MESSAGE } from "@/src/lib/workshop-tasks/types";
import type { WorkshopChecklistVersion } from "@/src/lib/workshop-tasks/types";
import WorkshopTemplateLibraryPage from "@/src/app/workshop/templates/page";
import TemplateVersionDetailPage from "@/src/app/workshop/templates/[id]/page";
import {
  applyTemplateLibraryFilter,
  buildTemplateLibraryHref,
  createDraftAndNavigate,
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

  it("wires a successful button action to navigation", async () => {
    const create = vi.fn().mockResolvedValue({ ok: true, id: "draft-id" });
    const navigate = vi.fn();
    const showError = vi.fn();

    await createDraftAndNavigate(
      { phase: "prep", category: "road" },
      false,
      create,
      navigate,
      showError,
    );

    expect(create).toHaveBeenCalledWith({
      phase: "prep",
      bikeCategory: "road",
    });
    expect(navigate).toHaveBeenCalledWith("/workshop/templates/draft-id");
    expect(showError).not.toHaveBeenCalled();
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
    expect(markup).toContain('type="button"');
    expect(markup).not.toContain("No checklist versions found");
    expect(markup).not.toContain("/workshop/templates?phase=prep");
  });

  it("Retry re-runs the current loader without changing the URL", () => {
    const refresh = vi.fn();
    refreshCurrentLoad({ refresh });
    expect(refresh).toHaveBeenCalledOnce();
  });
});

describe("TemplateVersionDetailPage", () => {
  beforeEach(() => {
    loadWorkshopChecklistVersion.mockReset();
    loadWorkshopChecklistEvents.mockReset();
    loadWorkshopChecklistEvents.mockResolvedValue({ events: [], error: null });
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
    expect(markup).toContain('type="button"');
    expect(loadWorkshopChecklistEvents).not.toHaveBeenCalled();
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
        templateId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        phase: "prep",
        bikeCategory: "road",
        versionNumber: 2,
        status: "draft",
        createdAt: "2026-08-13T00:00:00.000Z",
        createdBy: "user-1",
        revision: 1,
        items: [],
        currentActive: null,
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
    expect(markup).toContain("No activation or reactivation events yet.");
    expect(markup).toContain("Add Item");
    expect(markup).toContain(">Activate<");
    expect(markup).not.toContain(">Reactivate<");
    expect(markup).not.toContain("Couldn&#x27;t load");
    expect(notFound).not.toHaveBeenCalled();
  });

  it("renders Active items as a readable list without edit controls", async () => {
    loadWorkshopChecklistVersion.mockResolvedValue({
      version: {
        id: "11111111-1111-1111-1111-111111111111",
        templateId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        phase: "prep",
        bikeCategory: "road",
        versionNumber: 1,
        status: "active",
        createdAt: "2026-08-13T00:00:00.000Z",
        createdBy: "user-1",
        revision: 4,
        currentActive: {
          id: "11111111-1111-1111-1111-111111111111",
          versionNumber: 1,
        },
        items: [
          {
            id: "item-1",
            label: "Check tires",
            position: 1,
            type: "action",
            required: true,
            m1: true,
            m2: false,
            setupCategory: "wheelset",
          },
        ],
      },
      error: null,
    });

    const page = await TemplateVersionDetailPage({
      params: Promise.resolve({ id: "11111111-1111-1111-1111-111111111111" }),
    });
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("Check tires");
    expect(markup).toContain("Action");
    expect(markup).toContain("Wheelset");
    expect(markup).not.toContain("Add Item");
    expect(markup).not.toContain(">Save<");
    expect(markup).not.toContain("Move up");
    expect(markup).not.toContain(">Remove<");
    expect(markup).not.toContain(">Activate<");
    expect(markup).not.toContain(">Reactivate<");
  });

  it("renders Draft items with Save, Move, and Remove controls", async () => {
    loadWorkshopChecklistVersion.mockResolvedValue({
      version: {
        id: "11111111-1111-1111-1111-111111111111",
        templateId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        phase: "prep",
        bikeCategory: "road",
        versionNumber: 2,
        status: "draft",
        createdAt: "2026-08-13T00:00:00.000Z",
        createdBy: "user-1",
        revision: 3,
        currentActive: null,
        items: [
          {
            id: "item-1",
            label: "Check headset",
            position: 1,
            type: "action",
            required: true,
            m1: true,
            m2: false,
            setupCategory: null,
          },
          {
            id: "item-2",
            label: "Record torque",
            position: 2,
            type: "value",
            required: false,
            m1: true,
            m2: true,
            setupCategory: "saddle",
          },
        ],
      },
      error: null,
    });

    const page = await TemplateVersionDetailPage({
      params: Promise.resolve({ id: "11111111-1111-1111-1111-111111111111" }),
    });
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("Check headset");
    expect(markup).toContain("Record torque");
    expect(markup).toContain(">Save<");
    expect(markup).toContain("Move up");
    expect(markup).toContain(">Remove<");
    expect(markup).toContain("Add Item");
    expect(markup).toContain(">Activate<");
    expect(markup).not.toContain(">Reactivate<");
  });

  it("renders Superseded items as a readable list without edit controls", async () => {
    loadWorkshopChecklistVersion.mockResolvedValue({
      version: {
        id: "11111111-1111-1111-1111-111111111111",
        templateId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        phase: "prep",
        bikeCategory: "road",
        versionNumber: 1,
        status: "superseded",
        createdAt: "2026-08-13T00:00:00.000Z",
        createdBy: "user-1",
        revision: 6,
        currentActive: null,
        items: [
          {
            id: "item-1",
            label: "Check tires",
            position: 1,
            type: "action",
            required: true,
            m1: true,
            m2: false,
            setupCategory: "wheelset",
          },
        ],
      },
      error: null,
    });

    const page = await TemplateVersionDetailPage({
      params: Promise.resolve({ id: "11111111-1111-1111-1111-111111111111" }),
    });
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("Check tires");
    expect(markup).toContain("Action");
    expect(markup).toContain("Wheelset");
    expect(markup).not.toContain("Add Item");
    expect(markup).not.toContain(">Save<");
    expect(markup).not.toContain("Move up");
    expect(markup).not.toContain(">Remove<");
    expect(markup).not.toContain(">Activate<");
    expect(markup).toContain(">Reactivate<");
  });

  it("renders creator and activation history from stored identities", async () => {
    loadWorkshopChecklistVersion.mockResolvedValue({
      version: {
        id: "11111111-1111-1111-1111-111111111111",
        templateId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        phase: "prep",
        bikeCategory: "road",
        versionNumber: 1,
        status: "superseded",
        createdAt: "2026-08-13T00:00:00.000Z",
        createdBy: "user-1",
        revision: 6,
        currentActive: {
          id: "22222222-2222-4222-8222-222222222222",
          versionNumber: 2,
        },
        items: [],
      },
      error: null,
    });
    loadWorkshopChecklistEvents.mockResolvedValue({
      events: [
        {
          id: "event-1",
          eventType: "activated",
          actorId: "actor-activate",
          occurredAt: "2026-08-13T10:00:00.000Z",
          versionId: "11111111-1111-1111-1111-111111111111",
          versionNumber: 1,
          revision: 2,
          supersededVersionId: null,
        },
        {
          id: "event-2",
          eventType: "reactivated",
          actorId: "actor-reactivate",
          occurredAt: "2026-08-13T12:00:00.000Z",
          versionId: "11111111-1111-1111-1111-111111111111",
          versionNumber: 1,
          revision: 5,
          supersededVersionId: "22222222-2222-4222-8222-222222222222",
        },
      ],
      error: null,
    });

    const page = await TemplateVersionDetailPage({
      params: Promise.resolve({ id: "11111111-1111-1111-1111-111111111111" }),
    });
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("Created by");
    expect(markup).toContain("user-1");
    expect(markup).toContain("Created at");
    expect(markup).toContain("Activated");
    expect(markup).toContain("Reactivated");
    expect(markup).toContain("Version 1");
    expect(markup).toContain("actor-activate");
    expect(markup).toContain("actor-reactivate");
    expect(markup).toContain(">Reactivate<");
    expect(loadWorkshopChecklistEvents).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
  });

  it("keeps the version readable when activation history fails", async () => {
    loadWorkshopChecklistVersion.mockResolvedValue({
      version: {
        id: "11111111-1111-1111-1111-111111111111",
        templateId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        phase: "prep",
        bikeCategory: "road",
        versionNumber: 1,
        status: "superseded",
        createdAt: "2026-08-13T00:00:00.000Z",
        createdBy: "user-1",
        revision: 6,
        currentActive: {
          id: "22222222-2222-4222-8222-222222222222",
          versionNumber: 2,
        },
        items: [
          {
            id: "item-1",
            label: "Check tires",
            position: 1,
            type: "action",
            required: true,
            m1: true,
            m2: false,
            setupCategory: "wheelset",
          },
        ],
      },
      error: null,
    });
    loadWorkshopChecklistEvents.mockResolvedValue({
      events: [],
      error: "events unavailable",
    });

    const page = await TemplateVersionDetailPage({
      params: Promise.resolve({ id: "11111111-1111-1111-1111-111111111111" }),
    });
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("Check tires");
    expect(markup).toContain("Superseded");
    expect(markup).toContain("user-1");
    expect(markup).toContain("Couldn&#x27;t load activation history");
    expect(markup).toContain("events unavailable");
    expect(markup).toContain("Retry");
    expect(markup).toContain('type="button"');
    expect(markup).not.toContain("Couldn&#x27;t load this checklist version");
    expect(notFound).not.toHaveBeenCalled();
  });
});

describe("draft checklist item editor helpers", () => {
  it("rejects M2 without M1 without calling save", async () => {
    const save = vi.fn();

    await expect(
      submitDraftItemFields(
        {
          label: "Headset",
          type: "action",
          required: false,
          m1: false,
          m2: true,
          setupCategory: null,
        },
        false,
        save,
      ),
    ).resolves.toEqual({
      ok: false,
      error: M2_REQUIRES_M1_MESSAGE,
      field: "m2",
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("keeps entered values and current revision/status on stale", () => {
    expect(
      applyChecklistItemMutationResult(
        { revision: 2, status: "draft" },
        {
          ok: false,
          error: "Checklist version is stale",
          stale: true,
          revision: 5,
          status: "draft",
        },
      ),
    ).toEqual({
      revision: 5,
      status: "draft",
      keepValues: true,
      saved: false,
      stale: true,
      error: "Checklist version is stale",
    });
  });

  it("marks Saved only after the new revision returns", () => {
    expect(
      applyChecklistItemMutationResult(
        { revision: 2, status: "draft" },
        { ok: true, revision: 3 },
      ),
    ).toEqual({
      revision: 3,
      status: "draft",
      keepValues: false,
      saved: true,
      stale: false,
      error: null,
    });
  });

  it("builds a reorder payload from the full item id list", () => {
    const ids = ["item-a", "item-b", "item-c"];
    const moved = moveItemIds(ids, "item-c", "up");

    expect(moved).toEqual(["item-a", "item-c", "item-b"]);
    expect(
      buildReorderInput("version-1", 3, moved ?? []),
    ).toEqual({
      versionId: "version-1",
      expectedRevision: 3,
      itemIds: ["item-a", "item-c", "item-b"],
    });
  });

  it("does not overwrite kept drafts when a newer version arrives while stale", () => {
    const kept = {
      label: "In-progress edit",
      type: "action" as const,
      required: false,
      m1: true,
      m2: false,
      setupCategory: null,
    };
    const synced = syncDraftEditorFromVersion(
      {
        stale: true,
        revision: 5,
        status: "draft",
        itemDrafts: { "item-1": kept },
        itemOrder: ["item-1"],
      },
      {
        revision: 6,
        status: "draft",
        items: [
          {
            id: "item-1",
            label: "Server label",
            position: 1,
            type: "action",
            required: true,
            m1: true,
            m2: false,
            setupCategory: null,
          },
        ],
      },
    );

    expect(synced.revision).toBe(5);
    expect(synced.itemDrafts["item-1"]).toEqual(kept);
    expect(synced.itemOrder).toEqual(["item-1"]);
  });

  it("keeps dirty drafts and resets matching rows when not stale", () => {
    const dirty = {
      label: "Still editing",
      type: "value" as const,
      required: false,
      m1: true,
      m2: true,
      setupCategory: "saddle" as const,
    };
    const matching = {
      label: "Check headset",
      type: "action" as const,
      required: true,
      m1: true,
      m2: false,
      setupCategory: null,
    };
    const synced = syncDraftEditorFromVersion(
      {
        stale: false,
        revision: 3,
        status: "draft",
        itemDrafts: {
          "item-1": matching,
          "item-2": dirty,
        },
        itemOrder: ["item-2", "item-1"],
      },
      {
        revision: 4,
        status: "draft",
        items: [
          {
            id: "item-1",
            label: "Check headset",
            position: 1,
            type: "action",
            required: true,
            m1: true,
            m2: false,
            setupCategory: null,
          },
          {
            id: "item-2",
            label: "Record torque",
            position: 2,
            type: "value",
            required: false,
            m1: true,
            m2: true,
            setupCategory: "saddle",
          },
        ],
      },
    );

    expect(synced.revision).toBe(4);
    expect(synced.itemDrafts["item-1"]).toEqual(matching);
    expect(synced.itemDrafts["item-2"]).toEqual(dirty);
    expect(synced.itemOrder).toEqual(["item-1", "item-2"]);
  });
});

const DRAFT_VERSION: WorkshopChecklistVersion = {
  id: "11111111-1111-1111-1111-111111111111",
  templateId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  phase: "prep",
  bikeCategory: "road",
  versionNumber: 2,
  status: "draft",
  createdAt: "2026-08-13T00:00:00.000Z",
  createdBy: "user-1",
  revision: 3,
  items: [
    {
      id: "item-1",
      label: "Check headset",
      position: 1,
      type: "action",
      required: true,
      m1: true,
      m2: false,
      setupCategory: "pedals",
    },
  ],
  currentActive: {
    id: "22222222-2222-4222-8222-222222222222",
    versionNumber: 1,
  },
};

function confirmActivateButtonOpenTag(markup: string): string {
  const buttons = markup.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
  const activateButton = buttons.find((button) =>
    />Activate</.test(button),
  );
  if (!activateButton) {
    throw new Error("Confirm Activate button not found");
  }
  const openTag = activateButton.match(/<button\b[^>]*>/);
  if (!openTag) {
    throw new Error("Confirm Activate button open tag not found");
  }
  return openTag[0];
}

describe("activate version panel", () => {
  const openState = {
    open: true,
    pending: false,
    error: null,
    stale: false,
    expectedRevision: DRAFT_VERSION.revision,
    expectedActiveVersionId: DRAFT_VERSION.currentActive?.id ?? null,
  };

  it("names phase, category, version, current Active, and future-only consequence", () => {
    const copy = activateConfirmCopy(DRAFT_VERSION);
    const markup = renderToStaticMarkup(
      React.createElement(ActivateConfirmBody, {
        version: DRAFT_VERSION,
        pending: false,
        error: null,
        stale: false,
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );

    expect(copy.phase).toBe("Prep");
    expect(copy.category).toBe("Road");
    expect(copy.versionLabel).toBe("Version 2");
    expect(copy.currentActive).toBe("Current Active: version 1.");
    expect(copy.consequence).toContain("future Bike Tasks only");
    expect(markup).toContain("Prep");
    expect(markup).toContain("Road");
    expect(markup).toContain("Version 2");
    expect(markup).toContain("Current Active: version 1.");
    expect(markup).toContain("future Bike Tasks only");
    expect(markup).toContain("bg-brand-600");
    expect(markup).not.toContain("bg-error-600");
  });

  it("names the first-activate empty Active pointer without a Current Active version", () => {
    const firstActivate = { ...DRAFT_VERSION, currentActive: null };
    const copy = activateConfirmCopy(firstActivate);
    const markup = renderToStaticMarkup(
      React.createElement(ActivateConfirmBody, {
        version: firstActivate,
        pending: false,
        error: null,
        stale: false,
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );

    expect(copy.currentActive).toBe(
      "There is no Active version for this pairing yet.",
    );
    expect(markup).toContain("There is no Active version for this pairing yet.");
    expect(markup).not.toContain("Current Active: version");
  });

  it("shows missing Setup Category coverage without treating it as a gate", () => {
    expect(missingSetupCategories(DRAFT_VERSION.items)).toEqual([
      "saddle",
      "wheelset",
      "power-meter",
      "computer-mount",
    ]);
    const markup = renderToStaticMarkup(
      React.createElement(ActivateConfirmBody, {
        version: DRAFT_VERSION,
        pending: false,
        error: null,
        stale: false,
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );

    expect(markup).toContain("Missing coverage does not block activation");
    expect(markup).toContain("Saddle");
    expect(markup).toContain(">Activate<");
    expect(
      hasDisabledHtmlAttribute(confirmActivateButtonOpenTag(markup)),
    ).toBe(false);
  });

  it("keeps the panel open on stale and only advances expected pointers from the server", () => {
    expect(
      applyActivateResult(
        {
          ...openState,
          pending: true,
        },
        {
          ok: false,
          error: "Checklist version is stale",
          stale: true,
          revision: 5,
          status: "draft",
          activeVersionId: "33333333-3333-4333-8333-333333333333",
          activeVersionNumber: 4,
        },
      ),
    ).toEqual({
      open: true,
      pending: false,
      error: "Checklist version is stale",
      stale: true,
      expectedRevision: 5,
      expectedActiveVersionId: "33333333-3333-4333-8333-333333333333",
      reportedActive: {
        id: "33333333-3333-4333-8333-333333333333",
        versionNumber: 4,
      },
      refresh: false,
    });
  });

  it("maps a null Active DETAIL onto expectedActiveVersionId null", () => {
    const next = applyActivateResult(
      {
        ...openState,
        pending: true,
      },
      {
        ok: false,
        error: "Checklist version is stale",
        stale: true,
        revision: 5,
        status: "draft",
        activeVersionId: null,
      },
    );

    expect(next.expectedActiveVersionId).toBeNull();
    expect(next.reportedActive).toBeNull();
    expect(
      activateConfirmCopy(DRAFT_VERSION, next.reportedActive).currentActive,
    ).toBe("There is no Active version for this pairing yet.");
    expect(
      activateConfirmCopy(DRAFT_VERSION, next.reportedActive).currentActive,
    ).not.toContain("Current Active: version");
  });

  it("Retry payload uses DETAIL-advanced pointers instead of page props", () => {
    const next = applyActivateResult(
      { ...openState, pending: true },
      {
        ok: false,
        error: "Checklist version is stale",
        stale: true,
        revision: 5,
        status: "draft",
        activeVersionId: "33333333-3333-4333-8333-333333333333",
        activeVersionNumber: 4,
      },
    );

    expect(activateSubmitInput(DRAFT_VERSION.id, next)).toEqual({
      versionId: DRAFT_VERSION.id,
      expectedRevision: 5,
      expectedActiveVersionId: "33333333-3333-4333-8333-333333333333",
    });
    expect(next.expectedRevision).not.toBe(DRAFT_VERSION.revision);
    expect(next.expectedActiveVersionId).not.toBe(
      DRAFT_VERSION.currentActive?.id,
    );
    expect(
      activateConfirmCopy(DRAFT_VERSION, next.reportedActive).currentActive,
    ).toBe("Current Active: version 4.");
  });

  it("stays pending until refresh after a successful activate", () => {
    expect(
      applyActivateResult(
        {
          open: true,
          pending: true,
          error: null,
          stale: false,
          expectedRevision: 3,
          expectedActiveVersionId: null,
        },
        { ok: true, revision: 4 },
      ),
    ).toEqual({
      open: true,
      pending: true,
      error: null,
      stale: false,
      expectedRevision: 3,
      expectedActiveVersionId: null,
      refresh: true,
    });
  });

  it("does not call activate again while pending", async () => {
    const activate = vi.fn();

    await expect(
      submitActivateVersion(
        {
          versionId: DRAFT_VERSION.id,
          expectedRevision: 3,
          expectedActiveVersionId: DRAFT_VERSION.currentActive?.id ?? null,
        },
        true,
        activate,
      ),
    ).resolves.toBeNull();
    expect(activate).not.toHaveBeenCalled();
  });

  it("sets pending before the await so a second confirm does not call activate", async () => {
    let release!: (result: {
      ok: true;
      revision: number;
    }) => void;
    const activate = vi.fn(
      () =>
        new Promise<{ ok: true; revision: number }>((resolve) => {
          release = resolve;
        }),
    );
    const stateRef = { current: { ...openState } };

    const first = confirmActivate(stateRef, DRAFT_VERSION.id, activate);
    expect(stateRef.current.pending).toBe(true);
    expect(startActivateConfirm(stateRef.current)).toBeNull();
    expect(activate).toHaveBeenCalledTimes(1);
    expect(activate).toHaveBeenCalledWith(
      activateSubmitInput(DRAFT_VERSION.id, openState),
    );

    await expect(
      confirmActivate(stateRef, DRAFT_VERSION.id, activate),
    ).resolves.toBe("skipped");
    expect(activate).toHaveBeenCalledTimes(1);

    release({ ok: true, revision: 4 });
    const settled = await first;
    expect(settled).not.toBe("skipped");
    if (settled !== "skipped") {
      expect(settled.pending).toBe(true);
      expect(settled.refresh).toBe(true);
    }
  });

  it("rethrows a withAuth login redirect instead of showing a panel error", async () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;replace;/login;303;",
    });
    const activate = vi.fn().mockRejectedValue(redirect);
    const stateRef = { current: { ...openState } };

    expect(isActivateRedirectError(redirect)).toBe(true);
    await expect(
      confirmActivate(stateRef, DRAFT_VERSION.id, activate),
    ).rejects.toBe(redirect);
    expect(stateRef.current.pending).toBe(true);
    expect(stateRef.current.error).toBeNull();
  });

  it("does not reset expected pointers when outer Activate is used while the panel is open", () => {
    const openWithDetail = {
      ...openState,
      expectedRevision: 5,
      expectedActiveVersionId: "33333333-3333-4333-8333-333333333333",
      reportedActive: {
        id: "33333333-3333-4333-8333-333333333333",
        versionNumber: 4,
      },
    };

    expect(openActivatePanel(openWithDetail, DRAFT_VERSION)).toEqual(
      openWithDetail,
    );
    expect(
      openActivatePanel(
        { ...openState, open: false },
        DRAFT_VERSION,
      ).expectedRevision,
    ).toBe(DRAFT_VERSION.revision);
  });
});

const SUPERSEDED_VERSION: WorkshopChecklistVersion = {
  ...DRAFT_VERSION,
  status: "superseded",
  revision: 6,
};

function confirmReactivateButtonOpenTag(markup: string): string {
  const buttons = markup.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
  const reactivateButton = buttons.find((button) => />Reactivate</.test(button));
  if (!reactivateButton) {
    throw new Error("Confirm Reactivate button not found");
  }
  const openTag = reactivateButton.match(/<button\b[^>]*>/);
  if (!openTag) {
    throw new Error("Confirm Reactivate button open tag not found");
  }
  return openTag[0];
}

describe("reactivate version panel", () => {
  const openState = {
    open: true,
    pending: false,
    error: null,
    stale: false,
    expectedRevision: SUPERSEDED_VERSION.revision,
    expectedActiveVersionId: SUPERSEDED_VERSION.currentActive?.id ?? "",
  };

  it("names phase, category, version, current Active, and future-only consequence", () => {
    const copy = reactivateConfirmCopy(SUPERSEDED_VERSION);
    const markup = renderToStaticMarkup(
      React.createElement(ReactivateConfirmBody, {
        version: SUPERSEDED_VERSION,
        pending: false,
        error: null,
        stale: false,
        canSubmit: true,
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );

    expect(copy.phase).toBe("Prep");
    expect(copy.category).toBe("Road");
    expect(copy.versionLabel).toBe("Version 2");
    expect(copy.currentActive).toBe("Current Active: version 1.");
    expect(copy.consequence).toContain("future Bike Tasks only");
    expect(markup).toContain("Prep");
    expect(markup).toContain("Road");
    expect(markup).toContain("Version 2");
    expect(markup).toContain("Current Active: version 1.");
    expect(markup).toContain("future Bike Tasks only");
    expect(markup).toContain("bg-brand-600");
    expect(markup).not.toContain("bg-error-600");
    expect(
      hasDisabledHtmlAttribute(confirmReactivateButtonOpenTag(markup)),
    ).toBe(false);
  });

  it("keeps the panel open on stale and only advances expected pointers from the server", () => {
    expect(
      applyReactivateResult(
        {
          ...openState,
          pending: true,
        },
        {
          ok: false,
          error: "Checklist version is stale",
          stale: true,
          revision: 7,
          status: "superseded",
          activeVersionId: "33333333-3333-4333-8333-333333333333",
          activeVersionNumber: 4,
        },
      ),
    ).toEqual({
      open: true,
      pending: false,
      error: "Checklist version is stale",
      stale: true,
      expectedRevision: 7,
      expectedActiveVersionId: "33333333-3333-4333-8333-333333333333",
      reportedActive: {
        id: "33333333-3333-4333-8333-333333333333",
        versionNumber: 4,
      },
      refresh: false,
    });
  });

  it("Retry payload uses DETAIL-advanced pointers instead of page props", () => {
    const next = applyReactivateResult(
      { ...openState, pending: true },
      {
        ok: false,
        error: "Checklist version is stale",
        stale: true,
        revision: 7,
        status: "superseded",
        activeVersionId: "33333333-3333-4333-8333-333333333333",
        activeVersionNumber: 4,
      },
    );

    expect(reactivateSubmitInput(SUPERSEDED_VERSION.id, next)).toEqual({
      versionId: SUPERSEDED_VERSION.id,
      expectedRevision: 7,
      expectedActiveVersionId: "33333333-3333-4333-8333-333333333333",
    });
    expect(next.expectedRevision).not.toBe(SUPERSEDED_VERSION.revision);
    expect(next.expectedActiveVersionId).not.toBe(
      SUPERSEDED_VERSION.currentActive?.id,
    );
    expect(
      reactivateConfirmCopy(SUPERSEDED_VERSION, next.reportedActive)
        .currentActive,
    ).toBe("Current Active: version 4.");
  });

  it("does not silently rebase onto a null Active DETAIL", () => {
    const next = applyReactivateResult(
      {
        ...openState,
        pending: true,
      },
      {
        ok: false,
        error: "Checklist version is stale",
        stale: true,
        revision: 7,
        status: "superseded",
        activeVersionId: null,
      },
    );

    expect(next.expectedActiveVersionId).toBe(openState.expectedActiveVersionId);
    expect(next.reportedActive).toBeUndefined();
    expect(next.open).toBe(true);
    expect(next.refresh).toBe(false);
    expect(
      reactivateConfirmCopy(SUPERSEDED_VERSION, next.reportedActive)
        .currentActive,
    ).toBe("Current Active: version 1.");
  });

  it("stays pending until refresh after a successful reactivate", () => {
    expect(
      applyReactivateResult(
        {
          open: true,
          pending: true,
          error: null,
          stale: false,
          expectedRevision: 6,
          expectedActiveVersionId:
            SUPERSEDED_VERSION.currentActive?.id ?? "",
        },
        { ok: true, revision: 7 },
      ),
    ).toEqual({
      open: true,
      pending: true,
      error: null,
      stale: false,
      expectedRevision: 6,
      expectedActiveVersionId: SUPERSEDED_VERSION.currentActive?.id ?? "",
      refresh: true,
    });
  });

  it("does not call reactivate again while pending", async () => {
    const reactivate = vi.fn();

    await expect(
      submitReactivateVersion(
        {
          versionId: SUPERSEDED_VERSION.id,
          expectedRevision: 6,
          expectedActiveVersionId: SUPERSEDED_VERSION.currentActive?.id ?? "",
        },
        true,
        reactivate,
      ),
    ).resolves.toBeNull();
    expect(reactivate).not.toHaveBeenCalled();
  });

  it("sets pending before the await so a second confirm does not call reactivate", async () => {
    let release!: (result: {
      ok: true;
      revision: number;
    }) => void;
    const reactivate = vi.fn(
      () =>
        new Promise<{ ok: true; revision: number }>((resolve) => {
          release = resolve;
        }),
    );
    const stateRef = { current: { ...openState } };

    const first = confirmReactivate(
      stateRef,
      SUPERSEDED_VERSION.id,
      reactivate,
    );
    expect(stateRef.current.pending).toBe(true);
    expect(startReactivateConfirm(stateRef.current)).toBeNull();
    expect(reactivate).toHaveBeenCalledTimes(1);
    expect(reactivate).toHaveBeenCalledWith(
      reactivateSubmitInput(SUPERSEDED_VERSION.id, openState),
    );

    await expect(
      confirmReactivate(stateRef, SUPERSEDED_VERSION.id, reactivate),
    ).resolves.toBe("skipped");
    expect(reactivate).toHaveBeenCalledTimes(1);

    release({ ok: true, revision: 7 });
    const settled = await first;
    expect(settled).not.toBe("skipped");
    if (settled !== "skipped") {
      expect(settled.pending).toBe(true);
      expect(settled.refresh).toBe(true);
    }
  });

  it("rethrows a withAuth login redirect instead of showing a panel error", async () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;replace;/login;303;",
    });
    const reactivate = vi.fn().mockRejectedValue(redirect);
    const stateRef = { current: { ...openState } };

    expect(isActivateRedirectError(redirect)).toBe(true);
    await expect(
      confirmReactivate(stateRef, SUPERSEDED_VERSION.id, reactivate),
    ).rejects.toBe(redirect);
    expect(stateRef.current.pending).toBe(true);
    expect(stateRef.current.error).toBeNull();
  });

  it("keeps the panel open with stable copy after a thrown failure", async () => {
    const reactivate = vi.fn().mockRejectedValue(new Error("relation missing"));
    const stateRef = { current: { ...openState } };

    await expect(
      confirmReactivate(stateRef, SUPERSEDED_VERSION.id, reactivate),
    ).resolves.toEqual({
      ...openState,
      pending: false,
      stale: false,
      error: "Couldn't reactivate this checklist version. Please try again.",
      refresh: false,
    });
    expect(applyReactivateThrown(openState, new Error("relation missing"))).toEqual({
      ...openState,
      pending: false,
      stale: false,
      error: "Couldn't reactivate this checklist version. Please try again.",
    });
  });

  it("does not start confirm without a valid Active uuid", () => {
    expect(canSubmitReactivate("")).toBe(false);
    expect(
      startReactivateConfirm({
        ...openState,
        expectedActiveVersionId: "",
      }),
    ).toBeNull();
  });

  it("does not reset expected pointers when outer Reactivate is used while the panel is open", () => {
    const openWithDetail = {
      ...openState,
      expectedRevision: 7,
      expectedActiveVersionId: "33333333-3333-4333-8333-333333333333",
      reportedActive: {
        id: "33333333-3333-4333-8333-333333333333",
        versionNumber: 4,
      },
    };

    expect(openReactivatePanel(openWithDetail, SUPERSEDED_VERSION)).toEqual(
      openWithDetail,
    );
    expect(
      openReactivatePanel(
        { ...openState, open: false },
        SUPERSEDED_VERSION,
      ).expectedRevision,
    ).toBe(SUPERSEDED_VERSION.revision);
  });
});

