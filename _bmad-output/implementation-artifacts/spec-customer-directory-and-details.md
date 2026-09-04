---
title: 'Customer directory and details drawer'
type: 'feature'
created: '2026-09-04'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'b7540e87e6bd8472d01aefdf5648eb1c136ef30f'
context:
  - 'AGENTS.md'
  - '_bmad-output/specs/spec-customer-directory-and-details/SPEC.md'
  - '_bmad-output/specs/spec-customer-directory-and-details/brownfield.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/customers` is a sync-status activity table, so local customers are hidden and staff cannot inspect one person's orders, address, sync state, partner history, or saved bike fits from one place.

**Approach:** Replace it with an admin/manager customer directory and URL-driven customer drawer. The database supplies the customer/sync/partner relationships; the existing order and bike-fit detail routes remain the destinations for linked records.

## Boundaries & Constraints

**Always:** List all authorized `customers`, including rows with no `customer_sync`; search name, email, and phone with URL `page`/`query` state and 300 ms debounce; display Name, Email, Phone, Birthday only. Open a `customer` URL-param drawer with contact fields, full persisted address, Google/Holded/Mailchimp state, every authorized order, each bike fit, and distinct partner names only where both `partner_id` and nonblank `partner_promo` exist. Render a table-only skeleton during pending search/pagination navigation. Use authenticated RLS-respecting reads, `withAuth` for the client-invoked detail action, safe loader fallbacks plus visible errors, and PostgreSQL—not browser code—for cross-table filtering/aggregation/deduplication.

**Ask First:** Any change to customer, order, partner, bike-fit, or sync data; a retry/backfill; remote database DDL; a standalone order route; a last-order-date column; a different partner qualification rule.

**Never:** Use the service-role key in page code/actions; reuse `customer_sync_list` for the directory; hide local-only customers; modify the partner customer surface or bike-fit workflow; silently render a query failure as an empty state.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Directory | Staff opens `/customers` | Paged rows include synced and local-only customers; missing contact fields show `—`. | List query error renders `DataLoadError`. |
| Contact search | Debounced query matches name, email, or phone | URL query is trimmed, page resets to 1, and only matching database rows render. | Escaped-empty query behaves as unfiltered. |
| Drawer | Valid `customer` UUID | Drawer shows identity, address, destination state, all orders, bike fits, and qualifying partners. | Detail error is distinct from not-found/inaccessible. |
| Record links | User selects order or bike fit | Order goes to `/orders?order=<id>`; bike fit goes to `/bike-fits/<id>`. | Missing related records show their explicit absence state. |
| Reload | Search or pagination pushes URL | Existing table rows are replaced by a table skeleton until navigation resolves. | Final list error replaces the skeleton with the error state. |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260901140000_customers_landing_address.sql:5-39` -- address fields and the inner-join view that cannot serve the new directory.
- `supabase/migrations/20260901120000_customer_sync.sql:26-103` -- optional 1:1 destination-state table, staff policy, and view/grant conventions.
- `supabase/migrations/20260608102505_remote_schema.sql:227-245,267-278,315-350,560-642` -- customer, order, partner, bike-fit relationships and staff RLS.
- `src/lib/customers.ts` and `src/lib/customers-types.ts` -- existing customer-domain module to extend with list/detail types and authenticated user-scoped loaders.
- `src/app/customers/page.tsx` and `_components/CustomersLandingTable.tsx` -- existing page, URL debounce, and pagination scaffold to replace.
- `src/app/customers/layout.tsx:9-44` -- unchanged staff guard; mount the new drawer host inside `Suspense`.
- `src/components/orders/OrderDetailsDrawerHost.tsx`, `OrderDetailsDrawer.tsx`, and `OrderDetailsDrawerSkeleton.tsx` -- host, close-animation, loading/error/not-found, and drawer visual patterns.
- `src/lib/orders/actions/order-details-actions.ts:12-21` and `src/components/orders/useOpenOrderDetails.ts:10-19` -- `withAuth` action and URL-param patterns to mirror.
- `src/app/bike-fits/all-bike-fits/_components/AllBikeFitsTable.tsx:250-254` -- saved bike-fit result link target.
- `src/customers-landing-status.test.mts` -- replace sync-only static contract assertions; retain `src/customer-landing.test.mts` unchanged.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20260904120000_customer_directory.sql` -- added idempotent, `security_invoker` directory and partner-history views with least-privilege grants and supporting indexes; applied to the local stack only.
- [x] `src/lib/customers.ts`, `src/lib/customers-types.ts`, and `src/lib/customers/actions/customer-details-actions.ts` -- added typed paginated directory and selected-customer loads with UUID validation, error logging, safe results, and a `withAuth` detail action.
- [x] `src/app/customers/page.tsx`, `src/app/customers/_components/CustomersLandingTable.tsx`, and `CustomersLandingTableSkeleton.tsx` -- replaced status columns with the directory, URL-driven drawer opening, and transition-backed pending skeleton.
- [x] `src/components/customers/CustomerDetailsDrawerHost.tsx`, `CustomerDetailsDrawer.tsx`, and `CustomerDetailsDrawerSkeleton.tsx` -- added the loading/error/not-found drawer and every approved customer-context section.
- [x] `src/app/customers/layout.tsx` -- mounted the drawer host in `Suspense` without changing authorization.
- [x] `src/customers-landing-status.test.mts` -- replaced legacy activity-table assertions with directory, drawer, route, skeleton, service-role, and migration contracts.

**Acceptance Criteria:**
- Given an admin/manager and both local-only and synced rows, when they open `/customers`, then both appear in a paginated directory and a non-staff user remains blocked by the existing layout.
- Given a contact term, when it occurs in only name, only email, or only phone, then the corresponding customer appears, page resets to one, and the URL remains the canonical state.
- Given a customer row, when it is selected, then a loading drawer transitions to the complete authorized customer context; query failure, not found, and absent related records remain distinguishable.
- Given a qualifying related record, when its link is selected, then the existing order drawer or bike-fit result route opens for that exact id.
- Given search/page navigation is pending, when the table is reloading, then its old data is not shown as current and a skeleton is displayed.

## Design Notes

The directory view and partner-history view deliberately separate two cardinalities: one optional sync row per customer versus many orders/bike fits per customer. Detail queries render order and bike-fit rows directly, while the partner view owns `DISTINCT`; this avoids the client-side joins or reductions prohibited by project rules.

## Verification

**Commands:**
- `supabase migration up` -- expected: the new migration applies to the local database only and can be rerun safely.
- `npm run test:customers-landing-status` -- expected: directory/drawer/migration source contracts pass.
- `npm run lint` -- expected: no new lint failures; report pre-existing repository failures separately.

**Results:**
- `supabase migration up` and `supabase migration list --local` -- passed; `20260904120000` is recorded on the local database.
- `npm run test:customers-landing-status` -- passed (6/6).
- `git diff --check` -- passed.
- `npm run lint` and `npm run test:customer-landing` -- blocked before code evaluation because this worktree has no installed npm dependencies (`eslint` and `@supabase/supabase-js`, respectively).

## Suggested Review Order

**Directory data boundary**

- Start with the database boundary that includes local-only customers and owns partner deduplication.
  [`20260904120000_customer_directory.sql:14`](../../supabase/migrations/20260904120000_customer_directory.sql#L14)

- Confirm typed, RLS-respecting pagination and selected-customer relationship loads.
  [`customers.ts:146`](../../src/lib/customers.ts#L146)

**Customer interaction**

- Review URL-authoritative filtering, accessible row selection, and pending table replacement.
  [`CustomersLandingTable.tsx:36`](../../src/app/customers/_components/CustomersLandingTable.tsx#L36)

- Confirm stale requests, rejection handling, and selected-customer isolation in the drawer host.
  [`CustomerDetailsDrawerHost.tsx:28`](../../src/components/customers/CustomerDetailsDrawerHost.tsx#L28)

- Inspect every approved customer-context section and navigation destination.
  [`CustomerDetailsDrawer.tsx:69`](../../src/components/customers/CustomerDetailsDrawer.tsx#L69)

**Regression coverage**

- Review the focused static contract checks for directory, drawer, and migration seams.
  [`customers-landing-status.test.mts:21`](../../src/customers-landing-status.test.mts#L21)
