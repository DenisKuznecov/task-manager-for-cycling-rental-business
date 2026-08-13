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
