---
title: 'Customers sync db tests'
type: 'feature'
created: '2026-09-01'
status: 'done'
review_loop_iteration: 0
baseline_commit: '35921c3'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `customer_sync`, the staff list view, and the five address columns have no pgTAP. A grant, RLS, CHECK, cascade, or view-column miss would pass app unit tests.

**Approach:** One pgTAP file locking the current end state of the two Sept 1 customer-sync migrations. Reuse the workshop `become` / `create_staff` / `SET ROLE` habit. Do not change schema or app code.

## Boundaries & Constraints

**Always:**
- File: `supabase/tests/database/customer_sync.test.sql`. `BEGIN` / `no_plan()` / `finish()` / `ROLLBACK`.
- Copy `pg_temp.become` and `pg_temp.create_staff` from `workshop_queue.test.sql`. Seed as `postgres`; `become` + `SET ROLE authenticated` for allow/deny; `RESET ROLE` after each authenticated block.
- Lock end state of `20260901120000_customer_sync.sql` + `20260901140000_customers_landing_address.sql`: dests on `customer_sync` (1:1, `ON DELETE CASCADE`); `landing_*` gone; five nullable address texts on `customers`; `customer_sync_list` is `security_invoker` and inner-joins sync → customers.
- `admin`/`manager` SELECT table and view. Mechanic, partner, `anon` do not. `authenticated` is SELECT-only on both. `service_role` can write `customer_sync`.
- Status CHECK: `NULL` / `green` / `red`. View columns = loader select list plus `synced_at`.
- Local `npm run test:db`. Existing workshop pgTAP still passes.

**Ask First:**
- Editing either migration, grants, RLS, or the view because a test failed.
- Vitest, dest HTTP, or `/customers` UI in this change.

**Never:**
- Edit applied migrations or app/TS tests. Apply DDL remotely.
- `SET ROLE` then `EXECUTE` an ungranted function (can drop the local Postgres connection).
- Copy workshop helpers (`snap`, `line`, apply RPCs). Assert `landing_*` still exist.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Staff list | Admin or manager JWT; customer + sync + address | Row on table and view with contact + dest columns | N/A |
| Inner join | Customer with no `customer_sync` row | Absent from `customer_sync_list` | N/A |
| Mechanic deny | Mechanic JWT | `count = 0` on table and view | N/A |
| Partner deny | Partner who can SELECT that customer | Still `count = 0` on table and view | N/A |
| Anon deny | `SET ROLE anon` | No privilege on table or view | `42501` |
| Staff write deny | Authenticated INSERT/UPDATE/DELETE `customer_sync` | Rejected | `42501` |
| Service write | `SET ROLE service_role`; upsert dests | Row persisted | N/A |
| Status check | `google_status = 'yellow'` | Rejected | `23514` |
| Null status | Dest status NULL | Insert allowed | N/A |
| Cascade | Delete the customer | Sync row gone | N/A |
| Dropped cols | `customers.landing_*` | Columns absent | N/A |

</frozen-after-approval>

## Code Map

- `supabase/tests/database/workshop_queue.test.sql:5-74,131-171` -- copy `become` + `create_staff`; insert customers as `postgres`; `SET ROLE authenticated`; `is(count, 0)` deny; `RESET ROLE`; `finish()` / `ROLLBACK`.
- `supabase/tests/database/workshop_sync.test.sql:245-250` -- `TEMP` + `GRANT SELECT` if authenticated needs a fixture id. `workshop_source_apply.test.sql` deferred note: never `SET ROLE` into an ungranted function.
- `supabase/migrations/20260901120000_customer_sync.sql:26-103` -- table, CHECKs, index, RLS `"Staff can read customer sync"`, REVOKE/GRANT. **Read-only.**
- `supabase/migrations/20260901140000_customers_landing_address.sql:5-39` -- address columns; current view + grants. **Read-only.**
- `supabase/migrations/20260608102505_remote_schema.sql:267-278,471-476,634,642` -- customers identity / unique booqable id; staff SELECT+INSERT, no UPDATE policy. `20260901120000:6,24` dropped landing UPDATE policy. **Read-only.**
- `supabase/migrations/20260609130457_fix_rls_auth_uid_subquery.sql:26-45` -- `get_user_role()`; partner customer SELECT. `20260821140000_workshop_mechanic_order_select.sql:20-27` -- mechanic customer SELECT. Neither role may see `customer_sync`.
- `src/lib/customer-landing/landing-store.ts:31-39,84-128` -- service-role writes. `load-status-page.ts:29-47` -- staff select + `synced_at DESC, id DESC`. **Read-only.**
- View columns: `id, name, email, phone, birthday, address_street, address_city, address_region, address_zip, address_country, booqable_customer_id, synced_at, google_status, google_error, holded_status, holded_error, mailchimp_status, mailchimp_error`. No dest `*_id`.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/tests/database/customer_sync.test.sql` -- pgTAP for the I/O matrix -- lock the two migrations without editing them

**Acceptance Criteria:**
- Given both migrations applied locally, when `npm run test:db` runs, then `customer_sync.test.sql` and existing workshop pgTAP pass.
- Given the new file, when a reviewer opens it, then it has no DDL and calls no workshop RPCs.

## Design Notes

After `SET ROLE authenticated`, only DML the two objects. Bike-fit customers with no sync row are not list rows — that inner join is the contract.

## Verification

**Commands:**
- `npm run test:db` -- expected: all pgTAP files pass, including `customer_sync.test.sql`

## Suggested Review Order

**Staff list contract**

- Admin view row locks contact, dests, and `synced_at`
  [`customer_sync.test.sql:458`](../../supabase/tests/database/customer_sync.test.sql#L458)

- Inner join hides customers that have no sync row
  [`customer_sync.test.sql:503`](../../supabase/tests/database/customer_sync.test.sql#L503)

**RLS and grants**

- Partner can read the customer and still cannot read dests
  [`customer_sync.test.sql:558`](../../supabase/tests/database/customer_sync.test.sql#L558)

- Authenticated is SELECT-only; service role can INSERT and UPDATE
  [`customer_sync.test.sql:216`](../../supabase/tests/database/customer_sync.test.sql#L216)

**Writes and constraints**

- Service-role upsert must update dests on `customer_id` conflict
  [`customer_sync.test.sql:663`](../../supabase/tests/database/customer_sync.test.sql#L663)

- Yellow is rejected on all three dest status checks
  [`customer_sync.test.sql:728`](../../supabase/tests/database/customer_sync.test.sql#L728)

- Deleting a customer removes the sync child
  [`customer_sync.test.sql:772`](../../supabase/tests/database/customer_sync.test.sql#L772)

**Schema leftovers**

- `landing_*` columns are gone; address parts stay nullable
  [`customer_sync.test.sql:63`](../../supabase/tests/database/customer_sync.test.sql#L63)
