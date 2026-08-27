<!-- bmad:context -->
<!-- Verified 2026-08-27 against 5f361f3. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## echelon-cycling-hub-admin

Internal portal for Echelon Cycling Hub: Booqable orders, partner stats and commissions, workshop tasks, bike fits, wiki. Next.js App Router, Supabase/Postgres, Subframe, Vercel. Planning and specs live in `_bmad-output/`. Standing Cursor rules live in `.cursor/rules/` — do not copy them here.

## Policy

- Never push to `main` or `staging`. GitHub PRs only: feature → `staging`, then `staging` → `main` for production. Solo merge; no reviewer.
- Never apply migrations or DDL to staging or production (CLI, MCP, or dashboard). Author SQL in `supabase/migrations/` and apply it locally. Remote DBs change only via GitHub Actions on those branches. Details: `.cursor/rules/supabase-migrations.mdc`.
- Never hand-edit `src/ui/` — Subframe sync overwrites it. Change components in Subframe, then sync.
- Never commit secrets (`.env*`) or `scripts/booqable-spike/captures/` (customer PII).

## Where things are

- Workshop UI: `src/app/workshop`. Application and domain: `src/lib/workshop`. Booqable adapter: `src/lib/booqable`. Webhook: `src/app/api/webhooks/booqable/route.ts`. Changing workshop workflow? Read `_bmad-output/planning-artifacts/architecture/architecture-echelon-cycling-hub-admin-2026-08-20/ARCHITECTURE-SPINE.md` first.
- Auth, errors, and migrations: `.cursor/rules/`.

## Running and verifying

- There is no `npm test`. Use the named `test:*` scripts in `package.json`. Do not invent `test:architecture` or `verify:workshop` — those names in the architecture spine are not implemented.
- `npm run test:db` needs the local Supabase stack running.

## Known pitfalls

- When asked to implement a feature, do not create new `_bmad-output` planning or research artifacts unless asked — implement in the repo.

<!-- /bmad:context -->
