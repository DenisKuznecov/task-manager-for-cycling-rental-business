---
id: SPEC-booqable-customer-created-sync
companions:
  - brownfield.md
  - destinations.md
  - google-oauth-setup.md
  - webhook-cutover.md
  - ../../planning-artifacts/architecture/architecture-echelon-cycling-hub-admin-2026-08-20/ARCHITECTURE-SPINE.md
sources:
  - ../../brainstorming/brainstorm-booqable-customer-created-sync-2026-08-28/.memlog.md
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Booqable customer landing

## Why

**Pain plus opportunity.** The shop's only Zapier Zap copies a Booqable person into Google Contacts, Holded, and Mailchimp at 300 EUR/month, and Mailchimp failures are hard to see or fix there. The admin app already exists and already talks to Booqable. Staff need the same person to appear in those three tools after a Booqable create or save, with a morning check that tells the truth.

## Capabilities

- **CAP-1**
  - **intent:** The system can receive Booqable `customer.created` and `customer.updated` and land that customer in Google Contacts, Holded, and Mailchimp so staff do not re-type the same passport.
  - **success:** After a Booqable create or save, each destination either has that customer — including company/organization records the current Zap already lands — (an update does not create a second contact) or is not green and shows a real error.
- **CAP-2**
  - **intent:** Staff can open the existing Customers nav and see, per customer, whether each destination landing succeeded.
  - **success:** `/customers` shows one row per customer with the customer name and three statuses; a Mailchimp failure with Google and Holded ok is visible on that row; the Customers nav opens `/customers`.

## Constraints

- Passport fields — email, phone, name, address (country, region, city, street, zip), birthday — are sent whole and never silently truncated.
- Green means the person is known to exist in that destination. Never green on a quiet or partial write that did not create or update the person.
- Mailchimp accepting the person but dropping address is not a failure.
- Retry is a Booqable save (`customer.updated`), not an in-app retry control.
- Destination credentials are server-only environment variables and never reach the browser. Local already has `HOLDED_API_KEY` and `MAILCHIMP_API_KEY`. Mailchimp audience `74fcbaad78` is `MAILCHIMP_AUDIENCE_ID` in env, not in code. Google uses `GOOGLE_CONTACTS_CLIENT_ID`, `GOOGLE_CONTACTS_CLIENT_SECRET`, and `GOOGLE_CONTACTS_REFRESH_TOKEN` from `google-oauth-setup.md`.
- Google Contacts writes use one-time OAuth by `echeloncyclinghub@gmail.com` (External + Testing test user), then a stored refresh token. Not a Google API key. Not Workspace domain-wide delegation. `admin@echeloncyclinghub.com` is not a Google Account and cannot be a test user.
- Local Booqable webhook deliveries may write the live Holded, Mailchimp, and Google accounts. Preview/PR must not. Production uses the same live destinations after cutover.
- Company/organization Booqable records land the same as people. Do not skip them.
- Only `customer.created` and `customer.updated` after cutover. No historical backfill.
- One listener: `/api/webhooks/booqable?secret=…`. Existing `/api/4/webhook_endpoints` stay. After fail-closed is live in that environment, PATCH that endpoint’s `events` to add `customer.created` and `customer.updated` (keep all `order.*`). Steps and endpoint ids: `webhook-cutover.md`. There is no Booqable Settings webhook UI.
- Fail-closed: read top-level `event` from the delivery body. `order.*` → order reconcile. `customer.created` / `customer.updated` → land. Missing or unknown `event` → 200 and no write. Never default to order reconcile.
- Booqable cannot reach `http://localhost`. Local tunnel host is `reprocess-construct-backache.ngrok-free.dev` (confirmed). If that host changes, PATCH the local endpoint `url`.
- Zapier already receives `customer.created`. Leave that endpoint until `/customers` is proven; dual delivery is expected. Then delete the Zapier customer row. Do not touch the other Zapier or Holded endpoints.
- The local row is status visibility keyed by Booqable customer id. The table shows the customer name for identification. This is not a new owned identity store or CRM.
- Architecture spine AD-1 (import graph), secrets, and environment isolation bind HOW. `brownfield.md` binds existing tables, nav, and the order-only webhook.

## Non-goals

- Full staff CRM, customer card, or moving the three lights onto a future card.
- A separate Sync page.
- An in-app retry button or special stuck-red UX beyond the error text.
- Treating a dropped Mailchimp address as a red status.
- An owned identity store as the product.
- Dual-fix Mailchimp copy ("add region in Booqable or relax ADDRESS") as a v1 requirement; readable errors are required, that exact sentence is optional.
- Historical backfill of customers Zapier already copied.

## Success signal

After a Booqable customer save, `/customers` shows three statuses that match whether that person exists in Google Contacts, Holded, and Mailchimp. A failed destination names the tool and a readable next action. A second save does not create a second contact. Zapier can be turned off for this Zap.

## Assumptions

- Status lights attach to a local row keyed by `booqable_customer_id`. `public.customers` already has that unique key; this spec does not require a second person table, and it does not make that table the source of truth.
- The existing Customers nav item (admin/manager, no href today) is the home for this table.
- Captured Booqable deliveries are form bodies with top-level `event` (e.g. `order.reserved`), `object`, `id`, `version`, and `data[*]`. Customer deliveries are assumed to use the same shape.
