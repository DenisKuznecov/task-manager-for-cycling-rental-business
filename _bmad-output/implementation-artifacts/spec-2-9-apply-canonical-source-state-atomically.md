---
title: 'Apply Canonical Source State Atomically'
type: 'feature'
created: '2026-08-17'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
baseline_revision: '5c44ec5a5cf0e5edc3151e851913181694ad5d68'
context:
  - '{project-root}/_bmad-output/project-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
deferred:
  - summary: >-
      The contracted nested-order include cannot return product, product-group,
      bundle, or bundle-item rows, so a live fetch will not populate catalog
      fingerprints or tag admission until a later fetch/cutover decision.
    evidence: |-
      Include is customer,coupon,lines.planning.stock_item_plannings.stock_item.barcode.
      The adapter only maps catalog types from included extras; the fixture plants
      those extras by hand. Intent forbids changing this include and forbids
      standalone catalog collections in this story.
    location: >-
      src/lib/booqable/canonical-adapter.ts
    severity: medium
  - summary: >-
      source_fingerprint columns on planning, bundle-item, and stock-item-planning
      rows are unused because those types are not in the defined fingerprint
      field bindings.
    evidence: |-
      Columns and manifest rows exist, but CANONICAL_FINGERPRINT_FIELD_BINDINGS
      has no planning / bundle_item / stock_item_planning keys. Adding bindings
      is an Ask First change to the defined fingerprint fields.
    location: >-
      src/lib/booqable/contracts/source-envelope.ts
    severity: medium
  - summary: >-
      The field-authority manifest still lists none_until_coordinator_cutover
      as the writer for tag_list, source_version, and membership identity
      fields that apply_canonical_order_graph now writes.
    evidence: |-
      Only newly added fingerprint, incident, and attention fields were given
      canonical_coordinator ownership. Changing existing field-authority writers
      is Ask First (legacy reader / field-authority contract).
    location: >-
      src/lib/booqable/contracts/canonical-projection.ts
    severity: medium
  - summary: >-
      A quantity-one assigned-bike change reuses incarnation 1 and does not
      open an immutable predecessor link.
    evidence: |-
      The adapter always emits replacement_chain_incarnation: 1 and predecessors: [].
      Replacement-chain policy is not in this story's intent matrix; changing
      membership identity rules needs an explicit later decision.
    location: >-
      src/lib/booqable/canonical-adapter.ts
    severity: medium
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Booqable source contracts and additive projection tables exist, but no authoritative fetch, comparison, or atomic apply path writes them. A duplicate, stale, conflicting, or incomplete update could otherwise produce unsafe or inconsistent Workshop source state.

**Approach:** Introduce a versioned canonical Booqable adapter and a database-owned coordinator that applies one accepted `order_graph` atomically. It carries forward omitted children, compares source versions plus meaningful fingerprints, records deduplicated safe attention/failure facts, and leaves later caller cutover, task derivation, and UI work untouched.

## Boundaries & Constraints

**Always:** Fetch the nested canonical graph with `customer,coupon,lines.planning.stock_item_plannings.stock_item.barcode`; use webhook data only as a future signal, never truth. Fingerprint the merged effective state after carry-forward, including assigned physical bikes, accessory source facts without interpreting them, rental dates, customer data, and status. Persist a `source_fingerprint` alongside each canonical resource record. Equal version plus a different fingerprint, older/incomparable present state, unsupported schema, or unauthoritative addition quarantines without source/domain mutation. Persist `identity_kind` and `line_quantity` with bike memberships. Keep one backend-only, count-based attention record per accepted rental line with unidentified bikes; it opens after the existing `new`/`concept` filter, updates from Booqable, and closes with a retained reason when fully identified or the order is `canceled`, `stopped`, or `archived`. It is not a Bike Task.

**Ask First:** A change to the defined fingerprint fields, incident catalogue, attention lifecycle, RLS exposure, legacy reader contract, or task derivation scope.

**Never:** Change `sync.ts`, the webhook, sandbox route, or brownfield readers; cut over callers; create a mechanic-facing UI, a claimable task, a worker, retry queue, Cron, reconciliation sweep, recovery API, or remote DDL. Do not interpret accessory tags or fabricate an identity from planning IDs, array positions, or quantity.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| New accepted graph | Valid nested order graph | All canonical rows, fingerprints, and attention facts commit together | `applied` |
| Exact repeat | Equal merged vector and fingerprint | No duplicate rows, revisions, events, or attention records | `no_op` |
| Equal version conflict | Same vector, different meaningful fingerprint | No canonical mutation; one deduplicated safe incident | `quarantined` |
| Omitted child | No explicit approved removal evidence | Carry the accepted child forward; retain an absence incident outside the fingerprint | Non-mutating |
| Missing physical IDs | Expected quantity exceeds exact assignments | One rental-line attention record shows remaining count | Updates on later accepted graph |

</frozen-after-approval>

## Code Map

- `src/lib/booqable/contracts/source-envelope.ts:15-22,93-103,199-206` -- frozen result vocabulary and strict envelope boundary; add typed fingerprint-field bindings without changing vocabulary.
- `src/lib/booqable/contracts/compatibility.ts:24-51` -- comparator rules require carry-forward before fingerprint comparison and quarantine conflicts without mutation.
- `src/lib/booqable/contracts/canonical-projection.ts:39-48,354-368,1175-1431` -- membership identity rules and graph admission gate to reuse before coordinator persistence.
- `src/lib/booqable/sync.ts:50-98` and `src/app/api/webhooks/booqable/route.ts:50-76` -- legacy fetch/writer and ghost filter; read-only in this story.
- `supabase/migrations/20260815000000_expand_canonical_booqable_projection.sql:250-378,474-727` -- canonical tables, immutable membership triggers, field manifest, and service-role RLS/grant pattern.
- `tests/booqable-contracts/canonical-projection.test.ts` and `supabase/tests/database/booqable-integration/001_source_envelope_vocabulary.pgtap.sql` -- contract and database-proof patterns to extend.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/booqable/contracts/fingerprints.ts` and `src/lib/booqable/contracts/index.ts` -- define per-resource canonical fingerprint fields and deterministic hashing of merged effective state; expose only the approved meaningful source facts.
- [x] `src/lib/booqable/canonical-adapter.ts` -- fetch the nested-order profile, discard `new`/`concept` orders, validate/normalize the response into a versioned `order_graph`, and fixture-prove the include/profile without touching legacy sync.
- [x] `src/lib/booqable/ingestion-coordinator.ts` -- admit graphs, carry forward omitted children, call the database coordinator, and return the fixed apply-result vocabulary without deriving Workshop tasks.
- [x] `src/lib/booqable/contracts/canonical-projection.ts` -- add coordinator ownership and manifest entries for fingerprints, persisted membership facts, and backend-only incident/attention records; retain all prior identity and tag constraints.
- [x] `supabase/migrations/20260817000000_apply_canonical_source_state.sql` -- idempotently add resource fingerprints, membership columns, service-role-only incident/attention storage, and an atomic `apply_canonical_order_graph` capability. Deduplicate internal records by kind plus affected root/resource; retain only IDs, versions, field names, counts, statuses, and timestamps.
- [x] `tests/booqable-contracts/fingerprints-and-coordinator.test.ts`, `tests/fixtures/booqable/canonical-order-graph.json`, and `package.json` -- fixture-prove profile normalization, fingerprints, comparator/no-op/quarantine/omission paths, and include the test in `contracts:check`.
- [x] `supabase/tests/database/booqable-integration/004_apply_canonical_source_state.pgtap.sql` -- prove migration structure, atomic rollback, immutable membership identity, source-fingerprint persistence, incident deduplication, attention lifecycle, and forbidden direct-role writes.

**Acceptance Criteria:**
- Given a valid authoritative graph, when the coordinator accepts it, then all canonical source, fingerprint, and attention changes commit as one transaction or none commit.
- Given a duplicate, delayed, or out-of-order successfully processed graph, when its carried-forward vector and fingerprint equal accepted state, then the coordinator returns `no_op` without duplicate data.
- Given conflicting, older, incomparable, unsupported, or unauthoritative present state, when comparison runs, then the coordinator returns the contract result with no canonical/domain mutation and one safe deduplicated internal record.
- Given a child is absent without approved removal evidence, when the graph merges, then accepted history remains and no membership or Bike Task closes.
- Given an accepted bike rental line has fewer exact physical IDs than its expected quantity, when source state applies, then exactly one backend-only attention record tracks the remaining count and closes only at full identification or the approved terminal statuses.

### Review Findings

_Chunk 1 of 3 (core logic: `canonical-adapter.ts`, `ingestion-coordinator.ts`, `contracts/*`) — 2026-08-18. Migration SQL and test-fixture chunks reviewed separately; see follow-up entries below._

- [x] [Review][Defer] `compareMergedState` gates new-child acceptance on the order root's version being strictly newer than the previously accepted root version — if Booqable doesn't always bump `order.updated_at` when only a nested child changes (e.g. a new `stock_item_planning`), legitimate new data gets permanently quarantined as `unauthoritative_addition`. [`src/lib/booqable/ingestion-coordinator.ts` `compareMergedState`] — deferred: needs verification against real Booqable webhook payloads (does `updated_at` bump on nested-only changes?) before touching frozen comparator logic
- [x] [Review][Defer] `normalizeCanonicalOrderPayload` always asserts `scope: "complete"` for the nested include regardless of order size — whether Booqable's nested include can silently paginate/truncate for very large orders is unverified. [`src/lib/booqable/canonical-adapter.ts`] — deferred: Booqable's nested-include pagination behavior for very large orders is unverified; revisit if truncation is ever observed in practice
- [x] [Review][Defer] All five distinct `admitCanonicalGraph` rejection reasons (`schema`, `orphan_link`, `membership_identity`, `tag_admission`, `inconsistent_link`) collapse into the single frozen `unauthoritative_addition` incident kind (only `field_name` varies via `admission.reason`) — adding a dedicated incident kind is Ask-First. [`src/lib/booqable/ingestion-coordinator.ts` `prepareCanonicalApply`] — deferred: existing `field_name` variance is sufficient for now; introducing a new incident kind is out of scope (Ask-First)
- [x] [Review][Patch] `fetchCanonicalOrder`'s 429-only retry loop doesn't catch network/timeout errors and its worst-case wall-clock time (~30s across 3 attempts) risks exceeding the Vercel Hobby 10s function limit once wired to a live caller [`src/lib/booqable/canonical-adapter.ts:57-91`]
- [x] [Review][Patch] Carry-forward doesn't propagate envelope-level fingerprint facts (`order_item`/`customer`/`stock_item.barcode`) for omitted children — `mergedGraphFingerprint`/`resourceFingerprints` read straight from the raw incoming envelope, so omitting a child can spuriously flip the merged fingerprint into `equal_version_conflict` instead of the intended non-mutating `omitted_child` carry-forward path [`src/lib/booqable/ingestion-coordinator.ts` `mergedGraphFingerprint`, `resourceFingerprints`, `carryForwardOmittedChildren`] — temporary TypeScript fallback; future database wiring must persist the accepted envelope facts
- [x] [Review][Patch] Incident attribution for version-comparison failures is hardcoded to the order root with `field_name: "source_fingerprint"` even for the three version-vector-based incident kinds, losing which resource actually triggered the incident and collapsing distinct incidents into the same dedup key [`src/lib/booqable/ingestion-coordinator.ts` `compareMergedState`, `prepareCanonicalApply`]
- [x] [Review][Patch] Tag-list fingerprint inputs are inconsistent: `order_item.tag_list` is pre-joined unsorted in the adapter while `product`/`product_group`/`bundle` tag lists are sorted inside `asFingerprintScalar` — a benign tag reorder on an order line can flip its fingerprint while the same reorder on a product cannot [`src/lib/booqable/canonical-adapter.ts:319`, `src/lib/booqable/contracts/fingerprints.ts`]
- [x] [Review][Patch] `res.json()` on a malformed Booqable response throws an uncaught `SyntaxError` instead of a clear, attributable error [`src/lib/booqable/canonical-adapter.ts` `fetchCanonicalOrder`]
- [x] [Review][Patch] Throw sites in `fetchCanonicalOrder` skip the project's `console.error`-with-context-prefix convention before throwing, unlike the sibling `applyCanonicalOrderGraphRpc` [`src/lib/booqable/canonical-adapter.ts` `fetchCanonicalOrder`]
- [x] [Review][Patch] `normalizeUtcTimestamp`'s `hasZone` regex requires both hour and minute digits after a `+`/`-` sign, so an ISO-8601 hour-only offset (e.g. `+02`) fails to match and gets `Z` wrongly appended, corrupting the comparison [`src/lib/booqable/ingestion-coordinator.ts:571`]
- [x] [Review][Defer] Reachability filtering fallback (matching a parent via raw FK attribute when JSON:API relationship data is absent) exists for `plannings`/`stock_item_plannings` but not for `stock_items`/`products`/`bundles`/`bundle_items`/`product_groups` [`src/lib/booqable/canonical-adapter.ts` `normalizeCanonicalOrderPayload`] — deferred until real Booqable payload evidence identifies a reliable child-side foreign key
- [x] [Review][Defer] Nested include never reaches `product`/`product_group`/`bundle`/`bundle_item`, so those projection arrays are empty on a live fetch [`src/lib/booqable/canonical-adapter.ts`] — deferred, already documented in this spec's frontmatter (catalog-from-include)
- [x] [Review][Defer] `CANONICAL_FINGERPRINT_FIELD_BINDINGS` has no `planning`/`stock_item_planning`/`bundle_item` entries, so their `source_fingerprint` columns stay unused [`src/lib/booqable/contracts/source-envelope.ts`] — deferred, already documented in this spec's frontmatter (unused planning-family fingerprint columns)
- [x] [Review][Defer] `replacement_chain_incarnation` is always `1` and `predecessors` is always empty from the adapter (no replacement-chain detection), which also makes `carryForwardOmittedChildren`'s all-or-nothing predecessor merge currently inert [`src/lib/booqable/canonical-adapter.ts`, `src/lib/booqable/ingestion-coordinator.ts`] — deferred, already documented in this spec's frontmatter (quantity-one replacement incarnations)
- [x] [Review][Defer] `coupon` is fetched via the nested include but never read or projected [`src/lib/booqable/canonical-adapter.ts`] — deferred, pre-existing (the include string is spec-frozen; fetched now, consumed later by design)
- [x] [Review][Defer] No allow-list/validation for order status beyond the ghost set (`new`/`concept`); an unrecognized status string is treated as a normal open order with no warning [`src/lib/booqable/canonical-adapter.ts`] — deferred, pre-existing (not required by the current spec matrix)

_Chunk 2 of 3 (database coordinator and pgTAP proof) — 2026-08-18._

- [x] [Review][Patch] `upsert_canonical_rental_line_attention` inserts a closed `fully_identified` row even when a bike line was never incomplete; only an existing open attention fact should be closed when the count reaches zero. [`supabase/migrations/20260817000000_apply_canonical_source_state.sql:242`]
- [x] [Review][Patch] The pgTAP suite does not execute the SQL coordinator's `unsupported_schema`, incomparable-present-state, or unauthoritative-addition quarantine branches; add RPC-level assertions for the contract result, one deduplicated incident, and unchanged canonical state. [`supabase/tests/database/booqable-integration/004_apply_canonical_source_state.pgtap.sql:420`]
- [x] [Review][Patch] The pgTAP suite tests only `canceled` terminal attention closure; add equivalent `stopped` and `archived` assertions so every approved terminal close reason in the migration is protected. [`supabase/tests/database/booqable-integration/004_apply_canonical_source_state.pgtap.sql:707`]

_Chunk 3 of 3 (contract tests and fixture) — 2026-08-18._

- [x] [Review][Patch] The quantity-one “multiple assigned stock items” fixture never includes `si_2`, so its expected invalid result can come from a dangling stock-item reference rather than the intended excess-assignment rule. Include the referenced stock item and retain a separate dangling-reference test. [`tests/booqable-contracts/fingerprints-and-coordinator.test.ts:309`]
- [x] [Review][Patch] The ghost-order test claims to cover both frozen statuses but exercises only `concept`; add a `new` payload assertion so the required filter cannot regress independently. [`tests/booqable-contracts/fingerprints-and-coordinator.test.ts:338`]
- [x] [Review][Patch] `prepareCanonicalApply` tests quarantine cases but not a legitimate new source version; add a newer-root/new-resource case that must return `applied` to protect the successful authoritative-update path. [`tests/booqable-contracts/fingerprints-and-coordinator.test.ts:522`]

## Design Notes

The coordinator records facts and safe attention state; later Epic 3 creates Bike Tasks and later Epic 7 presents manager actions. “Three expected, two identified” is one rental-line fact, never three invented bike identities.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: strict TypeScript passes.
- `npm run lint` -- expected: no new lint errors.
- `npm run contracts:check` -- expected: envelope, projection, fingerprint, and coordinator fixtures pass.
- `npm run test:unit` -- expected: all Vitest tests pass.
- `npx supabase test db` -- expected: the new pgTAP atomicity, privileges, and lifecycle proofs pass locally.
- `npm run db:types` -- expected: local types generate successfully without wiring generated types into app consumers.

## Review Triage Log

### 2026-08-17 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 19: (high 0, medium 16, low 3)
- defer: 4: (high 0, medium 4, low 0)
- reject: 11
- addressed_findings:
  - `[medium]` `[patch]` Per-row stock-item fingerprints now hash the envelope barcode, matching the merged digest.
  - `[medium]` `[patch]` `omitted_child` is recorded on both `no_op` and `applied` when omissions exist and comparison has no higher-priority incident.
  - `[medium]` `[patch]` Attention is one count fact per bike rental line, including planning lines with zero assignments; accessory lines with no planning are skipped.
  - `[medium]` `[patch]` Quantity-one lines with more than one assigned stock item fail closed as invalid.
  - `[medium]` `[patch]` Missing/blank order status and included rows not scoped to the order fail closed as invalid.
  - `[medium]` `[patch]` Carried graphs are re-admitted before compare; excess memberships quarantine.
  - `[medium]` `[patch]` Version compare treats timezone-less timestamps as UTC so JS and SQL agree.
  - `[medium]` `[patch]` SQL treats a present incoming vector entry with a null/empty version as incomparable.
  - `[medium]` `[patch]` Missing parent bundle aborts the apply transaction.
  - `[medium]` `[patch]` Stale open attention for lines that leave `rental_lines` is closed.
  - `[medium]` `[patch]` `prepareCanonicalApply` now proves omitted-child carry-forward, unchanged fingerprint, and `omitted_child`.
  - `[medium]` `[patch]` Older / incomparable / unauthoritative quarantine is asserted on `prepareCanonicalApply` and in pgTAP.
  - `[medium]` `[patch]` Adapter multi-quantity memberships and remaining-count attention are fixture-proven.
  - `[medium]` `[patch]` Fully-identified attention close and later remaining-count updates are proven in pgTAP.
  - `[low]` `[patch]` Canonical fetch uses an 8s abort timeout.
  - `[low]` `[patch]` Non-array `included` returns invalid instead of throwing.
  - `[low]` `[patch]` Open attention persists `GREATEST(unidentified, 0)`.

## Auto Run Result

Status: done

Summary: A versioned nested-order adapter and a service-role `apply_canonical_order_graph` coordinator now fingerprint, compare, and write one accepted `order_graph` atomically — or quarantine without mutating source. Omitted children are carried forward. Bike-line attention is count-based and backend-only. Legacy `sync.ts`, the webhook, sandbox, and brownfield readers were not cut over.

Files changed:
- [canonical-adapter.ts](../../src/lib/booqable/canonical-adapter.ts) — nested-order fetch/normalize with ghost discard and scoped include
- [ingestion-coordinator.ts](../../src/lib/booqable/ingestion-coordinator.ts) — admit, carry-forward, fingerprint, compare, and RPC wrapper
- [fingerprints.ts](../../src/lib/booqable/contracts/fingerprints.ts) — deterministic hash of approved meaningful fields
- [source-envelope.ts](../../src/lib/booqable/contracts/source-envelope.ts) — fingerprint field bindings
- [canonical-projection.ts](../../src/lib/booqable/contracts/canonical-projection.ts) — coordinator manifest, incidents, attention, incomplete-quantity admission
- [index.ts](../../src/lib/booqable/contracts/index.ts) and [check.ts](../../src/lib/booqable/contracts/check.ts) — contract exports and drift surface
- [20260816595900_add_canonical_coordinator_enum_values.sql](../../supabase/migrations/20260816595900_add_canonical_coordinator_enum_values.sql) — enum labels in a prior transaction
- [20260817000000_apply_canonical_source_state.sql](../../supabase/migrations/20260817000000_apply_canonical_source_state.sql) — fingerprint columns, incident/attention tables, atomic apply RPC
- [fingerprints-and-coordinator.test.ts](../../tests/booqable-contracts/fingerprints-and-coordinator.test.ts) and [canonical-order-graph.json](../../tests/fixtures/booqable/canonical-order-graph.json) — adapter, fingerprint, and coordinator fixtures
- [004_apply_canonical_source_state.pgtap.sql](../../supabase/tests/database/booqable-integration/004_apply_canonical_source_state.pgtap.sql) — atomicity, privilege, and lifecycle proofs
- [package.json](../../package.json) — `contracts:check` includes the new test file
- [project-context.md](../project-context.md) — records the nested-order include and coordinator as the sole canonical writer
- [sprint-status.yaml](sprint-status.yaml) — story 2.9 marked done

Review findings breakdown:
- Patches applied: 19 (high 0, medium 16, low 3)
- Items deferred: 4 (catalog-from-include, unused planning-family fingerprint columns, manifest writer drift, quantity-one replacement incarnations)
- Items rejected: 11 (caller cutover, new incident kinds, staff SELECT, hash-version mixing, and similar out-of-intent noise)

Follow-up review recommendation: `true` (patched high 0, medium 16, low 3; score `3 × 16 + 1 × 3 = 51`)

Verification performed:
- `npx tsc --noEmit` — pass
- `npm run lint` — 0 errors (19 pre-existing `<img>` warnings)
- `npm run contracts:check` — 73 passed
- `npm run test:unit` — 204 passed
- `npx supabase test db` — 287 passed, including `004_apply_canonical_source_state.pgtap.sql`
- `npm run db:types` — generated locally; not wired into app consumers

Residual risks:
- Callers still use `sync.ts`. The new path is library-plus-RPC only.
- TypeScript and SQL both compare; patches aligned the known drift, but a later rule change can still diverge.
- Live nested include still cannot populate catalog rows; that stays deferred until cutover.
- Quantity-one bike swaps do not yet open a replacement incarnation.
