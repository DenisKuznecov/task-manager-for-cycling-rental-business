---
title: 'Expand the Canonical Booqable Projection'
type: 'feature'
created: '2026-08-15'
status: 'done'
baseline_revision: 'c537e2720b0d6828461b9c7457bff117e06cf30a'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/project-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app stores Booqable customers, orders, and order items, but not the bike and rental graph Workshop needs. Later stories have nowhere safe to keep exact identity, relationships, source state, provenance, or admission tags.

**Approach:** Add one projection contract, a migration-owned field-authority manifest, and an idempotent local migration. Extend the shared projection without creating a second order system or changing current readers and writers.

## Boundaries & Constraints

**Always:** Admit only correctly tagged ProductGroups/Products and agreeing Bundles/BundleItems. Persist every admitted Product/ProductGroup/Bundle's complete `tag_list`; never replace it with a category value. Store opaque IDs, StockItems, Plannings, StockItemPlannings, BundleItems, provenance, source version, UTC source/ingestion times, and explicit open/closed state. Membership identity is exactly `(order_external_id, line_external_id, source_unit_discriminator, replacement_chain_incarnation)`, backed by one immutable UUID, a unique constraint, and an immutable predecessor link. Quantity-one may use discriminator `single`; multi-quantity requires distinct StockItem IDs; Planning IDs and array positions are never identity. Use restrictive, non-cascading foreign keys. Keep local and Booqable customers separate. The migration-only manifest assigns every projected field one authority, writer, backfill rule, and disposition. Base tables are service-role-only. DDL is additive, idempotent, and local-only.

**Ask First:** Fixtures do not prove a field, relationship, version, archive signal, or timestamp; a change would alter an existing reader; or restrictive foreign keys cannot represent an approved partial/unknown state.

**Never:** Add UI, an allowlist/mapping config, raw payloads, runtime fetch/write/workers, incidents, or Workshop task derivation. Do not change `sync.ts`, webhook/sandbox routes, Story 2.4 vocabulary, or earlier migrations. Never auto-merge customers, classify from labels, accept orphan links, cascade-delete history, expose base tables to users, guess API fields, or apply remote DDL.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Valid graph | Tags and required links agree | Contract accepts; full tags and provenance fit the schema | No error |
| Invalid admission | Untagged, unknown, multiple, inherited, or Bundle tags disagree | Contract rejects admission | Use existing fail-closed tag outcome |
| Partial graph | Referenced source is unknown/not present | Keep unknown state; create no orphan or closure | Carry forward; do not weaken integrity |
| Legacy/local customer | Existing row has no Booqable identity | Preserve origin and behavior; never auto-merge | Nullable, backfill-safe fields |
| Missing/archived source | No approved explicit close signal | Keep row open and history linked; archived PII does not expand or refresh | Absence never closes/deletes |

</frozen-after-approval>

## Code Map

- `src/lib/booqable/contracts/source-envelope.ts:72-103` -- reuse identity, presence, and slot semantics; read-only.
- `src/lib/booqable/contracts/workshop-tags.ts:6-64,167-248` -- sole tag vocabulary and admission logic.
- `supabase/migrations/20260608102505_remote_schema.sql:267-397` -- shared customers/orders/views; additive-only.
- `supabase/migrations/20260610151000_add_order_items_and_payment_fields.sql:5-60` -- order-item schema; do not copy broad grants.
- `supabase/migrations/20260814140000_source_envelope_vocabulary.sql:1-110` -- reuse PostgreSQL presence/identity types.
- `tests/booqable-contracts/envelope-invariants.test.ts:254-285` -- migration drift-test pattern.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/booqable/contracts/canonical-projection.ts` -- define strict schemas/constants for all admitted resources, links, membership identity, source state, provenance, and manifest vocabulary -- one editable contract.
- [x] `src/lib/booqable/contracts/index.ts` -- export the new contract.
- [x] `supabase/migrations/20260815000000_expand_canonical_booqable_projection.sql` -- add backfill-safe origin/source state to shared rows; create normalized `booqable_` resource, BundleItem, membership, predecessor, and migration-owned manifest structures with restrictive keys, indexes, RLS, revoked public/user access, and service-role grants -- storage only.
- [x] `tests/booqable-contracts/canonical-projection.test.ts` -- cover the matrix and fixture-check all contract/manifest vocabulary against SQL.
- [x] `supabase/tests/database/booqable-integration/002_canonical_projection.pgtap.sql` -- prove schema, UTC fields, uniqueness, membership key, predecessor immutability, restrictive deletes, manifest completeness, customer separation, privileges/RLS, and unchanged reader signatures.
- [x] `package.json` -- include the projection test in `contracts:check`.
- [x] `_bmad-output/project-context.md` -- record projection ownership, identity, manifest, access, and unchanged writers.

**Acceptance Criteria:**
- Given the shared projection, when the migration runs locally, then the approved graph, exact membership key, source state, provenance, and complete admitted tags are representable without a second order system.
- Given invalid, orphaned, absent, or unproved source data, when checks run, then it cannot enter/close the admitted graph or delete history.
- Given the manifest, when fields are checked, then each `(entity_origin, field)` has one authority, writer, backfill rule, and disposition; customer origins remain separate and archived PII stays bounded.
- Given current readers/users, when the migration runs, then reader contracts remain compatible and authenticated roles have no base-table access.

## Spec Change Log

## Design Notes

Use `booqable_` source-table names and explicit opaque ID columns. Use `ON DELETE RESTRICT`/`NO ACTION`, with deferrable constraints only when transaction order needs them. Complete tags stay source facts; the existing tag contract derives category. Later stories fetch, apply, recover, and create Workshop work.

## Verification

**Commands:**
- `npx tsc --noEmit` -- strict TypeScript passes.
- `npm run lint` -- lint passes with no new warnings.
- `npm run contracts:check` -- envelope, source-tag, and projection drift checks pass.
- `npm run test:unit` -- all existing and new unit tests pass.
- `npx supabase db reset` -- the idempotent projection migration applies to the local PostgreSQL 17 stack.
- `npx supabase test db` -- all pgTAP trees pass, including canonical projection and brownfield view proofs.
- `npm run db:types` -- local type generation succeeds without adding an app consumer.

## Review Triage Log

### 2026-08-15 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 8: (high 2, medium 5, low 1)
- defer: 0
- reject: 16
- addressed_findings:
  - `[high]` `[patch]` Bundle tag agreement used every ProductGroup in the graph; scoped it to ProductGroups linked through that bundle's BundleItems and added two-category accept/reject tests.
  - `[high]` `[patch]` Planning/StockItemPlanning IDs were forbidden as identity only when present in the current graph; also reject when the discriminator equals the membership's own planning or SIP id, and execute the `sip_1` test path.
  - `[medium]` `[patch]` Duplicate membership UUIDs overwrote the lookup map; reject duplicate ids.
  - `[medium]` `[patch]` Booqable customer `source_lifecycle` was not backfilled to `open`; empty-string Booqable ids were treated as Booqable; added inverse origin CHECK and pgTAP proofs.
  - `[medium]` `[patch]` New identity text columns accepted blank strings; added idempotent non-empty CHECKs.
  - `[medium]` `[patch]` `assertManifestCompleteness` only required one field per origin; it now fails if any field from the contract's own per-origin lists is missing.
  - `[low]` `[patch]` UTC timestamp schema accepted overflow dates such as Feb 30; reject non-real calendar dates.

## Auto Run Result

Status: done

Summary: Storage-only canonical Booqable projection — one admission contract, a migration-owned field-authority manifest, and an additive local migration for the bike/rental graph, membership identity, provenance, and customer-origin separation. Current readers and writers were not changed.

Files changed:
- `src/lib/booqable/contracts/canonical-projection.ts` — admitted-resource schemas, membership identity, provenance, close/absence helpers, and the 163-row field-authority manifest.
- `src/lib/booqable/contracts/index.ts` — export the new contract.
- `supabase/migrations/20260815000000_expand_canonical_booqable_projection.sql` — additive shared-row origin/source columns and `booqable_*` tables with restrictive keys, RLS, and service-role-only grants.
- `tests/booqable-contracts/canonical-projection.test.ts` — I/O matrix and SQL fixture-checks.
- `supabase/tests/database/booqable-integration/002_canonical_projection.pgtap.sql` — schema, uniqueness, immutability, privileges, customer separation, and unchanged view signatures.
- `package.json` — include the projection test in `contracts:check`.
- `_bmad-output/project-context.md` — record projection ownership and unchanged writers.
- `_bmad-output/implementation-artifacts/spec-2-5-expand-the-canonical-booqable-projection.md` — this spec.

Review findings breakdown:
- patches applied: 8 (high 2, medium 5, low 1)
- items deferred: 0
- items rejected: 16 (R3 stored-graph enforcement, writers/PII triggers, unused Story 2.4 presence enums, `identity_kind`/`line_quantity` columns, extra replacement-chain rules, missing FK indexes, party memlog, empty spec change log)

Follow-up review recommendation: true. Patched counts: high 2, medium 5, low 1. Score: `3 × 5 + 1 × 1 = 16` (high patches also force true).

Verification performed:
- `npx tsc --noEmit` — pass
- `npm run lint` — pass (0 errors; 19 pre-existing warnings, no new ones)
- `npm run contracts:check` — 47 tests pass
- `npm run test:unit` — 178 tests pass
- `npx supabase db reset` — projection migration applied locally (implementer re-ran after patches)
- `npx supabase test db` — 9 files / 244 tests pass, including `002_canonical_projection`
- `npm run db:types` — succeeded; no app consumer added

Residual risks:
- No writer yet. `sync.ts`, webhooks, and sandbox routes still use the old path; new tables stay empty until a later apply story.
- Close signals are not guessed. Absence leaves rows `open`.
- Planning-id identity checks are graph-local plus same-membership planning/SIP ids; a later writer should keep using `identity_kind`.
- Remote DDL was not applied. Staging/production still go through merge + CI.
