---
title: 'Customers landing contact fields'
type: 'feature'
created: '2026-09-01'
status: 'done'
review_loop_iteration: 0
baseline_commit: '6732b4993cf8ed8d029fa59bcdbcefac6bf52ca2'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `/customers` shows name and dest badges only. Staff cannot see landed email, phone, birthday, or address. Address is sent to dests, then dropped.

**Approach:** Persist passport address parts on `customers` when landing upserts identity. Add Email, Phone, Birthday, and one combined Address column. Empty contact cells show a dash. No backfill.

## Boundaries & Constraints

**Always:**
- Same admin/manager `/customers` shell, user-scoped `createClient()`, `{ customers, count, error }`, name-only `?query=`, dest cells unchanged.
- Five nullable text columns: `address_street`, `address_city`, `address_region`, `address_zip`, `address_country`. New local idempotent migration; do not edit `20260901120000_customer_sync.sql`.
- `customer_sync_list` exposes `email`, `phone`, `birthday`, and those five columns.
- `upsertIdentity` writes address as a unit: `passport.address` null → leave stored address; object present → write all five parts (nulls clear stale). Email, phone, birthday stay write-if-present.
- Columns: Name, Email, Phone, Birthday, Address, Google, Holded, Mailchimp. Empty contact cells → `—`. Blank name still `Unknown`. Birthday `DD/MM/YYYY`. Address joins present parts (street, city, region, zip, country) with `, `.

**Ask First:**
- Search email or phone. Edit form or staff-entered address. Persist address from workshop apply or bike-fit `createCustomer`.

**Never:**
- Invent missing address parts. Clear address on a land that has no address object.
- Touch dest writers, webhook routing, partner `/partner/.../customers`, or add this loader to `src/lib/customers.ts`.
- Expand search. Ship an edit UI. Use the service role on this page. Apply migrations remotely. Backfill from Booqable.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Full contact | Email, phone, ISO birthday, full address stored | Show values; birthday `17/05/1990`; address `Carrer de Mallorca 1, Barcelona, Catalonia, 08001, Spain` | N/A |
| Partial address | Passport address has city only | Persist city; others null; cell `Barcelona` | N/A |
| No address this land | `passport.address` null | Address columns unchanged; `—` if none stored | N/A |
| Missing / pre-change | email/phone/birthday/address null | Those cells `—` | N/A |
| Empty name | name blank | Name `Unknown` (not a dash) | N/A |
| Name search | `?query=` matches email only | Row not included; name `ilike` only | N/A |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260608102505_remote_schema.sql:267-276` -- `email`/`phone`/`birthday`; no address. Staff SELECT `:642`.
- `supabase/migrations/20260901120000_customer_sync.sql:85-99` -- view is name + dests. Replace in a **new** file; keep `security_invoker` + staff SELECT.
- `supabase/migrations/20260821160000_workshop_source_apply.sql:714-730` -- identity upsert, no address. Leave it.
- `src/lib/booqable/parse-landing-customer.ts:1-16,85-101` -- `PassportAddress`; null only when every part is empty.
- `src/lib/customer-landing/landing-store.ts:36-47` -- write-if-present identity; add address-unit persist (service role).
- `src/lib/customer-landing/status-rows.ts:8-47` -- extend types; map dash / birthday / combined address. Dests stay.
- `src/lib/customer-landing/load-status-page.ts:29-34` -- select the new view columns.
- `src/app/customers/_components/CustomersLandingTable.tsx:102-128` -- four contact columns after Name. Reuse `—` + `isoDateToDdMmYyyy` (`AllCustomersTable.tsx:20-25`, `src/utils/date-format.ts:17-21`). Do not copy partner email search.
- `src/lib/customers.ts:50-58` -- bike-fit insert; no address. Do not add this loader here.
- `src/customers-landing-status.test.mts:19-34,68-73,112` -- fixture, mapper, select, headers. `src/customer-landing.test.mts` -- source-lock address persist.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20260901140000_customers_landing_address.sql` -- add five address columns; replace `customer_sync_list` with contact fields -- list can read stored identity
- [x] `src/lib/customer-landing/landing-store.ts` -- persist address as a unit on `upsertIdentity` -- address becomes customer data on land
- [x] `src/lib/customer-landing/status-rows.ts` -- types + dash / birthday / combined address mapping -- one place for display rules
- [x] `src/lib/customer-landing/load-status-page.ts` -- select the new view columns -- loader returns contact fields
- [x] `src/app/customers/_components/CustomersLandingTable.tsx` -- Email, Phone, Birthday, Address columns -- staff see them next to dests
- [x] `src/customers-landing-status.test.mts` + `src/customer-landing.test.mts` -- lock I/O matrix, view columns, persist-if-address -- prevent silent drop

**Acceptance Criteria:**
- Given a land with a passport address object, when `upsertIdentity` runs, then those five columns match the passport parts (nulls included).
- Given a land with `passport.address` null, when `upsertIdentity` runs, then stored address columns are not overwritten.
- Given a listed row with contact values, when staff open `/customers`, then Email, Phone, Birthday (`DD/MM/YYYY`), and combined Address appear before dest badges.
- Given a listed row missing a contact field, when the table renders, then that cell is `—`.
- Given `?query=`, when it matches only email, then the row is not listed.

## Spec Change Log

## Design Notes

Address is one object: a later land with city only must not keep an old street. Combine for display only.

```
Barcelona          → Barcelona
street + city      → Carrer de Mallorca 1, Barcelona
all five           → Carrer de Mallorca 1, Barcelona, Catalonia, 08001, Spain
no parts           → —
```

## Verification

**Commands:**
- `npm run test:customers-landing-status` -- expected: pass, including mapper dashes and view/select locks
- `npm run test:customer-landing` -- expected: pass, including address persist on upsert

## Suggested Review Order

**Persist address on land**

- Address is one object: write all five parts, or omit keys when missing
  [`landing-store.ts:56`](../../src/lib/customer-landing/landing-store.ts#L56)

- Email, phone, and birthday stay write-if-present next to that rule
  [`landing-store.ts:42`](../../src/lib/customer-landing/landing-store.ts#L42)

**Schema and list view**

- Five nullable text columns; no backfill of older lands
  [`20260901140000_customers_landing_address.sql:5`](../../supabase/migrations/20260901140000_customers_landing_address.sql#L5)

- Recreate the staff view so the list can select contact fields
  [`20260901140000_customers_landing_address.sql:13`](../../supabase/migrations/20260901140000_customers_landing_address.sql#L13)

- Loader selects those columns; search stays name `ilike`
  [`load-status-page.ts:31`](../../src/lib/customer-landing/load-status-page.ts#L31)

**Display mapping**

- Empty contact cells become `—`; name blank stays `Unknown`
  [`status-rows.ts:49`](../../src/lib/customer-landing/status-rows.ts#L49)

- Birthday `DD/MM/YYYY`; address joins present parts with commas
  [`status-rows.ts:60`](../../src/lib/customer-landing/status-rows.ts#L60)

**Table**

- Contact columns sit after Name and before dest badges
  [`CustomersLandingTable.tsx:105`](../../src/app/customers/_components/CustomersLandingTable.tsx#L105)

**Tests**

- `identityUpsertRow` full, city-only nulls, and omit-when-null
  [`customer-landing.test.mts:123`](../../src/customer-landing.test.mts#L123)

- Mapper dashes, combined address, select lock, and view columns
  [`customers-landing-status.test.mts:76`](../../src/customers-landing-status.test.mts#L76)
