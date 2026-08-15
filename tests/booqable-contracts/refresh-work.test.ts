import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extractPgEnumLabels } from "@/src/lib/booqable/contracts";
import {
  PG_REFRESH_ENUM_LABELS,
  REFRESH_OPERATIONAL_TABLES,
  REFRESH_RETRY_POLICY,
  REFRESH_TRANSITION_CATALOGUE,
  REFRESH_TRANSITION_CODES,
  REFRESH_WORK_CONTRACT_VERSION,
  REFRESH_WORK_MIGRATION,
  REFRESH_WORK_RPCS,
  RefreshReceiptInputSchema,
  RefreshTransitionCodeSchema,
  applyRefreshTransition,
  assertRefreshCatalogueCompleteness,
  refreshCatalogueSqlTuple,
  resolveRefreshDeliveryIdentity,
} from "@/src/lib/booqable/contracts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("refresh-work I/O matrix", () => {
  it("owns a complete catalogue of apply results and operational codes", () => {
    expect(REFRESH_WORK_CONTRACT_VERSION).toBe(1);
    expect(assertRefreshCatalogueCompleteness()).toEqual({ ok: true });
    expect(REFRESH_TRANSITION_CATALOGUE.map((row) => row.code)).toEqual([
      ...REFRESH_TRANSITION_CODES,
    ]);
    expect(REFRESH_RETRY_POLICY).toEqual({
      maxAttempts: 3,
      backoffSeconds: [30, 120],
    });
  });

  it("accepts a PII-free receipt and rejects extra or payload fields", () => {
    const parsed = RefreshReceiptInputSchema.safeParse({
      provider: "booqable",
      source_kind: "order",
      source_external_id: "bq-order-1",
      delivery_identity: "evt-1",
      delivery_identity_kind: "provider_event_id",
      contract_version: 1,
    });
    expect(parsed.success).toBe(true);

    const withPii = RefreshReceiptInputSchema.safeParse({
      provider: "booqable",
      source_kind: "order",
      source_external_id: "bq-order-1",
      delivery_identity: "evt-1",
      delivery_identity_kind: "provider_event_id",
      contract_version: 1,
      email: "rider@example.com",
      raw_body: "data[email]=rider@example.com",
    });
    expect(withPii.success).toBe(false);
  });

  it("prefers a provider event id and otherwise uses the body HMAC", () => {
    expect(
      resolveRefreshDeliveryIdentity({
        providerEventId: "evt-9",
        bodyHmacSha256: "abc",
      }),
    ).toEqual({
      delivery_identity: "evt-9",
      delivery_identity_kind: "provider_event_id",
    });
    expect(
      resolveRefreshDeliveryIdentity({
        providerEventId: "  ",
        bodyHmacSha256: "deadbeef",
      }),
    ).toEqual({
      delivery_identity: "deadbeef",
      delivery_identity_kind: "body_hmac_sha256",
    });
  });

  it("fails closed on an unknown transition code", () => {
    expect(RefreshTransitionCodeSchema.safeParse("newer_unknown_code").success).toBe(
      false,
    );
    expect(applyRefreshTransition("newer_unknown_code", 0)).toEqual({
      ok: false,
      code: "unknown_transition_code",
    });
    expect(applyRefreshTransition("unknown_transition_code", 1)).toEqual({
      ok: false,
      code: "unknown_transition_code",
    });
  });

  it("lets the catalogue own retry budget, backoff, and terminal states", () => {
    expect(applyRefreshTransition("applied", 0)).toMatchObject({
      ok: true,
      nextState: "succeeded",
      attemptCount: 0,
      claimableAfterSeconds: null,
    });
    expect(applyRefreshTransition("upstream_timeout", 0)).toMatchObject({
      ok: true,
      nextState: "claimable",
      attemptCount: 1,
      claimableAfterSeconds: 30,
    });
    expect(applyRefreshTransition("upstream_rate_limited", 1)).toMatchObject({
      ok: true,
      nextState: "claimable",
      attemptCount: 2,
      claimableAfterSeconds: 120,
    });
    expect(applyRefreshTransition("upstream_server_error", 2)).toMatchObject({
      ok: true,
      nextState: "exhausted",
      attemptCount: 3,
      claimableAfterSeconds: null,
      allowsOperatorSuccessor: true,
    });
    expect(applyRefreshTransition("lease_superseded", 1)).toMatchObject({
      ok: true,
      nextState: "claimable",
      attemptCount: 1,
    });
    expect(applyRefreshTransition("source_conflict_quarantined", 0)).toMatchObject({
      ok: true,
      nextState: "quarantined",
      recordsIncident: true,
    });
  });
});

describe("refresh-work drift", () => {
  it("fixture-checks enums, tables, RPCs, catalogue, and retry policy against the migration", () => {
    const sql = readFileSync(join(repoRoot, REFRESH_WORK_MIGRATION), "utf8");

    for (const [typeName, labels] of Object.entries(PG_REFRESH_ENUM_LABELS)) {
      expect(extractPgEnumLabels(sql, typeName)).toEqual([...labels]);
    }

    for (const table of REFRESH_OPERATIONAL_TABLES) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
    }
    for (const rpc of REFRESH_WORK_RPCS) {
      expect(sql).toContain(`CREATE OR REPLACE FUNCTION public.${rpc}(`);
      expect(sql).toContain(
        `GRANT EXECUTE ON FUNCTION public.${rpc}`,
      );
    }

    for (const entry of REFRESH_TRANSITION_CATALOGUE) {
      expect(sql).toContain(refreshCatalogueSqlTuple(entry));
    }

    expect(sql).toContain("max_attempts integer NOT NULL");
    expect(sql).toContain("CHECK (max_attempts > 0)");
    expect(sql).toContain("ARRAY[30, 120]::integer[]");
    expect(sql).toContain("retry_backoff_seconds[v_attempt_count]");
    expect(sql).toContain(
      "complete_booqable_refresh_intent(uuid, bigint, bigint, text, text)",
    );
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).not.toMatch(/ON DELETE CASCADE/i);
    expect(sql).toContain("FROM PUBLIC, anon, authenticated, service_role");
  });
});
