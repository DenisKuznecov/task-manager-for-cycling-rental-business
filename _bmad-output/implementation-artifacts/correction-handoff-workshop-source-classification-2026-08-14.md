---
title: Workshop Source Classification Correction Handoff
date: 2026-08-14
status: implemented-pending-verification
scope: major
---

# Workshop Source Classification Correction Handoff

## Decision

Booqable `tag_list` is the category authority. The local ProductGroup UUID allowlist, Admin classification route, Setup mapping snapshot/RPC layer, and its feature-branch-only migration are withdrawn.

## Inspected Uncommitted Work

The pre-correction working tree contained follow-up refactors in:

- `src/app/workshop/classification/_components/ClassificationConfigPanel.tsx`
- `src/lib/booqable/classification-config/actions.ts`
- `src/lib/booqable/classification-config/index.ts`
- `src/lib/booqable/classification-config/mutation.ts`
- `tests/booqable-contracts/classification-config-actions.test.ts`

The changes moved RPC error mapping into `mutation.ts` and updated imports. They were inspected before rollback. Because every file belonged exclusively to the withdrawn classification surface, the correction removed them explicitly; no destructive Git reset or checkout was used.

## Rollback Inventory

Removed:

- `/workshop/classification` route, layout, loading state, panel, skeleton, and retry component
- `src/lib/booqable/classification-config`
- classification config/check contracts and barrel exports
- `20260814160000_classification_mapping_config.sql`
- classification pgTAP, unit, UI, data, action, invariant, and layout tests
- classification drift-test references from package scripts and CI

Retained as historical evidence:

- superseded Story 2.5 implementation spec
- Sprint Change Proposal approval record
- pre-correction readiness/research/review documents, clearly outside current authority

## Implemented Correction

- Added `src/lib/booqable/contracts/workshop-tags.ts` with six exact ProductGroup tags, six Bundle tags, Product inheritance validation, Bundle/ProductGroup agreement validation, and fail-closed incident outcomes.
- Made this contract the single owner of `WORKSHOP_BIKE_CATEGORIES`.
- Added E-MTB (`e-mtb` / `E-MTB`) to checklist TypeScript validation, filters, labels, and tests.
- Added idempotent local migration `20260814144737_add_e_mtb_checklist_category.sql`.
- Added pgTAP coverage for E-MTB checklist draft persistence.
- Updated contract checks to run the source-tag test instead of the removed classification-config test.

## Epic 2 Handoff

1. Story 2.5 expands the canonical Booqable projection and persists complete Product/ProductGroup/Bundle `tag_list` values as source facts.
2. Story 2.6 preserves brownfield projection consumers.
3. Story 2.7 persists and recovers authoritative refresh work.
4. Story 2.8 runs bounded workers and reconciliation.
5. Story 2.9 applies canonical source state atomically.
6. Story 2.10 seeds and validates the six ProductGroup tags, matching Bundle tags, Product inheritance, agreement, untagged exclusion, and fail-closed branches.
7. Story 3.1 consumes the persisted ProductGroup/Bundle contract while exact StockItem identity remains physical membership identity.
8. Story 6.2 may interpret accessory tags only from complete source-backed evidence; broad review is the initial mode.

## Acceptance Tasks

- Confirm no source or runtime import references the removed classification config.
- Confirm all six category/tag mappings are exact and shared with checklist validation.
- Run `npm run contracts:check`.
- Run focused source-tag and Workshop template tests.
- Run `npm run lint` and TypeScript no-emit check.
- Run local `supabase db reset`.
- Run local `supabase test db`.
- Regenerate local database types if schema output changes.
- Run build and any existing implementation-readiness consistency checks.
- Publish `_bmad-output/planning-artifacts/implementation-readiness-report-2026-08-14-corrected.md` with a final READY / NOT READY result.

## Database Boundary

Only the local Supabase stack may receive migrations during this handoff. Staging and production remain untouched; remote migration execution is merge-driven CI only.
