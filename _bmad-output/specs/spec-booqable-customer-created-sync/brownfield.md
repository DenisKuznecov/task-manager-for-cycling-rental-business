# Brownfield — customer landing

Downstream must treat these as already true. Do not invent a second customer identity. Customer events use the same `/api/webhooks/booqable` URL as orders after fail-closed is live.

## Local customer row

`public.customers` already exists. It has `booqable_customer_id` (unique), `name`, `email`, `phone`, `birthday`, `sex`. No address columns. Workshop order-apply upserts a row when an order snapshot includes a customer. Bike-fit create can insert a row with `booqable_customer_id` null. The status table is visibility on landing, not a new CRM store.

## Staff Customers nav

`NAV_ITEMS` already has a Customers item for `admin` and `manager` with no `href`. Partner `/partner/.../customers` is a different surface and is out of this spec.

## Inbound Booqable

`src/app/api/webhooks/booqable` is order-only today: query-param secret, then parse form `data[id]` as an **order** id and run one bounded order reconcile. It does not read `event`. A customer id on that path today is fed to `reconcileBooqableOrder`. `BOOQABLE_API_KEY` and `BOOQABLE_COMPANY_SLUG` already exist for server-side Booqable reads.

Captured delivery: top-level `event` (e.g. `order.reserved`), `object`, `id`, `version`, `data[*]`. Endpoints were created via `POST/PATCH /api/4/webhook_endpoints` (JSON:API `type: webhook_endpoints`, attributes `url` + `events[]`). There is no Settings UI for this shop. Local tunnel and production already have endpoints with the order event list. After fail-closed is live, PATCH that environment’s endpoint and add `customer.created` / `customer.updated` to `events`. Cutover: `webhook-cutover.md`.

## Outbound secrets pattern

Server-only env vars already used this way: `BOOQABLE_*`, `RESEND_API_KEY`, `SHORT_IO_SECRET_KEY`. Destination credentials follow the same rule. `SUPABASE_SERVICE_ROLE_KEY` stays webhook/backend-only.

## Environment gate

`workshopSyncAllowed()` is false on Vercel preview and on the `staging` git ref. This feature follows the same preview/PR rule: no live destination writes from preview. Local is allowed to write the live Holded, Mailchimp, and Google accounts when a tunneled Booqable webhook hits localhost.

## Existing order webhook

Do not add `customer.created` / `customer.updated` to production until fail-closed is on `https://echelon-cycling-hub-admin.vercel.app`. Local endpoint `052183d7-ccda-4884-8c41-aa2093677842`. Production endpoint `03a500e7-0d0e-4ed3-b1f3-42412d398742`. Do not use a preview host.
