# Customer → third-party sync (split context)

Saved from the 2026-09-03 build conversation. Later stories must honor these locks.

## Product locks

- `/customers` will become a **full directory**, not a landed-only activity list. That page rewrite is **deferred**. The activity list was a temporary shortcut.
- `public.customers` is **not** deleted. Booqable is the source of truth for the shop’s people; local bike-fit (and similar) rows **coexist** and later **merge** into the same directory.
- Dest badges stay a **latest snapshot** on `customer_sync` (green / red / empty). No attempt event log. “History” in the original ask meant “I want production to remember who was uploaded,” not a timeline of retries.
- Zapier is **off**. No triple-write with the live webhook.
- Review-tag column (deferred): **Yes** = successful tag upload; **Error** = tag write failed; **dash** = local customer that was never uploaded.
- Review-tag backfill (deferred): allowed; no Mailchimp review campaign exists yet. Order is **land first, then tag**.
- Dest find on `customer.created` / `customer.updated`: stored dest id, then **email**, then digit-normalized **phone** (Google / Holded). Mailchimp stays email-keyed.
- Identity upsert stays `onConflict: booqable_customer_id`. Do not collapse a bike-fit row into a Booqable row until the directory story.

## Out of scope here

- Directory page rewrite
- Review-tag column and backfill
- Permanent in-app “Sync all” button
