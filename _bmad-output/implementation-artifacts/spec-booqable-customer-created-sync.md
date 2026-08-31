---
title: 'Booqable customer landing'
type: 'feature'
created: '2026-08-31'
status: 'ready-for-dev'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-booqable-customer-created-sync/webhook-cutover.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A 300 EUR/month Zapier Zap copies each Booqable person into Google Contacts, Holded, and Mailchimp, and Mailchimp failures are hard to see there.

**Approach:** Shared `/api/webhooks/booqable` fail-closes on form `event`. `order.*` keeps today’s reconcile. `customer.created` / `customer.updated` use `data[id]` only as a signal, GET that customer from Booqable, and land them in the three tools without a second contact. Per-dest status is stored on the existing `customers` row. Staff `/customers` UI is deferred.

## Boundaries & Constraints

**Always:**
- Form `event`: `order.*` → `reconcileBooqableOrder`; `customer.created` / `customer.updated` → land; missing/unknown → 200, no write. Never treat a customer id as an order.
- Customer path matches orders: webhook form is a signal (`event` + `data[id]`). Passport comes from `GET /api/4/customers/:id`, not from the delivery body.
- Passport sent whole, never truncated: email, phone, name, address (country, region, city, street, zip), birthday. Omit absent fields — do not invent.
- One listener `/api/webhooks/booqable?secret=…`. Do not subscribe customer events until fail-closed is live in that environment. Human cutover only (`webhook-cutover.md`). Keep every existing `order.*`.
- Green = the person is known to exist in that destination. Never green on a quiet/partial write. Mailchimp accepting the person but dropping address is not a failure.
- Update must not create a second contact — persist dest ids and reuse them. Company/org records land like people.
- Status lives on existing `public.customers` (unique `booqable_customer_id`). No second person table.
- Server-only: `HOLDED_API_KEY`, `MAILCHIMP_API_KEY`, `MAILCHIMP_AUDIENCE_ID` (not in code), `GOOGLE_CONTACTS_CLIENT_ID`, `GOOGLE_CONTACTS_CLIENT_SECRET`, `GOOGLE_CONTACTS_REFRESH_TOKEN`. Google = People API + refresh token for `echeloncyclinghub@gmail.com`.
- Reuse `workshopSyncAllowed()`: preview and `staging` git ref write nothing. Local may write the live accounts. No destination secrets on Vercel preview.
- Retry = Booqable save, not an in-app button. Webhook DB writes use `createServiceRoleClient`. Log `[webhooks/booqable]` and a dest prefix. New migration: local, idempotent.
- Only `src/lib/booqable` calls Booqable. Dest adapters are server-only.

**Ask First:**
- PATCH/POST any Booqable `webhook_endpoints` row.
- Destination env on Vercel production (needed before prod cutover; never preview).
- Repeating Google OAuth / publishing the OAuth app.
- Deleting Zapier endpoint `f518c090-…`.
- Any live dest write from a Vercel preview.

**Never:**
- Build `/customers` or set the Customers nav `href` in this story.
- Backfill, CRM/card, Sync page, in-app retry. Treat dropped Mailchimp address as red. Skip company/org records.
- Recreate order webhooks, drop `order.*`, or point `url` at a preview host.
- Google Contacts API (`m8/feeds`), API key, domain-wide delegation, or `admin@echeloncyclinghub.com` as a Google user.
- Commit secrets or ship them to the browser. Apply migrations remotely. Let workshop apply overwrite landing columns.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Unknown event | missing `event` or `event=foo` | 200; no reconcile; no land | log; no write |
| Order path | `event=order.reserved`, `data[id]=order-X` | `reconcileBooqableOrder("order-X")` as today | existing 500 path |
| Customer land | `customer.created`, `data[id]=cust-X`, sync allowed | GET customer by id; upsert row; write 3 dests; store statuses | per-dest red + tool + next action; others may stay green |
| Form is not passport | webhook form omits address / name | GET still supplies passport; form fields unused except `event` + `data[id]` | N/A |
| Update no dup | `customer.updated` already landed | dests update stored ids | no second contact |
| Partial fail | Mailchimp 4xx; others exist | Mailchimp red; others green | do not roll back greens |
| Preview gate | `VERCEL_ENV=preview` | 200 ignored; no dest or order writes | existing ignored body |
| Company record | Booqable company/org | lands like a person | same per-dest errors |
| Address drop | Mailchimp 200, ADDRESS omitted | Mailchimp green | N/A |
| Missing dest env | refresh token unset | that dest red + readable error; others still run | log prefix |

</frozen-after-approval>

## Code Map

- `src/app/api/webhooks/booqable/route.ts` -- secret → `workshopSyncAllowed()` → `parseBooqableWebhookOrderId` + reconcile. Parse `event` first; only `order.*` may reconcile.
- `src/lib/workshop/application/sync-env.ts:4-20` -- preview/staging gate; `data[id]` helper. Add event classify beside it; keep the order-id helper for the order branch.
- `src/workshop-sync.test.mts:75-96` -- id-only parse + reconcile import. Extend for fail-closed; keep order assertions.
- `src/lib/booqable/fetch-source-snapshot.ts:23-29` -- `booqableConfig` + retry. Add `GET /api/4/customers/:id` here only.
- `src/lib/booqable/parse-source-snapshot.ts:133-153` -- order sideload has no address. New landing parser includes address; do not change `SourceCustomerV1` / order apply unless required.
- `src/lib/workshop/application/reconcile-order.ts:30-38,102` -- `createServiceRoleClient`. Never pass a customer id into `reconcileBooqableOrder`.
- `supabase/migrations/20260608102505_remote_schema.sql:267-278,471` -- `customers` + unique `booqable_customer_id`. New landing columns after `20260828120000_workshop_m2_skip_na.sql`.
- `supabase/migrations/20260821160000_workshop_source_apply.sql:713-731` -- apply updates name/email/phone/birthday only. Do not add landing fields to that `SET`.
- Staff RLS: SELECT/INSERT only. Landing writes stay service-role.
- `src/lib/customers.ts` -- bike-fit create/search. Do not add a staff list loader here.
- `src/ui/layouts/nav-config.ts:17` -- Customers has no `href`. Leave it; `/customers` is deferred.
- Env reads: `src/lib/contact.ts:34` pattern. Holded `key` header; Mailchimp DC from the API key; Google People API + stored refresh token.

## Tasks & Acceptance

**Execution:**
- [ ] `src/lib/workshop/application/sync-env.ts` -- classify form `event` (order / customer / ignore) -- fail-closed before any subscription change
- [ ] `src/app/api/webhooks/booqable/route.ts` -- dispatch on that class; keep secret + env gate -- customer ids must never hit reconcile
- [ ] `src/lib/booqable/fetch-source-snapshot.ts` + customer parser beside `parse-source-snapshot.ts` -- GET one customer; map passport -- form body is not the passport
- [ ] `supabase/migrations/20260831120000_customer_landing_status.sql` -- idempotent landing columns on `public.customers` -- status on the existing identity
- [ ] `src/lib/customer-landing/` -- server-only dest adapters + land use-case; persist dest ids; per-dest green/red -- no-dup update; partial failure allowed
- [ ] `src/workshop-sync.test.mts` + `src/customer-landing.test.mts` + `package.json` -- I/O matrix (routing, GET-not-form, green/red, no-dup, preview) + keep order webhook asserts -- lock the seams

**Acceptance Criteria:**
- Given a delivery with missing or unknown `event`, when the route handles it, then it returns 200 and writes nothing.
- Given `event` is `order.*` and sync is allowed, when the route handles it, then it still awaits `reconcileBooqableOrder` with `data[id]`.
- Given `customer.created` or `customer.updated` and sync is allowed, when landing finishes, then a Booqable GET by `data[id]` supplied the passport, the local row keyed by that id has three statuses matching dest existence, and a second save does not create a second contact.
- Given Mailchimp fails and the other two dests succeed, when landing finishes, then Mailchimp status is red with a readable next action and the other two are green.
- Given `VERCEL_ENV=preview`, when a customer event arrives, then no destination is written.

## Spec Change Log

## Design Notes

Fail-closed is the first code change. Do not PATCH endpoints until that parse is running in the target environment.

Persist dest ids so `customer.updated` is an update (stored id, then email). Order-apply may already have the `customers` row; landing upserts the same unique key and must not clear landing columns.

## Verification

**Commands:**
- `npm run test:workshop-sync` -- expected: order id-only + fail-closed routing PASS
- `npm run test:customer-landing` -- expected: I/O matrix (no live dest calls) PASS
- `npx supabase migration up --local` -- expected: landing columns apply locally only
- `npm run test:db` -- expected: existing workshop customer upserts still PASS

**Manual checks (if no CLI):**
- After fail-closed is on localhost, prove an `order.*` delivery still returns 200 and workshop still applies. Then the human PATCHes only local `052183d7-…` per `webhook-cutover.md` (keep all `order.*`). Create or save a customer; dest accounts and the local landing columns match. Do not PATCH production in this story.
