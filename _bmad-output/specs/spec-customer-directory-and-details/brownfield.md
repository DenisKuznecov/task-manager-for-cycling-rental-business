# Brownfield Contract

## Existing surfaces

| Area | Current behavior | Required change |
| --- | --- | --- |
| `/customers` | `CustomersLandingTable` reads `customer_sync_list`, so it hides customers without a sync row and shows destination columns in the table. | Replace it with the full directory defined in CAP-1; destination statuses move to the customer drawer. |
| Customer data | `customers` stores name, email, phone, birthday, Booqable id, and five nullable address fields. `customer_sync` is an optional 1:1 child containing Google, Holded, and Mailchimp statuses/errors. | Keep `customers` as the directory's base relation and use optional sync data. |
| Bike fits | `bike_fits.customer_id` relates zero or more saved fits to a customer. The existing result screen is `/bike-fits/<id>`. | Load every authorized matching fit and link to each existing result screen. |
| Order UI | `/orders` uses URL state and `OrderDetailsDrawerHost`; `?order=<uuid>` opens a drawer rather than a standalone detail page. | Customer-order links use this existing behavior. |
| Partner relation | `orders` has `partner_id` and `partner_promo`; `partners` supplies name, slug, and promo code. | History includes a partner only for an order where both order fields are populated, and shows the partner name. |

## Data and loader contract

- Create a staff-authorized PostgreSQL view or RPC for the paginated directory. It must expose one row per customer plus optional sync status and support exact count, stable order, and contact search without client-side aggregation.
- Implement contact search as a single escaped, case-insensitive term matched against name, email, or phone. Empty/only-escaped input is an unfiltered directory; a new term resets `page` to 1.
- Load a selected customer's details through an authenticated loader/action returning `{ customer, error }`. `error` represents query failure; `customer: null` with no error is not found or inaccessible.
- Load customer orders with an authorized database query and a stable order. The application may render returned order rows, but it must not calculate the last order or de-duplicate partners in JavaScript.
- Load associated bike fits through the authorized `bike_fits.customer_id` relation. Return a stable list of link metadata; do not hide older fits by choosing a single match.
- Derive qualifying partners in PostgreSQL as distinct partner records. A customer with none shows an explicit absence state, not an empty section that looks like a loader failure.
- Both directory and drawer need safe empty values and a visible `DataLoadError` on a non-null error. Skeleton state is specifically required for pending search and page navigation.

## Customer drawer content

| Section | Content | Empty behavior |
| --- | --- | --- |
| Identity | Name, email, phone, and birthday. | Preserve field-level absence with `—`; use `Unknown` only for an absent name. |
| Address | Street, city, region, postal code, and country. | Show that no address is on file. |
| Destination sync | Google, Holded, and Mailchimp status/error using existing status semantics. | Show not-synced/no-record state rather than a failure. |
| Orders | Every authorized customer order, with a recognisable order label and relevant date/status. | Show that the customer has no orders. |
| Bike fits | One link per associated saved bike fit, labelled with its existing fit metadata. | Show that the customer has no bike fits. |
| Partner history | Each qualifying partner once; qualifying means both `partner_id` and `partner_promo` are populated. | Show that no qualifying partner order exists. |

## URL and interaction state

- Directory state: `?page=<positive integer>&query=<trimmed term>`.
- Drawer state should add a distinct customer id parameter while retaining page and query; closing it removes only that parameter after the drawer close animation.
- A table-row click opens the customer drawer. Links or controls inside a row must not accidentally trigger the row handler.
- Search uses the existing 300 ms debounce convention. While a state-changing `router.push` is pending, render the table skeleton rather than old rows.

## Verification matrix

| Scenario | Evidence of success |
| --- | --- |
| Full directory | A local-only customer and a synced Booqable customer both appear. |
| Contact search | The same query mechanism matches independently by name, email, and phone; changing it resets pagination. |
| Drawer details | Address, sync states/errors, all orders, and qualifying partners reflect the loaded customer. |
| Order action | Selecting an order reaches the resolved order destination with that order's id. |
| Bike-fit action | Every bike fit belonging to the customer is represented once and opens `/bike-fits/<id>`; a customer with none sees the bike-fit absence state. |
| Pending and failures | Search/page changes show a skeleton; list and detail loader failures show the existing error component, not an empty-state claim. |
| Authorization | An unauthorized role cannot read directory, details, sync, order, or partner data through this feature. |
