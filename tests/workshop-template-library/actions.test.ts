import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, revalidatePath } = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/src/utils/supabase/server", () => ({ createClient }));
vi.mock("@/src/utils/auth/with-auth", () => ({
  withAuth: (
    _name: string,
    action: (user: { id: string }, input: unknown) => Promise<unknown>,
  ) => {
    return (input: unknown) => action({ id: "user-1" }, input);
  },
}));

describe("createDraftChecklistVersion", () => {
  beforeEach(() => {
    createClient.mockReset();
    revalidatePath.mockReset();
  });

  it("returns a Zod error without calling the RPC for an unspecified pairing", async () => {
    const { createDraftChecklistVersion } = await import(
      "@/src/lib/workshop-tasks/actions/checklist-version-actions"
    );
    const rpc = vi.fn();
    createClient.mockResolvedValue({ rpc });

    await expect(
      createDraftChecklistVersion({
        phase: "all",
        bikeCategory: "road",
      } as never),
    ).resolves.toEqual({
      ok: false,
      error: expect.any(String),
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("revalidates library and detail routes after a successful create", async () => {
    const { createDraftChecklistVersion } = await import(
      "@/src/lib/workshop-tasks/actions/checklist-version-actions"
    );
    const rpc = vi.fn().mockResolvedValue({
      data: "11111111-1111-1111-1111-111111111111",
      error: null,
    });
    createClient.mockResolvedValue({ rpc });

    await expect(
      createDraftChecklistVersion({ phase: "prep", bikeCategory: "road" }),
    ).resolves.toEqual({
      ok: true,
      id: "11111111-1111-1111-1111-111111111111",
    });

    expect(rpc).toHaveBeenCalledWith("create_draft_checklist_version", {
      phase: "prep",
      bike_category: "road",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/workshop/templates");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/workshop/templates/11111111-1111-1111-1111-111111111111",
    );
  });

  it("returns a retryable RPC failure without claiming success", async () => {
    const { createDraftChecklistVersion } = await import(
      "@/src/lib/workshop-tasks/actions/checklist-version-actions"
    );
    const error = { message: "Not authorized to create a checklist draft" };
    const rpc = vi.fn().mockResolvedValue({ data: null, error });
    createClient.mockResolvedValue({ rpc });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      createDraftChecklistVersion({ phase: "prep", bikeCategory: "road" }),
    ).resolves.toEqual({
      ok: false,
      error: "Not authorized to create a checklist draft",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith("createDraftChecklistVersion:", error);
    errorSpy.mockRestore();
  });

  it("uses stable production copy for RPC failures", async () => {
    const { createDraftChecklistVersion } = await import(
      "@/src/lib/workshop-tasks/actions/checklist-version-actions"
    );
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "relation workshop_checklist_versions does not exist" },
    });
    createClient.mockResolvedValue({ rpc });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "production");

    await expect(
      createDraftChecklistVersion({ phase: "prep", bikeCategory: "road" }),
    ).resolves.toEqual({
      ok: false,
      error: "Could not create a draft checklist version. Please try again.",
    });

    vi.unstubAllEnvs();
    errorSpy.mockRestore();
  });
});

const VERSION_ID = "11111111-1111-4111-8111-111111111111";
const ITEM_ID = "22222222-2222-4222-8222-222222222222";

const validItemFields = {
  label: "Check tire pressure",
  type: "action" as const,
  required: true,
  m1: true,
  m2: false,
  setupCategory: null,
};

describe("draft checklist item actions", () => {
  beforeEach(() => {
    createClient.mockReset();
    revalidatePath.mockReset();
  });

  it("rejects M2 without M1 without calling the RPC", async () => {
    const { addDraftChecklistItem } = await import(
      "@/src/lib/workshop-tasks/actions/checklist-item-actions"
    );
    const rpc = vi.fn();
    createClient.mockResolvedValue({ rpc });

    await expect(
      addDraftChecklistItem({
        versionId: VERSION_ID,
        expectedRevision: 1,
        ...validItemFields,
        m1: false,
        m2: true,
      }),
    ).resolves.toEqual({
      ok: false,
      error: "M2 requires M1",
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("revalidates library and detail after a successful add", async () => {
    const { addDraftChecklistItem } = await import(
      "@/src/lib/workshop-tasks/actions/checklist-item-actions"
    );
    const rpc = vi.fn().mockResolvedValue({ data: 2, error: null });
    createClient.mockResolvedValue({ rpc });

    await expect(
      addDraftChecklistItem({
        versionId: VERSION_ID,
        expectedRevision: 1,
        ...validItemFields,
      }),
    ).resolves.toEqual({ ok: true, revision: 2 });

    expect(rpc).toHaveBeenCalledWith("add_draft_checklist_item", {
      version_id: VERSION_ID,
      expected_revision: 1,
      label: "Check tire pressure",
      item_type: "action",
      required: true,
      m1: true,
      m2: false,
      setup_category: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/workshop/templates");
    expect(revalidatePath).toHaveBeenCalledWith(
      `/workshop/templates/${VERSION_ID}`,
    );
  });

  it("revalidates library and detail after a successful update", async () => {
    const { updateDraftChecklistItem } = await import(
      "@/src/lib/workshop-tasks/actions/checklist-item-actions"
    );
    const rpc = vi.fn().mockResolvedValue({ data: 3, error: null });
    createClient.mockResolvedValue({ rpc });

    await expect(
      updateDraftChecklistItem({
        versionId: VERSION_ID,
        itemId: ITEM_ID,
        expectedRevision: 2,
        ...validItemFields,
        label: "Check tires",
        type: "value",
        required: false,
        m1: true,
        m2: true,
        setupCategory: "saddle",
      }),
    ).resolves.toEqual({ ok: true, revision: 3 });

    expect(rpc).toHaveBeenCalledWith("update_draft_checklist_item", {
      item_id: ITEM_ID,
      expected_revision: 2,
      label: "Check tires",
      item_type: "value",
      required: false,
      m1: true,
      m2: true,
      setup_category: "saddle",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/workshop/templates");
    expect(revalidatePath).toHaveBeenCalledWith(
      `/workshop/templates/${VERSION_ID}`,
    );
  });

  it("maps a stale RPC error onto stale plus current revision and status", async () => {
    const { updateDraftChecklistItem } = await import(
      "@/src/lib/workshop-tasks/actions/checklist-item-actions"
    );
    const error = {
      message: "Checklist version is stale",
      details: JSON.stringify({ stale: true, revision: 4, status: "draft" }),
    };
    const rpc = vi.fn().mockResolvedValue({ data: null, error });
    createClient.mockResolvedValue({ rpc });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      updateDraftChecklistItem({
        versionId: VERSION_ID,
        itemId: ITEM_ID,
        expectedRevision: 1,
        ...validItemFields,
      }),
    ).resolves.toEqual({
      ok: false,
      error: "Checklist version is stale",
      stale: true,
      revision: 4,
      status: "draft",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("submits the full item id list on reorder", async () => {
    const { reorderDraftChecklistItems } = await import(
      "@/src/lib/workshop-tasks/actions/checklist-item-actions"
    );
    const rpc = vi.fn().mockResolvedValue({ data: 3, error: null });
    createClient.mockResolvedValue({ rpc });
    const itemIds = [
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    ];

    await expect(
      reorderDraftChecklistItems({
        versionId: VERSION_ID,
        expectedRevision: 2,
        itemIds,
      }),
    ).resolves.toEqual({ ok: true, revision: 3 });

    expect(rpc).toHaveBeenCalledWith("reorder_draft_checklist_items", {
      version_id: VERSION_ID,
      expected_revision: 2,
      item_ids: itemIds,
    });
  });

  it("revalidates after a successful remove", async () => {
    const { removeDraftChecklistItem } = await import(
      "@/src/lib/workshop-tasks/actions/checklist-item-actions"
    );
    const rpc = vi.fn().mockResolvedValue({ data: 5, error: null });
    createClient.mockResolvedValue({ rpc });

    await expect(
      removeDraftChecklistItem({
        versionId: VERSION_ID,
        itemId: ITEM_ID,
        expectedRevision: 4,
      }),
    ).resolves.toEqual({ ok: true, revision: 5 });
    expect(rpc).toHaveBeenCalledWith("remove_draft_checklist_item", {
      item_id: ITEM_ID,
      expected_revision: 4,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/workshop/templates");
    expect(revalidatePath).toHaveBeenCalledWith(
      `/workshop/templates/${VERSION_ID}`,
    );
  });
});
