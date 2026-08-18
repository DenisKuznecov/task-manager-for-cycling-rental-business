## Deferred from: code review of spec-1-3-configure-draft-checklist-items (2026-08-13)

- Add an interaction-level draft editor mutation test: static markup and direct action tests do not verify that a rendered Draft editor control invokes its intended server-action bridge with current values.

- source_spec: spec-2-2-upgrade-to-a-supported-application-runtime.md
  status: resolved by Story 2.3
  summary: package.json engines.node still allowed Node 20.0–20.8, which Next 16 does not support.
  evidence: engines.node was `^20.0.0 || ^22.0.0 || >=24.0.0` and was unchanged by Story 2.2; Story 2.3 pinned it to `^24.0.0` only.

- source_spec: spec-2-2-upgrade-to-a-supported-application-runtime.md
  summary: Story 2.1's code map still names src/middleware.ts as the Next convention file.
  evidence: that path was deleted in this upgrade and replaced by src/proxy.ts; the 2.1 artifact was not in this story's task list.

- source_spec: spec-2-2-upgrade-to-a-supported-application-runtime.md
  summary: ARCHITECTURE-SPINE.md still inventories Next.js 14.2.35 and React 18.2.0.
  evidence: planning-artifact stack inventory was not updated; agents that treat the spine as current will read the pre-upgrade baseline.

- source_spec: spec-2-2-upgrade-to-a-supported-application-runtime.md
  summary: Login searchParams.next is typed as string, so a repeated ?next= that yields string[] can throw in requireAnonymous.trim().
  evidence: this typing existed before the Promise wrap; Next 15+ searchParams values can be string | string[] | undefined.

## Deferred from: code review of spec-2-2-upgrade-to-a-supported-application-runtime (2026-08-14)

- Add automated application build verification. The existing staging and production GitHub workflows only run `supabase db push`, so `next build` is not checked in an automated validation path. This pre-dates Story 2.2; its proof records a local build result.

## Deferred from: Story 2.6 spec review (2026-08-15)

- source_spec: spec-2-6-preserve-brownfield-projection-consumers.md
  summary: On the first story that implements canonical Booqable fetch (not today's sync.ts), contract and fixture-prove the nested-order include `customer,coupon,lines.planning.stock_item_plannings.stock_item.barcode` before anyone lists StockItems or StockItemPlannings as a collection.
  evidence: Den cut this from 2.6 so the story stays a consumer-column freeze. Standalone inventory remains an unverified optimization and must not become the only path. Live sync stays `include=customer,coupon,lines` until that fetch story.

## Deferred from: code review of spec-2-6-preserve-brownfield-projection-consumers (2026-08-15)

- Run the pgTAP database consumer-contract suite in CI. The existing pull-request workflow runs `npm run contracts:check` only, so it cannot exercise migration-produced view/RPC contracts. This repository-wide CI coverage gap predates Story 2.6 and needs an intentional local-Supabase CI design.

## Deferred from: code review of spec-2-9-apply-canonical-source-state-atomically (2026-08-18)

- source_spec: spec-2-9-apply-canonical-source-state-atomically.md
  summary: Nested include never reaches `product`/`product_group`/`bundle`/`bundle_item`, so those projection arrays stay empty on a live fetch.
  evidence: already documented in this spec's own frontmatter as a deferred item (catalog-from-include); `src/lib/booqable/canonical-adapter.ts` only maps catalog types from included extras that the include cannot actually return.

- source_spec: spec-2-9-apply-canonical-source-state-atomically.md
  summary: `CANONICAL_FINGERPRINT_FIELD_BINDINGS` has no `planning`/`stock_item_planning`/`bundle_item` entries, so their `source_fingerprint` columns stay unused.
  evidence: already documented in this spec's own frontmatter as a deferred item; adding bindings is an Ask-First change to the defined fingerprint fields.

- source_spec: spec-2-9-apply-canonical-source-state-atomically.md
  summary: `replacement_chain_incarnation` is always `1` and `predecessors` is always empty from the adapter — no replacement-chain detection exists yet, which also makes `carryForwardOmittedChildren`'s all-or-nothing predecessor merge currently inert.
  evidence: already documented in this spec's own frontmatter as a deferred item (quantity-one replacement incarnations); replacement-chain policy is not in this story's intent matrix.

- source_spec: spec-2-9-apply-canonical-source-state-atomically.md
  summary: `coupon` is fetched via the nested include but never read or projected anywhere.
  evidence: the include string itself is spec-frozen under the "Always" boundary, so this is fetched-now/consumed-later by design, not an oversight to fix in this story.

- source_spec: spec-2-9-apply-canonical-source-state-atomically.md
  summary: No allow-list/validation for order status beyond the ghost set (`new`/`concept`); an unrecognized status string from Booqable is treated as a normal open order with no warning or incident.
  evidence: `src/lib/booqable/canonical-adapter.ts` `normalizeCanonicalOrderPayload` only special-cases `new`/`concept`; not required by the current spec's I/O matrix.

- source_spec: spec-2-9-apply-canonical-source-state-atomically.md
  summary: `compareMergedState` gates new-child acceptance on the order root's version being strictly newer than the previously accepted root version; if Booqable doesn't always bump `order.updated_at` on a nested-only change, legitimate additions get permanently quarantined as `unauthoritative_addition`.
  evidence: needs verification against real Booqable webhook payloads (does `updated_at` bump on nested-only changes?) before touching frozen comparator logic in `src/lib/booqable/ingestion-coordinator.ts` `compareMergedState`. Reviewer decision: defer.

- source_spec: spec-2-9-apply-canonical-source-state-atomically.md
  summary: `normalizeCanonicalOrderPayload` always asserts `scope: "complete"` for the nested include regardless of order size; whether Booqable's nested include can silently paginate/truncate for very large orders is unverified.
  evidence: Booqable's nested-include pagination behavior for very large orders is unverified; revisit if truncation is ever observed in practice. Reviewer decision: defer.

- source_spec: spec-2-9-apply-canonical-source-state-atomically.md
  summary: All five distinct `admitCanonicalGraph` rejection reasons (`schema`, `orphan_link`, `membership_identity`, `tag_admission`, `inconsistent_link`) collapse into the single frozen `unauthoritative_addition` incident kind, only varying `field_name`.
  evidence: existing `field_name` variance is sufficient for now; introducing a new incident kind is out of scope (Ask-First). Reviewer decision: defer.

## Deferred from: code review of spec-2-9-apply-canonical-source-state-atomically (2026-08-18)

- source_spec: spec-2-9-apply-canonical-source-state-atomically.md
  summary: Add a child-side reachability fallback for included stock and catalog resources.
  evidence: defer until real Booqable payload evidence identifies the reliable child-side foreign key; adding an unverified fallback would be speculative. Reviewer decision: defer.

## Deferred from: Story 2.10 scope split (2026-08-18)

- source_spec: none
  summary: Operator-triggered one-time Booqable import that skips canceled/stopped/archived orders when no Workshop task exists and materializes the rest.
  evidence: Split from Story 2.10 so source-tag fixture validation can ship without live import, caller cutover, or Bike Task creation.

- source_spec: none
  summary: Pre-pilot validation that source materialization and task derivation are stable with zero catalogue-defined blocking incidents.
  evidence: Split from Story 2.10 because it requires Epic 3 Bike Tasks and later rollout control, and cannot be completed in Epic 2 today.
