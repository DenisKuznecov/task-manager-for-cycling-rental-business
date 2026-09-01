---
title: 'Customers landing activity list'
type: 'feature'
created: '2026-09-01'
status: 'done'
review_loop_iteration: 0
baseline_commit: '428017d042abff12842683676b96fa90698ae39c'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/customers` lists every `customers` row A–Z, so staff wade through people who never landed. They need a growing activity list of triggered syncs, newest first, and a name search once it paginates.

**Approach:** Show one row per customer who has been landed (webhook or local upload). Re-land moves that row to the top. Hide never-landed rows. Search `name` via `?query=`. Keep everyone who has ever landed; paginate.

## Boundaries & Constraints

**Always:**
- Admin/manager shell stays as today. User-scoped `createClient()` for the list. Loader returns `{ customers, count, error }` with an empty fallback. `DataLoadError` on `error`. `?page=` plus `?query=`.
- One row per customer. Visibility = `landing_at` is set. Sort `landing_at` desc, then `id` desc. No time cutoff.
- Stamp `landing_at = now()` on both `saveStatuses` and `saveStatusesByCustomerId`. Backfill existing rows that already have any dest status so they do not vanish.
- Name search is case-insensitive contains on `customers.name` only (single column). Trim; escape `,()` like bike-fits. New search resets to page 1. Pager keeps `query`.
- Dest cells, local-only badge, and Upload-on-local-only stay for rows that appear. Empty name → `Unknown`.
- Dest secrets stay server-only. New migration: local, idempotent. Staff column GRANT must include `landing_at` so local upload can stamp it.

**Ask First:**
- Search email or dest status. Show never-landed rows again. A visible landed-at column. Change page size.

**Never:**
- List every customer or sort by `name` / `customers.updated_at` (workshop apply bumps `updated_at` without landing).
- Add the list loader to `src/lib/customers.ts`. Touch partner `/partner/.../customers`, webhook routing, dest writers, or the edit UI.
- Email search, CRM/card, in-app retry on Booqable rows, service role on this page, remote migrations.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First land | Webhook or local upload writes statuses | Row appears at top with dest cells | N/A |
| Re-land | Same customer lands again | Same row; moves to top | N/A |
| Never landed | All dest statuses NULL, no `landing_at` | Hidden, including bike-fit locals never uploaded | N/A |
| Pre-existing land | Dest status set, `landing_at` null | Backfill keeps the row | N/A |
| Name hit | `?query=` matches `name` among landed | Those rows, newest first | N/A |
| Name miss | Query matches nobody landed | Empty; “Try adjusting your search.” | N/A |
| No lands yet | No `landing_at` rows, no query | Empty; not a full customer directory | N/A |
| Page + search | `?query=ada&page=2` | Page 2 of that name filter | N/A |
| Loader fail | Select errors | Empty list + `DataLoadError` | log `loadCustomersLandingPage:` |

</frozen-after-approval>

## Code Map

- `src/lib/customer-landing/load-status-page.ts:18-36` -- today: every row, `order name,id`, `?page=` only. Add `landing_at` not-null, desc sort, optional `name.ilike`. Keep `{ customers, count, error }` + `createClient()`.
- `src/lib/customer-landing/landing-store.ts:12-23,69-102` -- `landingStatusPatch` is the only persist of dest fields. Add `landing_at` here on both save paths. Webhook still service-role; local upload is staff RLS.
- `src/lib/customer-landing/land-customer.ts:207,275` -- always saves after dest writes. Do not change writers or routing.
- `supabase/migrations/20260831120000_customer_landing_status.sql:4-13` -- landing columns; no timestamp. `20260821160000_workshop_source_apply.sql:715-730` -- apply upserts customers and sets `updated_at` without landing.
- `supabase/migrations/20260831140000_customers_landing_staff_update.sql:21-32` -- column GRANT. New local file must GRANT `landing_at` too. Do not edit applied files.
- `supabase/migrations/20260608102505_remote_schema.sql:267-276` -- `name` is one text column; `updated_at` exists but is the wrong sort key.
- `src/app/customers/page.tsx:9-40` -- read `query` like `src/app/bike-fits/all-bike-fits/page.tsx:11-30`. Pass into loader + table.
- `src/app/customers/_components/CustomersLandingTable.tsx:17-21,86-91,143-151` -- add bike-fits search: `TextField` + 300ms debounce + `buildHref` that keeps `query` and resets page (`AllBikeFitsTable.tsx:37,100-123,166-177,228-230`). Pager must not drop `query`. Empty copy: search miss vs none landed.
- `src/lib/customer-landing/status-rows.ts:17-50` -- mapper unchanged unless the select adds unused fields. Do not list never-landed in the mapper; the query hides them.
- `src/lib/bike-fit/data/bike-fits.ts:105-110` -- ILIKE escape recipe. `src/lib/customers.ts:81-104` -- bike-fit typeahead; do not put this loader there.
- `src/customers-landing-status.test.mts:91-147,364-399` -- rewrite “lists every customer”; lock `landing_at` filter/sort, name `ilike`, `?query=`, GRANT, no service role, no partner reuse.
- Partner `src/app/partner/(me)/customers/page.tsx` -- different surface; do not reuse.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20260901120000_customers_landing_at.sql` -- add nullable `landing_at`, backfill from `updated_at` where any dest status is set, partial index, staff GRANT `landing_at` -- filter/sort key that workshop apply cannot fake
- [x] `src/lib/customer-landing/landing-store.ts` -- stamp `landing_at` on both save paths -- re-land moves the row to the top
- [x] `src/lib/customer-landing/load-status-page.ts` -- only `landing_at` not null; newest first; name `ilike` from `query` -- activity list, not directory
- [x] `src/app/customers/page.tsx` + `_components/CustomersLandingTable.tsx` -- `?query=` search, pager keeps query, empty-state copy -- find a person across pages
- [x] `src/customers-landing-status.test.mts` -- replace “every customer” / A–Z locks with landed-only, stamp, search, GRANT -- I/O matrix seams

**Acceptance Criteria:**
- Given a never-landed customer (including a bike-fit local never uploaded), when staff open `/customers`, then that person is absent.
- Given two landed customers, when the later one is re-landed, then they stay one row and appear first.
- Given a name query, when the URL has `?query=`, then only landed rows whose `name` contains that text are listed and page resets to 1 on a new search.
- Given a loader error, when the page renders, then `DataLoadError` shows and the list is empty.

## Spec Change Log

## Design Notes

Do not sort or filter on `customers.updated_at`. Order apply updates that column with no dest write (`workshop_source_apply.sql` customer upsert). `landing_at` is set only when dest statuses are persisted. Backfill uses `updated_at` solely so already-landed prod rows stay visible; new lands always stamp `now()`.

## Verification

**Commands:**
- `npm run test:customers-landing-status` -- expected: landed-only list, search URL, stamp, GRANT, no service role PASS
- `npm run test:customer-landing` -- expected: existing Booqable land tests still PASS
- `npx supabase migration up --local` -- expected: `landing_at` applies locally only

**Manual checks (if no CLI):**
- Admin: `/customers` is not the full directory. Trigger a land → row at top. Search a name → that row; pager keeps `query`. Mechanic does not see Customers. Partner customers unchanged.

## Suggested Review Order

**Filter and sort key**

- `landing_at` is the list key; workshop `updated_at` must not fake it
  [`20260901120000_customers_landing_at.sql:4`](../../supabase/migrations/20260901120000_customers_landing_at.sql#L4)

- Both dest saves stamp `landing_at` so a re-land moves the same row up
  [`landing-store.ts:23`](../../src/lib/customer-landing/landing-store.ts#L23)

**Activity list**

- Only rows with `landing_at`; newest first; name `ilike` after `,()` escape
  [`load-status-page.ts:35`](../../src/lib/customer-landing/load-status-page.ts#L35)

- Trim `?query=` once so empty-state copy matches the filter
  [`page.tsx:19`](../../src/app/customers/page.tsx#L19)

**Search UI**

- Debounced `?query=` resets to page 1; pager keeps the name filter
  [`CustomersLandingTable.tsx:63`](../../src/app/customers/_components/CustomersLandingTable.tsx#L63)

- Search miss vs no lands yet use different empty copy
  [`CustomersLandingTable.tsx:133`](../../src/app/customers/_components/CustomersLandingTable.tsx#L133)

**Tests**

- Source locks for landed-only sort, stamp, search URL, and `landing_at` GRANT
  [`customers-landing-status.test.mts:119`](../../src/customers-landing-status.test.mts#L119)
