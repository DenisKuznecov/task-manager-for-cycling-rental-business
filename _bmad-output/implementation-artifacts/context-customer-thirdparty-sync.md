# Customer → third-party sync (split context)

Saved from the 2026-09-03 build conversation. First spec: historical dest backfill. Later stories must honor these locks.

## Product locks

- `/customers` will become a **full directory**, not a landed-only activity list. That page rewrite is **deferred**. The activity list was a temporary shortcut.
- `public.customers` is **not** deleted. Booqable is the source of truth for the shop’s people; local bike-fit (and similar) rows **coexist** and later **merge** into the same directory.
- Dest badges stay a **latest snapshot** on `customer_sync` (green / red / empty). No attempt event log. “History” in the original ask meant “I want production to remember who was uploaded,” not a timeline of retries.
- Zapier is **off**. No triple-write with the live webhook.
- Review-tag column (deferred): **Yes** = successful tag upload; **Error** = tag write failed; **dash** = local customer that was never uploaded.
- Review-tag backfill (deferred): allowed; no Mailchimp review campaign exists yet. Order is **land first, then tag**.

## First goal (this run)

Walk **every Booqable customer**, land into Google Contacts / Holded / Mailchimp without a second contact, upsert identity into `customers`, and write results to **production** `customer_sync`.

- Dedup: existing dest id, then **email**, then **phone**.
- Runner: **one local script**, not a Vercel job. Laptop talks to live dest APIs. Production `customers` / `customer_sync` writes go through the logged-in **Supabase CLI** against project-ref `iwawhxfptzimluqyebiq` (not staging `aoupusbxtznqvnpmlhox`, not local). No pasted URL or service-role env vars.
- Identity upsert stays `onConflict: booqable_customer_id`. Do not collapse a bike-fit row into a Booqable row in this run. Directory “show both” is deferred.
- Do not apply migrations to production from the laptop. DML only, and only after the human approves the live run.

## Out of scope here

- Directory page rewrite
- Review-tag column and backfill
- Permanent in-app “Sync all” button
