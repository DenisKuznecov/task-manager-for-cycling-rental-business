---
title: Implementation Readiness Assessment — Workshop Source Classification Correction
date: 2026-08-14
status: READY
readiness_gate: PASS
supersedes: implementation-readiness-report-2026-08-12.md
scope: corrected Workshop planning and implementation package
---

# Implementation Readiness Assessment — Corrected Package

## Final Assessment

**READY**

The corrected planning and implementation package is internally consistent and verified. Story 2.5 may proceed as “Expand the Canonical Booqable Projection.” No remote database was touched.

## Decision Alignment

- Booqable `tag_list` is the single category authority.
- ProductGroup tags cover exactly road, E-road, E-city, gravel, MTB, and E-MTB.
- Bundle tags use the corresponding `workshop-*-bike-bundle` value and must agree with exactly one contained bike ProductGroup.
- Admitted Product, ProductGroup, and Bundle tags are source facts to be persisted by the canonical projection.
- Exact StockItem external identity remains the Bike Task identity.
- Untagged entities create no Workshop work.
- Unknown, multiple, conflicting, or bundle-disagreeing Workshop tags fail closed with an Integration Incident.
- Accessory tags remain uninterpreted until Epic 6.
- Broad `review_updated_configuration` is the initial relevant-change mode.
- The local UUID allowlist, Active classification snapshot, approval RPCs, and Workshop classification screen are withdrawn.

## Artifact Readiness

### PRD and Addendum

- FR-1 category admission now uses the six controlled source tags without changing exact StockItem identity.
- FR-11 covers six checklist categories including E-MTB.
- FR-26 makes broad review initial and reserves targeted interpretation for Epic 6.
- Source ownership, dependencies, non-goals, rollout evidence, metrics, and open questions are aligned.

### Architecture

- AD-3 projects Product/ProductGroup/Bundle `tag_list`.
- AD-13 validates controlled ProductGroup/Bundle vocabulary, inheritance/agreement, exclusion, and incident branches.
- AD-14 and activation gates use source-data seeding/validation instead of a local Active allowlist.
- Accessory-tag interpretation remains an Epic 6 boundary.

### UX

- EXPERIENCE and DESIGN both cover E-MTB.
- Both explicitly exclude a category-classification/tag-approval screen.
- Source category remains read-only task context; source conflicts use Integration Incident presentation.

### Epics and Traceability

- Original Story 2.5 is withdrawn and its implementation spec is superseded.
- Former Stories 2.6–2.10 are now 2.5–2.9.
- New Story 2.10 seeds and validates source tags after atomic ingestion.
- Story 3.1 consumes persisted ProductGroup/Bundle tags while retaining exact StockItem identity.
- Story 6.2 owns later accessory-tag interpretation with broad review as the initial mode.
- Story 9.2 requires seeded six-category proof rather than allowlist/mapping approval.
- FR-11 remains assigned to Epic 1; FR-26 remains assigned to Epic 6.
- AR-24 and AR-25 encode the corrected source and configuration-change boundaries.
- Sprint status and Epic 2 context match the corrected numbering.

## Implementation Readiness

- Removed `/workshop/classification` and all route components.
- Removed `src/lib/booqable/classification-config`.
- Removed classification config/check contracts and barrel exports.
- Removed feature-branch-only classification migration and pgTAP proof.
- Removed classification action/data/UI/invariant/layout tests.
- Removed all live source, test, migration, package, and CI references to the withdrawn implementation.
- Added one source tag contract at `src/lib/booqable/contracts/workshop-tags.ts`.
- Made the source tag contract the single owner of `WORKSHOP_BIKE_CATEGORIES`.
- Added E-MTB TypeScript schema/filter/label coverage.
- Added idempotent local migration `20260814144737_add_e_mtb_checklist_category.sql`.
- Added E-MTB pgTAP and source-tag unit coverage.
- Inspected and explicitly removed the pre-existing uncommitted classification follow-up refactors; no destructive Git reset or checkout was used.

## Verification Evidence

- PASS — no stale live classification-config/allowlist references in `src`, `tests`, or `supabase`.
- PASS — no stale live Story 2.5/2.6/2.10 keys after renumbering.
- PASS — `git diff --check`.
- PASS — `npm run contracts:check`: 37 tests.
- PASS — focused checklist category tests: 20 tests.
- PASS — `npx tsc --noEmit`.
- PASS — local `supabase db reset`; corrected migration applied.
- PASS — local `supabase test db`: 8 files, 205 tests.
- PASS — E-MTB migration reapplied directly to local PostgreSQL, proving repeatable drop/create constraints and function replacement.
- PASS — `npm run test:unit`: 12 files, 168 tests.
- PASS — `npm run lint`: 0 errors; 19 pre-existing image/alt warnings outside this change.
- PASS — `npm run build`: production build and route generation.
- PASS — independent artifact readiness audit: no blockers.
- PASS — independent implementation correction audit: no blockers.
- PASS — formal `bmad-sprint-planning` implementation-readiness gate: the corrected epics are implementable without inventing unrecorded product, architecture, or UX decisions.

Generated database types were not rewritten because the migration changes only check constraints and function validation; it introduces no table column or PostgreSQL type-surface change.

## Residual Risks

- Actual Booqable source data still needs Story 2.10 seeding and validation before task derivation activation.
- Tag persistence into the canonical projection belongs to corrected Story 2.5 and is not retrofitted into the legacy sync writer.
- Accessory-tag vocabulary and targeted Setup mapping remain intentionally undefined until Epic 6 obtains complete source-backed fixtures.
- Existing lint warnings remain outside this correction and do not affect readiness.

## Implementation Entry Point

Proceed with corrected Story 2.5:

> Expand the canonical Booqable projection to persist admitted Product, ProductGroup, and Bundle tag lists as read-only source facts while preserving brownfield consumers and exact identity boundaries.
