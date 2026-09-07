---
title: 'Read-only customer access for mechanics'
type: 'feature'
created: '2026-09-04'
status: 'done'
review_loop_iteration: 1
baseline_commit: 'ac81e6fbc970425bb98891bd561c6e0627625b1d'
context:
  - 'AGENTS.md'
  - '_bmad-output/implementation-artifacts/spec-customer-directory-and-details.md'
  - '_bmad-output/implementation-artifacts/spec-link-order-customer-to-details.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Mechanics can reach the Customers page but RLS hides customers without workshop-task orders. The related details drawer and linked Orders/Bike Fits destinations also lack the required complete, safely read-only mechanic access.

**Approach:** Give mechanics complete read-only access to customer, order, bike-fit, relevant partner, destination-status, private reference-photo, and existing report-download data. Make every newly reachable page and action explicitly view-only for mechanics; partners remain excluded.

## Boundaries & Constraints

**Always:** Author one idempotent migration; apply it to the local Supabase stack only. Mechanics can list every customer and view full customer-drawer data, all orders, bike fits, reference photos, and existing PDF downloads. Mechanics may never create, edit, delete, unlock, generate a report, upload files, or email a report. Hide those controls and enforce the same boundary in server actions. Keep admin/manager behavior unchanged. Customer sync exposes statuses/errors only—never Google, Holded, or Mailchimp internal IDs. Preserve all partner RLS policies and existing redirects.

**Ask First:** Any new mechanic write access; allowing mechanics to generate or email reports; allowing a partner into Customers, Orders, or Bike Fits; or exposing additional storage buckets or third-party identifiers.

**Never:** Apply remote DDL. Use a service-role key for user reads. Replace the `security_invoker` directory views. Grant storage writes to mechanics. Rely only on hidden controls for authorization.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Directory | Mechanic opens `/customers` | Exact pagination includes customers without workshop tasks. | Existing loader error state remains visible. |
| Customer drawer | Mechanic opens a no-task customer | Identity/address, statuses/errors, orders, bike fits, and partner history load; sync IDs are unavailable. | Existing error/not-found states remain distinct. |
| Bike-fit detail | Mechanic opens a linked fit | Details, private photos, and an existing report download are available; all mutation/email controls are absent. | Existing data/image/download failures remain visible. |
| Direct edit URL | Mechanic requests `/bike-fits/:id/edit` | Redirect to the read-only detail route before the wizard renders. | No mutation UI flashes. |
| Partner isolation | Partner requests an unrelated record or staff route | RLS denies unrelated data and existing redirects remain active. | No customer data is disclosed. |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260821140000_workshop_mechanic_order_select.sql:5-64` -- replace mechanics' task-scoped read policies only; retain the historic migration untouched.
- `supabase/migrations/20260608102505_remote_schema.sql:288-357,638,1066` -- security-invoker list views, admin/manager bike-fit policy, and private bucket read policy patterns.
- `supabase/migrations/20260901120000_customer_sync.sql:69-83` -- add mechanic status reads while limiting authenticated column grants to non-ID fields.
- `src/lib/customers.ts:146-224` + `src/components/customers/CustomerDetailsDrawer.tsx:100-120` -- drawer query set and its linked order/bike-fit destinations.
- `src/app/orders/layout.tsx`, `src/app/bike-fits/layout.tsx`, and `src/ui/layouts/nav-config.ts` -- permit mechanics but retain partner redirects.
- `src/app/bike-fits/all-bike-fits/page.tsx` + `_components/AllBikeFitsTable.tsx` -- pass and apply the existing server-derived management capability to hide create/edit/delete UI.
- `src/app/bike-fits/[id]/page.tsx`, `[id]/edit/page.tsx`, and `_components/BikeFitDetail.tsx` -- explicit read-only detail capability and direct-edit redirect.
- `src/app/bike-fits/_components/BikeFitReportActions.tsx` + `src/lib/bike-fit/actions/{bike-fit-actions,report-actions}.ts` -- separate report download from manager-only generation/email and enforce roles server-side.
- `supabase/tests/database/{workshop_foundation,customer_sync}.test.sql` + `src/customers-landing-status.test.mts` -- RLS, storage, mutation denial, partner isolation, and UI authorization coverage.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20260904130000_mechanic_customer_read_access.sql` -- idempotently replace scoped mechanic reads; add read-only `bike_fits`, `customer_sync`, and `bike-fit-images` access; restrict sync columns to statuses/errors -- complete data without writes or vendor IDs.
- [x] `src/app/orders/layout.tsx`, `src/app/bike-fits/layout.tsx`, and `src/ui/layouts/nav-config.ts` -- expose read-only destinations to mechanics while retaining partner redirects.
- [x] `src/app/bike-fits/all-bike-fits/` and `[id]/` routes/components -- supply an explicit `canManage` capability, hide management UI, preserve photo viewing/downloads, and redirect direct edit requests.
- [x] `src/app/bike-fits/_components/BikeFitReportActions.tsx` and `src/lib/bike-fit/actions/` -- allow mechanic report download only; require manager role for every mutation, generation, and email action.
- [x] `supabase/tests/database/` -- prove all mechanic reads and storage reads, status-only sync access, and DML denial; retain partner isolation.
- [x] `src/customers-landing-status.test.mts` -- lock navigation, route guards, view-only controls, and server-action checks.

**Acceptance Criteria:**
- Given a mechanic, when they open a customer with no workshop-task order, then every approved drawer section and associated image/report read is available.
- Given a mechanic, when they open Bike Fits through navigation, a customer link, or a direct URL, then no create/edit/delete/unlock/generate/email operation is offered or accepted.
- Given a mechanic, when they download an existing report, then it succeeds without granting report-generation or email capability.
- Given a mechanic or anonymous caller, when they query destination sync, then vendor IDs are unavailable; statuses/errors remain available only to authorized mechanics/admins/managers.
- Given a partner, when they attempt any newly read-enabled resource, then existing redirects and partner-scoped RLS continue to deny unrelated data.

## Spec Change Log

- Review loop 1: expanded the implementation map after review revealed existing bike-fit routes were mutation-capable and private storage was admin/manager-only. Preserve the complete read-only mechanic data scope and partner exclusion; avoid the known-bad state where an RLS-read expansion exposes mutation controls or vendor IDs.

## Design Notes

Use one explicit server-derived management capability across the Bike Fits list and detail paths; UI hiding is only the presentation layer, while role checks in every server action are the authority boundary. The private bucket policy is select-only and bucket-scoped. Column grants prevent the API from enumerating destination IDs even though mechanics can read status/error fields through the existing security-invoker views.

## Verification

**Commands:**
- `supabase migration up --local` -- expected: local migration applies and re-applies safely.
- `npm run test:db` -- expected: full mechanic read/storage access, status-only sync, DML denial, and partner isolation pass.
- `npm run test:customers-landing-status` -- expected: read-only UI/action source contracts pass.
- `npx tsc --noEmit` -- expected: type checking passes.

**Manual checks (if no CLI):**
- As a mechanic, verify a no-task customer, a linked bike fit with a photo/report, and direct edit URL behavior.
- As a partner, verify Customers, Orders, and Bike Fits remain unavailable.

## Suggested Review Order

**Read-only data boundary**

- Replaces task-scoped policies with complete mechanic reads while preserving write restrictions.
  [`20260904130000_mechanic_customer_read_access.sql:5`](../../supabase/migrations/20260904130000_mechanic_customer_read_access.sql#L5)

- Limits customer-sync access to UI-safe status and error columns.
  [`20260904130000_mechanic_customer_read_access.sql:59`](../../supabase/migrations/20260904130000_mechanic_customer_read_access.sql#L59)

- Extends only private image-bucket reads to mechanics.
  [`20260904130000_mechanic_customer_read_access.sql:88`](../../supabase/migrations/20260904130000_mechanic_customer_read_access.sql#L88)

**Bike Fit authorization**

- Establishes the manager-only server-action guard for every Bike Fit mutation.
  [`bike-fit-actions.ts:31`](../../src/lib/bike-fit/actions/bike-fit-actions.ts#L31)

- Separates read-only report downloads from manager-only generation and email.
  [`report-actions.ts:20`](../../src/lib/bike-fit/actions/report-actions.ts#L20)

- Derives and passes the explicit management capability to the detail UI.
  [`page.tsx:34`](../../src/app/bike-fits/[id]/page.tsx#L34)

- Redirects mechanics before the edit wizard can render.
  [`page.tsx:19`](../../src/app/bike-fits/[id]/edit/page.tsx#L19)

**Proof and navigation**

- Confirms no-task records remain visible through the actual Orders security-invoker view.
  [`workshop_foundation.test.sql:1873`](../../supabase/tests/database/workshop_foundation.test.sql#L1873)

- Locks the navigation, read-only UI, and server-action authorization contracts.
  [`customers-landing-status.test.mts:112`](../../src/customers-landing-status.test.mts#L112)
