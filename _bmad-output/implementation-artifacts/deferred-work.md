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
