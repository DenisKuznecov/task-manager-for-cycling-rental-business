import { beforeEach, describe, expect, it, vi } from "vitest";
import { liveClassificationSource } from "@/src/lib/booqable/contracts/classification-config";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/src/utils/supabase/server", () => ({ createClient }));

const ACTIVE_ID = "11111111-1111-4111-8111-111111111111";

function mockConfigQuery(result: { data: unknown; error: unknown }) {
  const query = {
    order: vi.fn().mockResolvedValue(result),
  };
  createClient.mockResolvedValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(query),
    }),
  });
}

describe("loadClassificationConfig", () => {
  beforeEach(() => {
    createClient.mockReset();
  });

  it("returns empty config plus error when the query fails", async () => {
    const { loadClassificationConfig } = await import(
      "@/src/lib/booqable/classification-config/data"
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockConfigQuery({
      data: null,
      error: { message: "permission denied" },
    });

    await expect(loadClassificationConfig()).resolves.toEqual({
      config: {
        active: null,
        history: [],
        source: liveClassificationSource(),
      },
      error: "permission denied",
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "loadClassificationConfig:",
      expect.objectContaining({ message: "permission denied" }),
    );
    errorSpy.mockRestore();
  });

  it("maps a stored active row to config.active", async () => {
    const { loadClassificationConfig } = await import(
      "@/src/lib/booqable/classification-config/data"
    );
    const source = liveClassificationSource();
    mockConfigQuery({
      data: [
        {
          id: ACTIVE_ID,
          revision: 1,
          status: "active",
          mode: source.mode,
          allowlist: source.allowlist,
          display_labels: source.display_labels,
          setup_slots: source.setup_slots,
          provenance: source.provenance,
          approved_by: "00000000-0000-4000-8000-000000000521",
          approved_at: "2026-08-14T12:00:00.000Z",
          prior_version_id: null,
        },
      ],
      error: null,
    });

    const result = await loadClassificationConfig();
    expect(result.error).toBeNull();
    expect(result.config.active).toEqual({
      id: ACTIVE_ID,
      revision: 1,
      status: "active",
      mode: source.mode,
      allowlist: source.allowlist,
      displayLabels: source.display_labels,
      setupSlots: source.setup_slots,
      provenance: source.provenance,
      approvedBy: "00000000-0000-4000-8000-000000000521",
      approvedAt: "2026-08-14T12:00:00.000Z",
      priorVersionId: null,
    });
    expect(result.config.history).toEqual([]);
  });
});
