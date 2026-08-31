# Handover — Booqable customer landing spec

**Date:** 2026-08-31  
**Phase:** Spec finalized. No open questions. No feature code written.  
**For:** next session. Do not re-run Google OAuth or invent a second spec folder.

## One-line ask

Replace the 300 EUR/month Zapier Zap: Booqable `customer.created` / `customer.updated` land the same person in Google Contacts, Holded, and Mailchimp, with three truthful statuses on `/customers`.

## Start here (read in this order)

1. `_bmad-output/specs/spec-booqable-customer-created-sync/SPEC.md` — contract
2. `brownfield.md` — existing customers table, nav, order-only webhook
3. `destinations.md` — env names, green rule, Google mailbox
4. `google-oauth-setup.md` — OAuth already done; do not repeat unless the refresh token is missing
5. `webhook-cutover.md` — list, PATCH local then prod, leave Zapier until proven
6. This file — session state and traps

Architecture companion (HOW): `_bmad-output/planning-artifacts/architecture/architecture-echelon-cycling-hub-admin-2026-08-20/ARCHITECTURE-SPINE.md`

Brainstorm source (absorbed): `_bmad-output/brainstorming/brainstorm-booqable-customer-created-sync-2026-08-28/.memlog.md`

Spec memlog is canonical for later decisions: `_bmad-output/specs/spec-booqable-customer-created-sync/.memlog.md`

## Prior decisions (do not re-litigate)

- CAP-1: created + updated webhooks land the person in all three tools; update must not create a second contact.
- CAP-2: thin `/customers` behind the existing Customers nav (admin/manager). Show **name** for identification. Key remains `booqable_customer_id`. No CRM, no Sync page, no retry button.
- Passport sent whole: email, phone, name, address (country, region, city, street, zip), birthday.
- Green = person is known to exist in that destination. Address drop after Mailchimp accepts the person is not red.
- Retry is save-again in Booqable, not an in-app button.
- No historical backfill.
- Local webhook → live Holded / Mailchimp / Google is allowed. Preview/PR must not write those accounts.
- Dual-fix Mailchimp copy is Could, not v1-required. Readable errors are required.
- One shared URL `/api/webhooks/booqable`. Fail-closed on top-level `event`. Add customer subscriptions only after that parse is live. Do not recreate order webhooks.
- Google writes use People API + OAuth refresh token. Not the shut-down Contacts API. Not domain-wide delegation.
- Google destination / test user: `echeloncyclinghub@gmail.com`. `admin@echeloncyclinghub.com` is not a Google Account. Cloud Audience is External + Testing; Internal is unavailable (project is not under Workspace). Do not publish the OAuth app.

## Credentials (local, already done)

User reports these are in `.env.local` (gitignored via `.env*.local`). A bare `.env` is **not** gitignored — do not put secrets there. Do not print values.

| Name | Status |
|---|---|
| `HOLDED_API_KEY` | Present |
| `MAILCHIMP_API_KEY` | Present |
| `MAILCHIMP_AUDIENCE_ID` | `74fcbaad78` — must be this env name, not hardcoded |
| `GOOGLE_CONTACTS_CLIENT_ID` | Present |
| `GOOGLE_CONTACTS_CLIENT_SECRET` | Present |
| `GOOGLE_CONTACTS_REFRESH_TOKEN` | Present (from OAuth Playground, own client credentials) |
| `BOOQABLE_API_KEY` / `BOOQABLE_COMPANY_SLUG` / `BOOQABLE_WEBHOOK_SECRET` | Already used by workshop |

Vercel production does **not** have the new destination vars yet. Do not add them to preview.

## Hard traps

1. **Do not PATCH customer events onto an endpoint until fail-closed is live in that environment.** Today the handler ignores `event` and treats `data[id]` as an order id.
2. Subscriptions are `curl` to `/api/4/webhook_endpoints`, not a Settings UI. GET first, then PATCH the existing endpoint’s `events` array. Do not POST a duplicate for an environment that already has one. Commands: `webhook-cutover.md`.
3. Booqable cannot call `http://localhost`. Local uses the current HTTPS tunnel host. If ngrok host changes, update every webhook that used the old host.
4. Production host: `https://echelon-cycling-hub-admin.vercel.app/api/webhooks/booqable?secret=<BOOQABLE_WEBHOOK_SECRET>`. Never a preview URL.
5. `workshopSyncAllowed()` is false on Vercel preview and the `staging` git ref. Preview must not write live destinations.
6. `public.customers` already exists (workshop/order apply, bike fits). Status lights are visibility on that identity, not a new CRM store. No address columns today.
7. Customers nav has no `href` today (`src/ui/layouts/nav-config.ts`). Partner `/partner/.../customers` is a different surface.
8. Local endpoint `052183d7-…`, production `03a500e7-…`. Zapier `f518c090-…` is `customer.created` — delete only after `/customers` is proven. Ngrok host confirmed.

## Open questions

None. Company/org records land. One shared webhook URL. Cutover is `webhook-cutover.md`.

## Suggested next session

Pick one.

1. **Story breakdown** (`/bmad-spec`, “break this into stories”) — suggested slices: (a) fail-closed `event` parse on the shared route; (b) three destination writers + no-duplicate update; (c) `/customers` table + nav href; (d) subscribe per `webhook-cutover.md` after (a) is live. Ask the user for `spec_checkpoint` / `done_checkpoint` / `invoke_dev_with` — do not default them.
2. **Implement** (`/bmad-build` or `/bmad-dev-story`) only after stories exist **or** the user explicitly says skip stories and build. First code change is fail-closed parse. Do not add Booqable customer subscriptions until that parse is live in the target environment.

## Out of scope this feature

- Full CRM / customer card lights
- Separate Sync page
- In-app retry button
- Publishing the Google OAuth app
- Repeating Playground / Cloud Console setup
- Applying migrations to staging or production by hand
