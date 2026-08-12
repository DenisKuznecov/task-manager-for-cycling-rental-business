---
title: 'Browse Governed Workshop Checklist Templates'
type: 'feature'
created: '2026-08-12'
status: 'done'
baseline_commit: '7d549060f1639b3959c468dbab5d28698ce05829'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/project-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Admins and Managers have no authoritative way to inspect which Prep and Return checklist standards exist for each supported bike category or which version is active. The Workshop area has no checklist persistence model.

**Approach:** Introduce the read-only checklist-template foundation and an authenticated Template Library at `/workshop/templates`. It will expose PostgreSQL-derived versions and textual states through URL-persisted phase, category, and status filters while preserving existing Workshop behavior outside the new route.

## Boundaries & Constraints

**Always:** Use an idempotent local-only UUID migration for only template/version browsing structures. Use RLS and a `security_invoker` PostgreSQL read model for Admin/Manager reads; loaders return safe empty data plus `error`, and filtering, sorting, and status stay in PostgreSQL. Use Server Component URL state, textual status, retryable errors, specific successful-empty states, and loading feedback.

**Ask First:** Changing `/workshop` dashboard access; introducing Items, mutations, events, detail editing, or Bike Tasks; adding a test framework or applying a migration beyond local Supabase.

**Never:** Use service-role access, client role checks, client-side aggregation/reduction, direct client table access, or a success empty state when the loader failed. Do not grant mechanic, partner, anonymous, `PUBLIC`, or unintended table/view privileges; do not apply schema changes to staging or production.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Filters match | Valid URL parameters and versions | Rows show phase, category, version, and textual status; URL reproduces the view | Unsupported values normalize safely |
| No match | Valid filters and zero rows | Filter-specific empty state | Not loading or failure |
| Query fails | View query fails | Safe empty rows and Retry error banner | Log `loadWorkshopChecklistTemplates:`; never show success-empty |
| Unauthorized/sessionless | Mechanic/Partner or no session | Denied surface or login redirect | RLS/auth remains authoritative |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260608102505_remote_schema.sql` -- defines `user_role`, the `security_invoker` `bike_fits_view` precedent, and Admin/Manager SELECT policy language.
- `supabase/migrations/20260609130457_fix_rls_auth_uid_subquery.sql` -- requires `(select auth.uid())` in role lookups and demonstrates idempotent drop-then-create policies.
- `supabase/migrations/20260729140000_wiki_category_icon_and_counts_view.sql` -- recent view migration reference; its anonymous grant must not be copied because this story forbids it.
- `supabase/migrations/20260812160000_create_workshop_checklist_template_library.sql` -- new, local-only idempotent migration for checklist templates, immutable version records, a `security_invoker` library view, restrictive RLS, and authenticated-only grants.
- `supabase/tests/database/workshop-tasks/001_checklist_template_library.pgtap.sql` -- first repository pgTAP proof for the template schema, view, allowed reads, and denied writes/direct reads.
- `src/lib/wiki/data/wiki.ts` and `src/lib/wiki/types/records.ts` -- loader/mapping, typed filter validation, and `{ data, error }` failure semantics to reuse.
- `src/lib/workshop-tasks/types.ts`, `data.ts`, and `index.ts` -- new workshop-template types, PostgreSQL-view loader, filter normalization, and feature barrel.
- `src/app/workshop/layout.tsx` -- parent admits mechanics; do not change it. `src/app/workshop/templates/layout.tsx` must narrow access to Admin/Manager.
- `src/app/wiki/layout.tsx`, `src/app/orders/layout.tsx`, and `src/lib/profile.ts` -- authenticated, role-aware layout guard precedents.
- `src/app/orders/page.tsx` and `src/app/orders/_components/AllOrdersTable.tsx` -- Server Component search-param normalization and client controls that update URL state.
- `src/components/DataLoadError.tsx`, `src/app/wiki/_components/WikiLoadingSkeleton.tsx`, and `@/ui/layouts/DefaultPageLayout` -- error banner and loading-orientation reuse.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20260812160000_create_workshop_checklist_template_library.sql` -- create only UUID-backed template and version browse entities; expose the read model through a `security_invoker` view; enable RLS with Admin/Manager SELECT policies and no write policies; make all DDL and policies rerunnable and grant only the intended authenticated roles -- establishes an authoritative, non-writable boundary.
- [x] `supabase/tests/database/workshop-tasks/001_checklist_template_library.pgtap.sql` -- add local pgTAP setup and assertions for the schema/view, Admin/Manager library reads, and denied Mechanic/Partner/anonymous reads and authenticated writes -- proves the database boundary independently of the UI.
- [x] `src/lib/workshop-tasks/types.ts` -- define the view-row/domain types, supported phase/category/status filter values, textual status mapping, and safe normalizers -- keeps unsupported URL input out of the query.
- [x] `src/lib/workshop-tasks/data.ts` and `src/lib/workshop-tasks/index.ts` -- implement and export `loadWorkshopChecklistTemplates` against the read-model view; apply normalized filters and display ordering in PostgreSQL; log `loadWorkshopChecklistTemplates:` and return empty rows plus an error on failure -- gives the Server Component safe, authoritative data.
- [x] `src/app/workshop/templates/layout.tsx` -- add an authenticated Admin/Manager-only nested guard and page layout without altering `/workshop` dashboard access -- denies the parent route's mechanic allowance for this surface.
- [x] `src/app/workshop/templates/page.tsx` and `src/app/workshop/templates/_components/TemplateLibrary.tsx` -- server-load normalized `phase`, `category`, and `status` URL parameters; render phase/category/version/textual-status rows; have accessible filter controls replace only URL state and preserve the current selection -- makes views shareable and server-refreshed.
- [x] `src/app/workshop/templates/loading.tsx` and `src/app/workshop/templates/_components/TemplateLibraryLoadingSkeleton.tsx` -- provide library-shaped loading feedback using existing Subframe skeleton/layout primitives -- preserves orientation while filters or rows resolve.

**Acceptance Criteria:**
- Given a fresh or partially applied local schema, when the checklist-library migration runs again, then it succeeds without creating non-browsing workshop entities and no role has a direct write path.
- Given an Admin or Manager visits `/workshop/templates` with records available, when the page resolves, then it displays PostgreSQL-derived phase, category, version number, and text labels `Draft`, `Active`, or `Superseded`.
- Given a valid phase, category, or status filter is changed, when the resulting URL is refreshed or shared, then it restores the same database-filtered ordered result without client-side aggregation.
- Given a valid filtered result contains no versions, when the page resolves successfully, then it presents an empty state that identifies the active filtering context.
- Given the view query fails, when the page renders, then the loader logs its prefixed error, returns safe empty rows, and renders a retryable error banner rather than a successful-empty state.
- Given a Mechanic, Partner, anonymous user, or direct relation query is evaluated, when authorization applies, then the nested route denies access and RLS denies the library read; given an Admin or Manager, then the view read succeeds while direct writes remain denied.
- Given the route is pending on a supported viewport, when its loading UI appears and then resolves, then controls and status labels are keyboard reachable, focus-visible, readable, and do not rely on color alone.

## Design Notes

The template library is deliberately a separate nested route: the existing Workshop dashboard continues to permit mechanics, while its child guard narrows this governed administrative surface. The view is an RLS-enforcing `security_invoker` read model; the client receives rendered rows and only changes URL parameters.

## Verification

**Commands:**
- `supabase migration up` -- expected: the new migration applies to the local stack and can be rerun safely.
- `supabase test db` -- expected: pgTAP proves the schema, view, allowed reads, and denied paths locally.
- `npm run lint` -- expected: changed TypeScript and React files pass the repository ESLint configuration.

**Manual checks (if no CLI):**
- As Admin/Manager, verify each filter produces a reproducible URL, matching rows, filtered empty state, error state, loading skeleton, and keyboard navigation; as Mechanic/Partner, verify `/workshop/templates` is denied.

## Suggested Review Order

**Route and data boundary**

- Start with server URL normalization, error state, and the client-library handoff.
  [`page.tsx:12`](../../src/app/workshop/templates/page.tsx#L12)

- Confirm PostgreSQL owns filtering and display ordering while failures stay render-safe.
  [`data.ts:20`](../../src/lib/workshop-tasks/data.ts#L20)

- Inspect the secondary guard that narrows Workshop access to administrative roles.
  [`layout.tsx:9`](../../src/app/workshop/templates/layout.tsx#L9)

**Database authority**

- Review the idempotent schema, one-active-version invariant, RLS, and invoker read model.
  [`20260812160000_create_workshop_checklist_template_library.sql:4`](../../supabase/migrations/20260812160000_create_workshop_checklist_template_library.sql#L4)

**URL controls and presentation**

- Follow the URL-only filter updates and accessible table, empty, and status rendering.
  [`TemplateLibrary.tsx:29`](../../src/app/workshop/templates/_components/TemplateLibrary.tsx#L29)

- Check the canonical URL-domain types and safe unsupported-value normalization.
  [`types.ts:1`](../../src/lib/workshop-tasks/types.ts#L1)

**Verification and tooling**

- Validate database privileges, direct-read denial, and active-version uniqueness locally.
  [`001_checklist_template_library.pgtap.sql:1`](../../supabase/tests/database/workshop-tasks/001_checklist_template_library.pgtap.sql#L1)

- Review unit coverage for server/UI behavior and the minimal Vitest configuration.
  [`ui.test.tsx:27`](../../tests/workshop-template-library/ui.test.tsx#L27)

- Confirm the explicit Node runtime contract and repeatable unit-test command.
  [`package.json:5`](../../package.json#L5)
