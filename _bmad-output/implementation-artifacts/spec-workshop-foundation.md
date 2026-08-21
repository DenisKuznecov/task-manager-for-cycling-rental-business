---
title: 'Workshop foundation'
type: 'feature'
created: '2026-08-21'
status: 'ready-for-dev'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/specs/spec-automating-mechanics-daily-work/SPEC.md'
  - '{project-root}/_bmad-output/specs/spec-automating-mechanics-daily-work/workflow-state-machine.md'
  - '{project-root}/_bmad-output/specs/spec-automating-mechanics-daily-work/launch-checklists.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-echelon-cycling-hub-admin-2026-08-20/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Mechanics' daily-work commands, checklists, and RLS do not exist yet. Later UI and Booqable stories have nothing lawful to call.

**Approach:** Land the PostgreSQL workshop core (schema, seeds, staff commands, read models, pgTAP) plus thin `withAuth` RPC wrappers. Create tasks only via test fixtures; do not sync from Booqable.

## Boundaries & Constraints

**Always:**
- Bind AD-1 module layout, AD-3–AD-8, AD-9 read-model shape, AD-13 db tests. Status names and edges match the workflow companion. Copy `ROAD-01`–`ROAD-25` and `STORAGE-01`–`STORAGE-06` exactly from `launch-checklists.md`. Keep the four unsupplied tags disabled (no invented items).
- One `rental_turnaround` task per assignment instance. Storage is a stage, not a second kind. Uniqueness: instance + kind. Copy queue fields (`order_id`, `order_number`, `starts_at`, bike display/source ids, tag, config warning) onto `bike_tasks` so mechanic reads do not need new `public.orders` SELECT policies.
- Public staff RPCs are `SECURITY INVOKER`, granted only to `authenticated`, and call private `SECURITY DEFINER SET search_path = ''` helpers. Role via existing `get_user_role()`; session via `withAuth`. `admin`/`manager`/`mechanic` may mutate; `partner` gets `FORBIDDEN`. Every mutation takes `expectedVersion` and returns `{ ok: true, taskId, version, status }` or `{ ok: false, code, error }` with a closed `code`.
- History tables reject UPDATE/DELETE. Attestations snapshot user UUID + non-null first/last name or `PROFILE_NAME_REQUIRED`. Missing/unrecognized/multiple tags: visible task, `CONFIGURATION_BLOCKED` on start. M2 confirms M1 PSI/N/A; same-person M2 requires explicit confirm. `complete_m2` matches expected add-on fingerprint (`ADD_ONS_CHANGED` on mismatch). Add nullable `addon_fingerprint` / `source_fingerprint` on `public.orders` for later apply; tests stamp them.
- Idempotent local migration only. Pin Supabase CLI `2.115.0` in both GitHub deploy workflows. Do not add `private` to `supabase/config.toml` API `schemas`. Add `bike_tasks` to `supabase_realtime` idempotently.

**Ask First:**
- Any new SELECT/DML policy on existing `public.orders` / `order_items` for mechanics.
- Implementing apply, leases, webhook, or manual sync because fixtures feel insufficient.
- Inventing checklist rows for `workshop-e-city-bike`, `workshop-e-mtb-bike`, `workshop-gravel-bike`, `workshop-e-road-bike`.

**Never:**
- Workshop UI, Kanban deletion, `@hello-pangea/dnd`, `/workshop/[taskId]`.
- Rewriting `src/lib/booqable/sync.ts`, live Booqable calls, or guessing spike include/status/timeout values.
- Backend RPCs `booqable_acquire_order_lease`, `booqable_apply_source_snapshot_v1`, or `workshop_start_manual_sync` / resume.
- Hosted/staging/production DDL, a second auth/role helper, `security_definer` views, Vitest (pgTAP only this run).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Start prep, mapped road | `to_prepare` task with `workshop-road-bike` and copied ROAD items | Status `being_prepared`; version +1 | N/A |
| Start prep, no tag | Identified task, zero/unknown/multiple tags | No transition | `CONFIGURATION_BLOCKED` |
| Complete M1 | All required M1 valid; signer has first+last name | `needs_recheck`; immutable M1 attestation | Incomplete → `INCOMPLETE_CHECKLIST`; missing name → `PROFILE_NAME_REQUIRED` |
| Complete M2 | Designated items confirmed; fingerprint matches; same-person flag if needed | `ready_for_pickup`; M2 attestation stores fingerprint | Mismatch → `ADD_ONS_CHANGED`; same person without confirm → `FORBIDDEN` or dedicated reject (do not invent a new code; use `FORBIDDEN`) |
| Pickup / return / storage | Legal edge; storage items STORAGE-01..06 done | `in_rental` → `returned` → `prepare_for_storage` → `completed` | Partner → `FORBIDDEN`; bad edge → `INVALID_TRANSITION` |
| Stale or cancelled | Wrong version, or status `cancelled` | No write | `STALE_VERSION` / `TASK_CANCELLED` |
| Seeds | Fresh migration | ROAD 25 items + STORAGE 6; four other tags not startable | N/A |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260608102505_remote_schema.sql` L80–85, L315–336, L400–407 — `user_role`, `orders` (`booqable_order_id`, `starts_at`, `order_number`), `profiles.first_name`/`last_name` (nullable). Mechanics have **no** orders SELECT (L610 is admin/manager only).
- `supabase/migrations/20260609130457_fix_rls_auth_uid_subquery.sql` L39–45 — reuse `get_user_role()`; do not replace it. Its `search_path` is `'public'`; new helpers use `''`.
- `supabase/migrations/20260610151000_add_order_items_and_payment_fields.sql` L5–52 — `order_items` SELECT admin/manager + partner; writes are service-role. Do not broaden for mechanics.
- `supabase/migrations/20260708120000_add_onboarding_completed_at.sql` L13–30 — copy this RPC grant pattern (`search_path = ''`, revoke PUBLIC/anon, grant authenticated).
- `src/app/partner/_lib/onboarding-actions.ts` L9–18 — copy `withAuth` + `supabase.rpc` + `console.error` prefix; extend result with required `code`.
- `src/utils/auth/with-auth.ts` L26–46 — only session wrapper; keep using it.
- `src/app/workshop/layout.tsx` L5–37 — already allows admin/manager/mechanic. **Read-only this story.**
- `src/app/workshop/page.tsx`, `src/components/KanbanBoard.tsx` — mock UI. **Do not delete or replace.**
- `src/lib/booqable/sync.ts` — existing sequential writer. **Read-only this story.**
- `src/lib/wiki/index.ts` — module export pattern to copy under `src/lib/workshop`.
- `.github/workflows/deploy-staging.yml` L20–23 and `deploy-production.yml` L21–24 — `version: latest` → `2.115.0`.
- `package.json` L8–14 — add `test:db` only; no Vitest.
- `supabase/config.toml` L7–15, L33–42 — API schemas `public`/`graphql_public`; Postgres 17. Keep `private` out of `schemas`.
- No `supabase/tests/` yet; no workshop tables; no `src/lib/workshop`.

**New files (implementer creates):**
- `supabase/migrations/20260821120000_workshop_foundation.sql` — tables, private helpers, public RPCs listed in the spine (staff task commands only), `workshop_tasks_view`, `workshop_task_detail`, seeds, RLS, realtime.
- `supabase/tests/database/workshop_foundation.test.sql` — pgTAP for the I/O matrix (insert fixture instance+task; do not call Booqable).
- `src/lib/workshop/domain/` — statuses, command names, result/DTO types only (no Next/Supabase/Booqable imports).
- `src/lib/workshop/actions/` — `withAuth` wrappers for the nine staff task RPCs.
- `src/lib/workshop/data/` — loaders for the view + `workshop_task_detail` (`item` + `error`; cancelled is a tombstone, not not-found).
- `src/lib/workshop/index.ts` — public exports only.

## Tasks & Acceptance

**Execution:**
- [ ] `.github/workflows/deploy-staging.yml` + `deploy-production.yml` -- Pin `supabase/setup-cli` to `2.115.0` -- AD-12 before feature migrations
- [ ] `package.json` -- Add `test:db`: `supabase test db --local` -- AD-13
- [ ] `supabase/migrations/20260821120000_workshop_foundation.sql` -- Schema, grants/RLS, commands, seeds, view, detail RPC, realtime -- AD-3–AD-9
- [ ] `supabase/tests/database/workshop_foundation.test.sql` -- Cover every I/O matrix row as mechanic vs partner -- AD-13
- [ ] `src/lib/workshop/**` -- Domain types, `withAuth` RPC actions, read loaders -- AD-1 / error-handling (`workshop:` log prefix)
- [ ] Apply locally (`supabase migration up` or `db reset`) -- never remote

**Acceptance Criteria:**
- Given a local reset, when `npm run test:db` runs, then every I/O matrix row passes and ROAD/STORAGE seeds match `launch-checklists.md`.
- Given a partner JWT, when any staff task RPC is called, then the result is `{ ok: false, code: "FORBIDDEN" }` and no row changes.
- Given `src/lib/workshop/domain`, when inspected, then it imports neither Next.js, Supabase, nor Booqable modules.
- Given the two deploy workflows, when read, then CLI version is `2.115.0` not `latest`.
- Given `/workshop`, when the app loads, then the mock Kanban is unchanged.

## Spec Change Log

## Verification

**Commands:**
- `supabase test db --local` -- expected: pgTAP pass
- `npm run test:db` -- expected: same
- `git diff src/app/workshop src/lib/booqable src/components/Kanban*` -- expected: empty
