---
title: 'Seed and Validate Workshop Source Data'
type: 'feature'
created: '2026-08-18'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
baseline_revision: '772e06ced7af63aeeb89e581db585ce13ace3560'
context:
  - '{project-root}/_bmad-output/project-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Workshop tag contracts already classify the six bike categories, but the graph gate, live-payload fixture, coordinator apply path, and pgTAP only exercise `workshop-road-bike`. Bundle extras are missing from the fixture, so later admission cannot trust that every supported category persists as a source fact.

**Approach:** Fixture-prove all six ProductGroup and Bundle tags through admission, `tag_list` persistence, and fail-closed quarantine. Do not change tag logic, the live include, or any writer. Accessory tags stay opaque. Live import, operator seed, and Bike Tasks stay deferred.

## Boundaries & Constraints

**Always:** ProductGroups use exactly one of `workshop-road-bike`, `workshop-e-road-bike`, `workshop-e-city-bike`, `workshop-gravel-bike`, `workshop-mtb-bike`, or `workshop-e-mtb-bike`. Bundles use the matching `workshop-*-bike-bundle` tag. Persist complete Product, ProductGroup, and Bundle `tag_list` values as source facts — never replace them with a category. Untagged resources create no Workshop membership. Unknown, multiple, conflicting, or bundle-disagreeing Workshop tags fail closed. Ordinary and accessory tags remain persisted and uninterpreted. Repeat validation is idempotent. Prove locally only.

**Ask First:** A change to the six-tag vocabulary, `WORKSHOP_TAG_INCIDENT_CODES`, admission rules, how tag failures map to `unauthoritative_addition` / `field_name: "tag_admission"`, the nested-order include, fingerprint field bindings, or a committed seed migration / operator seed command.

**Never:** Change `sync.ts`, the webhook, sandbox route, or brownfield readers. Do not fetch standalone catalog collections, interpret accessory tags, add a classification UI, create Bike Tasks, run a live Booqable import, or modify a remote database.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| All six categories | Valid graph per category with matching Product, Bundle, and BundleItem | `admitCanonicalGraph` accepts; full `tag_list` values persist on ProductGroup, Product, and Bundle | N/A |
| Untagged | ProductGroup has only ordinary tags | Graph rejected with `tag_admission` / `untagged`; no membership written | Fail closed |
| Invalid Workshop tags | Unknown, multiple, conflicting, Product mismatch, or Bundle disagreement | Graph rejected; coordinator quarantines with `unauthoritative_addition` and `field_name: "tag_admission"`; canonical rows unchanged | Deduplicated incident |
| Accessory tags | `workshop-helmet` or similar on a non-bike line | Tags persist as opaque fingerprint facts; they do not classify or create membership | N/A |
| Repeat proof | Same admitted fixtures applied twice | Second pass is `no_op`; no duplicate rows or incidents beyond the existing dedup key | Idempotent |

</frozen-after-approval>

## Code Map

- `src/lib/booqable/contracts/workshop-tags.ts:6-64,167-248` -- read-only six-tag vocabulary, classifiers, inheritance, and bundle agreement. Reuse `WORKSHOP_BIKE_CATEGORIES` for parameterized proofs.
- `src/lib/booqable/contracts/canonical-projection.ts:1410-1557` -- `admitTaggedResource` / `admitCanonicalGraph` reject untagged or incident classifications with `reason: "tag_admission"`.
- `src/lib/booqable/ingestion-coordinator.ts` `prepareCanonicalApply` -- read-only; admission rejection becomes `quarantined` + `unauthoritative_addition` + `field_name: admission.reason`.
- `src/lib/booqable/canonical-adapter.ts:15-18,221-254,517-523` -- read-only; maps `included` catalog extras via `byType`. Product does not inherit ProductGroup tags here. Live include stays `customer,coupon,lines.planning.stock_item_plannings.stock_item.barcode`.
- `tests/fixtures/booqable/canonical-order-graph.json` -- plants `pg_road` / `prod_road` plus a road Bundle and BundleItem in `included`.
- `tests/booqable-contracts/workshop-tags.test.ts:62-167` -- already proves all six classify/agreement branches; do not duplicate.
- `tests/booqable-contracts/canonical-projection.test.ts:52-215` -- `validGraph(category)` plus `it.each(WORKSHOP_BIKE_CATEGORIES)` admits all six matching Product/Bundle graphs; graph gate covers `conflicting_resource_tag`.
- `tests/booqable-contracts/fingerprints-and-coordinator.test.ts:168-216,437-446,498-516` -- fixture normalize asserts Bundle `tag_list`; accessory tags stay opaque sorted facts; coordinator quarantines `tag_admission` as `unauthoritative_addition`.
- `supabase/tests/database/booqable-integration/002_canonical_projection.pgtap.sql:54-199` -- inserts and reads back all six ProductGroup/Product `tag_list` values plus one Bundle `tag_list`.
- `supabase/tests/database/booqable-integration/004_apply_canonical_source_state.pgtap.sql` -- later apply persists Bundle `tag_list`/`source_fingerprint`; quarantined `tag_admission` payload includes `pg_tag_admission_blocked` and records `unauthoritative_addition` with `field_name: "tag_admission"`.
- `package.json` `contracts:check` -- already lists the TypeScript files above; do not add a new test file.
- Read-only: `src/lib/booqable/sync.ts`, `src/app/api/webhooks/booqable/route.ts`, sandbox sync-orders, `src/lib/booqable/contracts/brownfield-consumers.ts`.

## Tasks & Acceptance

**Execution:**
- [x] `tests/booqable-contracts/canonical-projection.test.ts` -- parameterize `admitCanonicalGraph` across all six categories with matching Product inheritance and Bundle agreement; add the missing `conflicting_resource_tag` graph-gate case -- the classifier already covers six categories, the graph gate does not.
- [x] `tests/fixtures/booqable/canonical-order-graph.json` -- add a road Bundle and BundleItem in `included` so adapter normalization plants catalog extras the live include cannot return.
- [x] `tests/booqable-contracts/fingerprints-and-coordinator.test.ts` -- assert the fixture now normalizes the Bundle `tag_list` and still treats accessory tags as opaque sorted facts.
- [x] `supabase/tests/database/booqable-integration/002_canonical_projection.pgtap.sql` -- insert and read back all six ProductGroup and Product `tag_list` values plus one Bundle `tag_list`; update `plan()`.
- [x] `supabase/tests/database/booqable-integration/004_apply_canonical_source_state.pgtap.sql` -- apply one graph that persists a Bundle `tag_list`/`source_fingerprint`; quarantine a `tag_admission` payload with `unauthoritative_addition` and no canonical mutation; update `plan()`.

**Acceptance Criteria:**
- Given each of the six bike categories, when a matching ProductGroup, Product, and Bundle graph is admitted, then TypeScript and PostgreSQL both persist the complete `tag_list` and the matching bundle tag agrees with exactly one contained bike ProductGroup.
- Given an untagged or invalid Workshop-tagged graph, when admission or apply runs, then no membership is written and a catalogue-defined fail-closed result is recorded.
- Given accessory or ordinary non-Workshop tags, when fixtures are inspected, then they remain persisted source facts and never classify a category.
- Given the same local fixtures run twice, when validation repeats, then the second pass is idempotent and no remote database is modified.

## Spec Change Log

## Design Notes

Catalog Product, ProductGroup, and Bundle rows are planted as fixture `included` extras or in-memory graph arrays. Do not change the frozen nested-order include. Tag-classification codes stay on `WorkshopTagClassification`; the coordinator still records `unauthoritative_addition` with `field_name: "tag_admission"`.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: strict TypeScript passes.
- `npm run lint` -- expected: no new lint errors.
- `npm run contracts:check` -- expected: workshop-tags, projection, and coordinator fixtures pass.
- `npm run test:unit` -- expected: all Vitest tests pass.
- `npx supabase test db` -- expected: `002` and `004` pgTAP proofs pass locally, including new `tag_list` and `tag_admission` assertions.

## Review Triage Log

### 2026-08-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 2: (high 0, medium 1, low 1)
- defer: 0
- reject: 15
- addressed_findings:
  - `[medium]` `[patch]` Quarantined `tag_admission` payloads now include `pg_tag_admission_blocked` in `graph.product_groups` (replayed against the already-applied `ord_bundle_tags` order) so the no-write assertion can fail if apply writes.
  - `[low]` `[patch]` Code Map bullets now describe the landed fixture, six-category admission, and `tag_admission` apply proofs.

## Auto Run Result

Status: done

Summary: Story 2.10 is fixture-and-proof only. All six bike categories now admit through the graph gate with matching Product and Bundle tags. The live-payload fixture plants a road Bundle and BundleItem. Local TypeScript and pgTAP checks persist complete `tag_list` values and fail closed on `tag_admission` without mutating canonical rows. Tag logic, the live include, and every writer are unchanged. Live import, operator seed, and Bike Tasks stay deferred.

Files changed:
- [canonical-projection.test.ts](../../tests/booqable-contracts/canonical-projection.test.ts) — `it.each(WORKSHOP_BIKE_CATEGORIES)` admission plus `conflicting_resource_tag` graph-gate case
- [canonical-order-graph.json](../../tests/fixtures/booqable/canonical-order-graph.json) — plants road Bundle and BundleItem extras the live include cannot return
- [fingerprints-and-coordinator.test.ts](../../tests/booqable-contracts/fingerprints-and-coordinator.test.ts) — fixture Bundle `tag_list`, opaque accessory facts, and `tag_admission` quarantine
- [002_canonical_projection.pgtap.sql](../../supabase/tests/database/booqable-integration/002_canonical_projection.pgtap.sql) — persists all six ProductGroup and Product `tag_list` values plus one Bundle
- [004_apply_canonical_source_state.pgtap.sql](../../supabase/tests/database/booqable-integration/004_apply_canonical_source_state.pgtap.sql) — applies Bundle `tag_list`/`source_fingerprint`; quarantines `tag_admission` without writing `pg_tag_admission_blocked`
- [deferred-work.md](deferred-work.md) — records the live-import and pre-pilot splits from this story
- [sprint-status.yaml](sprint-status.yaml) — story 2.10 marked done

Review findings breakdown:
- Patches applied: 2 (high 0, medium 1, low 1)
- Items deferred: 0
- Items rejected: 15 (six-way SQL Bundle persist, pre-baked-admission-as-SQL-admission, accessory pgTAP, forge memlog, and similar over-reads of the split-surface proof)

Follow-up review recommendation: `false` (patched high 0, medium 1, low 1; score `3 × 1 + 1 × 1 = 4`)

Verification performed:
- `npx tsc --noEmit` — pass
- `npm run lint` — 0 errors (19 pre-existing `<img>` warnings)
- `npm run contracts:check` — 81 passed
- `npm run test:unit` — 212 passed
- `npx supabase test db` — 317 passed, including `002` and `004`

Residual risks:
- Catalog extras still only exist as fixture `included` plants. The live include cannot return Product, ProductGroup, or Bundle on a real fetch (already deferred from 2.9).
- The JSON fixture proves road only. The other five categories are covered by in-memory graphs and pgTAP inserts, not live-payload extras.
- The database coordinator honors a TypeScript-prepared `tag_admission` quarantine. A non-empty rejected graph sent straight to SQL would still apply — existing coordinator behavior, not a new writer.
- Live import, operator seed, Bike Tasks, and accessory-tag interpretation stay deferred.
