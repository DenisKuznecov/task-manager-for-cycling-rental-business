---
title: 'Reactivate and Review Template History'
type: 'feature'
created: '2026-08-13'
status: 'in-progress'
baseline_commit: 'b4546fba41e5f30ef75a7b6159699030918042d7'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/project-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Admins and Managers can activate a Draft but cannot restore a prior standard. Superseded versions stay listed without creator or activation history, and there is no transactional way to make one Active again without rewriting recorded work.

**Approach:** On Superseded detail, Reactivate opens a confirmation panel, then a privileged RPC locks the pairing, reactivates the immutable version, supersedes the current Active atomically, and records a `reactivated` event. Detail also server-loads creator and activation/reactivation history. Success appears only after Library and both version routes reload.

## Boundaries & Constraints

**Always:** Idempotent local-only migration. Reactivate only through a new `SECURITY DEFINER` `reactivate_checklist_version(version_id uuid, expected_revision int, expected_active_version_id uuid)` that authorizes Admin/Manager, requires `status='superseded'`, requires a matching non-null Active pointer, takes `workshop_checklist:{category}:{phase}`, re-reads under the lock, does not mutate Items, supersedes the current Active then activates the selected version, and commits one `reactivated` event with actor, time, phase, category, reactivated version, superseded version, and resulting revisions. Unique one-Active-per-template index remains the last line of defense. Call from `withAuth`; reuse `ChecklistItemMutationResult` / `mapChecklistItemRpcError`; revalidate Library, reactivated detail, and prior-Active detail. Stale keeps the panel open and requires explicit Retry — no silent rebase. Pending stays on Reactivate; Active only after reload. Activation history is template-scoped `activated`/`reactivated` events loaded with the detail page (events failure does not blank a successful version load). Show creator via stored `createdBy`/`createdAt` — no profiles join. Superseded Library and detail rows stay readable with the same status treatment as Active, not error/disabled/failed styling.

**Ask First:** Copy-from-Active; Bike Task snapshots; version-diff UI; Setup Category lookup table; changing `/workshop` dashboard access; table DML policies or service-role writes; migrating beyond local Supabase; editing Story 1.1–1.4 migrations or `001`–`004` pgTAP.

**Never:** No app-role version/item/event DML; no client role checks as authz; no mechanic/partner/anon/`PUBLIC` execute/write. Do not mutate Items during reactivation, edit Active/Superseded definitions, reuse `activate_checklist_version` for superseded rows, claim success before the server result, or migrate staging/production. Do not restyle superseded as disabled/failed. Do not implement copy-from, Bike Task snapshot selection, or a Library-row Reactivate control.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Review history | Admin/Manager opens Library or version detail | Phase, category, version, status readable; detail also shows creator, Items, and activation/reactivation events; superseded not styled as failed/disabled | Version fail: safe empty + error + Retry. Events fail: version still renders + in-context Retry. Session expiry redirects |
| Reactivate | Superseded detail; current Active; matching revision + Active id | Selected → Active; prior Active → Superseded atomically; Items unchanged; one `reactivated` event; Library + both details revalidated | N/A |
| Confirm copy | Open Reactivate | Panel names phase, category, selected version, current Active, future-snapshot-only consequence | N/A |
| Stale revision or Active pointer | Mismatch after confirm | No write; panel stays open with stale + current pointers | Retry after review; no silent rebase |
| Wrong status | Draft, Active, missing, or unsupported pairing submitted to RPC | Rejected; no status/event change | Safe specific copy; use the valid action for current status |
| Concurrent activate/reactivate | Two confirms, same pairing | One commits; the other is stale | Exactly one Active |
| Unauthorized | Mechanic/Partner/anonymous | Nested route denied; RPC `42501` | No write |
| Pending / failure | Confirm in flight or RPC error | Intent kept; duplicate submit blocked; Retry in panel | No optimistic Active |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260813140000_activate_immutable_template_version.sql:33` -- copy DEFINER + `(select auth.uid())` + `get_user_role` + lock `workshop_checklist:{category}:{phase}` (`:98`) + supersede-then-activate (`:173`) + stale DETAIL (`:138`). Event types (`:18`) currently end at `activated`. Do not edit this file.
- `supabase/migrations/20260813100000_create_draft_checklist_version.sql:29` -- events table + `(template_id, occurred_at)` index (`:51`). Admin/Manager SELECT already granted (`:197`). Do not edit.
- `src/lib/workshop-tasks/{types.ts:210,data.ts:136,actions/checklist-version-actions.ts:93,checklist-item-mutation.ts:10,index.ts:1}` -- copy activate input schema with required Active uuid; add `loadWorkshopChecklistEvents(templateId)` (`activated`/`reactivated`, order `occurred_at`); add `reactivateChecklistVersion` beside activate; reuse stale DETAIL parse; export from barrel.
- `src/app/workshop/templates/[id]/{page.tsx:15,_components/TemplateVersionDetail.tsx:48}` -- page loads version + events; `createdBy`/`createdAt` already on version (`data.ts:219`) but omitted from the metadata `dl` (`:65`). Draft-only Activate at `:100`.
- `src/app/workshop/templates/[id]/_components/ActivateVersionPanel.tsx:22` -- copy panel/state/`isActivateRedirectError` rethrow (`:32`); `brand-primary` confirm, not destructive; future-snapshot-only consequence.
- `src/app/workshop/templates/_components/TemplateLibrary.tsx:256` -- superseded already listed and linked (`:307`); do not restyle as failed.
- `src/app/workshop/templates/layout.tsx:9` -- already Admin/Manager. Do not change this or `src/app/workshop/layout.tsx`.
- `supabase/tests/database/workshop-tasks/{001,002,003,004}_*.pgtap.sql` -- do not edit. Add `005_*.pgtap.sql`.
- `tests/workshop-template-library/{actions.test.ts,ui.test.tsx,types-and-data.test.ts}` -- extend mocks; keep `renderToStaticMarkup` + `withAuth` pass-through.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20260813160000_reactivate_checklist_version.sql` -- DROP/ADD event-type CHECK to include `reactivated`; DEFINER `reactivate_checklist_version(...)` that locks, re-reads, requires superseded + matching non-null Active pointer, does not mutate Items, supersedes current Active then activates selected, bumps revisions, writes one `reactivated` event; GRANT EXECUTE to `authenticated`; REVOKE PUBLIC/anon; no app-role DML.
- [x] `supabase/tests/database/workshop-tasks/005_reactivate_checklist_version.pgtap.sql` -- success; items unchanged; prior Active superseded; one Active; event attribution; stale revision/Active pointer; draft/active/missing deny; concurrent with activate; unauthorized; no direct DML; rollback leaves pointers unchanged.
- [x] `src/lib/workshop-tasks/{types.ts,data.ts,actions/checklist-version-actions.ts,index.ts}` -- Zod reactivate input; events loader `{ events, error }` with empty fallback; `withAuth` RPC; map stale DETAIL; revalidate Library + both version routes.
- [x] `src/app/workshop/templates/[id]/{page.tsx,_components/TemplateVersionDetail.tsx,_components/ReactivateVersionPanel.tsx}` -- creator in metadata `dl`; activation/reactivation history (time, actor, event type, version numbers); events error as in-context Retry; Superseded: Reactivate confirm panel naming phase, category, selected version, current Active, future-snapshot-only consequence; pending/Retry in panel; success only after refresh. Draft/Active: no Reactivate control.
- [x] `tests/workshop-template-library/{actions.test.ts,ui.test.tsx,types-and-data.test.ts}` -- I/O matrix: confirm copy, history/creator render, events-error keeps version, stale keeps panel, non-Superseded hides Reactivate, action maps stale Active identity and revalidates both routes.

**Acceptance Criteria:**
- Given a Superseded version and a current Active, when Reactivate commits, then exactly one Active remains for that phase/category, both versions' Items are unchanged, referenced versions still cannot be deleted by application roles, and existing Bike Task snapshots are not written.
- Given a fresh or partially applied local schema, when the migration runs again, then it succeeds and application roles still have no version, item, or event DML.

## Spec Change Log

## Design Notes

Reactivate is a sibling RPC, not a flag on activate: the status guard is `superseded`, `expected_active_version_id` is required non-null (a superseded row implies an Active exists), and the event type is `reactivated`. Copy the 1.4 supersede-then-activate order so the unique partial index never breaks. History is template-scoped `activated`/`reactivated` rows via the existing `(template_id, occurred_at)` index — not item events and not a version diff. Actor identity is the stored uuid (`created_by` / `actor_id`).

## Verification

**Commands:**
- `supabase migration up` -- local migration applies and is rerunnable.
- `supabase test db` -- `005` proves reactivate, stale, deny, one Active, items unchanged.
- `npm run test:unit` / `npm run lint` -- I/O matrix cases and ESLint pass.

**Manual checks (if no CLI):**
- Admin/Manager: open a Superseded version; confirm creator + activation history; Reactivate names pairing/selected/current Active/future-only; after reload selected is Active and prior is Superseded with Items still read-only. Mechanic/Partner: routes denied.

## Suggested Review Order

**Privileged reactivation**

- Sibling DEFINER RPC: superseded-only, required Active pointer, no Item writes.
  [`20260813160000_reactivate_checklist_version.sql:23`](../../supabase/migrations/20260813160000_reactivate_checklist_version.sql#L23)

- Same pairing lock as create/activate so concurrent writes serialize.
  [`20260813160000_reactivate_checklist_version.sql:88`](../../supabase/migrations/20260813160000_reactivate_checklist_version.sql#L88)

- Supersede the current Active first so the unique index never breaks.
  [`20260813160000_reactivate_checklist_version.sql:146`](../../supabase/migrations/20260813160000_reactivate_checklist_version.sql#L146)

- One `reactivated` event with actor, pairing, and superseded version.
  [`20260813160000_reactivate_checklist_version.sql:157`](../../supabase/migrations/20260813160000_reactivate_checklist_version.sql#L157)

**Server action and history load**

- `withAuth` RPC maps stale DETAIL and revalidates Library plus both versions.
  [`checklist-version-actions.ts:148`](../../src/lib/workshop-tasks/actions/checklist-version-actions.ts#L148)

- Template-scoped `activated`/`reactivated` rows; empty fallback on failure.
  [`data.ts:262`](../../src/lib/workshop-tasks/data.ts#L262)

- Required non-null Active uuid so a missing pointer cannot silently rebase.
  [`types.ts:256`](../../src/lib/workshop-tasks/types.ts#L256)

**Detail UI**

- Version page loads events after a successful version read, not instead of it.
  [`page.tsx:39`](../../src/app/workshop/templates/%5Bid%5D/page.tsx#L39)

- Creator from stored uuids; Reactivate only on Superseded; history stays readable.
  [`TemplateVersionDetail.tsx:137`](../../src/app/workshop/templates/%5Bid%5D/_components/TemplateVersionDetail.tsx#L137)

- Confirm names pairing, current Active, and future-snapshot-only consequence.
  [`ReactivateVersionPanel.tsx:59`](../../src/app/workshop/templates/%5Bid%5D/_components/ReactivateVersionPanel.tsx#L59)

- Stale keeps the panel open; success stays pending until refresh.
  [`ReactivateVersionPanel.tsx:115`](../../src/app/workshop/templates/%5Bid%5D/_components/ReactivateVersionPanel.tsx#L115)

**Proof**

- pgTAP: reactivate, items unchanged, stale, deny, one Active, unauthorized.
  [`005_reactivate_checklist_version.pgtap.sql:215`](../../supabase/tests/database/workshop-tasks/005_reactivate_checklist_version.pgtap.sql#L215)

- Unit I/O matrix: confirm copy, history, events-error, stale Retry, hidden control.
  [`ui.test.tsx:1222`](../../tests/workshop-template-library/ui.test.tsx#L1222)

### Review Findings

- [ ] [Review][Patch] Concurrent Reactivate reports an invalid-status error instead of stale [supabase/migrations/20260813160000_reactivate_checklist_version.sql:117]
- [ ] [Review][Patch] Stale response with no Active pointer displays the obsolete Active version [src/app/workshop/templates/[id]/_components/ReactivateVersionPanel.tsx:101]
- [ ] [Review][Patch] Thrown action errors hide development diagnostics [src/app/workshop/templates/[id]/_components/ReactivateVersionPanel.tsx:148]
- [ ] [Review][Patch] Trailing blank lines fail the diff whitespace check [tests/workshop-template-library/types-and-data.test.ts:694]
