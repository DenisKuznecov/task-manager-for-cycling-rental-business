# Current Authority — Workshop Source Classification

Effective: 2026-08-14

Use this index when sources disagree. Earlier research and reviews remain evidence, not current implementation authority.

## Planning Authority

1. `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-14.md`
2. `_bmad-output/planning-artifacts/prds/prd-echelon-cycling-hub-admin-2026-08-07/prd.md`
3. `_bmad-output/planning-artifacts/prds/prd-echelon-cycling-hub-admin-2026-08-07/addendum.md`
4. `_bmad-output/planning-artifacts/architecture/architecture-echelon-cycling-hub-admin-2026-08-10/ARCHITECTURE-SPINE.md`
5. `_bmad-output/planning-artifacts/ux-designs/ux-echelon-cycling-hub-admin-2026-08-07/EXPERIENCE.md`
6. `_bmad-output/planning-artifacts/ux-designs/ux-echelon-cycling-hub-admin-2026-08-07/DESIGN.md`
7. `_bmad-output/planning-artifacts/epics.md`

## Implementation Authority

- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/correction-handoff-workshop-source-classification-2026-08-14.md`
- `_bmad-output/implementation-artifacts/correct-course-workflow-execution-log-2026-08-14.md`
- `_bmad-output/project-context.md`
- `src/lib/booqable/contracts/workshop-tags.ts`
- `src/lib/workshop-tasks/types.ts`
- the newest idempotent `supabase/migrations/*_add_e_mtb_checklist_category.sql`

## Acceptance Authority

- `tests/booqable-contracts/workshop-tags.test.ts`
- existing source-envelope contract tests
- existing checklist template tests plus E-MTB coverage
- local `supabase db reset`
- local `supabase test db`
- `npm run contracts:check`
- focused unit tests, lint, and TypeScript checks
- `_bmad-output/planning-artifacts/implementation-readiness-report-2026-08-14-corrected.md`

## Superseded or Historical Evidence

- `_bmad-output/implementation-artifacts/spec-2-5-approve-bike-classification-and-setup-mapping-configuration.md` is superseded.
- Earlier research and review documents dated before this correction remain historical inputs. They do not override the source-first Booqable tag contract.
- Commit `0db741b` and its uncommitted follow-up refactors are rollback evidence, not an active architecture.

## Controlling Decisions

- Booqable `tag_list` is authoritative for the six Workshop bike categories.
- Exact StockItem external identity remains the Bike Task identity.
- ProductGroup tags are exact `workshop-*-bike` values; Bundles use corresponding `workshop-*-bike-bundle` values and must agree with their contained bike ProductGroup.
- Persist admitted Product, ProductGroup, and Bundle tag lists as source facts.
- Untagged entities create no Workshop work; unknown, multiple, conflicting, or bundle-disagreeing Workshop tags fail closed with an Integration Incident.
- No local ProductGroup UUID allowlist or Workshop classification screen exists.
- Accessory tags remain uninterpreted until Epic 6; broad `review_updated_configuration` is the initial relevant-change mode.
- Database migration execution is local only. Remote DDL remains merge-driven CI.
