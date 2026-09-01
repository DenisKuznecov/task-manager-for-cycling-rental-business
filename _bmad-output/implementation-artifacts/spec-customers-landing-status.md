---
title: 'Customers landing status'
type: 'feature'
created: '2026-08-31'
status: 'done'
review_loop_iteration: 0
baseline_commit: '030980db60b0bf6739f9de3f5f8654be7c839704'
context:
  - '{project-root}/_bmad-output/specs/spec-booqable-customer-created-sync/SPEC.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Landing already writes three truthful dest statuses, but staff have no morning check — and bike-fit customers never reach those tools because they have no Booqable event.

**Approach:** Customers nav opens `/customers`: name, a not-from-Booqable badge when `booqable_customer_id` is null, and three dest statuses. Booqable people retry by saving in Booqable. Local-only rows get an upload that lands whatever fields exist on the row.

## Boundaries & Constraints

**Always:**
- Admin/manager only. Layout follows bike-fits: no session → `/login`; no role → `/pending`; partner → `/partner/overview`; other roles → `/unauthorized`.
- One row per `public.customers` row. Empty name → `Unknown`. Local-only rows show they were not created in Booqable.
- Dest cells read `landing_{google,holded,mailchimp}_status` / `_error`. `green`, `red`, or never-landed (`NULL` — not red). Red shows the stored error.
- Loader returns `{ customers, count, error }` with an empty fallback. `DataLoadError` on `error`. User-scoped `createClient()` for the read. `?page=` pagination.
- Booqable-keyed rows: no upload control.
- Local-only upload: `withAuth`, `workshopSyncAllowed()` (preview writes nothing), reuse the three dest writers. Passport from the local row. Omit absent fields — invent nothing. Persist statuses on that row’s `id`.
- Incomplete data is expected. Mailchimp reds without email; others may accept name-only. Partial green/red is allowed. Local-only red names the tool and dest reason — never “save in Booqable”.
- Dest secrets stay server-only. Status persist uses staff RLS (new local migration), not `SUPABASE_SERVICE_ROLE_KEY`.

**Ask First:**
- Search, status filters, or a customer card.
- Changing which roles see Customers.
- An edit form this story (deferred — missing fields stay missing).

**Never:**
- CRM, card, Sync page, or a retry button on Booqable-keyed rows.
- Invent address / email / phone / birthday. Re-decide Mailchimp address-drop.
- Touch partner `/partner/.../customers`. Change webhook routing or dest env.
- Ship dest secrets to the browser. Use service role from this page or action. Add the list loader to `src/lib/customers.ts`.
- Apply migrations remotely. Point Customers `href` anywhere except `/customers`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mixed dests | Mailchimp red + stored error; others green | Row shows that split | N/A |
| Never landed | Statuses NULL | Never-landed marks; not red | N/A |
| Local listed | `booqable_customer_id` null | Row + badge + upload | N/A |
| Local upload, no email | Staff clicks upload | Mailchimp red; others may green | local-only next action |
| Local dest 4xx | Dest rejects incomplete member | That dest red; others keep their result | no rollback of greens |
| Preview upload | `VERCEL_ENV=preview` | No dest write | existing gate |
| Booqable row | Has `booqable_customer_id` | No upload control | N/A |
| Loader fail | Select errors | Empty list + `DataLoadError` | log prefix |
| Nav | Admin/manager opens Customers | `/customers`; item selected | N/A |

</frozen-after-approval>

## Code Map

- `src/ui/layouts/nav-config.ts:17` -- set `href: "/customers"`. `AppNavLink.tsx:23-28` and `AppMobileNavMenu.tsx:55-56` are inert without it.
- `src/app/bike-fits/layout.tsx:6-45` + `all-bike-fits/page.tsx:10-56` + `src/lib/bike-fit/data/bike-fits.ts:91-131` -- staff guard, `?page=`, `{ rows, count, error }`, `DataLoadError`.
- `src/components/DataLoadError.tsx:15-26` + `TablePagination.tsx:10-23` + `src/ui/components/Badge.tsx:11-18` + `Table.tsx` -- banner, pager, `success`/`error`/`neutral`.
- `src/lib/customers.ts:17-58` -- bike-fit insert: name required; email/phone/birthday optional; `booqable_customer_id` null; no address. Do not add the list loader here.
- `src/lib/customer-landing/land-customer.ts:61-178` -- webhook land GETs Booqable and saves by booqable id. Local upload must not GET Booqable; persist by `customers.id`.
- `src/lib/customer-landing/landing-store.ts:54-70` -- add a local-id save path.
- `src/lib/customer-landing/dest-error.ts:1-8` -- `destNextAction` says save in Booqable; local-only errors need a different sentence.
- `src/lib/customer-landing/mailchimp.ts:181-186` -- no email → red. `holded.ts:195-200` -- no name → red. `google.ts:338-346` -- empty person → red. Address omitted is fine.
- `src/lib/workshop/application/sync-env.ts` + `src/utils/auth/with-auth.ts` -- gate + wrap the upload action `{ ok, error }`.
- `supabase/migrations/20260831120000_customer_landing_status.sql:4-37` -- landing columns already on every row.
- `supabase/migrations/20260608102505_remote_schema.sql:634-642` -- staff SELECT + INSERT only. New local migration: staff UPDATE of landing columns.
- Partner `src/app/partner/(me)/customers/page.tsx` -- different surface; do not reuse.

## Tasks & Acceptance

**Execution:**
- [x] `src/ui/layouts/nav-config.ts` -- set Customers `href` to `/customers` -- nav opens the table
- [x] `supabase/migrations/20260831140000_customers_landing_staff_update.sql` -- idempotent staff UPDATE of landing columns -- persist upload results without service role
- [x] `src/lib/customer-landing/` -- local-id save, local next-action text, land from the local row via existing writers -- no Booqable GET, no invented fields
- [x] `src/lib/customer-landing/load-status-page.ts` + land action -- list all customers; `withAuth` upload gated by `workshopSyncAllowed()` -- read + local upload
- [x] `src/app/customers/` -- bike-fits shell; name; local-only badge + upload; three statuses; `DataLoadError`; pager -- morning-check surface
- [x] `src/customers-landing-status.test.mts` + `package.json` -- nav; list includes local; no upload on Booqable rows; no-email Mailchimp red; preview writes nothing; no service role -- lock the seams

**Acceptance Criteria:**
- Given an admin or manager session, when they open Customers, then `/customers` lists every customer by name with three destination statuses, and local-only rows show they were not created in Booqable.
- Given Mailchimp is red and the other dests are green, when the row renders, then that split is visible with the stored Mailchimp error.
- Given a never-landed row, when the table renders, then those dests are not shown as red.
- Given a local-only customer with no email, when staff upload, then Mailchimp is red with a local-only next action and the other dests may be green.
- Given a Booqable-keyed row, when the table renders, then there is no upload control.
- Given the loader fails, when the page renders, then a `DataLoadError` banner appears and the table is empty.

## Spec Change Log

## Design Notes

Bike-fit create has no address and often no email. Writers already omit absent fields. A dest 4xx is a real red. Staff can click upload again; filling missing fields is a later edit UI.

## Verification

**Commands:**
- `npm run test:customers-landing-status` -- expected: nav, list+badge, local upload I/O, preview gate, no service role PASS
- `npm run test:customer-landing` -- expected: existing Booqable land tests still PASS
- `npx supabase migration up --local` -- expected: staff landing UPDATE applies locally only

**Manual checks (if no CLI):**
- Admin: Customers → `/customers`. Booqable row: statuses, no upload. Bike-fit customer: badge + upload; dest cells match. Mechanic does not see the item. Partner `/partner/.../customers` unchanged.

## Suggested Review Order

**Staff surface**

- Customers nav now opens the morning-check table.
  [`nav-config.ts:17`](../../src/ui/layouts/nav-config.ts#L17)

- Same admin/manager shell as bike-fits: login, pending, partner, unauthorized.
  [`layout.tsx:9`](../../src/app/customers/layout.tsx#L9)

- `?page=` list, `DataLoadError`, empty fallback.
  [`page.tsx:9`](../../src/app/customers/page.tsx#L9)

- Green / red-with-error / never-landed; Upload only on local-only rows.
  [`CustomersLandingTable.tsx:23`](../../src/app/customers/_components/CustomersLandingTable.tsx#L23)

**List + statuses**

- Every `customers` row, user-scoped client, stable name+id pages.
  [`load-status-page.ts:29`](../../src/lib/customer-landing/load-status-page.ts#L29)

- Empty name → Unknown; null dests stay not-red.
  [`status-rows.ts:35`](../../src/lib/customer-landing/status-rows.ts#L35)

**Local upload**

- Passport from the local row; no Booqable GET; persist by `customers.id`.
  [`land-customer.ts:219`](../../src/lib/customer-landing/land-customer.ts#L219)

- `withAuth`, preview gate, admin/manager before dest writes.
  [`load-status-page.ts:70`](../../src/lib/customer-landing/load-status-page.ts#L70)

- Local reds say upload again, never save in Booqable.
  [`dest-error.ts:9`](../../src/lib/customer-landing/dest-error.ts#L9)

- Holded `customId` only when a Booqable id exists.
  [`holded.ts:28`](../../src/lib/customer-landing/holded.ts#L28)

**Persist without service role**

- Id-keyed save fails closed on a 0-row update.
  [`landing-store.ts:84`](../../src/lib/customer-landing/landing-store.ts#L84)

- Staff RLS plus landing-column `GRANT` only.
  [`20260831140000_customers_landing_staff_update.sql:21`](../../supabase/migrations/20260831140000_customers_landing_staff_update.sql#L21)

**Tests**

- Nav, list+badge, local I/O, preview, no service role.
  [`customers-landing-status.test.mts:84`](../../src/customers-landing-status.test.mts#L84)
