import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  liveClassificationSource,
  TARGETED_UNPROVEN_MESSAGE,
} from "@/src/lib/booqable/contracts/classification-config";
import { mapClassificationRpcError } from "@/src/lib/booqable/classification-config";

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

const ACTIVE_ID = "11111111-1111-4111-8111-111111111111";
const PRIOR_ID = "22222222-2222-4222-8222-222222222222";

describe("approveClassificationConfig", () => {
  beforeEach(() => {
    createClient.mockReset();
    revalidatePath.mockReset();
  });

  it("rejects targeted mode before calling the RPC while slots are unproven", async () => {
    const { approveClassificationConfig } = await import(
      "@/src/lib/booqable/classification-config/actions"
    );
    const rpc = vi.fn();
    createClient.mockResolvedValue({ rpc });

    await expect(
      approveClassificationConfig({
        expectedRevision: 0,
        expectedActiveVersionId: null,
        mode: "targeted",
      }),
    ).resolves.toEqual({ ok: false, error: TARGETED_UNPROVEN_MESSAGE });
    expect(rpc).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("copies the current source and revalidates after a first approve", async () => {
    const { approveClassificationConfig } = await import(
      "@/src/lib/booqable/classification-config/actions"
    );
    const rpc = vi.fn().mockResolvedValue({ data: 1, error: null });
    createClient.mockResolvedValue({ rpc });

    await expect(
      approveClassificationConfig({
        expectedRevision: 0,
        expectedActiveVersionId: null,
        mode: "review_updated_configuration",
      }),
    ).resolves.toEqual({ ok: true, revision: 1 });

    expect(rpc).toHaveBeenCalledWith("approve_classification_mapping_config", {
      expected_revision: 0,
      expected_active_version_id: null,
      mode: "review_updated_configuration",
      allowlist: {},
      display_labels: [],
      setup_slots: liveClassificationSource().setup_slots,
      provenance: {
        origin: "editable_source",
        source: "src/lib/booqable/contracts/classification-config.ts",
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/workshop/classification");
  });

  it("maps stale DETAIL so Retry can resubmit the reported pointer", async () => {
    const { approveClassificationConfig } = await import(
      "@/src/lib/booqable/classification-config/actions"
    );
    const error = {
      message: "Classification mapping configuration is stale",
      details: JSON.stringify({
        stale: true,
        revision: 2,
        activeVersionId: ACTIVE_ID,
      }),
    };
    const rpc = vi.fn().mockResolvedValue({ data: null, error });
    createClient.mockResolvedValue({ rpc });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      approveClassificationConfig({
        expectedRevision: 1,
        expectedActiveVersionId: PRIOR_ID,
        mode: "review_updated_configuration",
      }),
    ).resolves.toEqual({
      ok: false,
      error: expect.any(String),
      stale: true,
      revision: 2,
      activeVersionId: ACTIVE_ID,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("rollbackClassificationConfig", () => {
  beforeEach(() => {
    createClient.mockReset();
    revalidatePath.mockReset();
  });

  it("revalidates after a successful rollback", async () => {
    const { rollbackClassificationConfig } = await import(
      "@/src/lib/booqable/classification-config/actions"
    );
    const rpc = vi.fn().mockResolvedValue({ data: 1, error: null });
    createClient.mockResolvedValue({ rpc });

    await expect(
      rollbackClassificationConfig({
        priorVersionId: PRIOR_ID,
        expectedRevision: 2,
        expectedActiveVersionId: ACTIVE_ID,
      }),
    ).resolves.toEqual({ ok: true, revision: 1 });
    expect(rpc).toHaveBeenCalledWith("rollback_classification_mapping_config", {
      prior_version_id: PRIOR_ID,
      expected_revision: 2,
      expected_active_version_id: ACTIVE_ID,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/workshop/classification");
  });
});

describe("mapClassificationRpcError", () => {
  it("treats the stale message as stale even without DETAIL", () => {
    expect(
      mapClassificationRpcError(
        { message: "Classification mapping configuration is stale" },
        "fallback",
      ),
    ).toMatchObject({ ok: false, stale: true });
  });
});
