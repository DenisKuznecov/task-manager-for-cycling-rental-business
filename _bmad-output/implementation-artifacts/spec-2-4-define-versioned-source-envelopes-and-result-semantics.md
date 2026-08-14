---
title: 'Define Versioned Source Envelopes and Result Semantics'
type: 'feature'
created: '2026-08-14'
status: 'done'
baseline_revision: 'f34893f72e8c1a890225aa16bb3dd760e0f9ffdf'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/project-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Booqable sync writes rows from an unvalidated payload and returns void. Later ingestion, workers, and Workshop derivation have no shared envelope or result vocabulary, so source uncertainty can become inconsistent canonical state.

**Approach:** Own one editable envelope contract for `order_graph` and `resource_batch`. Mirror it in TypeScript validation and PostgreSQL types. Fail closed on drift, incompatible vocabulary, or an unversioned breaking change. Do not apply source or change existing writers.

## Boundaries & Constraints

**Always:** One editable source under `src/lib/booqable/contracts/` (architecture seed). Units are only `order_graph` (later derivation input) and `resource_batch` (catalog/inventory refresh). Each envelope carries producer, profile, and schema versions; root identity; per-relationship `complete | partial` scope; per-resource `known | unknown | removed`; canonical identity; source-version map; local derived-context revisions; and fingerprint inputs/nulls. Results are exactly `applied | no_op | derivation_disabled | quarantined | rejected_retryable | rejected_terminal`. Unknown newer codes fail closed. Generic absence is non-closing in v1. Fingerprints compare merged effective state after carry-forward; omission incidents stay outside the fingerprint. Equal vector plus equal fingerprint is `no_op`; equal vector plus different fingerprint, older present component, or unresolved incomparability is `quarantined` with no mutation. TypeScript validation and PostgreSQL representations are generated or fixture-checked from that source. Additive and deprecation rules are explicit in a compatibility matrix. A CI job runs the drift/compatibility check. Zod v4 (`error.issues`). Preserve Stories 2.1–2.3. Local-only DDL. Existing Vitest + pgTAP.

**Block If:** A required contract field cannot be expressed without inventing Story 2.5/2.6 resource attribute lists or applying remote DDL.

**Never:** Change `sync.ts`, webhook, or sandbox routes. Implement fetch, comparator, coordinator apply, workers, cron, or freshness proofs. Expand `customers` / `orders` / `order_items`. Add classification allowlists, incident catalogues, or event catalogues. Store a raw-payload mirror. Add a second test runner or a new codegen package. Add `next build` to deploy workflows. Wire `db:types` into an app consumer.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Valid `order_graph` | Required versions, root identity, scopes, presence, source-version map, fingerprint inputs | Zod accepts; kind is `order_graph` | No error expected |
| Valid `resource_batch` | Same header fields; kind is `resource_batch` | Zod accepts | No error expected |
| Missing version field | Envelope omits producer, profile, or schema version | Validation fails | Fail closed; no apply |
| Unknown result code | Result not in the six-value vocabulary | Validation / PG enum reject | Fail closed |
| Illegal presence or scope | Presence or scope outside the fixed enums | Validation / PG enum reject | Fail closed |
| Source/output drift | Editable source changed; TS or PG vocabulary not updated | CI drift check fails | Fail the check |
| Unversioned breaking change | Required field removed/renamed or enum value dropped without schema-version bump | Compatibility check fails | Fail the check |
| Documented additive change | Optional field or new enum value with schema-version bump per matrix | Check passes | N/A |

</intent-contract>

## Code Map

- `src/lib/booqable/sync.ts:13-26,100-297` -- private unvalidated `BooqableOrderPayload`; `syncBooqableOrder` returns `void` and throws. Read-only this story.
- `src/lib/booqable/ingestion-guard.ts` -- Story 2.1 preview/auth guard. Read-only.
- `src/lib/booqable/` -- only those two files. Seed path `contracts/` does not exist yet; create it here.
- `src/lib/wiki/types/schema.ts:44` -- `z.enum(CONST_ARRAY)` + `z.infer`. Copy this pattern.
- `src/lib/bike-fit/payload/schema.ts:158-171` -- `AssertExtends` compile-time parity if a hand type is kept.
- `supabase/migrations/20260608102505_remote_schema.sql:66-74` -- `CREATE TYPE ... AS ENUM` style.
- `supabase/migrations/20260814120000_required_extension_manifest.sql` -- latest migration; new file must sort after it.
- `supabase/tests/database/toolchain/001_required_extensions.pgtap.sql` -- nested pgTAP layout. Seed home for this work: `supabase/tests/database/booqable-integration/`.
- `tests/toolchain/pin-invariants.test.ts:1-20` -- file-reading Vitest invariant pattern.
- `package.json:8-16` -- scripts; add a drift-check script. `db:types` stays stdout-only.
- `.github/workflows/deploy-staging.yml` / `deploy-production.yml` -- db push only. Do not add `next build`. New drift workflow is separate.
- `_bmad-output/implementation-artifacts/spec-2-3-pin-the-node-and-database-toolchain.md` -- continuity: CLI 2.114.0, Node 24, `npx supabase`, no remote DDL.

## Tasks & Acceptance

**Execution:**
- `src/lib/booqable/contracts/source-envelope.ts` -- editable Zod source for both kinds plus header versions, root identity, scopes, presence, source-version map, derived-context revisions, fingerprint inputs/nulls, and the six-value result vocabulary -- one contract source
- `src/lib/booqable/contracts/compatibility.ts` -- schema version `1` plus explicit additive/deprecation rules the drift check reads -- compatibility matrix
- `src/lib/booqable/contracts/index.ts` -- barrel re-exports -- feature-module convention
- `supabase/migrations/20260814140000_source_envelope_vocabulary.sql` -- idempotent PG enums/types matching that vocabulary -- database mirror
- `supabase/tests/database/booqable-integration/001_source_envelope_vocabulary.pgtap.sql` -- assert the PG vocabulary exists with the exact labels -- local DB proof
- `tests/booqable-contracts/envelope-invariants.test.ts` -- cover the I/O matrix and assert TS labels match the migration text -- fixture-check + edge cases
- `package.json` -- add a `contracts:check` script that fails on missing regeneration, vocabulary mismatch, or unversioned breaking change -- named check command
- `.github/workflows/contracts-drift.yml` -- on `pull_request`, install and run `contracts:check` (and the envelope Vitest file) -- CI is the drift surface
- `_bmad-output/project-context.md` -- record the contracts path, result vocabulary, and that writers are unchanged -- later stories consume this package

**Acceptance Criteria:**
- Given Booqable data will enter through later adapter stories, when the repository contract package is added, then it defines versioned `order_graph` and `resource_batch` envelopes with producer/profile/schema versions, complete/partial scopes, known/unknown/removed values, canonical identity, source vectors, fingerprints, and the six-value result vocabulary, and TypeScript validation plus PostgreSQL representations are generated or fixture-checked from one editable source.
- Given the contract source or a mirrored output changes, when CI runs the drift and compatibility checks, then missing regeneration, incompatible vocabulary, or an unversioned breaking change fails the check, and additive/deprecation rules remain explicit.

### Review Findings
- [x] [Review][Patch] Reject undeclared envelope fields [src/lib/booqable/contracts/source-envelope.ts:72]
- [ ] [Review][Patch] Require a coherent root and source-version vector [src/lib/booqable/contracts/source-envelope.ts:120]
- [x] [Review][Patch] Reject duplicate derived-context revisions [src/lib/booqable/contracts/source-envelope.ts:111]
- [ ] [Review][Patch] Verify an existing canonical-identity type matches the contract [supabase/migrations/20260814140000_source_envelope_vocabulary.sql:95]
- [x] [Review][Patch] Freeze the complete published v1 vocabulary independently of the live source [tests/booqable-contracts/envelope-invariants.test.ts:171]

## Spec Change Log

## Review Triage Log

### 2026-08-14 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 8: (high 0, medium 3, low 5)
- defer: 0
- reject: 16
- addressed_findings:
  - `[medium]` `[patch]` Pinned the six result codes and `no_op`/`quarantined` comparator bindings as literals so a lockstep snapshot rewrite cannot stay green
  - `[medium]` `[patch]` Extended Zod I/O tests to every required field, unknown kind, `schema_version: 2`, null fingerprint inputs, and unversioned additive failure
  - `[medium]` `[patch]` Rejected duplicate relationship and identity keys on the envelope
  - `[low]` `[patch]` Trimmed identity/version strings and rejected non-finite fingerprint numbers
  - `[low]` `[patch]` Drift check now fails closed on a missing migration, `pgEnumTypes` drift, required/optional overlap, and non-finite schema version; required→optional is no longer labeled a rename
  - `[low]` `[patch]` Re-exported the drift-check functions from the contracts barrel
  - `[low]` `[patch]` Fixture-checked `source_canonical_identity` in Vitest
  - `[low]` `[patch]` pgTAP now proves PostgreSQL rejects illegal enum labels

## Design Notes

Use Zod already in the repo as the editable source (`z.infer` for TypeScript). Fixture-check PostgreSQL enum labels against the same const arrays — do not add a codegen package. Resource slots are identity + presence + source version + fingerprint inputs, not Booqable attribute schemas (Stories 2.5–2.6). Producer/profile versions are identifiers on the envelope; fetch-path profiles come later. Schema version starts at `1`. Deploy workflows stay db-push-only.

## Verification

**Commands:**
- `npx tsc --noEmit` -- no new errors; `strict` unchanged
- `npm run lint` -- succeeds
- `npm run test:unit` -- existing tests plus envelope invariants pass
- `npm run contracts:check` -- drift/compatibility check passes on the new contract
- `npx supabase db reset` -- local PG 17 applies the vocabulary migration
- `npx supabase test db` -- new booqable-integration pgTAP and existing nested trees pass

## Auto Run Result

Status: done

**Summary:** Story 2.4 owns one editable envelope contract for `order_graph` and `resource_batch`, mirrored in Zod and PostgreSQL enums, with a CI drift/compatibility check. Existing Booqable writers were not changed.

**Files changed:**
- `src/lib/booqable/contracts/source-envelope.ts` — Zod source for both kinds, versions, identity, scope, presence, source versions, fingerprint inputs, and the six-value result vocabulary
- `src/lib/booqable/contracts/compatibility.ts` — schema version `1`, additive/deprecation rules, frozen comparator bindings
- `src/lib/booqable/contracts/check.ts` — drift/compatibility engine
- `src/lib/booqable/contracts/index.ts` — barrel including the check exports
- `supabase/migrations/20260814140000_source_envelope_vocabulary.sql` — idempotent PG enums plus canonical-identity composite
- `supabase/tests/database/booqable-integration/001_source_envelope_vocabulary.pgtap.sql` — label proof and illegal-cast rejects
- `tests/booqable-contracts/envelope-invariants.test.ts` — I/O matrix and fixture-check
- `package.json` — `contracts:check`
- `.github/workflows/contracts-drift.yml` — pull_request drift job
- `project-context.md` — contracts path, result vocabulary, writers unchanged

**Review findings:** 8 patches applied (high 0, medium 3, low 5); 0 deferred; 16 rejected.

**Follow-up review recommendation:** true (patched: high 0, medium 3, low 5; score `3 × 3 + 1 × 5 = 14`, threshold 5).

**Verification:**
- `npx tsc --noEmit` — exit 0, `strict: true` unchanged
- `npm run lint` — exit 0, 19 pre-existing `<img>` warnings
- `npm run test:unit` — 11 files / 153 tests pass
- `npm run contracts:check` — 22 tests pass
- `npx supabase test db` — 7 files / 202 tests PASS, including `booqable-integration/`
- `npx supabase db reset` — already applied on the local stack before this pass; re-proved by `test db` (full reset was not re-run)

**Residual risks:** Nothing fetches, compares, or applies envelopes yet. `syncBooqableOrder` still writes unvalidated payloads. Comparator rules are frozen constants, not an executed merge. Resource `resource_type` / `relationship` strings stay open until Stories 2.5–2.6. Local developer Node may still be 22; use Node 24 to match the pin.
