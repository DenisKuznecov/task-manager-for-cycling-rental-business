---
title: 'Historical Booqable customer dest backfill'
type: 'feature'
created: '2026-09-03'
status: 'done'
review_loop_iteration: 0
baseline_commit: '278141c358db8ab8ce2927b09e5278e5709f9612'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/context-customer-thirdparty-sync.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Only people who hit `customer.created` / `customer.updated` after cutover exist in Google Contacts, Holded, Mailchimp, and production `customer_sync`. Historical Booqable people do not. A Vercel job would hit function limits; the laptop webhook gate does not write dests.

**Approach:** One local script pages every Booqable customer, reuses today’s land path (now email then phone find), upserts identity on `booqable_customer_id`, and writes `customer_sync` to **production** through the logged-in Supabase CLI (production project-ref). Resume with a gitignored cursor. No `/customers` rewrite.

## Boundaries & Constraints

**Always:**
- Reuse `landBooqableCustomer`, dest writers, and the landing store. Booqable list is **ids only**; passport still comes from `GET /api/4/customers/:id?include=properties`.
- Dedup per dest: stored dest id, then email, then digit-normalized phone. Google: existing `searchContacts` with the phone as query, match `phoneNumbers`. Holded: existing `GET /api/v2/contacts` plus match `phone` / `mobile` — do not walk the whole book. Mailchimp stays email-keyed (no email → red).
- Identity: existing upsert on `booqable_customer_id` only. Do not attach a Booqable id onto a bike-fit / local-only row in this story.
- Production DB: resolve the service-role client via Supabase CLI against project-ref `iwawhxfptzimluqyebiq` (Echelon Cycling Hub Admin). Example: `supabase projects api-keys --project-ref iwawhxfptzimluqyebiq` plus that project’s API URL. Inject that client into `createSupabaseLandingStore`. Dest and Booqable secrets stay the existing local env.
- Fail-closed if the CLI is not logged in, the project-ref is missing, or the ref is staging (`aoupusbxtznqvnpmlhox`) or local.
- Persist a gitignored cursor after each customer (green or per-dest red). Re-run continues. Honor existing Booqable `Retry-After`.
- Log `[customer-dest-backfill]` with page, Booqable id, and per-dest green/red.
- DML only to production `customers` + `customer_sync`. New files; no remote DDL.

**Ask First:**
- Human confirms the live run (dest writes + production DML) after CLI login.
- Any Holded URL other than today’s contacts list.
- Writing to any project-ref other than `iwawhxfptzimluqyebiq`.

**Never:**
- Rewrite `/customers`, review-tag column/backfill, Vercel or in-app “Sync all”.
- `supabase db push`, `apply_migration`, or any remote DDL. Commit secrets or a cursor with PII.
- Paste or invent `CUSTOMER_DEST_BACKFILL_*` env vars. Point the write at `NEXT_PUBLIC_SUPABASE_URL` or the local stack.
- Delete customers. Collapse bike-fit rows into Booqable rows. Change webhook routing, the review-request tagger, workshop apply `SET`, or partner `/partner/.../customers`.
- Treat the list payload as a passport.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy | List id; dest writes succeed; CLI on prod ref | Identity upserted; prod `customer_sync` green ×3 | N/A |
| Resume | Cursor mid-list | Done ids not re-queued; walk continues | N/A |
| CLI not logged in / no prod ref | Missing login or ref | Exit non-zero; no dest or DB write | log prefix |
| Refuse staging / local | ref is staging or local URL | Exit non-zero; no dest or DB write | log prefix |
| Phone, no email | Phone matches Google/Holded | Those dests update; Mailchimp red | Mailchimp stored error |
| Stored dest id | `customer_sync` has ids | Update those ids; no second contact | N/A |
| Partial dest fail | Mailchimp 4xx; others ok | Mailchimp red; others green; cursor advances | no rollback |

</frozen-after-approval>

## Code Map

- `src/lib/customer-landing/land-customer.ts:107-184` -- GET → parse → `upsertIdentity` → three writers → `saveStatuses`. Script calls this; do not add a second land path.
- `src/lib/customer-landing/landing-store.ts:31-38,66-134` -- accepts an injected service-role client. Keep `onConflict: booqable_customer_id`. Do not add local-only attach.
- `src/lib/customer-landing/google.ts:288-387` -- `storedId` then `searchContacts` email. After email miss (or no email), same search with phone; match `phoneNumbers` after digit-normalize.
- `src/lib/customer-landing/holded.ts:108-241` -- `storedId` then `?email=` list + field match. After miss, list + match `phone`/`mobile` after digit-normalize. Same `CONTACTS_URL`. No full-book walk.
- `src/lib/customer-landing/mailchimp.ts:165-188` -- email required. Do not add phone find.
- `src/lib/customer-landing/dest-error.ts` -- add a small digit-normalize / phones-match helper next to `presentString`.
- `src/lib/booqable/fetch-source-snapshot.ts:4,64-82,246-286` -- `LIST_PAGE_SIZE=50`, `paginationNextUrl`, `booqableGetJson` retry. Add customer list page (`fields[customers]=id`). Keep `fetchLandingCustomerDocument` for the passport.
- `src/lib/workshop/application/sync-env.ts:20-27` -- webhook dest gate only. `landBooqableCustomer` uses `workshopSyncAllowed` (true on a laptop). Do not route the script through the webhook.
- `src/lib/booqable/parse-landing-customer.ts:168-193` -- passport already has phone. Read-only.
- `scripts/booqable-spike/fetch-snapshot.mjs` -- local CLI + `--env-file` habit. New folder `scripts/backfill-customer-dests/` (cursor gitignored). Resolve prod keys with `supabase projects api-keys --project-ref iwawhxfptzimluqyebiq`.
- `src/customer-landing.test.mts:483-559` -- extend Google/Holded find fixtures for phone hits; add CLI/ref guard + list-page cases (mock the CLI; no live prod).
- `.gitignore` -- ignore the cursor file.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/customer-landing/dest-error.ts` -- digit-normalize phone match -- shared by Google and Holded
- [x] `src/lib/customer-landing/google.ts` + `holded.ts` -- find by phone after email miss -- Zapier-era contacts without a stored dest id
- [x] `src/lib/booqable/fetch-source-snapshot.ts` -- customer list page (ids, size 50) -- script walk
- [x] `src/lib/customer-landing/backfill-env.ts` + `scripts/backfill-customer-dests/` -- CLI-resolved prod client, refuse staging/local, cursor, call `landBooqableCustomer` -- no pasted URL/key, no Vercel job
- [x] `.gitignore` -- cursor file -- no PII in git
- [x] `src/customer-landing.test.mts` -- I/O matrix (phone find, CLI/ref guard, list parse) -- no live dest or prod DB in CI

**Acceptance Criteria:**
- Given a logged-in Supabase CLI and production project-ref `iwawhxfptzimluqyebiq`, when the script walks a Booqable customer, then dests are written without a second contact and production `customer_sync` stores that result.
- Given no CLI login, a missing ref, or staging/local, when the script starts, then it exits without dest or DB writes.
- Given a crash mid-walk, when the script is started again, then it continues from the cursor and does not create a second dest contact for an already-stored dest id.

## Spec Change Log

## Verification

**Commands:**
- `npm run test:customer-landing` -- expected: pass, including phone find, CLI/ref guard, list page

**Manual checks (if no CLI):**
- After the human is logged into Supabase CLI and approves the live run: one Booqable person appears on production `/customers` with dest badges; a second run does not create a second Google/Holded/Mailchimp contact for that person.

## Suggested Review Order

**Entry**

- Laptop runner; live dest + production DML only with this flag
  [`run.mts:55`](../../scripts/backfill-customer-dests/run.mts#L55)

- Reuses land + CLI-resolved production store; refuses preview/staging env
  [`backfill-env.ts:314`](../../src/lib/customer-landing/backfill-env.ts#L314)

**Production target**

- Only project-ref `iwawhxfptzimluqyebiq`; refuse staging and any other ref
  [`backfill-env.ts:57`](../../src/lib/customer-landing/backfill-env.ts#L57)

- Service-role key from `supabase projects api-keys`, never `.env.local` URL
  [`backfill-env.ts:164`](../../src/lib/customer-landing/backfill-env.ts#L164)

**Walk and cursor**

- Persist cursor only after green or per-dest red; ignored fails the walk
  [`backfill-env.ts:278`](../../src/lib/customer-landing/backfill-env.ts#L278)

- Invalid cursor JSON fails closed; empty file starts from scratch
  [`backfill-env.ts:217`](../../src/lib/customer-landing/backfill-env.ts#L217)

- Atomic cursor write so a crash cannot truncate progress
  [`run.mts:49`](../../scripts/backfill-customer-dests/run.mts#L49)

**Booqable list**

- Ids only, page size 50; passport still comes from GET `:id`
  [`fetch-source-snapshot.ts:314`](../../src/lib/booqable/fetch-source-snapshot.ts#L314)

**Phone dedup**

- Shared digit-normalize so formatted numbers match
  [`dest-error.ts:25`](../../src/lib/customer-landing/dest-error.ts#L25)

- After email miss, search raw then digits; match `value` or `canonicalForm`
  [`google.ts:379`](../../src/lib/customer-landing/google.ts#L379)

- After email miss, scoped phone/mobile list; match without id stays red
  [`holded.ts:176`](../../src/lib/customer-landing/holded.ts#L176)

**Peripherals**

- Cursor file stays out of git
  [`.gitignore:56`](../../.gitignore#L56)

- Phone find, CLI/ref guard, cursor, and confirm-flag cases
  [`customer-landing.test.mts:664`](../../src/customer-landing.test.mts#L664)

