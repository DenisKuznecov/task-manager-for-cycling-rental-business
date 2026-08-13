import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CreateDraftChecklistVersionInputSchema,
  DraftChecklistItemFieldsSchema,
  LABEL_REQUIRED_MESSAGE,
  M2_REQUIRES_M1_MESSAGE,
  ReactivateChecklistVersionInputSchema,
  normalizeWorkshopBikeCategory,
  normalizeWorkshopChecklistPhase,
  normalizeWorkshopChecklistStatus,
} from "@/src/lib/workshop-tasks/types";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/src/utils/supabase/server", () => ({ createClient }));

function mockVersionQuery(
  result: { data: unknown; error: unknown },
  activeResult: { data: unknown; error: unknown } = { data: null, error: null },
) {
  const versionQuery = {
    eq: vi.fn(),
    order: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  versionQuery.eq.mockReturnValue(versionQuery);
  versionQuery.order.mockReturnValue(versionQuery);

  const activeQuery = {
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(activeResult),
  };
  activeQuery.eq.mockReturnValue(activeQuery);

  createClient.mockResolvedValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn((columns: string) => {
        if (
          typeof columns === "string" &&
          columns.includes("workshop_checklist_templates")
        ) {
          return versionQuery;
        }
        return activeQuery;
      }),
    }),
  });
  return { versionQuery, activeQuery };
}

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

  it("rejects an empty or whitespace-only label at the shared item schema", () => {
    expect(
      DraftChecklistItemFieldsSchema.safeParse({
        label: "",
        type: "action",
        required: false,
        m1: false,
        m2: false,
        setupCategory: null,
      }).success,
    ).toBe(false);
    expect(
      DraftChecklistItemFieldsSchema.safeParse({
        label: "   ",
        type: "action",
        required: false,
        m1: false,
        m2: false,
        setupCategory: null,
      }).error?.issues[0]?.message,
    ).toBe(LABEL_REQUIRED_MESSAGE);
  });

  it("rejects M2 without M1 at the shared item schema", () => {
    expect(
      DraftChecklistItemFieldsSchema.safeParse({
        label: "Check headset",
        type: "action",
        required: false,
        m1: false,
        m2: true,
        setupCategory: null,
      }).success,
    ).toBe(false);
    expect(
      DraftChecklistItemFieldsSchema.safeParse({
        label: "Check headset",
        type: "action",
        required: false,
        m1: false,
        m2: true,
        setupCategory: null,
      }).error?.issues[0]?.message,
    ).toBe(M2_REQUIRES_M1_MESSAGE);
  });

  it("rejects an unspecified pairing instead of defaulting one", () => {
    expect(
      CreateDraftChecklistVersionInputSchema.safeParse({
        phase: "all",
        bikeCategory: "road",
      }).success,
    ).toBe(false);
    expect(
      CreateDraftChecklistVersionInputSchema.safeParse({
        phase: "prep",
        bikeCategory: "road",
      }).success,
    ).toBe(true);
  });

  it("requires a non-null Active uuid for reactivate", () => {
    expect(
      ReactivateChecklistVersionInputSchema.safeParse({
        versionId: "11111111-1111-4111-8111-111111111111",
        expectedRevision: 3,
        expectedActiveVersionId: null,
      }).success,
    ).toBe(false);
    expect(
      ReactivateChecklistVersionInputSchema.safeParse({
        versionId: "11111111-1111-4111-8111-111111111111",
        expectedRevision: 3,
        expectedActiveVersionId: "",
      }).success,
    ).toBe(false);
    expect(
      ReactivateChecklistVersionInputSchema.safeParse({
        versionId: "11111111-1111-4111-8111-111111111111",
        expectedRevision: 3,
        expectedActiveVersionId: "33333333-3333-4333-8333-333333333333",
      }).success,
    ).toBe(true);
  });
});

describe("loadWorkshopChecklistVersion", () => {
  beforeEach(() => {
    createClient.mockReset();
  });

  it("returns a failed query as an error instead of a missing version", async () => {
    const { loadWorkshopChecklistVersion } = await import(
      "@/src/lib/workshop-tasks/data"
    );
    const error = { message: "database unavailable" };
    mockVersionQuery({ data: null, error });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      loadWorkshopChecklistVersion("11111111-1111-1111-1111-111111111111"),
    ).resolves.toEqual({ version: null, error: "database unavailable" });

    expect(errorSpy).toHaveBeenCalledWith("loadWorkshopChecklistVersion:", error);
    errorSpy.mockRestore();
  });

  it("treats an unknown version as not-found rather than a query failure", async () => {
    const { loadWorkshopChecklistVersion } = await import(
      "@/src/lib/workshop-tasks/data"
    );
    mockVersionQuery({ data: null, error: null });

    await expect(
      loadWorkshopChecklistVersion("11111111-1111-1111-1111-111111111111"),
    ).resolves.toEqual({ version: null, error: null });
  });

  it("maps a successful nested template row onto the version detail", async () => {
    const { loadWorkshopChecklistVersion } = await import(
      "@/src/lib/workshop-tasks/data"
    );
    const { versionQuery } = mockVersionQuery({
      data: {
        id: "11111111-1111-1111-1111-111111111111",
        template_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        version_number: 2,
        status: "draft",
        created_at: "2026-08-13T00:00:00.000Z",
        created_by: "user-1",
        revision: 1,
        workshop_checklist_templates: {
          phase: "prep",
          bike_category: "road",
        },
        workshop_checklist_items: [],
      },
      error: null,
    });

    await expect(
      loadWorkshopChecklistVersion("11111111-1111-1111-1111-111111111111"),
    ).resolves.toEqual({
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
    expect(versionQuery.order).toHaveBeenCalledWith("position", {
      referencedTable: "workshop_checklist_items",
      ascending: true,
    });
  });

  it("maps nested items in the order returned by PostgreSQL", async () => {
    const { loadWorkshopChecklistVersion } = await import(
      "@/src/lib/workshop-tasks/data"
    );
    mockVersionQuery({
      data: {
        id: "11111111-1111-1111-1111-111111111111",
        template_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        version_number: 2,
        status: "draft",
        created_at: "2026-08-13T00:00:00.000Z",
        created_by: "user-1",
        revision: 3,
        workshop_checklist_templates: {
          phase: "prep",
          bike_category: "road",
        },
        workshop_checklist_items: [
          {
            id: "item-1",
            label: "First",
            position: 1,
            item_type: "action",
            required: true,
            m1: true,
            m2: false,
            setup_category: null,
          },
          {
            id: "item-2",
            label: "Second",
            position: 2,
            item_type: "value",
            required: false,
            m1: true,
            m2: true,
            setup_category: "saddle",
          },
        ],
      },
      error: null,
    });

    const result = await loadWorkshopChecklistVersion(
      "11111111-1111-1111-1111-111111111111",
    );
    expect(result.error).toBeNull();
    expect(result.version?.items).toEqual([
      {
        id: "item-1",
        label: "First",
        position: 1,
        type: "action",
        required: true,
        m1: true,
        m2: false,
        setupCategory: null,
      },
      {
        id: "item-2",
        label: "Second",
        position: 2,
        type: "value",
        required: false,
        m1: true,
        m2: true,
        setupCategory: "saddle",
      },
    ]);
  });

  it("maps a single nested item object onto a one-item list", async () => {
    const { loadWorkshopChecklistVersion } = await import(
      "@/src/lib/workshop-tasks/data"
    );
    mockVersionQuery({
      data: {
        id: "11111111-1111-1111-1111-111111111111",
        template_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        version_number: 2,
        status: "draft",
        created_at: "2026-08-13T00:00:00.000Z",
        created_by: "user-1",
        revision: 2,
        workshop_checklist_templates: {
          phase: "prep",
          bike_category: "road",
        },
        workshop_checklist_items: {
          id: "item-1",
          label: "Only item",
          position: 1,
          item_type: "action",
          required: true,
          m1: false,
          m2: false,
          setup_category: null,
        },
      },
      error: null,
    });

    const result = await loadWorkshopChecklistVersion(
      "11111111-1111-1111-1111-111111111111",
    );
    expect(result.error).toBeNull();
    expect(result.version?.items).toEqual([
      {
        id: "item-1",
        label: "Only item",
        position: 1,
        type: "action",
        required: true,
        m1: false,
        m2: false,
        setupCategory: null,
      },
    ]);
  });

  it("maps the current Active sibling for the same template pairing", async () => {
    const { loadWorkshopChecklistVersion } = await import(
      "@/src/lib/workshop-tasks/data"
    );
    const { activeQuery } = mockVersionQuery(
      {
        data: {
          id: "11111111-1111-1111-1111-111111111111",
          template_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          version_number: 2,
          status: "draft",
          created_at: "2026-08-13T00:00:00.000Z",
          created_by: "user-1",
          revision: 1,
          workshop_checklist_templates: {
            phase: "prep",
            bike_category: "road",
          },
          workshop_checklist_items: [],
        },
        error: null,
      },
      {
        data: {
          id: "22222222-2222-4222-8222-222222222222",
          version_number: 1,
        },
        error: null,
      },
    );

    const result = await loadWorkshopChecklistVersion(
      "11111111-1111-1111-1111-111111111111",
    );

    expect(result.error).toBeNull();
    expect(result.version?.currentActive).toEqual({
      id: "22222222-2222-4222-8222-222222222222",
      versionNumber: 1,
    });
    expect(activeQuery.eq).toHaveBeenCalledWith(
      "template_id",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    expect(activeQuery.eq).toHaveBeenCalledWith("status", "active");
  });

  it("returns a failed Active sibling query as an error instead of omitting the pointer", async () => {
    const { loadWorkshopChecklistVersion } = await import(
      "@/src/lib/workshop-tasks/data"
    );
    const error = { message: "active pointer unavailable" };
    mockVersionQuery(
      {
        data: {
          id: "11111111-1111-1111-1111-111111111111",
          template_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          version_number: 2,
          status: "draft",
          created_at: "2026-08-13T00:00:00.000Z",
          created_by: "user-1",
          revision: 1,
          workshop_checklist_templates: {
            phase: "prep",
            bike_category: "road",
          },
          workshop_checklist_items: [],
        },
        error: null,
      },
      { data: null, error },
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      loadWorkshopChecklistVersion("11111111-1111-1111-1111-111111111111"),
    ).resolves.toEqual({
      version: null,
      error: "active pointer unavailable",
    });
    expect(errorSpy).toHaveBeenCalledWith("loadWorkshopChecklistVersion:", error);
    errorSpy.mockRestore();
  });

  it("treats a malformed id as not-found without querying", async () => {
    const { loadWorkshopChecklistVersion } = await import(
      "@/src/lib/workshop-tasks/data"
    );

    await expect(loadWorkshopChecklistVersion("not-a-uuid")).resolves.toEqual({
      version: null,
      error: null,
    });
    expect(createClient).not.toHaveBeenCalled();
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

function mockEventsQuery(result: { data: unknown; error: unknown }) {
  const query = {
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
  };
  query.eq.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.order.mockReturnValueOnce(query).mockResolvedValueOnce(result);
  createClient.mockResolvedValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(query),
    }),
  });
  return query;
}

describe("loadWorkshopChecklistEvents", () => {
  beforeEach(() => {
    createClient.mockReset();
  });

  it("loads activated and reactivated events for a template in occurred_at order", async () => {
    const { loadWorkshopChecklistEvents } = await import(
      "@/src/lib/workshop-tasks/data"
    );
    const query = mockEventsQuery({
      data: [
        {
          id: "event-1",
          event_type: "activated",
          actor_id: "actor-1",
          occurred_at: "2026-08-13T10:00:00.000Z",
          version_id: "11111111-1111-1111-1111-111111111111",
          version_number: 1,
          revision: 2,
          superseded_version_id: null,
        },
        {
          id: "event-2",
          event_type: "reactivated",
          actor_id: "actor-2",
          occurred_at: "2026-08-13T12:00:00.000Z",
          version_id: "11111111-1111-1111-1111-111111111111",
          version_number: 1,
          revision: 5,
          superseded_version_id: "22222222-2222-4222-8222-222222222222",
        },
      ],
      error: null,
    });

    await expect(
      loadWorkshopChecklistEvents("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
    ).resolves.toEqual({
      events: [
        {
          id: "event-1",
          eventType: "activated",
          actorId: "actor-1",
          occurredAt: "2026-08-13T10:00:00.000Z",
          versionId: "11111111-1111-1111-1111-111111111111",
          versionNumber: 1,
          revision: 2,
          supersededVersionId: null,
        },
        {
          id: "event-2",
          eventType: "reactivated",
          actorId: "actor-2",
          occurredAt: "2026-08-13T12:00:00.000Z",
          versionId: "11111111-1111-1111-1111-111111111111",
          versionNumber: 1,
          revision: 5,
          supersededVersionId: "22222222-2222-4222-8222-222222222222",
        },
      ],
      error: null,
    });

    expect(query.eq).toHaveBeenCalledWith(
      "template_id",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    expect(query.in).toHaveBeenCalledWith("event_type", [
      "activated",
      "reactivated",
    ]);
    expect(query.order).toHaveBeenCalledWith("occurred_at", {
      ascending: true,
    });
    expect(query.order).toHaveBeenCalledWith("id", { ascending: true });
  });

  it("returns an empty fallback and logs a contextual query failure", async () => {
    const { loadWorkshopChecklistEvents } = await import(
      "@/src/lib/workshop-tasks/data"
    );
    const error = { message: "events unavailable" };
    mockEventsQuery({ data: null, error });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      loadWorkshopChecklistEvents("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
    ).resolves.toEqual({ events: [], error: "events unavailable" });

    expect(errorSpy).toHaveBeenCalledWith("loadWorkshopChecklistEvents:", error);
    errorSpy.mockRestore();
  });

  it("treats a blank query error message as a failed load", async () => {
    const { loadWorkshopChecklistEvents } = await import(
      "@/src/lib/workshop-tasks/data"
    );
    const error = { message: "" };
    mockEventsQuery({ data: null, error });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      loadWorkshopChecklistEvents("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
    ).resolves.toEqual({
      events: [],
      error: "Failed to load activation history",
    });

    expect(errorSpy).toHaveBeenCalledWith("loadWorkshopChecklistEvents:", error);
    errorSpy.mockRestore();
  });

  it("treats a malformed template id as empty without querying", async () => {
    const { loadWorkshopChecklistEvents } = await import(
      "@/src/lib/workshop-tasks/data"
    );

    await expect(loadWorkshopChecklistEvents("not-a-uuid")).resolves.toEqual({
      events: [],
      error: null,
    });
    expect(createClient).not.toHaveBeenCalled();
  });
});

