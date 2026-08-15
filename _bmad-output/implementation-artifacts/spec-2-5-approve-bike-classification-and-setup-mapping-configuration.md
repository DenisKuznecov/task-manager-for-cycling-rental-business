---
title: 'Approve Bike Classification and Setup Mapping Configuration'
type: 'feature'
created: '2026-08-14'
status: 'superseded'
superseded_on: '2026-08-14'
superseded_by: '_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-14.md'
baseline_revision: 'd1cea92b576cd4a2bb9d3759e5295d0612cb0cbd'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/project-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
warnings: []
deferred: []
---

# Superseded

This specification is retained as historical implementation evidence only. The 2026-08-14 course correction withdrew the local ProductGroup UUID allowlist, classification approval UI, Setup mapping database contract, RPCs, and Story 2.5. Current authority is the source-first Booqable `tag_list` contract in the corrected PRD, architecture, epics, project context, and Sprint Change Proposal.

<intent-contract>

## Intent

**Problem:** Workshop has no business-approved ProductGroup allowlist or Setup mapping contract. Classification from labels or incomplete mappings would create the wrong bikes and target the wrong changed work.

**Approach:** Own one versioned configuration contract for the ProductGroup UUID allowlist and the five Setup Category mappings. Admins approve, roll back, or supersede it atomically. Broad `review_updated_configuration` stays the only selectable mode until every category is fixture-proven.

## Boundaries & Constraints

**Always:** One editable source under `src/lib/booqable/contracts/`. Allowlist keys are actual ProductGroup UUIDs with provenance (`origin`, `collected_at`, optional `note`). Labels and analyst-candidate names are display-only and never classification keys. Empty allowlist is valid and fail-closed. Setup slots are exactly `WORKSHOP_SETUP_CATEGORIES` (`pedals`, `saddle`, `wheelset`, `power-meter`, `computer-mount`). Mode vocabulary includes `review_updated_configuration` and `targeted`; the approve capability may persist only `review_updated_configuration` until all five slots have a stable approved identifier and complete null/unknown/changed/removed fixtures. Approve / rollback / supersede go through an admin-only `SECURITY DEFINER` RPC plus `withAuth` action; each commit records revision, approver, time, provenance, mode, and prior version together. One Active version. Authenticated roles have no table DML. Drift check fails closed when source identifiers, fixtures, or generated TypeScript / PostgreSQL representations diverge. Local-only idempotent DDL. Zod v4 (`error.issues`). Preserve Stories 2.1–2.4.

**Block If:** A ProductGroup UUID or Setup Category field identifier must be invented to satisfy a non-empty or proven slot.

**Never:** Change `sync.ts`, the webhook, sandbox routes, envelope `check.ts` / `source-envelope.ts` vocabulary, or Epic 1 migrations. Derive tasks. Expand `customers` / `orders` / `order_items`. Title or label matching. Activate targeted mode. Enqueue refreshes or impact analysis. Remote DDL. Manager / mechanic / `service_role` approval. A second codegen package. Wire `db:types` into an app consumer.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First approve | Admin; current source (empty allowlist, unproven slots, broad mode); no Active | New Active snapshot; revision 1; prior version null; labels display-only | No error expected |
| Supersede | Admin; Active exists; expected revision + Active pointer | New Active; prior superseded; prior version recorded | No error expected |
| Rollback | Admin; prior version id; expected revision + Active pointer | Prior snapshot becomes Active; current superseded; audit row written | No error expected |
| Targeted rejected | Admin requests `targeted` while any slot lacks identifier or fixtures | No write | `{ ok: false, error }` |
| Stale pointer | `expected_revision` or Active id mismatch | No write | stale DETAIL; Retry |
| Unauthorized | Manager / mechanic / anonymous | Layout deny; RPC `42501` | No write |
| Label-only entry | Display name without UUID | Not stored as an allowlist key; cannot classify | Reject if submitted as a key |
| Drift | Source UUID / fixture / enum ≠ generated TS / PG | `contracts:check` fails | Fail closed |

</intent-contract>

## Code Map

- `src/lib/booqable/contracts/{source-envelope.ts:9-53,check.ts:189-311,compatibility.ts:1-108}` -- Story 2.4 envelope. Copy const-array → Zod → `PG_ENUM_LABELS` → `extractPgEnumLabels` into new files. Do not change envelope vocabulary or `runContractsCheck`.
- `src/lib/booqable/contracts/index.ts` -- barrel; add new exports only.
- `src/lib/workshop-tasks/types.ts:17-23,74-83` -- `WORKSHOP_SETUP_CATEGORIES` and labels. Import these; do not fork slugs.
- `src/lib/workshop-tasks/actions/checklist-version-actions.ts:95-135` -- `withAuth` + RPC + stale map + `revalidatePath`. Copy; this story is admin-only.
- `supabase/migrations/20260813140000_activate_immutable_template_version.sql:33-70` -- DEFINER, `get_user_role`, `expected_revision`, `expected_active_version_id`. Do not edit this file.
- `supabase/migrations/20260814140000_source_envelope_vocabulary.sql` -- latest migration; new file must sort after it.
- `supabase/tests/database/booqable-integration/001_source_envelope_vocabulary.pgtap.sql` -- add `002_*.pgtap.sql`; do not edit `001`.
- `tests/booqable-contracts/envelope-invariants.test.ts` -- copy file-read + injected-SQL drift pattern.
- `package.json:15` / `.github/workflows/contracts-drift.yml` -- extend `contracts:check` to the new invariants file.
- `src/app/workshop/templates/{layout.tsx:6-27,page.tsx:1-50}` -- role gate + server page + `DataLoadError`. New route is Admin-only; do not change templates or `src/app/workshop/layout.tsx`.
- `src/app/workshop/templates/[id]/_components/ActivateVersionPanel.tsx` -- Dialog confirm, pending, stale Retry.
- `src/lib/booqable/{sync.ts,ingestion-guard.ts}` -- read-only.
- `_bmad-output/implementation-artifacts/spec-2-4-define-versioned-source-envelopes-and-result-semantics.md` -- continuity: no resource attribute lists; writers unchanged.

## Tasks & Acceptance

**Execution:**
- `src/lib/booqable/contracts/classification-config.ts` -- editable Zod source: UUID allowlist plus display-only labels, five setup slots, mode enum, provenance, frozen v1 snapshot -- one contract source
- `src/lib/booqable/contracts/classification-check.ts` -- drift engine using `extractPgEnumLabels`; fail on identifier / fixture / enum mismatch or unproven targeted -- named check
- `src/lib/booqable/contracts/index.ts` -- re-export the new contract and check
- `supabase/migrations/20260814160000_classification_mapping_config.sql` -- enums, versioned config tables, one-Active unique index, admin-only approve / rollback RPCs, no app-role DML -- atomic capability
- `supabase/tests/database/booqable-integration/002_classification_mapping_config.pgtap.sql` -- vocabulary, first approve, supersede, rollback, targeted reject, stale, unauthorized, no DML -- local DB proof
- `src/lib/booqable/classification-config/{types.ts,data.ts,actions.ts,index.ts}` -- Zod inputs, loader `{ config, error }`, `withAuth` approve / rollback -- feature module
- `src/app/workshop/classification/{layout.tsx,page.tsx,loading.tsx,_components/ClassificationConfigPanel.tsx}` -- Admin-only page: display-only labels, Active snapshot, approve / rollback / supersede confirm -- Admin surface
- `tests/booqable-contracts/classification-config-invariants.test.ts` -- cover the I/O matrix and assert source labels match the migration text -- fixture-check + edge cases
- `package.json` / `.github/workflows/contracts-drift.yml` -- `contracts:check` runs both contract test files -- CI is the drift surface
- `_bmad-output/project-context.md` -- record the classification contract path, broad-mode default, and empty-allowlist fail-closed -- later stories consume this

**Acceptance Criteria:**
- Given bike ProductGroups require classification, when configuration is prepared, then a versioned allowlist stores actual ProductGroup UUIDs with provenance, and labels and analyst-candidate names remain display-only and cannot create tasks.
- Given Setup Category mapping is not fully proven, when the active configuration contract is selected, then broad `review_updated_configuration` is the explicit safe default, and targeted mode cannot activate until all five categories have stable approved identifiers and complete null/unknown/changed/removed fixtures.
- Given an Admin approves, rolls back, or supersedes classification or mapping configuration, when the capability commits, then revision, approver, time, provenance, mode, and prior version are recorded atomically, and drift checks fail closed when approved identifiers or fixtures no longer match the editable source and generated representations.

## Spec Change Log

## Review Triage Log

### 2026-08-14 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 8: (high 1, medium 4, low 3)
- defer: 0
- reject: 16
- addressed_findings:
  - `[high]` `[patch]` Success no longer leaves the approve/rollback dialog pending after `router.refresh()`
  - `[medium]` `[patch]` Loader error hides the panel so Approve cannot look like a first-approve against a failed read
  - `[medium]` `[patch]` Stale rollback Retry shows an error when the Active pointer is null
  - `[medium]` `[patch]` `isSetupSlotProven` treats trimmed-empty identifier/fixture values as unproven
  - `[medium]` `[patch]` Thrown panel errors always show the stable fallback and log with a `classification:` prefix
  - `[low]` `[patch]` First-approve action test pins unproven v1 `setup_slots`
  - `[low]` `[patch]` Added panel/loader/redirect tests for success close, stale pointers, `NEXT_REDIRECT`, and query error
  - `[low]` `[patch]` Drift test now injects targeted+unproven and expects fail-closed

## Design Notes

Runtime classification reads the Active database snapshot, not live file edits. Approve copies the current source into a new Active row. Rollback restores a prior snapshot without editing the file. Do not invent ProductGroup UUIDs or Booqable setup-field names — empty and unproven is the v1 contract. Targeted exists in the enum so later stories can enable it without a vocabulary break.

## Verification

**Commands:**
- `npx tsc --noEmit` -- no new errors; `strict` unchanged
- `npm run lint` -- succeeds
- `npm run test:unit` -- existing tests plus classification invariants pass
- `npm run contracts:check` -- envelope and classification drift pass
- `npx supabase db reset` -- local PG 17 applies the new migration
- `npx supabase test db` -- new pgTAP and existing nested trees pass

## Auto Run Result

Status: done

**Summary:** Story 2.5 owns one versioned classification and Setup mapping contract. Admins approve, supersede, or roll back an empty fail-closed v1 snapshot. Broad `review_updated_configuration` is the only selectable mode until all five Setup Categories are fixture-proven. Existing Booqable writers were not changed.

**Files changed:**
- `src/lib/booqable/contracts/classification-config.ts` — editable Zod source: empty UUID allowlist, display-only labels, five unproven setup slots, mode enum, provenance, frozen v1 snapshot
- `src/lib/booqable/contracts/classification-check.ts` — drift engine; fail-closed on identifier/fixture/enum mismatch or unproven targeted
- `src/lib/booqable/contracts/index.ts` — barrel exports for the new contract and check
- `supabase/migrations/20260814160000_classification_mapping_config.sql` — enums, versioned tables, one-Active index, admin-only approve/rollback RPCs
- `supabase/tests/database/booqable-integration/002_classification_mapping_config.pgtap.sql` — vocabulary and capability proof
- `src/lib/booqable/classification-config/` — loader, `withAuth` actions, types
- `src/app/workshop/classification/` — Admin-only page with approve / supersede / rollback confirm
- `tests/booqable-contracts/classification-config-*.test.ts` — I/O matrix, actions, panel, loader
- `tests/workshop-classification/layout.test.tsx` — Admin-only layout gate
- `package.json` / `.github/workflows/contracts-drift.yml` — `contracts:check` runs both contract files
- `project-context.md` — classification contract path, broad-mode default, empty-allowlist fail-closed

**Review findings:** 8 patches applied (high 1, medium 4, low 3); 0 deferred; 16 rejected.

**Follow-up review recommendation:** true (patched: high 1, medium 4, low 3; score `3 × 4 + 1 × 3 = 15`, plus one high; threshold 5).

**Verification:**
- `npx tsc --noEmit` — exit 0, `strict: true` unchanged
- `npm run lint` — exit 0, 19 pre-existing `<img>` warnings
- `npm run test:unit` — 16 files / 185 tests pass
- `npm run contracts:check` — 38 tests pass
- `npx supabase test db` — 8 files / 247 tests PASS, including `booqable-integration/002_classification_mapping_config.pgtap.sql`
- `npx supabase db reset` — blocked in this environment; migration already applied locally and re-proved by `test db`

**Residual risks:** Nothing classifies live ProductGroups yet. The v1 allowlist is empty and Setup slots are unproven by design. There is no nav link to `/workshop/classification` (admins open the route directly). `sync.ts`, the webhook, and sandbox routes still do not consume this contract.
