---
title: 'Contain Existing Integration Security Risks'
type: 'feature'
created: '2026-08-13'
status: 'done'
baseline_commit: '819b12f62408e427db8f94d7fe14d604ae21a339'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/project-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Expanding Workshop onto current Booqable and session surfaces would amplify known risks: webhook logs echo the supplied secret, an unauthenticated sandbox route writes with the service-role key, SSR refresh drops cache-prevention headers, and Vercel preview/branch URLs can inherit ingestion credentials.

**Approach:** Contain those entry points before source-pipeline expansion: redact webhook auth failures, refetch only after auth, keep the sandbox backfill but require a dedicated secret (terminal/agent callers), copy SSR refresh headers, and refuse ingestion on Vercel preview/branch. Local `.env.local` is unchanged.

## Boundaries & Constraints

**Always:** Keep the thin webhook (payload identifies the order; `syncBooqableOrder` is the only refetch). Compare the existing query-param static webhook secret without disclosing it. Keep `GET /api/sandbox/booqable/sync-orders` for operator backfill; it authenticates itself with `Authorization: Bearer` matching `BOOQABLE_SYNC_SECRET` (not the webhook secret, not the service-role key). Create any service-role client only after successful auth and only when ingestion is allowed. Copy `@supabase/ssr` refresh headers onto the middleware response as provided. Fail closed when `VERCEL_ENV` is `preview` (Vercel preview URLs only — not `npm run dev`). Prove the I/O matrix with existing Vitest. Prefix webhook logs `[webhooks/booqable]` and sandbox logs `[sync-orders]`.

**Ask First:** Changing Vercel dashboard checkboxes for which hosted environments get these secrets (this does not affect localhost). Switching webhook auth from the query-param secret to HMAC or a header.

**Never:** Treat `/api` middleware skip, `sandbox` in the path, or a missing matcher as access control. Log supplied secrets, API keys, or webhook payload PII on reject. Call `syncBooqableOrder` or construct a service-role client before successful auth. Change ghost-order 200 behavior or valid-webhook compatibility. Delete the sandbox backfill in this story (Stories 2.8–2.9 still replace it with durable recovery). Upgrade Next.js, pin Node/CLI, add envelopes/workers/cron routes, or apply remote DDL. Add a new test runner. Require a logged-in browser session for the sandbox route.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Invalid webhook secret | POST webhook with wrong or missing `?secret=` | 401; body unread; no service-role client; no `syncBooqableOrder` | Contextual warn without supplied secret, API key, payload, or env secret |
| Valid webhook | Matching secret and a non-ghost order id | 200 after `syncBooqableOrder` | Existing 500 retry path unchanged |
| Invalid sandbox auth | GET sync-orders with missing/wrong Bearer token | 401; no service-role client; no listing or sync | Contextual warn without the supplied token or credentials |
| Valid sandbox auth | GET sync-orders with matching Bearer token, not preview | Existing backfill after auth | Existing per-order failure collection unchanged |
| Preview deploy | `VERCEL_ENV=preview`, even if secrets are set | Webhook and sandbox ingestion do not activate | Non-success; no secret/PII logs |
| Localhost | `VERCEL_ENV` unset; secrets in `.env.local` | Webhook and sandbox work as today once authed | N/A |
| SSR refresh | `setAll` invoked with library headers | Response copies `Cache-Control`, `Expires`, and `Pragma` | Fixture proves `Cache-Control` contains `private` and `no-store` |

</frozen-after-approval>

## Code Map

- `src/app/api/webhooks/booqable/route.ts` -- `POST` creates the service-role client at L14–17 *before* auth; L34–37 logs `providedSecret`; auth L21–39; body L42; `syncBooqableOrder` L68. Keep thin-webhook L7–12 and ghost-order 200 L53–58.
- `src/lib/booqable/sync.ts` -- `syncBooqableOrder` L100 / `fetchBooqableOrder` L50. Read-only; both routes still call it after auth.
- `src/app/api/sandbox/booqable/sync-orders/route.ts` -- unauthenticated `GET` L12 uses service-role L13–16. Keep the backfill; add Bearer auth and move `createClient` to after auth; still fail closed on preview.
- `src/utils/supabase/middleware.ts` -- `setAll(cookiesToSet)` L24–29 drops `@supabase/ssr@0.10.0` second-arg headers. `/api/*` skip L47–50 is not access control.
- `src/utils/supabase/server.ts` -- same one-arg `setAll`; RSC cannot set those HTTP headers. Leave unchanged.
- `src/middleware.ts` -- matcher includes `/api`; exclusion is not a grant.
- `src/lib/booqable/ingestion-guard.ts` -- new: preview fail-closed (`VERCEL_ENV === "preview"`) plus Bearer comparison that never logs the supplied token.
- `node_modules/@supabase/ssr/dist/main/cookies.js` -- `setAll` receives `Cache-Control: private, no-cache, no-store, must-revalidate, max-age=0`, `Expires: 0`, `Pragma: no-cache`. Copy through.
- `vitest.config.mts` + `package.json` `test:unit` -- existing Vitest. Add `tests/booqable-containment/` using `vi.hoisted`/`vi.mock` as in `tests/workshop-template-library/actions.test.ts`.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/booqable/ingestion-guard.ts` -- export preview fail-closed check and a non-disclosing Bearer comparison against `BOOQABLE_SYNC_SECRET` -- writers must not ingest on Vercel preview; sandbox must not treat the path as a grant
- [x] `src/app/api/webhooks/booqable/route.ts` -- gate preview; compare query secret without logging it or the payload; construct service-role client and call `syncBooqableOrder` only after auth -- contains disclosure and keeps refetch-after-auth
- [x] `src/app/api/sandbox/booqable/sync-orders/route.ts` -- require `Authorization: Bearer` matching `BOOQABLE_SYNC_SECRET`; construct service-role client only after auth; keep the existing backfill body -- operator terminal/agent recovery stays, unauthenticated use does not
- [x] `src/utils/supabase/middleware.ts` -- accept `setAll(cookiesToSet, headers)` and copy each header onto the `NextResponse` -- CDNs must not cache a refreshed session
- [x] `tests/booqable-containment/` -- Vitest the I/O matrix -- repository proof without a new runner

**Acceptance Criteria:**
- Given an invalid webhook secret, when the route rejects, then logs omit the supplied secret, API key, payload PII, and other credentials, and authority is refetched only after successful authentication.
- Given the sandbox Booqable sync route, when an unauthenticated caller hits it, then it does not run service-role recovery; when a caller presents a matching Bearer token off-preview, then the existing backfill still runs. Path naming or skipped API middleware is not access control.
- Given Supabase SSR refresh supplies cache-prevention headers, when middleware refreshes a session, then it copies `Cache-Control`, `Expires`, and `Pragma`, and a fixture proves `Cache-Control` contains `private` and `no-store`.
- Given a Vercel preview/branch deploy (`VERCEL_ENV=preview`), when env is resolved, then ingestion cannot activate even if secrets are present. Localhost (`VERCEL_ENV` unset, `.env.local`) keeps working. Production and staging stay environment-managed.
- Given the new Vitest checks run locally, when they pass, then secret redaction, denied unauthorized recovery, authoritative refetch, and private no-store caching are proven, and valid webhook behavior remains compatible.

## Design Notes

Localhost is not Vercel Preview. `npm run dev` reads `.env.local` on your machine; `VERCEL_ENV` is unset, so webhook and sandbox still run. Vercel Preview is a separate hosted URL Vercel builds for a pull request. The code only refuses ingestion there. Unchecking secrets on Preview in the Vercel dashboard is optional extra caution and does not touch `.env.local`.

Sandbox callers are terminal and AI agents, not a logged-in browser, so auth is `Authorization: Bearer $BOOQABLE_SYNC_SECRET` (add that one value to `.env.local`). Do not put the secret in the URL. Copy SSR headers as the library supplies them; the fixture asserts `private` and `no-store`. Move service-role `createClient` to after auth on both routes. Stories 2.8–2.9 still replace this GET with durable recovery.

## Verification

**Commands:**
- `npm run test:unit` -- all Vitest files pass, including `tests/booqable-containment/`
- `npx tsc --noEmit` -- no new type errors
- `npm run lint` -- no new lint errors on touched files

**Manual checks (if no CLI):**
- After adding `BOOQABLE_SYNC_SECRET` to `.env.local`, `curl -H "Authorization: Bearer $BOOQABLE_SYNC_SECRET" http://localhost:3000/api/sandbox/booqable/sync-orders` still backfills; the same URL without the header returns 401.
- Do not change Vercel dashboard env checkboxes unless asked.

## Suggested Review Order

**Preview fail-closed**

- Shared policy: refuse ingestion only when `VERCEL_ENV` is exactly `preview`.
  [`ingestion-guard.ts:7`](../../src/lib/booqable/ingestion-guard.ts#L7)

- Webhook returns 403 before auth, body read, or a service-role client.
  [`route.ts:16`](../../src/app/api/webhooks/booqable/route.ts#L16)

- Sandbox backfill uses the same preview gate and log prefix.
  [`route.ts:21`](../../src/app/api/sandbox/booqable/sync-orders/route.ts#L21)

**Auth before service-role**

- Query-param secret compared without logging the supplied value or payload.
  [`route.ts:37`](../../src/app/api/webhooks/booqable/route.ts#L37)

- Service-role client and `syncBooqableOrder` run only after a live non-ghost order.
  [`route.ts:69`](../../src/app/api/webhooks/booqable/route.ts#L69)

- Bearer parse never logs the token; webhook secret is not accepted.
  [`ingestion-guard.ts:17`](../../src/lib/booqable/ingestion-guard.ts#L17)

- Sandbox requires `Authorization: Bearer` matching `BOOQABLE_SYNC_SECRET`.
  [`route.ts:36`](../../src/app/api/sandbox/booqable/sync-orders/route.ts#L36)

- Existing backfill body kept; `createClient` moved to after auth.
  [`route.ts:41`](../../src/app/api/sandbox/booqable/sync-orders/route.ts#L41)

**SSR cache-prevention headers**

- `setAll` copies library `Cache-Control`, `Expires`, and `Pragma` onto the response.
  [`middleware.ts:24`](../../src/utils/supabase/middleware.ts#L24)

**Tests**

- Invalid/missing webhook secret: 401, unread body, no client, no secret logs.
  [`webhook.test.ts:55`](../../tests/booqable-containment/webhook.test.ts#L55)

- Valid webhook still refetches via `syncBooqableOrder` after auth.
  [`webhook.test.ts:89`](../../tests/booqable-containment/webhook.test.ts#L89)

- Unauthorized sandbox never lists or constructs a service-role client.
  [`sync-orders.test.ts:79`](../../tests/booqable-containment/sync-orders.test.ts#L79)

- Matching Bearer off-preview still runs the existing backfill.
  [`sync-orders.test.ts:109`](../../tests/booqable-containment/sync-orders.test.ts#L109)

- Fixture proves copied `Cache-Control` contains `private` and `no-store`.
  [`middleware-headers.test.ts:55`](../../tests/booqable-containment/middleware-headers.test.ts#L55)

- Localhost unset `VERCEL_ENV` stays allowed; preview fails closed with secrets set.
  [`ingestion-guard.test.ts:24`](../../tests/booqable-containment/ingestion-guard.test.ts#L24)
