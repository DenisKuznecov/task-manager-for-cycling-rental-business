---
title: 'Create a Draft Checklist Version'
type: 'feature'
created: '2026-08-13'
status: 'done'
baseline_commit: 'f54c73b0cc64fb7d40e30a10db08255059f8581c'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/project-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Admins and Managers can browse checklist versions but cannot start a replacement draft for a selected Prep/Return pairing.

**Approach:** From the Library’s selected phase and category, create a blank Draft through a privileged transactional capability that allocates the next version number and records an attributed creation event atomically, then redirect to its detail route. A draft with no Items is a valid empty definition.

## Boundaries & Constraints

**Always:** Use an idempotent local-only migration. Create only through a `SECURITY DEFINER` capability that authorizes Admin/Manager, validates phase/category, serializes on `(bike_category, phase)`, and atomically allocates the next version number plus an attributed creation event. Call it from `withAuth`; return `{ ok, id }` or `{ ok: false, error }`; revalidate Library and detail after success. Create Draft submits only when Library URL `phase` and `category` are specific (not `all`). Detail loaders return `{ version, error }` — query failure is an error state, not `notFound()`.

**Ask First:** Item CRUD; copying from Active; activation/reactivation; changing `/workshop` dashboard access; table DML policies or service-role writes; migrating beyond local Supabase.

**Never:** No app-role table/event DML; no `workshop_checklist_items`, Bike Tasks, client aggregation, or client role checks as authz. No mechanic/partner/anon/`PUBLIC` execute/write. Do not default an unspecified pairing, mutate Active/Superseded rows, claim success before the server result, or migrate staging/production.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Selected pairing | Admin/Manager; specific URL `phase`+`category` | New Draft + event; redirect to `/workshop/templates/{id}` with metadata and successful empty Items | N/A |
| Incomplete selection | `phase` or `category` is `all` | Control visible, not submittable; copy names the missing selection | No RPC |
| Concurrent creates | Two accepted creates, same pairing | Distinct monotonic versions; no overwrite/merge | Unique `(template_id, version_number)` |
| Unauthorized | Mechanic/Partner/anonymous | No write; nested route denied | Returned error / EXECUTE+RLS denial |
| Invalid input | Unsupported phase or category | No commit | Returned error; no event |
| Detail query fails | Loader error | Safe null version + retryable banner | Log `loadWorkshopChecklistVersion:`; not `notFound()` |
| Unknown version | No row, no error | `notFound()` | N/A |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260812160000_create_workshop_checklist_template_library.sql:4` -- SELECT-only templates/versions; no creator, revision, events, or writes. Do not edit.
- `supabase/migrations/20260708120000_add_onboarding_completed_at.sql:13` and `src/app/partner/_lib/onboarding-actions.ts:9` -- `SECURITY DEFINER` + `withAuth`/`rpc`/`{ ok, error }`.
- `src/app/wiki/_components/WikiHome.tsx:64` -- pending/inline-error/`router.push`. Copy UX, not `insert({})`.
- `src/lib/wiki/data/wiki.ts:175` / `src/app/wiki/edit/[id]/page.tsx:40` -- `{ item, error }` vs `notFound()`.
- `src/lib/workshop-tasks/{types.ts:1,data.ts:20,index.ts:1}` -- extend; keep library loader signature.
- `src/app/workshop/templates/_components/TemplateLibrary.tsx:53` -- Create Draft from URL pairing; link rows to `/workshop/templates/{id}`.
- `src/app/workshop/templates/layout.tsx:9` -- already Admin/Manager for `[id]`. Do not change this or `src/app/workshop/layout.tsx`.
- `supabase/tests/database/workshop-tasks/001_checklist_template_library.pgtap.sql:1` and `tests/workshop-template-library/ui.test.tsx:31` -- add `002_*.pgtap.sql`; extend UI tests; do not edit `001`.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20260813100000_create_draft_checklist_version.sql` -- `created_by`/`revision`; append-only events; `create_draft_checklist_version(phase, bike_category)` with lock, template upsert, monotonic allocation, attributed event, no app-role DML.
- [x] `supabase/tests/database/workshop-tasks/002_create_draft_checklist_version.pgtap.sql` -- Admin/Manager create, unauthorized denial, invalid input, event attribution, concurrent version numbers, no direct DML.
- [x] `src/lib/workshop-tasks/{types.ts,data.ts,actions/checklist-version-actions.ts,index.ts}` -- Zod-validate pairing; `withAuth` RPC; `loadWorkshopChecklistVersion` `{ version, error }`; revalidate Library and detail.
- [x] `src/app/workshop/templates/_components/TemplateLibrary.tsx` -- pending/inline-error/redirect Create Draft; accessible row links to detail.
- [x] `src/app/workshop/templates/[id]/{page.tsx,loading.tsx,_components/TemplateVersionDetail.tsx}` -- metadata plus successful empty-Items; error vs `notFound()`.
- [x] `tests/workshop-template-library/ui.test.tsx` -- incomplete-selection disable, redirect, retryable failure, row links.

**Acceptance Criteria:**
- Given a draft is created, when the Admin or Manager returns to the Library, then that version is reopenable from its row link without changing Active/Superseded rows.
- Given a fresh or partially applied local schema, when the migration runs again, then it succeeds and application roles still have no direct table or event DML.

## Spec Change Log

## Design Notes

Authenticated roles have no INSERT grant, so `insert({})` cannot allocate a version and event atomically. The capability takes `phase`+`bike_category` because the library view omits `template_id` and the template row may not exist. Lock `(bike_category, phase)` for upsert+allocation; Story 1.4 reuses that key. Stamp `created_by` and `revision=1`. Leave the library view unchanged.

## Verification

**Commands:**
- `supabase migration up` -- local migration applies and is rerunnable.
- `supabase test db` -- `002` proves create, denial, concurrency, no direct DML.
- `npm run test:unit` / `npm run lint` -- Library create/link cases and ESLint pass.

**Manual checks (if no CLI):**
- Admin/Manager: select Prep + category, create, empty-Items detail, reopen from the row; All selected → Create Draft does not submit. Mechanic/Partner: routes denied.

## Suggested Review Order

**Privileged allocation**

- Admin/Manager RPC locks the pairing, then allocates draft plus event.
  [`20260813100000_create_draft_checklist_version.sql:82`](../../supabase/migrations/20260813100000_create_draft_checklist_version.sql#L82)

- Story 1.4 must reuse this `(bike_category, phase)` advisory lock key.
  [`20260813100000_create_draft_checklist_version.sql:125`](../../supabase/migrations/20260813100000_create_draft_checklist_version.sql#L125)

- Events are append-only; app roles get SELECT, never table DML.
  [`20260813100000_create_draft_checklist_version.sql:29`](../../supabase/migrations/20260813100000_create_draft_checklist_version.sql#L29)

**Server action**

- `withAuth` calls the RPC after Zod pairing checks; revalidates both routes.
  [`checklist-version-actions.ts:26`](../../src/lib/workshop-tasks/actions/checklist-version-actions.ts#L26)

- Unspecified `all` filters never reach the RPC or get defaulted.
  [`types.ts:57`](../../src/lib/workshop-tasks/types.ts#L57)

**Library Create Draft**

- Control stays visible; hint names the missing phase or category.
  [`TemplateLibrary.tsx:56`](../../src/app/workshop/templates/_components/TemplateLibrary.tsx#L56)

- Incomplete or in-flight submits skip the RPC; success redirects to detail.
  [`TemplateLibrary.tsx:86`](../../src/app/workshop/templates/_components/TemplateLibrary.tsx#L86)

- Version number is the accessible row link back into detail.
  [`TemplateLibrary.tsx:301`](../../src/app/workshop/templates/_components/TemplateLibrary.tsx#L301)

**Detail route**

- Query failure is a retryable banner; missing row is `notFound()`.
  [`page.tsx:16`](../../src/app/workshop/templates/[id]/page.tsx#L16)

- Loader distinguishes error vs unknown, including a bad nested join.
  [`data.ts:89`](../../src/lib/workshop-tasks/data.ts#L89)

- Empty items is a successful definition, not a load failure.
  [`TemplateVersionDetail.tsx:67`](../../src/app/workshop/templates/[id]/_components/TemplateVersionDetail.tsx#L67)

**Tests**

- pgTAP covers create, denial, monotonic versions, and no direct DML.
  [`002_create_draft_checklist_version.pgtap.sql:111`](../../supabase/tests/database/workshop-tasks/002_create_draft_checklist_version.pgtap.sql#L111)

- Unit tests pin disable, submit wiring, detail success, and loader mapping.
  [`ui.test.tsx:134`](../../tests/workshop-template-library/ui.test.tsx#L134)

### Review Findings

- [ ] [Review][Patch] Prevent duplicate draft allocation on rapid clicks [src/app/workshop/templates/_components/TemplateLibrary.tsx:165]
- [ ] [Review][Patch] Make the detail-load retry reliably re-fetch route data [src/app/workshop/templates/[id]/page.tsx:23]
- [x] [Review][Patch] Keep database error details out of production UI [src/lib/workshop-tasks/actions/checklist-version-actions.ts:46]
- [ ] [Review][Patch] Exercise advisory-lock contention with independent database transactions [supabase/tests/database/workshop-tasks/002_create_draft_checklist_version.pgtap.sql:161]
- [x] [Review][Patch] Test the rendered Create Draft button’s action and navigation wiring [tests/workshop-template-library/ui.test.tsx:167]
