import { describe, expect, it } from "vitest";
import {
  applyClassificationResult,
  classificationRollbackSubmitReady,
  initialClassificationPanelState,
  isClassificationRedirectError,
  ROLLBACK_RETRY_UNAVAILABLE_MESSAGE,
  type ClassificationPanelState,
} from "@/src/app/workshop/classification/_components/ClassificationConfigPanel";

const ACTIVE_ID = "11111111-1111-4111-8111-111111111111";

function openApproveState(): ClassificationPanelState {
  return {
    ...initialClassificationPanelState(null),
    dialog: "approve",
    pending: true,
  };
}

describe("applyClassificationResult", () => {
  it("closes the dialog and requests refresh on success", () => {
    const next = applyClassificationResult(openApproveState(), {
      ok: true,
      revision: 1,
    });

    expect(next).toEqual({
      dialog: null,
      rollbackTargetId: null,
      pending: false,
      error: null,
      stale: false,
      expectedRevision: 1,
      expectedActiveVersionId: null,
      refresh: true,
    });
  });

  it("advances expected revision and Active pointer from stale DETAIL", () => {
    const next = applyClassificationResult(
      {
        ...openApproveState(),
        expectedRevision: 1,
        expectedActiveVersionId: null,
      },
      {
        ok: false,
        error: "Classification mapping configuration is stale",
        stale: true,
        revision: 2,
        activeVersionId: ACTIVE_ID,
      },
    );

    expect(next.refresh).toBe(false);
    expect(next.pending).toBe(false);
    expect(next.stale).toBe(true);
    expect(next.expectedRevision).toBe(2);
    expect(next.expectedActiveVersionId).toBe(ACTIVE_ID);
    expect(next.dialog).toBe("approve");
  });
});

describe("isClassificationRedirectError", () => {
  it("is true for NEXT_REDIRECT digests", () => {
    expect(
      isClassificationRedirectError({ digest: "NEXT_REDIRECT;replace;/login" }),
    ).toBe(true);
    expect(isClassificationRedirectError(new Error("boom"))).toBe(false);
  });
});

describe("classificationRollbackSubmitReady", () => {
  it("surfaces a visible error when stale DETAIL clears the Active pointer", () => {
    expect(classificationRollbackSubmitReady(ACTIVE_ID, null)).toEqual({
      ok: false,
      error: ROLLBACK_RETRY_UNAVAILABLE_MESSAGE,
    });
  });
});
