---
id: SPEC-customer-directory-and-details
companions:
  - brownfield.md
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate.

# Customer Directory and Details Drawer

## Why

Staff need `/customers` to be a usable customer directory rather than a narrow synchronization activity view. They must be able to find any customer quickly and see the person, their order history, bike-fit records, destination-upload state, address, and partner history without reconstructing it from several screens.

## Capabilities

- **CAP-1**
  - **intent:** Admins and managers can browse the complete customer directory, search it by name, email, or phone, and move between pages.
  - **success:** `/customers` renders every authorized customer, including people without a sync record, with Name, Email, Phone, and Birthday; `page` and `query` remain URL state, and a matching name, email, or phone produces the expected database-filtered result.

- **CAP-2**
  - **intent:** Staff can open a selected customer's details drawer to understand the person's contact, address, synchronization, order, bike-fit, and partner context.
  - **success:** The drawer displays the table fields, all persisted address fields, Google/Holded/Mailchimp statuses, the customer's orders, associated bike fits, and a de-duplicated list of qualifying partners; it distinguishes missing data from a loader failure.

- **CAP-3**
  - **intent:** Staff can act on a customer's order from the details drawer.
  - **success:** Every displayed order is clickable and opens the existing `/orders?order=<id>` details drawer with an authorized, valid order id.

- **CAP-4**
  - **intent:** Staff receive immediate feedback while a changed customer-directory URL state is loading.
  - **success:** A table skeleton replaces stale table content during search and pagination reloads, then the result, empty state, or load error is shown when the request completes.

- **CAP-5**
  - **intent:** Staff can open each saved bike fit associated with a customer from that customer's details drawer.
  - **success:** The drawer renders one actionable link per authorized `bike_fits` record associated by `customer_id`; each opens the existing `/bike-fits/<id>` saved-result route, and an explicit absence state appears when there are none.

## Constraints

- Preserve the admin/manager `/customers` access boundary, authenticated Supabase reads, and RLS; never expose or use the service-role key in this UI.
- Use URL search parameters for `page`, `query`, and the selected customer. Changing search resets to page 1 and preserves unrelated state where applicable.
- PostgreSQL must perform cross-table filtering and partner rollup. The directory must start from `customers` and left-join optional synchronization data, not from `customer_sync_list`.
- Customer loaders return safe fallbacks plus `error`; the page/drawer surfaces failures through the existing error UI rather than treating failures as empty data.
- Full address means the persisted street, city, region, postal-code, and country fields. The existing green/red/dash destination-status semantics remain available in the drawer. Partner history includes only orders with both `partner_id` and `partner_promo`, and displays partner names only.
- Build on the existing DetailsDrawer and order-details conventions where they satisfy the resolved navigation decision.
- A customer can have multiple bike fits. Do not select one arbitrarily or compute the association in the client; use the persisted `bike_fits.customer_id` relation.

## Non-goals

- Editing customer identity, address, orders, partner links, or destination-sync records.
- Retrying, backfilling, or changing Google, Holded, or Mailchimp synchronization.
- Changing the partner-facing customers area or the existing order-details payload beyond linking to its current URL state.
- Editing a bike fit or changing the bike-fit workflow from the customer drawer.

## Success signal

An admin or manager can search for a person by any supplied contact identifier, open that person, verify their full customer, partner, and bike-fit context, and continue to a specific order or bike fit without leaving stale or misleading table data on screen.

## Assumptions

- “Personal cards” means a per-customer details drawer opened from the directory, not a card-grid redesign.
- The directory includes both Booqable-sourced and local customers; a missing sync row is normal and does not hide the customer.
- The existing five address columns are the full address source for this feature.
