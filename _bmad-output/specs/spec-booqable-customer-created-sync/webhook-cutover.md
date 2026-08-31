# Webhook cutover — add customer events via the API

There is no Booqable Settings UI for this shop. Endpoints were created with `curl` against `/api/4/webhook_endpoints`. One endpoint per URL. Each endpoint has an `events` array.

Do not recreate the order endpoints. After fail-closed is live **in that environment**, PATCH that environment’s existing endpoint and add `customer.created` and `customer.updated` to `events`. Keep every `order.*` event already on it.

Do not run these POSTs/PATCHes until that parse is live. Listing (GET) is safe anytime.

## Auth

Use `.env.local`. Do not paste keys into the command line from memory or shell history.

```bash
set -a && source .env.local && set +a
```

Host: `https://${BOOQABLE_COMPANY_SLUG}.booqable.com`

## 1. List what you already have

```bash
curl -sS \
  -H "Authorization: Bearer ${BOOQABLE_API_KEY}" \
  -H "Accept: application/vnd.api+json" \
  "https://${BOOQABLE_COMPANY_SLUG}.booqable.com/api/4/webhook_endpoints"
```

Listed 2026-08-31 (do not PATCH the Zapier or Holded rows):

| id | Host | events | Ours? |
|---|---|---|---|
| `052183d7-ccda-4884-8c41-aa2093677842` | `reprocess-construct-backache.ngrok-free.dev` | order updated/archived/canceled/reserved/saved_as_draft/started/stopped | Local — PATCH this after local fail-closed |
| `03a500e7-0d0e-4ed3-b1f3-42412d398742` | `echelon-cycling-hub-admin.vercel.app` | same order list | Production — PATCH this after production fail-closed |
| `f518c090-44ce-4228-a6b9-4b423ce29b1a` | `hooks.zapier.com` | `customer.created` only | The 300 EUR Zap. Leave until our landing works, then delete |
| `65f4ebec-7edd-417a-b2c8-bbc68e8a08c9` | `hooks.zapier.com` | `order.stopped` | Leave |
| `ddc1b292-e8a1-4612-ad35-c10a4a349a6b` | `booqable-holded-webhook-azdv.vercel.app` | some order events | Leave |

Ngrok host confirmed 2026-08-31: `reprocess-construct-backache.ngrok-free.dev`. Zapier has `customer.created` only — no `customer.updated` row today.

## 2. Local — after fail-closed is running on localhost

Prove an order event still returns 200 and workshop still applies. Then PATCH **only** `052183d7-ccda-4884-8c41-aa2093677842`. Keep every order event already on it.

```bash
curl -X PATCH \
  "https://${BOOQABLE_COMPANY_SLUG}.booqable.com/api/4/webhook_endpoints/052183d7-ccda-4884-8c41-aa2093677842" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${BOOQABLE_API_KEY}" \
  -d "{
    \"data\": {
      \"id\": \"052183d7-ccda-4884-8c41-aa2093677842\",
      \"type\": \"webhook_endpoints\",
      \"attributes\": {
        \"url\": \"https://reprocess-construct-backache.ngrok-free.dev/api/webhooks/booqable?secret=${BOOQABLE_WEBHOOK_SECRET}\",
        \"events\": [
          \"order.updated\",
          \"order.archived\",
          \"order.canceled\",
          \"order.reserved\",
          \"order.saved_as_draft\",
          \"order.started\",
          \"order.stopped\",
          \"customer.created\",
          \"customer.updated\"
        ]
      }
    }
  }"
```

If ngrok’s current host is different, put that host in `url` instead. Do not drop an order event.

Create or save a customer in Booqable. Ngrok should show `event` `customer.created` or `customer.updated`.

Do **not** PATCH the production endpoint in this step.

## 3. Production — after fail-closed is on production

Production host must be `https://echelon-cycling-hub-admin.vercel.app` (not a preview). Destination env vars must already be on production.

PATCH **only** `03a500e7-0d0e-4ed3-b1f3-42412d398742`. Same `events` list as local (all current `order.*` plus `customer.created` and `customer.updated`). `url` host stays `echelon-cycling-hub-admin.vercel.app`.

Then save a customer and check `/customers`. Then delete the Zapier `customer.created` endpoint `f518c090-44ce-4228-a6b9-4b423ce29b1a` (or turn off that Zap). Do not delete the other Zapier or Holded endpoints unless you mean to.

## Create only if an environment has no endpoint

This is how the existing endpoints were created. Do not POST a second endpoint for an environment that already has one.

```bash
curl -X POST \
  "https://${BOOQABLE_COMPANY_SLUG}.booqable.com/api/4/webhook_endpoints" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${BOOQABLE_API_KEY}" \
  -d "{
    \"data\": {
      \"type\": \"webhook_endpoints\",
      \"attributes\": {
        \"url\": \"https://HOST/api/webhooks/booqable?secret=${BOOQABLE_WEBHOOK_SECRET}\",
        \"events\": [ \"order.updated\", \"order.reserved\" ]
      }
    }
  }"
```

## Do not

- PATCH production before fail-closed is deployed there.
- Point `url` at a Vercel preview host.
- Remove `order.*` events from an existing endpoint.
- Put the secret or API key in a committed file or a chat message.
